/* ===== LÜNABI — Main orchestrator =====
 *
 * Runs after theme.js, carrito.js, buscador.js, filtros.js, router.js and
 * components.js have already loaded. By now the navbar / footer / modal /
 * cart drawer have been injected into their containers, so we can safely
 * wire listeners to elements inside them.
 */

window.WA_NUMBER = '51XXXXXXXXX';

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
            ${hasDiscount ? '<span class="badge-sale">SALE</span>' : ''}
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
  document.getElementById('modalPrice').innerHTML = hasDiscount
    ? `<span class="old-price">S/ ${p.precioAntes.toFixed(2)}</span> S/ ${p.precio.toFixed(2)}<span class="modal-save">AHORRA S/${(p.precioAntes - p.precio).toFixed(2)}</span>`
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

  const waMsg = `Hola! Me interesa el producto: ${p.nombre} - S/${p.precio.toFixed(2)}. ¿Tienen stock?`;
  document.getElementById('modalWhatsapp').href = `https://wa.me/${window.WA_NUMBER}?text=${encodeURIComponent(waMsg)}`;

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
    const btn = e.target.closest('.ripple-wrap');
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
    const card = e.target.closest('.product-card');
    if (!card) return;
    const rect = card.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width - 0.5;
    const y = (e.clientY - rect.top) / rect.height - 0.5;
    card.style.transform = `translateY(-6px) perspective(600px) rotateX(${-y * 8}deg) rotateY(${x * 8}deg) translateZ(10px)`;
  });
  document.addEventListener('mouseleave', (e) => {
    const card = e.target.closest('.product-card');
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

  observeFadeUps();
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
    priceEl.innerHTML = hasDiscount
      ? `<span class="old-price">S/ ${p.precioAntes.toFixed(2)}</span> S/ ${p.precio.toFixed(2)}`
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
    const msg = `Hola! Me interesa el producto: ${p.nombre} - S/${p.precio.toFixed(2)}. ¿Tienen stock?`;
    wspBtn.href = `https://wa.me/${window.WA_NUMBER}?text=${encodeURIComponent(msg)}`;
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
    window.open(`https://wa.me/${window.WA_NUMBER}?text=${encodeURIComponent(msg)}`, '_blank');
    showToast('Mensaje enviado vía WhatsApp', 'success');
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
    window.open(`https://wa.me/${window.WA_NUMBER}?text=${encodeURIComponent(msg)}`, '_blank');
    showToast('Reclamación enviada', 'success');
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
