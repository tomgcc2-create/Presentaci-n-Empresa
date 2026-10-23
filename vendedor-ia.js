/**
 * PriceNice — vendedor-ia.js
 * Asistente IA del panel del vendedor.
 *
 * Se carga como <script src="vendedor-ia.js"> (NO como módulo).
 * Expone window.VIA con todos los métodos para que el script
 * inline de vendedor.html los llame directamente.
 *
 * DEMO_MODE = true  → respuestas locales (sin Worker real)
 * DEMO_MODE = false → llama al Worker de Cloudflare
 */

(function () {
  'use strict';

  /* ── Configuración ── */
  const WORKER_URL = 'https://chatbot-miempresa.priceniceworld.workers.dev';
  const DEMO_MODE  = true; // cambiar a false cuando el Worker esté deployado

  /* ══════════════════════════════════════════════════════
     RESPUESTAS DEMO (sin servidor)
  ══════════════════════════════════════════════════════ */
  const DEMO = {
    descripcion(prod) {
      const n = prod.nombre || 'el producto';
      const p = prod.precio ? '$' + Number(prod.precio).toLocaleString('es-CO') + ' COP' : 'precio competitivo';
      return {
        ok: true,
        sugerencias: [
          n + ' a ' + p + '. Disponible ahora. Escríbenos para apartar tu unidad.',
          '¿Buscas ' + n + '? Lo tenemos al mejor precio del sector. Entrega rápida en Bogotá. ¡No te quedes sin el tuyo!',
          n + ' a ' + p + '. Una opción confiable para quienes buscan calidad sin gastar de más. Pídelo hoy y recíbelo en Bogotá. Escríbenos por WhatsApp para más información.'
        ],
        extras: {
          titulo:    n + ' – Calidad garantizada | ' + (prod.categoria || 'PriceNice'),
          etiquetas: [n.split(' ')[0], prod.categoria || 'oferta', 'Bogotá', 'precio', 'descuento'].filter(Boolean).join(', '),
          fotos:     'Sube 3 fotos: 1) producto sobre fondo blanco o claro, 2) vista lateral o detalle, 3) foto mostrando el tamaño o el uso real.'
        },
        limiteDiario: { usadas: 1, total: 20 },
        _demo: true
      };
    },

    grafica(met) {
      const sinDatos = met.sinDatos !== false;
      const np = met.totalProductos || 0;
      if (!np) {
        return {
          ok: true,
          respuesta:
            '**Aún no tienes productos publicados.**\n\n' +
            'Por eso la gráfica no tiene datos reales todavía.\n\n' +
            '📌 **Primeros pasos:**\n' +
            '• Publica tu primer producto con al menos 3 fotos.\n' +
            '• Completa tu perfil con el nombre de tu tienda y WhatsApp.\n' +
            '• Pide a tus clientes que dejen una reseña.',
          limiteDiario: { usadas: 1, total: 20 }, _demo: true
        };
      }
      return {
        ok: true,
        respuesta: sinDatos
          ? '📊 **¿Qué muestra esta gráfica?**\n\n' +
            'Las barras **azules** son las vistas (personas que vieron tu tienda) y las **doradas** son los clics (quienes quisieron saber más).\n\n' +
            '⚠️ Los datos son de **ejemplo** y no reflejan tu actividad real todavía.\n\n' +
            '📌 **Cuando tengas datos reales, busca:**\n' +
            '• Muchas vistas y pocos clics → mejora tus fotos y el título del producto.\n' +
            '• Caída en ciertos meses → publica productos nuevos o crea una oferta.\n' +
            '• Pico en oct–dic → aprovecha esa temporada publicando antes.'
          : '📊 Tus datos muestran crecimiento constante en vistas, con los mejores meses entre oct y dic.\n\n' +
            '📌 **Recomendaciones:**\n' +
            '• Publica productos nuevos antes de la temporada alta (sep–oct).\n' +
            '• La relación vistas/clics es buena; mantén la calidad de tus fotos.\n' +
            '• Responde todas las reseñas para generar más confianza.',
        limiteDiario: { usadas: 1, total: 20 }, _demo: true
      };
    },

    chat(pregunta, tienda) {
      const q  = (pregunta || '').toLowerCase();
      const tn = (tienda && tienda.nombre) || 'tu tienda';
      let r;
      if (q.includes('clic') || q.includes('bajar') || q.includes('bajo')) {
        r = 'Los clics bajan cuando los compradores no se sienten atraídos por la vista previa.\n\n**Prueba esto:**\n• Cambia la foto principal a una con fondo claro.\n• Actualiza el título con un diferencial claro.\n• Verifica que el precio sea competitivo para tu zona.';
      } else if (q.includes('primero') || q.includes('publicar') || q.includes('empezar') || q.includes('comenzar')) {
        r = 'Para empezar bien, publica el producto que:\n\n1. **Ya tienes en stock** (evita prometer lo que no puedes entregar).\n2. **Tiene buen margen** — te deja ganancia real.\n3. **Es fácil de fotografiar** — te va a quedar bonita la foto.\n\nCon 3 fotos, descripción de 3 líneas y el barrio bien escrito ya tienes un producto competitivo.';
      } else if (q.includes('reseña') || q.includes('calificaci')) {
        r = 'Para conseguir tus primeras reseñas:\n\n• Después de cada venta, envía un mensaje de agradecimiento al cliente y pídele que califique en PriceNice.\n• Responde **todas** las reseñas, buenas y malas.\n• Cumple siempre lo que describes en el producto.';
      } else if (q.includes('foto') || q.includes('imagen')) {
        r = 'Tres reglas para fotos que venden:\n\n1. **Fondo limpio** — blanco o neutro (sirve una sábana blanca).\n2. **Luz natural** — cerca de una ventana en la mañana.\n3. **3 ángulos** — frente, lado y detalle o etiqueta.';
      } else if (q.includes('precio') || q.includes('barato') || q.includes('caro')) {
        r = 'El precio ideal está 5–15% por debajo del promedio de tu categoría en la zona. En PriceNice puedes ver los precios de la competencia directamente.\n\n**Consejo:** si tu producto tiene mejor calidad, comunícalo con fotos y descripción — no tienes que ser el más barato.';
      } else if (q.includes('descripci') || q.includes('texto') || q.includes('escribir')) {
        r = 'Una buena descripción tiene 3 partes:\n\n1. **Qué es** — nombre y función principal.\n2. **Para quién** — el tipo de comprador que lo busca.\n3. **Por qué tu tienda** — entrega rápida, precio, atención.\n\nUsa el botón ✨ **Mejorar con IA** para que te proponga opciones listas.';
      } else if (q.includes('calidad') || q.includes('publicaci')) {
        r = 'La barra "Calidad de tu publicación" mide qué tan completo está tu producto. Para llegar al 100% necesitas: 3 o más fotos, descripción de 60+ caracteres, marca, código SKU, precio anterior y etiquetas.\n\nCada punto extra que agregas hace que tu producto sea más fácil de encontrar.';
      } else {
        r = 'Hola, soy el asistente de **' + tn + '** en PriceNice 👋\n\nPuedo ayudarte con:\n• Mejorar descripciones de productos ✨\n• Entender tu gráfica de compradores 📊\n• Consejos para conseguir reseñas ⭐\n• Cómo tomar mejores fotos 📸\n• Ajustar precios y stock 💰\n\n¿Sobre qué quieres que hablemos?';
      }
      return { ok: true, respuesta: r, limiteDiario: { usadas: 1, total: 20 }, _demo: true };
    }
  };

  /* ══════════════════════════════════════════════════════
     ESTADO GLOBAL DEL ASISTENTE
  ══════════════════════════════════════════════════════ */
  let _uid        = '';
  let _getTienda  = () => ({});
  let _getMetrics = () => ({});
  let _historial  = [];
  let _usadas     = 0;
  let _limite     = 20;
  let _panelEl    = null;
  const _delay    = ms => new Promise(r => setTimeout(r, ms));

  /* ── Escapado HTML ── */
  function esc(s) {
    return String(s || '')
      .replace(/&/g,'&amp;').replace(/</g,'&lt;')
      .replace(/>/g,'&gt;').replace(/"/g,'&quot;');
  }

  /* ── Markdown mínimo: **negrita** y saltos ── */
  function md(s) {
    return esc(s)
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/\n/g, '<br>');
  }

  /* ══════════════════════════════════════════════════════
     LLAMADA AL BACKEND
  ══════════════════════════════════════════════════════ */
  async function _llamar(payload) {
    if (DEMO_MODE) {
      await _delay(900);
      const tipo    = payload.tipo || 'chat';
      const tienda  = _getTienda();
      let res;
      if (tipo === 'descripcion') res = DEMO.descripcion(payload.producto || {});
      else if (tipo === 'grafica') res = DEMO.grafica(_getMetrics());
      else                         res = DEMO.chat(payload.pregunta || '', tienda);
      _usadas = res.limiteDiario.usadas;
      _limite = res.limiteDiario.total;
      return res;
    }
    const r = await fetch(WORKER_URL + '/ia-vendedor', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ uid: _uid, tienda: _getTienda(), ..._getMetrics() && { metricas: _getMetrics() }, ...payload })
    });
    const data = await r.json();
    if (data.limiteDiario) { _usadas = data.limiteDiario.usadas; _limite = data.limiteDiario.total; }
    if (!data.ok && data.error) throw new Error(data.error);
    return data;
  }

  /* ══════════════════════════════════════════════════════
     PANEL DE CHAT FLOTANTE
  ══════════════════════════════════════════════════════ */
  function _actualizarLimite() {
    const el = document.getElementById('viaLimite');
    if (!el) return;
    const r = _limite - _usadas;
    el.textContent = r + ' consultas hoy';
    el.title = 'Usadas: ' + _usadas + '/' + _limite;
    el.classList.toggle('via-limite--bajo', r <= 5);
  }

  function _addMsg(rol, texto) {
    const box = document.getElementById('viaMensajes');
    if (!box) return null;
    const el  = document.createElement('div');
    el.className = 'via-msg via-msg--' + rol;
    if (rol === 'ia') {
      el.innerHTML = '<span class="via-msg-icon"><i class="bi bi-stars"></i></span><div class="via-msg-body">' + md(texto) + '</div>';
    } else if (rol === 'typing') {
      el.className = 'via-msg via-msg--ia';
      el.innerHTML = '<span class="via-msg-icon"><i class="bi bi-stars"></i></span><div class="via-msg-body"><span class="via-dot"></span><span class="via-dot"></span><span class="via-dot"></span></div>';
    } else {
      el.innerHTML = '<div class="via-msg-body">' + md(texto) + '</div>';
    }
    box.appendChild(el);
    box.scrollTop = box.scrollHeight;
    return el;
  }

  function _cerrarPanel() {
    if (!_panelEl) return;
    _panelEl.classList.remove('via-panel--open');
    _panelEl.classList.add('via-panel--out');
    setTimeout(() => { if (_panelEl) { _panelEl.remove(); _panelEl = null; } }, 320);
  }

  function _abrirPanel(titulo, msgInicial, contextoPagina) {
    if (_panelEl) _cerrarPanel();

    const panel = document.createElement('div');
    panel.className = 'via-panel';
    panel.setAttribute('role', 'dialog');
    panel.setAttribute('aria-label', 'Asistente IA PriceNice');
    panel.innerHTML =
      '<div class="via-header">' +
        '<div class="via-header-left">' +
          '<span class="via-header-icon"><i class="bi bi-stars"></i></span>' +
          '<div>' +
            '<span class="via-header-title">' + esc(titulo) + '</span>' +
            (DEMO_MODE ? '<span class="via-demo-badge"><i class="bi bi-flask"></i> Demo</span>' : '') +
          '</div>' +
        '</div>' +
        '<div class="via-header-actions">' +
          '<span class="via-limite" id="viaLimite"></span>' +
          '<button class="via-close" id="viaCerrar" aria-label="Cerrar"><i class="bi bi-x-lg"></i></button>' +
        '</div>' +
      '</div>' +
      '<div class="via-messages" id="viaMensajes" aria-live="polite"></div>' +
      '<div class="via-input-row">' +
        '<input type="text" class="via-input" id="viaInput" placeholder="Escribe tu pregunta…" autocomplete="off" maxlength="300">' +
        '<button class="via-send" id="viaEnviar" aria-label="Enviar"><i class="bi bi-send-fill"></i></button>' +
      '</div>';

    document.body.appendChild(panel);
    _panelEl = panel;
    requestAnimationFrame(() => panel.classList.add('via-panel--open'));

    panel.querySelector('#viaCerrar').onclick = _cerrarPanel;
    panel.addEventListener('click', e => { if (e.target === panel) _cerrarPanel(); });

    const input  = panel.querySelector('#viaInput');
    const btnEnv = panel.querySelector('#viaEnviar');

    async function enviar() {
      const texto = input.value.trim();
      if (!texto) return;
      input.value = '';
      btnEnv.disabled = true;
      _addMsg('user', texto);
      const typing = _addMsg('typing', '');
      try {
        _historial.push({ rol: 'user', texto });
        if (_historial.length > 12) _historial.splice(0, 2);
        const data = await _llamar({ tipo: 'chat', pregunta: texto, historial: _historial, contexto: contextoPagina || '' });
        typing && typing.remove();
        _addMsg('ia', data.respuesta || '');
        _historial.push({ rol: 'ia', texto: data.respuesta || '' });
        if (_historial.length > 12) _historial.splice(0, 2);
        _actualizarLimite();
      } catch (err) {
        typing && typing.remove();
        _addMsg('ia', 'Ocurrió un error: ' + (err.message || 'intenta de nuevo.'));
      }
      btnEnv.disabled = false;
    }

    btnEnv.onclick = enviar;
    input.addEventListener('keydown', e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); enviar(); } });

    if (msgInicial) _addMsg('ia', msgInicial);
    _actualizarLimite();
    setTimeout(() => input.focus(), 350);
    return panel;
  }

  /* ══════════════════════════════════════════════════════
     PANEL DE SUGERENCIAS DE DESCRIPCIÓN
  ══════════════════════════════════════════════════════ */
  function _mostrarSugerencias(data) {
    const contenedor = document.getElementById('viaSugPanel');
    if (!contenedor) return;

    const sugs = data.sugerencias || [];
    const ext  = data.extras || {};

    const labels = ['Corta y directa', 'Llamativa', 'Detallada'];

    let html =
      '<div class="via-sug-header">' +
        '<span class="via-sug-icon"><i class="bi bi-stars"></i></span>' +
        '<span>Sugerencias de la IA</span>' +
        '<button onclick="document.getElementById(\'viaSugPanel\').hidden=true" class="via-sug-close"><i class="bi bi-x-lg"></i></button>' +
      '</div>';

    if (sugs.length) {
      html += '<div class="via-sug-list">';
      sugs.forEach((t, i) => {
        html +=
          '<div class="via-sug-chip">' +
            '<div class="via-sug-chip-label">' + (labels[i] || 'Opción ' + (i + 1)) + '</div>' +
            '<p class="via-sug-chip-text" id="viaSugT' + i + '">' + esc(t) + '</p>' +
            '<div class="via-sug-chip-actions">' +
              '<button class="via-sug-usar" onclick="VIA.usarSugerencia(' + i + ')"><i class="bi bi-check2-circle"></i> Usar esta</button>' +
              '<button class="via-sug-copiar" onclick="VIA.copiarSugerencia(' + i + ', this)"><i class="bi bi-clipboard"></i> Copiar</button>' +
            '</div>' +
          '</div>';
      });
      html += '</div>';
    }

    if (ext.titulo)    html += '<div class="via-extra"><strong>💡 Título sugerido</strong><p>' + esc(ext.titulo) + '</p></div>';
    if (ext.etiquetas) html += '<div class="via-extra"><strong>🏷️ Palabras clave</strong><p>' + esc(ext.etiquetas) + '</p></div>';
    if (ext.fotos)     html += '<div class="via-extra"><strong>📸 Consejos de fotos</strong><p>' + esc(ext.fotos) + '</p></div>';

    html +=
      '<div style="display:flex;gap:0">' +
        '<button class="via-sug-otra" onclick="VIA.pedirOtraDescripcion()"><i class="bi bi-arrow-clockwise"></i> Otra versión</button>' +
        '<button class="via-sug-chat" onclick="VIA.abrirChat(\'Asistente de ventas\',\'¿Cómo puedo ayudarte con este producto?\')"><i class="bi bi-chat-dots"></i> Preguntar</button>' +
      '</div>';

    contenedor.innerHTML = html;
    contenedor.hidden = false;
    contenedor.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }

  /* ══════════════════════════════════════════════════════
     API PÚBLICA: window.VIA
  ══════════════════════════════════════════════════════ */
  window.VIA = {

    /* Llamado desde vendedor.html después de que Firebase provee el UID */
    init(uid, getTienda, getMetrics) {
      _uid        = uid || '';
      _getTienda  = getTienda || (() => ({}));
      _getMetrics = getMetrics || (() => ({}));
    },

    /* ── 1. Botón "Mejorar con IA" ── */
    async mejorarDescripcion() {
      const nombreEl = document.getElementById('f_nombre');
      const nombre   = (nombreEl && nombreEl.value.trim()) || '';
      const catEl    = document.getElementById('f_cat');
      const precioEl = document.getElementById('f_precio');
      const marcaEl  = document.getElementById('f_marca');
      const descEl   = document.getElementById('f_desc');

      if (!nombre) {
        const panel = document.getElementById('viaSugPanel');
        if (panel) {
          panel.innerHTML = '<p class="via-sug-err"><i class="bi bi-info-circle"></i> Escribe primero el nombre del producto para recibir ayuda.</p>';
          panel.hidden = false;
        }
        return;
      }

      const btn = document.getElementById('viaBtnMejorar');
      if (btn) { btn.disabled = true; btn.innerHTML = '<span class="via-spin"><i class="bi bi-stars"></i></span> Generando…'; }

      const panel = document.getElementById('viaSugPanel');
      if (panel) { panel.innerHTML = '<div class="via-sug-loading"><span class="via-dot"></span><span class="via-dot"></span><span class="via-dot"></span></div>'; panel.hidden = false; }

      try {
        const data = await _llamar({
          tipo: 'descripcion',
          producto: {
            nombre,
            categoria:          (catEl && catEl.value)       || '',
            precio:             +(precioEl && precioEl.value) || 0,
            marca:              (marcaEl && marcaEl.value)    || '',
            descripcionActual:  (descEl && descEl.value.trim()) || ''
          }
        });
        _mostrarSugerencias(data);
        _actualizarLimite();
      } catch (err) {
        if (panel) panel.innerHTML = '<p class="via-sug-err"><i class="bi bi-exclamation-circle"></i> ' + esc(err.message || 'Error al conectar con la IA.') + '</p>';
      } finally {
        if (btn) { btn.disabled = false; btn.innerHTML = '<i class="bi bi-stars"></i> Mejorar con IA'; }
      }
    },

    usarSugerencia(idx) {
      const el = document.getElementById('viaSugT' + idx);
      const desc = document.getElementById('f_desc');
      if (el && desc) {
        desc.value = el.textContent;
        desc.dispatchEvent(new Event('input'));
        el.closest('.via-sug-chip').style.background = '#edfaf3';
        setTimeout(() => el.closest('.via-sug-chip') && (el.closest('.via-sug-chip').style.background = ''), 900);
      }
    },

    copiarSugerencia(idx, btn) {
      const el = document.getElementById('viaSugT' + idx);
      if (el && navigator.clipboard) {
        navigator.clipboard.writeText(el.textContent);
        btn.innerHTML = '<i class="bi bi-clipboard-check"></i> Copiado';
        setTimeout(() => { btn.innerHTML = '<i class="bi bi-clipboard"></i> Copiar'; }, 1800);
      }
    },

    pedirOtraDescripcion() {
      const panel = document.getElementById('viaSugPanel');
      if (panel) panel.hidden = true;
      this.mejorarDescripcion();
    },

    /* ── 2. Botón "Explícame esta gráfica" ── */
    async explicarGrafica() {
      const btn = document.getElementById('viaBtnGrafica');
      if (btn) { btn.disabled = true; btn.innerHTML = '<span class="via-spin"><i class="bi bi-stars"></i></span> Analizando…'; }
      try {
        const data = await _llamar({ tipo: 'grafica' });
        _abrirPanel('Análisis de tu gráfica', data.respuesta, 'resumen');
        _actualizarLimite();
      } catch (err) {
        _abrirPanel('Error', 'No pude analizar la gráfica: ' + (err.message || 'intenta de nuevo.'));
      } finally {
        if (btn) { btn.disabled = false; btn.innerHTML = '<i class="bi bi-stars"></i> Explícame esta gráfica'; }
      }
    },

    /* ── 2b. Botón IA en "Primeros pasos" ── */
    async ayudaPrimerosPasos() {
      const btn = document.getElementById('viaBtnPasos');
      if (btn) { btn.disabled = true; }
      try {
        const data = await _llamar({ tipo: 'grafica' }); // reutiliza el prompt de gráfica con np=0
        _abrirPanel('Primeros pasos', data.respuesta, 'resumen-pasos');
        _actualizarLimite();
      } catch (err) {
        _abrirPanel('Primeros pasos', 'Publica tu primer producto con 3 fotos y descripción clara. Completa el perfil con tu WhatsApp. Así los compradores te encuentran y confían en tu tienda.');
      } finally {
        if (btn) btn.disabled = false;
      }
    },

    /* ── 3. Botón flotante global ── */
    abrirChat(titulo, msgInicial, pagina) {
      const t = titulo || 'Asistente IA';
      const p = pagina || _paginaActual();
      const inicio = msgInicial || _saludo(p);
      _abrirPanel(t, inicio, p);
    },

    cerrarChat: _cerrarPanel
  };

  /* ── Detecta en qué sección está el vendedor ── */
  function _paginaActual() {
    const activo = document.querySelector('.vd-sec.on');
    return activo ? activo.id.replace('v-', '') : 'resumen';
  }

  /* ── Saludo contextual según la sección ── */
  function _saludo(pagina) {
    const saludos = {
      'publicar': 'Hola 👋 Estás en **Publicar producto**.\n\nPuedo ayudarte a escribir una descripción atractiva, sugerir etiquetas o decirte qué fotos subir. ¿Sobre qué quieres empezar?',
      'productos': 'Hola 👋 Estás en **Mis productos**.\n\nPuedo ayudarte a mejorar tus publicaciones existentes, revisar stock bajo o sugerir qué producto destacar. ¿Qué necesitas?',
      'resenas': 'Hola 👋 Estás en **Reseñas**.\n\nPuedo ayudarte a responder reseñas difíciles, entender tu calificación y dar consejos para conseguir más opiniones. ¿Comienzo?',
      'perfil': 'Hola 👋 Estás en **Mi perfil**.\n\nUn perfil completo genera el doble de confianza. ¿Quieres que revise qué le falta al tuyo?',
      'config': 'Hola 👋 Estás en **Configuración**.\n\nPuedo explicarte qué hace cada ajuste y cuál conviene para tu tipo de negocio. ¿Tienes alguna duda?',
      'resumen': 'Hola 👋 Estás en el **Resumen** de tu tienda.\n\nPuedo explicarte la gráfica, analizar tus métricas o darte consejos para vender más. ¿Por dónde empezamos?'
    };
    return saludos[pagina] || saludos['resumen'];
  }

})();
