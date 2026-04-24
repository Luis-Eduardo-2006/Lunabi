/* ===== LÜNABI — Admin Panel =====
 *
 * Lógica del panel de administración en admin.html. Persiste todo en
 * localStorage y lo inyecta a los globales `products` y `brands` al cargar
 * (ese merge vive en data.js). Para conectar un backend real más adelante,
 * reemplazar `load*` / `save*` por llamadas fetch al endpoint REST que
 * corresponda; los formularios ya están POST-shaped.
 *
 * Expone en `window`: initAdmin, getAdminSlides (usado por renderHomePage
 * para reemplazar las diapositivas del carrusel principal).
 */

(function() {
  const STORE_PRODUCTS = 'lunabi_admin_products';
  const STORE_BRANDS   = 'lunabi_admin_brands';
  const STORE_SLIDES   = 'lunabi_admin_slides';

  /* ---------- STORAGE HELPERS ---------- */
  function load(key) {
    try { return JSON.parse(localStorage.getItem(key) || '[]'); }
    catch (e) { return []; }
  }
  function save(key, val) {
    try {
      localStorage.setItem(key, JSON.stringify(val));
      return true;
    } catch (e) {
      if (window.showToast) {
        window.showToast('Almacenamiento lleno. Usa URLs o imágenes más livianas.', 'info');
      }
      return false;
    }
  }
  function slugify(s) {
    return (s || '').toLowerCase()
      .normalize('NFD').replace(/[̀-ͯ]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '');
  }

  /* ---------- IMAGE HELPERS ----------
   * Aspect ratios y tamaños destino por tipo de slot. El editor exporta a
   * exactamente estas dimensiones para que cada imagen calce perfecta en
   * su lugar (card cuadrada, logo circular, banner 16:9, etc.). */
  const SLOT_SIZES = {
    product: { w: 800,  h: 800,  label: 'Producto — formato 1:1 (cuadrado)' },
    brand:   { w: 400,  h: 400,  label: 'Marca — formato 1:1 circular' },
    slide:   { w: 1600, h: 900,  label: 'Banner — formato 16:9 apaisado' }
  };
  function getSlotSize(slot) { return SLOT_SIZES[slot] || SLOT_SIZES.product; }

  /* Lee un File y lo comprime a data URL JPEG para ahorrar espacio en
   * localStorage (las imágenes sin comprimir saturan el cupo de 5MB muy
   * rápido). Mantiene proporción y tope en 1200px por lado. */
  function fileToCompressedDataURL(file, maxSize = 1200, quality = 0.82) {
    return new Promise((resolve, reject) => {
      if (!file || !file.type || !file.type.startsWith('image/')) {
        reject(new Error('not-an-image')); return;
      }
      const reader = new FileReader();
      reader.onerror = () => reject(reader.error);
      reader.onload = () => {
        const img = new Image();
        img.onerror = () => reject(new Error('decode-failed'));
        img.onload = () => {
          let { width, height } = img;
          if (width > maxSize || height > maxSize) {
            const ratio = Math.min(maxSize / width, maxSize / height);
            width  = Math.round(width  * ratio);
            height = Math.round(height * ratio);
          }
          const canvas = document.createElement('canvas');
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          ctx.drawImage(img, 0, 0, width, height);
          // PNG si es pequeño y tiene transparencia, JPEG en otro caso (más chico)
          const keepPng = file.type === 'image/png' && (width * height) < 250000;
          resolve(canvas.toDataURL(keepPng ? 'image/png' : 'image/jpeg', quality));
        };
        img.src = reader.result;
      };
      reader.readAsDataURL(file);
    });
  }

  /* Convierte cualquier contenedor .admin-image-input (o una fila del
   * repeater de imágenes) en un control vivo:
   * - sincroniza el preview con el valor del input
   * - al seleccionar archivo → abre el editor modal con el slot correcto
   * - al hacer click en el preview con valor → reabre el editor para ajustar
   */
  function wireImageInput(container) {
    if (!container || container.dataset.wired === '1') return;
    const urlInput = container.querySelector('input[type="url"], input[type="text"]');
    const fileInput = container.querySelector('input[type="file"]');
    const preview = container.querySelector('.admin-image-preview');
    if (!urlInput || !fileInput || !preview) return;

    // Slot declarado en el propio contenedor o en el ancestro más cercano
    const slotHost = container.closest('[data-slot]');
    const slot = (slotHost && slotHost.dataset.slot) || 'product';

    const update = () => {
      const v = (urlInput.value || '').trim();
      preview.classList.toggle('has-value', !!v);
      preview.style.backgroundImage = v ? `url('${v.replace(/'/g, "%27")}')` : '';
    };
    urlInput.addEventListener('input', update);

    // Subida: siempre pasa por el editor para encuadrar al formato correcto
    fileInput.addEventListener('change', () => {
      const f = fileInput.files && fileInput.files[0];
      if (!f) return;
      if (typeof window.openImageEditor === 'function') {
        window.openImageEditor({
          source: f,
          slot,
          onApply: (dataUrl) => {
            urlInput.value = dataUrl;
            update();
            if (window.showToast) window.showToast('Imagen ajustada', 'success');
          }
        });
      } else {
        // Fallback: compresión simple si el editor no está cargado
        fileToCompressedDataURL(f)
          .then(du => { urlInput.value = du; update(); })
          .catch(() => { if (window.showToast) window.showToast('No se pudo procesar la imagen', 'info'); });
      }
      fileInput.value = '';
    });

    // Click en el preview: si tiene valor → reabre editor, si no → selector de archivo
    preview.addEventListener('click', () => {
      const v = (urlInput.value || '').trim();
      if (!v) { fileInput.click(); return; }
      if (typeof window.openImageEditor === 'function') {
        window.openImageEditor({
          source: v,
          slot,
          onApply: (dataUrl) => {
            urlInput.value = dataUrl;
            update();
            if (window.showToast) window.showToast('Imagen actualizada', 'success');
          }
        });
      }
    });

    update();
    container.dataset.wired = '1';
  }

  /* ---------- ANIMATED COUNTER ---------- */
  function animateCounter(el, target, { currency = false, duration = 900 } = {}) {
    if (!el) return;
    target = Number(target) || 0;
    const start = performance.now();
    const fmt = (n) => currency
      ? 'S/ ' + n.toFixed(2)
      : Math.round(n).toLocaleString('es-PE');
    function tick(now) {
      const p = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - p, 3);
      el.textContent = fmt(target * eased);
      if (p < 1) requestAnimationFrame(tick);
      else el.textContent = fmt(target);
    }
    requestAnimationFrame(tick);
  }

  /* ---------- IMAGE EDITOR (modal) ----------
   * Permite pan (drag) + zoom sobre una imagen dentro de un marco con
   * aspect ratio fijo según el slot. Al aplicar, exporta a <canvas> en
   * las dimensiones exactas del slot (SLOT_SIZES) y devuelve un data URL
   * JPEG optimizado.
   *
   * Uso:
   *   window.openImageEditor({
   *     source: File | dataUrl | https url,
   *     slot:   'product' | 'brand' | 'slide',
   *     onApply: (dataUrl) => { ... }
   *   });
   */
  (function() {
    let modalEl, frameEl, imgEl, zoomInput, applyBtn, resetBtn, fitBtn, slotInfoEl;
    let bsModal;
    let inited = false;
    const state = {
      slot: 'product', targetW: 800, targetH: 800,
      baseScale: 1, zoom: 1, tx: 0, ty: 0,
      frameW: 0, frameH: 0,
      onApply: null, origImg: null
    };

    function bindOnce() {
      if (inited) return;
      modalEl    = document.getElementById('imageEditorModal');
      if (!modalEl) return;
      frameEl    = modalEl.querySelector('#editorFrame');
      imgEl      = modalEl.querySelector('#editorImg');
      zoomInput  = modalEl.querySelector('#editorZoom');
      applyBtn   = modalEl.querySelector('#editorApply');
      resetBtn   = modalEl.querySelector('#editorReset');
      fitBtn     = modalEl.querySelector('#editorFit');
      slotInfoEl = modalEl.querySelector('#editorSlotInfo');

      applyBtn.addEventListener('click', apply);
      resetBtn.addEventListener('click', () => { state.zoom = 1; zoomInput.value = 1; centerImage(); render(); });
      fitBtn.addEventListener('click', () => { centerImage(); render(); });
      zoomInput.addEventListener('input', () => {
        const prev = state.zoom;
        const next = parseFloat(zoomInput.value) || 1;
        if (!state.origImg) { state.zoom = next; return; }
        // Zoom centrado en el centro del marco
        const cx = state.frameW / 2, cy = state.frameH / 2;
        const pbx = (cx - state.tx) / (state.baseScale * prev);
        const pby = (cy - state.ty) / (state.baseScale * prev);
        state.zoom = next;
        state.tx = cx - pbx * (state.baseScale * state.zoom);
        state.ty = cy - pby * (state.baseScale * state.zoom);
        render();
      });

      // Drag pan (pointer events para mouse + touch)
      let dragging = false, start = null;
      frameEl.addEventListener('pointerdown', (e) => {
        if (!state.origImg) return;
        dragging = true;
        start = { x: e.clientX, y: e.clientY, tx: state.tx, ty: state.ty };
        frameEl.setPointerCapture(e.pointerId);
      });
      frameEl.addEventListener('pointermove', (e) => {
        if (!dragging) return;
        state.tx = start.tx + (e.clientX - start.x);
        state.ty = start.ty + (e.clientY - start.y);
        render();
      });
      ['pointerup', 'pointercancel', 'pointerleave'].forEach(ev =>
        frameEl.addEventListener(ev, () => { dragging = false; })
      );

      // Wheel zoom (rueda del mouse encima del marco)
      frameEl.addEventListener('wheel', (e) => {
        if (!state.origImg) return;
        e.preventDefault();
        const delta = -e.deltaY * 0.0015;
        const next = Math.max(1, Math.min(4, state.zoom + delta * state.zoom * 3));
        zoomInput.value = next.toFixed(2);
        zoomInput.dispatchEvent(new Event('input'));
      }, { passive: false });

      modalEl.addEventListener('shown.bs.modal', () => {
        measureFrame();
        initImageLayout();
        render();
      });

      inited = true;
    }

    function measureFrame() {
      const rect = frameEl.getBoundingClientRect();
      state.frameW = rect.width;
      state.frameH = rect.height;
    }

    function initImageLayout() {
      if (!state.origImg) return;
      const iw = state.origImg.naturalWidth;
      const ih = state.origImg.naturalHeight;
      // Base scale = cover the frame
      state.baseScale = Math.max(state.frameW / iw, state.frameH / ih);
      state.zoom = 1;
      if (zoomInput) zoomInput.value = 1;
      centerImage();
    }

    function centerImage() {
      if (!state.origImg) return;
      const s = state.baseScale * state.zoom;
      state.tx = (state.frameW - state.origImg.naturalWidth * s) / 2;
      state.ty = (state.frameH - state.origImg.naturalHeight * s) / 2;
    }

    function clamp() {
      if (!state.origImg) return;
      const s = state.baseScale * state.zoom;
      const minX = state.frameW - state.origImg.naturalWidth * s;
      const minY = state.frameH - state.origImg.naturalHeight * s;
      state.tx = Math.max(minX, Math.min(0, state.tx));
      state.ty = Math.max(minY, Math.min(0, state.ty));
    }

    function render() {
      if (!state.origImg) return;
      clamp();
      const s = state.baseScale * state.zoom;
      imgEl.style.width  = state.origImg.naturalWidth + 'px';
      imgEl.style.height = state.origImg.naturalHeight + 'px';
      imgEl.style.transform = `translate(${state.tx}px, ${state.ty}px) scale(${s})`;
    }

    function apply() {
      if (!state.origImg) return;
      const s = state.baseScale * state.zoom;
      // Región visible del original (en coordenadas naturales)
      const sx = Math.max(0, -state.tx / s);
      const sy = Math.max(0, -state.ty / s);
      const sw = state.frameW / s;
      const sh = state.frameH / s;

      const canvas = document.createElement('canvas');
      canvas.width  = state.targetW;
      canvas.height = state.targetH;
      const ctx = canvas.getContext('2d');
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      try {
        ctx.drawImage(state.origImg, sx, sy, sw, sh, 0, 0, canvas.width, canvas.height);
        const dataUrl = canvas.toDataURL('image/jpeg', 0.88);
        if (typeof state.onApply === 'function') state.onApply(dataUrl);
        if (bsModal) bsModal.hide();
      } catch (err) {
        if (window.showToast) window.showToast('No se pudo exportar (la imagen remota bloquea CORS).', 'info');
      }
    }

    function open({ source, slot, onApply }) {
      bindOnce();
      if (!modalEl) return;
      const sz = getSlotSize(slot);
      state.slot     = slot || 'product';
      state.targetW  = sz.w;
      state.targetH  = sz.h;
      state.onApply  = onApply;
      state.origImg  = null;

      frameEl.style.setProperty('--crop-ar', `${sz.w} / ${sz.h}`);
      modalEl.classList.toggle('editor-slot-brand', state.slot === 'brand');
      slotInfoEl.textContent = sz.label;
      zoomInput.value = 1;
      imgEl.style.transform = 'translate(0,0) scale(1)';
      imgEl.removeAttribute('src');

      // Load the image via a temporary HTMLImageElement to know natural size
      const tmp = new Image();
      tmp.crossOrigin = 'anonymous';
      tmp.onload = () => {
        state.origImg = tmp;
        imgEl.src = tmp.src;
        if (!bsModal) bsModal = bootstrap.Modal.getOrCreateInstance(modalEl);
        bsModal.show();
        // Layout will re-run on 'shown.bs.modal'
      };
      tmp.onerror = () => {
        if (window.showToast) window.showToast('No se pudo cargar la imagen.', 'info');
      };

      if (source instanceof File) {
        const fr = new FileReader();
        fr.onload  = () => { tmp.src = fr.result; };
        fr.onerror = () => { if (window.showToast) window.showToast('No se pudo leer el archivo.', 'info'); };
        fr.readAsDataURL(source);
      } else if (typeof source === 'string' && source) {
        tmp.src = source;
      } else {
        if (window.showToast) window.showToast('Nada que editar.', 'info');
      }
    }

    window.openImageEditor = open;
  })();

  /* ---------- SLIDES (expuesto al home) ---------- */
  window.getAdminSlides = function() { return load(STORE_SLIDES); };

  /* ---------- TABS ---------- */
  function initTabs() {
    const btns = document.querySelectorAll('.admin-tab');
    const panels = document.querySelectorAll('.admin-panel');
    btns.forEach(b => {
      b.addEventListener('click', () => {
        const key = b.dataset.tab;
        btns.forEach(x => x.classList.toggle('active', x === b));
        panels.forEach(p => p.classList.toggle('active', p.dataset.panel === key));
      });
    });
  }

  /* ---------- DASHBOARD ---------- */
  function renderDashboard() {
    const ps = window.products || [];
    const bs = window.brands || [];

    /* Greeting según la hora */
    const greetEl = document.getElementById('adminGreeting');
    if (greetEl) {
      const h = new Date().getHours();
      const slot = h < 6 ? 'Buenas noches' : h < 12 ? 'Buenos días' : h < 19 ? 'Buenas tardes' : 'Buenas noches';
      let name = '';
      try {
        const session = JSON.parse(localStorage.getItem('lunabi_session') || 'null');
        if (session && session.nombre) name = ', ' + String(session.nombre).split(' ')[0];
      } catch (e) { /* noop */ }
      greetEl.textContent = `${slot}${name} ✨`;
    }
    const dateEl = document.getElementById('chipDate');
    if (dateEl) {
      dateEl.textContent = new Date().toLocaleDateString('es-PE', { weekday: 'long', day: 'numeric', month: 'long' });
    }

    /* KPIs */
    const totalValue  = ps.reduce((s, p) => s + (Number(p.precio) || 0), 0);
    const avgPrice    = ps.length ? (totalValue / ps.length) : 0;
    const bestCount   = ps.filter(p => p.masVendido).length;
    const saleItems   = ps.filter(p => p.enOferta || (p.precioAntes && p.precioAntes > p.precio));
    const discountTotal = saleItems.reduce((s, p) =>
      s + Math.max(0, (Number(p.precioAntes) || 0) - (Number(p.precio) || 0)), 0);
    const discountAvgPct = saleItems.length
      ? (saleItems.reduce((s, p) => {
          const a = Number(p.precioAntes) || 0;
          if (!a) return s;
          return s + ((a - Number(p.precio)) / a * 100);
        }, 0) / saleItems.length)
      : 0;
    const slides = load(STORE_SLIDES);
    let users = 0;
    try {
      const arr = JSON.parse(localStorage.getItem('lunabi_users') || '[]');
      users = Array.isArray(arr) ? arr.length : 0;
    } catch (e) { users = 0; }

    const adminCount = load(STORE_PRODUCTS).length;
    const adminBrandCount = load(STORE_BRANDS).length;

    /* Animated counter helpers */
    const animById = (id, val, opts) => animateCounter(document.getElementById(id), val, opts);
    animById('statProducts', ps.length);
    animById('statBrands', bs.length);
    animById('statBest', bestCount);
    animById('statSale', saleItems.length);
    animById('statTotalValue', totalValue, { currency: true });
    animById('statDiscountValue', discountTotal, { currency: true });
    animById('statSlides', slides.length || 3);
    animById('statUsers', users);

    /* Trends / pequeños labels bajo cada KPI */
    const set = (id, txt) => { const el = document.getElementById(id); if (el) el.textContent = txt; };
    set('statProductsTrend', adminCount ? `+${adminCount} desde el admin` : 'Todos del catálogo base');
    set('statBrandsTrend', adminBrandCount ? `+${adminBrandCount} desde el admin` : 'Todas del catálogo base');
    set('statBestPct', ps.length ? `${Math.round((bestCount / ps.length) * 100)}% del catálogo` : '—');
    set('statSalePct', ps.length ? `${Math.round((saleItems.length / ps.length) * 100)}% del catálogo` : '—');
    set('statAvgPrice', `S/ ${avgPrice.toFixed(2)} promedio`);
    set('statDiscountAvg', saleItems.length ? `${discountAvgPct.toFixed(0)}% de descuento promedio` : 'Sin ofertas activas');
    set('statSlidesHint', slides.length ? 'Personalizadas' : 'Por defecto (3)');

    /* Salud del catálogo: promedio de completitud por producto */
    let healthScore = 0;
    if (ps.length) {
      const perProduct = ps.map(p => {
        let f = 0, t = 5;
        if (Array.isArray(p.imagenes) && p.imagenes.length >= 2) f++;
        if ((p.descripcion || '').length >= 40) f++;
        if (Array.isArray(p.modoDeUso) && p.modoDeUso.length >= 2) f++;
        if (Array.isArray(p.beneficios) && p.beneficios.length >= 2) f++;
        if (Array.isArray(p.tipoPiel) && p.tipoPiel.length >= 1) f++;
        return f / t;
      });
      healthScore = Math.round(perProduct.reduce((a, b) => a + b, 0) / perProduct.length * 100);
    }
    const ringLen = 2 * Math.PI * 58; // r=58
    const ring = document.getElementById('healthRingCircle');
    if (ring) {
      ring.setAttribute('stroke-dasharray', ringLen.toFixed(1));
      ring.setAttribute('stroke-dashoffset', (ringLen * (1 - healthScore / 100)).toFixed(1));
    }
    const ringVal = document.getElementById('healthRingValue');
    if (ringVal) ringVal.textContent = healthScore + '%';
    set('chipHealth', healthScore + '%');

    /* Chart: distribución por categoría */
    renderBarChart('chartByCategory',
      ps.reduce((m, p) => { const k = p.categoria || 'otro'; m[k] = (m[k] || 0) + 1; return m; }, {}),
      { labelMap: window.SUBCAT_LABELS || {} });

    /* Chart: top marcas */
    const brandMap = ps.reduce((m, p) => { m[p.marca] = (m[p.marca] || 0) + 1; return m; }, {});
    const brandLabel = (slug) => { const b = bs.find(x => x.slug === slug); return b ? b.nombre : slug; };
    renderBarChart('chartByBrand', brandMap, { labelFn: brandLabel, limit: 8 });

    /* Chart: distribución de precios */
    const buckets = { 'S/ 0-50': 0, 'S/ 50-100': 0, 'S/ 100-200': 0, 'S/ 200+': 0 };
    ps.forEach(p => {
      const v = Number(p.precio) || 0;
      if (v < 50) buckets['S/ 0-50']++;
      else if (v < 100) buckets['S/ 50-100']++;
      else if (v < 200) buckets['S/ 100-200']++;
      else buckets['S/ 200+']++;
    });
    renderBarChart('chartPriceBuckets', buckets, { keepOrder: true });

    /* Chart: cobertura por tipo de piel */
    const skinTypes = ['normal', 'mixta', 'grasa', 'seca', 'sensible'];
    const skinMap = {};
    skinTypes.forEach(t => { skinMap[t] = 0; });
    ps.forEach(p => (p.tipoPiel || []).forEach(t => { if (skinMap[t] != null) skinMap[t]++; }));
    renderBarChart('chartSkinTypes', skinMap, {
      labelFn: (t) => t.charAt(0).toUpperCase() + t.slice(1),
      keepOrder: true
    });

    /* Insights — frases útiles autogeneradas */
    renderInsights(ps, bs, { healthScore, avgPrice, discountTotal, discountAvgPct, adminCount, slides });

    /* Necesita atención — productos incompletos */
    renderAttention(ps, bs);

    /* Últimos productos */
    const latestEl = document.getElementById('latestProducts');
    if (latestEl) {
      const latest = [...ps].sort((a, b) => b.id - a.id).slice(0, 5);
      latestEl.innerHTML = latest.length ? latest.map(p => {
        const b = bs.find(br => br.slug === p.marca);
        return `
          <div class="admin-latest-row">
            <img src="${(p.imagenes && p.imagenes[0]) || ''}" alt="" onerror="this.style.visibility='hidden'">
            <div class="admin-latest-info">
              <div class="admin-latest-name">${p.nombre}</div>
              <div class="admin-latest-brand">${b ? b.nombre : p.marca}</div>
            </div>
            <div class="admin-latest-price">S/ ${Number(p.precio).toFixed(2)}</div>
          </div>`;
      }).join('') : '<p class="admin-empty">Aún no hay productos.</p>';
    }
  }

  function renderBarChart(containerId, dataMap, { labelMap = {}, labelFn, limit, keepOrder = false } = {}) {
    const el = document.getElementById(containerId);
    if (!el) return;
    let entries = Object.entries(dataMap);
    if (!keepOrder) entries = entries.sort((a, b) => b[1] - a[1]);
    if (limit) entries = entries.slice(0, limit);
    const max = Math.max(1, ...entries.map(e => e[1]));
    el.innerHTML = entries.length ? entries.map(([k, v]) => {
      const label = labelFn ? labelFn(k) : (labelMap[k] || k);
      return `
        <div class="admin-bar-row">
          <span class="admin-bar-label">${label}</span>
          <div class="admin-bar-track"><div class="admin-bar-fill" style="width:${(v/max)*100}%"></div></div>
          <span class="admin-bar-value">${v}</span>
        </div>`;
    }).join('') : '<p class="admin-empty">Sin datos.</p>';
  }

  function renderInsights(ps, bs, m) {
    const el = document.getElementById('insightsList');
    if (!el) return;
    const lines = [];
    if (!ps.length) {
      el.innerHTML = '<p class="admin-empty">Cuando haya productos, aquí verás recomendaciones automáticas.</p>';
      return;
    }

    // Ventas acumuladas — el badge "Más vendido" se recalcula a partir de aquí
    try {
      const sales = JSON.parse(localStorage.getItem('lunabi_ventas') || '{}') || {};
      const totalUnits = Object.values(sales).reduce((s, n) => s + (Number(n) || 0), 0);
      if (totalUnits > 0) {
        let topId = null, topN = 0;
        Object.entries(sales).forEach(([id, n]) => {
          const c = Number(n) || 0;
          if (c > topN) { topN = c; topId = Number(id); }
        });
        const topProd = ps.find(p => p.id === topId);
        lines.push({
          icon: 'bi-cart-check',
          txt: topProd
            ? `Se han registrado <strong>${totalUnits}</strong> unidades en pedidos. El top-seller es <strong>${topProd.nombre}</strong> con <strong>${topN}</strong>.`
            : `Se han registrado <strong>${totalUnits}</strong> unidades en pedidos por WhatsApp.`
        });
      } else {
        lines.push({
          icon: 'bi-cart',
          txt: `Aún no hay ventas registradas. Los badges de <strong>Más vendido</strong> se asignarán automáticamente cuando empiecen a entrar pedidos por WhatsApp.`
        });
      }
    } catch (e) { /* noop */ }

    // Most expensive
    const sorted = [...ps].sort((a, b) => (b.precio || 0) - (a.precio || 0));
    const top = sorted[0];
    if (top) lines.push({ icon: 'bi-trophy', txt: `Tu producto más caro es <strong>${top.nombre}</strong> a <strong>S/ ${Number(top.precio).toFixed(2)}</strong>.` });

    // Brand with most products
    const byBrand = ps.reduce((m, p) => { m[p.marca] = (m[p.marca] || 0) + 1; return m; }, {});
    const topBrand = Object.entries(byBrand).sort((a, b) => b[1] - a[1])[0];
    if (topBrand) {
      const b = bs.find(x => x.slug === topBrand[0]);
      lines.push({ icon: 'bi-award', txt: `<strong>${b ? b.nombre : topBrand[0]}</strong> lidera con <strong>${topBrand[1]}</strong> productos en catálogo.` });
    }

    // Health verdict
    const s = m.healthScore;
    if (s >= 85) lines.push({ icon: 'bi-check2-circle', txt: `Fichas muy completas: salud del catálogo en <strong>${s}%</strong>. ¡Buen trabajo!` });
    else if (s >= 60) lines.push({ icon: 'bi-hand-thumbs-up', txt: `Salud del catálogo en <strong>${s}%</strong>. Revisa los productos en "Necesita atención".` });
    else lines.push({ icon: 'bi-emoji-frown', txt: `Salud del catálogo baja (<strong>${s}%</strong>). Completa imágenes, descripciones y beneficios para mejorar conversión.` });

    // Discount verdict
    if (m.discountTotal > 0) {
      lines.push({ icon: 'bi-tag', txt: `Tus ofertas suman <strong>S/ ${m.discountTotal.toFixed(2)}</strong> de ahorro, con un descuento promedio de <strong>${m.discountAvgPct.toFixed(0)}%</strong>.` });
    } else {
      lines.push({ icon: 'bi-lightbulb', txt: `Aún no hay ofertas activas. Considera activar <em>enOferta</em> y definir <em>precioAntes</em> para generar urgencia.` });
    }

    // Slides
    if (!m.slides.length) {
      lines.push({ icon: 'bi-images', txt: `Estás usando el carrusel por defecto. Crea diapositivas personalizadas en la pestaña <strong>Carrusel</strong>.` });
    } else {
      lines.push({ icon: 'bi-images', txt: `Tienes <strong>${m.slides.length}</strong> diapositivas personalizadas activas en la home.` });
    }

    // Admin additions
    if (m.adminCount) {
      lines.push({ icon: 'bi-plus-circle', txt: `Has agregado <strong>${m.adminCount}</strong> producto(s) desde este panel.` });
    }

    el.innerHTML = lines.map(l => `
      <div class="admin-insight-item"><i class="bi ${l.icon}"></i><span>${l.txt}</span></div>
    `).join('');
  }

  function renderAttention(ps, bs) {
    const el = document.getElementById('attentionList');
    if (!el) return;
    const issues = [];
    ps.forEach(p => {
      const miss = [];
      if (!Array.isArray(p.imagenes) || p.imagenes.length < 2) miss.push('imágenes');
      if (!(p.descripcion || '').trim()) miss.push('descripción');
      if (!Array.isArray(p.modoDeUso) || !p.modoDeUso.length) miss.push('modo de uso');
      if (!Array.isArray(p.beneficios) || !p.beneficios.length) miss.push('beneficios');
      if (!Array.isArray(p.tipoPiel) || !p.tipoPiel.length) miss.push('tipo de piel');
      if (miss.length) issues.push({ p, miss });
    });
    const unusedBrands = bs.filter(b => !ps.some(p => p.marca === b.slug));

    if (!issues.length && !unusedBrands.length) {
      el.innerHTML = '<div class="admin-insight-item"><i class="bi bi-check2-circle"></i><span>¡Todo al día! Cada producto tiene su ficha completa y cada marca tiene productos asociados.</span></div>';
      return;
    }

    const lines = [];
    issues.slice(0, 5).forEach(({ p, miss }) => {
      lines.push(`<div class="admin-attention-item"><i class="bi bi-exclamation-triangle"></i><span><strong>${p.nombre}</strong> — falta: ${miss.join(', ')}.</span></div>`);
    });
    if (issues.length > 5) {
      lines.push(`<div class="admin-attention-item"><i class="bi bi-three-dots"></i><span>Y <strong>${issues.length - 5}</strong> producto(s) más con fichas incompletas.</span></div>`);
    }
    unusedBrands.slice(0, 3).forEach(b => {
      lines.push(`<div class="admin-attention-item"><i class="bi bi-tag"></i><span>La marca <strong>${b.nombre}</strong> no tiene productos aún.</span></div>`);
    });
    el.innerHTML = lines.join('');
  }

  /* ---------- PRODUCTS: selects dinámicos ---------- */
  function buildCategoryOptions() {
    const groups = [
      { label: 'Skincare',   cats: window.SKINCARE_STRUCTURE },
      { label: 'Maquillaje', cats: window.MAQUILLAJE_STRUCTURE },
      { label: 'Corporal',   cats: window.CORPORAL_STRUCTURE }
    ];
    let html = '<option value="">Elige categoría</option>';
    groups.forEach(g => {
      if (!Array.isArray(g.cats)) return;
      html += `<optgroup label="${g.label}">`;
      g.cats.forEach(c => { html += `<option value="${c.key}">${c.label}</option>`; });
      html += '</optgroup>';
    });
    html += '<optgroup label="Otros"><option value="accesorios">Accesorios</option></optgroup>';
    return html;
  }
  function buildBrandOptions() {
    const bs = window.brands || [];
    return '<option value="">Elige una marca</option>' +
      bs.map(b => `<option value="${b.slug}">${b.nombre}</option>`).join('');
  }
  function findCatStruct(catKey) {
    const all = [window.SKINCARE_STRUCTURE, window.MAQUILLAJE_STRUCTURE, window.CORPORAL_STRUCTURE];
    for (const group of all) {
      if (!Array.isArray(group)) continue;
      const f = group.find(c => c && c.key === catKey);
      if (f) return f;
    }
    return null;
  }
  function updateSubcatOptions(catKey) {
    const sel = document.querySelector('#productForm [name="subcategoria"]');
    if (!sel) return;
    const found = findCatStruct(catKey);
    if (!found || !found.subs || !found.subs.length) {
      sel.innerHTML = '<option value="">— Ninguna —</option>';
      sel.disabled = true;
    } else {
      sel.disabled = false;
      sel.innerHTML = '<option value="">— Ninguna —</option>' +
        found.subs.map(s => `<option value="${s.key}">${s.label}</option>`).join('');
    }
  }

  /* ---------- PRODUCTS: repeaters (imágenes, modo de uso, beneficios) ----------
   * Dos modos:
   *   - text  → un input de texto normal (pasos de modo de uso, beneficios)
   *   - image → preview + input de URL + botón de upload de archivo */
  function initRepeater(id) {
    const wrap = document.getElementById(id);
    const addBtn = document.querySelector(`.admin-btn-add[data-target="${id}"]`);
    const placeholder = addBtn ? (addBtn.dataset.placeholder || '') : '';
    const kind = (addBtn && addBtn.dataset.kind) || (wrap && wrap.dataset.kind) || 'text';

    function addRow(val = '') {
      const safe = (val || '').replace(/"/g, '&quot;');
      let html;
      if (kind === 'image') {
        html = `
          <div class="admin-repeater-row admin-image-row">
            <div class="admin-image-preview"></div>
            <input type="text" placeholder="https:// o sube un archivo" value="${safe}">
            <label class="admin-btn-upload" title="Subir imagen">
              <i class="bi bi-upload"></i>
              <input type="file" accept="image/*" hidden>
            </label>
            <button type="button" class="admin-btn-remove" aria-label="Eliminar">&times;</button>
          </div>`;
      } else {
        html = `
          <div class="admin-repeater-row">
            <input type="text" placeholder="${placeholder}" value="${safe}">
            <button type="button" class="admin-btn-remove" aria-label="Eliminar">&times;</button>
          </div>`;
      }
      wrap.insertAdjacentHTML('beforeend', html);
      if (kind === 'image') {
        // El contenedor con el input/preview es el row ya que usamos display:contents
        const row = wrap.lastElementChild;
        wireImageInput(row);
      }
    }
    if (addBtn) addBtn.addEventListener('click', () => addRow());
    wrap.addEventListener('click', (e) => {
      const rm = e.target.closest('.admin-btn-remove');
      if (rm) rm.closest('.admin-repeater-row').remove();
    });
    return {
      getValues: () => Array.from(wrap.querySelectorAll('input[type="text"], input[type="url"]'))
        .map(i => i.value.trim())
        .filter(Boolean),
      reset: (initial) => {
        wrap.innerHTML = '';
        const arr = Array.isArray(initial) && initial.length ? initial : [''];
        arr.forEach(v => addRow(v));
      }
    };
  }

  /* ---------- PRODUCTS: render table + submit ---------- */
  function renderProductsTable() {
    const tbody = document.querySelector('#productsTable tbody');
    const countEl = document.getElementById('productsCount');
    if (!tbody) return;

    const adminProducts = load(STORE_PRODUCTS);
    const all = window.products || [];
    if (countEl) countEl.textContent = all.length;

    tbody.innerHTML = all.length ? all.map(p => {
      const b = (window.brands || []).find(br => br.slug === p.marca);
      const isAdmin = adminProducts.some(ap => ap.id === p.id);
      return `
        <tr>
          <td>#${p.id}</td>
          <td>${p.nombre}${isAdmin ? ' <span class="admin-tag-custom">admin</span>' : ''}</td>
          <td>${b ? b.nombre : p.marca}</td>
          <td>${(window.SUBCAT_LABELS || {})[p.categoria] || p.categoria}</td>
          <td>S/ ${Number(p.precio).toFixed(2)}</td>
          <td>${isAdmin
            ? `<button class="admin-btn-icon" data-delete-product="${p.id}" aria-label="Eliminar"><i class="bi bi-trash3"></i></button>`
            : '<span class="admin-hint">base</span>'}
          </td>
        </tr>`;
    }).join('') : '<tr><td colspan="6" class="admin-empty">Aún no hay productos.</td></tr>';
  }

  function initProductsForm() {
    const form = document.getElementById('productForm');
    if (!form) return;

    form.querySelector('[name="marca"]').innerHTML = buildBrandOptions();
    form.querySelector('[name="categoria"]').innerHTML = buildCategoryOptions();
    updateSubcatOptions('');

    form.querySelector('[name="categoria"]').addEventListener('change', (e) => {
      updateSubcatOptions(e.target.value);
    });

    // Slug 100% automático: se recalcula siempre a partir del nombre. El
    // input es readonly (el usuario lo ve como preview) y en submit se
    // garantiza unicidad contra el catálogo completo.
    const nombreInput = form.querySelector('[name="nombre"]');
    const slugInput = form.querySelector('[name="slug"]');
    nombreInput.addEventListener('input', () => {
      slugInput.value = slugify(nombreInput.value);
    });

    const images = initRepeater('imagesRepeater');
    images.reset(['']);

    // Modo de uso y beneficios son textareas: una línea = un ítem.
    const splitLines = (txt) => (txt || '')
      .split(/\r?\n/)
      .map(s => s.trim())
      .filter(Boolean);

    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const fd = new FormData(form);
      const nombre = (fd.get('nombre') || '').trim();
      if (!nombre) return;

      const precio = parseFloat(fd.get('precio')) || 0;
      const precioAntesRaw = parseFloat(fd.get('precioAntes'));
      const precioAntes = (precioAntesRaw && precioAntesRaw > precio) ? precioAntesRaw : null;

      const tipoPiel = Array.from(form.querySelectorAll('[name="tipoPiel"]:checked')).map(cb => cb.value);
      const marca = fd.get('marca');
      const categoria = fd.get('categoria');
      if (!marca || !categoria) {
        if (window.showToast) window.showToast('Falta marca o categoría', 'info');
        return;
      }

      const imgs = images.getValues();
      if (!imgs.length) {
        if (window.showToast) window.showToast('Añade al menos una imagen', 'info');
        return;
      }

      // Slug único derivado del nombre. Si ya existe otro producto con el
      // mismo slug, append `-2`, `-3`, … hasta encontrar uno libre.
      const all = window.products || [];
      const base = slugify(nombre) || `producto-${all.length + 1}`;
      let slug = base;
      let n = 2;
      while (all.some(p => p.slug === slug)) { slug = `${base}-${n++}`; }
      slugInput.value = slug;
      const adminProducts = load(STORE_PRODUCTS);
      const newProduct = {
        id: all.reduce((m, p) => Math.max(m, p.id), 0) + 1,
        slug,
        nombre,
        marca,
        categoria,
        subcategoria: fd.get('subcategoria') || null,
        tipoPiel,
        precio,
        precioAntes,
        imagenes: imgs,
        descripcion: (fd.get('descripcion') || '').trim(),
        modoDeUso: splitLines(fd.get('modoDeUso')),
        beneficios: splitLines(fd.get('beneficios')),
        masVendido: form.querySelector('[name="masVendido"]').checked,
        enOferta:   form.querySelector('[name="enOferta"]').checked
      };
      adminProducts.push(newProduct);
      save(STORE_PRODUCTS, adminProducts);
      (window.products || []).push(newProduct);

      form.reset();
      images.reset(['']);
      updateSubcatOptions('');
      slugTouched = false;

      renderProductsTable();
      renderDashboard();
      if (window.showToast) window.showToast('Producto agregado', 'success');
    });

    // Delete delegation
    const table = document.getElementById('productsTable');
    if (table) table.addEventListener('click', (e) => {
      const btn = e.target.closest('[data-delete-product]');
      if (!btn) return;
      const id = Number(btn.dataset.deleteProduct);
      if (!confirm('¿Eliminar este producto?')) return;
      const list = load(STORE_PRODUCTS).filter(p => p.id !== id);
      save(STORE_PRODUCTS, list);
      const idx = window.products.findIndex(p => p.id === id);
      if (idx > -1) window.products.splice(idx, 1);
      renderProductsTable();
      renderDashboard();
      if (window.showToast) window.showToast('Producto eliminado', 'info');
    });
  }

  /* ---------- SLIDES ---------- */
  function renderSlidesList() {
    const cont = document.getElementById('slidesList');
    if (!cont) return;
    const slides = load(STORE_SLIDES);
    cont.innerHTML = slides.length ? slides.map((s, i) => `
      <div class="admin-slide-card">
        <div class="admin-slide-preview" style="background-image:url('${(s.imagen || '').replace(/'/g, "%27")}')">
          ${s.badge ? `<span class="admin-slide-badge">${s.badge}</span>` : ''}
          <div class="admin-slide-content">
            <h4>${s.titulo || ''}</h4>
            <p>${s.descripcion || ''}</p>
            <span class="admin-slide-cta">${s.botonTexto || 'Ver más'} →</span>
          </div>
        </div>
        <div class="admin-slide-meta">
          <span class="admin-hint">→ ${s.botonLink || '#'}</span>
          <button class="admin-btn-icon" data-delete-slide="${i}" aria-label="Eliminar"><i class="bi bi-trash3"></i></button>
        </div>
      </div>`).join('') : '<p class="admin-empty">No hay diapositivas personalizadas. La home usará el carrusel por defecto.</p>';
  }

  function initSlidesForm() {
    const form = document.getElementById('slideForm');
    if (!form) return;
    form.querySelectorAll('.admin-image-input').forEach(wireImageInput);
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const fd = new FormData(form);
      const slide = {
        imagen:      (fd.get('imagen') || '').trim(),
        titulo:      (fd.get('titulo') || '').trim(),
        descripcion: (fd.get('descripcion') || '').trim(),
        botonTexto:  (fd.get('botonTexto') || '').trim(),
        botonLink:   (fd.get('botonLink') || '').trim(),
        badge:       (fd.get('badge') || '').trim()
      };
      if (!slide.imagen || !slide.titulo || !slide.descripcion || !slide.botonTexto || !slide.botonLink) {
        if (window.showToast) window.showToast('Completa los campos obligatorios', 'info');
        return;
      }
      const slides = load(STORE_SLIDES);
      slides.push(slide);
      save(STORE_SLIDES, slides);
      form.reset();
      renderSlidesList();
      renderDashboard();
      if (window.showToast) window.showToast('Diapositiva añadida', 'success');
    });

    const listEl = document.getElementById('slidesList');
    if (listEl) listEl.addEventListener('click', (e) => {
      const btn = e.target.closest('[data-delete-slide]');
      if (!btn) return;
      const i = Number(btn.dataset.deleteSlide);
      const slides = load(STORE_SLIDES);
      slides.splice(i, 1);
      save(STORE_SLIDES, slides);
      renderSlidesList();
      renderDashboard();
      if (window.showToast) window.showToast('Diapositiva eliminada', 'info');
    });

    const resetBtn = document.getElementById('resetSlidesBtn');
    if (resetBtn) resetBtn.addEventListener('click', () => {
      if (!confirm('Esto borra tus diapositivas personalizadas y vuelve al carrusel por defecto. ¿Continuar?')) return;
      localStorage.removeItem(STORE_SLIDES);
      renderSlidesList();
      renderDashboard();
      if (window.showToast) window.showToast('Carrusel restablecido', 'info');
    });
  }

  /* ---------- BRANDS ---------- */
  function renderBrandsTable() {
    const tbody = document.querySelector('#brandsTable tbody');
    const countEl = document.getElementById('brandsCount');
    if (!tbody) return;
    const adminBrands = load(STORE_BRANDS);
    const all = window.brands || [];
    if (countEl) countEl.textContent = all.length;
    tbody.innerHTML = all.length ? all.map(b => {
      const isAdmin = adminBrands.some(ab => ab.id === b.id);
      return `
        <tr>
          <td><img src="${b.logo || ''}" alt="" onerror="this.style.visibility='hidden'"></td>
          <td>${b.nombre}${isAdmin ? ' <span class="admin-tag-custom">admin</span>' : ''}</td>
          <td><code>${b.slug}</code></td>
          <td>${isAdmin
            ? `<button class="admin-btn-icon" data-delete-brand="${b.id}" aria-label="Eliminar"><i class="bi bi-trash3"></i></button>`
            : '<span class="admin-hint">base</span>'}
          </td>
        </tr>`;
    }).join('') : '<tr><td colspan="4" class="admin-empty">Sin marcas.</td></tr>';
  }

  function initBrandsForm() {
    const form = document.getElementById('brandForm');
    if (!form) return;
    form.querySelectorAll('.admin-image-input').forEach(wireImageInput);
    const nombreInput = form.querySelector('[name="nombre"]');
    const slugInput = form.querySelector('[name="slug"]');
    let touched = false;
    slugInput.addEventListener('input', () => { touched = true; });
    nombreInput.addEventListener('input', () => {
      if (!touched) slugInput.value = slugify(nombreInput.value);
    });

    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const fd = new FormData(form);
      const nombre = (fd.get('nombre') || '').trim();
      const slug = (fd.get('slug') || slugify(nombre)).trim();
      if (!nombre || !slug) return;
      if ((window.brands || []).some(b => b.slug === slug)) {
        if (window.showToast) window.showToast('Ya existe una marca con ese slug', 'info');
        return;
      }
      const adminBrands = load(STORE_BRANDS);
      const newBrand = {
        id: (window.brands || []).reduce((m, b) => Math.max(m, b.id), 0) + 1,
        nombre,
        slug,
        logo: (fd.get('logo') || '').trim(),
        descripcion: (fd.get('descripcion') || '').trim()
      };
      adminBrands.push(newBrand);
      save(STORE_BRANDS, adminBrands);
      (window.brands || []).push(newBrand);

      form.reset();
      touched = false;
      renderBrandsTable();
      renderDashboard();

      // Mantener el select de marcas del form de productos al día
      const psel = document.querySelector('#productForm [name="marca"]');
      if (psel) psel.innerHTML = buildBrandOptions();

      if (window.showToast) window.showToast('Marca agregada', 'success');
    });

    const table = document.getElementById('brandsTable');
    if (table) table.addEventListener('click', (e) => {
      const btn = e.target.closest('[data-delete-brand]');
      if (!btn) return;
      const id = Number(btn.dataset.deleteBrand);
      if (!confirm('¿Eliminar esta marca? Los productos asociados no se eliminan automáticamente.')) return;
      const list = load(STORE_BRANDS).filter(b => b.id !== id);
      save(STORE_BRANDS, list);
      const idx = window.brands.findIndex(b => b.id === id);
      if (idx > -1) window.brands.splice(idx, 1);
      renderBrandsTable();
      renderDashboard();
      const psel = document.querySelector('#productForm [name="marca"]');
      if (psel) psel.innerHTML = buildBrandOptions();
      if (window.showToast) window.showToast('Marca eliminada', 'info');
    });
  }

  /* ---------- INIT ---------- */
  function initAdmin() {
    if (!document.body || document.body.dataset.page !== 'admin') return;
    initTabs();
    renderDashboard();
    initProductsForm();
    renderProductsTable();
    initSlidesForm();
    renderSlidesList();
    initBrandsForm();
    renderBrandsTable();
  }

  window.initAdmin = initAdmin;
})();
