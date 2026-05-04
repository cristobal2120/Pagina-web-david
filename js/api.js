/**
 * ╔══════════════════════════════════════════════════════╗
 * ║       CLAVEX — API de Catálogo con Google Sheets     ║
 * ║                      api.js                          ║
 * ╚══════════════════════════════════════════════════════╝
 */

import Papa from "https://cdn.jsdelivr.net/npm/papaparse@5.4.1/+esm";

// URL de Google Sheets publicada como CSV.
// Reemplaza con tu enlace real de publicación.
const SHEETS_CSV_URL = "https://docs.google.com/spreadsheets/d/e/2PACX-1vSqSGIEb_vZQnjdK2ibV2pX9Z6vX3KOBwBekAj20jrMd4Qv9u8qw60JCCEfqRj8PiTtS5StZR4OMi6J/pub?output=csv";

function isStockDisponible(stock) {
  if (stock === undefined || stock === null) return true;
  const normalizado = String(stock).trim().toLowerCase();
  return normalizado !== "0" && normalizado !== "no";
}

function limpiarTexto(value) {
  return String(value == null ? "" : value).trim();
}

function parsePrecio(value) {
  const limpio = limpiarTexto(value).replace(/[^\d.,-]/g, "").replace(",", ".");
  const numero = parseFloat(limpio);
  return Number.isFinite(numero) ? numero : 0;
}

function mapearProducto(row, idx) {
  const id = limpiarTexto(row.id) || `sheet-${idx + 1}`;
  return {
    id,
    nombre: limpiarTexto(row.nombre),
    marca: limpiarTexto(row.marca),
    descripcion: limpiarTexto(row.descripcion),
    precio: parsePrecio(row.precio),
    categoria: limpiarTexto(row.categoria).toLowerCase() || "otros",
    imagen: limpiarTexto(row.imagen_url),
    imagen_url: limpiarTexto(row.imagen_url),
    stock: limpiarTexto(row.stock),
    disponible: true,
    destacado: false,
  };
}

function normalizarHeaders(row = []) {
  return row.map((cell) => limpiarTexto(cell).toLowerCase());
}

function construirFilasConHeader(csv) {
  const raw = Papa.parse(csv, { header: false, skipEmptyLines: true });
  const rows = raw.data || [];
  const expected = ["id", "nombre", "marca", "descripcion", "precio", "categoria", "imagen_url"];

  const headerIndex = rows.findIndex((row) => {
    const headers = normalizarHeaders(row);
    return expected.every((h) => headers.includes(h));
  });

  if (headerIndex === -1) {
    throw new ApiError(
      "No se encontraron encabezados válidos en el CSV (id,nombre,marca,descripcion,precio,categoria,imagen_url)",
      "invalid-csv-headers"
    );
  }

  const headers = normalizarHeaders(rows[headerIndex]);
  return rows.slice(headerIndex + 1).map((row) =>
    Object.fromEntries(headers.map((h, i) => [h, row[i]]))
  );
}

/* ════════════════════════════════════════════════════════
  📥 GET /api/productos (Google Sheets CSV)
  Obtiene catálogo publicado en Google Sheets y lo mapea
  al formato que usa la UI.
  @param {Object} filtros - { categoria }
   @returns {Promise<Array>}  Array de productos
   ════════════════════════════════════════════════════════ */
export async function getProductos(filtros = {}) {
  try {
    if (!SHEETS_CSV_URL || SHEETS_CSV_URL.includes("REEMPLAZA_AQUI")) {
      throw new ApiError("Configura la URL pública CSV de Google Sheets", "missing-csv-url");
    }

    const url = `${SHEETS_CSV_URL}${SHEETS_CSV_URL.includes("?") ? "&" : "?"}_ts=${Date.now()}`;
    const response = await fetch(url, { cache: "no-store" });
    if (!response.ok) {
      throw new ApiError("No se pudo descargar el CSV", `http-${response.status}`);
    }

    const csv = await response.text();
    const rows = construirFilasConHeader(csv);

    let productos = rows
      .filter((row) => {
        const tieneContenido =
          limpiarTexto(row.id) ||
          limpiarTexto(row.nombre) ||
          limpiarTexto(row.marca) ||
          limpiarTexto(row.descripcion) ||
          limpiarTexto(row.precio) ||
          limpiarTexto(row.categoria) ||
          limpiarTexto(row.imagen_url);
        return Boolean(tieneContenido) && isStockDisponible(row.stock);
      })
      .map(mapearProducto)
      .filter((p) => p.nombre && p.precio > 0);

    if (filtros.categoria && filtros.categoria !== "todos") {
      productos = productos.filter((p) => p.categoria === filtros.categoria);
    }

    return { ok: true, productos, total: productos.length, fuente: "google-sheets-csv" };

  } catch (error) {
    console.error("[API] getProductos error:", error);
    throw error instanceof ApiError
      ? error
      : new ApiError("Error al cargar los productos desde Google Sheets", error.code);
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
    const { productos } = await getProductos();
    const producto = productos.find((p) => p.id === id);
    if (!producto) throw new ApiError("Producto no encontrado", "not-found");
    return { ok: true, producto };

  } catch (error) {
    console.error("[API] getProductoPorId error:", error);
    throw error instanceof ApiError ? error : new ApiError(error.message, error.code);
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
  let activo = true;
  getProductos()
    .then(({ productos }) => {
      if (activo) callback(productos);
    })
    .catch((error) => {
      console.error("[API] Listener error:", error);
    });

  return () => {
    activo = false;
  };
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

// Exportar clase de error para uso en otros módulos
export { ApiError };

// Exponer en window para testing desde consola del navegador
window.ClavexAPI = { getProductos, getProductoPorId };
