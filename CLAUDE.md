# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

Lünabi — a static, **multi-page** Korean cosmetics (K-Beauty) storefront. Spanish-language UI targeting Peru (prices in `S/`, WhatsApp checkout). No build step, no package manager, no backend — everything is served as static HTML/CSS/JS files.

## Running / developing

Open `index.html` directly in a browser, or (recommended) serve the directory with any static server (e.g. `python -m http.server` / VS Code Live Server) from the project root so that `fetch`-style lookups and relative paths resolve cleanly. There are no build, lint, or test commands — edits to HTML/CSS/JS are reflected on refresh.

External dependencies are loaded via CDN in every HTML: Bootstrap 5.3 (CSS + bundle JS), Bootstrap Icons 1.11, Google Fonts (**Bodoni Moda** for the logo and big titles, Syne as heading fallback, Epilogue for body text). Do not add a bundler or package manager unless explicitly requested.

## File tree

```
LÜNABI/
├── index.html, skincare.html, maquillaje.html, corporal.html, accesorios.html,
│   sale.html, marcas.html, marca-detalle.html, producto.html, carrito.html,
│   nosotros.html, contacto.html, faq.html, terminos.html, libro-reclamaciones.html
├── img/
│   ├── logo/logo.webp           (favicon + navbar logo — user-provided asset)
│   ├── banners/, productos/, marcas/   (empty, with README.txt placeholders)
└── assets/
    ├── css/
    │   ├── style.css    — tokens, reset, orbs, hero, page headers, filters/sort, forms, FAQ, WA float, toast, ripple, cursor
    │   ├── navbar.css   — .navbar-glass (Bootstrap navbar + glassmorphism), brand image, pill nav-links with active underline, hover-to-open dropdowns, compact search/theme/cart utilities
    │   ├── footer.css   — .lu-footer (always dark morado)
    │   ├── cards.css    — .product-card and .brand-card tiles
    │   ├── modal.css    — #productModal and Bootstrap tab styles
    │   └── carrito.css  — drawer (overlay + aside) + full-page cart (carrito.html)
    └── js/
        ├── data.js       — `products` and `brands` globals (sole data source)
        ├── theme.js      — IIFE; applies `body.dark` from localStorage at load, exposes `wireThemeToggle()`
        ├── carrito.js    — IIFE; cart state + drawer UI + WhatsApp order builder; exposes `addToCart`, `updateQty`, `removeFromCart`, `showToast`, `initCart`, etc.
        ├── buscador.js   — IIFE; live search (debounced 200ms); exposes `initSearch()`
        ├── filtros.js    — IIFE; filter state, `applyFilters`, `buildFilterUI`, `renderCategoryGrid`, `setSourceProducts`, `initFilters`
        ├── router.js     — IIFE; constants (`SKINCARE_CATS`, `MAQUILLAJE_CATS`, `SUBCAT_LABELS`, `PAGES`) and URL helpers (`getQueryParam`, `getCurrentPage`, `setActiveNavLink`)
        ├── components.js — IIFE; runs at script-load and **injects** the navbar, footer, product modal, and cart drawer into their container divs
        └── main.js       — orchestrator; defines `renderProductCard`, `observeFadeUps`, `openProductModal`, all page renderers, `initApp()` that wires everything after components have been injected
```

## Page skeleton

Every HTML file follows the same shell. Page-specific content goes inside `<main id="main-content">`; the navbar / footer / modal / cart drawer are **injected by `components.js`** into empty container divs:

```html
<body data-page="skincare">                      <!-- router reads this filename key -->
  <div class="bg-orbs">…</div>                    <!-- celestial background -->
  <div id="navbar-container"></div>               <!-- filled by components.js -->
  <main id="main-content">
    <!-- page-specific markup (hero, filter sidebar, form, accordion, …) -->
  </main>
  <div id="modal-container"></div>                <!-- filled by components.js -->
  <div id="carrito-drawer"></div>                 <!-- filled by components.js -->
  <div id="footer-container"></div>               <!-- filled by components.js -->
  <div id="toast-container"></div>                <!-- manual div; toasts appended here -->
  <a class="whatsapp-float">…</a>

  <!-- script order is load-bearing — don't rearrange -->
  <script src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/js/bootstrap.bundle.min.js"></script>
  <script src="assets/js/data.js"></script>
  <script src="assets/js/theme.js"></script>
  <script src="assets/js/carrito.js"></script>
  <script src="assets/js/buscador.js"></script>
  <script src="assets/js/filtros.js"></script>
  <script src="assets/js/router.js"></script>
  <script src="assets/js/components.js"></script>  <!-- injects DOM synchronously -->
  <script src="assets/js/main.js"></script>        <!-- wires everything -->
</body>
```

## Initialization order (why the script order matters)

Scripts live at the end of `<body>`, so by the time they run the body is fully parsed. Order:

1. **bootstrap.bundle** → Modal / Tab / Carousel classes available.
2. **data.js** → `products` and `brands` globals exist.
3. **theme.js** (IIFE) → reads `localStorage['lunabi-theme']`, adds `body.dark` immediately. Exposes `wireThemeToggle()` for later.
4. **carrito.js, buscador.js, filtros.js, router.js** (IIFEs) → define helpers and init functions on `window`, but do NOT attach DOM listeners yet — the navbar/footer/modal/cart drawer haven't been injected.
5. **components.js** (IIFE) → runs `injectComponents()` at parse time, filling `#navbar-container`, `#footer-container`, `#modal-container`, `#carrito-drawer` with their template HTML. Also populates the Marcas dropdown from `brands`.
6. **main.js** → defines shared helpers (`renderProductCard`, `observeFadeUps`, modal logic, page renderers) and calls `initApp()`. `initApp()` wires theme toggle, cart, search, nav dropdowns, modal, effects, then dispatches on `getCurrentPage()` to the right page renderer (`renderHomePage`, `renderCategoryPageByKey`, `renderMarcasPage`, `renderMarcaDetallePage`, `renderProductoPage`, `renderCartPage`, `initContactoForm`, `initReclamacionesForm`).

**Do not move `components.js` before other modules** — modules rely on it to have injected the DOM before their `init*()` functions run, but the modules themselves are defined before `components.js`, which is fine because they only register functions on `window`.

## Architecture details

- **`data.js`** — `brands` (`{id, nombre, slug, logo, descripcion}`) and `products` (`{id, slug, nombre, marca, categoria, tipoPiel[], precio, precioAntes, imagenes[], descripcion, modoDeUso[], beneficios[], masVendido, enOferta}`). Products reference brands by `slug`. `tipoPiel` is an array so one product can match multiple skin-type filters. `categoria` is a free-form slug; `filtros.js`/`router.js` groups them via `SKINCARE_CATS` and `MAQUILLAJE_CATS`.

- **Routing model** — true multi-page. Each section has its own `.html` file. Navigation uses normal `<a href="…">` links, not hash routing. Category filtering is deep-linked via query strings:
  - `skincare.html?categoria=serum` → opens skincare and auto-checks the Serum pill
  - `maquillaje.html?categoria=rostro`
  - `marca-detalle.html?marca=beauty-of-joseon`
  - `producto.html?id=3`
  Each page reads its params on load via `getQueryParam()` in `router.js`.

- **Logo** — every navbar renders `<img src="img/logo/logo.webp" alt="Lünabi" height="44">` inside `.navbar-brand` (from the components template). In day mode the image displays unmodified; `body.dark .navbar-glass .navbar-brand img { filter: brightness(0) invert(1); }` inverts it to clean white for night mode. If the source PNG/WEBP is dark-on-transparent, that filter produces correct white output. The same file powers the `<link rel="icon">` favicon.

- **Cart** — persisted to `localStorage['lunabi_cart']` as `[{id, qty}]`. Prices/images/names are re-resolved from `products` on every render — never store denormalised product data in the cart. `carrito.js` exposes `addToCart`, `removeFromCart`, `updateQty`, `clearCart`, `sendWhatsAppOrder`, etc. on `window` so inline `onclick="addToCart(3)"` handlers inside the card template work. The full-page `carrito.html` reuses `renderCartPage()` in `main.js`, which `updateCartUI()` calls whenever the cart changes so the page stays in sync with the drawer.

- **Filters** — `filterState` in `filtros.js` holds `subcats`, `tiposPiel`, `marcas` (Sets), price bounds, and `sort`. `applyFilters(sourceProducts)` composes them; the `best` sort pushes `masVendido` first. `buildFilterUI(cats, showSubcats)` rebuilds the sidebar against the current `sourceProducts`: the brand list and price slider bounds are per-page. Change events are delegated from `#filtersBody`; price dual slider has its own `input` listener. Each category/brand-detail page calls `setSourceProducts()` + `buildFilterUI()` + `renderCategoryGrid()` in its page renderer.

- **Theme toggle** — `applyTheme('day'|'night')` adds/removes `body.dark` and swaps the icon (sun=day, moon=night); persisted as `lunabi-theme`. Default is `'day'`. `theme.js` applies the class immediately at script load to minimise FOUC — but because scripts live at the end of `<body>`, a ~50ms flash may still occur on cold loads with night mode preferred.

- **Product modal** — still available site-wide via `window.openProductModal(id)`, but the primary "view detail" flow now navigates to `producto.html?id=…` (which has its own gallery + tabs). The modal remains wired by `initModal()` in `main.js` in case you want to re-add in-place quick-view later.

- **Search** — debounced 200ms, matches `products.nombre`/`categoria` and `brands.nombre`, renders into the injected `#searchResults` dropdown as **anchors** that navigate to `producto.html?id=` or `marca-detalle.html?marca=`.

- **WhatsApp** — `WA_NUMBER` is set on `window` at the top of `main.js` (placeholder `51XXXXXXXXX`). Used by the cart order builder, product CTA, contact form, reclamaciones form, and the floating button. Update it in one place.

- **CSS design system** — `style.css` holds all the semantic tokens in `:root`. Palette constants: `--p-purple-deep` `#682ABF`, `--p-purple-vibrant` `#7732D9`, `--p-pink-soft` `#F6C6F9`, `--p-lavender-light` `#D9B7FF`, `--p-lila-mid` `#9F84E6`, `--p-white-warm` `#F2F2F2`, `--p-beige-soft` `#F5EFE8`, `--p-gray-warm` `#EAE7F2`. Semantic tokens (`--bg-main`, `--text-heading`, `--card-bg`, `--nav-bg`, `--modal-bg`, etc.) are redefined inside `body.dark` — most components theme themselves automatically via the tokens. Follow the 60-30-10 rule: 60% neutrals, 30% pastels, 10% intense purples. Theme transitions are 0.45s. The footer is intentionally dark morado (`#1a0f2e`) in both modes.

## Conventions

- All user-facing copy is Spanish.
- Product and brand identifiers are Spanish slugs (`beauty-of-joseon`, `serum`, `limpieza`). Keep new entries consistent.
- Every page sets `<body data-page="<key>">` where `<key>` matches the filename without extension — `main.js` reads this via `getCurrentPage()` to decide which renderer to run.
- The five category routes (`skincare`, `maquillaje`, `corporal`, `accesorios`, `sale`) and `marca-detalle` share the **same** sidebar/sort/grid markup; only the `<h1>` / `<p>` seed text differs. Adding a new category = copy `skincare.html`, update `data-page`, title, subtitle, and add a matching entry in `PAGES` inside `router.js`.
- Navbar / footer / modal / cart drawer live only in `components.js` — when changing them, update the template strings there, not per-page.
- The navbar uses Bootstrap's `.navbar.navbar-expand-lg.fixed-top` shell with a custom `.navbar-glass` class for the frosted look. Dropdowns open on **hover** via CSS on desktop (`.nav-item.dropdown:hover > .dropdown-menu { display: block }`) and as inline-stacked blocks on mobile (inside the collapsed `.navbar-collapse`). No `data-bs-toggle="dropdown"` is used — clicking a parent nav-link always navigates via `href`.
- `#home` in `index.html` has `padding-top: calc(var(--nav-h-top) + var(--nav-h-bot))` — if you change navbar heights, update the tokens, not the section.
- Don't commit real `logo.webp` or product images to this folder tree here — the `img/` READMEs document expected locations and sizes.
