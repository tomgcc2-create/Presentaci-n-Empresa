/* CONOCIMIENTO DEL CHATBOT — este es el archivo para "entrenarlo"
   preguntas : formas en que un cliente podría preguntar (mientras más, mejor)
   respuesta : lo que responde el bot. **texto** = negrita, \n = salto de línea
   accion    : (opcional) botón. pagina = archivo a abrir, url = cualquier enlace
*/

const CONOCIMIENTO = {
  nombreBot: "Asistente PriceNice",
  bienvenida: "¡Hola! 👋 Soy el asistente de **PriceNice**. Puedo ayudarte a comparar precios, encontrar tiendas cercanas o contactar con nosotros. ¿En qué te ayudo?",
  noEntiendo: "Mmm, no estoy seguro de haber entendido 🤔. Prueba con otra forma de preguntarlo o elige una de estas opciones:",
  sugerencias: [
    "¿Qué es PriceNice?",
    "¿Cómo comparo precios?",
    "¿Cómo los contacto?"
  ],

  temas: [
    {
      preguntas: ["hola", "buenas", "buenos dias", "buenas tardes", "buenas noches", "que tal", "saludos", "hey", "buen dia"],
      respuesta: "¡Hola! 😊 ¿Qué te gustaría saber? Puedo ayudarte con **comparación de precios**, **tiendas cercanas** o **datos de contacto**."
    },
    {
      preguntas: ["gracias", "muchas gracias", "te agradezco", "genial", "excelente", "perfecto", "ok gracias", "listo gracias"],
      respuesta: "¡Con mucho gusto! Si tienes otra pregunta, aquí estoy. 👌"
    },
    {
      preguntas: ["adios", "chao", "hasta luego", "nos vemos", "bye", "hasta pronto", "me voy"],
      respuesta: "¡Hasta pronto! Gracias por visitar PriceNice. 👋"
    },
    {
      preguntas: ["que es pricenice", "que hacen", "a que se dedican", "para que sirve", "que es esto", "que ofrecen", "que venden", "cuéntame sobre pricenice"],
      respuesta: "**PriceNice** es tu brújula de los buenos precios. 🧭\n\nComparamos precios de tiendas como Éxito, Jumbo, D1, Alkosto y más para que siempre pagues lo justo.\n\n📍 También te mostramos tiendas cercanas a tu ubicación.",
      accion: { texto: "Ver tienda", pagina: "tienda.html" }
    },
    {
      preguntas: ["que servicios ofrecen", "servicios", "que incluye", "funciones", "que puedo hacer aqui"],
      respuesta: "Ofrecemos:\n\n🔍 **Comparación de precios**: mismo producto en varias tiendas.\n📍 **Tiendas cercanas**: mapa con tiendas en tu zona.\n⭐ **Reseñas reales**: opiniones de compradores.\n🛒 **Tienda virtual**: simula tu compra antes de ir.",
      accion: { texto: "Explorar tienda", pagina: "tienda.html" }
    },
    {
      preguntas: ["como comparo precios", "comparar precios", "como funciona", "como busco", "buscar producto", "encontrar precio", "precio mas bajo", "mejor precio", "mas barato"],
      respuesta: "Es muy sencillo:\n\n1️⃣ Busca el producto en la barra superior.\n2️⃣ Elige la categoría que te interesa.\n3️⃣ Compara precios entre tiendas lado a lado.\n✅ El precio más bajo aparece con la etiqueta **\"Mejor precio\"** en verde.",
      accion: { texto: "Ir a la tienda", pagina: "tienda.html" }
    },
    {
      preguntas: ["precio", "cuanto cuesta", "cuanto vale", "precios", "cotizacion", "cotizar", "tarifas", "vale", "costos"],
      respuesta: "Los precios varían según el producto y la tienda. Usa nuestro comparador para ver el precio más bajo en tiempo real.\n\nPor ejemplo, hoy tenemos productos desde **$18.900** en mercado y desde **$24.900** en higiene. 💰",
      accion: { texto: "Ver comparador", pagina: "precios.html" }
    },
    {
      preguntas: ["tiendas cercanas", "tienda cerca", "donde comprar", "cerca de mi", "tiendas en mi ciudad", "mapa de tiendas", "ubicacion tiendas"],
      respuesta: "Con nuestra función de **tiendas cercanas** puedes ver en un mapa qué tiendas físicas hay cerca de ti en Bogotá, Medellín, Cali, Barranquilla y más ciudades de Colombia. 🗺️",
      accion: { texto: "Ver tiendas cercanas", pagina: "tiendas-cercanas.html" }
    },
    {
      preguntas: ["contacto", "como los contacto", "telefono", "correo", "email", "whatsapp", "hablar con alguien", "asesor", "soporte", "ayuda", "comunicarme"],
      respuesta: "Puedes escribirnos o llamarnos:\n\n📧 **hola@pricenice.co**\n📞 **+57 300 123 4567**\n\nRespondemos de lunes a viernes de 8:00 a.m. a 6:00 p.m.",
      accion: { texto: "Enviar correo", url: "mailto:hola@pricenice.co" }
    },
    {
      preguntas: ["horario", "a que hora abren", "cuando atienden", "dias de atencion", "horario de atencion", "cuando responden"],
      respuesta: "Atendemos de **lunes a viernes, de 8:00 a.m. a 6:00 p.m.** 🕗\n\nFuera de ese horario puedes dejarnos un mensaje y te respondemos al siguiente día hábil."
    },
    {
      preguntas: ["donde estan", "direccion", "ubicacion", "como llego", "en que ciudad", "ciudad", "pais"],
      respuesta: "Somos una plataforma **100% digital** basada en **Bogotá, Colombia**. 🇨🇴 Comparamos precios en tiendas de todo el país: Bogotá, Medellín, Cali, Barranquilla, Bucaramanga, Manizales, Pereira y más.",
      accion: { texto: "Ver tiendas cercanas", pagina: "tiendas-cercanas.html" }
    },
    {
      preguntas: ["soy vendedor", "quiero vender", "como vendo", "publicar producto", "agregar producto", "soy tienda", "tengo una tienda", "registrar tienda"],
      respuesta: "¡Bienvenido vendedor! 🏪 En tu **Panel de Vendedor** puedes:\n\n➕ Publicar productos con fotos y precio.\n📊 Gestionar tu inventario.\n⭐ Ver las reseñas de tus clientes.",
      accion: { texto: "Panel de vendedor", pagina: "vendedor.html" }
    },
    {
      preguntas: ["cuenta", "registrarse", "crear cuenta", "como me registro", "iniciar sesion", "login", "ingresar", "entrar"],
      respuesta: "Crear tu cuenta es gratis y te permite:\n\n❤️ Guardar favoritos.\n🛒 Gestionar tu carrito.\n⭐ Escribir reseñas de productos.",
      accion: { texto: "Registrarse", pagina: "login.html" }
    },
    {
      preguntas: ["favoritos", "guardar producto", "lista de deseos", "wishlist", "mis favoritos"],
      respuesta: "Puedes guardar cualquier producto en **Favoritos** tocando el corazón ❤️ en la tarjeta del producto. Los favoritos se guardan en tu cuenta y puedes verlos en cualquier momento.",
      accion: { texto: "Ver favoritos", pagina: "favoritos.html" }
    },
    {
      preguntas: ["carrito", "mi carrito", "agregar al carrito", "comprar", "como compro"],
      respuesta: "Agrega productos al carrito tocando **\"Agregar al carrito\"** en cualquier tarjeta. Puedes ajustar las cantidades y el carrito calcula el total automáticamente. 🛒\n\nRecuerda: PriceNice simula la compra; la transacción final la haces en la tienda.",
      accion: { texto: "Ir a la tienda", pagina: "tienda.html" }
    }
  ]
};
