/**
 * PriceNice — tiendas-cercanas-component.js
 * Solución 100% gratuita y sin tarjeta ni claves de API:
 * - Mapa: Leaflet con OpenStreetMap (CartoDB Positron / OSM tiles).
 * - Ubicación del usuario: Geolocation API del navegador.
 * - Búsqueda manual: Nominatim API (OpenStreetMap, restringido a Bogotá, Colombia).
 * - Tiendas cercanas: Overpass API (OpenStreetMap) en radio de ~1.5 km (shop=*).
 * - Caché local para respetar las políticas de uso de OSM / Overpass.
 * - Tiendas aliadas: Datos oficiales de PriceNice con productos, precios y carrito.
 */

import {
  TIENDAS_ALIADAS,
  GOOGLE_TIENDAS_FALLBACK,
  BOGOTA_BOUNDS,
  BOGOTA_CENTER
} from "./tiendas-data.js";

/* ══════════════════════════════════════════════════════════
   ESTADO INTERNO DEL COMPONENTE
   ══════════════════════════════════════════════════════════ */
let map = null;
let userMarker = null;
let userPosition = null; // { lat, lng }
let partnerMarkers = []; // Array de { store, marker, el }
let osmMarkers = [];     // Array de { store, marker, el }
let osmStoresList = [];
let activeStore = null;
let currentSearchQuery = "";
let isMapInitialized = false;

// Caché en memoria para consultas a Overpass API
const overpassCache = new Map();
const CACHE_TTL_MS = 15 * 60 * 1000; // 15 minutos de caché

/* ══════════════════════════════════════════════════════════
   1. INICIALIZACIÓN DEL MAPA CON LEAFLET
   ══════════════════════════════════════════════════════════ */
export function inicializarSeccionTiendas() {
  if (isMapInitialized) return;

  const mapDiv = document.getElementById("pnGoogleMap");
  if (!mapDiv) return;

  // Verificar que Leaflet esté disponible en window.L
  if (typeof L === "undefined") {
    // Si no está cargado el script de Leaflet, cargarlo dinámicamente
    cargarLeaflet().then(() => {
      crearMapaLeaflet(mapDiv);
      vincularEventosUI();
    });
  } else {
    crearMapaLeaflet(mapDiv);
    vincularEventosUI();
  }
}

/**
 * Carga dinámica de Leaflet si no está presente en el HTML
 */
function cargarLeaflet() {
  return new Promise((resolve) => {
    if (typeof L !== "undefined") {
      resolve();
      return;
    }

    if (!document.getElementById("leaflet-css")) {
      const link = document.createElement("link");
      link.id = "leaflet-css";
      link.rel = "stylesheet";
      link.href = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css";
      document.head.appendChild(link);
    }

    const script = document.createElement("script");
    script.src = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.js";
    script.onload = () => resolve();
    script.onerror = () => {
      console.error("No se pudo cargar Leaflet desde CDN.");
      resolve();
    };
    document.head.appendChild(script);
  });
}

/**
 * Configura el mapa de Leaflet centrado en Bogotá con tiles de OpenStreetMap
 */
function crearMapaLeaflet(container) {
  if (typeof L === "undefined") return;

  // Centro de Bogotá con zoom 12
  map = L.map(container, {
    center: [BOGOTA_CENTER.lat, BOGOTA_CENTER.lng],
    zoom: 12,
    zoomControl: false // Lo colocaremos abajo a la derecha
  });

  // Control de zoom en la esquina inferior derecha
  L.control.zoom({ position: "bottomright" }).addTo(map);

  // Tiles de OpenStreetMap en estilo CartoDB Positron (limpio, claro y moderno)
  L.tileLayer("https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png", {
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/" target="_blank">CARTO</a>',
    subdomains: "abcd",
    maxZoom: 19
  }).addTo(map);

  isMapInitialized = true;

  // Si el contenedor cambia de tamaño, actualizar Leaflet
  setTimeout(() => {
    if (map) map.invalidateSize();
  }, 300);
}

/* ══════════════════════════════════════════════════════════
   2. SOLICITUD DE UBICACIÓN (GEOLOCATION API)
   ══════════════════════════════════════════════════════════ */
export function solicitarUbicacionUsuario() {
  const btn = document.getElementById("pnBtnDarUbicacion");
  if (btn) {
    btn.disabled = true;
    btn.innerHTML = `<span class="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span> Obteniendo ubicación…`;
  }

  if (!navigator.geolocation) {
    mostrarFormularioManual("Tu navegador no soporta geolocalización directa.");
    return;
  }

  navigator.geolocation.getCurrentPosition(
    (pos) => {
      const lat = pos.coords.latitude;
      const lng = pos.coords.longitude;
      userPosition = { lat, lng };

      // Si el usuario está fuera de Bogotá, ubicamos en una zona céntrica (Chapinero)
      const distABogota = calcularDistanciaKm(lat, lng, BOGOTA_CENTER.lat, BOGOTA_CENTER.lng);
      if (distABogota > 80) {
        userPosition = { lat: 4.6558, lng: -74.0625 };
        mostrarNotificacionToast("Te ubicamos en Bogotá (Chapinero) para mostrar las tiendas cercanas.");
      }

      animarHaciaUbicacion(userPosition.lat, userPosition.lng);
    },
    (err) => {
      let msg = "No pudimos obtener tu ubicación automáticamente.";
      if (err.code === err.PERMISSION_DENIED) {
        msg = "Permiso de ubicación denegado. Puedes escribir tu dirección o barrio:";
      }
      mostrarFormularioManual(msg);
    },
    {
      enableHighAccuracy: true,
      timeout: 10000,
      maximumAge: 0
    }
  );
}

/**
 * Anima el mapa hacia la ubicación con flyTo (zoom suave) y despliega los pines
 */
function animarHaciaUbicacion(lat, lng) {
  // Ocultar overlay inicial
  const overlayCard = document.getElementById("pnMapOverlayCard");
  if (overlayCard) overlayCard.classList.add("hidden");

  // Mostrar botón flotante de recentrar
  const recenterBtn = document.getElementById("pnFloatingRecenter");
  if (recenterBtn) recenterBtn.style.display = "flex";

  if (!map) return;

  // Animación de vuelo suave de Leaflet de zoom 12 a zoom 15
  map.flyTo([lat, lng], 15, {
    duration: 1.5,
    easeLinearity: 0.25
  });

  // Cuando termine el movimiento, añadir marcador de usuario y desplegar tiendas
  map.once("moveend", () => {
    colocarMarcadorUsuario(lat, lng);
    cargarPinesTiendas(lat, lng);
  });
}

/**
 * Muestra el formulario de búsqueda manual si el usuario niega permisos
 */
function mostrarFormularioManual(mensaje) {
  const promptBox = document.getElementById("pnOverlayPrompt");
  const manualBox = document.getElementById("pnOverlayManual");
  const alertEl = document.getElementById("pnManualAlert");

  if (alertEl && mensaje) alertEl.textContent = mensaje;
  if (promptBox) promptBox.style.display = "none";
  if (manualBox) manualBox.classList.add("visible");

  const btn = document.getElementById("pnBtnDarUbicacion");
  if (btn) {
    btn.disabled = false;
    btn.innerHTML = `<i class="bi bi-crosshair me-2"></i> Dar mi ubicación`;
  }

  const input = document.getElementById("pnInputDireccion");
  if (input) input.focus();
}

/**
 * Geocodificación gratuita con Nominatim (OpenStreetMap) restringida a Bogotá
 */
export async function buscarDireccionNominatim() {
  const input = document.getElementById("pnInputDireccion");
  if (!input) return;
  const query = input.value.trim();
  if (!query) return;

  const btn = document.getElementById("pnBtnBuscarDireccion");
  if (btn) {
    btn.disabled = true;
    btn.innerHTML = `<span class="spinner-border spinner-border-sm me-2"></span> Buscando…`;
  }

  try {
    // Parámetros Nominatim: countrycodes=co, viewbox delimitado a Bogotá
    const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query + ", Bogotá, Colombia")}&countrycodes=co&viewbox=-74.25,4.85,-73.98,4.45&bounded=1&limit=5`;

    const res = await fetch(url, {
      headers: {
        "Accept": "application/json"
      }
    });

    if (res.ok) {
      const data = await res.json();
      if (data && data.length > 0) {
        const mejorResultado = data[0];
        const lat = parseFloat(mejorResultado.lat);
        const lng = parseFloat(mejorResultado.lon);
        userPosition = { lat, lng };
        animarHaciaUbicacion(lat, lng);
        return;
      }
    }

    // Fallback a coordenadas de barrios típicos si Nominatim no devuelve resultados exactos
    geocodificarBarrioLocal(query);
  } catch (err) {
    console.warn("Nominatim no respondió, usando resolvedor local de Bogotá:", err);
    geocodificarBarrioLocal(query);
  } finally {
    if (btn) {
      btn.disabled = false;
      btn.innerHTML = `<i class="bi bi-search"></i> Explorar tiendas en este sector`;
    }
  }
}

function geocodificarBarrioLocal(texto) {
  const q = texto.toLowerCase();
  let coords = { lat: 4.6558, lng: -74.0625 }; // Chapinero

  if (q.includes("suba")) coords = { lat: 4.7542, lng: -74.0898 };
  else if (q.includes("usaquen") || q.includes("usaquén")) coords = { lat: 4.7075, lng: -74.0305 };
  else if (q.includes("fontibon") || q.includes("fontibón")) coords = { lat: 4.6738, lng: -74.1352 };
  else if (q.includes("kennedy")) coords = { lat: 4.6186, lng: -74.1485 };
  else if (q.includes("centro") || q.includes("candelaria")) coords = { lat: 4.5981, lng: -74.0758 };
  else if (q.includes("salitre")) coords = { lat: 4.6540, lng: -74.1132 };
  else if (q.includes("colina")) coords = { lat: 4.7292, lng: -74.0638 };
  else if (q.includes("cedritos")) coords = { lat: 4.7210, lng: -74.0350 };
  else if (q.includes("galerias") || q.includes("galerías")) coords = { lat: 4.6432, lng: -74.0741 };

  userPosition = coords;
  animarHaciaUbicacion(coords.lat, coords.lng);
}

/* ══════════════════════════════════════════════════════════
   3. MARCADOR DEL USUARIO ("TU UBICACIÓN")
   ══════════════════════════════════════════════════════════ */
function colocarMarcadorUsuario(lat, lng) {
  if (userMarker && map) {
    map.removeLayer(userMarker);
  }

  // Icono personalizado con pulso de radar (anillo concéntrico animado)
  const userHtml = `
    <div class="pn-user-location-marker" title="Tu ubicación">
      <div class="pn-user-location-pulse"></div>
      <div class="pn-user-location-dot"></div>
    </div>
  `;

  const userIcon = L.divIcon({
    html: userHtml,
    className: "pn-leaflet-custom-marker",
    iconSize: [24, 24],
    iconAnchor: [12, 12]
  });

  userMarker = L.marker([lat, lng], { icon: userIcon, zIndexOffset: 1000 }).addTo(map);
}

/* ══════════════════════════════════════════════════════════
   4. PINES DE TIENDAS (ALIADAS Y OPENSTREETMAP)
   ══════════════════════════════════════════════════════════ */
function limpiarPines() {
  if (!map) return;
  partnerMarkers.forEach((m) => map.removeLayer(m.marker));
  partnerMarkers = [];
  osmMarkers.forEach((m) => map.removeLayer(m.marker));
  osmMarkers = [];
}

async function cargarPinesTiendas(userLat, userLng) {
  limpiarPines();

  // Calcular distancias y ordenar tiendas aliadas
  const aliadasConDistancia = TIENDAS_ALIADAS.map((t) => {
    const distMetros = calcularDistanciaMetros(userLat, userLng, t.lat, t.lng);
    return { ...t, distanciaMetros: distMetros };
  }).sort((a, b) => a.distanciaMetros - b.distanciaMetros);

  // 1. Mostrar tiendas aliadas una por una con animación
  aliadasConDistancia.forEach((store, idx) => {
    setTimeout(() => {
      crearPinTiendaAliada(store);
    }, idx * 100);
  });

  // 2. Consultar tiendas cercanas en OpenStreetMap con Overpass API (~1.5 km)
  buscarTiendasOverpass(userLat, userLng);
}

/**
 * Crea un pin de Tienda Aliada (Color Azul Marino / Índigo PriceNice #3B4FD8)
 */
function crearPinTiendaAliada(store) {
  if (!map || typeof L === "undefined") return;

  const pinHtml = `
    <div class="pn-marker-bubble partner" id="pin-${store.id}" title="${store.nombre}" data-id="${store.id}">
      <svg class="pn-marker-pin-svg" width="38" height="48" viewBox="0 0 38 48" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M19 0C8.50659 0 0 8.50659 0 19C0 31.5 19 48 19 48C19 48 38 31.5 38 19C38 8.50659 29.4934 0 19 0Z" fill="#1E2A80"/>
        <path d="M19 3C9.61116 3 2 10.6112 2 20C2 31.2 19 45.5 19 45.5C19 45.5 36 31.2 36 20C36 10.6112 28.3888 3 19 3Z" fill="#3B4FD8"/>
        <circle cx="19" cy="19" r="13" fill="#FFFFFF"/>
        <path d="M14 16V14C14 11.2386 16.2386 9 19 9C21.7614 9 24 11.2386 24 14V16H25.5C26.0523 16 26.5 16.4477 26.5 17V26C26.5 26.5523 26.0523 27 25.5 27H12.5C11.9477 27 11.5 26.5523 11.5 26V17C11.5 16.4477 11.9477 16 12.5 16H14ZM16 16H22V14C22 12.3431 20.6569 11 19 11C17.3431 11 16 12.3431 16 14V16Z" fill="#1E2A80"/>
      </svg>
    </div>
  `;

  const customIcon = L.divIcon({
    html: pinHtml,
    className: "pn-leaflet-pin-wrap",
    iconSize: [38, 48],
    iconAnchor: [19, 48]
  });

  const marker = L.marker([store.lat, store.lng], { icon: customIcon }).addTo(map);

  marker.on("click", (e) => {
    L.DomEvent.stopPropagation(e);
    abrirPanelTienda(store);
  });

  partnerMarkers.push({ store, marker });
}

/**
 * Consulta la Overpass API de OpenStreetMap en un radio de ~1.5 km (1500m)
 * Con caché local y tiempo de espera para respetar los límites de uso.
 */
async function buscarTiendasOverpass(userLat, userLng) {
  const cacheKey = `${userLat.toFixed(3)}_${userLng.toFixed(3)}`;
  const cached = overpassCache.get(cacheKey);

  if (cached && (Date.now() - cached.timestamp < CACHE_TTL_MS)) {
    renderizarPinesOSM(cached.data, userLat, userLng);
    return;
  }

  // Consulta Overpass QL: Nodos con etiqueta "shop" en radio de 1500 m
  const query = `
    [out:json][timeout:12];
    (
      node["shop"](around:1500,${userLat},${userLng});
    );
    out body 16;
  `;

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 9000); // 9 segundos máx

    const res = await fetch("https://overpass-api.de/api/interpreter", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: "data=" + encodeURIComponent(query),
      signal: controller.signal
    });

    clearTimeout(timeoutId);

    if (res.ok) {
      const json = await res.json();
      if (json && json.elements && json.elements.length > 0) {
        const tiendasParsed = parsearNodosOverpass(json.elements, userLat, userLng);
        // Guardar en caché
        overpassCache.set(cacheKey, { timestamp: Date.now(), data: tiendasParsed });
        renderizarPinesOSM(tiendasParsed, userLat, userLng);
        return;
      }
    }

    // Si Overpass viene vacío o falla, usamos fallback de tiendas de Bogotá
    usarFallbackOSM(userLat, userLng);
  } catch (e) {
    console.info("Overpass API ocupada o lenta, usando tiendas locales de Bogotá:", e);
    usarFallbackOSM(userLat, userLng);
  }
}

/**
 * Convierte los nodos devueltos por Overpass a nuestro modelo de tiendas
 */
function parsearNodosOverpass(elements, userLat, userLng) {
  const nombresAliadas = TIENDAS_ALIADAS.map((a) => a.cadena.toLowerCase());

  return elements
    .filter((el) => el.tags && (el.tags.name || el.tags.shop))
    .map((el) => {
      const tags = el.tags || {};
      const tipoShop = tags.shop || "store";
      const nombre = tags.name || traducirTipoTienda(tipoShop);

      // Dirección
      let direccion = "Sector cercano, Bogotá";
      if (tags["addr:street"]) {
        direccion = tags["addr:street"] + (tags["addr:housenumber"] ? " #" + tags["addr:housenumber"] : "");
      }

      return {
        id: "osm-" + el.id,
        nombre: nombre,
        tipo: "osm",
        lat: el.lat,
        lng: el.lon,
        direccion: direccion,
        barrio: tags["addr:suburb"] || tags["addr:neighbourhood"] || "Bogotá",
        ciudad: "Bogotá",
        categoria: traducirTipoTienda(tipoShop),
        horario: tags.opening_hours || "Lun - Sáb: 8:00 AM – 8:00 PM",
        telefono: tags.phone || tags["contact:phone"] || ""
      };
    })
    .filter((store) => {
      const n = store.nombre.toLowerCase();
      return !nombresAliadas.some((aliada) => n.includes(aliada));
    })
    .slice(0, 10);
}

function traducirTipoTienda(tag) {
  const mapTipos = {
    supermarket: "Supermercado",
    convenience: "Minimercado / Autoservicio",
    bakery: "Panadería y Pastelería",
    chemist: "Droguería",
    pharmacy: "Farmacia",
    clothes: "Tienda de Ropa y Moda",
    shoes: "Zapatería",
    department_store: "Almacén por Departamentos",
    mall: "Centro Comercial",
    greengrocer: "Frutas y Verduras",
    butcher: "Carnicería",
    variety_store: "Variedades y Hogar",
    electronics: "Tecnología y Electrónica"
  };
  return mapTipos[tag] || "Tienda y Comercio";
}

function usarFallbackOSM(userLat, userLng) {
  const fallback = GOOGLE_TIENDAS_FALLBACK.map((t) => ({
    id: "osm-" + t.id,
    nombre: t.nombre.replace(" (Google)", ""),
    tipo: "osm",
    lat: t.lat,
    lng: t.lng,
    direccion: t.direccion,
    barrio: t.barrio,
    ciudad: "Bogotá",
    categoria: t.categoria,
    horario: t.horarioTexto || "Lun - Dom: 8:00 AM – 8:00 PM"
  }));
  renderizarPinesOSM(fallback, userLat, userLng);
}

function renderizarPinesOSM(tiendas, userLat, userLng) {
  osmStoresList = tiendas.map((t) => ({
    ...t,
    distanciaMetros: calcularDistanciaMetros(userLat, userLng, t.lat, t.lng)
  }));

  osmStoresList.forEach((store, idx) => {
    setTimeout(() => {
      crearPinTiendaOSM(store);
    }, 200 + idx * 80);
  });
}

/**
 * Crea un pin de Tienda de OpenStreetMap (Verde Esmeralda #10B981)
 */
function crearPinTiendaOSM(store) {
  if (!map || typeof L === "undefined") return;

  const pinHtml = `
    <div class="pn-marker-bubble google" id="pin-${store.id}" title="${store.nombre}" data-id="${store.id}">
      <svg class="pn-marker-pin-svg" width="34" height="42" viewBox="0 0 38 48" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M19 0C8.50659 0 0 8.50659 0 19C0 31.5 19 48 19 48C19 48 38 31.5 38 19C38 8.50659 29.4934 0 19 0Z" fill="#065F46"/>
        <path d="M19 3C9.61116 3 2 10.6112 2 20C2 31.2 19 45.5 19 45.5C19 45.5 36 31.2 36 20C36 10.6112 28.3888 3 19 3Z" fill="#10B981"/>
        <circle cx="19" cy="19" r="12" fill="#FFFFFF"/>
        <path d="M13 14L14 19H24L25 14H13ZM12 20V25H14V21H18V25H20V21H24V25H26V20H12Z" fill="#047857"/>
      </svg>
    </div>
  `;

  const customIcon = L.divIcon({
    html: pinHtml,
    className: "pn-leaflet-pin-wrap",
    iconSize: [34, 42],
    iconAnchor: [17, 42]
  });

  const marker = L.marker([store.lat, store.lng], { icon: customIcon }).addTo(map);

  marker.on("click", (e) => {
    L.DomEvent.stopPropagation(e);
    abrirPanelTienda(store);
  });

  osmMarkers.push({ store, marker });
}

/* ══════════════════════════════════════════════════════════
   5. PANEL LATERAL / BOTTOM SHEET (RESPONSIVE)
   ══════════════════════════════════════════════════════════ */
export function abrirPanelTienda(store) {
  activeStore = store;
  const panel = document.getElementById("pnStorePanel");
  const backdrop = document.getElementById("pnStoreBackdrop");
  if (!panel) return;

  const distTexto = formatearDistancia(store.distanciaMetros);

  // ── 1. TIENDA ALIADA ──
  if (store.tipo === "aliada") {
    panel.innerHTML = `
      <div class="pn-sheet-handle"></div>
      <div class="pn-panel-top-bar">
        <div>
          <span class="pn-panel-type-badge aliada">
            <i class="bi bi-patch-check-fill"></i> Tienda aliada verificada
          </span>
          <h3 class="pn-panel-store-name">${store.nombre}</h3>
          <div class="pn-panel-store-meta">
            <span><i class="bi bi-geo-alt me-1"></i> ${store.direccion} (${store.barrio})</span>
            <span class="pn-panel-distance"><i class="bi bi-pin-map-fill me-1"></i> A ${distTexto} de tu ubicación</span>
          </div>
        </div>
        <button class="pn-panel-close-btn" onclick="window.pnCerrarPanelTienda()" aria-label="Cerrar panel">
          <i class="bi bi-x-lg"></i>
        </button>
      </div>

      <div class="pn-panel-body">
        <div style="display:flex;align-items:center;justify-content:space-between;padding:10px 14px;background:var(--brand-light);border-radius:var(--r);font-size:13px;color:var(--brand);">
          <span><i class="bi bi-clock me-1"></i> ${store.horario}</span>
          <span class="fw-bold">⭐ ${store.estrellas} (${store.resenasCount})</span>
        </div>

        <div class="pn-panel-section-title">
          <span>Catálogo y Ofertas Disponibles</span>
          <span class="badge bg-light text-dark border">${store.productos.length} productos</span>
        </div>

        <div class="pn-panel-products-list" id="pnPanelProductsList">
          ${store.productos
            .map((p) => {
              const matchesFilter =
                currentSearchQuery &&
                p.nombre.toLowerCase().includes(currentSearchQuery.toLowerCase());
              return `
              <div class="pn-panel-product-card ${matchesFilter ? "matched-product" : ""}">
                <div class="pn-panel-product-img">
                  <img src="${p.imagen}" alt="${p.nombre}" loading="lazy">
                </div>
                <div class="pn-panel-product-info">
                  <div class="pn-panel-product-title">${p.nombre}</div>
                  <div class="pn-panel-prices-row">
                    <span class="pn-panel-price-current">$${p.precio.toLocaleString("es-CO")}</span>
                    ${
                      p.precioOriginal
                        ? `<span class="pn-panel-price-old">$${p.precioOriginal.toLocaleString("es-CO")}</span>`
                        : ""
                    }
                    ${
                      p.descuento
                        ? `<span class="pn-panel-discount-tag">-${p.descuento}%</span>`
                        : ""
                    }
                  </div>
                  <div style="display:flex;align-items:center;justify-content:space-between;gap:8px;">
                    <span style="font-size:11.5px;color:var(--green);font-weight:600;"><i class="bi bi-check2-circle me-1"></i>${p.stock || "En tienda"}</span>
                    <button class="pn-panel-add-btn" onclick="window.pnAgregarCarritoDesdeMapa(${p.id}, '${store.cadena}')" aria-label="Agregar al carrito">
                      <i class="bi bi-bag-plus"></i> Agregar
                    </button>
                  </div>
                </div>
              </div>
            `;
            })
            .join("")}
        </div>
      </div>
    `;
  }
  // ── 2. TIENDA DE OPENSTREETMAP ──
  else {
    // Enlace de ruta directo gratuito a Google Maps o OpenStreetMap (sin API key)
    const rutaUrl = `https://www.google.com/maps/dir/?api=1&destination=${store.lat},${store.lng}`;

    panel.innerHTML = `
      <div class="pn-sheet-handle"></div>
      <div class="pn-panel-top-bar">
        <div>
          <span class="pn-panel-type-badge google">
            <i class="bi bi-geo-alt-fill"></i> Comercio OpenStreetMap
          </span>
          <h3 class="pn-panel-store-name">${store.nombre}</h3>
          <div class="pn-panel-store-meta">
            <span><i class="bi bi-geo-alt me-1"></i> ${store.direccion} (${store.barrio})</span>
            <span class="pn-panel-distance"><i class="bi bi-pin-map-fill me-1"></i> A ${distTexto} de tu ubicación</span>
          </div>
        </div>
        <button class="pn-panel-close-btn" onclick="window.pnCerrarPanelTienda()" aria-label="Cerrar panel">
          <i class="bi bi-x-lg"></i>
        </button>
      </div>

      <div class="pn-panel-body">
        <div class="pn-google-detail-box">
          <div style="font-size:14px;color:var(--text);font-weight:600;display:flex;align-items:center;gap:7px;">
            <i class="bi bi-tag-fill text-success"></i>
            <span>${store.categoria || "Comercio de barrio"}</span>
          </div>

          <div style="font-size:13.5px;color:var(--text-2);display:flex;align-items:center;gap:6px;">
            <i class="bi bi-clock text-muted"></i>
            <span>${store.horario || "Horario comercial en Bogotá"}</span>
          </div>
        </div>

        <a href="${rutaUrl}" target="_blank" rel="noopener noreferrer" class="pn-btn-directions">
          <i class="bi bi-signpost-2-fill"></i> Cómo llegar (Ver ruta)
        </a>

        <div class="pn-google-notice">
          <strong>ℹ️ Información de catálogo:</strong><br>
          Esta tienda proviene de OpenStreetMap. Los precios comparados, ofertas y compras online pertenecen exclusivamente a nuestras <strong>Tiendas Aliadas</strong>.
        </div>
      </div>
    `;
  }

  panel.classList.add("open");
  if (backdrop) backdrop.classList.add("visible");
}

export function cerrarPanelTienda() {
  const panel = document.getElementById("pnStorePanel");
  const backdrop = document.getElementById("pnStoreBackdrop");
  if (panel) panel.classList.remove("open");
  if (backdrop) backdrop.classList.remove("visible");
  activeStore = null;
}

// Globales para eventos onclick
if (typeof window !== "undefined") {
  window.pnCerrarPanelTienda = cerrarPanelTienda;
  window.pnAgregarCarritoDesdeMapa = (productoId, nombreTienda) => {
    if (typeof window.agregarCarrito === "function") {
      window.agregarCarrito(productoId);
    } else {
      const carrito = JSON.parse(localStorage.getItem("pn_carrito") || "[]");
      const storeItem = TIENDAS_ALIADAS.flatMap((t) => t.productos).find((p) => p.id === productoId);
      if (storeItem) {
        const existe = carrito.find((i) => i.id === productoId);
        if (existe) existe.qty++;
        else
          carrito.push({
            id: storeItem.id,
            nombre: storeItem.nombre,
            precio: storeItem.precio,
            tienda: nombreTienda,
            imagen: storeItem.imagen,
            qty: 1
          });
        localStorage.setItem("pn_carrito", JSON.stringify(carrito));
      }
    }
    mostrarNotificacionToast("¡Producto agregado al carrito con éxito!");
  };
}

/* ══════════════════════════════════════════════════════════
   6. FILTRO DE PRODUCTOS Y RESALTADO DE PINES
   ══════════════════════════════════════════════════════════ */
export function filtrarPorProducto(query) {
  currentSearchQuery = query.toLowerCase().trim();
  const statusEl = document.getElementById("pnFilterStatus");
  const clearBtn = document.getElementById("pnFilterClear");

  if (clearBtn) clearBtn.classList.toggle("visible", Boolean(currentSearchQuery));

  if (!currentSearchQuery) {
    if (statusEl) statusEl.classList.remove("active");
    restaurarPinesNormales();
    return;
  }

  let tiendasCoincidentes = [];
  partnerMarkers.forEach(({ store }) => {
    const tieneProducto = store.productos.some((p) =>
      p.nombre.toLowerCase().includes(currentSearchQuery)
    );
    const pinEl = document.getElementById(`pin-${store.id}`);

    if (tieneProducto) {
      tiendasCoincidentes.push(store);
      if (pinEl) {
        pinEl.classList.add("highlighted");
        pinEl.style.opacity = "1";
        pinEl.style.transform = "scale(1.2)";
      }
    } else {
      if (pinEl) {
        pinEl.classList.remove("highlighted");
        pinEl.style.opacity = "0.35";
        pinEl.style.transform = "scale(0.85)";
      }
    }
  });

  osmMarkers.forEach(({ store }) => {
    const pinEl = document.getElementById(`pin-${store.id}`);
    if (pinEl) {
      pinEl.style.opacity = "0.3";
      pinEl.style.transform = "scale(0.85)";
    }
  });

  if (statusEl) {
    statusEl.classList.add("active");
    statusEl.innerHTML = `
      <i class="bi bi-info-circle-fill text-primary"></i> 
      ${tiendasCoincidentes.length} tienda${tiendasCoincidentes.length === 1 ? "" : "s"} aliada${
      tiendasCoincidentes.length === 1 ? "" : "s"
    } ${tiendasCoincidentes.length === 1 ? "tiene" : "tienen"} productos para "<strong>${query}</strong>"
    `;
  }
}

function restaurarPinesNormales() {
  partnerMarkers.forEach(({ store }) => {
    const el = document.getElementById(`pin-${store.id}`);
    if (el) {
      el.classList.remove("highlighted");
      el.style.opacity = "1";
      el.style.transform = "scale(1)";
    }
  });
  osmMarkers.forEach(({ store }) => {
    const el = document.getElementById(`pin-${store.id}`);
    if (el) {
      el.style.opacity = "1";
      el.style.transform = "scale(1)";
    }
  });
}

export function limpiarFiltroProducto() {
  const input = document.getElementById("pnFiltroProductoInput");
  if (input) input.value = "";
  document.querySelectorAll(".pn-pill-btn").forEach((p) => p.classList.remove("active"));
  const todosPill = document.querySelector('.pn-pill-btn[data-cat=""]');
  if (todosPill) todosPill.classList.add("active");
  filtrarPorProducto("");
}

/* ══════════════════════════════════════════════════════════
   7. UTILIDADES
   ══════════════════════════════════════════════════════════ */
function calcularDistanciaMetros(lat1, lon1, lat2, lon2) {
  const R = 6371e3;
  const φ1 = (lat1 * Math.PI) / 180;
  const φ2 = (lat2 * Math.PI) / 180;
  const Δφ = ((lat2 - lat1) * Math.PI) / 180;
  const Δλ = ((lon2 - lon1) * Math.PI) / 180;

  const a =
    Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c);
}

function calcularDistanciaKm(lat1, lon1, lat2, lon2) {
  return calcularDistanciaMetros(lat1, lon1, lat2, lon2) / 1000;
}

function formatearDistancia(metros) {
  if (!metros && metros !== 0) return "Cerca";
  if (metros < 1000) return `${metros} m`;
  return `${(metros / 1000).toFixed(1)} km`;
}

function mostrarNotificacionToast(msg) {
  if (typeof window.mostrarToast === "function") {
    window.mostrarToast(msg);
  } else {
    const toast = document.getElementById("pnToast");
    const msgEl = document.getElementById("pnToastMsg");
    if (toast && msgEl) {
      msgEl.textContent = msg;
      toast.classList.add("show");
      setTimeout(() => toast.classList.remove("show"), 2800);
    }
  }
}

/* ══════════════════════════════════════════════════════════
   8. EVENTOS DEL DOM
   ══════════════════════════════════════════════════════════ */
function vincularEventosUI() {
  const btnUbicacion = document.getElementById("pnBtnDarUbicacion");
  if (btnUbicacion) btnUbicacion.addEventListener("click", solicitarUbicacionUsuario);

  const btnManualLink = document.getElementById("pnLinkManualSearch");
  if (btnManualLink) btnManualLink.addEventListener("click", () => mostrarFormularioManual());

  const inputManual = document.getElementById("pnInputDireccion");
  if (inputManual) {
    inputManual.addEventListener("keydown", (e) => {
      if (e.key === "Enter") {
        e.preventDefault();
        buscarDireccionNominatim();
      }
    });
  }

  const btnBuscarManual = document.getElementById("pnBtnBuscarDireccion");
  if (btnBuscarManual) btnBuscarManual.addEventListener("click", buscarDireccionNominatim);

  const btnRecenter = document.getElementById("pnFloatingRecenter");
  if (btnRecenter) {
    btnRecenter.addEventListener("click", () => {
      if (userPosition && map) {
        map.flyTo([userPosition.lat, userPosition.lng], 15, { duration: 1 });
      }
    });
  }

  const filtroInput = document.getElementById("pnFiltroProductoInput");
  if (filtroInput) {
    filtroInput.addEventListener("input", (e) => {
      filtrarPorProducto(e.target.value);
    });
  }

  const clearBtn = document.getElementById("pnFilterClear");
  if (clearBtn) clearBtn.addEventListener("click", limpiarFiltroProducto);

  document.querySelectorAll(".pn-pill-btn").forEach((pill) => {
    pill.addEventListener("click", () => {
      document.querySelectorAll(".pn-pill-btn").forEach((p) => p.classList.remove("active"));
      pill.classList.add("active");
      const cat = pill.getAttribute("data-cat") || "";
      if (filtroInput) {
        filtroInput.value = cat;
        filtrarPorProducto(cat);
      }
    });
  });
}
