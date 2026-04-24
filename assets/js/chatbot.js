/* ===== LÜNABI — Chatbot "Luna" =====
 *
 * Asistente de preguntas frecuentes con matcher de intents.
 * Arquitectura lista para backend: reemplaza `answer()` por una
 * llamada fetch('/api/chat') cuando haya un backend con IA real.
 *
 * Flujo:
 *   - Botón flotante abre la ventana del chat.
 *   - Greeting inicial + sugerencias (chips) de preguntas comunes.
 *   - Cada mensaje del usuario pasa por `answer(text)` → match de intent.
 *   - Respuesta con typing indicator de ~700ms para sensación conversacional.
 *   - Algunos intents adjuntan productos del catálogo (window.products).
 */

(function() {
  if (window.__luChatLoaded) return;
  window.__luChatLoaded = true;

  /* ================================================================
   * INTENTS — entrenados con la información oficial de LÜNABI
   * (InfoPieDePagina.txt). Cada respuesta usa solo datos verificados.
   * ================================================================ */
  const INTENTS = [
    {
      id: 'saludo',
      patterns: ['hola', 'buenos dias', 'buenos días', 'buenas tardes', 'buenas noches', 'buenas', 'hey', 'que tal', 'qué tal', 'holi', 'holaa'],
      answer: () => `¡Hola! ✨ Soy <strong>Luna</strong>, tu asistente Lünabi. Puedo ayudarte con información sobre pedidos, tiempos de entrega, métodos de pago, cambios y más. ¿En qué te ayudo?`,
      chips: ['¿Cómo compro?', 'Tiempo de entrega', 'Métodos de pago', 'Pedido anticipado']
    },
    {
      id: 'gracias',
      patterns: ['gracias', 'thank', 'thanks', 'ok gracias', 'perfecto', 'genial', 'excelente', 'buenisimo', 'buenísimo'],
      answer: () => `¡A ti! 💜 Si necesitas algo más, aquí estoy. Para pedidos o consultas personalizadas también puedes escribirnos por nuestros canales oficiales.`,
      chips: ['Ver ofertas', 'Hacer el test', 'Contacto']
    },

    /* ---------- Cómo comprar ---------- */
    {
      id: 'como-comprar',
      patterns: ['como compro', 'cómo compro', 'como comprar', 'cómo comprar', 'como ordeno', 'como hago el pedido', 'cómo hago el pedido', 'como realizo', 'proceso de compra', 'checkout'],
      answer: () => `Comprar en LÜNABI es muy fácil:
<br>1. Selecciona tus productos y agrégalos al carrito 🛍️
<br>2. Completa tus datos
<br>3. Realiza el pago por el método de tu preferencia
<br>Tu pedido se confirmará una vez validado el pago.`,
      chips: ['Métodos de pago', '¿Cuánto demora?', 'Pedido anticipado']
    },
    {
      id: 'confirmacion',
      patterns: ['confirm', 'como se confirma', 'cómo se confirma', 'como saber si mi pedido', 'mi pedido fue', 'ya fue confirmado', 'pedido confirm'],
      answer: () => `Tu pedido se <strong>confirma una vez validado el pago</strong>. En ese momento inicia el tiempo de preparación y entrega.`,
      chips: ['Tiempo de entrega', 'Métodos de pago']
    },

    /* ---------- Pedido anticipado (clave) ---------- */
    {
      id: 'anticipado',
      patterns: ['pedido anticipado', 'modalidad', 'anticipado', 'preventa', 'pre-venta', 'pre venta', 'por que demora', 'por qué demora', 'porque demora'],
      answer: () => `Actualmente trabajamos bajo <strong>modalidad de pedido anticipado</strong>. Esto significa que el producto se gestiona <em>especialmente para ti</em> luego de confirmar tu compra.
<br><br>Por eso priorizamos variedad y calidad: cada producto es seleccionado cuidadosamente para nuestras clientas.`,
      chips: ['Tiempo de entrega', '¿Puede llegar antes?', 'Cancelaciones']
    },

    /* ---------- Tiempo de entrega ---------- */
    {
      id: 'tiempo',
      patterns: ['demora', 'tardan', 'cuanto demora', 'cuánto demora', 'cuanto tiempo', 'cuánto tiempo', 'cuando llega', 'cuándo llega', 'tiempo de entrega', 'plazo', 'cuando recibo', 'cuándo recibo'],
      answer: () => `El tiempo estimado de entrega es de <strong>15 a 20 días hábiles</strong>, contados desde la confirmación del pago.
<br><br>Este plazo puede variar por factores externos como transporte, alta demanda, campañas o situaciones logísticas ajenas a LÜNABI. En caso de cambios importantes, te avisamos oportunamente.`,
      chips: ['¿Puede llegar antes?', '¿Por qué demora?', 'Envíos a provincia']
    },
    {
      id: 'antes',
      patterns: ['puede llegar antes', 'llegar antes', 'mas rapido', 'más rápido', 'mas pronto', 'más pronto', 'urgente', 'apurada', 'apurado', 'antes del plazo'],
      answer: () => `Sí, en algunos casos puede llegar <strong>antes del tiempo estimado</strong>. Te mantendremos informada durante todo el proceso.`,
      chips: ['Tiempo de entrega', '¿Cómo sabré el estado?']
    },
    {
      id: 'estado-pedido',
      patterns: ['estado de mi pedido', 'donde esta mi pedido', 'dónde está mi pedido', 'rastrear', 'seguimiento', 'tracking', 'como va mi pedido', 'cómo va mi pedido'],
      answer: () => `Te mantendremos informada durante todo el proceso a través de nuestros canales oficiales. Puedes escribirnos directamente por WhatsApp con tu número de pedido.`,
      chips: ['Contacto', 'Tiempo de entrega']
    },

    /* ---------- Pagos ---------- */
    {
      id: 'pago',
      patterns: ['pago', 'pagos', 'pagar', 'metodos de pago', 'métodos de pago', 'como pago', 'cómo pago', 'yape', 'plin', 'transferencia', 'deposit', 'visa', 'mastercard', 'tarjeta'],
      answer: () => `Aceptamos los siguientes métodos de pago:
<br>• <strong>Yape</strong>
<br>• <strong>Plin</strong>
<br>• <strong>Transferencia bancaria</strong>
<br>• Otros medios disponibles habilitados en la tienda`,
      chips: ['¿Es seguro comprar?', 'Confirmación del pedido']
    },
    {
      id: 'seguro',
      patterns: ['es seguro', 'seguridad', 'confiable', 'estafa', 'confio', 'confío', 'se puede confiar'],
      answer: () => `Sí. Buscamos brindarte una compra <strong>segura, transparente y confiable</strong>. Tu información solo se usa para procesar pedidos y brindarte atención.`,
      chips: ['Privacidad', 'Métodos de pago']
    },
    {
      id: 'precios',
      patterns: ['precio', 'precios', 'cuanto cuesta', 'cuánto cuesta', 'tarifa', 'cuanto vale', 'cuánto vale', 'soles', 'moneda'],
      answer: () => `Todos los precios en LÜNABI están expresados en <strong>soles peruanos (S/)</strong>. Los precios pueden modificarse sin previo aviso.`,
      chips: ['Métodos de pago', 'Ver ofertas']
    },

    /* ---------- Envíos ---------- */
    {
      id: 'envio-provincia',
      patterns: ['envio a provincia', 'envío a provincia', 'envios a provincia', 'envíos a provincia', 'provincia', 'regiones', 'llegan a', 'mandan a', 'envian a', 'envían a', 'llega a'],
      answer: () => `Sí, realizamos envíos <strong>según cobertura disponible</strong>. El costo y tiempo adicional de envío dependerá del destino.
<br><br>Para pedidos fuera de Huancayo usa el WhatsApp de <strong>"Envíos nacionales"</strong>.`,
      chips: ['Tiempo de entrega', 'Métodos de pago']
    },
    {
      id: 'envio',
      patterns: ['envio', 'envío', 'envios', 'envíos', 'delivery', 'despacho', 'mandar', 'enviar', 'shipping', 'courier'],
      answer: () => `Realizamos envíos según cobertura disponible. El <strong>costo y tiempo adicional</strong> dependen del destino.
<br><br>Te coordinamos el envío por WhatsApp al confirmar tu pedido.`,
      chips: ['Envíos a provincia', 'Tiempo de entrega', '¿Cómo sabré el estado?']
    },

    /* ---------- Productos ---------- */
    {
      id: 'original',
      patterns: ['original', 'originales', 'autentico', 'auténtico', 'autenticidad', 'falsificado', 'falso', 'garantia', 'garantía', 'son de verdad'],
      answer: () => `Trabajamos con productos <strong>cuidadosamente seleccionados y verificados</strong>. Cada detalle importa: elegimos cada producto pensando en calidad, estilo y en hacerte sentir segura y auténtica.`,
      chips: ['Nuestros valores', 'Ver marcas', '¿Puedo pedir ayuda?']
    },
    {
      id: 'ayuda-comprar',
      patterns: ['pedir ayuda', 'asesoria', 'asesoría', 'asesorar', 'consejo', 'recomienda', 'recomendar', 'recomendación', 'recomendacion', 'no se que comprar', 'no sé qué comprar', 'ayuda a elegir', 'me ayudan'],
      answer: () => `¡Sí, con mucho gusto! Estaremos encantadas de asesorarte. Además, puedes tomar nuestro <strong>Test de Skincare personalizado</strong> (botón con el logo Lünabi abajo a la derecha) — en 7 preguntas armamos una rutina para ti. Mientras, aquí algunos más vendidos:`,
      products: (ps) => ps.filter(p => p.masVendido).slice(0, 3),
      chips: ['Hacer el test', 'Tipos de piel', 'Ver marcas']
    },
    {
      id: 'stock',
      patterns: ['stock', 'hay stock', 'disponible', 'disponibilidad', 'agotado', 'hay en', 'tienen en', 'queda'],
      answer: () => `Todos los pedidos están <strong>sujetos a disponibilidad</strong>. En caso de no contar con stock luego de tu compra, nos comunicaremos contigo para ofrecerte una solución.`,
      chips: ['Pedido anticipado', 'Cancelaciones']
    },

    /* ---------- Cambios, devoluciones, incidencias ---------- */
    {
      id: 'devolucion',
      patterns: ['devolucion', 'devolución', 'devolver', 'cambio', 'cambiar', 'cambios', 'reembolso', 'retornar', 'regresar', 'no me gusto', 'no me gustó'],
      answer: () => `Solo aceptamos cambios en los siguientes casos:
<br>• Producto defectuoso
<br>• Producto incorrecto enviado
<br>• Daño comprobable durante el traslado
<br><br>⚠️ <em>No aplican cambios por gusto personal, error al elegir, uso indebido o productos abiertos/usados.</em>`,
      chips: ['¿Cómo reporto?', 'Cancelaciones']
    },
    {
      id: 'reporte-problema',
      patterns: ['problema', 'reclamo', 'defectuos', 'dañad', 'roto', 'incorrecto', 'fallado', 'mal estado', 'daño', '24 horas', 'reportar'],
      answer: () => `Si tu pedido llegó con algún problema, <strong>escríbenos dentro de las primeras 24 horas</strong> después de recibirlo, adjuntando <strong>evidencia fotográfica</strong> y detalle del caso.`,
      chips: ['Contacto', 'Cambios y devoluciones', 'Libro de reclamaciones']
    },
    {
      id: 'cancelar',
      patterns: ['cancelar', 'cancelacion', 'cancelación', 'anular', 'arrepenti', 'arrepentí', 'retract'],
      answer: () => `Los pedidos pueden cancelarse <strong>solo si aún no han sido procesados</strong>. Una vez iniciado el pedido anticipado, no aplican cancelaciones.
<br><br>Si tu pedido aún no fue procesado, escríbenos por WhatsApp para gestionarlo.`,
      chips: ['Pedido anticipado', 'Contacto']
    },

    /* ---------- Ofertas / descuentos (del catálogo) ---------- */
    {
      id: 'oferta',
      patterns: ['oferta', 'ofertas', 'descuento', 'descuentos', 'promocion', 'promoción', 'sale', 'rebaja', 'promo'],
      answer: () => `Puedes ver todos los productos en oferta en nuestra sección <a href="sale.html"><strong>SALE</strong></a>. Aquí algunos con descuento activo:`,
      products: (ps) => ps.filter(p => p.enOferta || (p.precioAntes && p.precioAntes > p.precio)).slice(0, 3),
      chips: ['Ver más vendidos', 'Métodos de pago']
    },

    /* ---------- Privacidad ---------- */
    {
      id: 'privacidad',
      patterns: ['privacidad', 'datos personales', 'mis datos', 'proteccion de datos', 'protección de datos', 'comparten mis datos', 'seguros mis datos'],
      answer: () => `La información que compartes con LÜNABI se utiliza <strong>únicamente</strong> para procesar pedidos, atención al cliente y mejorar tu experiencia de compra. No compartimos tus datos con terceros.`,
      chips: ['¿Es seguro comprar?', 'Contacto']
    },

    /* ---------- Test de skincare (módulo Lünabi) ---------- */
    {
      id: 'test',
      patterns: ['test', 'rutina', 'personalizad', 'cuestionario', 'quiz', 'skincare', 'mi rutina', 'que productos necesito', 'qué productos necesito'],
      answer: () => `Tenemos un <strong>test de skincare con base dermatológica</strong>. Haz clic en el <strong>botón con el logo Lünabi</strong> (abajo a la derecha) y en 7 preguntas armamos una rutina de 5–6 pasos ideales para tu tipo de piel.`,
      chips: ['Tipos de piel', 'Ver marcas', 'Más vendidos']
    },
    {
      id: 'tipo-piel',
      patterns: ['piel seca', 'piel grasa', 'piel mixta', 'piel sensible', 'piel normal', 'tipo de piel', 'acne', 'acné', 'manchas', 'arrugas', 'deshidrat', 'poros', 'rojeces'],
      answer: (text) => {
        const t = text.toLowerCase();
        let focus = 'personalizada';
        if (t.includes('seca')) focus = 'piel seca (hialurónico, ceramidas)';
        else if (t.includes('grasa')) focus = 'piel grasa (BHA, niacinamida)';
        else if (t.includes('mixta')) focus = 'piel mixta (texturas ligeras y equilibradas)';
        else if (t.includes('sensible')) focus = 'piel sensible (centella, cica, sin fragancia)';
        else if (t.includes('acn') || t.includes('imperfec')) focus = 'acné (BHA, niacinamida)';
        else if (t.includes('mancha')) focus = 'manchas (arbutin, vitamina C)';
        else if (t.includes('arrug')) focus = 'antiedad (retinol, péptidos)';
        else if (t.includes('deshidrat')) focus = 'deshidratación (ácido hialurónico)';
        else if (t.includes('poros')) focus = 'poros (BHA, niacinamida)';
        else if (t.includes('rojeces')) focus = 'rojeces (centella, cica)';
        return `Para tu objetivo de <strong>${focus}</strong> te recomiendo abrir el <strong>test de skincare</strong> (botón con el logo Lünabi abajo) y armar tu rutina completa. Mientras tanto, aquí algunos productos que podrían interesarte:`;
      },
      products: (ps, text) => {
        const t = (text || '').toLowerCase();
        const match = (p) => {
          const hay = (p.nombre + ' ' + (p.descripcion||'') + ' ' + (p.beneficios||[]).join(' ')).toLowerCase();
          if (t.includes('seca')) return hay.includes('hialuron') || hay.includes('ceramid') || (p.tipoPiel||[]).includes('seca');
          if (t.includes('grasa')) return hay.includes('bha') || hay.includes('niacinamid') || (p.tipoPiel||[]).includes('grasa');
          if (t.includes('mixta')) return (p.tipoPiel||[]).includes('mixta');
          if (t.includes('sensible')) return hay.includes('centella') || hay.includes('cica') || (p.tipoPiel||[]).includes('sensible');
          if (t.includes('acn') || t.includes('imperfec')) return hay.includes('bha') || hay.includes('niacinamid') || hay.includes('salicil');
          if (t.includes('mancha')) return hay.includes('arbutin') || hay.includes('vitamin c') || hay.includes('glow');
          if (t.includes('arrug')) return hay.includes('retinol') || hay.includes('peptid') || hay.includes('colagen');
          if (t.includes('deshidrat')) return hay.includes('hialuron') || hay.includes('hidrat');
          if (t.includes('poros')) return hay.includes('bha') || hay.includes('niacinamid');
          if (t.includes('rojeces')) return hay.includes('centella') || hay.includes('cica') || hay.includes('calm');
          return false;
        };
        return ps.filter(match).slice(0, 3);
      },
      chips: ['Hacer el test completo', 'Ver marcas']
    },

    /* ---------- Marcas / catálogo ---------- */
    {
      id: 'marcas',
      patterns: ['marca', 'marcas', 'que marcas', 'qué marcas', 'cosrx', 'beauty of joseon', 'some by mi', 'anua', 'innisfree', 'laneige', 'klairs', 'torriden', 'numbuzin', 'dr althea'],
      answer: () => `Trabajamos con marcas seleccionadas de K-Beauty. Puedes verlas todas en <a href="marcas.html"><strong>la página de Marcas</strong></a>.`,
      chips: ['Más vendidos', 'Ver ofertas']
    },

    /* ---------- Sobre la marca (valores, misión, visión) ---------- */
    {
      id: 'sobre-nosotros',
      patterns: ['quienes son', 'quiénes son', 'sobre ustedes', 'acerca de', 'sobre lunabi', 'sobre la marca', 'historia', 'mision', 'misión', 'vision', 'visión', 'valores'],
      answer: () => `LÜNABI nace para ofrecer productos <strong>especiales, femeninos y en tendencia</strong> para mujeres que desean resaltar su esencia, belleza y confianza.
<br><br>💜 <em>Nuestra misión:</em> brindar productos cuidadosamente elegidos que ayuden a nuestras clientas a sentirse más seguras, bellas y felices.
<br><br>Valores: <strong>Calidad · Confianza · Cercanía · Elegancia · Honestidad · Buena atención</strong>. <a href="nosotros.html">Conoce más</a>.`,
      chips: ['Ver productos', '¿Cómo compro?', 'Contacto']
    },

    /* ---------- Contacto / WhatsApp / horarios ---------- */
    {
      id: 'contacto',
      patterns: ['contacto', 'contactar', 'contactarme', 'hablar con', 'comunicarme', 'como te contacto', 'cómo te contacto', 'numero', 'número'],
      answer: () => `Puedes comunicarte con nosotras por:
<br>• <strong>WhatsApp</strong> (botón verde abajo a la derecha — elige Lima o Envíos nacionales)
<br>• <strong>Instagram</strong>
<br>• Nuestros canales oficiales publicados en la web`,
      chips: ['¿En qué horario atienden?', 'Libro de reclamaciones']
    },
    {
      id: 'whatsapp',
      patterns: ['whatsapp', 'wsp', 'wasap', 'whats', 'numero de wsp', 'número de wsp'],
      answer: () => `Tenemos <strong>dos números de WhatsApp</strong>:
<br>• <strong>Huancayo y alrededores</strong> — atención directa y delivery local
<br>• <strong>Envíos nacionales</strong> — otras regiones del Perú (pedido anticipado)
<br><br>Haz clic en el botón verde de WhatsApp (abajo a la derecha) y elige tu ubicación. ✨`,
      chips: ['Tiempo de entrega', 'Envíos a provincia']
    },
    {
      id: 'horario',
      patterns: ['horario', 'horarios', 'a que hora', 'a qué hora', 'atienden', 'estan abiertos', 'están abiertos'],
      answer: () => `Atendemos en el horario publicado en nuestras redes o página web. Por WhatsApp respondemos lo más pronto posible.`,
      chips: ['Contacto', 'Hacer un pedido']
    },
    {
      id: 'instagram',
      patterns: ['instagram', 'ig', 'redes sociales', 'facebook', 'tiktok'],
      answer: () => `Encuéntranos en <strong>Instagram</strong>, WhatsApp y nuestros canales oficiales. Los enlaces están en el pie de página. ✨`,
      chips: ['Contacto', 'Horario de atención']
    },

    /* ---------- Reclamos ---------- */
    {
      id: 'libro-reclamaciones',
      patterns: ['libro de reclamaciones', 'reclamacion', 'reclamación', 'queja', 'indecopi'],
      answer: () => `Contamos con <a href="libro-reclamaciones.html"><strong>Libro de Reclamaciones</strong></a> oficial. Para incidencias con tu pedido, recuerda reportar dentro de las primeras 24 horas con evidencia fotográfica.`,
      chips: ['¿Cómo reporto un problema?', 'Contacto']
    },

    /* ---------- Cuenta ---------- */
    {
      id: 'cuenta',
      patterns: ['cuenta', 'registro', 'iniciar sesion', 'iniciar sesión', 'login', 'registrar', 'crear cuenta', 'mi cuenta', 'mis pedidos', 'mis favoritos'],
      answer: () => `Puedes crear tu cuenta desde el ícono 👤 en la barra superior. En <a href="cuenta.html"><strong>Mi cuenta</strong></a> verás tus pedidos, favoritos, tu rutina del test y tu nivel de membresía.`,
      chips: ['Hacer el test', 'Ver favoritos']
    },

    /* ---------- Despedida ---------- */
    {
      id: 'despedida',
      patterns: ['adios', 'adiós', 'chau', 'nos vemos', 'hasta luego', 'bye', 'hasta pronto'],
      answer: () => `¡Hasta pronto! ✨ Gracias por confiar en LÜNABI. Que tengas un día hermoso. 💜`,
      chips: []
    }
  ];

  const FALLBACK = () => `No estoy segura de haber entendido 🤔. Puedo ayudarte con:
<br>• <strong>Cómo comprar</strong>, métodos de pago, confirmación
<br>• <strong>Tiempo de entrega</strong> y pedido anticipado (15–20 días)
<br>• <strong>Envíos</strong> a Lima y provincias
<br>• <strong>Cambios</strong>, devoluciones y reporte de incidencias
<br>• <strong>Privacidad</strong> y seguridad
<br>• Recomendaciones con nuestro <strong>test</strong>
<br><br>O si prefieres hablar con una persona, usa el botón de WhatsApp verde (abajo a la derecha).`;

  const QUICK_CHIPS_INITIAL = [
    '¿Cómo compro?',
    'Tiempo de entrega',
    'Métodos de pago',
    '¿Envíos a provincia?',
    'Pedido anticipado',
    'Hacer el test'
  ];
  const QUICK_CHIPS_AFTER = [
    'Cambios y devoluciones',
    'Ver ofertas',
    'Contacto',
    'Sobre LÜNABI'
  ];

  /* ================================================================
   * MATCHER — scoring más inteligente:
   *   - Match de frase completa → +10 por carácter (más peso a frases largas).
   *   - Match de token individual → +2 por carácter.
   *   - Match parcial al inicio de palabra → +1 por carácter (para
   *     capturar variantes como "recomienda" vs "recomendación").
   *   - Desempate por longitud total de patrones del intent (los más
   *     específicos ganan sobre los más genéricos).
   * ================================================================ */
  function normalize(s) {
    return (s || '').toLowerCase()
      .normalize('NFD').replace(/[̀-ͯ]/g, '')  // quita acentos
      .replace(/[¿¡!?¿\.,;:()"'`]/g, ' ')         // quita puntuación básica
      .replace(/\s+/g, ' ')
      .trim();
  }
  function tokenize(s) {
    return normalize(s).split(' ').filter(t => t.length >= 3);
  }
  function matchIntent(text) {
    const q = normalize(text);
    if (!q) return null;
    const qTokens = tokenize(text);
    let best = null, bestScore = 0;

    for (const intent of INTENTS) {
      let score = 0;
      for (const p of intent.patterns) {
        const np = normalize(p);
        if (!np) continue;
        // Frase completa dentro del input
        if (q.includes(np)) {
          score += np.length * 10;
          continue;
        }
        // Token por token (patterns multi-palabra que coinciden parcialmente)
        const pTokens = np.split(' ').filter(Boolean);
        for (const pt of pTokens) {
          if (pt.length < 3) continue;
          if (qTokens.some(qt => qt === pt)) {
            score += pt.length * 2;
          } else if (qTokens.some(qt => qt.startsWith(pt) || pt.startsWith(qt))) {
            score += pt.length; // prefijo (variantes morfológicas)
          }
        }
      }
      if (score > bestScore) { bestScore = score; best = intent; }
    }
    // Umbral mínimo para evitar matches espurios en entradas muy cortas
    return bestScore >= 6 ? best : null;
  }

  /* Punto de extensión backend: reemplazar por fetch('/api/chat', {...})
   * cuando haya IA real. Retorna { text, products?, chips? }. */
  async function answer(userText) {
    const intent = matchIntent(userText);
    const products = window.products || [];
    if (!intent) {
      return { text: FALLBACK(), chips: QUICK_CHIPS_INITIAL };
    }
    const text = typeof intent.answer === 'function' ? intent.answer(userText) : intent.answer;
    let related = [];
    if (typeof intent.products === 'function') {
      try { related = intent.products(products, userText) || []; } catch (e) { related = []; }
    }
    const chips = Array.isArray(intent.chips) ? intent.chips : QUICK_CHIPS_AFTER;
    return { text, products: related, chips };
  }

  /* ================================================================
   * MARKUP + MOUNT
   * ================================================================ */
  const FLOAT_HTML = `
    <button class="lu-chat-float" id="luChatFloat" type="button" aria-label="Chat con Luna">
      <span class="lu-chat-dot" aria-hidden="true"></span>
      <i class="bi bi-chat-dots-fill"></i>
      <span class="lu-chat-tooltip">Pregúntame</span>
    </button>`;

  const WINDOW_HTML = `
    <div class="lu-chat-window" id="luChatWindow" role="dialog" aria-label="Chat con Luna" aria-hidden="true">
      <div class="lu-chat-header">
        <div class="lu-chat-avatar"><i class="bi bi-stars"></i></div>
        <div class="lu-chat-identity">
          <strong>Luna</strong>
          <span>Asistente Lünabi</span>
        </div>
        <button class="lu-chat-close" id="luChatClose" type="button" aria-label="Cerrar"><i class="bi bi-x-lg"></i></button>
      </div>
      <div class="lu-chat-body" id="luChatBody" aria-live="polite"></div>
      <div class="lu-chat-suggestions" id="luChatSuggestions"></div>
      <form class="lu-chat-input" id="luChatForm" autocomplete="off">
        <input type="text" id="luChatInput" placeholder="Escribe tu pregunta..." aria-label="Mensaje" maxlength="300">
        <button type="submit" id="luChatSend" aria-label="Enviar"><i class="bi bi-send-fill"></i></button>
      </form>
      <div class="lu-chat-footer">Respuestas automáticas · <strong>Luna</strong> aprende de cada conversación</div>
    </div>`;

  let floatEl, windowEl, bodyEl, suggEl, formEl, inputEl, closeEl;

  function mount() {
    if (!document.getElementById('luChatFloat')) {
      const t = document.createElement('div');
      t.innerHTML = FLOAT_HTML.trim();
      document.body.appendChild(t.firstChild);
    }
    if (!document.getElementById('luChatWindow')) {
      const t = document.createElement('div');
      t.innerHTML = WINDOW_HTML.trim();
      document.body.appendChild(t.firstChild);
    }
    floatEl  = document.getElementById('luChatFloat');
    windowEl = document.getElementById('luChatWindow');
    bodyEl   = document.getElementById('luChatBody');
    suggEl   = document.getElementById('luChatSuggestions');
    formEl   = document.getElementById('luChatForm');
    inputEl  = document.getElementById('luChatInput');
    closeEl  = document.getElementById('luChatClose');

    floatEl.addEventListener('click', openChat);
    closeEl.addEventListener('click', closeChat);
    formEl.addEventListener('submit', onSubmit);

    greet();
    renderSuggestions(QUICK_CHIPS_INITIAL);
  }

  function openChat() {
    windowEl.classList.add('is-open');
    windowEl.setAttribute('aria-hidden', 'false');
    floatEl.classList.add('is-open');
    setTimeout(() => inputEl && inputEl.focus(), 250);
  }
  function closeChat() {
    windowEl.classList.remove('is-open');
    windowEl.setAttribute('aria-hidden', 'true');
    floatEl.classList.remove('is-open');
  }

  function nowTime() {
    const d = new Date();
    return d.toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit' });
  }

  function appendMessage({ who, html, products, typing }) {
    const el = document.createElement('div');
    el.className = `lu-chat-msg ${who}${typing ? ' is-typing' : ''}`;
    if (typing) {
      el.innerHTML = `<div class="lu-chat-bubble"><span></span><span></span><span></span></div>`;
    } else {
      let bubble = `<div class="lu-chat-bubble">${html}</div>`;
      if (Array.isArray(products) && products.length) {
        bubble += `<div class="lu-chat-products">${products.map(renderProduct).join('')}</div>`;
      }
      bubble += `<span class="lu-chat-time">${nowTime()}</span>`;
      el.innerHTML = bubble;
    }
    bodyEl.appendChild(el);
    bodyEl.scrollTop = bodyEl.scrollHeight;
    return el;
  }
  function renderProduct(p) {
    const brand = (window.brands || []).find(b => b.slug === p.marca);
    const img = (p.imagenes || [])[0] || '';
    return `
      <a class="lu-chat-product" href="producto.html?id=${p.id}">
        <img src="${img}" alt="" loading="lazy" onerror="this.style.visibility='hidden'">
        <div class="lu-chat-product-info">
          <div class="lu-chat-product-name">${p.nombre}</div>
          <div class="lu-chat-product-brand">${brand ? brand.nombre : p.marca}</div>
        </div>
        <div class="lu-chat-product-price">S/ ${Number(p.precio).toFixed(2)}</div>
      </a>`;
  }

  function renderSuggestions(items) {
    if (!suggEl) return;
    suggEl.innerHTML = (items || []).map(txt =>
      `<button class="lu-chat-chip" type="button" data-suggest="${txt.replace(/"/g, '&quot;')}">${txt}</button>`
    ).join('');
    suggEl.querySelectorAll('[data-suggest]').forEach(btn => {
      btn.addEventListener('click', () => {
        const val = btn.getAttribute('data-suggest');
        inputEl.value = val;
        formEl.requestSubmit();
      });
    });
  }

  function greet() {
    let name = '';
    try {
      const session = JSON.parse(localStorage.getItem('lunabi_session') || 'null');
      if (session && session.nombre) name = ', ' + String(session.nombre).split(' ')[0];
    } catch (e) { /* noop */ }
    const h = new Date().getHours();
    const slot = h < 6 ? 'Buenas noches' : h < 12 ? 'Buenos días' : h < 19 ? 'Buenas tardes' : 'Buenas noches';
    appendMessage({
      who: 'bot',
      html: `${slot}${name} ✨ Soy <strong>Luna</strong>, tu asistente de Lünabi. Respondo dudas sobre envíos, pagos, productos, marcas y más. ¿En qué te ayudo?`
    });
  }

  async function onSubmit(e) {
    e.preventDefault();
    const text = (inputEl.value || '').trim();
    if (!text) return;
    inputEl.value = '';
    appendMessage({ who: 'user', html: escapeHtml(text) });

    // Typing indicator con duración proporcional a la longitud de la
    // respuesta (sensación más natural, como si Luna estuviera tipeando).
    const typingEl = appendMessage({ who: 'bot', typing: true });
    const res = await answer(text);
    const delay = Math.min(1400, 450 + (res.text.length * 3) + Math.random() * 250);
    await new Promise(r => setTimeout(r, delay));
    typingEl.remove();

    appendMessage({ who: 'bot', html: res.text, products: res.products });

    // Sugerencias contextuales (cada intent trae las suyas)
    renderSuggestions(res.chips && res.chips.length ? res.chips : QUICK_CHIPS_AFTER);
  }

  function escapeHtml(s) {
    return String(s)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  /* ================================================================
   * BOOT
   * ================================================================ */
  function boot() {
    if (!document.body) return setTimeout(boot, 30);
    mount();
  }
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})();
