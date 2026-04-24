/* ===== LÜNABI — Router (URL params + page metadata) ===== */

(function() {
  /* Estructura jerárquica de Skincare: cada categoría puede tener subcategorías (tipos).
   * Los productos llevan { categoria, subcategoria } en data.js.
   * El mega-menú, los filtros y la navegación leen este array como única fuente. */
  const SKINCARE_STRUCTURE = [
    { key: 'limpieza',      label: 'Limpieza',         subs: [
      { key: 'aceite',         label: 'Aceite' },
      { key: 'foam',           label: 'Foam' },
      { key: 'desmaquillante', label: 'Desmaquillante' }
    ]},
    { key: 'exfoliante',    label: 'Exfoliante',       subs: [] },
    { key: 'tonico',        label: 'Tónico',           subs: [] },
    { key: 'serum',         label: 'Serum',            subs: [] },
    { key: 'mascarillas',   label: 'Mascarillas',      subs: [
      { key: 'algodon',    label: 'Algodón' },
      { key: 'lavable',    label: 'Lavable' },
      { key: 'spot-patch', label: 'Spot Patch' }
    ]},
    { key: 'esencia',       label: 'Esencia',          subs: [] },
    { key: 'locion',        label: 'Loción',           subs: [] },
    { key: 'crema-facial',  label: 'Crema Facial',     subs: [] },
    { key: 'contorno-ojos', label: 'Contorno de Ojos', subs: [
      { key: 'crema',   label: 'Crema' },
      { key: 'parches', label: 'Parches' }
    ]},
    { key: 'mist',          label: 'Mist',             subs: [] },
    { key: 'sleeping-mask', label: 'Sleeping Mask',    subs: [] },
    { key: 'tone-up',       label: 'Tone Up',          subs: [] },
    { key: 'bloqueador',    label: 'Bloqueador',       subs: [
      { key: 'barra',   label: 'Barra' },
      { key: 'liquido', label: 'Líquido' }
    ]},
    { key: 'pads',          label: 'Pads',             subs: [
      { key: 'tonico',     label: 'Tónico' },
      { key: 'exfoliante', label: 'Exfoliante' }
    ]}
  ];

  const CORPORAL_STRUCTURE = [
    { key: 'cuerpo',  label: 'Cuerpo',  subs: [] },
    { key: 'cabello', label: 'Cabello', subs: [] },
    { key: 'manos',   label: 'Manos',   subs: [] },
    { key: 'pies',    label: 'Pies',    subs: [] }
  ];

  const MAQUILLAJE_STRUCTURE = [
    { key: 'rostro', label: 'Rostro', subs: [
      { key: 'rubor',    label: 'Rubor' },
      { key: 'polvos',   label: 'Polvos' },
      { key: 'cc-cream', label: 'CC Cream' },
      { key: 'bb-cream', label: 'BB Cream' },
      { key: 'cushion',  label: 'Cushion' }
    ]},
    { key: 'ojos', label: 'Ojos', subs: [
      { key: 'delineador', label: 'Delineador' },
      { key: 'cejas',      label: 'Cejas' },
      { key: 'sombras',    label: 'Sombras' },
      { key: 'rimel',      label: 'Rímel' }
    ]},
    { key: 'labios', label: 'Labios', subs: [
      { key: 'mate',          label: 'Mate' },
      { key: 'gloss',         label: 'Gloss' },
      { key: 'tinta-liquida', label: 'Tinta Líquida' },
      { key: 'balsamo',       label: 'Bálsamo' }
    ]}
  ];

  const SKINCARE_CATS = SKINCARE_STRUCTURE.map(c => c.key);
  const MAQUILLAJE_CATS = MAQUILLAJE_STRUCTURE.map(c => c.key);
  const CORPORAL_CATS = CORPORAL_STRUCTURE.map(c => c.key);

  /* Flat lookup: categoria/subcategoria key → human label. Built from the structures
   * so there is a single source of truth. */
  const SUBCAT_LABELS = (() => {
    const out = {};
    [SKINCARE_STRUCTURE, MAQUILLAJE_STRUCTURE, CORPORAL_STRUCTURE].forEach(struct => {
      struct.forEach(cat => {
        out[cat.key] = cat.label;
        cat.subs.forEach(s => { out[s.key] = s.label; });
      });
    });
    out.accesorios = 'Accesorios';
    return out;
  })();

  const PAGES = {
    skincare: {
      title: 'Skincare',
      subtitle: 'Rutina coreana completa para una piel luminosa y equilibrada',
      cats: SKINCARE_CATS,
      structure: SKINCARE_STRUCTURE,
      filter: p => SKINCARE_CATS.includes(p.categoria)
    },
    maquillaje: {
      title: 'Maquillaje',
      subtitle: 'K-Beauty que realza tu belleza natural',
      cats: MAQUILLAJE_CATS,
      structure: MAQUILLAJE_STRUCTURE,
      filter: p => MAQUILLAJE_CATS.includes(p.categoria)
    },
    corporal: {
      title: 'Corporal',
      subtitle: 'Cuidado completo para tu cuerpo con la suavidad del K-Beauty',
      cats: CORPORAL_CATS,
      structure: CORPORAL_STRUCTURE,
      filter: p => CORPORAL_CATS.includes(p.categoria)
    },
    accesorios: {
      title: 'Accesorios',
      subtitle: 'Los imprescindibles que completan tu rutina',
      cats: ['accesorios'],
      structure: [{ key: 'accesorios', label: 'Accesorios', subs: [] }],
      filter: p => p.categoria === 'accesorios'
    },
    sale: {
      title: 'Sale',
      subtitle: 'Ofertas por tiempo limitado en tus favoritos',
      cats: [],
      structure: [],
      filter: p => !!p.enOferta,
      saleOnly: true
    }
  };

  function getQueryParam(name) {
    return new URLSearchParams(window.location.search).get(name);
  }

  function getAllParams() {
    return new URLSearchParams(window.location.search);
  }

  function getCurrentPage() {
    const path = window.location.pathname.split('/').pop() || 'index.html';
    const page = path.replace('.html', '');
    return page === '' ? 'index' : page;
  }

  /* Highlight the nav link corresponding to the current page */
  const NAV_MAP = {
    index: 'index',
    skincare: 'skincare',
    maquillaje: 'maquillaje',
    corporal: 'corporal',
    accesorios: 'accesorios',
    marcas: 'marcas',
    'marca-detalle': 'marcas',
    sale: 'sale',
    producto: null,
    carrito: null,
    nosotros: null,
    contacto: null,
    faq: null,
    terminos: null,
    'libro-reclamaciones': null
  };

  function setActiveNavLink() {
    const page = getCurrentPage();
    const active = NAV_MAP[page];
    if (!active) return;
    document.querySelectorAll('.nav-link[data-nav]').forEach(link => {
      link.classList.toggle('active', link.getAttribute('data-nav') === active);
    });
  }

  window.SKINCARE_STRUCTURE = SKINCARE_STRUCTURE;
  window.MAQUILLAJE_STRUCTURE = MAQUILLAJE_STRUCTURE;
  window.CORPORAL_STRUCTURE = CORPORAL_STRUCTURE;
  window.SKINCARE_CATS = SKINCARE_CATS;
  window.MAQUILLAJE_CATS = MAQUILLAJE_CATS;
  window.CORPORAL_CATS = CORPORAL_CATS;
  window.SUBCAT_LABELS = SUBCAT_LABELS;
  window.PAGES = PAGES;
  window.getQueryParam = getQueryParam;
  window.getAllParams = getAllParams;
  window.getCurrentPage = getCurrentPage;
  window.setActiveNavLink = setActiveNavLink;
})();
