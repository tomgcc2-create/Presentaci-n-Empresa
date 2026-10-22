/**
 * PriceNice — verificacion-vendedor.js
 * Módulo de revisión IA para solicitudes de verificación de vendedores.
 *
 * La IA NO aprueba ni rechaza por sí sola.
 * Solo genera un análisis y recomendación para que el administrador decida.
 *
 * Recomendaciones posibles: "aprobar" | "rechazar" | "revisar_manual"
 */

import {
  collection, query, where, getDocs
} from "https://www.gstatic.com/firebasejs/11.6.0/firebase-firestore.js";

/* ═══════════════════════════════════════════════════════
   FUNCIÓN PRINCIPAL
   Recibe los datos del formulario, los archivos y la instancia de db.
   Devuelve un objeto { recomendacion, puntaje, observaciones[], resumen }
═══════════════════════════════════════════════════════ */
export async function revisarSolicitudIA(datos, archivos, db) {
  const observaciones = [];
  let puntaje = 100; // parte de 100 y va descontando por problemas

  // ─── 1. Validación de completitud de campos ───────────────
  const compEmpresa = revisarCompletitudEmpresa(datos.empresa, observaciones);
  const compResp    = revisarCompletitudResponsable(datos.responsable, observaciones);
  puntaje -= (10 - compEmpresa) * 4; // hasta -40 si la empresa está incompleta
  puntaje -= (6  - compResp)   * 5; // hasta -30 si el responsable está incompleto

  // ─── 2. Validación de formatos ────────────────────────────
  const problForma = revisarFormatos(datos, observaciones);
  puntaje -= problForma * 8;

  // ─── 3. Consistencia entre datos ─────────────────────────
  const problCons = revisarConsistencia(datos, observaciones);
  puntaje -= problCons * 10;

  // ─── 4. Verificar documentos adjuntos ─────────────────────
  const probDoc = revisarDocumentos(archivos, observaciones);
  puntaje -= probDoc * 12;

  // ─── 5. Detectar duplicados en Firestore ─────────────────
  const esDuplicado = await detectarDuplicados(datos, db, observaciones);
  if (esDuplicado) puntaje -= 40;

  // Clampear puntaje entre 0 y 100
  puntaje = Math.max(0, Math.min(100, puntaje));

  // ─── 6. Determinar recomendación ─────────────────────────
  let recomendacion;
  if (esDuplicado) {
    recomendacion = "rechazar";
  } else if (puntaje >= 80 && observaciones.filter(o => o.tipo === "error").length === 0) {
    recomendacion = "aprobar";
  } else if (puntaje >= 50) {
    recomendacion = "revisar_manual";
  } else {
    recomendacion = "rechazar";
  }

  // ─── 7. Generar resumen legible ───────────────────────────
  const resumen = generarResumen(recomendacion, puntaje, observaciones, datos);

  return {
    recomendacion,
    puntaje,
    observaciones,
    resumen,
    fechaRevision: new Date().toISOString(),
    version: "1.0"
  };
}

/* ═══════════════════════════════════════════════════════
   REVISORES INTERNOS
═══════════════════════════════════════════════════════ */

/**
 * Revisa que los campos obligatorios de la empresa estén presentes.
 * Devuelve el número de campos OK.
 */
function revisarCompletitudEmpresa(empresa, obs) {
  const CAMPOS = [
    { id: "razonSocial",  nombre: "Razón social" },
    { id: "nit",          nombre: "NIT" },
    { id: "tipoEmpresa",  nombre: "Tipo de empresa" },
    { id: "direccion",    nombre: "Dirección" },
    { id: "telefono",     nombre: "Teléfono de empresa" },
    { id: "correo",       nombre: "Correo de empresa" },
    { id: "tipoEmpresaLabel", nombre: null } // solo conteo, sin mensaje separado
  ];
  let ok = 0;
  CAMPOS.forEach(({ id, nombre }) => {
    if (empresa[id] && empresa[id] !== "—" && empresa[id].length > 1) {
      ok++;
    } else if (nombre) {
      obs.push({ tipo: "error", campo: "empresa." + id, mensaje: `Campo obligatorio incompleto: ${nombre}` });
    }
  });
  return ok;
}

function revisarCompletitudResponsable(resp, obs) {
  const CAMPOS = [
    { id: "nombre",    nombre: "Nombre del responsable" },
    { id: "tipoDoc",   nombre: "Tipo de documento" },
    { id: "numDoc",    nombre: "Número de documento" },
    { id: "telefono",  nombre: "Teléfono del responsable" },
    { id: "correo",    nombre: "Correo del responsable" },
    { id: "cargo",     nombre: "Cargo en la empresa" }
  ];
  let ok = 0;
  CAMPOS.forEach(({ id, nombre }) => {
    if (resp[id] && resp[id] !== "—" && resp[id].length > 0) {
      ok++;
    } else {
      obs.push({ tipo: "error", campo: "responsable." + id, mensaje: `Campo obligatorio incompleto: ${nombre}` });
    }
  });
  return ok;
}

/**
 * Revisa formatos de campos específicos.
 * Devuelve el número de problemas encontrados.
 */
function revisarFormatos(datos, obs) {
  let problemas = 0;
  const { empresa, responsable } = datos;

  // NIT: debe tener dígitos, puntos y guión. Al menos 9 dígitos.
  const nitSolo = (empresa.nit || "").replace(/[.\-\s]/g, "");
  if (nitSolo.length < 9 || !/^\d+$/.test(nitSolo)) {
    obs.push({ tipo: "advertencia", campo: "empresa.nit", mensaje: "El NIT tiene un formato inusual. Verifica que sea correcto." });
    problemas++;
  }

  // Correo empresa
  if (empresa.correo && !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(empresa.correo)) {
    obs.push({ tipo: "error", campo: "empresa.correo", mensaje: "El correo de la empresa no tiene un formato válido." });
    problemas++;
  }

  // Correo responsable
  if (responsable.correo && !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(responsable.correo)) {
    obs.push({ tipo: "error", campo: "responsable.correo", mensaje: "El correo del responsable no tiene un formato válido." });
    problemas++;
  }

  // Teléfonos: al menos 7 dígitos
  const telEmp = (empresa.telefono || "").replace(/\D/g, "");
  if (telEmp.length < 7) {
    obs.push({ tipo: "advertencia", campo: "empresa.telefono", mensaje: "El teléfono de la empresa parece muy corto." });
    problemas++;
  }
  const telRep = (responsable.telefono || "").replace(/\D/g, "");
  if (telRep.length < 7) {
    obs.push({ tipo: "advertencia", campo: "responsable.telefono", mensaje: "El teléfono del responsable parece muy corto." });
    problemas++;
  }

  // Número de documento: al menos 6 dígitos
  const numDocSolo = (responsable.numDoc || "").replace(/\D/g, "");
  if (numDocSolo.length < 6) {
    obs.push({ tipo: "advertencia", campo: "responsable.numDoc", mensaje: "El número de documento parece muy corto." });
    problemas++;
  }

  // Dirección: debe tener al menos una palabra y un número
  if (empresa.direccion && !/\d/.test(empresa.direccion)) {
    obs.push({ tipo: "info", campo: "empresa.direccion", mensaje: "La dirección no contiene número. Verificar si es completa." });
    problemas++;
  }

  return problemas;
}

/**
 * Revisa inconsistencias entre campos de empresa y responsable.
 */
function revisarConsistencia(datos, obs) {
  let problemas = 0;
  const { empresa, responsable } = datos;

  // Mismo correo de empresa y responsable puede ser OK (persona natural) pero lo anotamos
  if (empresa.correo && responsable.correo &&
      empresa.correo.toLowerCase() === responsable.correo.toLowerCase()) {
    obs.push({ tipo: "info", campo: "correos", mensaje: "El correo de la empresa y del responsable son iguales. Puede ser correcto en persona natural." });
  }

  // Mismo teléfono también puede ser legítimo pero lo anotamos
  if (empresa.telefono && responsable.telefono) {
    const te = empresa.telefono.replace(/\D/g, "");
    const tr = responsable.telefono.replace(/\D/g, "");
    if (te === tr) {
      obs.push({ tipo: "info", campo: "telefonos", mensaje: "El teléfono de la empresa y del responsable son iguales." });
    }
  }

  // Si el tipo de empresa no es "persona natural" pero el tipo de doc es CC (no NIT)
  if (empresa.tipoEmpresa && empresa.tipoEmpresa !== "persona_natural") {
    if (responsable.tipoDoc === "nit") {
      obs.push({ tipo: "info", campo: "tipo_empresa_doc", mensaje: "Empresa jurídica con NIT de persona natural. Verificar si corresponde." });
    }
  }

  // Razón social muy corta
  if (empresa.razonSocial && empresa.razonSocial.trim().split(" ").length === 1) {
    obs.push({ tipo: "info", campo: "empresa.razonSocial", mensaje: "La razón social tiene solo una palabra. Verificar si está completa." });
    problemas++;
  }

  return problemas;
}

/**
 * Verifica que los 3 documentos obligatorios estén adjuntos y tengan tamaño razonable.
 */
function revisarDocumentos(archivos, obs) {
  let problemas = 0;

  const checks = [
    { campo: "docCamaraComercio", nombre: "Cámara de comercio" },
    { campo: "docRut",            nombre: "RUT" },
    { campo: "docIdentidad",      nombre: "Documento de identidad" }
  ];

  checks.forEach(({ campo, nombre }) => {
    const archivo = archivos[campo];
    if (!archivo) {
      obs.push({ tipo: "error", campo, mensaje: `Documento obligatorio faltante: ${nombre}` });
      problemas++;
      return;
    }

    // Tamaño mínimo: archivos muy pequeños (< 10 KB) podrían ser inválidos
    if (archivo.size < 10 * 1024) {
      obs.push({ tipo: "advertencia", campo, mensaje: `${nombre}: El archivo es muy pequeño (${(archivo.size/1024).toFixed(1)} KB). Podría no ser legible.` });
      problemas++;
    }

    // Tipo de archivo
    const tiposOk = ["application/pdf", "image/jpeg", "image/png"];
    if (!tiposOk.includes(archivo.type)) {
      obs.push({ tipo: "error", campo, mensaje: `${nombre}: Tipo de archivo no permitido (${archivo.type}).` });
      problemas++;
    }
  });

  if (problemas === 0) {
    obs.push({ tipo: "ok", campo: "documentos", mensaje: "Todos los documentos obligatorios están adjuntos con formato válido." });
  }

  return problemas;
}

/**
 * Busca en Firestore si ya existe otra solicitud con el mismo NIT o número de documento.
 */
async function detectarDuplicados(datos, db, obs) {
  try {
    const nitLimpio = datos.empresa.nit.replace(/[.\-\s]/g, "").toLowerCase();
    const numDocLimpio = datos.responsable.numDoc.replace(/\D/g, "");

    const col = collection(db, "solicitudesVendedor");

    // Buscar por NIT
    const qNit = query(col, where("empresa.nit", ">=", ""), where("uid", "!=", datos.uid));
    const snapNit = await getDocs(qNit);
    for (const d of snapNit.docs) {
      if (d.id === datos.uid) continue;
      const nitExistente = (d.data().empresa?.nit || "").replace(/[.\-\s]/g, "").toLowerCase();
      if (nitExistente === nitLimpio && nitLimpio.length > 5) {
        obs.push({ tipo: "error", campo: "empresa.nit", mensaje: `⚠️ Solicitud duplicada: ya existe una solicitud con el mismo NIT (${datos.empresa.nit}).` });
        return true;
      }
      // Buscar por número de documento del responsable
      const numDocExistente = (d.data().responsable?.numDoc || "").replace(/\D/g, "");
      if (numDocExistente === numDocLimpio && numDocLimpio.length > 5) {
        obs.push({ tipo: "error", campo: "responsable.numDoc", mensaje: `⚠️ Solicitud duplicada: ya existe una solicitud con el mismo número de documento del responsable.` });
        return true;
      }
    }

    return false;
  } catch (err) {
    // Si falla la consulta (permisos, offline, etc.), no bloqueamos
    obs.push({ tipo: "info", campo: "duplicados", mensaje: "No se pudo verificar duplicados en este momento." });
    return false;
  }
}

/* ═══════════════════════════════════════════════════════
   GENERADOR DE RESUMEN TEXTUAL
═══════════════════════════════════════════════════════ */
function generarResumen(recomendacion, puntaje, observaciones, datos) {
  const errores   = observaciones.filter(o => o.tipo === "error").length;
  const advertencias = observaciones.filter(o => o.tipo === "advertencia").length;
  const infos     = observaciones.filter(o => o.tipo === "info").length;

  const iconRec = { aprobar: "✅", rechazar: "❌", revisar_manual: "⚠️" };
  const labelRec = { aprobar: "APROBAR", rechazar: "RECHAZAR", revisar_manual: "REVISIÓN MANUAL" };

  let resumen = `Análisis IA — Solicitud de ${datos.empresa.razonSocial} (NIT: ${datos.empresa.nit})\n`;
  resumen += `Responsable: ${datos.responsable.nombre} (${datos.responsable.tipoDocLabel} ${datos.responsable.numDoc})\n\n`;
  resumen += `Puntaje de confianza: ${puntaje}/100\n`;
  resumen += `Recomendación: ${iconRec[recomendacion]} ${labelRec[recomendacion]}\n\n`;

  if (errores > 0) {
    resumen += `Problemas críticos encontrados (${errores}):\n`;
    observaciones.filter(o => o.tipo === "error").forEach(o => { resumen += `  • ${o.mensaje}\n`; });
    resumen += "\n";
  }

  if (advertencias > 0) {
    resumen += `Advertencias (${advertencias}):\n`;
    observaciones.filter(o => o.tipo === "advertencia").forEach(o => { resumen += `  • ${o.mensaje}\n`; });
    resumen += "\n";
  }

  if (infos > 0) {
    resumen += `Notas informativas (${infos}):\n`;
    observaciones.filter(o => o.tipo === "info").forEach(o => { resumen += `  • ${o.mensaje}\n`; });
    resumen += "\n";
  }

  if (recomendacion === "aprobar") {
    resumen += "La solicitud parece completa y consistente. Se recomienda aprobar, sujeto a revisión final del administrador.";
  } else if (recomendacion === "revisar_manual") {
    resumen += "La solicitud tiene algunas observaciones que requieren atención. Se recomienda revisar manualmente antes de decidir.";
  } else {
    resumen += "La solicitud presenta problemas críticos o es un duplicado. Se recomienda rechazar o solicitar correcciones al usuario.";
  }

  return resumen;
}

/* ═══════════════════════════════════════════════════════
   HELPERS EXPORTADOS para uso en admin-vendedores.js
═══════════════════════════════════════════════════════ */

/** Devuelve el color asociado a una recomendación */
export function colorRecomendacion(rec) {
  return { aprobar: "#7AFF50", rechazar: "#FF4D4D", revisar_manual: "#FFB830" }[rec] || "#A0A0A0";
}

/** Devuelve el ícono Bootstrap asociado a un estado de solicitud */
export function iconoEstado(estado) {
  return {
    pendiente:   "bi-clock",
    en_revision: "bi-eye",
    aprobada:    "bi-check-circle-fill",
    rechazada:   "bi-x-circle-fill"
  }[estado] || "bi-question-circle";
}
