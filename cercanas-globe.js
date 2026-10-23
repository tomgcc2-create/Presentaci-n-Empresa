/* PriceNice — cercanas-globe.js
   Planeta realista (canvas, sin librerías): textura de la Tierra proyectada pixel a pixel.
   - Arrastrar: gira libremente.
   - Tocar: gira varias vueltas y se acerca a Colombia resaltando su forma.
   + conecta los botones del hero con el mapa y muestra el estado de la ubicación. */
(function () {
  var cv = document.getElementById('ccGlobe');
  if (!cv) return;
  var ctx = cv.getContext('2d');
  var DPR = Math.min(window.devicePixelRatio || 1, 2);
  var SIZE = 560, RS = 1.2;                       // RS = resolución interna de la esfera
  cv.width = SIZE * DPR; cv.height = SIZE * DPR;
  cv.style.touchAction = 'none';
  var CX = SIZE / 2, CY = SIZE / 2, rad = Math.PI / 180, TAU = Math.PI * 2;
  var R0 = SIZE * 0.40, R1 = SIZE * 0.43, R = R0;
  var reduce = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;

  var COL_LON = -73.0, COL_LAT = 4.6;
  var lam0 = -74 * rad, phi0 = 14 * rad;
  var vel = 0, velY = 0, drag = false, lx = 0, ly = 0, moved = 0, idleUntil = 0;
  var anim = null, focus = 0, cloudDrift = 0, orbitA = 0;

  var COLOMBIA = [[-77.35,8.67],[-76.5,9.3],[-75.6,10.4],[-74.8,11.0],[-73.4,11.3],[-72.3,12.2],[-71.3,12.4],[-71.9,11.5],[-72.8,10.3],[-72.4,9.0],[-72.1,7.9],[-70.9,7.0],[-70.1,6.9],[-69.4,6.1],[-67.5,6.2],[-67.8,4.5],[-67.8,2.8],[-67.2,1.7],[-69.9,1.1],[-69.4,-1.1],[-70.0,-2.2],[-69.9,-4.2],[-70.7,-3.8],[-72.0,-2.4],[-73.2,-2.1],[-74.0,-1.0],[-75.3,-0.1],[-77.0,0.4],[-78.8,1.4],[-78.8,1.9],[-77.9,2.7],[-77.4,4.0],[-77.3,5.8],[-77.9,7.2]];

  /* ───────── Textura de la Tierra (equirectangular 1024×512) ───────── */
  var TW = 1024, TH = 512, tex = null;
  var FALLBACK = [
    [[-168,66],[-140,70],[-95,72],[-80,70],[-62,58],[-55,50],[-67,44],[-76,35],[-81,25],[-97,26],[-97,18],[-87,21],[-83,9],[-78,8],[-92,15],[-105,22],[-117,32],[-124,42],[-125,49],[-140,60]],
    [[-78,8],[-62,11],[-50,0],[-35,-6],[-40,-22],[-48,-28],[-58,-38],[-65,-42],[-68,-55],[-74,-50],[-73,-37],[-71,-18],[-81,-5]],
    [[-17,21],[-10,35],[10,37],[32,31],[43,12],[51,11],[40,-5],[40,-15],[33,-27],[20,-35],[14,-22],[9,-1],[-8,4],[-17,14]],
    [[-10,36],[-9,43],[0,50],[10,55],[25,60],[30,70],[60,70],[100,77],[140,72],[170,68],[178,64],[160,55],[142,46],[130,35],[122,30],[120,22],[108,20],[105,10],[100,2],[95,17],[88,22],[80,8],[72,20],[66,25],[57,25],[50,30],[36,36],[28,41],[22,37],[12,44],[3,43]],
    [[114,-22],[130,-12],[142,-11],[153,-27],[146,-39],[135,-35],[115,-34]],
    [[-55,60],[-45,60],[-20,70],[-20,82],[-60,82],[-70,76]]
  ];
  function rnd(x, y) { var s = Math.sin(x * 127.1 + y * 311.7) * 43758.5453; return s - Math.floor(s); }
  // ruido de valores suave y periódico en x (para que no se note la costura)
  function vnoise(x, y, per) {
    var xi = Math.floor(x), yi = Math.floor(y), fx = x - xi, fy = y - yi;
    fx = fx * fx * (3 - 2 * fx); fy = fy * fy * (3 - 2 * fy);
    var x0 = ((xi % per) + per) % per, x1 = (x0 + 1) % per;
    var a = rnd(x0, yi), b = rnd(x1, yi), c = rnd(x0, yi + 1), d = rnd(x1, yi + 1);
    return a + (b - a) * fx + (c - a) * fy + (a - b - c + d) * fx * fy;
  }
  function fbm(x, y, per) { var v = 0, amp = .5, p = per; for (var o = 0; o < 5; o++) { v += amp * vnoise(x * p / per, y * p / per, p); amp *= .5; p *= 2; } return v; }
  // Capa de nubes (512×256)
  var CW = 512, CH = 256, clouds = new Uint8ClampedArray(CW * CH);
  (function () {
    for (var y = 0; y < CH; y++) {
      var lat = 90 - y / CH * 180, band = 1 - Math.min(1, Math.abs(Math.abs(lat) - 8) / 80) * .35;
      for (var x = 0; x < CW; x++) {
        var n = fbm(x / CW * 6, y / CH * 3, 6) * band;
        var c = Math.max(0, Math.min(1, (n - .46) / .22));
        clouds[y * CW + x] = c * c * (3 - 2 * c) * 255;
      }
    }
  })();

  // Textura procedural (si no carga la foto): océano + continentes con relieve y hielo en los polos
  function buildTexture(polys) {
    var c = document.createElement('canvas'); c.width = TW; c.height = TH;
    var g = c.getContext('2d');
    var og = g.createLinearGradient(0, 0, 0, TH);
    og.addColorStop(0, '#0f4a85'); og.addColorStop(.5, '#1f7fc4'); og.addColorStop(1, '#0f4a85');
    g.fillStyle = og; g.fillRect(0, 0, TW, TH);
    var m = document.createElement('canvas'); m.width = TW; m.height = TH;
    var mg = m.getContext('2d'); mg.fillStyle = '#fff';
    polys.forEach(function (ring) {
      mg.beginPath();
      ring.forEach(function (p, i) { var x = (p[0] + 180) / 360 * TW, y = (90 - p[1]) / 180 * TH; i ? mg.lineTo(x, y) : mg.moveTo(x, y); });
      mg.closePath(); mg.fill();
    });
    var md = mg.getImageData(0, 0, TW, TH).data, im = g.getImageData(0, 0, TW, TH), d = im.data;
    for (var y = 0; y < TH; y++) {
      var lat = 90 - y / TH * 180, al = Math.abs(lat);
      for (var x = 0; x < TW; x++) {
        var i = (y * TW + x) * 4, n = rnd(x >> 2, y >> 2) * .5 + rnd(x >> 4, y >> 4) * .5;
        if (md[i] > 128) {
          var r, gg, b;
          if (al > 66) { r = 235; gg = 240; b = 245; }
          else if (al > 50) { r = 70 + n * 30; gg = 110 + n * 30; b = 60; }
          else if (al > 14 && al < 36 && n > .5) { r = 205 - n * 25; gg = 172 - n * 25; b = 112; }   // zonas áridas
          else { r = 40 + n * 60; gg = 118 + n * 50; b = 50 + n * 25; }                               // verde
          d[i] = r; d[i + 1] = gg; d[i + 2] = b;
        } else if (al > 72) { d[i] = 225; d[i + 1] = 236; d[i + 2] = 245; }
      }
    }
    var out = new Uint8ClampedArray(d); tex = { d: out };
  }
  buildTexture(FALLBACK);

  function ringsFromTopo(topo) {
    var f = topojson.feature(topo, topo.objects.land), geom = f.features ? f.features[0].geometry : f.geometry, rings = [];
    if (geom.type === 'Polygon') rings = geom.coordinates;
    else geom.coordinates.forEach(function (p) { p.forEach(function (r) { rings.push(r); }); });
    return rings;
  }
  var gotPhoto = false; cv.setAttribute('data-textura', 'simple');
  var wrap = cv.parentNode, listo = false, visible = true;
  cv.classList.add('cc-loading'); if (wrap) wrap.classList.add('cc-loading');
  function mostrarPlaneta() {            // revela el planeta UNA sola vez, ya con su textura final
    if (listo) return; listo = true;
    cv.classList.remove('cc-loading'); if (wrap) wrap.classList.remove('cc-loading');
  }
  function loadScript(src) { return new Promise(function (ok, no) { var s = document.createElement('script'); s.src = src; s.onload = ok; s.onerror = no; document.head.appendChild(s); }); }

  // 1) Foto real de la Tierra: primero img/earth.jpg (tuya, local) y luego varias fuentes en internet
  var TEX_URLS = [
    'img/earth.jpg',
    'https://cdn.jsdelivr.net/gh/mrdoob/three.js@r150/examples/textures/planets/earth_atmos_2048.jpg',
    'https://unpkg.com/three-globe@2.31.0/example/img/earth-blue-marble.jpg',
    'https://cdn.jsdelivr.net/npm/three-globe@2.31.0/example/img/earth-blue-marble.jpg'
  ];
  var CLOUD_URLS = [
    'img/earth-clouds.png',
    'https://cdn.jsdelivr.net/gh/mrdoob/three.js@r150/examples/textures/planets/earth_clouds_1024.png'
  ];
  function tryImgs(urls, ok, i) {
    i = i || 0; if (i >= urls.length) return;
    var img = new Image(); img.crossOrigin = 'anonymous';
    img.onload = function () { try { ok(img); } catch (e) { tryImgs(urls, ok, i + 1); } };
    img.onerror = function () { tryImgs(urls, ok, i + 1); };
    img.src = urls[i];
  }
  // Todas las fuentes de la textura se piden a la vez; se usa la primera que llegue
  (function () {
    var done = false;
    TEX_URLS.forEach(function (u) {
      var img = new Image(); img.crossOrigin = 'anonymous';
      img.onload = function () {
        if (done) return; done = true;
        var c = document.createElement('canvas'); c.width = TW; c.height = TH;
        var g = c.getContext('2d'); g.drawImage(img, 0, 0, TW, TH);
        tex = { d: g.getImageData(0, 0, TW, TH).data }; gotPhoto = true; cv.setAttribute('data-textura', 'foto');
        mostrarPlaneta();
      };
      img.src = u;
    });
  })();
  tryImgs(CLOUD_URLS, function (img) {   // nubes reales (si cargan, reemplazan a las procedurales)
    var c = document.createElement('canvas'); c.width = CW; c.height = CH;
    var g = c.getContext('2d'); g.drawImage(img, 0, 0, CW, CH);
    var d = g.getImageData(0, 0, CW, CH).data, hasA = false, k;
    for (k = 3; k < d.length; k += 4) if (d[k] < 250) { hasA = true; break; }
    for (k = 0; k < CW * CH; k++) clouds[k] = hasA ? d[k * 4 + 3] : d[k * 4];
  });
  // 2) Respaldo: solo si la foto no llega en 6 s se usa el mapa de continentes (y entonces se muestra)
  setTimeout(function () {
    if (gotPhoto) return;
    loadScript('https://cdn.jsdelivr.net/npm/topojson-client@3.1.0/dist/topojson-client.min.js')
      .then(function () { return fetch('https://cdn.jsdelivr.net/npm/world-atlas@2.0.2/land-110m.json'); })
      .then(function (r) { return r.json(); })
      .then(function (topo) { if (!gotPhoto) buildTexture(ringsFromTopo(topo)); mostrarPlaneta(); })
      .catch(function () { mostrarPlaneta(); });
  }, 6000);

  /* ───────── Render pixel a pixel (proyección ortográfica inversa) ───────── */
  var off = document.createElement('canvas'), octx = off.getContext('2d');
  var OW = Math.ceil(SIZE * RS); off.width = OW; off.height = OW;
  var frame = octx.createImageData(OW, OW), fd = frame.data;

  function renderSphere() {
    var Rp = R * RS, c0 = OW / 2, sinP0 = Math.sin(phi0), cosP0 = Math.cos(phi0), td = tex.d;
    var x0 = Math.max(0, Math.floor(c0 - Rp - 1)), x1 = Math.min(OW, Math.ceil(c0 + Rp + 1));
    fd.fill(0);
    for (var py = x0; py < x1; py++) {
      var y = (c0 - py) / Rp;
      for (var px = x0; px < x1; px++) {
        var x = (px - c0) / Rp, rho2 = x * x + y * y;
        if (rho2 > 1) continue;
        var z = Math.sqrt(1 - rho2);                      // cos c
        var lat = Math.asin(z * sinP0 + y * cosP0);
        var lon = lam0 + Math.atan2(x, z * cosP0 - y * sinP0);
        var u = (lon / TAU + .5) % 1; if (u < 0) u += 1;
        var tx = (u * TW) | 0, ty = ((.5 - lat / Math.PI) * TH) | 0; if (ty < 0) ty = 0; if (ty > TH - 1) ty = TH - 1;
        var ti = (ty * TW + tx) * 4, r = td[ti], g = td[ti + 1], b = td[ti + 2];
        // luz desde arriba-izquierda
        var dif = Math.max(0, (-0.45 * x + 0.55 * y + 0.70 * z)); var sh = 0.55 + 0.75 * dif;
        var lum = (r + g + b) / 3; r = lum + (r - lum) * 1.25; g = lum + (g - lum) * 1.25; b = lum + (b - lum) * 1.3;   // más saturado
        var ocean = b > r + 18 && b > g;
        r *= sh; g *= sh; b *= sh;
        if (ocean) { var sd = Math.max(0, (-0.35 * x + 0.5 * y + 0.79 * z)); var sp = Math.pow(sd, 14) * 120 + Math.pow(sd, 80) * 160; r += sp; g += sp; b += sp; }
        // nubes (derivan un poco más rápido que la tierra)
        var cu = ((u + cloudDrift) % 1 + 1) % 1, ci = (((.5 - lat / Math.PI) * CH) | 0); if (ci < 0) ci = 0; if (ci > CH - 1) ci = CH - 1;
        var cl = clouds[ci * CW + ((cu * CW) | 0)] / 255 * .95;
        if (cl > 0) { var cs = 235 * (.55 + .5 * dif); r = r * (1 - cl) + cs * cl; g = g * (1 - cl) + cs * cl; b = b * (1 - cl) + (cs + 8) * cl; }
        // atmósfera en el borde
        var rim = Math.pow(1 - z, 2.6); r += 60 * rim; g += 120 * rim; b += 210 * rim;
        var o = (py * OW + px) * 4;
        fd[o] = r > 255 ? 255 : r; fd[o + 1] = g > 255 ? 255 : g; fd[o + 2] = b > 255 ? 255 : b; fd[o + 3] = 255;
      }
    }
    octx.putImageData(frame, 0, 0);
  }

  function proj(lon, lat) {
    var l = lon * rad, p = lat * rad, dl = l - lam0;
    var cosc = Math.sin(phi0) * Math.sin(p) + Math.cos(phi0) * Math.cos(p) * Math.cos(dl);
    return { x: CX + R * Math.cos(p) * Math.sin(dl), y: CY - R * (Math.cos(phi0) * Math.sin(p) - Math.sin(phi0) * Math.cos(p) * Math.cos(dl)), v: cosc };
  }

  function colombiaPath() {
    ctx.beginPath(); var any = false;
    COLOMBIA.forEach(function (q, i) { var a = proj(q[0], q[1]); if (a.v > 0.02) { any ? ctx.lineTo(a.x, a.y) : ctx.moveTo(a.x, a.y); any = true; } });
    if (any) ctx.closePath(); return any;
  }

  function draw(now) {
    var t = now / 1000;
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
    ctx.clearRect(0, 0, SIZE, SIZE);

    // Halo atmosférico
    var halo = ctx.createRadialGradient(CX, CY, R * .96, CX, CY, R * 1.15);
    halo.addColorStop(0, 'rgba(120,180,255,.45)'); halo.addColorStop(1, 'rgba(120,180,255,0)');
    ctx.fillStyle = halo; ctx.beginPath(); ctx.arc(CX, CY, R * 1.15, 0, 7); ctx.fill();

    renderSphere();
    ctx.save(); ctx.beginPath(); ctx.arc(CX, CY, R, 0, 7); ctx.clip();
    ctx.drawImage(off, 0, 0, OW, OW, 0, 0, SIZE, SIZE);

    // Colombia: contorno tenue siempre, resaltada al llegar
    if (colombiaPath()) {
      ctx.fillStyle = 'rgba(198,167,94,' + (0.10 + 0.40 * focus + 0.08 * Math.sin(t * 3) * focus).toFixed(3) + ')'; ctx.fill();
      ctx.strokeStyle = 'rgba(255,224,140,' + (0.45 + 0.55 * focus).toFixed(2) + ')'; ctx.lineWidth = 1.2 + 1.6 * focus; ctx.lineJoin = 'round';
      ctx.shadowColor = '#F2D27A'; ctx.shadowBlur = 8 + 14 * focus; ctx.stroke(); ctx.shadowBlur = 0;
    }
    // Sombra del terminador
    var sh = ctx.createRadialGradient(CX - R * .4, CY - R * .45, R * .5, CX, CY, R * 1.02);
    sh.addColorStop(0, 'rgba(5,12,30,0)'); sh.addColorStop(1, 'rgba(5,12,30,.30)');
    ctx.fillStyle = sh; ctx.fillRect(0, 0, SIZE, SIZE);
    ctx.restore();

    // Bogotá
    var b = proj(-74.07, 4.71);
    if (b.v > 0.05) {
      var k = (t % 2) / 2;
      ctx.strokeStyle = 'rgba(255,224,140,' + (1 - k).toFixed(2) + ')'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(b.x, b.y, 4 + k * (14 + 14 * focus), 0, 7); ctx.stroke();
      ctx.fillStyle = '#C6A75E'; ctx.shadowColor = '#FFE08C'; ctx.shadowBlur = 12;
      ctx.beginPath(); ctx.arc(b.x, b.y, 4 + focus * 2, 0, 7); ctx.fill(); ctx.shadowBlur = 0;
      ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(b.x, b.y, 1.8, 0, 7); ctx.fill();
      if (focus > .6) {
        ctx.globalAlpha = (focus - .6) / .4; ctx.font = '700 13px DM Sans, Inter, sans-serif';
        var lbl = 'Bogotá', w = ctx.measureText(lbl).width + 18, bx = b.x + 14, by = b.y - 30;
        ctx.fillStyle = '#1F2A44'; ctx.beginPath(); ctx.roundRect ? ctx.roundRect(bx, by, w, 24, 12) : ctx.rect(bx, by, w, 24); ctx.fill();
        ctx.fillStyle = '#fff'; ctx.fillText(lbl, bx + 9, by + 16); ctx.globalAlpha = 1;
      }
    }
    // Borde de cristal
    ctx.strokeStyle = 'rgba(198,167,94,.5)'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.arc(CX, CY, R, 0, 7); ctx.stroke();
  }

  /* ───────── Animación "viajar a Colombia" ───────── */
  function ease(p) { return p < .5 ? 4 * p * p * p : 1 - Math.pow(-2 * p + 2, 3) / 2; }
  function smooth(a, b, x) { x = Math.max(0, Math.min(1, (x - a) / (b - a))); return x * x * (3 - 2 * x); }
  function viajarAColombia() {
    var target = COL_LON * rad, d = (target - lam0) % TAU; if (d > 0) d -= TAU;   // gira hacia el este
    anim = { t0: performance.now(), dur: 3600, l0: lam0, dl: d - TAU * 2, p0: phi0, dp: (COL_LAT * rad * .6 + 8 * rad) - phi0 };
    vel = 0; velY = 0; hint(false);
  }
  function hint(on) { var h = document.querySelector('.cc-hint'); if (h) h.classList.toggle('off', !on); }

  /* ───────── Tiendas orbitando alrededor del planeta ───────── */
  var orbit = document.getElementById('ccOrbit'), stores = orbit ? [].slice.call(orbit.children) : [], lastT = 0, hov = false;
  if (orbit) { orbit.addEventListener('mouseenter', function () { hov = true; }); orbit.addEventListener('mouseleave', function () { hov = false; }); }
  function moverTiendas(now) {
    if (!orbit) return;
    var dt = Math.min((now - lastT) / 1000, .05); lastT = now;
    if (!hov) orbitA += dt * (anim ? 1.1 : .14);
    var wrap = orbit.getBoundingClientRect(), rx = Math.min(wrap.width * .42, 270), ry = rx * .36, tilt = -14 * rad, n = stores.length;
    var cx = wrap.width / 2, cy = wrap.height / 2;
    for (var i = 0; i < n; i++) {
      var a = orbitA + i / n * TAU, ex = Math.cos(a) * rx, ey = Math.sin(a) * ry;
      var x = ex * Math.cos(tilt) - ey * Math.sin(tilt), y = ex * Math.sin(tilt) + ey * Math.cos(tilt);
      var front = (Math.sin(a) + 1) / 2, el = stores[i];
      el.style.transform = 'translate(' + (cx + x).toFixed(1) + 'px,' + (cy + y).toFixed(1) + 'px) translate(-50%,-50%) scale(' + (0.72 + 0.28 * front).toFixed(3) + ')';
      el.style.opacity = (0.45 + 0.55 * front).toFixed(2);
      el.style.zIndex = front > .5 ? 4 : 1;
      el.style.pointerEvents = front > .35 ? 'auto' : 'none';
    }
  }

  function tick(now) {
    if (anim) {
      var p = Math.min((now - anim.t0) / anim.dur, 1), e = ease(p);
      lam0 = anim.l0 + anim.dl * e; phi0 = anim.p0 + anim.dp * smooth(.3, 1, p);
      R = R0 + (R1 - R0) * smooth(.55, 1, p); focus = smooth(.8, 1, p);
      if (p >= 1) { anim = null; idleUntil = now + 6000; }
    } else if (!drag) {
      lam0 -= vel; phi0 += velY; vel *= 0.95; velY *= 0.92;
      if (!reduce && Math.abs(vel) < 0.0006 && now > idleUntil) lam0 += 0.0028;
      if (now > idleUntil) { R += (R0 - R) * 0.04; focus += (0 - focus) * 0.05; }
    }
    phi0 = Math.max(-1.05, Math.min(1.05, phi0));
    cloudDrift += 0.00006 + (anim ? 0.0004 : 0);
    moverTiendas(now);
    if (listo && visible && !document.hidden) draw(now);
    requestAnimationFrame(tick);
  }

  /* ───────── Arrastrar / tocar ───────── */
  cv.addEventListener('pointerdown', function (e) { drag = true; moved = 0; lx = e.clientX; ly = e.clientY; vel = 0; velY = 0; cv.setPointerCapture(e.pointerId); cv.classList.add('grab'); });
  cv.addEventListener('pointermove', function (e) {
    if (!drag) return;
    var dx = e.clientX - lx, dy = e.clientY - ly; lx = e.clientX; ly = e.clientY; moved += Math.abs(dx) + Math.abs(dy);
    if (moved > 6 && anim) anim = null;
    var k = 0.0075 * (SIZE / cv.getBoundingClientRect().width);
    lam0 -= dx * k; phi0 += dy * k; vel = dx * k; velY = dy * k * .3;
  });
  function up() { if (!drag) return; drag = false; cv.classList.remove('grab'); idleUntil = performance.now() + 2500; if (moved < 6) viajarAColombia(); }
  cv.addEventListener('pointerup', up); cv.addEventListener('pointercancel', up);
  if ('IntersectionObserver' in window) new IntersectionObserver(function (en) { visible = en[0].isIntersecting; }).observe(cv);
  requestAnimationFrame(tick);

  /* ── Contadores ── */
  document.querySelectorAll('.cc-stat [data-count]').forEach(function (el) {
    var tgt = +el.dataset.count, st = null;
    function step(ts) { if (!st) st = ts; var p = Math.min((ts - st) / 1500, 1); el.textContent = Math.round(tgt * (1 - Math.pow(1 - p, 3))).toLocaleString('es-CO'); if (p < 1) requestAnimationFrame(step); }
    requestAnimationFrame(step);
  });

  /* ── Botones del hero → mapa ── */
  function irAlMapa(sel) {
    var m = document.getElementById('tiendas-cerca'); if (m) m.scrollIntoView({ behavior: 'smooth', block: 'start' });
    setTimeout(function () { var b = document.querySelector(sel); if (b) b.click(); }, 450);
  }
  var bu = document.getElementById('ccBtnUbic'), bm = document.getElementById('ccBtnManual');
  if (bu) bu.addEventListener('click', function () { irAlMapa('#pnBtnDarUbicacion'); });
  if (bm) bm.addEventListener('click', function () { irAlMapa('#pnLinkManualSearch'); });

  /* ── Estado de la ubicación ── */
  var card = document.getElementById('pnMapOverlayCard'), st = document.getElementById('ccStatus');
  function estado() {
    if (!card || !st) return;
    var ok = card.classList.contains('hidden');
    st.classList.toggle('ok', ok);
    document.getElementById('ccStatusTit').textContent = ok ? 'Ubicación detectada' : 'Ubicación pendiente';
    document.getElementById('ccStatusSub').textContent = ok ? 'Mostrando las tiendas más cercanas a ti en el mapa.' : 'Permite el acceso cuando tu navegador lo pida.';
  }
  if (card && 'MutationObserver' in window) new MutationObserver(estado).observe(card, { attributes: true, attributeFilter: ['class'] });
})();
