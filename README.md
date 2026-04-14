# 🔥 CLAVEX COLOMBIA SAS — Guía Firebase Completa

---

## 📁 Estructura del Proyecto

```
/frontend
  ├── index.html                 ← Página principal completa
  ├── /css
  │   └── styles.css             ← Sistema de diseño CLAVEX
  ├── /js
  │   ├── firebase-config.js     ← 🔑 CONFIGURACIÓN FIREBASE (editar aquí)
  │   ├── api.js                 ← Funciones Firestore (GET/POST/PUT/DELETE)
  │   └── productos.js           ← Lógica UI, render, filtros, modal
  └── /assets
      └── logo-clavex.png        ← (coloca tu logo aquí)
```

---

## 🚀 PASO 1 — Crear Proyecto Firebase

1. Ve a **https://console.firebase.google.com**
2. Clic en **"Agregar proyecto"**
3. Nombre: `clavex-colombia`
4. Desactiva Google Analytics (opcional)
5. Clic en **"Crear proyecto"**

---

## 🔑 PASO 2 — Registrar App Web

1. En el panel del proyecto, clic en el ícono **`</>`** (Web)
2. Nombre de la app: `CLAVEX Web`
3. ✅ Activa **Firebase Hosting** (opcional pero recomendado)
4. Clic en **"Registrar app"**
5. Copia el objeto `firebaseConfig` que aparece:

```javascript
const firebaseConfig = {
  apiKey:            "AIzaSy...",
  authDomain:        "clavex-colombia.firebaseapp.com",
  projectId:         "clavex-colombia",
  storageBucket:     "clavex-colombia.appspot.com",
  messagingSenderId: "123456789",
  appId:             "1:123456789:web:abc123..."
};
```

---

## ✏️ PASO 3 — Pegar Credenciales

Abre `frontend/js/firebase-config.js` y reemplaza:

```javascript
// ANTES:
const firebaseConfig = {
  apiKey:            "TU_API_KEY_AQUI",
  authDomain:        "TU_PROJECT_ID.firebaseapp.com",
  projectId:         "TU_PROJECT_ID",
  ...
};

// DESPUÉS (pega tus valores reales):
const firebaseConfig = {
  apiKey:            "AIzaSyTu_Clave_Real",
  authDomain:        "clavex-colombia.firebaseapp.com",
  projectId:         "clavex-colombia",
  ...
};
```

---

## 🗄️ PASO 4 — Crear Firestore Database

1. En la consola Firebase → **Build → Firestore Database**
2. Clic en **"Crear base de datos"**
3. Selecciona **"Comenzar en modo de prueba"** (para desarrollo)
4. Elige una región: **`us-central1`** o `southamerica-east1`
5. Clic en **"Listo"**

---

## 🌱 PASO 5 — Poblar con Productos de Ejemplo

Una vez configurado Firebase, abre la página en el navegador y ejecuta en la **consola del navegador** (F12 → Console):

```javascript
await ClavexAPI.seedProductos()
```

Esto insertará **12 productos** de ejemplo en Firestore automáticamente.

**Resultado esperado:**
```
🌱 Seed completado: 12 productos añadidos a Firestore
```

---

## 📦 PASO 6 — Agregar Productos Manualmente

### Opción A — Desde la consola del navegador:
```javascript
await ClavexAPI.crearProducto({
  nombre:      "Taladro Percutor 800W",
  descripcion: "Herramientas de alta calidad para uso profesional y doméstico",
  precio:      320000,
  imagen:      "https://url-de-tu-imagen.com/taladro.jpg",
  categoria:   "herramientas"
})
```

### Opción B — Desde Firebase Console:
1. Ve a **Firestore Database → Iniciar colección**
2. ID de colección: `productos`
3. Agrega un documento con estos campos:

| Campo        | Tipo      | Ejemplo                              |
|--------------|-----------|--------------------------------------|
| nombre       | string    | "Taladro Industrial Bosch 750W"      |
| descripcion  | string    | "Herramienta de alta potencia..."    |
| precio       | number    | 285000                               |
| imagen       | string    | "https://url/imagen.jpg"             |
| categoria    | string    | "herramientas"                       |
| disponible   | boolean   | true                                 |
| destacado    | boolean   | false                                |
| creadoEn     | timestamp | (auto generado)                      |

---

## 🔄 Funciones API Disponibles

```javascript
// GET — Obtener todos los productos
await ClavexAPI.getProductos()
await ClavexAPI.getProductos({ categoria: 'herramientas' })

// GET por ID
await ClavexAPI.getProductoPorId('ID_DEL_DOCUMENTO')

// POST — Crear nuevo producto
await ClavexAPI.crearProducto({ nombre, descripcion, precio, imagen, categoria })

// PUT — Actualizar producto
await ClavexAPI.actualizarProducto('ID_DEL_DOCUMENTO', { precio: 300000 })

// DELETE — Desactivar producto (soft delete)
await ClavexAPI.eliminarProducto('ID_DEL_DOCUMENTO')

// DELETE permanente
await ClavexAPI.eliminarProducto('ID_DEL_DOCUMENTO', true)

// SEED — Poblar con datos de ejemplo
await ClavexAPI.seedProductos()
```

---

## 📡 Categorías Disponibles

| Valor         | Etiqueta     | Color    |
|---------------|--------------|----------|
| herramientas  | Herramientas | #ff6a00  |
| electricidad  | Electricidad | #007bff  |
| fijacion      | Fijación     | #ff6a00  |
| plomeria      | Plomería     | #17a2b8  |
| pintura       | Pintura      | #6f42c1  |
| construccion  | Construcción | #28a745  |
| seguridad     | Seguridad    | #dc3545  |
| otros         | Otros        | #6c757d  |

---

## 🔒 Reglas de Seguridad Firestore (Producción)

Cuando pases a producción, actualiza las reglas en Firebase Console → Firestore → Rules:

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /productos/{docId} {
      allow read: if true;                          // Cualquiera puede leer
      allow create, update, delete: if request.auth != null;  // Solo autenticados
    }
    match /contactos/{docId} {
      allow create: if true;                        // Cualquiera puede enviar contacto
      allow read, update, delete: if request.auth != null;
    }
  }
}
```

---

## 🌐 Hosting en Firebase (Opcional)

```bash
# Instalar Firebase CLI
npm install -g firebase-tools

# Login
firebase login

# Inicializar en la carpeta del proyecto
firebase init hosting

# Responde:
# ✔ Directorio público: frontend
# ✔ Single-page app: No
# ✔ Sobrescribir index.html: No

# Desplegar
firebase deploy
```

Tu sitio quedará en: `https://clavex-colombia.web.app`

---

## 🛠️ Próximos Pasos Sugeridos

- [ ] Panel de administración para CRUD de productos
- [ ] Firebase Auth para proteger el admin
- [ ] Firebase Storage para subir imágenes de productos
- [ ] Notificaciones de pedidos por Firebase Cloud Messaging
- [ ] Analytics de productos más vistos

---

**CLAVEX COLOMBIA SAS** · David Galvis · +57 315 709 6324
