/**
 * PriceNice — admin-vendedores.js
 * Gestión de solicitudes de verificación de vendedores para administradores.
 * Se importa desde admin.html como módulo.
 */

import { db } from "./firebase-config.js";
import {
  collection, query, orderBy, onSnapshot,
  doc, updateDoc, getDoc, serverTimestamp, where
} from "https://www.gstatic.com/firebasejs/11.6.0/firebase-firestore.js";
import { colorRecomendacion, iconoEstado } from "./verificacion-vendedor.js";

/* ═══════════════════════════════════════════════════════
   INICIALIZACIÓN — llamar desde admin.html una vez verificado el rol
═══════════════════════════════════════════════════════ */
export function initModuloVendedores(uidAdmin, nombreAdmin) {
  cargarSolicitudes(uidAdmin, nombreAdmin);
  configurarFiltros();
}

/* ─── Estado local ─── */
let solicitudesCargadas = [];
let filtroEstadoActual  = "todos";

/* ═══════════════════════════════════════════════════════
   CARGA EN TIEMPO REAL
═══════════════════════════════════════════════════════ */
function cargarSolicitudes(uidAdmin, nombreAdmin) {
  const colRef = collection(db, "solicitudesVendedor");
  const q = query(colRef, orderBy("fechaCreacion", "desc"));

  onSnapshot(q, (snap) => {
    solicitudesCargadas = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    actualizarContadores(solicitudesCargadas);
    renderizarTabla(solicitudesCargadas, filtroEstadoActual, uidAdmin, nombreAdmin);
  }, (err) => {
    console.error("Error cargando solicitudes:", err);
    const tbody = document.getElementById("avTbody");
    if (tbody) tbody.innerHTML = filaVacia("Error al cargar solicitudes. Verifica los permisos de Firestore.");
  });
}

/* ═══════════════════════════════════════════════════════
   CONTADORES DE ESTADO
═══════════════════════════════════════════════════════ */
function actualizarContadores(lista) {
  const counts = { todos: lista.length, pendiente: 0, en_revision: 0, aprobada: 0, rechazada: 0 };
  lista.forEach(s => { if (counts[s.estado] !== undefined) counts[s.estado]++; });

  // Tab badge (header)
  const tabBadge = document.getElementById("avCount-pendiente");
  if (tabBadge) tabBadge.textContent = counts.pendiente;

  // Stats cards en el panel (sufijo 2 para evitar colisión con tab badge)
  const idMap = {
    todos:       ["avCount-todos",        "avFCount-todos"],
    pendiente:   ["avCount-pendiente2",   "avFCount-pendiente"],
    en_revision: ["avCount-en_revision",  "avFCount-en_revision"],
    aprobada:    ["avCount-aprobada",     "avFCount-aprobada"],
    rechazada:   ["avCount-rechazada",    "avFCount-rechazada"]
  };

  Object.entries(counts).forEach(([estado, n]) => {
    (idMap[estado] || []).forEach(id => {
      const el = document.getElementById(id);
      if (el) el.textContent = n;
    });
  });
}

/* ═══════════════════════════════════════════════════════
   FILTROS
═══════════════════════════════════════════════════════ */
function configurarFiltros() {
  document.querySelectorAll("[data-av-filtro]").forEach(btn => {
    btn.addEventListener("click", () => {
      document.querySelectorAll("[data-av-filtro]").forEach(b => b.classList.remove("active"));
      btn.classList.add("active");
      filtroEstadoActual = btn.dataset.avFiltro;
      renderizarTabla(solicitudesCargadas, filtroEstadoActual);
    });
  });
}

/* ═══════════════════════════════════════════════════════
   RENDERIZADO DE TABLA
═══════════════════════════════════════════════════════ */
function renderizarTabla(lista, filtro, uidAdmin, nombreAdmin) {
  const tbody = document.getElementById("avTbody");
  if (!tbody) return;

  const filtrada = filtro === "todos" ? lista : lista.filter(s => s.estado === filtro);

  if (filtrada.length === 0) {
    tbody.innerHTML = filaVacia(
      filtro === "todos" ? "No hay solicitudes registradas." : `No hay solicitudes con estado "${labelEstado(filtro)}".`
    );
    return;
  }

  tbody.innerHTML = "";
  filtrada.forEach(sol => tbody.appendChild(crearFila(sol, uidAdmin, nombreAdmin)));
}

function filaVacia(msg) {
  return `<tr><td colspan="7" style="text-align:center;padding:24px;color:#666;font-style:italic">${msg}</td></tr>`;
}

function crearFila(sol, uidAdmin, nombreAdmin) {
  const tr = document.createElement("tr");
  tr.className = "av-fila";
  tr.dataset.id = sol.id;

  const fecha = sol.fechaCreacion?.toDate
    ? formatFecha(sol.fechaCreacion.toDate())
    : (sol.fechaEnvio ? formatFecha(new Date(sol.fechaEnvio)) : "—");

  const empresa  = sol.empresa?.razonSocial || "—";
  const nit      = sol.empresa?.nit || "—";
  const nombre   = sol.responsable?.nombre || "—";
  const correo   = sol.emailCuenta || "—";
  const iaRec    = sol.ia?.recomendacion || null;
  const estado   = sol.estado || "pendiente";

  tr.innerHTML = `
    <td class="av-td">
      <div class="av-empresa-nombre">${escHtml(empresa)}</div>
      <div class="av-empresa-nit">NIT: ${escHtml(nit)}</div>
    </td>
    <td class="av-td av-td-sm">${escHtml(nombre)}</td>
    <td class="av-td av-td-sm">${escHtml(correo)}</td>
    <td class="av-td av-td-sm">${fecha}</td>
    <td class="av-td">${badgeIA(iaRec)}</td>
    <td class="av-td">${badgeEstado(estado)}</td>
    <td class="av-td">
      <button class="av-btn-ver" data-id="${sol.id}" aria-label="Ver solicitud de ${empresa}">
        <i class="bi bi-eye"></i> Ver
      </button>
    </td>`;

  tr.querySelector(".av-btn-ver").addEventListener("click", () => {
    abrirModalSolicitud(sol, uidAdmin, nombreAdmin);
  });

  return tr;
}

function badgeEstado(estado) {
  const map = {
    pendiente:   { cls: "av-badge-pendiente",  label: "Pendiente",    icon: "bi-clock" },
    en_revision: { cls: "av-badge-revision",   label: "En revisión",  icon: "bi-eye" },
    aprobada:    { cls: "av-badge-aprobada",   label: "Aprobada",     icon: "bi-check-circle-fill" },
    rechazada:   { cls: "av-badge-rechazada",  label: "Rechazada",    icon: "bi-x-circle-fill" }
  };
  const cfg = map[estado] || map.pendiente;
  return `<span class="av-badge ${cfg.cls}"><i class="bi ${cfg.icon}"></i> ${cfg.label}</span>`;
}

function badgeIA(rec) {
  if (!rec) return `<span class="av-badge av-badge-ia-nd">Sin análisis</span>`;
  const map = {
    aprobar:        { cls: "av-badge-ia-ok",   label: "✅ Aprobar" },
    rechazar:       { cls: "av-badge-ia-err",  label: "❌ Rechazar" },
    revisar_manual: { cls: "av-badge-ia-warn", label: "⚠️ Revisar" }
  };
  const cfg = map[rec] || { cls: "av-badge-ia-nd", label: rec };
  return `<span class="av-badge ${cfg.cls}">${cfg.label}</span>`;
}

/* ═══════════════════════════════════════════════════════
   MODAL DE REVISIÓN
═══════════════════════════════════════════════════════ */
function abrirModalSolicitud(sol, uidAdmin, nombreAdmin) {
  const modal = document.getElementById("avModal");
  if (!modal) return;

  // Cambiar estado a "en_revision" si estaba pendiente
  if (sol.estado === "pendiente") {
    actualizarEstado(sol.id, "en_revision", null, null, uidAdmin, nombreAdmin);
  }

  // Llenar contenido del modal
  document.getElementById("avModalTitle").textContent =
    `Solicitud: ${sol.empresa?.razonSocial || "—"}`;

  document.getElementById("avModalBody").innerHTML = construirContenidoModal(sol);

  // Botones de decisión
  const btnAprobar  = document.getElementById("avBtnAprobar");
  const btnRechazar = document.getElementById("avBtnRechazar");

  const yaDecidida = sol.estado === "aprobada" || sol.estado === "rechazada";
  btnAprobar.disabled  = yaDecidida || sol.estado === "aprobada";
  btnRechazar.disabled = yaDecidida || sol.estado === "rechazada";

  // Limpiar listeners previos clonando
  const btnA2 = btnAprobar.cloneNode(true);
  const btnR2 = btnRechazar.cloneNode(true);
  btnAprobar.replaceWith(btnA2);
  btnRechazar.replaceWith(btnR2);

  btnA2.disabled = yaDecidida;
  btnR2.disabled = yaDecidida;

  btnA2.addEventListener("click", () => confirmarDecision(sol, "aprobada", uidAdmin, nombreAdmin));
  btnR2.addEventListener("click", () => pedirMotivoRechazo(sol, uidAdmin, nombreAdmin));

  // Mostrar modal
  modal.classList.add("is-open");
  document.body.style.overflow = "hidden";

  // Cerrar con overlay o botón X
  const cerrar = () => { modal.classList.remove("is-open"); document.body.style.overflow = ""; };
  modal.querySelector(".av-modal-overlay").onclick = cerrar;
  modal.querySelector(".av-modal-close").onclick   = cerrar;
  document.addEventListener("keydown", function onEsc(e) {
    if (e.key === "Escape") { cerrar(); document.removeEventListener("keydown", onEsc); }
  });
}

function construirContenidoModal(sol) {
  const emp  = sol.empresa    || {};
  const resp = sol.responsable || {};
  const ia   = sol.ia         || {};
  const docs = sol.documentos || {};

  const iaColor = colorRecomendacion(ia.recomendacion);
  const iaLabel = { aprobar: "APROBAR", rechazar: "RECHAZAR", revisar_manual: "REVISAR MANUALMENTE" };
  const iaPuntaje = ia.puntaje ?? "—";

  const seccionDatos = (titulo, campos) => `
    <div class="av-modal-section">
      <h4 class="av-modal-section-title">${titulo}</h4>
      <div class="av-modal-grid">
        ${campos.map(c => `
          <div class="av-modal-item">
            <span class="av-modal-label">${escHtml(c.label)}</span>
            <span class="av-modal-val">${escHtml(c.val || "—")}</span>
          </div>`).join("")}
      </div>
    </div>`;

  const seccionEmpresa = seccionDatos("🏢 Empresa", [
    { label: "Razón social",    val: emp.razonSocial },
    { label: "NIT",             val: emp.nit },
    { label: "Tipo de empresa", val: emp.tipoEmpresaLabel },
    { label: "Dirección",       val: emp.direccion },
    { label: "Teléfono",        val: emp.telefono },
    { label: "Correo",          val: emp.correo },
    { label: "Sitio web",       val: emp.sitioWeb || "—" }
  ]);

  const seccionResp = seccionDatos("👤 Responsable", [
    { label: "Nombre completo", val: resp.nombre },
    { label: "Tipo documento",  val: resp.tipoDocLabel },
    { label: "Número doc.",     val: resp.numDoc },
    { label: "Teléfono",        val: resp.telefono },
    { label: "Correo",          val: resp.correo },
    { label: "Cargo",           val: resp.cargoLabel }
  ]);

  // Documentos con links
  const linksDoc = Object.entries(docs).map(([campo, url]) => {
    const nombres = {
      docCamaraComercio: "Cámara de comercio",
      docRut:            "RUT",
      docIdentidad:      "Doc. identidad"
    };
    return `<a href="${escHtml(url)}" target="_blank" rel="noopener" class="av-doc-link">
      <i class="bi bi-file-earmark-arrow-down"></i> ${nombres[campo] || campo}
    </a>`;
  }).join("");

  const seccionDocs = `
    <div class="av-modal-section">
      <h4 class="av-modal-section-title">📎 Documentos</h4>
      <div class="av-docs-links">${linksDoc || "<span style='color:#666'>Sin documentos</span>"}</div>
    </div>`;

  // Análisis IA
  const obsHtml = (ia.observaciones || []).map(o => {
    const colores = { error: "#FF4D4D", advertencia: "#FFB830", info: "#8AB4FF", ok: "#7AFF50" };
    const iconos  = { error: "bi-x-circle", advertencia: "bi-exclamation-triangle", info: "bi-info-circle", ok: "bi-check-circle" };
    return `<div class="av-ia-obs av-ia-obs-${o.tipo}">
      <i class="bi ${iconos[o.tipo] || "bi-dot"}" style="color:${colores[o.tipo] || "#666"}"></i>
      <span>${escHtml(o.mensaje)}</span>
    </div>`;
  }).join("");

  const seccionIA = `
    <div class="av-modal-section">
      <h4 class="av-modal-section-title">🤖 Análisis IA</h4>
      <div class="av-ia-header">
        <div class="av-ia-puntaje">
          <span class="av-ia-puntaje-num" style="color:${iaColor}">${iaPuntaje}</span>
          <span class="av-ia-puntaje-lbl">/100</span>
        </div>
        <div class="av-ia-rec" style="color:${iaColor}">
          Recomendación: <strong>${iaLabel[ia.recomendacion] || "—"}</strong>
        </div>
      </div>
      <div class="av-ia-obs-list">${obsHtml || "<span style='color:#666;font-size:13px'>Sin observaciones</span>"}</div>
      ${ia.resumen ? `<pre class="av-ia-resumen">${escHtml(ia.resumen)}</pre>` : ""}
    </div>`;

  // Estado actual
  const historial = sol.estado === "rechazada" && sol.motivoRechazo
    ? `<div class="av-modal-section">
        <h4 class="av-modal-section-title">📋 Motivo de rechazo</h4>
        <div class="av-motivo-rechazo">${escHtml(sol.motivoRechazo)}</div>
      </div>`
    : "";

  return seccionEmpresa + seccionResp + seccionDocs + seccionIA + historial;
}

/* ═══════════════════════════════════════════════════════
   DECISIONES DEL ADMINISTRADOR
═══════════════════════════════════════════════════════ */
async function confirmarDecision(sol, nuevoEstado, uidAdmin, nombreAdmin) {
  const modal = document.getElementById("avModal");
  const btnA  = document.getElementById("avBtnAprobar");
  const btnR  = document.getElementById("avBtnRechazar");

  btnA.disabled = true;
  btnR.disabled = true;

  const labelNuevo = nuevoEstado === "aprobada" ? "aprobada" : "rechazada";
  const confirma = confirm(
    `¿Confirmas ${nuevoEstado === "aprobada" ? "APROBAR" : "RECHAZAR"} la solicitud de\n"${sol.empresa?.razonSocial}"?\n\nEsta acción ${nuevoEstado === "aprobada" ? "otorgará el rol de Vendedor al usuario." : "notificará el rechazo al usuario."}`
  );

  if (!confirma) {
    btnA.disabled = sol.estado === "aprobada" || sol.estado === "rechazada";
    btnR.disabled = sol.estado === "aprobada" || sol.estado === "rechazada";
    return;
  }

  try {
    await actualizarEstado(sol.id, nuevoEstado, null, null, uidAdmin, nombreAdmin);

    // Si se aprueba, actualizar el rol del usuario en la colección usuarios
    if (nuevoEstado === "aprobada") {
      await actualizarRolUsuario(sol.uid, "vendedor");
    }

    mostrarMsgModal(`Solicitud ${labelNuevo} correctamente.`, nuevoEstado === "aprobada" ? "ok" : "warn");

    // Cerrar modal después de 2 segundos
    setTimeout(() => {
      modal.classList.remove("is-open");
      document.body.style.overflow = "";
    }, 2000);

  } catch (err) {
    mostrarMsgModal("Error al procesar la decisión: " + err.message, "err");
    btnA.disabled = false;
    btnR.disabled = false;
  }
}

function pedirMotivoRechazo(sol, uidAdmin, nombreAdmin) {
  // Mostrar campo de motivo en el modal
  const modal = document.getElementById("avModal");
  const yaHayInput = document.getElementById("avMotivoInput");
  if (yaHayInput) return; // ya está visible

  const wrapper = document.createElement("div");
  wrapper.className = "av-motivo-wrap";
  wrapper.innerHTML = `
    <label class="av-motivo-label">Motivo del rechazo <span style="color:#FF4D4D">*</span></label>
    <textarea id="avMotivoInput" class="av-motivo-textarea"
      placeholder="Describe el motivo del rechazo para que el usuario pueda corregir su solicitud…"
      rows="4" maxlength="500"></textarea>
    <div style="display:flex;gap:10px;margin-top:10px">
      <button type="button" id="avBtnConfirmarRechazo" class="av-btn-decision av-btn-rechazar">
        <i class="bi bi-x-circle"></i> Confirmar rechazo
      </button>
      <button type="button" id="avBtnCancelarMotivo" class="av-btn-decision av-btn-cancelar">
        Cancelar
      </button>
    </div>`;

  const footer = modal.querySelector(".av-modal-footer");
  footer.after(wrapper);

  document.getElementById("avBtnCancelarMotivo").addEventListener("click", () => {
    wrapper.remove();
  });

  document.getElementById("avBtnConfirmarRechazo").addEventListener("click", async () => {
    const motivo = document.getElementById("avMotivoInput").value.trim();
    if (!motivo) {
      document.getElementById("avMotivoInput").style.borderColor = "#FF4D4D";
      return;
    }
    await confirmarDecisionConMotivo(sol, "rechazada", motivo, uidAdmin, nombreAdmin);
    wrapper.remove();
  });
}

async function confirmarDecisionConMotivo(sol, nuevoEstado, motivo, uidAdmin, nombreAdmin) {
  const btnA = document.getElementById("avBtnAprobar");
  const btnR = document.getElementById("avBtnRechazar");
  btnA.disabled = true;
  btnR.disabled = true;

  try {
    await actualizarEstado(sol.id, nuevoEstado, motivo, null, uidAdmin, nombreAdmin);
    mostrarMsgModal("Solicitud rechazada. El usuario podrá ver el motivo y reenviarla.", "warn");

    setTimeout(() => {
      document.getElementById("avModal").classList.remove("is-open");
      document.body.style.overflow = "";
    }, 2500);
  } catch (err) {
    mostrarMsgModal("Error al rechazar: " + err.message, "err");
    btnA.disabled = false;
    btnR.disabled = false;
  }
}

/* ═══════════════════════════════════════════════════════
   FIRESTORE — ACTUALIZACIONES
═══════════════════════════════════════════════════════ */
async function actualizarEstado(solId, nuevoEstado, motivoRechazo, extra, uidAdmin, nombreAdmin) {
  const datos = {
    estado: nuevoEstado,
    estadoLabel: labelEstado(nuevoEstado),
    fechaActualizacion: serverTimestamp(),
    adminUid: uidAdmin || null,
    adminNombre: nombreAdmin || null,
    fechaDecision: nuevoEstado === "aprobada" || nuevoEstado === "rechazada" ? serverTimestamp() : null
  };
  if (motivoRechazo) datos.motivoRechazo = motivoRechazo;
  if (extra) Object.assign(datos, extra);

  await updateDoc(doc(db, "solicitudesVendedor", solId), datos);
}

async function actualizarRolUsuario(uid, nuevoRol) {
  await updateDoc(doc(db, "usuarios", uid), {
    rol: nuevoRol,
    rolActualizadoEn: serverTimestamp()
  });
}

/* ═══════════════════════════════════════════════════════
   HELPERS
═══════════════════════════════════════════════════════ */
function labelEstado(e) {
  return { pendiente: "Pendiente", en_revision: "En revisión", aprobada: "Aprobada", rechazada: "Rechazada" }[e] || e;
}

function formatFecha(d) {
  return d.toLocaleDateString("es-CO", { day: "2-digit", month: "short", year: "numeric" });
}

function escHtml(s) {
  return String(s || "")
    .replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;");
}

function mostrarMsgModal(texto, tipo) {
  let el = document.getElementById("avModalMsg");
  if (!el) {
    el = document.createElement("div");
    el.id = "avModalMsg";
    el.className = "av-modal-msg";
    const footer = document.querySelector(".av-modal-footer");
    if (footer) footer.prepend(el);
  }
  const clases = { ok: "av-msg-ok", warn: "av-msg-warn", err: "av-msg-err", info: "av-msg-info" };
  el.className = `av-modal-msg ${clases[tipo] || ""}`;
  el.textContent = texto;
  el.hidden = false;
}
