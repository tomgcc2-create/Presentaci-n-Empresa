/**
 * PriceNice — env-config.js
 * Carga de variables de entorno (.env) de forma segura y modular para el cliente.
 * NUNCA se escribe la clave de API en el código fuente.
 */

let cachedApiKey = null;

export async function getGoogleMapsApiKey() {
  if (cachedApiKey) return cachedApiKey;

  // 1. Intentar leer desde window.__ENV__ o window.GOOGLE_MAPS_API_KEY si fue inyectado
  if (typeof window !== 'undefined') {
    if (window.__ENV__ && window.__ENV__.GOOGLE_MAPS_API_KEY) {
      cachedApiKey = window.__ENV__.GOOGLE_MAPS_API_KEY.trim();
      return cachedApiKey;
    }
    if (window.GOOGLE_MAPS_API_KEY) {
      cachedApiKey = window.GOOGLE_MAPS_API_KEY.trim();
      return cachedApiKey;
    }

    // 2. Intentar leer desde localStorage/sessionStorage
    const storedKey = localStorage.getItem('GOOGLE_MAPS_API_KEY') || sessionStorage.getItem('GOOGLE_MAPS_API_KEY');
    if (storedKey && storedKey.trim()) {
      cachedApiKey = storedKey.trim();
      return cachedApiKey;
    }
  }

  // 3. Intentar hacer fetch al archivo .env local
  try {
    const res = await fetch('./.env');
    if (res.ok) {
      const text = await res.text();
      const lines = text.split('\n');
      for (const line of lines) {
        const trimmed = line.trim();
        if (trimmed.startsWith('#') || !trimmed.includes('=')) continue;
        const [key, ...rest] = trimmed.split('=');
        const val = rest.join('=').trim().replace(/^["']|["']$/g, '');
        if (key.trim() === 'GOOGLE_MAPS_API_KEY' && val) {
          cachedApiKey = val;
          return cachedApiKey;
        }
      }
    }
  } catch (err) {
    console.info('PriceNice: No se pudo leer .env por fetch directo (normal en protocolo file:// o servidores que bloquean archivos dotfile).', err);
  }

  return '';
}

export function saveSessionApiKey(key) {
  if (key && key.trim()) {
    localStorage.setItem('GOOGLE_MAPS_API_KEY', key.trim());
    cachedApiKey = key.trim();
  }
}
