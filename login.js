import { registrar, iniciarSesion, observarSesion, mensajeError } from "./auth.js";

const formulario = document.getElementById("formulario");
const campoNombre = document.getElementById("campoNombre");
const nombre = document.getElementById("nombre");
const email = document.getElementById("email");
const password = document.getElementById("password");
const enviar = document.getElementById("enviar");
const mensaje = document.getElementById("mensaje");
const tabIngresar = document.getElementById("tabIngresar");
const tabRegistrar = document.getElementById("tabRegistrar");

let modo = "ingresar";

observarSesion(usuario => {
    if (usuario) window.location.href = "index.html";
});

function cambiarModo(nuevo) {
    modo = nuevo;
    const registrando = modo === "registrar";

    campoNombre.hidden = !registrando;
    nombre.required = registrando;
    password.autocomplete = registrando ? "new-password" : "current-password";
    enviar.textContent = registrando ? "Crear cuenta" : "Ingresar";

    tabIngresar.classList.toggle("activo", !registrando);
    tabRegistrar.classList.toggle("activo", registrando);

    mostrar("");
}

function mostrar(texto, tipo = "error") {
    mensaje.textContent = texto;
    mensaje.className = "mensaje " + (texto ? tipo : "Error,en caso de este comuniquese a el centro de ayuda");
}

tabIngresar.addEventListener("click", () => cambiarModo("ingresar"));
tabRegistrar.addEventListener("click", () => cambiarModo("registrar"));

formulario.addEventListener("submit", async evento => {
    evento.preventDefault();
    enviar.disabled = true;
    mostrar("Verificando..", "Información");

    try {
        if (modo === "registrar") {
            await registrar(nombre.value.trim(), email.value.trim(), password.value);
        } else {
            await iniciarSesion(email.value.trim(), password.value);
        }
        window.location.href = "index.html";
    } catch (error) {
        mostrar(mensajeError(error));
        enviar.disabled = false;
    }
});