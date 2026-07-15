// Configuración de Firebase
const firebaseConfig = {
  apiKey: "AIzaSyAzYMR1lfm4HpvGPo6ZtPWi6Te40nfdi5U",
  authDomain: "appcontabilidad2026.firebaseapp.com",
  projectId: "appcontabilidad2026",
  storageBucket: "appcontabilidad2026.appspot.com",
  messagingSenderId: "355924758992",
  appId: "1:355924758992:web:127e644b20c146ac8429d5"
};

// Inicializar Firebase (COMPAT)
if (!firebase.apps.length) {
  firebase.initializeApp(firebaseConfig);

}

// Referencias globales
window.auth = firebase.auth();
window.db = firebase.firestore();

console.log("🔥 Firebase inicializado correctamente");
// 🔔 1. Función para formatear fecha
function formatearFecha(timestamp) {
   if (!timestamp) return "";

   const fecha = timestamp.toDate();
   return fecha.toLocaleString();
}