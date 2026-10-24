/* PriceNice — pn-animaciones.js · animaciones comunes (aparecer al hacer scroll, ondita en botones) */
(function () {
  'use strict';
  var sinMov = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (sinMov) return;

  /* Bloques que aparecen al entrar en pantalla (se excluyen los que ya tienen su propia animación) */
  var SEL = [
    'main section', '.pn-footer-grid > *', '.card', '.card-opcion', '.pn-product-card', '.vd-card', '.adm-panel', '.adm-card',
    '.pn-hero-card', '.pn-cat-card', '.pn-feature', '.pn-benefit', '.pn-step', '.pn-store-card', '.contact-card', '.rv-card'
  ].join(',');
  var PROPIAS = '.on-rv, .fv-rv, .on-hero, .fv-hero, .on-sec, .fv-sec, .vd-sec, .via-panel, [data-no-anim]';
  var vistos = new WeakSet();

  function esFijo(el) { var p = getComputedStyle(el).position; return p === 'fixed' || p === 'sticky'; }
  var io = 'IntersectionObserver' in window ? new IntersectionObserver(function (es) {
    es.forEach(function (e) {
      if (!e.isIntersecting) return;
      e.target.classList.add('pn-in');
      var t = e.target; setTimeout(function () { t.classList.remove('pn-rv', 'pn-in', 'pn-hecho'); }, 1400);   /* al terminar, el elemento vuelve a sus estilos originales (hover, etc.) */
      io.unobserve(e.target);
    });
  }, { threshold: .08, rootMargin: '0px 0px -30px 0px' }) : null;

  function preparar(raiz) {
    if (!io) return;
    var lista = (raiz || document).querySelectorAll(SEL), n = 0;
    Array.prototype.forEach.call(lista, function (el) {
      if (vistos.has(el) || el.closest(PROPIAS) || el.matches(PROPIAS) || esFijo(el)) return;
      /* Si un contenedor ya va a aparecer, no animamos también a sus hijos directos grandes */
      vistos.add(el);
      el.classList.add('pn-rv'); el.style.setProperty('--pn-i', n++ % 6);
      io.observe(el);
    });
  }
  function iniciar() {
    preparar(document);
    /* Seguridad: nada se queda invisible aunque falle el observador */
    setTimeout(function () { document.querySelectorAll('.pn-rv:not(.pn-in)').forEach(function (e) { var r = e.getBoundingClientRect(); if (r.top < innerHeight * 1.2) e.classList.add('pn-in'); }); }, 2500);
    /* Contenido que se pinta después (productos, tarjetas…) */
    if ('MutationObserver' in window) {
      var t; new MutationObserver(function () { clearTimeout(t); t = setTimeout(function () { preparar(document); }, 120); })
        .observe(document.body, { childList: true, subtree: true });
    }
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', iniciar); else iniciar();

  /* Ondita al hacer clic en botones principales */
  document.addEventListener('click', function (e) {
    var b = e.target.closest('.btn, .pn-btn-primary, .vd-btn, .adm-btn, .rv-btn, .dm-add, .dm-now, .fv-btn, .on-btn, .lg-btn');
    if (!b || b.disabled) return;
    var r = b.getBoundingClientRect(), d = Math.max(r.width, r.height);
    var o = document.createElement('span'); o.className = 'pn-onda';
    o.style.cssText = 'width:' + d + 'px;height:' + d + 'px;left:' + (e.clientX - r.left - d / 2) + 'px;top:' + (e.clientY - r.top - d / 2) + 'px';
    var cs = getComputedStyle(b);
    if (cs.position === 'static') b.style.position = 'relative';
    b.classList.add('pn-ripple'); b.appendChild(o);
    setTimeout(function () { o.remove(); }, 650);
  }, true);
})();
