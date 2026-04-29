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

  function isRemote() { return !!(window.LuApi && window.LuApi.isRemote && window.LuApi.isRemote()); }

  /* Cuando hay backend, replicamos los cambios a Supabase después de los
   * escribimos localmente — así la tienda y el resto de usuarios los ven. */
  /* Cuando hay backend, replicamos los cambios a Supabase. Al crear (upsert
   * por slug), el backend devuelve la fila con su id real; lo propagamos al
   * objeto local para que editar/eliminar después funcione sin recargar. */
  async function syncProduct(product, deleted) {
    if (!isRemote()) return;
    try {
      if (deleted) {
        await window.LuApi.adminDeleteProduct(product.id);
      } else {
        const saved = await window.LuApi.adminUpsertProduct(product);
        if (saved && typeof saved.id === 'number' && saved.id !== product.id) {
          syncLocalId(window.products, product.id, saved.id);
          syncLocalId(load(STORE_PRODUCTS), product.id, saved.id, STORE_PRODUCTS);
          renderProductsTable();
        }
      }
    } catch (e) { console.warn('[admin] sync producto', e); }
  }
  async function syncBrand(brand, deleted) {
    if (!isRemote()) return;
    try {
      if (deleted) {
        await window.LuApi.adminDeleteBrand(brand.id);
      } else {
        const saved = await window.LuApi.adminUpsertBrand(brand);
        if (saved && typeof saved.id === 'number' && saved.id !== brand.id) {
          syncLocalId(window.brands, brand.id, saved.id);
          syncLocalId(load(STORE_BRANDS), brand.id, saved.id, STORE_BRANDS);
          renderBrandsTable();
        }
      }
    } catch (e) { console.warn('[admin] sync marca', e); }
  }
  /* Actualiza el id local al que asignó Supabase, conservando el resto de
   * los campos. Si el segundo arg es una key de localStorage, persiste. */
  function syncLocalId(arr, oldId, newId, storeKey) {
    if (!Array.isArray(arr)) return;
    const idx = arr.findIndex(x => x && x.id === oldId);
    if (idx > -1) arr[idx].id = newId;
    if (storeKey) save(storeKey, arr);
  }
  /* Al editar un slide que ya vive en Supabase, hay que pasar su id real para
   * que adminUpsertSlide haga UPDATE en vez de INSERT (si no, se duplica).
   * Cuando es un INSERT nuevo, la respuesta trae el id → lo guardamos en el
   * slide local para que la siguiente edición sí tenga id. */
  async function syncSlide(slide, index, deleted) {
    if (!isRemote()) return;
    try {
      if (deleted) {
        // slide trae el id si era remoto; si no, nada que borrar en el backend.
        if (slide && slide.id) {
          await window.LuApi.adminDeleteSlide({ id: slide.id, index });
        }
        return;
      }
      const saved = await window.LuApi.adminUpsertSlide(slide);
      if (saved && saved.id && !slide.id) {
        const slides = load(STORE_SLIDES);
        if (slides[index]) {
          slides[index].id = saved.id;
          save(STORE_SLIDES, slides);
          renderSlidesList();
        }
      }
    } catch (e) { console.warn('[admin] sync diapositiva', e); }
  }
  function syncOrderStage(orderId, stageKey) {
    if (!isRemote()) return;
    window.LuApi.updateOrderStage(orderId, stageKey).catch(e =>
      console.warn('[admin] sync stage', e));
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
  function animateCounter(el, target, { currency = false } = {}) {
    if (!el) return;
    target = Number(target) || 0;
    const fmt = (n) => currency
      ? 'S/ ' + n.toFixed(2)
      : Math.round(n).toLocaleString('es-PE');
    el.textContent = fmt(target);
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
  async function renderProductsTable() {
    paintProductsFromMemory();
    if (window.LuApi && window.LuApi.isRemote && window.LuApi.isRemote()) {
      try {
        const fresh = await window.LuApi.listProducts();
        console.log('[admin] listProducts →', fresh && fresh.length);
        if (Array.isArray(fresh)) {
          (window.products || []).splice(0, (window.products || []).length, ...fresh);
        }
        paintProductsFromMemory();
      } catch (e) { console.warn('[admin] listProducts failed', e); }
    }
  }
  function paintProductsFromMemory() {
    const tbody = document.querySelector('#productsTable tbody');
    const countEl = document.getElementById('productsCount');
    if (!tbody) return;
    const adminProducts = load(STORE_PRODUCTS);
    const baseMax = window.__baseProductMaxId || 0;
    const all = window.products || [];
    if (countEl) countEl.textContent = all.length;
    tbody.innerHTML = all.length ? all.map(p => {
      const b = (window.brands || []).find(br => br.slug === p.marca);
      const inAdmin = adminProducts.some(ap => ap.id === p.id);
      const isNew = p.id > baseMax;
      const tag = inAdmin
        ? (isNew
            ? '<span class="admin-tag-custom">nuevo</span>'
            : '<span class="admin-tag-custom admin-tag-edit">editado</span>')
        : '';
      return `
        <tr>
          <td>#${p.id}</td>
          <td>${p.nombre}${tag}</td>
          <td>${b ? b.nombre : p.marca}</td>
          <td>${(window.SUBCAT_LABELS || {})[p.categoria] || p.categoria}</td>
          <td>S/ ${Number(p.precio).toFixed(2)}</td>
          <td class="admin-td-actions">
            <button class="admin-btn-icon admin-btn-edit" data-edit-product="${p.id}" aria-label="Editar"><i class="bi bi-pencil-square"></i></button>
            <button class="admin-btn-icon" data-delete-product="${p.id}" aria-label="Eliminar"><i class="bi bi-trash3"></i></button>
          </td>
        </tr>`;
    }).join('') : '<tr><td colspan="6" class="admin-empty">Aún no hay productos.</td></tr>';
  }

  let editingProductId = null;

  function initProductsForm() {
    const form = document.getElementById('productForm');
    if (!form) return;

    form.querySelector('[name="marca"]').innerHTML = buildBrandOptions();
    form.querySelector('[name="categoria"]').innerHTML = buildCategoryOptions();
    updateSubcatOptions('');

    form.querySelector('[name="categoria"]').addEventListener('change', (e) => {
      updateSubcatOptions(e.target.value);
    });

    const nombreInput = form.querySelector('[name="nombre"]');
    const slugInput = form.querySelector('[name="slug"]');
    nombreInput.addEventListener('input', () => {
      slugInput.value = slugify(nombreInput.value);
    });

    const images = initRepeater('imagesRepeater');
    images.reset(['']);

    const splitLines = (txt) => (txt || '')
      .split(/\r?\n/)
      .map(s => s.trim())
      .filter(Boolean);

    // Botones de acción: soportamos un modo "edición" que transforma el
    // submit en update y muestra un botón cancelar.
    const submitBtn = form.querySelector('button[type="submit"]');
    const resetBtn  = form.querySelector('button[type="reset"]');
    let cancelEditBtn = form.querySelector('#cancelEditProduct');
    if (!cancelEditBtn) {
      cancelEditBtn = document.createElement('button');
      cancelEditBtn.id = 'cancelEditProduct';
      cancelEditBtn.type = 'button';
      cancelEditBtn.className = 'admin-btn-ghost';
      cancelEditBtn.innerHTML = '<i class="bi bi-x-lg"></i> Cancelar edición';
      cancelEditBtn.style.display = 'none';
      resetBtn.parentNode.insertBefore(cancelEditBtn, resetBtn);
    }
    const formTitle = form.querySelector('.admin-form-title');
    const originalTitle  = formTitle ? formTitle.innerHTML : '';
    const originalSubmit = submitBtn ? submitBtn.innerHTML : 'Guardar';

    function enterEditMode(p) {
      editingProductId = p.id;
      form.querySelector('[name="nombre"]').value = p.nombre || '';
      slugInput.value = p.slug || slugify(p.nombre || '');
      form.querySelector('[name="marca"]').value = p.marca || '';
      form.querySelector('[name="categoria"]').value = p.categoria || '';
      updateSubcatOptions(p.categoria || '');
      setTimeout(() => {
        const sub = form.querySelector('[name="subcategoria"]');
        if (sub) sub.value = p.subcategoria || '';
      }, 0);
      form.querySelector('[name="precio"]').value = p.precio || '';
      form.querySelector('[name="precioAntes"]').value = p.precioAntes || '';
      form.querySelectorAll('[name="tipoPiel"]').forEach(cb => {
        cb.checked = Array.isArray(p.tipoPiel) && p.tipoPiel.includes(cb.value);
      });
      form.querySelector('[name="descripcion"]').value = p.descripcion || '';
      form.querySelector('[name="modoDeUso"]').value  = Array.isArray(p.modoDeUso)  ? p.modoDeUso.join('\n')  : '';
      form.querySelector('[name="beneficios"]').value = Array.isArray(p.beneficios) ? p.beneficios.join('\n') : '';
      form.querySelector('[name="masVendido"]').checked = !!p.masVendido;
      form.querySelector('[name="enOferta"]').checked   = !!p.enOferta;
      images.reset(Array.isArray(p.imagenes) && p.imagenes.length ? p.imagenes.slice() : ['']);
      if (formTitle) formTitle.innerHTML = `<i class="bi bi-pencil-square"></i> Editando producto <span class="admin-tag-custom">#${p.id}</span>`;
      if (submitBtn) submitBtn.innerHTML = '<i class="bi bi-check-lg"></i> Actualizar producto';
      cancelEditBtn.style.display = '';
      form.classList.add('is-editing');
      form.scrollIntoView({ behavior: 'smooth', block: 'start' });
      if (window.showToast) window.showToast(`Editando "${p.nombre}"`, 'info');
    }
    function exitEditMode() {
      editingProductId = null;
      form.reset();
      images.reset(['']);
      updateSubcatOptions('');
      if (formTitle) formTitle.innerHTML = originalTitle;
      if (submitBtn) submitBtn.innerHTML = originalSubmit;
      cancelEditBtn.style.display = 'none';
      form.classList.remove('is-editing');
    }
    cancelEditBtn.addEventListener('click', exitEditMode);

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

      // Slug único: ignorar self cuando estamos editando.
      const all = window.products || [];
      const base = slugify(nombre) || `producto-${all.length + 1}`;
      let slug = base, n = 2;
      while (all.some(p => p.slug === slug && p.id !== editingProductId)) slug = `${base}-${n++}`;
      slugInput.value = slug;

      const common = {
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
        modoDeUso:  splitLines(fd.get('modoDeUso')),
        beneficios: splitLines(fd.get('beneficios')),
        masVendido: form.querySelector('[name="masVendido"]').checked,
        enOferta:   form.querySelector('[name="enOferta"]').checked
      };

      const adminProducts = load(STORE_PRODUCTS);

      if (editingProductId != null) {
        // UPDATE — upsert en storage + reemplazo in-memory
        const product = { id: editingProductId, ...common };
        const aidx = adminProducts.findIndex(ap => ap.id === editingProductId);
        if (aidx > -1) adminProducts[aidx] = product;
        else adminProducts.push(product);
        save(STORE_PRODUCTS, adminProducts);
        const pidx = (window.products || []).findIndex(p => p.id === editingProductId);
        if (pidx > -1) window.products[pidx] = product;
        syncProduct(product, false);
        exitEditMode();
        renderProductsTable();
        renderDashboard();
        if (window.showToast) window.showToast('Producto actualizado', 'success');
      } else {
        // CREATE — id nuevo (> max existente)
        const product = {
          id: all.reduce((m, p) => Math.max(m, p.id), 0) + 1,
          ...common
        };
        adminProducts.push(product);
        save(STORE_PRODUCTS, adminProducts);
        (window.products || []).push(product);
        syncProduct(product, false);
        form.reset();
        images.reset(['']);
        updateSubcatOptions('');
        renderProductsTable();
        renderDashboard();
        if (window.showToast) window.showToast('Producto agregado', 'success');
      }
    });

    // Delegación: edit + delete/revert sobre la tabla
    const table = document.getElementById('productsTable');
    if (table) table.addEventListener('click', (e) => {
      const editBtn = e.target.closest('[data-edit-product]');
      if (editBtn) {
        const id = Number(editBtn.dataset.editProduct);
        const p = (window.products || []).find(x => x.id === id);
        if (p) enterEditMode(p);
        return;
      }
      const delBtn = e.target.closest('[data-delete-product]');
      if (!delBtn) return;
      const id = Number(delBtn.dataset.deleteProduct);
      const baseMax = window.__baseProductMaxId || 0;
      const isBase = id <= baseMax;
      const q = isBase
        ? '¿Revertir los cambios y volver al producto original del catálogo?'
        : '¿Eliminar este producto?';
      if (!confirm(q)) return;
      const list = load(STORE_PRODUCTS).filter(p => p.id !== id);
      save(STORE_PRODUCTS, list);
      syncProduct({ id }, true);
      if (isBase) {
        if (window.showToast) window.showToast('Revirtiendo al original…', 'info');
        setTimeout(() => window.location.reload(), 400);
      } else {
        const idx = window.products.findIndex(p => p.id === id);
        if (idx > -1) window.products.splice(idx, 1);
        if (editingProductId === id) exitEditMode();
        renderProductsTable();
        renderDashboard();
        if (window.showToast) window.showToast('Producto eliminado', 'info');
      }
    });
  }

  /* ---------- SLIDES ---------- */
  const POS_LABELS = {
    'top-left': 'Arriba izquierda', 'top-center': 'Arriba centro', 'top-right': 'Arriba derecha',
    'middle-left': 'Medio izquierda', 'middle-center': 'Centro', 'middle-right': 'Medio derecha',
    'bottom-left': 'Abajo izquierda', 'bottom-center': 'Abajo centro', 'bottom-right': 'Abajo derecha'
  };
  function normalizePos(s) {
    const h = ['left','center','right'].includes(s && s.posH) ? s.posH : 'center';
    const v = ['top','middle','bottom'].includes(s && s.posV) ? s.posV : 'middle';
    return { posH: h, posV: v };
  }
  function posLabel(s) {
    const { posH, posV } = normalizePos(s);
    return POS_LABELS[`${posV}-${posH}`] || 'Centro';
  }

  function renderSlidesList() {
    const cont = document.getElementById('slidesList');
    if (!cont) return;
    const slides = load(STORE_SLIDES);
    const hex = /^#[0-9a-f]{6}$/i;
    const okFonts = [`'Bodoni Moda', serif`, `'Syne', sans-serif`, `'Epilogue', sans-serif`];
    const esc = v => String(v == null ? '' : v).replace(/"/g, '&quot;');
    const pairs = ps => ps.filter(([, v]) => v).map(([k, v]) => `${k}:${esc(v)}`).join(';');
    cont.innerHTML = slides.length ? slides.map((s, i) => {
      const { posH, posV } = normalizePos(s);
      const tc = hex.test(s.tituloColor || '') ? s.tituloColor : '';
      const dc = hex.test(s.descColor   || '') ? s.descColor   : '';
      const bb = hex.test(s.botonBg     || '') ? s.botonBg     : '';
      const bc = hex.test(s.botonColor  || '') ? s.botonColor  : '';
      const gb = hex.test(s.badgeBg     || '') ? s.badgeBg     : '';
      const gc = hex.test(s.badgeColor  || '') ? s.badgeColor  : '';
      const ft = okFonts.includes(s.fuenteTitulo) ? s.fuenteTitulo : '';
      const fx = okFonts.includes(s.fuenteTexto)  ? s.fuenteTexto  : '';
      const shCol = hex.test(s.botonShadowColor || '') ? s.botonShadowColor : '';
      const bBorder = botonBorderCSS(s.botonBorderWidth, s.botonBorderColor);
      const bRadius = BOTON_RADIUS_MAP[s.botonRadius] || '';
      const bShadow = botonShadowCSS(s.botonShadow, shCol);
      const fxName = ['halo','glow','neon','double'].includes(s.botonBorderEffect) ? s.botonBorderEffect : '';
      const fxColor = shCol || (hex.test(s.botonBorderColor || '') ? s.botonBorderColor : '') || bb || '';
      const titleStyle = pairs([['color', tc], ['font-family', ft]]);
      const descStyle  = pairs([['color', dc], ['font-family', fx]]);
      const ctaStyle   = pairs([
        ['background', bb], ['color', bc], ['font-family', fx],
        ['border', bBorder], ['border-radius', bRadius], ['box-shadow', bShadow],
        ['--lu-fx-color', fxColor]
      ]);
      const ctaClass = `admin-slide-cta${fxName ? ` fx-${fxName}` : ''}`;
      const badgeStyle = pairs([['background', gb], ['color', gc]]);
      return `
      <div class="admin-slide-card">
        <div class="admin-slide-preview pos-h-${posH} pos-v-${posV}" style="background-image:url('${(s.imagen || '').replace(/'/g, "%27")}')">
          ${s.badge ? `<span class="admin-slide-badge"${badgeStyle ? ` style="${badgeStyle}"` : ''}>${s.badge}</span>` : ''}
          <div class="admin-slide-content">
            <h4${titleStyle ? ` style="${titleStyle}"` : ''}>${s.titulo || ''}</h4>
            <p${descStyle ? ` style="${descStyle}"` : ''}>${s.descripcion || ''}</p>
            <span class="${ctaClass}"${ctaStyle ? ` style="${ctaStyle}"` : ''}>${s.botonTexto || 'Ver más'} →</span>
          </div>
        </div>
        <div class="admin-slide-meta">
          <span class="admin-hint"><i class="bi bi-arrows-move"></i> ${posLabel(s)} &middot; → ${s.botonLink || '#'}</span>
          <div class="admin-td-actions">
            <button class="admin-btn-icon admin-btn-edit" data-edit-slide="${i}" aria-label="Editar"><i class="bi bi-pencil-square"></i></button>
            <button class="admin-btn-icon" data-delete-slide="${i}" aria-label="Eliminar"><i class="bi bi-trash3"></i></button>
          </div>
        </div>
      </div>`;
    }).join('') : '<p class="admin-empty">No hay diapositivas personalizadas. La home usará el carrusel por defecto.</p>';
  }

  /* ---- Color inputs — picker + hex text + botón clear ----
   * El hex text es la fuente de verdad. Vacío = usar color por defecto del
   * tema. Al tocar el color picker se rellena el hex; al clic en clear se
   * vacía. Esto permite distinguir "usuario eligió color X" de "no tocado". */
  const HEX_RE = /^#[0-9a-f]{6}$/i;
  /* Paleta de swatches populares — un click aplica el color al instante,
   * sin tener que abrir el selector nativo del sistema. */
  const COLOR_SWATCHES = [
    '#682abf', '#7732d9', '#e53e6b', '#f6c6f9',
    '#2fae8e', '#f5c06e', '#1a0f2e', '#ffffff'
  ];
  function initColorInputs(form) {
    form.querySelectorAll('.admin-color-input').forEach(wrap => {
      const picker = wrap.querySelector('input[type="color"]');
      const text   = wrap.querySelector('input[type="text"]');
      const clear  = wrap.querySelector('[data-clear]');
      if (!picker || !text) return;
      const sync = () => wrap.classList.toggle('has-value', !!text.value);
      const apply = (v) => {
        if (!HEX_RE.test(v)) return;
        text.value = v;
        picker.value = v;
        sync();
        form.dispatchEvent(new Event('lu-live', { bubbles: true }));
      };
      const handlePicker = () => {
        text.value = picker.value;
        sync();
        form.dispatchEvent(new Event('lu-live', { bubbles: true }));
      };
      picker.addEventListener('input', handlePicker);
      picker.addEventListener('change', handlePicker);
      text.addEventListener('input', () => {
        if (HEX_RE.test(text.value)) picker.value = text.value;
        sync();
        form.dispatchEvent(new Event('lu-live', { bubbles: true }));
      });
      if (clear) clear.addEventListener('click', () => {
        text.value = '';
        sync();
        form.dispatchEvent(new Event('lu-live', { bubbles: true }));
      });
      // Inyecta la paleta de swatches debajo del picker
      if (!wrap.parentElement.querySelector('.admin-color-swatches')) {
        const strip = document.createElement('div');
        strip.className = 'admin-color-swatches';
        strip.innerHTML = COLOR_SWATCHES.map(c =>
          `<button type="button" class="admin-swatch" data-swatch="${c}" style="background:${c}" aria-label="Color ${c}" title="${c}"></button>`
        ).join('');
        wrap.after(strip);
        strip.addEventListener('click', (ev) => {
          const b = ev.target.closest('[data-swatch]');
          if (b) apply(b.dataset.swatch);
        });
      }
      sync();
    });
  }
  function readColorVal(form, name) {
    const el = form.querySelector(`input[name="${name}Hex"]`);
    if (!el) return '';
    const v = (el.value || '').trim();
    return HEX_RE.test(v) ? v : '';
  }
  function writeColorVal(form, name, value) {
    const wrap = form.querySelector(`[data-clear="${name}"]`)?.closest('.admin-color-input');
    if (!wrap) return;
    const picker = wrap.querySelector('input[type="color"]');
    const text   = wrap.querySelector('input[type="text"]');
    const v = HEX_RE.test(value || '') ? value : '';
    if (text) text.value = v;
    if (picker && v) picker.value = v;
    wrap.classList.toggle('has-value', !!v);
  }

  /* ---- Helpers de estilo del botón ----
   * Mismo mapping que usa main.js para el render real — mantener en sincronía
   * garantiza que el preview y el carrusel final se vean idénticos. */
  const BOTON_RADIUS_MAP = {
    default: '', square: '4px', rounded: '14px', pill: '999px'
  };
  const BOTON_SHADOW_SPEC = {
    default: null,
    none:    { offset: null },
    sm: { offset: '0 2px 6px',   alpha: 0.28, fallback: 'rgba(0,0,0,0.12)' },
    md: { offset: '0 6px 20px',  alpha: 0.42, fallback: 'rgba(104,42,191,0.28)' },
    lg: { offset: '0 14px 34px', alpha: 0.55, fallback: 'rgba(104,42,191,0.40)' }
  };
  function hexToRgba(hex, alpha) {
    if (!HEX_RE.test(hex || '')) return '';
    const r = parseInt(hex.slice(1,3), 16);
    const g = parseInt(hex.slice(3,5), 16);
    const b = parseInt(hex.slice(5,7), 16);
    return `rgba(${r},${g},${b},${alpha})`;
  }
  function botonShadowCSS(size, color) {
    const spec = BOTON_SHADOW_SPEC[size];
    if (!spec) return '';
    if (!spec.offset) return 'none';
    const rgba = hexToRgba(color, spec.alpha) || spec.fallback;
    return `${spec.offset} ${rgba}`;
  }
  function botonBorderCSS(width, color) {
    const w = Math.max(0, Math.min(8, Number(width) || 0));
    if (w <= 0) return '';
    return HEX_RE.test(color || '') ? `${w}px solid ${color}` : '';
  }

  /* ---- Live preview del slide ---- */
  function initLivePreview(form) {
    const root = document.getElementById('slideLivePreview');
    if (!root) return () => {};
    const stage = root.querySelector('[data-role="stage"]');
    const content = root.querySelector('[data-role="content"]');
    const badge = root.querySelector('[data-role="badge"]');
    const title = root.querySelector('[data-role="title"]');
    const desc  = root.querySelector('[data-role="desc"]');
    const cta   = root.querySelector('[data-role="cta"]');

    function update() {
      const fd = new FormData(form);
      const imagen = (fd.get('imagen') || '').trim();
      const bg = imagen ? `url('${imagen.replace(/'/g,"%27")}')` : '';
      if (bg) {
        stage.style.backgroundImage = bg;
        stage.classList.add('has-img');
      } else {
        stage.style.backgroundImage = '';
        stage.classList.remove('has-img');
      }
      // Posición
      stage.classList.remove('pos-h-left','pos-h-center','pos-h-right','pos-v-top','pos-v-middle','pos-v-bottom');
      const posH = ['left','center','right'].includes(fd.get('posH')) ? fd.get('posH') : 'center';
      const posV = ['top','middle','bottom'].includes(fd.get('posV')) ? fd.get('posV') : 'middle';
      stage.classList.add(`pos-h-${posH}`, `pos-v-${posV}`);
      // Badge
      const badgeTxt = (fd.get('badge') || '').trim();
      if (badgeTxt) { badge.textContent = badgeTxt; badge.hidden = false; }
      else { badge.hidden = true; }
      // Textos
      title.textContent = (fd.get('titulo') || '').trim() || 'Tu título aquí';
      desc.textContent  = (fd.get('descripcion') || '').trim() || 'Tu descripción aparecerá aquí';
      cta.textContent   = (fd.get('botonTexto') || '').trim() || 'Botón';
      // Colores
      const tc = readColorVal(form, 'tituloColor');
      const dc = readColorVal(form, 'descColor');
      const bb = readColorVal(form, 'botonBg');
      const bc = readColorVal(form, 'botonColor');
      const gb = readColorVal(form, 'badgeBg');
      const gc = readColorVal(form, 'badgeColor');
      title.style.color = tc || '';
      desc.style.color  = dc || '';
      cta.style.background = bb || '';
      cta.style.color = bc || '';
      badge.style.background = gb || '';
      badge.style.color = gc || '';
      // Borde, forma y sombra del botón
      const bWidth = fd.get('botonBorderWidth') || 0;
      const bColor = readColorVal(form, 'botonBorderColor');
      const shColor = readColorVal(form, 'botonShadowColor');
      cta.style.border = botonBorderCSS(bWidth, bColor) || '';
      cta.style.borderRadius = BOTON_RADIUS_MAP[fd.get('botonRadius')] || '';
      cta.style.boxShadow = botonShadowCSS(fd.get('botonShadow'), shColor) || '';
      const bReadout = form.querySelector('[data-border-readout]');
      if (bReadout) bReadout.textContent = `${Number(bWidth) || 0} px`;
      // Efecto de borde — aplica clase fx-* y variable CSS con el color de FX
      cta.classList.remove('fx-halo','fx-glow','fx-neon','fx-double');
      const fxName = fd.get('botonBorderEffect') || 'none';
      if (fxName !== 'none') cta.classList.add(`fx-${fxName}`);
      const fxColor = shColor || bColor || readColorVal(form, 'botonBg') || '';
      cta.style.setProperty('--lu-fx-color', fxColor || '');
      // Fuentes
      const ft = fd.get('fuenteTitulo') || '';
      const fxFont = fd.get('fuenteTexto') || '';
      title.style.fontFamily = ft;
      desc.style.fontFamily  = fxFont;
      cta.style.fontFamily   = fxFont;
    }

    form.addEventListener('input', update);
    form.addEventListener('change', update);
    form.addEventListener('lu-live', update);
    update();
    return update;
  }

  /* Wire up del picker 3x3 de posición. Devuelve helpers para setearlo
   * desde edit mode y leerlo desde el submit. */
  function initPosPicker(form) {
    const wrap = form.querySelector('[data-pos-picker]');
    if (!wrap) return null;
    const hInput = wrap.querySelector('input[name="posH"]');
    const vInput = wrap.querySelector('input[name="posV"]');
    const readout = form.querySelector('[data-pos-readout]');
    const cells = wrap.querySelectorAll('.admin-pos-cell');

    function apply(posH, posV) {
      const h = ['left','center','right'].includes(posH) ? posH : 'center';
      const v = ['top','middle','bottom'].includes(posV) ? posV : 'middle';
      hInput.value = h;
      vInput.value = v;
      cells.forEach(c => c.classList.toggle('active',
        c.dataset.posH === h && c.dataset.posV === v));
      if (readout) readout.textContent = POS_LABELS[`${v}-${h}`] || 'Centro';
      // Notifica al live preview para que se re-renderice
      form.dispatchEvent(new Event('lu-live', { bubbles: true }));
    }
    cells.forEach(c => c.addEventListener('click', () => apply(c.dataset.posH, c.dataset.posV)));

    return { apply, reset: () => apply('center', 'middle') };
  }

  let editingSlideIdx = null;

  function initSlidesForm() {
    const form = document.getElementById('slideForm');
    if (!form) return;
    form.querySelectorAll('.admin-image-input').forEach(wireImageInput);
    initColorInputs(form);
    const posPicker = initPosPicker(form);
    const refreshPreview = initLivePreview(form);

    // Botón "Limpiar" nativo → garantizar que colores/posición/preview vuelvan
    // a su estado por defecto (form.reset() no toca el has-value custom).
    form.addEventListener('reset', () => {
      setTimeout(() => {
        ['tituloColor','descColor','botonBg','botonColor','badgeBg','badgeColor','botonBorderColor','botonShadowColor'].forEach(n => writeColorVal(form, n, ''));
        if (posPicker) posPicker.reset();
        form.querySelectorAll('.admin-image-input').forEach(c => {
          const u = c.querySelector('input[type="text"], input[type="url"]');
          if (u) u.dispatchEvent(new Event('input', { bubbles: true }));
        });
        if (refreshPreview) refreshPreview();
      }, 0);
    });

    const submitBtn = form.querySelector('button[type="submit"]');
    const resetBtn  = form.querySelector('button[type="reset"]');
    let cancelEditBtn = form.querySelector('#cancelEditSlide');
    if (!cancelEditBtn) {
      cancelEditBtn = document.createElement('button');
      cancelEditBtn.id = 'cancelEditSlide';
      cancelEditBtn.type = 'button';
      cancelEditBtn.className = 'admin-btn-ghost';
      cancelEditBtn.innerHTML = '<i class="bi bi-x-lg"></i> Cancelar edición';
      cancelEditBtn.style.display = 'none';
      resetBtn.parentNode.insertBefore(cancelEditBtn, resetBtn);
    }
    const formTitle = form.querySelector('.admin-form-title');
    const originalTitle  = formTitle ? formTitle.innerHTML : '';
    const originalSubmit = submitBtn ? submitBtn.innerHTML : 'Guardar';

    function enterEditMode(i) {
      const slides = load(STORE_SLIDES);
      const s = slides[i];
      if (!s) return;
      editingSlideIdx = i;
      form.querySelector('[name="imagen"]').value      = s.imagen || '';
      form.querySelector('[name="titulo"]').value      = s.titulo || '';
      form.querySelector('[name="descripcion"]').value = s.descripcion || '';
      form.querySelector('[name="botonTexto"]').value  = s.botonTexto || '';
      form.querySelector('[name="botonLink"]').value   = s.botonLink || '';
      form.querySelector('[name="badge"]').value       = s.badge || '';
      form.querySelectorAll('.admin-image-input').forEach(c => {
        const u = c.querySelector('input[type="text"], input[type="url"]');
        if (u) u.dispatchEvent(new Event('input', { bubbles: true }));
      });
      if (posPicker) {
        const { posH, posV } = normalizePos(s);
        posPicker.apply(posH, posV);
      }
      writeColorVal(form, 'tituloColor', s.tituloColor || '');
      writeColorVal(form, 'descColor',   s.descColor   || '');
      writeColorVal(form, 'botonBg',     s.botonBg     || '');
      writeColorVal(form, 'botonColor',  s.botonColor  || '');
      writeColorVal(form, 'badgeBg',     s.badgeBg     || '');
      writeColorVal(form, 'badgeColor',  s.badgeColor  || '');
      writeColorVal(form, 'botonBorderColor', s.botonBorderColor || '');
      writeColorVal(form, 'botonShadowColor', s.botonShadowColor || '');
      const bwInput = form.querySelector('[name="botonBorderWidth"]');
      if (bwInput) bwInput.value = Number(s.botonBorderWidth) || 0;
      const brSel = form.querySelector('[name="botonRadius"]');
      if (brSel) brSel.value = s.botonRadius || 'default';
      const bsSel = form.querySelector('[name="botonShadow"]');
      if (bsSel) bsSel.value = s.botonShadow || 'default';
      const beSel = form.querySelector('[name="botonBorderEffect"]');
      if (beSel) beSel.value = s.botonBorderEffect || 'none';
      const ftSel = form.querySelector('[name="fuenteTitulo"]');
      const fxSel = form.querySelector('[name="fuenteTexto"]');
      if (ftSel) ftSel.value = s.fuenteTitulo || '';
      if (fxSel) fxSel.value = s.fuenteTexto  || '';
      if (refreshPreview) refreshPreview();
      if (formTitle) formTitle.innerHTML = `<i class="bi bi-pencil-square"></i> Editando diapositiva <span class="admin-tag-custom">#${i + 1}</span>`;
      if (submitBtn) submitBtn.innerHTML = '<i class="bi bi-check-lg"></i> Actualizar diapositiva';
      cancelEditBtn.style.display = '';
      form.classList.add('is-editing');
      form.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
    function exitEditMode() {
      editingSlideIdx = null;
      form.reset();
      form.querySelectorAll('.admin-image-input').forEach(c => {
        const u = c.querySelector('input[type="text"], input[type="url"]');
        if (u) u.dispatchEvent(new Event('input', { bubbles: true }));
      });
      if (posPicker) posPicker.reset();
      ['tituloColor','descColor','botonBg','botonColor','badgeBg','badgeColor','botonBorderColor','botonShadowColor'].forEach(n => writeColorVal(form, n, ''));
      const bwInput = form.querySelector('[name="botonBorderWidth"]');
      if (bwInput) bwInput.value = 0;
      const brSel = form.querySelector('[name="botonRadius"]');
      if (brSel) brSel.value = 'default';
      const bsSel = form.querySelector('[name="botonShadow"]');
      if (bsSel) bsSel.value = 'default';
      const beSel = form.querySelector('[name="botonBorderEffect"]');
      if (beSel) beSel.value = 'none';
      const ftSel = form.querySelector('[name="fuenteTitulo"]');
      const fxSel = form.querySelector('[name="fuenteTexto"]');
      if (ftSel) ftSel.value = '';
      if (fxSel) fxSel.value = '';
      if (refreshPreview) refreshPreview();
      if (formTitle) formTitle.innerHTML = originalTitle;
      if (submitBtn) submitBtn.innerHTML = originalSubmit;
      cancelEditBtn.style.display = 'none';
      form.classList.remove('is-editing');
    }
    cancelEditBtn.addEventListener('click', exitEditMode);

    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const fd = new FormData(form);
      const posH = ['left','center','right'].includes(fd.get('posH')) ? fd.get('posH') : 'center';
      const posV = ['top','middle','bottom'].includes(fd.get('posV')) ? fd.get('posV') : 'middle';
      const slide = {
        imagen:      (fd.get('imagen') || '').trim(),
        titulo:      (fd.get('titulo') || '').trim(),
        descripcion: (fd.get('descripcion') || '').trim(),
        botonTexto:  (fd.get('botonTexto') || '').trim(),
        botonLink:   (fd.get('botonLink') || '').trim(),
        badge:       (fd.get('badge') || '').trim(),
        posH, posV,
        tituloColor:  readColorVal(form, 'tituloColor'),
        descColor:    readColorVal(form, 'descColor'),
        botonBg:      readColorVal(form, 'botonBg'),
        botonColor:   readColorVal(form, 'botonColor'),
        botonBorderColor: readColorVal(form, 'botonBorderColor'),
        botonBorderWidth: Math.max(0, Math.min(8, Number(fd.get('botonBorderWidth')) || 0)),
        botonRadius:  ['default','square','rounded','pill'].includes(fd.get('botonRadius')) ? fd.get('botonRadius') : 'default',
        botonShadow:  ['default','none','sm','md','lg'].includes(fd.get('botonShadow')) ? fd.get('botonShadow') : 'default',
        botonShadowColor: readColorVal(form, 'botonShadowColor'),
        botonBorderEffect: ['none','halo','glow','double','neon'].includes(fd.get('botonBorderEffect')) ? fd.get('botonBorderEffect') : 'none',
        badgeBg:      readColorVal(form, 'badgeBg'),
        badgeColor:   readColorVal(form, 'badgeColor'),
        fuenteTitulo: (fd.get('fuenteTitulo') || '').trim(),
        fuenteTexto:  (fd.get('fuenteTexto')  || '').trim()
      };
      if (!slide.imagen || !slide.titulo || !slide.descripcion || !slide.botonTexto || !slide.botonLink) {
        if (window.showToast) window.showToast('Completa los campos obligatorios', 'info');
        return;
      }
      const slides = load(STORE_SLIDES);
      if (editingSlideIdx != null) {
        // Preserva el id remoto del slide anterior — sin él Supabase haría
        // INSERT en vez de UPDATE y la diapositiva se duplicaría.
        const prev = slides[editingSlideIdx] || {};
        if (prev.id) slide.id = prev.id;
        slides[editingSlideIdx] = slide;
        save(STORE_SLIDES, slides);
        syncSlide(slide, editingSlideIdx, false);
        exitEditMode();
        renderSlidesList();
        renderDashboard();
        if (window.showToast) window.showToast('Diapositiva actualizada', 'success');
      } else {
        slides.push(slide);
        save(STORE_SLIDES, slides);
        syncSlide(slide, slides.length - 1, false);
        form.reset();
        form.querySelectorAll('.admin-image-input').forEach(c => {
          const u = c.querySelector('input[type="text"], input[type="url"]');
          if (u) u.dispatchEvent(new Event('input', { bubbles: true }));
        });
        if (posPicker) posPicker.reset();
        ['tituloColor','descColor','botonBg','botonColor','badgeBg','badgeColor','botonBorderColor','botonShadowColor'].forEach(n => writeColorVal(form, n, ''));
        const bwInput2 = form.querySelector('[name="botonBorderWidth"]');
        if (bwInput2) bwInput2.value = 0;
        const brSel2 = form.querySelector('[name="botonRadius"]');
        if (brSel2) brSel2.value = 'default';
        const bsSel2 = form.querySelector('[name="botonShadow"]');
        if (bsSel2) bsSel2.value = 'default';
        const beSel2 = form.querySelector('[name="botonBorderEffect"]');
        if (beSel2) beSel2.value = 'none';
        if (refreshPreview) refreshPreview();
        renderSlidesList();
        renderDashboard();
        if (window.showToast) window.showToast('Diapositiva añadida', 'success');
      }
    });

    const listEl = document.getElementById('slidesList');
    if (listEl) listEl.addEventListener('click', (e) => {
      const editBtn = e.target.closest('[data-edit-slide]');
      if (editBtn) {
        const i = Number(editBtn.dataset.editSlide);
        enterEditMode(i);
        return;
      }
      const delBtn = e.target.closest('[data-delete-slide]');
      if (!delBtn) return;
      const i = Number(delBtn.dataset.deleteSlide);
      const slides = load(STORE_SLIDES);
      const removed = slides[i];
      slides.splice(i, 1);
      save(STORE_SLIDES, slides);
      // Pasamos el slide eliminado (con su id remoto) para borrarlo en Supabase.
      syncSlide(removed, i, true);
      if (editingSlideIdx === i) exitEditMode();
      renderSlidesList();
      renderDashboard();
      if (window.showToast) window.showToast('Diapositiva eliminada', 'info');
    });

    const resetSlidesBtn = document.getElementById('resetSlidesBtn');
    if (resetSlidesBtn) resetSlidesBtn.addEventListener('click', () => {
      if (!confirm('Esto borra tus diapositivas personalizadas y vuelve al carrusel por defecto. ¿Continuar?')) return;
      localStorage.removeItem(STORE_SLIDES);
      renderSlidesList();
      renderDashboard();
      if (window.showToast) window.showToast('Carrusel restablecido', 'info');
    });
  }

  /* ---------- BRANDS ---------- */
  /* Renderiza la tabla de marcas. Si estamos en modo remoto, SIEMPRE pide
   * fresh a Supabase — así no dependemos del timing de la rehidratación
   * inicial. Paint optimista primero con lo local, luego actualizamos. */
  async function renderBrandsTable() {
    const tbody = document.querySelector('#brandsTable tbody');
    if (!tbody) return;

    // Paint optimista con lo que hay en memoria
    paintBrandsFromMemory();

    // Si hay backend, refresca y re-pinta con la fuente de verdad
    if (window.LuApi && window.LuApi.isRemote && window.LuApi.isRemote()) {
      try {
        const fresh = await window.LuApi.listBrands();
        console.log('[admin] listBrands →', fresh && fresh.length, 'marcas');
        if (Array.isArray(fresh)) {
          (window.brands || []).splice(0, (window.brands || []).length, ...fresh);
        }
        paintBrandsFromMemory();
        // También refresca el select de marcas en el form de productos
        const psel = document.querySelector('#productForm [name="marca"]');
        if (psel) {
          const current = psel.value;
          psel.innerHTML = buildBrandOptions();
          if (current) psel.value = current;
        }
      } catch (e) {
        console.warn('[admin] listBrands failed', e);
      }
    }
  }

  function paintBrandsFromMemory() {
    const tbody = document.querySelector('#brandsTable tbody');
    const countEl = document.getElementById('brandsCount');
    if (!tbody) return;
    const adminBrands = load(STORE_BRANDS);
    const baseMax = window.__baseBrandMaxId || 0;
    const all = window.brands || [];
    if (countEl) countEl.textContent = all.length;
    tbody.innerHTML = all.length ? all.map(b => {
      const inAdmin = adminBrands.some(ab => ab.id === b.id);
      const isNew = b.id > baseMax;
      const tag = inAdmin
        ? (isNew
            ? '<span class="admin-tag-custom">nuevo</span>'
            : '<span class="admin-tag-custom admin-tag-edit">editado</span>')
        : '';
      return `
        <tr>
          <td><img src="${b.logo || ''}" alt="" onerror="this.style.visibility='hidden'"></td>
          <td>${b.nombre}${tag}</td>
          <td><code>${b.slug}</code></td>
          <td class="admin-td-actions">
            <button class="admin-btn-icon admin-btn-edit" data-edit-brand="${b.id}" aria-label="Editar"><i class="bi bi-pencil-square"></i></button>
            <button class="admin-btn-icon" data-delete-brand="${b.id}" aria-label="Eliminar"><i class="bi bi-trash3"></i></button>
          </td>
        </tr>`;
    }).join('') : '<tr><td colspan="4" class="admin-empty">Sin marcas.</td></tr>';
  }

  let editingBrandId = null;

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

    const submitBtn = form.querySelector('button[type="submit"]');
    const resetBtn  = form.querySelector('button[type="reset"]');
    let cancelEditBtn = form.querySelector('#cancelEditBrand');
    if (!cancelEditBtn) {
      cancelEditBtn = document.createElement('button');
      cancelEditBtn.id = 'cancelEditBrand';
      cancelEditBtn.type = 'button';
      cancelEditBtn.className = 'admin-btn-ghost';
      cancelEditBtn.innerHTML = '<i class="bi bi-x-lg"></i> Cancelar edición';
      cancelEditBtn.style.display = 'none';
      resetBtn.parentNode.insertBefore(cancelEditBtn, resetBtn);
    }
    const formTitle = form.querySelector('.admin-form-title');
    const originalTitle  = formTitle ? formTitle.innerHTML : '';
    const originalSubmit = submitBtn ? submitBtn.innerHTML : 'Guardar';

    function enterEditMode(b) {
      editingBrandId = b.id;
      form.querySelector('[name="nombre"]').value = b.nombre || '';
      form.querySelector('[name="slug"]').value = b.slug || '';
      form.querySelector('[name="logo"]').value = b.logo || '';
      form.querySelector('[name="descripcion"]').value = b.descripcion || '';
      // Re-sincroniza el preview del image-input
      form.querySelectorAll('.admin-image-input').forEach(c => {
        const u = c.querySelector('input[type="text"], input[type="url"]');
        if (u) u.dispatchEvent(new Event('input', { bubbles: true }));
      });
      touched = true;
      if (formTitle) formTitle.innerHTML = `<i class="bi bi-pencil-square"></i> Editando marca <span class="admin-tag-custom">#${b.id}</span>`;
      if (submitBtn) submitBtn.innerHTML = '<i class="bi bi-check-lg"></i> Actualizar marca';
      cancelEditBtn.style.display = '';
      form.classList.add('is-editing');
      form.scrollIntoView({ behavior: 'smooth', block: 'start' });
      if (window.showToast) window.showToast(`Editando "${b.nombre}"`, 'info');
    }
    function exitEditMode() {
      editingBrandId = null;
      form.reset();
      form.querySelectorAll('.admin-image-input').forEach(c => {
        const u = c.querySelector('input[type="text"], input[type="url"]');
        if (u) u.dispatchEvent(new Event('input', { bubbles: true }));
      });
      touched = false;
      if (formTitle) formTitle.innerHTML = originalTitle;
      if (submitBtn) submitBtn.innerHTML = originalSubmit;
      cancelEditBtn.style.display = 'none';
      form.classList.remove('is-editing');
    }
    cancelEditBtn.addEventListener('click', exitEditMode);

    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const fd = new FormData(form);
      const nombre = (fd.get('nombre') || '').trim();
      const slug = (fd.get('slug') || slugify(nombre)).trim();
      if (!nombre || !slug) return;
      // Validar slug único, ignorando self cuando editamos
      if ((window.brands || []).some(b => b.slug === slug && b.id !== editingBrandId)) {
        if (window.showToast) window.showToast('Ya existe una marca con ese slug', 'info');
        return;
      }
      const common = {
        nombre,
        slug,
        logo: (fd.get('logo') || '').trim(),
        descripcion: (fd.get('descripcion') || '').trim()
      };
      const adminBrands = load(STORE_BRANDS);

      if (editingBrandId != null) {
        // UPDATE
        const brand = { id: editingBrandId, ...common };
        const aidx = adminBrands.findIndex(ab => ab.id === editingBrandId);
        if (aidx > -1) adminBrands[aidx] = brand;
        else adminBrands.push(brand);
        save(STORE_BRANDS, adminBrands);
        const bidx = (window.brands || []).findIndex(b => b.id === editingBrandId);
        if (bidx > -1) window.brands[bidx] = brand;
        syncBrand(brand, false);
        exitEditMode();
        renderBrandsTable();
        renderDashboard();
        const psel = document.querySelector('#productForm [name="marca"]');
        if (psel) psel.innerHTML = buildBrandOptions();
        if (window.showToast) window.showToast('Marca actualizada', 'success');
      } else {
        // CREATE
        const brand = {
          id: (window.brands || []).reduce((m, b) => Math.max(m, b.id), 0) + 1,
          ...common
        };
        adminBrands.push(brand);
        save(STORE_BRANDS, adminBrands);
        (window.brands || []).push(brand);
        syncBrand(brand, false);
        form.reset();
        touched = false;
        renderBrandsTable();
        renderDashboard();
        const psel = document.querySelector('#productForm [name="marca"]');
        if (psel) psel.innerHTML = buildBrandOptions();
        if (window.showToast) window.showToast('Marca agregada', 'success');
      }
    });

    const table = document.getElementById('brandsTable');
    if (table) table.addEventListener('click', (e) => {
      const editBtn = e.target.closest('[data-edit-brand]');
      if (editBtn) {
        const id = Number(editBtn.dataset.editBrand);
        const b = (window.brands || []).find(x => x.id === id);
        if (b) enterEditMode(b);
        return;
      }
      const delBtn = e.target.closest('[data-delete-brand]');
      if (!delBtn) return;
      const id = Number(delBtn.dataset.deleteBrand);
      const baseMax = window.__baseBrandMaxId || 0;
      const isBase = id <= baseMax;
      const q = isBase
        ? '¿Revertir los cambios y volver a la marca original?'
        : '¿Eliminar esta marca? Los productos asociados no se eliminan automáticamente.';
      if (!confirm(q)) return;
      const list = load(STORE_BRANDS).filter(b => b.id !== id);
      save(STORE_BRANDS, list);
      syncBrand({ id }, true);
      if (isBase) {
        if (window.showToast) window.showToast('Revirtiendo al original…', 'info');
        setTimeout(() => window.location.reload(), 400);
      } else {
        const idx = window.brands.findIndex(b => b.id === id);
        if (idx > -1) window.brands.splice(idx, 1);
        if (editingBrandId === id) exitEditMode();
        renderBrandsTable();
        renderDashboard();
        const psel = document.querySelector('#productForm [name="marca"]');
        if (psel) psel.innerHTML = buildBrandOptions();
        if (window.showToast) window.showToast('Marca eliminada', 'info');
      }
    });
  }

  /* ================================================================
   * PEDIDOS — seguimiento manual de envíos
   * ================================================================ */
  const ADMIN_STAGES = [
    { key: 'confirmado',    title: 'Confirmado',    short: 'Conf.',      icon: 'bi-check-circle-fill', leg: 'int' },
    { key: 'preparacion',   title: 'En preparación',short: 'Prep.',      icon: 'bi-box-seam',          leg: 'int' },
    { key: 'internacional', title: 'Internacional', short: 'Intern.',    icon: 'bi-airplane-engines',  leg: 'int' },
    { key: 'aduana',        title: 'En aduana',     short: 'Aduana',     icon: 'bi-building-check',    leg: 'int' },
    { key: 'nacional',      title: 'Envío nacional',short: 'Nacional',   icon: 'bi-truck',             leg: 'nac' },
    { key: 'entregado',     title: 'Entregado',     short: 'Entregado',  icon: 'bi-bag-check-fill',    leg: 'nac' }
  ];

  function loadOrdersMap() {
    try { return JSON.parse(localStorage.getItem('lunabi_orders') || '{}') || {}; }
    catch (e) { return {}; }
  }
  function saveOrdersMap(map) {
    try { localStorage.setItem('lunabi_orders', JSON.stringify(map)); } catch (e) { /* cuota */ }
  }
  function flattenOrders() {
    const map = loadOrdersMap();
    const out = [];
    Object.entries(map).forEach(([email, list]) => {
      if (!Array.isArray(list)) return;
      list.forEach(o => out.push({ ...o, _email: email }));
    });
    return out.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
  }

  /* Un pedido se considera confirmado cuando el admin pulsó "Confirmar"
   * (queda confirmedAt) o cuando su status pasó de 'pendiente' (legacy). */
  function isOrderConfirmed(o) {
    if (!o) return false;
    if (o.confirmedAt) return true;
    return !!(o.status && o.status !== 'pendiente');
  }

  /* Deriva la etapa actual si el admin no la marcó a mano — el timeline
   * arranca en `confirmedAt` (no en `createdAt`) para reflejar el momento
   * real en que el admin tomó el pedido. Si todavía no está confirmado,
   * devolvemos null — esos pedidos aparecen como "Pendiente de confirmación". */
  function computeAutoStageKey(order) {
    if (!isOrderConfirmed(order)) return null;
    if (order.status === 'entregado') return 'entregado';
    const start = order.confirmedAt || order.createdAt || 0;
    const h = (Date.now() - start) / 3600000;
    if (h >= 432) return 'entregado';
    if (h >= 360) return 'nacional';
    if (h >= 264) return 'aduana';
    if (h >= 72)  return 'internacional';
    if (h >= 24)  return 'preparacion';
    return 'confirmado';
  }
  function currentStageKey(order) {
    return order.stageKey || computeAutoStageKey(order);
  }

  function updateOrderStage(email, orderId, stageKey) {
    const map = loadOrdersMap();
    if (!Array.isArray(map[email])) return;
    const idx = map[email].findIndex(o => o.id === orderId);
    if (idx === -1) return;
    // Si el admin toca cualquier stage, el pedido queda confirmado.
    if (!map[email][idx].confirmedAt) {
      map[email][idx].confirmedAt = Date.now();
      if (map[email][idx].status === 'pendiente') map[email][idx].status = 'confirmado';
    }
    map[email][idx].stageKey = stageKey;
    if (stageKey === 'entregado') map[email][idx].status = 'entregado';
    else if (map[email][idx].status === 'entregado') map[email][idx].status = 'confirmado';
    saveOrdersMap(map);
    syncOrderStage(orderId, stageKey);
  }

  /* Confirma un pedido pendiente: lo marca como confirmado, pone el primer
   * stage del timeline y arranca el cálculo de tiempos desde ahora. */
  function confirmOrder(email, orderId) {
    const map = loadOrdersMap();
    if (!Array.isArray(map[email])) return;
    const idx = map[email].findIndex(o => o.id === orderId);
    if (idx === -1) return;
    map[email][idx].status = 'confirmado';
    map[email][idx].stageKey = 'confirmado';
    map[email][idx].confirmedAt = Date.now();
    saveOrdersMap(map);
    if (window.LuApi && window.LuApi.confirmOrder) {
      window.LuApi.confirmOrder(orderId).catch(e => console.warn('[admin] confirmOrder', e));
    }
  }

  function deleteOrder(email, orderId) {
    const map = loadOrdersMap();
    if (!Array.isArray(map[email])) return;
    map[email] = map[email].filter(o => o.id !== orderId);
    if (!map[email].length) delete map[email];
    saveOrdersMap(map);
  }

  let adminOrdersFilter = 'todos';

  function renderAdminOrders() {
    const listEl = document.getElementById('adminOrdersList');
    const filtersEl = document.getElementById('adminOrdersFilters');
    const statsEl = document.getElementById('adminOrdersStats');
    if (!listEl) return;

    const orders = flattenOrders();

    // Stats rápidos
    const counts = { todos: orders.length, pendiente_confirmacion: 0 };
    ADMIN_STAGES.forEach(s => { counts[s.key] = 0; });
    orders.forEach(o => {
      if (!isOrderConfirmed(o)) counts.pendiente_confirmacion++;
      else counts[currentStageKey(o)] = (counts[currentStageKey(o)] || 0) + 1;
    });

    // Filtros (chips). El primero "Por confirmar" lista los que el cliente
    // envió y aún no procesamos — el resto cubre el timeline de envío.
    const filters = [
      { key: 'todos',                  label: 'Todos',          icon: 'bi-layers' },
      { key: 'pendiente_confirmacion', label: 'Por confirmar',  icon: 'bi-hourglass-split' },
      { key: 'confirmado',             label: 'Confirmados',    icon: 'bi-check-circle' },
      { key: 'preparacion',            label: 'En preparación', icon: 'bi-box-seam' },
      { key: 'internacional',          label: 'Internacional',  icon: 'bi-airplane-engines' },
      { key: 'aduana',                 label: 'Aduana',         icon: 'bi-building-check' },
      { key: 'nacional',               label: 'Nacional',       icon: 'bi-truck' },
      { key: 'entregado',              label: 'Entregados',     icon: 'bi-bag-check-fill' }
    ];
    if (filtersEl) {
      filtersEl.innerHTML = filters.map(f => {
        const n = f.key === 'todos' ? counts.todos : (counts[f.key] || 0);
        return `
          <button class="admin-order-filter${adminOrdersFilter === f.key ? ' is-active' : ''}"
                  data-filter="${f.key}" type="button">
            <i class="bi ${f.icon}"></i> ${f.label}
            <span class="admin-order-filter-count">${n}</span>
          </button>`;
      }).join('');
      filtersEl.querySelectorAll('[data-filter]').forEach(btn => {
        btn.addEventListener('click', () => {
          adminOrdersFilter = btn.getAttribute('data-filter');
          renderAdminOrders();
        });
      });
    }

    if (statsEl) {
      const totalSpent = orders.reduce((s, o) => s + (Number(o.total) || 0), 0);
      statsEl.innerHTML = `<i class="bi bi-cash-coin"></i> S/ ${totalSpent.toFixed(2)} en <strong>${orders.length}</strong> pedidos`;
    }

    // Lista filtrada
    let visible;
    if (adminOrdersFilter === 'todos') {
      visible = orders;
    } else if (adminOrdersFilter === 'pendiente_confirmacion') {
      visible = orders.filter(o => !isOrderConfirmed(o));
    } else {
      visible = orders.filter(o => isOrderConfirmed(o) && currentStageKey(o) === adminOrdersFilter);
    }

    if (!visible.length) {
      listEl.innerHTML = `
        <div class="admin-empty">
          <i class="bi bi-bag"></i>
          <p>${orders.length === 0 ? 'Aún no hay pedidos registrados.' : 'Ningún pedido coincide con el filtro activo.'}</p>
        </div>`;
      return;
    }

    listEl.innerHTML = visible.map(renderAdminOrder).join('');

    // Cablear click en pills de etapa + botones
    listEl.querySelectorAll('[data-stage]').forEach(btn => {
      btn.addEventListener('click', () => {
        const { stage, email, orderId } = btn.dataset;
        updateOrderStage(email, orderId, stage);
        renderAdminOrders();
        if (window.showToast) window.showToast(`Pedido movido a: ${stage}`, 'success');
      });
    });
    listEl.querySelectorAll('[data-admin-order-reset]').forEach(btn => {
      btn.addEventListener('click', () => {
        const { email, orderId } = btn.dataset;
        const map = loadOrdersMap();
        if (!Array.isArray(map[email])) return;
        const idx = map[email].findIndex(o => o.id === orderId);
        if (idx === -1) return;
        delete map[email][idx].stageKey;
        if (map[email][idx].status === 'entregado') map[email][idx].status = 'pendiente';
        saveOrdersMap(map);
        renderAdminOrders();
        if (window.showToast) window.showToast('Etapa restaurada al cálculo automático', 'info');
      });
    });
    listEl.querySelectorAll('[data-admin-order-delete]').forEach(btn => {
      btn.addEventListener('click', () => {
        const { email, orderId } = btn.dataset;
        if (!confirm('¿Eliminar este pedido? Esta acción no se puede deshacer.')) return;
        deleteOrder(email, orderId);
        renderAdminOrders();
        if (window.showToast) window.showToast('Pedido eliminado', 'info');
      });
    });
    // Botón "Confirmar pedido" — solo aparece para los pedidos pendientes
    listEl.querySelectorAll('[data-admin-order-confirm]').forEach(btn => {
      btn.addEventListener('click', () => {
        const { email, orderId } = btn.dataset;
        confirmOrder(email, orderId);
        renderAdminOrders();
        if (window.showToast) window.showToast('Pedido confirmado. El cliente ya lo verá en su cuenta.', 'success');
      });
    });
  }

  function renderAdminOrder(o) {
    const d = new Date(o.createdAt || Date.now());
    const date = d.toLocaleDateString('es-PE', { day: 'numeric', month: 'short', year: 'numeric' });
    const time = d.toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit' });
    const confirmed = isOrderConfirmed(o);
    const itemsPreview = (o.items || []).slice(0, 3).map(it =>
      `<img src="${escapeHtml(it.imagen || '')}" alt="" title="${escapeHtml(it.nombre)}" onerror="this.style.visibility='hidden'">`
    ).join('');
    const moreItems = (o.items || []).length > 3 ? `<span class="admin-order-more">+${o.items.length - 3}</span>` : '';

    // Header común
    const header = `
      <header class="admin-order-card-head">
        <div>
          <div class="admin-order-card-id">${escapeHtml(o.id)}${
            confirmed ? '' : ' <span class="admin-tag-custom admin-tag-pending">Por confirmar</span>'
          }</div>
          <div class="admin-order-card-meta">
            <i class="bi bi-person-circle"></i> ${escapeHtml(o._email)}
            <span class="admin-order-card-sep">·</span>
            ${date} ${time}
          </div>
        </div>
        <div class="admin-order-card-total">
          <span class="admin-order-card-preview">${itemsPreview}${moreItems}</span>
          <strong>S/ ${Number(o.total || 0).toFixed(2)}</strong>
        </div>
      </header>`;

    // Pedido pendiente: NO mostramos timeline; solo botón Confirmar (+ eliminar).
    if (!confirmed) {
      return `
        <article class="admin-order-card admin-order-card-pending">
          ${header}
          <div class="admin-order-pending-body">
            <i class="bi bi-hourglass-split"></i>
            <div>
              <strong>Esperando tu confirmación</strong>
              <span>El cliente envió el pedido por WhatsApp. Confírmalo cuando hayas validado pago / stock — recién entonces aparecerá en su cuenta y arrancará el timeline de envío.</span>
            </div>
          </div>
          <footer class="admin-order-card-foot">
            <button class="admin-btn-primary" type="button"
                    data-admin-order-confirm
                    data-email="${escapeHtml(o._email)}"
                    data-order-id="${escapeHtml(o.id)}">
              <i class="bi bi-check2-circle"></i> Confirmar pedido
            </button>
            <button class="admin-btn-icon" type="button"
                    data-admin-order-delete
                    data-email="${escapeHtml(o._email)}"
                    data-order-id="${escapeHtml(o.id)}"
                    aria-label="Eliminar pedido"><i class="bi bi-trash3"></i></button>
          </footer>
        </article>`;
    }

    // Pedido confirmado: timeline de envío
    const activeKey = currentStageKey(o);
    const activeIdx = ADMIN_STAGES.findIndex(s => s.key === activeKey);
    const manual = !!o.stageKey;

    const stepsHtml = ADMIN_STAGES.map((s, i) => {
      let state = 'pending';
      if (i < activeIdx) state = 'done';
      else if (i === activeIdx) state = 'current';
      return `
        <button class="admin-stage-pill is-${state}"
                data-stage="${s.key}" data-email="${escapeHtml(o._email)}" data-order-id="${escapeHtml(o.id)}"
                type="button" title="${s.title}">
          <i class="bi ${s.icon}"></i>
          <span>${s.short}</span>
        </button>`;
    }).join('');

    return `
      <article class="admin-order-card">
        ${header}
        <div class="admin-order-stages-wrap">
          <div class="admin-order-stages-label">
            Avance del envío
            ${manual
              ? '<span class="admin-tag-custom admin-tag-edit">Manual</span>'
              : '<span class="admin-tag-custom">Auto por fecha</span>'}
          </div>
          <div class="admin-order-stages">${stepsHtml}</div>
        </div>

        <footer class="admin-order-card-foot">
          ${manual
            ? `<button class="admin-btn-ghost" type="button" data-admin-order-reset data-email="${escapeHtml(o._email)}" data-order-id="${escapeHtml(o.id)}"><i class="bi bi-arrow-counterclockwise"></i> Volver a automático</button>`
            : ''}
          <button class="admin-btn-icon" type="button" data-admin-order-delete data-email="${escapeHtml(o._email)}" data-order-id="${escapeHtml(o.id)}" aria-label="Eliminar pedido"><i class="bi bi-trash3"></i></button>
        </footer>
      </article>`;
  }

  function escapeHtml(s) {
    return String(s || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
  }

  /* Re-renderiza TODO lo que dependa de window.products / window.brands. */
  function refreshAllAdminViews() {
    renderDashboard();
    renderProductsTable();
    renderBrandsTable();
    renderSlidesList();
    renderAdminOrders();
    const psel = document.querySelector('#productForm [name="marca"]');
    if (psel) {
      const current = psel.value;
      psel.innerHTML = buildBrandOptions();
      if (current) psel.value = current;
    }
  }

  /* Fetch directo desde Supabase — no depende del evento data-ready ni del
   * timing de data.js. Si hay backend, lo consulta explícitamente y pisa
   * los arrays globales con la fuente de verdad. */
  async function fetchFromBackend() {
    if (!window.LuApi || !window.LuApi.isRemote || !window.LuApi.isRemote()) return;
    try {
      const [remoteBrands, remoteProducts, remoteSlides] = await Promise.all([
        window.LuApi.listBrands(),
        window.LuApi.listProducts(),
        window.LuApi.listSlides()
      ]);
      if (Array.isArray(remoteBrands)) {
        (window.brands || []).splice(0, (window.brands || []).length, ...remoteBrands);
      }
      if (Array.isArray(remoteProducts)) {
        (window.products || []).splice(0, (window.products || []).length, ...remoteProducts);
      }
      // Guardamos slides en localStorage admin también (admin.js los lee de ahí)
      if (Array.isArray(remoteSlides) && remoteSlides.length) {
        try { localStorage.setItem('lunabi_admin_slides', JSON.stringify(remoteSlides)); } catch (e) {}
      }
      console.log('[admin] backend sync', {
        brands:   remoteBrands.length,
        products: remoteProducts.length,
        slides:   remoteSlides.length
      });
      refreshAllAdminViews();
    } catch (e) {
      console.warn('[admin] fetchFromBackend failed', e);
    }
  }

  /* ---------- STAT DETAIL MODAL ----------
   * Cada KPI del dashboard abre el mismo modal con una tabla de detalle
   * construida al vuelo según el tipo. Evita duplicar UI — una sola
   * vista de tabla, 8 proyecciones distintas sobre los mismos datos. */
  const STAT_DETAIL_CFG = {
    products: {
      title: 'Productos del catálogo',
      sub: 'Todos los productos disponibles en la tienda.',
      icon: 'bi-box-seam',
      empty: 'Aún no hay productos cargados.',
      build: () => {
        const ps = [...(window.products || [])].sort((a, b) => b.id - a.id);
        const bs = window.brands || [];
        return {
          head: ['', 'Nombre', 'Marca', 'Categoría', 'Precio', 'Estado'],
          rows: ps.map(p => {
            const b = bs.find(x => x.slug === p.marca);
            const antes = Number(p.precioAntes) || 0;
            const ahora = Number(p.precio) || 0;
            const pct = antes > ahora && antes > 0 ? Math.round((antes - ahora) / antes * 100) : 0;
            const pills = [];
            if (p.masVendido) pills.push('<span class="admin-stat-pill warn">Viral</span>');
            if (pct > 0) pills.push(`<span class="admin-stat-pill sale">-${pct}%</span>`);
            else if (p.enOferta) pills.push('<span class="admin-stat-pill sale">Oferta</span>');
            if (!pills.length) pills.push('<span class="admin-stat-pill">Activo</span>');
            return [
              `<img src="${(p.imagenes && p.imagenes[0]) || ''}" alt="" onerror="this.style.visibility='hidden'">`,
              escapeHtml(p.nombre || ''),
              escapeHtml(b ? b.nombre : (p.marca || '—')),
              escapeHtml(p.categoria || '—') + (p.subcategoria ? ` · ${escapeHtml(p.subcategoria)}` : ''),
              `S/ ${ahora.toFixed(2)}`,
              pills.join(' ')
            ];
          })
        };
      }
    },
    brands: {
      title: 'Marcas del catálogo',
      sub: 'Cuántos productos aporta cada marca a la tienda.',
      icon: 'bi-tag',
      empty: 'Aún no hay marcas cargadas.',
      build: () => {
        const bs = window.brands || [];
        const ps = window.products || [];
        const count = (slug) => ps.filter(p => p.marca === slug).length;
        const rows = bs.slice().sort((a, b) => count(b.slug) - count(a.slug));
        return {
          head: ['', 'Marca', 'Slug', 'Productos', 'Descripción'],
          rows: rows.map(b => ([
            b.logo ? `<img src="${b.logo}" alt="" onerror="this.style.visibility='hidden'">` : '',
            escapeHtml(b.nombre || ''),
            `<code>${escapeHtml(b.slug || '')}</code>`,
            `<strong>${count(b.slug)}</strong>`,
            escapeHtml((b.descripcion || '—').slice(0, 120))
          ]))
        };
      }
    },
    best: {
      title: 'Productos más vendidos',
      sub: 'Destacados como "viral" en la tienda.',
      icon: 'bi-star-fill',
      empty: 'Aún no hay productos marcados como más vendidos.',
      build: () => {
        const ps = (window.products || []).filter(p => p.masVendido);
        const bs = window.brands || [];
        return {
          head: ['', 'Nombre', 'Marca', 'Categoría', 'Precio'],
          rows: ps.map(p => {
            const b = bs.find(x => x.slug === p.marca);
            return [
              `<img src="${(p.imagenes && p.imagenes[0]) || ''}" alt="" onerror="this.style.visibility='hidden'">`,
              escapeHtml(p.nombre || ''),
              escapeHtml(b ? b.nombre : (p.marca || '—')),
              escapeHtml(p.categoria || '—'),
              `S/ ${Number(p.precio || 0).toFixed(2)}`
            ];
          })
        };
      }
    },
    sale: {
      title: 'Productos en oferta',
      sub: 'Productos con descuento activo o flag "enOferta".',
      icon: 'bi-percent',
      empty: 'Aún no hay productos en oferta.',
      build: () => {
        const ps = (window.products || []).filter(p =>
          p.enOferta || (p.precioAntes && p.precioAntes > p.precio));
        const bs = window.brands || [];
        return {
          head: ['', 'Nombre', 'Marca', 'Precio antes', 'Precio ahora', 'Descuento'],
          rows: ps.map(p => {
            const b = bs.find(x => x.slug === p.marca);
            const antes = Number(p.precioAntes) || 0;
            const ahora = Number(p.precio) || 0;
            const pct = antes > 0 ? Math.round((antes - ahora) / antes * 100) : 0;
            return [
              `<img src="${(p.imagenes && p.imagenes[0]) || ''}" alt="" onerror="this.style.visibility='hidden'">`,
              escapeHtml(p.nombre || ''),
              escapeHtml(b ? b.nombre : (p.marca || '—')),
              antes ? `<s>S/ ${antes.toFixed(2)}</s>` : '—',
              `<strong>S/ ${ahora.toFixed(2)}</strong>`,
              pct > 0 ? `<span class="admin-stat-pill sale">-${pct}%</span>` : '—'
            ];
          })
        };
      }
    },
    value: {
      title: 'Valor del catálogo',
      sub: 'Precio actual de cada producto — la suma es el valor total.',
      icon: 'bi-cash-coin',
      empty: 'Aún no hay productos cargados.',
      build: () => {
        const ps = [...(window.products || [])].sort((a, b) => (Number(b.precio) || 0) - (Number(a.precio) || 0));
        const bs = window.brands || [];
        const total = ps.reduce((s, p) => s + (Number(p.precio) || 0), 0);
        return {
          head: ['', 'Nombre', 'Marca', 'Precio', '% del total'],
          rows: ps.map(p => {
            const b = bs.find(x => x.slug === p.marca);
            const v = Number(p.precio) || 0;
            const pct = total > 0 ? (v / total * 100) : 0;
            return [
              `<img src="${(p.imagenes && p.imagenes[0]) || ''}" alt="" onerror="this.style.visibility='hidden'">`,
              escapeHtml(p.nombre || ''),
              escapeHtml(b ? b.nombre : (p.marca || '—')),
              `S/ ${v.toFixed(2)}`,
              `${pct.toFixed(1)}%`
            ];
          })
        };
      }
    },
    discount: {
      title: 'Descuentos activos',
      sub: 'Productos con precio anterior mayor al actual.',
      icon: 'bi-arrow-down-right-circle',
      empty: 'No hay descuentos activos.',
      build: () => {
        const ps = (window.products || []).filter(p => (Number(p.precioAntes) || 0) > (Number(p.precio) || 0));
        const bs = window.brands || [];
        const rows = ps.slice().sort((a, b) => {
          const da = (Number(a.precioAntes) || 0) - (Number(a.precio) || 0);
          const db = (Number(b.precioAntes) || 0) - (Number(b.precio) || 0);
          return db - da;
        });
        return {
          head: ['', 'Nombre', 'Antes', 'Ahora', 'Ahorro', '% off'],
          rows: rows.map(p => {
            const antes = Number(p.precioAntes) || 0;
            const ahora = Number(p.precio) || 0;
            const dif = antes - ahora;
            const pct = antes > 0 ? Math.round(dif / antes * 100) : 0;
            return [
              `<img src="${(p.imagenes && p.imagenes[0]) || ''}" alt="" onerror="this.style.visibility='hidden'">`,
              escapeHtml(p.nombre || ''),
              `<s>S/ ${antes.toFixed(2)}</s>`,
              `<strong>S/ ${ahora.toFixed(2)}</strong>`,
              `<span class="admin-stat-pill ok">S/ ${dif.toFixed(2)}</span>`,
              `<span class="admin-stat-pill sale">-${pct}%</span>`
            ];
          })
        };
      }
    },
    slides: {
      title: 'Diapositivas del carrusel',
      sub: 'Banners activos en el home de la tienda.',
      icon: 'bi-images',
      empty: 'Aún no hay diapositivas personalizadas (se muestra el carrusel por defecto).',
      build: () => {
        const slides = load(STORE_SLIDES);
        return {
          head: ['', 'Título', 'Descripción', 'Botón', 'Enlace', 'Badge'],
          rows: slides.map(s => ([
            s.imagen ? `<img src="${s.imagen}" alt="" onerror="this.style.visibility='hidden'">` : '',
            escapeHtml(s.titulo || '—'),
            escapeHtml((s.descripcion || '—').slice(0, 100)),
            escapeHtml(s.botonTexto || '—'),
            `<code>${escapeHtml(s.botonLink || '#')}</code>`,
            s.badge ? `<span class="admin-stat-pill">${escapeHtml(s.badge)}</span>` : '—'
          ]))
        };
      }
    },
    users: {
      title: 'Usuarios registrados',
      sub: 'Cuentas creadas en la tienda (locales).',
      icon: 'bi-people',
      empty: 'Aún no hay usuarios registrados.',
      build: () => {
        let users = [];
        try { users = JSON.parse(localStorage.getItem('lunabi_users') || '[]'); }
        catch (e) { users = []; }
        return {
          head: ['#', 'Nombre', 'Email', 'Registro'],
          rows: (users || []).map((u, i) => ([
            `<strong>${i + 1}</strong>`,
            escapeHtml(u.nombre || '—'),
            `<code>${escapeHtml(u.email || '—')}</code>`,
            u.createdAt ? new Date(u.createdAt).toLocaleDateString('es-PE', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'
          ]))
        };
      }
    }
  };

  function openStatDetail(type) {
    const cfg = STAT_DETAIL_CFG[type];
    const modalEl = document.getElementById('statDetailModal');
    if (!cfg || !modalEl || !window.bootstrap) return;

    const titleEl = document.getElementById('statDetailTitle');
    const subEl = document.getElementById('statDetailSub');
    const iconEl = document.getElementById('statDetailIcon');
    const headEl = document.getElementById('statDetailHead');
    const bodyEl = document.getElementById('statDetailBody');
    const emptyEl = document.getElementById('statDetailEmpty');
    const countEl = document.getElementById('statDetailCount');
    const tableEl = document.getElementById('statDetailTable');

    if (titleEl) titleEl.textContent = cfg.title;
    if (subEl) subEl.textContent = cfg.sub;
    if (iconEl) iconEl.innerHTML = `<i class="bi ${cfg.icon}"></i>`;

    // Hereda el color del card clickeado para el icono del modal
    const srcCard = document.querySelector(`.admin-stat[data-detail="${type}"]`);
    if (iconEl && srcCard) {
      const srcIcon = srcCard.querySelector('.admin-stat-icon');
      if (srcIcon) iconEl.style.background = getComputedStyle(srcIcon).background;
    }

    const { head, rows } = cfg.build();
    if (headEl) headEl.innerHTML = head.map(h => `<th>${h}</th>`).join('');
    if (bodyEl) bodyEl.innerHTML = rows.map(r =>
      `<tr>${r.map(c => `<td>${c == null ? '' : c}</td>`).join('')}</tr>`
    ).join('');

    const isEmpty = rows.length === 0;
    if (tableEl) tableEl.hidden = isEmpty;
    if (emptyEl) {
      emptyEl.hidden = !isEmpty;
      emptyEl.textContent = cfg.empty;
    }
    if (countEl) countEl.textContent = isEmpty ? '' : `${rows.length} ${rows.length === 1 ? 'registro' : 'registros'}`;

    bootstrap.Modal.getOrCreateInstance(modalEl).show();
  }

  function initStatDetail() {
    document.querySelectorAll('.admin-stat[data-detail]').forEach(el => {
      el.addEventListener('click', () => openStatDetail(el.dataset.detail));
    });
  }

  /* ---------- OFFER TIMER (admin) ----------
   * Form con título, subtítulo, fecha objetivo, CTA y colores. Se persiste
   * en site_settings (key: 'offer_timer') vía LuApi.setSetting + fallback
   * en localStorage (lunabi_settings_offer_timer). */
  const OFFER_TIMER_KEY = 'offer_timer';
  function offerTimerLocalDefault() {
    return {
      active: false,
      titulo: '¡Oferta especial!',
      subtitulo: 'Descuentos por tiempo limitado en tus favoritos',
      target: '',
      ctaText: 'Ver ofertas',
      ctaLink: 'sale.html',
      bgColor: '',
      textColor: ''
    };
  }
  function toLocalDatetimeInput(iso) {
    if (!iso) return '';
    const d = new Date(iso);
    if (isNaN(d.getTime())) return '';
    const off = d.getTimezoneOffset() * 60000;
    return new Date(d.getTime() - off).toISOString().slice(0, 16);
  }
  function fromLocalDatetimeInput(local) {
    if (!local) return '';
    const d = new Date(local);
    return isNaN(d.getTime()) ? '' : d.toISOString();
  }

  async function loadOfferTimerToForm() {
    const form = document.getElementById('offerTimerForm');
    if (!form) return;
    let cfg = offerTimerLocalDefault();
    try {
      let saved = null;
      if (window.LuApi && window.LuApi.getSetting) {
        saved = await window.LuApi.getSetting(OFFER_TIMER_KEY);
      }
      if (!saved) {
        saved = JSON.parse(localStorage.getItem('lunabi_settings_' + OFFER_TIMER_KEY) || 'null');
      }
      if (saved) cfg = { ...cfg, ...saved };
    } catch (e) { /* default */ }
    form.querySelector('[name="active"]').checked      = !!cfg.active;
    form.querySelector('[name="titulo"]').value        = cfg.titulo || '';
    form.querySelector('[name="subtitulo"]').value     = cfg.subtitulo || '';
    form.querySelector('[name="target"]').value        = toLocalDatetimeInput(cfg.target);
    form.querySelector('[name="ctaText"]').value       = cfg.ctaText || '';
    form.querySelector('[name="ctaLink"]').value       = cfg.ctaLink || '';
    writeColorVal(form, 'bgColor',   cfg.bgColor   || '');
    writeColorVal(form, 'textColor', cfg.textColor || '');
  }

  function initOfferTimerForm() {
    const form = document.getElementById('offerTimerForm');
    if (!form) return;
    form.querySelectorAll('.admin-image-input').forEach(wireImageInput);
    initColorInputs(form);

    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const fd = new FormData(form);
      const cfg = {
        active:    form.querySelector('[name="active"]').checked,
        titulo:    (fd.get('titulo') || '').trim(),
        subtitulo: (fd.get('subtitulo') || '').trim(),
        target:    fromLocalDatetimeInput(fd.get('target')),
        ctaText:   (fd.get('ctaText') || '').trim(),
        ctaLink:   (fd.get('ctaLink') || '').trim(),
        bgColor:   readColorVal(form, 'bgColor'),
        textColor: readColorVal(form, 'textColor')
      };
      if (cfg.active && !cfg.target) {
        if (window.showToast) window.showToast('Elige una fecha y hora de finalización', 'info');
        return;
      }
      try {
        if (window.LuApi && window.LuApi.setSetting) {
          await window.LuApi.setSetting(OFFER_TIMER_KEY, cfg);
        } else {
          localStorage.setItem('lunabi_settings_' + OFFER_TIMER_KEY, JSON.stringify(cfg));
        }
        if (window.showToast) window.showToast(cfg.active ? 'Temporizador activado' : 'Temporizador guardado', 'success');
      } catch (err) {
        console.warn('[admin] guardar temporizador', err);
        if (window.showToast) window.showToast('Error al guardar el temporizador', 'info');
      }
    });

    const previewBtn = document.getElementById('offerTimerPreviewBtn');
    if (previewBtn) previewBtn.addEventListener('click', () => window.open('index.html', '_blank'));

    loadOfferTimerToForm();
  }

  /* ---------- INIT ---------- */
  function initAdmin() {
    if (!document.body || document.body.dataset.page !== 'admin') return;
    initTabs();
    initProductsForm();
    initSlidesForm();
    initBrandsForm();
    initStatDetail();
    initOfferTimerForm();
    refreshAllAdminViews();

    // Consulta Supabase directamente (espera hasta 5s a que LuApi cargue)
    let tries = 0;
    const waitForApi = setInterval(() => {
      tries++;
      if (window.LuApi) {
        clearInterval(waitForApi);
        fetchFromBackend();
      } else if (tries > 100) {
        clearInterval(waitForApi);
      }
    }, 50);

    // También escuchamos el evento por si data.js logra rehidratar antes
    document.addEventListener('lunabi:data-ready', refreshAllAdminViews);
  }

  window.initAdmin = initAdmin;
})();
