 /**
 * PriceNice — Cloudflare Worker
 *
 * Endpoints:
 *   POST /              → chatbot público (intermediario hacia Google Gemini)
 *   POST /admin-test    → modo administrador de pruebas
 *   POST /admin-test/verify → verifica token de prueba
 *   POST /ia-vendedor   → asistente IA del panel del vendedor (autenticado por UID)
 *
 * ─────────────────────────────────────────────────────────
 * Variables de entorno (Cloudflare → Workers → Settings → Variables):
 *
 *  CHATBOT:
 *   GEMINI_API_KEY   (secreto)  Clave de Google AI Studio.
 *   ALLOWED_ORIGINS  (texto)    Orígenes permitidos, separados por coma.
 *   GEMINI_MODEL     (texto)    Opcional. Modelo de Gemini a usar.
 *
 *  MODO PRUEBA ADMIN:
 *   ADMIN_TEST_CODE  (secreto)  Código secreto del admin.
 *   ADMIN_TEST_MODE  (texto)    "true" para activar.
 *   ADMIN_SALT       (secreto)  Salt para firmar tokens HMAC-SHA256.
 *
 *  IA VENDEDOR:
 *   IA_VENDEDOR_DAILY_LIMIT (texto) Consultas permitidas por vendedor/día. Default: 20.
 *
 *  KV NAMESPACE:
 *   RATE_LIMIT_KV    Binding al namespace KV del Worker.
 */

/* ──────────────────────────────────────────────
   CONSTANTES GLOBALES
────────────────────────────────────────────── */
const MAX_MENSAJE       = 500;
const MAX_CONTEXTO      = 8_000;
const RATE_WINDOW_MS    = 15 * 60 * 1000; // 15 minutos
const RATE_MAX_INTENTOS = 5;
const TOKEN_TTL_MS      = 30 * 60 * 1000; // 30 minutos

/* Perfiles disponibles en el modo prueba.
   La clave es el id interno, el valor es la URL de destino. */
const PERFILES_PRUEBA = {
  usuario:      { label: "Usuario normal",  url: "Index.html"                },
  vendedor:     { label: "Vendedor",         url: "registro-vendedor.html"    },
  patrocinador: { label: "Patrocinador",     url: "patrocinador.html"         },
  verificador:  { label: "Verificador",      url: "verificador.html"          },
  admin:        { label: "Administrador",    url: "admin.html"                },
  dueno:        { label: "Dueño / Owner",    url: "dueño.html"                }
};

/* ──────────────────────────────────────────────
   CABECERAS CORS
────────────────────────────────────────────── */
function cabeceras(origen, permitido) {
  return {
    "Access-Control-Allow-Origin":  permitido ? origen : "null",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    "Vary":         "Origin",
    "Content-Type": "application/json; charset=utf-8"
  };
}

/* ──────────────────────────────────────────────
   HMAC-SHA256 — firma y verifica tokens
   (Web Crypto API disponible en Workers)
────────────────────────────────────────────── */
async function hmac(salt, datos) {
  const enc  = new TextEncoder();
  const key  = await crypto.subtle.importKey(
    "raw", enc.encode(salt), { name: "HMAC", hash: "SHA-256" }, false, ["sign", "verify"]
  );
  const sig  = await crypto.subtle.sign("HMAC", key, enc.encode(datos));
  return btoa(String.fromCharCode(...new Uint8Array(sig)));
}

async function crearToken(salt, perfil, ip) {
  const exp     = Date.now() + TOKEN_TTL_MS;
  const payload = `${perfil}:${exp}:${ip}`;
  const firma   = await hmac(salt, payload);
  // Devuelve base64url de "payload|firma" para que sea seguro en URL
  return btoa(`${payload}|${firma}`).replace(/\+/g, "-").replace(/\//g, "_").replace(/=/g, "");
}

async function verificarToken(salt, token, ip) {
  try {
    const raw     = atob(token.replace(/-/g, "+").replace(/_/g, "/"));
    const sep     = raw.lastIndexOf("|");
    const payload = raw.slice(0, sep);
    const firma   = raw.slice(sep + 1);
    const esperada = await hmac(salt, payload);
    if (firma !== esperada) return null;
    const [perfil, expStr] = payload.split(":");
    if (Date.now() > Number(expStr)) return null;
    // La IP no se valida estrictamente (NAT, móviles) pero sí se registra
    return { perfil };
  } catch { return null; }
}

/* ──────────────────────────────────────────────
   RATE LIMITING (usando KV, graceful si no hay KV)
────────────────────────────────────────────── */
async function checkRateLimit(kv, ip) {
  if (!kv) return { bloqueado: false, intentos: 0 };

  const key  = `rl:${ip}`;
  const raw  = await kv.get(key, { type: "json" });
  const ahora = Date.now();

  if (!raw) return { bloqueado: false, intentos: 0 };

  // Limpiar intentos fuera de la ventana
  const recientes = (raw.intentos || []).filter(t => ahora - t < RATE_WINDOW_MS);

  if (recientes.length >= RATE_MAX_INTENTOS) {
    const restante = Math.ceil((recientes[0] + RATE_WINDOW_MS - ahora) / 60000);
    return { bloqueado: true, restante };
  }
  return { bloqueado: false, intentos: recientes.length };
}

async function registrarIntento(kv, ip, exito) {
  if (!kv) return;
  const key  = `rl:${ip}`;
  const ahora = Date.now();
  const raw  = await kv.get(key, { type: "json" }) || { intentos: [] };
  const recientes = (raw.intentos || []).filter(t => ahora - t < RATE_WINDOW_MS);

  if (!exito) recientes.push(ahora);
  else recientes.length = 0; // resetear en éxito

  await kv.put(key, JSON.stringify({ intentos: recientes }), {
    expirationTtl: Math.ceil(RATE_WINDOW_MS / 1000) + 60
  });
}

async function registrarUso(kv, ip, perfil) {
  if (!kv) return;
  // Guardamos un log circular de los últimos 200 usos
  const key = "admin_test_log";
  const raw = await kv.get(key, { type: "json" }) || [];
  raw.push({ ts: new Date().toISOString(), ip, perfil });
  if (raw.length > 200) raw.splice(0, raw.length - 200);
  await kv.put(key, JSON.stringify(raw), { expirationTtl: 60 * 60 * 24 * 30 });
}

/* ──────────────────────────────────────────────
   HANDLER PRINCIPAL
────────────────────────────────────────────── */
export default {
  async fetch(request, env) {
    const origen  = request.headers.get("Origin") || "";
    const lista   = (env.ALLOWED_ORIGINS || "").split(",").map(s => s.trim()).filter(Boolean);
    const permitido = lista.length > 0 && lista.includes(origen);
    const h       = cabeceras(origen, permitido);
    const ok      = (obj, s = 200) => new Response(JSON.stringify(obj), { status: s, headers: h });

    if (request.method === "OPTIONS") return new Response(null, { status: 204, headers: h });
    if (!permitido) return ok({ error: "Origen no permitido" }, 403);
    if (request.method !== "POST") return ok({ error: "Método no permitido" }, 405);

    const url = new URL(request.url);

    /* ══════════════════════════════════════════
       ENDPOINT: /admin-test
    ══════════════════════════════════════════ */
    if (url.pathname === "/admin-test") {
      return handleAdminTest(request, env, ok);
    }

    /* ══════════════════════════════════════════
       ENDPOINT: /admin-test/verify  (verifica token al redirigir)
    ══════════════════════════════════════════ */
    if (url.pathname === "/admin-test/verify") {
      return handleAdminVerify(request, env, ok);
    }

    /* ══════════════════════════════════════════
       ENDPOINT: /ia-vendedor (asistente IA del panel vendedor)
    ══════════════════════════════════════════ */
    if (url.pathname === "/ia-vendedor") {
      return handleIAVendedor(request, env, ok);
    }

    /* ══════════════════════════════════════════
       ENDPOINT: / (chatbot, comportamiento original)
    ══════════════════════════════════════════ */
    return handleChatbot(request, env, ok);
  }
};

/* ──────────────────────────────────────────────
   HANDLER: MODO PRUEBA — solicitar acceso
   Body: { codigo: string, perfil: string }
   Respuesta exitosa: { ok: true, token: string, perfiles: [...] }
────────────────────────────────────────────── */
async function handleAdminTest(request, env, ok) {
  const kv = env.RATE_LIMIT_KV || null;

  // 1. Modo desactivado → responder igual que código incorrecto
  const modoActivo = (env.ADMIN_TEST_MODE || "").toLowerCase() === "true";
  if (!modoActivo) return genericoNoAutorizado(ok);

  // 2. Secretos requeridos
  if (!env.ADMIN_TEST_CODE || !env.ADMIN_SALT) return genericoNoAutorizado(ok);

  // 3. IP del solicitante (Cloudflare la provee)
  const ip = request.headers.get("CF-Connecting-IP") ||
             request.headers.get("X-Forwarded-For")?.split(",")[0].trim() ||
             "unknown";

  // 4. Rate-limiting
  const rl = await checkRateLimit(kv, ip);
  if (rl.bloqueado) {
    return ok({
      error: `Demasiados intentos. Espera ${rl.restante} minuto(s).`
    }, 429);
  }

  // 5. Leer body
  let body;
  try { body = await request.json(); } catch { return ok({ error: "JSON inválido" }, 400); }

  const codigoRecibido = String(body.codigo || "").trim();
  const perfilSolicitado = String(body.perfil || "").trim().toLowerCase();

  // 6. Validar código (comparación en tiempo constante para evitar timing attacks)
  const codigoCorrecto = env.ADMIN_TEST_CODE;
  const iguales = await tiempoConstanteIgual(codigoRecibido, codigoCorrecto);

  if (!iguales) {
    await registrarIntento(kv, ip, false);
    // Misma respuesta genérica: no revelar que el modo existe
    return genericoNoAutorizado(ok);
  }

  // 7. Código correcto
  await registrarIntento(kv, ip, true);

  // Si pidió un perfil específico, validarlo y devolver token
  if (perfilSolicitado && PERFILES_PRUEBA[perfilSolicitado]) {
    const token = await crearToken(env.ADMIN_SALT, perfilSolicitado, ip);
    await registrarUso(kv, ip, perfilSolicitado);
    return ok({
      ok:     true,
      token,
      perfil: perfilSolicitado,
      url:    PERFILES_PRUEBA[perfilSolicitado].url
    });
  }

  // Sin perfil: devolver la lista de perfiles disponibles (sin el token aún)
  const perfiles = Object.entries(PERFILES_PRUEBA).map(([id, cfg]) => ({
    id,
    label: cfg.label
  }));

  return ok({ ok: true, perfiles });
}

/* ──────────────────────────────────────────────
   HANDLER: VERIFICAR TOKEN (páginas de destino)
   Body: { token: string }
   Respuesta: { ok: true, perfil: string } | error
────────────────────────────────────────────── */
async function handleAdminVerify(request, env, ok) {
  if (!env.ADMIN_SALT) return ok({ error: "No autorizado" }, 403);

  const ip = request.headers.get("CF-Connecting-IP") || "unknown";
  let body;
  try { body = await request.json(); } catch { return ok({ error: "JSON inválido" }, 400); }

  const resultado = await verificarToken(env.ADMIN_SALT, String(body.token || ""), ip);
  if (!resultado) return ok({ error: "Token inválido o expirado" }, 401);

  return ok({ ok: true, perfil: resultado.perfil });
}

/* ──────────────────────────────────────────────
   HANDLER: IA VENDEDOR
   Body: {
     uid:    string,   // UID de Firebase del vendedor (no es secreto, se usa como clave de rate-limit)
     tipo:   "descripcion" | "grafica" | "chat",
     // Para tipo "descripcion":
     producto: { nombre, categoria, precio, descripcionActual? },
     // Para tipo "grafica":
     metricas: { vistas[], clics[], meses[], totalProductos, totalReseñas, calificacion, sinDatos? },
     // Para tipo "chat":
     pregunta: string,
     historial: [{ rol: "user"|"ia", texto: string }],   // últimas 6 entradas
     // Contexto general (todos los tipos):
     tienda: { nombre, barrio, categoria }
   }
   Respuesta exitosa:
     { ok: true, respuesta: string, sugerencias?: string[], limiteDiario: { usadas, total } }
────────────────────────────────────────────── */
async function handleIAVendedor(request, env, ok) {
  if (!env.GEMINI_API_KEY) return ok({ error: "Servicio no configurado" }, 500);

  const kv  = env.RATE_LIMIT_KV || null;
  const LIMITE_DIARIO = parseInt(env.IA_VENDEDOR_DAILY_LIMIT || "20", 10);

  let body;
  try { body = await request.json(); } catch { return ok({ error: "JSON inválido" }, 400); }

  const uid = String(body.uid || "").trim().slice(0, 128);
  if (!uid) return ok({ error: "UID requerido" }, 400);

  const tipo = String(body.tipo || "chat");

  // ── Rate-limiting por UID y día ──
  const hoy     = new Date().toISOString().slice(0, 10); // "2024-10-22"
  const rlKey   = `ia_v:${uid}:${hoy}`;
  let usadas    = 0;

  if (kv) {
    const raw = await kv.get(rlKey);
    usadas     = raw ? parseInt(raw, 10) : 0;
    if (usadas >= LIMITE_DIARIO) {
      return ok({
        error: `Alcanzaste el límite de ${LIMITE_DIARIO} consultas por hoy. Vuelve mañana.`,
        limiteDiario: { usadas, total: LIMITE_DIARIO }
      }, 429);
    }
  }

  // ── Construir el prompt según el tipo ──
  const modelo = env.GEMINI_MODEL || "gemini-2.0-flash";
  let prompt;

  if (tipo === "descripcion") {
    prompt = construirPromptDescripcion(body);
  } else if (tipo === "grafica") {
    prompt = construirPromptGrafica(body);
  } else {
    prompt = construirPromptChat(body);
  }

  if (!prompt) return ok({ error: "Datos insuficientes para la consulta" }, 400);

  // ── Llamar a Gemini ──
  const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${modelo}:generateContent`;

  const instruccionBase =
    "Eres el asistente de ventas de PriceNice, una plataforma colombiana para comparar precios. " +
    "Ayudas a los vendedores a vender más. Hablas en español colombiano, con un tono cercano, " +
    "claro y motivador. Eres breve: máximo 3 párrafos por respuesta. " +
    "REGLAS IMPORTANTES: " +
    "1. Nunca inventes características del producto (materiales, garantías, medidas) que no se mencionaron. " +
    "2. Si los datos son de ejemplo o no son reales, dilo explícitamente antes de dar consejos. " +
    "3. No muestres datos de otros vendedores. " +
    "4. No cambies precios, no borres productos, no publiques nada: solo das sugerencias. " +
    "5. Si el vendedor no tiene productos aún, guíalo con los primeros pasos.";

  const historialGemini = [];
  if (Array.isArray(body.historial)) {
    body.historial.slice(-6).forEach(m => {
      if (m && typeof m.texto === "string") {
        historialGemini.push({
          role:  m.rol === "ia" ? "model" : "user",
          parts: [{ text: m.texto.slice(0, 500) }]
        });
      }
    });
  }
  historialGemini.push({ role: "user", parts: [{ text: prompt }] });

  let respuestaTexto = "";
  try {
    const r = await fetch(geminiUrl, {
      method:  "POST",
      headers: { "Content-Type": "application/json", "x-goog-api-key": env.GEMINI_API_KEY },
      body:    JSON.stringify({
        systemInstruction: { parts: [{ text: instruccionBase }] },
        contents:          historialGemini,
        generationConfig:  { maxOutputTokens: 600, temperature: 0.55 }
      })
    });
    if (!r.ok) return ok({ error: "IA no disponible en este momento" }, 502);
    const json = await r.json();
    respuestaTexto = json?.candidates?.[0]?.content?.parts?.map(p => p.text).join("") || "";
    if (!respuestaTexto) return ok({ error: "Sin respuesta de la IA" }, 502);
  } catch {
    return ok({ error: "Error de conexión con la IA" }, 502);
  }

  // ── Actualizar rate-limit en KV ──
  if (kv) {
    usadas++;
    // Expira al final del día (segundos hasta medianoche UTC)
    const ahora   = new Date();
    const manana  = new Date(ahora);
    manana.setUTCDate(ahora.getUTCDate() + 1);
    manana.setUTCHours(0, 0, 0, 0);
    const ttl = Math.ceil((manana - ahora) / 1000) + 60;
    await kv.put(rlKey, String(usadas), { expirationTtl: ttl });
  }

  // ── Para tipo "descripcion", extraer sugerencias del texto ──
  let sugerencias = null;
  if (tipo === "descripcion") {
    sugerencias = extraerSugerencias(respuestaTexto);
  }

  return ok({
    ok:       true,
    respuesta: respuestaTexto,
    ...(sugerencias ? { sugerencias } : {}),
    limiteDiario: { usadas, total: LIMITE_DIARIO }
  });
}

/* ── Prompt: mejorar descripción ── */
function construirPromptDescripcion(body) {
  const p = body.producto || {};
  if (!p.nombre) return null;

  const tienda = body.tienda || {};
  const lines  = [
    `Tienda: "${tienda.nombre || "sin nombre"}", barrio: "${tienda.barrio || "Bogotá"}", categoría principal: "${tienda.categoria || "general"}".`,
    `Producto: "${p.nombre}"`,
    p.categoria ? `Categoría del producto: ${p.categoria}` : "",
    p.precio    ? `Precio: $${Number(p.precio).toLocaleString("es-CO")} COP` : "",
    p.descripcionActual ? `Descripción actual del vendedor: "${p.descripcionActual}"` : "El vendedor aún no escribió descripción."
  ].filter(Boolean).join("\n");

  return (
    `${lines}\n\n` +
    `Basándote SOLO en los datos que te di (no inventes características), ` +
    `escribe 3 opciones de descripción para este producto:\n` +
    `1. CORTA: máximo 2 oraciones, directa y clara.\n` +
    `2. LLAMATIVA: usa un gancho emocional o de valor, máximo 3 oraciones.\n` +
    `3. DETALLADA: 4-5 oraciones, menciona el uso, el beneficio y cómo conseguirlo.\n\n` +
    `Luego sugiere:\n` +
    `- Un título alternativo más atractivo (si el actual puede mejorar).\n` +
    `- 3-5 palabras clave para etiquetas.\n` +
    `- Qué fotos conviene subir (sin inventar características del producto).\n\n` +
    `Formato: usa exactamente las etiquetas [CORTA], [LLAMATIVA], [DETALLADA], [TITULO], [ETIQUETAS], [FOTOS].`
  );
}

/* ── Prompt: explicar gráfica ── */
function construirPromptGrafica(body) {
  const m = body.metricas || {};
  const tienda = body.tienda || {};

  const sinDatos = !!m.sinDatos;
  const resumen  = [
    `Tienda: "${tienda.nombre || "sin nombre"}", barrio: "${tienda.barrio || "Bogotá"}".`,
    `Total productos publicados: ${m.totalProductos || 0}.`,
    `Total reseñas: ${m.totalReseñas || 0}.`,
    `Calificación promedio: ${m.calificacion ? Number(m.calificacion).toFixed(1) : "0.0"}.`,
  ];

  if (sinDatos) {
    resumen.push("IMPORTANTE: Los datos de la gráfica son datos de EJEMPLO, no reales todavía.");
  } else if (Array.isArray(m.vistas) && m.vistas.length) {
    const meses = m.meses || [];
    const pares = m.vistas.map((v, i) => `${meses[i] || "M" + (i + 1)}: ${v} vistas, ${(m.clics || [])[i] || 0} clics`);
    resumen.push(`Datos mensuales: ${pares.join("; ")}.`);
  }

  return (
    resumen.join("\n") + "\n\n" +
    (sinDatos
      ? `Los datos son de ejemplo. Explica qué SIGNIFICA cada barra de la gráfica en general ` +
        `(vistas vs clics) y qué debería buscar el vendedor cuando tenga datos reales. ` +
        `Da 2-3 consejos generales para mejorar el interés de compradores, ` +
        `dejando claro que son consejos generales, no basados en datos reales todavía.`
      : `Analiza estos datos reales. ¿Qué tendencias ves? ¿Hay meses fuertes o débiles? ` +
        `¿La relación vistas/clics es buena? Da 2-3 recomendaciones concretas y fáciles de aplicar.`)
  );
}

/* ── Prompt: chat libre ── */
function construirPromptChat(body) {
  const pregunta = String(body.pregunta || "").trim().slice(0, 400);
  if (!pregunta) return null;

  const tienda   = body.tienda || {};
  const metricas = body.metricas || {};

  const contexto = [
    `Tienda: "${tienda.nombre || "sin nombre"}", barrio: "${tienda.barrio || "Bogotá"}".`,
    `Productos publicados: ${metricas.totalProductos || 0}.`,
    `Reseñas: ${metricas.totalReseñas || 0}. Calificación: ${metricas.calificacion ? Number(metricas.calificacion).toFixed(1) : "0.0"}.`,
    metricas.sinDatos ? "Nota: los datos de la gráfica son de ejemplo, no reales." : ""
  ].filter(Boolean).join(" ");

  return `Contexto del vendedor: ${contexto}\n\nPregunta del vendedor: "${pregunta}"`;
}

/* ── Extraer sugerencias etiquetadas ── */
function extraerSugerencias(texto) {
  const tags   = ["[CORTA]", "[LLAMATIVA]", "[DETALLADA]"];
  const result = [];
  tags.forEach(tag => {
    const idx = texto.indexOf(tag);
    if (idx === -1) return;
    const inicio  = idx + tag.length;
    const nextTag = Math.min(
      ...["[LLAMATIVA]", "[DETALLADA]", "[TITULO]", "[ETIQUETAS]", "[FOTOS]"]
        .map(t => { const i = texto.indexOf(t, inicio); return i === -1 ? Infinity : i; })
    );
    const frag = texto.slice(inicio, isFinite(nextTag) ? nextTag : undefined).trim();
    if (frag) result.push(frag);
  });
  return result.length ? result : null;
}

/* ──────────────────────────────────────────────
────────────────────────────────────────────── */
async function handleChatbot(request, env, ok) {
  if (!env.GEMINI_API_KEY) return ok({ error: "Servicio no configurado" }, 500);

  let datos;
  try { datos = await request.json(); } catch { return ok({ error: "JSON inválido" }, 400); }

  const mensaje  = String(datos.mensaje  || "").trim().slice(0, MAX_MENSAJE);
  if (!mensaje) return ok({ error: "Falta el mensaje" }, 400);
  const contexto  = String(datos.contexto  || "").slice(0, MAX_CONTEXTO);
  const historial = Array.isArray(datos.historial) ? datos.historial.slice(-6) : [];

  const instruccion =
    "Eres el asistente de PriceNice, una plataforma para comparar precios en Bogotá. " +
    "Responde en español, de forma breve y amable, usando solo esta información:\n" + contexto;

  const contenido = historial
    .filter(m => m && typeof m.texto === "string")
    .map(m => ({
      role:  m.rol === "bot" ? "model" : "user",
      parts: [{ text: m.texto.slice(0, MAX_MENSAJE) }]
    }));
  contenido.push({ role: "user", parts: [{ text: mensaje }] });

  const modelo = env.GEMINI_MODEL || "gemini-2.0-flash";
  const url    = `https://generativelanguage.googleapis.com/v1beta/models/${modelo}:generateContent`;

  try {
    const r = await fetch(url, {
      method:  "POST",
      headers: { "Content-Type": "application/json", "x-goog-api-key": env.GEMINI_API_KEY },
      body:    JSON.stringify({
        systemInstruction: { parts: [{ text: instruccion }] },
        contents:          contenido,
        generationConfig:  { maxOutputTokens: 400, temperature: 0.4 }
      })
    });
    if (!r.ok) return ok({ error: "IA no disponible" }, 502);
    const json  = await r.json();
    const texto = json?.candidates?.[0]?.content?.parts?.map(p => p.text).join("") || "";
    if (!texto) return ok({ error: "Sin respuesta" }, 502);
    return ok({ respuesta: texto });
  } catch {
    return ok({ error: "IA no disponible" }, 502);
  }
}

/* ──────────────────────────────────────────────
   HELPERS
────────────────────────────────────────────── */

/** Respuesta genérica cuando el código es incorrecto o el modo está desactivado.
 *  Indistinguible de un correo inválido para el navegador. */
function genericoNoAutorizado(ok) {
  return ok({ error: "Correo no válido" }, 400);
}

/** Comparación de strings en tiempo constante para evitar timing attacks. */
async function tiempoConstanteIgual(a, b) {
  if (typeof a !== "string" || typeof b !== "string") return false;
  // Igualar longitudes para que la comparación tarde lo mismo
  const enc = new TextEncoder();
  const bufA = enc.encode(a.padEnd(Math.max(a.length, b.length), "\0"));
  const bufB = enc.encode(b.padEnd(Math.max(a.length, b.length), "\0"));
  // XOR byte a byte
  let diff = bufA.length !== bufB.length ? 1 : 0;
  const len = Math.min(bufA.length, bufB.length);
  for (let i = 0; i < len; i++) diff |= bufA[i] ^ bufB[i];
  return diff === 0;
}
