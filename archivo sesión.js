/* ═══════════════════════════════════════════════════════
   PriceNice — archivo sesión.js
   Gestiona el estado de sesión en la navbar:
   - Sin sesión  → botón "Iniciar sesión"
   - Con sesión  → avatar con menú desplegable
                   (nombre, rol, accesos y cerrar sesión)
   Expone window.setPnUser() para que las páginas que
   necesitan verificar sesión puedan reaccionar.
═══════════════════════════════════════════════════════ */

import { observarSesion, cerrarSesion, obtenerRol } from './auth.js';

/* ─── Referencias DOM ─── */
const area = document.getElementById('pnSesionArea');

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
      <a href="usuario.html" role="menuitem"><i class="bi bi-person me-2"></i>Mi perfil</a>
      <a href="favoritos.html" role="menuitem"><i class="bi bi-heart me-2"></i>Favoritos</a>
      ${vendedorLink}
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

/* ─── Listener principal ─── */
observarSesion(async (usuario) => {
  if (!area) return;

  if (!usuario) {
    /* Sin sesión */
    area.innerHTML = buildBotonLogin();
    actualizarBadgesGlobal();
    /* Notificar a la página */
    if (typeof window.setPnUser === 'function') window.setPnUser(null);
    return;
  }

  /* Con sesión — obtener rol */
  let rol = 'usuario';
  try {
    rol = await obtenerRol(usuario.uid);
  } catch (err) {
    console.warn('No se pudo leer el rol:', err);
  }

  area.innerHTML = buildAvatar(usuario, rol);

  /* Botón cerrar sesión */
  const btnCerrar = document.getElementById('btnCerrarSesionNav');
  if (btnCerrar) {
    btnCerrar.addEventListener('click', async () => {
      await cerrarSesion();
      window.location.href = 'login.html';
    });
  }

  actualizarBadgesGlobal();

  /* Notificar a la página */
  if (typeof window.setPnUser === 'function') window.setPnUser(usuario);
});

/* ─── Refrescar badges cuando cambia localStorage ─── */
window.addEventListener('storage', actualizarBadgesGlobal);
