/* ===== LÜNABI — Buscador (navbar live search) ===== */

(function() {
  function highlight(text, query) {
    const idx = text.toLowerCase().indexOf(query.toLowerCase());
    if (idx < 0) return text;
    return text.slice(0, idx)
      + '<mark>' + text.slice(idx, idx + query.length) + '</mark>'
      + text.slice(idx + query.length);
  }

  function doSearch() {
    const input = document.getElementById('searchInput');
    const results = document.getElementById('searchResults');
    if (!input || !results) return;

    const q = input.value.trim().toLowerCase();
    if (q.length < 2) {
      results.classList.remove('show');
      return;
    }

    const matchProducts = products.filter(p =>
      p.nombre.toLowerCase().includes(q) || p.categoria.includes(q)
    ).slice(0, 6);

    const matchBrands = brands.filter(b =>
      b.nombre.toLowerCase().includes(q)
    ).slice(0, 4);

    if (matchProducts.length === 0 && matchBrands.length === 0) {
      results.classList.remove('show');
      return;
    }

    let html = '';
    if (matchBrands.length) {
      html += '<div class="sr-group">Marcas</div>';
      matchBrands.forEach(b => {
        html += `<a class="sr-item" href="marca-detalle.html?marca=${b.slug}">
          <i class="bi bi-tag" style="color:var(--p-lila-mid)"></i>
          <span>${highlight(b.nombre, q)}</span>
        </a>`;
      });
    }
    if (matchProducts.length) {
      html += '<div class="sr-group">Productos</div>';
      matchProducts.forEach(p => {
        html += `<a class="sr-item" href="producto.html?id=${p.id}">
          <img src="${p.imagenes[0]}" alt="">
          <span>${highlight(p.nombre, q)}</span>
        </a>`;
      });
    }

    results.innerHTML = html;
    results.classList.add('show');
  }

  function initSearch() {
    const input = document.getElementById('searchInput');
    const results = document.getElementById('searchResults');
    if (!input || !results) return;

    let timeout = null;
    input.addEventListener('input', () => {
      clearTimeout(timeout);
      timeout = setTimeout(doSearch, 200);
    });
    input.addEventListener('focus', () => {
      if (input.value.length >= 2) doSearch();
    });
    document.addEventListener('click', (e) => {
      if (!e.target.closest('.nav-search')) results.classList.remove('show');
    });
  }

  window.initSearch = initSearch;
})();
