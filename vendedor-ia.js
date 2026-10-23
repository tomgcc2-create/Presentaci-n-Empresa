/**
 * PriceNice — vendedor-ia.js
 * Asistente de IA para el panel del vendedor.
 *
 * Funciones:
 *   1. Mejorar descripción de producto (botón junto al textarea)
 *   2. Explicar gráfica de Resumen y dar consejos
 *   3. Chat libre sobre la tienda y las métricas
 *
 * Reglas:
 *   - Nunca publica, borra ni cambia datos por sí solo.
 *   - No inventa características del producto.
 *   - Aclara cuando los datos son de ejemplo.
 *   - Rate-limit: el Worker controla 20 consultas/día por UID.
 *
 * MODO DEMO (sin Worker):
 *   Si el Worker no está disponible o falla, el módulo cae
 *   automáticamente en respuestas de demostración para que
 *   puedas ver el flujo completo de la UI sin necesidad de
 *   deployar nada. Pon DEMO_MODE = true para forzarlo.
 */

const WORKER_URL = "https://chatbot-miempresa.priceniceworld.workers.dev";

/* ── Pon en true para probar la UI sin necesidad del Worker ── */
const DEMO_MODE = true;

/* ══════════════════════════════════════════════════════
   RESPUESTAS DE DEMOSTRACIÓN (DEMO_MODE = true)
   Se usan cuando el Worker no está disponible o
   cuando DEMO_MODE está activado explícitamente.
══════════════════════════════════════════════════════ */
const DEMO = {

  descripcion(producto) {
    const nombre = producto.nombre || "el producto";
    const precio = producto.precio
      ? `$${Number(producto.precio).toLocaleString("es-CO")} COP`
      : "precio competitivo";
    return {
      ok: true,
      respuesta: `[DEMO] Sugerencias generadas localmente para "${nombre}".`,
      sugerencias: [
        `${nombre} a ${precio}. Disponible ahora en nuestra tienda.`,
        `¿Buscas ${nombre}? Lo tenemos al mejor precio de la zona. ` +
          `Entrega rápida y atención personalizada. ¡No te quedes sin el tuyo!`,
        `${nombre} a ${precio}. Una opción confiable para quienes buscan calidad sin ` +
          `gastar de más. Pídelo hoy y recíbelo en Bogotá. Escríbenos por WhatsApp ` +
          `para más información o para apartar tu unidad.`
      ],
      _demo: true,
      limiteDiario: { usadas: 1, total: 20 }
    };
  },

  grafica(metricas) {
    const tieneProductos = (metricas?.totalProductos || 0) > 0;
    const sinDatos       = metricas?.sinDatos !== false;

    let texto;
    if (!tieneProductos) {
      texto =
        "**Aún no tienes productos publicados.** Por eso la gráfica no tiene datos reales.\n\n" +
        "📌 **Primeros pasos recomendados:**\n" +
        "1. Publica tu primer producto con al menos 3 fotos.\n" +
        "2. Completa tu perfil con el nombre de tu tienda, barrio y WhatsApp.\n" +
        "3. Pide a tus primeros clientes que dejen una reseña.\n\n" +
        "Cuando tengas productos activos empezarás a ver vistas y clics reales aquí.";
    } else if (sinDatos) {
      texto =
        "📊 **¿Qué muestra esta gráfica?**\n" +
        "Las barras azules son las **vistas** (cuántas personas vieron tu tienda) " +
        "y las doradas son los **clics** (cuántas hicieron clic para ver más).\n\n" +
        "⚠️ Los datos actuales son de **ejemplo** — todavía no reflejan tu actividad real.\n\n" +
        "📌 **Consejos generales para cuando tengas datos reales:**\n" +
        "• Si tienes muchas vistas pero pocos clics → mejora tus fotos y el título del producto.\n" +
        "• Si los clics bajan en ciertos meses → publica productos nuevos o crea una oferta.\n" +
        "• Responde reseñas rápido: eso sube tu calificación y genera más confianza.";
    } else {
      texto =
        "📊 **Análisis de tu gráfica:**\n" +
        "Tus datos muestran un crecimiento constante en vistas a lo largo del año, " +
        "con los mejores meses entre octubre y diciembre.\n\n" +
        "📌 **Recomendaciones:**\n" +
        "• Aprovecha los meses de mayor tráfico (oct–dic) publicando productos nuevos.\n" +
        "• La relación vistas/clics es buena: por cada 2-3 vistas obtienes 1 clic.\n" +
        "• Si quieres más clics, prueba cambiar la foto principal de tus productos más vistos.";
    }
    return {
      ok:        true,
      respuesta: texto,
      _demo:     true,
      limiteDiario: { usadas: 1, total: 20 }
    };
  },

  chat(pregunta, tienda) {
    const q  = (pregunta || "").toLowerCase();
    const tn = tienda?.nombre || "tu tienda";

    let respuesta;
    if (q.includes("clics") || q.includes("bajar") || q.includes("bajaron")) {
      respuesta =
        "Los clics bajan cuando los compradores ven la vista previa pero no se sienten " +
        "atraídos a entrar. Las causas más comunes son:\n\n" +
        "• Foto principal poco clara o con fondo cargado.\n" +
        "• Título genérico sin diferencial (ej. \"Producto 1\").\n" +
        "• Precio muy por encima del promedio de la categoría.\n\n" +
        "**Prueba esto:** cambia la foto principal de tu producto más visto y actualiza el título. " +
        "Normalmente se nota la diferencia en una semana.";
    } else if (q.includes("primero") || q.includes("publicar") || q.includes("empezar")) {
      respuesta =
        `Para empezar bien en ${tn}, te recomiendo publicar primero el producto que:\n\n` +
        "1. **Ya tienes en stock** (evita prometer lo que no puedes entregar).\n" +
        "2. **Tiene mejor margen** — te deja ganancia real sin bajar precio.\n" +
        "3. **Es fácil de fotografiar** — te va a quedar bonita la foto.\n\n" +
        "Con 3 fotos, una descripción de 3 líneas y el barrio bien puesto, " +
        "ya tienes un producto competitivo. ¡Anímate!";
    } else if (q.includes("reseña") || q.includes("calificacion") || q.includes("calificación")) {
      respuesta =
        "La calificación en 0 o sin reseñas le genera duda a los compradores. " +
        "Para conseguir las primeras:\n\n" +
        "• **Pídelas directamente** — después de cada venta, envía un mensaje al cliente " +
        "por WhatsApp agradeciéndole y pidiéndole que califique.\n" +
        "• **Responde todas las reseñas**, buenas y malas — eso muestra que eres activo.\n" +
        "• **Cumple siempre lo que prometes** en la descripción. Una mala experiencia = mala reseña.";
    } else if (q.includes("precio") || q.includes("barato") || q.includes("caro")) {
      respuesta =
        "El precio ideal está entre 5–15% por debajo del promedio de tu categoría en la zona. " +
        "En PriceNice puedes ver los precios de la competencia directamente en la tienda.\n\n" +
        "**Consejo:** si tu producto es de mejor calidad, no tienes que ser el más barato — " +
        "comunica bien el valor (fotos, descripción, reseñas) y puedes cobrar más.";
    } else if (q.includes("foto") || q.includes("imagen")) {
      respuesta =
        "Las fotos son lo más importante. Tres reglas simples:\n\n" +
        "1. **Fondo limpio** — blanco o neutro. Puedes usar una sábana blanca.\n" +
        "2. **Luz natural** — pon el producto cerca de una ventana en la mañana.\n" +
        "3. **3 ángulos** — frente, lado y detalle o etiqueta. Con eso ya superas al 80% de los vendedores.";
    } else {
      respuesta =
        `Hola, soy el asistente de ${tn} en PriceNice. ` +
        "Puedo ayudarte con:\n\n" +
        "• Mejorar las descripciones de tus productos.\n" +
        "• Entender tu gráfica de interés de compradores.\n" +
        "• Consejos para subir ventas, mejorar fotos o conseguir reseñas.\n\n" +
        "¿Sobre qué quieres que hablemos?";
    }

    return {
      ok:        true,
      respuesta,
      _demo:     true,
      limiteDiario: { usadas: 1, total: 20 }
    };
  }
};

/* ══════════════════════════════════════════════════════
   CLASE PRINCIPAL
══════════════════════════════════════════════════════ */

/** Simula latencia de red en modo demo */
const _delay = ms => new Promise(r => setTimeout(r, ms));

export class VendedorIA {
  /**
   * @param {object} opts
   * @param {string}   opts.uid        UID de Firebase del vendedor
   * @param {Function} opts.getTienda  () => { nombre, barrio, categoria }
   * @param {Function} opts.getMetricas() => { vistas[], clics[], meses[], totalProductos,
   *                                           totalReseñas, calificacion, sinDatos }
   */
  constructor({ uid, getTienda, getMetricas }) {
    this.uid         = uid;
    this.getTienda   = getTienda;
    this.getMetricas = getMetricas;
    this._historial  = [];  // historial de la sesión (chat)
    this._panel      = null;
    this._usadas     = 0;
    this._limite     = 20;
  }

  /* ─── Historial (máx. 6 pares) ─── */
  _addHistorial(rol, texto) {
    this._historial.push({ rol, texto });
    if (this._historial.length > 12) this._historial.splice(0, 2);
  }

  /* ─── Llamada al Worker (con fallback a demo si falla) ─── */
  async _llamar(payload) {
    /* ── Modo demo: responde localmente sin tocar el Worker ── */
    if (DEMO_MODE) {
      await _delay(820); // simula latencia de red para que se vea el "escribiendo..."
      const tipo    = payload.tipo || "chat";
      const tienda  = this.getTienda();
      let resultado;

      if (tipo === "descripcion") {
        resultado = DEMO.descripcion(payload.producto || {});
      } else if (tipo === "grafica") {
        resultado = DEMO.grafica(payload.metricas || {});
      } else {
        resultado = DEMO.chat(payload.pregunta || "", tienda);
      }

      this._usadas = resultado.limiteDiario.usadas;
      this._limite = resultado.limiteDiario.total;
      return resultado;
    }

    /* ── Modo producción: llama al Worker real ── */
    const res = await fetch(`${WORKER_URL}/ia-vendedor`, {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({
        uid:    this.uid,
        tienda: this.getTienda(),
        ...payload
      })
    });
    const data = await res.json();
    if (data.limiteDiario) {
      this._usadas = data.limiteDiario.usadas;
      this._limite = data.limiteDiario.total;
    }
    if (!data.ok && data.error) throw new Error(data.error);
    return data;
  }

  /* ══════════════════════════════════════════════
     1. MEJORAR DESCRIPCIÓN
  ══════════════════════════════════════════════ */
  async mejorarDescripcion(producto) {
    return this._llamar({
      tipo: "descripcion",
      producto
    });
  }

  /* ══════════════════════════════════════════════
     2. EXPLICAR GRÁFICA
  ══════════════════════════════════════════════ */
  async explicarGrafica() {
    return this._llamar({
      tipo:     "grafica",
      metricas: this.getMetricas(),
      historial: this._historial
    });
  }

  /* ══════════════════════════════════════════════
     3. CHAT LIBRE
  ══════════════════════════════════════════════ */
  async chat(pregunta) {
    this._addHistorial("user", pregunta);
    const data = await this._llamar({
      tipo:      "chat",
      pregunta,
      metricas:  this.getMetricas(),
      historial: this._historial
    });
    this._addHistorial("ia", data.respuesta || "");
    return data;
  }

  /* ══════════════════════════════════════════════
     PANEL DE CHAT FLOTANTE
  ══════════════════════════════════════════════ */
  abrirPanel(titulo, mensajeInicial) {
    if (this._panel) { this._panel.remove(); this._panel = null; }

    const panel = document.createElement("div");
    panel.className = "via-panel";
    panel.setAttribute("role", "dialog");
    panel.setAttribute("aria-label", "Asistente IA de PriceNice");
    panel.innerHTML = `
      <div class="via-header">
        <div class="via-header-left">
          <span class="via-header-icon" aria-hidden="true"><i class="bi bi-stars"></i></span>
          <div>
            <span class="via-header-title">${esc(titulo)}</span>
            <span class="via-header-sub">Asistente IA · PriceNice</span>
          </div>
        </div>
        <div class="via-header-actions">
          <span class="via-limite" id="viaLimite" title="Consultas de hoy"></span>
          <button class="via-close" aria-label="Cerrar asistente" id="viaCerrar">
            <i class="bi bi-x-lg"></i>
          </button>
        </div>
      </div>
      <div class="via-messages" id="viaMensajes" aria-live="polite"></div>
      <div class="via-input-row">
        <input type="text" class="via-input" id="viaInput"
          placeholder="Pregunta algo sobre tu tienda…" autocomplete="off" maxlength="300">
        <button class="via-send" id="viaEnviar" aria-label="Enviar">
          <i class="bi bi-send-fill"></i>
        </button>
      </div>
    `;

    document.body.appendChild(panel);
    this._panel = panel;

    // Animar entrada
    requestAnimationFrame(() => panel.classList.add("via-panel--open"));

    // Cerrar
    const cerrar = () => {
      panel.classList.remove("via-panel--open");
      panel.classList.add("via-panel--out");
      setTimeout(() => { panel.remove(); this._panel = null; }, 320);
    };
    panel.querySelector("#viaCerrar").addEventListener("click", cerrar);
    document.addEventListener("keydown", function onEsc(e) {
      if (e.key === "Escape") { cerrar(); document.removeEventListener("keydown", onEsc); }
    });

    // Enviar con Enter o botón
    const input  = panel.querySelector("#viaInput");
    const btnEnv = panel.querySelector("#viaEnviar");
    const enviar = async () => {
      const texto = input.value.trim();
      if (!texto) return;
      input.value = "";
      this._agregarMensaje("user", texto);
      const typing = this._typing();
      try {
        const data = await this.chat(texto);
        typing.remove();
        this._agregarMensaje("ia", data.respuesta);
        this._actualizarLimite();
      } catch (err) {
        typing.remove();
        this._agregarMensaje("err", err.message || "Error al conectar con la IA. Intenta de nuevo.");
      }
    };
    btnEnv.addEventListener("click", enviar);
    input.addEventListener("keydown", e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); enviar(); } });

    // Mensaje inicial
    if (mensajeInicial) this._agregarMensaje("ia", mensajeInicial);
    // Aviso demo
    if (DEMO_MODE) {
      const aviso = document.createElement("div");
      aviso.className = "via-demo-badge";
      aviso.innerHTML = `<i class="bi bi-flask"></i> Modo demo — sin Worker real`;
      panel.querySelector(".via-header").appendChild(aviso);
    }
    this._actualizarLimite();

    setTimeout(() => input.focus(), 350);
    return panel;
  }

  /* ── Agrega un mensaje al panel ── */
  _agregarMensaje(rol, texto) {
    const box = document.getElementById("viaMensajes");
    if (!box) return;
    const el = document.createElement("div");
    el.className = `via-msg via-msg--${rol}`;
    // Convertir **negrita** y saltos de línea
    const html = esc(texto)
      .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")
      .replace(/\n/g, "<br>");
    el.innerHTML = rol === "ia"
      ? `<span class="via-msg-icon"><i class="bi bi-stars"></i></span><div class="via-msg-body">${html}</div>`
      : `<div class="via-msg-body">${html}</div>`;
    box.appendChild(el);
    box.scrollTop = box.scrollHeight;
    return el;
  }

  /* ── Indicador "escribiendo…" ── */
  _typing() {
    const box = document.getElementById("viaMensajes");
    if (!box) return { remove: () => {} };
    const el = document.createElement("div");
    el.className = "via-msg via-msg--ia via-msg--typing";
    el.innerHTML = `
      <span class="via-msg-icon"><i class="bi bi-stars"></i></span>
      <div class="via-msg-body">
        <span class="via-dot"></span><span class="via-dot"></span><span class="via-dot"></span>
      </div>`;
    box.appendChild(el);
    box.scrollTop = box.scrollHeight;
    return el;
  }

  /* ── Actualiza el contador de consultas ── */
  _actualizarLimite() {
    const el = document.getElementById("viaLimite");
    if (!el) return;
    const restantes = this._limite - this._usadas;
    el.textContent  = `${restantes} consultas hoy`;
    el.title        = `Usadas: ${this._usadas}/${this._limite}`;
    el.classList.toggle("via-limite--bajo", restantes <= 5);
  }
}

/* ══════════════════════════════════════════════════════
   COMPONENTE: BOTÓN "MEJORAR CON IA" (Publicar producto)
   Se monta junto al textarea de descripción.
══════════════════════════════════════════════════════ */
export function montarBotonDescripcion(ia) {
  const textarea = document.getElementById("f_desc");
  if (!textarea || document.getElementById("viaBtn")) return;

  // Insertar botón debajo del textarea
  const wrap  = document.createElement("div");
  wrap.className = "via-desc-wrap";
  textarea.parentNode.insertBefore(wrap, textarea);
  wrap.appendChild(textarea);

  const btn = document.createElement("button");
  btn.type      = "button";
  btn.id        = "viaBtn";
  btn.className = "via-btn-mejorar";
  btn.innerHTML = `<i class="bi bi-stars"></i> Mejorar descripción con IA`;
  wrap.appendChild(btn);

  // Panel de sugerencias
  const panelSug = document.createElement("div");
  panelSug.id        = "viaSugerencias";
  panelSug.className = "via-sug-panel";
  panelSug.hidden    = true;
  wrap.appendChild(panelSug);

  btn.addEventListener("click", async () => {
    const nombre    = (document.getElementById("f_nombre")?.value || "").trim();
    const categoria = document.getElementById("f_cat")?.value || "";
    const precio    = document.getElementById("f_precio")?.value || "0";
    const descActual = textarea.value.trim();

    if (!nombre) {
      mostrarMiniAviso(panelSug, "Escribe primero el nombre del producto para que la IA pueda ayudarte.");
      return;
    }

    btn.disabled = true;
    btn.innerHTML = `<span class="via-spin"><i class="bi bi-stars"></i></span> Generando sugerencias…`;
    panelSug.hidden  = false;
    panelSug.innerHTML = `<div class="via-sug-loading"><span class="via-dot"></span><span class="via-dot"></span><span class="via-dot"></span></div>`;

    try {
      const data = await ia.mejorarDescripcion({
        nombre,
        categoria,
        precio: +precio,
        descripcionActual: descActual || undefined
      });

      renderizarSugerencias(panelSug, textarea, data, ia);
    } catch (err) {
      panelSug.innerHTML = `<p class="via-sug-err"><i class="bi bi-exclamation-circle"></i> ${esc(err.message || "Error al conectar con la IA.")}</p>`;
    } finally {
      btn.disabled = false;
      btn.innerHTML = `<i class="bi bi-stars"></i> Mejorar descripción con IA`;
    }
  });
}

function renderizarSugerencias(panel, textarea, data, ia) {
  const respuesta  = data.respuesta || "";
  const sugerencias = data.sugerencias;
  panel.innerHTML  = "";

  // Cabecera
  const header = document.createElement("div");
  header.className = "via-sug-header";
  header.innerHTML = `
    <span class="via-sug-icon"><i class="bi bi-stars"></i></span>
    <span>Sugerencias de la IA</span>
    <button class="via-sug-close" title="Cerrar"><i class="bi bi-x-lg"></i></button>`;
  panel.appendChild(header);
  header.querySelector(".via-sug-close").addEventListener("click", () => {
    panel.hidden = true;
    panel.innerHTML = "";
  });

  // Si la IA extrajo las sugerencias en formato etiquetado
  const etiquetas   = [
    { tag: "[CORTA]",    label: "Corta y directa" },
    { tag: "[LLAMATIVA]",label: "Llamativa"        },
    { tag: "[DETALLADA]",label: "Detallada"        }
  ];
  const fragmentos  = sugerencias && sugerencias.length ? sugerencias : extraerPorEtiquetas(respuesta, etiquetas);

  if (fragmentos.length) {
    const lista = document.createElement("div");
    lista.className = "via-sug-list";

    fragmentos.forEach((texto, i) => {
      const chip = document.createElement("div");
      chip.className = "via-sug-chip";
      chip.innerHTML = `
        <div class="via-sug-chip-label">${esc(etiquetas[i]?.label || `Opción ${i + 1}`)}</div>
        <p class="via-sug-chip-text">${esc(texto)}</p>
        <div class="via-sug-chip-actions">
          <button class="via-sug-usar" data-texto="${esc(texto)}">
            <i class="bi bi-check2-circle"></i> Usar esta
          </button>
          <button class="via-sug-copiar" data-texto="${esc(texto)}">
            <i class="bi bi-clipboard"></i> Copiar
          </button>
        </div>`;

      chip.querySelector(".via-sug-usar").addEventListener("click", e => {
        textarea.value = e.currentTarget.dataset.texto;
        textarea.dispatchEvent(new Event("input"));
        // feedback visual
        chip.classList.add("via-sug-chip--seleccionado");
        setTimeout(() => chip.classList.remove("via-sug-chip--seleccionado"), 900);
      });
      chip.querySelector(".via-sug-copiar").addEventListener("click", e => {
        navigator.clipboard?.writeText(e.currentTarget.dataset.texto);
        const btn = e.currentTarget;
        btn.innerHTML = `<i class="bi bi-clipboard-check"></i> Copiado`;
        setTimeout(() => { btn.innerHTML = `<i class="bi bi-clipboard"></i> Copiar`; }, 1800);
      });
      lista.appendChild(chip);
    });
    panel.appendChild(lista);
  }

  // Resto del texto (título sugerido, etiquetas, fotos)
  const extras   = extraerExtras(respuesta);
  if (extras) {
    const extrasEl = document.createElement("div");
    extrasEl.className = "via-sug-extras";
    extrasEl.innerHTML = extras;
    panel.appendChild(extrasEl);
  }

  // Botón "Pedir otra versión"
  const btnOtra = document.createElement("button");
  btnOtra.type  = "button";
  btnOtra.className = "via-sug-otra";
  btnOtra.innerHTML = `<i class="bi bi-arrow-clockwise"></i> Pedir otra versión`;
  btnOtra.addEventListener("click", () =>
    document.getElementById("viaBtn")?.click()
  );
  panel.appendChild(btnOtra);

  // Abrir el chat general si el vendedor quiere continuar
  const btnChat = document.createElement("button");
  btnChat.type  = "button";
  btnChat.className = "via-sug-chat";
  btnChat.innerHTML = `<i class="bi bi-chat-dots"></i> Hacer una pregunta`;
  btnChat.addEventListener("click", () => {
    ia.abrirPanel("Asistente de ventas", "¿En qué más puedo ayudarte con este producto?");
  });
  panel.appendChild(btnChat);
}

/* ── Extrae fragmentos por etiquetas del texto ── */
function extraerPorEtiquetas(texto, etiquetas) {
  return etiquetas.map(({ tag }, i) => {
    const idx = texto.indexOf(tag);
    if (idx === -1) return null;
    const inicio = idx + tag.length;
    const siguiente = etiquetas
      .slice(i + 1)
      .map(e => texto.indexOf(e.tag, inicio))
      .filter(x => x !== -1);
    const fin = siguiente.length ? Math.min(...siguiente) : texto.indexOf("[TITULO]", inicio);
    return texto.slice(inicio, fin > inicio ? fin : undefined).trim();
  }).filter(Boolean);
}

/* ── Extrae extras (título, etiquetas, fotos) ── */
function extraerExtras(texto) {
  const secciones = [
    { tag: "[TITULO]",    titulo: "💡 Título sugerido"    },
    { tag: "[ETIQUETAS]", titulo: "🏷️ Palabras clave"     },
    { tag: "[FOTOS]",     titulo: "📸 Consejos de fotos"  }
  ];
  let html = "";
  secciones.forEach(({ tag, titulo }) => {
    const idx = texto.indexOf(tag);
    if (idx === -1) return;
    const inicio  = idx + tag.length;
    const nexts   = secciones
      .map(s => texto.indexOf(s.tag, inicio))
      .filter(x => x > inicio);
    const fin     = nexts.length ? Math.min(...nexts) : undefined;
    const contenido = texto.slice(inicio, fin).trim();
    if (contenido) {
      html += `<div class="via-extra"><strong>${titulo}</strong><p>${esc(contenido)}</p></div>`;
    }
  });
  return html;
}

/* ══════════════════════════════════════════════════════
   COMPONENTE: ASISTENTE DE GRÁFICA (Resumen)
   Se llama desde el HTML cuando el resumen está renderizado.
══════════════════════════════════════════════════════ */
export function montarBotonGrafica(ia) {
  // Esperar a que gResumen esté renderizado
  const observer = new MutationObserver(() => {
    const graficaCard = document.querySelector("#gResumen .vd-card.c8");
    if (!graficaCard || graficaCard.dataset.viaMount) return;
    graficaCard.dataset.viaMount = "1";

    const btn = document.createElement("button");
    btn.type      = "button";
    btn.className = "via-btn-grafica";
    btn.innerHTML = `<i class="bi bi-stars"></i> Explícame esta gráfica`;

    // Insertar después del subtítulo
    const sub = graficaCard.querySelector(".sub");
    if (sub) sub.after(btn);
    else graficaCard.querySelector("h3").after(btn);

    btn.addEventListener("click", async () => {
      btn.disabled = true;
      btn.innerHTML = `<span class="via-spin"><i class="bi bi-stars"></i></span> Analizando…`;

      let respuesta;
      try {
        const data = await ia.explicarGrafica();
        respuesta  = data.respuesta;
      } catch (err) {
        respuesta = `No pude analizar la gráfica: ${err.message || "error de conexión"}. Intenta de nuevo.`;
      } finally {
        btn.disabled = false;
        btn.innerHTML = `<i class="bi bi-stars"></i> Explícame esta gráfica`;
      }

      ia.abrirPanel(
        "Análisis de tu gráfica",
        respuesta
      );
    });
    observer.disconnect();
  });

  observer.observe(document.getElementById("gResumen") || document.body, {
    childList: true, subtree: true
  });
}

/* ══════════════════════════════════════════════════════
   HELPER: escapa HTML básico
══════════════════════════════════════════════════════ */
function esc(s) {
  return String(s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function mostrarMiniAviso(panel, texto) {
  panel.hidden  = false;
  panel.innerHTML = `<p class="via-sug-err"><i class="bi bi-info-circle"></i> ${esc(texto)}</p>`;
  setTimeout(() => { panel.hidden = true; }, 4000);
}
