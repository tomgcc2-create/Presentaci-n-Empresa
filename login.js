import { registrar, iniciarSesion, cerrarSesion, observarSesion, mensajeError } from "./auth.js";

const formulario      = document.getElementById("formulario");
const campoNombre     = document.getElementById("campoNombre");
const campoApellido   = document.getElementById("campoApellido");
const campoRol        = document.getElementById("campoRol");
const campoTerminos   = document.getElementById("campoTerminos");
const nombre          = document.getElementById("nombre");
const apellido        = document.getElementById("apellido");
const email           = document.getElementById("email");
const password        = document.getElementById("password");
const rol             = document.getElementById("rol");
const iAgree          = document.getElementById("iAgree");
const enviar          = document.getElementById("enviar");
const mensaje         = document.getElementById("mensaje");
const tabIngresar     = document.getElementById("tabIngresar");
const tabRegistrar    = document.getElementById("tabRegistrar");
const panelLogueado   = document.getElementById("panelLogueado");
const correoUsuario   = document.getElementById("correoUsuario");
const btnCerrarSesion = document.getElementById("btnCerrarSesion");

let modo = "ingresar";

// ---------- Observar si ya hay sesión activa ----------
observarSesion(usuario => {
    if (usuario) {
        formulario.hidden        = true;
        panelLogueado.hidden     = false;
        mensaje.hidden           = true;
        document.getElementById("seccionTabs").hidden  = true;
        document.getElementById("seccionLinks").hidden = true;
        correoUsuario.textContent = "📧 " + usuario.email;
    } else {
        formulario.hidden        = false;
        panelLogueado.hidden     = true;
        mensaje.hidden           = false;
        document.getElementById("seccionTabs").hidden  = false;
        document.getElementById("seccionLinks").hidden = false;
    }
});

// ---------- Cerrar sesión ----------
btnCerrarSesion.addEventListener("click", async () => {
    await cerrarSesion();
    // La página se actualiza sola gracias a observarSesion
});

// Efecto hover en el botón naranja
btnCerrarSesion.addEventListener("mouseenter", () => {
    btnCerrarSesion.style.transform = "scale(1.05)";
    btnCerrarSesion.style.boxShadow = "0 6px 20px rgba(255,140,0,0.6)";
});
btnCerrarSesion.addEventListener("mouseleave", () => {
    btnCerrarSesion.style.transform = "scale(1)";
    btnCerrarSesion.style.boxShadow = "0 4px 15px rgba(255,140,0,0.4)";
});

// ---------- Cambiar modo Ingresar / Registrar ----------
function cambiarModo(nuevo) {
    modo = nuevo;
    const registrando = modo === "registrar";

    campoNombre.hidden   = !registrando;
    campoApellido.hidden = !registrando;
    campoRol.hidden      = !registrando;
    campoTerminos.hidden = !registrando;

    nombre.required   = registrando;
    apellido.required = registrando;
    iAgree.required   = registrando;

    password.autocomplete = registrando ? "new-password" : "current-password";
    enviar.textContent    = registrando ? "Crear cuenta" : "Ingresar";

    tabIngresar.className  = registrando ? "btn btn-outline-primary" : "btn btn-primary";
    tabRegistrar.className = registrando ? "btn btn-primary" : "btn btn-outline-primary";

    mostrar("");
}

function mostrar(texto, tipo = "error") {
    mensaje.textContent = texto;
    if (!texto) {
        mensaje.style.color = "";
        return;
    }
    mensaje.style.color = tipo === "error" ? "#dc3545" : "#0d6efd";
}

tabIngresar.addEventListener("click",  () => cambiarModo("ingresar"));
tabRegistrar.addEventListener("click", () => cambiarModo("registrar"));

// ---------- Enviar formulario ----------
formulario.addEventListener("submit", async evento => {
    evento.preventDefault();
    enviar.disabled = true;
    mostrar("Verificando...", "info");

    try {
        if (modo === "registrar") {
            await registrar(
                nombre.value.trim(),
                email.value.trim(),
                password.value,
                apellido.value.trim(),
                rol.value
            );
        } else {
            await iniciarSesion(email.value.trim(), password.value);
        }
        // observarSesion se encargará de mostrar el panel
    } catch (error) {
        mostrar(mensajeError(error));
        enviar.disabled = false;
    }
});