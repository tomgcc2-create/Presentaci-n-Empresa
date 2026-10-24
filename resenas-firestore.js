/* ═══════════════════════════════════════════════════════════════
   PriceNice — resenas-firestore.js
   Reseñas de productos guardadas en Firestore (colección "resenas").
   Expone window.PN_RESENAS = { enviar(), cargar() } para tienda.html.
═══════════════════════════════════════════════════════════════ */
import { auth, db } from "./firebase-config.js";
import { collection, addDoc, getDocs, query, where, serverTimestamp }
  from "https://www.gstatic.com/firebasejs/11.6.0/firebase-firestore.js";

const fechaISO = t => { try { return (t?.toDate ? t.toDate() : new Date()).toISOString().slice(0, 10); } catch { return new Date().toISOString().slice(0, 10); } };

window.PN_RESENAS = {
  /* Guarda la reseña de quien tiene la sesión iniciada. */
  async enviar(prod, calificacion, comentario) {
    const u = auth.currentUser;
    if (!u) throw new Error("Inicia sesión para escribir una reseña.");
    await addDoc(collection(db, "resenas"), {
      usuarioId: u.uid,
      nombreUsuario: u.displayName || (u.email || "Comprador").split("@")[0],
      destino: "tienda",
      tipo: "producto",
      productoId: String(prod.id),
      productoNombre: prod.nombre || "",
      tiendaNombre: prod.tienda || null,
      vendedorId: prod.vendedorId || null,
      calificacion: parseInt(calificacion, 10),
      comentario,
      estado: "aprobada",
      fecha: serverTimestamp()
    });
  },

  /* Reseñas aprobadas de un producto, de la más nueva a la más antigua. */
  async cargar(productoId) {
    const snap = await getDocs(query(collection(db, "resenas"),
      where("productoId", "==", String(productoId)), where("estado", "==", "aprobada")));
    return snap.docs.map(d => {
      const r = d.data();
      return { id: d.id, nombre: r.nombreUsuario || "Comprador", estrellas: r.calificacion || 0,
        comentario: r.comentario || "", respuesta: r.respuesta || "", fecha: fechaISO(r.fecha), fotos: [], _t: r.fecha?.seconds || 0 };
    }).sort((a, b) => b._t - a._t);
  }
};
window.dispatchEvent(new Event("pn:resenas-listas"));
