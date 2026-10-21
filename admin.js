import { db, firebaseConfig } from "./firebase-config.js";
import { initializeApp, getApps } from "https://www.gstatic.com/firebasejs/11.6.0/firebase-app.js";
import {
    getAuth,
    createUserWithEmailAndPassword,
    updateProfile,
    signOut
} from "https://www.gstatic.com/firebasejs/11.6.0/firebase-auth.js";
import {
    collection,
    getDocs,
    doc,
    setDoc,
    updateDoc,
    serverTimestamp
} from "https://www.gstatic.com/firebasejs/11.6.0/firebase-firestore.js";
import { observarSesion, obtenerRol, mensajeError, actualizarVerificacion } from "./auth.js";
import { initSettings } from "./settings.js";

const contenido = document.getElementById("contenido");
const aviso = document.getElementById("aviso");
const tituloFormulario = document.getElementById("tituloFormulario");
const formulario = document.getElementById("formUsuario");
const idUsuario = document.getElementById("idUsuario");
const nombre = document.getElementById("nombre");
const email = document.getElementById("email");
const password = document.getElementById("password");
const rol = document.getElementById("rol");
const guardar = document.getElementById("guardar");
const cancelar = document.getElementById("cancelar");
const mensaje = document.getElementById("mensaje");
const listaUsuarios = document.getElementById("listaUsuarios");

const usuarios = collection(db, "usuarios");

let uidActual = null;
function authSecundaria() {
    const existente = getApps().find(instancia => instancia.name === "secundaria");
    return getAuth(existente || initializeApp(firebaseConfig, "secundaria"));
}

async function crearUsuario(datos) {
    const secundaria = authSecundaria();

    const credencial = await createUserWithEmailAndPassword(secundaria, datos.email, datos.password);
    await updateProfile(credencial.user, { displayName: datos.nombre });
    await signOut(secundaria);

    const perfil = {
        nombre: datos.nombre,
        email: datos.email,
        rol: datos.rol,
        activo: true
    };

    // Si el admin crea un vendedor, lo marca como verificado directamente
    if (datos.rol === "vendedor") {
        perfil.verificacion = "verificado";
        perfil.verificado = true;
        perfil.verificadoEn = serverTimestamp();
    }

    await setDoc(doc(db, "usuarios", credencial.user.uid), perfil);
}

async function listarUsuarios() {
    const instantanea = await getDocs(usuarios);
    return instantanea.docs.map(documento => ({ uid: documento.id, ...documento.data() }));
}

async function actualizarUsuario(uid, datos) {
    await updateDoc(doc(db, "usuarios", uid), datos);
}

/* Desactiva la cuenta (no borra solo el perfil): auth.js impide el ingreso de cuentas con activo === false.
   Borrar la cuenta de Authentication requiere el Admin SDK (Cloud Function) o la consola de Firebase. */
async function desactivarUsuario(uid) {
    await updateDoc(doc(db, "usuarios", uid), { activo: false, desactivadoEn: serverTimestamp() });
}

async function reactivarUsuario(uid) {
    await updateDoc(doc(db, "usuarios", uid), { activo: true, desactivadoEn: null });
}

function mostrar(texto, tipo = "error") {
    mensaje.textContent = texto;
    mensaje.className = "mensaje " + (texto ? tipo : "");
}
function modoNuevo() {
    formulario.reset();
    idUsuario.value = "";
    email.disabled = false;
    password.disabled = false;
    password.required = true;
    tituloFormulario.textContent = "Agregar usuario";
    guardar.textContent = "Agregar usuario";
    cancelar.hidden = true;
}

function modoEditar(usuario) {
    idUsuario.value = usuario.uid;
    nombre.value = usuario.nombre || "";
    email.value = usuario.email || "";
    password.value = "";
    rol.value = usuario.rol || "usuario";
    email.disabled = true;
    password.disabled = true;
    password.required = false;
    tituloFormulario.textContent = "Editar usuario";
    guardar.textContent = "Guardar cambios";
    cancelar.hidden = false;
    nombre.focus();
    mostrar("El correo y la contraseña no se pueden cambiar desde aquí.", "info");
}

function celda(texto) {
    const td = document.createElement("td");
    td.textContent = texto;
    return td;
}

function filaVacia(texto) {
    const tr = document.createElement("tr");
    const td = document.createElement("td");
    td.colSpan = 5;
    td.textContent = texto;
    tr.appendChild(td);
    return tr;
}

function fila(usuario) {
    const tr = document.createElement("tr");
    const esYo = usuario.uid === uidActual;
    const esVendedor = usuario.rol === "vendedor";

    tr.appendChild(celda((usuario.nombre || "-") + (esYo ? " (tú)" : "")));
    tr.appendChild(celda(usuario.email || "-"));
    tr.appendChild(celda((usuario.rol || "usuario") + (usuario.activo === false ? " (desactivado)" : "")));

    // Columna de verificación
    const celdaVerif = document.createElement("td");
    if (esVendedor) {
        const estado = usuario.verificacion || (usuario.verificado ? "verificado" : "sin_verificar");
        if (estado === "pendiente" || estado === "sin_verificar") {
            const badge = document.createElement("span");
            badge.className = "verif-badge pendiente";
            badge.textContent = "Pendiente";
            celdaVerif.appendChild(badge);
        } else if (estado === "verificado" || usuario.verificado) {
            const badge = document.createElement("span");
            badge.className = "verif-badge verificado";
            badge.textContent = "Verificado";
            celdaVerif.appendChild(badge);
        } else if (estado === "rechazado") {
            const badge = document.createElement("span");
            badge.className = "verif-badge rechazado";
            badge.textContent = "Rechazado";
            celdaVerif.appendChild(badge);
        } else {
            celdaVerif.textContent = "—";
        }
    } else {
        celdaVerif.textContent = "—";
    }
    tr.appendChild(celdaVerif);

    const acciones = document.createElement("td");

    const editar = document.createElement("button");
    editar.className = "boton-fila";
    editar.textContent = "Editar";
    editar.addEventListener("click", () => modoEditar(usuario));
    acciones.appendChild(editar);

    // Botón de verificación para vendedores pendientes
    if (esVendedor && (usuario.verificacion === "pendiente" || (!usuario.verificacion && !usuario.verificado))) {
        const verificar = document.createElement("button");
        verificar.className = "boton-fila verificar";
        verificar.textContent = "Verificar";
        verificar.addEventListener("click", () => abrirModalVerificacion(usuario));
        acciones.appendChild(verificar);
    }

if (!esYo) {
    const inactivo = usuario.activo === false;
    const estado = document.createElement("button");
    estado.className = "boton-fila" + (inactivo ? "" : " peligro");
    estado.textContent = inactivo ? "Reactivar" : "Desactivar";
    estado.addEventListener("click", async () => {
        const pregunta = inactivo
            ? '¿Reactivar la cuenta de "' + (usuario.nombre || usuario.email) + '"?'
            : '¿Desactivar la cuenta de "' + (usuario.nombre || usuario.email) + '"? No podrá iniciar sesión.';
        if (!confirm(pregunta)) return;
        try {
            if (inactivo) await reactivarUsuario(usuario.uid); else await desactivarUsuario(usuario.uid);
            mostrar(inactivo ? "Cuenta reactivada." : "Cuenta desactivada: ya no podrá iniciar sesión.", "info");
            await pintarUsuarios();
        } catch (error) {
            mostrar("No se pudo completar la acción: " + error.message);
        }
    });
    acciones.appendChild(estado);
}

tr.appendChild(acciones);
return tr;
}

async function pintarUsuarios() {
    listaUsuarios.replaceChildren();

    try {
        const lista = await listarUsuarios();

        if (!lista.length) {
            listaUsuarios.appendChild(filaVacia("Todavía no hay usuarios registrados."));
            return;
        }

        lista.forEach(usuario => listaUsuarios.appendChild(fila(usuario)));
    } catch (error) {
        listaUsuarios.appendChild(filaVacia("No se pudieron cargar los usuarios."));
    }
}

formulario.addEventListener("submit", async evento => {
    evento.preventDefault();
    guardar.disabled = true;

    try {
        if (idUsuario.value) {
            await actualizarUsuario(idUsuario.value, {
                nombre: nombre.value.trim(),
                rol: rol.value
            });
            mostrar("Usuario actualizado.", "info");
        } else {
            await crearUsuario({
                nombre: nombre.value.trim(),
                email: email.value.trim(),
                password: password.value,
                rol: rol.value
            });
            mostrar("Usuario creado.", "info");
        }

        modoNuevo();
        await pintarUsuarios();
    } catch (error) {
        mostrar(mensajeError(error));
    }

    guardar.disabled = false;
});

cancelar.addEventListener("click", () => {
    modoNuevo();
    mostrar("");
});
/* ───────────────── Modal de verificación de vendedor ───────────────── */
const modalVerif = document.getElementById("modalVerificacion");
const detalleVendedor = document.getElementById("detalleVendedor");
const btnAprobar = document.getElementById("btnAprobar");
const btnRechazar = document.getElementById("btnRechazar");
const btnCerrarVerif = document.getElementById("cerrarVerif");
const verifNota = document.getElementById("verifNota");

let vendedorActual = null;

function abrirModalVerificacion(usuario) {
    vendedorActual = usuario;
    const vd = usuario.vendedor || {};
    const ti = usuario.tienda || {};
    const docTipos = { CC: "Cédula de ciudadanía", CE: "Cédula de extranjería", NIT: "NIT", PPT: "Permiso por Protección Temporal" };
    const categorias = { moda:"Moda", tecnologia:"Tecnología", hogar:"Hogar", mercado:"Mercado", belleza:"Belleza", higiene:"Higiene", mascotas:"Mascotas", alimentos:"Alimentos", otros:"Otros" };

    detalleVendedor.innerHTML = `
        <div class="vd-grupo">
            <div class="vd-grupo-tit">Datos del vendedor</div>
            <div class="vd-item"><label>Nombre</label><span>${(usuario.nombre || "")} ${(usuario.apellido || "")}</span></div>
            <div class="vd-item"><label>Correo</label><span>${usuario.email || "—"}</span></div>
            <div class="vd-item"><label>Teléfono</label><span>${vd.telefono || "—"}</span></div>
            <div class="vd-item"><label>Documento</label><span>${docTipos[vd.tipoDocumento] || vd.tipoDocumento || "—"} ${vd.numeroDocumento || ""}</span></div>
        </div>
        <div class="vd-grupo">
            <div class="vd-grupo-tit">Datos de la tienda</div>
            <div class="vd-item"><label>Tienda</label><span>${ti.nombre || "—"}</span></div>
            <div class="vd-item"><label>Categoría</label><span>${categorias[ti.categoria] || ti.categoria || "—"}</span></div>
            <div class="vd-item"><label>Dirección</label><span>${ti.direccion || "—"}</span></div>
            <div class="vd-item"><label>Barrio / zona</label><span>${ti.barrio || "—"}</span></div>
            <div class="vd-item"><label>Ciudad</label><span>${ti.ciudad || "Bogotá"}</span></div>
            <div class="vd-item"><label>Descripción</label><span>${ti.descripcion || "—"}</span></div>
        </div>
        ${vd.iaNota ? `<div class="vd-ia"><b>Valoración de la IA</b>${vd.iaNota}</div>` : ""}
    `;

    verifNota.value = "";
    modalVerif.hidden = false;
}

function cerrarModalVerif() {
    modalVerif.hidden = true;
    vendedorActual = null;
}

btnCerrarVerif.addEventListener("click", cerrarModalVerif);
modalVerif.addEventListener("click", (e) => { if (e.target === modalVerif) cerrarModalVerif(); });

btnAprobar.addEventListener("click", async () => {
    if (!vendedorActual) return;
    btnAprobar.disabled = true;
    try {
        await actualizarVerificacion(vendedorActual.uid, "verificado", verifNota.value.trim());
        mostrar("Vendedor verificado correctamente.", "info");
        cerrarModalVerif();
        await pintarUsuarios();
    } catch (error) {
        mostrar("No se pudo verificar: " + error.message);
    }
    btnAprobar.disabled = false;
});

btnRechazar.addEventListener("click", async () => {
    if (!vendedorActual) return;
    const nota = verifNota.value.trim() || "Datos insuficientes o incorrectos";
    btnRechazar.disabled = true;
    try {
        await actualizarVerificacion(vendedorActual.uid, "rechazado", nota);
        mostrar("Vendedor rechazado.", "info");
        cerrarModalVerif();
        await pintarUsuarios();
    } catch (error) {
        mostrar("No se pudo completar: " + error.message);
    }
    btnRechazar.disabled = false;
});

observarSesion(async usuario => {
    if (!usuario) {
        window.location.href = "login.html";
        return;
    }

    uidActual = usuario.uid;

    let rolActual;

    try {
        rolActual = await obtenerRol(usuario.uid);
    } catch (error) {
        rolActual = "usuario";
    }

    if (rolActual !== "admin") {
        aviso.hidden = false;
        contenido.hidden = true;
        return;
    }

    aviso.hidden = true;
    contenido.hidden = false;

    initSettings();
    await pintarUsuarios();
});