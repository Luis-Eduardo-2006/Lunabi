#!/usr/bin/env node
/* ===== LÜNABI — Scraper YesStyle → Supabase =====
 *
 * Uso local únicamente (no correr en producción). Consulta las condiciones
 * de uso de YesStyle antes de ejecutarlo. Está limitado a 1 req/3s por
 * cortesía y para evitar bloqueos.
 *
 * Modos:
 *   node scrape-yesstyle.js --url "https://www.yesstyle.com/es/beauty-of-joseon/list.html" --max 20
 *   node scrape-yesstyle.js --urls-file urls.txt --max 50
 *   node scrape-yesstyle.js --out productos.json           (solo escribe JSON)
 *   node scrape-yesstyle.js --out productos.json --import  (JSON + Supabase)
 *
 * Variables de entorno (en .env o shell):
 *   SUPABASE_URL          — ej. https://ukfbrkcxkxiwgpgitxvm.supabase.co
 *   SUPABASE_SERVICE_KEY  — service_role key (NO la anon!) — Project Settings → API
 */

const fs        = require('fs');
const path      = require('path');
const minimist  = require('minimist');
const { chromium } = require('playwright');

/* ---------- .env loader minimal ---------- */
(function loadEnv() {
  const p = path.join(__dirname, '.env');
  if (!fs.existsSync(p)) return;
  for (const line of fs.readFileSync(p, 'utf8').split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Z_][A-Z0-9_]*)\s*=\s*(.+?)\s*$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, '');
  }
})();

const argv = minimist(process.argv.slice(2), {
  default: {
    max: 30,
    out: 'productos.json',
    delay: 3000,       // ms entre requests (cortesía)
    headless: true,
    timeout: 45000,
  },
  alias: {
    u: 'url', f: 'urls-file', m: 'max',
    o: 'out', i: 'import', d: 'delay', h: 'help'
  },
  boolean: ['import', 'dry-run', 'headless', 'help']
});

if (argv.help) {
  console.log(fs.readFileSync(__filename, 'utf8').split('*/')[0]);
  process.exit(0);
}

/* ================================================================
 * Mapeo YesStyle → categorías de LÜNABI (router.js)
 * Edita libremente si tu catálogo usa otras.
 * ================================================================ */
const CATEGORY_MAP = [
  { keywords: ['cleanser', 'cleansing foam', 'espumoso', 'limpiador'],        categoria: 'limpieza',      subcategoria: 'foam' },
  { keywords: ['cleansing oil', 'aceite limpiador'],                           categoria: 'limpieza',      subcategoria: 'aceite' },
  { keywords: ['makeup remover', 'desmaquillante'],                            categoria: 'limpieza',      subcategoria: 'desmaquillante' },
  { keywords: ['toner', 'tonico', 'tónico'],                                   categoria: 'tonico' },
  { keywords: ['serum', 'ampoule', 'ampolla', 'suero'],                        categoria: 'serum' },
  { keywords: ['essence', 'esencia'],                                          categoria: 'esencia' },
  { keywords: ['sheet mask', 'mascarilla'],                                    categoria: 'mascarillas',   subcategoria: 'algodon' },
  { keywords: ['sleeping mask', 'sleeping pack'],                              categoria: 'sleeping-mask' },
  { keywords: ['exfoliat', 'peeling'],                                         categoria: 'exfoliante' },
  { keywords: ['eye cream', 'contorno'],                                       categoria: 'contorno-ojos', subcategoria: 'crema' },
  { keywords: ['eye patch', 'parches'],                                        categoria: 'contorno-ojos', subcategoria: 'parches' },
  { keywords: ['mist', 'spray facial'],                                        categoria: 'mist' },
  { keywords: ['sunscreen', 'sun cream', 'spf', 'bloqueador', 'protector'],    categoria: 'bloqueador',    subcategoria: 'liquido' },
  { keywords: ['tone up', 'tono'],                                             categoria: 'tone-up' },
  { keywords: ['pad', 'cotton pads'],                                          categoria: 'pads',          subcategoria: 'tonico' },
  { keywords: ['lotion', 'emulsion', 'locion'],                                categoria: 'locion' },
  { keywords: ['cream', 'crema', 'moisturizer', 'moisturizing'],               categoria: 'crema-facial' },
  // Maquillaje
  { keywords: ['cushion'],                                                     categoria: 'rostro',        subcategoria: 'cushion' },
  { keywords: ['bb cream'],                                                    categoria: 'rostro',        subcategoria: 'bb-cream' },
  { keywords: ['cc cream'],                                                    categoria: 'rostro',        subcategoria: 'cc-cream' },
  { keywords: ['blush', 'rubor'],                                              categoria: 'rostro',        subcategoria: 'rubor' },
  { keywords: ['powder', 'polvo'],                                             categoria: 'rostro',        subcategoria: 'polvos' },
  { keywords: ['eyeliner', 'delineador'],                                      categoria: 'ojos',          subcategoria: 'delineador' },
  { keywords: ['eyebrow', 'ceja'],                                             categoria: 'ojos',          subcategoria: 'cejas' },
  { keywords: ['eyeshadow', 'sombra'],                                         categoria: 'ojos',          subcategoria: 'sombras' },
  { keywords: ['mascara', 'rimel'],                                            categoria: 'ojos',          subcategoria: 'rimel' },
  { keywords: ['lip tint', 'tinta labial', 'tinta liquida'],                   categoria: 'labios',        subcategoria: 'tinta-liquida' },
  { keywords: ['lip gloss', 'gloss'],                                          categoria: 'labios',        subcategoria: 'gloss' },
  { keywords: ['lip balm', 'balsamo'],                                         categoria: 'labios',        subcategoria: 'balsamo' },
  { keywords: ['matte lipstick', 'lipstick mate'],                             categoria: 'labios',        subcategoria: 'mate' },
  // Corporal
  { keywords: ['body lotion', 'body cream', 'body oil'],                       categoria: 'cuerpo' },
  { keywords: ['hair', 'shampoo', 'conditioner'],                              categoria: 'cabello' },
  { keywords: ['hand cream'],                                                  categoria: 'manos' },
  { keywords: ['foot'],                                                        categoria: 'pies' }
];

const SKIN_TYPE_KEYWORDS = {
  'seca':     ['dry skin', 'piel seca'],
  'grasa':    ['oily', 'piel grasa'],
  'mixta':    ['combination', 'piel mixta'],
  'normal':   ['normal skin'],
  'sensible': ['sensitive', 'piel sensible']
};

/* ================================================================
 * HELPERS
 * ================================================================ */
function slugify(s) {
  return String(s || '').toLowerCase()
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 80);
}

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

function detectCategory(text) {
  const t = (text || '').toLowerCase();
  for (const row of CATEGORY_MAP) {
    if (row.keywords.some(kw => t.includes(kw))) {
      return { categoria: row.categoria, subcategoria: row.subcategoria || null };
    }
  }
  return { categoria: 'serum', subcategoria: null };
}

function detectSkinTypes(text) {
  const t = (text || '').toLowerCase();
  const out = [];
  for (const [key, kws] of Object.entries(SKIN_TYPE_KEYWORDS)) {
    if (kws.some(k => t.includes(k))) out.push(key);
  }
  return out;
}

/* ================================================================
 * SCRAPER CORE
 * ================================================================ */
async function collectProductUrls(page, listUrl, max) {
  console.log(`[list] Cargando ${listUrl}`);
  await page.goto(listUrl, { waitUntil: 'networkidle', timeout: argv.timeout });
  // Auto-scroll unas cuantas veces por si YesStyle carga con lazy-load
  for (let i = 0; i < 4; i++) {
    await page.evaluate(() => window.scrollBy(0, window.innerHeight * 2));
    await sleep(800);
  }
  const urls = await page.$$eval('a[href*="/info.html/pid."]', as => {
    const set = new Set();
    as.forEach(a => set.add(a.href.split('#')[0].split('?')[0]));
    return [...set];
  });
  console.log(`[list] Encontrados ${urls.length} productos únicos`);
  return urls.slice(0, max);
}

async function scrapeProduct(page, url) {
  await page.goto(url, { waitUntil: 'networkidle', timeout: argv.timeout });
  await sleep(500);

  const raw = await page.evaluate(() => {
    const txt = (el) => el ? el.textContent.replace(/\s+/g, ' ').trim() : '';
    const meta = (name) => {
      const el = document.querySelector(`meta[name="${name}"], meta[property="${name}"]`);
      return el ? el.getAttribute('content') : '';
    };

    // Nombre: h1 → og:title
    const nombre = txt(document.querySelector('h1')) || meta('og:title');

    // Marca: busca link a /brand/
    const brandA = document.querySelector('a[href*="/brand/"], a[href*="-brand/"]');
    const marca = txt(brandA) || '';

    // Precio: YesStyle usa varios selectores, probamos en orden.
    const priceCandidates = [
      '.ys-proddetail-price .rawValue',
      '[data-testid*="sale"][data-testid*="price"]',
      '[data-testid*="price"]',
      '.sale-price',
      '.ys-price',
      '[class*="price"]:not([class*="old"]):not([class*="original"])'
    ];
    let priceRaw = '';
    for (const sel of priceCandidates) {
      const el = document.querySelector(sel);
      if (el && el.textContent) { priceRaw = el.textContent; break; }
    }
    const priceMatch = priceRaw.replace(/[^\d.,]/g, '').match(/[\d.]+/);
    const precio = priceMatch ? parseFloat(priceMatch[0].replace(/,/g, '')) : 0;
    const currency = (priceRaw.match(/(US\$|S\/|€|£|\$)/) || [])[0] || 'US$';

    // Imágenes: patrón YesStyle es /pdt_pic/
    const imgSet = new Set();
    document.querySelectorAll('img').forEach(img => {
      const src = img.src || img.getAttribute('data-src') || '';
      if (src.includes('/pdt_pic/')) {
        // Reemplaza thumbnail por tamaño grande
        imgSet.add(src.replace(/\/cgl\//g, '/s/').replace(/\/ms\//g, '/l/'));
      }
    });
    const imagenes = [...imgSet].slice(0, 6);

    // Descripción: varios selectores
    const descCandidates = [
      '[itemprop="description"]',
      '#product-description',
      '.product-description',
      '[class*="description"] [class*="content"]',
      '[data-testid*="description"]'
    ];
    let descripcion = '';
    for (const sel of descCandidates) {
      const el = document.querySelector(sel);
      if (el) { descripcion = txt(el); if (descripcion.length > 40) break; }
    }
    if (!descripcion) descripcion = meta('description') || meta('og:description');

    // Breadcrumb (para inferir categoría)
    const breadcrumb = [...document.querySelectorAll('nav a, [class*="breadcrumb"] a')]
      .map(a => a.textContent.trim()).filter(Boolean);

    return { nombre, marca, precio, currency, imagenes, descripcion, breadcrumb };
  });

  return raw;
}

function mapToLunabi(raw, sourceUrl) {
  const { categoria, subcategoria } = detectCategory(
    raw.breadcrumb.join(' ') + ' ' + raw.nombre
  );
  const tipoPiel = detectSkinTypes(raw.descripcion + ' ' + raw.nombre);

  // Convierte USD → PEN (aprox. 3.75 si YesStyle mostró US$) con 1.5× margen
  const rateUsdPen = 3.75;
  const margen = 1.5;
  const precioPen = raw.currency.includes('US$')
    ? +(raw.precio * rateUsdPen * margen).toFixed(2)
    : +raw.precio.toFixed(2);

  return {
    slug: slugify(raw.nombre) || ('producto-' + Date.now()),
    nombre: raw.nombre,
    marca: slugify(raw.marca),
    categoria,
    subcategoria,
    tipo_piel: tipoPiel,
    precio: precioPen,
    precio_antes: null,
    imagenes: raw.imagenes,
    descripcion: raw.descripcion.slice(0, 1200),
    modo_de_uso: [],
    beneficios: [],
    mas_vendido: false,
    en_oferta: false,
    _source_url: sourceUrl,
    _brand_name: raw.marca
  };
}

/* ================================================================
 * SUPABASE IMPORT
 * ================================================================ */
async function importToSupabase(productos) {
  const SUPABASE_URL = process.env.SUPABASE_URL;
  const SERVICE_KEY  = process.env.SUPABASE_SERVICE_KEY;
  if (!SUPABASE_URL || !SERVICE_KEY) {
    console.error('\n❌ Faltan SUPABASE_URL y/o SUPABASE_SERVICE_KEY. Crea scripts/.env o exporta en tu shell.\n   La service role key se obtiene en: Project Settings → API → service_role.\n');
    process.exit(1);
  }
  const { createClient } = require('@supabase/supabase-js');
  const sb = createClient(SUPABASE_URL, SERVICE_KEY, {
    auth: { persistSession: false }
  });

  console.log(`\n[db] Importando ${productos.length} productos a Supabase…`);

  // 1. Upsert marcas primero
  const brandsMap = new Map();
  for (const p of productos) {
    if (p._brand_name && !brandsMap.has(p.marca)) {
      brandsMap.set(p.marca, p._brand_name);
    }
  }
  for (const [slug, nombre] of brandsMap.entries()) {
    if (!slug) continue;
    const { error } = await sb.from('brands').upsert(
      { slug, nombre, descripcion: `${nombre} — importada desde YesStyle.`, is_active: true },
      { onConflict: 'slug' }
    );
    if (error) console.warn(`[db] brand "${slug}":`, error.message);
    else console.log(`[db] ✓ brand ${slug}`);
  }

  // 2. Upsert productos (por slug)
  let ok = 0, fail = 0;
  for (const p of productos) {
    const row = {
      slug: p.slug,
      nombre: p.nombre,
      marca: p.marca,
      categoria: p.categoria,
      subcategoria: p.subcategoria,
      tipo_piel: p.tipo_piel,
      precio: p.precio,
      precio_antes: p.precio_antes,
      imagenes: p.imagenes,
      descripcion: p.descripcion,
      modo_de_uso: p.modo_de_uso,
      beneficios: p.beneficios,
      mas_vendido: p.mas_vendido,
      en_oferta: p.en_oferta,
      is_active: true
    };
    const { error } = await sb.from('products').upsert(row, { onConflict: 'slug' });
    if (error) { fail++; console.warn(`[db] product "${p.slug}":`, error.message); }
    else { ok++; console.log(`[db] ✓ product ${p.slug}`); }
  }
  console.log(`\n[db] Hecho. ${ok} insertados/actualizados, ${fail} fallos.`);
}

/* ================================================================
 * MAIN
 * ================================================================ */
async function main() {
  // 1. Determinar URLs a scrapear
  let productUrls = [];
  if (argv['urls-file']) {
    productUrls = fs.readFileSync(argv['urls-file'], 'utf8')
      .split(/\r?\n/).map(s => s.trim()).filter(Boolean);
    console.log(`[in] ${productUrls.length} URLs desde ${argv['urls-file']}`);
  } else if (argv.url) {
    const browser = await chromium.launch({ headless: argv.headless });
    const ctx = await browser.newContext({
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) LunabiScraper/1.0',
      locale: 'es-PE'
    });
    const page = await ctx.newPage();
    productUrls = await collectProductUrls(page, argv.url, argv.max);
    await browser.close();
  } else {
    console.error('\nUso: --url <lista>  |  --urls-file <archivo.txt>\n       --max 30 --out productos.json [--import]\n');
    process.exit(1);
  }

  if (!productUrls.length) { console.error('Sin URLs para scrapear.'); process.exit(1); }

  // 2. Scrapear cada producto con rate-limit
  console.log(`\n[scrape] ${productUrls.length} productos (delay ${argv.delay}ms)…\n`);
  const browser = await chromium.launch({ headless: argv.headless });
  const ctx = await browser.newContext({
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) LunabiScraper/1.0',
    locale: 'es-PE'
  });
  const page = await ctx.newPage();

  const productos = [];
  for (let i = 0; i < productUrls.length; i++) {
    const url = productUrls[i];
    process.stdout.write(`[${i + 1}/${productUrls.length}] ${url.slice(0, 80)}… `);
    try {
      const raw = await scrapeProduct(page, url);
      if (!raw.nombre) { console.log('(sin nombre, skip)'); continue; }
      const mapped = mapToLunabi(raw, url);
      productos.push(mapped);
      console.log(`✓ ${mapped.nombre.slice(0, 50)}`);
    } catch (e) {
      console.log(`✗ ${e.message.slice(0, 80)}`);
    }
    if (i < productUrls.length - 1) await sleep(argv.delay);
  }
  await browser.close();

  // 3. Guardar JSON
  const outPath = path.resolve(__dirname, argv.out);
  fs.writeFileSync(outPath, JSON.stringify(productos, null, 2), 'utf8');
  console.log(`\n✅ ${productos.length} productos → ${outPath}\n`);

  // 4. Opcionalmente, importar a Supabase
  if (argv.import && !argv['dry-run']) {
    await importToSupabase(productos);
  } else if (argv.import) {
    console.log('(dry-run: no se importó a Supabase)');
  }
}

main().catch(err => { console.error('\n❌', err); process.exit(1); });
