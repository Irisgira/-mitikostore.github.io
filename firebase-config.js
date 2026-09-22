// ============================================================
// CONFIGURACIÓN DE FIREBASE — datos reales de tu proyecto
// "mi-catalogo-mitiko" (Firebase Console > ⚙️ Configuración del
// proyecto > tus apps > el ícono </>).
// ============================================================
const firebaseConfig = {
    apiKey: "AIzaSyBqibIv4sNTZE-3UhcMT-Xs8H9-u6ZazO0",
    authDomain: "mi-catalogo-mitiko.firebaseapp.com",
    projectId: "mi-catalogo-mitiko",
    storageBucket: "mi-catalogo-mitiko.firebasestorage.app",
    messagingSenderId: "598952640579",
    appId: "1:598952640579:web:7b81b28749bf38839714f6"
};

firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();
const auth = firebase.auth();
