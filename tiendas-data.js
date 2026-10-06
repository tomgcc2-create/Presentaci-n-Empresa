/**
 * PriceNice — tiendas-data.js
 * Base de datos oficial de tiendas aliadas de PriceNice en Bogotá, Colombia
 * con coordenadas GPS verificadas, información de contacto y catálogo de productos con precios y descuentos.
 */

export const TIENDAS_ALIADAS = [
  {
    id: "aliada-cruz-verde-chapinero",
    nombre: "Cruz Verde — Chapinero",
    cadena: "Cruz Verde",
    tipo: "aliada",
    logo: "https://images.unsplash.com/photo-1556228841-a3c527ebefe5?w=120&q=80",
    lat: 4.6534,
    lng: -74.0628,
    direccion: "Cra 13 #67-24",
    barrio: "Chapinero",
    localidad: "Chapinero",
    ciudad: "Bogotá",
    telefono: "(601) 486 5000",
    horario: "Lun - Dom: 7:00 AM – 10:00 PM",
    estrellas: 4.7,
    resenasCount: 184,
    verificada: true,
    etiquetas: ["Droguería", "Belleza", "Cuidado Personal", "Farmacia"],
    productos: [
      {
        id: 1,
        nombre: "Crema Hidratante Facial Ácido Hialurónico",
        precio: 38900,
        precioOriginal: 48900,
        descuento: 20,
        categoria: "belleza",
        imagen: "https://images.unsplash.com/photo-1556228841-a3c527ebefe5?w=400&q=80",
        estrellas: 4.8,
        stock: "Disponible en tienda"
      },
      {
        id: 101,
        nombre: "Protector Solar FPS 50+ Toque Seco 50ml",
        precio: 52900,
        precioOriginal: 69900,
        descuento: 24,
        categoria: "belleza",
        imagen: "https://images.unsplash.com/photo-1598440947619-2c35fc9aa908?w=400&q=80",
        estrellas: 4.9,
        stock: "Disponible en tienda"
      },
      {
        id: 6,
        nombre: "Sérum Vitamina C 30ml Luminosidad",
        precio: 89900,
        precioOriginal: 109900,
        descuento: 18,
        categoria: "belleza",
        imagen: "https://images.unsplash.com/photo-1608248597279-f99d160bfcbc?w=400&q=80",
        estrellas: 4.9,
        stock: "Mejor precio PriceNice"
      }
    ]
  },
  {
    id: "aliada-alkosto-fontibon",
    nombre: "Alkosto — Fontibón Centenario",
    cadena: "Alkosto",
    tipo: "aliada",
    logo: "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=120&q=80",
    lat: 4.6738,
    lng: -74.1352,
    direccion: "Av. Centenario #18-85",
    barrio: "Fontibón",
    localidad: "Fontibón",
    ciudad: "Bogotá",
    telefono: "(601) 437 9999",
    horario: "Lun - Sáb: 8:00 AM – 9:00 PM | Dom: 8:00 AM – 8:00 PM",
    estrellas: 4.6,
    resenasCount: 512,
    verificada: true,
    etiquetas: ["Tecnología", "Electrohogar", "Hogar", "Hipermercado"],
    productos: [
      {
        id: 2,
        nombre: "Audífonos Bluetooth Pro Cancelación Ruido",
        precio: 129900,
        precioOriginal: 169900,
        descuento: 24,
        categoria: "tecnologia",
        imagen: "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=400&q=80",
        estrellas: 4.7,
        stock: "Disponible en tienda"
      },
      {
        id: 4,
        nombre: "Juego de Sábanas Microfibra Queen 200 Hilos",
        precio: 119900,
        precioOriginal: 149900,
        descuento: 20,
        categoria: "hogar",
        imagen: "https://images.unsplash.com/photo-1631049307264-da0ec9d70304?w=400&q=80",
        estrellas: 4.6,
        stock: "Disponible en tienda"
      },
      {
        id: 102,
        nombre: "Freidora de Aire Digital 4.5 Litros",
        precio: 199900,
        precioOriginal: 259900,
        descuento: 23,
        categoria: "hogar",
        imagen: "https://images.unsplash.com/photo-1585515320310-259814833e62?w=400&q=80",
        estrellas: 4.8,
        stock: "Oferta destacada"
      }
    ]
  },
  {
    id: "aliada-exito-plaza-imperial",
    nombre: "Éxito — Plaza Imperial Suba",
    cadena: "Éxito",
    tipo: "aliada",
    logo: "https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=120&q=80",
    lat: 4.7542,
    lng: -74.0898,
    direccion: "C.C. Plaza Imperial L-112, Av. Suba con Cra 104",
    barrio: "Suba",
    localidad: "Suba",
    ciudad: "Bogotá",
    telefono: "(601) 343 0000",
    horario: "Lun - Dom: 7:00 AM – 9:00 PM",
    estrellas: 4.5,
    resenasCount: 420,
    verificada: true,
    etiquetas: ["Moda", "Calzado", "Mercado", "Deportes"],
    productos: [
      {
        id: 3,
        nombre: "Zapatillas Running CloudX Hombre/Mujer",
        precio: 189900,
        precioOriginal: 249900,
        descuento: 24,
        categoria: "moda",
        imagen: "https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=400&q=80",
        estrellas: 4.5,
        stock: "Mejor precio garantizado"
      },
      {
        id: 14,
        nombre: "Alimento Premium Perro Adulto 15kg",
        precio: 89900,
        precioOriginal: 112900,
        descuento: 20,
        categoria: "mascotas",
        imagen: "https://images.unsplash.com/photo-1589924691995-400dc9ecc119?w=400&q=80",
        estrellas: 4.8,
        stock: "Disponible en tienda"
      },
      {
        id: 103,
        nombre: "Café de Origen Colombia 500g Grano Entero",
        precio: 21900,
        precioOriginal: 26900,
        descuento: 18,
        categoria: "mercado",
        imagen: "https://images.unsplash.com/photo-1447933601403-0c6688de566e?w=400&q=80",
        estrellas: 4.7,
        stock: "Disponible en tienda"
      }
    ]
  },
  {
    id: "aliada-exito-usaquen",
    nombre: "Éxito Wow — Unicentro Usaquén",
    cadena: "Éxito",
    tipo: "aliada",
    logo: "https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=120&q=80",
    lat: 4.7075,
    lng: -74.0305,
    direccion: "Cra 7 #127-26",
    barrio: "Usaquén",
    localidad: "Usaquén",
    ciudad: "Bogotá",
    telefono: "(601) 343 0000",
    horario: "Lun - Dom: 7:00 AM – 10:00 PM",
    estrellas: 4.7,
    resenasCount: 380,
    verificada: true,
    etiquetas: ["Moda", "Mercado", "Mascotas", "Gourmet"],
    productos: [
      {
        id: 3,
        nombre: "Zapatillas Running CloudX",
        precio: 189900,
        precioOriginal: 249900,
        descuento: 24,
        categoria: "moda",
        imagen: "https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=400&q=80",
        estrellas: 4.5,
        stock: "Disponible en tienda"
      },
      {
        id: 14,
        nombre: "Alimento Premium Perro Adulto 15kg",
        precio: 89900,
        precioOriginal: 112900,
        descuento: 20,
        categoria: "mascotas",
        imagen: "https://images.unsplash.com/photo-1589924691995-400dc9ecc119?w=400&q=80",
        estrellas: 4.8,
        stock: "Disponible en tienda"
      }
    ]
  },
  {
    id: "aliada-d1-kennedy",
    nombre: "D1 — Kennedy Central",
    cadena: "D1",
    tipo: "aliada",
    logo: "https://images.unsplash.com/photo-1585421514284-efb74c2b69ba?w=120&q=80",
    lat: 4.6186,
    lng: -74.1485,
    direccion: "Av. 1 de Mayo #51-15",
    barrio: "Kennedy",
    localidad: "Kennedy",
    ciudad: "Bogotá",
    telefono: "(601) 390 5500",
    horario: "Lun - Sáb: 8:00 AM – 9:00 PM | Dom: 8:00 AM – 8:00 PM",
    estrellas: 4.3,
    resenasCount: 210,
    verificada: true,
    etiquetas: ["Supermercado", "Ahorro", "Aseo", "Alimentos"],
    productos: [
      {
        id: 8,
        nombre: "Detergente Líquido 3L Ropa Concentrado",
        precio: 24900,
        precioOriginal: 29900,
        descuento: 17,
        categoria: "mercado",
        imagen: "https://images.unsplash.com/photo-1585421514284-efb74c2b69ba?w=400&q=80",
        estrellas: 4.3,
        stock: "Precio más bajo en la zona"
      },
      {
        id: 104,
        nombre: "Suavizante Textil Aroma Floral 2000ml",
        precio: 12500,
        precioOriginal: 14900,
        descuento: 16,
        categoria: "mercado",
        imagen: "https://images.unsplash.com/photo-1610557892470-55d9e80c0bce?w=400&q=80",
        estrellas: 4.5,
        stock: "Disponible en tienda"
      }
    ]
  },
  {
    id: "aliada-d1-chapinero",
    nombre: "D1 — Chapinero Alto",
    cadena: "D1",
    tipo: "aliada",
    logo: "https://images.unsplash.com/photo-1585421514284-efb74c2b69ba?w=120&q=80",
    lat: 4.6462,
    lng: -74.0617,
    direccion: "Cra 7 #58-32",
    barrio: "Chapinero",
    localidad: "Chapinero",
    ciudad: "Bogotá",
    telefono: "(601) 390 5500",
    horario: "Lun - Sáb: 8:00 AM – 9:00 PM | Dom: 8:00 AM – 8:00 PM",
    estrellas: 4.4,
    resenasCount: 168,
    verificada: true,
    etiquetas: ["Supermercado", "Ahorro", "Aseo", "Básicos"],
    productos: [
      {
        id: 8,
        nombre: "Detergente Líquido 3L Concentrado",
        precio: 24900,
        precioOriginal: 29900,
        descuento: 17,
        categoria: "mercado",
        imagen: "https://images.unsplash.com/photo-1585421514284-efb74c2b69ba?w=400&q=80",
        estrellas: 4.3,
        stock: "Disponible en tienda"
      },
      {
        id: 105,
        nombre: "Pack Papel Higiénico Triple Hoja x12",
        precio: 18900,
        precioOriginal: 22900,
        descuento: 17,
        categoria: "mercado",
        imagen: "https://images.unsplash.com/photo-1584556812952-905ffd0c611a?w=400&q=80",
        estrellas: 4.6,
        stock: "Disponible en tienda"
      }
    ]
  },
  {
    id: "aliada-falabella-titan",
    nombre: "Falabella — Titán Plaza",
    cadena: "Falabella",
    tipo: "aliada",
    logo: "https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=120&q=80",
    lat: 4.6953,
    lng: -74.0863,
    direccion: "C.C. Titán Plaza, Av. Boyacá con Calle 80",
    barrio: "Pontevedra / Bonanza",
    localidad: "Engativá",
    ciudad: "Bogotá",
    telefono: "(601) 587 8000",
    horario: "Lun - Dom: 10:00 AM – 9:00 PM",
    estrellas: 4.6,
    resenasCount: 630,
    verificada: true,
    etiquetas: ["Tecnología", "Moda", "Belleza", "Tienda por Departamentos"],
    productos: [
      {
        id: 7,
        nombre: "Smartwatch Fitness Pro Pantalla AMOLED",
        precio: 249900,
        precioOriginal: 329900,
        descuento: 24,
        categoria: "tecnologia",
        imagen: "https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=400&q=80",
        estrellas: 4.5,
        stock: "Disponible en tienda"
      },
      {
        id: 301,
        nombre: "Base de Maquillaje Mate Larga Duración",
        precio: 65900,
        precioOriginal: 84900,
        descuento: 22,
        categoria: "belleza",
        imagen: "https://images.unsplash.com/photo-1522335789203-aabd1fc54bc9?w=400&q=80",
        estrellas: 4.4,
        stock: "Disponible en tienda"
      }
    ]
  },
  {
    id: "aliada-falabella-colina",
    nombre: "Falabella — Parque La Colina",
    cadena: "Falabella",
    tipo: "aliada",
    logo: "https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=120&q=80",
    lat: 4.7292,
    lng: -74.0638,
    direccion: "C.C. Parque La Colina, Cra 58D #146-51",
    barrio: "Colina Campestre",
    localidad: "Suba",
    ciudad: "Bogotá",
    telefono: "(601) 587 8000",
    horario: "Lun - Dom: 10:00 AM – 9:00 PM",
    estrellas: 4.7,
    resenasCount: 490,
    verificada: true,
    etiquetas: ["Tecnología", "Moda", "Belleza", "Calzado"],
    productos: [
      {
        id: 7,
        nombre: "Smartwatch Fitness Pro GPS y Ritmo Cardíaco",
        precio: 249900,
        precioOriginal: 329900,
        descuento: 24,
        categoria: "tecnologia",
        imagen: "https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=400&q=80",
        estrellas: 4.5,
        stock: "Disponible en tienda"
      },
      {
        id: 6,
        nombre: "Sérum Vitamina C 30ml Antioxidante",
        precio: 89900,
        precioOriginal: 109900,
        descuento: 18,
        categoria: "belleza",
        imagen: "https://images.unsplash.com/photo-1608248597279-f99d160bfcbc?w=400&q=80",
        estrellas: 4.9,
        stock: "Disponible en tienda"
      }
    ]
  },
  {
    id: "aliada-carulla-zona-rosa",
    nombre: "Carulla FreshMarket — Calle 85",
    cadena: "Carulla",
    tipo: "aliada",
    logo: "https://images.unsplash.com/photo-1556228578-8c89e6adf883?w=120&q=80",
    lat: 4.6685,
    lng: -74.0558,
    direccion: "Calle 85 #15-28",
    barrio: "Zona Rosa / Antiguo Country",
    localidad: "Chapinero",
    ciudad: "Bogotá",
    telefono: "(601) 745 5000",
    horario: "Lun - Dom: 24 Horas",
    estrellas: 4.8,
    resenasCount: 310,
    verificada: true,
    etiquetas: ["Supermercado", "Gourmet", "Higiene", "Vinos"],
    productos: [
      {
        id: 13,
        nombre: "Shampoo Anticaspa Control Cuero Cabelludo 750ml",
        precio: 21900,
        precioOriginal: 27900,
        descuento: 21,
        categoria: "higiene",
        imagen: "https://images.unsplash.com/photo-1556228578-8c89e6adf883?w=400&q=80",
        estrellas: 4.6,
        stock: "Disponible en tienda"
      },
      {
        id: 5,
        nombre: "Aceite de Oliva Extra Virgen Prensado en Frío",
        precio: 33500,
        precioOriginal: 39900,
        descuento: 16,
        categoria: "mercado",
        imagen: "https://images.unsplash.com/photo-1474979266404-7eaacbcd87c5?w=400&q=80",
        estrellas: 4.8,
        stock: "Disponible en tienda"
      }
    ]
  },
  {
    id: "aliada-jumbo-santa-ana",
    nombre: "Jumbo — Santa Ana Usaquén",
    cadena: "Jumbo",
    tipo: "aliada",
    logo: "https://images.unsplash.com/photo-1447933601403-0c6688de566e?w=120&q=80",
    lat: 4.6934,
    lng: -74.0336,
    direccion: "C.C. Santa Ana, Cra 9 #110-20",
    barrio: "Santa Ana",
    localidad: "Usaquén",
    ciudad: "Bogotá",
    telefono: "(601) 600 0000",
    horario: "Lun - Dom: 8:00 AM – 9:00 PM",
    estrellas: 4.6,
    resenasCount: 290,
    verificada: true,
    etiquetas: ["Supermercado", "Café", "Carnes", "Panadería"],
    productos: [
      {
        id: 106,
        nombre: "Café Molido Premium 500g 100% Arábica",
        precio: 18900,
        precioOriginal: 24900,
        descuento: 24,
        categoria: "mercado",
        imagen: "https://images.unsplash.com/photo-1447933601403-0c6688de566e?w=400&q=80",
        estrellas: 4.7,
        stock: "Mejor oferta Bogotá"
      },
      {
        id: 8,
        nombre: "Detergente Líquido 3L Ropa Suave",
        precio: 25900,
        precioOriginal: 31000,
        descuento: 16,
        categoria: "mercado",
        imagen: "https://images.unsplash.com/photo-1585421514284-efb74c2b69ba?w=400&q=80",
        estrellas: 4.4,
        stock: "Disponible en tienda"
      }
    ]
  },
  {
    id: "aliada-pricesmart-salitre",
    nombre: "PriceSmart — Salitre El Dorado",
    cadena: "PriceSmart",
    tipo: "aliada",
    logo: "https://images.unsplash.com/photo-1474979266404-7eaacbcd87c5?w=120&q=80",
    lat: 4.6540,
    lng: -74.1132,
    direccion: "Av. Boyacá #21-55",
    barrio: "Ciudad Salitre",
    localidad: "Fontibón",
    ciudad: "Bogotá",
    telefono: "(601) 489 8000",
    horario: "Lun - Sáb: 9:00 AM – 8:30 PM | Dom: 10:00 AM – 7:00 PM",
    estrellas: 4.8,
    resenasCount: 780,
    verificada: true,
    etiquetas: ["Club de Compras", "Mayorista", "Alimentos", "Importados"],
    productos: [
      {
        id: 5,
        nombre: "Aceite de Oliva Extra Virgen 1L Importado España",
        precio: 28900,
        precioOriginal: 36900,
        descuento: 22,
        categoria: "mercado",
        imagen: "https://images.unsplash.com/photo-1474979266404-7eaacbcd87c5?w=400&q=80",
        estrellas: 4.9,
        stock: "Mejor precio PriceNice"
      },
      {
        id: 4,
        nombre: "Juego de Sábanas Microfibra Queen 4 Piezas",
        precio: 115900,
        precioOriginal: 145900,
        descuento: 21,
        categoria: "hogar",
        imagen: "https://images.unsplash.com/photo-1631049307264-da0ec9d70304?w=400&q=80",
        estrellas: 4.7,
        stock: "Disponible en tienda"
      }
    ]
  },
  {
    id: "aliada-homecenter-calle26",
    nombre: "Homecenter — Calle 26 El Dorado",
    cadena: "Homecenter",
    tipo: "aliada",
    logo: "https://images.unsplash.com/photo-1565814329452-e1efa11c5b89?w=120&q=80",
    lat: 4.6648,
    lng: -74.1084,
    direccion: "Av. Calle 26 #69-85",
    barrio: "Salitre Occidental",
    localidad: "Fontibón",
    ciudad: "Bogotá",
    telefono: "(601) 307 7111",
    horario: "Lun - Sáb: 7:00 AM – 9:00 PM | Dom: 8:00 AM – 8:00 PM",
    estrellas: 4.5,
    resenasCount: 440,
    verificada: true,
    etiquetas: ["Hogar", "Construcción", "Iluminación", "Ferretería"],
    productos: [
      {
        id: 12,
        nombre: "Foco LED 10W Pack x4 Ahorrador Luz Cálida",
        precio: 22900,
        precioOriginal: 29900,
        descuento: 23,
        categoria: "hogar",
        imagen: "https://images.unsplash.com/photo-1565814329452-e1efa11c5b89?w=400&q=80",
        estrellas: 4.5,
        stock: "Disponible en tienda"
      }
    ]
  },
  {
    id: "aliada-alkosto-cra30",
    nombre: "Alkosto — Cra 30 Centro",
    cadena: "Alkosto",
    tipo: "aliada",
    logo: "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=120&q=80",
    lat: 4.6074,
    lng: -74.0991,
    direccion: "Cra 30 con Calle 10",
    barrio: "Los Mártires / Ricaurte",
    localidad: "Los Mártires",
    ciudad: "Bogotá",
    telefono: "(601) 437 9999",
    horario: "Lun - Sáb: 8:00 AM – 8:30 PM | Dom: 8:00 AM – 7:30 PM",
    estrellas: 4.6,
    resenasCount: 395,
    verificada: true,
    etiquetas: ["Tecnología", "Hogar", "Supermercado"],
    productos: [
      {
        id: 2,
        nombre: "Audífonos Bluetooth Pro",
        precio: 129900,
        precioOriginal: 169900,
        descuento: 24,
        categoria: "tecnologia",
        imagen: "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=400&q=80",
        estrellas: 4.7,
        stock: "Disponible en tienda"
      },
      {
        id: 4,
        nombre: "Sábanas Microfibra Queen",
        precio: 119900,
        precioOriginal: 149900,
        descuento: 20,
        categoria: "hogar",
        imagen: "https://images.unsplash.com/photo-1631049307264-da0ec9d70304?w=400&q=80",
        estrellas: 4.6,
        stock: "Disponible en tienda"
      }
    ]
  }
];

/**
 * Tiendas de Google Maps fallback (utilizadas si Places API falla, no tiene cuota o está en entorno offline)
 * Distribuidas estratégicamente en Bogotá para asegurar que la experiencia interactiva sea completa.
 */
export const GOOGLE_TIENDAS_FALLBACK = [
  {
    id: "g-ara-bogota-1",
    nombre: "Tiendas Ara — Barrio Lourdes",
    tipo: "google",
    lat: 4.6515,
    lng: -74.0652,
    direccion: "Calle 63 #11-45, Chapinero",
    barrio: "Lourdes",
    ciudad: "Bogotá",
    calificacion: 4.2,
    totalResenas: 94,
    abiertoAhora: true,
    horarioTexto: "Abierto hoy hasta las 9:00 PM",
    categoria: "Supermercado de descuento",
    placeId: "ChIJW2Q7XhCYP44RL_mock1"
  },
  {
    id: "g-olimpica-bogota-2",
    nombre: "Supertiendas Olímpica — Galerías",
    tipo: "google",
    lat: 4.6432,
    lng: -74.0741,
    direccion: "Calle 53 #21-18, Galerías",
    barrio: "Galerías",
    ciudad: "Bogotá",
    calificacion: 4.3,
    totalResenas: 312,
    abiertoAhora: true,
    horarioTexto: "Abierto hoy hasta las 9:30 PM",
    categoria: "Supermercado y Droguería",
    placeId: "ChIJW2Q7XhCYP44RL_mock2"
  },
  {
    id: "g-miniso-bogota-3",
    nombre: "Miniso — C.C. Andino",
    tipo: "google",
    lat: 4.6669,
    lng: -74.0531,
    direccion: "Cra 11 #82-71, C.C. Andino L-214",
    barrio: "El Retiro",
    ciudad: "Bogotá",
    calificacion: 4.6,
    totalResenas: 450,
    abiertoAhora: true,
    horarioTexto: "Abierto hoy hasta las 8:00 PM",
    categoria: "Tienda de variedades y hogar",
    placeId: "ChIJW2Q7XhCYP44RL_mock3"
  },
  {
    id: "g-drogueria-cafam-4",
    nombre: "Droguerías Cafam — Calle 72",
    tipo: "google",
    lat: 4.6568,
    lng: -74.0601,
    direccion: "Calle 72 #10-34, Chapinero",
    barrio: "Rosales / Quinta Camacho",
    ciudad: "Bogotá",
    calificacion: 4.1,
    totalResenas: 128,
    abiertoAhora: true,
    horarioTexto: "Abierto las 24 horas",
    categoria: "Farmacia y Cuidado Personal",
    placeId: "ChIJW2Q7XhCYP44RL_mock4"
  },
  {
    id: "g-justo-bueno-local-5",
    nombre: "Supermercado Colsubsidio — Salitre Plaza",
    tipo: "google",
    lat: 4.6521,
    lng: -74.1105,
    direccion: "Cra 68B #24-39, Salitre Plaza",
    barrio: "Ciudad Salitre",
    ciudad: "Bogotá",
    calificacion: 4.4,
    totalResenas: 275,
    abiertoAhora: true,
    horarioTexto: "Abierto hoy hasta las 9:00 PM",
    categoria: "Supermercado familiar",
    placeId: "ChIJW2Q7XhCYP44RL_mock5"
  },
  {
    id: "g-surtifruver-bogota-6",
    nombre: "Surtifruver de la Sabana — Pepe Sierra",
    tipo: "google",
    lat: 4.6985,
    lng: -74.0492,
    direccion: "Calle 116 #18B-22",
    barrio: "Santa Bárbara",
    ciudad: "Bogotá",
    calificacion: 4.5,
    totalResenas: 360,
    abiertoAhora: true,
    horarioTexto: "Abierto hoy hasta las 8:30 PM",
    categoria: "Frutas, verduras y mercado fresco",
    placeId: "ChIJW2Q7XhCYP44RL_mock6"
  }
];

/**
 * Límites geográficos de Bogotá para Google Maps y Autocomplete
 */
export const BOGOTA_BOUNDS = {
  north: 4.8368,
  south: 4.4750,
  east: -73.9850,
  west: -74.2250
};

export const BOGOTA_CENTER = {
  lat: 4.6486,
  lng: -74.0850
};
