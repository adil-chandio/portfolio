/* ============================================================
   MONARCH — THE SCROLL · clean-room engine
   One rAF loop drives: scroll progress, pin dive, copy fades,
   dip transitions, counter/dots, video routing, and the GL
   overlay (point-cloud portrait + chapter dust). ~2 draw calls.
   ============================================================ */
(function () {
  'use strict';

  var reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var coarse = window.matchMedia('(pointer: coarse)').matches || window.innerWidth < 760;
  var docEl = document.documentElement;

  function clamp01(v) { return v < 0 ? 0 : v > 1 ? 1 : v; }
  function smooth(a, b, v) { var t = clamp01((v - a) / (b - a)); return t * t * (3 - 2 * t); }
  function easeIO(t) { return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2; }

  /* ── scene registry ─────────────────────────────────────── */
  var SCENES = [
    { id: 's-hero',    light: 0, dip: '#050506', dust: 0xcfd4e0, dop: 0.5 },
    { id: 's-work',    light: 1, dip: '#f2f0ea', dust: 0x000000, dop: 0 },
    { id: 's-room',    light: 0, dip: '#050506', dust: 0xdde6ff, dop: 0.32 },
    { id: 's-render',  light: 0, dip: '#050506', dust: 0x9fe8b8, dop: 0.5 },
    { id: 's-forge',   light: 0, dip: '#050506', dust: 0xbfd9ff, dop: 0.42 },
    { id: 's-catalog', light: 1, dip: '#f2f0ea', dust: 0x000000, dop: 0 },
    { id: 's-about',   light: 0, dip: '#050506', dust: 0xffc36b, dop: 0.5 },
    { id: 's-finale',  light: 0, dip: '#170404', dust: 0xffb08a, dop: 0.55 }
  ];
  var N = SCENES.length;

  var scenes = SCENES.map(function (cfg) {
    var el = document.getElementById(cfg.id);
    return {
      cfg: cfg, el: el,
      pin: el ? el.querySelector('.pin') : null,
      bg: el ? el.querySelector('.bg') : null,
      vid: el ? el.querySelector('.vid') : null,
      fades: el ? Array.prototype.slice.call(el.querySelectorAll('.copy,.spec,.hint,.meta,.term,.mag-wrap,.about,.finale')) : [],
      top: 0, h: 0, p: 0
    };
  });
  var vh = window.innerHeight;
  function measure() {
    vh = window.innerHeight;
    scenes.forEach(function (s) {
      if (!s.el) return;
      s.top = s.el.getBoundingClientRect().top + window.scrollY;
      s.h = s.el.offsetHeight;
    });
  }
  measure();

  /* ── loader ─────────────────────────────────────────────── */
  var loader = document.getElementById('s-loader');
  var ldFill = document.getElementById('ld-fill');
  var ldPct = document.getElementById('ld-pct');
  var prog = 0.12, loadDone = false;
  function setFill(p) {
    prog = Math.max(prog, p);
    var w = Math.min(1, prog);
    if (ldFill) ldFill.style.width = (w * 100).toFixed(0) + '%';
    if (ldPct) ldPct.textContent = (w * 100).toFixed(0).replace(/^0/, '0');
  }
  function loadDone2() {
    if (loadDone) return; loadDone = true;
    setFill(1);
    if (loader) loader.classList.add('done');
    window.setTimeout(function () { if (loader && loader.parentNode) loader.parentNode.removeChild(loader); }, 1000);
  }
  setFill(0.4);
  window.addEventListener('load', function () { window.setTimeout(loadDone2, 250); });
  window.setTimeout(loadDone2, 3000);

  /* ── HUD: dots + counter ────────────────────────────────── */
  var dotsBox = document.getElementById('s-dots');
  var dots = scenes.map(function (s, i) {
    var b = document.createElement('button');
    b.setAttribute('aria-label', 'Scene 0' + (i + 1));
    b.addEventListener('click', function () {
      if (s.el) s.el.scrollIntoView({ behavior: reduced ? 'auto' : 'smooth', block: 'start' });
    });
    dotsBox.appendChild(b);
    return b;
  });
  var posEl = document.getElementById('s-pos');
  var barEl = document.getElementById('s-bar');
  var dipEl = document.getElementById('s-dip');
  var mx = 0, my = 0;
  window.addEventListener('mousemove', function (e) {
    mx = (e.clientX / window.innerWidth) * 2 - 1;
    my = (e.clientY / window.innerHeight) * 2 - 1;
  }, { passive: true });

  /* ── video routing ──────────────────────────────────────── */
  var lightboxOpen = false;
  function routeVids() {
    for (var i = 0; i < N; i++) {
      var v = scenes[i].vid; if (!v) continue;
      var want = !reduced && i === active && !document.hidden && !lightboxOpen;
      if (want) { if (v.paused) v.play().catch(function () {}); }
      else if (!v.paused) { v.pause(); }
    }
  }
  scenes.forEach(function (s) {
    if (s.vid && reduced) { s.vid.removeAttribute('autoplay'); s.vid.pause(); }
  });
  /* watchdog — a clip that ever pauses restarts within 2.5s */
  window.setInterval(function () {
    if (document.hidden || lightboxOpen || reduced) return;
    var v = scenes[active].vid;
    if (v && v.paused) v.play().catch(function () {});
  }, 2500);
  document.addEventListener('visibilitychange', routeVids);

  /* ── main loop ──────────────────────────────────────────── */
  var active = 0;
  var par = scenes.map(function () { return { s: 1.22, x: 0, y: 0 }; });

  function frame() {
    requestAnimationFrame(frame);
    var y = window.scrollY || window.pageYOffset || 0;
    var docH = Math.max(document.body.scrollHeight, docEl.scrollHeight) - vh;
    if (barEl) barEl.style.transform = 'scaleX(' + (docH > 0 ? (y / docH).toFixed(4) : 0) + ')';

    var bestVis = -1, bestIdx = 0;
    for (var i = 0; i < N; i++) {
      var s = scenes[i]; if (!s.el) continue;
      s.p = clamp01((y - s.top) / Math.max(1, s.h - vh));
      var centerOffset = (s.top + s.h / 2) - (y + vh / 2);
      var vis = clamp01(1 - Math.abs(centerOffset) / (vh * 0.78));

      /* camera-push: each room dive-ins 1.05 → 1.0 */
      if (s.pin) s.pin.style.transform = 'scale(' + (1.05 - 0.05 * easeIO(smooth(0, 0.28, s.p))).toFixed(4) + ')';

      /* plate parallax (fallback plates) */
      if (s.bg) {
        var pv = par[i];
        pv.s += ((1.22 - smooth(0.05, 0.85, vis) * 0.16) - pv.s) * (reduced ? 1 : 0.085);
        pv.x += (((centerOffset / vh) * 3.0 - mx * 1.0) - pv.x) * (reduced ? 1 : 0.075);
        pv.y += ((-my * 0.9) - pv.y) * (reduced ? 1 : 0.075);
        s.bg.style.transform = 'scale(' + pv.s.toFixed(4) + ') translate3d(' + pv.x.toFixed(2) + '%,' + pv.y.toFixed(2) + '%,0)';
      }

      /* copy: rise + fade in as the room focuses */
      var fade = smooth(0.08, 0.34, vis) * (1 - smooth(0.88, 1.0, vis) * 0.4);
      for (var j = 0; j < s.fades.length; j++) {
        s.fades[j].style.opacity = fade.toFixed(3);
        s.fades[j].style.transform = 'translateY(' + ((1 - fade) * 26).toFixed(1) + 'px)';
      }
      if (i === 0) {
        var hf = 1 - smooth(0.06, 0.34, s.p);
        s.fades.forEach(function (f) { f.style.opacity = hf.toFixed(3); f.style.transform = ''; });
      }
      if (i === 1) {
        /* white chapter: fan the covers with focus */
        var fan = 0.3 + smooth(0.15, 0.7, vis);
        var covers = s.el.querySelectorAll('.cover');
        for (var k = 0; k < covers.length; k++) {
          var off = k - (covers.length - 1) / 2;
          covers[k].style.opacity = smooth(0.1, 0.5, vis).toFixed(3);
          covers[k].style.transform = 'translateY(' + (-smooth(0.15, 0.8, vis) * 20 + (k % 2 ? 10 : 0)).toFixed(1) + 'px) rotateY(' + (off * 9 * fan).toFixed(2) + 'deg) rotateX(6deg)';
        }
      }
      if (vis > bestVis) { bestVis = vis; bestIdx = i; }
    }

    if (bestIdx !== active) {
      active = bestIdx;
      if (posEl) posEl.textContent = ('0' + (active + 1)).slice(-2) + ' / 0' + N;
      for (var d = 0; d < dots.length; d++) dots[d].classList.toggle('on', d === active);
      document.body.classList.toggle('on-light', !!scenes[active].cfg.light);
      routeVids();
    }

    /* dip transition at each boundary — dark between dark rooms,
       paper-white into the white chapters (one language) */
    if (dipEl) {
      var o = 0, color = '#050506';
      for (var b = 1; b < N; b++) {
        var boundary = scenes[b].top;
        var dist = Math.abs(y - boundary);
        if (dist < 140) {
          var k = Math.pow(1 - dist / 140, 2.1) * (scenes[b].cfg.light ? 0.94 : 0.88);
          if (k > o) { o = k; color = scenes[b].cfg.dip; }
        }
      }
      dipEl.style.opacity = o.toFixed(3);
      if (color && dipEl.style.backgroundColor !== color) dipEl.style.backgroundColor = color;
    }
  }
  frame();
  routeVids();
  window.addEventListener('resize', measure);

  /* ══ GL: point-cloud hero + chapter dust (2 draw calls) ══ */
  var canvas = document.getElementById('s-gl');
  var potato = false;
  try {
    var probe = document.createElement('canvas');
    var pctx = probe.getContext('webgl') || probe.getContext('experimental-webgl');
    var dbg = pctx && pctx.getExtension('WEBGL_debug_renderer_info');
    var gpu = dbg ? String(pctx.getParameter(dbg.UNMASKED_RENDERER_WEBGL) || '') : '';
    var mem = navigator.deviceMemory || 8, cores = navigator.hardwareConcurrency || 8;
    potato = /(SwiftShader|llvmpipe|softpipe|VideoCore|Mali-[0-9T]|Mali-G[0-3][0-9]|Adreno\s?(\(TM\))?\s?[234]|PowerVR)/i.test(gpu) || (mem <= 2 && cores <= 4);
  } catch (e) { /* try GL anyway */ }

  if (!potato && canvas && window.THREE) {
    var THREE = window.THREE;
    var renderer;
    try {
      renderer = new THREE.WebGLRenderer({ canvas: canvas, antialias: true, alpha: true, powerPreference: 'high-performance' });
    } catch (e) { renderer = null; }

    if (renderer) {
      renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, coarse ? 1.15 : 1.5));
      renderer.setSize(window.innerWidth, window.innerHeight);
      renderer.setClearColor(0x000000, 0);

      var scene = new THREE.Scene();
      var camera = new THREE.PerspectiveCamera(52, window.innerWidth / window.innerHeight, 0.1, 80);
      camera.position.set(0, 1.2, 9.2);
      scene.add(camera);

      function spriteTex() {
        var c = document.createElement('canvas'); c.width = c.height = 64;
        var g = c.getContext('2d');
        var grad = g.createRadialGradient(32, 32, 0, 32, 32, 32);
        grad.addColorStop(0, 'rgba(255,255,255,1)');
        grad.addColorStop(0.4, 'rgba(255,255,255,.7)');
        grad.addColorStop(1, 'rgba(255,255,255,0)');
        g.fillStyle = grad; g.fillRect(0, 0, 64, 64);
        return new THREE.CanvasTexture(c);
      }
      var sprite = spriteTex();

      /* point-cloud portrait — Adil's masked portrait → glowing points */
      var portrait = new THREE.Group();
      var pMat = null, basePos = null, scatterVec = null;
      (function () {
        var img = new Image();
        img.onload = function () {
          var w = coarse ? 150 : 190, h = Math.round(w * (img.height / img.width));
          var c = document.createElement('canvas'); c.width = w; c.height = h;
          var g = c.getContext('2d');
          g.drawImage(img, 0, 0, w, h);
          var data = g.getImageData(0, 0, w, h).data;
          var pts = [], cols = [];
          for (var y = 0; y < h; y++) {
            for (var x = 0; x < w; x++) {
              var idx = (y * w + x) * 4;
              var r = data[idx], gg = data[idx + 1], b = data[idx + 2];
              var lum = 0.2126 * r + 0.7152 * gg + 0.0722 * b;
              if (lum < 22) continue;
              if (Math.random() > (lum / 255) * 1.28 + 0.14) continue;
              var H = 6.6, W = H * (w / h);
              var px = (x / w - 0.5) * W;
              var py = (0.5 - y / h) * H + 0.65;
              var nd = Math.hypot((x / w - 0.5) * 1.35, (y / h - 0.45) * 1.7);
              var pz = (1 - Math.min(1, nd)) * 1.35 + (Math.random() - 0.5) * 0.22;
              pts.push(px, py, pz);
              var boost = 1.18;
              var rr = Math.min(1, (r / 255) * boost), gb = Math.min(1, (gg / 255) * boost), bb = Math.min(1, (b / 255) * boost);
              if (r > gg * 1.35 && r > b * 1.35) rr = Math.min(1, rr * 1.45 + 0.08);
              cols.push(rr, gb, bb);
            }
          }
          var MAX = coarse ? 12000 : 20000;
          if (pts.length > MAX * 3) { pts = pts.slice(0, MAX * 3); cols = cols.slice(0, MAX * 3); }
          basePos = new Float32Array(pts);
          scatterVec = new Float32Array(pts.length);
          for (var i2 = 0; i2 < pts.length; i2++) {
            var th = Math.random() * Math.PI * 2, ph = Math.acos(2 * Math.random() - 1);
            var mag = 2 + Math.random() * 7;
            scatterVec[i2] = Math.sin(ph) * Math.cos(th) * mag;
            scatterVec[i2 + 1] = Math.cos(ph) * mag * 0.8;
            scatterVec[i2 + 2] = Math.sin(ph) * Math.sin(th) * mag;
          }
          var geo = new THREE.BufferGeometry();
          geo.setAttribute('position', new THREE.BufferAttribute(basePos.slice(), 3));
          geo.setAttribute('color', new THREE.BufferAttribute(cols, 3));
          pMat = new THREE.PointsMaterial({ size: 0.055, map: sprite, vertexColors: true, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, sizeAttenuation: true });
          portrait.add(new THREE.Points(geo, pMat));
          setFill(0.9);
        };
        img.src = 'assets/portrait-masked.png';
      })();
      scene.add(portrait);

      /* chapter dust — rides the camera, color lerps per scene */
      var M = coarse ? 80 : 150;
      var dpos = new Float32Array(M * 3), spd = new Float32Array(M), ph = new Float32Array(M);
      for (var i = 0; i < M; i++) {
        dpos[i * 3] = (Math.random() - 0.5) * 20;
        dpos[i * 3 + 1] = (Math.random() - 0.5) * 12;
        dpos[i * 3 + 2] = -10 + Math.random() * 16;
        spd[i] = 0.1 + Math.random() * 0.22;
        ph[i] = Math.random() * Math.PI * 2;
      }
      var dGeo = new THREE.BufferGeometry();
      dGeo.setAttribute('position', new THREE.BufferAttribute(dpos, 3));
      var dMat = new THREE.PointsMaterial({ size: 0.13, map: sprite, transparent: true, opacity: 0.5, depthWrite: false, blending: THREE.AdditiveBlending, color: 0xcfd4e0 });
      var dust = new THREE.Points(dGeo, dMat);
      camera.add(dust);

      var curOp = 0.5, lastLite = 0, glPaused = false;
      document.addEventListener('visibilitychange', function () { glPaused = document.hidden; });

      var tPrev = performance.now() / 1000;
      function glTick() {
        requestAnimationFrame(glTick);
        var t = performance.now() / 1000;
        if (glPaused) { tPrev = t; return; }
        if (coarse && t - lastLite < 0.033) return;
        lastLite = t;
        var dt = Math.min(0.05, t - tPrev); tPrev = t;

        canvas.style.visibility = scenes[active].cfg.light ? 'hidden' : 'visible';

        var p0 = scenes[0].p || 0;
        var heroVis = clamp01(1 - p0 * 1.7);
        portrait.visible = heroVis > 0.02 && active === 0;
        if (portrait.visible) {
          portrait.position.y = Math.sin(t * 0.6) * 0.17 * (1 - p0);
          portrait.rotation.y = mx * 0.16 + Math.sin(t * 0.32) * 0.06;
          portrait.rotation.x = my * 0.06;
          if (pMat) {
            pMat.opacity = 1 - smooth(0.3, 0.9, p0);
            pMat.size = 0.055 + smooth(0.05, 1, p0) * 0.05;
          }
          if (basePos && p0 > 0.02 && p0 < 1) {
            var sAmt = easeIO(p0) * 1.25;
            var arr = portrait.children[0].geometry.attributes.position.array;
            for (var i3 = 0; i3 < basePos.length; i3++) arr[i3] = basePos[i3] + scatterVec[i3] * sAmt;
            portrait.children[0].geometry.attributes.position.needsUpdate = true;
          }
        }

        dMat.color.lerp(new THREE.Color(scenes[active].cfg.dust), 0.06);
        curOp += (scenes[active].cfg.dop - curOp) * 0.06;
        dMat.opacity = curOp;
        if (!reduced && curOp > 0.03) {
          var dp = dGeo.attributes.position;
          for (var i4 = 0; i4 < M; i4++) {
            var zz = dp.getZ(i4) - 2.0 * dt;
            if (zz < -10) zz = 6;
            dp.setZ(i4, zz);
            dp.setX(i4, dp.getX(i4) + Math.sin(t * 0.7 + ph[i4]) * 0.0026);
          }
          dp.needsUpdate = true;
        }
        camera.position.x += (mx * 0.5 - camera.position.x) * 0.05;
        camera.position.y += (1.2 - my * 0.3 - camera.position.y) * 0.05;
        camera.lookAt(0, 0.9, 0);
        renderer.render(scene, camera);
      }
      glTick();

      window.addEventListener('resize', function () {
        camera.aspect = window.innerWidth / window.innerHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(window.innerWidth, window.innerHeight);
      });
    }
  } else if (canvas) {
    canvas.style.display = 'none';
    docEl.classList.add('no-gl');
  }

  /* ══ lightbox ══ */
  var player = document.getElementById('s-player');
  var plVideo = document.getElementById('pl-video');
  var plTitle = document.getElementById('pl-title');
  function openFilm(src, title) {
    if (!player || !plVideo) return;
    lightboxOpen = true;
    routeVids();
    plVideo.src = src;
    if (plTitle) plTitle.textContent = (title || 'FILM').toUpperCase();
    player.classList.add('on'); player.setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden';
    window.setTimeout(function () { plVideo.play().catch(function () {}); }, 90);
  }
  function closeFilm() {
    if (!player) return;
    lightboxOpen = false;
    plVideo.pause();
    player.classList.remove('on'); player.setAttribute('aria-hidden', 'true');
    document.body.style.overflow = '';
    routeVids();
  }
  Array.prototype.forEach.call(document.querySelectorAll('[data-src]'), function (btn) {
    btn.addEventListener('click', function () { openFilm(btn.dataset.src, btn.dataset.title); });
  });
  var plClose = document.getElementById('pl-close');
  if (plClose) plClose.addEventListener('click', closeFilm);
  if (player) player.addEventListener('click', function (e) { if (e.target === player) closeFilm(); });
  window.addEventListener('keydown', function (e) { if (e.key === 'Escape') closeFilm(); });
})();
