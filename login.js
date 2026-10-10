import {
    registrar, iniciarSesion, cerrarSesion, observarSesion, obtenerRol,
    recuperarPassword, ingresarConProveedor, crearPerfil, configurarPersistencia, mensajeError
} from "./auth.js";

/* ═══════════════════════════════════════════════════════════
   Tipos de usuario que se pueden elegir al registrarse.
   OJO: "dueño" no se ofrece al público a propósito. Si cualquiera
   pudiera elegirlo, cualquiera tendría acceso al panel del dueño.
   Ese rol se asigna a mano en Firebase (Firestore → usuarios → rol).
   Si algún día quieres ofrecerlo, agrégalo aquí.
═══════════════════════════════════════════════════════════ */
const ROLES_REGISTRO = [
    { id: "usuario",      nombre: "Usuario",      desc: "Compara y compra al mejor precio", icono: "bi-person" },
    { id: "vendedor",     nombre: "Vendedor",     desc: "Publica y vende tus productos",    icono: "bi-shop" },
    { id: "verificador",  nombre: "Verificador",  desc: "Confirma precios en las tiendas",  icono: "bi-patch-check" },
    { id: "patrocinador", nombre: "Patrocinador", desc: "Promociona tu marca",              icono: "bi-megaphone" }
];

const paginaPorRol = {
    "usuario":      "usuario.html",
    "vendedor":     "vendedor.html",
    "verificador":  "verificador.html",
    "patrocinador": "patrocinador.html",
    "dueño":        "dueño.html"
};

const $ = (id) => document.getElementById(id);
const card = $("lgCard");
const panelRegistro = $("panelRegistro");
const panelIngreso  = $("panelIngreso");
const formLogin     = $("formLogin");
const formRegistro  = $("formRegistro");
const formRecuperar = $("formRecuperar");

/* Mientras registramos o entramos con Google, no redirigir por el cambio de sesión:
   así el perfil (con el tipo de usuario elegido) alcanza a guardarse primero. */
let procesando = false;

/* ───────────────── Utilidades de pantalla ───────────────── */
function mostrar(id, texto, tipo = "error") {
    const el = $(id);
    el.textContent = texto || "";
    el.className = "lg-msg" + (texto ? " is-" + tipo : "");
}
function setErr(id, texto) {
    const el = $("err-" + id); if (!el) return;
    el.textContent = texto || "";
    const campo = el.closest(".lg-field"); if (campo) campo.classList.toggle("has-err", !!texto);
}
function limpiarErrores(form) {
    form.querySelectorAll(".lg-err").forEach(e => { e.textContent = ""; const c = e.closest(".lg-field"); if (c) c.classList.remove("has-err"); });
}
function ocupado(boton, si, textoOriginal) {
    boton.disabled = si;
    boton.classList.toggle("is-loading", si);
    if (textoOriginal) boton.firstChild.textContent = si ? "Un momento…" : textoOriginal;
}
function bloquearSociales(si) { document.querySelectorAll(".lg-soc").forEach(b => b.disabled = si); }
const esCancelacion = (e) => e && (e.code === "auth/popup-closed-by-user" || e.code === "auth/cancelled-popup-request");

function irAPagina(rol) { window.location.href = paginaPorRol[rol] || "usuario.html"; }
async function redirigirPorRol(usuario) { irAPagina(await obtenerRol(usuario.uid)); }

/* ───────────────── Cambiar de vista (ingresar / registrar / recuperar) ───────────────── */
function irA(modo) {
    const registrando = modo === "registrar";
    const recuperando = modo === "recuperar";
    card.classList.toggle("is-register", registrando);
    panelRegistro.inert = !registrando;
    panelIngreso.inert  = registrando;
    formLogin.hidden     = recuperando;
    formRecuperar.hidden = !recuperando;
    ["msgLogin", "msgRegistro", "msgRecuperar"].forEach(id => mostrar(id, ""));
    history.replaceState(null, "", registrando ? "#registro" : recuperando ? "#recuperar" : location.pathname + location.search);

    const primero = registrando ? $("rNombre") : recuperando ? $("cEmail") : $("lEmail");
    if (recuperando && $("lEmail").value && !$("cEmail").value) $("cEmail").value = $("lEmail").value;
    setTimeout(() => primero.focus({ preventScroll: true }), 650);
}
document.addEventListener("click", (e) => {
    const b = e.target.closest("[data-ir]");
    if (b) { e.preventDefault(); irA(b.dataset.ir); }
    const t = e.target.closest("[data-terminos]");
    if (t) e.preventDefault();
});

/* ───────────────── Tipo de usuario (tarjetas) ───────────────── */
function dibujarRoles(contenedor, nombre, seleccionado) {
    contenedor.innerHTML = ROLES_REGISTRO.map(r => `
        <label class="lg-role">
            <input type="radio" name="${nombre}" value="${r.id}" ${r.id === seleccionado ? "checked" : ""}>
            <span><i class="bi ${r.icono}"></i><strong>${r.nombre}</strong><small>${r.desc}</small></span>
        </label>`).join("");
}
const rolElegido = (nombre) => (document.querySelector(`input[name="${nombre}"]:checked`) || {}).value || "usuario";

const rolInicial = new URLSearchParams(location.search).get("rol");
dibujarRoles($("rolesGrid"), "rRol", ROLES_REGISTRO.some(r => r.id === rolInicial) ? rolInicial : "usuario");

/* Ventana "un último paso" para quien entra por primera vez con una red social */
function pedirRol() {
    return new Promise((resolver, rechazar) => {
        const modal = $("rolModal");
        dibujarRoles($("rolModalGrid"), "mRol", "usuario");
        modal.hidden = false;
        const cerrar = () => { modal.hidden = true; $("rolContinuar").onclick = null; $("rolCancelar").onclick = null; };
        $("rolContinuar").onclick = () => { const r = rolElegido("mRol"); cerrar(); resolver(r); };
        $("rolCancelar").onclick  = () => { cerrar(); rechazar(new Error("cancelado")); };
        modal.querySelector("input:checked").focus();
    });
}

/* ───────────────── Mostrar / ocultar contraseña y medidor ───────────────── */
document.addEventListener("click", (e) => {
    const b = e.target.closest("[data-eye]"); if (!b) return;
    const campo = $(b.dataset.eye);
    const ver = campo.type === "password";
    campo.type = ver ? "text" : "password";
    b.setAttribute("aria-label", ver ? "Ocultar contraseña" : "Mostrar contraseña");
    b.firstElementChild.className = "bi " + (ver ? "bi-eye-slash" : "bi-eye");
});
$("rPass").addEventListener("input", (e) => {
    const p = e.target.value;
    let n = 0;
    if (p.length >= 6) n++;
    if (p.length >= 10) n++;
    if (/[a-z]/.test(p) && /[A-Z]/.test(p) && /\d/.test(p)) n++;
    if (/[^A-Za-z0-9]/.test(p)) n++;
    $("rMeter").dataset.n = p ? Math.max(1, n) : 0;
});
document.querySelectorAll(".lg-field input").forEach(i => i.addEventListener("input", () => setErr(i.id, "")));
$("rTerminos").addEventListener("change", () => setErr("rTerminos", ""));

const correoValido = (c) => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(c);

/* ───────────────── Sesión activa ───────────────── */
observarSesion(usuario => {
    if (usuario && !procesando) redirigirPorRol(usuario);
});

/* ───────────────── Ingresar con correo ───────────────── */
formLogin.addEventListener("submit", async (e) => {
    e.preventDefault();
    limpiarErrores(formLogin); mostrar("msgLogin", "");
    const correo = $("lEmail").value.trim(), clave = $("lPass").value;
    let ok = true;
    if (!correoValido(correo)) { setErr("lEmail", "Escribe un correo válido"); ok = false; }
    if (!clave) { setErr("lPass", "Escribe tu contraseña"); ok = false; }
    if (!ok) return;

    procesando = true; ocupado($("btnLogin"), true, "Ingresar"); bloquearSociales(true);
    try {
        await configurarPersistencia($("lRecordar").checked);
        const usuario = await iniciarSesion(correo, clave);
        mostrar("msgLogin", "¡Bienvenido! Redirigiendo…", "ok");
        await redirigirPorRol(usuario);
    } catch (error) {
        mostrar("msgLogin", mensajeError(error));
        procesando = false; ocupado($("btnLogin"), false, "Ingresar"); bloquearSociales(false);
    }
});

/* ───────────────── Crear cuenta con correo ───────────────── */
formRegistro.addEventListener("submit", async (e) => {
    e.preventDefault();
    limpiarErrores(formRegistro); mostrar("msgRegistro", "");
    const nombre = $("rNombre").value.trim(), apellido = $("rApellido").value.trim();
    const correo = $("rEmail").value.trim(), clave = $("rPass").value, rol = rolElegido("rRol");
    let ok = true;
    if (nombre.length < 2)   { setErr("rNombre", "Escribe tu nombre"); ok = false; }
    if (apellido.length < 2) { setErr("rApellido", "Escribe tu apellido"); ok = false; }
    if (!correoValido(correo)) { setErr("rEmail", "Escribe un correo válido"); ok = false; }
    if (clave.length < 6)    { setErr("rPass", "Mínimo 6 caracteres"); ok = false; }
    if (!$("rTerminos").checked) { setErr("rTerminos", "Debes aceptar los términos para continuar"); ok = false; }
    if (!ok) { const mal = formRegistro.querySelector(".has-err input, #err-rTerminos:not(:empty)"); if (mal) mal.scrollIntoView({ block: "center", behavior: "smooth" }); return; }

    procesando = true; ocupado($("btnRegistro"), true, "Crear cuenta"); bloquearSociales(true);
    try {
        await configurarPersistencia(true);
        await registrar(nombre, correo, clave, apellido, rol);
        mostrar("msgRegistro", "¡Cuenta creada! Redirigiendo…", "ok");
        irAPagina(rol);
    } catch (error) {
        mostrar("msgRegistro", mensajeError(error));
        procesando = false; ocupado($("btnRegistro"), false, "Crear cuenta"); bloquearSociales(false);
    }
});

/* ───────────────── Google / Microsoft / Facebook ───────────────── */
document.querySelectorAll(".lg-soc").forEach(boton => {
    boton.addEventListener("click", async () => {
        const desdeRegistro = !!boton.closest("#panelRegistro");
        const idMsg = desdeRegistro ? "msgRegistro" : "msgLogin";
        const proveedor = boton.dataset.prov;
        mostrar(idMsg, "");
        procesando = true; bloquearSociales(true);
        try {
            await configurarPersistencia(desdeRegistro ? true : $("lRecordar").checked);
            const { user, perfil } = await ingresarConProveedor(proveedor);
            let rol;
            if (perfil) {
                rol = perfil.rol || "usuario";                       // ya tenía cuenta
            } else {
                rol = desdeRegistro ? rolElegido("rRol") : await pedirRol();   // primera vez
                await crearPerfil(user, rol, proveedor);
            }
            mostrar(idMsg, "¡Listo! Redirigiendo…", "ok");
            irAPagina(rol);
        } catch (error) {
            if (error && error.message === "cancelado") {
                await cerrarSesion().catch(() => {});
                mostrar(idMsg, "Cancelaste el acceso.", "info");
            } else if (esCancelacion(error)) {
                mostrar(idMsg, mensajeError(error), "info");
            } else {
                mostrar(idMsg, mensajeError(error));
            }
            procesando = false; bloquearSociales(false);
        }
    });
});

/* ───────────────── Recuperar contraseña ───────────────── */
let enfriamiento = null;
formRecuperar.addEventListener("submit", async (e) => {
    e.preventDefault();
    limpiarErrores(formRecuperar); mostrar("msgRecuperar", "");
    const correo = $("cEmail").value.trim();
    if (!correoValido(correo)) { setErr("cEmail", "Escribe un correo válido"); return; }

    ocupado($("btnRecuperar"), true, "Enviar enlace");
    try {
        await recuperarPassword(correo);
        mostrar("msgRecuperar", "Si ese correo tiene una cuenta, te enviamos el enlace. Revisa también la carpeta de spam.", "ok");
        let restante = 30;
        const boton = $("btnRecuperar");
        boton.disabled = true; boton.classList.remove("is-loading");
        boton.firstChild.textContent = `Reenviar en ${restante}s`;
        clearInterval(enfriamiento);
        enfriamiento = setInterval(() => {
            restante--;
            if (restante <= 0) { clearInterval(enfriamiento); ocupado(boton, false, "Enviar enlace"); boton.firstChild.textContent = "Reenviar enlace"; }
            else boton.firstChild.textContent = `Reenviar en ${restante}s`;
        }, 1000);
    } catch (error) {
        mostrar("msgRecuperar", mensajeError(error));
        ocupado($("btnRecuperar"), false, "Enviar enlace");
    }
});

/* ───────────────── Vista inicial (login.html#registro, ?modo=registro, ?rol=vendedor) ───────────────── */
const params = new URLSearchParams(location.search);
const quiereRegistro = location.hash === "#registro" || params.get("modo") === "registro" || ROLES_REGISTRO.some(r => r.id === rolInicial);
panelRegistro.inert = true;
if (quiereRegistro) { card.classList.add("is-register"); panelRegistro.inert = false; panelIngreso.inert = true; }
else if (location.hash === "#recuperar") irA("recuperar");
