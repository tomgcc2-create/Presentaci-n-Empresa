import { auth, db } from "./firebase-config.js";
import {
    createUserWithEmailAndPassword,
    signInWithEmailAndPassword,
    signOut,
    onAuthStateChanged,
    updateProfile,
    sendPasswordResetEmail,
    signInWithPopup,
    GoogleAuthProvider,
    OAuthProvider,
    FacebookAuthProvider,
    setPersistence,
    browserLocalPersistence,
    browserSessionPersistence
} from "https://www.gstatic.com/firebasejs/11.6.0/firebase-auth.js";
import {
    doc,
    setDoc,
    getDoc,
    updateDoc,
    serverTimestamp
} from "https://www.gstatic.com/firebasejs/11.6.0/firebase-firestore.js";

/* Roles que una persona puede elegir al registrarse. "admin" y "dueño" solo los asigna un administrador. */
const ROLES_PUBLICOS = ["usuario", "vendedor", "verificador", "patrocinador"];
const rolSeguro = (rol) => ROLES_PUBLICOS.includes(rol) ? rol : "usuario";

/* Una cuenta desactivada por el administrador no puede ingresar. */
async function verificarCuentaActiva(uid) {
    const instantanea = await getDoc(doc(db, "usuarios", uid));
    if (instantanea.exists() && instantanea.data().activo === false) {
        await signOut(auth);
        const error = new Error("Cuenta desactivada");
        error.code = "auth/user-disabled";
        throw error;
    }
    return instantanea;
}

export async function registrar(nombre, email, password, apellido = "", rol = "usuario", datosVendedor = null) {
    const credencial = await createUserWithEmailAndPassword(auth, email, password);

    await updateProfile(credencial.user, { displayName: nombre });

    const perfil = {
        nombre,
        apellido,
        email,
        rol: rolSeguro(rol),
        activo: true
    };

    /* Si el rol es vendedor, guardamos sus datos personales, los de la tienda
       y marcamos la cuenta como pendiente de verificación. */
    if (rolSeguro(rol) === "vendedor" && datosVendedor) {
        perfil.verificacion = "pendiente";   // pendiente → verificado | rechazado
        perfil.verificado = false;
        perfil.fechaSolicitud = serverTimestamp();
        perfil.vendedor = {
            telefono: datosVendedor.telefono || "",
            tipoDocumento: datosVendedor.tipoDocumento || "",
            numeroDocumento: datosVendedor.numeroDocumento || "",
            iaNota: datosVendedor.iaNota || ""   // valoración preliminar de la IA
        };
        perfil.tienda = {
            nombre: datosVendedor.tiendaNombre || "",
            categoria: datosVendedor.tiendaCategoria || "",
            direccion: datosVendedor.tiendaDireccion || "",
            barrio: datosVendedor.tiendaBarrio || "",
            ciudad: datosVendedor.tiendaCiudad || "Bogotá",
            descripcion: datosVendedor.tiendaDescripcion || ""
        };
    }

    await setDoc(doc(db, "usuarios", credencial.user.uid), perfil);

    return credencial.user;
}

/* Un admin o la IA marcan al vendedor como verificado o rechazado. */
export async function actualizarVerificacion(uid, estado, observacion = "") {
    const datos = {
        verificacion: estado,            // "verificado" | "rechazado"
        verificado: estado === "verificado",
        verificacionNota: observacion || ""
    };
    if (estado === "verificado") {
        datos.verificadoEn = serverTimestamp();
    } else {
        datos.verificado = false;
        datos.verificadoEn = null;
    }
    await updateDoc(doc(db, "usuarios", uid), datos);
}

/* Consulta si el vendedor ya está verificado (para mostrarlo en su panel). */
export async function obtenerVerificacion(uid) {
    const instantanea = await getDoc(doc(db, "usuarios", uid));
    if (!instantanea.exists()) return { verificacion: null, verificado: false };
    const d = instantanea.data();
    return {
        verificacion: d.verificacion || null,
        verificado: !!d.verificado,
        nota: d.verificacionNota || ""
    };
}

/* ───────── Acceso con Google / Microsoft (Hotmail, Outlook) / Facebook ─────────
   Cada proveedor hay que activarlo en Firebase → Authentication → Método de acceso. */
function crearProveedor(nombre) {
    if (nombre === "google") {
        const p = new GoogleAuthProvider();
        p.setCustomParameters({ prompt: "select_account" });
        return p;
    }
    if (nombre === "microsoft") {
        const p = new OAuthProvider("microsoft.com");
        p.setCustomParameters({ prompt: "select_account" });
        return p;
    }
    if (nombre === "facebook") return new FacebookAuthProvider();
    throw new Error("Proveedor no soportado: " + nombre);
}

/* Devuelve { user, perfil }. perfil es null si es la primera vez (todavía no eligió tipo de usuario). */
export async function ingresarConProveedor(nombre) {
    const credencial = await signInWithPopup(auth, crearProveedor(nombre));
    const instantanea = await verificarCuentaActiva(credencial.user.uid);
    return { user: credencial.user, perfil: instantanea.exists() ? instantanea.data() : null };
}

export async function crearPerfil(user, rol, proveedor = "") {
    const [nombre, ...resto] = (user.displayName || "").trim().split(" ");
    const perfil = {
        nombre: nombre || "",
        apellido: resto.join(" "),
        email: user.email || "",
        rol: rolSeguro(rol),
        activo: true,
        proveedor
    };
    /* Si eligió vendedor con red social, marcamos verificación pendiente.
       Los datos de la tienda los completa después en su panel. */
    if (rolSeguro(rol) === "vendedor") {
        perfil.verificacion = "pendiente";
        perfil.verificado = false;
        perfil.fechaSolicitud = serverTimestamp();
        perfil.tienda = { nombre: "", categoria: "", direccion: "", barrio: "", ciudad: "Bogotá", descripcion: "" };
    }
    await setDoc(doc(db, "usuarios", user.uid), perfil, { merge: true });
}

/* "Recordarme": true = la sesión sigue al cerrar el navegador; false = solo esta pestaña */
export async function configurarPersistencia(recordar) {
    await setPersistence(auth, recordar ? browserLocalPersistence : browserSessionPersistence);
}

export async function iniciarSesion(email, password) {
    const credencial = await signInWithEmailAndPassword(auth, email, password);
    await verificarCuentaActiva(credencial.user.uid);
    return credencial.user;
}

export async function cerrarSesion() {
    await signOut(auth);
}

export async function recuperarPassword(email) {
    await sendPasswordResetEmail(auth, email);
}

export function observarSesion(callback) {
    return onAuthStateChanged(auth, callback);
}

export async function obtenerRol(uid) {
    const instantanea = await getDoc(doc(db, "usuarios", uid));
    if (!instantanea.exists()) return "usuario";
    return instantanea.data().rol || "usuario";
}

export function mensajeError(error) {
    const codigos = {
        "auth/invalid-email": "El correo no tiene un formato válido.",
        "auth/missing-password": "Escribe tu contraseña.",
        "auth/weak-password": "La contraseña debe tener al menos 6 caracteres.",
        "auth/email-already-in-use": "Ese correo ya está registrado.",
        "auth/invalid-credential": "Correo o contraseña incorrectos.",
        "auth/user-not-found": "No existe una cuenta con ese correo.",
        "auth/wrong-password": "Correo o contraseña incorrectos.",
        "auth/too-many-requests": "Demasiados intentos. Espera unos minutos.",
        "auth/network-request-failed": "Sin conexión con Firebase.",
        "auth/operation-not-allowed": "Este método de acceso aún no está activado en Firebase Authentication.",
        "auth/popup-closed-by-user": "Cerraste la ventana antes de terminar. Intenta de nuevo.",
        "auth/cancelled-popup-request": "Ya hay una ventana de acceso abierta.",
        "auth/popup-blocked": "Tu navegador bloqueó la ventana. Permite las ventanas emergentes e intenta de nuevo.",
        "auth/account-exists-with-different-credential": "Ya existe una cuenta con ese correo usando otro método de acceso. Ingresa con ese método.",
        "auth/unauthorized-domain": "Este dominio no está autorizado en Firebase (Authentication → Configuración → Dominios autorizados).",
        "auth/invalid-api-key": "Revisa los datos de firebase-config.js",
        "auth/api-key-not-valid-please-pass-a-valid-api-key": "Falta pegar tus claves reales en firebase-config.js.",
        "auth/missing-email": "Escribe tu correo electrónico.",
        "auth/user-disabled": "Esta cuenta ha sido deshabilitada. Contacta al soporte."
    };

    return codigos[error?.code] || "Ocurrió un error: " + (error.message || error);
}

/**
 * Devuelve el estado actual de la solicitud de verificación de vendedor de un usuario.
 * Estados posibles: "pendiente" | "en_revision" | "aprobada" | "rechazada" | null (sin solicitud)
 */
export async function obtenerEstadoSolicitudVendedor(uid) {
    try {
        const instantanea = await getDoc(doc(db, "solicitudesVendedor", uid));
        if (!instantanea.exists()) return null;
        return instantanea.data().estado || "pendiente";
    } catch {
        return null;
    }
}

/**
 * Devuelve los datos completos de la solicitud de vendedor de un usuario,
 * o null si no existe o hay un error.
 */
export async function obtenerSolicitudVendedor(uid) {
    try {
        const instantanea = await getDoc(doc(db, "solicitudesVendedor", uid));
        if (!instantanea.exists()) return null;
        return { id: instantanea.id, ...instantanea.data() };
    } catch {
        return null;
    }
}
