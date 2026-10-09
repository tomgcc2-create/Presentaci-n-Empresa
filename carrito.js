/* ═══════════════════════════════════════════════════════════════
   PriceNice — carrito.js
   Lógica del carrito: mini-carrito (ventanita) + página carrito.html.

   • Lee y guarda en localStorage 'pn_carrito' (el mismo que ya usa tienda.html),
     así lo que agregas en la tienda aparece aquí sin cambiar nada.
   • Se auto-instala: basta con cargarlo con  <script src="carrito.js" defer></script>
     y el botón de la bolsita del navbar (aria-label="Carrito") abre la ventanita.
   • Para conectar el pago real (Wompi, PayU, Mercado Pago, etc.) ve al final:
     PN_CARRITO.alPagar.
═══════════════════════════════════════════════════════════════ */
(function () {
  'use strict';

  /* ───────── Configuración ───────── */
  const KEY_CARRITO = 'pn_carrito';
  const KEY_FAVS    = 'pn_favoritos';
  const KEY_PAGO    = 'pn_metodo_pago';
  const ENVIO_GRATIS_DESDE = 150000;   // igual que tienda.html
  const COSTO_ENVIO        = 9900;
  const PAGINA_CARRITO     = 'carrito.html';
  const LOGO_FALLBACK      = 'img/logo-dark.png';

  const METODOS_PAGO = [
    { id: 'tarjeta',     nombre: 'Tarjeta',          nota: 'Paga ahora o paga mensualmente', tile: '',       color: '#13224F', chips: ['VISA', 'Mastercard', 'AMEX', 'Diners'] },
    { id: 'pse',         nombre: 'PSE',              nota: 'Débito desde tu banco',          tile: 'PSE',    color: '#1A5FB4' },
    { id: 'nequi',       nombre: 'Nequi',            nota: 'Aprueba desde la app',           tile: 'Nequi',  color: '#C9157F' },
    { id: 'daviplata',   nombre: 'Daviplata',        nota: 'Aprueba desde la app',           tile: 'Davi',   color: '#D32030' },
    { id: 'bancolombia', nombre: 'Botón Bancolombia', nota: 'Desde tu cuenta Bancolombia',   tile: 'BC',     color: '#3D4A6B' },
    { id: 'efecty',      nombre: 'Efecty',           nota: 'Paga en cualquier punto Efecty en un plazo de 24 horas', tile: 'efecty', color: '#9A6B00' }
  ];
  const CHIPS_MINI = ['Nequi', 'Daviplata', 'PSE', 'Visa', 'Mastercard'];

  /* ───────── Utilidades ───────── */
  const $  = (s, r) => (r || document).querySelector(s);
  const $$ = (s, r) => Array.from((r || document).querySelectorAll(s));
  const fmt = n => '$' + Math.round(n).toLocaleString('es-CO');
  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const leer = (k, def) => { try { return JSON.parse(localStorage.getItem(k)) ?? def; } catch (e) { return def; } };

  /* Avisar a toda la página cuando cambia pn_carrito (en la misma pestaña) */
  const _setItem = Storage.prototype.setItem;
  Storage.prototype.setItem = function (k, v) {
    _setItem.apply(this, arguments);
    if (k === KEY_CARRITO || k === KEY_FAVS) window.dispatchEvent(new CustomEvent('pn:carrito'));
  };

  const getCarrito = () => leer(KEY_CARRITO, []);
  const setCarrito = c => localStorage.setItem(KEY_CARRITO, JSON.stringify(c));
  const getFavs    = () => leer(KEY_FAVS, []);

  function calcular(items) {
    const sub = items.reduce((a, i) => a + i.precio * i.qty, 0);
    const envio = (sub === 0 || sub >= ENVIO_GRATIS_DESDE) ? 0 : COSTO_ENVIO;
    return { sub, envio, total: sub + envio, unidades: items.reduce((a, i) => a + i.qty, 0) };
  }

  /* ───────── Descuentos y sugerencias de mejor precio ─────────
     Los precios de otras tiendas salen de:
       • window.PN_COMPARACIONES (archivo carrito-precios.js, funciona en todo el sitio)
       • COMPARACIONES de tienda.html (si estás en esa página)
     Formato:  { idProducto: [ {tienda:'Linio', precio:89900, ciudad:'Virtual'}, ... ] }
     Un producto del carrito también puede traer  precioAnterior  para mostrar su descuento. */
  function comparaciones() {
    let m = {};
    try { if (typeof COMPARACIONES !== 'undefined') Object.assign(m, COMPARACIONES); } catch (e) {}
    return Object.assign(m, window.PN_COMPARACIONES || {});
  }
  function sugerencia(i) {
    const out = { descuento: 0, mejor: null, esMejor: false };
    if (i.precioAnterior && i.precioAnterior > i.precio) out.descuento = Math.round((1 - i.precio / i.precioAnterior) * 100);
    const lista = comparaciones()[i.id];
    if (Array.isArray(lista) && lista.length) {
      const otra = lista.filter(r => r.tienda !== i.tienda).sort((a, b) => a.precio - b.precio)[0];
      if (otra && otra.precio < i.precio) out.mejor = { tienda: otra.tienda, precio: otra.precio, ciudad: otra.ciudad || '', ahorro: (i.precio - otra.precio) * i.qty };
      else out.esMejor = true;
    }
    return out;
  }
  const ahorroTotal = items => items.reduce((a, i) => a + (sugerencia(i).mejor ? sugerencia(i).mejor.ahorro : 0), 0);

  function precioHTML(i) {
    const sg = sugerencia(i);
    return `<div class="pc-item-price">${fmt(i.precio * i.qty)}</div>` +
      (sg.descuento ? `<div class="pc-item-unit"><s>${fmt(i.precioAnterior * i.qty)}</s> <span class="pc-sale">-${sg.descuento}%</span></div>`
                    : (i.qty > 1 ? `<div class="pc-item-unit">${fmt(i.precio)} c/u</div>` : ''));
  }
  function tipHTML(i) {
    const sg = sugerencia(i);
    if (sg.mejor) return `<div class="pc-tip"><i class="bi bi-lightbulb-fill"></i>
        <span>En <strong>${esc(sg.mejor.tienda)}</strong> lo encuentras a <strong>${fmt(sg.mejor.precio)}</strong>${sg.mejor.ciudad ? ' · ' + esc(sg.mejor.ciudad) : ''}. ¡Ahorras ${fmt(sg.mejor.ahorro)}!</span>
        <button data-pc="cambiar" data-id="${i.id}">Cambiar</button></div>`;
    if (sg.esMejor) return `<span class="pc-tag-best"><i class="bi bi-patch-check-fill"></i> Mejor precio encontrado</span>`;
    return '';
  }

  /* ───────── Acciones ───────── */
  function cambiarTienda(id) {
    const c = getCarrito(); const it = c.find(x => x.id === id); if (!it) return;
    const m = sugerencia(it).mejor; if (!m) return;
    it.tienda = m.tienda; it.precio = m.precio; delete it.precioAnterior;
    setCarrito(c); toast('Cambiado a ' + m.tienda + ' · ahorras ' + fmt(m.ahorro));
  }
  function cambiarQty(id, d) {
    const c = getCarrito(); const it = c.find(x => x.id === id); if (!it) return;
    it.qty = Math.max(1, it.qty + d); setCarrito(c);
  }
  function quitar(id) { setCarrito(getCarrito().filter(x => x.id !== id)); }
  function vaciar() {
    if (!getCarrito().length) return;
    if (confirm('¿Vaciar todo el carrito?')) setCarrito([]);
  }
  function toggleFav(id) {
    const f = getFavs(); const i = f.indexOf(id);
    if (i === -1) { f.push(id); toast('Guardado en favoritos'); } else f.splice(i, 1);
    localStorage.setItem(KEY_FAVS, JSON.stringify(f));
  }

  /* ───────── Piezas de HTML reutilizables ───────── */
  const imgSrc = i => esc(i.imagen || LOGO_FALLBACK);

  function barraEnvio(sub) {
    if (sub <= 0) return '';
    const falta = ENVIO_GRATIS_DESDE - sub;
    const pct = Math.min(100, (sub / ENVIO_GRATIS_DESDE) * 100);
    return falta <= 0
      ? `<div class="pc-ship is-free"><i class="bi bi-truck"></i> <strong>¡Tienes envío gratis!</strong><div class="pc-ship-bar"><i style="width:100%"></i></div></div>`
      : `<div class="pc-ship">Te faltan <strong>${fmt(falta)}</strong> para el envío gratis<div class="pc-ship-bar"><i style="width:${pct}%"></i></div></div>`;
  }

  function totalesHTML(t) {
    return `<div class="pc-totals">
      <div class="pc-row"><span>Subtotal (${t.unidades} ${t.unidades === 1 ? 'producto' : 'productos'})</span><span>${fmt(t.sub)}</span></div>
      <div class="pc-row"><span>Envío estimado</span><span class="${t.envio === 0 ? 'is-free' : ''}">${t.envio === 0 ? 'Gratis' : fmt(t.envio)}</span></div>
      <div class="pc-row is-total"><span>Total</span><span>${fmt(t.total)}</span></div>
    </div>`;
  }

  function accionesItem(i, favs) {
    const esFav = favs.includes(i.id);
    return `<div class="pc-item-actions">
      <div class="pc-left">
        <button class="pc-icon-btn ${esFav ? 'is-fav' : ''}" data-pc="fav" data-id="${i.id}" aria-label="Favorito" title="Favorito"><i class="bi bi-heart${esFav ? '-fill' : ''}"></i></button>
        <button class="pc-icon-btn" data-pc="del" data-id="${i.id}" aria-label="Eliminar ${esc(i.nombre)}" title="Eliminar"><i class="bi bi-trash3"></i></button>
      </div>
      <div class="pc-qty">
        <button class="pc-icon-btn" data-pc="menos" data-id="${i.id}" aria-label="Quitar uno" ${i.qty <= 1 ? 'disabled' : ''}><i class="bi bi-dash-lg"></i></button>
        <span class="pc-qty-num" aria-live="polite">${i.qty}</span>
        <button class="pc-icon-btn" data-pc="mas" data-id="${i.id}" aria-label="Agregar uno"><i class="bi bi-plus-lg"></i></button>
      </div>
    </div>`;
  }

  /* ═════════════ MINI-CARRITO (al pasar el mouse por la bolsita) ═════════════ */
  let mini, cierreT, btnAncla, autoT;
  const puedeHover = window.matchMedia && matchMedia('(hover:hover) and (pointer:fine)').matches;
  const enPaginaCarrito = () => document.body.dataset.pcNoMini !== undefined;

  function montarMini() {
    if (mini || enPaginaCarrito()) return;
    mini = document.createElement('aside');
    mini.className = 'pc-mini';
    mini.setAttribute('role', 'dialog');
    mini.setAttribute('aria-label', 'Resumen del carrito');
    document.body.appendChild(mini);
    mini.addEventListener('mouseenter', () => { clearTimeout(cierreT); clearTimeout(autoT); });
    mini.addEventListener('mouseleave', () => cerrarConRetraso(250));
    document.addEventListener('keydown', e => { if (e.key === 'Escape') cerrarMini(); });
    renderMini();
  }

  function renderMini() {
    if (!mini) return;
    const items = getCarrito(), favs = getFavs(), t = calcular(items), ahorro = ahorroTotal(items);
    const cabecera = `<div class="pc-mini-head"><h2>Mi carrito</h2><span class="pc-count">${t.unidades}</span></div>`;
    if (!items.length) { mini.innerHTML = cabecera + vacioHTML(true); return; }
    mini.innerHTML = cabecera + `
      <div class="pc-mini-body">${items.map(i => `
        <div class="pc-mini-item">
          <div class="pc-thumb"><img src="${imgSrc(i)}" alt="${esc(i.nombre)}" loading="lazy" onerror="this.src='${LOGO_FALLBACK}'"></div>
          <div>
            <div class="pc-item-top">
              <div><div class="pc-item-name">${esc(i.nombre)}</div><div class="pc-item-store">${esc(i.tienda || '')}</div></div>
              <div class="pc-price-col">${precioHTML(i)}</div>
            </div>
            ${accionesItem(i, favs)}
            ${tipHTML(i)}
          </div>
        </div>`).join('')}
      </div>
      <div class="pc-mini-foot">
        ${ahorro > 0 ? `<div class="pc-save"><i class="bi bi-piggy-bank-fill"></i><span>Podrías ahorrar <strong>${fmt(ahorro)}</strong> comprando en otras tiendas</span></div>` : ''}
        ${barraEnvio(t.sub)}
        ${totalesHTML(t)}
        <div class="pc-mini-btns">
          <a class="pc-btn pc-btn-line" href="${PAGINA_CARRITO}">Ver carrito</a>
          <a class="pc-btn pc-btn-gold" href="${PAGINA_CARRITO}#pago">Finalizar compra <i class="bi bi-arrow-right"></i></a>
        </div>
        <div class="pc-paywith"><span>Paga con:</span>${CHIPS_MINI.map(n => `<span class="pc-chip">${n}</span>`).join('')}</div>
      </div>`;
  }

  function vacioHTML() {
    return `<div class="pc-empty">
      <div class="pc-empty-ico"><i class="bi bi-bag"></i></div>
      <h3>Tu carrito está vacío</h3>
      <p>Compara precios y agrega lo que más te guste.</p>
      <a class="pc-btn pc-btn-gold" href="tienda.html">Ir a la tienda <i class="bi bi-arrow-right"></i></a>
    </div>`;
  }

  function anclar() {
    const btn = btnAncla || $('[aria-label="Carrito"]'); if (!btn || !mini) return;
    const r = btn.getBoundingClientRect();
    mini.style.top = (r.bottom + 8) + 'px';
    mini.style.right = Math.max(12, window.innerWidth - r.right - 8) + 'px';
    mini.style.maxHeight = (window.innerHeight - r.bottom - 24) + 'px';
  }
  function abrirMini(btn) {
    if (enPaginaCarrito()) return;
    if (!mini) montarMini();
    if (btn && btn.nodeType === 1) btnAncla = btn;
    clearTimeout(cierreT);
    renderMini(); anclar();
    mini.classList.add('open');
  }
  function cerrarMini() { clearTimeout(cierreT); clearTimeout(autoT); if (mini) mini.classList.remove('open'); }
  function cerrarConRetraso(ms) { clearTimeout(cierreT); cierreT = setTimeout(cerrarMini, ms); }

  /* Cuando agregas algo, la ventanita aparece un momento para que veas qué pasó */
  function vistaPreviaTemporal() {
    if (enPaginaCarrito() || !puedeHover) return;
    abrirMini(); clearTimeout(autoT); autoT = setTimeout(cerrarMini, 3500);
  }

  /* ═════════════ PÁGINA carrito.html ═════════════
     Paso 1: carrito (eliges qué productos compras)
     Paso 2: entrega + método de pago (cada método con su propio formulario) */
  const KEY_OFF     = 'pn_carrito_off';        // ids de productos que NO se van a comprar ahora
  const KEY_ENTREGA = 'pn_datos_entrega';
  const LOCALIDADES = ['Usaquén', 'Chapinero', 'Santa Fe', 'San Cristóbal', 'Usme', 'Tunjuelito', 'Bosa', 'Kennedy', 'Fontibón', 'Engativá', 'Suba', 'Barrios Unidos', 'Teusaquillo', 'Los Mártires', 'Antonio Nariño', 'Puente Aranda', 'La Candelaria', 'Rafael Uribe Uribe', 'Ciudad Bolívar', 'Sumapaz'];
  const BANCOS_PSE = ['Bancolombia', 'Banco de Bogotá', 'Davivienda', 'BBVA Colombia', 'Banco de Occidente', 'Banco Popular', 'Banco AV Villas', 'Banco Caja Social', 'Scotiabank Colpatria', 'Banco Itaú', 'Banco Agrario', 'Banco Falabella', 'Banco Pichincha', 'Bancoomeva', 'Lulo Bank', 'Nu Colombia'];
  const CUOTAS = [1, 2, 3, 6, 12, 24, 36];

  let paso = 1;
  let cuotasSel = 1;
  let metodoSel = (function () { try { return localStorage.getItem(KEY_PAGO) || ''; } catch (e) { return ''; } })();
  if (!METODOS_PAGO.some(m => m.id === metodoSel)) metodoSel = '';

  const getOff = () => leer(KEY_OFF, []);
  const setOff = a => localStorage.setItem(KEY_OFF, JSON.stringify(a));
  const seleccionados = () => { const off = getOff(); return getCarrito().filter(i => !off.includes(i.id)); };
  const getEntrega = () => leer(KEY_ENTREGA, null);
  const val = id => (($('#' + id) || {}).value || '').trim();
  const soloDigitos = s => String(s || '').replace(/\D/g, '');

  /* ───────── Piezas de formulario ───────── */
  const campo = (id, label, control, extra) =>
    `<div class="pc-field ${extra || ''}" data-field="${id}"><label for="${id}">${label}</label>${control}<div class="pc-err" id="err-${id}" role="alert"></div></div>`;
  const input = (id, o) => {
    o = o || {};
    return `<input class="pc-input" id="${id}" name="${id}" type="${o.type || 'text'}" placeholder="${esc(o.ph || '')}" autocomplete="${o.ac || 'off'}"` +
      `${o.im ? ` inputmode="${o.im}"` : ''}${o.max ? ` maxlength="${o.max}"` : ''}${o.digits ? ' data-digits="1"' : ''} value="${esc(o.val || '')}">`;
  };
  const select = (id, opts, v, ph) =>
    `<select class="pc-input" id="${id}" name="${id}"><option value="">${ph || 'Selecciona'}</option>` +
    opts.map(o => { const a = Array.isArray(o) ? o : [o, o]; return `<option value="${esc(a[0])}" ${String(a[0]) === String(v) ? 'selected' : ''}>${esc(a[1])}</option>`; }).join('') + '</select>';
  const TIPOS_DOC = [['CC', 'Cédula de ciudadanía'], ['CE', 'Cédula de extranjería'], ['NIT', 'NIT'], ['PAS', 'Pasaporte']];

  function setErr(id, msg) {
    const el = $('#err-' + id); if (!el) return;
    el.textContent = msg || '';
    const f = el.closest('.pc-field'); if (f) f.classList.toggle('has-err', !!msg);
  }
  function limpiarErr(raiz) { $$('.pc-err', raiz || document).forEach(e => { e.textContent = ''; const f = e.closest('.pc-field'); if (f) f.classList.remove('has-err'); }); }
  function mostrarErrs(errs) {
    errs.forEach(([id, m]) => setErr(id, m));
    const primero = errs.length && $('#' + errs[0][0]);
    if (primero) { primero.scrollIntoView({ behavior: 'smooth', block: 'center' }); setTimeout(() => primero.focus && primero.focus({ preventScroll: true }), 300); }
    return errs.length === 0;
  }

  /* ───────── Validaciones ───────── */
  const luhn = n => { let s = 0, d = false; for (let i = n.length - 1; i >= 0; i--) { let x = +n[i]; if (d) { x *= 2; if (x > 9) x -= 9; } s += x; d = !d; } return s % 10 === 0; };
  const okCel = s => /^3\d{9}$/.test(soloDigitos(s));
  const okMail = s => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(s);
  const okDoc = s => /^[A-Za-z0-9]{5,12}$/.test(s);
  function marcaTarjeta(n) {
    if (/^4/.test(n)) return 'Visa';
    if (/^(5[1-5]|2(2[2-9]|[3-6]\d|7[01]|720))/.test(n)) return 'Mastercard';
    if (/^3[47]/.test(n)) return 'American Express';
    if (/^3(0[0-5]|[68])/.test(n)) return 'Diners Club';
    if (/^(6011|65|64[4-9])/.test(n)) return 'Discover';
    return '';
  }

  /* ───────── Encabezado y pasos ───────── */
  function stepperHTML() {
    return `<ol class="pc-steps" aria-label="Pasos de compra">
      <li class="${paso === 1 ? 'is-on' : 'is-done'}"><span>${paso === 1 ? '1' : '✓'}</span> Carrito</li>
      <li class="pc-steps-line"></li>
      <li class="${paso === 2 ? 'is-on' : ''}"><span>2</span> Entrega y pago</li>
    </ol>`;
  }
  function titulos(titulo, sub) {
    const t = $('#pcTitulo'), s = $('#pcSub');
    if (t) t.textContent = titulo; if (s) s.textContent = sub;
    document.title = titulo + ' | PriceNice';
  }
  const checkHTML = (attrs, texto, marcado) =>
    `<label class="pc-check"><input type="checkbox" ${attrs} ${marcado ? 'checked' : ''}><span class="pc-check-box"></span><span class="pc-sr">${esc(texto)}</span></label>`;

  /* ═════ PASO 1 · Carrito ═════ */
  function renderPaso1() {
    const cont = $('#pcContenido'); if (!cont) return;
    const items = getCarrito(), favs = getFavs(), off = getOff();
    const sel = items.filter(i => !off.includes(i.id)), t = calcular(sel);
    titulos('Mi carrito', items.length ? `Elige los productos que quieres comprar ahora · ${sel.length} de ${items.length} seleccionados` : 'Aún no has agregado nada.');
    if (!items.length) { cont.innerHTML = stepperHTML() + `<div class="pc-group" style="padding:10px 24px">${vacioHTML()}</div>`; return; }

    const grupos = {};
    items.forEach(i => (grupos[i.tienda || 'Otras tiendas'] = grupos[i.tienda || 'Otras tiendas'] || []).push(i));

    const izquierda = Object.keys(grupos).map(nombre => {
      const lista = grupos[nombre];
      const marcados = lista.filter(i => !off.includes(i.id));
      const subG = marcados.reduce((a, i) => a + i.precio * i.qty, 0);
      return `<section class="pc-group" aria-label="Productos de ${esc(nombre)}">
        <div class="pc-group-head">
          ${checkHTML(`data-sel="tienda" data-tienda="${esc(nombre)}"`, 'Seleccionar todos de ' + nombre, marcados.length === lista.length)}
          <i class="bi bi-shop"></i>${esc(nombre)}<small>Subtotal ${fmt(subG)}</small>
        </div>
        ${lista.map(i => `
          <article class="pc-line ${off.includes(i.id) ? 'is-off' : ''}">
            ${checkHTML(`data-sel="item" data-id="${i.id}"`, 'Comprar ' + i.nombre, !off.includes(i.id))}
            <div class="pc-thumb"><img src="${imgSrc(i)}" alt="${esc(i.nombre)}" loading="lazy" onerror="this.src='${LOGO_FALLBACK}'"></div>
            <div>
              <div class="pc-item-name">${esc(i.nombre)}</div>
              <div class="pc-item-store">${fmt(i.precio)} c/u</div>
              ${accionesItem(i, favs)}
              ${tipHTML(i)}
            </div>
            <div class="pc-line-price">${precioHTML(i)}</div>
          </article>`).join('')}
      </section>`;
    }).join('');

    const ahorro = ahorroTotal(sel);
    cont.innerHTML = stepperHTML() + `<div class="pc-grid">
      <div>
        <div class="pc-selbar">
          ${checkHTML('data-sel="todo"', 'Seleccionar todo', sel.length === items.length)}
          <strong>Seleccionar todo</strong><span>(${items.length} ${items.length === 1 ? 'producto' : 'productos'})</span>
          <button class="pc-link" data-pc="vaciar"><i class="bi bi-trash3"></i> Vaciar carrito</button>
        </div>
        ${izquierda}
        <div class="pc-cart-tools">
          <a class="pc-link is-back" href="tienda.html"><i class="bi bi-arrow-left"></i> Seguir comprando</a>
        </div>
      </div>
      <aside class="pc-summary" id="pago" aria-label="Resumen del pedido">
        <h2>Resumen</h2>
        <p class="pc-hint">${sel.length ? `${sel.length} de ${items.length} productos seleccionados. Los demás se quedan guardados en tu carrito.` : 'Selecciona al menos un producto para continuar.'}</p>
        ${ahorro > 0 ? `<div class="pc-save"><i class="bi bi-piggy-bank-fill"></i><span>Podrías ahorrar <strong>${fmt(ahorro)}</strong> comprando en otras tiendas</span></div>` : ''}
        ${barraEnvio(t.sub)}
        ${totalesHTML(t)}
        <button class="pc-btn pc-btn-gold pc-btn-block" data-pc="continuar" style="padding:17px" ${sel.length ? '' : 'disabled'}>Continuar compra <i class="bi bi-arrow-right"></i></button>
        <div class="pc-paywith"><span>Paga con:</span>${CHIPS_MINI.map(n => `<span class="pc-chip">${n}</span>`).join('')}</div>
        <div class="pc-secure"><i class="bi bi-shield-check"></i> Precios verificados, sin sorpresas</div>
      </aside>
    </div>`;
  }

  function alternarSeleccion(tipo, el) {
    const items = getCarrito(); let off = getOff();
    const marcar = el.checked;
    let ids;
    if (tipo === 'item') ids = [Number(el.dataset.id)];
    else if (tipo === 'tienda') ids = items.filter(i => (i.tienda || 'Otras tiendas') === el.dataset.tienda).map(i => i.id);
    else ids = items.map(i => i.id);
    off = off.filter(id => !ids.includes(id));
    if (!marcar) off = off.concat(ids);
    setOff(off); renderPaso1();
  }

  /* ═════ Datos de entrega (ventana) ═════ */
  function entregaCardHTML() {
    const e = getEntrega();
    if (!e) return `<div class="pc-card-head"><h2>Datos de entrega</h2></div>
      <p class="pc-hint">Cuéntanos dónde recibes tu pedido. Por ahora entregamos solo en Bogotá.</p>
      <button class="pc-btn pc-btn-line" data-pc="editar-entrega"><i class="bi bi-geo-alt"></i> Agregar dirección de entrega</button>`;
    return `<div class="pc-card-head"><h2>Datos de entrega</h2><button class="pc-link is-back" data-pc="editar-entrega"><i class="bi bi-pencil-square"></i> Editar</button></div>
      <div class="pc-addr"><i class="bi bi-geo-alt-fill"></i><div>
        <strong>${esc(e.nombre)}</strong> · ${esc(e.celular)}<br>
        ${esc(e.direccion)}${e.complemento ? ', ' + esc(e.complemento) : ''}<br>
        ${esc(e.barrio)}, ${esc(e.localidad)} · Bogotá, D.C.
        ${e.notas ? `<br><span class="pc-muted">${esc(e.notas)}</span>` : ''}
      </div></div>`;
  }

  function abrirModalEntrega(despues) {
    cerrarModal();
    const e = getEntrega() || {};
    const bg = document.createElement('div');
    bg.className = 'pc-modal-bg'; bg.id = 'pcModal';
    bg.innerHTML = `<div class="pc-modal" role="dialog" aria-modal="true" aria-labelledby="pcModalT">
      <div class="pc-modal-head"><h2 id="pcModalT">¿Dónde recibes tu pedido?</h2>
        <button class="pc-icon-btn" data-pc="cerrar-modal" aria-label="Cerrar"><i class="bi bi-x-lg"></i></button></div>
      <p class="pc-modal-note"><i class="bi bi-geo-alt-fill"></i> Por ahora entregamos solo en <strong>Bogotá, D.C.</strong></p>
      <form id="pcFormEntrega" novalidate autocomplete="on">
        <div class="pc-form-grid">
          ${campo('eNombre', 'Nombre completo', input('eNombre', { ac: 'name', ph: 'Como aparece en tu documento', val: e.nombre }), 'span2')}
          ${campo('eTipoDoc', 'Tipo de documento', select('eTipoDoc', TIPOS_DOC, e.tipoDoc || 'CC', 'Selecciona'))}
          ${campo('eDoc', 'Número de documento', input('eDoc', { im: 'numeric', max: 12, ph: 'Sin puntos ni comas', val: e.doc }))}
          ${campo('eCel', 'Celular', input('eCel', { type: 'tel', ac: 'tel-national', im: 'numeric', max: 10, digits: true, ph: '3001234567', val: e.celular }))}
          ${campo('eMail', 'Correo electrónico', input('eMail', { type: 'email', ac: 'email', ph: 'tucorreo@ejemplo.com', val: e.correo }))}
          ${campo('eCiudad', 'Ciudad', `<input class="pc-input" id="eCiudad" value="Bogotá, D.C." disabled>`)}
          ${campo('eLocalidad', 'Localidad', select('eLocalidad', LOCALIDADES, e.localidad, 'Selecciona tu localidad'))}
          ${campo('eBarrio', 'Barrio', input('eBarrio', { ph: 'Ej: Chicó, Cedritos…', val: e.barrio }))}
          ${campo('eDir', 'Dirección', input('eDir', { ac: 'street-address', ph: 'Ej: Cra 7 # 45-10', val: e.direccion }))}
          ${campo('eComp', 'Apartamento, torre, casa (opcional)', input('eComp', { ph: 'Ej: Torre 2, Apto 501', val: e.complemento }), 'span2')}
          ${campo('eNotas', 'Indicaciones para el repartidor (opcional)', `<textarea class="pc-input" id="eNotas" rows="2" placeholder="Ej: Dejar con el portero">${esc(e.notas || '')}</textarea>`, 'span2')}
        </div>
        <button type="submit" class="pc-btn pc-btn-gold pc-btn-block" style="padding:16px;margin-top:6px">Guardar y continuar <i class="bi bi-arrow-right"></i></button>
      </form></div>`;
    document.body.appendChild(bg);
    document.body.style.overflow = 'hidden';
    bg._despues = despues;
    setTimeout(() => { const f = $('#eNombre'); if (f) f.focus(); }, 50);
  }
  function cerrarModal() {
    const m = $('#pcModal'); if (!m) return;
    m.remove(); document.body.style.overflow = '';
  }
  function guardarEntrega(form) {
    limpiarErr(form);
    const d = {
      nombre: val('eNombre'), tipoDoc: val('eTipoDoc'), doc: val('eDoc'), celular: soloDigitos(val('eCel')), correo: val('eMail'),
      localidad: val('eLocalidad'), barrio: val('eBarrio'), direccion: val('eDir'), complemento: val('eComp'), notas: val('eNotas'), ciudad: 'Bogotá, D.C.'
    };
    const errs = [];
    if (d.nombre.length < 5 || !/\s/.test(d.nombre)) errs.push(['eNombre', 'Escribe tu nombre y apellido']);
    if (!d.tipoDoc) errs.push(['eTipoDoc', 'Elige el tipo de documento']);
    if (!okDoc(d.doc)) errs.push(['eDoc', 'Documento no válido (5 a 12 caracteres)']);
    if (!okCel(d.celular)) errs.push(['eCel', 'Celular de 10 dígitos que empiece por 3']);
    if (!okMail(d.correo)) errs.push(['eMail', 'Escribe un correo válido']);
    if (!d.localidad) errs.push(['eLocalidad', 'Elige tu localidad']);
    if (d.barrio.length < 3) errs.push(['eBarrio', 'Escribe tu barrio']);
    if (d.direccion.length < 5 || !/\d/.test(d.direccion)) errs.push(['eDir', 'Escribe la dirección completa, con números']);
    if (!mostrarErrs(errs)) return;
    localStorage.setItem(KEY_ENTREGA, JSON.stringify(d));
    const cb = $('#pcModal') && $('#pcModal')._despues;
    cerrarModal();
    if (typeof cb === 'function') cb();
  }

  /* ═════ PASO 2 · Entrega y pago ═════ */
  function irAPago() {
    if (!seleccionados().length) { toast('Selecciona al menos un producto'); return; }
    if (!getEntrega()) abrirModalEntrega(mostrarPaso2); else mostrarPaso2();
  }
  function mostrarPaso2() {
    paso = 2; renderPaso2();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }
  function volverAlCarrito() { paso = 1; renderPaso1(); window.scrollTo({ top: 0, behavior: 'smooth' }); }

  function panelMetodo(id) {
    const e = getEntrega() || {};
    switch (id) {
      case 'tarjeta': {
        const anio = new Date().getFullYear();
        return `<div class="pc-secure-line"><i class="bi bi-lock-fill"></i> Todas las transacciones son seguras y cifradas</div>
          ${campo('tNum', 'Número de tarjeta', `<div class="pc-input-wrap">${input('tNum', { im: 'numeric', ac: 'cc-number', max: 23, ph: 'Número de tarjeta' })}<span class="pc-brand" id="tMarca"></span></div>`)}
          <div class="pc-form-grid">
            ${campo('tMes', 'Fecha de vencimiento', `<div class="pc-two">${select('tMes', Array.from({ length: 12 }, (_, i) => String(i + 1).padStart(2, '0')), '', 'Mes')}${select('tAnio', Array.from({ length: 15 }, (_, i) => String(anio + i)), '', 'Año')}</div>`)}
            ${campo('tCvv', 'CVV', `<div class="pc-input-wrap">${input('tCvv', { type: 'password', im: 'numeric', ac: 'cc-csc', max: 4, digits: true, ph: 'Código de 3 o 4 dígitos' })}<span class="pc-brand"><i class="bi bi-lock-fill"></i></span></div>`)}
            ${campo('tNombre', 'Nombre del titular', input('tNombre', { ac: 'cc-name', ph: 'Como aparece en la tarjeta', val: e.nombre }))}
            ${campo('tDoc', 'Documento del titular', input('tDoc', { im: 'numeric', max: 12, ph: 'Cédula o NIT', val: e.doc }))}
          </div>
          <div class="pc-field" data-field="cuotas"><label>Pago mensual</label><div class="pc-cuotas" id="pcCuotas"></div>
            <p class="pc-muted" style="margin:8px 0 0">Las cuotas aplican solo a tarjeta de crédito. Tu banco puede cobrar intereses; aquí ves el valor dividido en partes iguales.</p></div>
          <p class="pc-muted">No guardamos el número ni el CVV de tu tarjeta.</p>`;
      }
      case 'pse':
        return `<div class="pc-form-grid">
          ${campo('pBanco', 'Banco', select('pBanco', BANCOS_PSE, '', 'Selecciona tu banco'), 'span2')}
          ${campo('pPersona', 'Tipo de persona', select('pPersona', [['natural', 'Persona natural'], ['juridica', 'Persona jurídica']], 'natural', 'Selecciona'))}
          ${campo('pTipoDoc', 'Tipo de documento', select('pTipoDoc', TIPOS_DOC, e.tipoDoc || 'CC', 'Selecciona'))}
          ${campo('pDoc', 'Número de documento', input('pDoc', { im: 'numeric', max: 12, val: e.doc }))}
          ${campo('pMail', 'Correo para el comprobante', input('pMail', { type: 'email', ac: 'email', val: e.correo }))}
        </div><p class="pc-muted">Te llevaremos a la página de tu banco para aprobar el pago desde tu cuenta de ahorros o corriente.</p>`;
      case 'nequi':
        return `<div class="pc-form-grid">${campo('nCel', 'Número de celular con Nequi', input('nCel', { type: 'tel', im: 'numeric', max: 10, digits: true, ph: '3001234567', val: e.celular }), 'span2')}</div>
          <p class="pc-muted">Recibirás una notificación en tu app Nequi para aprobar el pago. Revísala en los próximos minutos.</p>`;
      case 'daviplata':
        return `<div class="pc-form-grid">
          ${campo('dCel', 'Número de celular con Daviplata', input('dCel', { type: 'tel', im: 'numeric', max: 10, digits: true, ph: '3001234567', val: e.celular }))}
          ${campo('dDoc', 'Número de documento', input('dDoc', { im: 'numeric', max: 12, val: e.doc }))}
        </div><p class="pc-muted">Recibirás un código en tu celular para confirmar el pago en la app Daviplata.</p>`;
      case 'bancolombia':
        return `<p class="pc-muted" style="margin:0">Pagas con tu cuenta de ahorros o corriente Bancolombia. Te llevaremos al botón Bancolombia para ingresar con tu usuario y aprobar el pago.</p>`;
      case 'efecty':
        return `<div class="pc-form-grid">
          ${campo('fDoc', 'Número de documento', input('fDoc', { im: 'numeric', max: 12, val: e.doc }))}
          ${campo('fCel', 'Celular', input('fCel', { type: 'tel', im: 'numeric', max: 10, digits: true, ph: '3001234567', val: e.celular }))}
        </div><p class="pc-muted">Te daremos un código para pagar en cualquier punto Efecty en un plazo de 24 horas. Tu pedido se confirma cuando se reciba el pago.</p>`;
    }
    return '';
  }

  function metodosHTML() {
    return METODOS_PAGO.map(m => `
      <div class="pc-method ${metodoSel === m.id ? 'is-open' : ''}" data-metodo="${m.id}">
        <label class="pc-method-row">
          <input type="radio" name="pcPago" value="${m.id}" ${metodoSel === m.id ? 'checked' : ''}>
          <span class="pc-radio"></span>
          <span class="pc-tile" style="--tile:${m.color}">${m.id === 'tarjeta' ? '<i class="bi bi-credit-card-2-front"></i>' : esc(m.tile)}</span>
          <span class="pc-method-name"><strong>${m.nombre}</strong> <span>${m.nota}</span></span>
          ${m.chips ? `<span class="pc-brands">${m.chips.map(c => `<span class="pc-chip">${c}</span>`).join('')}</span>` : ''}
        </label>
        <div class="pc-method-panel" ${metodoSel === m.id ? '' : 'hidden'}>${panelMetodo(m.id)}</div>
      </div>`).join('');
  }

  function renderPaso2() {
    const cont = $('#pcContenido'); if (!cont) return;
    titulos('Finalizar compra', 'Confirma dónde recibes tu pedido y cómo quieres pagar.');
    cont.innerHTML = stepperHTML() + `<div class="pc-grid">
      <div>
        <section class="pc-card" id="pcEntrega">${entregaCardHTML()}</section>
        <section class="pc-card" id="pcMetodos">
          <div class="pc-card-head"><h2>Métodos de pago</h2></div>
          <p class="pc-hint" id="pcPagoHint"><i class="bi bi-info-circle"></i> Selecciona un método de pago</p>
          <div class="pc-methods" id="pcPayList">${metodosHTML()}</div>
        </section>
        <div class="pc-cart-tools"><button class="pc-link is-back" data-pc="volver"><i class="bi bi-arrow-left"></i> Volver al carrito</button></div>
      </div>
      <aside class="pc-summary" id="pcResumen2" aria-label="Resumen del pedido"></aside>
    </div>`;
    actualizarResumen2();
  }

  function actualizarResumen2() {
    const box = $('#pcResumen2');
    const sel = seleccionados();
    if (!sel.length) { paso = 1; renderPaso1(); return; }
    if (!box) return;
    const t = calcular(sel);
    box.innerHTML = `<h2>Tu pedido</h2>
      <div class="pc-order">${sel.map(i => `
        <div class="pc-order-item">
          <div class="pc-thumb"><img src="${imgSrc(i)}" alt="" loading="lazy" onerror="this.src='${LOGO_FALLBACK}'"></div>
          <div><div class="pc-item-name">${esc(i.nombre)}</div><div class="pc-item-store">${esc(i.tienda || '')} · x${i.qty}</div></div>
          <strong>${fmt(i.precio * i.qty)}</strong>
        </div>`).join('')}</div>
      ${barraEnvio(t.sub)}
      ${totalesHTML(t)}
      <button class="pc-btn pc-btn-gold pc-btn-block" data-pc="pagar" style="padding:17px"><i class="bi bi-lock-fill"></i> Pagar ${fmt(t.total)}</button>
      <div class="pc-secure"><i class="bi bi-shield-check"></i> Pago protegido · Precios verificados</div>`;
    renderCuotas(t.total);
  }

  function renderCuotas(total) {
    const box = $('#pcCuotas'); if (!box) return;
    box.innerHTML = CUOTAS.map(n => `
      <label class="pc-cuota"><input type="radio" name="pcCuotas" value="${n}" ${cuotasSel === n ? 'checked' : ''}>
        <span>${n === 1 ? 'Pagar ahora' : n + '× ' + fmt(Math.ceil(total / n))}</span></label>`).join('');
  }

  /* ───────── Pagar ───────── */
  function validarPago() {
    const errs = [], d = { metodo: metodoSel };
    switch (metodoSel) {
      case 'tarjeta': {
        const num = soloDigitos(val('tNum')), mes = val('tMes'), anio = val('tAnio'), cvv = val('tCvv');
        const marca = marcaTarjeta(num);
        if (num.length < 13 || num.length > 19 || !luhn(num)) errs.push(['tNum', 'Número de tarjeta no válido']);
        if (!mes || !anio) errs.push(['tMes', 'Elige mes y año de vencimiento']);
        else { const hoy = new Date(); if (+anio === hoy.getFullYear() && +mes < hoy.getMonth() + 1) errs.push(['tMes', 'Tarjeta vencida']); }
        if (!new RegExp('^\\d{' + (marca === 'American Express' ? 4 : 3) + '}$').test(cvv)) errs.push(['tCvv', marca === 'American Express' ? 'El CVV tiene 4 dígitos' : 'El CVV tiene 3 dígitos']);
        if (val('tNombre').length < 3) errs.push(['tNombre', 'Escribe el nombre del titular']);
        if (!okDoc(val('tDoc'))) errs.push(['tDoc', 'Documento no válido']);
        Object.assign(d, { marca, ultimos4: num.slice(-4), cuotas: cuotasSel, titular: val('tNombre'), documento: val('tDoc'),
          /* Los datos completos de la tarjeta NO se guardan aquí; envíalos directo a tu pasarela. */
          _tarjeta: { numero: num, mes, anio, cvv } });
        break;
      }
      case 'pse':
        if (!val('pBanco')) errs.push(['pBanco', 'Elige tu banco']);
        if (!okDoc(val('pDoc'))) errs.push(['pDoc', 'Documento no válido']);
        if (!okMail(val('pMail'))) errs.push(['pMail', 'Correo no válido']);
        Object.assign(d, { banco: val('pBanco'), persona: val('pPersona'), tipoDoc: val('pTipoDoc'), documento: val('pDoc'), correo: val('pMail') });
        break;
      case 'nequi':
        if (!okCel(val('nCel'))) errs.push(['nCel', 'Celular de 10 dígitos que empiece por 3']);
        d.celular = soloDigitos(val('nCel')); break;
      case 'daviplata':
        if (!okCel(val('dCel'))) errs.push(['dCel', 'Celular de 10 dígitos que empiece por 3']);
        if (!okDoc(val('dDoc'))) errs.push(['dDoc', 'Documento no válido']);
        Object.assign(d, { celular: soloDigitos(val('dCel')), documento: val('dDoc') }); break;
      case 'efecty':
        if (!okDoc(val('fDoc'))) errs.push(['fDoc', 'Documento no válido']);
        if (!okCel(val('fCel'))) errs.push(['fCel', 'Celular de 10 dígitos que empiece por 3']);
        Object.assign(d, { documento: val('fDoc'), celular: soloDigitos(val('fCel')) }); break;
    }
    return { errs, detalle: d };
  }

  function pagar() {
    const sel = seleccionados(); if (!sel.length) return;
    if (!getEntrega()) { abrirModalEntrega(() => { const c = $('#pcEntrega'); if (c) c.innerHTML = entregaCardHTML(); }); return; }
    limpiarErr($('#pcMetodos'));
    if (!metodoSel) {
      const l = $('#pcPayList'); if (l) { l.classList.add('pc-pay-error'); setTimeout(() => l.classList.remove('pc-pay-error'), 600); l.scrollIntoView({ behavior: 'smooth', block: 'center' }); }
      toast('Elige cómo quieres pagar'); return;
    }
    const { errs, detalle } = validarPago();
    if (!mostrarErrs(errs)) return;
    const resumen = calcular(sel);
    const pedido = { items: sel, ...resumen, entrega: getEntrega(), metodo: metodoSel, pago: detalle, fecha: new Date().toISOString() };
    /* Guardamos solo lo no sensible (sin datos de tarjeta) */
    const guardable = { items: sel, ...resumen, entrega: getEntrega(), metodo: metodoSel, fecha: pedido.fecha };
    try { _setItem.call(localStorage, 'pn_pedido_pendiente', JSON.stringify(guardable)); } catch (e) {}
    if (typeof PN_CARRITO.alPagar === 'function') PN_CARRITO.alPagar(pedido);
  }

  /* Llama esto cuando la pasarela confirme el pago: quita del carrito solo lo que se compró */
  function pedidoPagado() {
    const ids = seleccionados().map(i => i.id);
    setCarrito(getCarrito().filter(i => !ids.includes(i.id)));
    setOff(getOff().filter(id => !ids.includes(id)));
  }

  function renderPagina() {
    if (!$('#pcContenido')) return;
    if (paso === 2) actualizarResumen2(); else renderPaso1();
  }

  /* ───────── Eventos (delegados) ───────── */
  function manejarClics(e) {
    const b = e.target.closest('[data-pc]'); if (!b) return;
    const id = Number(b.dataset.id);
    switch (b.dataset.pc) {
      case 'mas':    cambiarQty(id, 1); break;
      case 'menos':  cambiarQty(id, -1); break;
      case 'del':    quitar(id); setOff(getOff().filter(x => x !== id)); break;
      case 'fav':    toggleFav(id); break;
      case 'vaciar': vaciar(); break;
      case 'cambiar': cambiarTienda(id); break;
      case 'continuar': irAPago(); break;
      case 'volver': volverAlCarrito(); break;
      case 'editar-entrega': abrirModalEntrega(() => { const c = $('#pcEntrega'); if (c) c.innerHTML = entregaCardHTML(); }); break;
      case 'cerrar-modal': cerrarModal(); break;
      case 'pagar':  pagar(); break;
    }
  }
  document.addEventListener('click', manejarClics);
  document.addEventListener('click', e => { if (e.target.id === 'pcModal') cerrarModal(); });
  document.addEventListener('keydown', e => { if (e.key === 'Escape') cerrarModal(); });
  document.addEventListener('submit', e => { if (e.target.id === 'pcFormEntrega') { e.preventDefault(); guardarEntrega(e.target); } });

  document.addEventListener('change', e => {
    const t = e.target;
    if (t.matches && t.matches('[data-sel]')) { alternarSeleccion(t.dataset.sel, t); return; }
    if (t.name === 'pcPago') {
      metodoSel = t.value;
      try { _setItem.call(localStorage, KEY_PAGO, metodoSel); } catch (x) {}
      $$('.pc-method').forEach(m => {
        const abierto = m.dataset.metodo === metodoSel;
        m.classList.toggle('is-open', abierto);
        const p = $('.pc-method-panel', m); if (p) p.hidden = !abierto;
      });
      if (metodoSel === 'tarjeta') renderCuotas(calcular(seleccionados()).total);
    }
    if (t.name === 'pcCuotas') cuotasSel = Number(t.value);
    if (t.id) setErr(t.id, '');
  });
  document.addEventListener('input', e => {
    const t = e.target;
    if (t.dataset && t.dataset.digits) t.value = soloDigitos(t.value);
    if (t.id === 'tNum') {
      const n = soloDigitos(t.value).slice(0, 19), marca = marcaTarjeta(n);
      t.value = (marca === 'American Express' ? n.replace(/^(\d{0,4})(\d{0,6})(\d{0,5}).*/, (m, a, b, c) => [a, b, c].filter(Boolean).join(' ')) : n.replace(/(\d{4})(?=\d)/g, '$1 '));
      const mk = $('#tMarca'); if (mk) mk.textContent = marca;
    }
    if (t.id) setErr(t.id, '');
  });

  /* Bolsita del navbar (cualquier página):
       • pasar el mouse  → ventanita con el resumen y las sugerencias
       • hacer clic      → pantalla completa del carrito (carrito.html)
     El clic se captura antes que el onclick="abrirCarrito()" viejo de cada página. */
  document.addEventListener('click', e => {
    const btn = e.target.closest('[aria-label="Carrito"]');
    if (!btn) return;
    e.preventDefault(); e.stopImmediatePropagation();
    if (enPaginaCarrito()) { if (paso === 2) volverAlCarrito(); else window.scrollTo({ top: 0, behavior: 'smooth' }); return; }
    location.href = PAGINA_CARRITO;
  }, true);

  function conectarBolsitas() {
    if (!puedeHover || enPaginaCarrito()) return;
    $$('[aria-label="Carrito"]').forEach(btn => {
      if (btn.dataset.pcHover) return; btn.dataset.pcHover = '1';
      btn.addEventListener('mouseenter', () => { clearTimeout(autoT); abrirMini(btn); });
      btn.addEventListener('mouseleave', () => cerrarConRetraso(250));
      btn.addEventListener('focus', () => abrirMini(btn));
      btn.addEventListener('blur', () => cerrarConRetraso(250));
    });
  }

  /* Insignia con la cantidad en el navbar */
  function actualizarBadge() {
    const n = calcular(getCarrito()).unidades;
    $$('#badgeCarritoNav').forEach(b => {
      if (n > 0) { b.textContent = n > 99 ? '99+' : n; b.style.display = 'flex'; } else b.style.display = 'none';
    });
  }

  let unidadesPrev = calcular(getCarrito()).unidades;
  function refrescar() {
    const n = calcular(getCarrito()).unidades;
    actualizarBadge(); renderMini(); renderPagina();
    if (n > unidadesPrev) vistaPreviaTemporal();     // acabas de agregar algo
    unidadesPrev = n;
  }
  window.addEventListener('pn:carrito', refrescar);
  window.addEventListener('storage', refrescar);

  /* ───────── Toast ───────── */
  let toastEl, toastT;
  function toast(msg) {
    if (!toastEl) { toastEl = document.createElement('div'); toastEl.className = 'pc-toast'; toastEl.setAttribute('role', 'status'); document.body.appendChild(toastEl); }
    toastEl.textContent = msg; toastEl.classList.add('show');
    clearTimeout(toastT); toastT = setTimeout(() => toastEl.classList.remove('show'), 2800);
  }

  /* Funciones del navbar para carrito.html (por si la página no carga script.js) */
  if (typeof window.toggleMobileMenu !== 'function') window.toggleMobileMenu = function () {
    const m = $('#mobileMenu'); if (!m) return; m.classList.toggle('open');
    document.body.style.overflow = m.classList.contains('open') ? 'hidden' : '';
  };
  if (typeof window.ejecutarBusqueda !== 'function') window.ejecutarBusqueda = function () {
    const q = ($('#pnSearchInput') || {}).value || ''; location.href = 'tienda.html' + (q ? '?q=' + encodeURIComponent(q) : '');
  };

  /* ───────── API pública ───────── */
  const PN_CARRITO = window.PN_CARRITO = {
    abrir: abrirMini, cerrar: cerrarMini, refrescar,
    /* Llámalo cuando la pasarela confirme el pago: saca del carrito solo lo que se compró */
    pedidoPagado: pedidoPagado,
    /* Compatibilidad con los onclick="abrirCarrito()" que ya tienes en tus páginas */
    /* ▼▼ AQUÍ CONECTAS EL PAGO REAL ▼▼
       Recibe { items, sub, envio, total, unidades, entrega, metodo, pago, fecha }.
       (pago._tarjeta trae los datos de la tarjeta solo en memoria; mándalos a la pasarela y no los guardes.)
       Ejemplo con una pasarela:  location.href = 'https://tu-pasarela/checkout?ref=...'  */
    alPagar: function (pedido) {
      const m = METODOS_PAGO.find(x => x.id === pedido.metodo);
      toast('Pedido listo para pagar con ' + m.nombre + ' · falta conectar la pasarela de pagos');
    }
  };
  window.abrirCarrito = function () { location.href = PAGINA_CARRITO; };   // compatibilidad con onclick viejos
  window.cerrarCarrito = cerrarMini;

  function iniciar() {
    montarMini(); conectarBolsitas(); refrescar();
    if (enPaginaCarrito() && location.hash === '#pago' && getCarrito().length) irAPago();   // viene de "Finalizar compra" de la ventanita
  }
  document.readyState === 'loading' ? document.addEventListener('DOMContentLoaded', iniciar) : iniciar();
})();
