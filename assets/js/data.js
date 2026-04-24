/* ===== LÜNABI — Data Layer =====
 *
 * Catálogo base vacío. La fuente de verdad ahora vive en Supabase
 * (tablas `brands` y `products`). Estos arrays se rellenan por:
 *   1. Admin overrides desde localStorage (ediciones offline).
 *   2. Rehidratación remota desde Supabase al cargar si LuApi.isRemote().
 *
 * Si necesitas sembrar productos, usa el panel admin (`admin.html`)
 * o el scraper local (`scripts/scrape-yesstyle.js --import`). */

const brands   = [];
const products = [];
window.brands   = brands;
window.products = products;

/* ---------- Admin overrides (localStorage) ----------
 * El panel admin en admin.html persiste productos, marcas y diapositivas
 * en localStorage. Aquí se mezclan al catálogo base con semántica "upsert":
 *   - Si el id NO existe en base → se añade (producto/marca nuevo).
 *   - Si el id YA existe → se reemplaza (edición del catálogo base).
 *
 * También capturamos los IDs máximos del catálogo base ANTES del merge
 * para que el admin pueda distinguir entre "nuevo" y "editado". */
window.__baseProductMaxId = products.reduce((m, p) => Math.max(m, p.id), 0);
window.__baseBrandMaxId   = brands.reduce((m, b) => Math.max(m, b.id), 0);

(function() {
  try {
    const extraP = JSON.parse(localStorage.getItem('lunabi_admin_products') || '[]');
    if (Array.isArray(extraP)) {
      extraP.forEach(p => {
        if (!p || typeof p.id !== 'number') return;
        const idx = products.findIndex(q => q.id === p.id);
        if (idx === -1) products.push(p);
        else products[idx] = p;
      });
    }
  } catch (e) { /* storage corrupt — ignore */ }
  try {
    const extraB = JSON.parse(localStorage.getItem('lunabi_admin_brands') || '[]');
    if (Array.isArray(extraB)) {
      extraB.forEach(b => {
        if (!b || typeof b.id !== 'number') return;
        const idx = brands.findIndex(x => x.id === b.id);
        if (idx === -1) brands.push(b);
        else brands[idx] = b;
      });
    }
  } catch (e) { /* storage corrupt — ignore */ }
})();

/* ---------- Rehidratación remota desde Supabase ----------
 * Si LuApi.isRemote() (config con url+anonKey), sobrescribimos products y
 * brands con los datos del backend y avisamos a los módulos que re-rendericen.
 * No bloqueamos el render inicial — primero se pinta con data.js local y
 * después con los datos del servidor. */
(function rehydrateFromRemote() {
  async function go() {
    if (!window.LuApi || !window.LuApi.isRemote()) return;
    try {
      const [remoteProducts, remoteBrands] = await Promise.all([
        window.LuApi.listProducts(),
        window.LuApi.listBrands()
      ]);
      if (Array.isArray(remoteBrands) && remoteBrands.length) {
        brands.splice(0, brands.length, ...remoteBrands);
      }
      if (Array.isArray(remoteProducts) && remoteProducts.length) {
        products.splice(0, products.length, ...remoteProducts);
      }
      if (typeof window.recomputeBestSellers === 'function') window.recomputeBestSellers();
      // Re-render: si la página actual tiene renderer, lo dispara de nuevo
      if (typeof window.rerenderCurrentPage === 'function') window.rerenderCurrentPage();
      document.dispatchEvent(new Event('lunabi:data-ready'));
    } catch (e) { console.warn('[data.js] rehidratación remota falló', e); }
  }
  // Espera a que LuApi esté cargado (api.js es async)
  const iv = setInterval(() => {
    if (window.LuApi) { clearInterval(iv); go(); }
  }, 60);
  setTimeout(() => clearInterval(iv), 8000);
})();
