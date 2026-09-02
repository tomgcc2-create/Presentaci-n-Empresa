import { auth, db } from "./firebase-config.js";
import {
    createUserWithEmailAndPassword,
    signInWithEmailAndPassword,
    signOut,
    onAuthStateChanged,
    updateProfile,
    sendPasswordResetEmail
} from "https://www.gstatic.com/firebasejs/11.6.0/firebase-auth.js";
import {
    doc,
    setDoc,
    getDoc
} from "https://www.gstatic.com/firebasejs/11.6.0/firebase-firestore.js";

export async function registrar(nombre, email, password, apellido = "") {
    const credencial = await createUserWithEmailAndPassword(auth, email, password);

    await updateProfile(credencial.user, { displayName: nombre });

    await setDoc(doc(db, "usuarios", credencial.user.uid), {
        nombre,
        apellido,
        email,
        rol: "usuario"
    });

    return credencial.user;
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
        "auth/operation-not-allowed": "Activa Email/Contraseña en Firebase Authentication.",
        "auth/invalid-api-key": "Revisa los datos de firebase-config.js",
        "auth/api-key-not-valid-please-pass-a-valid-api-key": "Falta pegar tus claves reales en firebase-config.js."
    };

    return codigos[error?.code] || "Ocurrió un error: " + (error.message || error);
}