import { initializeApp } from "https://www.gstatic.com/firebasejs/11.6.0/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/11.6.0/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/11.6.0/firebase-firestore.js";

export const firebaseConfig = {
 apiKey: "AIzaSyAATokjcROkb3-9mkDqL8buOaC0ISJll-k",
  authDomain: "pricenice-bc139.firebaseapp.com",
  projectId: "pricenice-bc139",
  storageBucket: "pricenice-bc139.firebasestorage.app",
  messagingSenderId: "319905538353",
  appId: "1:319905538353:web:5166dfa5e987a85f82d010",
  measurementId: "G-BL4N3BGZS9"
};

export const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);