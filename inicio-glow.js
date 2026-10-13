/* ═══════════════════════════════════════════════════════════════
   PriceNice — inicio-glow.js
   Pequeños comportamientos del Index: carrusel de reseñas,
   movimiento suave de la foto con el mouse y suscripción por correo.
═══════════════════════════════════════════════════════════════ */
(function () {
  'use strict';

  /* ── Reseñas: flechas, puntos y avance automático ── */
  var track = document.getElementById('revTrack');
  if (track) {
    var cards = Array.prototype.slice.call(track.children);
    var dots = document.getElementById('revDots');
    var prev = document.getElementById('revPrev');
    var next = document.getElementById('revNext');
    var timer = null;

    var paso = function () { return cards[0].getBoundingClientRect().width + 20; };
    var pagina = function () { return Math.round(track.scrollLeft / paso()); };
    var maxPag = function () { return Math.max(0, Math.round((track.scrollWidth - track.clientWidth) / paso())); };

    var pintarPuntos = function () {
      if (!dots) return;
      var n = maxPag() + 1, a = Math.min(pagina(), n - 1);
      dots.innerHTML = '';
      for (var i = 0; i < n; i++) {
        var b = document.createElement('button');
        b.type = 'button';
        b.setAttribute('aria-label', 'Ir a la reseña ' + (i + 1));
        if (i === a) b.className = 'on';
        (function (k) { b.onclick = function () { parar(); track.scrollTo({ left: k * paso(), behavior: 'smooth' }); }; })(i);
        dots.appendChild(b);
      }
    };
    var ir = function (dir) {
      var p = pagina() + dir, m = maxPag();
      if (p > m) p = 0;
      if (p < 0) p = m;
      track.scrollTo({ left: p * paso(), behavior: 'smooth' });
    };
    var parar = function () { clearInterval(timer); timer = null; };
    var arrancar = function () { parar(); timer = setInterval(function () { ir(1); }, 6500); };

    if (prev) prev.addEventListener('click', function () { parar(); ir(-1); });
    if (next) next.addEventListener('click', function () { parar(); ir(1); });
    track.addEventListener('scroll', function () {
      if (!dots) return;
      var a = Math.min(pagina(), maxPag());
      Array.prototype.forEach.call(dots.children, function (d, i) { d.classList.toggle('on', i === a); });
    }, { passive: true });
    track.addEventListener('mouseenter', parar);
    track.addEventListener('mouseleave', arrancar);
    window.addEventListener('resize', pintarPuntos);
    pintarPuntos();
    if (!window.matchMedia('(prefers-reduced-motion: reduce)').matches) arrancar();
  }

  /* ── La foto del banner se mueve un poco con el mouse ── */
  var hero = document.querySelector('.pn-hero');
  if (hero && window.matchMedia('(hover: hover)').matches && !window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    hero.addEventListener('mousemove', function (e) {
      var r = hero.getBoundingClientRect();
      var x = (e.clientX - r.left) / r.width - 0.5;
      var y = (e.clientY - r.top) / r.height - 0.5;
      hero.style.setProperty('--mx', (x * 14).toFixed(1) + 'px');
      hero.style.setProperty('--my', (y * 10).toFixed(1) + 'px');
    });
    hero.addEventListener('mouseleave', function () {
      hero.style.setProperty('--mx', '0px');
      hero.style.setProperty('--my', '0px');
    });
  }

  /* ── Suscripción por correo (pie de página) ── */
  var form = document.getElementById('pnNews');
  if (form) {
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var input = document.getElementById('pnNewsEmail');
      var ok = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test((input.value || '').trim());
      var toast = document.getElementById('pnToast');
      var msg = document.getElementById('pnToastMsg');
      if (msg) msg.textContent = ok ? '¡Listo! Te avisaremos de las novedades' : 'Escribe un correo válido';
      if (toast) { toast.classList.add('show'); setTimeout(function () { toast.classList.remove('show'); }, 2600); }
      if (ok) input.value = '';
    });
  }
})();
