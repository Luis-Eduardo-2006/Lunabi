/* ===== LÜNABI — Main orchestrator =====
 *
 * Runs after theme.js, carrito.js, buscador.js, filtros.js, router.js and
 * components.js have already loaded. By now the navbar / footer / modal /
 * cart drawer have been injected into their containers, so we can safely
 * wire listeners to elements inside them.
 */

/* ================================================================ */
/* WHATSAPP: dos números (local + nacional)                         */
/* ================================================================ */
/* Cada CTA de WhatsApp abre un modal que deja elegir según la ubicación:
 *   - local    → clientas de Lima y alrededores (atención + delivery).
 *   - nacional → clientas de provincias (envíos nacionales).
 * Para cambiar los números, edita el bloque de abajo. */
window.WA_NUMBERS = {
  local: {
    number: '51923472925',
    label:  'Huancayo y alrededores',
    hint:   'Atención directa y delivery local',
    icon:   'bi-geo-alt-fill'
  },
  nacional: {
    number: '51YYYYYYYYY',
    label:  'Envíos nacionales',
    hint:   'Otras regiones del Perú — pedido anticipado',
    icon:   'bi-truck'
  }
};
// Alias legacy (por si algún otro módulo aún lo lee).
window.WA_NUMBER = window.WA_NUMBERS.local.number;

function fmtWaNumber(n) {
  const s = String(n || '').replace(/\D+/g, '');
  if (s.length < 9) return '+' + s;
  const cc = s.slice(0, -9);
  const a = s.slice(-9, -6), b = s.slice(-6, -3), c = s.slice(-3);
  return `+${cc} ${a} ${b} ${c}`;
}

/* Un número de WA cuenta como placeholder si todavía contiene la "X" o
 * "Y" repetidas que dejamos al sembrar el proyecto (51XXXXXXXXX / 51YYYYYYYYY).
 * Mientras esté así, la opción correspondiente del picker se muestra como
 * "Próximamente" y no abre WhatsApp. */
window.isWaPlaceholder = function(num) {
  return !num || /[XY]{3,}/i.test(String(num));
};

/* Abre el picker modal (o cae al número local si bootstrap no está listo). */
/* Genera el código del producto a partir de su id — formato LUN-0042 */
window.productCode = function(p) {
  if (!p || p.id == null) return '';
  return `LUN-${String(p.id).padStart(4, '0')}`;
};

/* Emojis — SOLO codepoints del BMP (U+0000–U+FFFF, una sola code unit).
 * Los emojis "tradicionales" (luna, corazón morado, carrito, etc.) viven en
 * U+1F000+ y necesitan surrogate pairs; algunos handlers de URL en Windows
 * (WhatsApp Desktop, deeplinks) rompen los surrogate pairs convirtiéndolos
 * en U+FFFD (�). Por eso escribimos los glifos como literales UTF-8 en el
 * archivo, sin String.fromCodePoint — el archivo es UTF-8 y los chars son
 * todos del BMP, así que no hay forma de que se rompan. */
const E = {
  sparkle: '✨',                    // ✨  — colorful en WhatsApp
  heart:   '❤️',              // ❤️ — colorful con VS-16
  arrow:   '→',                    // →
  flower:  '❀',                    // ❀
  star:    '★'                     // ★
};
const SEP = '━'.repeat(14);        // ━━━━━━━━━━━━━━

/* Saludo con el nombre del comprador (si está logueado) — primer nombre,
 * en mayúscula. Si no hay sesión, saludo genérico. El segundo emoji depende
 * del contexto: 'producto' (consulta unitaria) o 'pedido' (carrito). */
window.buildGreeting = function(context) {
  let nombre = '';
  try {
    const u = (typeof window.getCurrentUser === 'function') ? window.getCurrentUser() : null;
    if (u && u.nombre) nombre = String(u.nombre).split(' ')[0];
    if (!nombre) {
      const session = JSON.parse(localStorage.getItem('lunabi_session') || 'null');
      if (session && session.nombre) nombre = String(session.nombre).split(' ')[0];
    }
  } catch (e) { /* sin sesión */ }
  const cap = nombre ? nombre.charAt(0).toUpperCase() + nombre.slice(1).toLowerCase() : '';
  const intro = `\u00A1Hola L\u00FCnabi! ${E.sparkle}`;
  if (context === 'pedido') {
    return cap
      ? `${intro}\nSoy *${cap}* y quiero hacer un pedido`
      : `${intro}\nQuiero hacer un pedido`;
  }
  return cap
    ? `${intro}\nSoy *${cap}* y me interesa este producto`
    : `${intro}\nMe interesa este producto`;
};

/* Mensaje WhatsApp para una consulta de un solo producto. Lo usamos tanto
 * en el modal quick-view como en producto.html. Dise\u00F1ado para verse limpio
 * y profesional en WhatsApp Web / iOS / Android \u2014 sin emojis decorativos
 * dobles, sin caracteres ex\u00F3ticos, formato bold/strikethrough nativo. */
window.buildProductWhatsAppMsg = function(p, qty) {
  if (!p) return '';
  const brand = (Array.isArray(window.brands) ? window.brands : []).find(b => b.slug === p.marca);
  const codigo = window.productCode(p);
  const tieneDesc = p.precioAntes && p.precioAntes > p.precio;
  const pct = tieneDesc ? Math.round((p.precioAntes - p.precio) / p.precioAntes * 100) : 0;
  const cantidad = Number(qty) > 0 ? Number(qty) : 1;
  const total = p.precio * cantidad;

  let msg = `${window.buildGreeting('producto')}\n\n${SEP}\n\n`;
  msg += `${E.flower} *${p.nombre}*\n`;
  if (brand) msg += `Marca: ${brand.nombre}\n`;
  msg += `C\u00F3digo: ${codigo}\n`;
  msg += `Cantidad: ${cantidad} ${cantidad > 1 ? 'unidades' : 'unidad'}\n`;
  if (tieneDesc) {
    msg += `Precio: ~S/ ${p.precioAntes.toFixed(2)}~ ${E.arrow} *S/ ${p.precio.toFixed(2)}* (-${pct}%)\n`;
    msg += `Total: *S/ ${total.toFixed(2)}*\n`;
  } else {
    msg += `Precio: *S/ ${p.precio.toFixed(2)}*\n`;
    if (cantidad > 1) msg += `Total: *S/ ${total.toFixed(2)}*\n`;
  }
  msg += `\n${SEP}\n\n`;
  msg += `\u00BFPodr\u00EDan confirmarme la *disponibilidad* y coordinar el *env\u00EDo*?\n\n`;
  msg += `\u00A1Gracias! ${E.heart}`;
  return msg;
};

window.openWhatsApp = function(message = '') {
  const modal = document.getElementById('waPickerModal');
  if (!modal || typeof bootstrap === 'undefined' || !bootstrap.Modal) {
    const n = window.WA_NUMBERS.local.number;
    window.open(`https://wa.me/${n}?text=${encodeURIComponent(message || '')}`, '_blank');
    return;
  }
  // Pinta números en vivo + cablea los botones. Si el número aún es
  // placeholder (51YYYYYYYYY), marcamos la opción como "próximamente".
  modal.querySelectorAll('[data-wa-key]').forEach(btn => {
    const key = btn.getAttribute('data-wa-key');
    const n = window.WA_NUMBERS[key];
    if (!n) return;
    const placeholder = window.isWaPlaceholder(n.number);
    const nEl = btn.querySelector('.wa-picker-number');
    if (nEl) nEl.textContent = placeholder ? 'Próximamente' : fmtWaNumber(n.number);
    btn.classList.toggle('is-disabled', placeholder);
    btn.disabled = placeholder;
    btn.onclick = placeholder ? null : () => {
      window.open(`https://wa.me/${n.number}?text=${encodeURIComponent(message || '')}`, '_blank');
      const inst = bootstrap.Modal.getInstance(modal);
      if (inst) inst.hide();
    };
  });
  bootstrap.Modal.getOrCreateInstance(modal).show();
};

/* Intercepta clicks en cualquier CTA de WhatsApp (flotante verde en cada
 * HTML, ícono del footer, o cualquier <a class="lu-wa-link">). Así no
 * tenemos que editar los 15 HTMLs individuales. */
document.addEventListener('click', (e) => {
  const t = e.target;
  if (!t || t.nodeType !== 1 || typeof t.closest !== 'function') return;
  const trigger = t.closest('.whatsapp-float, .lu-wa-link');
  if (!trigger) return;
  e.preventDefault();
  window.openWhatsApp('');
}, true);

/* ================================================================ */
/* VENTAS + BEST-SELLERS DINÁMICOS                                  */
/* ================================================================ */
/* Cada vez que se envía un pedido por WhatsApp, carrito.js llama a
 * `recordSales(cart)` con el array de items. Acumulamos cantidades por
 * producto en localStorage['lunabi_ventas'] y luego recalculamos qué
 * productos llevan el badge `masVendido` (los K con más ventas).
 *
 * Si todavía no hay ventas registradas, mantenemos los flags originales
 * que trae data.js (para que la demo no luzca vacía desde el día 0).
 *
 * Cuando llegue el backend: reemplazar get/save por fetch a /api/ventas. */
(function() {
  const KEY = 'lunabi_ventas';
  function loadSales() {
    try { return JSON.parse(localStorage.getItem(KEY) || '{}') || {}; }
    catch (e) { return {}; }
  }
  function saveSales(map) {
    try { localStorage.setItem(KEY, JSON.stringify(map)); } catch (e) { /* cuota llena */ }
  }

  /* `originalFlags` guarda el valor de masVendido que trae cada producto
   * desde data.js o desde el form del admin, antes de que sales lo pisen.
   * Se usa como fallback cuando todavía no hay ventas registradas. */
  const originalFlags = {};
  function captureOriginalFlags() {
    (window.products || []).forEach(p => {
      if (!(p.id in originalFlags)) originalFlags[p.id] = !!p.masVendido;
    });
  }

  function recomputeBestSellers() {
    captureOriginalFlags();
    const ps = window.products || [];
    if (!ps.length) return;
    const sales = loadSales();
    const withSales = ps.filter(p => (Number(sales[p.id]) || 0) > 0);
    if (!withSales.length) {
      // Sin ventas aún → respeta los masVendido originales de data.js
      ps.forEach(p => { p.masVendido = !!originalFlags[p.id]; });
      return;
    }
    // K adaptable: al menos 3, máx 8, ~15% del catálogo.
    const K = Math.max(3, Math.min(8, Math.ceil(ps.length * 0.15)));
    const topIds = new Set(
      [...withSales]
        .sort((a, b) => (Number(sales[b.id]) || 0) - (Number(sales[a.id]) || 0))
        .slice(0, K)
        .map(p => p.id)
    );
    ps.forEach(p => { p.masVendido = topIds.has(p.id); });
  }

  window.getSalesMap = loadSales;
  window.getProductSales = (id) => Number(loadSales()[Number(id)]) || 0;

  window.recordSales = function(items) {
    if (!Array.isArray(items) || !items.length) return;
    // Si LuApi está en modo remoto, delega en Supabase vía RPC record_sale.
    if (window.LuApi && window.LuApi.isRemote && window.LuApi.isRemote()) {
      window.LuApi.recordSale(items).then(recomputeBestSellers).catch(()=>{});
    } else {
      const map = loadSales();
      items.forEach(({ id, qty }) => {
        const n = Number(id);
        if (!n) return;
        map[n] = (Number(map[n]) || 0) + (Number(qty) || 0);
      });
      saveSales(map);
    }
    recomputeBestSellers();
    if (typeof window.refreshBestSellerViews === 'function') {
      window.refreshBestSellerViews();
    }
  };

  window.recomputeBestSellers = recomputeBestSellers;

  // Ejecución inicial — cuando este script corre, data.js y los overrides
  // de admin ya están aplicados en `products`.
  recomputeBestSellers();
})();

/* ================================================================ */
/* FAVORITOS (corazón en cards)                                     */
/* ================================================================ */
/* Persiste en localStorage['lunabi_favs'] como arreglo de IDs numéricos.
 * Cuando llegue el backend, reemplazar get/save por fetch a /api/favoritos. */
(function() {
  const KEY = 'lunabi_favs';
  function getFavs() {
    try { return JSON.parse(localStorage.getItem(KEY)) || []; }
    catch (e) { return []; }
  }
  function saveFavs(list) { localStorage.setItem(KEY, JSON.stringify(list)); }

  window.isFavorite = function(id) { return getFavs().includes(Number(id)); };

  window.toggleFavorite = function(id) {
    id = Number(id);
    const favs = getFavs();
    const idx = favs.indexOf(id);
    const active = idx === -1;
    if (active) favs.push(id); else favs.splice(idx, 1);
    saveFavs(favs);
    // Si hay backend, sincroniza el toggle con Supabase (sin bloquear UI).
    if (window.LuApi && window.LuApi.isRemote && window.LuApi.isRemote()) {
      window.LuApi.toggleFavorite(id).catch(e => console.warn('[fav] sync', e));
    }
    document.querySelectorAll(`[data-fav-id="${id}"]`).forEach(btn => {
      btn.classList.toggle('active', active);
      const icon = btn.querySelector('i');
      if (icon) icon.className = 'bi ' + (active ? 'bi-heart-fill' : 'bi-heart');
      btn.setAttribute('aria-label', active ? 'Quitar de favoritos' : 'Añadir a favoritos');
      const label = btn.querySelector('.fav-label');
      if (label) label.textContent = active ? 'En favoritos' : 'Añadir a favoritos';
    });
    if (typeof window.showToast === 'function') {
      window.showToast(active ? 'Añadido a favoritos' : 'Quitado de favoritos', 'info');
    }
    // Notifica a otras vistas (ej. cuenta.html) que el estado cambió.
    document.dispatchEvent(new CustomEvent('lunabi:favs-changed', { detail: { id, active } }));
  };

  // Sincroniza un botón `.btn-fav-detail` con el estado actual del producto.
  window.syncFavButton = function(btn, id) {
    if (!btn) return;
    id = Number(id);
    btn.setAttribute('data-fav-id', id);
    const active = window.isFavorite(id);
    btn.classList.toggle('active', active);
    const icon = btn.querySelector('i');
    if (icon) icon.className = 'bi ' + (active ? 'bi-heart-fill' : 'bi-heart');
    btn.setAttribute('aria-label', active ? 'Quitar de favoritos' : 'Añadir a favoritos');
    const label = btn.querySelector('.fav-label');
    if (label) label.textContent = active ? 'En favoritos' : 'Añadir a favoritos';
  };
})();

/* ================================================================ */
/* SHARED HELPERS                                                   */
/* ================================================================ */

// Product card HTML — used by home, category grid, related products, etc.
window.renderProductCard = function(p, i = 0) {
  const brand = brands.find(b => b.slug === p.marca);
  const hasDiscount = p.precioAntes && p.precioAntes > p.precio;
  const discountPct = hasDiscount
    ? Math.round((p.precioAntes - p.precio) / p.precioAntes * 100)
    : 0;
  const showSaleBadge = hasDiscount || p.enOferta;
  const saleLabel = hasDiscount ? `-${discountPct}%` : 'SALE';
  const bestBadge = p.masVendido
    ? '<span class="badge-bestseller"><i class="bi bi-star-fill"></i> Más vendido</span>'
    : '';
  const catLabel = (window.SUBCAT_LABELS && window.SUBCAT_LABELS[p.categoria]) || p.categoria;
  const isFav = window.isFavorite ? window.isFavorite(p.id) : false;
  return `
    <div class="col-6 col-sm-6 col-md-4 col-lg-3">
      <div class="product-card fade-up" style="transition-delay:${i * 0.06}s" data-product-id="${p.id}">
        <div class="card-media">
          <a href="producto.html?id=${p.id}" class="card-img-wrap" style="display:block">
            ${bestBadge}
            <span class="badge-cat">${String(catLabel).toLowerCase()}</span>
            ${showSaleBadge ? `<span class="badge-sale">${saleLabel}</span>` : ''}
            <img src="${p.imagenes[0]}" alt="${p.nombre}" loading="lazy">
          </a>
          <button class="btn-fav${isFav ? ' active' : ''}" data-fav-id="${p.id}" type="button"
                  onclick="event.stopPropagation(); toggleFavorite(${p.id})"
                  aria-label="${isFav ? 'Quitar de favoritos' : 'Añadir a favoritos'}">
            <i class="bi ${isFav ? 'bi-heart-fill' : 'bi-heart'}"></i>
          </button>
        </div>
        <div class="card-body">
          <a class="card-brand" href="marca-detalle.html?marca=${p.marca}">${brand ? brand.nombre : p.marca}</a>
          <a class="card-title" href="producto.html?id=${p.id}" style="color:inherit; text-decoration:none; display:block">${p.nombre}</a>
          <div class="card-price">
            ${hasDiscount ? `<span class="old-price">S/ ${p.precioAntes.toFixed(2)}</span>` : ''}
            S/ ${p.precio.toFixed(2)}
          </div>
          <button class="btn-add ripple-wrap" type="button" onclick="event.stopPropagation(); addToCart(${p.id})">
            <i class="bi bi-cart-plus"></i> Agregar al carrito
          </button>
        </div>
      </div>
    </div>`;
};

// Fade-up intersection observer (called after each grid render)
window.observeFadeUps = function() {
  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('visible');
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.08 });
  document.querySelectorAll('.fade-up:not(.visible)').forEach(el => observer.observe(el));
};

/* ================================================================ */
/* NAVBAR BEHAVIOUR                                                 */
/* ================================================================ */
/* initNavbarScroll — glass darken on scroll (estilo.txt).
 * initMobileNav    — progressive disclosure on mobile: tap-to-toggle
 *                    level-1 (dropdown) and level-2 (mega-sub-panel)
 *                    via `.open` class. Desktop keeps hover behaviour.
 */
function initNavbarScroll() {
  const nav = document.getElementById('navbar');
  if (!nav) return;
  const onScroll = () => nav.classList.toggle('scrolled', window.scrollY > 50);
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();
}

function initMobileNav() {
  const isMobile = () => window.matchMedia('(max-width: 991.98px)').matches;

  /* Level 1: top-level dropdown toggles (Skincare, Maquillaje, Corporal, Marcas).
   * En mobile, tap suprime la navegación del <a> y alterna .open en el <li>.
   * En desktop (isMobile false) dejamos pasar para que el href funcione. */
  document.querySelectorAll('.navbar-glass .nav-item.dropdown > .nav-link.dropdown-toggle').forEach(link => {
    link.addEventListener('click', (e) => {
      if (!isMobile()) return;
      e.preventDefault();
      const item = link.closest('.nav-item.dropdown');
      if (!item) return;
      const wasOpen = item.classList.contains('open');

      /* Cerrar cualquier otro top-level abierto (un solo nivel-1 a la vez) */
      document.querySelectorAll('.navbar-glass .nav-item.dropdown.open').forEach(el => {
        if (el !== item) {
          el.classList.remove('open');
          el.querySelectorAll('.mega-item.open').forEach(m => m.classList.remove('open'));
        }
      });

      if (wasOpen) {
        item.classList.remove('open');
        item.querySelectorAll('.mega-item.open').forEach(m => m.classList.remove('open'));
      } else {
        item.classList.add('open');
      }
    });
  });

  /* Level 2: mega-headers con subs (Limpieza, Mascarillas, Rostro, …).
   * En mobile, tap alterna .open en el .mega-item padre para desplegar
   * su .mega-sub-panel. Un solo mega-item abierto por dropdown. */
  document.querySelectorAll('.navbar-glass .mega-dropdown-menu .mega-header.has-subs').forEach(link => {
    link.addEventListener('click', (e) => {
      if (!isMobile()) return;
      e.preventDefault();
      const item = link.closest('.mega-item');
      const parent = link.closest('.mega-dropdown-menu');
      if (!item || !parent) return;
      const wasOpen = item.classList.contains('open');

      parent.querySelectorAll('.mega-item.open').forEach(el => {
        if (el !== item) el.classList.remove('open');
      });
      item.classList.toggle('open', !wasOpen);
    });
  });

  /* Reset completo al cerrar la hamburguesa — cada apertura empieza limpia. */
  const navCollapse = document.getElementById('navContent');
  if (navCollapse) {
    navCollapse.addEventListener('hidden.bs.collapse', () => {
      document.querySelectorAll('.navbar-glass .nav-item.dropdown.open, .navbar-glass .mega-item.open')
        .forEach(el => el.classList.remove('open'));
    });
  }

  /* Si el usuario gira el dispositivo o redimensiona pasando a desktop,
   * limpiar los .open para no dejar estado mobile colgado. */
  window.addEventListener('resize', () => {
    if (!isMobile()) {
      document.querySelectorAll('.navbar-glass .nav-item.dropdown.open, .navbar-glass .mega-item.open')
        .forEach(el => el.classList.remove('open'));
    }
  });
}

/* ================================================================ */
/* PRODUCT MODAL                                                    */
/* ================================================================ */
let modalProduct = null;
let modalQty = 1;

window.openProductModal = function(id) {
  const p = products.find(pr => pr.id === id);
  if (!p) return;
  modalProduct = p;
  modalQty = 1;

  const brand = brands.find(b => b.slug === p.marca);
  const hasDiscount = p.precioAntes && p.precioAntes > p.precio;

  const modalBrand = document.getElementById('modalBrand');
  if (modalBrand) {
    modalBrand.textContent = brand ? brand.nombre : p.marca;
    modalBrand.href = `marca-detalle.html?marca=${p.marca}`;
  }

  document.getElementById('modalName').textContent = p.nombre;
  const modalPct = hasDiscount
    ? Math.round((p.precioAntes - p.precio) / p.precioAntes * 100)
    : 0;
  document.getElementById('modalPrice').innerHTML = hasDiscount
    ? `<span class="old-price">S/ ${p.precioAntes.toFixed(2)}</span> S/ ${p.precio.toFixed(2)}<span class="price-discount-pct">-${modalPct}%</span><span class="modal-save">AHORRA S/${(p.precioAntes - p.precio).toFixed(2)}</span>`
    : `S/ ${p.precio.toFixed(2)}`;

  const mainImg = document.querySelector('#modalMainImg img');
  if (mainImg) { mainImg.src = p.imagenes[0]; mainImg.alt = p.nombre; }

  document.getElementById('modalThumbs').innerHTML = p.imagenes.map((img, i) =>
    `<img src="${img}" alt="thumb ${i+1}" class="${i === 0 ? 'active' : ''}" onclick="switchModalImg(${i})" loading="lazy">`
  ).join('');

  document.getElementById('tabInfo').innerHTML = `<p>${p.descripcion}</p>`;
  document.getElementById('tabUso').innerHTML = (p.modoDeUso || []).map(step =>
    `<div class="step-item"><i class="bi bi-stars"></i><span>${step}</span></div>`
  ).join('');
  document.getElementById('tabBeneficios').innerHTML = (p.beneficios || []).map(b =>
    `<div class="benefit-item"><i class="bi bi-check-circle"></i><span>${b}</span></div>`
  ).join('');

  const firstTab = document.querySelector('#productModal .nav-tabs .nav-link:first-child');
  if (firstTab) bootstrap.Tab.getOrCreateInstance(firstTab).show();

  document.getElementById('modalQty').value = 1;

  const modalWaBtn = document.getElementById('modalWhatsapp');
  if (modalWaBtn) {
    modalWaBtn.removeAttribute('href');
    modalWaBtn.style.cursor = 'pointer';
    modalWaBtn.onclick = (ev) => {
      ev.preventDefault();
      const q = parseInt(document.getElementById('modalQty')?.value, 10) || 1;
      window.openWhatsApp(window.buildProductWhatsAppMsg(p, q));
    };
  }

  const modalFav = document.getElementById('modalFav');
  if (modalFav) {
    window.syncFavButton(modalFav, p.id);
    modalFav.onclick = () => window.toggleFavorite(p.id);
  }

  bootstrap.Modal.getOrCreateInstance(document.getElementById('productModal')).show();
};

window.switchModalImg = function(index) {
  if (!modalProduct) return;
  const img = document.querySelector('#modalMainImg img');
  if (img) img.src = modalProduct.imagenes[index];
  document.querySelectorAll('#modalThumbs img').forEach((el, i) => {
    el.classList.toggle('active', i === index);
  });
};

function initModal() {
  const minus = document.getElementById('modalQtyMinus');
  const plus = document.getElementById('modalQtyPlus');
  const add = document.getElementById('modalAddCart');
  if (minus) minus.addEventListener('click', () => {
    modalQty = Math.max(1, modalQty - 1);
    document.getElementById('modalQty').value = modalQty;
  });
  if (plus) plus.addEventListener('click', () => {
    modalQty++;
    document.getElementById('modalQty').value = modalQty;
  });
  if (add) add.addEventListener('click', () => {
    if (modalProduct) addToCart(modalProduct.id, modalQty);
  });
}

/* ================================================================ */
/* EFFECTS: ripple, 3D tilt, cursor dot                             */
/* ================================================================ */
function initEffects() {
  document.addEventListener('click', (e) => {
    const t = e.target;
    if (!t || t.nodeType !== 1 || typeof t.closest !== 'function') return;
    const btn = t.closest('.ripple-wrap');
    if (!btn) return;
    const rect = btn.getBoundingClientRect();
    const ripple = document.createElement('div');
    ripple.className = 'ripple';
    const size = Math.max(rect.width, rect.height);
    ripple.style.width = ripple.style.height = size + 'px';
    ripple.style.left = (e.clientX - rect.left - size / 2) + 'px';
    ripple.style.top = (e.clientY - rect.top - size / 2) + 'px';
    btn.appendChild(ripple);
    setTimeout(() => ripple.remove(), 600);
  });

  document.addEventListener('mousemove', (e) => {
    const t = e.target;
    if (!t || t.nodeType !== 1 || typeof t.closest !== 'function') return;
    const card = t.closest('.product-card');
    if (!card) return;
    const rect = card.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width - 0.5;
    const y = (e.clientY - rect.top) / rect.height - 0.5;
    card.style.transform = `translateY(-6px) perspective(600px) rotateX(${-y * 8}deg) rotateY(${x * 8}deg) translateZ(10px)`;
  });
  document.addEventListener('mouseleave', (e) => {
    const t = e.target;
    if (!t || t.nodeType !== 1 || typeof t.closest !== 'function') return;
    const card = t.closest('.product-card');
    if (card) {
      card.style.transform = '';
      card.style.transition = 'transform 0.5s cubic-bezier(0.23,1,0.32,1), box-shadow 0.35s ease';
    }
  }, true);

  let cursorDot = document.querySelector('.cursor-dot');
  if (!cursorDot) {
    cursorDot = document.createElement('div');
    cursorDot.className = 'cursor-dot';
    document.body.appendChild(cursorDot);
  }
  if (window.matchMedia('(pointer: fine)').matches) {
    document.addEventListener('mousemove', (e) => {
      cursorDot.style.left = e.clientX - 5 + 'px';
      cursorDot.style.top = e.clientY - 5 + 'px';
      if (!cursorDot.classList.contains('visible')) cursorDot.classList.add('visible');
    });
  }
}

/* ================================================================ */
/* HERO CAROUSEL HEADLINE ANIMATION                                 */
/* ================================================================ */
function initHero() {
  const carousel = document.getElementById('heroBannerCarousel');
  if (!carousel) return;

  /* Si el admin definió diapositivas personalizadas, reemplaza el markup
   * por defecto. Cada slide lleva imagen de fondo, badge opcional, título,
   * descripción y CTA con texto y link propios. */
  let adminSlides = [];
  try {
    adminSlides = (typeof window.getAdminSlides === 'function')
      ? window.getAdminSlides()
      : JSON.parse(localStorage.getItem('lunabi_admin_slides') || '[]');
  } catch (e) { adminSlides = []; }
  if (Array.isArray(adminSlides) && adminSlides.length) {
    const safe = s => String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
    const posH = v => ['left','center','right'].includes(v) ? v : 'center';
    const posV = v => ['top','middle','bottom'].includes(v) ? v : 'middle';
    const hexRe = /^#[0-9a-f]{6}$/i;
    const cssColor = v => hexRe.test(v || '') ? v : '';
    const cssFont  = v => {
      const ok = [`'Bodoni Moda', serif`, `'Syne', sans-serif`, `'Epilogue', sans-serif`];
      return ok.includes(v) ? v : '';
    };
    const styleAttr = pairs => pairs.filter(([, v]) => v).map(([k, v]) => `${k}:${v}`).join(';');
    const RADIUS_MAP = { default: '', square: '4px', rounded: '14px', pill: '999px' };
    const SHADOW_SPEC = {
      default: null,
      none:    { offset: null },
      sm: { offset: '0 2px 6px',   alpha: 0.28, fallback: 'rgba(0,0,0,0.12)' },
      md: { offset: '0 6px 20px',  alpha: 0.42, fallback: 'rgba(104,42,191,0.28)' },
      lg: { offset: '0 14px 34px', alpha: 0.55, fallback: 'rgba(104,42,191,0.40)' }
    };
    const hexRgba = (h, a) => {
      if (!hexRe.test(h || '')) return '';
      const r = parseInt(h.slice(1,3), 16);
      const g = parseInt(h.slice(3,5), 16);
      const b = parseInt(h.slice(5,7), 16);
      return `rgba(${r},${g},${b},${a})`;
    };
    const shadowCss = (size, color) => {
      const spec = SHADOW_SPEC[size];
      if (!spec) return '';
      if (!spec.offset) return 'none';
      return `${spec.offset} ${hexRgba(color, spec.alpha) || spec.fallback}`;
    };
    const borderCss = (w, c) => {
      const n = Math.max(0, Math.min(8, Number(w) || 0));
      if (n <= 0) return '';
      return hexRe.test(c || '') ? `${n}px solid ${c}` : '';
    };

    const items = adminSlides.map((s, i) => {
      const titleStyle = styleAttr([['color', cssColor(s.tituloColor)], ['font-family', cssFont(s.fuenteTitulo)]]);
      const descStyle  = styleAttr([['color', cssColor(s.descColor)],   ['font-family', cssFont(s.fuenteTexto)]]);
      const shCol = cssColor(s.botonShadowColor);
      const fxName = ['halo','glow','neon','double'].includes(s.botonBorderEffect) ? s.botonBorderEffect : '';
      const fxColor = shCol || cssColor(s.botonBorderColor) || cssColor(s.botonBg) || '';
      const ctaStyle   = styleAttr([
        ['background',  cssColor(s.botonBg)],
        ['color',       cssColor(s.botonColor)],
        ['font-family', cssFont(s.fuenteTexto)],
        ['border',      borderCss(s.botonBorderWidth, s.botonBorderColor)],
        ['border-radius', RADIUS_MAP[s.botonRadius] || ''],
        ['box-shadow',  shadowCss(s.botonShadow, shCol)],
        ['--lu-fx-color', fxColor]
      ]);
      const ctaClass = `hero-cta${fxName ? ` fx-${fxName}` : ''}`;
      const badgeStyle = styleAttr([
        ['background', cssColor(s.badgeBg)],
        ['color',      cssColor(s.badgeColor)]
      ]);
      return `
      <div class="carousel-item ${i === 0 ? 'active' : ''}">
        <div class="hero-slide hero-slide-${(i % 3) + 1} pos-h-${posH(s.posH)} pos-v-${posV(s.posV)}" style="background-image:url('${safe(s.imagen)}'); background-size:cover; background-position:center">
          <div class="hero-content">
            ${s.badge ? `<span class="hero-sale-badge"${badgeStyle ? ` style="${badgeStyle}"` : ''}>${safe(s.badge)}</span>` : ''}
            <h1 class="hero-headline"${titleStyle ? ` style="${titleStyle}"` : ''}>${safe(s.titulo)}</h1>
            <p${descStyle ? ` style="${descStyle}"` : ''}>${safe(s.descripcion)}</p>
            <a href="${safe(s.botonLink || '#')}" class="${ctaClass}"${ctaStyle ? ` style="${ctaStyle}"` : ''}>${safe(s.botonTexto || 'Ver más')}</a>
          </div>
        </div>
      </div>`;
    }).join('');
    const indWrap = carousel.querySelector('.carousel-indicators');
    const inner = carousel.querySelector('.carousel-inner');
    if (indWrap) indWrap.remove();
    if (inner) inner.innerHTML = items;
  }

  function animateHeadline() {
    const activeSlide = carousel.querySelector('.carousel-item.active .hero-headline');
    if (!activeSlide) return;
    const text = activeSlide.textContent;
    activeSlide.innerHTML = '';
    [...text].forEach((char, i) => {
      const span = document.createElement('span');
      span.className = 'char';
      span.textContent = char === ' ' ? '\u00A0' : char;
      span.style.transitionDelay = `${i * 0.03}s`;
      activeSlide.appendChild(span);
    });
    requestAnimationFrame(() => {
      activeSlide.querySelectorAll('.char').forEach(c => c.classList.add('visible'));
    });
  }
  carousel.addEventListener('slid.bs.carousel', animateHeadline);
  setTimeout(animateHeadline, 300);
}

/* ================================================================ */
/* PAGE RENDERERS                                                   */
/* ================================================================ */

function renderHomePage() {
  const grid = document.getElementById('productGrid');
  if (grid) {
    const items = products.filter(p => p.masVendido).slice(0, 8);
    grid.innerHTML = items.map((p, i) => window.renderProductCard(p, i)).join('');
  }

  const brandsRow = document.getElementById('homeBrandsRow');
  if (brandsRow) {
    brandsRow.innerHTML = brands.map(b => `
      <a href="marca-detalle.html?marca=${b.slug}" class="home-brand-chip fade-up">
        <img src="${b.logo}" alt="${b.nombre}" loading="lazy">
        <span>${b.nombre}</span>
      </a>
    `).join('');
  }

  initOfferTimer();
  observeFadeUps();
}

/* Temporizador de oferta — lee config desde site_settings (Supabase) o
 * localStorage como fallback. Si no está activo o ya expiró, oculta la
 * sección. Si está activo y vigente, actualiza el countdown cada segundo. */
let __offerTimerInterval = null;
async function initOfferTimer() {
  const section = document.getElementById('offerTimer');
  if (!section) return;
  if (__offerTimerInterval) { clearInterval(__offerTimerInterval); __offerTimerInterval = null; }

  let cfg = null;
  try {
    if (window.LuApi && window.LuApi.getSetting) {
      cfg = await window.LuApi.getSetting('offer_timer');
    }
    if (!cfg) {
      cfg = JSON.parse(localStorage.getItem('lunabi_settings_offer_timer') || 'null');
    }
  } catch (e) { cfg = null; }

  if (!cfg || !cfg.active || !cfg.target) { section.hidden = true; return; }
  const targetMs = new Date(cfg.target).getTime();
  if (isNaN(targetMs) || targetMs - Date.now() <= 0) { section.hidden = true; return; }

  // Aplica textos + colores
  const set = (sel, txt) => { const el = section.querySelector(sel); if (el && txt) el.textContent = txt; };
  set('[data-offer-title]', cfg.titulo);
  set('[data-offer-sub]', cfg.subtitulo);
  set('[data-offer-cta]', cfg.ctaText);
  const cta = section.querySelector('[data-offer-cta]');
  if (cta && cfg.ctaLink) cta.setAttribute('href', cfg.ctaLink);
  const card = section.querySelector('.offer-timer-card');
  if (card) {
    if (cfg.bgColor && /^#[0-9a-f]{6}$/i.test(cfg.bgColor)) {
      card.style.background = `linear-gradient(135deg, ${cfg.bgColor}, ${cfg.bgColor})`;
      card.style.setProperty('--offer-bg', cfg.bgColor);
    } else { card.style.background = ''; card.style.removeProperty('--offer-bg'); }
    if (cfg.textColor && /^#[0-9a-f]{6}$/i.test(cfg.textColor)) card.style.color = cfg.textColor;
    else card.style.color = '';
  }

  section.hidden = false;
  const dEl = section.querySelector('[data-offer-d]');
  const hEl = section.querySelector('[data-offer-h]');
  const mEl = section.querySelector('[data-offer-m]');
  const sEl = section.querySelector('[data-offer-s]');
  const pad = n => String(n).padStart(2, '0');
  function tick() {
    const diff = targetMs - Date.now();
    if (diff <= 0) {
      section.hidden = true;
      clearInterval(__offerTimerInterval);
      __offerTimerInterval = null;
      return;
    }
    const totalSec = Math.floor(diff / 1000);
    const d = Math.floor(totalSec / 86400);
    const h = Math.floor((totalSec % 86400) / 3600);
    const m = Math.floor((totalSec % 3600) / 60);
    const s = totalSec % 60;
    if (dEl) dEl.textContent = pad(d);
    if (hEl) hEl.textContent = pad(h);
    if (mEl) mEl.textContent = pad(m);
    if (sEl) sEl.textContent = pad(s);
  }
  tick();
  __offerTimerInterval = setInterval(tick, 1000);
}

function renderCategoryPageByKey(pageKey) {
  const page = PAGES[pageKey];
  if (!page) return;

  window.setSourceProducts(products.filter(page.filter));
  window.resetFilterState({ min: 0, max: 999 });

  // Pre-activate categoría from ?categoria=
  const catParam = getQueryParam('categoria');
  if (catParam && page.cats.includes(catParam)) {
    filterState.subcats.add(catParam);
  }

  // Pre-activate tipo from ?tipo= (only valid within the chosen categoría)
  const tipoParam = getQueryParam('tipo');
  if (tipoParam && catParam && Array.isArray(page.structure)) {
    const parentCat = page.structure.find(c => c.key === catParam);
    if (parentCat && parentCat.subs && parentCat.subs.some(s => s.key === tipoParam)) {
      filterState.tipos.add(tipoParam);
    }
  }

  const titleEl = document.getElementById('categoryTitle');
  const subEl = document.getElementById('categorySub');
  if (titleEl) titleEl.textContent = page.title;
  if (subEl) subEl.textContent = page.subtitle;

  window.buildFilterUI(page.structure || [], !page.saleOnly);
  window.renderCategoryGrid();
}

function renderMarcasPage() {
  const grid = document.getElementById('brandsGrid');
  if (!grid) return;
  grid.innerHTML = brands.map((b, i) => `
    <div class="col-lg-3 col-md-4 col-sm-6">
      <a href="marca-detalle.html?marca=${b.slug}" class="brand-card fade-up" style="transition-delay:${i * 0.05}s">
        <img src="${b.logo}" alt="${b.nombre}" loading="lazy">
        <h3>${b.nombre}</h3>
        <p>${b.descripcion}</p>
        <span class="brand-explore">Explorar <i class="bi bi-arrow-right"></i></span>
      </a>
    </div>
  `).join('');
  observeFadeUps();
}

function renderMarcaDetallePage() {
  const slug = getQueryParam('marca');
  if (!slug) { window.location.href = 'marcas.html'; return; }
  const brand = brands.find(b => b.slug === slug);
  if (!brand) { window.location.href = 'marcas.html'; return; }

  const brandProducts = products.filter(p => p.marca === slug);
  window.setSourceProducts(brandProducts);
  window.resetFilterState({ min: 0, max: 999 });

  const titleEl = document.getElementById('categoryTitle');
  const subEl = document.getElementById('categorySub');
  if (titleEl) titleEl.textContent = brand.nombre;
  if (subEl) subEl.textContent = brand.descripcion;

  // Derive a flat structure from whatever categories this brand actually has
  const uniqCats = [...new Set(brandProducts.map(p => p.categoria))];
  const brandStructure = uniqCats.map(key => ({
    key,
    label: (window.SUBCAT_LABELS && window.SUBCAT_LABELS[key]) || key,
    subs: []
  }));
  window.buildFilterUI(brandStructure, brandStructure.length > 1);
  window.renderCategoryGrid();

  document.title = `${brand.nombre} | Lünabi — Cosméticos Coreanos`;
}

function renderProductoPage() {
  const id = parseInt(getQueryParam('id'), 10);
  const p = products.find(pr => pr.id === id);
  if (!p) { window.location.href = 'index.html'; return; }

  const brand = brands.find(b => b.slug === p.marca);
  const hasDiscount = p.precioAntes && p.precioAntes > p.precio;

  const mainImg = document.getElementById('productoMainImg');
  if (mainImg) { mainImg.src = p.imagenes[0]; mainImg.alt = p.nombre; }

  const thumbs = document.getElementById('productoThumbs');
  if (thumbs) {
    thumbs.innerHTML = p.imagenes.map((img, i) =>
      `<img src="${img}" alt="thumb ${i+1}" class="${i === 0 ? 'active' : ''}" data-idx="${i}" loading="lazy">`
    ).join('');
    thumbs.querySelectorAll('img').forEach(el => {
      el.addEventListener('click', () => {
        const idx = parseInt(el.getAttribute('data-idx'), 10);
        if (mainImg) mainImg.src = p.imagenes[idx];
        thumbs.querySelectorAll('img').forEach((t, i) => t.classList.toggle('active', i === idx));
      });
    });
  }

  const brandLink = document.getElementById('productoBrand');
  if (brandLink) {
    brandLink.textContent = brand ? brand.nombre : p.marca;
    brandLink.href = `marca-detalle.html?marca=${p.marca}`;
  }
  const nameEl = document.getElementById('productoName');
  if (nameEl) nameEl.textContent = p.nombre;

  const priceEl = document.getElementById('productoPrice');
  if (priceEl) {
    const pct = hasDiscount
      ? Math.round((p.precioAntes - p.precio) / p.precioAntes * 100)
      : 0;
    priceEl.innerHTML = hasDiscount
      ? `<span class="old-price">S/ ${p.precioAntes.toFixed(2)}</span> S/ ${p.precio.toFixed(2)}<span class="price-discount-pct">-${pct}%</span><span class="modal-save">AHORRA S/${(p.precioAntes - p.precio).toFixed(2)}</span>`
      : `S/ ${p.precio.toFixed(2)}`;
  }

  const tabInfo = document.getElementById('tabInfoPage');
  const tabUso = document.getElementById('tabUsoPage');
  const tabBen = document.getElementById('tabBeneficiosPage');
  if (tabInfo) tabInfo.innerHTML = `<p>${p.descripcion}</p>`;
  if (tabUso) tabUso.innerHTML = (p.modoDeUso || []).map(s =>
    `<div class="step-item"><i class="bi bi-stars"></i><span>${s}</span></div>`).join('');
  if (tabBen) tabBen.innerHTML = (p.beneficios || []).map(b =>
    `<div class="benefit-item"><i class="bi bi-check-circle"></i><span>${b}</span></div>`).join('');

  let qty = 1;
  const qInput = document.getElementById('productoQty');
  const minusBtn = document.getElementById('productoQtyMinus');
  const plusBtn = document.getElementById('productoQtyPlus');
  const addBtn = document.getElementById('productoAddCart');
  const wspBtn = document.getElementById('productoWsp');
  if (minusBtn) minusBtn.addEventListener('click', () => {
    qty = Math.max(1, qty - 1);
    if (qInput) qInput.value = qty;
  });
  if (plusBtn) plusBtn.addEventListener('click', () => {
    qty++;
    if (qInput) qInput.value = qty;
  });
  if (addBtn) addBtn.addEventListener('click', () => addToCart(p.id, qty));
  if (wspBtn) {
    wspBtn.removeAttribute('href');
    wspBtn.style.cursor = 'pointer';
    wspBtn.onclick = (ev) => {
      ev.preventDefault();
      window.openWhatsApp(window.buildProductWhatsAppMsg(p, qty));
    };
  }

  const favBtn = document.getElementById('productoFav');
  if (favBtn) {
    window.syncFavButton(favBtn, p.id);
    favBtn.onclick = () => window.toggleFavorite(p.id);
  }

  const relGrid = document.getElementById('relatedGrid');
  if (relGrid) {
    const related = products.filter(pr => pr.categoria === p.categoria && pr.id !== p.id).slice(0, 4);
    if (related.length === 0) {
      relGrid.innerHTML = `<div class="col-12 text-center" style="color:var(--text-muted)">No hay productos relacionados.</div>`;
    } else {
      relGrid.innerHTML = related.map((pr, i) => window.renderProductCard(pr, i)).join('');
    }
  }

  document.title = `${p.nombre} | Lünabi — Cosméticos Coreanos`;
  observeFadeUps();
}

function renderCartPage() {
  const itemsEl = document.getElementById('cartPageItems');
  const summaryEl = document.getElementById('cartPageSummary');
  if (!itemsEl || !summaryEl) return;

  const cartArr = getCartItems();
  const total = getCartTotal();
  const count = getCartCount();

  if (count === 0) {
    itemsEl.innerHTML = `
      <div class="cart-page-empty">
        <i class="bi bi-bag-x"></i>
        <p>Tu carrito está vacío</p>
        <a href="index.html" class="hero-cta mt-3 d-inline-block">Volver al inicio</a>
      </div>`;
    summaryEl.innerHTML = '';
    return;
  }

  itemsEl.innerHTML = cartArr.map(item => {
    const p = products.find(pr => pr.id === item.id);
    if (!p) return '';
    const brand = brands.find(b => b.slug === p.marca);
    const subtotal = p.precio * item.qty;
    return `
      <div class="cart-item">
        <img src="${p.imagenes[0]}" alt="${p.nombre}" loading="lazy">
        <div class="cart-item-info">
          <a class="cart-item-name" href="producto.html?id=${p.id}" style="color:inherit; text-decoration:none">${p.nombre}</a>
          <div class="cart-item-brand">${brand ? brand.nombre : p.marca}</div>
          <div class="cart-item-price">S/ ${p.precio.toFixed(2)}</div>
        </div>
        <div class="cart-item-right">
          <div class="cart-item-subtotal">S/ ${subtotal.toFixed(2)}</div>
          <div class="cart-qty">
            <button onclick="updateQty(${p.id}, -1)">−</button>
            <span>${item.qty}</span>
            <button onclick="updateQty(${p.id}, 1)">+</button>
          </div>
          <button class="cart-item-delete" onclick="removeFromCart(${p.id})"><i class="bi bi-trash3"></i></button>
        </div>
      </div>`;
  }).join('');

  summaryEl.innerHTML = `
    <h5>Resumen del pedido</h5>
    <div class="summary-row"><span>Productos (${count})</span><span>S/ ${total.toFixed(2)}</span></div>
    <div class="summary-row"><span>Envío</span><span>A coordinar</span></div>
    <div class="summary-total"><span>Total</span><span>S/ ${total.toFixed(2)}</span></div>
    <button class="btn-whatsapp-cart mt-3" id="cartPageWhatsapp" type="button">
      <i class="bi bi-whatsapp"></i> Enviar pedido por WhatsApp
    </button>
    <button class="btn-clear-cart mt-2" id="cartPageClear" type="button">Vaciar carrito</button>
  `;
  const waBtn = document.getElementById('cartPageWhatsapp');
  const clearBtn = document.getElementById('cartPageClear');
  if (waBtn) waBtn.addEventListener('click', sendWhatsAppOrder);
  if (clearBtn) clearBtn.addEventListener('click', () => {
    clearCart();
    showToast('Carrito vaciado', 'info');
  });
}
window.renderCartPage = renderCartPage;

/* ================================================================ */
/* FORMS                                                            */
/* ================================================================ */
function initContactoForm() {
  const form = document.getElementById('contactoForm');
  if (!form) return;
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const nombre = form.querySelector('[name="nombre"]').value.trim();
    const email = form.querySelector('[name="email"]').value.trim();
    const mensaje = form.querySelector('[name="mensaje"]').value.trim();
    if (!nombre || !email || !mensaje) return;
    const msg = `👋 *Mensaje desde Lünabi*\n\n*Nombre:* ${nombre}\n*Email:* ${email}\n\n${mensaje}`;
    window.openWhatsApp(msg);
    showToast('Elige tu ubicación para enviar', 'info');
    form.reset();
  });
}

function initReclamacionesForm() {
  const form = document.getElementById('reclamacionesForm');
  if (!form) return;
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const data = {
      nombre: form.querySelector('[name="nombre"]').value.trim(),
      dni: form.querySelector('[name="dni"]').value.trim(),
      producto: form.querySelector('[name="producto"]').value.trim(),
      motivo: form.querySelector('[name="motivo"]').value,
      descripcion: form.querySelector('[name="descripcion"]').value.trim()
    };
    if (!data.nombre || !data.dni || !data.producto || !data.descripcion) return;
    const msg = `📋 *Libro de Reclamaciones — Lünabi*\n\n*Nombre:* ${data.nombre}\n*DNI:* ${data.dni}\n*Producto/Servicio:* ${data.producto}\n*Motivo:* ${data.motivo}\n\n*Descripción:*\n${data.descripcion}`;
    window.openWhatsApp(msg);
    showToast('Elige tu ubicación para enviar', 'info');
    form.reset();
  });
}

/* ================================================================ */
/* INIT                                                             */
/* ================================================================ */
function initApp() {
  // Wire navbar-dependent modules (navbar has been injected by components.js)
  if (typeof wireThemeToggle === 'function') wireThemeToggle();
  if (typeof initCart === 'function') initCart();
  if (typeof initSearch === 'function') initSearch();
  if (typeof initAuth === 'function') initAuth();
  initNavbarScroll();
  initMobileNav();
  initModal();
  initEffects();
  if (typeof setActiveNavLink === 'function') setActiveNavLink();

  const page = (typeof getCurrentPage === 'function') ? getCurrentPage() : 'index';

  switch (page) {
    case 'index':
      renderHomePage();
      initHero();
      break;
    case 'skincare':
    case 'maquillaje':
    case 'corporal':
    case 'accesorios':
    case 'sale':
      if (typeof initFilters === 'function') initFilters();
      renderCategoryPageByKey(page);
      break;
    case 'marcas':
      renderMarcasPage();
      break;
    case 'marca-detalle':
      if (typeof initFilters === 'function') initFilters();
      renderMarcaDetallePage();
      break;
    case 'producto':
      renderProductoPage();
      break;
    case 'carrito':
      renderCartPage();
      break;
    case 'contacto':
      initContactoForm();
      break;
    case 'libro-reclamaciones':
      initReclamacionesForm();
      break;
    case 'admin':
      if (typeof initAdmin === 'function') initAdmin();
      break;
    case 'cuenta':
      if (typeof initCuenta === 'function') initCuenta();
      break;
    default:
      // nosotros / faq / terminos: no extra JS needed
      break;
  }

  observeFadeUps();
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initApp);
} else {
  initApp();
}

/* Expuesto para que data.js re-renderice tras rehidratar desde Supabase.
 * Re-dispatcha según la página activa sin re-engancharse a listeners globales. */
window.rerenderCurrentPage = function() {
  const page = (typeof getCurrentPage === 'function') ? getCurrentPage() : 'index';
  switch (page) {
    case 'index':          if (typeof renderHomePage === 'function') renderHomePage(); break;
    case 'skincare':
    case 'maquillaje':
    case 'corporal':
    case 'accesorios':
    case 'sale':           if (typeof renderCategoryPageByKey === 'function') renderCategoryPageByKey(page); break;
    case 'marcas':         if (typeof renderMarcasPage === 'function') renderMarcasPage(); break;
    case 'marca-detalle':  if (typeof renderMarcaDetallePage === 'function') renderMarcaDetallePage(); break;
    case 'producto':       if (typeof renderProductoPage === 'function') renderProductoPage(); break;
    case 'carrito':        if (typeof renderCartPage === 'function') renderCartPage(); break;
  }
  if (typeof observeFadeUps === 'function') observeFadeUps();
};
