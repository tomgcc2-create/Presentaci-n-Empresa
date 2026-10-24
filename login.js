import {
    registrar, iniciarSesion, cerrarSesion, observarSesion, obtenerRol,
    recuperarPassword, ingresarConProveedor, crearPerfil, configurarPersistencia, mensajeError
} from "./auth.js";

/* ═══════════════════════════════════════════════════════════
   Tipos de usuario elegibles al registrarse.
   "dueño" y "admin" no se ofrecen: se asignan a mano en Firebase.
═══════════════════════════════════════════════════════════ */
const ROLES_REGISTRO = [
    { id: "usuario",      nombre: "Usuario",      desc: "Compara y compra al mejor precio", icono: "bi-person" },
    { id: "vendedor",     nombre: "Vendedor",     desc: "Publica y vende tus productos",    icono: "bi-shop" },
    { id: "patrocinador", nombre: "Patrocinador", desc: "Promociona tu marca",              icono: "bi-megaphone" }
];

const paginaPorRol = {
    "usuario":      "index.html",
    "vendedor":     "vendedor.html",
    "verificador":  "verificador.html",
    "patrocinador": "patrocinador.html",
    "dueño":        "dueño.html",
    "admin":        "admin.html"
};

const $ = (id) => document.getElementById(id);
const card          = $("lgCard");
const panelRegistro = $("panelRegistro");
const panelIngreso  = $("panelIngreso");
const formLogin     = $("formLogin");
const formRegistro  = $("formRegistro");
const formRecuperar = $("formRecuperar");

/* Bloquea la redirección automática mientras estamos guardando el perfil */
let procesando = false;

/* ───────────────── Utilidades ───────────────── */
function mostrar(id, texto, tipo = "error") {
    const el = $(id);
    el.textContent = texto || "";
    el.className = "lg-msg" + (texto ? " is-" + tipo : "");
}
function setErr(id, texto) {
    const el = $("err-" + id); if (!el) return;
    el.textContent = texto || "";
    const campo = el.closest(".lg-field");
    if (campo) campo.classList.toggle("has-err", !!texto);
}
function limpiarErrores(form) {
    form.querySelectorAll(".lg-err").forEach(e => {
        e.textContent = "";
        const c = e.closest(".lg-field");
        if (c) c.classList.remove("has-err");
    });
}
function ocupado(boton, si, textoOriginal) {
    boton.disabled = si;
    boton.classList.toggle("is-loading", si);
    if (textoOriginal) boton.firstChild.textContent = si ? "Un momento…" : textoOriginal;
}
function bloquearSociales(si) { document.querySelectorAll(".lg-soc").forEach(b => b.disabled = si); }
const esCancelacion = e => e && (
    e.code === "auth/popup-closed-by-user" ||
    e.code === "auth/cancelled-popup-request"
);
const correoValido = c => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(c);

/* ───────────────── Redirección por rol ───────────────── */
/* Al crear cuenta o iniciar sesión todos van a la página inicial.
   (Cada rol entra a su panel desde el menú de la barra superior.) */
function irAPagina() {
    window.location.href = "index.html";
}

/* Solo para el modo de prueba del administrador: entra directo al panel del rol. */
function irAPanelDeRol(rol) {
    window.location.href = paginaPorRol[rol] || "index.html";
}

function redirigirPorRol() {
    irAPagina();
}

/* ───────────────── Vista (ingresar / registrar / recuperar) ───────────────── */
function irA(modo) {
    const registrando = modo === "registrar";
    const recuperando = modo === "recuperar";
    card.classList.toggle("is-register", registrando);
    panelRegistro.inert = !registrando;
    panelIngreso.inert  =  registrando;
    formLogin.hidden     = recuperando;
    formRecuperar.hidden = !recuperando;
    ["msgLogin", "msgRegistro", "msgRecuperar"].forEach(id => mostrar(id, ""));
    history.replaceState(null, "",
        registrando ? "#registro" : recuperando ? "#recuperar" : location.pathname + location.search
    );
    const primero = registrando ? $("rNombre") : recuperando ? $("cEmail") : $("lEmail");
    if (recuperando && $("lEmail").value && !$("cEmail").value) {
        $("cEmail").value = $("lEmail").value;
    }
    setTimeout(() => primero.focus({ preventScroll: true }), 650);
}

document.addEventListener("click", e => {
    const b = e.target.closest("[data-ir]");
    if (b) { e.preventDefault(); irA(b.dataset.ir); }
    const t = e.target.closest("[data-terminos]");
    if (t) e.preventDefault();
});

/* ───────────────── Selección de rol ───────────────── */
function dibujarRoles(contenedor, nombre, seleccionado) {
    contenedor.innerHTML = ROLES_REGISTRO.map(r => `
        <label class="lg-role">
            <input type="radio" name="${nombre}" value="${r.id}" ${r.id === seleccionado ? "checked" : ""}>
            <span><i class="bi ${r.icono}"></i><strong>${r.nombre}</strong><small>${r.desc}</small></span>
        </label>`).join("");
}
const rolElegido = nombre =>
    (document.querySelector(`input[name="${nombre}"]:checked`) || {}).value || "usuario";

/* Muestra / oculta el aviso informativo cuando se elige Vendedor */
function actualizarAvisoVendedor() {
    const aviso = $("avisoVendedor");
    if (!aviso) return;
    const esVendedor = rolElegido("rRol") === "vendedor";
    aviso.hidden = !esVendedor;
}

document.addEventListener("change", e => {
    if (e.target.matches('input[name="rRol"]')) actualizarAvisoVendedor();
});

/* Dibuja roles y aplica rol inicial si viene por URL */
const rolInicial = new URLSearchParams(location.search).get("rol");
dibujarRoles(
    $("rolesGrid"), "rRol",
    ROLES_REGISTRO.some(r => r.id === rolInicial) ? rolInicial : "usuario"
);
actualizarAvisoVendedor();

/* ───────────────── Modal "un último paso" (redes sociales, primera vez) ───────────────── */
function pedirRol() {
    return new Promise((resolver, rechazar) => {
        const modal = $("rolModal");
        dibujarRoles($("rolModalGrid"), "mRol", "usuario");
        modal.hidden = false;
        const cerrar = () => {
            modal.hidden = true;
            $("rolContinuar").onclick = null;
            $("rolCancelar").onclick  = null;
        };
        $("rolContinuar").onclick = () => { const r = rolElegido("mRol"); cerrar(); resolver(r); };
        $("rolCancelar").onclick  = () => { cerrar(); rechazar(new Error("cancelado")); };
        modal.querySelector("input:checked").focus();
    });
}

/* ───────────────── Medidor de contraseña ───────────────── */
document.addEventListener("click", e => {
    const b = e.target.closest("[data-eye]"); if (!b) return;
    const campo = $(b.dataset.eye);
    const ver = campo.type === "password";
    campo.type = ver ? "text" : "password";
    b.setAttribute("aria-label", ver ? "Ocultar contraseña" : "Mostrar contraseña");
    b.firstElementChild.className = "bi " + (ver ? "bi-eye-slash" : "bi-eye");
});

$("rPass").addEventListener("input", e => {
    const p = e.target.value;
    let n = 0;
    if (p.length >= 6) n++;
    if (p.length >= 10) n++;
    if (/[a-z]/.test(p) && /[A-Z]/.test(p) && /\d/.test(p)) n++;
    if (/[^A-Za-z0-9]/.test(p)) n++;
    $("rMeter").dataset.n = p ? Math.max(1, n) : 0;
});

document.querySelectorAll(".lg-field input").forEach(i =>
    i.addEventListener("input", () => setErr(i.id, ""))
);
$("rTerminos").addEventListener("change", () => setErr("rTerminos", ""));

/* ───────────────── Sesión activa → redirigir ───────────────── */
observarSesion(usuario => {
    if (usuario && !procesando) redirigirPorRol(usuario);
});

/* ───────────────── INGRESAR ───────────────── */
formLogin.addEventListener("submit", async e => {
    e.preventDefault();
    limpiarErrores(formLogin);
    mostrar("msgLogin", "");

    const correo = $("lEmail").value.trim();
    const clave  = $("lPass").value;
    let ok = true;
    if (!correoValido(correo)) { setErr("lEmail", "Escribe un correo válido"); ok = false; }
    if (!clave)                { setErr("lPass",  "Escribe tu contraseña");    ok = false; }
    if (!ok) return;

    procesando = true;
    ocupado($("btnLogin"), true, "Ingresar");
    bloquearSociales(true);
    try {
        await configurarPersistencia($("lRecordar").checked);
        const usuario = await iniciarSesion(correo, clave);
        mostrar("msgLogin", "¡Bienvenido! Redirigiendo…", "ok");
        await redirigirPorRol(usuario);
    } catch (error) {
        mostrar("msgLogin", mensajeError(error));
        procesando = false;
        ocupado($("btnLogin"), false, "Ingresar");
        bloquearSociales(false);
    }
});

/* ───────────────── REGISTRAR ───────────────── */
formRegistro.addEventListener("submit", async e => {
    e.preventDefault();
    limpiarErrores(formRegistro);
    mostrar("msgRegistro", "");

    const nombre   = $("rNombre").value.trim();
    const apellido = $("rApellido").value.trim();
    const correo   = $("rEmail").value.trim();
    const clave    = $("rPass").value;
    const rol      = rolElegido("rRol");
    let ok = true;

    if (nombre.length < 2)    { setErr("rNombre",   "Escribe tu nombre");           ok = false; }
    if (apellido.length < 2)  { setErr("rApellido", "Escribe tu apellido");         ok = false; }
    if (!correoValido(correo)) { setErr("rEmail",    "Escribe un correo válido");    ok = false; }
    if (clave.length < 6)     { setErr("rPass",     "Mínimo 6 caracteres");         ok = false; }
    if (!$("rTerminos").checked) {
        setErr("rTerminos", "Debes aceptar los términos para continuar");
        ok = false;
    }

    if (!ok) {
        const mal = formRegistro.querySelector(
            ".has-err input, #err-rTerminos:not(:empty)"
        );
        if (mal) mal.scrollIntoView({ block: "center", behavior: "smooth" });
        return;
    }

    procesando = true;
    ocupado($("btnRegistro"), true, "Crear cuenta");
    bloquearSociales(true);

    try {
        await configurarPersistencia(true);

        if (rol === "vendedor") {
            /*
             * Flujo vendedor:
             * 1. Se crea la cuenta con rol provisional "usuario".
             * 2. El rol definitivo "vendedor" se asigna SOLO cuando un admin apruebe
             *    la solicitud de verificación que el usuario completa en la siguiente página.
             */
            await registrar(nombre, correo, clave, apellido, "usuario");
            mostrar("msgRegistro", "¡Cuenta creada! Redirigiendo al formulario de verificación…", "ok");
            setTimeout(() => { window.location.href = "registro-vendedor.html"; }, 1200);
        } else {
            await registrar(nombre, correo, clave, apellido, rol);
            mostrar("msgRegistro", "¡Cuenta creada! Redirigiendo…", "ok");
            irAPagina(rol);
        }
    } catch (error) {
        mostrar("msgRegistro", mensajeError(error));
        procesando = false;
        ocupado($("btnRegistro"), false, "Crear cuenta");
        bloquearSociales(false);
    }
});

/* ───────────────── REDES SOCIALES ───────────────── */
document.querySelectorAll(".lg-soc").forEach(boton => {
    boton.addEventListener("click", async () => {
        const desdeRegistro = !!boton.closest("#panelRegistro");
        const idMsg    = desdeRegistro ? "msgRegistro" : "msgLogin";
        const proveedor = boton.dataset.prov;
        mostrar(idMsg, "");
        procesando = true;
        bloquearSociales(true);

        try {
            await configurarPersistencia(desdeRegistro ? true : $("lRecordar").checked);
            const { user, perfil } = await ingresarConProveedor(proveedor);

            let rol;
            if (perfil) {
                rol = perfil.rol || "usuario";            // ya tenía cuenta → usa su rol
            } else {
                rol = desdeRegistro ? rolElegido("rRol") : await pedirRol();
                // Si eligió vendedor → guardar "usuario" y redirigir a verificación
                const rolFirestore = rol === "vendedor" ? "usuario" : rol;
                await crearPerfil(user, rolFirestore, proveedor);
            }

            mostrar(idMsg, "¡Listo! Redirigiendo…", "ok");

            if (rol === "vendedor") {
                setTimeout(() => { window.location.href = "registro-vendedor.html"; }, 1000);
            } else {
                irAPagina(rol);
            }
        } catch (error) {
            if (error?.message === "cancelado") {
                await cerrarSesion().catch(() => {});
                mostrar(idMsg, "Cancelaste el acceso.", "info");
            } else if (esCancelacion(error)) {
                mostrar(idMsg, mensajeError(error), "info");
            } else {
                mostrar(idMsg, mensajeError(error));
            }
            procesando = false;
            bloquearSociales(false);
        }
    });
});

/* ───────────────── RECUPERAR CONTRASEÑA ───────────────── */
let enfriamiento = null;
formRecuperar.addEventListener("submit", async e => {
    e.preventDefault();
    limpiarErrores(formRecuperar);
    mostrar("msgRecuperar", "");

    const correo = $("cEmail").value.trim();
    if (!correoValido(correo)) { setErr("cEmail", "Escribe un correo válido"); return; }

    ocupado($("btnRecuperar"), true, "Enviar enlace");
    try {
        await recuperarPassword(correo);
        mostrar(
            "msgRecuperar",
            "Si ese correo tiene una cuenta, te enviamos el enlace. Revisa también la carpeta de spam.",
            "ok"
        );
        let restante = 30;
        const boton = $("btnRecuperar");
        boton.disabled = true;
        boton.classList.remove("is-loading");
        boton.firstChild.textContent = `Reenviar en ${restante}s`;
        clearInterval(enfriamiento);
        enfriamiento = setInterval(() => {
            restante--;
            if (restante <= 0) {
                clearInterval(enfriamiento);
                ocupado(boton, false, "Enviar enlace");
                boton.firstChild.textContent = "Reenviar enlace";
            } else {
                boton.firstChild.textContent = `Reenviar en ${restante}s`;
            }
        }, 1000);
    } catch (error) {
        mostrar("msgRecuperar", mensajeError(error));
        ocupado($("btnRecuperar"), false, "Enviar enlace");
    }
});

/* ───────────────── Vista inicial ───────────────── */
const params        = new URLSearchParams(location.search);
const quiereRegistro = (
    location.hash === "#registro" ||
    params.get("modo") === "registro" ||
    ROLES_REGISTRO.some(r => r.id === rolInicial)
);
panelRegistro.inert = true;
if (quiereRegistro) {
    card.classList.add("is-register");
    panelRegistro.inert = false;
    panelIngreso.inert  = true;
} else if (location.hash === "#recuperar") {
    irA("recuperar");
}

/* ═══════════════════════════════════════════════════════════
   CUENTAS DE PRUEBA PARA ADMINISTRADOR
   ─────────────────────────────────────────────────────────
   Cómo funciona:
   • El admin escribe un código especial en el campo de correo
     al iniciar sesión (ej. "prueba:vendedor").
   • El código se valida contra Firestore (colección "codigosPrueba").
   • Si el código existe, está activo y no ha expirado, se simula
     una sesión temporal con el rol correspondiente sin crear
     un usuario real en Firebase Auth.
   • Los códigos NUNCA se guardan en este archivo. Están en Firestore
     y pueden desactivarse (campo activo:false) antes de producción.
   ─────────────────────────────────────────────────────────
   Estructura del documento en Firestore:
     codigosPrueba/{codigo}
       activo: true
       rol: "vendedor" | "patrocinador" | "verificador" | "usuario"
       creadoPor: "admin-uid"
       expira: Timestamp | null   (null = sin expiración)
       descripcion: string
═══════════════════════════════════════════════════════════ */
formLogin.addEventListener("submit", async e => {
    /* Este listener se agrega DESPUÉS del principal, por lo que si el
       submit ya fue procesado no llega aquí. Para evitar doble ejecución,
       chequeamos si el campo tiene el prefijo "prueba:" */
    const correo = $("lEmail").value.trim().toLowerCase();
    if (!correo.startsWith("prueba:")) return; // no es un código de prueba → flujo normal

    e.stopImmediatePropagation(); // detiene el listener de login normal
    e.preventDefault();

    const codigo = correo.replace("prueba:", "").trim();
    if (!codigo) {
        mostrar("msgLogin", "Escribe un código de prueba válido (ej. prueba:vendedor123)", "error");
        return;
    }

    ocupado($("btnLogin"), true, "Ingresar");

    try {
        const { db } = await import("./firebase-config.js");
        const { doc, getDoc } = await import(
            "https://www.gstatic.com/firebasejs/11.6.0/firebase-firestore.js"
        );

        const snap = await getDoc(doc(db, "codigosPrueba", codigo));

        if (!snap.exists()) {
            mostrar("msgLogin", "Código de prueba no encontrado.", "error");
            ocupado($("btnLogin"), false, "Ingresar");
            return;
        }

        const datos = snap.data();

        if (!datos.activo) {
            mostrar("msgLogin", "Este código de prueba está desactivado.", "error");
            ocupado($("btnLogin"), false, "Ingresar");
            return;
        }

        if (datos.expira && datos.expira.toDate && datos.expira.toDate() < new Date()) {
            mostrar("msgLogin", "Este código de prueba ha expirado.", "error");
            ocupado($("btnLogin"), false, "Ingresar");
            return;
        }

        /* Código válido: redirigir al panel del rol sin autenticación real */
        const rolPrueba = datos.rol || "usuario";
        mostrar("msgLogin",
            `✅ Modo prueba: rol "${rolPrueba}". Redirigiendo…`, "ok"
        );

        /* Guardamos en sessionStorage para que la página de destino sepa
           que es una sesión de prueba y no exija auth real */
        sessionStorage.setItem("pn_prueba_rol", rolPrueba);
        sessionStorage.setItem("pn_prueba_codigo", codigo);

        setTimeout(() => { irAPanelDeRol(rolPrueba); }, 1200);

    } catch (err) {
        mostrar("msgLogin", "Error al validar el código: " + (err.message || err), "error");
        ocupado($("btnLogin"), false, "Ingresar");
    }
}, true); // captura (capture:true) para ejecutarse antes del listener normal

/* ═══════════════════════════════════════════════════════════════════════
   MODO ADMINISTRADOR DE PRUEBAS
   ─────────────────────────────────────────────────────────────────────
   Flujo:
   1. El admin escribe exactamente "PRICENICE" en el campo de correo y
      cualquier cosa en contraseña, luego pulsa "Ingresar" (no Crear cuenta).
   2. El frontend detecta la cadena ANTES de enviar credenciales a Firebase.
   3. Llama al Worker /admin-test con el valor del campo (no con "PRICENICE"
      en texto claro — envía el valor tal cual para que el servidor valide).
   4. Si el servidor autoriza, muestra el selector de perfiles.
   5. El admin elige un perfil → nueva llamada al Worker con el perfil,
      recibe un token firmado y es redirigido a la URL correspondiente
      con el token en sessionStorage (NUNCA en la URL).
   6. Si el servidor rechaza, el campo muestra "Correo no válido",
      idéntico a cualquier otro error de formato — sin revelar nada.
   ─────────────────────────────────────────────────────────────────────
   IMPORTANTE: la constante ADMIN_TRIGGER que aparece abajo NO es el
   código secreto. Es solo la cadena que el admin debe escribir en el
   campo correo para activar el flujo. El código real que autentica
   la solicitud vive en la variable de entorno ADMIN_TEST_CODE del Worker
   y jamás llega al navegador.
═══════════════════════════════════════════════════════════════════════ */

(function () {
  /* ── La cadena que activa el flujo en el campo correo ── */
  const ADMIN_TRIGGER = "PRICENICE";

  /* ── URL del Worker (mismo que el chatbot) ── */
  const WORKER_URL = "https://chatbot-miempresa.priceniceworld.workers.dev";

  /* ── Icono por perfil ── */
  const ICONOS = {
    usuario:      "bi-person-circle",
    vendedor:     "bi-shop-window",
    patrocinador: "bi-megaphone-fill",
    verificador:  "bi-patch-check-fill",
    admin:        "bi-shield-fill-check",
    dueno:        "bi-gem"
  };

  /* ── Referencias DOM ── */
  const modal       = document.getElementById("adminTestModal");
  const profilesEl  = document.getElementById("atProfiles");
  const msgEl       = document.getElementById("atMsg");
  const btnClose    = document.getElementById("atClose");
  const btnCancel   = document.getElementById("atCancel");
  const formLogin   = document.getElementById("formLogin");

  if (!modal || !formLogin) return; // página sin el panel → salir

  /* ── Cerrar el modal ── */
  function cerrarModal() {
    modal.hidden = true;
    document.body.classList.remove("at-modal-open");
    profilesEl.innerHTML = "";
    if (msgEl) { msgEl.hidden = true; msgEl.textContent = ""; }
  }
  btnClose?.addEventListener("click",  cerrarModal);
  btnCancel?.addEventListener("click", cerrarModal);
  modal.addEventListener("click", e => { if (e.target === modal) cerrarModal(); });
  document.addEventListener("keydown", e => { if (e.key === "Escape" && !modal.hidden) cerrarModal(); });

  /* ── Mostrar mensaje dentro del modal ── */
  function mostrarAtMsg(texto, tipo = "err") {
    if (!msgEl) return;
    msgEl.textContent = texto;
    msgEl.className   = `at-msg at-msg-${tipo}`;
    msgEl.hidden      = false;
  }

  /* ── Renderizar tarjetas de perfil ── */
  function renderizarPerfiles(perfiles) {
    profilesEl.innerHTML = "";
    perfiles.forEach(p => {
      const icono = ICONOS[p.id] || "bi-person";
      const card  = document.createElement("button");
      card.type   = "button";
      card.className = "at-profile-card";
      card.setAttribute("role", "listitem");
      card.setAttribute("data-perfil", p.id);
      card.innerHTML = `
        <span class="at-pc-icon"><i class="bi ${icono}"></i></span>
        <span class="at-pc-label">${p.label}</span>
        <span class="at-pc-arrow"><i class="bi bi-arrow-right-circle-fill"></i></span>`;
      card.addEventListener("click", () => elegirPerfil(p.id));
      profilesEl.appendChild(card);
    });
  }

  /* ── El admin elige un perfil → pedir token al Worker ── */
  async function elegirPerfil(perfilId) {
    profilesEl.querySelectorAll(".at-profile-card").forEach(c => {
      c.disabled = true;
      c.classList.toggle("at-loading", c.dataset.perfil === perfilId);
    });

    try {
      const res  = await fetch(`${WORKER_URL}/admin-test`, {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({
          codigo: document.getElementById("lEmail").value.trim(),
          perfil: perfilId
        })
      });
      const data = await res.json();

      if (!data.ok || !data.token) {
        mostrarAtMsg(data.error || "No se pudo obtener acceso. Intenta de nuevo.", "err");
        profilesEl.querySelectorAll(".at-profile-card").forEach(c => {
          c.disabled = false;
          c.classList.remove("at-loading");
        });
        return;
      }

      /* Guardar token en sessionStorage (nunca en la URL) */
      sessionStorage.setItem("pn_admin_test_token",  data.token);
      sessionStorage.setItem("pn_admin_test_perfil",  data.perfil);
      sessionStorage.setItem("pn_admin_test_ts",      Date.now().toString());

      mostrarAtMsg(`Redirigiendo a "${data.perfil}"…`, "ok");
      setTimeout(() => { window.location.href = data.url; }, 900);

    } catch {
      mostrarAtMsg("Error de red al conectar con el servidor. Verifica tu conexión.", "err");
      profilesEl.querySelectorAll(".at-profile-card").forEach(c => {
        c.disabled = false;
        c.classList.remove("at-loading");
      });
    }
  }

  /* ── Interceptar el submit del formulario de LOGIN ── */
  formLogin.addEventListener("submit", async function interceptarAdminTest(e) {
    const correoVal = document.getElementById("lEmail")?.value?.trim() ?? "";

    /* Solo actuar si el campo contiene exactamente el trigger (sin importar mayús/minús).
       Cualquier otra cadena sigue el flujo normal de Firebase. */
    if (correoVal.toUpperCase() !== ADMIN_TRIGGER) return; // flujo normal

    /* A partir de aquí es modo prueba */
    e.preventDefault();
    e.stopImmediatePropagation(); // evita que el listener principal de login.js procese esto

    const btnLogin = document.getElementById("btnLogin");
    if (btnLogin) { btnLogin.disabled = true; btnLogin.classList.add("is-loading"); }

    try {
      const res  = await fetch(`${WORKER_URL}/admin-test`, {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ codigo: correoVal, perfil: "" })
      });
      const data = await res.json();

      if (!data.ok || !Array.isArray(data.perfiles)) {
        /* Error genérico — igual que correo inválido, sin revelar nada */
        const msgLogin = document.getElementById("msgLogin");
        if (msgLogin) {
          msgLogin.textContent = "Escribe un correo válido";
          msgLogin.className   = "lg-msg is-error";
        }
        return;
      }

      /* Autorizado: mostrar selector de perfiles */
      renderizarPerfiles(data.perfiles);
      modal.hidden = false;
      document.body.classList.add("at-modal-open");
      profilesEl.querySelector(".at-profile-card")?.focus();

    } catch {
      const msgLogin = document.getElementById("msgLogin");
      if (msgLogin) {
        msgLogin.textContent = "Escribe un correo válido";
        msgLogin.className   = "lg-msg is-error";
      }
    } finally {
      if (btnLogin) { btnLogin.disabled = false; btnLogin.classList.remove("is-loading"); }
    }

  }, true); /* capture:true para ejecutarse ANTES del listener principal */

})();
