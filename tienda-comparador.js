/* ═══════════════════════════════════════════════════════════════
   PriceNice — tienda-comparador.js
   Une la tienda virtual con el comparador de precios en tienda.html.
   Lee lo que ya existe en la página (PRODUCTOS, BARRIOS, userPos,
   filtros, carrito) y muestra, para el producto que buscas:
   precios por tienda · distancia · reseñas · botón de compra.
   Va DESPUÉS del script principal de tienda.html.
═══════════════════════════════════════════════════════════════ */
(function () {
  'use strict';

  var root = document.getElementById('ocRoot');
  if (!root || typeof PRODUCTOS === 'undefined') return;

  var $ = function (id) { return document.getElementById(id); };
  var feat = $('ocFeat'), matchEl = $('tcMatch'), sel = $('tcBarrio'), stage = root.querySelector('.pn-oc-stage');
  var REDUCE = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var cur = null, manual = false, ultimo = '';

  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function coma(n) { return n.toFixed(1).replace('.', ','); }

  /* ── datos derivados de cada producto ── */
  function preparar(p) {
    var of = p.o.slice().sort(function (a, b) { return a.p - b.p; });
    var max = of[of.length - 1];
    return { p: p, of: of, min: of[0], max: max, ahorro: max.p - of[0].p, pct: max.p ? Math.round((max.p - of[0].p) / max.p * 100) : 0 };
  }
  function masCerca(d) {
    if (!userPos) return null;
    var c = d.of.filter(function (o) { return BARRIOS[o.b]; });
    if (!c.length) return null;
    return c.reduce(function (a, o) { return km(userPos, BARRIOS[o.b]) < km(userPos, BARRIOS[a.b]) ? o : a; });
  }
  var TOP = PRODUCTOS.map(preparar).sort(function (a, b) { return b.pct - a.pct; }).slice(0, 6);

  /* ── ficha ── */
  function contar(el, hasta) {
    if (REDUCE || !root.classList.contains('is-in')) { el.textContent = fmtPrecio(hasta); return; }
    var t0 = null;
    function paso(ts) {
      if (!t0) t0 = ts;
      var k = Math.min((ts - t0) / 900, 1), e = 1 - Math.pow(1 - k, 3);
      el.textContent = fmtPrecio(Math.round(k < 1 ? hasta * e : hasta));
      if (k < 1) requestAnimationFrame(paso);
    }
    requestAnimationFrame(paso);
  }

  function pintar(d, animar) {
    var p = d.p, cerca = masCerca(d), n = p.of ? p.of.length : d.of.length;
    cur = d;
    var filas = d.of.map(function (x, i) {
      var best = i === 0, w = Math.round(x.p / d.max.p * 100);
      var sub = x.b === 'Online' ? 'Online · a domicilio' : x.b + (userPos && BARRIOS[x.b] ? ' · ≈ ' + coma(km(userPos, BARRIOS[x.b])) + ' km' : '');
      return '<li class="pn-oc-row' + (best ? ' is-best' : '') + '" style="--i:' + i + '">' +
        '<span class="pn-oc-store"><b>' + esc(x.t) + '</b><small>' + esc(sub) + '</small>' + (cerca === x ? '<em class="tc-near">Más cerca de ti</em>' : '') + '</span>' +
        '<span class="pn-oc-bar" aria-hidden="true"><i style="--w:' + w + '%"></i></span>' +
        '<span class="pn-oc-price"><strong>' + fmtPrecio(x.p) + '</strong><em>' + (best ? 'Más barato' : '+' + fmtPrecio(x.p - d.min.p)) + '</em></span>' +
        '<button type="button" class="tc-buy" data-t="' + esc(x.t) + '" aria-label="Comprar ' + esc(p.nombre) + ' en ' + esc(x.t) + '"><i class="bi bi-cart-plus" aria-hidden="true"></i></button>' +
        '</li>';
    }).join('');

    var rs = (typeof resenasDe === 'function' ? resenasDe(p) : []).slice().sort(function (a, b) { return b.estrellas - a.estrellas; }).slice(0, 2);
    var resenas = rs.length
      ? '<h4 class="tc-rev-title">Lo que dicen quienes ya lo compraron</h4><ul class="tc-rev">' + rs.map(function (r) {
          return '<li><div class="tc-rev-top"><span class="tc-stars" aria-label="' + r.estrellas + ' de 5">' + '★'.repeat(r.estrellas) + '</span><b>' + r.nombre + '</b></div><p>“' + r.comentario + '”</p></li>';
        }).join('') + '</ul>'
      : '';

    var calif = p.resenas ? coma(p.estrellas) + ' ★' : 'Nuevo';
    var cerr = cerca ? 'Más cerca: ' + cerca.t : null;

    feat.innerHTML =
      '<article class="pn-oc-feat' + (animar ? ' swap' : '') + (manual ? ' is-manual' : '') + '" aria-label="Comparación de precios: ' + esc(p.nombre) + '">' +
        '<div class="pn-oc-feat-media">' +
          '<img src="' + esc(p.imagen) + '" alt="' + esc(p.nombre) + '" onerror="this.style.visibility=\'hidden\'">' +
          (d.pct ? '<span class="pn-oc-off">-' + d.pct + '%</span>' : '') +
          '<span class="pn-oc-where">Más barato en ' + esc(d.min.t) + '</span>' +
        '</div>' +
        '<div class="pn-oc-feat-body">' +
          '<div class="pn-oc-meta"><span>' + esc(NOMCAT[p.cat] || p.cat) + '</span><span>' + (userPos ? 'Distancias desde tu ubicación' : 'Activa tu ubicación para ver distancias') + '</span></div>' +
          '<h3>' + esc(p.nombre) + '</h3>' +
          '<div class="tc-kpis">' +
            '<div class="tc-kpi"><strong>' + (d.pct ? '-' + d.pct + '%' : '—') + '</strong><small>ahorro frente a la más cara</small></div>' +
            '<div class="tc-kpi"><strong>' + d.of.length + '</strong><small>tiendas comparadas</small></div>' +
            '<div class="tc-kpi"><strong>' + calif + '</strong><small>' + (p.resenas ? p.resenas + ' reseñas' : 'aún sin reseñas') + '</small></div>' +
          '</div>' +
          '<ul class="pn-oc-rows">' + filas + '</ul>' +
          resenas +
          '<div class="pn-oc-save">' +
            '<div class="pn-oc-save-t"><small>Ahorras hasta</small><strong id="ocAhorro">' + fmtPrecio(d.ahorro) + '</strong><small>' + (cerr || 'comprando en la tienda más barata') + '</small></div>' +
            '<div class="pn-oc-cta">' +
              '<button type="button" class="pn-oc-add" data-act="add"><i class="bi bi-cart-plus" aria-hidden="true"></i> Agregar</button>' +
              '<button type="button" class="tc-now" data-act="now">Comprar ya</button>' +
              '<button type="button" class="pn-oc-more tc-more" data-act="det">Ver detalles</button>' +
            '</div>' +
          '</div>' +
        '</div>' +
        '<span class="pn-oc-prog" aria-hidden="true"></span>' +
      '</article>';
    contar($('ocAhorro'), d.ahorro);
  }

  /* ── acciones de compra ── */
  feat.addEventListener('click', function (e) {
    if (!cur) return;
    var p = cur.p, b;
    if ((b = e.target.closest('.tc-buy'))) {
      agregarCarrito(p.id, b.getAttribute('data-t'), 1);
      mostrarToast('Agregado desde ' + b.getAttribute('data-t'));
    } else if ((b = e.target.closest('[data-act]'))) {
      var a = b.getAttribute('data-act');
      if (a === 'add') { agregarCarrito(p.id, cur.min.t, 1); mostrarToast('Agregado desde ' + cur.min.t + ' · ' + fmtPrecio(cur.min.p)); }
      else if (a === 'now') { agregarCarrito(p.id, cur.min.t, 1); location.href = 'carrito.html'; }
      else if (a === 'det') abrirModal(p.id);
    }
  });

  /* ── rotación automática cuando no se está buscando nada ── */
  feat.addEventListener('animationend', function (e) {
    if (e.animationName !== 'ocProg' || manual) return;
    var i = 0; TOP.forEach(function (d, k) { if (cur && d.p.id === cur.p.id) i = k; });
    pintar(TOP[(i + 1) % TOP.length], true);
    ultimo = TOP[(i + 1) % TOP.length].p.id + '|' + clave();
  });

  function clave() { return userPos ? userPos[0].toFixed(3) + ',' + userPos[1].toFixed(3) : 'x'; }

  /* ── conectar con los filtros de la tienda ── */
  function refrescar() {
    /* sincronizar el selector de barrio con la ubicación */
    var loc = root.querySelector('.tc-loc');
    if (userPos) {
      if (!sel.value) {
        var cerca = Object.keys(BARRIOS).sort(function (a, b) { return km(userPos, BARRIOS[a]) - km(userPos, BARRIOS[b]); })[0];
        sel.value = cerca;
      }
    } else sel.value = '';
    loc.classList.toggle('is-set', !!userPos);

    var F = leerF();
    var filtrando = !!(F.q || F.tienda || F.barrio || cat || F.min > 0 || F.max < Infinity);
    var lista = vistas(F, true).map(function (v) { return preparar(v.pr); })
      .sort(function (a, b) { return b.pct - a.pct; });

    var elegido;
    if (filtrando) {
      manual = true;
      matchEl.innerHTML = lista.length > 1
        ? '<span>También coincide</span>' + lista.slice(0, 5).map(function (d) {
            return '<button type="button" data-id="' + d.p.id + '">' + esc(d.p.nombre) + '</button>';
          }).join('')
        : (lista.length ? '' : '<span>No hay productos con esa búsqueda. Prueba con otra palabra o quita filtros.</span>');
      var igual = cur && lista.filter(function (d) { return d.p.id === cur.p.id; })[0];
      elegido = (manual && igual && ultimoManual) ? igual : lista[0];
    } else {
      manual = false; ultimoManual = false;
      matchEl.innerHTML = '';
      elegido = (cur && TOP.filter(function (d) { return d.p.id === cur.p.id; })[0]) || TOP[0];
    }
    if (!elegido) return;
    var k = elegido.p.id + '|' + clave() + '|' + (manual ? 'm' : 'a');
    if (k === ultimo) { marcar(); return; }
    ultimo = k;
    pintar(elegido, true);
    marcar();
  }
  var ultimoManual = false;
  function marcar() {
    Array.prototype.forEach.call(matchEl.querySelectorAll('button'), function (b) {
      b.classList.toggle('is-on', cur && b.getAttribute('data-id') === String(cur.p.id));
    });
  }
  matchEl.addEventListener('click', function (e) {
    var b = e.target.closest('button[data-id]'); if (!b) return;
    var p = PRODUCTOS.filter(function (x) { return String(x.id) === b.getAttribute('data-id'); })[0];
    if (!p) return;
    manual = true; ultimoManual = true; ultimo = p.id + '|' + clave() + '|m';
    pintar(preparar(p), true); marcar();
  });

  var original = window.filtrarProductos;
  window.filtrarProductos = function () {
    ultimoManual = false;
    original.apply(this, arguments);
    refrescar();
  };

  /* ── selector de barrio (alternativa a compartir la ubicación) ── */
  sel.innerHTML = '<option value="">o elige tu barrio</option>' +
    Object.keys(BARRIOS).sort().map(function (b) { return '<option>' + b + '</option>'; }).join('');
  sel.addEventListener('change', function () {
    if (sel.value) {
      userPos = BARRIOS[sel.value].slice();
      $('sortSelect').value = 'cercano';
      mostrarToast('Mostrando distancias desde ' + sel.value);
    } else {
      userPos = null;
      if ($('sortSelect').value === 'cercano') $('sortSelect').value = 'precio-asc';
    }
    window.filtrarProductos();
  });

  /* ── arranque: las barras se dibujan cuando la sección entra en pantalla ── */
  function entrar() {
    if (root.classList.contains('is-in')) return;
    root.classList.add('is-in');
    if (cur) pintar(cur, false);
  }
  if ('IntersectionObserver' in window) {
    var io = new IntersectionObserver(function (en) { if (en[0].isIntersecting) { entrar(); io.disconnect(); } }, { threshold: .25 });
    io.observe(stage);
  } else entrar();

  /* por si la página ya había filtrado antes de cargar este archivo */
  if (document.readyState !== 'loading') refrescar();
})();
