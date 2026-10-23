/* PriceNice — tienda-nuevo.js
   Contenido y movimiento de la página de comparación:
   - Carruseles que se arrastran con el mouse o el dedo (con impulso).
   - Tarjetas que se inclinan siguiendo el cursor.
   - Botones que se acercan al cursor y ondas al tocar.
   - Aparición al bajar, parallax del banner y salida suave al hacer scroll. */
(function () {
  const reduce = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
  const productos = Array.isArray(window.PN_PRODUCTOS) ? window.PN_PRODUCTOS : [];
  const NOMBRES = { belleza: 'Belleza', hogar: 'Hogar', moda: 'Moda', tecnologia: 'Tecnología', mascotas: 'Mascotas', mercado: 'Mercado', higiene: 'Higiene', otros: 'Otros' };
  const ORDEN = ['belleza', 'hogar', 'moda', 'tecnologia', 'mercado', 'higiene'];

  const imagenDe = (cat) => { const p = productos.find((x) => x.cat === cat && x.imagen); return p ? p.imagen : ''; };
  const $ = (id) => document.getElementById(id);

  // 1) Carrusel superior con productos reales
  const top = $('tnTop');
  if (top) {
    top.innerHTML = productos.filter((p) => p.imagen).slice(0, 6).map((p) =>
      '<button class="tn-card tilt" type="button" data-id="' + p.id + '" style="background-image:url(' + p.imagen + ')">' +
      '<span>' + (NOMBRES[p.cat] || p.cat) + '</span></button>').join('');
  }

  // 2) Mosaico de categorías
  const mosaico = $('tnMosaic');
  if (mosaico) {
    const cats = ORDEN.filter((c) => productos.some((x) => x.cat === c)).slice(0, 5);
    mosaico.innerHTML = cats.map((c, i) =>
      '<button class="tn-tile tilt" type="button" data-setcat="' + c + '" style="--d:' + (i * 90) + 'ms;background-image:url(' + imagenDe(c) + ')">' +
      '<span>' + NOMBRES[c] + '</span><i class="bi bi-arrow-right"></i></button>').join('') +
      '<button class="tn-tile tilt todas" type="button" data-setcat="" style="--d:' + (cats.length * 90) + 'ms"><span>Ver todas</span><i class="bi bi-arrow-right"></i></button>';
  }

  // 3) Imágenes de la historia
  if ($('tnStoryA') && productos[0]) $('tnStoryA').style.backgroundImage = 'url(' + productos[0].imagen + ')';
  if ($('tnStoryB') && productos[1]) $('tnStoryB').style.backgroundImage = 'url(' + productos[1].imagen + ')';

  // 4) Números 01 02 03 y etiqueta que cambia
  const textos = ['Ahorras hasta $3.000', 'Comparas 11 tiendas', 'Pagas lo justo'];
  const chip = $('tnChip');
  document.querySelectorAll('.tn-dot').forEach((d) => d.addEventListener('click', () => {
    document.querySelectorAll('.tn-dot').forEach((x) => x.classList.toggle('on', x === d));
    if (!chip) return;
    chip.classList.add('cambia');
    setTimeout(() => { chip.textContent = textos[Number(d.dataset.i)] || textos[0]; chip.classList.remove('cambia'); }, 260);
  }));

  // 5) Flechas
  document.addEventListener('click', (e) => {
    const b = e.target.closest('[data-t][data-dir]');
    if (!b) return;
    const el = $(b.dataset.t);
    if (el) el.scrollBy({ left: Number(b.dataset.dir) * 300, behavior: reduce ? 'auto' : 'smooth' });
  });

  // 6) Categorías: filtran la tienda y bajan a los productos
  document.addEventListener('click', (e) => {
    const t = e.target.closest('[data-setcat]');
    if (!t) return;
    if (typeof window.setCat === 'function') window.setCat(t.dataset.setcat);
    const main = document.querySelector('main');
    if (main) main.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'start' });
  });

  // 7) Tarjetas del carrusel superior abren el producto
  document.addEventListener('click', (e) => {
    const t = e.target.closest('#tnTop .tn-card');
    if (!t || t.closest('[data-drag="1"]')) return;
    if (typeof window.abrirModal === 'function') window.abrirModal(Number(t.dataset.id));
  });

  // 8) Arrastre con impulso (mouse y dedo) en todos los carruseles
  function arrastrable(el) {
    if (!el) return;
    let abajo = false, x0 = 0, sl0 = 0, lx = 0, lt = 0, vel = 0, movido = 0, raf = 0;
    el.addEventListener('pointerdown', (e) => {
      if (e.pointerType === 'mouse' && e.button !== 0) return;
      abajo = true; x0 = e.clientX; sl0 = el.scrollLeft; lx = e.clientX; lt = performance.now();
      vel = 0; movido = 0; el.dataset.drag = '0';
      cancelAnimationFrame(raf); el.classList.add('is-drag');
    });
    el.addEventListener('pointermove', (e) => {
      if (!abajo) return;
      const dx = e.clientX - x0;
      movido = Math.max(movido, Math.abs(dx));
      if (movido > 6) el.dataset.drag = '1';
      el.scrollLeft = sl0 - dx;
      const now = performance.now();
      vel = (lx - e.clientX) / Math.max(1, now - lt);
      lx = e.clientX; lt = now;
    });
    const soltar = () => {
      if (!abajo) return;
      abajo = false; el.classList.remove('is-drag');
      let v = vel * 16;
      const paso = () => { el.scrollLeft += v; v *= 0.92; if (Math.abs(v) > 0.5) raf = requestAnimationFrame(paso); };
      if (Math.abs(v) > 0.5) raf = requestAnimationFrame(paso);
    };
    el.addEventListener('pointerup', soltar);
    el.addEventListener('pointercancel', soltar);
    // Si se arrastró, el clic al soltar no abre el producto
    el.addEventListener('click', (e) => {
      if (el.dataset.drag === '1') { e.preventDefault(); e.stopPropagation(); el.dataset.drag = '0'; }
    }, true);
  }
  ['tnTop', 'gridProductos', 'recoRail'].forEach((id) => arrastrable($(id)));
  document.querySelectorAll('.tn-mosaic, .tn-features').forEach((el) => {});

  if (reduce) return;

  // 9) Tarjetas que se inclinan con el cursor
  document.addEventListener('pointermove', (e) => {
    const c = e.target.closest('.tilt, .st-card');
    if (!c || e.pointerType === 'touch') return;
    const r = c.getBoundingClientRect();
    const x = (e.clientX - r.left) / r.width - 0.5, y = (e.clientY - r.top) / r.height - 0.5;
    c.style.setProperty('--ry', (x * 12) + 'deg');
    c.style.setProperty('--rx', (-y * 12) + 'deg');
    c.style.setProperty('--lift', '-8px');
  });
  document.addEventListener('pointerout', (e) => {
    const c = e.target.closest && e.target.closest('.tilt, .st-card');
    if (!c) return;
    c.style.setProperty('--rx', '0deg'); c.style.setProperty('--ry', '0deg'); c.style.setProperty('--lift', '0px');
  });

  // 10) Botones que se acercan al cursor
  document.addEventListener('pointermove', (e) => {
    const b = e.target.closest('.magnet, .tn-arrow, .tn-prev, .tn-next, .tn-dot');
    if (!b) return;
    const r = b.getBoundingClientRect();
    const dx = (e.clientX - (r.left + r.width / 2)) * 0.25, dy = (e.clientY - (r.top + r.height / 2)) * 0.25;
    b.style.transform = 'translate(' + dx + 'px,' + dy + 'px)';
  });
  document.addEventListener('pointerout', (e) => {
    const b = e.target.closest && e.target.closest('.magnet, .tn-arrow, .tn-prev, .tn-next, .tn-dot');
    if (b) b.style.transform = '';
  });

  // 11) Onda al tocar
  document.addEventListener('pointerdown', (e) => {
    const h = e.target.closest('.tn-card, .tn-tile, .st-card, .tn-btn, .tn-arrow, .tn-prev, .tn-next, .pn-oc-add, .st-btn');
    if (!h) return;
    const r = h.getBoundingClientRect();
    const o = document.createElement('span');
    o.className = 'tn-ripple';
    o.style.left = (e.clientX - r.left) + 'px'; o.style.top = (e.clientY - r.top) + 'px';
    h.classList.add('tn-host');
    h.appendChild(o);
    setTimeout(() => o.remove(), 720);
  });

  // 12) Banner que sigue el cursor (parallax)
  const banner = document.querySelector('.pn-oc.tc');
  if (banner) banner.addEventListener('pointermove', (e) => {
    const r = banner.getBoundingClientRect();
    banner.style.setProperty('--mx', ((e.clientX - r.left) / r.width - 0.5).toFixed(3));
    banner.style.setProperty('--my', ((e.clientY - r.top) / r.height - 0.5).toFixed(3));
  });

  // 13) Aparición al bajar
  const cosas = document.querySelectorAll('.tn-reveal');
  if ('IntersectionObserver' in window) {
    const obs = new IntersectionObserver((entradas) => {
      entradas.forEach((en) => { if (en.isIntersecting) { en.target.classList.add('in'); obs.unobserve(en.target); } });
    }, { threshold: 0.12 });
    cosas.forEach((el) => obs.observe(el));
  } else {
    cosas.forEach((el) => el.classList.add('in'));
  }

  // 14) Salida suave del banner al hacer scroll
  let pendiente = false;
  function salida() {
    pendiente = false;
    if (!banner) return;
    const r = banner.getBoundingClientRect();
    const p = Math.min(1, Math.max(0, -r.top / Math.max(1, r.height * 0.8)));
    banner.style.opacity = String(1 - p * 0.55);
    banner.style.scale = String(1 - p * 0.05);
    banner.style.translate = '0 ' + (p * -40) + 'px';
  }
  window.addEventListener('scroll', () => { if (!pendiente) { pendiente = true; requestAnimationFrame(salida); } }, { passive: true });
  salida();
})();
