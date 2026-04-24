/* ===== LÜNABI — Filtros (sidebar + sort + category grid) ===== */

(function() {
  const SKIN_TYPES = [
    { key: 'normal',   label: 'Normal' },
    { key: 'seca',     label: 'Seca' },
    { key: 'mixta',    label: 'Mixta' },
    { key: 'grasa',    label: 'Grasa' },
    { key: 'sensible', label: 'Sensible' }
  ];

  const filterState = {
    subcats: new Set(),   // categoría principal: limpieza, serum, …
    tipos: new Set(),     // subcategoría / tipo: aceite, foam, crema, …
    tiposPiel: new Set(), // tipo de piel: normal, seca, …
    marcas: new Set(),
    priceMin: 0,
    priceMax: 999,
    sort: 'best',
    priceBounds: { min: 0, max: 999 }
  };

  let sourceProducts = [];

  function setSourceProducts(list) {
    sourceProducts = list;
  }

  function resetFilterState(bounds) {
    filterState.subcats.clear();
    filterState.tipos.clear();
    filterState.tiposPiel.clear();
    filterState.marcas.clear();
    filterState.priceMin = bounds.min;
    filterState.priceMax = bounds.max;
    filterState.priceBounds = bounds;
    filterState.sort = 'best';
  }

  function applyFilters(sourceList) {
    let items = sourceList.slice();

    if (filterState.subcats.size > 0) {
      items = items.filter(p => filterState.subcats.has(p.categoria));
    }
    if (filterState.tipos.size > 0) {
      items = items.filter(p => p.subcategoria && filterState.tipos.has(p.subcategoria));
    }
    if (filterState.tiposPiel.size > 0) {
      items = items.filter(p => Array.isArray(p.tipoPiel) && p.tipoPiel.some(t => filterState.tiposPiel.has(t)));
    }
    if (filterState.marcas.size > 0) {
      items = items.filter(p => filterState.marcas.has(p.marca));
    }
    items = items.filter(p => p.precio >= filterState.priceMin && p.precio <= filterState.priceMax);

    switch (filterState.sort) {
      case 'price-asc':  items.sort((a, b) => a.precio - b.precio); break;
      case 'price-desc': items.sort((a, b) => b.precio - a.precio); break;
      case 'newest':     items.sort((a, b) => b.id - a.id); break;
      default:
        items.sort((a, b) => {
          const aBest = a.masVendido ? 0 : 1;
          const bBest = b.masVendido ? 0 : 1;
          if (aBest !== bBest) return aBest - bBest;
          return b.id - a.id;
        });
    }
    return items;
  }

  /**
   * Build the category filter block. `structure` is an array of
   *   { key, label, subs: [{ key, label }] }
   * objects — see SKINCARE_STRUCTURE / MAQUILLAJE_STRUCTURE in router.js.
   * Renders as a nested checkbox tree: a parent checkbox per categoría,
   * and (when it has subs) indented child checkboxes per tipo.
   */
  function buildFilterUI(structure, showSubcats) {
    const subEl = document.getElementById('filterSubcats');
    const subBlock = document.getElementById('filterSubcatsBlock');

    if (subBlock && subEl) {
      const hasVisibleCats = showSubcats && Array.isArray(structure) && structure.length > 1;
      if (hasVisibleCats) {
        subBlock.style.display = '';
        subEl.className = 'filter-tree';
        subEl.innerHTML = structure.map(cat => {
          const catChecked = filterState.subcats.has(cat.key) ? 'checked' : '';
          const subsHtml = (cat.subs || []).map(sub => {
            const subChecked = filterState.tipos.has(sub.key) ? 'checked' : '';
            return `
              <label class="filter-check filter-check-sub">
                <input type="checkbox" data-kind="tipo" value="${sub.key}" ${subChecked}>
                <span>${sub.label}</span>
              </label>`;
          }).join('');
          return `
            <label class="filter-check filter-check-cat">
              <input type="checkbox" data-kind="cat" value="${cat.key}" ${catChecked}>
              <span>${cat.label}</span>
            </label>
            ${subsHtml ? `<div class="filter-subs">${subsHtml}</div>` : ''}
          `;
        }).join('');
      } else {
        subBlock.style.display = 'none';
      }
    }

    const skinEl = document.getElementById('filterSkinType');
    if (skinEl) {
      skinEl.innerHTML = SKIN_TYPES.map(t =>
        `<label class="filter-pill">
          <input type="checkbox" value="${t.key}" ${filterState.tiposPiel.has(t.key) ? 'checked' : ''}>
          <span>${t.label}</span>
        </label>`
      ).join('');
    }

    const brandsEl = document.getElementById('filterBrands');
    if (brandsEl) {
      const brandSlugs = [...new Set(sourceProducts.map(p => p.marca))];
      const brandObjs = brandSlugs
        .map(s => brands.find(b => b.slug === s))
        .filter(Boolean)
        .sort((a, b) => a.nombre.localeCompare(b.nombre));
      brandsEl.innerHTML = brandObjs.map(b =>
        `<label class="filter-check">
          <input type="checkbox" value="${b.slug}" ${filterState.marcas.has(b.slug) ? 'checked' : ''}>
          <span>${b.nombre}</span>
        </label>`
      ).join('');
    }

    const prices = sourceProducts.map(p => p.precio);
    const minP = prices.length ? Math.floor(Math.min(...prices)) : 0;
    const maxP = prices.length ? Math.ceil(Math.max(...prices)) : 200;
    const bounds = { min: minP, max: Math.max(maxP, minP + 1) };
    filterState.priceBounds = bounds;
    filterState.priceMin = bounds.min;
    filterState.priceMax = bounds.max;

    const minInput = document.getElementById('priceMinInput');
    const maxInput = document.getElementById('priceMaxInput');
    if (minInput && maxInput) {
      minInput.min = bounds.min; minInput.max = bounds.max; minInput.value = bounds.min;
      maxInput.min = bounds.min; maxInput.max = bounds.max; maxInput.value = bounds.max;
    }
    const minLabel = document.getElementById('priceMinVal');
    const maxLabel = document.getElementById('priceMaxVal');
    if (minLabel) minLabel.textContent = `S/ ${bounds.min}`;
    if (maxLabel) maxLabel.textContent = `S/ ${bounds.max}`;

    const sortSel = document.getElementById('sortSelect');
    if (sortSel) sortSel.value = filterState.sort;
  }

  function renderCategoryGrid() {
    const items = applyFilters(sourceProducts);
    const grid = document.getElementById('categoryGrid');
    const countEl = document.getElementById('sortCount');
    if (!grid) return;
    if (countEl) countEl.textContent = `${items.length} producto${items.length !== 1 ? 's' : ''}`;

    if (items.length === 0) {
      grid.innerHTML = `
        <div class="col-12">
          <div class="no-results">
            <i class="bi bi-search"></i>
            <p>No se encontraron productos con estos filtros.</p>
            <button class="hero-cta" id="btnNoResultsClear">Limpiar filtros</button>
          </div>
        </div>`;
      const clearBtn = document.getElementById('btnNoResultsClear');
      if (clearBtn) clearBtn.addEventListener('click', clearAllFilters);
      return;
    }

    grid.innerHTML = items.map((p, i) => window.renderProductCard(p, i)).join('');
    if (typeof window.observeFadeUps === 'function') {
      requestAnimationFrame(window.observeFadeUps);
    }
  }

  function clearAllFilters() {
    resetFilterState(filterState.priceBounds);
    document.querySelectorAll('#filtersBody input[type="checkbox"]').forEach(cb => { cb.checked = false; });
    const minInput = document.getElementById('priceMinInput');
    const maxInput = document.getElementById('priceMaxInput');
    if (minInput && maxInput) {
      minInput.value = filterState.priceBounds.min;
      maxInput.value = filterState.priceBounds.max;
    }
    const minLabel = document.getElementById('priceMinVal');
    const maxLabel = document.getElementById('priceMaxVal');
    if (minLabel) minLabel.textContent = `S/ ${filterState.priceBounds.min}`;
    if (maxLabel) maxLabel.textContent = `S/ ${filterState.priceBounds.max}`;
    const sortSel = document.getElementById('sortSelect');
    if (sortSel) sortSel.value = 'best';
    renderCategoryGrid();
  }

  function toggleSet(set, value, on) {
    if (on) set.add(value); else set.delete(value);
  }

  function initFilters() {
    const body = document.getElementById('filtersBody');
    if (body) {
      body.addEventListener('change', (e) => {
        const t = e.target;
        if (!t.matches('input')) return;
        if (t.closest('#filterSubcats')) {
          const kind = t.getAttribute('data-kind');
          if (kind === 'tipo') {
            toggleSet(filterState.tipos, t.value, t.checked);
          } else {
            toggleSet(filterState.subcats, t.value, t.checked);
          }
          renderCategoryGrid();
        } else if (t.closest('#filterSkinType')) {
          toggleSet(filterState.tiposPiel, t.value, t.checked);
          renderCategoryGrid();
        } else if (t.closest('#filterBrands')) {
          toggleSet(filterState.marcas, t.value, t.checked);
          renderCategoryGrid();
        }
      });
    }

    const priceMinInput = document.getElementById('priceMinInput');
    const priceMaxInput = document.getElementById('priceMaxInput');
    if (priceMinInput && priceMaxInput) {
      const onPriceInput = () => {
        let min = parseInt(priceMinInput.value, 10);
        let max = parseInt(priceMaxInput.value, 10);
        if (min > max - 1) min = max - 1;
        if (max < min + 1) max = min + 1;
        priceMinInput.value = min;
        priceMaxInput.value = max;
        filterState.priceMin = min;
        filterState.priceMax = max;
        const minLabel = document.getElementById('priceMinVal');
        const maxLabel = document.getElementById('priceMaxVal');
        if (minLabel) minLabel.textContent = `S/ ${min}`;
        if (maxLabel) maxLabel.textContent = `S/ ${max}`;
        renderCategoryGrid();
      };
      priceMinInput.addEventListener('input', onPriceInput);
      priceMaxInput.addEventListener('input', onPriceInput);
    }

    const sortSel = document.getElementById('sortSelect');
    if (sortSel) sortSel.addEventListener('change', (e) => {
      filterState.sort = e.target.value;
      renderCategoryGrid();
    });

    const clearBtn = document.getElementById('btnClearFilters');
    if (clearBtn) clearBtn.addEventListener('click', clearAllFilters);

    const mobileToggle = document.getElementById('filtersToggleMobile');
    if (mobileToggle) mobileToggle.addEventListener('click', () => {
      const body = document.getElementById('filtersBody');
      if (body) body.classList.toggle('open');
    });
  }

  // Expose for main.js and other modules
  window.filterState = filterState;
  window.resetFilterState = resetFilterState;
  window.applyFilters = applyFilters;
  window.buildFilterUI = buildFilterUI;
  window.renderCategoryGrid = renderCategoryGrid;
  window.clearAllFilters = clearAllFilters;
  window.setSourceProducts = setSourceProducts;
  window.initFilters = initFilters;
  window.SKIN_TYPES = SKIN_TYPES;
})();
