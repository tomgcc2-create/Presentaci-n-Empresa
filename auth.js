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
    getDoc
} from "https://www.gstatic.com/firebasejs/11.6.0/firebase-firestore.js";

export async function registrar(nombre, email, password, apellido = "", rol = "usuario") {
    const credencial = await createUserWithEmailAndPassword(auth, email, password);

    await updateProfile(credencial.user, { displayName: nombre });

    await setDoc(doc(db, "usuarios", credencial.user.uid), {
        nombre,
        apellido,
        email,
        rol
    });

    return credencial.user;
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
    const instantanea = await getDoc(doc(db, "usuarios", credencial.user.uid));
    return { user: credencial.user, perfil: instantanea.exists() ? instantanea.data() : null };
}

export async function crearPerfil(user, rol, proveedor = "") {
    const [nombre, ...resto] = (user.displayName || "").trim().split(" ");
    await setDoc(doc(db, "usuarios", user.uid), {
        nombre: nombre || "",
        apellido: resto.join(" "),
        email: user.email || "",
        rol,
        proveedor
    }, { merge: true });
}

/* "Recordarme": true = la sesión sigue al cerrar el navegador; false = solo esta pestaña */
export async function configurarPersistencia(recordar) {
    await setPersistence(auth, recordar ? browserLocalPersistence : browserSessionPersistence);
}

export async function iniciarSesion(email, password) {
    const credencial = await signInWithEmailAndPassword(auth, email, password);
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