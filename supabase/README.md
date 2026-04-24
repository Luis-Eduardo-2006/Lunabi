# LÜNABI — Backend en Supabase

Guía de despliegue del backend. El cliente está diseñado para funcionar **con o sin** Supabase: si no configuras nada, el sitio sigue operando en modo local (localStorage). En cuanto pegas tu URL + anon key, todo pasa al backend automáticamente.

---

## 1. Crear el proyecto

1. Entra a [supabase.com](https://supabase.com) y crea un proyecto nuevo.
2. Elige región cercana (`São Paulo` o `N. Virginia`).
3. Guarda la **database password** en un lugar seguro.

## 2. Ejecutar el esquema

En **SQL Editor → New query** pega y ejecuta en este orden:

1. [schema.sql](schema.sql) — tablas, tipos, triggers, RLS y función `record_sale`.
2. [storage.sql](storage.sql) — buckets `products`, `brands`, `slides` con políticas públicas de lectura.
3. (opcional) [seed.sql](seed.sql) — datos demo para empezar.

## 3. Copiar credenciales

En **Project Settings → API** copia:
- **Project URL** (ej. `https://abcdxxxx.supabase.co`)
- **anon / public key** (`eyJhbGciOi…`)

## 4. Conectar el cliente

Edita [`assets/js/supabase.config.js`](../assets/js/supabase.config.js):

```js
window.LUNABI_SUPABASE = {
  url:     'https://abcdxxxx.supabase.co',
  anonKey: 'eyJhbGciOi...'
};
```

Recarga cualquier página del sitio con `Ctrl+F5`. Listo.

## 5. Crear el primer admin

Supabase Auth te permite registrarte desde la propia tienda (`/registro.html`). Una vez creado tu usuario, abre **Supabase → Table Editor → `profiles`** y marca `is_admin = true` en tu fila. Desde ese momento, `admin.html` te dará acceso al CRUD completo.

SQL alternativo:

```sql
update public.profiles
   set is_admin = true
 where email = 'tu@email.com';
```

## 6. Migrar datos existentes (opcional)

Si ya tenías productos/marcas creados desde el admin localStorage:

```js
// En la consola del navegador en el sitio antes de activar Supabase:
JSON.stringify({
  products: JSON.parse(localStorage.getItem('lunabi_admin_products') || '[]'),
  brands:   JSON.parse(localStorage.getItem('lunabi_admin_brands')   || '[]'),
  slides:   JSON.parse(localStorage.getItem('lunabi_admin_slides')   || '[]')
})
```

Copia ese JSON y pégalo como seeds en el SQL Editor, o usa el admin panel para recrearlos una vez activado Supabase.

---

## Estructura de la base

| Tabla               | Rol                                                     |
|---------------------|---------------------------------------------------------|
| `profiles`          | Perfil extendido de `auth.users` (nombre, is_admin)     |
| `brands`            | Marcas (Beauty of Joseon, COSRX…)                        |
| `products`          | Catálogo completo                                        |
| `hero_slides`       | Diapositivas del carrusel de la home                     |
| `orders`            | Pedidos confirmados                                      |
| `order_items`       | Items snapshot de cada pedido                            |
| `favorites`         | Productos favoritos por usuario                          |
| `skintest_results`  | Resultados del test de skincare                          |
| `sales`             | Agregado de unidades vendidas por producto               |
| `site_settings`     | Config global (ej. números de WhatsApp) en JSONB         |

## Políticas RLS resumidas

- **Catálogo público** (`brands`, `products`, `hero_slides`, `site_settings`): cualquiera puede leer, solo `is_admin()` puede escribir.
- **Pedidos**: el usuario autenticado ve/crea los suyos. Invitados pueden insertar con `user_id NULL`. Admin ve y edita todos.
- **Favoritos / skintest**: solo el dueño tiene acceso.
- **Ventas**: lectura pública; la escritura ocurre vía RPC `record_sale(product_id, qty)` que es `security definer`.

## Storage

Tres buckets públicos de solo-lectura:
- `products/` — imágenes del carrusel del producto
- `brands/` — logos
- `slides/` — imágenes de fondo de la home

Subida restringida a admins. Patrón recomendado para nombres:
`products/<slug>/<n>.jpg`, `brands/<slug>.webp`, `slides/<orden>.jpg`.

## Cómo volver al modo local

Deja `supabase.config.js` vacío (`url: ''` y `anonKey: ''`) y recarga. El cliente detecta la ausencia y cae a localStorage automáticamente.

---

## Endpoints RPC custom

- `public.record_sale(p_product_id bigint, p_qty int)` — incrementa el contador de ventas. Llamado por `api.js` tras cada pedido por WhatsApp.
- `public.is_admin()` → `boolean` — usado internamente por las policies.

## Esquema → cliente

El cliente lee del **view** `v_products` que renombra `tipo_piel → "tipoPiel"`, `precio_antes → "precioAntes"`, etc., para que el código frontend no necesite cambios en los renderers.
