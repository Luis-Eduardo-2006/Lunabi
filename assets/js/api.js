/* ===== LÜNABI — Capa de API unificada =====
 *
 * `window.LuApi` expone los métodos que consume toda la tienda: catálogo,
 * pedidos, favoritos, test de skincare, ventas, auth y admin. Cada método
 * tiene dos implementaciones:
 *   - REMOTE (Supabase) → activa cuando supabase.config.js trae url+anonKey.
 *   - LOCAL (localStorage) → fallback offline, idéntico shape que el remoto.
 *
 * Así el sitio funciona igual con o sin backend. Cuando conectes Supabase,
 * todos los módulos automáticamente empiezan a leer/escribir contra la
 * base, sin tocar el resto del código.
 */

(function() {
  if (window.LuApi) return;

  /* --------------- bootstrap Supabase SDK --------------- */
  const cfg = window.LUNABI_SUPABASE || { url: '', anonKey: '' };
  const configured = !!(cfg && cfg.url && cfg.anonKey);
  let sb = null;
  let sbReadyPromise = null;

  function loadScript(src) {
    return new Promise((resolve, reject) => {
      const s = document.createElement('script');
      s.src = src;
      s.onload = resolve;
      s.onerror = () => reject(new Error('No se pudo cargar ' + src));
      document.head.appendChild(s);
    });
  }

  async function ensureSupabase() {
    if (!configured) return null;
    if (sb) return sb;
    if (!sbReadyPromise) {
      sbReadyPromise = (async () => {
        if (typeof window.supabase === 'undefined' || !window.supabase.createClient) {
          await loadScript('https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.45.4/dist/umd/supabase.min.js');
        }
        sb = window.supabase.createClient(cfg.url, cfg.anonKey, {
          auth: { persistSession: true, autoRefreshToken: true }
        });
        return sb;
      })();
    }
    return sbReadyPromise;
  }

  /* --------------- helpers locales --------------- */
  const LS = {
    get(key, fallback) {
      try { return JSON.parse(localStorage.getItem(key) || JSON.stringify(fallback)); }
      catch (e) { return fallback; }
    },
    set(key, val) {
      try { localStorage.setItem(key, JSON.stringify(val)); return true; }
      catch (e) { return false; }
    }
  };

  /* --------------- CATÁLOGO --------------- */
  async function listProducts() {
    const client = await ensureSupabase();
    if (!client) {
      // modo local: usa el global `products` ya poblado por data.js
      return Array.isArray(window.products) ? window.products.slice() : [];
    }
    const { data, error } = await client.from('v_products').select('*').order('id');
    if (error) { console.warn('[LuApi] listProducts', error); return []; }
    return data || [];
  }

  async function listBrands() {
    const client = await ensureSupabase();
    if (!client) return Array.isArray(window.brands) ? window.brands.slice() : [];
    const { data, error } = await client.from('brands').select('*').eq('is_active', true).order('id');
    if (error) { console.warn('[LuApi] listBrands', error); return []; }
    return data || [];
  }

  async function listSlides() {
    const client = await ensureSupabase();
    if (!client) return LS.get('lunabi_admin_slides', []);
    const { data, error } = await client.from('hero_slides').select('*').eq('is_active', true).order('orden');
    if (error) { console.warn('[LuApi] listSlides', error); return []; }
    return (data || []).map(mapSlideRow);
  }

  /* --------------- AUTH --------------- */
  async function signUp({ nombre, email, password }) {
    const client = await ensureSupabase();
    if (!client) throw new Error('Supabase no configurado');
    const { data, error } = await client.auth.signUp({
      email, password,
      options: { data: { nombre } }
    });
    if (error) throw error;
    return data;
  }

  async function signIn({ email, password }) {
    const client = await ensureSupabase();
    if (!client) throw new Error('Supabase no configurado');
    const { data, error } = await client.auth.signInWithPassword({ email, password });
    if (error) throw error;
    return data;
  }

  async function signOut() {
    const client = await ensureSupabase();
    if (client) await client.auth.signOut();
    try { localStorage.removeItem('lunabi_session'); } catch (e) {}
  }

  async function updatePassword(newPassword) {
    const client = await ensureSupabase();
    if (!client) throw new Error('Supabase no configurado');
    const { error } = await client.auth.updateUser({ password: newPassword });
    if (error) throw error;
  }

  async function getUser() {
    const client = await ensureSupabase();
    if (!client) return null;
    const { data } = await client.auth.getUser();
    if (!data || !data.user) return null;
    const { data: profile } = await client.from('profiles').select('*').eq('id', data.user.id).maybeSingle();
    return {
      id: data.user.id,
      email: data.user.email,
      nombre: profile ? profile.nombre : (data.user.user_metadata && data.user.user_metadata.nombre) || 'Usuaria',
      is_admin: profile ? !!profile.is_admin : false,
      createdAt: new Date(data.user.created_at).getTime()
    };
  }

  /* --------------- FAVORITOS --------------- */
  async function listFavorites() {
    const user = configured ? await getUser() : null;
    if (!user) return LS.get('lunabi_favs', []);
    const client = await ensureSupabase();
    const { data } = await client.from('favorites').select('product_id').eq('user_id', user.id);
    return (data || []).map(r => r.product_id);
  }

  async function toggleFavorite(productId) {
    const id = Number(productId);
    const user = configured ? await getUser() : null;
    if (!user) {
      const list = LS.get('lunabi_favs', []);
      const idx = list.indexOf(id);
      if (idx > -1) { list.splice(idx, 1); LS.set('lunabi_favs', list); return false; }
      list.push(id); LS.set('lunabi_favs', list); return true;
    }
    const client = await ensureSupabase();
    const { data: existing } = await client.from('favorites')
      .select('product_id').eq('user_id', user.id).eq('product_id', id).maybeSingle();
    if (existing) {
      await client.from('favorites').delete().eq('user_id', user.id).eq('product_id', id);
      return false;
    } else {
      await client.from('favorites').insert({ user_id: user.id, product_id: id });
      return true;
    }
  }

  /* --------------- TEST DE SKINCARE --------------- */
  async function saveSkintest(answers, productIds) {
    const user = configured ? await getUser() : null;
    if (!user) {
      const all = LS.get('lunabi_skintest', {});
      all['guest'] = { answers, productIds, createdAt: Date.now() };
      LS.set('lunabi_skintest', all);
      return;
    }
    const client = await ensureSupabase();
    await client.from('skintest_results').insert({
      user_id: user.id, answers, product_ids: productIds
    });
  }

  async function getMySkintest() {
    const user = configured ? await getUser() : null;
    if (!user) {
      const all = LS.get('lunabi_skintest', {});
      return all['guest'] || null;
    }
    const client = await ensureSupabase();
    const { data } = await client.from('skintest_results')
      .select('*').eq('user_id', user.id)
      .order('created_at', { ascending: false }).limit(1).maybeSingle();
    if (!data) return null;
    return { answers: data.answers, productIds: data.product_ids, createdAt: new Date(data.created_at).getTime() };
  }

  /* --------------- PEDIDOS --------------- */
  async function createOrder({ items, total, waKey }) {
    const displayId = 'ORD-' + Date.now().toString(36).toUpperCase();
    const user = configured ? await getUser() : null;

    if (!configured) {
      const key = user ? user.email : 'guest';
      const all = LS.get('lunabi_orders', {});
      const list = Array.isArray(all[key]) ? all[key] : [];
      const order = {
        id: displayId, createdAt: Date.now(), items, total,
        status: 'pendiente', wa_key: waKey
      };
      list.unshift(order);
      all[key] = list;
      LS.set('lunabi_orders', all);
      return order;
    }

    const client = await ensureSupabase();
    const { data: ord, error } = await client.from('orders').insert({
      display_id: displayId,
      user_id:    user ? user.id : null,
      user_email: user ? user.email : 'guest',
      total, wa_key: waKey, status: 'pendiente'
    }).select('*').single();
    if (error) throw error;

    // Pre-validamos qué product_id existen en remoto. Los que no existen
    // se insertan con product_id=null (datos descriptivos se conservan).
    const ids = (items || []).map(it => Number(it.id)).filter(Boolean);
    let existingIds = new Set();
    if (ids.length) {
      try {
        const { data: rows } = await client.from('products').select('id').in('id', ids);
        existingIds = new Set((rows || []).map(r => r.id));
      } catch (e) { /* si falla, asumimos ninguno existe */ }
    }

    const rows = (items || []).map(it => ({
      order_id: ord.id,
      product_id: existingIds.has(Number(it.id)) ? Number(it.id) : null,
      nombre: it.nombre,
      marca: it.marca || '', imagen: it.imagen || '',
      unit_price: it.precio || 0, qty: it.qty || 1
    }));
    if (rows.length) {
      const { error: itemsErr } = await client.from('order_items').insert(rows);
      if (itemsErr) console.warn('[LuApi] order_items insert', itemsErr);
    }
    return { id: displayId, createdAt: Date.now(), items, total, status: 'pendiente' };
  }

  async function listMyOrders() {
    const user = configured ? await getUser() : null;
    if (!user) {
      const all = LS.get('lunabi_orders', {});
      return all['guest'] || [];
    }
    const client = await ensureSupabase();
    const { data } = await client.from('orders')
      .select('*, order_items(*)')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });
    return (data || []).map(mapOrderFromDb);
  }

  async function listAllOrders() {
    // Solo admin
    if (!configured) {
      const all = LS.get('lunabi_orders', {});
      const out = [];
      Object.entries(all).forEach(([email, list]) => {
        (list || []).forEach(o => out.push({ ...o, _email: email }));
      });
      return out.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
    }
    const client = await ensureSupabase();
    const { data } = await client.from('orders')
      .select('*, order_items(*)')
      .order('created_at', { ascending: false });
    return (data || []).map(mapOrderFromDb);
  }

  async function updateOrderStage(orderId, stageKey) {
    if (!configured) {
      const all = LS.get('lunabi_orders', {});
      for (const email of Object.keys(all)) {
        const idx = (all[email] || []).findIndex(o => o.id === orderId);
        if (idx > -1) {
          all[email][idx].stageKey = stageKey;
          if (stageKey === 'entregado') all[email][idx].status = 'entregado';
          LS.set('lunabi_orders', all);
          return;
        }
      }
      return;
    }
    const client = await ensureSupabase();
    const patch = { stage_key: stageKey, updated_at: new Date().toISOString() };
    if (stageKey === 'entregado') patch.status = 'entregado';
    await client.from('orders').update(patch).eq('display_id', orderId);
  }

  /* Confirma un pedido: cambia status 'pendiente' → 'confirmado', fija el
   * stage inicial 'confirmado' y guarda el momento de la confirmación. Hasta
   * que admin llame esto, el pedido NO es visible en "Mi cuenta" del user. */
  async function confirmOrder(orderId) {
    const nowMs = Date.now();
    if (!configured) {
      const all = LS.get('lunabi_orders', {});
      for (const email of Object.keys(all)) {
        const idx = (all[email] || []).findIndex(o => o.id === orderId);
        if (idx > -1) {
          all[email][idx].status = 'confirmado';
          all[email][idx].stageKey = 'confirmado';
          all[email][idx].confirmedAt = nowMs;
          LS.set('lunabi_orders', all);
          return;
        }
      }
      return;
    }
    const client = await ensureSupabase();
    await client.from('orders').update({
      status: 'confirmado',
      stage_key: 'confirmado',
      updated_at: new Date(nowMs).toISOString()
    }).eq('display_id', orderId);
  }

  function mapOrderFromDb(o) {
    // confirmedAt: cuando el admin pulsa "Confirmar", status pasa a algo distinto
    // de 'pendiente' y updated_at refleja ese momento. Lo usamos como base
    // para el timeline de envío en la cuenta del user.
    const confirmedAt = (o.status && o.status !== 'pendiente' && o.updated_at)
      ? new Date(o.updated_at).getTime()
      : null;
    return {
      id: o.display_id,
      createdAt: new Date(o.created_at).getTime(),
      confirmedAt,
      total: Number(o.total),
      status: o.status,
      stageKey: o.stage_key || null,
      _email: o.user_email,
      items: (o.order_items || []).map(it => ({
        id: it.product_id, nombre: it.nombre, marca: it.marca,
        imagen: it.imagen, precio: Number(it.unit_price), qty: it.qty
      }))
    };
  }

  /* --------------- VENTAS --------------- */
  async function recordSale(items) {
    if (!configured) {
      const map = LS.get('lunabi_ventas', {});
      (items || []).forEach(({ id, qty }) => {
        const n = Number(id); if (!n) return;
        map[n] = (Number(map[n]) || 0) + (Number(qty) || 0);
      });
      LS.set('lunabi_ventas', map);
      return;
    }
    const client = await ensureSupabase();

    // Pre-filtramos los items cuyo product_id existe en remoto. Sin esto,
    // el RPC record_sale falla con 409 (FK violation) si el producto solo
    // vive en localStorage del admin.
    const ids = (items || []).map(it => Number(it.id)).filter(Boolean);
    let existingIds = new Set();
    if (ids.length) {
      try {
        const { data: rows } = await client.from('products').select('id').in('id', ids);
        existingIds = new Set((rows || []).map(r => r.id));
      } catch (e) { /* sin BD, no llamamos al RPC */ return; }
    }

    // Siempre guardamos también en local para que el badge "más vendido"
    // se calcule incluso si remote no acepta el producto.
    const map = LS.get('lunabi_ventas', {});
    for (const it of (items || [])) {
      const n = Number(it.id);
      const q = Number(it.qty) || 1;
      if (!n) continue;
      map[n] = (Number(map[n]) || 0) + q;
      if (existingIds.has(n)) {
        try {
          await client.rpc('record_sale', { p_product_id: n, p_qty: q });
        } catch (e) {
          console.warn('[LuApi] record_sale (silenciado)', e && e.message);
        }
      }
    }
    LS.set('lunabi_ventas', map);
  }

  async function getSalesMap() {
    if (!configured) return LS.get('lunabi_ventas', {});
    const client = await ensureSupabase();
    const { data } = await client.from('sales').select('product_id, total_qty');
    const out = {};
    (data || []).forEach(r => { out[r.product_id] = r.total_qty; });
    return out;
  }

  /* --------------- ADMIN CRUD --------------- */
  async function adminUpsertProduct(product) {
    if (!configured) {
      const list = LS.get('lunabi_admin_products', []);
      const idx = list.findIndex(p => p.id === product.id);
      if (idx > -1) list[idx] = product; else list.push(product);
      LS.set('lunabi_admin_products', list);
      return product;
    }
    const client = await ensureSupabase();
    const row = {
      slug: product.slug, nombre: product.nombre, marca: product.marca,
      categoria: product.categoria, subcategoria: product.subcategoria || null,
      tipo_piel: product.tipoPiel || [],
      precio: product.precio, precio_antes: product.precioAntes || null,
      contenido_valor:  product.contenidoValor  || null,
      contenido_unidad: product.contenidoUnidad || null,
      imagenes: product.imagenes || [],
      descripcion: product.descripcion || '',
      modo_de_uso: product.modoDeUso || [],
      beneficios:  product.beneficios || [],
      mas_vendido: !!product.masVendido,
      en_oferta:   !!product.enOferta
    };
    // Upsert por slug (unique) — insert si no existe, update si sí.
    // Independiente del id local que usa el admin UI para referenciar.
    const { data, error } = await client.from('products')
      .upsert(row, { onConflict: 'slug' })
      .select('*').single();
    if (error) throw error;
    return data;
  }

  async function adminDeleteProduct(id) {
    if (!configured) {
      const list = LS.get('lunabi_admin_products', []).filter(p => p.id !== id);
      LS.set('lunabi_admin_products', list);
      return;
    }
    const client = await ensureSupabase();
    await client.from('products').delete().eq('id', id);
  }

  async function adminUpsertBrand(brand) {
    if (!configured) {
      const list = LS.get('lunabi_admin_brands', []);
      const idx = list.findIndex(b => b.id === brand.id);
      if (idx > -1) list[idx] = brand; else list.push(brand);
      LS.set('lunabi_admin_brands', list);
      return brand;
    }
    const client = await ensureSupabase();
    const row = {
      nombre: brand.nombre, slug: brand.slug,
      logo: brand.logo || null, descripcion: brand.descripcion || ''
    };
    // Upsert por slug — inserta si es nueva, actualiza si ya existía
    const { data, error } = await client.from('brands')
      .upsert(row, { onConflict: 'slug' })
      .select('*').single();
    if (error) throw error;
    return data;
  }

  async function adminDeleteBrand(id) {
    if (!configured) {
      const list = LS.get('lunabi_admin_brands', []).filter(b => b.id !== id);
      LS.set('lunabi_admin_brands', list);
      return;
    }
    const client = await ensureSupabase();
    await client.from('brands').delete().eq('id', id);
  }

  async function adminUpsertSlide(slide, idxOrId) {
    if (!configured) {
      const list = LS.get('lunabi_admin_slides', []);
      if (typeof idxOrId === 'number') list[idxOrId] = slide; else list.push(slide);
      LS.set('lunabi_admin_slides', list);
      return slide;
    }
    const client = await ensureSupabase();
    const row = {
      orden: slide.orden || 0, imagen: slide.imagen, titulo: slide.titulo,
      descripcion: slide.descripcion || '', boton_texto: slide.botonTexto || '',
      boton_link: slide.botonLink || '#', badge: slide.badge || null,
      pos_h: ['left','center','right'].includes(slide.posH) ? slide.posH : 'center',
      pos_v: ['top','middle','bottom'].includes(slide.posV) ? slide.posV : 'middle',
      titulo_color:  slide.tituloColor || null,
      desc_color:    slide.descColor   || null,
      boton_bg:      slide.botonBg     || null,
      boton_color:   slide.botonColor  || null,
      boton_border_color: slide.botonBorderColor || null,
      boton_border_width: Math.max(0, Math.min(8, Number(slide.botonBorderWidth) || 0)),
      boton_radius:  ['default','square','rounded','pill'].includes(slide.botonRadius) ? slide.botonRadius : 'default',
      boton_shadow:  ['default','none','sm','md','lg'].includes(slide.botonShadow) ? slide.botonShadow : 'default',
      boton_shadow_color: slide.botonShadowColor || null,
      boton_border_effect: ['none','halo','glow','double','neon'].includes(slide.botonBorderEffect) ? slide.botonBorderEffect : 'none',
      badge_bg:      slide.badgeBg     || null,
      badge_color:   slide.badgeColor  || null,
      fuente_titulo: slide.fuenteTitulo || null,
      fuente_texto:  slide.fuenteTexto  || null
    };
    // UPDATE si tenemos el id real de Supabase (slide.id o idxOrId.id).
    // En cualquier otro caso INSERT (incluye cuando idxOrId es un número —
    // ése es sólo el índice local y NO sirve para identificar la fila remota).
    const remoteId = (slide && slide.id) || (idxOrId && typeof idxOrId === 'object' && idxOrId.id) || null;
    if (remoteId) {
      const { data, error } = await client.from('hero_slides')
        .update(row).eq('id', remoteId).select('*').single();
      if (error) throw error;
      return mapSlideRow(data);
    }
    const { data, error } = await client.from('hero_slides')
      .insert(row).select('*').single();
    if (error) throw error;
    return mapSlideRow(data);
  }

  function mapSlideRow(s) {
    if (!s) return null;
    return {
      id: s.id,
      imagen: s.imagen, titulo: s.titulo, descripcion: s.descripcion,
      botonTexto: s.boton_texto, botonLink: s.boton_link, badge: s.badge,
      posH: s.pos_h || 'center', posV: s.pos_v || 'middle',
      tituloColor:  s.titulo_color  || '',
      descColor:    s.desc_color    || '',
      botonBg:      s.boton_bg      || '',
      botonColor:   s.boton_color   || '',
      botonBorderColor: s.boton_border_color || '',
      botonBorderWidth: Number(s.boton_border_width) || 0,
      botonRadius:  s.boton_radius  || 'default',
      botonShadow:  s.boton_shadow  || 'default',
      botonShadowColor: s.boton_shadow_color || '',
      botonBorderEffect: s.boton_border_effect || 'none',
      badgeBg:      s.badge_bg      || '',
      badgeColor:   s.badge_color   || '',
      fuenteTitulo: s.fuente_titulo || '',
      fuenteTexto:  s.fuente_texto  || ''
    };
  }

  async function adminDeleteSlide(idxOrId) {
    if (!configured) {
      const list = LS.get('lunabi_admin_slides', []);
      const i = (idxOrId && typeof idxOrId === 'object') ? idxOrId.index : idxOrId;
      if (typeof i === 'number') list.splice(i, 1);
      LS.set('lunabi_admin_slides', list);
      return;
    }
    const client = await ensureSupabase();
    const remoteId = (idxOrId && typeof idxOrId === 'object') ? idxOrId.id : idxOrId;
    if (!remoteId) return;
    await client.from('hero_slides').delete().eq('id', remoteId);
  }

  /* --------------- SITE SETTINGS --------------- */
  async function getSetting(key) {
    if (!configured) return LS.get('lunabi_settings_' + key, null);
    const client = await ensureSupabase();
    const { data } = await client.from('site_settings').select('value').eq('key', key).maybeSingle();
    return data ? data.value : null;
  }
  async function setSetting(key, value) {
    LS.set('lunabi_settings_' + key, value);
    if (!configured) return value;
    const client = await ensureSupabase();
    const { data, error } = await client.from('site_settings')
      .upsert({ key, value }, { onConflict: 'key' })
      .select('value').single();
    if (error) { console.warn('[LuApi] setSetting', error); return value; }
    return data ? data.value : value;
  }

  /* --------------- EXPORT --------------- */
  window.LuApi = {
    isRemote: () => configured,
    ready: ensureSupabase,
    // catálogo
    listProducts, listBrands, listSlides,
    // auth
    signUp, signIn, signOut, getUser, updatePassword,
    // favoritos
    listFavorites, toggleFavorite,
    // skintest
    saveSkintest, getMySkintest,
    // pedidos
    createOrder, listMyOrders, listAllOrders, updateOrderStage, confirmOrder,
    // ventas
    recordSale, getSalesMap,
    // admin
    adminUpsertProduct, adminDeleteProduct,
    adminUpsertBrand,   adminDeleteBrand,
    adminUpsertSlide,   adminDeleteSlide,
    // settings
    getSetting, setSetting
  };
})();
