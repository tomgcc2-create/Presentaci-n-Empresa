import { recuperarPassword, mensajeError } from "./auth.js";

const formulario = document.getElementById("formulario");
const email = document.getElementById("email");
const enviar = document.getElementById("enviar");
const mensaje = document.getElementById("mensaje");

function mostrar(texto, tipo = "error") {
    mensaje.textContent = texto;
    mensaje.className = "mensdaje" + (texto ? tipo : "");
}

formulario.addEventListener("submit", async evento => {
    evento.preventDefault();
    enviar.disabled = true;
    mostrar("Enviando...", "info");


    try {
        await recuperarPassword(email.value.trim());
        mostrar("Listo. Revisa tu correo para crear la contraseña nueva.", "info");
        formulario.reset();
    } catch (error) {
        mostrar(mensajeError(error));
    }


    enviar.disabled = false;
});
