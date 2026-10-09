/* ═══════════════════════════════════════════════════════════════
   PriceNice — carrito-precios.js
   Precios del MISMO producto en otras tiendas. El carrito los usa para
   sugerir "en tal sitio está más barato" y calcular cuánto ahorras.

   Formato:  idDelProducto: [ { tienda, precio, ciudad }, ... ]
   (el id es el mismo que usa el producto en pn_carrito).
   Si tienda.html ya trae su propio COMPARACIONES, también se usa.
   Añade aquí más productos cuando quieras; no hay que tocar carrito.js.
═══════════════════════════════════════════════════════════════ */
window.PN_COMPARACIONES = {
  2: [{tienda:"Linio",      precio:89900,  ciudad:"Virtual"}, {tienda:"Éxito",      precio:94900,  ciudad:"Bogotá"},   {tienda:"Falabella", precio:99900,  ciudad:"Medellín"}],
  5: [{tienda:"PriceSmart", precio:28900,  ciudad:"Barranquilla"}, {tienda:"Jumbo", precio:31900,  ciudad:"Bogotá"},   {tienda:"Carulla",   precio:33500,  ciudad:"Cali"}],
  7: [{tienda:"Alkosto",    precio:129900, ciudad:"Bogotá"},   {tienda:"Falabella", precio:149900, ciudad:"Medellín"}, {tienda:"Linio",     precio:134900, ciudad:"Virtual"}],
  9: [{tienda:"Éxito",      precio:189900, ciudad:"Bogotá"},   {tienda:"Alkosto",   precio:195000, ciudad:"Bogotá"},   {tienda:"Falabella", precio:209900, ciudad:"Medellín"}]
};
