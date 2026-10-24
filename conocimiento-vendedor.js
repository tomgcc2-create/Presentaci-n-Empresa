/* CONOCIMIENTO DEL ASISTENTE DEL VENDEDOR — se edita aquí.
   preguntas : formas en que un vendedor podría preguntar (mientras más, mejor)
   respuesta : lo que responde el asistente. **texto** = negrita, \n = salto de línea */

window.CONOCIMIENTO = {
  nombreBot: "Asistente de tu tienda",
  noEntiendo: "Mmm, no estoy seguro de haber entendido 🤔. Prueba con otra forma de preguntarlo o elige una de estas opciones:",
  sugerencias: [
    "¿Cómo escribo una buena descripción?",
    "¿Qué fotos debo subir?",
    "¿Cómo consigo más reseñas?"
  ],

  temas: [
    {
      preguntas: ["hola", "buenas", "buenos dias", "buenas tardes", "buenas noches", "que tal", "hey", "saludos"],
      respuesta: "¡Hola! 😊 Soy tu asistente de vendedor. Puedo ayudarte con **descripciones**, **fotos**, **etiquetas**, **reseñas** y **tu perfil**. ¿Por dónde empezamos?"
    },
    {
      preguntas: ["gracias", "muchas gracias", "te agradezco", "genial", "perfecto", "ok gracias", "listo gracias"],
      respuesta: "¡Con gusto! Si necesitas otra recomendación, aquí estoy. 👌"
    },
    {
      preguntas: ["adios", "chao", "hasta luego", "nos vemos", "bye", "hasta pronto"],
      respuesta: "¡Hasta pronto! Mucho éxito con tus ventas. 👋"
    },
    {
      preguntas: ["como escribo una buena descripcion", "descripcion del producto", "como describo mi producto", "texto para vender", "que escribo en la descripcion", "descripcion atractiva"],
      respuesta: "Una buena descripción tiene **3 a 4 frases** y responde a lo que el cliente quiere saber:\n\n• **Qué es y para qué sirve**, en la primera frase.\n• **Medidas, material o ingredientes**, para que compare con confianza.\n• **Estado y garantía**, si aplica.\n• **Entrega y pago**, por ejemplo: \"Entrega rápida en Bogotá\".\n\nEvita las mayúsculas sostenidas y los emojis en exceso. Ejemplo: *\"Licuadora de 1,5 L con 3 velocidades y vaso de vidrio. Ideal para batidos y salsas. Entrega en Bogotá en 24 horas.\"*"
    },
    {
      preguntas: ["que fotos debo subir", "fotos del producto", "cuantas fotos", "como tomo fotos", "fotos para publicar", "foto del producto"],
      respuesta: "Sube **al menos 3 fotos** para que el cliente confíe:\n\n1. **Producto sobre fondo claro o blanco**, bien iluminado.\n2. **Vista lateral o detalle**, para ver la calidad.\n3. **Tamaño o uso real**, con algo de referencia (una mano, una taza).\n\nUsa luz natural, evita sombras fuertes y no pongas textos ni marcas de agua encima."
    },
    {
      preguntas: ["que etiquetas pongo", "etiquetas del producto", "como pongo etiquetas", "palabras clave", "para que me encuentren", "tags del producto"],
      respuesta: "Usa **4 a 6 etiquetas** que la gente realmente busque:\n\n• El **nombre del producto** (por ejemplo, *licuadora*).\n• La **categoría** (por ejemplo, *cocina*).\n• La **marca**, si la tienes.\n• Un **uso** (por ejemplo, *batidos*).\n• Tu **ciudad o barrio**, como *Bogotá*.\n\nNo repitas la misma palabra ni pongas etiquetas que no describen el producto."
    },
    {
      preguntas: ["como mejoro mis publicaciones", "mejorar mis productos", "mejorar publicacion", "como vendo mas", "por que no se venden mis productos"],
      respuesta: "Para mejorar tus publicaciones revisa estos cuatro puntos:\n\n• **Precio competitivo**: compara con productos parecidos del catálogo.\n• **Fotos claras**: al menos 3, con buena luz.\n• **Descripción completa**: medidas, material, entrega y garantía.\n• **Stock al día**: un producto agotado que aparece disponible genera desconfianza.\n\nEmpieza por las publicaciones que más visitas reciben y mejora una cada día."
    },
    {
      preguntas: ["que hago si tengo stock bajo", "se me esta acabando el stock", "poco stock", "actualizar stock", "producto agotado"],
      respuesta: "Cuando el stock esté bajo:\n\n1. **Actualiza la cantidad** en *Mis productos* para que el cliente vea la disponibilidad real.\n2. Si ya no tienes unidades, **pausa la publicación** en lugar de dejarla activa.\n3. Planea la reposición antes de agotarlo, sobre todo en temporadas de más ventas."
    },
    {
      preguntas: ["que producto debo destacar", "cual producto destacar", "producto estrella", "que producto promociono", "producto para destacar"],
      respuesta: "Destaca el producto que combine **buen margen** y **mucha visita**. Revisa en *Resumen* cuáles reciben más atención y cuáles convierten en compra. Si un producto ya tiene buenas reseñas y buen precio, es el mejor candidato para promocionar."
    },
    {
      preguntas: ["como respondo una resena negativa", "reseña negativa", "cliente molesto", "mala reseña", "como respondo una critica", "comentario negativo"],
      respuesta: "Responde una reseña negativa con calma y en menos de 24 horas:\n\n• **Agradece** la opinión.\n• **Reconoce** lo que salió mal, sin justificarte.\n• **Ofrece una solución** concreta, por ejemplo un cambio o un contacto directo por WhatsApp.\n\nNo discutas en público. Una buena respuesta a una queja también genera confianza en quienes están leyendo."
    },
    {
      preguntas: ["como consigo mas resenas", "mas reseñas", "pedir reseñas", "que me opinen", "conseguir opiniones", "mas calificaciones"],
      respuesta: "Pide la reseña **después de la entrega**, cuando el cliente ya tiene el producto. Un mensaje corto por WhatsApp funciona bien:\n\n*\"Hola, gracias por tu compra. ¿Nos cuentas cómo te fue con tu pedido?\"*\n\nSi el cliente queda contento, la reseña llega sola; si tuvo un problema, respóndelo primero para resolverlo."
    },
    {
      preguntas: ["que le falta a mi perfil", "como completo mi perfil", "perfil de vendedor", "mejorar mi perfil", "mi perfil esta incompleto"],
      respuesta: "Un perfil completo genera más confianza. Revisa que tengas:\n\n• **Foto o logo** de tu tienda.\n• **Nombre de la tienda** claro.\n• **Descripción** corta de lo que vendes.\n• **WhatsApp** de contacto.\n• **Horario y barrio**, para que sepan dónde y cuándo atiendes.\n\nLo encuentras en *Configuración → Mi perfil*."
    },
    {
      preguntas: ["como configuro mi whatsapp", "poner mi whatsapp", "donde pongo mi whatsapp", "numero de contacto", "whatsapp para clientes"],
      respuesta: "Tu WhatsApp se configura en **Configuración → Mi perfil**, en el campo de WhatsApp. Ahí es donde los clientes te escriben desde tus publicaciones."
    },
    {
      preguntas: ["como pauso mi tienda", "pausar tienda", "cerrar tienda temporalmente", "tienda en pausa", "desactivar mi tienda"],
      respuesta: "Para pausar tu tienda ve a **Configuración → Mi tienda** y activa la opción de pausa. Tus productos no se borran; solo dejan de mostrarse mientras la tienda está en pausa."
    },
    {
      preguntas: ["como publico un producto", "publicar producto", "subir un producto", "nuevo producto", "agregar producto"],
      respuesta: "Para publicar, toca **Publicar producto** en el panel. Completa el nombre, precio, stock, descripción y al menos 3 fotos. Cuando lo guardes, aparecerá en el catálogo."
    }
  ]
};
