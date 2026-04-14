/**
 * ╔══════════════════════════════════════════════════════╗
 * ║          CLAVEX — API Simulada con Firebase          ║
 * ║                      api.js                          ║
 * ╚══════════════════════════════════════════════════════╝
 *
 * Estas funciones simulan endpoints REST tradicionales
 * pero internamente usan Firebase Firestore como fuente
 * de datos. Estructura idéntica a una API REST:
 *
 *   GET    /api/productos        → getProductos()
 *   GET    /api/productos/:id    → getProductoPorId(id)
 *   POST   /api/productos        → crearProducto(data)
 *   PUT    /api/productos/:id    → actualizarProducto(id, data)
 *   DELETE /api/productos/:id    → eliminarProducto(id)
 */

import { db } from './firebase-config.js';
import {
  collection,
  doc,
  getDocs,
  getDoc,
  addDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  serverTimestamp,
  onSnapshot,
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

// ─── Nombre de la colección en Firestore ───────────────
const COLECCION = "productos";
const productosRef = () => collection(db, COLECCION);

/* ════════════════════════════════════════════════════════
   📥 GET /api/productos
   Obtener todos los productos con filtros opcionales.
   @param {Object} filtros - { categoria, disponible }
   @returns {Promise<Array>}  Array de productos
   ════════════════════════════════════════════════════════ */
export async function getProductos(filtros = {}) {
  try {
    let q;

    if (filtros.categoria && filtros.categoria !== "todos") {
      // Firestore: filtrar por campo
      q = query(
        productosRef(),
        where("categoria", "==", filtros.categoria),
        where("disponible", "==", true),
        orderBy("creadoEn", "desc")
      );
    } else {
      q = query(
        productosRef(),
        where("disponible", "==", true),
        orderBy("creadoEn", "desc")
      );
    }

    const snapshot = await getDocs(q);

    const productos = snapshot.docs.map(doc => ({
      id: doc.id,         // ID del documento Firestore
      ...doc.data(),      // Todos los campos del documento
    }));

    return { ok: true, productos, total: productos.length };

  } catch (error) {
    console.error("[API] getProductos error:", error);
    throw new ApiError("Error al cargar los productos", error.code);
  }
}

/* ════════════════════════════════════════════════════════
   📥 GET /api/productos/:id
   Obtener un producto por su ID de documento Firestore.
   @param {string} id - ID del documento
   @returns {Promise<Object>}
   ════════════════════════════════════════════════════════ */
export async function getProductoPorId(id) {
  try {
    const docRef  = doc(db, COLECCION, id);
    const docSnap = await getDoc(docRef);

    if (!docSnap.exists()) {
      throw new ApiError("Producto no encontrado", "not-found");
    }

    return { ok: true, producto: { id: docSnap.id, ...docSnap.data() } };

  } catch (error) {
    console.error("[API] getProductoPorId error:", error);
    throw error instanceof ApiError ? error : new ApiError(error.message, error.code);
  }
}

/* ════════════════════════════════════════════════════════
   📤 POST /api/productos
   Crear un nuevo producto en Firestore.
   @param {Object} datos - Datos del producto
   @returns {Promise<Object>}

   Estructura esperada:
   {
     nombre:      "Taladro Industrial",
     descripcion: "Herramienta de alta potencia",
     precio:      250000,
     imagen:      "https://url-imagen.com/taladro.jpg",
     categoria:   "herramientas"
   }
   ════════════════════════════════════════════════════════ */
export async function crearProducto(datos) {
  try {
    validarProducto(datos);

    const nuevoProducto = {
      nombre:      datos.nombre.trim(),
      descripcion: datos.descripcion.trim(),
      precio:      Number(datos.precio),
      imagen:      datos.imagen || "",
      categoria:   datos.categoria.toLowerCase().trim(),
      disponible:  datos.disponible !== undefined ? datos.disponible : true,
      destacado:   datos.destacado || false,
      creadoEn:    serverTimestamp(),
      actualizadoEn: serverTimestamp(),
    };

    const docRef = await addDoc(productosRef(), nuevoProducto);

    console.log("[API] Producto creado con ID:", docRef.id);
    return { ok: true, id: docRef.id, mensaje: "Producto creado correctamente" };

  } catch (error) {
    console.error("[API] crearProducto error:", error);
    throw error instanceof ApiError ? error : new ApiError(error.message, error.code);
  }
}

/* ════════════════════════════════════════════════════════
   ✏️ PUT /api/productos/:id
   Actualizar un producto existente.
   @param {string} id    - ID del documento Firestore
   @param {Object} datos - Campos a actualizar (parcial)
   @returns {Promise<Object>}
   ════════════════════════════════════════════════════════ */
export async function actualizarProducto(id, datos) {
  try {
    const docRef = doc(db, COLECCION, id);

    // Verificar que existe
    const docSnap = await getDoc(docRef);
    if (!docSnap.exists()) {
      throw new ApiError("Producto no encontrado para actualizar", "not-found");
    }

    const cambios = {
      ...datos,
      actualizadoEn: serverTimestamp(),
    };

    // Limpiar campos undefined
    Object.keys(cambios).forEach(k => cambios[k] === undefined && delete cambios[k]);

    await updateDoc(docRef, cambios);

    console.log("[API] Producto actualizado:", id);
    return { ok: true, id, mensaje: "Producto actualizado correctamente" };

  } catch (error) {
    console.error("[API] actualizarProducto error:", error);
    throw error instanceof ApiError ? error : new ApiError(error.message, error.code);
  }
}

/* ════════════════════════════════════════════════════════
   🗑️ DELETE /api/productos/:id
   Eliminar un producto.
   Usa soft delete (disponible = false) por defecto.
   @param {string} id   - ID del documento
   @param {boolean} hard - Si true, elimina permanentemente
   @returns {Promise<Object>}
   ════════════════════════════════════════════════════════ */
export async function eliminarProducto(id, hard = false) {
  try {
    const docRef = doc(db, COLECCION, id);

    if (hard) {
      // Hard delete — elimina el documento permanentemente
      await deleteDoc(docRef);
    } else {
      // Soft delete — solo marca como no disponible
      await updateDoc(docRef, {
        disponible:    false,
        actualizadoEn: serverTimestamp(),
      });
    }

    console.log(`[API] Producto ${hard ? 'eliminado' : 'desactivado'}:`, id);
    return { ok: true, id, mensaje: "Producto eliminado correctamente" };

  } catch (error) {
    console.error("[API] eliminarProducto error:", error);
    throw new ApiError(error.message, error.code);
  }
}

/* ════════════════════════════════════════════════════════
   🔴 LISTENER EN TIEMPO REAL
   Escucha cambios en la colección y ejecuta callback.
   Ideal para actualizar la UI automáticamente.
   @param {Function} callback - función que recibe el array
   @returns {Function} unsubscribe - llama para dejar de escuchar
   ════════════════════════════════════════════════════════ */
export function escucharProductos(callback) {
  const q = query(
    productosRef(),
    where("disponible", "==", true),
    orderBy("creadoEn", "desc")
  );

  const unsubscribe = onSnapshot(q, (snapshot) => {
    const productos = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
    callback(productos);
  }, (error) => {
    console.error("[API] Listener error:", error);
  });

  return unsubscribe; // Guardar y llamar al desmontar
}

/* ════════════════════════════════════════════════════════
   🌱 SEED — Poblar Firestore con datos de ejemplo
   Llama desde consola del navegador: await seedProductos()
   ════════════════════════════════════════════════════════ */
export async function seedProductos() {
  const productosEjemplo = [
    { nombre:"Taladro Industrial Bosch 750W", descripcion:"Herramienta de alta potencia para trabajos exigentes en concreto, madera y metal. Velocidad variable y mandril rápido.", precio:285000, imagen:"", categoria:"herramientas", disponible:true, destacado:true },
    { nombre:"Tornillos Autoperforantes 1\"", descripcion:"Caja x500. Acero galvanizado de alta resistencia para drywall y estructura metálica. Distribución confiable para proyectos.", precio:22000, imagen:"", categoria:"fijacion", disponible:true, destacado:false },
    { nombre:"Cable THHN Calibre 12 AWG", descripcion:"Rollo 100m certificado. Equipos resistentes diseñados para alto rendimiento en instalaciones residenciales y comerciales.", precio:98000, imagen:"", categoria:"electricidad", disponible:true, destacado:true },
    { nombre:"Pintura Vinílica Interior 4L", descripcion:"Soluciones completas en ferretería. Alta cubrición y secado rápido. Rendimiento 12 m²/L. +30 colores disponibles.", precio:65000, imagen:"", categoria:"pintura", disponible:true, destacado:false },
    { nombre:"Tubería PVC Presión ½\"", descripcion:"Productos confiables para construcción y mantenimiento. Barra 6m para instalaciones hidráulicas. Norma NTC 382.", precio:18000, imagen:"", categoria:"plomeria", disponible:true, destacado:false },
    { nombre:"Martillo de Orejas 20oz", descripcion:"Herramientas de alta calidad para uso profesional y doméstico. Cabeza forjada con mango antivibración de fibra de vidrio.", precio:42000, imagen:"", categoria:"herramientas", disponible:true, destacado:false },
    { nombre:"Varilla Corrugada 3/8\" x 6m", descripcion:"Equipos resistentes diseñados para alto rendimiento. Acero de refuerzo para concreto armado. Norma NTC 2289.", precio:32000, imagen:"", categoria:"construccion", disponible:true, destacado:true },
    { nombre:"Casco de Seguridad Tipo I", descripcion:"Soluciones completas en ferretería para todo tipo de trabajo. ABS resistente, suspensión 4 puntos. Certificado para obra.", precio:28000, imagen:"", categoria:"seguridad", disponible:true, destacado:false },
    { nombre:"Pernos Hexagonales A325 ½\"", descripcion:"Productos confiables para construcción y mantenimiento. Alta resistencia estructural. Paquete x50 con tuerca y arandela.", precio:55000, imagen:"", categoria:"fijacion", disponible:true, destacado:false },
    { nombre:"Nivel de Burbuja 60cm", descripcion:"Herramientas de alta calidad para uso profesional. Precisión ±0.5mm/m. Cuerpo aluminio con regatones protectores.", precio:38000, imagen:"", categoria:"herramientas", disponible:true, destacado:false },
    { nombre:"Interruptor Termomagnético 20A", descripcion:"Equipos resistentes para alto rendimiento. Breaker bifásico certificado RETIE. Para tableros residenciales y comerciales.", precio:48000, imagen:"", categoria:"electricidad", disponible:true, destacado:true },
    { nombre:"Alambre Negro Recocido #18", descripcion:"Distribución confiable para proyectos de construcción. Rollo 1kg para amarre de varilla. Acero dulce de alta flexibilidad.", precio:8500, imagen:"", categoria:"construccion", disponible:true, destacado:false },
  ];

  let creados = 0;
  for (const p of productosEjemplo) {
    await crearProducto(p);
    creados++;
  }

  console.log(`🌱 Seed completado: ${creados} productos añadidos a Firestore`);
  return creados;
}

/* ════════════════════════════════════════════════════════
   🛠️ UTILIDADES INTERNAS
   ════════════════════════════════════════════════════════ */

// Clase de error personalizada
class ApiError extends Error {
  constructor(mensaje, code = "unknown") {
    super(mensaje);
    this.name   = "ApiError";
    this.code   = code;
  }
}

// Validar campos obligatorios antes de crear
function validarProducto(datos) {
  if (!datos.nombre?.trim())
    throw new ApiError("El nombre del producto es obligatorio", "validation");
  if (!datos.descripcion?.trim())
    throw new ApiError("La descripción es obligatoria", "validation");
  if (datos.precio === undefined || isNaN(Number(datos.precio)) || Number(datos.precio) < 0)
    throw new ApiError("El precio debe ser un número válido mayor o igual a 0", "validation");
  if (!datos.categoria?.trim())
    throw new ApiError("La categoría es obligatoria", "validation");
}

// Exportar clase de error para uso en otros módulos
export { ApiError };

// Exponer en window para testing desde consola del navegador
window.ClavexAPI = { getProductos, getProductoPorId, crearProducto, actualizarProducto, eliminarProducto, seedProductos };
