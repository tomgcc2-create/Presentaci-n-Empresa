/* ═══════════════════════════════════════════════════════════════
   PriceNice — carrito-precios.js
   Catálogo + precios del MISMO producto en varias tiendas de Bogotá.
   Lo usan la tienda (tienda.html) y el carrito para sugerir
   "en tal tienda está más barato" y calcular cuánto ahorras.

   Cada oferta:  t = tienda · p = precio · b = barrio ("Online" si es virtual)
                 a = precio anterior (opcional, para mostrar el descuento)
   ⚠ Los precios de las otras tiendas son de ejemplo: cámbialos por los reales.
═══════════════════════════════════════════════════════════════ */
(function () {
  const U = id => `https://images.unsplash.com/${id}?w=600&q=80`;
  const o = (t, p, b, a) => ({ t, p, b, a });

  /* Barrios / zonas de Bogotá con su punto central (para "tiendas cerca de mí") */
  window.PN_BARRIOS = {
    'Chapinero': [4.6486, -74.0628], 'Usaquén': [4.7110, -74.0300], 'Suba': [4.7410, -74.0830],
    'Kennedy': [4.6280, -74.1500], 'Fontibón': [4.6720, -74.1430], 'Teusaquillo': [4.6350, -74.0900],
    'Engativá': [4.7000, -74.1100], 'La Candelaria': [4.5980, -74.0760], 'Bosa': [4.6170, -74.1850],
    'Puente Aranda': [4.6200, -74.1100]
  };

  window.PN_PRODUCTOS = [
    {id:1,  nombre:"Crema Hidratante Facial",     cat:"belleza",    estrellas:4.5, resenas:128, imagen:U('photo-1556228841-a3c527ebefe5'), descripcion:"Crema hidratante con ácido hialurónico para todo tipo de piel.", rv:["Valentina R.","Me dejó la piel suave desde la primera semana."],
      o:[o("Cruz Verde",38900,"Chapinero",44900), o("Carulla",41500,"Usaquén"), o("Falabella",45900,"Online")]},
    {id:2,  nombre:"Sérum Vitamina C 30ml",       cat:"belleza",    estrellas:4.9, resenas:576, imagen:U('photo-1608248597279-f99d160bfcbc'), descripcion:"Sérum antioxidante con vitamina C al 15% para luminosidad.", rv:["Ana P.","Notables resultados desde la primera semana de uso."],
      o:[o("Linio",89900,"Online",99900), o("Éxito",94900,"Suba"), o("Falabella",99900,"Chapinero")]},
    {id:3,  nombre:"Base de Maquillaje Mate",     cat:"belleza",    estrellas:4.3, resenas:89,  imagen:U('photo-1522335789203-aabd1fc54bc9'), descripcion:"Base líquida de cobertura media con acabado mate, larga duración.", rv:["Camila G.","Cubre bien y dura todo el día, el tono es fiel."],
      o:[o("Falabella",65900,"Chapinero",72900), o("Éxito",69900,"Kennedy"), o("Linio",71900,"Online")]},
    {id:4,  nombre:"Detergente Líquido 3L",       cat:"higiene",    estrellas:4.2, resenas:67,  imagen:U('photo-1585421514284-efb74c2b69ba'), descripcion:"Detergente concentrado para ropa, aroma lavanda.", rv:["Marta L.","Rinde mucho y huele rico. En D1 es el más barato."],
      o:[o("D1",24900,"Kennedy"), o("Ara",25400,"Bosa"), o("Éxito",26500,"Suba"), o("Jumbo",27900,"Usaquén",31000)]},
    {id:5,  nombre:"Aceite de Oliva Extra Virgen",cat:"mercado",    estrellas:4.8, resenas:412, imagen:U('photo-1474979266404-7eaacbcd87c5'), descripcion:"Aceite de oliva extra virgen, prensado en frío, D.O.P. España.", rv:["Jorge T.","Sabor suave, muy buena relación calidad-precio."],
      o:[o("PriceSmart",28900,"Suba",33000), o("Jumbo",31900,"Usaquén"), o("Carulla",33500,"Chapinero")]},
    {id:6,  nombre:"Café Molido Premium 500g",    cat:"mercado",    estrellas:4.7, resenas:234, imagen:U('photo-1447933601403-0c6688de566e'), descripcion:"Café 100% arábica tostado y molido, intensidad media, Colombia.", rv:["Daniel M.","Aroma increíble, el mejor café que he comprado en súper."],
      o:[o("Jumbo",18900,"Usaquén"), o("D1",19500,"Engativá"), o("Éxito",20900,"Fontibón")]},
    {id:7,  nombre:"Audífonos Bluetooth Pro",     cat:"tecnologia", estrellas:4.7, resenas:342, imagen:U('photo-1505740420928-5e560c06d30e'), descripcion:"Audífonos inalámbricos con ANC activa y 30h de batería.", rv:["Sebastián C.","La cancelación de ruido es muy buena y la batería dura."],
      o:[o("Alkosto",129900,"Fontibón",159900), o("Linio",134900,"Online"), o("Falabella",149900,"Teusaquillo")]},
    {id:8,  nombre:"Smartwatch Fitness Pro",      cat:"tecnologia", estrellas:4.4, resenas:156, imagen:U('photo-1523275335684-37898b6baf30'), descripcion:"Reloj inteligente con GPS, monitor cardíaco y pantalla AMOLED.", rv:["Laura V.","El GPS es preciso y la pantalla se ve genial."],
      o:[o("Falabella",249900,"Chapinero"), o("Linio",255900,"Online"), o("Alkosto",259900,"Fontibón")]},
    {id:9,  nombre:"Zapatillas Running CloudX",   cat:"moda",       estrellas:4.3, resenas:89,  imagen:U('photo-1542291026-7eec264c27ff'), descripcion:"Zapatillas de running con amortiguación CloudX y suela tracción.", esRopa:true, colores:["#FFFFFF","#1F2A44","#EF4444"], tallas:["38","39","40","41","42","43"], rv:["Carlos R.","Muy buenas, talla fiel. El precio en Éxito es el más bajo."],
      o:[o("Éxito",189900,"Suba",229900), o("Alkosto",195000,"Fontibón"), o("Falabella",209900,"Chapinero")]},
    {id:10, nombre:"Sudadera Oversize Fleece",    cat:"moda",       estrellas:4.1, resenas:63,  imagen:U('photo-1556821840-3a63f15732ce'), descripcion:"Sudadera oversize de polar suave, tela 280g.", esRopa:true, colores:["#1A1D2E","#5A6F9A","#22C55E"], tallas:["XS","S","M","L","XL","XXL"], rv:["Paula S.","Súper abrigada y cómoda, queda holgada como se ve."],
      o:[o("Linio",79900,"Online"), o("Éxito",84900,"Kennedy"), o("Falabella",89900,"Teusaquillo")]},
    {id:11, nombre:"Sábanas Microfibra Queen",    cat:"hogar",      estrellas:4.6, resenas:201, imagen:U('photo-1631049307264-da0ec9d70304'), descripcion:"Juego de sábanas de microfibra suave 4 piezas, 200 hilos.", rv:["Andrea F.","Suaves y no se arrugan. Después de lavarlas siguen igual."],
      o:[o("Alkosto",119900,"Fontibón"), o("Homecenter",124900,"Puente Aranda"), o("Falabella",132900,"Chapinero")]},
    {id:12, nombre:"Foco LED 10W Pack x4",        cat:"hogar",      estrellas:4.5, resenas:88,  imagen:U('photo-1565814329452-e1efa11c5b89'), descripcion:"Pack de 4 focos LED ahorradores, luz cálida 3000K, 1000 lúmenes.", rv:["Hernán B.","Buena luz cálida y la factura bajó."],
      o:[o("Homecenter",22900,"Puente Aranda"), o("Alkosto",24500,"Fontibón"), o("Éxito",25900,"Engativá")]},
    {id:13, nombre:"Shampoo Anticaspa 750ml",     cat:"higiene",    estrellas:4.0, resenas:41,  imagen:U('photo-1556228578-8c89e6adf883'), descripcion:"Shampoo con zinc y ketoconazol para control eficaz de caspa.", rv:["Felipe A.","Controla la caspa, aunque el olor es fuerte."],
      o:[o("Carulla",21900,"Chapinero"), o("Éxito",22900,"Suba"), o("D1",23500,"Kennedy")]},
    {id:14, nombre:"Alimento Premium Perro 15kg", cat:"mascotas",   estrellas:4.8, resenas:319, imagen:U('photo-1589924691995-400dc9ecc119'), descripcion:"Alimento premium para perros adultos, libre de cereales.", rv:["Natalia O.","Mi perro lo come feliz y tiene el pelo brillante."],
      o:[o("Éxito",89900,"Usaquén"), o("PriceSmart",92500,"Suba"), o("Jumbo",95900,"Engativá")]}
  ];

  /* Formato que lee el carrito: { id: [ {tienda, precio, ciudad} ] } */
  window.PN_COMPARACIONES = {};
  window.PN_PRODUCTOS.forEach(p => {
    window.PN_COMPARACIONES[p.id] = p.o.map(x => ({ tienda: x.t, precio: x.p, ciudad: x.b === 'Online' ? 'Online (Bogotá)' : x.b }));
  });
})();
