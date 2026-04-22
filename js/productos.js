/**
 * ╔══════════════════════════════════════════════════════╗
 * ║         CLAVEX — Lógica UI de Productos              ║
 * ║                   productos.js                       ║
 * ╚══════════════════════════════════════════════════════╝
 *
 * Responsabilidades:
 *  · Llamar a la API (api.js) para obtener datos de Firebase
 *  · Renderizar tarjetas de productos
 *  · Filtros por categoría + búsqueda en tiempo real
 *  · Modal de detalle
 *  · Integración WhatsApp
 *  · Skeleton loading y manejo de errores
 */

import { getProductos } from './api.js';
import { addItem, initCart } from './carrito.js';

/* ══════════════════════════════════════════════════════
   ESTADO DE LA SECCIÓN
══════════════════════════════════════════════════════ */
const Estado = {
  todos:          [],
  filtrados:      [],
  paginaActual:   1,
  categoriaActiva:'todos',
  marcaActiva:    'todas',
  busqueda:       '',
  cargando:       false,
  unsubscribe:    null,
};

/* ══════════════════════════════════════════════════════
   CONFIGURACIÓN
══════════════════════════════════════════════════════ */
const CFG = {
  waNumero:    '573222023040',
  debounceMs:  320,
  skeletons:   9,
  productosPorPagina: 30,
};

const CATEGORIAS_LABEL = {
  todos:        'Todos',
  herramientas: 'Herramientas',
  electricidad: 'Electricidad',
  fijacion:     'Fijación',
  plomeria:     'Plomería',
  pintura:      'Pintura',
  construccion: 'Construcción',
  seguridad:    'Seguridad',
  otros:        'Otros',
};

const CAT_COLORES = {
  herramientas: '#ff6a00',
  electricidad: '#007bff',
  fijacion:     '#ff6a00',
  plomeria:     '#17a2b8',
  pintura:      '#6f42c1',
  construccion: '#28a745',
  seguridad:    '#dc3545',
  otros:        '#6c757d',
};

/* ══════════════════════════════════════════════════════
   ÍCONOS SVG POR CATEGORÍA
══════════════════════════════════════════════════════ */
const CAT_ICONOS = {
  herramientas: `<svg viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
    <rect x="21" y="7" width="6" height="26" rx="3" fill="currentColor" opacity=".85"/>
    <polygon points="24,38 17,28 31,28" fill="currentColor"/>
    <rect x="15" y="9" width="18" height="7" rx="3.5" fill="currentColor" opacity=".4"/>
  </svg>`,
  electricidad: `<svg viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M24 6 L15 26h9L13 42 33 20h-10L24 6z" fill="currentColor" opacity=".85"/>
  </svg>`,
  fijacion: `<svg viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
    <rect x="21" y="5" width="6" height="30" rx="3" fill="currentColor" opacity=".85"/>
    <polygon points="24,40 17,32 31,32" fill="currentColor"/>
    <rect x="17" y="7" width="14" height="7" rx="3.5" fill="currentColor" opacity=".4"/>
  </svg>`,
  plomeria: `<svg viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
    <rect x="7" y="20" width="34" height="8" rx="4" fill="currentColor" opacity=".85"/>
    <rect x="9" y="22" width="30" height="4" rx="2" fill="currentColor" opacity=".3"/>
    <circle cx="42" cy="24" r="6" fill="currentColor" opacity=".5"/>
    <circle cx="6" cy="24" r="6" fill="currentColor" opacity=".5"/>
  </svg>`,
  pintura: `<svg viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
    <rect x="15" y="10" width="18" height="24" rx="4" fill="currentColor" opacity=".85"/>
    <rect x="19" y="7" width="10" height="5" rx="2.5" fill="currentColor" opacity=".5"/>
    <rect x="21" y="34" width="6" height="7" rx="2" fill="currentColor" opacity=".4"/>
    <ellipse cx="24" cy="18" rx="7" ry="3" fill="white" opacity=".15"/>
  </svg>`,
  construccion: `<svg viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
    <rect x="7" y="21" width="34" height="6" rx="3" fill="currentColor" opacity=".85"/>
    <rect x="11" y="17" width="6" height="4" rx="1" fill="currentColor" opacity=".5"/>
    <rect x="21" y="27" width="6" height="4" rx="1" fill="currentColor" opacity=".5"/>
    <rect x="31" y="17" width="6" height="4" rx="1" fill="currentColor" opacity=".5"/>
  </svg>`,
  seguridad: `<svg viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M24 6L10 13v12c0 8.5 6 15.5 14 17 8-1.5 14-8.5 14-17V13L24 6z" fill="currentColor" opacity=".8"/>
    <path d="M17 24l5 5 9-9" stroke="white" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" fill="none"/>
  </svg>`,
  otros: `<svg viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
    <circle cx="24" cy="24" r="16" stroke="currentColor" stroke-width="3" fill="none" opacity=".7"/>
    <circle cx="24" cy="24" r="6" fill="currentColor" opacity=".5"/>
  </svg>`,
};

/* ══════════════════════════════════════════════════════
   UTILIDADES
══════════════════════════════════════════════════════ */
function formatCOP(n) {
  return new Intl.NumberFormat('es-CO', {
    style: 'currency', currency: 'COP', maximumFractionDigits: 0
  }).format(n);
}

function debounce(fn, ms) {
  let t; return (...a) => { clearTimeout(t); t = setTimeout(() => fn(...a), ms); };
}

function toastShow(msg, tipo = 'ok') {
  const t = document.getElementById('cx-toast');
  if (!t) return;
  const colores = { ok: '#28a745', error: '#dc3545', info: '#007bff' };
  t.style.borderColor = colores[tipo] || colores.ok;
  t.querySelector('.cx-toast-dot').style.background = colores[tipo] || colores.ok;
  t.querySelector('.cx-toast-msg').textContent = msg;
  t.classList.add('show');
  clearTimeout(window._toastT);
  window._toastT = setTimeout(() => t.classList.remove('show'), 3800);
}

function clampInt(n, min, max) {
  const x = Number.parseInt(String(n ?? ''), 10);
  if (!Number.isFinite(x)) return min;
  return Math.max(min, Math.min(max, x));
}

function productoPorId(id) {
  return Estado.todos.find((x) => x.id === id);
}

/* ══════════════════════════════════════════════════════
   RENDER: SKELETON CARDS
══════════════════════════════════════════════════════ */
function renderSkeletons() {
  const grid = document.getElementById('cx-grid');
  if (!grid) return;
  grid.innerHTML = Array.from({ length: CFG.skeletons }, (_, i) => `
    <div class="cx-card cx-skeleton" style="animation-delay:${i * 50}ms">
      <div class="cx-card-img sk-box"></div>
      <div class="cx-card-body" style="padding:1.2rem">
        <div class="sk-box" style="height:.6rem;width:38%;border-radius:4px;margin-bottom:.8rem"></div>
        <div class="sk-box" style="height:.9rem;width:82%;border-radius:4px;margin-bottom:.5rem"></div>
        <div class="sk-box" style="height:.7rem;width:65%;border-radius:4px;margin-bottom:1.2rem"></div>
        <div style="display:flex;justify-content:space-between;align-items:center">
          <div class="sk-box" style="height:1.5rem;width:35%;border-radius:4px"></div>
          <div class="sk-box" style="height:2.2rem;width:42%;border-radius:6px"></div>
        </div>
      </div>
    </div>
  `).join('');
}

/* ══════════════════════════════════════════════════════
   RENDER: ESTADO VACÍO
══════════════════════════════════════════════════════ */
function renderVacio(msg = '', sub = '') {
  const grid = document.getElementById('cx-grid');
  const paginacion = document.getElementById('cx-paginacion');
  if (!grid) return;
  grid.innerHTML = `
    <div class="cx-empty-state">
      <div class="cx-empty-icon">🔍</div>
      <p class="cx-empty-title">${msg || 'Sin productos'}</p>
      <p class="cx-empty-sub">${sub || 'Intenta con otra búsqueda o categoría'}</p>
    </div>
  `;
  if (paginacion) paginacion.innerHTML = '';
}

/* ══════════════════════════════════════════════════════
   RENDER: TARJETA DE PRODUCTO
══════════════════════════════════════════════════════ */
function renderTarjeta(p, idx) {
  const color = CAT_COLORES[p.categoria] || '#ff6a00';
  const icono = CAT_ICONOS[p.categoria] || CAT_ICONOS.otros;
  const label = CATEGORIAS_LABEL[p.categoria] || p.categoria;
  const delay = Math.min(idx * 55, 450);

  return `
    <article
      class="cx-card"
      style="animation-delay:${delay}ms"
      tabindex="0"
      role="button"
      aria-label="Ver detalle: ${p.nombre}"
      data-card-id="${p.id}"
    >
      <!-- Imagen / placeholder -->
      <div class="cx-card-img" style="--c:${color}">
        ${p.imagen
          ? `<img src="${p.imagen}" alt="${p.nombre}" loading="lazy">`
          : `<div class="cx-placeholder" style="color:${color}">${icono}</div>`
        }
        ${p.destacado ? '<span class="cx-badge-star">★ Destacado</span>' : ''}
        <div class="cx-img-veil"></div>
      </div>

      <!-- Cuerpo -->
      <div class="cx-card-body">
        <span class="cx-cat-pill" style="color:${color};background:${color}1a;border-color:${color}30">
          ${label}
        </span>
        <span class="cx-brand-pill">
          Marca: ${p.marca || 'Sin marca'}
        </span>
        <h3 class="cx-card-name">${p.nombre}</h3>
        <p class="cx-card-desc">${p.descripcion}</p>

        <div class="cx-card-foot">
          <span class="cx-precio">${formatCOP(p.precio)}</span>
          <div class="cx-card-buy" data-card-controls="1">
            <div class="cx-qty" aria-label="Cantidad a agregar">
              <button class="cx-qty-btn" type="button" data-qty-dec aria-label="Disminuir cantidad">−</button>
              <input class="cx-qty-input" type="number" min="1" max="999" value="1" inputmode="numeric" data-qty-input aria-label="Cantidad">
              <button class="cx-qty-btn" type="button" data-qty-inc aria-label="Aumentar cantidad">+</button>
            </div>
            <button class="cx-add-btn" type="button" data-add-cart data-id="${p.id}" aria-label="Agregar ${p.nombre} al carrito">
              Agregar
            </button>
          </div>
        </div>
      </div>
    </article>
  `;
}

/* ══════════════════════════════════════════════════════
   RENDER: GRID COMPLETO
══════════════════════════════════════════════════════ */
function getSlicePagina(productos, pagina = 1) {
  const totalItems = productos.length;
  const totalPaginas = Math.max(1, Math.ceil(totalItems / CFG.productosPorPagina));
  const paginaActual = clampInt(pagina, 1, totalPaginas);
  const inicio = (paginaActual - 1) * CFG.productosPorPagina;
  const fin = inicio + CFG.productosPorPagina;
  return {
    items: productos.slice(inicio, fin),
    totalItems,
    totalPaginas,
    paginaActual,
  };
}

function renderPaginacion(totalPaginas, paginaActual) {
  const cont = document.getElementById('cx-paginacion');
  if (!cont) return;
  if (totalPaginas <= 1) {
    cont.innerHTML = '';
    return;
  }

  const btn = (p) => `
    <button
      class="cx-page-btn ${p === paginaActual ? 'activo' : ''}"
      type="button"
      data-page="${p}"
      ${p === paginaActual ? 'aria-current="page"' : ''}
      aria-label="Ir a página ${p}"
    >
      ${p}
    </button>
  `;

  const nums = [];
  if (totalPaginas <= 7) {
    for (let p = 1; p <= totalPaginas; p++) nums.push(btn(p));
  } else {
    nums.push(btn(1));
    if (paginaActual > 3) nums.push('<span class="cx-page-dots">…</span>');
    const start = Math.max(2, paginaActual - 1);
    const end = Math.min(totalPaginas - 1, paginaActual + 1);
    for (let p = start; p <= end; p++) nums.push(btn(p));
    if (paginaActual < totalPaginas - 2) nums.push('<span class="cx-page-dots">…</span>');
    nums.push(btn(totalPaginas));
  }

  cont.innerHTML = `
    <button class="cx-page-btn nav" type="button" data-page="${paginaActual - 1}" ${paginaActual === 1 ? 'disabled' : ''} aria-label="Página anterior">
      Anterior
    </button>
    ${nums.join('')}
    <button class="cx-page-btn nav" type="button" data-page="${paginaActual + 1}" ${paginaActual === totalPaginas ? 'disabled' : ''} aria-label="Página siguiente">
      Siguiente
    </button>
  `;
}

function renderGrid(productos, pagina = 1) {
  const grid     = document.getElementById('cx-grid');
  const contador = document.getElementById('cx-contador');
  if (!grid) return;

  if (!productos?.length) {
    renderVacio(
      Estado.busqueda ? `Sin resultados para "${Estado.busqueda}"` : 'Sin productos disponibles',
      Estado.busqueda ? 'Prueba otro término de búsqueda' : 'Vuelve pronto, estamos actualizando el catálogo'
    );
    if (contador) contador.textContent = '0 productos';
    return;
  }

  const pag = getSlicePagina(productos, pagina);
  Estado.paginaActual = pag.paginaActual;
  grid.innerHTML = pag.items.map((p, i) => renderTarjeta(p, i)).join('');

  requestAnimationFrame(() => {
    grid.querySelectorAll('.cx-card').forEach(c => c.classList.add('visible'));
  });

  if (contador) {
    contador.textContent = `${pag.totalItems} producto${pag.totalItems !== 1 ? 's' : ''} · Página ${pag.paginaActual}/${pag.totalPaginas}`;
  }

  renderPaginacion(pag.totalPaginas, pag.paginaActual);
}

/* ══════════════════════════════════════════════════════
   RENDER: BOTONES DE FILTRO
══════════════════════════════════════════════════════ */
function renderFiltros(productos) {
  const contenedor = document.getElementById('cx-filtros');
  if (!contenedor) return;

  const cats = ['todos', ...new Set(productos.map(p => p.categoria).filter(Boolean).sort())];

  contenedor.innerHTML = cats.map(cat => {
    const n      = cat === 'todos' ? productos.length : productos.filter(p => p.categoria === cat).length;
    const activo = cat === Estado.categoriaActiva;
    const color  = CAT_COLORES[cat] || '#ff6a00';

    return `
      <button
        class="cx-filtro-btn ${activo ? 'activo' : ''}"
        data-cat="${cat}"
        onclick="window.cxFiltrarCat('${cat}')"
        style="${activo ? `--fc:${color}` : ''}"
      >
        ${CATEGORIAS_LABEL[cat] || cat}
        <span class="cx-filtro-count">${n}</span>
      </button>
    `;
  }).join('');
}

function renderMarcas(productos) {
  const contenedor = document.getElementById('cx-marcas');
  if (!contenedor) return;

  const marcas = ['todas', ...new Set(productos.map((p) => (p.marca || '').trim()).filter(Boolean).sort((a, b) => a.localeCompare(b, 'es', { sensitivity: 'base' })))];

  contenedor.innerHTML = marcas.map((marca) => {
    const n = marca === 'todas'
      ? productos.length
      : productos.filter((p) => (p.marca || '').trim().toLowerCase() === marca.toLowerCase()).length;
    const activo = marca === Estado.marcaActiva;
    const label = marca === 'todas' ? 'Todas las marcas' : marca;
    return `
      <button
        class="cx-filtro-btn ${activo ? 'activo' : ''}"
        data-marca="${marca}"
        onclick="window.cxFiltrarMarca('${marca.replace(/'/g, "\\'")}')"
      >
        ${label}
        <span class="cx-filtro-count">${n}</span>
      </button>
    `;
  }).join('');
}

/* ══════════════════════════════════════════════════════
   FILTRAR + BUSCAR
══════════════════════════════════════════════════════ */
function aplicarFiltros() {
  let base = [...Estado.todos];

  if (Estado.categoriaActiva !== 'todos') {
    base = base.filter(p => p.categoria === Estado.categoriaActiva);
  }
  if (Estado.busqueda.trim()) {
    const q = Estado.busqueda.toLowerCase().trim();
    base = base.filter(p =>
      p.nombre.toLowerCase().includes(q) ||
      p.descripcion.toLowerCase().includes(q) ||
      (p.categoria || '').includes(q) ||
      (p.marca || '').toLowerCase().includes(q)
    );
  }

  renderMarcas(base);
  const marcasDisponibles = new Set(base.map((p) => (p.marca || '').trim().toLowerCase()).filter(Boolean));
  if (Estado.marcaActiva !== 'todas' && !marcasDisponibles.has(Estado.marcaActiva.toLowerCase())) {
    Estado.marcaActiva = 'todas';
    renderMarcas(base);
  }

  let r = [...base];
  if (Estado.marcaActiva !== 'todas') {
    const marcaQ = Estado.marcaActiva.toLowerCase();
    r = r.filter((p) => (p.marca || '').trim().toLowerCase() === marcaQ);
  }

  Estado.filtrados = r;
  Estado.paginaActual = 1;
  renderGrid(r, 1);
}

/* ══════════════════════════════════════════════════════
   MODAL DE DETALLE
══════════════════════════════════════════════════════ */
function abrirModal(id) {
  const p = Estado.todos.find(x => x.id === id);
  if (!p) return;

  const modal = document.getElementById('cx-modal');
  const body  = document.getElementById('cx-modal-body');
  if (!modal || !body) return;

  const color  = CAT_COLORES[p.categoria] || '#ff6a00';
  const label  = CATEGORIAS_LABEL[p.categoria] || p.categoria;
  const icono  = CAT_ICONOS[p.categoria] || CAT_ICONOS.otros;

  body.innerHTML = `
    <div class="cx-modal-img" style="--c:${color}">
      ${p.imagen
        ? `<img src="${p.imagen}" alt="${p.nombre}">`
        : `<div class="cx-placeholder cx-placeholder-lg" style="color:${color}">${icono}</div>`
      }
    </div>
    <div class="cx-modal-info">
      <span class="cx-cat-pill" style="color:${color};background:${color}1a;border-color:${color}30">${label}</span>
      <h2 class="cx-modal-title">${p.nombre}</h2>
      <p class="cx-modal-desc">${p.descripcion}</p>
      <div class="cx-modal-precio">${formatCOP(p.precio)}</div>
      <div class="cx-modal-buy">
        <div class="cx-qty" aria-label="Cantidad a agregar">
          <button class="cx-qty-btn" type="button" data-modal-qty-dec aria-label="Disminuir cantidad">−</button>
          <input class="cx-qty-input" type="number" min="1" max="999" value="1" inputmode="numeric" data-modal-qty-input aria-label="Cantidad">
          <button class="cx-qty-btn" type="button" data-modal-qty-inc aria-label="Aumentar cantidad">+</button>
        </div>
        <button class="cx-btn cx-btn-blue" type="button" data-modal-add-cart data-id="${p.id}">
          Agregar al carrito
        </button>
      </div>
    </div>
  `;

  modal.classList.add('open');
  document.body.style.overflow = 'hidden';
}

function cerrarModal() {
  const m = document.getElementById('cx-modal');
  if (m) m.classList.remove('open');
  document.body.style.overflow = '';
}

function setupBuyInteractions() {
  const grid = document.getElementById('cx-grid');
  if (grid) {
    // Abrir modal SOLO si el click fue fuera de los controles (qty/agregar)
    grid.addEventListener('click', (e) => {
      const raw = e.target;
      const t = raw instanceof HTMLElement ? raw : (raw?.parentElement || null);
      if (!t) return;

      const card = t.closest('.cx-card');
      if (!card) return;

      // Si el click es en controles, no abrir modal
      if (t.closest('[data-card-controls]')) return;

      const id = card.getAttribute('data-card-id');
      if (id) abrirModal(id);
    });

    // Enter para abrir modal cuando el foco está en la tarjeta (no en inputs/botones)
    grid.addEventListener('keydown', (e) => {
      const raw = e.target;
      const t = raw instanceof HTMLElement ? raw : (raw?.parentElement || null);
      if (!t) return;
      if (e.key !== 'Enter') return;

      const card = t.closest('.cx-card');
      if (!card) return;
      if (t.closest('[data-card-controls]')) return;

      const id = card.getAttribute('data-card-id');
      if (id) abrirModal(id);
    });

    grid.addEventListener('click', (e) => {
      const raw = e.target;
      const t = raw instanceof HTMLElement ? raw : (raw?.parentElement || null);
      if (!t) return;

      const card = t.closest('.cx-card');
      if (!card) return;

      // qty controls
      const qtyBtn = t.closest('[data-qty-dec], [data-qty-inc]');
      if (qtyBtn) {
        e.preventDefault();
        const input = card.querySelector('[data-qty-input]');
        if (!(input instanceof HTMLInputElement)) return;
        const curr = clampInt(input.value, 1, 999);
        const next = qtyBtn.matches('[data-qty-inc]') ? curr + 1 : curr - 1;
        input.value = String(clampInt(next, 1, 999));
        return;
      }

      // add cart
      const addBtn = t.closest('[data-add-cart]');
      if (addBtn) {
        e.preventDefault();
        const id = addBtn.getAttribute('data-id');
        const p = productoPorId(id);
        if (!p) return;
        const input = card.querySelector('[data-qty-input]');
        const qty = input instanceof HTMLInputElement ? clampInt(input.value, 1, 999) : 1;
        const sourceEl = card.querySelector('.cx-card-img img') || card.querySelector('.cx-card-img');
        addItem(p, qty, sourceEl);
        addBtn.classList.remove('is-added');
        void addBtn.offsetWidth;
        addBtn.classList.add('is-added');
        return;
      }
    });
  }

  // modal controls
  const modal = document.getElementById('cx-modal');
  modal?.addEventListener('click', (e) => {
    const raw = e.target;
    const t = raw instanceof HTMLElement ? raw : (raw?.parentElement || null);
    if (!t) return;
    const box = t.closest('.cx-modal-box');
    if (!box) return;

    const qtyBtn = t.closest('[data-modal-qty-dec], [data-modal-qty-inc]');
    if (qtyBtn) {
      e.preventDefault();
      const input = box.querySelector('[data-modal-qty-input]');
      if (!(input instanceof HTMLInputElement)) return;
      const curr = clampInt(input.value, 1, 999);
      const next = qtyBtn.matches('[data-modal-qty-inc]') ? curr + 1 : curr - 1;
      input.value = String(clampInt(next, 1, 999));
      return;
    }

    const addBtn = t.closest('[data-modal-add-cart]');
    if (addBtn) {
      e.preventDefault();
      const id = addBtn.getAttribute('data-id');
      const p = productoPorId(id);
      if (!p) return;
      const input = box.querySelector('[data-modal-qty-input]');
      const qty = input instanceof HTMLInputElement ? clampInt(input.value, 1, 999) : 1;
      const sourceEl = box.querySelector('.cx-modal-img img') || box.querySelector('.cx-modal-img');
      addItem(p, qty, sourceEl);
      return;
    }
  });
}

/* ══════════════════════════════════════════════════════
  CARGA INICIAL — Google Sheets CSV
  GET /api/productos → getProductos()
══════════════════════════════════════════════════════ */
async function init() {
  Estado.cargando = true;
  renderSkeletons();

  try {
    const { productos } = await getProductos();
    Estado.todos = productos;
    Estado.filtrados = [...productos];
    renderFiltros(productos);
    aplicarFiltros();
    Estado.cargando = false;

  } catch (error) {
    console.error('[Productos] Error:', error);
    Estado.cargando = false;
    renderVacio(
      'No se pudo cargar el catálogo',
      error.message || 'Verifica la URL pública del CSV de Google Sheets en api.js'
    );
    toastShow('Error al cargar productos. Revisa la consola.', 'error');
  }
}

/* ══════════════════════════════════════════════════════
   EXPONER FUNCIONES GLOBALES (para onclick en HTML)
══════════════════════════════════════════════════════ */
window.cxAbrirModal  = abrirModal;
window.cxCerrarModal = cerrarModal;

window.cxFiltrarCat = (cat) => {
  Estado.categoriaActiva = cat;
  document.querySelectorAll('.cx-filtro-btn').forEach(b => {
    const activo = b.dataset.cat === cat;
    b.classList.toggle('activo', activo);
    const c = CAT_COLORES[cat] || '#ff6a00';
    activo ? b.style.setProperty('--fc', c) : b.style.removeProperty('--fc');
  });
  aplicarFiltros();
};

window.cxFiltrarMarca = (marca) => {
  Estado.marcaActiva = marca;
  document.querySelectorAll('#cx-marcas .cx-filtro-btn').forEach((b) => {
    b.classList.toggle('activo', b.dataset.marca === marca);
  });
  aplicarFiltros();
};

window.cxIrPagina = (pagina) => {
  renderGrid(Estado.filtrados, pagina);
  const sec = document.getElementById('productos');
  sec?.scrollIntoView({ behavior: 'smooth', block: 'start' });
};

/* ══════════════════════════════════════════════════════
   DOM READY
══════════════════════════════════════════════════════ */
document.addEventListener('DOMContentLoaded', () => {
  initCart();
  init();
  setupBuyInteractions();

  // Búsqueda con debounce
  const inp = document.getElementById('cx-buscar');
  if (inp) {
    const doBuscar = debounce(v => { Estado.busqueda = v; aplicarFiltros(); }, CFG.debounceMs);
    inp.addEventListener('input', e => doBuscar(e.target.value));
  }

  document.getElementById('cx-paginacion')?.addEventListener('click', (e) => {
    const raw = e.target;
    const t = raw instanceof HTMLElement ? raw : (raw?.parentElement || null);
    const btn = t?.closest('[data-page]');
    if (!btn) return;
    const next = clampInt(btn.getAttribute('data-page'), 1, Math.max(1, Math.ceil(Estado.filtrados.length / CFG.productosPorPagina)));
    if (next === Estado.paginaActual) return;
    window.cxIrPagina(next);
  });

  // Cerrar modal con Escape o clic en overlay
  document.addEventListener('keydown', e => { if (e.key === 'Escape') cerrarModal(); });
  document.getElementById('cx-modal')?.addEventListener('click', e => {
    if (e.target.id === 'cx-modal') cerrarModal();
  });
});
