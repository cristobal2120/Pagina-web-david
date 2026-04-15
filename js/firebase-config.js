/**
 * ╔══════════════════════════════════════════════════════╗
 * ║        CLAVEX COLOMBIA SAS — Firebase Config         ║
 * ║                  firebase-config.js                  ║
 * ╚══════════════════════════════════════════════════════╝
 *
 * 📋 INSTRUCCIONES PARA CONECTAR TU PROYECTO FIREBASE:
 * ─────────────────────────────────────────────────────
 * 1. Ve a https://console.firebase.google.com
 * 2. Clic en "Agregar proyecto" → ponle nombre (ej: clavex-colombia)
 * 3. Una vez creado, clic en el ícono </> (Web app)
 * 4. Registra la app y copia el objeto firebaseConfig
 * 5. REEMPLAZA los valores de abajo con los tuyos
 *
 * 🔥 FIRESTORE:
 * 1. En la consola Firebase → Build → Firestore Database
 * 2. Clic "Crear base de datos" → Modo prueba (para desarrollo)
 * 3. Selecciona una región (ej: us-central1)
 * 4. Listo, ya puedes leer/escribir documentos
 *
 * 🔒 REGLAS DE SEGURIDAD FIRESTORE (para producción):
 * ───────────────────────────────────────────────────
 * rules_version = '2';
 * service cloud.firestore {
 *   match /databases/{database}/documents {
 *     match /productos/{docId} {
 *       allow read: if true;                         // Lectura pública
 *       allow write: if request.auth != null;         // Escritura solo autenticados
 *     }
 *   }
 * }
 */

// ─────────────────────────────────────────────────────────
//  🔑 REEMPLAZA ESTOS VALORES CON LOS DE TU PROYECTO
//     Firebase Console → Project Settings → Your apps
// ─────────────────────────────────────────────────────────
const firebaseConfig = {
  apiKey:            "TU_API_KEY_AQUI",
  authDomain:        "TU_PROJECT_ID.firebaseapp.com",
  projectId:         "TU_PROJECT_ID",
  storageBucket:     "TU_PROJECT_ID.appspot.com",
  messagingSenderId: "TU_MESSAGING_SENDER_ID",
  appId:             "TU_APP_ID"
};

// ─────────────────────────────────────────────────────────
//  Inicialización de Firebase (usando CDN modular v9+)
// ─────────────────────────────────────────────────────────
import { initializeApp }                          from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getFirestore, enableIndexedDbPersistence } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
import { getAuth }                                 from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";

// Inicializar app
const app = initializeApp(firebaseConfig);

// Instancia de Firestore
export const db = getFirestore(app);

// Instancia de Auth (para panel admin opcional)
export const auth = getAuth(app);

// Persistencia offline (cache local, mejora rendimiento)
try {
  await enableIndexedDbPersistence(db);
  console.log("✅ Firebase: persistencia offline activada");
} catch (err) {
  if (err.code === 'failed-precondition') {
    console.warn("⚠️ Firebase: múltiples pestañas abiertas, persistencia deshabilitada");
  } else if (err.code === 'unimplemented') {
    console.warn("⚠️ Firebase: navegador no soporta persistencia offline");
  }
}

console.log("🔥 Firebase inicializado correctamente — CLAVEX COLOMBIA SAS");

export default app;
