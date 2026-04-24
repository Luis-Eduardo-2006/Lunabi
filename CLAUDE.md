# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

Lünabi — a static, **multi-page** K-Beauty / cosmetics storefront. Spanish-language UI targeting Peru (prices in `S/`, **WhatsApp checkout** with two numbers: Huancayo local + envíos nacionales). No build step, no package manager. The site ships as plain HTML/CSS/JS and works fully offline against `localStorage`; an **optional Supabase backend** can be activated by filling in credentials (see "Backend" section). Base text content for `nosotros.html`, `terminos.html` and `faq.html` is sourced from [`InfoPieDePagina.txt`](InfoPieDePagina.txt) — use only that text when editing those pages.

## Running / developing

Open `index.html` directly in a browser, or (recommended) serve the directory with any static server (`python -m http.server`, VS Code Live Server, etc.) so `fetch`-style calls and relative paths resolve cleanly. There are no build, lint, or test commands — edits to HTML/CSS/JS are reflected on refresh. External deps are loaded via CDN: Bootstrap 5.3 (CSS + bundle JS), Bootstrap Icons 1.11, Google Fonts (Bodoni Moda / Syne / Epilogue). Supabase SDK is loaded on-demand by [`api.js`](assets/js/api.js) only if configured.

## File tree

```
LÜNABI/
├── index.html, skincare.html, maquillaje.html, corporal.html, accesorios.html,
│   sale.html, marcas.html, marca-detalle.html, producto.html, carrito.html,
│   nosotros.html, contacto.html, faq.html, terminos.html, libro-reclamaciones.html,
│   login.html, registro.html,
│   admin.html          (panel admin; CRUD productos/marcas/carrusel + dashboard + pedidos)
│   cuenta.html         (user account: pedidos, favoritos, rutina del test, perfil)
├── InfoPieDePagina.txt (fuente de verdad para Nosotros / Términos / FAQ)
├── supabase/
│   ├── schema.sql      (tablas + tipos + RLS + triggers + vista v_products + record_sale RPC)
│   ├── storage.sql     (buckets products/brands/slides + políticas)
│   └── README.md       (guía de despliegue paso a paso)
├── img/
│   ├── logo/logo.webp  (favicon + navbar logo)
│   └── banners/, productos/, marcas/   (placeholders)
└── assets/
    ├── css/
    │   ├── style.css       tokens, reset, orbs, hero, page headers, filters/sort,
    │   │                   forms, FAQ accordion + group titles, WA float,
    │   │                   toast, ripple, cursor, contact-channels
    │   ├── navbar.css      .navbar-glass + mega-menu dropdowns + utils (search/theme/user/cart)
    │   ├── footer.css      .lu-footer (morado oscuro, con values/pay pills)
    │   ├── cards.css       .product-card + .brand-card + .btn-fav (corazón) + .btn-fav-detail
    │   ├── modal.css       #productModal + tabs pill gradient + #waPickerModal
    │   ├── carrito.css     drawer + full-page cart + inline WA picker (Huancayo/Nacional)
    │   ├── auth.css        login/registro + user-menu dropdown del navbar
    │   ├── admin.css       panel admin (hero welcome, stat cards, tabs, tables,
    │   │                   orders list + stage pills, image editor modal)
    │   ├── cuenta.css      hero con nivel de membresía, stats, tabs, timeline de envío
    │   ├── skintest.css    botón flotante con logo + modal del test dermatológico
    │   └── chatbot.css     botón flotante "Luna" + ventana de chat con burbujas
    └── js/
        ├── data.js             `products` y `brands` globals; al final merge desde
        │                       localStorage (admin overrides) + rehidratación remota
        │                       desde Supabase si LuApi.isRemote()
        ├── theme.js            IIFE; `body.dark` desde localStorage
        ├── carrito.js          IIFE; estado cart + drawer + WA order persistido
        │                       (local + Supabase); picker inline Huancayo/Nacional
        ├── buscador.js         IIFE; búsqueda debounced 200ms
        ├── filtros.js          IIFE; filtros por categoría/subcat/tipoPiel/marca/precio/sort
        ├── router.js           IIFE; SKINCARE_STRUCTURE, MAQUILLAJE_STRUCTURE,
        │                       CORPORAL_STRUCTURE, SUBCAT_LABELS, PAGES; helpers URL
        ├── components.js       IIFE; inyecta navbar/footer/modales/cart drawer;
        │                       también inyecta supabase.config.js + api.js y
        │                       carga lazy skintest + chatbot en todas las páginas
        ├── supabase.config.js  plantilla `window.LUNABI_SUPABASE = { url, anonKey }`
        ├── api.js              `window.LuApi`: capa única con ramas REMOTE (Supabase)
        │                       y LOCAL (localStorage). Carga SDK de Supabase on-demand
        ├── auth.js             login/registro con Supabase Auth si remoto,
        │                       SHA-256 + localStorage si local
        ├── main.js             orquestador: ventas, favoritos, recompute best-sellers,
        │                       WhatsApp picker delegado, renderProductCard, modal quick-view,
        │                       renderHomePage/renderCategory.../renderProductoPage/etc.,
        │                       initApp() dispatch, rerenderCurrentPage()
        ├── admin.js            CRUD productos/marcas/diapositivas + panel Pedidos
        │                       con stage picker; sincroniza a Supabase vía LuApi
        ├── cuenta.js           Mi cuenta: nivel de membresía, pedidos con timeline
        │                       de envío (2 tramos: internacional + nacional), favoritos,
        │                       rutina guardada del test, perfil + logout
        ├── skintest.js         botón flotante + modal con 7 preguntas dermatológicas
        │                       y generador de rutina 5-8 pasos desde el catálogo
        └── chatbot.js          botón flotante "Luna" + chat con 20+ intents entrenados
                                desde InfoPieDePagina.txt
```

## Page skeleton

```html
<body data-page="skincare">                       <!-- router reads this filename key -->
  <div class="bg-orbs">…</div>                    <!-- celestial background -->
  <div id="navbar-container"></div>               <!-- filled by components.js -->
  <main id="main-content">
    <!-- page-specific markup -->
  </main>
  <div id="modal-container"></div>                <!-- product modal + auth modal + WA picker modal + image editor -->
  <div id="carrito-drawer"></div>                 <!-- cart drawer with inline WA picker -->
  <div id="footer-container"></div>
  <div id="toast-container"></div>
  <a class="whatsapp-float">…</a>                 <!-- intercepted globally → opens WA picker -->

  <!-- script order is load-bearing — don't rearrange -->
  <script src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/js/bootstrap.bundle.min.js"></script>
  <script src="assets/js/data.js"></script>
  <script src="assets/js/theme.js"></script>
  <script src="assets/js/carrito.js"></script>
  <script src="assets/js/buscador.js"></script>
  <script src="assets/js/filtros.js"></script>
  <script src="assets/js/router.js"></script>
  <script src="assets/js/components.js"></script>   <!-- injects DOM + supabase.config.js + api.js + skintest + chatbot -->
  <script src="assets/js/auth.js"></script>
  <script src="assets/js/main.js"></script>
</body>
```

`admin.html` loads `admin.js` before `main.js`; `cuenta.html` loads `cuenta.js` before `main.js`. All floats (`.whatsapp-float`, logo skintest, chatbot, chat) live only once and are either hardcoded in HTML (WA float) or injected dynamically by `components.js`.

## Initialization order

1. **bootstrap.bundle** — Modal / Tab / Carousel available.
2. **data.js** — populates `products` / `brands`, merges admin overrides from localStorage (upsert by id), captures `window.__baseProductMaxId` / `__baseBrandMaxId` **before** merge so the admin distinguishes "nuevo" vs "editado", then fires a rehydration from Supabase if `LuApi.isRemote()`.
3. **theme.js** — applies `body.dark` immediately to minimise FOUC.
4. **carrito.js, buscador.js, filtros.js, router.js** — register helpers on `window`; do NOT attach DOM listeners yet.
5. **components.js** — `injectComponents()` fills the 4 container divs synchronously, **also** `<script>`-injects `supabase.config.js`, `api.js`, `skintest.js`+`skintest.css`, `chatbot.js`+`chatbot.css` into `<head>`. Supabase SDK is fetched only when `LuApi.ready()` is first called.
6. **admin.js / cuenta.js** (only on their pages).
7. **auth.js** — defines `registerUser/loginUser/logoutUser`; branches by `LuApi.isRemote()`.
8. **main.js** — defines `WA_NUMBERS` (Huancayo local + Nacional), sales tracking, favorites, `renderProductCard`, `openProductModal`, page renderers; calls `initApp()` which dispatches by `getCurrentPage()`.

Don't move `components.js` before the other modules — those register globals first, `components.js` only injects DOM and auxiliary scripts.

## Architecture details

### Data layer

- **`data.js`** — `brands` (`{id, nombre, slug, logo, descripcion}`) and `products` (`{id, slug, nombre, marca, categoria, subcategoria, tipoPiel[], precio, precioAntes, imagenes[], descripcion, modoDeUso[], beneficios[], masVendido, enOferta}`). Products reference brands by `slug`. `tipoPiel` is an array. `categoria` is grouped via `SKINCARE_STRUCTURE`/`MAQUILLAJE_STRUCTURE`/`CORPORAL_STRUCTURE` in `router.js`.
- **Admin overrides** (`lunabi_admin_products`, `lunabi_admin_brands`): merged into `products`/`brands` with upsert semantics — if id exists, the admin version replaces the base; if not, it's appended.
- **Remote rehydration**: after merge, if `LuApi.isRemote()`, `data.js` fetches from Supabase view `v_products` and table `brands`, replaces the arrays in-place, then calls `window.rerenderCurrentPage()` to refresh the current view.

### API layer

- **`supabase.config.js`** — `window.LUNABI_SUPABASE = { url, anonKey }`. Empty = offline mode.
- **`api.js`** — `window.LuApi` with ~20 methods. Each method has two branches:
  - **REMOTE**: `ensureSupabase()` lazy-loads the SDK, then uses `client.from(...).select/insert/update` or `client.rpc(...)`.
  - **LOCAL**: reads/writes `localStorage` with the same object shape the rest of the code expects.
- Methods: `listProducts`, `listBrands`, `listSlides`, `signUp/signIn/signOut/getUser`, `listFavorites/toggleFavorite`, `saveSkintest/getMySkintest`, `createOrder/listMyOrders/listAllOrders/updateOrderStage`, `recordSale/getSalesMap`, `adminUpsertProduct/adminDeleteProduct`, `adminUpsertBrand/adminDeleteBrand`, `adminUpsertSlide/adminDeleteSlide`, `getSetting`, `isRemote()`.
- **Pattern**: every other module checks `window.LuApi && window.LuApi.isRemote()` before calling the API. Writes are done **to both** storages when possible so the UX (e.g. Mi cuenta) never blanks on network hiccups.

### Routing

True multi-page. Query strings deep-link filters:

- `skincare.html?categoria=serum[&tipo=foam]`
- `marca-detalle.html?marca=beauty-of-joseon`
- `producto.html?id=3`

`getQueryParam()` in `router.js` reads params; `renderProductoPage()` in `main.js` does the lookup.

### Cart + two WhatsApp numbers

- Cart persisted to `localStorage['lunabi_cart']` as `[{id, qty}]`. Prices/images/names re-resolved from `products` every render.
- **Two WhatsApp numbers** in `main.js`:
  ```js
  window.WA_NUMBERS = {
    local:    { number: '51XXXXXXXXX', label: 'Huancayo y alrededores', hint: '…' },
    nacional: { number: '51YYYYYYYYY', label: 'Envíos nacionales',      hint: '…' }
  };
  ```
- `window.openWhatsApp(message)` opens the **global** modal picker (`#waPickerModal` in `components.js`) — used by WA float, product modal/page, contact form, reclamaciones form, footer icon, chatbot references.
- The **cart drawer** has its own **inline** picker inside the footer: clicking "Enviar pedido por WhatsApp" collapses the primary row and expands two Huancayo/Nacional options in place (no modal). See `.cart-footer-wa` in `components.js` + `toggleCartWaPicker()` + `finalizeOrder(waKey)` in `carrito.js`.
- A global delegated click listener in `main.js` intercepts `.whatsapp-float` and `.lu-wa-link` clicks and calls `openWhatsApp('')` so hardcoded `<a href>` in the 15 HTMLs never need to be edited individually.

### Orders + shipment tracking

- When the user finalises a WA order, `carrito.js`:
  1. `persistOrder(waKey)` — saves a full snapshot (items with nombre/marca/imagen/precio, total, createdAt, stageKey=null) to `localStorage['lunabi_orders'][email|'guest']`. If remote, also `LuApi.createOrder()` which inserts into `orders` + `order_items`.
  2. `window.recordSales(cart)` — increments sales map (local + `record_sale` RPC on Supabase).
  3. `window.open('https://wa.me/…')` with the chosen number.
- **6-stage timeline** (`cuenta.js` `SHIPMENT_STAGES`): `confirmado` (0h) → `preparacion` (+24h) → `internacional` (+72h) → `aduana` (+264h, 11d) → `nacional` (+360h, 15d) → `entregado` (+432h, 18d). First 4 stages are the **international leg** (Corea → Perú), last 2 are the **national leg**. Matches the 15–20 días hábiles of `InfoPieDePagina.txt`.
- **Auto-compute vs manual**: if `order.stageKey` is set by admin, the timeline uses it; otherwise `computeStages()` infers current stage by hours elapsed. `inferStatus()` maps stages to the status badge (pendiente/confirmado/enviado/entregado).
- Admin panel → **tab Pedidos**: lists flattened orders from all users, filter chips per stage, 6-pill stage picker per card, "Volver a automático" to unset manual, delete button. Calls `LuApi.updateOrderStage()` when remote.

### Admin panel (`admin.html`)

Sidebar with 5 tabs: Dashboard · **Pedidos** · Productos · Carrusel · Marcas. `admin.js`:

- **Dashboard**: greeting (hora + nombre), ring SVG de salud del catálogo (% de fichas completas con ≥2 imágenes, desc ≥40 chars, modoDeUso, beneficios, tipoPiel), 8 KPIs animados (con `animateCounter`), 4 bar-charts (categoría / top marcas / precio buckets / cobertura tipo de piel), insights autogenerados (top-seller, unidades vendidas, veredicto de salud, resumen de descuentos), lista "Necesita atención" (productos incompletos + marcas sin productos), últimos 5 productos.
- **Productos**: form con slug auto (readonly desde `slugify(nombre)` + unicidad), selects anidados categoría→subcategoría, repeater de imágenes con **image editor modal** (crop + zoom + pan, exporta a tamaño exacto por slot: 800×800 producto, 400×400 marca, 1600×900 banner). Soporta editar base products (guarda override) y admin-added; "Revertir al original" borra la entrada admin.
- **Marcas / Carrusel**: mismo patrón editar + upsert + revert.
- **Etiquetas**: `admin` chip rosa = nuevo, `editado` chip dorado = override de base.
- Syncs a Supabase via `syncProduct/syncBrand/syncSlide/syncOrderStage` (fire-and-forget si remoto).

### Mi cuenta (`cuenta.html`)

Sin gate — acceso directo como el admin. Si no hay sesión, usa perfil "Invitada" con datos de `guest`. Secciones:

- **Hero**: avatar con inicial, nivel de membresía (Bronce/Plata/Oro/Platino según total gastado con barra de progreso al siguiente nivel).
- **4 stats**: pedidos, total gastado, favoritos, pasos de rutina.
- **Tabs**:
  - **Pedidos** — cada tarjeta muestra los items + **timeline de envío expandible** con 2 cards (tramo internacional / nacional) y los 6 pasos con dots (done/current/pending) y fechas estimadas. Botones "Repetir pedido" y "Marcar entregado".
  - **Favoritos** — grid con `renderProductCard` + "Añadir todo al carrito".
  - **Mi rutina** — resultado guardado del test con tags del perfil, pasos numerados, "Añadir toda la rutina" + "Repetir test".
  - **Perfil** — nombre/email/miembro desde + logout. En modo invitada → CTA login/registro.

### Skintest (módulo flotante)

- Botón flotante (posición `bottom: 100px`, sobre WhatsApp) con logo y halo conic-gradient rotante + shine.
- Modal con 7 preguntas dermatológicas (tipo de piel, preocupación, edad, exposición solar, textura, experiencia, exfoliación), barra de progreso, auto-avance tras seleccionar.
- `buildRoutine(answers)` arma 5–8 pasos en orden dermatológico: limpieza → tónico → serum (por keyword de la preocupación: BHA, arbutin, retinol, hialurónico, centella, etc.) → hidratante → SPF → contorno (si ≥30 años) → sleeping mask (piel seca/deshidratada) → exfoliante (si no exfolia y nivel intermedio+).
- Persiste resultado (`answers` + `productIds`) en `lunabi_skintest[email|'guest']` y en Supabase si remoto.

### Chatbot "Luna"

- Botón flotante a `bottom: 176px` (arriba del skintest). Ventana de chat estilo messenger.
- **20+ intents** entrenados desde `InfoPieDePagina.txt` con scoring por frase completa (×10) / token exacto (×2) / prefijo (×1), umbral mínimo de 6 puntos.
- Cada intent puede traer `products` (filtro del catálogo) y `chips` (sugerencias contextuales que cambian por tema).
- Typing indicator con delay proporcional al largo de la respuesta.

### Favorites (heart)

- `lunabi_favs` en localStorage como `[id,id,...]`. `toggleFavorite(id)` actualiza todos los botones con `[data-fav-id="X"]` al mismo tiempo (card chica + botón grande centrado del detalle + modal).
- Si remoto, sincroniza con `LuApi.toggleFavorite()` (tabla `favorites` con PK compuesta user_id+product_id).

### Best-sellers dinámicos

- Tras cada pedido, `main.js` `recomputeBestSellers()` asigna `masVendido = true` a los **top K** productos por ventas (K = `clamp(3, ceil(catalog × 15%), 8)`). Si no hay ventas, respeta los flags originales capturados en `originalFlags`.
- El contador de ventas en `localStorage['lunabi_ventas']` se alimenta desde `recordSales(items)`; en modo remoto se delega a `LuApi.recordSale` → `record_sale(product_id, qty)` RPC con `security definer`.

### Tabs color-coded (producto)

Los 3 tabs de la ficha de producto (`#productModal` y `producto.html`) tienen:

- **Icono** por tab: `bi-info-circle-fill` / `bi-list-check` / `bi-check2-circle`.
- **Gradient activo distinto**: Info → morado deep, Uso → lila, Beneficios → rosa con texto morado.
- **Paneles tintados**: cada `<div class="tab-pane">` tiene su propio border-left accent y background sutil que casa con el tab.
- Los pasos del modo de uso tienen icono en círculo gradient; los beneficios tienen check verde.

### Contacto

- **5 canales** en cards con color de marca: Facebook (`#1877F2`), Messenger, WhatsApp, Instagram (gradient clásico), TikTok (fondo negro con glitch turquesa/rosa), correo (morado Lünabi).
- **Footer** también lleva iconos WhatsApp, Instagram, Facebook, TikTok (el de WA abre el picker Huancayo/Nacional).

## Backend (Supabase) — DESPLEGADO

El backend **ya está activo**. Proyecto Supabase "Lunabi" desplegado en `sa-east-1` (São Paulo, Perú-latency).

- **Project ID / ref**: `ukfbrkcxkxiwgpgitxvm`
- **URL**: `https://ukfbrkcxkxiwgpgitxvm.supabase.co`
- **Dashboard**: https://supabase.com/dashboard/project/ukfbrkcxkxiwgpgitxvm
- **Plan**: Free ($0/mes)
- **Organización**: Luis-Eduardo-2006's Org (`oaavbzqhnwsdvawzqyaw`)
- **Credenciales**: ya cargadas en [`assets/js/supabase.config.js`](assets/js/supabase.config.js). `LuApi.isRemote()` devuelve `true` → todos los módulos hablan con Supabase.
- **MCP de Supabase**: configurado en [`.mcp.json`](.mcp.json) — desde Claude Code se puede `execute_sql`, `apply_migration`, `get_advisors`, `list_projects`, `list_tables`, etc. para administrar el proyecto sin salir del editor.

### Esquema aplicado

**Tablas** (10, todas con RLS activo): `profiles` (extiende `auth.users`), `brands`, `products`, `hero_slides`, `orders`, `order_items`, `favorites`, `skintest_results`, `sales`, `site_settings`.

**Vista `v_products`** — renombra columnas a camelCase (`tipoPiel`, `precioAntes`, `modoDeUso`, `masVendido`, `enOferta`) + join con `sales` para exponer `ventas`. Declarada `security_invoker = true` para respetar RLS del caller (no bypass). Los renderers del frontend consumen esta vista sin cambios.

**Funciones**:
- `public.is_admin()` — helper stable security-definer, lee `profiles.is_admin` del caller. Usado en RLS.
- `public.handle_new_user()` + trigger `on_auth_user_created` — al crear fila en `auth.users`, auto-inserta su `profiles` con `email`, `nombre` (`raw_user_meta_data->>'nombre'`), `is_admin=false`.
- `public.record_sale(p_product_id bigint, p_qty int)` — RPC `security definer`. Upsert sobre `sales`: si el producto ya tiene fila, suma el qty; si no, la crea. Llamado por el cliente tras cada pedido WA.

**Tipos enum**: `order_status` (pendiente/confirmado/enviado/entregado/cancelado), `shipment_stage` (confirmado/preparacion/internacional/aduana/nacional/entregado).

**Políticas RLS clave**:
- `profiles`: read = self o admin; update = solo self.
- `brands`, `products`, `hero_slides`, `site_settings`: read público; write solo `is_admin()`.
- `orders`: read = self o admin; insert = user_id null o self; update = self o admin; delete = solo admin.
- `order_items`: permiso vía `orders` (si puedes leer/escribir el order parent, idem los items).
- `favorites`, `skintest_results`: CRUD solo del `auth.uid() = user_id`.
- `sales`: read público; write directa solo admin (el flujo normal pasa por el RPC `record_sale`).

**Storage**:
- Buckets públicos: `products`, `brands`, `slides`. Los 3 tienen `public = true` → se pueden consumir vía URL directa.
- Escritura restringida: policy `admin_write_<bucket>` en `storage.objects` permite `INSERT/UPDATE/DELETE` solo si `public.is_admin()`.
- **No hay policy de SELECT amplia** (el bucket público ya permite GETs por URL sin necesidad de listar). Esto cierra el advisor `public_bucket_allows_listing`.

### Semilla inicial

`site_settings.wa_numbers` ya sembrado con los dos WhatsApp (Huancayo + Nacional, placeholders `51XXXXXXXXX`/`51YYYYYYYYY`). El resto de tablas (`brands`, `products`, `hero_slides`) están vacías al momento del despliegue — el sitio se verá sin productos hasta sembrarlo desde el admin panel o con un INSERT masivo.

### Primer admin

Como no se puede crear un admin con un JWT anónimo (las policies impiden editar `profiles.is_admin`), el flujo es:

1. Registrarse desde [`registro.html`](registro.html) con tu correo.
2. En el Table Editor de Supabase → tabla `profiles` → marcar `is_admin = true` en tu fila. O vía SQL desde el MCP: `UPDATE profiles SET is_admin = true WHERE email = 'tu@email.com';`.

### Cómo volver a modo offline

Dejar `url` y `anonKey` vacíos en [`supabase.config.js`](assets/js/supabase.config.js) y recargar. `LuApi.isRemote()` devolverá `false` y todos los módulos vuelven a leer/escribir localStorage sin tocar nada más del código.

## Design system (CSS tokens)

`style.css` expone semantic tokens en `:root` y los redefine en `body.dark`. Paleta:

- `--p-purple-deep` `#682ABF`, `--p-purple-vibrant` `#7732D9`, `--p-pink-soft` `#F6C6F9`, `--p-lavender-light` `#D9B7FF`, `--p-lila-mid` `#9F84E6`, `--p-white-warm` `#F2F2F2`, `--p-beige-soft` `#F5EFE8`, `--p-gray-warm` `#EAE7F2`.

Regla 60-30-10: 60% neutros, 30% pastel, 10% morados intensos. Transiciones de tema 0.45s. Footer siempre morado oscuro `#1a0f2e`.

## Conventions

- Todo el copy es en español.
- Slugs en español (`beauty-of-joseon`, `serum`, `limpieza`) — consistentes con los existentes.
- Cada página HTML declara `<body data-page="<filename-sin-ext>">` — `main.js` lo lee por `getCurrentPage()`.
- Las 5 rutas de categoría (`skincare`, `maquillaje`, `corporal`, `accesorios`, `sale`) + `marca-detalle` comparten sidebar/sort/grid. Añadir categoría = copiar `skincare.html`, actualizar `data-page`, título/subtítulo y añadir entrada en `PAGES` de `router.js`.
- Navbar / footer / modales / cart drawer viven **solo** en `components.js`. Editarlos allí, no por HTML.
- La navbar usa Bootstrap `.navbar.navbar-expand-lg.fixed-top` con `.navbar-glass`. Dropdowns en desktop **hover** (CSS); en móvil, colapsados dentro de `.navbar-collapse`. No se usa `data-bs-toggle="dropdown"`.
- Nuevas persistencias → pásalas por `LuApi` (en `api.js`) con ramas REMOTE/LOCAL, no escribas directo a localStorage desde módulos de producto.
- Nuevas features flotantes/globales → considera cargarlas lazy desde `components.js` via `loadModule(id, css, js)` para no editar los 15 HTMLs.
- Tras edits CSS/JS avisa al usuario de hacer `Ctrl+F5` (hard refresh).
