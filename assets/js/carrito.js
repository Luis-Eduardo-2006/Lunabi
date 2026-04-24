/* ===== LÜNABI — Carrito (estado + drawer + WhatsApp) ===== */

(function() {
  const STORAGE_KEY = 'lunabi_cart';
  let cart = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');

  function saveCart() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(cart));
    updateCartUI();
  }

  function addToCart(productId, qty = 1) {
    const product = products.find(p => p.id === productId);
    if (!product) return;
    const existing = cart.find(c => c.id === productId);
    if (existing) existing.qty += qty;
    else cart.push({ id: productId, qty });
    saveCart();
    pulseBadge();
    showToast('¡Agregado al carrito!', 'success');
  }

  function removeFromCart(productId) {
    cart = cart.filter(c => c.id !== productId);
    saveCart();
  }

  function updateQty(productId, delta) {
    const item = cart.find(c => c.id === productId);
    if (!item) return;
    item.qty = Math.max(1, item.qty + delta);
    saveCart();
  }

  function clearCart() {
    cart = [];
    saveCart();
  }

  function getCartTotal() {
    return cart.reduce((sum, item) => {
      const p = products.find(pr => pr.id === item.id);
      return sum + (p ? p.precio * item.qty : 0);
    }, 0);
  }

  function getCartCount() {
    return cart.reduce((sum, item) => sum + item.qty, 0);
  }

  function getCartItems() {
    return cart.slice();
  }

  function updateCartUI() {
    const count = getCartCount();
    const total = getCartTotal();

    const badge = document.getElementById('cartBadge');
    const countBadge = document.getElementById('cartCountBadge');
    const totalEl = document.getElementById('cartTotal');
    if (badge) badge.textContent = count;
    if (countBadge) countBadge.textContent = count;
    if (totalEl) totalEl.textContent = `S/ ${total.toFixed(2)}`;

    const cartItems = document.getElementById('cartItems');
    const cartEmpty = document.getElementById('cartEmpty');
    const cartFooter = document.getElementById('cartFooter');

    if (cartItems && cartEmpty && cartFooter) {
      if (count === 0) {
        cartEmpty.style.display = 'block';
        cartItems.innerHTML = '';
        cartFooter.style.display = 'none';
      } else {
        cartEmpty.style.display = 'none';
        cartFooter.style.display = 'block';
        cartItems.innerHTML = cart.map(item => {
          const p = products.find(pr => pr.id === item.id);
          if (!p) return '';
          const brand = brands.find(b => b.slug === p.marca);
          const subtotal = p.precio * item.qty;
          return `
            <div class="cart-item">
              <img src="${p.imagenes[0]}" alt="${p.nombre}" loading="lazy">
              <div class="cart-item-info">
                <div class="cart-item-name">${p.nombre}</div>
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
      }
    }

    // If there's a full-page cart on this page, re-render it too.
    if (typeof window.renderCartPage === 'function') window.renderCartPage();
  }

  function pulseBadge() {
    const badge = document.getElementById('cartBadge');
    if (!badge) return;
    badge.classList.remove('pulse');
    void badge.offsetWidth;
    badge.classList.add('pulse');
  }

  function openCart() {
    const overlay = document.getElementById('cartOverlay');
    const drawer = document.getElementById('cartDrawer');
    if (!overlay || !drawer) return;
    overlay.classList.add('open');
    drawer.classList.add('open');
    document.body.style.overflow = 'hidden';
  }
  function closeCart() {
    const overlay = document.getElementById('cartOverlay');
    const drawer = document.getElementById('cartDrawer');
    if (!overlay || !drawer) return;
    overlay.classList.remove('open');
    drawer.classList.remove('open');
    document.body.style.overflow = '';
  }

  function buildWhatsAppOrder() {
    if (cart.length === 0) return '';
    let msg = '🛍️ *PEDIDO LÜNABI*\n\n📦 *Productos:*\n';
    cart.forEach(item => {
      const p = products.find(pr => pr.id === item.id);
      if (p) msg += `• ${item.qty}x ${p.nombre} — S/ ${(p.precio * item.qty).toFixed(2)}\n`;
    });
    msg += `\n💰 *Total: S/ ${getCartTotal().toFixed(2)}*\n\n📱 Por favor confirmar disponibilidad y coordinar envío.`;
    return msg;
  }

  function sendWhatsAppOrder() {
    const msg = buildWhatsAppOrder();
    if (!msg) return;
    // Registrar la venta antes de abrir WhatsApp. Esto alimenta los
    // badges de "Más vendido" que se recomputan dinámicamente según
    // la acumulación de pedidos.
    if (typeof window.recordSales === 'function') {
      window.recordSales(cart);
    }
    const waNumber = window.WA_NUMBER || '51XXXXXXXXX';
    window.open(`https://wa.me/${waNumber}?text=${encodeURIComponent(msg)}`, '_blank');
  }

  function initCart() {
    const toggle = document.getElementById('cartToggle');
    const closeBtn = document.getElementById('cartClose');
    const overlay = document.getElementById('cartOverlay');
    const clear = document.getElementById('btnClearCart');
    const wa = document.getElementById('btnWhatsappCart');

    if (toggle) toggle.addEventListener('click', openCart);
    if (closeBtn) closeBtn.addEventListener('click', closeCart);
    if (overlay) overlay.addEventListener('click', closeCart);
    if (clear) clear.addEventListener('click', () => {
      clearCart();
      showToast('Carrito vaciado', 'info');
    });
    if (wa) wa.addEventListener('click', sendWhatsAppOrder);

    updateCartUI();
  }

  /* ---------- TOAST ---------- */
  function showToast(message, type = 'success') {
    const container = document.getElementById('toast-container') || document.getElementById('toastContainer');
    if (!container) return;
    const toast = document.createElement('div');
    toast.className = `lu-toast ${type}`;
    toast.textContent = message;
    container.appendChild(toast);
    setTimeout(() => {
      toast.classList.add('out');
      setTimeout(() => toast.remove(), 300);
    }, 2500);
  }

  // Expose globally (inline handlers + cross-module calls).
  window.addToCart = addToCart;
  window.removeFromCart = removeFromCart;
  window.updateQty = updateQty;
  window.clearCart = clearCart;
  window.getCartTotal = getCartTotal;
  window.getCartCount = getCartCount;
  window.getCartItems = getCartItems;
  window.updateCartUI = updateCartUI;
  window.openCart = openCart;
  window.closeCart = closeCart;
  window.sendWhatsAppOrder = sendWhatsAppOrder;
  window.buildWhatsAppOrder = buildWhatsAppOrder;
  window.initCart = initCart;
  window.showToast = showToast;
})();
