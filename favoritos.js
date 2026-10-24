/* ═══════════════════════════════════════════════════════════════
   PriceNice — favoritos.js
   Lee los ids de localStorage "pn_favoritos", los cruza con el catálogo
   (productos-data.js + productos de vendedores) y pinta la página completa.
═══════════════════════════════════════════════════════════════ */
(function () {
  'use strict';
  const KEY_F = 'pn_favoritos', KEY_C = 'pn_carrito';
  const NOMCAT = { moda: 'Moda', tecnologia: 'Tecnología', hogar: 'Hogar', mercado: 'Mercado', belleza: 'Belleza', higiene: 'Higiene', mascotas: 'Mascotas', otros: 'Otros' };
  const ICO = { moda: 'bi-handbag', tecnologia: 'bi-headphones', hogar: 'bi-house-heart', mercado: 'bi-basket2', belleza: 'bi-stars', higiene: 'bi-droplet-half', mascotas: 'bi-emoji-smile', otros: 'bi-box-seam' };
  const $ = id => document.getElementById(id);
  const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const money = n => '$' + Math.round(n).toLocaleString('es-CO');
  const leer = (k, d) => { try { return JSON.parse(localStorage.getItem(k)) ?? d; } catch (e) { return d; } };
  const sinMov = matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ── Catálogo ── */
  const P = (window.PN_PRODUCTOS || []).slice();
  try {
    const cfg = leer('pn_vendedor_config', {});
    if (!cfg.pausarTienda) leer('pn_mis_productos', []).filter(x => x.activo !== false).forEach(x => {
      const imgs = (x.imagenes && x.imagenes.length ? x.imagenes : [x.imagenPreview]).filter(Boolean);
      P.push({ id: x.id, nombre: x.nombre, cat: NOMCAT[x.categoria] ? x.categoria : 'otros', imagen: imgs[0] || '', descripcion: x.descripcion || '', propio: true,
        o: [{ t: x.tienda, p: x.precio, b: x.barrio || 'Bogotá', a: x.precioAntes || undefined }] });
    });
  } catch (e) {}
  const porId = id => P.find(p => String(p.id) === String(id));
  const min = p => p.o.reduce((a, x) => x.p < a.p ? x : a);
  const max = p => p.o.reduce((a, x) => x.p > a.p ? x : a);
  const ahorro = p => max(p).p - min(p).p;
  const img = p => p.imagen ? `<img src="${esc(p.imagen)}" alt="${esc(p.nombre)}" loading="lazy" onerror="this.remove()">` : '';

  /* ── Estado ── */
  let catSel = '', vista = 'grid', texto = '', orden = 'reciente';
  const getFavs = () => leer(KEY_F, []);
  const setFavs = f => localStorage.setItem(KEY_F, JSON.stringify(f));
  const favProds = () => getFavs().map(porId).filter(Boolean);

  /* ── Aviso ── */
  let tt;
  function toast(msg) { const t = $('fvToast'); t.innerHTML = '<i class="bi bi-check-circle-fill"></i>' + esc(msg); t.classList.add('show'); clearTimeout(tt); tt = setTimeout(() => t.classList.remove('show'), 2400); }

  /* ── Aparecer al hacer scroll ── */
  const io = 'IntersectionObserver' in window ? new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); } }), { threshold: .1, rootMargin: '0px 0px -30px 0px' }) : null;
  function revelar(els) { [...els].forEach((el, i) => { el.classList.remove('in'); el.classList.add('fv-rv'); el.style.setProperty('--i', i % 8); (io && !sinMov) ? io.observe(el) : el.classList.add('in'); }); }

  /* ── Contadores animados ── */
  function contar(el, fin, fmt) {
    if (sinMov) { el.textContent = fmt(fin); return; }
    const t0 = performance.now(), dur = 1100;
    (function paso(t) { const k = Math.min(1, (t - t0) / dur); el.textContent = fmt(Math.round(fin * (1 - Math.pow(1 - k, 3)))); if (k < 1) requestAnimationFrame(paso); })(t0);
  }

  /* ── Portada ── */
  function pintarStats() {
    const L = favProds();
    const total = L.reduce((a, p) => a + min(p).p, 0), ah = L.reduce((a, p) => a + ahorro(p), 0);
    const tiendas = new Set(L.map(p => min(p).t)).size;
    $('fvStats').innerHTML = [
      [L.length, 'productos guardados', n => n], [total, 'valor al mejor precio', money], [ah, 'puedes ahorrar eligiendo bien', money], [tiendas, 'tiendas con tu mejor precio', n => n]
    ].map(([v, t], i) => `<div class="fv-stat" style="--i:${i}"><b data-v="${v}">0</b><span>${t}</span></div>`).join('');
    const fm = [n => n, money, money, n => n];
    $('fvStats').querySelectorAll('b').forEach((b, i) => contar(b, +b.dataset.v, fm[i]));
  }

  /* ── Cuadritos por categoría ── */
  function pintarCats() {
    const L = favProds(), sec = $('fvCatSec');
    sec.hidden = !L.length; if (!L.length) return;
    const cuenta = {}; L.forEach(p => cuenta[p.cat] = (cuenta[p.cat] || 0) + 1);
    const orden = Object.keys(cuenta).sort((a, b) => cuenta[b] - cuenta[a]);
    const tarjetas = [{ k: '', n: L.length, pct: 100, nom: 'Todas' }].concat(orden.map(k => ({ k, n: cuenta[k], pct: Math.round(cuenta[k] / L.length * 100), nom: NOMCAT[k] || k })));
    $('fvCats').innerHTML = tarjetas.map((c, i) => `
      <button class="fv-cat ${c.k === '' ? 'todas' : ''} ${c.k === catSel ? 'on' : ''} ${i === 1 && orden.length > 1 ? 'top' : ''}" data-cat="${c.k}" style="--i:${i}">
        <span class="fill" data-w="${c.pct}"></span>
        <small><i class="bi ${c.k ? ICO[c.k] : 'bi-heart-fill'}"></i>${esc(c.nom)}</small>
        <span class="pct">${c.pct}<sup>%</sup></span>
        <span class="n">${c.n} producto${c.n > 1 ? 's' : ''}</span>
      </button>`).join('');
    revelar($('fvCats').children);
    requestAnimationFrame(() => setTimeout(() => $('fvCats').querySelectorAll('.fill').forEach(f => f.style.width = f.dataset.w + '%'), 80));
  }
  $('fvCats').addEventListener('click', e => {
    const b = e.target.closest('.fv-cat'); if (!b) return;
    catSel = b.dataset.cat; $('fvCats').querySelectorAll('.fv-cat').forEach(x => x.classList.toggle('on', x === b));
    pintarLista(); $('fvListaSec').scrollIntoView({ behavior: 'smooth', block: 'start' });
  });

  /* ── Tarjeta ── */
  function tarjeta(p) {
    const m = min(p), a = ahorro(p);
    const off = m.a && m.a > m.p ? Math.round((1 - m.p / m.a) * 100) : 0;
    return `<article class="fv-card" data-id="${esc(p.id)}">
      <div class="fv-img" data-exp="${esc(p.id)}"><i class="bi bi-image"></i>${img(p)}
        ${off ? `<span class="fv-tag">-${off}%</span>` : ''}<span class="fv-catname">${esc(NOMCAT[p.cat] || p.cat)}</span>
        <button class="fv-heart" data-quitar="${esc(p.id)}" aria-label="Quitar de favoritos"><i class="bi bi-heart-fill"></i></button></div>
      <div class="fv-body">
        <h3>${esc(p.nombre)}</h3>
        <div class="fv-where"><i class="bi bi-geo-alt-fill"></i> ${esc(m.t)} · ${esc(m.b === 'Online' ? 'online' : m.b)}</div>
        <div class="fv-price"><b>${money(m.p)}</b>${m.a ? `<s>${money(m.a)}</s>` : ''}</div>
        ${a > 0 ? `<div class="fv-save">Ahorras hasta ${money(a)} vs. otras tiendas</div>` : ''}
        <div class="fv-acts">
          <button class="fv-btn" data-carrito="${esc(p.id)}"><i class="bi bi-bag-plus"></i> Al carrito</button>
          <button class="fv-btn ghost" data-exp="${esc(p.id)}" aria-label="Expandir"><i class="bi bi-arrows-angle-expand"></i></button>
        </div>
      </div></article>`;
  }

  /* ── Lista ── */
  function pintarLista() {
    let L = favProds();
    const favIds = getFavs();
    if (catSel) L = L.filter(p => p.cat === catSel);
    if (texto) { const q = texto.toLowerCase(); L = L.filter(p => p.nombre.toLowerCase().includes(q) || (NOMCAT[p.cat] || '').toLowerCase().includes(q)); }
    if (orden === 'precio') L.sort((a, b) => min(a).p - min(b).p);
    if (orden === 'ahorro') L.sort((a, b) => ahorro(b) - ahorro(a));
    if (orden === 'nombre') L.sort((a, b) => a.nombre.localeCompare(b.nombre, 'es'));
    if (orden === 'reciente') { const ix = x => favIds.map(String).indexOf(String(x.id)); L.sort((a, b) => ix(b) - ix(a)); }
    const g = $('fvGrid'), vacio = $('fvVacio'), total = favProds().length;
    g.className = 'fv-grid' + (vista === 'list' ? ' list' : '');
    $('fvTools').hidden = !total; $('fvCta').hidden = !total;
    if (!total) {
      g.innerHTML = ''; vacio.hidden = false;
      const sug = P.filter(p => ahorro(p) > 0).sort((a, b) => ahorro(b) - ahorro(a)).slice(0, 4);
      vacio.innerHTML = `<div class="big"><i class="bi bi-heart"></i></div><h3>Aún no tienes favoritos</h3>
        <p>Toca el corazón en cualquier producto de la tienda y aparecerá aquí.</p>
        <a class="fv-btn dark" href="tienda.html"><i class="bi bi-shop"></i> Explorar la tienda</a>
        <div class="fv-sug"><h4>Te puede gustar</h4><div class="fv-grid">${sug.map(p => tarjeta(p).replace('bi-heart-fill', 'bi-heart').replace('data-quitar', 'data-agregar').replace('Quitar de favoritos', 'Guardar en favoritos')).join('')}</div></div>`;
      revelar(vacio.querySelectorAll('.fv-card'));
      return;
    }
    if (!L.length) { g.innerHTML = ''; vacio.hidden = false; vacio.innerHTML = '<div class="big"><i class="bi bi-search"></i></div><h3>Nada por aquí</h3><p>No hay favoritos con ese filtro.</p>'; return; }
    vacio.hidden = true;
    g.innerHTML = L.map(tarjeta).join('');
    revelar(g.children);
    $('fvCtaTxt').textContent = `${total} producto${total > 1 ? 's' : ''} · ${money(favProds().reduce((a, p) => a + min(p).p, 0))} al mejor precio`;
    revelar([$('fvCta')]);
  }

  function refrescar() { pintarStats(); pintarCats(); pintarLista(); badge(); }
  function badge() { try { const c = leer(KEY_C, []).reduce((a, i) => a + (i.qty || 0), 0), b = document.getElementById('badgeCarritoNav'); if (b) { b.textContent = c > 99 ? '99+' : c; b.style.display = c ? 'flex' : 'none'; } } catch (e) {} }

  /* ── Acciones ── */
  function alCarrito(p, tienda) {
    const o = (tienda && p.o.find(x => x.t === tienda)) || min(p), c = leer(KEY_C, []);
    const e = c.find(i => String(i.id) === String(p.id));
    if (e) e.qty++; else c.push({ id: p.id, nombre: p.nombre, precio: o.p, tienda: o.t, imagen: p.imagen, qty: 1 });
    localStorage.setItem(KEY_C, JSON.stringify(c)); badge();
  }
  function quitar(id, tarj) {
    const hecho = () => { setFavs(getFavs().filter(x => String(x) !== String(id))); refrescar(); toast('Quitado de favoritos'); };
    if (tarj && !sinMov) { tarj.classList.add('saliendo'); setTimeout(hecho, 480); } else hecho();
  }
  document.addEventListener('click', e => {
    const q = e.target.closest('[data-quitar]'); if (q) { e.stopPropagation(); quitar(q.dataset.quitar, q.closest('.fv-card')); return; }
    const ag = e.target.closest('[data-agregar]'); if (ag) { e.stopPropagation(); const f = getFavs(); if (!f.map(String).includes(String(ag.dataset.agregar))) f.push(+ag.dataset.agregar || ag.dataset.agregar); setFavs(f); toast('Guardado en favoritos'); refrescar(); return; }
    const c = e.target.closest('[data-carrito]'); if (c) { const p = porId(c.dataset.carrito); if (!p) return; alCarrito(p); toast('Agregado al carrito'); const t = c.closest('.fv-card'); if (t && !sinMov) { c.classList.add('ok'); c.innerHTML = '<i class="bi bi-check2"></i> Agregado'; setTimeout(() => { c.classList.remove('ok'); c.innerHTML = '<i class="bi bi-bag-plus"></i> Al carrito'; }, 1400); } return; }
    const x = e.target.closest('[data-exp]'); if (x) { abrirFull(porId(x.dataset.exp), e); return; }
  });
  $('fvBuscar').addEventListener('input', e => { texto = e.target.value.trim(); pintarLista(); });
  $('fvOrden').addEventListener('change', e => { orden = e.target.value; pintarLista(); });
  document.querySelector('.fv-vista').addEventListener('click', e => { const b = e.target.closest('button'); if (!b) return; vista = b.dataset.v; document.querySelectorAll('.fv-vista button').forEach(x => x.classList.toggle('on', x === b)); pintarLista(); });
  $('fvLimpiar').addEventListener('click', () => { if (confirm('¿Quitar todos tus favoritos?')) { setFavs([]); catSel = ''; refrescar(); toast('Favoritos vaciados'); } });
  $('fvTodo').addEventListener('click', () => { const L = favProds(); L.forEach(p => alCarrito(p)); toast(L.length + ' productos en tu carrito'); document.querySelectorAll('.fv-card').forEach((c, i) => { if (!sinMov) setTimeout(() => c.classList.add('al-carrito'), i * 90); }); setTimeout(() => { window.location.href = 'carrito.html'; }, sinMov ? 300 : 1400); });

  /* ── Página completa (expandir) ── */
  function abrirFull(p, ev) {
    if (!p) return;
    const m = min(p), mx = max(p).p, F = $('fvFull');
    const stars = p.estrellas ? '★'.repeat(Math.round(p.estrellas)) + '☆'.repeat(5 - Math.round(p.estrellas)) : '';
    const otros = favProds().filter(x => x.id !== p.id && x.cat === p.cat).slice(0, 4);
    $('fvFullIn').innerHTML = `
      <div class="fv-full-top"><a class="fv-btn ghost" href="#" data-cerrar><i class="bi bi-arrow-left"></i> Volver a favoritos</a><button class="fv-x" data-cerrar aria-label="Cerrar"><i class="bi bi-x-lg"></i></button></div>
      <div class="fv-full-grid">
        <div class="fv-full-img"><i class="bi bi-image"></i>${img(p)}</div>
        <div class="fv-full-info">
          <span class="cat" style="--i:0">${esc(NOMCAT[p.cat] || p.cat)}</span>
          <h2 style="--i:1">${esc(p.nombre)}</h2>
          ${stars ? `<div class="fv-stars" style="--i:2">${stars}<span>${p.estrellas} · ${p.resenas || 0} reseñas</span></div>` : ''}
          <p class="desc" style="--i:3">${esc(p.descripcion || 'Producto guardado en tus favoritos. Compara el precio entre las tiendas de Bogotá.')}</p>
          <div style="--i:4"><b style="color:var(--brand)">Dónde comprarlo</b>
            <div class="fv-tiendas">${[...p.o].sort((a, b) => a.p - b.p).map((o, i) => `
              <div class="fv-tienda ${i === 0 ? 'mejor' : ''}" style="--i:${i};--w:${Math.round(o.p / mx * 100)}%"><span class="barra"></span>
                <div><b>${esc(o.t)}</b><small>${esc(o.b === 'Online' ? 'Online' : o.b)}</small></div>
                <div style="display:flex;align-items:center;gap:12px"><span class="p">${money(o.p)}</span><button class="fv-btn ${i === 0 ? '' : 'ghost'}" data-full-carrito="${esc(o.t)}"><i class="bi bi-bag-plus"></i></button></div></div>`).join('')}</div></div>
          <div class="fv-full-acts" style="--i:5">
            <button class="fv-btn" data-full-carrito="${esc(m.t)}"><i class="bi bi-bag-plus"></i> Agregar al mejor precio · ${money(m.p)}</button>
            <a class="fv-btn dark" href="tienda.html?q=${encodeURIComponent(p.nombre)}"><i class="bi bi-arrow-left-right"></i> Comparar en la tienda</a>
            <button class="fv-btn ghost" data-full-quitar><i class="bi bi-heart-fill" style="color:#D6455A"></i> Quitar</button>
          </div>
        </div></div>
      ${otros.length ? `<div class="fv-more"><h3>Más de ${esc(NOMCAT[p.cat] || p.cat)} en tus favoritos</h3><div class="fv-grid">${otros.map(tarjeta).join('')}</div></div>` : ''}`;
    const r = ev && ev.clientX != null ? ev : { clientX: innerWidth / 2, clientY: innerHeight / 2 };
    F.style.setProperty('--ox', r.clientX + 'px'); F.style.setProperty('--oy', r.clientY + 'px');
    F.hidden = false; F.scrollTop = 0; document.body.style.overflow = 'hidden';
    requestAnimationFrame(() => F.classList.add('open'));
    F._p = p;
  }
  function cerrarFull() { const F = $('fvFull'); F.classList.remove('open'); document.body.style.overflow = ''; setTimeout(() => { if (!F.classList.contains('open')) F.hidden = true; }, 750); }
  $('fvFull').addEventListener('click', e => {
    if (e.target.closest('[data-cerrar]')) { e.preventDefault(); cerrarFull(); return; }
    const c = e.target.closest('[data-full-carrito]'); if (c) { e.stopPropagation(); alCarrito($('fvFull')._p, c.dataset.fullCarrito); toast('Agregado al carrito · ' + c.dataset.fullCarrito); return; }
    if (e.target.closest('[data-full-quitar]')) { e.stopPropagation(); const id = $('fvFull')._p.id; cerrarFull(); setTimeout(() => quitar(id), 500); }
  });
  /* Las tarjetas dentro de la vista completa abren otra vista */
  document.addEventListener('keydown', e => { if (e.key === 'Escape' && !$('fvFull').hidden) cerrarFull(); });
  window.addEventListener('storage', refrescar);
  window.addEventListener('pn:favs', refrescar);
  window.addEventListener('pn:carrito', badge);

  refrescar();
})();
