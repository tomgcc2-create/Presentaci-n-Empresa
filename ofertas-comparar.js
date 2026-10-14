/* ═══════════════════════════════════════════════════════════════
   PriceNice — ofertas-comparar.js
   Sección "Ofertas + Comparar" del Index:
   · buscador que compara un producto entre tiendas de Bogotá
   · ficha grande con barras de precio y cuánto ahorras
   · riel de ofertas (tarjetas) que cambia la ficha al tocarlas

   ⚠ Los precios son los mismos de ejemplo que usa la Tienda
     (carrito-precios.js). Cámbialos por los reales cuando los tengas.
═══════════════════════════════════════════════════════════════ */
(function () {
  'use strict';

  var root = document.getElementById('ocRoot');
  if (!root) return;

  var DATA = [{"id":1,"nombre":"Crema Hidratante Facial","cat":"belleza","estrellas":4.5,"resenas":128,"imagen":"https://images.unsplash.com/photo-1556228841-a3c527ebefe5?w=600&q=80","o":[{"t":"Cruz Verde","p":38900,"b":"Chapinero","a":44900},{"t":"Carulla","p":41500,"b":"Usaquén"},{"t":"Falabella","p":45900,"b":"Online"}]},{"id":2,"nombre":"Sérum Vitamina C 30ml","cat":"belleza","estrellas":4.9,"resenas":576,"imagen":"https://images.unsplash.com/photo-1608248597279-f99d160bfcbc?w=600&q=80","o":[{"t":"Linio","p":89900,"b":"Online","a":99900},{"t":"Éxito","p":94900,"b":"Suba"},{"t":"Falabella","p":99900,"b":"Chapinero"}]},{"id":3,"nombre":"Base de Maquillaje Mate","cat":"belleza","estrellas":4.3,"resenas":89,"imagen":"https://images.unsplash.com/photo-1522335789203-aabd1fc54bc9?w=600&q=80","o":[{"t":"Falabella","p":65900,"b":"Chapinero","a":72900},{"t":"Éxito","p":69900,"b":"Kennedy"},{"t":"Linio","p":71900,"b":"Online"}]},{"id":4,"nombre":"Detergente Líquido 3L","cat":"higiene","estrellas":4.2,"resenas":67,"imagen":"https://images.unsplash.com/photo-1585421514284-efb74c2b69ba?w=600&q=80","o":[{"t":"D1","p":24900,"b":"Kennedy"},{"t":"Ara","p":25400,"b":"Bosa"},{"t":"Éxito","p":26500,"b":"Suba"},{"t":"Jumbo","p":27900,"b":"Usaquén","a":31000}]},{"id":5,"nombre":"Aceite de Oliva Extra Virgen","cat":"mercado","estrellas":4.8,"resenas":412,"imagen":"https://images.unsplash.com/photo-1474979266404-7eaacbcd87c5?w=600&q=80","o":[{"t":"PriceSmart","p":28900,"b":"Suba","a":33000},{"t":"Jumbo","p":31900,"b":"Usaquén"},{"t":"Carulla","p":33500,"b":"Chapinero"}]},{"id":6,"nombre":"Café Molido Premium 500g","cat":"mercado","estrellas":4.7,"resenas":234,"imagen":"https://images.unsplash.com/photo-1447933601403-0c6688de566e?w=600&q=80","o":[{"t":"Jumbo","p":18900,"b":"Usaquén"},{"t":"D1","p":19500,"b":"Engativá"},{"t":"Éxito","p":20900,"b":"Fontibón"}]},{"id":7,"nombre":"Audífonos Bluetooth Pro","cat":"tecnologia","estrellas":4.7,"resenas":342,"imagen":"https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=600&q=80","o":[{"t":"Alkosto","p":129900,"b":"Fontibón","a":159900},{"t":"Linio","p":134900,"b":"Online"},{"t":"Falabella","p":149900,"b":"Teusaquillo"}]},{"id":8,"nombre":"Smartwatch Fitness Pro","cat":"tecnologia","estrellas":4.4,"resenas":156,"imagen":"https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=600&q=80","o":[{"t":"Falabella","p":249900,"b":"Chapinero"},{"t":"Linio","p":255900,"b":"Online"},{"t":"Alkosto","p":259900,"b":"Fontibón"}]},{"id":9,"nombre":"Zapatillas Running CloudX","cat":"moda","estrellas":4.3,"resenas":89,"imagen":"https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=600&q=80","o":[{"t":"Éxito","p":189900,"b":"Suba","a":229900},{"t":"Alkosto","p":195000,"b":"Fontibón"},{"t":"Falabella","p":209900,"b":"Chapinero"}]},{"id":10,"nombre":"Sudadera Oversize Fleece","cat":"moda","estrellas":4.1,"resenas":63,"imagen":"https://images.unsplash.com/photo-1556821840-3a63f15732ce?w=600&q=80","o":[{"t":"Linio","p":79900,"b":"Online"},{"t":"Éxito","p":84900,"b":"Kennedy"},{"t":"Falabella","p":89900,"b":"Teusaquillo"}]},{"id":11,"nombre":"Sábanas Microfibra Queen","cat":"hogar","estrellas":4.6,"resenas":201,"imagen":"https://images.unsplash.com/photo-1631049307264-da0ec9d70304?w=600&q=80","o":[{"t":"Alkosto","p":119900,"b":"Fontibón"},{"t":"Homecenter","p":124900,"b":"Puente Aranda"},{"t":"Falabella","p":132900,"b":"Chapinero"}]},{"id":12,"nombre":"Foco LED 10W Pack x4","cat":"hogar","estrellas":4.5,"resenas":88,"imagen":"https://images.unsplash.com/photo-1565814329452-e1efa11c5b89?w=600&q=80","o":[{"t":"Homecenter","p":22900,"b":"Puente Aranda"},{"t":"Alkosto","p":24500,"b":"Fontibón"},{"t":"Éxito","p":25900,"b":"Engativá"}]},{"id":13,"nombre":"Shampoo Anticaspa 750ml","cat":"higiene","estrellas":4,"resenas":41,"imagen":"https://images.unsplash.com/photo-1556228578-8c89e6adf883?w=600&q=80","o":[{"t":"Carulla","p":21900,"b":"Chapinero"},{"t":"Éxito","p":22900,"b":"Suba"},{"t":"D1","p":23500,"b":"Kennedy"}]},{"id":14,"nombre":"Alimento Premium Perro 15kg","cat":"mascotas","estrellas":4.8,"resenas":319,"imagen":"https://images.unsplash.com/photo-1589924691995-400dc9ecc119?w=600&q=80","o":[{"t":"Éxito","p":89900,"b":"Usaquén"},{"t":"PriceSmart","p":92500,"b":"Suba"},{"t":"Jumbo","p":95900,"b":"Engativá"}]}];

  var CAT = { belleza: 'Belleza', tecnologia: 'Tecnología', moda: 'Moda', hogar: 'Hogar', mercado: 'Mercado', higiene: 'Higiene', mascotas: 'Mascotas' };
  var REDUCE = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ── utilidades ── */
  function fmt(n) { return '$' + Math.round(n).toLocaleString('es-CO'); }
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function norm(s) { return String(s || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, ''); }
  function $(id) { return document.getElementById(id); }

  /* ── preparar datos: tienda más barata, más cara y ahorro ── */
  DATA.forEach(function (p) {
    p.o.sort(function (a, b) { return a.p - b.p; });
    p.min = p.o[0];
    p.max = p.o[p.o.length - 1];
    p.ahorro = p.max.p - p.min.p;
    p.pct = Math.round(p.ahorro / p.max.p * 100);
    p.hay = norm(p.nombre + ' ' + (CAT[p.cat] || p.cat) + ' ' + p.o.map(function (x) { return x.t; }).join(' '));
  });
  var ORDEN = DATA.slice().sort(function (a, b) { return b.pct - a.pct; });
  function byId(id) { return DATA.filter(function (p) { return String(p.id) === String(id); })[0]; }

  var feat = $('ocFeat'), rail = $('ocRail'), chips = $('ocChips'), input = $('ocInput'),
      list = $('ocList'), stage = root.querySelector('.pn-oc-stage');
  var cur = ORDEN[0], filtro = 'todo', manual = false, act = -1, resultados = [];

  /* ── añadir al carrito (misma bolsa que usa el resto del sitio) ── */
  function agregar(p) {
    try {
      var c = typeof getCarrito === 'function' ? getCarrito() : JSON.parse(localStorage.getItem('pn_carrito') || '[]');
      var e = c.filter(function (i) { return i.id === p.id; })[0];
      if (e) e.qty++; else c.push({ id: p.id, nombre: p.nombre, precio: p.min.p, tienda: p.min.t, imagen: p.imagen, qty: 1 });
      if (typeof setCarrito === 'function') setCarrito(c); else localStorage.setItem('pn_carrito', JSON.stringify(c));
      if (typeof actualizarBadges === 'function') actualizarBadges();
      if (typeof renderCarrito === 'function') renderCarrito();
      if (typeof mostrarToast === 'function') mostrarToast('Agregado desde ' + p.min.t + ' · ' + fmt(p.min.p));
    } catch (err) { /* sin carrito disponible */ }
  }

  /* ── cuenta animada del ahorro ── */
  function contar(el, hasta) {
    if (REDUCE || !root.classList.contains('is-in')) { el.textContent = fmt(hasta); return; }
    var t0 = null, dur = 900;
    function paso(ts) {
      if (!t0) t0 = ts;
      var k = Math.min((ts - t0) / dur, 1), e = 1 - Math.pow(1 - k, 3);
      el.textContent = fmt(k < 1 ? hasta * e : hasta);
      if (k < 1) requestAnimationFrame(paso);
    }
    requestAnimationFrame(paso);
  }

  /* ── ficha de comparación ── */
  function pintarFicha(p, animar) {
    cur = p;
    var filas = p.o.map(function (x, i) {
      var best = i === 0, w = Math.round(x.p / p.max.p * 100);
      return '<li class="pn-oc-row' + (best ? ' is-best' : '') + '" style="--i:' + i + '">' +
        '<span class="pn-oc-store"><b>' + esc(x.t) + '</b><small>' + esc(x.b) + '</small></span>' +
        '<span class="pn-oc-bar" aria-hidden="true"><i style="--w:' + w + '%"></i></span>' +
        '<span class="pn-oc-price"><strong>' + fmt(x.p) + '</strong><em>' + (best ? 'Más barato' : '+' + fmt(x.p - p.min.p)) + '</em></span>' +
        '</li>';
    }).join('');

    feat.innerHTML =
      '<article class="pn-oc-feat' + (animar ? ' swap' : '') + (manual ? ' is-manual' : '') + '" aria-label="Comparación de precios: ' + esc(p.nombre) + '">' +
        '<div class="pn-oc-feat-media">' +
          '<img src="' + esc(p.imagen) + '" alt="' + esc(p.nombre) + '">' +
          '<span class="pn-oc-off">-' + p.pct + '%</span>' +
          '<span class="pn-oc-where">Más barato en ' + esc(p.min.t) + '</span>' +
        '</div>' +
        '<div class="pn-oc-feat-body">' +
          '<div class="pn-oc-meta"><span>' + esc(CAT[p.cat] || p.cat) + '</span>' +
            '<span><span class="pn-oc-star">★ ' + p.estrellas + '</span> (' + p.resenas + ' reseñas)</span></div>' +
          '<h3>' + esc(p.nombre) + '</h3>' +
          '<ul class="pn-oc-rows">' + filas + '</ul>' +
          '<div class="pn-oc-save">' +
            '<div class="pn-oc-save-t"><small>Ahorras hasta</small><strong id="ocAhorro">' + fmt(p.ahorro) + '</strong><small>frente a la tienda más cara</small></div>' +
            '<div class="pn-oc-cta">' +
              '<button type="button" class="pn-oc-add" id="ocAdd"><i class="bi bi-cart-plus" aria-hidden="true"></i> Agregar</button>' +
              '<a class="pn-oc-more" href="tienda.html?q=' + encodeURIComponent(p.nombre) + '">Ver en la tienda</a>' +
            '</div>' +
          '</div>' +
        '</div>' +
        '<span class="pn-oc-prog" aria-hidden="true"></span>' +
      '</article>';

    contar($('ocAhorro'), p.ahorro);
    $('ocAdd').addEventListener('click', function () { agregar(p); });
  }

  /* ── riel de tarjetas ── */
  function tarjeta(p) {
    return '<article class="pn-oc-card' + (cur && cur.id === p.id ? ' is-on' : '') + '" data-id="' + p.id + '">' +
      '<button type="button" class="pn-oc-card-main" data-sel aria-label="Comparar precios de ' + esc(p.nombre) + '">' +
        '<span class="pn-oc-card-img"><img src="' + esc(p.imagen) + '" alt="" loading="lazy"><span class="pn-oc-card-off">-' + p.pct + '%</span></span>' +
        '<span class="pn-oc-card-name">' + esc(p.nombre) + '</span>' +
        '<span class="pn-oc-card-price">' + fmt(p.min.p) + '</span>' +
        '<span class="pn-oc-card-where">Más barato en ' + esc(p.min.t) + '</span>' +
      '</button>' +
      '<button type="button" class="pn-oc-card-add" data-add aria-label="Agregar ' + esc(p.nombre) + ' al carrito"><i class="bi bi-cart" aria-hidden="true"></i></button>' +
    '</article>';
  }
  function pintarRiel() {
    var items = ORDEN.filter(function (p) { return filtro === 'todo' || p.cat === filtro; });
    rail.innerHTML = items.map(tarjeta).join('');
    rail.scrollLeft = 0;
    flechas();
  }
  function marcarRiel(centrar) {
    var cards = rail.querySelectorAll('.pn-oc-card'), on = null;
    Array.prototype.forEach.call(cards, function (c) {
      var esta = c.getAttribute('data-id') === String(cur.id);
      c.classList.toggle('is-on', esta);
      if (esta) on = c;
    });
    if (on && centrar) rail.scrollTo({ left: on.offsetLeft - (rail.clientWidth - on.offsetWidth) / 2, behavior: REDUCE ? 'auto' : 'smooth' });
  }
  function flechas() {
    var a = $('ocPrev'), b = $('ocNext');
    if (!a || !b) return;
    a.disabled = rail.scrollLeft <= 4;
    b.disabled = rail.scrollLeft + rail.clientWidth >= rail.scrollWidth - 4;
  }
  $('ocPrev').addEventListener('click', function () { rail.scrollBy({ left: -Math.max(rail.clientWidth * .8, 240), behavior: 'smooth' }); });
  $('ocNext').addEventListener('click', function () { rail.scrollBy({ left: Math.max(rail.clientWidth * .8, 240), behavior: 'smooth' }); });
  rail.addEventListener('scroll', flechas, { passive: true });
  window.addEventListener('resize', flechas);

  /* ── chips de categoría ── */
  (function () {
    var usadas = {};
    DATA.forEach(function (p) { usadas[p.cat] = true; });
    var html = '<button type="button" class="is-on" data-cat="todo">Todo</button>';
    Object.keys(CAT).forEach(function (k) { if (usadas[k]) html += '<button type="button" data-cat="' + k + '">' + CAT[k] + '</button>'; });
    chips.innerHTML = html;
    chips.addEventListener('click', function (e) {
      var b = e.target.closest('button[data-cat]'); if (!b) return;
      filtro = b.getAttribute('data-cat');
      Array.prototype.forEach.call(chips.children, function (c) { c.classList.toggle('is-on', c === b); });
      pintarRiel();
    });
  })();

  /* ── elegir un producto (desde el riel o el buscador) ── */
  function elegir(id, desdeUsuario) {
    var p = byId(id); if (!p) return;
    if (desdeUsuario) manual = true;
    pintarFicha(p, true);
    marcarRiel(!desdeUsuario);
    if (desdeUsuario) {
      var r = stage.getBoundingClientRect();
      if (r.top < 90) stage.scrollIntoView({ behavior: REDUCE ? 'auto' : 'smooth', block: 'start' });
    }
  }
  rail.addEventListener('click', function (e) {
    var card = e.target.closest('.pn-oc-card'); if (!card) return;
    var p = byId(card.getAttribute('data-id'));
    if (e.target.closest('[data-add]')) { agregar(p); return; }
    if (e.target.closest('[data-sel]')) elegir(p.id, true);
  });

  /* ── rotación automática: avanza cuando termina la barra de avance ── */
  feat.addEventListener('animationend', function (e) {
    if (e.animationName !== 'ocProg' || manual) return;
    var i = ORDEN.indexOf(cur);
    elegir(ORDEN[(i + 1) % ORDEN.length].id, false);
  });

  /* ── buscador ── */
  function buscar(q) {
    var partes = norm(q).trim().split(/\s+/).filter(Boolean);
    if (!partes.length) return [];
    return ORDEN.filter(function (p) { return partes.every(function (w) { return p.hay.indexOf(w) > -1; }); }).slice(0, 5);
  }
  function cerrar() { list.hidden = true; input.setAttribute('aria-expanded', 'false'); input.removeAttribute('aria-activedescendant'); act = -1; }
  function abrir() {
    var q = input.value.trim();
    resultados = buscar(q);
    if (!q) { cerrar(); return; }
    if (!resultados.length) {
      list.innerHTML = '<li class="pn-oc-empty">No encontramos “' + esc(q) + '”. <a href="tienda.html?q=' + encodeURIComponent(q) + '">Búscalo en la tienda</a></li>';
    } else {
      list.innerHTML = resultados.map(function (p, i) {
        return '<li class="pn-oc-opt" role="option" id="ocOpt' + i + '" data-id="' + p.id + '" aria-selected="false">' +
          '<img src="' + esc(p.imagen) + '" alt="">' +
          '<span><b>' + esc(p.nombre) + '</b><small>Desde ' + fmt(p.min.p) + ' en ' + esc(p.min.t) + ' · ' + p.o.length + ' tiendas</small></span>' +
          '<em>-' + p.pct + '%</em></li>';
      }).join('');
    }
    act = -1;
    list.hidden = false;
    input.setAttribute('aria-expanded', 'true');
  }
  function marcarAct() {
    Array.prototype.forEach.call(list.querySelectorAll('.pn-oc-opt'), function (li, i) {
      li.classList.toggle('is-act', i === act);
      li.setAttribute('aria-selected', i === act ? 'true' : 'false');
      if (i === act) input.setAttribute('aria-activedescendant', li.id);
    });
  }
  function usar(p) { input.value = p.nombre; cerrar(); elegir(p.id, true); }
  function enviar() {
    var q = input.value.trim(); if (!q) { input.focus(); return; }
    if (act > -1 && resultados[act]) return usar(resultados[act]);
    var r = buscar(q);
    if (r.length) return usar(r[0]);
    window.location.href = 'tienda.html?q=' + encodeURIComponent(q);
  }
  input.addEventListener('input', abrir);
  input.addEventListener('focus', function () { if (input.value.trim()) abrir(); });
  input.addEventListener('keydown', function (e) {
    if (e.key === 'ArrowDown' && resultados.length) { e.preventDefault(); act = (act + 1) % resultados.length; marcarAct(); }
    else if (e.key === 'ArrowUp' && resultados.length) { e.preventDefault(); act = (act - 1 + resultados.length) % resultados.length; marcarAct(); }
    else if (e.key === 'Enter') { e.preventDefault(); enviar(); }
    else if (e.key === 'Escape') cerrar();
  });
  $('ocGo').addEventListener('click', enviar);
  list.addEventListener('click', function (e) {
    var li = e.target.closest('.pn-oc-opt'); if (!li) return;
    usar(byId(li.getAttribute('data-id')));
  });
  document.addEventListener('click', function (e) { if (!e.target.closest('.pn-oc-search')) cerrar(); });

  /* "Prueba con…" */
  $('ocTry').addEventListener('click', function (e) {
    var b = e.target.closest('button[data-q]'); if (!b) return;
    input.value = b.getAttribute('data-q'); input.focus(); abrir();
  });

  /* ── letrero superior: comparaciones reales en movimiento ── */
  var tk = $('pnTkTrack');
  function irAlComparador() {
    stage.scrollIntoView({ behavior: REDUCE ? 'auto' : 'smooth', block: 'start' });
  }
  if (tk) {
    var item = function (p) {
      return '<button type="button" class="pn-tk-item" data-id="' + p.id + '" aria-label="Comparar precios de ' + esc(p.nombre) + '">' +
        '<b>' + esc(p.nombre) + '</b><span>más barato en ' + esc(p.min.t) + '</span>' +
        '<span class="pn-tk-price">' + fmt(p.min.p) + '</span><span class="pn-tk-off">-' + p.pct + '%</span></button>';
    };
    var intro = '<button type="button" class="pn-tk-item" data-go><b>Compara precios de todas las tiendas de Bogotá antes de pagar</b></button>';
    var grupo = function (oculto) {
      return '<div class="pn-tk-group"' + (oculto ? ' aria-hidden="true"' : '') + '>' + intro + ORDEN.slice(0, 8).map(item).join('') + '</div>';
    };
    tk.innerHTML = grupo(false) + grupo(true);
    tk.addEventListener('click', function (e) {
      var b = e.target.closest('button'); if (!b) return;
      if (b.hasAttribute('data-go')) { irAlComparador(); return; }
      elegir(b.getAttribute('data-id'), true);
      irAlComparador();
    });
    var cta = document.querySelector('.pn-tk-cta');
    if (cta) cta.addEventListener('click', function (e) { e.preventDefault(); irAlComparador(); });
    var ocultar = function () { document.body.classList.toggle('tk-hide', window.scrollY > 40); };
    window.addEventListener('scroll', ocultar, { passive: true });
    ocultar();
  }

  /* ── arranque: la ficha dibuja sus barras cuando la sección entra en pantalla ── */
  pintarFicha(cur, false);
  pintarRiel();
  marcarRiel(false);

  function entrar() {
    if (root.classList.contains('is-in')) return;
    root.classList.add('is-in');
    pintarFicha(cur, false);
  }
  if ('IntersectionObserver' in window) {
    var io = new IntersectionObserver(function (en) {
      if (en[0].isIntersecting) { entrar(); io.disconnect(); }
    }, { threshold: .3 });
    io.observe(stage);
  } else {
    entrar();
  }
})();
