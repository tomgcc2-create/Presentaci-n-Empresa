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
    deleteDoc
} from "https://www.gstatic.com/firebasejs/11.6.0/firebase-firestore.js";
import { observarSesion, obtenerRol, mensajeError } from "./auth.js";
import { initSettings } from "./settings.js";

const contenido = document.getElementById("contenido");
const aviso = document.getElementById("aviso");
// tituloFormulario puede no existir en versiones nuevas del admin — usamos guardarTxt
const tituloFormulario = document.getElementById("tituloFormulario") || { textContent: "" };
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

    await setDoc(doc(db, "usuarios", credencial.user.uid), {
        nombre: datos.nombre,
        email: datos.email,
        rol: datos.rol
    });
}

async function listarUsuarios() {
    const instantanea = await getDocs(usuarios);
    return instantanea.docs.map(documento => ({ uid: documento.id, ...documento.data() }));
}

async function actualizarUsuario(uid, datos) {
    await updateDoc(doc(db, "usuarios", uid), datos);
}

async function eliminarUsuario(uid) {
    await deleteDoc(doc(db, "usuarios", uid));
}

function mostrar(texto, tipo = "error") {
    if (!mensaje) return;
    mensaje.textContent = texto;
    // Compatible con clase adm-msg (nuevo HTML) y clase mensaje (legacy)
    mensaje.className = "mensaje adm-msg " + (texto ? tipo : "");
    mensaje.style.display = texto ? "block" : "none";
}
const _guardarTxt = () => document.getElementById("guardarTxt") || guardar;
function modoNuevo() {
    formulario.reset();
    idUsuario.value = "";
    email.disabled = false;
    password.disabled = false;
    password.required = true;
    tituloFormulario.textContent = "Agregar usuario";
    _guardarTxt().textContent = "Agregar usuario";
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
    _guardarTxt().textContent = "Guardar cambios";
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
    td.colSpan = 4;
    td.textContent = texto;
    tr.appendChild(td);
    return tr;
}

function fila(usuario) {
    const tr = document.createElement("tr");
    const esYo = usuario.uid === uidActual;

    tr.appendChild(celda((usuario.nombre || "-") + (esYo ? " (tú)" : "")));
    tr.appendChild(celda(usuario.email || "-"));

    // Badge de rol
    const tdRol = document.createElement("td");
    const rolVal = usuario.rol || "usuario";
    tdRol.innerHTML = `<span class="adm-rol-badge adm-rol-${rolVal}">${rolVal}</span>`;
    tr.appendChild(tdRol);

    const acciones = document.createElement("td");
    const editar = document.createElement("button");
    editar.className = "adm-btn adm-btn-ghost";
    editar.style.cssText = "font-size:12px;padding:6px 12px";
    editar.textContent = "Editar";
    editar.addEventListener("click", () => modoEditar(usuario));
    acciones.appendChild(editar);

if (!esYo) {
    const borrar = document.createElement("button");
    borrar.className = "adm-btn adm-btn-danger";
    borrar.style.cssText = "font-size:12px;padding:6px 12px;margin-left:6px";
    borrar.textContent = "Eliminar";
    borrar.addEventListener("click", async () => {
        if (!confirm('¿Eliminar el perfil de "' + (usuario.nombre || usuario.email) + '"?')) return;
        try {
            await eliminarUsuario(usuario.uid);
            mostrar("Perfil eliminado. La cuenta sigue en Authentication.", "info");
            await pintarUsuarios();
        } catch (error) {
            mostrar("No se pudo eliminar: " + error.message);
        }
    });
    acciones.appendChild(borrar);
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

/* admin.js solo gestiona el CRUD de usuarios.
   La autenticación y visibilidad del panel se manejan en admin.html */
// El observarSesion de admin.html ya inicializa el panel.
// Este módulo expone pintarUsuarios para que admin.html pueda invocarlo si es necesario.
export { pintarUsuarios, modoNuevo };