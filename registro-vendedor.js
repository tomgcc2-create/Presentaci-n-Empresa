/**
 * PriceNice — registro-vendedor.js
 * Lógica del formulario multi-paso de verificación de vendedor.
 * Pasos: 1-Datos personales · 2-Tienda · 3-Empresa/Docs · 4-Confirmación
 */

import { auth, db } from "./firebase-config.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/11.6.0/firebase-auth.js";
import {
  doc, setDoc, getDoc, collection, query, where, getDocs, serverTimestamp
} from "https://www.gstatic.com/firebasejs/11.6.0/firebase-firestore.js";
import {
  getStorage, ref as storageRef, uploadBytes, getDownloadURL
} from "https://www.gstatic.com/firebasejs/11.6.0/firebase-storage.js";
import { revisarSolicitudIA } from "./verificacion-vendedor.js";

/* ═══════════ ESTADO ═══════════ */
let paso = 1;
const PASOS = 4;
let uidUsuario  = null;
let emailUsuario = null;

const archivos = {
  docCamaraComercio: null,
  docRut:            null,
  docIdentidad:      null
};

/* ═══════════ DOM ═══════════ */
const $ = id => document.getElementById(id);
const form        = $("rvForm");
const progressFill = $("rvProgressFill");
const msgEl       = $("rvMsg");
const successEl   = $("rvSuccess");
const btnEnviar   = $("btnEnviar");

/* ═══════════ SESIÓN ═══════════ */
onAuthStateChanged(auth, usuario => {
  if (!usuario) {
    window.location.href = "login.html?rol=vendedor";
    return;
  }
  uidUsuario   = usuario.uid;
  emailUsuario  = usuario.email;

  // Pre-rellenar correo en paso 1
  const rc = $("repCorreo");
  if (rc && !rc.value) rc.value = emailUsuario || "";

  verificarSolicitudExistente();
});

async function verificarSolicitudExistente() {
  try {
    const snap = await getDoc(doc(db, "solicitudesVendedor", uidUsuario));
    if (!snap.exists()) return;
    const { estado, motivoRechazo } = snap.data();
    if (estado === "aprobada") {
      mostrarMsg("Tu solicitud ya fue aprobada. Ya eres vendedor en PriceNice. 🎉", "ok");
    } else if (estado === "pendiente" || estado === "en_revision") {
      mostrarMsg(
        `Tu solicitud está <strong>${labelEstado(estado)}</strong>. Recibirás un correo cuando haya una decisión.`,
        "warn"
      );
      if (btnEnviar) btnEnviar.disabled = true;
    } else if (estado === "rechazada") {
      mostrarMsg(
        `Tu solicitud anterior fue <strong>rechazada</strong>. Motivo: ${motivoRechazo || "Sin especificar"}.<br>Corrige los datos y reenvía.`,
        "err"
      );
    }
  } catch { /* sin solicitud previa — normal */ }
}

function labelEstado(e) {
  return { pendiente: "Pendiente", en_revision: "En revisión", aprobada: "Aprobada", rechazada: "Rechazada" }[e] || e;
}

/* ═══════════ NAVEGACIÓN DE PASOS ═══════════ */
function irAPaso(nuevo, retroceso = false) {
  const panelViejo = $(`rvPanel${paso}`);
  const panelNuevo = $(`rvPanel${nuevo}`);

  panelViejo.classList.remove("is-active");
  panelViejo.inert = true;

  if (retroceso) panelNuevo.classList.add("slide-back");
  else panelNuevo.classList.remove("slide-back");

  panelNuevo.classList.add("is-active");
  panelNuevo.removeAttribute("inert");

  // Indicadores de paso
  const stepViejo = $(`rvStep${paso}`);
  const stepNuevo = $(`rvStep${nuevo}`);
  stepViejo.setAttribute("aria-current", "");

  if (retroceso) {
    stepViejo.classList.remove("is-active", "is-done");
  } else {
    stepViejo.classList.remove("is-active");
    stepViejo.classList.add("is-done");
  }
  stepNuevo.classList.remove("is-done");
  stepNuevo.classList.add("is-active");
  stepNuevo.setAttribute("aria-current", "step");

  // Líneas entre pasos
  for (let i = 1; i < PASOS; i++) {
    const linea = $(`rvLine${i}`);
    if (linea) linea.classList.toggle("is-done", i < nuevo);
  }

  // Barra de progreso
  progressFill.style.width = `${(nuevo / PASOS) * 100}%`;

  paso = nuevo;
  if (nuevo === 4) construirResumen();
  window.scrollTo({ top: 0, behavior: "smooth" });
}

/* Botones */
$("btnNext1").addEventListener("click", () => { if (validarPaso1()) irAPaso(2); });
$("btnBack2").addEventListener("click", () => irAPaso(1, true));
$("btnNext2").addEventListener("click", () => { if (validarPaso2()) irAPaso(3); });
$("btnBack3").addEventListener("click", () => irAPaso(2, true));
$("btnNext3").addEventListener("click", () => { if (validarPaso3()) irAPaso(4); });
$("btnBack4").addEventListener("click", () => irAPaso(3, true));

/* ═══════════ VALIDACIONES ═══════════ */
const correoOk  = c => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(c);
const telefonoOk = t => /^[+\d][\d\s\-(). ]{6,19}$/.test(t.trim());

function setErr(id, msg) {
  const el = $(`err-${id}`); if (!el) return;
  el.textContent = msg || "";
  const campo = el.closest(".rv-field, .rv-doc-card");
  if (campo) campo.classList.toggle("has-err", !!msg);
  // Marcar el input / select directamente
  const inp = el.previousElementSibling || (el.closest(".rv-field") && el.closest(".rv-field").querySelector(".rv-input, .rv-select, .rv-textarea"));
  if (inp) inp.classList.toggle("has-err", !!msg);
}
const clrErr = id => setErr(id, "");

function validarPaso1() {
  let ok = true;
  const v = (id, test, msg) => {
    const val = ($(id)?.value || "").trim();
    if (!test(val)) { setErr(id, msg); ok = false; } else clrErr(id);
  };
  v("repNombre",   s => s.split(" ").filter(Boolean).length >= 2, "Escribe nombre y apellido");
  v("repTipoDoc",  s => s.length > 0,   "Selecciona el tipo de documento");
  v("repNumDoc",   s => /^\d{5,15}$/.test(s.replace(/\D/g, "")), "Número de documento inválido");
  v("repTelefono", telefonoOk,           "Ingresa un teléfono válido");
  v("repCorreo",   correoOk,             "Ingresa un correo válido");
  v("repCargo",    s => s.length > 0,   "Selecciona tu cargo");
  if (!ok) focusPrimerError();
  return ok;
}

function validarPaso2() {
  let ok = true;
  const v = (id, test, msg) => {
    const val = ($(id)?.value || "").trim();
    if (!test(val)) { setErr(id, msg); ok = false; } else clrErr(id);
  };
  v("tNombre",   s => s.length >= 3,  "Escribe el nombre de tu tienda (mín. 3 caracteres)");
  v("tCategoria",s => s.length > 0,   "Selecciona una categoría");
  v("tBarrio",   s => s.length >= 3,  "Escribe el barrio o zona");
  v("tDireccion",s => s.length >= 5,  "Escribe la dirección de tu tienda");
  v("tDesc",     s => s.length >= 20, "Describe tu tienda (mínimo 20 caracteres)");
  if (!ok) focusPrimerError();
  return ok;
}

function validarPaso3() {
  let ok = true;
  const v = (id, test, msg) => {
    const val = ($(id)?.value || "").trim();
    if (!test(val)) { setErr(id, msg); ok = false; } else clrErr(id);
  };
  v("empRazon", s => s.length >= 3,  "Escribe la razón social");
  v("empNit",   s => /[\d.,\-]{5,}/.test(s), "Formato de NIT inválido");
  v("empTipo",  s => s.length > 0,   "Selecciona el tipo de empresa");

  // Documentos
  [
    ["docCamaraComercio", "docCamaraComercio", "La cámara de comercio es obligatoria"],
    ["docRut",            "docRut",             "El RUT es obligatorio"],
    ["docIdentidad",      "docIdentidad",       "El documento de identidad es obligatorio"]
  ].forEach(([campo, id, msg]) => {
    if (!archivos[campo]) { setErr(id, msg); ok = false; } else clrErr(id);
  });

  if (!ok) focusPrimerError();
  return ok;
}

function focusPrimerError() {
  const el = form.querySelector(".has-err input, .has-err select, .has-err textarea");
  if (el) { el.scrollIntoView({ block: "center", behavior: "smooth" }); el.focus(); }
}

// Limpiar error al editar
document.querySelectorAll(".rv-input, .rv-select, .rv-textarea").forEach(el => {
  el.addEventListener("input",  () => el.classList.remove("has-err"));
  el.addEventListener("change", () => el.classList.remove("has-err"));
});

// Contador de caracteres de la descripción
$("tDesc")?.addEventListener("input", () => {
  const n = ($("tDesc").value || "").length;
  if ($("tDescCount")) $("tDescCount").textContent = n;
});

/* ═══════════ UPLOAD DE DOCUMENTOS ═══════════ */
const uploadZonas = [
  { zoneId: "zoneCC",  inputId: "docCamaraComercio", previewId: "previewCC",  campo: "docCamaraComercio" },
  { zoneId: "zoneRUT", inputId: "docRut",             previewId: "previewRUT", campo: "docRut" },
  { zoneId: "zoneDoc", inputId: "docIdentidad",       previewId: "previewDoc", campo: "docIdentidad" }
];

const TIPOS_OK  = ["application/pdf", "image/jpeg", "image/png"];
const MAX_BYTES = 5 * 1024 * 1024;

uploadZonas.forEach(({ zoneId, inputId, previewId, campo }) => {
  const zone    = $(zoneId);
  const input   = $(inputId);
  const preview = $(previewId);
  if (!zone || !input || !preview) return;

  input.addEventListener("change", () => {
    if (input.files[0]) procesarArchivo(input.files[0], zone, preview, campo);
  });
  zone.addEventListener("dragover",  e => { e.preventDefault(); zone.classList.add("rv-drag-over"); });
  zone.addEventListener("dragleave", ()  => zone.classList.remove("rv-drag-over"));
  zone.addEventListener("drop", e => {
    e.preventDefault();
    zone.classList.remove("rv-drag-over");
    if (e.dataTransfer.files[0]) procesarArchivo(e.dataTransfer.files[0], zone, preview, campo);
  });
});

function procesarArchivo(file, zone, preview, campo) {
  clrErr(campo);
  if (!TIPOS_OK.includes(file.type)) { setErr(campo, "Solo PDF, JPG o PNG"); return; }
  if (file.size > MAX_BYTES)         { setErr(campo, "El archivo supera los 5 MB"); return; }

  archivos[campo] = file;
  zone.classList.add("is-done");

  const icono = file.type === "application/pdf" ? "bi-file-earmark-pdf" : "bi-file-earmark-image";
  const mb    = (file.size / 1024 / 1024).toFixed(2);

  preview.hidden = false;
  preview.innerHTML = `
    <div class="rv-preview-icon"><i class="bi ${icono}"></i></div>
    <span class="rv-preview-name" title="${esc(file.name)}">${esc(file.name)}</span>
    <span class="rv-preview-size">${mb} MB</span>
    <button type="button" class="rv-preview-rm" aria-label="Quitar archivo">
      <i class="bi bi-x-lg"></i>
    </button>`;

  preview.querySelector(".rv-preview-rm").addEventListener("click", e => {
    e.stopPropagation();
    archivos[campo] = null;
    zone.classList.remove("is-done");
    preview.hidden = true;
    preview.innerHTML = "";
    // Resetear el input para que el mismo archivo se pueda volver a seleccionar
    const input = zone.querySelector(".rv-file-input");
    if (input) input.value = "";
  });
}

/* ═══════════ RESUMEN (paso 4) ═══════════ */
const val      = id => ($(id)?.value || "").trim() || "—";
const labelSel = id => {
  const el = $(id); if (!el) return "—";
  return el.options[el.selectedIndex]?.text || "—";
};

function construirResumen() {
  const c = $("rvSummary");
  if (!c) return;

  const secciones = [
    {
      titulo: "👤 Datos personales",
      items: [
        { l: "Nombre",          v: val("repNombre") },
        { l: "Tipo doc.",       v: labelSel("repTipoDoc") },
        { l: "Nº documento",    v: val("repNumDoc") },
        { l: "Teléfono",        v: val("repTelefono") },
        { l: "Correo",          v: val("repCorreo") },
        { l: "Cargo",           v: labelSel("repCargo") }
      ]
    },
    {
      titulo: "🛍️ Tu tienda",
      items: [
        { l: "Nombre",      v: val("tNombre") },
        { l: "Categoría",   v: labelSel("tCategoria") },
        { l: "Barrio",      v: val("tBarrio") },
        { l: "Dirección",   v: val("tDireccion") },
        { l: "Descripción", v: val("tDesc") }
      ]
    },
    {
      titulo: "🏢 Empresa",
      items: [
        { l: "Razón social", v: val("empRazon") },
        { l: "NIT",          v: val("empNit") },
        { l: "Tipo",         v: labelSel("empTipo") }
      ]
    }
  ];

  const docsAdjuntos = [
    archivos.docCamaraComercio && { nombre: "Cámara de comercio" },
    archivos.docRut             && { nombre: "RUT" },
    archivos.docIdentidad       && { nombre: "Doc. identidad" }
  ].filter(Boolean);

  c.innerHTML = secciones.map(s => `
    <div class="rv-sum-section">
      <h3 class="rv-sum-title">${s.titulo}</h3>
      <div class="rv-sum-grid">
        ${s.items.map(i => `
          <div class="rv-sum-item">
            <span class="rv-sum-lbl">${esc(i.l)}</span>
            <span class="rv-sum-val">${esc(i.v)}</span>
          </div>`).join("")}
      </div>
    </div>
  `).join("") + `
    <div class="rv-sum-section">
      <h3 class="rv-sum-title">📎 Documentos</h3>
      <div class="rv-sum-docs">
        ${docsAdjuntos.map(d =>
          `<span class="rv-sum-doc"><i class="bi bi-file-earmark-check"></i>${esc(d.nombre)}</span>`
        ).join("")}
      </div>
    </div>`;
}

/* ═══════════ ENVÍO ═══════════ */
form.addEventListener("submit", async e => {
  e.preventDefault();

  if (!$("rvTerminos").checked) {
    setErr("rvTerminos", "Debes aceptar los términos para continuar");
    return;
  }
  clrErr("rvTerminos");

  setLoading(btnEnviar, true);
  mostrarMsg("Validando información…", "info");

  try {
    const datos = recopilarDatos();

    mostrarMsg("Analizando tu solicitud con IA…", "info");
    const iaResultado = await revisarSolicitudIA(datos, archivos, db);

    mostrarMsg("Subiendo documentos de forma segura…", "info");
    const urlsDocs = await subirDocumentos();

    mostrarMsg("Registrando solicitud…", "info");
    await guardarSolicitud(datos, urlsDocs, iaResultado);

    // Éxito
    form.hidden = true;
    $("rvProgressWrap").hidden = true;
    successEl.hidden = false;
    window.scrollTo({ top: 0, behavior: "smooth" });

  } catch (err) {
    console.error(err);
    mostrarMsg(`Error al enviar: ${err.message || err}. Verifica tu conexión e intenta de nuevo.`, "err");
    setLoading(btnEnviar, false);
  }
});

function recopilarDatos() {
  return {
    responsable: {
      nombre:       val("repNombre"),
      tipoDoc:      val("repTipoDoc"),
      tipoDocLabel: labelSel("repTipoDoc"),
      numDoc:       val("repNumDoc"),
      telefono:     val("repTelefono"),
      correo:       val("repCorreo"),
      cargo:        val("repCargo"),
      cargoLabel:   labelSel("repCargo")
    },
    tienda: {
      nombre:      val("tNombre"),
      categoria:   val("tCategoria"),
      categoriaLabel: labelSel("tCategoria"),
      barrio:      val("tBarrio"),
      direccion:   val("tDireccion"),
      descripcion: val("tDesc")
    },
    empresa: {
      razonSocial:  val("empRazon"),
      nit:          val("empNit").replace(/\s/g, ""),
      tipoEmpresa:  val("empTipo"),
      tipoEmpresaLabel: labelSel("empTipo")
    },
    uid:         uidUsuario,
    emailCuenta: emailUsuario,
    fechaEnvio:  new Date().toISOString()
  };
}

async function subirDocumentos() {
  const storage = getStorage();
  const urls = {};
  const nombres = {
    docCamaraComercio: "camara-comercio",
    docRut:            "rut",
    docIdentidad:      "doc-identidad"
  };
  for (const [campo, archivo] of Object.entries(archivos)) {
    if (!archivo) continue;
    const ext  = archivo.name.split(".").pop();
    const ruta = `solicitudesVendedor/${uidUsuario}/${nombres[campo]}.${ext}`;
    const ref  = storageRef(storage, ruta);
    await uploadBytes(ref, archivo);
    urls[campo] = await getDownloadURL(ref);
  }
  return urls;
}

async function guardarSolicitud(datos, urlsDocs, iaResultado) {
  await setDoc(doc(db, "solicitudesVendedor", uidUsuario), {
    ...datos,
    documentos:          urlsDocs,
    ia:                  iaResultado,
    estado:              "pendiente",
    estadoLabel:         "Pendiente",
    fechaCreacion:       serverTimestamp(),
    fechaActualizacion:  serverTimestamp(),
    motivoRechazo:       null,
    adminUid:            null,
    adminNombre:         null,
    fechaDecision:       null
  });
}

/* ═══════════ HELPERS ═══════════ */
function mostrarMsg(html, tipo = "info") {
  msgEl.innerHTML = html;
  msgEl.className = `rv-msg is-${tipo}`;
  msgEl.hidden = false;
}
function setLoading(btn, si) {
  btn.disabled = si;
  btn.classList.toggle("is-loading", si);
}
function esc(s) {
  return String(s || "")
    .replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;");
}
