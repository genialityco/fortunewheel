// src/firebaseConfig.ts
import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";

// Reemplaza estos valores con los de tu proyecto Firebase
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

export { db };
