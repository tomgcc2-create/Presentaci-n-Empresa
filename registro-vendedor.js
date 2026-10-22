/**
 * PriceNice — registro-vendedor.js
 * Lógica completa del formulario multi-paso de registro de vendedor.
 * Maneja: navegación de pasos, validación, subida a Storage, Firestore y revisión IA.
 */

import { auth, db } from "./firebase-config.js";
import { onAuthStateChanged }  from "https://www.gstatic.com/firebasejs/11.6.0/firebase-auth.js";
import {
  doc, setDoc, getDoc, collection, query, where, getDocs, serverTimestamp
} from "https://www.gstatic.com/firebasejs/11.6.0/firebase-firestore.js";
import {
  getStorage, ref as storageRef, uploadBytes, getDownloadURL
} from "https://www.gstatic.com/firebasejs/11.6.0/firebase-storage.js";
import { revisarSolicitudIA } from "./verificacion-vendedor.js";

/* ═══════════════ ESTADO ═══════════════ */
let pasoActual = 1;
const TOTAL_PASOS = 4;
let uidUsuario = null;
let emailUsuario = null;

// Archivos seleccionados (se validan antes de subir)
const archivos = {
  docCamaraComercio: null,
  docRut:            null,
  docIdentidad:      null
};

/* ═══════════════ REFERENCIAS DOM ═══════════════ */
const $ = (id) => document.getElementById(id);
const form        = $("rvForm");
const progressFill = $("rvProgressFill");
const msgEl       = $("rvMsg");
const successEl   = $("rvSuccess");
const btnEnviar   = $("btnEnviar");

/* ═══════════════ SESIÓN ═══════════════ */
// La página requiere sesión activa (el usuario ya se registró)
onAuthStateChanged(auth, (usuario) => {
  if (!usuario) {
    // Sin sesión → redirigir al login con bandera de rol vendedor
    window.location.href = "login.html?rol=vendedor";
    return;
  }
  uidUsuario  = usuario.uid;
  emailUsuario = usuario.email;

  // Pre-llenar correo de empresa si el campo está vacío
  const empCorreo = $("empCorreo");
  if (empCorreo && !empCorreo.value) empCorreo.value = emailUsuario || "";

  // Verificar si ya tiene solicitud pendiente
  verificarSolicitudExistente();
});

async function verificarSolicitudExistente() {
  try {
    const snap = await getDoc(doc(db, "solicitudesVendedor", uidUsuario));
    if (snap.exists()) {
      const datos = snap.data();
      const estado = datos.estado || "pendiente";
      if (estado === "aprobada") {
        mostrarMsg("Tu solicitud ya fue aprobada. Ya eres vendedor en PriceNice.", "ok");
      } else if (estado === "pendiente" || estado === "en_revision") {
        mostrarMsg(
          `Tu solicitud está actualmente <strong>${labelEstado(estado)}</strong>. Recibirás una notificación cuando haya una decisión.`,
          "warn"
        );
        $("btnEnviar").disabled = true;
      } else if (estado === "rechazada") {
        const motivo = datos.motivoRechazo || "Sin especificar";
        mostrarMsg(
          `Tu solicitud anterior fue <strong>rechazada</strong>. Motivo: ${motivo}<br>Puedes corregir los datos y reenviarla.`,
          "err"
        );
        // Permitir reenvío: el usuario puede corregir y enviar de nuevo
      }
    }
  } catch {
    // Sin solicitud previa — normal para primeras solicitudes
  }
}

function labelEstado(e) {
  return { pendiente: "Pendiente", en_revision: "En revisión", aprobada: "Aprobada", rechazada: "Rechazada" }[e] || e;
}

/* ═══════════════ NAVEGACIÓN DE PASOS ═══════════════ */
function irAPaso(nuevoPaso, esRetroceso = false) {
  const panelActual = $(`rvPanel${pasoActual}`);
  const panelNuevo  = $(`rvPanel${nuevoPaso}`);
  const stepActual  = $(`rvStep${pasoActual}`);
  const stepNuevo   = $(`rvStep${nuevoPaso}`);

  // Transición
  panelActual.classList.remove("is-active");
  panelActual.inert = true;

  panelNuevo.classList.toggle("slide-back", esRetroceso);
  panelNuevo.classList.add("is-active");
  panelNuevo.removeAttribute("inert");

  // Forzar re-flow para que la animación funcione correctamente
  void panelNuevo.offsetWidth;
  panelNuevo.classList.remove("slide-back");

  // Actualizar indicadores de paso
  if (esRetroceso) {
    stepActual.classList.remove("is-active", "is-done");
  } else {
    stepActual.classList.remove("is-active");
    stepActual.classList.add("is-done");
  }
  stepNuevo.classList.remove("is-done");
  stepNuevo.classList.add("is-active");
  stepNuevo.setAttribute("aria-current", "step");

  // Conectores
  for (let i = 1; i < TOTAL_PASOS; i++) {
    const conector = document.querySelectorAll(".rv-step-connector")[i - 1];
    if (conector) {
      conector.classList.toggle("is-done", i < nuevoPaso);
    }
  }

  // Barra de progreso
  progressFill.style.width = `${(nuevoPaso / TOTAL_PASOS) * 100}%`;

  pasoActual = nuevoPaso;

  // Si llegamos al paso 4 (confirmación), construir el resumen
  if (nuevoPaso === 4) construirResumen();

  // Scroll suave al inicio
  window.scrollTo({ top: 0, behavior: "smooth" });
}

/* Botones de navegación */
$("btnSiguiente1").addEventListener("click", () => {
  if (validarPaso1()) irAPaso(2);
});
$("btnAnterior2").addEventListener("click", () => irAPaso(1, true));
$("btnSiguiente2").addEventListener("click", () => {
  if (validarPaso2()) irAPaso(3);
});
$("btnAnterior3").addEventListener("click", () => irAPaso(2, true));
$("btnSiguiente3").addEventListener("click", () => {
  if (validarPaso3()) irAPaso(4);
});
$("btnAnterior4").addEventListener("click", () => irAPaso(3, true));

/* ═══════════════ VALIDACIONES ═══════════════ */
function setErr(id, msg) {
  const el = $(`err-${id}`); if (!el) return;
  el.textContent = msg || "";
  const campo = el.previousElementSibling || el.closest(".rv-field")?.querySelector(".rv-input, .rv-select");
  if (campo) campo.classList.toggle("has-err", !!msg);
}
function clearErr(id) { setErr(id, ""); }
function correoValido(c) { return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(c); }
function telefonoValido(t) { return /^[+\d][\d\s\-().]{6,19}$/.test(t.trim()); }
function nitValido(n) { return /^[\d.,\-]{5,20}$/.test(n.trim()); }

function validarPaso1() {
  let ok = true;
  const v = (id, test, msg) => {
    const val = $(id)?.value?.trim() || "";
    if (!test(val)) { setErr(id, msg); ok = false; } else clearErr(id);
  };
  v("empRazon",    s => s.length >= 3,      "Ingresa la razón social (mínimo 3 caracteres)");
  v("empNit",      nitValido,                "Formato inválido. Ej: 900.123.456-7");
  v("empTipoEmp",  s => s.length > 0,        "Selecciona el tipo de empresa");
  v("empDireccion",s => s.length >= 8,       "Ingresa la dirección completa");
  v("empTelefono", telefonoValido,            "Ingresa un teléfono válido");
  v("empCorreo",   correoValido,              "Ingresa un correo válido");
  if (!ok) focusPrimerError();
  return ok;
}

function validarPaso2() {
  let ok = true;
  const v = (id, test, msg) => {
    const val = $(id)?.value?.trim() || "";
    if (!test(val)) { setErr(id, msg); ok = false; } else clearErr(id);
  };
  v("repNombre",  s => s.split(" ").filter(Boolean).length >= 2, "Ingresa nombre y apellido completos");
  v("repTipoDoc", s => s.length > 0,  "Selecciona el tipo de documento");
  v("repNumDoc",  s => /^\d{5,15}$/.test(s.replace(/\D/g, "")), "Número de documento inválido");
  v("repTelefono",telefonoValido,      "Ingresa un teléfono válido");
  v("repCorreo",  correoValido,        "Ingresa un correo válido");
  v("repCargo",   s => s.length > 0,  "Selecciona el cargo");
  if (!ok) focusPrimerError();
  return ok;
}

function validarPaso3() {
  let ok = true;
  const validarArchivo = (id, campo) => {
    if (!archivos[campo]) {
      setErr(id, "Este documento es obligatorio");
      ok = false;
    } else {
      clearErr(id);
    }
  };
  validarArchivo("docCamaraComercio", "docCamaraComercio");
  validarArchivo("docRut", "docRut");
  validarArchivo("docIdentidad", "docIdentidad");
  return ok;
}

function focusPrimerError() {
  const el = form.querySelector(".has-err input, .has-err select");
  if (el) { el.scrollIntoView({ block: "center", behavior: "smooth" }); el.focus(); }
}

// Limpiar error al escribir
document.querySelectorAll(".rv-input, .rv-select").forEach(el => {
  el.addEventListener("input", () => el.classList.remove("has-err"));
});

/* ═══════════════ ZONAS DE UPLOAD ═══════════════ */
const uploadConfig = [
  { zoneId: "zoneCC",  inputId: "docCamaraComercio", previewId: "previewCC",  campo: "docCamaraComercio" },
  { zoneId: "zoneRUT", inputId: "docRut",             previewId: "previewRUT", campo: "docRut" },
  { zoneId: "zoneDoc", inputId: "docIdentidad",       previewId: "previewDoc", campo: "docIdentidad" }
];

uploadConfig.forEach(({ zoneId, inputId, previewId, campo }) => {
  const zone    = $(zoneId);
  const input   = $(inputId);
  const preview = $(previewId);
  if (!zone || !input || !preview) return;

  input.addEventListener("change", () => procesarArchivo(input, zone, preview, campo));

  // Drag & drop
  zone.addEventListener("dragover",  (e) => { e.preventDefault(); zone.classList.add("rv-drag-over"); });
  zone.addEventListener("dragleave", ()  => zone.classList.remove("rv-drag-over"));
  zone.addEventListener("drop", (e) => {
    e.preventDefault();
    zone.classList.remove("rv-drag-over");
    const file = e.dataTransfer.files[0];
    if (file) procesarArchivoDirecto(file, input, zone, preview, campo);
  });
});

function procesarArchivo(input, zone, preview, campo) {
  const file = input.files[0];
  if (file) procesarArchivoDirecto(file, input, zone, preview, campo);
}

const TIPOS_VALIDOS = ["application/pdf", "image/jpeg", "image/png", "image/jpg"];
const MAX_BYTES = 5 * 1024 * 1024; // 5 MB

function procesarArchivoDirecto(file, input, zone, preview, campo) {
  clearErr(campo === "docCamaraComercio" ? "docCamaraComercio"
         : campo === "docRut" ? "docRut" : "docIdentidad");

  if (!TIPOS_VALIDOS.includes(file.type)) {
    setErr(campo, "Solo se aceptan PDF, JPG o PNG");
    return;
  }
  if (file.size > MAX_BYTES) {
    setErr(campo, "El archivo supera los 5 MB");
    return;
  }

  archivos[campo] = file;
  zone.classList.add("is-done");

  // Icono según tipo
  const iconClass = file.type === "application/pdf" ? "bi-file-earmark-pdf" : "bi-file-earmark-image";
  const sizeMB = (file.size / 1024 / 1024).toFixed(2);

  preview.hidden = false;
  preview.innerHTML = `
    <div class="rv-preview-icon"><i class="bi ${iconClass}"></i></div>
    <span class="rv-preview-name" title="${file.name}">${file.name}</span>
    <span class="rv-preview-size">${sizeMB} MB</span>
    <button type="button" class="rv-preview-rm" aria-label="Quitar archivo">
      <i class="bi bi-x-lg"></i>
    </button>`;

  preview.querySelector(".rv-preview-rm").addEventListener("click", (e) => {
    e.stopPropagation();
    archivos[campo] = null;
    input.value = "";
    zone.classList.remove("is-done");
    preview.hidden = true;
    preview.innerHTML = "";
  });
}

/* ═══════════════ RESUMEN (paso 4) ═══════════════ */
function val(id) { return $(id)?.value?.trim() || "—"; }
function labelSelect(id) {
  const el = $(id);
  if (!el) return "—";
  const opt = el.options[el.selectedIndex];
  return opt ? opt.text : "—";
}

function construirResumen() {
  const resumen = $("rvSummary");
  if (!resumen) return;

  const secciones = [
    {
      titulo: "🏢 Empresa",
      items: [
        { label: "Razón social",    val: val("empRazon") },
        { label: "NIT",             val: val("empNit") },
        { label: "Tipo de empresa", val: labelSelect("empTipoEmp") },
        { label: "Dirección",       val: val("empDireccion") },
        { label: "Teléfono",        val: val("empTelefono") },
        { label: "Correo",          val: val("empCorreo") },
        { label: "Sitio web",       val: val("empSitioWeb") || "—" }
      ]
    },
    {
      titulo: "👤 Responsable",
      items: [
        { label: "Nombre completo", val: val("repNombre") },
        { label: "Tipo documento",  val: labelSelect("repTipoDoc") },
        { label: "Número doc.",     val: val("repNumDoc") },
        { label: "Teléfono",        val: val("repTelefono") },
        { label: "Correo",          val: val("repCorreo") },
        { label: "Cargo",           val: labelSelect("repCargo") }
      ]
    }
  ];

  const docs = [
    archivos.docCamaraComercio ? { nombre: "Cámara de comercio", icono: "bi-file-earmark-check" } : null,
    archivos.docRut             ? { nombre: "RUT",               icono: "bi-file-earmark-check" } : null,
    archivos.docIdentidad       ? { nombre: "Doc. identidad",    icono: "bi-file-earmark-check" } : null
  ].filter(Boolean);

  resumen.innerHTML = secciones.map(sec => `
    <div class="rv-summary-section">
      <h3 class="rv-summary-section-title">${sec.titulo}</h3>
      <div class="rv-summary-grid">
        ${sec.items.map(it => `
          <div class="rv-summary-item">
            <span class="rv-summary-item-label">${it.label}</span>
            <span class="rv-summary-item-val">${escHtml(it.val)}</span>
          </div>`).join("")}
      </div>
    </div>
  `).join("") + `
    <div class="rv-summary-section">
      <h3 class="rv-summary-section-title">📎 Documentos adjuntos</h3>
      <div class="rv-summary-docs">
        ${docs.map(d => `<span class="rv-doc-chip"><i class="bi ${d.icono}"></i>${escHtml(d.nombre)}</span>`).join("")}
      </div>
    </div>`;
}

function escHtml(s) {
  return String(s)
    .replace(/&/g,"&amp;")
    .replace(/</g,"&lt;")
    .replace(/>/g,"&gt;")
    .replace(/"/g,"&quot;");
}

/* ═══════════════ ENVÍO DEL FORMULARIO ═══════════════ */
form.addEventListener("submit", async (e) => {
  e.preventDefault();

  // Validar términos
  if (!$("rvTerminos").checked) {
    setErr("rvTerminos", "Debes aceptar los términos para continuar");
    return;
  }
  clearErr("rvTerminos");

  // Bloquear botón
  setLoading(btnEnviar, true);
  mostrarMsg("Validando información…", "info");

  try {
    // 1. Recopilar datos del formulario
    const datosSolicitud = recopilarDatos();

    // 2. Revisión IA antes de guardar
    mostrarMsg("Analizando documentos con IA…", "info");
    const iaResultado = await revisarSolicitudIA(datosSolicitud, archivos, db);

    // 3. Subir documentos a Storage
    mostrarMsg("Subiendo documentos de forma segura…", "info");
    const urlsDocumentos = await subirDocumentos(uidUsuario);

    // 4. Guardar solicitud en Firestore
    mostrarMsg("Registrando solicitud…", "info");
    await guardarSolicitud(datosSolicitud, urlsDocumentos, iaResultado);

    // 5. Mostrar pantalla de éxito
    form.hidden = true;
    $("rvProgressFill").closest(".rv-progress-wrap").hidden = true;
    successEl.hidden = false;
    successEl.removeAttribute("hidden");
    window.scrollTo({ top: 0, behavior: "smooth" });

  } catch (error) {
    console.error("Error al enviar solicitud:", error);
    mostrarMsg(
      "Ocurrió un error al enviar tu solicitud. Verifica tu conexión y vuelve a intentarlo.<br><small>" + (error.message || "") + "</small>",
      "err"
    );
    setLoading(btnEnviar, false);
  }
});

function recopilarDatos() {
  return {
    // Empresa
    empresa: {
      razonSocial:  val("empRazon"),
      nit:          val("empNit").replace(/\s/g, ""),
      tipoEmpresa:  val("empTipoEmp"),
      tipoEmpresaLabel: labelSelect("empTipoEmp"),
      direccion:    val("empDireccion"),
      telefono:     val("empTelefono"),
      correo:       val("empCorreo"),
      sitioWeb:     val("empSitioWeb") || ""
    },
    // Representante / responsable
    responsable: {
      nombre:       val("repNombre"),
      tipoDoc:      val("repTipoDoc"),
      tipoDocLabel: labelSelect("repTipoDoc"),
      numDoc:       val("repNumDoc"),
      telefono:     val("repTelefono"),
      correo:       val("repCorreo"),
      cargo:        val("repCargo"),
      cargoLabel:   labelSelect("repCargo")
    },
    // Metadatos
    uid:          uidUsuario,
    emailCuenta:  emailUsuario,
    fechaEnvio:   new Date().toISOString()
  };
}

async function subirDocumentos(uid) {
  const storage = getStorage();
  const urls = {};
  const nombresAmigables = {
    docCamaraComercio: "camara-comercio",
    docRut:            "rut",
    docIdentidad:      "documento-identidad"
  };

  for (const [campo, archivo] of Object.entries(archivos)) {
    if (!archivo) continue;
    const ext = archivo.name.split(".").pop();
    const ruta = `solicitudesVendedor/${uid}/${nombresAmigables[campo]}.${ext}`;
    const ref = storageRef(storage, ruta);
    await uploadBytes(ref, archivo);
    urls[campo] = await getDownloadURL(ref);
  }

  return urls;
}

async function guardarSolicitud(datos, urlsDocumentos, iaResultado) {
  const solicitud = {
    ...datos,
    documentos: urlsDocumentos,
    ia: iaResultado,
    estado: "pendiente",
    estadoLabel: "Pendiente",
    fechaCreacion: serverTimestamp(),
    fechaActualizacion: serverTimestamp(),
    motivoRechazo: null,
    adminUid: null,
    adminNombre: null,
    fechaDecision: null
  };

  // Guardar en colección principal (id = uid del usuario)
  await setDoc(doc(db, "solicitudesVendedor", uidUsuario), solicitud);
}

/* ═══════════════ HELPERS UI ═══════════════ */
function mostrarMsg(html, tipo = "info") {
  msgEl.innerHTML = html;
  msgEl.className = `rv-msg is-${tipo}`;
  msgEl.removeAttribute("hidden");
  msgEl.hidden = false;
}

function setLoading(btn, si) {
  btn.disabled = si;
  btn.classList.toggle("is-loading", si);
}
