/**
 * PriceNice — Cloudflare Worker del chatbot (intermediario hacia Google Gemini)
 *
 * El navegador envía:  POST { mensaje, contexto, historial: [{ rol, texto }] }
 * El Worker responde:  { respuesta }
 *
 * Variables / secretos (Cloudflare → Workers → Settings → Variables):
 *   GEMINI_API_KEY   (secreto)  clave de Google AI Studio. NUNCA va en el código ni en el navegador.
 *   ALLOWED_ORIGINS  (texto)    orígenes permitidos separados por coma, p. ej. https://tusitio.com
 *   GEMINI_MODEL     (texto)    opcional; modelo de Gemini a usar (verifica el vigente en la documentación)
 *
 * Recomendado además: activar una regla de límite de peticiones (Rate limiting) en Cloudflare.
 */
const MAX_MENSAJE = 500;
const MAX_CONTEXTO = 8000;

function cabeceras(origen, permitido) {
  return {
    "Access-Control-Allow-Origin": permitido ? origen : "null",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    "Vary": "Origin",
    "Content-Type": "application/json; charset=utf-8"
  };
}

export default {
  async fetch(request, env) {
    const origen = request.headers.get("Origin") || "";
    const lista = (env.ALLOWED_ORIGINS || "").split(",").map(s => s.trim()).filter(Boolean);
    const permitido = lista.length > 0 && lista.includes(origen);
    const h = cabeceras(origen, permitido);
    const responder = (obj, status = 200) => new Response(JSON.stringify(obj), { status, headers: h });

    if (request.method === "OPTIONS") return new Response(null, { status: 204, headers: h });
    if (!permitido) return responder({ error: "Origen no permitido" }, 403);
    if (request.method !== "POST") return responder({ error: "Método no permitido" }, 405);
    if (!env.GEMINI_API_KEY) return responder({ error: "Servicio no configurado" }, 500);

    let datos;
    try { datos = await request.json(); } catch { return responder({ error: "JSON inválido" }, 400); }

    const mensaje = String(datos.mensaje || "").trim().slice(0, MAX_MENSAJE);
    if (!mensaje) return responder({ error: "Falta el mensaje" }, 400);
    const contexto = String(datos.contexto || "").slice(0, MAX_CONTEXTO);
    const historial = Array.isArray(datos.historial) ? datos.historial.slice(-6) : [];

    const instruccion =
      "Eres el asistente de PriceNice, una plataforma para comparar precios en Bogotá. " +
      "Responde en español, de forma breve y amable, usando solo esta información:\n" + contexto;

    const contenido = historial
      .filter(m => m && typeof m.texto === "string")
      .map(m => ({ role: m.rol === "bot" ? "model" : "user", parts: [{ text: m.texto.slice(0, MAX_MENSAJE) }] }));
    contenido.push({ role: "user", parts: [{ text: mensaje }] });

    const modelo = env.GEMINI_MODEL || "gemini-2.0-flash";
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${modelo}:generateContent`;

    try {
      const r = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-goog-api-key": env.GEMINI_API_KEY },
        body: JSON.stringify({
          systemInstruction: { parts: [{ text: instruccion }] },
          contents: contenido,
          generationConfig: { maxOutputTokens: 400, temperature: 0.4 }
        })
      });
      if (!r.ok) return responder({ error: "IA no disponible" }, 502);
      const json = await r.json();
      const texto = json?.candidates?.[0]?.content?.parts?.map(p => p.text).join("") || "";
      if (!texto) return responder({ error: "Sin respuesta" }, 502);
      return responder({ respuesta: texto });
    } catch {
      return responder({ error: "IA no disponible" }, 502);
    }
  }
};
