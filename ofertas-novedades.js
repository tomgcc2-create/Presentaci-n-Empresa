/* ═══════════════════════════════════════════════════════════════
   PriceNice — ofertas-novedades.js
   Pinta la página "Ofertas y novedades" con el catálogo de productos-data.js
   (+ los productos que publican los vendedores, guardados en el navegador).
   · Oferta   = producto con precio anterior (a) mayor que el precio actual (p)
   · Novedad  = producto recién llegado (los de vendedores y los marcados como nuevos)
═══════════════════════════════════════════════════════════════ */
(function () {
  const P = (window.PN_PRODUCTOS || []).slice();
  const NOMCAT = { moda: 'Moda', tecnologia: 'Tecnología', hogar: 'Hogar', mercado: 'Mercado', belleza: 'Belleza', higiene: 'Higiene', mascotas: 'Mascotas', otros: 'Otros' };
  const $ = id => document.getElementById(id);
  const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const money = n => '$' + Number(n).toLocaleString('es-CO');

  /* Productos que publican los vendedores */
  try {
    const cfg = JSON.parse(localStorage.getItem('pn_vendedor_config') || '{}');
    if (!cfg.pausarTienda) {
      JSON.parse(localStorage.getItem('pn_mis_productos') || '[]').filter(x => x.activo !== false).forEach(x => {
        const imgs = (x.imagenes && x.imagenes.length ? x.imagenes : [x.imagenPreview]).filter(Boolean);
        P.push({ id: x.id, nombre: x.nombre, cat: NOMCAT[x.categoria] ? x.categoria : 'otros', imagen: imgs[0] || '', propio: true,
          o: [{ t: x.tienda, p: x.precio, b: x.barrio || 'Bogotá', a: x.precioAntes || undefined }] });
      });
    }
  } catch (e) { /* sin productos de vendedores */ }

  const dondeTxt = o => o.t + ' · ' + (o.b === 'Online' ? 'online' : o.b);
  const compararHref = pr => 'tienda.html?q=' + encodeURIComponent(pr.nombre);
  const img = pr => pr.imagen ? `<img src="${esc(pr.imagen)}" alt="${esc(pr.nombre)}" loading="lazy" onerror="this.remove()">` : '';

  /* La mejor rebaja de cada producto */
  function mejorOferta(pr) {
    const c = pr.o.filter(o => o.a && o.a > o.p).map(o => ({ ...o, pct: Math.round((1 - o.p / o.a) * 100), ahorro: o.a - o.p }));
    return c.length ? c.sort((a, b) => b.pct - a.pct)[0] : null;
  }
  const ofertas = P.map(pr => ({ pr, of: mejorOferta(pr) })).filter(x => x.of);
  const esNovedad = pr => pr.propio || pr.id >= 9;           /* ≥ 9: los últimos productos cargados al catálogo */
  const novedades = P.filter(esNovedad).sort((a, b) => b.id - a.id);
  const tiendas = new Set(P.flatMap(p => p.o.map(o => o.t)));

  /* ── Cifras de la portada ── */
  const maxPct = ofertas.reduce((m, x) => Math.max(m, x.of.pct), 0);
  $('onStats').innerHTML =
    `<div class="on-stat"><b>${ofertas.length}</b><span>ofertas activas</span></div>` +
    `<div class="on-stat"><b>${maxPct ? 'hasta -' + maxPct + '%' : '—'}</b><span>de descuento</span></div>` +
    `<div class="on-stat"><b>${novedades.length}</b><span>novedades</span></div>` +
    `<div class="on-stat"><b>${tiendas.size}</b><span>tiendas</span></div>`;

  /* ── Las 3 mejores ofertas ── */
  const top = [...ofertas].sort((a, b) => b.of.pct - a.of.pct || b.of.ahorro - a.of.ahorro).slice(0, 3);
  $('onTop').innerHTML = top.map((x, i) => `
    <article class="on-big">
      <div class="on-big-img"><i class="bi bi-image"></i>${img(x.pr)}<span class="on-rank">${i + 1}</span><span class="on-pct">-${x.of.pct}%</span></div>
      <div class="on-big-body">
        <h3>${esc(x.pr.nombre)}</h3>
        <div class="on-where"><i class="bi bi-geo-alt-fill"></i> ${esc(dondeTxt(x.of))}</div>
        <div class="on-prices"><span class="on-now">${money(x.of.p)}</span><span class="on-was">${money(x.of.a)}</span></div>
        <div class="on-save">Ahorras ${money(x.of.ahorro)}</div>
        <a class="on-btn" href="${compararHref(x.pr)}">Comparar precios <i class="bi bi-arrow-right"></i></a>
      </div>
    </article>`).join('') || '<div class="on-empty">Pronto habrá ofertas destacadas.</div>';

  /* ── Todas las ofertas (con categoría y orden) ── */
  let catSel = '';
  function pintarOfertas() {
    const orden = $('onSort').value;
    let lista = ofertas.filter(x => !catSel || x.pr.cat === catSel);
    if (orden === 'pct')    lista.sort((a, b) => b.of.pct - a.of.pct);
    if (orden === 'ahorro') lista.sort((a, b) => b.of.ahorro - a.of.ahorro);
    if (orden === 'precio') lista.sort((a, b) => a.of.p - b.of.p);
    $('onGrid').innerHTML = lista.map(x => `
      <article class="on-card">
        <div class="on-card-img"><i class="bi bi-image"></i>${img(x.pr)}<span class="on-pct">-${x.of.pct}%</span></div>
        <div class="on-card-b">
          <h3>${esc(x.pr.nombre)}</h3>
          <div class="on-where">${esc(dondeTxt(x.of))}</div>
          <div class="on-prices"><span class="on-now">${money(x.of.p)}</span><span class="on-was">${money(x.of.a)}</span></div>
          <div class="on-save">Ahorras ${money(x.of.ahorro)}</div>
          <a class="on-btn dark" href="${compararHref(x.pr)}">Comparar precios</a>
        </div>
      </article>`).join('') || '<div class="on-empty" style="grid-column:1/-1">No hay ofertas en esta categoría por ahora.</div>';
  }
  const cats = [...new Set(ofertas.map(x => x.pr.cat))];
  $('onChips').innerHTML = [['', 'Todas']].concat(cats.map(c => [c, NOMCAT[c] || c])).map(([k, n]) =>
    `<button type="button" class="on-chip ${k === '' ? 'on' : ''}" data-cat="${k}">${n}</button>`).join('');
  $('onChips').addEventListener('click', e => {
    const b = e.target.closest('.on-chip'); if (!b) return;
    catSel = b.dataset.cat; document.querySelectorAll('.on-chip').forEach(x => x.classList.toggle('on', x === b)); pintarOfertas();
  });
  $('onSort').addEventListener('change', pintarOfertas);
  pintarOfertas();

  /* ── Novedades ── */
  $('onNew').innerHTML = novedades.map(pr => {
    const best = pr.o.reduce((a, x) => x.p < a.p ? x : a);
    const of = mejorOferta(pr);
    return `
    <article class="on-item">
      <div class="on-item-img"><i class="bi bi-image"></i>${img(pr)}</div>
      <div class="on-item-b">
        <span class="on-tag-new">${pr.propio ? 'Nuevo de un vendedor' : 'Recién llegado'}</span>
        <h3>${esc(pr.nombre)}</h3>
        <div class="on-where">${esc(NOMCAT[pr.cat] || pr.cat)} · en ${pr.o.length} tienda${pr.o.length > 1 ? 's' : ''}</div>
        <div class="on-prices"><span class="on-now">Desde ${money(best.p)}</span></div>
        <div class="on-where"><i class="bi bi-geo-alt-fill"></i> ${esc(dondeTxt(best))}</div>
        ${of ? `<div class="on-mini">Además con -${of.pct}% de descuento</div>` : ''}
        <a class="on-btn" href="${compararHref(pr)}">Comparar precios</a>
      </div>
    </article>`;
  }).join('') || '<div class="on-empty">Aún no hay novedades.</div>';
})();
