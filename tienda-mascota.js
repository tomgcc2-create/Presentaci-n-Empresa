/* PriceNice — tienda-mascota.js
   Hace volar a la mascota de la IA por detrás del contenido de la página de comparación. */
(function () {
  if (!document.body.classList.contains('tienda-nueva')) return;
  if (window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  const img = document.createElement('img');
  img.src = 'img/logo-chat.png';
  img.alt = '';
  img.className = 'tn-mascota';
  img.setAttribute('aria-hidden', 'true');
  document.body.appendChild(img);

  let t = 0, last = performance.now();
  const W = () => window.innerWidth, H = () => window.innerHeight;

  // Trayectoria: lazo suave que cruza la pantalla de lado a lado
  function pos(time) {
    const w = W(), h = H();
    const x = (Math.sin(time * 0.00018) * 0.42 + 0.5) * (w - 120);
    const y = (Math.sin(time * 0.00031 + 1.3) * 0.32 + 0.4) * (h - 120);
    const bob = Math.sin(time * 0.0016) * 14;
    const tilt = Math.cos(time * 0.00018) * 14;
    return { x, y: y + bob, r: tilt };
  }

  function frame(now) {
    t = now;
    const p = pos(now);
    img.style.transform = `translate(${p.x}px, ${p.y}px) rotate(${p.r}deg)`;
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
  window.addEventListener('resize', () => {});
})();
