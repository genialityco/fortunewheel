// src/admin/firebaseTest.js
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.2/firebase-app.js";
import { getFirestore, collection, getDocs } from "https://www.gstatic.com/firebasejs/10.7.2/firebase-firestore.js";

// Reemplaza estos valores con los de tu proyecto
const firebaseConfig = {
 apiKey: "AIzaSyDWKZpBDRk3LazTzRLh6JV5aB9g6IkKiI4",
  authDomain: "wheel-fortune-322d9.firebaseapp.com",
  projectId: "wheel-fortune-322d9",
  storageBucket: "wheel-fortune-322d9.firebasestorage.app",
  messagingSenderId: "558866755239",
  appId: "1:558866755239:web:6e31d8b31d812a51ce7582",
  measurementId: "G-VWPTX01QWV"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function testFirestore() {
  try {
    const snapshot = await getDocs(collection(db, "prizes"));
    console.log("Premios en Firestore:", snapshot.docs.map(doc => doc.data()));
    document.body.innerHTML = '<pre>' + JSON.stringify(snapshot.docs.map(doc => doc.data()), null, 2) + '</pre>';
  } catch (e) {
    console.error("Error Firebase:", e);
    document.body.innerHTML = '<pre>' + e.message + '</pre>';
  }
}

testFirestore();
