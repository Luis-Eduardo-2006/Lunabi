/* ===== LÜNABI — SkinTest =====
 *
 * Módulo auto-inyectado cargado dinámicamente por components.js:
 *   - Inyecta un botón flotante con el logo (encima del botón de WhatsApp).
 *   - Inyecta el modal del test con preguntas, barra de progreso y resultado.
 *   - Lógica: responde 7 preguntas con bases dermatológicas → se genera
 *     una rutina de 5-6 pasos usando productos del catálogo (window.products).
 *
 * Guía dermatológica detrás de cada paso:
 *   1. Limpieza: primera línea de defensa. El tipo (aceite/foam) depende de la piel.
 *   2. Tónico:   re-balancea pH y prepara absorción. Calma pieles sensibles.
 *   3. Serum:    vehículo del ingrediente activo para la preocupación principal.
 *   4. Hidratante: sella activos y refuerza la barrera (ceramidas/péptidos).
 *   5. SPF:      el paso más importante en anti-aging y prevención de manchas.
 *   6. Noche/extras: contorno de ojos o sleeping mask si aplica por edad/concern.
 */

(function() {
  if (window.__luSkinTestLoaded) return;
  window.__luSkinTestLoaded = true;

  /* ================================================================
   * MARKUP — botón flotante + modal
   * ================================================================ */
  const FLOAT_HTML = `
    <button class="lu-float" type="button" id="luSkinTestFloat" aria-label="Descubre tu rutina">
      <span class="lu-float-dot" aria-hidden="true"></span>
      <span class="lu-float-inner">
        <img src="img/logo/logo.webp" alt="Lünabi" onerror="this.style.display='none'">
      </span>
      <span class="lu-float-tooltip">Descubre tu rutina</span>
    </button>`;

  const MODAL_HTML = `
    <div class="modal fade skintest-modal" id="skinTestModal" tabindex="-1" aria-hidden="true">
      <div class="modal-dialog modal-lg modal-dialog-centered modal-dialog-scrollable">
        <div class="modal-content">
          <div class="modal-header">
            <h5 class="modal-title"><i class="bi bi-stars"></i> Tu rutina ideal Lünabi</h5>
            <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Cerrar"></button>
          </div>
          <div class="modal-body">
            <div class="skintest-progress-wrap">
              <div class="skintest-progress"><div class="skintest-progress-fill" id="skintestProgressFill"></div></div>
              <span class="skintest-progress-text" id="skintestProgressText">Pregunta 1 de 7</span>
            </div>
            <div class="skintest-stage" id="skintestStage"></div>
          </div>
          <div class="modal-footer">
            <button class="skintest-btn-back" id="skintestBack" type="button"><i class="bi bi-arrow-left"></i> Anterior</button>
            <button class="skintest-btn-next" id="skintestNext" type="button" disabled>Siguiente <i class="bi bi-arrow-right"></i></button>
          </div>
        </div>
      </div>
    </div>`;

  /* ================================================================
   * PREGUNTAS — con base dermatológica
   * ================================================================ */
  const QUESTIONS = [
    {
      id: 'tipoPiel',
      text: '¿Cuál es tu tipo de piel?',
      help: 'Obsérvala 1 hora después de lavar sin aplicar nada. Es la base de toda rutina dermatológica.',
      options: [
        { value: 'seca',     label: 'Seca',     hint: 'Tirantez, descamación, poca producción de sebo' },
        { value: 'mixta',    label: 'Mixta',    hint: 'Brillo en zona T (frente, nariz, mentón), mejillas normales' },
        { value: 'grasa',    label: 'Grasa',    hint: 'Brillo generalizado, poros visibles, tendencia a imperfecciones' },
        { value: 'normal',   label: 'Normal',   hint: 'Equilibrada, cómoda, sin extremos' },
        { value: 'sensible', label: 'Sensible', hint: 'Se enrojece fácil, reactiva a productos nuevos' }
      ]
    },
    {
      id: 'preocupacion',
      text: '¿Cuál es tu principal preocupación?',
      help: 'Define el ingrediente activo protagonista del sérum.',
      options: [
        { value: 'acne',           label: 'Acné / imperfecciones', hint: 'Busca BHA (ácido salicílico) y niacinamida' },
        { value: 'manchas',        label: 'Manchas / tono desigual', hint: 'Alpha-arbutin, vitamina C, niacinamida' },
        { value: 'envejecimiento', label: 'Arrugas / firmeza',       hint: 'Retinol, péptidos, antioxidantes' },
        { value: 'deshidratacion', label: 'Deshidratación / tirantez', hint: 'Ácido hialurónico y ceramidas' },
        { value: 'poros',          label: 'Poros dilatados / sebo',    hint: 'BHA y niacinamida regulan la oleosidad' },
        { value: 'rojeces',        label: 'Rojeces / irritación',     hint: 'Centella asiática (cica), heartleaf' }
      ]
    },
    {
      id: 'edad',
      text: '¿En qué rango de edad te encuentras?',
      help: 'Orienta el enfoque preventivo vs. correctivo en la rutina.',
      options: [
        { value: 'teen',    label: 'Menor de 20', hint: 'Enfoque preventivo y gentil' },
        { value: '20s',     label: '20 a 29',     hint: 'Prevención + primeros activos' },
        { value: '30s',     label: '30 a 39',     hint: 'Antioxidantes y retinol suave' },
        { value: '40plus',  label: '40 o más',    hint: 'Péptidos, retinol, ingredientes reparadores' }
      ]
    },
    {
      id: 'sol',
      text: '¿Cuánta exposición solar tienes en el día?',
      help: 'El 80-90% del envejecimiento cutáneo se atribuye a la radiación UV.',
      options: [
        { value: 'bajo',  label: 'Baja',  hint: 'Mayormente en interiores' },
        { value: 'medio', label: 'Media', hint: 'Trayectos y caminatas diarias' },
        { value: 'alto',  label: 'Alta',  hint: 'Trabajo o actividades al aire libre' }
      ]
    },
    {
      id: 'textura',
      text: '¿Qué textura de producto prefieres?',
      help: 'La textura determina la comodidad y la adherencia a la rutina.',
      options: [
        { value: 'ligera',    label: 'Ligera',    hint: 'Absorbe rápido, sin residuo' },
        { value: 'nutritiva', label: 'Nutritiva', hint: 'Con cuerpo, sensación emoliente' },
        { value: 'mixta',     label: 'Sin preferencia', hint: 'Cualquiera funciona' }
      ]
    },
    {
      id: 'experiencia',
      text: '¿Qué tan familiar eres con el skincare?',
      help: 'Ajustamos la complejidad de la rutina a tu nivel.',
      options: [
        { value: 'principiante', label: 'Principiante', hint: 'Quiero lo esencial, sin complicaciones' },
        { value: 'intermedio',   label: 'Intermedio',   hint: 'Ya tengo rutina básica establecida' },
        { value: 'avanzado',     label: 'Avanzada',     hint: 'Busco activos específicos y capas' }
      ]
    },
    {
      id: 'exfoliacion',
      text: '¿Con qué frecuencia exfolias?',
      help: 'La exfoliación química suave 1-3 veces/semana mejora textura y luminosidad sin irritar.',
      options: [
        { value: 'nunca',     label: 'Casi nunca',      hint: 'Sumamos un paso semanal con AHA/BHA' },
        { value: 'semanal',   label: '1-2 veces/semana', hint: 'Frecuencia ideal — mantenemos' },
        { value: 'frecuente', label: '3 o más veces',    hint: 'Riesgo de over-exfoliación' }
      ]
    }
  ];

  const CONCERN_LABELS = {
    acne:           'control de imperfecciones',
    manchas:        'luminosidad y tono uniforme',
    envejecimiento: 'firmeza y antiarrugas',
    deshidratacion: 'hidratación profunda',
    poros:          'poros y control de sebo',
    rojeces:        'calma y reparación'
  };

  /* ================================================================
   * RECOMMENDATION ENGINE
   * ================================================================ */
  const CONCERN_KEYWORDS = {
    acne:           ['bha', 'salicil', 'niacinamid', 'tea tree', 'centella', 'cica', 'control'],
    manchas:        ['arbutin', 'vitamin c', 'vitamina c', 'niacinamid', 'glow', 'bright', 'rice'],
    envejecimiento: ['retinol', 'peptid', 'pépti', 'colagen', 'ceramide', 'firm', 'anti-edad', 'lifting'],
    deshidratacion: ['hialuron', 'ácido hialu', 'hialu', 'ceramid', 'hydrat', 'hidrat', 'panthenol'],
    poros:          ['bha', 'niacinamid', 'pore', 'poro', 'mattify', 'mate'],
    rojeces:        ['centella', 'cica', 'heartleaf', 'madecasso', 'calm', 'soothing', 'panthenol']
  };

  function pickProduct(cat, opts = {}) {
    const ps = window.products || [];
    let pool = ps.filter(p => p.categoria === cat);
    if (!pool.length) return null;

    if (opts.subcat) {
      const s = pool.filter(p => p.subcategoria === opts.subcat);
      if (s.length) pool = s;
    }
    if (opts.tipoPiel) {
      const s = pool.filter(p => Array.isArray(p.tipoPiel) && p.tipoPiel.includes(opts.tipoPiel));
      if (s.length) pool = s;
    }
    if (opts.keywords && opts.keywords.length) {
      const hay = (p) => (
        (p.nombre || '') + ' ' +
        (p.descripcion || '') + ' ' +
        (p.beneficios || []).join(' ')
      ).toLowerCase();
      const s = pool.filter(p => opts.keywords.some(k => hay(p).includes(k.toLowerCase())));
      if (s.length) pool = s;
    }

    const best = pool.filter(p => p.masVendido);
    return (best.length ? best : pool)[0] || null;
  }

  function buildRoutine(ans) {
    const steps = [];

    // 1) Limpieza
    let limpSub = null;
    if (ans.tipoPiel === 'grasa' || ans.tipoPiel === 'mixta') limpSub = 'foam';
    else if (ans.tipoPiel === 'seca') limpSub = 'aceite';
    const clean = pickProduct('limpieza', { subcat: limpSub, tipoPiel: ans.tipoPiel })
              || pickProduct('limpieza', { tipoPiel: ans.tipoPiel })
              || pickProduct('limpieza');
    if (clean) steps.push({
      title: 'Limpieza',
      why: ans.tipoPiel === 'seca'
        ? 'Limpiador en aceite para disolver impurezas sin resecar la barrera.'
        : ans.tipoPiel === 'grasa'
          ? 'Foam suave que controla el sebo sin agredir la barrera cutánea.'
          : 'Limpia sin comprometer la hidratación natural de la piel.',
      product: clean
    });

    // 2) Tónico
    const ton = pickProduct('tonico', { tipoPiel: ans.tipoPiel }) || pickProduct('tonico');
    if (ton) steps.push({
      title: 'Tónico',
      why: ans.tipoPiel === 'sensible'
        ? 'Calma y reequilibra el pH tras la limpieza, sin alcohol.'
        : 'Prepara la piel para mayor absorción de los activos siguientes.',
      product: ton
    });

    // 3) Serum (según preocupación principal)
    const serum = pickProduct('serum', {
      keywords: CONCERN_KEYWORDS[ans.preocupacion],
      tipoPiel: ans.tipoPiel
    }) || pickProduct('serum', { keywords: CONCERN_KEYWORDS[ans.preocupacion] })
      || pickProduct('serum');
    if (serum) steps.push({
      title: 'Serum',
      why: `Activos concentrados enfocados en ${CONCERN_LABELS[ans.preocupacion] || 'tu preocupación principal'}.`,
      product: serum
    });

    // 4) Hidratante (crema facial) — textura acorde a preferencia
    const crema = pickProduct('crema-facial', { tipoPiel: ans.tipoPiel })
               || pickProduct('crema-facial');
    if (crema) steps.push({
      title: 'Hidratante',
      why: ans.textura === 'nutritiva'
        ? 'Textura rica que nutre y repara la barrera cutánea.'
        : 'Sella los activos y reduce la pérdida transepidérmica de agua.',
      product: crema
    });

    // 5) SPF — obligatorio de día
    const spfSub = ans.sol === 'alto' ? 'liquido' : null;
    const spf = pickProduct('bloqueador', { subcat: spfSub }) || pickProduct('bloqueador');
    if (spf) steps.push({
      title: 'Protector SPF',
      why: ans.sol === 'alto'
        ? 'Exposición alta: imprescindible reaplicar cada 2h. Protege de manchas, fotoenvejecimiento y cáncer de piel.'
        : 'El paso más importante: previene manchas, arrugas y daño UV acumulativo.',
      product: spf
    });

    // 6) Contorno de ojos — ≥30 años o envejecimiento
    if (['30s', '40plus'].includes(ans.edad) || ans.preocupacion === 'envejecimiento') {
      const eye = pickProduct('contorno-ojos');
      if (eye) steps.push({
        title: 'Contorno de ojos',
        why: 'Zona delicada que envejece primero — péptidos y antioxidantes suavizan líneas.',
        product: eye
      });
    }

    // 7) Exfoliante / pads — solo si no exfolia y quiere nivel intermedio+
    if (ans.exfoliacion === 'nunca' && (ans.experiencia === 'intermedio' || ans.experiencia === 'avanzado')) {
      const exf = pickProduct('exfoliante') || pickProduct('pads');
      if (exf) steps.push({
        title: 'Exfoliación (1-2×/semana)',
        why: 'AHA/BHA suave para renovación celular y luminosidad, alternando noches.',
        product: exf
      });
    }

    // 8) Sleeping mask — pieles secas o deshidratadas
    if (ans.tipoPiel === 'seca' || ans.preocupacion === 'deshidratacion') {
      const sm = pickProduct('sleeping-mask');
      if (sm) steps.push({
        title: 'Sleeping mask (noche)',
        why: 'Barrera oclusiva que potencia la reparación nocturna y la hidratación.',
        product: sm
      });
    }

    return steps;
  }

  function resultTitle(ans) {
    const pieles = { seca: 'seca', mixta: 'mixta', grasa: 'grasa', normal: 'normal', sensible: 'sensible' };
    return `Rutina para piel ${pieles[ans.tipoPiel] || 'personalizada'}`;
  }

  /* ================================================================
   * UI STATE
   * ================================================================ */
  const state = { idx: 0, answers: {} };
  let stageEl, progressFill, progressText, backBtn, nextBtn, modalEl, bsModal;

  function mount() {
    // Inject flotante antes del cierre de body
    if (!document.getElementById('luSkinTestFloat')) {
      const fr = document.createElement('div');
      fr.innerHTML = FLOAT_HTML.trim();
      document.body.appendChild(fr.firstChild);
    }
    // Inject modal
    if (!document.getElementById('skinTestModal')) {
      const fr = document.createElement('div');
      fr.innerHTML = MODAL_HTML.trim();
      document.body.appendChild(fr.firstChild);
    }
    stageEl      = document.getElementById('skintestStage');
    progressFill = document.getElementById('skintestProgressFill');
    progressText = document.getElementById('skintestProgressText');
    backBtn      = document.getElementById('skintestBack');
    nextBtn      = document.getElementById('skintestNext');
    modalEl      = document.getElementById('skinTestModal');

    document.getElementById('luSkinTestFloat').addEventListener('click', openTest);
    backBtn.addEventListener('click', () => goto(state.idx - 1));
    nextBtn.addEventListener('click', () => {
      if (state.idx < QUESTIONS.length - 1) goto(state.idx + 1);
      else renderResult();
    });
  }

  function openTest() {
    state.idx = 0;
    state.answers = {};
    if (!bsModal) bsModal = bootstrap.Modal.getOrCreateInstance(modalEl);
    renderQuestion(0);
    bsModal.show();
  }

  function goto(i) {
    if (i < 0 || i >= QUESTIONS.length) return;
    renderQuestion(i);
  }

  function updateProgress(percent, label) {
    if (progressFill) progressFill.style.width = Math.max(4, percent) + '%';
    if (progressText) progressText.textContent = label;
  }

  function renderQuestion(i) {
    state.idx = i;
    const q = QUESTIONS[i];
    const selected = state.answers[q.id];

    stageEl.innerHTML = `
      <h3 class="skintest-q-text">${q.text}</h3>
      ${q.help ? `<p class="skintest-q-help"><i class="bi bi-info-circle"></i> ${q.help}</p>` : ''}
      <ul class="skintest-options" role="radiogroup" aria-label="${q.text}">
        ${q.options.map(o => `
          <li>
            <button type="button" class="skintest-option ${selected === o.value ? 'is-selected' : ''}"
                    data-value="${o.value}" role="radio" aria-checked="${selected === o.value}">
              <span class="skintest-option-label">
                ${o.label}
                ${o.hint ? `<span class="skintest-option-hint">${o.hint}</span>` : ''}
              </span>
            </button>
          </li>`).join('')}
      </ul>
    `;

    stageEl.querySelectorAll('.skintest-option').forEach(btn => {
      btn.addEventListener('click', () => {
        const val = btn.getAttribute('data-value');
        state.answers[q.id] = val;
        stageEl.querySelectorAll('.skintest-option').forEach(b => {
          const on = b === btn;
          b.classList.toggle('is-selected', on);
          b.setAttribute('aria-checked', on);
        });
        nextBtn.disabled = false;
        // Avance automático suave tras seleccionar (feedback)
        clearTimeout(state._auto);
        state._auto = setTimeout(() => {
          if (state.idx < QUESTIONS.length - 1) goto(state.idx + 1);
          else renderResult();
        }, 320);
      });
    });

    // Botones inferiores
    backBtn.disabled = i === 0;
    nextBtn.disabled = !selected;
    nextBtn.innerHTML = (i === QUESTIONS.length - 1)
      ? 'Ver mi rutina <i class="bi bi-magic"></i>'
      : 'Siguiente <i class="bi bi-arrow-right"></i>';

    const pct = ((i) / QUESTIONS.length) * 100;
    updateProgress(pct, `Pregunta ${i + 1} de ${QUESTIONS.length}`);
  }

  function renderResult() {
    const ans = state.answers;
    const routine = buildRoutine(ans);
    updateProgress(100, '¡Rutina lista!');

    backBtn.disabled = false;
    nextBtn.innerHTML = '<i class="bi bi-arrow-clockwise"></i> Volver a hacer el test';
    nextBtn.disabled = false;
    nextBtn.onclick = () => { openTest(); };

    const tags = [];
    if (ans.tipoPiel)     tags.push(`<span class="skintest-tag"><i class="bi bi-droplet-half"></i> ${ans.tipoPiel}</span>`);
    if (ans.preocupacion) tags.push(`<span class="skintest-tag"><i class="bi bi-bullseye"></i> ${CONCERN_LABELS[ans.preocupacion] || ans.preocupacion}</span>`);
    if (ans.edad)         tags.push(`<span class="skintest-tag"><i class="bi bi-person"></i> ${ans.edad === 'teen' ? '<20' : ans.edad === '40plus' ? '40+' : ans.edad}</span>`);
    if (ans.sol)          tags.push(`<span class="skintest-tag"><i class="bi bi-sun"></i> sol ${ans.sol}</span>`);

    const sum = routine.reduce((s, r) => s + (Number(r.product.precio) || 0), 0);

    stageEl.innerHTML = `
      <div class="skintest-result">
        <div class="skintest-result-header">
          <span class="skintest-result-kicker"><i class="bi bi-stars"></i> Tu perfil</span>
          <h3 class="skintest-result-title">${resultTitle(ans)}</h3>
          <p class="skintest-result-sub">${routine.length} pasos con productos curados del catálogo, en el orden dermatológico correcto.</p>
          <div class="skintest-result-tags">${tags.join('')}</div>
        </div>

        <div class="skintest-routine">
          ${routine.map((r, i) => `
            <div class="skintest-step" data-product-id="${r.product.id}">
              <div class="skintest-step-n">${i + 1}</div>
              <div class="skintest-step-img" style="background-image:url('${(r.product.imagenes || [])[0] || ''}')"></div>
              <div class="skintest-step-body">
                <span class="skintest-step-title">${r.title}</span>
                <a class="skintest-step-name" href="producto.html?id=${r.product.id}">${r.product.nombre}</a>
                <span class="skintest-step-why">${r.why}</span>
              </div>
              <div>
                <div class="skintest-step-price">S/ ${Number(r.product.precio).toFixed(2)}</div>
                <button class="skintest-step-add" type="button" data-add="${r.product.id}" aria-label="Añadir al carrito">
                  <i class="bi bi-cart-plus"></i>
                </button>
              </div>
            </div>`).join('')}
        </div>

        <div class="skintest-result-actions">
          <button class="skintest-btn-addall" type="button" id="skintestAddAll">
            <i class="bi bi-bag-plus"></i> Añadir toda la rutina (S/ ${sum.toFixed(2)})
          </button>
          <button class="skintest-btn-restart" type="button" id="skintestRestart">
            <i class="bi bi-arrow-clockwise"></i> Repetir test
          </button>
        </div>
      </div>
    `;

    // Add individual
    stageEl.querySelectorAll('[data-add]').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = Number(btn.getAttribute('data-add'));
        if (typeof window.addToCart === 'function') window.addToCart(id, 1);
      });
    });
    // Add all
    const all = document.getElementById('skintestAddAll');
    if (all) all.addEventListener('click', () => {
      routine.forEach(r => {
        if (typeof window.addToCart === 'function') window.addToCart(r.product.id, 1);
      });
    });
    const restart = document.getElementById('skintestRestart');
    if (restart) restart.addEventListener('click', openTest);
  }

  /* ================================================================
   * BOOTSTRAP: espera a que el DOM y bootstrap estén listos
   * ================================================================ */
  function boot() {
    if (!document.body) return setTimeout(boot, 30);
    if (typeof bootstrap === 'undefined' || !bootstrap.Modal) return setTimeout(boot, 50);
    mount();
  }
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})();
