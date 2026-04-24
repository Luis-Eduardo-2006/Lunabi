# LÜNABI — Scripts locales

## Scraper de YesStyle → Supabase

`scrape-yesstyle.js` descarga productos de YesStyle, los normaliza al esquema de LÜNABI y opcionalmente los inserta en Supabase. **Uso local, entorno de pruebas.**

### 1. Instalar

```bash
cd scripts
npm install
npx playwright install chromium       # descarga el navegador (~150 MB, una vez)
```

### 2. Configurar Supabase (solo si vas a importar directo)

```bash
cp .env.example .env
# Edita scripts/.env y pega tu SERVICE_ROLE key (no la anon!)
# La encuentras en: Project Settings → API → service_role (secreto).
```

> ⚠️ **La service_role key tiene poderes de superadmin.** Nunca la commitees ni la pongas en el frontend. `scripts/.env` debe estar en `.gitignore`.

### 3. Correr el scraper

**Scrapear una página de marca:**
```bash
node scrape-yesstyle.js \
  --url "https://www.yesstyle.com/es/beauty-of-joseon/list.html" \
  --max 20 \
  --out productos.json
```

**Scrapear una categoría:**
```bash
node scrape-yesstyle.js \
  --url "https://www.yesstyle.com/es/beauty-skin-care-serum/list.html/bcc.16_bpt.49" \
  --max 30
```

**Desde una lista de URLs sueltas** (`urls.txt` con una URL por línea):
```bash
node scrape-yesstyle.js --urls-file urls.txt --max 50
```

**Importar directo a Supabase tras scrapear:**
```bash
node scrape-yesstyle.js --url "..." --max 20 --import
```

**Importar un JSON ya existente** (sin re-scrapear):
```bash
# Editas productos.json a mano, o revisas el que generaste antes, y:
node -e "require('./scrape-yesstyle.js')"
# ...o vuelves a correr con --import sobre el mismo out
```

### 4. Flags

| Flag             | Default           | Descripción                                            |
|------------------|-------------------|--------------------------------------------------------|
| `--url`          | —                 | Página de marca o categoría YesStyle (colector).       |
| `--urls-file`    | —                 | Archivo txt con URLs de producto (una por línea).      |
| `--max`          | 30                | Tope de productos a scrapear.                           |
| `--out`          | `productos.json`  | Archivo de salida.                                     |
| `--import`       | off               | Inserta/upserta en Supabase tras scrapear.             |
| `--delay`        | 3000              | ms entre requests (cortesía anti-bloqueo).             |
| `--headless`     | true              | `--no-headless` abre el navegador visible (debug).     |
| `--dry-run`      | off               | Con `--import`, muestra lo que insertaría sin hacerlo. |

### 5. Cómo mapea los datos

**Categorías** — el scraper detecta por keywords en el breadcrumb / nombre y mapea a las categorías internas (`skincare`, `maquillaje`, `corporal`). Lista completa en `CATEGORY_MAP` dentro del script. Edítala si necesitas mapeos diferentes.

**Marcas** — se extraen del link "/brand/" de YesStyle y se crea automáticamente la marca en Supabase (tabla `brands`) con `upsert` por slug.

**Precio** — si YesStyle muestra en USD, se multiplica por `3.75 × 1.5 = 5.625` (TC Perú × margen 50%) y se guarda en soles. Ajusta `rateUsdPen` y `margen` en la función `mapToLunabi` del script.

**Tipo de piel** — se infiere del texto de la descripción (`dry → seca`, `oily → grasa`, etc.).

**Imágenes** — busca URLs que contengan `/pdt_pic/` (patrón de YesStyle) y reemplaza tamaño thumbnail por `/l/` (grande). Máximo 6 imágenes por producto.

### 6. Tras importar

1. Recarga el sitio (`Ctrl+F5`).
2. Ve al admin panel → tab **Productos** → deberías ver todos los importados (sin el tag "admin" porque vinieron directo del backend, no del localStorage admin storage).
3. Revisa precios, categorías y descripciones — edita lo que haga falta.
4. Borra los productos sobrantes con el botón de papelera.

### 7. Troubleshooting

- **"Timeout 45000ms exceeded"**: YesStyle está lento o te están limitando. Sube `--delay` a 5000 y reduce `--max`.
- **Sin imágenes / sin precio**: YesStyle cambió su HTML. Los selectores están en `scrapeProduct()` dentro del script — ajústalos.
- **"Unauthorized" al importar**: revisa que `SUPABASE_SERVICE_KEY` sea la `service_role` (empieza con `eyJ…` y dice `"role":"service_role"` al decodificarla), no la `anon` ni el PAT.
- **403 / bloqueo de IP**: YesStyle detectó el bot. Espera 1 hora o usa VPN. Recuerda: esto es entorno de pruebas.

### 8. Nota legal

Como ya discutimos antes de construir esto: el contenido de YesStyle tiene copyright y su ToS prohíbe scraping. Usar este script está a tu criterio y riesgo. Para producción, reemplaza los datos por tus propias fotos y descripciones o usa feeds oficiales (press kits de marca, affiliate programs).
