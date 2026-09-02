import { initializeApp } from "https://www.gstatic.com/firebasejs/11.6.0/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/11.6.0/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/11.6.0/firebase-firestore.js";

export const firebaseConfig = {
  apiKey: "AIzaSyDFHe0xWDU8Uisue0LH4tjAIgO6R0tlxCc",
  authDomain: "empresa-bd2fc.firebaseapp.com",
  projectId: "empresa-bd2fc",
  storageBucket: "empresa-bd2fc.firebasestorage.app",
  messagingSenderId: "490000723314",
  appId: "1:490000723314:web:7f63facd37d496465e01eb"
};

export const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);