/* ===== LÜNABI — Data Layer ===== */

const brands = [
  { id: 1,  nombre: "Beauty of Joseon", slug: "beauty-of-joseon", logo: "https://images.unsplash.com/photo-1611080626919-7cf5a9dbab5b?w=120&q=80", descripcion: "Marca coreana que fusiona recetas ancestrales de la dinastía Joseon con ciencia moderna para una piel luminosa." },
  { id: 2,  nombre: "Dr. Althea",       slug: "dr-althea",       logo: "https://images.unsplash.com/photo-1556228578-0d85b1a4d571?w=120&q=80", descripcion: "Dermocosmética coreana con activos clínicos y fórmulas veganas para pieles sensibles." },
  { id: 3,  nombre: "COSRX",            slug: "cosrx",           logo: "https://images.unsplash.com/photo-1570194065650-d99fb4a38691?w=120&q=80", descripcion: "Soluciones minimalistas centradas en ingredientes clave como BHA, AHA y Centella Asiática." },
  { id: 4,  nombre: "Some By Mi",       slug: "some-by-mi",      logo: "https://images.unsplash.com/photo-1556228578-0d85b1a4d571?w=120&q=80", descripcion: "30 días para transformar tu piel. Línea estrella con AHA, BHA y PHA de origen natural." },
  { id: 5,  nombre: "Anua",             slug: "anua",            logo: "https://images.unsplash.com/photo-1556228578-0d85b1a4d571?w=120&q=80", descripcion: "Skincare suave y efectivo con 77% extracto de Heartleaf para calmar e hidratar." },
  { id: 6,  nombre: "Innisfree",        slug: "innisfree",       logo: "https://images.unsplash.com/photo-1556228578-0d85b1a4d571?w=120&q=80", descripcion: "Ingredientes naturales de la isla de Jeju, eco-friendly y cruelty-free." },
  { id: 7,  nombre: "Laneige",          slug: "laneige",         logo: "https://images.unsplash.com/photo-1556228578-0d85b1a4d571?w=120&q=80", descripcion: "Tecnología Water Science™ para una hidratación profunda y luminosidad." },
  { id: 8,  nombre: "Klairs",           slug: "klairs",          logo: "https://images.unsplash.com/photo-1556228578-0d85b1a4d571?w=120&q=80", descripcion: "Fórmulas simples y gentiles para pieles sensibles. Vegana y libre de crueldad." },
  { id: 9,  nombre: "Torriden",         slug: "torriden",        logo: "https://images.unsplash.com/photo-1556228578-0d85b1a4d571?w=120&q=80", descripcion: "Ácido hialurónico de bajo peso molecular para una hidratación que penetra en profundidad." },
  { id: 10, nombre: "Numbuzin",         slug: "numbuzin",        logo: "https://images.unsplash.com/photo-1556228578-0d85b1a4d571?w=120&q=80", descripcion: "Formulaciones numeradas con ciencia coreana avanzada para cada necesidad de la piel." }
];

const products = [
  {
    id: 1,
    slug: "glow-deep-serum-rice-arbutin",
    nombre: "Glow Deep Serum: Rice + Arbutin",
    marca: "beauty-of-joseon",
    categoria: "serum",
    subcategoria: null,
    tipoPiel: ["mixta", "grasa", "normal"],
    precio: 80,
    precioAntes: null,
    imagenes: [
      "https://images.unsplash.com/photo-1620916566398-39f1143ab7be?w=600&q=80",
      "https://images.unsplash.com/photo-1608248543803-ba4f8c70ae0b?w=600&q=80",
      "https://images.unsplash.com/photo-1611080626919-7cf5a9dbab5b?w=600&q=80"
    ],
    descripcion: "Sérum iluminador con extracto de arroz fermentado y alfa-arbutina que unifica el tono, reduce manchas oscuras y aporta un glow natural sin dejar la piel grasa.",
    modoDeUso: [
      "Limpia tu rostro y aplica tónico",
      "Dispensa 2-3 gotas en las palmas",
      "Presiona suavemente sobre el rostro y cuello",
      "Deja absorber antes de aplicar crema hidratante",
      "Usar mañana y noche para mejores resultados"
    ],
    beneficios: [
      "Ilumina y unifica el tono de piel",
      "Reduce visiblemente manchas oscuras",
      "Hidratación ligera sin sensación grasa",
      "Fortalece la barrera cutánea con extracto de arroz"
    ],
    masVendido: true,
    enOferta: false
  },
  {
    id: 2,
    slug: "amino-acid-gentle-bubble-cleanser",
    nombre: "Amino Acid Gentle Bubble Cleanser",
    marca: "dr-althea",
    categoria: "limpieza",
    subcategoria: "foam",
    tipoPiel: ["sensible", "seca", "normal"],
    precio: 70,
    precioAntes: null,
    imagenes: [
      "https://images.unsplash.com/photo-1556228578-0d85b1a4d571?w=600&q=80",
      "https://images.unsplash.com/photo-1571781926291-c477ebfd024b?w=600&q=80",
      "https://images.unsplash.com/photo-1570194065650-d99fb4a38691?w=600&q=80"
    ],
    descripcion: "Este limpiador espumoso equilibra eficacia y delicadeza. Su fórmula con aminoácidos naturales elimina impurezas sin comprometer la hidratación de tu piel. Ideal para todo tipo de piel, incluso las más sensibles.",
    modoDeUso: [
      "Humedece tu rostro con agua tibia",
      "Aplica 1-2 pumps, haz espuma en tus manos",
      "Masajea con movimientos circulares evitando el área de ojos",
      "Enjuaga con agua tibia y continúa con tónico o suero",
      "Úsalo diariamente, mañana y noche"
    ],
    beneficios: [
      "Limpieza efectiva de impurezas y maquillaje",
      "Preserva la hidratación durante el lavado",
      "Calma la piel sensible y minimiza rojeces",
      "Fortalece la barrera cutánea"
    ],
    masVendido: true,
    enOferta: false
  },
  {
    id: 3,
    slug: "advanced-snail-96-mucin-power-essence",
    nombre: "Advanced Snail 96 Mucin Power Essence",
    marca: "cosrx",
    categoria: "esencia",
    subcategoria: null,
    tipoPiel: ["seca", "normal", "mixta", "sensible"],
    precio: 95,
    precioAntes: 120,
    imagenes: [
      "https://images.unsplash.com/photo-1608248543803-ba4f8c70ae0b?w=600&q=80",
      "https://images.unsplash.com/photo-1611080626919-7cf5a9dbab5b?w=600&q=80",
      "https://images.unsplash.com/photo-1620916566398-39f1143ab7be?w=600&q=80"
    ],
    descripcion: "Esencia con 96% de mucina de caracol filtrada que repara, hidrata y nutre la piel dejándola elástica y luminosa. Textura ligera y de rápida absorción.",
    modoDeUso: [
      "Después del tónico, dispensa una cantidad generosa",
      "Aplica sobre el rostro con palmadas suaves",
      "Puedes aplicar varias capas para mayor hidratación",
      "Continúa con sérum y crema hidratante"
    ],
    beneficios: [
      "Reparación profunda de la piel dañada",
      "Hidratación intensa y duradera",
      "Mejora la elasticidad y textura",
      "Reduce cicatrices y marcas de acné"
    ],
    masVendido: true,
    enOferta: true
  },
  {
    id: 4,
    slug: "aha-bha-pha-30-days-miracle-toner",
    nombre: "AHA BHA PHA 30 Days Miracle Toner",
    marca: "some-by-mi",
    categoria: "tonico",
    subcategoria: null,
    tipoPiel: ["grasa", "mixta", "normal"],
    precio: 75,
    precioAntes: 95,
    imagenes: [
      "https://images.unsplash.com/photo-1570194065650-d99fb4a38691?w=600&q=80",
      "https://images.unsplash.com/photo-1556228578-0d85b1a4d571?w=600&q=80",
      "https://images.unsplash.com/photo-1608248543803-ba4f8c70ae0b?w=600&q=80"
    ],
    descripcion: "Tónico exfoliante suave con triple ácido (AHA, BHA, PHA) y extracto de árbol de té que controla el sebo, desobstruye poros y renueva la textura de la piel en 30 días.",
    modoDeUso: [
      "Después de la limpieza, vierte en un pad de algodón",
      "Pasa suavemente por todo el rostro evitando ojos",
      "También puedes aplicar con las manos dando palmadas",
      "Espera a que se absorba antes del siguiente paso",
      "Usar por la noche; aplicar bloqueador de día"
    ],
    beneficios: [
      "Exfoliación suave sin irritación",
      "Controla la producción de sebo",
      "Minimiza poros visiblemente",
      "Renueva la textura de la piel"
    ],
    masVendido: true,
    enOferta: true
  },
  {
    id: 5,
    slug: "heartleaf-77-soothing-toner",
    nombre: "Heartleaf 77% Soothing Toner",
    marca: "anua",
    categoria: "tonico",
    subcategoria: null,
    tipoPiel: ["sensible", "mixta", "normal", "grasa"],
    precio: 85,
    precioAntes: null,
    imagenes: [
      "https://images.unsplash.com/photo-1611080626919-7cf5a9dbab5b?w=600&q=80",
      "https://images.unsplash.com/photo-1620916566398-39f1143ab7be?w=600&q=80",
      "https://images.unsplash.com/photo-1608248543803-ba4f8c70ae0b?w=600&q=80"
    ],
    descripcion: "Tónico calmante con 77% de extracto de Heartleaf (Houttuynia Cordata) que alivia rojeces, hidrata y equilibra el pH de la piel sensible e irritada.",
    modoDeUso: [
      "Aplicar después de la limpieza facial",
      "Verter en las palmas o en un pad de algodón",
      "Presionar suavemente sobre el rostro",
      "Se puede aplicar en capas para mayor hidratación",
      "Usar mañana y noche"
    ],
    beneficios: [
      "Calma rojeces e irritaciones al instante",
      "Equilibra el pH de la piel",
      "Hidratación refrescante y ligera",
      "Ideal para pieles sensibles y reactivas"
    ],
    masVendido: true,
    enOferta: false
  },
  {
    id: 6,
    slug: "green-tea-seed-hyaluronic-cream",
    nombre: "Green Tea Seed Hyaluronic Cream",
    marca: "innisfree",
    categoria: "crema-facial",
    subcategoria: null,
    tipoPiel: ["mixta", "normal", "seca"],
    precio: 92,
    precioAntes: null,
    imagenes: [
      "https://images.unsplash.com/photo-1570194065650-d99fb4a38691?w=600&q=80",
      "https://images.unsplash.com/photo-1611080626919-7cf5a9dbab5b?w=600&q=80",
      "https://images.unsplash.com/photo-1556228578-0d85b1a4d571?w=600&q=80"
    ],
    descripcion: "Crema hidratante con semillas de té verde de Jeju y ácido hialurónico que proporciona hidratación duradera manteniendo la piel fresca y equilibrada.",
    modoDeUso: [
      "Aplicar como último paso de la rutina de skincare",
      "Tomar una cantidad del tamaño de una cereza",
      "Distribuir en puntos: frente, mejillas, nariz y mentón",
      "Masajear suavemente hasta absorción completa"
    ],
    beneficios: [
      "Hidratación de larga duración hasta 100 horas",
      "Antioxidantes del té verde protegen la piel",
      "Textura ligera y no comedogénica",
      "Fortalece la barrera de hidratación"
    ],
    masVendido: true,
    enOferta: false
  },
  {
    id: 7,
    slug: "water-sleeping-mask",
    nombre: "Water Sleeping Mask",
    marca: "laneige",
    categoria: "sleeping-mask",
    subcategoria: null,
    tipoPiel: ["seca", "normal", "mixta"],
    precio: 110,
    precioAntes: 140,
    imagenes: [
      "https://images.unsplash.com/photo-1608248543803-ba4f8c70ae0b?w=600&q=80",
      "https://images.unsplash.com/photo-1570194065650-d99fb4a38691?w=600&q=80",
      "https://images.unsplash.com/photo-1620916566398-39f1143ab7be?w=600&q=80"
    ],
    descripcion: "Mascarilla nocturna best-seller con tecnología Sleep-tox™ que purifica y repara la piel mientras duermes. Despierta con piel radiante e hidratada.",
    modoDeUso: [
      "Aplicar como último paso de tu rutina nocturna",
      "Tomar una capa generosa con la espátula incluida",
      "Distribuir uniformemente sobre el rostro",
      "Dejar actuar toda la noche",
      "Enjuagar por la mañana con agua tibia"
    ],
    beneficios: [
      "Hidratación profunda mientras duermes",
      "Purifica y desintoxica la piel",
      "Despierta con piel suave y luminosa",
      "Aroma relajante de lavanda y manzanilla"
    ],
    masVendido: true,
    enOferta: true
  },
  {
    id: 8,
    slug: "supple-preparation-facial-toner",
    nombre: "Supple Preparation Facial Toner",
    marca: "klairs",
    categoria: "tonico",
    subcategoria: null,
    tipoPiel: ["sensible", "seca", "normal"],
    precio: 78,
    precioAntes: null,
    imagenes: [
      "https://images.unsplash.com/photo-1620916566398-39f1143ab7be?w=600&q=80",
      "https://images.unsplash.com/photo-1608248543803-ba4f8c70ae0b?w=600&q=80",
      "https://images.unsplash.com/photo-1611080626919-7cf5a9dbab5b?w=600&q=80"
    ],
    descripcion: "Tónico hidratante que prepara la piel para absorber mejor los siguientes productos. Fórmula vegana con extractos botánicos que calman y suavizan.",
    modoDeUso: [
      "Aplicar inmediatamente después de la limpieza",
      "Verter en las palmas de las manos",
      "Presionar suavemente sobre todo el rostro",
      "Aplicar en 3-7 capas para hidratación extra",
      "Continuar con sérum y crema"
    ],
    beneficios: [
      "Prepara la piel para mejor absorción",
      "Hidratación profunda en múltiples capas",
      "Fórmula vegana y libre de crueldad",
      "Calma y suaviza pieles sensibles"
    ],
    masVendido: true,
    enOferta: false
  },
  {
    id: 9,
    slug: "dive-in-low-molecular-hyaluronic-acid-serum",
    nombre: "DIVE-IN Low Molecular Hyaluronic Acid Serum",
    marca: "torriden",
    categoria: "serum",
    subcategoria: null,
    tipoPiel: ["seca", "normal", "sensible"],
    precio: 88,
    precioAntes: null,
    imagenes: [
      "https://images.unsplash.com/photo-1611080626919-7cf5a9dbab5b?w=600&q=80",
      "https://images.unsplash.com/photo-1620916566398-39f1143ab7be?w=600&q=80",
      "https://images.unsplash.com/photo-1570194065650-d99fb4a38691?w=600&q=80"
    ],
    descripcion: "Sérum con 5 tipos de ácido hialurónico de bajo peso molecular que penetra profundamente para hidratar desde el interior, dejando la piel plump y luminosa.",
    modoDeUso: [
      "Aplicar después del tónico sobre piel húmeda",
      "Dispensar 2-3 gotas en las palmas",
      "Presionar suavemente sobre el rostro y cuello",
      "Sellar con crema hidratante",
      "Usar mañana y noche"
    ],
    beneficios: [
      "Hidratación profunda de 5 capas",
      "Ácido hialurónico de bajo peso molecular",
      "Efecto plumping visible",
      "Textura acuosa de rápida absorción"
    ],
    masVendido: false,
    enOferta: false
  },
  {
    id: 10,
    slug: "no3-skin-softening-serum",
    nombre: "No.3 Skin Softening Serum",
    marca: "numbuzin",
    categoria: "serum",
    subcategoria: null,
    tipoPiel: ["mixta", "grasa", "normal"],
    precio: 90,
    precioAntes: 115,
    imagenes: [
      "https://images.unsplash.com/photo-1608248543803-ba4f8c70ae0b?w=600&q=80",
      "https://images.unsplash.com/photo-1611080626919-7cf5a9dbab5b?w=600&q=80",
      "https://images.unsplash.com/photo-1620916566398-39f1143ab7be?w=600&q=80"
    ],
    descripcion: "Sérum suavizante con niacinamida y galactomyces que refina la textura, controla el sebo y aporta luminosidad sin irritar. El favorito de TikTok.",
    modoDeUso: [
      "Aplicar después del tónico",
      "Dispensar 2-3 gotas",
      "Extender sobre el rostro con movimientos ascendentes",
      "Esperar 30 segundos antes del siguiente paso",
      "Ideal para rutina de mañana y noche"
    ],
    beneficios: [
      "Refina la textura y minimiza poros",
      "Controla el exceso de sebo",
      "Ilumina sin irritar",
      "Absorción rápida y acabado sedoso"
    ],
    masVendido: false,
    enOferta: true
  },
  {
    id: 11,
    slug: "aloe-bha-skin-toner",
    nombre: "AHA/BHA Clarifying Treatment Toner",
    marca: "cosrx",
    categoria: "tonico",
    subcategoria: null,
    tipoPiel: ["grasa", "mixta"],
    precio: 65,
    precioAntes: null,
    imagenes: [
      "https://images.unsplash.com/photo-1570194065650-d99fb4a38691?w=600&q=80",
      "https://images.unsplash.com/photo-1608248543803-ba4f8c70ae0b?w=600&q=80",
      "https://images.unsplash.com/photo-1556228578-0d85b1a4d571?w=600&q=80"
    ],
    descripcion: "Tónico clarificante con AHA y BHA naturales que exfolia suavemente, desobstruye poros y prepara la piel para absorber mejor los productos siguientes.",
    modoDeUso: [
      "Usar después de la limpieza facial",
      "Aplicar con pad de algodón o con las manos",
      "Pasar suavemente por zona T y áreas problemáticas",
      "Dejar absorber y continuar rutina"
    ],
    beneficios: [
      "Exfoliación química suave",
      "Desobstruye poros eficazmente",
      "Prepara la piel para mejor absorción",
      "Controla puntos negros y espinillas"
    ],
    masVendido: false,
    enOferta: false
  },
  {
    id: 12,
    slug: "lip-sleeping-mask-berry",
    nombre: "Lip Sleeping Mask — Berry",
    marca: "laneige",
    categoria: "labios",
    subcategoria: "balsamo",
    tipoPiel: ["seca", "normal", "mixta", "grasa", "sensible"],
    precio: 68,
    precioAntes: 85,
    imagenes: [
      "https://images.unsplash.com/photo-1571781926291-c477ebfd024b?w=600&q=80",
      "https://images.unsplash.com/photo-1608248543803-ba4f8c70ae0b?w=600&q=80",
      "https://images.unsplash.com/photo-1556228578-0d85b1a4d571?w=600&q=80"
    ],
    descripcion: "Mascarilla labial nocturna best-seller con Berry Mix Complex™ y vitamina C que hidrata, exfolia y suaviza labios agrietados mientras duermes.",
    modoDeUso: [
      "Aplicar generosamente sobre los labios antes de dormir",
      "Dejar actuar toda la noche",
      "Limpiar suavemente por la mañana con un pañuelo",
      "Usar diariamente para mejores resultados"
    ],
    beneficios: [
      "Hidratación intensiva toda la noche",
      "Exfolia células muertas suavemente",
      "Labios suaves y tersos al despertar",
      "Delicioso aroma y sabor a berries"
    ],
    masVendido: false,
    enOferta: true
  },
  {
    id: 13,
    slug: "birch-juice-moisturizing-sunscreen",
    nombre: "Birch Juice Moisturizing Sunscreen SPF50+",
    marca: "anua",
    categoria: "bloqueador",
    subcategoria: "liquido",
    tipoPiel: ["seca", "normal", "sensible"],
    precio: 82,
    precioAntes: null,
    imagenes: [
      "https://images.unsplash.com/photo-1556228578-0d85b1a4d571?w=600&q=80",
      "https://images.unsplash.com/photo-1570194065650-d99fb4a38691?w=600&q=80",
      "https://images.unsplash.com/photo-1611080626919-7cf5a9dbab5b?w=600&q=80"
    ],
    descripcion: "Protector solar hidratante con jugo de abedul que protege UVA/UVB mientras nutre e hidrata. Acabado natural sin residuo blanco.",
    modoDeUso: [
      "Aplicar como último paso de skincare por la mañana",
      "Usar una cantidad de dos dedos para el rostro",
      "Distribuir uniformemente y dejar absorber",
      "Reaplicar cada 2-3 horas si hay exposición solar"
    ],
    beneficios: [
      "Protección SPF50+ PA++++",
      "Hidratación con jugo de abedul",
      "Sin residuo blanco ni sensación grasa",
      "Ideal como base de maquillaje"
    ],
    masVendido: false,
    enOferta: false
  },
  {
    id: 14,
    slug: "miracle-repair-eye-cream",
    nombre: "Miracle Repair Eye Cream",
    marca: "some-by-mi",
    categoria: "contorno-ojos",
    subcategoria: "crema",
    tipoPiel: ["seca", "normal", "mixta"],
    precio: 72,
    precioAntes: null,
    imagenes: [
      "https://images.unsplash.com/photo-1620916566398-39f1143ab7be?w=600&q=80",
      "https://images.unsplash.com/photo-1570194065650-d99fb4a38691?w=600&q=80",
      "https://images.unsplash.com/photo-1608248543803-ba4f8c70ae0b?w=600&q=80"
    ],
    descripcion: "Crema para contorno de ojos con péptidos y Centella Asiática que reduce ojeras, líneas finas e hinchazón del área periocular.",
    modoDeUso: [
      "Aplicar una pequeña cantidad con el dedo anular",
      "Dar toques suaves alrededor del área de los ojos",
      "Ir desde el lagrimal hacia afuera",
      "Usar mañana y noche después del sérum"
    ],
    beneficios: [
      "Reduce ojeras y decoloración",
      "Minimiza líneas finas de expresión",
      "Descongestiona la hinchazón matutina",
      "Péptidos que estimulan el colágeno"
    ],
    masVendido: false,
    enOferta: false
  },
  {
    id: 15,
    slug: "vitamin-e-mask",
    nombre: "Freshly Juiced Vitamin E Mask",
    marca: "klairs",
    categoria: "mascarillas",
    subcategoria: "lavable",
    tipoPiel: ["seca", "sensible", "normal"],
    precio: 98,
    precioAntes: null,
    imagenes: [
      "https://images.unsplash.com/photo-1571781926291-c477ebfd024b?w=600&q=80",
      "https://images.unsplash.com/photo-1611080626919-7cf5a9dbab5b?w=600&q=80",
      "https://images.unsplash.com/photo-1620916566398-39f1143ab7be?w=600&q=80"
    ],
    descripcion: "Mascarilla nocturna antioxidante con vitamina E y niacinamida que nutre profundamente, ilumina y rejuvenece la piel cansada y deshidratada.",
    modoDeUso: [
      "Aplicar una capa fina como último paso nocturno",
      "Dejar actuar toda la noche",
      "Si prefieres, usar 15 min como mascarilla express",
      "Enjuagar con agua tibia por la mañana"
    ],
    beneficios: [
      "Nutrición profunda con vitamina E",
      "Efecto antioxidante y anti-edad",
      "Ilumina la piel apagada",
      "Fórmula vegana y sin fragancias"
    ],
    masVendido: false,
    enOferta: false
  },
  {
    id: 16,
    slug: "green-tea-hyaluronic-mist",
    nombre: "Green Tea Hyaluronic Acid Face Mist",
    marca: "innisfree",
    categoria: "mist",
    subcategoria: null,
    tipoPiel: ["mixta", "grasa", "normal", "seca"],
    precio: 55,
    precioAntes: 70,
    imagenes: [
      "https://images.unsplash.com/photo-1556228578-0d85b1a4d571?w=600&q=80",
      "https://images.unsplash.com/photo-1570194065650-d99fb4a38691?w=600&q=80",
      "https://images.unsplash.com/photo-1608248543803-ba4f8c70ae0b?w=600&q=80"
    ],
    descripcion: "Bruma facial refrescante con té verde de Jeju y ácido hialurónico para hidratar y revitalizar la piel al instante. Perfecta para llevar en el bolso.",
    modoDeUso: [
      "Agitar suavemente antes de usar",
      "Rociar a 20cm del rostro con ojos cerrados",
      "Puede usarse sobre maquillaje para refrescar",
      "Aplicar cuantas veces desees durante el día"
    ],
    beneficios: [
      "Hidratación instantánea en cualquier momento",
      "Refresca y revitaliza la piel cansada",
      "Fija el maquillaje y reduce el brillo",
      "Formato práctico para llevar a cualquier lugar"
    ],
    masVendido: false,
    enOferta: true
  },
  {
    id: 17,
    slug: "glass-skin-cushion-foundation",
    nombre: "Glass Skin Cushion Foundation #21",
    marca: "laneige",
    categoria: "rostro",
    subcategoria: "cushion",
    tipoPiel: ["seca", "normal", "mixta"],
    precio: 145,
    precioAntes: null,
    imagenes: [
      "https://images.unsplash.com/photo-1571781926291-c477ebfd024b?w=600&q=80",
      "https://images.unsplash.com/photo-1556228578-0d85b1a4d571?w=600&q=80",
      "https://images.unsplash.com/photo-1608248543803-ba4f8c70ae0b?w=600&q=80"
    ],
    descripcion: "Base en cushion con acabado glass skin coreano. Cobertura ligera a media con tecnología Water Science™ que hidrata mientras unifica el tono y aporta un glow natural que dura todo el día.",
    modoDeUso: [
      "Aplicar sobre piel limpia e hidratada",
      "Presionar el aplicador sobre la esponja para recoger producto",
      "Dar ligeros toques sobre el rostro desde el centro hacia afuera",
      "Construir cobertura según necesidad",
      "Sellar con polvo translúcido si deseas mayor duración"
    ],
    beneficios: [
      "Acabado glass skin luminoso",
      "Hidratación durante 16 horas",
      "Cobertura construible y ligera",
      "No comedogénica y con SPF 42"
    ],
    masVendido: true,
    enOferta: false
  },
  {
    id: 18,
    slug: "wonder-eyeshadow-palette-rosy-dream",
    nombre: "Wonder Eyeshadow Palette — Rosy Dream",
    marca: "klairs",
    categoria: "ojos",
    subcategoria: "sombras",
    tipoPiel: ["normal", "mixta", "sensible", "seca", "grasa"],
    precio: 125,
    precioAntes: 160,
    imagenes: [
      "https://images.unsplash.com/photo-1620916566398-39f1143ab7be?w=600&q=80",
      "https://images.unsplash.com/photo-1571781926291-c477ebfd024b?w=600&q=80",
      "https://images.unsplash.com/photo-1611080626919-7cf5a9dbab5b?w=600&q=80"
    ],
    descripcion: "Paleta de 9 sombras en tonos rosa-lavanda inspirada en el K-Beauty moderno. Fórmula vegana de alta pigmentación, blending fácil y larga duración.",
    modoDeUso: [
      "Aplicar una base de sombras para mayor duración",
      "Usar los tonos claros en el párpado móvil",
      "Definir con los tonos oscuros en la línea de las pestañas",
      "Difuminar bien los bordes con una brocha suave"
    ],
    beneficios: [
      "Fórmula vegana y cruelty-free",
      "9 tonos versátiles day-to-night",
      "Alta pigmentación sin fallout",
      "Duración de hasta 12 horas"
    ],
    masVendido: false,
    enOferta: true
  },
  {
    id: 19,
    slug: "dynasty-velvet-lip-tint-peach",
    nombre: "Dynasty Velvet Lip Tint — Peach Blossom",
    marca: "beauty-of-joseon",
    categoria: "labios",
    subcategoria: "tinta-liquida",
    tipoPiel: ["normal", "mixta", "seca", "grasa", "sensible"],
    precio: 58,
    precioAntes: null,
    imagenes: [
      "https://images.unsplash.com/photo-1571781926291-c477ebfd024b?w=600&q=80",
      "https://images.unsplash.com/photo-1608248543803-ba4f8c70ae0b?w=600&q=80",
      "https://images.unsplash.com/photo-1611080626919-7cf5a9dbab5b?w=600&q=80"
    ],
    descripcion: "Tinte labial aterciopelado con color de larga duración y acabado velvet. Infundido con extractos botánicos coreanos tradicionales que hidratan mientras pigmentan.",
    modoDeUso: [
      "Aplicar directamente desde el aplicador",
      "Empezar por el centro del labio y difuminar hacia los bordes",
      "Esperar 30 segundos para fijar",
      "Retocar según necesidad"
    ],
    beneficios: [
      "Acabado velvet no drying",
      "Pigmento de larga duración",
      "Extractos botánicos que hidratan",
      "No transfer después de 1 minuto"
    ],
    masVendido: true,
    enOferta: false
  },
  {
    id: 20,
    slug: "heartleaf-quencher-body-lotion",
    nombre: "Heartleaf Quencher Body Lotion",
    marca: "anua",
    categoria: "cuerpo",
    subcategoria: null,
    tipoPiel: ["seca", "sensible", "normal"],
    precio: 95,
    precioAntes: null,
    imagenes: [
      "https://images.unsplash.com/photo-1556228578-0d85b1a4d571?w=600&q=80",
      "https://images.unsplash.com/photo-1570194065650-d99fb4a38691?w=600&q=80",
      "https://images.unsplash.com/photo-1611080626919-7cf5a9dbab5b?w=600&q=80"
    ],
    descripcion: "Loción corporal ligera con 45% de extracto de Heartleaf que calma, hidrata profundamente y se absorbe sin dejar residuo pegajoso. Para una piel suave y en calma.",
    modoDeUso: [
      "Aplicar sobre piel limpia, preferiblemente húmeda",
      "Masajear en movimientos ascendentes hasta absorber",
      "Usar a diario, mañana o noche",
      "Enfocar en zonas más secas como codos y rodillas"
    ],
    beneficios: [
      "Hidratación de larga duración",
      "Calma irritaciones corporales",
      "Textura ligera no pegajosa",
      "Ideal para piel sensible"
    ],
    masVendido: true,
    enOferta: false
  },
  {
    id: 21,
    slug: "water-bank-hand-cream",
    nombre: "Water Bank Hydrating Hand Cream",
    marca: "laneige",
    categoria: "manos",
    subcategoria: null,
    tipoPiel: ["seca", "normal", "mixta", "sensible"],
    precio: 48,
    precioAntes: 62,
    imagenes: [
      "https://images.unsplash.com/photo-1620916566398-39f1143ab7be?w=600&q=80",
      "https://images.unsplash.com/photo-1608248543803-ba4f8c70ae0b?w=600&q=80",
      "https://images.unsplash.com/photo-1571781926291-c477ebfd024b?w=600&q=80"
    ],
    descripcion: "Crema de manos ultrahidratante con tecnología Water Bank™ que nutre en profundidad sin sensación grasa. Absorción rápida y acabado sedoso.",
    modoDeUso: [
      "Aplicar una cantidad pequeña en el dorso de las manos",
      "Masajear hasta absorber completamente",
      "Reaplicar después de lavarse las manos",
      "Usar cuantas veces sea necesario durante el día"
    ],
    beneficios: [
      "Hidratación durante 24 horas",
      "Absorción rápida sin residuo",
      "Suaviza y nutre cutículas",
      "Aroma delicado a flores blancas"
    ],
    masVendido: false,
    enOferta: true
  },
  {
    id: 22,
    slug: "satin-skincare-headband",
    nombre: "Satin Skincare Headband — Lavender",
    marca: "klairs",
    categoria: "accesorios",
    subcategoria: null,
    tipoPiel: ["normal", "seca", "mixta", "grasa", "sensible"],
    precio: 32,
    precioAntes: null,
    imagenes: [
      "https://images.unsplash.com/photo-1611080626919-7cf5a9dbab5b?w=600&q=80",
      "https://images.unsplash.com/photo-1620916566398-39f1143ab7be?w=600&q=80",
      "https://images.unsplash.com/photo-1570194065650-d99fb4a38691?w=600&q=80"
    ],
    descripcion: "Diadema de satén suave con velcro ajustable para proteger tu cabello durante tu rutina de skincare. Suave con la piel, no deja marcas y lavable.",
    modoDeUso: [
      "Colocar sobre la frente antes de tu rutina facial",
      "Ajustar con el velcro para que quede firme pero cómoda",
      "Lavar a mano con agua fría y jabón neutro",
      "Secar al aire libre, no usar secadora"
    ],
    beneficios: [
      "Protege tu cabello del agua y productos",
      "Satén suave que no irrita la piel",
      "Velcro ajustable a cualquier tamaño",
      "Lavable y reutilizable"
    ],
    masVendido: false,
    enOferta: false
  },
  {
    id: 23,
    slug: "konjac-cleansing-sponge-duo",
    nombre: "Konjac Cleansing Sponge Duo",
    marca: "cosrx",
    categoria: "accesorios",
    subcategoria: null,
    tipoPiel: ["sensible", "seca", "normal", "mixta", "grasa"],
    precio: 38,
    precioAntes: 50,
    imagenes: [
      "https://images.unsplash.com/photo-1570194065650-d99fb4a38691?w=600&q=80",
      "https://images.unsplash.com/photo-1556228578-0d85b1a4d571?w=600&q=80",
      "https://images.unsplash.com/photo-1608248543803-ba4f8c70ae0b?w=600&q=80"
    ],
    descripcion: "Pack de 2 esponjas Konjac 100% naturales para limpieza facial suave y exfoliación delicada. Una neutra para piel sensible y una con carbón activado para equilibrar.",
    modoDeUso: [
      "Sumergir la esponja en agua tibia 1-2 min para que se expanda",
      "Añadir limpiador facial si deseas mayor limpieza",
      "Masajear el rostro con movimientos circulares suaves",
      "Enjuagar bien y dejar secar al aire libre colgada"
    ],
    beneficios: [
      "Limpieza suave de origen vegetal",
      "Exfoliación delicada apta para uso diario",
      "Dura hasta 6-8 semanas con buen cuidado",
      "100% biodegradable y cruelty-free"
    ],
    masVendido: false,
    enOferta: true
  }
];

/* ---------- Admin overrides (localStorage) ----------
 * El panel admin en admin.html persiste productos, marcas y diapositivas
 * en localStorage. Aquí se mezclan al catálogo base con semántica "upsert":
 *   - Si el id NO existe en base → se añade (producto/marca nuevo).
 *   - Si el id YA existe → se reemplaza (edición del catálogo base).
 * Así toda la tienda ve los cambios del admin al instante en cualquier
 * página, incluyendo ediciones a productos/marcas originales.
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
