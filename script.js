/* ═══════════════════════════════════════════════════════
   PriceNice — script.js
   Módulo compartido: helpers globales, scroll-top,
   navbar scroll effect y utilidades de formato.
   La lógica de carrito/favoritos vive en cada página
   para no duplicar estado entre contextos distintos.
═══════════════════════════════════════════════════════ */

/* ── Formato precio colombiano ── */
export function fmtPrecio(n) {
  return '$' + Number(n).toLocaleString('es-CO');
}

/* ── Renderizar estrellas con Bootstrap Icons ── */
export function renderStars(val) {
  return [...Array(5)].map((_, i) => {
    if (i < Math.floor(val))          return '<i class="bi bi-star-fill"  style="color:var(--yellow)"></i>';
    if (i - val < 1 && val % 1 !== 0) return '<i class="bi bi-star-half"  style="color:var(--yellow)"></i>';
    return                                    '<i class="bi bi-star"       style="color:var(--yellow)"></i>';
  }).join('');
}

/* ── Formatear fecha ── */
export function formatFecha(str) {
  const d = new Date(str);
  return d.toLocaleDateString('es-CO', { year: 'numeric', month: 'long', day: 'numeric' });
}

/* ── Toast global ── */
let _toastTimer;
export function mostrarToast(msg) {
  const t = document.getElementById('pnToast');
  if (!t) return;
  const m = document.getElementById('pnToastMsg');
  if (m) m.textContent = msg;
  t.classList.add('show');
  clearTimeout(_toastTimer);
  _toastTimer = setTimeout(() => t.classList.remove('show'), 2800);
}

/* ── IntersectionObserver fade-up ── */
export function observarFadeUp() {
  const obs = new IntersectionObserver(entries => {
    entries.forEach(e => {
      if (e.isIntersecting) {
        e.target.classList.add('visible');
        obs.unobserve(e.target);
      }
    });
  }, { threshold: 0.07 });
  document.querySelectorAll('.fade-up').forEach(el => obs.observe(el));
}

/* ── Contador animado ── */
export function animarContadores() {
  const obs = new IntersectionObserver(entries => {
    entries.forEach(e => {
      if (!e.isIntersecting) return;
      const el = e.target;
      const target = +el.dataset.target;
      const dur    = 1200;
      const step   = target / 60;
      let cur = 0;
      const timer = setInterval(() => {
        cur = Math.min(cur + step, target);
        el.textContent = Math.floor(cur);
        if (cur >= target) clearInterval(timer);
      }, dur / 60);
      obs.unobserve(el);
    });
  }, { threshold: 0.5 });
  document.querySelectorAll('.stat-counter').forEach(el => obs.observe(el));
}

/* ── Navbar scroll effect ── */
function initNavbarScroll() {
  const nav = document.getElementById('pnNavbar');
  if (!nav) return;
  window.addEventListener('scroll', () => {
    nav.classList.toggle('scrolled', window.scrollY > 20);
  }, { passive: true });
}

/* ── Scroll-top button ── */
function initScrollTop() {
  const btn = document.getElementById('pn-scroll-top');
  if (!btn) return;
  window.addEventListener('scroll', () => {
    btn.classList.toggle('show', window.scrollY > 400);
  }, { passive: true });
}

/* ── Auto-init en DOMContentLoaded ── */
document.addEventListener('DOMContentLoaded', () => {
  initNavbarScroll();
  initScrollTop();
  observarFadeUp();
  animarContadores();
});
