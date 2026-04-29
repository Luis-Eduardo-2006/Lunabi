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
    const sep = '━'.repeat(14);
    const totalItems = cart.reduce((s, c) => s + (c.qty || 0), 0);
    const brandsMap = (typeof window !== 'undefined' && Array.isArray(window.brands)) ? window.brands : [];
    let totalAhorro = 0;

    /* Solo glifos BMP no-emoji — familia visual coherente con main.js. */
    const E = {
      moon:    '☾',   // saludo (luna — identidad Lünabi)
      flower:  '❀',   // sign-off (segunda mitad de la marca)
      bullet:  '✿',   // cada producto del pedido
      arrow:   '➜',   // precio antes ➜ precio nuevo (flecha decorativa)
      down:    '↓',   // -X% (porcentaje de descuento)
      prize:   '★',   // ahorro total (premio/logro)
      diamond: '❖'    // TOTAL A PAGAR (valor final)
    };

    const greeting = (typeof window.buildGreeting === 'function')
      ? window.buildGreeting('pedido')
      : `\u00A1Hola L\u00FCnabi! ${E.moon}\nQuiero hacer un pedido`;

    let msg = `${greeting}\n\n${sep}\n\n`;
    msg += `*Mi pedido* \u2014 ${totalItems} ${totalItems === 1 ? 'producto' : 'productos'}\n`;
    cart.forEach((item, idx) => {
      const p = products.find(pr => pr.id === item.id);
      if (!p) return;
      const brand = brandsMap.find(b => b.slug === p.marca);
      const codigo = `LUN-${String(p.id).padStart(4, '0')}`;
      const subtotal = (p.precio * item.qty).toFixed(2);
      const tieneDesc = p.precioAntes && p.precioAntes > p.precio;
      if (tieneDesc) totalAhorro += (p.precioAntes - p.precio) * item.qty;

      msg += `\n${E.bullet} *${idx + 1}. ${p.nombre}*\n`;
      if (brand) msg += `Marca: ${brand.nombre}\n`;
      msg += `C\u00F3digo: ${codigo}\n`;
      msg += `Cantidad: \u00D7${item.qty} ${item.qty > 1 ? 'unidades' : 'unidad'}\n`;
      if (tieneDesc) {
        const pct = Math.round((p.precioAntes - p.precio) / p.precioAntes * 100);
        msg += `Precio: ~S/ ${p.precioAntes.toFixed(2)}~ ${E.arrow} *S/ ${p.precio.toFixed(2)}* ${E.down} -${pct}%\n`;
      } else {
        msg += `Precio: S/ ${p.precio.toFixed(2)} c/u\n`;
      }
      msg += `Subtotal: *S/ ${subtotal}*\n`;
    });

    msg += `\n${sep}\n\n`;
    if (totalAhorro > 0) msg += `${E.prize} Ahorro total: *S/ ${totalAhorro.toFixed(2)}*\n`;
    msg += `${E.diamond} *TOTAL A PAGAR: S/ ${getCartTotal().toFixed(2)}*\n\n`;
    msg += `${sep}\n\n`;
    msg += `\u00BFPueden confirmarme la *disponibilidad* y coordinar el *env\u00EDo*?\n\n`;
    msg += `\u00A1Muchas gracias! ${E.flower}`;
    return msg;
  }

  function persistOrder(waKey) {
    if (!cart.length) return null;
    const items = cart.map(ci => {
      const p = products.find(pr => pr.id === ci.id);
      return {
        id: ci.id,
        qty: ci.qty,
        nombre: p ? p.nombre : ('Producto #' + ci.id),
        marca: p ? p.marca : '',
        imagen: p && p.imagenes ? p.imagenes[0] : '',
        precio: p ? Number(p.precio) : 0
      };
    });
    const total = getCartTotal();

    // Remoto: LuApi.createOrder (inserta en Supabase con RLS)
    if (window.LuApi && window.LuApi.isRemote && window.LuApi.isRemote()) {
      window.LuApi.createOrder({ items, total, waKey }).catch(e =>
        console.warn('[order] remote insert', e)
      );
    }

    // Fallback local siempre (para que "Mi cuenta" funcione también sin backend)
    try {
      const session = JSON.parse(localStorage.getItem('lunabi_session') || 'null');
      const key = session && session.email ? session.email : 'guest';
      const all = JSON.parse(localStorage.getItem('lunabi_orders') || '{}');
      const list = Array.isArray(all[key]) ? all[key] : [];
      const order = {
        id: 'ORD-' + Date.now().toString(36).toUpperCase(),
        createdAt: Date.now(), items, total,
        status: 'pendiente', wa_key: waKey || null
      };
      list.unshift(order);
      all[key] = list;
      localStorage.setItem('lunabi_orders', JSON.stringify(all));
      return order;
    } catch (e) { return null; }
  }

  /* Alterna la vista "primaria" (botones Vaciar/Enviar) por la vista del
   * picker inline (opciones Huancayo / Nacional). No dispara el envío
   * todavía; eso ocurre cuando el usuario elige una de las dos opciones. */
  function toggleCartWaPicker(showPicker) {
    const primary = document.getElementById('cartFooterPrimary');
    const picker  = document.getElementById('cartFooterWa');
    if (!primary || !picker) return;
    if (showPicker) {
      // Refresca estado de cada opción según WA_NUMBERS / placeholders.
      const numbers = window.WA_NUMBERS || {};
      picker.querySelectorAll('[data-wa-key]').forEach(btn => {
        const key = btn.getAttribute('data-wa-key');
        const num = numbers[key] && numbers[key].number;
        const isPh = typeof window.isWaPlaceholder === 'function' && window.isWaPlaceholder(num);
        btn.classList.toggle('is-disabled', isPh);
        btn.disabled = isPh;
        const hint = btn.querySelector('.cart-wa-option-hint');
        if (hint) {
          if (isPh) {
            if (!hint.dataset.original) hint.dataset.original = hint.textContent;
            hint.textContent = 'Próximamente — usa Huancayo por ahora';
          } else if (hint.dataset.original) {
            hint.textContent = hint.dataset.original;
          }
        }
      });
      primary.hidden = true;
      picker.hidden = false;
      requestAnimationFrame(() => picker.classList.add('is-open'));
    } else {
      picker.classList.remove('is-open');
      // Dejamos terminar la transición antes de ocultar con [hidden]
      setTimeout(() => {
        picker.hidden = true;
        primary.hidden = false;
      }, 220);
    }
  }

  /* Devuelve true si hay sesión activa. Si no, muestra un toast y abre el
   * modal de login. Lo usamos como gate antes de enviar el pedido — la
   * consulta general (botón flotante) NO usa este gate. */
  function requireSessionForCheckout() {
    let user = null;
    try {
      if (typeof window.getCurrentUser === 'function') user = window.getCurrentUser();
      if (!user) {
        const raw = localStorage.getItem('lunabi_session');
        user = raw ? JSON.parse(raw) : null;
      }
    } catch (e) { user = null; }
    if (user) return true;
    showToast('Inicia sesión para enviar tu pedido', 'info');
    if (typeof window.openAuthModal === 'function') window.openAuthModal('login');
    return false;
  }

  function sendWhatsAppOrder() {
    if (!cart.length) return;
    if (!requireSessionForCheckout()) return;
    toggleCartWaPicker(true);
  }

  /* Llamado cuando el usuario clickea una de las dos opciones del picker
   * inline. Registra el pedido, abre WhatsApp con el número elegido y
   * vacía el carrito (el snapshot ya quedó persistido en el historial). */
  function finalizeOrder(waKey) {
    // Re-chequea sesión por si alguien cerró sesión con el picker abierto.
    if (!requireSessionForCheckout()) return;
    const numbers = window.WA_NUMBERS || {};
    const n = (numbers[waKey] && numbers[waKey].number) || window.WA_NUMBER || '';
    // Si el número aún es placeholder (51YYYYYYYYY), avisamos y no abrimos WA.
    if (typeof window.isWaPlaceholder === 'function' && window.isWaPlaceholder(n)) {
      showToast('Ese canal estará disponible pronto. Mientras tanto, usa Huancayo.', 'info');
      return;
    }
    const msg = buildWhatsAppOrder();
    if (!msg) return;
    persistOrder(waKey);
    if (typeof window.recordSales === 'function') {
      window.recordSales(cart);
    }
    window.open(`https://wa.me/${n}?text=${encodeURIComponent(msg)}`, '_blank');

    // Colapsamos el picker, vaciamos el carrito (queda guardado en el historial
    // de pedidos) y cerramos el drawer. Sin esto, el siguiente "agregar al
    // carrito" sumaba qty al pedido anterior porque cart seguía en memoria.
    toggleCartWaPicker(false);
    clearCart();
    closeCart();
    showToast('Pedido enviado. Carrito vaciado.', 'success');
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

    // Picker inline de WhatsApp (Huancayo / Nacional) dentro del carrito
    const waBack = document.getElementById('cartWaBack');
    if (waBack) waBack.addEventListener('click', () => toggleCartWaPicker(false));

    const waPicker = document.getElementById('cartFooterWa');
    if (waPicker) {
      waPicker.addEventListener('click', (e) => {
        const btn = e.target.closest('[data-wa-key]');
        if (!btn) return;
        finalizeOrder(btn.getAttribute('data-wa-key'));
      });
    }

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
