/* ===== LÜNABI — Mi Cuenta =====
 *
 * Página de usuario: pedidos guardados, favoritos, rutina del test y perfil.
 * Requiere sesión activa (lunabi_session). Si no hay, se muestra el gate.
 *
 * Fuentes de datos (localStorage):
 *   - lunabi_session           → usuario activo
 *   - lunabi_users             → registro completo (para member-since)
 *   - lunabi_orders            → { [email]: Order[] } persistido por carrito.js
 *   - lunabi_favs              → [productId]  (compartido global, asumimos user)
 *   - lunabi_skintest          → { [email]: { answers, productIds, createdAt } }
 *
 * Punto de extensión backend: reemplazar get/set por fetch a /api/*. */

(function() {

  const LEVELS = [
    { key: 'bronce',  name: 'Bronce',  min: 0,    next: 200,  class: 'lv-bronce' },
    { key: 'plata',   name: 'Plata',   min: 200,  next: 500,  class: 'lv-plata' },
    { key: 'oro',     name: 'Oro',     min: 500,  next: 1000, class: 'lv-oro' },
    { key: 'platino', name: 'Platino', min: 1000, next: null, class: 'lv-platino' }
  ];
  function getLevel(spent) {
    let lv = LEVELS[0];
    for (const l of LEVELS) { if (spent >= l.min) lv = l; }
    const progress = lv.next
      ? Math.min(100, ((spent - lv.min) / (lv.next - lv.min)) * 100)
      : 100;
    return { ...lv, progress };
  }

  function loadJSON(key, fallback) {
    try { return JSON.parse(localStorage.getItem(key) || JSON.stringify(fallback)); }
    catch (e) { return fallback; }
  }
  function saveJSON(key, val) {
    try { localStorage.setItem(key, JSON.stringify(val)); } catch (e) { /* cuota */ }
  }
  function escapeHtml(s) {
    return String(s || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
  }

  function getSession() { return loadJSON('lunabi_session', null); }
  function getMyOrders(email) {
    const all = loadJSON('lunabi_orders', {});
    return Array.isArray(all[email]) ? all[email] : [];
  }
  function setMyOrders(email, list) {
    const all = loadJSON('lunabi_orders', {});
    all[email] = list;
    saveJSON('lunabi_orders', all);
  }
  function getMyTest(email) {
    const all = loadJSON('lunabi_skintest', {});
    return all[email] || null;
  }
  function getFavs() { return loadJSON('lunabi_favs', []); }
  function getMemberSince(email) {
    const users = loadJSON('lunabi_users', []);
    const u = users.find(x => x.email === email);
    return u ? u.createdAt : null;
  }

  /* ==========================================================
   * RENDER
   * ========================================================== */

  function renderHero(user) {
    const name = user.nombre || 'Usuaria';
    const first = (name.trim().split(/\s+/)[0] || '?').toUpperCase().slice(0, 1);
    document.getElementById('cuentaAvatar').textContent = first;
    document.getElementById('cuentaName').textContent = name;
    const emailEl = document.getElementById('cuentaEmail');
    const sinceChip = document.getElementById('cuentaSince').parentElement;
    if (user.isGuest) {
      emailEl.textContent = 'Modo invitado · inicia sesión para guardar tus datos';
      if (sinceChip) sinceChip.style.display = 'none';
    } else {
      emailEl.textContent = user.email;
      if (sinceChip) sinceChip.style.display = '';
      const since = getMemberSince(user.email);
      document.getElementById('cuentaSince').textContent = since
        ? new Date(since).toLocaleDateString('es-PE', { day: 'numeric', month: 'long', year: 'numeric' })
        : '—';
    }
  }

  function renderStats(session) {
    // Solo cuentan los pedidos ya confirmados por el admin (los pendientes
    // de confirmación aún no son ventas efectivas para el cliente).
    const orders = getMyOrders(session.email).filter(isOrderConfirmed);
    const totalSpent = orders.reduce((s, o) => s + (Number(o.total) || 0), 0);
    const favs = getFavs();
    const test = getMyTest(session.email);

    const set = (id, v) => { const el = document.getElementById(id); if (el) el.textContent = v; };
    set('cuentaStatOrders', orders.length);
    set('cuentaStatSpent',  'S/ ' + totalSpent.toFixed(2));
    set('cuentaStatFavs',   favs.length);
    set('cuentaStatRoutine', test ? `${test.productIds.length} pasos` : '—');
    set('cuentaFavChip',    favs.length);

    // Level
    const lv = getLevel(totalSpent);
    const badge = document.getElementById('cuentaLevelBadge');
    badge.classList.remove('lv-bronce', 'lv-plata', 'lv-oro', 'lv-platino');
    badge.classList.add(lv.class);
    const lvIcon = lv.key === 'platino' ? 'bi-gem'
                : lv.key === 'oro'      ? 'bi-award-fill'
                : lv.key === 'plata'    ? 'bi-trophy-fill'
                :                         'bi-star-fill';
    badge.innerHTML = `<i class="bi ${lvIcon}"></i><span>${lv.name}</span>`;
    document.getElementById('cuentaLevelFill').style.width = lv.progress + '%';
    document.getElementById('cuentaLevelHint').textContent = lv.next
      ? `S/ ${(lv.next - totalSpent).toFixed(2)} para ${nextLevelName(lv)}`
      : '¡Nivel máximo alcanzado! 🌟';
  }
  function nextLevelName(lv) {
    const idx = LEVELS.findIndex(l => l.key === lv.key);
    return LEVELS[idx + 1] ? LEVELS[idx + 1].name : '—';
  }

  /* ---------- SEGUIMIENTO DE ENVÍO ----------
   * Dos tramos: primero internacional (Corea → Perú + aduana), luego
   * nacional (courier local → entrega). Las fechas se estiman sobre el
   * createdAt del pedido usando el rango oficial de 15-20 días hábiles. */
  const SHIPMENT_STAGES = [
    { key: 'confirmado',    title: 'Pedido confirmado',   hint: 'Pago validado e inicio del proceso.',       icon: 'bi-check-circle-fill', hoursAfter: 0,   leg: 'int' },
    { key: 'preparacion',   title: 'En preparación',      hint: 'Gestionamos tu pedido con el proveedor.',   icon: 'bi-box-seam',          hoursAfter: 24,  leg: 'int' },
    { key: 'internacional', title: 'Envío internacional', hint: 'En tránsito desde Corea hacia Perú.',       icon: 'bi-airplane-engines',  hoursAfter: 72,  leg: 'int' },
    { key: 'aduana',        title: 'En aduana',           hint: 'Trámites de importación en Lima.',          icon: 'bi-building-check',    hoursAfter: 264, leg: 'int' },
    { key: 'nacional',      title: 'Envío nacional',      hint: 'Courier local rumbo a tu dirección.',       icon: 'bi-truck',             hoursAfter: 360, leg: 'nac' },
    { key: 'entregado',     title: 'Entregado',           hint: '¡Tu pedido llegó!',                          icon: 'bi-bag-check-fill',    hoursAfter: 432, leg: 'nac' }
  ];

  function computeStages(order) {
    // El timeline empieza cuando el admin confirma el pedido (confirmedAt).
    // Si no hay confirmedAt, fallback a createdAt para pedidos legacy.
    const startMs = order.confirmedAt || order.createdAt || 0;
    const elapsedH = (Date.now() - startMs) / 3600000;
    const delivered = order.status === 'entregado';
    // Si el admin marcó una etapa manual (order.stageKey), usamos esa para
    // fijar qué pasos están hechos vs. actual. Si no, inferimos por tiempo.
    const manualIdx = order.stageKey
      ? SHIPMENT_STAGES.findIndex(s => s.key === order.stageKey)
      : -1;

    return SHIPMENT_STAGES.map((s, i) => {
      const next = SHIPMENT_STAGES[i + 1];
      let state;

      if (delivered) {
        state = (i === SHIPMENT_STAGES.length - 1) ? 'current' : 'done';
      } else if (manualIdx >= 0) {
        if (i < manualIdx)       state = 'done';
        else if (i === manualIdx) state = 'current';
        else                      state = 'pending';
      } else {
        if (next && elapsedH >= next.hoursAfter) state = 'done';
        else if (elapsedH >= s.hoursAfter)        state = 'current';
        else                                       state = 'pending';
      }

      const expectedDate = new Date(startMs + s.hoursAfter * 3600000);
      return { ...s, state, expectedDate };
    });
  }

  /* Un pedido se considera "confirmado por el admin" cuando:
   *  - Tiene confirmedAt (flujo nuevo), o
   *  - Su status pasó de 'pendiente' a otra cosa (legacy / sync remoto).
   * Mientras esté en 'pendiente' sin confirmar, NO se muestra en Mi cuenta. */
  function isOrderConfirmed(o) {
    if (!o) return false;
    if (o.confirmedAt) return true;
    return !!(o.status && o.status !== 'pendiente');
  }

  function inferStatus(order) {
    if (order.status === 'entregado') return 'entregado';
    const stages = computeStages(order);
    const current = stages.find(s => s.state === 'current');
    if (!current) return stages[0].key === 'entregado' ? 'entregado' : 'pendiente';
    if (current.key === 'entregado')     return 'entregado';
    if (current.key === 'nacional')      return 'enviado';
    if (current.leg === 'int')           return 'confirmado';
    return 'pendiente';
  }

  function renderTracking(order) {
    const stages = computeStages(order);
    const doneN = stages.filter(s => s.state === 'done').length;
    const curN  = stages.some(s => s.state === 'current') ? 0.5 : 0;
    const pct   = Math.min(100, ((doneN + curN) / stages.length) * 100);

    const intl = stages.filter(s => s.leg === 'int');
    const nac  = stages.filter(s => s.leg === 'nac');

    const fmtDate = (d) => d.toLocaleDateString('es-PE', { day: 'numeric', month: 'short' });

    const renderStep = (s) => {
      const prefix = s.state === 'pending' ? 'Estimado ' : '';
      const date = prefix + fmtDate(s.expectedDate);
      return `
        <div class="cuenta-tracking-step is-${s.state}">
          <div class="cuenta-tracking-dot"><i class="bi ${s.icon}"></i></div>
          <div class="cuenta-tracking-step-body">
            <div class="cuenta-tracking-step-title">${escapeHtml(s.title)}</div>
            <div class="cuenta-tracking-step-hint">${escapeHtml(s.hint)}</div>
          </div>
          <div class="cuenta-tracking-step-date">${date}</div>
        </div>`;
    };

    return `
      <details class="cuenta-tracking" open>
        <summary class="cuenta-tracking-summary">
          <span class="cuenta-tracking-title"><i class="bi bi-geo-alt"></i> Seguimiento del envío</span>
          <span class="cuenta-tracking-pct">${Math.round(pct)}%</span>
        </summary>
        <div class="cuenta-tracking-progress">
          <div class="cuenta-tracking-progress-fill" style="width:${pct}%"></div>
        </div>
        <div class="cuenta-tracking-legs">
          <div class="cuenta-tracking-leg leg-int">
            <div class="cuenta-tracking-leg-title"><i class="bi bi-globe-americas"></i> Tramo internacional <span class="cuenta-tracking-leg-sub">Corea → Perú</span></div>
            <div class="cuenta-tracking-steps">${intl.map(renderStep).join('')}</div>
          </div>
          <div class="cuenta-tracking-arrow" aria-hidden="true"><i class="bi bi-arrow-down"></i></div>
          <div class="cuenta-tracking-leg leg-nac">
            <div class="cuenta-tracking-leg-title"><i class="bi bi-flag-fill"></i> Tramo nacional <span class="cuenta-tracking-leg-sub">Dentro de Perú</span></div>
            <div class="cuenta-tracking-steps">${nac.map(renderStep).join('')}</div>
          </div>
        </div>
      </details>`;
  }

  /* ---------- PEDIDOS ---------- */
  function renderOrders(session) {
    const host = document.getElementById('cuentaPanelPedidos');
    // Solo mostramos pedidos que el admin ya confirmó. Los que enviaste por
    // WhatsApp pero aún están en cola (status='pendiente' sin confirmar)
    // se quedan ocultos hasta que el admin los procese.
    const allOrders = getMyOrders(session.email);
    const orders = allOrders.filter(isOrderConfirmed);
    const pendingCount = allOrders.length - orders.length;

    const hdr = `
      <div class="cuenta-panel-header">
        <h2 class="cuenta-panel-title"><i class="bi bi-bag-check"></i> Mis pedidos</h2>
        <span class="cuenta-rutina-tag"><i class="bi bi-receipt"></i> ${orders.length} ${orders.length === 1 ? 'pedido' : 'pedidos'}</span>
      </div>`;

    // Aviso cuando hay pedidos en cola de confirmación
    const pendingNote = pendingCount > 0
      ? `<div class="cuenta-pending-banner">
           <i class="bi bi-hourglass-split"></i>
           <div>
             <strong>${pendingCount} ${pendingCount === 1 ? 'pedido enviado, esperando confirmación' : 'pedidos enviados, esperando confirmación'}</strong>
             <span>Te avisaremos por WhatsApp en cuanto lo procesemos. Aquí aparecerá el detalle y el seguimiento.</span>
           </div>
         </div>`
      : '';

    if (!orders.length) {
      host.innerHTML = hdr + pendingNote + `
        <div class="cuenta-empty">
          <i class="bi bi-bag"></i>
          <h3>Aún no tienes pedidos confirmados</h3>
          <p>${pendingCount > 0
            ? 'Tu pedido fue recibido por WhatsApp. En cuanto lo confirmemos aparecerá aquí con el seguimiento.'
            : 'Cuando envíes tu primer pedido por WhatsApp, aparecerá aquí una vez confirmado.'}</p>
          <a href="skincare.html" class="cuenta-btn-primary"><i class="bi bi-stars"></i> Explorar productos</a>
        </div>`;
      return;
    }
    host.innerHTML = hdr + pendingNote + orders.map(renderOrder).join('');

    host.querySelectorAll('[data-repeat-order]').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = btn.getAttribute('data-repeat-order');
        const ord = orders.find(o => o.id === id);
        if (!ord) return;
        ord.items.forEach(it => {
          if (typeof window.addToCart === 'function') window.addToCart(it.id, it.qty);
        });
      });
    });
    host.querySelectorAll('[data-mark-received]').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = btn.getAttribute('data-mark-received');
        const list = getMyOrders(session.email);
        const idx = list.findIndex(o => o.id === id);
        if (idx > -1) {
          list[idx].status = 'entregado';
          setMyOrders(session.email, list);
          renderOrders(session);
          renderStats(session);
          if (window.showToast) window.showToast('Pedido marcado como entregado', 'success');
        }
      });
    });
  }

  function renderOrder(o) {
    const d = new Date(o.createdAt || Date.now());
    const date = d.toLocaleDateString('es-PE', { day: 'numeric', month: 'long', year: 'numeric' });
    const time = d.toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit' });
    // Si el usuario no marcó explícitamente "entregado", inferimos el status
    // a partir de las etapas de envío para que se actualice sola con el tiempo.
    const status = (o.status === 'entregado') ? 'entregado' : inferStatus(o);
    const statusLabel = { pendiente: 'Pendiente', confirmado: 'Confirmado', enviado: 'En camino', entregado: 'Entregado' }[status] || 'Pendiente';
    const statusIcon  = { pendiente: 'bi-hourglass-split', confirmado: 'bi-check-circle', enviado: 'bi-truck', entregado: 'bi-bag-check-fill' }[status] || 'bi-hourglass-split';

    return `
      <article class="cuenta-order">
        <header class="cuenta-order-head">
          <div>
            <div class="cuenta-order-id">${escapeHtml(o.id)}</div>
            <div class="cuenta-order-date">${date} · ${time}</div>
          </div>
          <span class="cuenta-order-status ${status}"><i class="bi ${statusIcon}"></i> ${statusLabel}</span>
        </header>
        <div class="cuenta-order-items">
          ${(o.items || []).map(it => `
            <div class="cuenta-order-item">
              <img src="${escapeHtml(it.imagen || '')}" alt="" onerror="this.style.visibility='hidden'">
              <div>
                <a class="cuenta-order-item-name" href="producto.html?id=${it.id}">${escapeHtml(it.nombre)}</a>
                <div class="cuenta-order-item-meta">${escapeHtml(it.marca || '')}</div>
              </div>
              <div class="cuenta-order-item-qty">${it.qty}× <strong>S/ ${Number(it.precio).toFixed(2)}</strong></div>
            </div>`).join('')}
        </div>
        ${renderTracking(o)}
        <footer class="cuenta-order-foot">
          <span class="cuenta-order-total">Total: S/ ${Number(o.total).toFixed(2)}</span>
          <div class="cuenta-order-actions">
            <button class="cuenta-order-btn" type="button" data-repeat-order="${escapeHtml(o.id)}"><i class="bi bi-arrow-repeat"></i> Repetir pedido</button>
            ${status !== 'entregado'
              ? `<button class="cuenta-order-btn" type="button" data-mark-received="${escapeHtml(o.id)}"><i class="bi bi-check2"></i> Marcar entregado</button>`
              : ''}
          </div>
        </footer>
      </article>`;
  }

  /* ---------- FAVORITOS ----------
   * Fuente de datos: localStorage siempre, + Supabase en modo remoto.
   * Hacemos unión para que funcione aun si alguno de los lados está
   * temporalmente desincronizado (ej. fav guardado en otro dispositivo
   * o fallo al sincronizar con Supabase por FK con producto admin). */
  async function renderFavoritos() {
    const host = document.getElementById('cuentaPanelFavoritos');

    // Muestra primero un esqueleto para evitar "parpadeo vacío"
    host.innerHTML = `
      <div class="cuenta-panel-header">
        <h2 class="cuenta-panel-title"><i class="bi bi-heart-fill"></i> Mis favoritos</h2>
      </div>
      <p class="cuenta-rutina-hint" style="text-align:center">Cargando tus favoritos…</p>`;

    // Empieza con favoritos locales
    let favIds = getFavs().map(Number).filter(Boolean);

    // Fusiona con los favoritos remotos (si estamos conectados)
    if (window.LuApi && window.LuApi.isRemote && window.LuApi.isRemote()) {
      try {
        const remote = await window.LuApi.listFavorites();
        if (Array.isArray(remote)) {
          const set = new Set(favIds.concat(remote.map(Number)).filter(Boolean));
          favIds = Array.from(set);
          // Persiste la unión de vuelta a localStorage (útil si entraste desde otro dispositivo)
          try { localStorage.setItem('lunabi_favs', JSON.stringify(favIds)); } catch (e) {}
        }
      } catch (e) { console.warn('[cuenta] favoritos remotos', e); }
    }

    const allProducts = window.products || [];
    const products = allProducts.filter(p => favIds.includes(Number(p.id)));

    const hdr = `
      <div class="cuenta-panel-header">
        <h2 class="cuenta-panel-title"><i class="bi bi-heart-fill"></i> Mis favoritos</h2>
        ${products.length ? `<button class="cuenta-btn-primary" id="favAddAll" type="button"><i class="bi bi-bag-plus"></i> Añadir todo al carrito</button>` : ''}
      </div>`;

    if (!products.length) {
      // Distingue: ¿tienes favoritos guardados pero los productos ya no existen?
      const reason = favIds.length
        ? '<p>Tus favoritos ya no están en el catálogo activo. Puede que hayan sido eliminados o estén fuera de stock.</p>'
        : '<p>Pulsa el corazón en cualquier producto para guardarlo aquí y no perderlo de vista.</p>';
      host.innerHTML = hdr + `
        <div class="cuenta-empty">
          <i class="bi bi-heart"></i>
          <h3>${favIds.length ? 'Favoritos no disponibles' : 'Sin favoritos aún'}</h3>
          ${reason}
          <a href="skincare.html" class="cuenta-btn-primary"><i class="bi bi-search"></i> Explorar productos</a>
        </div>`;
      return;
    }

    const grid = products.map((p, i) => window.renderProductCard(p, i)).join('');
    host.innerHTML = hdr + `<div class="row g-4">${grid}</div>`;
    if (typeof window.observeFadeUps === 'function') window.observeFadeUps();

    const allBtn = document.getElementById('favAddAll');
    if (allBtn) allBtn.addEventListener('click', () => {
      products.forEach(p => { if (typeof window.addToCart === 'function') window.addToCart(p.id, 1); });
    });
  }

  /* ---------- RUTINA ---------- */
  function renderRutina(session) {
    const host = document.getElementById('cuentaPanelRutina');
    const test = getMyTest(session.email);
    const hdr = `
      <div class="cuenta-panel-header">
        <h2 class="cuenta-panel-title"><i class="bi bi-stars"></i> Mi rutina</h2>
      </div>`;
    if (!test || !Array.isArray(test.productIds) || !test.productIds.length) {
      host.innerHTML = hdr + `
        <div class="cuenta-empty">
          <i class="bi bi-droplet-half"></i>
          <h3>Aún no has tomado el test</h3>
          <p>Responde 7 preguntas dermatológicas y recibe una rutina personalizada con productos del catálogo.</p>
          <button class="cuenta-btn-primary" id="startTestBtn" type="button"><i class="bi bi-magic"></i> Tomar el test</button>
        </div>`;
      const btn = document.getElementById('startTestBtn');
      if (btn) btn.addEventListener('click', () => {
        const float = document.getElementById('luSkinTestFloat');
        if (float) float.click();
      });
      return;
    }

    const prods = test.productIds.map(id => (window.products || []).find(p => p.id === id)).filter(Boolean);
    const ans = test.answers || {};
    const tags = [];
    if (ans.tipoPiel)     tags.push({ icon: 'bi-droplet-half', txt: ans.tipoPiel });
    if (ans.preocupacion) tags.push({ icon: 'bi-bullseye', txt: ans.preocupacion });
    if (ans.edad)         tags.push({ icon: 'bi-person', txt: ans.edad === '40plus' ? '40+' : ans.edad });
    if (ans.sol)          tags.push({ icon: 'bi-sun', txt: 'sol ' + ans.sol });
    const created = test.createdAt ? new Date(test.createdAt).toLocaleDateString('es-PE', { day: 'numeric', month: 'long', year: 'numeric' }) : '—';
    const total = prods.reduce((s, p) => s + Number(p.precio || 0), 0);

    host.innerHTML = hdr + `
      <div class="cuenta-rutina-card">
        <div class="cuenta-rutina-tags">
          ${tags.map(t => `<span class="cuenta-rutina-tag"><i class="bi ${t.icon}"></i> ${escapeHtml(t.txt)}</span>`).join('')}
        </div>
        <p class="cuenta-rutina-hint">Última actualización: <strong>${created}</strong> · ${prods.length} pasos · Total S/ ${total.toFixed(2)}</p>
        <div class="cuenta-rutina-steps">
          ${prods.map((p, i) => `
            <div class="cuenta-rutina-step">
              <div class="cuenta-rutina-step-n">${i + 1}</div>
              <div class="cuenta-rutina-step-img" style="background-image:url('${escapeHtml((p.imagenes||[])[0] || '')}')"></div>
              <div>
                <span class="cuenta-rutina-step-tag">${escapeHtml((window.SUBCAT_LABELS || {})[p.categoria] || p.categoria)}</span>
                <a class="cuenta-rutina-step-name" href="producto.html?id=${p.id}">${escapeHtml(p.nombre)}</a>
              </div>
              <div class="cuenta-rutina-step-price">S/ ${Number(p.precio).toFixed(2)}</div>
            </div>`).join('')}
        </div>
        <div class="cuenta-rutina-actions">
          <button class="cuenta-btn-primary" id="rutinaAddAll" type="button"><i class="bi bi-bag-plus"></i> Añadir toda la rutina (S/ ${total.toFixed(2)})</button>
          <button class="cuenta-btn-ghost" id="rutinaRetake" type="button"><i class="bi bi-arrow-clockwise"></i> Volver a hacer el test</button>
        </div>
      </div>`;

    const addAll = document.getElementById('rutinaAddAll');
    if (addAll) addAll.addEventListener('click', () => {
      prods.forEach(p => { if (typeof window.addToCart === 'function') window.addToCart(p.id, 1); });
    });
    const retake = document.getElementById('rutinaRetake');
    if (retake) retake.addEventListener('click', () => {
      const float = document.getElementById('luSkinTestFloat');
      if (float) float.click();
    });
  }

  /* ---------- PERFIL ---------- */
  function renderPerfil(user) {
    const host = document.getElementById('cuentaPanelPerfil');

    if (user.isGuest) {
      host.innerHTML = `
        <div class="cuenta-panel-header">
          <h2 class="cuenta-panel-title"><i class="bi bi-person-circle"></i> Perfil</h2>
        </div>
        <div class="cuenta-profile-card">
          <p class="cuenta-rutina-hint" style="margin-bottom:1rem">
            Estás navegando en <strong>modo invitado</strong>. Inicia sesión o crea una cuenta para:
          </p>
          <ul style="color:var(--text-main);font-size:0.9rem;line-height:1.8;padding-left:1.1rem;margin-bottom:1rem">
            <li>Guardar tus pedidos asociados a tu correo</li>
            <li>Acceder a tu historial desde cualquier dispositivo</li>
            <li>Recibir ofertas y novedades personalizadas</li>
          </ul>
          <div class="cuenta-profile-actions">
            <a class="cuenta-btn-primary" href="login.html"><i class="bi bi-box-arrow-in-right"></i> Iniciar sesión</a>
            <a class="cuenta-btn-ghost" href="registro.html"><i class="bi bi-person-plus"></i> Crear cuenta</a>
          </div>
        </div>`;
      return;
    }

    const since = getMemberSince(user.email);
    const sinceFmt = since
      ? new Date(since).toLocaleString('es-PE', { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })
      : '—';

    // Card extra solo para administradoras: acceso directo al panel.
    const adminCard = user.is_admin
      ? `
        <div class="cuenta-profile-card cuenta-admin-card">
          <div class="cuenta-admin-head">
            <div class="cuenta-admin-icon"><i class="bi bi-shield-check"></i></div>
            <div>
              <h3 class="cuenta-panel-title" style="font-size:1.05rem;margin:0">Acceso administrador</h3>
              <p class="cuenta-rutina-hint" style="margin:3px 0 0">Gestiona productos, pedidos, marcas y el carrusel del inicio.</p>
            </div>
          </div>
          <a href="admin.html" class="cuenta-btn-primary cuenta-admin-cta">
            <i class="bi bi-gear-fill"></i> Ir al panel de administrador
          </a>
        </div>`
      : '';

    host.innerHTML = `
      <div class="cuenta-panel-header">
        <h2 class="cuenta-panel-title"><i class="bi bi-person-circle"></i> Mi perfil</h2>
        ${user.is_admin ? '<span class="cuenta-rutina-tag" style="background:linear-gradient(135deg,#682ABF,#7732D9);color:#fff"><i class="bi bi-shield-check"></i> Admin</span>' : ''}
      </div>
      ${adminCard}
      <div class="cuenta-profile-card">
        <div class="cuenta-profile-row">
          <span class="cuenta-profile-label">Nombre</span>
          <span class="cuenta-profile-value">${escapeHtml(user.nombre || '—')}</span>
        </div>
        <div class="cuenta-profile-row">
          <span class="cuenta-profile-label">Correo electrónico</span>
          <span class="cuenta-profile-value">${escapeHtml(user.email || '—')}</span>
        </div>
        <div class="cuenta-profile-row">
          <span class="cuenta-profile-label">Miembro desde</span>
          <span class="cuenta-profile-value">${sinceFmt}</span>
        </div>
      </div>
      <div class="cuenta-profile-card">
        <div class="cuenta-panel-header" style="margin-bottom:0.6rem">
          <h3 class="cuenta-panel-title" style="font-size:1rem"><i class="bi bi-gear"></i> Acciones</h3>
        </div>
        <p class="cuenta-rutina-hint">Cuando conectemos el backend podrás cambiar nombre, email y contraseña desde aquí.</p>
        <div class="cuenta-profile-actions">
          <button class="cuenta-danger-btn" id="btnLogout" type="button"><i class="bi bi-box-arrow-right"></i> Cerrar sesión</button>
        </div>
      </div>`;

    const btn = document.getElementById('btnLogout');
    if (btn) btn.addEventListener('click', async () => {
      if (!confirm('¿Seguro que quieres cerrar sesión?')) return;
      // Cerrar sesión en Supabase también (si estamos en modo remoto)
      if (window.LuApi && window.LuApi.isRemote && window.LuApi.isRemote()) {
        try { await window.LuApi.signOut(); } catch (e) { /* noop */ }
      }
      localStorage.removeItem('lunabi_session');
      window.location.href = 'index.html';
    });
  }

  /* ---------- TABS ---------- */
  function initTabs() {
    const tabs = document.querySelectorAll('.cuenta-tab');
    const panels = document.querySelectorAll('.cuenta-panel');
    tabs.forEach(t => t.addEventListener('click', () => {
      const key = t.dataset.cuentaTab;
      tabs.forEach(x => x.classList.toggle('active', x === t));
      panels.forEach(p => p.classList.toggle('active', p.dataset.cuentaPanel === key));
    }));
  }

  /* Si hay sesión activa, la usamos. Si no, armamos un perfil "Invitada"
   * que lee pedidos/tests desde la clave `guest` (carrito.js y skintest.js
   * usan esa misma clave cuando no hay sesión). */
  function resolveUser() {
    const session = getSession();
    if (session && session.email) return { ...session, isGuest: false };
    return {
      nombre: 'Invitada',
      email:  'guest',
      createdAt: null,
      isGuest: true
    };
  }

  /* ---------- INIT ---------- */
  function initCuenta() {
    if (!document.body || document.body.dataset.page !== 'cuenta') return;
    const user = resolveUser();

    document.title = `${user.isGuest ? 'Mi cuenta' : user.nombre} | Lünabi`;

    renderHero(user);
    renderStats(user);
    initTabs();
    renderOrders(user);
    renderFavoritos();
    renderRutina(user);
    renderPerfil(user);

    // Re-render del panel de favoritos cuando:
    //   - el usuario toca cualquier corazón (en esta u otra vista del sitio)
    //   - llega la rehidratación del catálogo desde Supabase (lunabi:data-ready)
    document.addEventListener('lunabi:favs-changed', () => {
      renderFavoritos();
      renderStats(user);
    });
    document.addEventListener('lunabi:data-ready', () => {
      renderFavoritos();
      renderOrders(user);
      renderRutina(user);
    });
  }

  window.initCuenta = initCuenta;
})();
