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
    { id: 'nequi',      nombre: 'Nequi',       nota: 'Desde tu celular',    icono: 'bi-phone-fill',       color: '#C9157F' },
    { id: 'daviplata',  nombre: 'Daviplata',   nota: 'Desde tu celular',    icono: 'bi-phone-fill',       color: '#D32030' },
    { id: 'pse',        nombre: 'PSE',         nota: 'Débito desde tu banco', icono: 'bi-bank2',          color: '#1A5FB4' },
    { id: 'tarjeta',    nombre: 'Tarjeta',     nota: 'Crédito o débito',    icono: 'bi-credit-card-2-front-fill', color: '#13224F' },
    { id: 'bancolombia',nombre: 'Bancolombia', nota: 'Botón Bancolombia',   icono: 'bi-bank',             color: '#3D4A6B' },
    { id: 'efectivo',   nombre: 'Efectivo',    nota: 'Efecty, Baloto o contra entrega', icono: 'bi-cash-coin', color: '#1C7C5A' }
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

  /* ═════════════ PÁGINA carrito.html ═════════════ */
  let metodoSel = (function () { try { return localStorage.getItem(KEY_PAGO) || ''; } catch (e) { return ''; } })();

  function renderPagina() {
    const cont = $('#pcContenido'); if (!cont) return;
    const items = getCarrito(), favs = getFavs(), t = calcular(items);
    const sub = $('#pcSub');
    if (sub) sub.textContent = items.length ? `${t.unidades} ${t.unidades === 1 ? 'producto' : 'productos'} de ${new Set(items.map(i => i.tienda)).size} tienda(s)` : 'Aún no has agregado nada.';

    if (!items.length) { cont.innerHTML = `<div class="pc-group" style="padding:10px 24px">${vacioHTML(false)}</div>`; return; }

    /* Agrupar por tienda: PriceNice compara tiendas, así que se ve de dónde viene cada cosa */
    const grupos = {};
    items.forEach(i => (grupos[i.tienda || 'Otras tiendas'] = grupos[i.tienda || 'Otras tiendas'] || []).push(i));

    const izquierda = Object.keys(grupos).map(nombre => {
      const lista = grupos[nombre];
      const subG = lista.reduce((a, i) => a + i.precio * i.qty, 0);
      return `<section class="pc-group" aria-label="Productos de ${esc(nombre)}">
        <div class="pc-group-head"><i class="bi bi-shop"></i>${esc(nombre)}<small>Subtotal ${fmt(subG)}</small></div>
        ${lista.map(i => `
          <article class="pc-line">
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

    const pagos = METODOS_PAGO.map(m => `
      <label class="pc-pay">
        <input type="radio" name="pcPago" value="${m.id}" ${metodoSel === m.id ? 'checked' : ''}>
        <span class="pc-pay-card">
          <span class="pc-pay-ico" style="background:${m.color}"><i class="bi ${m.icono}"></i></span>
          <span class="pc-pay-name">${m.nombre}<small>${m.nota}</small></span>
        </span>
      </label>`).join('');

    cont.innerHTML = `<div class="pc-grid">
      <div>
        ${izquierda}
        <div class="pc-cart-tools">
          <a class="pc-link is-back" href="tienda.html"><i class="bi bi-arrow-left"></i> Seguir comprando</a>
          <button class="pc-link" data-pc="vaciar"><i class="bi bi-trash3"></i> Vaciar carrito</button>
        </div>
      </div>
      <aside class="pc-summary" id="pago" aria-label="Resumen del pedido">
        <h2>Resumen</h2>
        ${ahorroTotal(items) > 0 ? `<div class="pc-save"><i class="bi bi-piggy-bank-fill"></i><span>Podrías ahorrar <strong>${fmt(ahorroTotal(items))}</strong> comprando en otras tiendas</span></div>` : ''}
        ${barraEnvio(t.sub)}
        ${totalesHTML(t)}
        <div>
          <h3>Método de pago</h3>
          <div class="pc-pay-list" id="pcPayList">${pagos}</div>
        </div>
        <button class="pc-btn pc-btn-gold pc-btn-block" data-pc="pagar" style="padding:17px"><i class="bi bi-lock-fill"></i> Pagar ${fmt(t.total)}</button>
        <div class="pc-secure"><i class="bi bi-shield-check"></i> Precios verificados, sin sorpresas</div>
      </aside>
    </div>`;
  }

  /* ───────── Pagar ───────── */
  function pagar() {
    const items = getCarrito(); if (!items.length) return;
    if (!metodoSel) {
      const l = $('#pcPayList'); if (l) { l.classList.add('pc-pay-error'); setTimeout(() => l.classList.remove('pc-pay-error'), 600); l.scrollIntoView({ behavior: 'smooth', block: 'center' }); }
      toast('Elige cómo quieres pagar');
      return;
    }
    const metodo = METODOS_PAGO.find(m => m.id === metodoSel);
    const pedido = { items, ...calcular(items), metodo: metodo.id, fecha: new Date().toISOString() };
    try { _setItem.call(localStorage, 'pn_pedido_pendiente', JSON.stringify(pedido)); } catch (e) {}
    if (typeof PN_CARRITO.alPagar === 'function') PN_CARRITO.alPagar(pedido);
  }

  /* ───────── Eventos (delegados) ───────── */
  function manejarClics(e) {
    const b = e.target.closest('[data-pc]'); if (!b) return;
    const id = Number(b.dataset.id);
    switch (b.dataset.pc) {
      case 'mas':    cambiarQty(id, 1); break;
      case 'menos':  cambiarQty(id, -1); break;
      case 'del':    quitar(id); break;
      case 'fav':    toggleFav(id); break;
      case 'vaciar': vaciar(); break;
      case 'pagar':  pagar(); break;
      case 'cambiar': cambiarTienda(id); break;
    }
  }
  document.addEventListener('click', manejarClics);   // un solo listener para página y ventanita
  document.addEventListener('change', e => {
    if (e.target.name === 'pcPago') { metodoSel = e.target.value; try { _setItem.call(localStorage, KEY_PAGO, metodoSel); } catch (x) {} }
  });

  /* Bolsita del navbar (cualquier página):
       • pasar el mouse  → ventanita con el resumen y las sugerencias
       • hacer clic      → pantalla completa del carrito (carrito.html)
     El clic se captura antes que el onclick="abrirCarrito()" viejo de cada página. */
  document.addEventListener('click', e => {
    const btn = e.target.closest('[aria-label="Carrito"]');
    if (!btn) return;
    e.preventDefault(); e.stopImmediatePropagation();
    if (enPaginaCarrito()) { const r = $('#pago'); if (r) r.scrollIntoView({ behavior: 'smooth' }); return; }
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
    /* Compatibilidad con los onclick="abrirCarrito()" que ya tienes en tus páginas */
    /* ▼▼ AQUÍ CONECTAS EL PAGO REAL ▼▼
       Recibe { items, sub, envio, total, unidades, metodo, fecha }.
       Ejemplo con una pasarela:  location.href = 'https://tu-pasarela/checkout?ref=...'  */
    alPagar: function (pedido) {
      const m = METODOS_PAGO.find(x => x.id === pedido.metodo);
      toast('Pedido listo para pagar con ' + m.nombre + ' · falta conectar la pasarela de pagos');
    }
  };
  window.abrirCarrito = function () { location.href = PAGINA_CARRITO; };   // compatibilidad con onclick viejos
  window.cerrarCarrito = cerrarMini;

  function iniciar() { montarMini(); conectarBolsitas(); refrescar(); }
  document.readyState === 'loading' ? document.addEventListener('DOMContentLoaded', iniciar) : iniciar();
})();
