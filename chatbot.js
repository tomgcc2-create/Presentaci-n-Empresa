/* ==========================================================
   CHATBOT — motor (no necesitas editar este archivo)
   El conocimiento se edita en conocimiento.js
   ========================================================== */

/* ---- CONFIGURACIÓN OPCIONAL: IA real con Google Gemini (gratis) ----
   Déjalo vacío ("") para usar solo tu base de conocimiento.
   Si haces el Paso 6, pega aquí la URL de tu Worker de Cloudflare.   */
const CHATBOT_URL_IA = "https://chatbot-miempresa.priceniceworld.workers.dev";

(function () {
  const KB = window.CONOCIMIENTO || (typeof CONOCIMIENTO !== "undefined" ? CONOCIMIENTO : null);
  if (!KB) { console.error("Chatbot: falta conocimiento.js"); return; }

  const UMBRAL = 0.42; // qué tan parecida debe ser la pregunta (0 a 1)
  const STOP = new Set(("a al algo algun alguna como con cual cuales de del el ella ellos en es esa ese eso esta este esto la las le les lo los me mi mis muy no o para pero por que quien se si sin sobre su sus te tu tus un una uno unos unas y ya yo hay puedo pueden saber favor usted ustedes ser son estan tienen tiene tengo hola").split(" "));

  /* ---------- Procesamiento de texto ---------- */
  const normalizar = t =>
    t.toLowerCase().normalize("NFD").replace(/\p{Diacritic}/gu, "")
      .replace(/[^a-z0-9ñ\s]/g, " ").replace(/\s+/g, " ").trim();

  const raiz = w => w.length > 5 && w.endsWith("es") ? w.slice(0, -2)
              : w.length > 3 && w.endsWith("s")  ? w.slice(0, -1) : w;

  function tokens(t) {
    const todas  = normalizar(t).split(" ").filter(Boolean);
    const utiles = todas.filter(w => !STOP.has(w));
    return (utiles.length ? utiles : todas).map(raiz);
  }

  function distancia(a, b) { // Levenshtein para tolerar errores de escritura
    if (Math.abs(a.length - b.length) > 2) return 99;
    const d = Array.from({ length: a.length + 1 }, (_, i) => [i]);
    for (let j = 1; j <= b.length; j++) d[0][j] = j;
    for (let i = 1; i <= a.length; i++)
      for (let j = 1; j <= b.length; j++)
        d[i][j] = Math.min(d[i-1][j] + 1, d[i][j-1] + 1, d[i-1][j-1] + (a[i-1] === b[j-1] ? 0 : 1));
    return d[a.length][b.length];
  }

  function parecidas(a, b) {
    if (a === b) return 1;
    if (a.length >= 5 && b.length >= 5 && (a.startsWith(b) || b.startsWith(a))) return 0.9;
    const tol = Math.min(a.length, b.length) >= 7 ? 2 : Math.min(a.length, b.length) >= 4 ? 1 : 0;
    return tol && distancia(a, b) <= tol ? 0.8 : 0;
  }

  function similitud(tu, tp) {
    if (!tu.length || !tp.length) return 0;
    let suma = 0;
    for (const u of tu) suma += Math.max(0, ...tp.map(p => parecidas(u, p)));
    const cubreUsuario  = suma / tu.length;
    const cubrePregunta = suma / tp.length;
    return 0.65 * cubreUsuario + 0.35 * Math.min(1, cubrePregunta);
  }

  const indice = KB.temas.map(t => ({ tema: t, variantes: t.preguntas.map(tokens) }));

  function buscar(texto) {
    const tu = tokens(texto);
    let mejor = null, puntaje = 0;
    for (const item of indice) {
      for (const tp of item.variantes) {
        const s = similitud(tu, tp);
        if (s > puntaje) { puntaje = s; mejor = item.tema; }
      }
    }
    return puntaje >= UMBRAL ? mejor : null;
  }

  /* ---------- Interfaz ---------- */
  const esc = s => s.replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const formato = s => esc(s).replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>").replace(/\n/g, "<br>");

  const raizUI = document.createElement("div");
  raizUI.className = "cb";
  raizUI.innerHTML = `
    <button class="cb-toggle" aria-label="Abrir chat"><img src="img/logo-chat.png" alt="Abrir chat"></button>
    <section class="cb-ventana" role="dialog" aria-label="${esc(KB.nombreBot)}">
      <header class="cb-cabecera">
        <div class="cb-avatar"><img src="img/logo-chat.png" alt="PriceNice"></div>
        <div><strong>${esc(KB.nombreBot)}</strong><small>En línea</small></div>
        <button class="cb-cerrar" aria-label="Cerrar chat">✕</button>
      </header>
      <div class="cb-mensajes" aria-live="polite"></div>
      <form class="cb-form">
        <input type="text" placeholder="Escribe tu pregunta..." autocomplete="off" maxlength="300" aria-label="Mensaje">
        <button type="submit" aria-label="Enviar"><svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14M13 6l6 6-6 6"/></svg></button>
      </form>
    </section>`;
  document.body.appendChild(raizUI);

  const $      = s => raizUI.querySelector(s);
  const lista  = $(".cb-mensajes"), entrada = $(".cb-form input");
  const historial = [];
  let iniciado = false;

  function abrir(on) {
    raizUI.classList.toggle("abierto", on);
    if (on && !iniciado) { iniciado = true; mostrarAccesos(); }
    if (on) setTimeout(() => entrada.focus(), 200);
  }
  $(".cb-toggle").onclick = () => abrir(!raizUI.classList.contains("abierto"));
  $(".cb-cerrar").onclick = () => abrir(false);

  function agregar(html, quien) {
    const div = document.createElement("div");
    div.className = "cb-msg cb-" + quien;
    div.innerHTML = html;
    lista.appendChild(div);
    lista.scrollTop = lista.scrollHeight;
    return div;
  }

  /* ---------- Pantalla de inicio: saludo + mascota + categorías ---------- */
  const svg = d => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${d}</svg>`;
  const IC = {
    precio: svg('<path d="M12 2v20M17 6H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>'),
    tienda: svg('<path d="M20 10c0 6-8 12-8 12S4 16 4 10a8 8 0 0 1 16 0z"/><circle cx="12" cy="10" r="3"/>'),
    info:   svg('<circle cx="12" cy="12" r="10"/><path d="M12 16v-4M12 8h.01"/>'),
    mail:   svg('<rect x="3" y="5" width="18" height="14" rx="2"/><path d="m3 7 9 6 9-6"/>'),
    reloj:  svg('<circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/>'),
    user:   svg('<circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/>'),
    heart:  svg('<path d="M20.8 5.6a5.5 5.5 0 0 0-7.8 0L12 6.7l-1-1.1a5.5 5.5 0 0 0-7.8 7.8L12 22l8.8-8.6a5.5 5.5 0 0 0 0-7.8z"/>'),
    cart:   svg('<circle cx="9" cy="20" r="1.5"/><circle cx="18" cy="20" r="1.5"/><path d="M2 3h3l2.7 12.4a2 2 0 0 0 2 1.6h7.7a2 2 0 0 0 2-1.5L21 8H6"/>'),
    chat:   svg('<path d="M21 12a8 8 0 0 1-11.6 7.1L4 20l1-4.6A8 8 0 1 1 21 12z"/>'),
    flecha: svg('<path d="M7 17 17 7M8 7h9v9"/>')
  };
  const CATEGORIAS = [
    { id: "precios", t: "Precios", items: [
      { ico: IC.precio, q: "¿Cómo comparo precios?",       d: "Busca y compara entre tiendas" },
      { ico: IC.precio, q: "¿Dónde está el mejor precio?", d: "Encuentra lo más barato" },
      { ico: IC.precio, q: "¿Cuánto cuesta?",              d: "Consulta tarifas y costos" } ] },
    { id: "tiendas", t: "Tiendas", items: [
      { ico: IC.tienda, q: "Tiendas cercanas",             d: "Mira el mapa cerca de ti" },
      { ico: IC.tienda, q: "¿Dónde están ubicados?",       d: "Ciudad y dirección" },
      { ico: IC.info,   q: "¿Qué servicios ofrecen?",      d: "Lo que puedes hacer aquí" } ] },
    { id: "contacto", t: "Contacto", items: [
      { ico: IC.mail,   q: "¿Cómo los contacto?",          d: "Correo y canales de atención" },
      { ico: IC.reloj,  q: "Horario de atención",          d: "Cuándo te respondemos" },
      { ico: IC.chat,   q: "Quiero hablar con un asesor",  d: "Soporte personalizado" } ] },
    { id: "cuenta", t: "Mi cuenta", items: [
      { ico: IC.user,   q: "¿Cómo me registro?",           d: "Crea tu cuenta gratis" },
      { ico: IC.heart,  q: "Mis favoritos",                d: "Guarda tus productos" },
      { ico: IC.cart,   q: "Mi carrito",                   d: "Revisa tus compras" } ] },
    { id: "vender", t: "Vender", items: [
      { ico: IC.tienda, q: "Soy vendedor",                 d: "Entra a tu panel de vendedor" },
      { ico: IC.info,   q: "¿Cómo publico un producto?",   d: "Publica en PriceNice" } ] }
  ];

  let nombreUsuario = null;               // null = visitante
  const primerNombre = n => (n || "").trim().split(/\s+/)[0];

  function textoSaludo() {
    const h = new Date().getHours();
    const momento = h < 12 ? "Buenos días" : h < 19 ? "Buenas tardes" : "Buenas noches";
    return { momento, nombre: nombreUsuario || "usuario" };
  }
  function pintarSaludo() {
    const el = lista.querySelector(".cb-inicio .cb-saludo");
    if (!el) return;
    const s = textoSaludo();
    el.innerHTML = `<small>${s.momento} 👋</small><h2>Hola, <span>${esc(s.nombre)}</span></h2>
      <p>${nombreUsuario ? "¿Qué quieres saber hoy?" : "¿Cómo estás? Soy tu asistente de PriceNice."}</p>`;
  }
  window.chatbotSetUsuario = n => { nombreUsuario = n ? primerNombre(n) : null; pintarSaludo(); };

  // Si la persona ya inició sesión, usamos su nombre (solo lee la sesión, no cambia nada)
  import("./auth.js").then(m => {
    if (typeof m.observarSesion !== "function") return;
    m.observarSesion(u => window.chatbotSetUsuario(u ? (u.displayName || (u.email || "").split("@")[0]) : null));
  }).catch(() => {});

  function mostrarAccesos() {
    const cont = document.createElement("div");
    cont.className = "cb-inicio";
    cont.innerHTML = `
      <div class="cb-saludo"></div>
      <div class="cb-banner">
        <div class="cb-banner-txt">
          <b>Compara y ahorra</b>
          <span>Encuentra el mejor precio y las tiendas cerca de ti.</span>
          <button type="button" class="cb-banner-btn">Comparar precios</button>
        </div>
        <img class="cb-mascota" src="img/logo-chat.png" alt="">
      </div>
      <div class="cb-cat-titulo"><b>¿Qué quieres saber?</b></div>
      <div class="cb-pills"></div>
      <div class="cb-preguntas"></div>`;
    lista.appendChild(cont);
    pintarSaludo();

    cont.querySelector(".cb-banner-btn").onclick = () => enviar("¿Cómo comparo precios?");
    const pills = cont.querySelector(".cb-pills"), cuerpo = cont.querySelector(".cb-preguntas");

    function elegir(cat) {
      pills.querySelectorAll("button").forEach(b => b.classList.toggle("activa", b.dataset.id === cat.id));
      cuerpo.innerHTML = "";
      cat.items.forEach(it => {
        const b = document.createElement("button");
        b.className = "cb-pregunta";
        b.innerHTML = `<span class="ico">${it.ico}</span><span class="tx"><b>${esc(it.q)}</b><small>${esc(it.d)}</small></span><span class="go">${IC.flecha}</span>`;
        b.onclick = () => enviar(it.q);
        cuerpo.appendChild(b);
      });
    }
    CATEGORIAS.forEach((cat, k) => {
      const p = document.createElement("button");
      p.type = "button"; p.dataset.id = cat.id; p.textContent = cat.t;
      p.onclick = () => elegir(cat);
      pills.appendChild(p);
      if (k === 0) elegir(cat);
    });
  }

  function ejecutarAccion(a) {
    if (a.pagina) {
      if (typeof window.cargar === "function" && document.getElementById("visor")) {
        window.cargar(a.pagina);
        document.getElementById("visor").scrollIntoView({ behavior: "smooth" });
      } else location.href = a.pagina;
    } else if (a.url) {
      if (a.url.startsWith("#")) document.querySelector(a.url)?.scrollIntoView({ behavior: "smooth" });
      else location.href = a.url;
    }
  }

  function responderBot(texto, accion, sugerencias) {
    const div = agregar(formato(texto), "bot");
    if (accion) {
      const b = document.createElement("button");
      b.className = "cb-accion"; b.textContent = accion.texto + " ›";
      b.onclick = () => ejecutarAccion(accion);
      div.appendChild(b);
    }
    if (sugerencias?.length) {
      const cont = document.createElement("div");
      cont.className = "cb-chips";
      sugerencias.forEach(s => {
        const c = document.createElement("button");
        c.textContent = s; c.onclick = () => enviar(s);
        cont.appendChild(c);
      });
      lista.appendChild(cont);
    }
    historial.push({ rol: "bot", texto });
    lista.scrollTop = lista.scrollHeight;
  }

  const escribiendo = () => agregar('<span class="cb-puntos"><i></i><i></i><i></i></span>', "bot cb-escribiendo");

  async function preguntarIA(texto) {
    const contexto = KB.temas.map(t => `- ${t.preguntas[0]}:\n${t.respuesta}`).join("\n");
    const r = await fetch(CHATBOT_URL_IA, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ mensaje: texto, contexto, historial: historial.slice(-6) })
    });
    if (!r.ok) throw new Error("IA no disponible");
    return (await r.json()).respuesta;
  }

  async function enviar(texto) {
    texto = texto.trim();
    if (!texto) return;
    lista.querySelectorAll(".cb-chips, .cb-inicio").forEach(c => c.remove());
    agregar(esc(texto), "usuario");
    historial.push({ rol: "usuario", texto });
    entrada.value = "";

    const tema     = buscar(texto);
    const cargando = escribiendo();

    if (tema) {
      await new Promise(r => setTimeout(r, 450 + Math.random() * 400));
      cargando.remove();
      return responderBot(tema.respuesta, tema.accion);
    }
    if (CHATBOT_URL_IA) {
      try {
        const resp = await preguntarIA(texto);
        cargando.remove();
        return responderBot(resp);
      } catch (e) { console.warn(e); }
    }
    await new Promise(r => setTimeout(r, 400));
    cargando.remove();
    responderBot(KB.noEntiendo, null, KB.sugerencias);
  }

  $(".cb-form").onsubmit = e => { e.preventDefault(); enviar(entrada.value); };
  document.addEventListener("keydown", e => { if (e.key === "Escape") abrir(false); });

  // Para probar desde la consola del navegador: chatbotProbar("cuanto vale")
  window.chatbotProbar = t => { const r = buscar(t); console.log(r ? r.preguntas[0] : "sin coincidencia"); };
})();
