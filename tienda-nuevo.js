/* PriceNice — tienda-nuevo.js
   Interacciones de la página de comparación en claro:
   carrusel superior, números 01/02/03 y accesos a las categorías. */
(function () {
  const reduce = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;

  // 1) Flechas del carrusel superior
  const track = document.getElementById('tnTrack');
  document.querySelectorAll('.tn-top .tn-arrow').forEach((b) => {
    b.addEventListener('click', () => {
      if (track) track.scrollBy({ left: Number(b.dataset.dir) * 220, behavior: reduce ? 'auto' : 'smooth' });
    });
  });

  // 2) Números 01 02 03: cambian la etiqueta destacada
  const chip = document.getElementById('tnChip');
  const textos = ['Ahorras hasta $3.000', 'Comparas 11 tiendas', 'Pagas lo justo'];
  document.querySelectorAll('.tn-dot').forEach((d) => {
    d.addEventListener('click', () => {
      document.querySelectorAll('.tn-dot').forEach((x) => x.classList.toggle('on', x === d));
      if (!chip) return;
      chip.classList.add('cambia');
      setTimeout(() => { chip.textContent = textos[Number(d.dataset.i)] || textos[0]; chip.classList.remove('cambia'); }, 250);
    });
  });

  // 3) Categorías (carrusel y mosaico): usan el filtro de categorías que ya existe
  document.querySelectorAll('[data-setcat]').forEach((el) => {
    el.addEventListener('click', () => {
      const cat = el.dataset.setcat;
      if (typeof window.setCat === 'function') window.setCat(cat);
      const res = document.getElementById('resultsInfo') || document.getElementById('gridProductos');
      if (res) res.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'start' });
    });
  });
})();
