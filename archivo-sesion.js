/* ═══════════════════════════════════════════════════════
   PriceNice — archivo-sesion.js
   Gestiona el estado de sesión en la navbar:
   - Sin sesión  → botón "Iniciar sesión"
   - Con sesión  → avatar con menú desplegable
                   (nombre, rol, accesos y cerrar sesión)
   Expone window.setPnUser() para que las páginas que
   necesitan verificar sesión puedan reaccionar.
═══════════════════════════════════════════════════════ */

import { observarSesion, cerrarSesion, obtenerRol } from './auth.js';
import { db } from './firebase-config.js';
import { doc, onSnapshot, setDoc } from 'https://www.gstatic.com/firebasejs/11.6.0/firebase-firestore.js';

/* ─── Referencias DOM ─── */
const area = document.getElementById('pnSesionArea');

/* ─── Contenido solo para vendedores ───
   Los enlaces marcados con data-solo-vendedor (menú, pie de página…) nacen ocultos
   y solo se muestran si la persona inició sesión con rol vendedor (o admin). */
function mostrarSoloVendedor(visible) {
  document.querySelectorAll('[data-solo-vendedor]').forEach(el => { el.hidden = !visible; });
}

/* ─── Helpers HTML ─── */
function buildBotonLogin() {
  return `<a href="login.html" class="pn-btn-sesion">
    <i class="bi bi-person"></i><span>Iniciar sesión</span>
  </a>`;
}

function buildAvatar(usuario, rol) {
  const nombre  = usuario.displayName || usuario.email || 'Usuario';
  const inicial = nombre.charAt(0).toUpperCase();
  const foto    = usuario.photoURL || '';

  const adminLink = (rol === 'admin')
    ? `<a href="admin.html"><i class="bi bi-shield-check me-2"></i>Administrar</a>`
    : '';
  const vendedorLink = (rol === 'vendedor' || rol === 'admin')
    ? `<a href="vendedor.html"><i class="bi bi-shop me-2"></i>Panel vendedor</a>`
    : '';
  /* Como al iniciar sesión todos van al inicio, cada rol entra a su panel desde aquí */
  const otrosPaneles = {
    verificador:  ['verificador.html',  'bi-patch-check', 'Panel verificador'],
    patrocinador: ['patrocinador.html', 'bi-megaphone',   'Panel patrocinador'],
    'dueño':      ['dueño.html',        'bi-star',        'Panel del dueño'],
    dueno:        ['dueño.html',        'bi-star',        'Panel del dueño']
  };
  const op = otrosPaneles[rol];
  const otroLink = op ? `<a href="${op[0]}" role="menuitem"><i class="bi ${op[1]} me-2"></i>${op[2]}</a>` : '';

  return `
  <div class="pn-avatar-wrap" aria-haspopup="true">
    <div class="pn-avatar" tabindex="0" role="button" aria-label="Menú de usuario">
      ${foto
        ? `<img src="${foto}" alt="${nombre}" referrerpolicy="no-referrer">`
        : inicial}
    </div>
    <div class="pn-user-menu" role="menu">
      <div class="pn-user-info">
        <strong>${nombre}</strong>
        <span>${usuario.email || ''}</span>
        ${rol && rol !== 'usuario'
          ? `<span style="display:inline-block;margin-top:4px;background:rgba(74,144,226,.15);color:var(--accent-light);font-size:.68rem;font-weight:700;padding:2px 8px;border-radius:50px;letter-spacing:.05em;text-transform:uppercase">${rol}</span>`
          : ''}
      </div>
      <a href="favoritos.html" role="menuitem"><i class="bi bi-heart me-2"></i>Favoritos</a>
      ${vendedorLink}
      ${otroLink}
      ${adminLink}
      <div class="pn-user-menu-divider"></div>
      <button id="btnCerrarSesionNav" role="menuitem">
        <i class="bi bi-box-arrow-right me-2"></i>Cerrar sesión
      </button>
    </div>
  </div>`;
}

/* ─── Actualizar badges carrito y favoritos ─── */
function actualizarBadgesGlobal() {
  const carrito = JSON.parse(localStorage.getItem('pn_carrito')  || '[]');
  const favs    = JSON.parse(localStorage.getItem('pn_favoritos') || '[]');

  const totalCarrito = carrito.reduce((a, i) => a + i.qty, 0);
  const totalFavs    = favs.length;

  const bCart = document.getElementById('badgeCarritoNav');
  if (bCart) {
    if (totalCarrito > 0) {
      bCart.textContent    = totalCarrito > 99 ? '99+' : totalCarrito;
      bCart.style.display  = 'flex';
    } else {
      bCart.style.display  = 'none';
    }
  }

  const bFav = document.getElementById('badgeFav');
  if (bFav) {
    if (totalFavs > 0) {
      bFav.textContent   = totalFavs;
      bFav.style.display = 'flex';
    } else {
      bFav.style.display = 'none';
    }
  }
}

/* ─── Cerrar sesión (menú del avatar y menú móvil) ───
   Siempre termina llevando a login.html, aunque Firebase tarde o falle. */
async function cerrarSesionTotal() {
  detenerSyncFavs();
  try { localStorage.removeItem('pn_favoritos'); } catch (e) {}   /* no mezclar favoritos con la próxima cuenta */
  try { await Promise.race([cerrarSesion(), new Promise(r => setTimeout(r, 4000))]); } catch (e) { console.warn(e); }
  window.location.href = 'login.html';
}

/* ─── Botón de sesión del menú móvil (en TODAS las páginas) ─── */
function contenedorMovil() {
  let m = document.getElementById('pnMobileSesion');
  if (m) return m;
  const panel = document.querySelector('.pn-mobile-menu-panel');
  if (!panel) return null;
  /* Quita el botón "Iniciar sesión" fijo que traían algunas páginas */
  panel.querySelectorAll('a[href="login.html"]').forEach(a => {
    const w = a.parentElement;
    (w && w !== panel && w.children.length === 1) ? w.remove() : a.remove();
  });
  m = document.createElement('div');
  m.id = 'pnMobileSesion';
  m.style.cssText = 'margin-top:24px;padding-top:20px;border-top:1px solid var(--border);display:flex;flex-direction:column;gap:10px';
  panel.appendChild(m);
  return m;
}
const ESTILO_BTN = 'width:100%;justify-content:center;display:flex;align-items:center;gap:8px;';
function actualizarMenuMovil(usuario, rol = 'usuario') {
  const m = contenedorMovil();
  if (!m) return;
  if (!usuario) {
    m.innerHTML = `<a href="login.html" class="pn-btn-primary" style="${ESTILO_BTN}"><i class="bi bi-person"></i> Iniciar sesión</a>`;
    return;
  }
  const nombre = usuario.displayName || usuario.email || 'Usuario';
  const paneles = {
    vendedor: ['vendedor.html', 'bi-shop', 'Panel vendedor'], admin: ['admin.html', 'bi-shield-check', 'Administrar'],
    verificador: ['verificador.html', 'bi-patch-check', 'Panel verificador'], patrocinador: ['patrocinador.html', 'bi-megaphone', 'Panel patrocinador'],
    'dueño': ['dueño.html', 'bi-star', 'Panel del dueño'], dueno: ['dueño.html', 'bi-star', 'Panel del dueño']
  };
  const p = paneles[rol];
  m.innerHTML = `
    <div style="display:flex;align-items:center;gap:12px;padding:4px 2px">
      <div style="width:42px;height:42px;border-radius:50%;background:var(--brand);color:var(--bg);display:grid;place-items:center;font-weight:800;border:2px solid var(--oro);overflow:hidden;flex:none">
        ${usuario.photoURL ? `<img src="${usuario.photoURL}" alt="" referrerpolicy="no-referrer" style="width:100%;height:100%;object-fit:cover">` : nombre.charAt(0).toUpperCase()}</div>
      <div style="min-width:0"><b style="display:block;color:var(--brand);overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${nombre}</b>
        <small style="color:var(--text-2);display:block;overflow:hidden;text-overflow:ellipsis">${usuario.email || ''}</small></div>
    </div>
    <a href="favoritos.html" class="pn-cat-panel-link"><i class="bi bi-heart"></i> Mis favoritos</a>
    ${p ? `<a href="${p[0]}" class="pn-cat-panel-link"><i class="bi ${p[1]}"></i> ${p[2]}</a>` : ''}
    <button id="btnCerrarSesionMovil" class="pn-btn-primary" style="${ESTILO_BTN}background:transparent;color:var(--brand);border:1.5px solid var(--border-2)"><i class="bi bi-box-arrow-right"></i> Cerrar sesión</button>`;
  document.getElementById('btnCerrarSesionMovil')?.addEventListener('click', cerrarSesionTotal);
}

/* ═══════════ Favoritos sincronizados entre dispositivos ═══════════
   Se guardan en Firestore: usuarios/{uid}.favoritos (lista de ids).
   · Al iniciar sesión se unen los favoritos de este dispositivo con los de la cuenta.
   · Cualquier cambio (en cualquier página) se sube a la nube a los 0,6 s.
   · Si cambias favoritos en otro dispositivo, aquí se actualizan solos. */
const KEY_FAVS = 'pn_favoritos';
const _setItem = Storage.prototype.setItem;
const favsLocal = () => { try { const f = JSON.parse(localStorage.getItem(KEY_FAVS) || '[]'); return Array.isArray(f) ? f : []; } catch (e) { return []; } };
const mismas = (a, b) => a.length === b.length && a.every((x, i) => String(x) === String(b[i]));
let favUid = null, favUnsub = null, favTimer = null, favPrimera = true;

Storage.prototype.setItem = function (k) {
  _setItem.apply(this, arguments);
  if (k === KEY_FAVS) { window.dispatchEvent(new CustomEvent('pn:favs')); subirFavs(); }
};
function subirFavs() {
  if (!favUid) return;
  clearTimeout(favTimer);
  favTimer = setTimeout(() => {
    setDoc(doc(db, 'usuarios', favUid), { favoritos: favsLocal() }, { merge: true })
      .catch(err => console.warn('No se pudieron guardar los favoritos en la nube:', err));
  }, 600);
}
function iniciarSyncFavs(uid) {
  detenerSyncFavs();
  favUid = uid; favPrimera = true;
  favUnsub = onSnapshot(doc(db, 'usuarios', uid), snap => {
    const remotos = (snap.exists() && Array.isArray(snap.data().favoritos)) ? snap.data().favoritos : [];
    const locales = favsLocal();
    let destino = remotos;
    if (favPrimera) {                        /* primera vez: unir lo de este dispositivo con lo de la cuenta */
      favPrimera = false;
      destino = [...remotos];
      locales.forEach(id => { if (!destino.some(x => String(x) === String(id))) destino.push(id); });
    }
    if (!mismas(destino, locales)) {         /* la nube manda: actualizar este dispositivo */
      _setItem.call(localStorage, KEY_FAVS, JSON.stringify(destino));
      window.dispatchEvent(new CustomEvent('pn:favs'));
      actualizarBadgesGlobal();
    }
    if (!mismas(destino, remotos)) subirFavs();   /* había favoritos locales que la nube no tenía */
  }, err => console.warn('Sincronización de favoritos:', err));
}
function detenerSyncFavs() { if (favUnsub) favUnsub(); favUnsub = null; favUid = null; clearTimeout(favTimer); }
window.addEventListener('pn:favs', () => actualizarBadgesGlobal());

/* ─── Pintar avatar y su botón de cerrar sesión ─── */
function pintarAvatar(usuario, rol) {
  area.innerHTML = buildAvatar(usuario, rol);
  mostrarSoloVendedor(rol === 'vendedor' || rol === 'admin');
  const wrap = area.querySelector('.pn-avatar-wrap');
  wrap?.querySelector('.pn-avatar')?.addEventListener('click', e => { e.stopPropagation(); wrap.classList.toggle('open'); });
  wrap?.querySelector('.pn-avatar')?.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); wrap.classList.toggle('open'); } });
  document.getElementById('btnCerrarSesionNav')?.addEventListener('click', cerrarSesionTotal);
}

/* Cierra el menú del avatar solo al hacer clic fuera de él */
document.addEventListener('click', e => {
  const w = document.querySelector('.pn-avatar-wrap.open');
  if (w && !w.contains(e.target)) w.classList.remove('open');
});

/* ─── Listener principal ─── */
observarSesion(async (usuario) => {
  if (!area) { if (usuario) iniciarSyncFavs(usuario.uid); else detenerSyncFavs(); return; }

  if (!usuario) {
    /* Sin sesión */
    detenerSyncFavs();
    area.innerHTML = buildBotonLogin();
    mostrarSoloVendedor(false);
    actualizarMenuMovil(null);
    actualizarBadgesGlobal();
    if (typeof window.setPnUser === 'function') window.setPnUser(null);
    return;
  }

  /* Con sesión: se muestra el avatar YA, sin esperar a Firestore
     (antes se quedaba "Iniciar sesión" si la lectura del rol tardaba). */
  pintarAvatar(usuario, 'usuario');
  actualizarMenuMovil(usuario);
  iniciarSyncFavs(usuario.uid);
  actualizarBadgesGlobal();
  if (typeof window.setPnUser === 'function') window.setPnUser(usuario);

  /* Luego se completa el rol (vendedor/admin) cuando llegue */
  try {
    const rol = await Promise.race([
      obtenerRol(usuario.uid),
      new Promise((_, rej) => setTimeout(() => rej(new Error('timeout')), 8000))
    ]);
    if (rol && rol !== 'usuario') { pintarAvatar(usuario, rol); actualizarMenuMovil(usuario, rol); }
  } catch (err) {
    console.warn('No se pudo leer el rol:', err);
  }
});

/* ─── Refrescar badges cuando cambia localStorage ─── */
window.addEventListener('storage', actualizarBadgesGlobal);
