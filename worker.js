/**
 * PriceNice — Cloudflare Worker
 *
 * Endpoints:
 *   POST /          → chatbot (intermediario hacia Google Gemini)
 *   POST /admin-test → modo administrador de pruebas
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
 *   ADMIN_TEST_CODE  (secreto)  El código secreto que el admin escribe en el campo correo.
 *                               Ejemplo: "PRICENICE-2024-ADMIN"
 *                               NUNCA debe aparecer en el código del navegador.
 *   ADMIN_TEST_MODE  (texto)    "true" para activar, "false" para desactivar antes de producción.
 *                               Por defecto: desactivado si la variable no existe.
 *   ADMIN_SALT       (secreto)  Salt aleatorio (32+ chars) para firmar los tokens de sesión.
 *
 *  KV NAMESPACE:
 *   RATE_LIMIT_KV    Namespace de KV enlazado al Worker (binding "RATE_LIMIT_KV").
 *                    Úsalo para rate-limiting y registro de usos.
 *                    Si no tienes KV, el Worker funciona igual pero sin persistencia.
 *
 * ─────────────────────────────────────────────────────────
 * SEGURIDAD:
 *   • El código secreto NUNCA se envía al navegador.
 *   • El servidor responde igual si el código está mal o si el modo está desactivado
 *     (no revela si el modo existe).
 *   • Rate-limiting: máximo 5 intentos por IP en 15 minutos.
 *   • Cada uso exitoso se registra (IP, fecha/hora, perfil elegido) en KV.
 *   • Los tokens de sesión firmados expiran en 30 minutos.
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
  usuario:      { label: "Usuario normal",  url: "usuario.html"              },
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
   HANDLER: CHATBOT (comportamiento original)
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
