// src/firebaseConfig.ts
import { initializeApp } from "firebase/app";
import { initializeFirestore, setLogLevel } from "firebase/firestore";

const firebaseConfig = {
    apiKey: "AIzaSyDWKZpBDRk3LazTzRLh6JV5aB9g6IkKiI4",
    authDomain: "wheel-fortune-322d9.firebaseapp.com",
    projectId: "wheel-fortune-322d9",
    storageBucket: "wheel-fortune-322d9.firebasestorage.app", // (no afecta a Firestore)
    messagingSenderId: "558866755239",
    appId: "1:558866755239:web:6e31d8b31d812a51ce7582",
    measurementId: "G-VWPTX01QWV",
};

export const app = initializeApp(firebaseConfig);

// Opcional para ver más info en consola mientras pruebas
setLogLevel("debug");

// ⚠️ Clave para evitar el 400 en Listen:
export const db = initializeFirestore(app, {
    experimentalForceLongPolling: true,
    // Alternativa: experimentalAutoDetectLongPolling: true,
});
