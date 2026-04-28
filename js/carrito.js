/**
 * ╔══════════════════════════════════════════════════════╗
 * ║    CARRITO CLAVEX — Sistema Completo + WhatsApp      ║
 * ║                   carrito.js (MEJORADO)              ║
 * ╚══════════════════════════════════════════════════════╝
 */

const CART_KEY = "cx_cart_v1";
const META_KEY = "cx_cart_meta_v1";

const CFG = {
  waNumero: "573222023040",
};

/* ══════════════════════════════════════════════════════
   UTILIDADES
══════════════════════════════════════════════════════ */
function clampInt(n, min, max) {
  const x = Number.parseInt(String(n == null ? "" : n), 10);
  if (!Number.isFinite(x)) return min;
  return Math.max(min, Math.min(max, x));
}

function formatCOP(n) {
  return new Intl.NumberFormat("es-CO", {
    style: "currency",
    currency: "COP",
    maximumFractionDigits: 0,
  }).format(n);
}

function toast(msg, tipo = "ok") {
  const t = document.getElementById("cx-toast");
  if (!t) return;
  const colores = { ok: "#28a745", error: "#dc3545", info: "#007bff" };
  t.style.borderColor = colores[tipo] || colores.ok;
  t.querySelector(".cx-toast-dot").style.background = colores[tipo] || colores.ok;
  t.querySelector(".cx-toast-msg").textContent = msg;
  t.classList.add("show");
  clearTimeout(window._toastT);
  window._toastT = setTimeout(() => t.classList.remove("show"), 3500);
}

/* ══════════════════════════════════════════════════════
   STORAGE: CARRITO
══════════════════════════════════════════════════════ */
function readCart() {
  try {
    const raw = localStorage.getItem(CART_KEY);
    const parsed = raw ? JSON.parse(raw) : null;
    const items = parsed && Array.isArray(parsed.items) ? parsed.items : [];
    return items
      .filter((it) => it && it.id && it.nombre)
      .map((it) => ({
        id: String(it.id),
        nombre: String(it.nombre),
        precio: Number(it.precio) || 0,
        imagen: it.imagen ? String(it.imagen) : "",
        descripcion: it.descripcion ? String(it.descripcion) : "",
        marca: it.marca ? String(it.marca) : "",
        categoria: it.categoria ? String(it.categoria) : "",
        qty: clampInt(it.qty, 1, 999),
      }));
  } catch {
    return [];
  }
}

function writeCart(items) {
  localStorage.setItem(CART_KEY, JSON.stringify({ v: 1, items }));
}

/* ══════════════════════════════════════════════════════
   STORAGE: METADATOS (cliente, asesor)
══════════════════════════════════════════════════════ */
function readMeta() {
  try {
    const raw = localStorage.getItem(META_KEY);
    const parsed = raw ? JSON.parse(raw) : null;
    return {
      cliente: String(parsed && parsed.cliente != null ? parsed.cliente : "").trim(),
      asesor: String(parsed && parsed.asesor != null ? parsed.asesor : "").trim(),
    };
  } catch {
    return { cliente: "", asesor: "" };
  }
}

function writeMeta(meta) {
  localStorage.setItem(
    META_KEY,
    JSON.stringify({
      v: 1,
      cliente: String(meta && meta.cliente != null ? meta.cliente : "").trim(),
      asesor: String(meta && meta.asesor != null ? meta.asesor : "").trim(),
    })
  );
}

/* ══════════════════════════════════════════════════════
   FORM: LEER Y SINCRONIZAR DATOS
══════════════════════════════════════════════════════ */
function getMetaFromUI() {
  const clienteInput = document.getElementById("cx-cart-client");
  const asesorInput = document.getElementById("cx-cart-advisor");
  const cliente = ((clienteInput && clienteInput.value) || "").trim();
  const asesor = ((asesorInput && asesorInput.value) || "").trim();
  return { cliente, asesor };
}

function syncMetaToUI() {
  const { cliente, asesor } = readMeta();
  const inpCliente = document.getElementById("cx-cart-client");
  const inpAsesor = document.getElementById("cx-cart-advisor");
  if (inpCliente && !inpCliente.value) inpCliente.value = cliente;
  if (inpAsesor && !inpAsesor.value) inpAsesor.value = asesor;
}

/* ══════════════════════════════════════════════════════
   CÁLCULOS
══════════════════════════════════════════════════════ */
function getTotals(items) {
  const totalQty = items.reduce((acc, it) => acc + (it.qty || 0), 0);
  const total = items.reduce((acc, it) => acc + (it.qty || 0) * (it.precio || 0), 0);
  return { totalQty, total };
}

function pedidoRefCode() {
  const d = new Date();
  return `CX-${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, "0")}${String(d.getDate()).padStart(2, "0")}-${String(d.getHours()).padStart(2, "0")}${String(d.getMinutes()).padStart(2, "0")}${String(d.getSeconds()).padStart(2, "0")}`;
}

/* ══════════════════════════════════════════════════════
   SETUP: EVENTOS DEL CARRITO
══════════════════════════════════════════════════════ */
function ensureCartUI() {
  const btn = document.getElementById("cx-cart-btn");
  const drawer = document.getElementById("cx-cart-drawer");
  const overlay = document.getElementById("cx-cart-overlay");

  if (!btn || !drawer || !overlay) return;

  // Sincronizar datos del formulario
  syncMetaToUI();
  const cartForm = drawer.querySelector("#cx-cart-form");
  if (cartForm) {
    cartForm.addEventListener("input", () => {
      writeMeta(getMetaFromUI());
    });
  }

  // Vaciar carrito
  const clearBtn = drawer.querySelector("#cx-cart-clear");
  if (clearBtn) {
    clearBtn.addEventListener("click", (e) => {
      e.preventDefault();
      clearCart();
    });
  }

  // Abrir carrito
  btn.addEventListener("click", (e) => {
    e.preventDefault();
    openCart();
  });

  // Cerrar carrito
  overlay.addEventListener("click", () => closeCart());
  const closeBtn = drawer.querySelector('[data-cart-close="1"]');
  if (closeBtn) closeBtn.addEventListener("click", () => closeCart());

  // Cerrar con Escape
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") closeCart();
  });

  // Eventos de cantidad (±) y eliminación
  drawer.addEventListener("click", (e) => {
    const raw = e.target;
    const target = raw instanceof HTMLElement ? raw : ((raw && raw.parentElement) || null);
    if (!target) return;

    const row = target.closest("[data-cart-row]");
    const id = row ? row.getAttribute("data-id") : null;
    if (!id) return;

    const decBtn = target.closest("[data-cart-dec]");
    if (decBtn) {
      e.preventDefault();
      setQty(id, getQty(id) - 1);
      return;
    }
    const incBtn = target.closest("[data-cart-inc]");
    if (incBtn) {
      e.preventDefault();
      setQty(id, getQty(id) + 1);
      return;
    }
    const delBtn = target.closest("[data-cart-del]");
    if (delBtn) {
      e.preventDefault();
      removeItem(id);
      toast("Producto eliminado del carrito ✓", "info");
      return;
    }

    // Abrir detalle del producto (click en el contenido, no en controles)
    const openArea = target.closest("[data-cart-open]");
    if (openArea) {
      e.preventDefault();
      openCartItemDetail(id);
      return;
    }
  });

  // Edición directa de cantidad (input)
  drawer.addEventListener("input", (e) => {
    const target = e.target;
    if (!(target instanceof HTMLInputElement)) return;
    if (!target.matches("[data-cart-qty]")) return;
    const row = target.closest("[data-cart-row]");
    const id = row ? row.getAttribute("data-id") : null;
    if (!id) return;
    setQty(id, clampInt(target.value, 1, 999));
  });

  // Click en botón "Pagar"
  const payBtn = drawer.querySelector("#cx-cart-pay");
  if (payBtn) {
    payBtn.addEventListener("click", (e) => {
      e.preventDefault();
      payWhatsApp();
    });
  }
}

/* ══════════════════════════════════════════════════════
   MODAL: ABRIR / CERRAR
══════════════════════════════════════════════════════ */
function openCart() {
  const drawer = document.getElementById("cx-cart-drawer");
  const overlay = document.getElementById("cx-cart-overlay");
  if (!drawer || !overlay) return;
  overlay.classList.add("open");
  drawer.classList.add("open");
  document.body.style.overflow = "hidden";
  syncMetaToUI();
  const firstInput = drawer.querySelector("input");
  if (firstInput && typeof firstInput.focus === "function") firstInput.focus();
}

function closeCart() {
  const drawer = document.getElementById("cx-cart-drawer");
  const overlay = document.getElementById("cx-cart-overlay");
  if (!drawer || !overlay) return;
  overlay.classList.remove("open");
  drawer.classList.remove("open");
  document.body.style.overflow = "";
}

/* ══════════════════════════════════════════════════════
   ANIMACIÓN: ICON BUMP
══════════════════════════════════════════════════════ */
function bumpCartIcon() {
  const btn = document.getElementById("cx-cart-btn");
  if (!btn) return;
  btn.classList.remove("is-bump");
  void btn.offsetWidth;
  btn.classList.add("is-bump");
}

function playAddToCartFx() {
  const btn = document.getElementById("cx-cart-btn");
  if (!btn) return;
  const r = btn.getBoundingClientRect();
  const cx = r.left + r.width / 2;
  const cy = r.top + r.height / 2;

  for (let i = 0; i < 6; i += 1) {
    const p = document.createElement("span");
    p.className = "cx-fx-spark";
    p.style.left = `${cx}px`;
    p.style.top = `${cy}px`;
    p.style.setProperty("--dx", `${(Math.random() - 0.5) * 70}px`);
    p.style.setProperty("--dy", `${-35 - Math.random() * 75}px`);
    document.body.appendChild(p);
    setTimeout(() => p.remove(), 760);
  }
}

function animateProductToCart(sourceEl, producto) {
  if (!(sourceEl instanceof HTMLElement)) return;
  const cartBtn = document.getElementById("cx-cart-btn");
  if (!cartBtn) return;

  const from = sourceEl.getBoundingClientRect();
  const to = cartBtn.getBoundingClientRect();
  const fly = document.createElement("div");
  fly.className = "cx-fly-card";

  const startW = Math.max(48, Math.min(from.width, 120));
  const startH = Math.max(38, Math.min(from.height, 90));
  const startX = from.left + from.width / 2 - startW / 2;
  const startY = from.top + from.height / 2 - startH / 2;
  const endX = to.left + to.width / 2 - startW / 2;
  const endY = to.top + to.height / 2 - startH / 2;

  fly.style.left = `${startX}px`;
  fly.style.top = `${startY}px`;
  fly.style.width = `${startW}px`;
  fly.style.height = `${startH}px`;
  fly.style.setProperty("--tx", `${endX - startX}px`);
  fly.style.setProperty("--ty", `${endY - startY}px`);

  const img = document.createElement("img");
  img.alt = (producto && producto.nombre) || "Producto";
  img.src = (producto && producto.imagen) || "css/icono.png";
  fly.appendChild(img);

  document.body.appendChild(fly);
  setTimeout(() => fly.remove(), 760);
}

function playOrderSentFx() {
  const burst = document.createElement("div");
  burst.className = "cx-order-burst";
  burst.textContent = "Pedido enviado - CLAVEX";
  document.body.appendChild(burst);
  setTimeout(() => burst.remove(), 1300);
}

function playDeliveryPrepFx() {
  const wrap = document.createElement("div");
  wrap.className = "cx-delivery-fx";
  wrap.innerHTML = `
    <div class="cx-delivery-box">
      <div class="cx-delivery-msg">Preparando tu entrega ferretera</div>
      <div class="cx-delivery-road">
        <div class="cx-delivery-truck">
          <div class="cx-truck-box"></div>
          <div class="cx-truck-cabin"></div>
          <span class="cx-truck-wheel w1"></span>
          <span class="cx-truck-wheel w2"></span>
          <span class="cx-truck-wheel w3"></span>
        </div>
      </div>
    </div>
  `;
  document.body.appendChild(wrap);
  setTimeout(() => wrap.remove(), 1550);
}

/* ══════════════════════════════════════════════════════
   UI: BADGE DE CANTIDAD
══════════════════════════════════════════════════════ */
function updateCartBadge(items) {
  const badge = document.getElementById("cx-cart-count");
  if (!badge) return;
  const { totalQty } = getTotals(items);
  badge.textContent = String(totalQty);
  badge.style.display = totalQty > 0 ? "inline-flex" : "none";
}

/* ══════════════════════════════════════════════════════
   RENDER: CARRITO COMPLETO
══════════════════════════════════════════════════════ */
function renderCart() {
  const items = readCart();
  const list = document.getElementById("cx-cart-items");
  const totalEl = document.getElementById("cx-cart-total");
  const empty = document.getElementById("cx-cart-empty");
  const payBtn = document.getElementById("cx-cart-pay");

  if (!list || !totalEl || !empty || !payBtn) {
    updateCartBadge(items);
    return;
  }

  const { total } = getTotals(items);

  // Estado vacío
  if (!items.length) {
    list.innerHTML = "";
    empty.style.display = "block";
    payBtn.disabled = true;
  } else {
    empty.style.display = "none";
    payBtn.disabled = false;
    list.innerHTML = items
      .map((it) => {
        const subtotal = (it.qty || 0) * (it.precio || 0);
        return `
          <div class="cx-cart-row" data-cart-row="1" data-id="${it.id}">
            <button class="cx-cart-thumb" type="button" data-cart-open aria-label="Ver detalle de ${it.nombre}">
              ${
                it.imagen
                  ? `<img src="${it.imagen}" alt="" loading="lazy" onerror="this.style.display='none';this.nextElementSibling.style.display='flex';">
                     <span class="cx-cart-thumb-ph" style="display:none" aria-hidden="true">🛒</span>`
                  : `<span class="cx-cart-thumb-ph" aria-hidden="true">🛒</span>`
              }
            </button>
            <button class="cx-cart-row-main" type="button" data-cart-open aria-label="Ver detalle de ${it.nombre}">
              <div class="cx-cart-row-title">${it.nombre}</div>
              <div class="cx-cart-row-sub">
                <span>${formatCOP(it.precio)}</span>
                <span class="cx-cart-row-dot">•</span>
                <span>Subtotal: <strong>${formatCOP(subtotal)}</strong></span>
              </div>
            </button>
            <div class="cx-cart-row-actions">
              <div class="cx-qty" aria-label="Cantidad">
                <button class="cx-qty-btn" type="button" data-cart-dec aria-label="Disminuir cantidad">−</button>
                <input class="cx-qty-input" inputmode="numeric" type="number" min="1" max="999" value="${it.qty}" data-cart-qty aria-label="Cantidad de ${it.nombre}">
                <button class="cx-qty-btn" type="button" data-cart-inc aria-label="Aumentar cantidad">+</button>
              </div>
              <button class="cx-cart-del" type="button" data-cart-del aria-label="Eliminar ${it.nombre}">Eliminar</button>
            </div>
          </div>
        `;
      })
      .join("");
  }

  totalEl.textContent = formatCOP(total);
  updateCartBadge(items);
}

/* ══════════════════════════════════════════════════════
   OPERACIONES CARRITO: ADD, SET, REMOVE, CLEAR
══════════════════════════════════════════════════════ */
function getQty(id) {
  const items = readCart();
  const it = items.find((x) => x.id === id);
  return it ? it.qty : 0;
}

export function addItem(producto, qty, sourceEl = null) {
  const items = readCart();
  const q = clampInt(qty, 1, 999);
  const id = String(producto && producto.id != null ? producto.id : "");
  if (!id) return;

  const idx = items.findIndex((x) => x.id === id);
  if (idx === -1) {
    items.push({
      id,
      nombre: String(producto.nombre != null ? producto.nombre : "Producto"),
      precio: Number(producto.precio) || 0,
      imagen: producto.imagen ? String(producto.imagen) : "",
      descripcion: producto.descripcion ? String(producto.descripcion) : "",
      marca: producto.marca ? String(producto.marca) : "",
      categoria: producto.categoria ? String(producto.categoria) : "",
      qty: q,
    });
  } else {
    items[idx].qty = clampInt((items[idx].qty || 0) + q, 1, 999);
    // refrescar data del producto si cambió en el catálogo (mantener qty)
    if (producto && typeof producto === "object") {
      items[idx].nombre = String(producto.nombre != null ? producto.nombre : items[idx].nombre);
      items[idx].precio = Number(producto.precio) || items[idx].precio || 0;
      items[idx].imagen = producto.imagen ? String(producto.imagen) : items[idx].imagen || "";
      items[idx].descripcion = producto.descripcion ? String(producto.descripcion) : items[idx].descripcion || "";
      items[idx].marca = producto.marca ? String(producto.marca) : items[idx].marca || "";
      items[idx].categoria = producto.categoria ? String(producto.categoria) : items[idx].categoria || "";
    }
  }

  writeCart(items);
  renderCart();
  animateProductToCart(sourceEl, producto);
  bumpCartIcon();
  playAddToCartFx();
  toast(`✓ ${producto.nombre} agregado al carrito`, "ok");
}

export function setQty(id, qty) {
  const items = readCart();
  const q = clampInt(qty, 1, 999);
  const idx = items.findIndex((x) => x.id === id);
  if (idx === -1) return;
  items[idx].qty = q;
  writeCart(items);
  renderCart();
}

export function removeItem(id) {
  const items = readCart().filter((x) => x.id !== id);
  writeCart(items);
  renderCart();
}

export function clearCart() {
  writeCart([]);
  renderCart();
  toast("Carrito vaciado", "info");
}

/* ══════════════════════════════════════════════════════
   🎯 VALIDACIÓN Y PAGO POR WHATSAPP
   - Validar que cliente y asesor no estén vacíos
   - Mostrar alerta clara si falta información
   - Generar mensaje estructurado
   - Abrir WhatsApp automáticamente
══════════════════════════════════════════════════════ */
export function payWhatsApp() {
  const items = readCart();

  // 1️⃣ Verificar que hay items
  if (!items.length) {
    toast("❌ Tu carrito está vacío. Agrega productos para continuar.", "error");
    return;
  }

  // 2️⃣ Obtener datos del formulario
  const { cliente, asesor } = getMetaFromUI();

  // 3️⃣ VALIDACIÓN: Cliente
  if (!cliente) {
    toast("❌ Campo obligatorio: Nombre del cliente", "error");
    const inp = document.getElementById("cx-cart-client");
    if (inp && typeof inp.focus === "function") inp.focus();
    if (inp && typeof inp.scrollIntoView === "function") inp.scrollIntoView({ behavior: "smooth", block: "center" });
    return;
  }

  // 4️⃣ VALIDACIÓN: Asesor
  if (!asesor) {
    toast("❌ Campo obligatorio: Nombre del asesor", "error");
    const inp = document.getElementById("cx-cart-advisor");
    if (inp && typeof inp.focus === "function") inp.focus();
    if (inp && typeof inp.scrollIntoView === "function") inp.scrollIntoView({ behavior: "smooth", block: "center" });
    return;
  }

  // 5️⃣ Guardar datos en storage
  writeMeta({ cliente, asesor });

  // 6️⃣ Calcular totales
  const { total } = getTotals(items);
  const refPedido = pedidoRefCode();

  // 7️⃣ Construir detalle del pedido
  const lineas = items
    .map((it, i) => {
      const subtotal = (it.qty || 0) * (it.precio || 0);
      return (
        `*${i + 1}.* ${it.nombre}\n` +
        `   Cantidad: ${it.qty}\n` +
        `   Unitario: ${formatCOP(it.precio)}\n` +
        `   Subtotal: ${formatCOP(subtotal)}`
      );
    })
    .join("\n\n");

  // 8️⃣ MENSAJE ESTRUCTURADO PARA WHATSAPP
  const mensaje =
    `📦 *PEDIDO CLAVEX COLOMBIA SAS*\n` +
    `━━━━━━━━━━━━━━━━━━━━━━━━━\n\n` +
    `🔖 *Ref. pedido:* ${refPedido}\n` +
    `👤 *Cliente:* ${cliente}\n` +
    `👨‍💼 *Asesor:* ${asesor}\n` +
    `📅 *Fecha:* ${new Date().toLocaleDateString("es-CO")}\n\n` +
    `━━━━━━━━━━━━━━━━━━━━━━━━━\n` +
    `*📋 DETALLE DEL PEDIDO:*\n\n` +
    `${lineas}\n\n` +
    `━━━━━━━━━━━━━━━━━━━━━━━━━\n` +
    `💰 *TOTAL: ${formatCOP(total)}*\n` +
    `━━━━━━━━━━━━━━━━━━━━━━━━━\n\n` +
    `✓ Pedido generado desde CLAVEX`;

  // 9️⃣ Codificar para URL y abrir WhatsApp
  const waText = encodeURIComponent(mensaje);
  const waUrl = `https://wa.me/${CFG.waNumero}?text=${waText}`;

  // Cerrar carrito y mostrar confirmación
  playOrderSentFx();
  playDeliveryPrepFx();
  toast("✅ ¡Pedido listo! Abriendo WhatsApp…", "ok");
  setTimeout(() => {
    window.open(waUrl, "_blank");
  }, 1300);

  // Vaciar carrito después de 2 segundos (opcional)
  setTimeout(() => {
    closeCart();
  }, 1500);
}

/* ══════════════════════════════════════════════════════
   INIT: INICIALIZAR CARRITO
══════════════════════════════════════════════════════ */
export function initCart() {
  ensureCartUI();
  renderCart();
}

/* ══════════════════════════════════════════════════════
   DETALLE DESDE CARRITO (reusa #cx-modal)
══════════════════════════════════════════════════════ */
function openCartItemDetail(id) {
  const items = readCart();
  const it = items.find((x) => x.id === String(id));
  if (!it) return;

  const modal = document.getElementById("cx-modal");
  const body = document.getElementById("cx-modal-body");
  if (!modal || !body) return;

  const precioTxt = formatCOP(it.precio || 0);
  const desc = (it.descripcion || "").trim() || "Sin descripción disponible.";
  const marcaTxt = (it.marca || "").trim();
  const catTxt = (it.categoria || "").trim();

  body.innerHTML = `
    <button class="cx-modal-back" type="button" onclick="cxCerrarModal?.()" aria-label="Volver">
      ← Volver
    </button>
    <div class="cx-modal-img" style="--c:var(--blue-main)">
      ${
        it.imagen
          ? `<img src="${it.imagen}" alt="" onerror="this.style.display='none';this.nextElementSibling.style.display='flex';">
             <div class="cx-placeholder cx-placeholder-lg" style="display:none;color:var(--blue-main)">🛒</div>`
          : `<div class="cx-placeholder cx-placeholder-lg" style="color:var(--blue-main)">🛒</div>`
      }
    </div>
    <div class="cx-modal-info">
      <div class="cx-modal-meta">
        ${
          catTxt
            ? `<span class="cx-cat-pill" style="color:var(--blue-main);background:rgba(45,126,194,.10);border-color:rgba(45,126,194,.20)">${catTxt}</span>`
            : ""
        }
        ${marcaTxt ? `<span class="cx-modal-brand">Marca: ${marcaTxt}</span>` : ""}
      </div>
      <h2 class="cx-modal-title">${it.nombre}</h2>
      <p class="cx-modal-desc">${desc}</p>
      <div class="cx-modal-precio">${precioTxt}</div>
    </div>
  `;

  modal.classList.add("open");
  document.body.style.overflow = "hidden";
}

/* ══════════════════════════════════════════════════════
   EXPONER FUNCIONES GLOBALES
══════════════════════════════════════════════════════ */
window.cxCart = {
  addItem,
  setQty,
  removeItem,
  clearCart,
  payWhatsApp,
  initCart,
  openCart,
  closeCart,
};
