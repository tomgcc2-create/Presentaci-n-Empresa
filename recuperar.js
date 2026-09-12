import { recuperarPassword, mensajeError } from "./auth.js";

const formulario = document.getElementById("formulario");
const email      = document.getElementById("email");
const enviar     = document.getElementById("enviar");
const mensaje    = document.getElementById("mensaje");

function mostrar(texto, tipo = "danger") {
    const colores = {
        danger:  "text-danger",
        success: "text-success",
        info:    "text-primary"
    };
    mensaje.textContent = texto;
    mensaje.className   = colores[tipo] || "text-secondary";
}

formulario.addEventListener("submit", async evento => {
    evento.preventDefault();
    enviar.disabled = true;
    mostrar("Enviando correo...", "info");

    try {
        await recuperarPassword(email.value.trim());
        mostrar("¡Listo! Revisa tu correo. Sigue el enlace para crear tu nueva contraseña.", "success");
        formulario.reset();
    } catch (error) {
        mostrar(mensajeError(error), "danger");
    }

    enviar.disabled = false;
});
