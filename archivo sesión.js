import { observarSesion, cerrarSesion, obtenerRol } from "./auth.js";

const contenedor = document.getElementById("sesion");

function enlace(texto, destino) {
    const elemento = document.createElement("a");
    elemento.className = "boton-sesion";
    elemento.href = destino;
    elemento.textContent = texto;
    return elemento;
}

function botonSalir() {
    const salir = document.createElement("button");
    salir.className = "boton-sesion";
    salir.textContent = "Cerrar sesión";
    salir.addEventListener("click", async () => {
        await cerrarSesion();
        window.location.href = "login.html";
    });
    return salir;
}

observarSesion(async usuario => {
    if (!contenedor) return;

    contenedor.replaceChildren();

    if (!usuario) {
        contenedor.appendChild(enlace("Iniciar sesión", "login.html"));
        return;
    }

    const nombre = document.createElement("span");
    nombre.className = "usuario";
    nombre.textContent = usuario.displayName || usuario.email;

    const salir = botonSalir();
    contenedor.append(nombre, salir);

    let rol;

    try {
        rol = await obtenerRol(usuario.uid);
    } catch (error) {
        console.error("No se pudo leer el rol:", error);
        return;
    }

    const etiqueta = document.createElement("span");
    etiqueta.className = "etiqueta-rol";
    etiqueta.textContent = rol;
    contenedor.insertBefore(etiqueta, salir);

    if (rol === "admin" && !document.body.classList.contains("es-admin")) {
        contenedor.insertBefore(enlace("Administrar", "admin.html"), salir);
    }
});