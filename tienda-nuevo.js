/* PriceNice — tienda-nuevo.js
   Completa el mosaico y las historias con productos reales del catálogo,
   y conecta las flechas de los carruseles. */
(function () {
  const reduce = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
  const productos = Array.isArray(window.PN_PRODUCTOS) ? window.PN_PRODUCTOS : [];

  const NOMBRES = {
    belleza: 'Belleza', hogar: 'Hogar', moda: 'Moda', tecnologia: 'Tecnología',
    mascotas: 'Mascotas', mercado: 'Mercado', higiene: 'Higiene', otros: 'Otros'
  };
  const ORDEN = ['belleza', 'hogar', 'moda', 'tecnologia', 'mercado', 'higiene'];

  // Imagen de referencia por categoría: el primer producto de esa categoría
  function imagenDe(cat) {
    const p = productos.find((x) => x.cat === cat && x.imagen);
    return p ? p.imagen : '';
  }

  // 1) Mosaico de categorías con productos reales
  const mosaico = document.getElementById('tnMosaic');
  if (mosaico) {
    const cats = ORDEN.filter((c) => productos.some((x) => x.cat === c)).slice(0, 5);
    mosaico.innerHTML = cats.map((c) => {
      const img = imagenDe(c);
      return '<button class="tn-tile" type="button" data-setcat="' + c + '" style="background-image:url(' + img + ')">' +
             '<span>' + NOMBRES[c] + '</span><i class="bi bi-arrow-right"></i></button>';
    }).join('') +
    '<button class="tn-tile todas" type="button" data-setcat="">' +
    '<span>Ver todas</span><i class="bi bi-arrow-right"></i></button>';
  }

  // 2) Historia: imágenes de dos productos
  const a = document.getElementById('tnStoryA');
  const b = document.getElementById('tnStoryB');
  if (a && productos[0]) a.style.backgroundImage = 'url(' + productos[0].imagen + ')';
  if (b && productos[1]) b.style.backgroundImage = 'url(' + productos[1].imagen + ')';

  // 3) Flechas de los carruseles
  document.querySelectorAll('[data-t][data-dir]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const el = document.getElementById(btn.dataset.t);
      if (el) el.scrollBy({ left: Number(btn.dataset.dir) * 280, behavior: reduce ? 'auto' : 'smooth' });
    });
  });

  // 4) Mosaico: filtra por categoría y baja a los productos
  document.addEventListener('click', (e) => {
    const t = e.target.closest('[data-setcat]');
    if (!t || !t.closest('#tnMosaic')) return;
    const cat = t.dataset.setcat;
    if (typeof window.setCat === 'function') window.setCat(cat);
    const main = document.querySelector('main');
    if (main) main.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'start' });
  });
})();
