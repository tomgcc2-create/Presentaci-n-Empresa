/**
 * settings.js — Panel de Configuración de Usuario (PRICE NICE)
 * Se importa como módulo en cada página de usuario.
 * Requiere que auth y db estén disponibles globalmente o pasados como argumento.
 */
import { auth, db } from "./firebase-config.js";
import {
  onAuthStateChanged,
  updatePassword,
  reauthenticateWithCredential,
  EmailAuthProvider
} from "https://www.gstatic.com/firebasejs/11.6.0/firebase-auth.js";
import {
  doc,
  getDoc,
  updateDoc,
  collection,
  query,
  where,
  getDocs,
  orderBy
} from "https://www.gstatic.com/firebasejs/11.6.0/firebase-firestore.js";

/* ════════════════════════════════════════════════════════════
   INYECTAR HTML DEL PANEL
════════════════════════════════════════════════════════════ */
function inyectarPanel() {
  const html = `
  <!-- ── Botón flecha volver ── -->
  <button id="btnVolver" title="Volver a la página anterior" aria-label="Volver"
    onclick="history.back()"
    style="left:70px;">&#8592;</button>

  <!-- ── Botón tuerquita ── -->
  <button id="btnSettings" title="Configuración" aria-label="Abrir configuración"
    style="
      position:fixed; top:16px; left:16px; z-index:1100;
      width:46px; height:46px; border-radius:50%;
      background:rgba(255,255,255,0.92); border:2px solid rgba(0,0,0,0.12);
      box-shadow:0 4px 18px rgba(0,0,0,0.18);
      display:flex; align-items:center; justify-content:center;
      cursor:pointer; transition:transform .35s, box-shadow .25s;
      font-size:1.35rem; padding:0;
    ">⚙️</button>

  <!-- ── Overlay oscuro ── -->
  <div id="settingsOverlay"
    style="display:none; position:fixed; inset:0; background:rgba(0,0,0,0.45);
           z-index:1200; backdrop-filter:blur(3px); transition:opacity .25s;">
  </div>

  <!-- ── Panel lateral ── -->
  <div id="settingsPanel"
    style="
      position:fixed; top:0; left:-420px; width:380px; max-width:96vw;
      height:100vh; z-index:1300; background:#fff;
      box-shadow:6px 0 32px rgba(0,0,0,0.22);
      display:flex; flex-direction:column;
      transition:left .32s cubic-bezier(.4,0,.2,1);
      font-family: system-ui, sans-serif;
    ">

    <!-- Cabecera -->
    <div id="settingsHeader"
      style="padding:22px 24px 16px; background:linear-gradient(135deg,#555,#222);
             color:white; flex-shrink:0;">
      <div style="display:flex; align-items:center; justify-content:space-between;">
        <div style="display:flex; align-items:center; gap:10px;">
          <span style="font-size:1.6rem;">⚙️</span>
          <div>
            <div style="font-weight:700; font-size:1.1rem; line-height:1.1;">Configuración</div>
            <div id="settingsSubtitle" style="font-size:.78rem; opacity:.75;">Mi cuenta</div>
          </div>
        </div>
        <button id="btnCloseSettings" aria-label="Cerrar"
          style="background:rgba(255,255,255,.15); border:none; color:white;
                 border-radius:50%; width:34px; height:34px; font-size:1.1rem;
                 cursor:pointer; display:flex; align-items:center; justify-content:center;">✕</button>
      </div>
    </div>

    <!-- Tabs -->
    <div style="display:flex; border-bottom:2px solid #f0f0f0; flex-shrink:0;">
      <button class="stab active" data-tab="perfil"
        style="flex:1; padding:12px 6px; border:none; background:none; font-weight:600;
               font-size:.85rem; cursor:pointer; border-bottom:2px solid transparent;
               transition:all .2s; color:#555;">👤 Perfil</button>
      <button class="stab" data-tab="seguridad"
        style="flex:1; padding:12px 6px; border:none; background:none; font-weight:600;
               font-size:.85rem; cursor:pointer; border-bottom:2px solid transparent;
               transition:all .2s; color:#555;">🔒 Seguridad</button>
      <button class="stab" data-tab="actividad"
        style="flex:1; padding:12px 6px; border:none; background:none; font-weight:600;
               font-size:.85rem; cursor:pointer; border-bottom:2px solid transparent;
               transition:all .2s; color:#555;">📋 Actividad</button>
    </div>

    <!-- Contenido scrollable -->
    <div style="flex:1; overflow-y:auto; padding:20px 24px 30px;">

      <!-- TAB: PERFIL -->
      <div id="stab-perfil" class="stab-content">
        <p style="font-size:.78rem; color:#888; margin-bottom:16px;">
          Edita los datos de tu cuenta. El correo electrónico no se puede modificar desde aquí.
        </p>

        <div id="settings-msg-perfil" style="display:none; padding:10px 14px; border-radius:10px;
          font-size:.85rem; margin-bottom:14px;"></div>

        <form id="formSettingsPerfil" novalidate>
          <div style="margin-bottom:14px;">
            <label style="font-size:.8rem; font-weight:600; color:#444; display:block; margin-bottom:4px;">Nombre *</label>
            <input id="sNombre" type="text" required
              style="width:100%; padding:9px 12px; border:2px solid #e0e0e0; border-radius:10px;
                     font-size:.9rem; transition:border-color .2s; box-sizing:border-box;"
              placeholder="Tu nombre">
          </div>

          <div style="margin-bottom:14px;">
            <label style="font-size:.8rem; font-weight:600; color:#444; display:block; margin-bottom:4px;">Apellido</label>
            <input id="sApellido" type="text"
              style="width:100%; padding:9px 12px; border:2px solid #e0e0e0; border-radius:10px;
                     font-size:.9rem; transition:border-color .2s; box-sizing:border-box;"
              placeholder="Tu apellido">
          </div>

          <div style="margin-bottom:14px;">
            <label style="font-size:.8rem; font-weight:600; color:#444; display:block; margin-bottom:4px;">Correo electrónico</label>
            <input id="sEmail" type="email" disabled
              style="width:100%; padding:9px 12px; border:2px solid #e0e0e0; border-radius:10px;
                     font-size:.9rem; background:#f5f5f5; color:#888; box-sizing:border-box;"
              placeholder="correo@ejemplo.com">
            <span style="font-size:.73rem; color:#aaa;">El correo no se puede cambiar desde aquí.</span>
          </div>

          <div style="margin-bottom:14px;">
            <label style="font-size:.8rem; font-weight:600; color:#444; display:block; margin-bottom:4px;">Teléfono</label>
            <input id="sTelefono" type="tel"
              style="width:100%; padding:9px 12px; border:2px solid #e0e0e0; border-radius:10px;
                     font-size:.9rem; transition:border-color .2s; box-sizing:border-box;"
              placeholder="Ej. 3001234567">
          </div>

          <div style="margin-bottom:20px;">
            <label style="font-size:.8rem; font-weight:600; color:#444; display:block; margin-bottom:4px;">Ciudad</label>
            <input id="sCiudad" type="text"
              style="width:100%; padding:9px 12px; border:2px solid #e0e0e0; border-radius:10px;
                     font-size:.9rem; transition:border-color .2s; box-sizing:border-box;"
              placeholder="Ej. Bogotá">
          </div>

          <button type="submit"
            style="width:100%; padding:11px; border:none; border-radius:12px;
                   background:linear-gradient(135deg,#555,#222); color:white;
                   font-weight:700; font-size:.9rem; cursor:pointer; transition:opacity .2s;"
            id="btnGuardarPerfil">💾 Guardar cambios</button>
        </form>
      </div>

      <!-- TAB: SEGURIDAD -->
      <div id="stab-seguridad" class="stab-content" style="display:none;">
        <p style="font-size:.78rem; color:#888; margin-bottom:16px;">
          Para cambiar tu contraseña, primero confirma la contraseña actual.
        </p>

        <div id="settings-msg-seg" style="display:none; padding:10px 14px; border-radius:10px;
          font-size:.85rem; margin-bottom:14px;"></div>

        <form id="formSettingsSeg" novalidate>
          <div style="margin-bottom:14px;">
            <label style="font-size:.8rem; font-weight:600; color:#444; display:block; margin-bottom:4px;">Contraseña actual *</label>
            <input id="sPassActual" type="password" required
              style="width:100%; padding:9px 12px; border:2px solid #e0e0e0; border-radius:10px;
                     font-size:.9rem; transition:border-color .2s; box-sizing:border-box;"
              placeholder="Tu contraseña actual">
          </div>

          <div style="margin-bottom:14px;">
            <label style="font-size:.8rem; font-weight:600; color:#444; display:block; margin-bottom:4px;">Nueva contraseña *</label>
            <input id="sPassNueva" type="password" required minlength="6"
              style="width:100%; padding:9px 12px; border:2px solid #e0e0e0; border-radius:10px;
                     font-size:.9rem; transition:border-color .2s; box-sizing:border-box;"
              placeholder="Mínimo 6 caracteres">
          </div>

          <div style="margin-bottom:20px;">
            <label style="font-size:.8rem; font-weight:600; color:#444; display:block; margin-bottom:4px;">Confirmar nueva contraseña *</label>
            <input id="sPassConfirm" type="password" required minlength="6"
              style="width:100%; padding:9px 12px; border:2px solid #e0e0e0; border-radius:10px;
                     font-size:.9rem; transition:border-color .2s; box-sizing:border-box;"
              placeholder="Repite la nueva contraseña">
          </div>

          <button type="submit"
            style="width:100%; padding:11px; border:none; border-radius:12px;
                   background:linear-gradient(135deg,#1565c0,#0d47a1); color:white;
                   font-weight:700; font-size:.9rem; cursor:pointer; transition:opacity .2s;"
            id="btnCambiarPass">🔒 Cambiar contraseña</button>
        </form>
      </div>

      <!-- TAB: ACTIVIDAD -->
      <div id="stab-actividad" class="stab-content" style="display:none;">
        <p style="font-size:.78rem; color:#888; margin-bottom:16px;">
          Historial de tu actividad reciente en la plataforma.
        </p>

        <div id="settings-actividad-cargando"
          style="text-align:center; padding:30px; color:#aaa; font-size:.9rem;">
          ⏳ Cargando actividad…
        </div>
        <div id="settings-actividad-lista" style="display:none;"></div>
      </div>

    </div><!-- /scrollable -->

    <!-- Pie del panel -->
    <div style="padding:14px 24px; border-top:1px solid #f0f0f0; flex-shrink:0;
                font-size:.74rem; color:#bbb; text-align:center;">
      PRICE NICE · Configuración de cuenta
    </div>

  </div><!-- /settingsPanel -->
  `;

  const wrapper = document.createElement("div");
  wrapper.innerHTML = html;
  document.body.appendChild(wrapper);
}

/* ════════════════════════════════════════════════════════════
   COLOR DE ACENTO (se adapta al rol / página)
════════════════════════════════════════════════════════════ */
function detectarColor() {
  const url = window.location.pathname.toLowerCase();
  if (url.includes("vendedor"))           return { h: "#1a6e3c", bg: "linear-gradient(135deg,#1a6e3c,#0f4226)" };
  if (url.includes("admin"))              return { h: "#37474f", bg: "linear-gradient(135deg,#37474f,#263238)" };
  if (url.includes("due"))               return { h: "#b71c1c", bg: "linear-gradient(135deg,#b71c1c,#7f0000)" };
  if (url.includes("verificador"))        return { h: "#1565c0", bg: "linear-gradient(135deg,#1565c0,#0d47a1)" };
  if (url.includes("patrocinador"))       return { h: "#7b1fa2", bg: "linear-gradient(135deg,#7b1fa2,#4a148c)" };
  return                                          { h: "#D4954D", bg: "linear-gradient(135deg,#D4954D,#775533)" };
}

/* ════════════════════════════════════════════════════════════
   MENSAJES DE ESTADO
════════════════════════════════════════════════════════════ */
function mostrarMsg(id, texto, tipo = "ok") {
  const el = document.getElementById(id);
  if (!el) return;
  el.textContent = texto;
  el.style.display = "block";
  el.style.background = tipo === "ok" ? "#e8f5e9" : "#ffebee";
  el.style.color       = tipo === "ok" ? "#2e7d32" : "#c62828";
  el.style.border      = "1px solid " + (tipo === "ok" ? "#a5d6a7" : "#ef9a9a");
  if (tipo === "ok") setTimeout(() => { el.style.display = "none"; }, 3500);
}

/* ════════════════════════════════════════════════════════════
   ACTIVIDAD — construir tarjetas
════════════════════════════════════════════════════════════ */
async function cargarActividad(uid) {
  const lista = document.getElementById("settings-actividad-lista");
  const cargando = document.getElementById("settings-actividad-cargando");
  if (!lista || !cargando) return;

  const items = [];

  try {
    // Reseñas enviadas por el usuario
    const qResenas = query(
      collection(db, "resenas"),
      where("usuarioId", "==", uid)
    );
    const snapResenas = await getDocs(qResenas);
    snapResenas.forEach(d => {
      const r = d.data();
      items.push({
        icono: "⭐",
        titulo: "Reseña enviada",
        detalle: (r.referencia || "—") + " · " + (r.calificacion || "?") + "★",
        fecha: r.fecha ? new Date(r.fecha.seconds * 1000).toLocaleDateString("es-CO") : "—",
        estado: r.estado || "pendiente"
      });
    });
  } catch (_) { /* sin permiso o sin reseñas */ }

  try {
    // Productos publicados por el vendedor
    const qProductos = query(
      collection(db, "productos"),
      where("vendedorId", "==", uid)
    );
    const snapProductos = await getDocs(qProductos);
    snapProductos.forEach(d => {
      const p = d.data();
      items.push({
        icono: "🛍️",
        titulo: "Producto publicado",
        detalle: p.nombre || "—",
        fecha: p.fechaPublicacion
          ? new Date(p.fechaPublicacion.seconds * 1000).toLocaleDateString("es-CO")
          : "—",
        estado: p.estado || "nuevo"
      });
    });
  } catch (_) { /* sin permiso o sin productos */ }

  try {
    // Actualizaciones de precios hechas por el verificador
    const snapPrecios = await getDocs(collection(db, "actualizacionesPrecios"));
    snapPrecios.forEach(d => {
      const v = d.data();
      if (v.verificador && v.verificador !== "Verificador") {
        // No tenemos UID aquí, filtramos por nombre (limitación del esquema actual)
      }
      items.push({
        icono: "💲",
        titulo: "Precio actualizado",
        detalle: (v.producto || "—") + " → $" + (v.precioNuevo?.toLocaleString("es-CO") || "?"),
        fecha: v.fecha || "—",
        estado: "verificado"
      });
    });
  } catch (_) { /* sin permiso */ }

  cargando.style.display = "none";
  lista.style.display = "block";

  if (items.length === 0) {
    lista.innerHTML = `<div style="text-align:center;padding:30px;color:#bbb;font-size:.9rem;">
      📭 No hay actividad registrada aún.</div>`;
    return;
  }

  const colorInfo = detectarColor();

  lista.innerHTML = items.map(it => `
    <div style="display:flex; gap:12px; padding:12px 0; border-bottom:1px solid #f5f5f5; align-items:flex-start;">
      <div style="font-size:1.5rem; flex-shrink:0; line-height:1;">${it.icono}</div>
      <div style="flex:1; min-width:0;">
        <div style="font-weight:600; font-size:.85rem; color:#333;">${it.titulo}</div>
        <div style="font-size:.8rem; color:#666; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">${it.detalle}</div>
        <div style="font-size:.72rem; color:#aaa; margin-top:2px;">${it.fecha}</div>
      </div>
      <span style="font-size:.7rem; padding:2px 8px; border-radius:20px; flex-shrink:0;
                   background:${colorInfo.h}22; color:${colorInfo.h}; font-weight:700;">${it.estado}</span>
    </div>
  `).join("");
}

/* ════════════════════════════════════════════════════════════
   INICIALIZAR TODO
════════════════════════════════════════════════════════════ */
export function initSettings() {
  inyectarPanel();

  const color = detectarColor();

  /* Aplicar color de acento al header del panel */
  document.getElementById("settingsHeader").style.background = color.bg;

  /* Aplicar color activo a tabs */
  function aplicarEstiloTabs() {
    document.querySelectorAll(".stab").forEach(t => {
      if (t.classList.contains("active")) {
        t.style.borderBottom = `2px solid ${color.h}`;
        t.style.color = color.h;
        t.style.background = color.h + "12";
      } else {
        t.style.borderBottom = "2px solid transparent";
        t.style.color = "#777";
        t.style.background = "none";
      }
    });
  }
  aplicarEstiloTabs();

  /* Color del botón tuerquita */
  const btn = document.getElementById("btnSettings");
  btn.style.borderColor = color.h + "55";

  /* ── Abrir / cerrar panel ── */
  const panel   = document.getElementById("settingsPanel");
  const overlay = document.getElementById("settingsOverlay");

  function abrirPanel() {
    overlay.style.display = "block";
    panel.style.left = "0";
    btn.style.transform = "rotate(90deg)";
    cargarDatosUsuario();
  }
  function cerrarPanel() {
    overlay.style.display = "none";
    panel.style.left = "-420px";
    btn.style.transform = "rotate(0deg)";
  }

  btn.addEventListener("click", abrirPanel);
  overlay.addEventListener("click", cerrarPanel);
  document.getElementById("btnCloseSettings").addEventListener("click", cerrarPanel);

  /* ── Tabs ── */
  let tabActividadCargada = false;
  document.querySelectorAll(".stab").forEach(t => {
    t.addEventListener("click", () => {
      const objetivo = t.dataset.tab;
      document.querySelectorAll(".stab").forEach(x => x.classList.remove("active"));
      t.classList.add("active");
      aplicarEstiloTabs();
      document.querySelectorAll(".stab-content").forEach(c => c.style.display = "none");
      document.getElementById("stab-" + objetivo).style.display = "block";

      // Cargar actividad solo la primera vez que se abre esa pestaña
      if (objetivo === "actividad" && !tabActividadCargada) {
        const user = auth.currentUser;
        if (user) {
          tabActividadCargada = true;
          cargarActividad(user.uid);
        }
      }
    });
  });

  /* ── Cargar datos del perfil ── */
  async function cargarDatosUsuario() {
    const user = auth.currentUser;
    if (!user) return;

    document.getElementById("sEmail").value = user.email || "";
    document.getElementById("settingsSubtitle").textContent = user.email || "Mi cuenta";

    try {
      const snap = await getDoc(doc(db, "usuarios", user.uid));
      if (snap.exists()) {
        const d = snap.data();
        document.getElementById("sNombre").value   = d.nombre   || "";
        document.getElementById("sApellido").value = d.apellido || "";
        document.getElementById("sTelefono").value = d.telefono || "";
        document.getElementById("sCiudad").value   = d.ciudad   || "";
      }
    } catch (err) {
      console.error("Settings: error al cargar datos", err);
    }
  }

  /* ── Guardar perfil ── */
  document.getElementById("formSettingsPerfil").addEventListener("submit", async e => {
    e.preventDefault();
    const btn = document.getElementById("btnGuardarPerfil");
    btn.disabled = true;
    btn.textContent = "⏳ Guardando…";

    const user = auth.currentUser;
    if (!user) { btn.disabled = false; btn.textContent = "💾 Guardar cambios"; return; }

    const nombre   = document.getElementById("sNombre").value.trim();
    const apellido = document.getElementById("sApellido").value.trim();
    const telefono = document.getElementById("sTelefono").value.trim();
    const ciudad   = document.getElementById("sCiudad").value.trim();

    if (!nombre) {
      mostrarMsg("settings-msg-perfil", "El nombre es obligatorio.", "err");
      btn.disabled = false; btn.textContent = "💾 Guardar cambios";
      return;
    }

    try {
      await updateDoc(doc(db, "usuarios", user.uid), { nombre, apellido, telefono, ciudad });
      mostrarMsg("settings-msg-perfil", "✅ Perfil actualizado correctamente.", "ok");

      // Actualizar bienvenida en la página si existe el elemento
      const bienvenidaEl = document.getElementById("bienvenida") ||
                           document.getElementById("bienvenida-form") ||
                           document.getElementById("bienvenida-res");
      if (bienvenidaEl) {
        const base = bienvenidaEl.textContent.split(",")[0];
        bienvenidaEl.textContent = base + ", " + nombre + " 👋";
      }
    } catch (err) {
      mostrarMsg("settings-msg-perfil", "Error al guardar: " + (err.message || err), "err");
    }

    btn.disabled = false;
    btn.textContent = "💾 Guardar cambios";
  });

  /* ── Cambiar contraseña ── */
  document.getElementById("formSettingsSeg").addEventListener("submit", async e => {
    e.preventDefault();
    const btnP = document.getElementById("btnCambiarPass");
    btnP.disabled = true;
    btnP.textContent = "⏳ Procesando…";

    const actual   = document.getElementById("sPassActual").value;
    const nueva    = document.getElementById("sPassNueva").value;
    const confirm  = document.getElementById("sPassConfirm").value;

    if (nueva.length < 6) {
      mostrarMsg("settings-msg-seg", "La nueva contraseña debe tener al menos 6 caracteres.", "err");
      btnP.disabled = false; btnP.textContent = "🔒 Cambiar contraseña";
      return;
    }
    if (nueva !== confirm) {
      mostrarMsg("settings-msg-seg", "Las contraseñas nuevas no coinciden.", "err");
      btnP.disabled = false; btnP.textContent = "🔒 Cambiar contraseña";
      return;
    }

    const user = auth.currentUser;
    if (!user) { btnP.disabled = false; btnP.textContent = "🔒 Cambiar contraseña"; return; }

    try {
      const credencial = EmailAuthProvider.credential(user.email, actual);
      await reauthenticateWithCredential(user, credencial);
      await updatePassword(user, nueva);
      mostrarMsg("settings-msg-seg", "✅ Contraseña actualizada correctamente.", "ok");
      document.getElementById("formSettingsSeg").reset();
    } catch (err) {
      const mensajes = {
        "auth/wrong-password":     "La contraseña actual es incorrecta.",
        "auth/invalid-credential": "La contraseña actual es incorrecta.",
        "auth/too-many-requests":  "Demasiados intentos. Espera unos minutos.",
        "auth/weak-password":      "La nueva contraseña es demasiado débil."
      };
      mostrarMsg("settings-msg-seg", mensajes[err.code] || ("Error: " + err.message), "err");
    }

    btnP.disabled = false;
    btnP.textContent = "🔒 Cambiar contraseña";
  });
}
