/* ============================================================
   THE SCROLL v2 — reference-grade cinematic engine
   GL: point-cloud hero (from #17's proven technique) + grid
       that recedes + per-point scatter on scroll + chapter dust
   CSS: plates (flight zoom), 3D fanned covers, mono blocks
   ============================================================ */
(function () {
  'use strict';

  var reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var coarse = window.matchMedia('(pointer: coarse)').matches || window.innerWidth < 760;
  var docEl = document.documentElement;

  function clamp01(v) { return v < 0 ? 0 : v > 1 ? 1 : v; }
  function smooth(a, b, v) { var t = clamp01((v - a) / (b - a)); return t * t * (3 - 2 * t); }
  function easeIO(t) { return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2; }

  /* ── loader ─────────────────────────────────────────────── */
  var loader = document.getElementById('jLoader');
  var fill = document.getElementById('jldFill');
  var pct = document.getElementById('jldPct');
  var prog = 0.1, loadDone = false;
  function setFill(p) {
    prog = Math.max(prog, p);
    var w = Math.min(1, prog);
    if (fill) fill.style.width = (w * 100).toFixed(0) + '%';
    if (pct) pct.textContent = (w * 100).toFixed(0) + '%';
  }
  function done() {
    if (loadDone) return; loadDone = true;
    setFill(1);
    if (loader) loader.classList.add('done');
    window.setTimeout(function () { if (loader && loader.parentNode) loader.parentNode.removeChild(loader); }, 1000);
  }
  setFill(0.25);
  window.addEventListener('load', function () { window.setTimeout(done, 300); });
  window.setTimeout(done, 3400);

  /* ── chapters ───────────────────────────────────────────── */
  var vh = window.innerHeight;
  var IDS = ['ch0', 'ch1', 'ch2', 'ch3', 'ch4', 'ch5'];
  var ZOOM = [[1.0, 1.0], [1.08, 1.0], [1.62, 1.05], [1.55, 1.06], [1.32, 1.04], [1.48, 1.03]];
  var FLY = [0, 0, 1, 1, 0, 1];              /* flight-amplitude chapters */
  var DUST_COL = [0xe8e4da, 0x000000, 0x3dff8a, 0x8fc0ff, 0xffc36b, 0xff4530];
  var DUST_OP = [0.8, 0, 0.55, 0.5, 0.45, 0.75];
  var COUNTER = ['00 / 05', '01 / 05', '02 / 05', '03 / 05', '04 / 05', '05 / 05'];
  var FLASH = ['', '#ffffff', '#cfe6ff', '#d5e4ff', '#ffd9a8', '#ff5a3d'];

  var chapters = IDS.map(function (id, i) {
    var el = document.getElementById(id);
    return {
      el: el, i: i,
      bg: el ? el.querySelector('.j-bg') : null,
      fades: el ? Array.prototype.slice.call(el.querySelectorAll('.j-fade')) : [],
      top: 0, h: 0
    };
  });
  function measure() {
    vh = window.innerHeight;
    chapters.forEach(function (c) {
      if (!c.el) return;
      c.top = c.el.getBoundingClientRect().top + window.scrollY;
      c.h = c.el.offsetHeight;
    });
  }
  measure();

  var CHIPS = Array.prototype.slice.call(document.querySelectorAll('.j-chip'));
  var countEl = document.getElementById('jCount');
  var flashEl = document.getElementById('jFlash');
  var progEl = document.getElementById('jProg');

  var mx = 0, my = 0;
  window.addEventListener('mousemove', function (e) {
    mx = (e.clientX / window.innerWidth) * 2 - 1;
    my = (e.clientY / window.innerHeight) * 2 - 1;
  }, { passive: true });

  var view = chapters.map(function () { return { s: 1.2, x: 0, y: 0 }; });
  var active = 0;

  /* covers (bright chapter 3D fan) */
  var covers = Array.prototype.slice.call(document.querySelectorAll('.j-cover'));

  function frame() {
    requestAnimationFrame(frame);
    var y = window.scrollY || window.pageYOffset || 0;
    var docH = Math.max(document.body.scrollHeight, docEl.scrollHeight) - vh;
    if (progEl) progEl.style.transform = 'scaleX(' + (docH > 0 ? (y / docH).toFixed(4) : 0) + ')';

    var bestVis = -1, bestIdx = 0;
    for (var i = 0; i < chapters.length; i++) {
      var c = chapters[i]; if (!c.el) continue;
      var p = clamp01((y - c.top) / Math.max(1, c.h - vh));        /* 0→1 through the chapter */
      var centerOffset = (c.top + c.h / 2) - (y + vh / 2);
      var vis = clamp01(1 - Math.abs(centerOffset) / (vh * 0.78));
      var v = view[i];
      var zs = ZOOM[i][0], ze = ZOOM[i][1];
      var targetS = zs + (ze - zs) * easeIO(p);
      var amp = (FLY[i] ? 1.7 : 1.0);
      var targetX = (centerOffset / vh) * 3.2 * amp - mx * 1.1 * amp;
      var targetY = -(my * 0.9 * amp) + (FLY[i] ? (1 - easeIO(p)) * 4 : 0);
      v.s += (targetS - v.s) * (reduced ? 1 : 0.08);
      v.x += (targetX - v.x) * (reduced ? 1 : 0.07);
      v.y += (targetY - v.y) * (reduced ? 1 : 0.07);
      if (c.bg) c.bg.style.transform = 'scale(' + v.s.toFixed(4) + ') translate3d(' + v.x.toFixed(2) + '%,' + v.y.toFixed(2) + '%,0)';

      /* content fades in as the room focuses */
      var fade = smooth(0.1, 0.45, vis) * (1 - smooth(0.86, 1.0, vis) * 0.4);
      for (var j = 0; j < c.fades.length; j++) {
        c.fades[j].style.opacity = fade.toFixed(3);
        c.fades[j].style.transform = 'translateY(' + ((1 - fade) * 26).toFixed(1) + 'px)';
      }
      if (i === 0) {
        /* hero: corner labels + cue fade as you leave */
        var hf = 1 - smooth(0.1, 0.42, p);
        c.fades.forEach(function (f) { f.style.opacity = hf.toFixed(3); f.style.transform = ''; });
      }
      if (i === 1 && c.fades.length) {
        /* the bright chapter: fan the covers with focus */
        var fan = 0.3 + smooth(0.15, 0.7, vis);
        for (var k = 0; k < covers.length; k++) {
          var off = k - (covers.length - 1) / 2;
          var ry = off * 9 * fan;
          var lift = -smooth(0.15, 0.8, vis) * 20;
          covers[k].style.opacity = smooth(0.1, 0.5, vis).toFixed(3);
          covers[k].style.transform = 'translateY(' + (lift + (k % 2 ? 10 : 0)).toFixed(1) + 'px) rotateY(' + ry.toFixed(2) + 'deg) rotateX(6deg)';
        }
      }
      if (vis > bestVis) { bestVis = vis; bestIdx = i; }
    }

    if (bestIdx !== active) {
      active = bestIdx;
      if (countEl) countEl.textContent = COUNTER[active];
      CHIPS.forEach(function (b) { b.classList.toggle('on', chapters[active] && b.dataset.go === chapters[active].el.id); });
      document.body.classList.toggle('light-ch', active === 1);
    }

    /* boundary flashes */
    if (flashEl) {
      var o = 0, tint = '';
      for (var b = 1; b < chapters.length; b++) {
        var boundary = chapters[b].top;
        var d = Math.abs(y - boundary);
        if (d < 130) {
          var k2 = Math.pow(1 - d / 130, 2.1) * 0.9;
          if (k2 > o) { o = k2; tint = FLASH[b]; }
        }
      }
      flashEl.style.opacity = o.toFixed(3);
      if (tint && flashEl.style.background !== tint) flashEl.style.background = tint;
    }
  }
  frame();

  CHIPS.forEach(function (b) {
    b.addEventListener('click', function () {
      var t = document.getElementById(b.dataset.go);
      if (t) t.scrollIntoView({ behavior: reduced ? 'auto' : 'smooth', block: 'start' });
    });
  });
  window.addEventListener('resize', function () { measure(); });

  /* ══════════ GL: hero + dust ════════════════════════════ */
  var canvas = document.getElementById('jgl');
  var potato = false;
  try {
    var probe = document.createElement('canvas');
    var pctx = probe.getContext('webgl') || probe.getContext('experimental-webgl');
    var dbg = pctx && pctx.getExtension('WEBGL_debug_renderer_info');
    var gpu = dbg ? String(pctx.getParameter(dbg.UNMASKED_RENDERER_WEBGL) || '') : '';
    var mem = navigator.deviceMemory || 8, cores = navigator.hardwareConcurrency || 8;
    potato = /(SwiftShader|llvmpipe|softpipe|VideoCore|Mali-[0-9T]|Mali-G[0-3][0-9]|Adreno\s?(\(TM\))?\s?[234]|PowerVR)/i.test(gpu) || (mem <= 2 && cores <= 4);
  } catch (e) { /* detection failed → try GL */ }

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
      var camera = new THREE.PerspectiveCamera(52, window.innerWidth / window.innerHeight, 0.1, 120);
      camera.position.set(0, 1.2, 9);

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

      /* ── the grid floor (recedes on scroll) ── */
      var heroGrid = (function () {
        var geo = new THREE.PlaneGeometry(80, 80, 56, 56);
        var pos = geo.attributes.position;
        for (var i = 0; i < pos.count; i++) {
          var x = pos.getX(i), yy = pos.getY(i);
          var d2 = (x * x) / 210 + Math.pow(yy - 6, 2) / 130;
          pos.setZ(i, 9.5 * Math.exp(-d2) + Math.random() * 0.12);
        }
        var mat = new THREE.MeshBasicMaterial({ color: 0xe8e4da, wireframe: true, transparent: true, opacity: 0.4 });
        var m = new THREE.Mesh(geo, mat);
        m.rotation.x = -Math.PI / 2;
        m.position.set(0, -2.1, 4);
        return m;
      })();
      scene.add(heroGrid);

      /* ── the portrait, rebuilt as glowing points (#17 technique) ── */
      var portrait = new THREE.Group();
      var pMat = null, basePos = null, scatterVec = null, pCount = 0;
      (function buildPortrait() {
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
          pCount = pts.length / 3;
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
          pMat = new THREE.PointsMaterial({
            size: 0.055, map: sprite, vertexColors: true, transparent: true,
            depthWrite: false, blending: THREE.AdditiveBlending, sizeAttenuation: true
          });
          portrait.add(new THREE.Points(geo, pMat));
          setFill(0.8);
        };
        img.src = 'assets/portrait-masked.png';
      })();
      scene.add(portrait);

      /* ── chapter dust ── */
      var N = coarse ? 90 : 170;
      var dpos = new Float32Array(N * 3), spd = new Float32Array(N), ph = new Float32Array(N);
      for (var i = 0; i < N; i++) {
        dpos[i * 3] = (Math.random() - 0.5) * 22;
        dpos[i * 3 + 1] = (Math.random() - 0.5) * 13;
        dpos[i * 3 + 2] = -2 + Math.random() * 11;
        spd[i] = 0.1 + Math.random() * 0.24;
        ph[i] = Math.random() * Math.PI * 2;
      }
      var dGeo = new THREE.BufferGeometry();
      dGeo.setAttribute('position', new THREE.BufferAttribute(dpos, 3));
      var dMat = new THREE.PointsMaterial({
        size: 0.14, map: sprite, transparent: true, opacity: 0.8,
        depthWrite: false, blending: THREE.AdditiveBlending, color: 0xe8e4da
      });
      var dust = new THREE.Points(dGeo, dMat);
      scene.add(dust);

      var curCol = new THREE.Color(0xe8e4da);
      var curOp = 0.8;
      var camZ = 9, camY = 1.2, camLookY = 0.9;
      var lastLite = 0, glPaused = false;
      document.addEventListener('visibilitychange', function () { glPaused = document.hidden; });

      var tPrev = performance.now() / 1000;
      function glTick() {
        requestAnimationFrame(glTick);
        var t = performance.now() / 1000;
        if (glPaused) { tPrev = t; return; }
        if (coarse && t - lastLite < 0.033) return;
        lastLite = t;
        var dt = Math.min(0.05, t - tPrev); tPrev = t;

        /* hero progress */
        var hero = chapters[0];
        var p0 = hero.el ? clamp01(window.scrollY / Math.max(1, hero.h - vh)) : 1;
        var heroVis = clamp01(1 - p0 * 1.6);

        /* grid recedes */
        heroGrid.visible = heroVis > 0.02;
        if (heroGrid.visible) {
          heroGrid.material.opacity = 0.42 * heroVis;
          heroGrid.position.z = 4 + p0 * 30;
          heroGrid.position.y = -2.1 - p0 * 3;
        }
        /* portrait: drift + scatter + dissolve */
        portrait.visible = heroVis > 0.02;
        if (portrait.visible) {
          portrait.position.y = Math.sin(t * 0.6) * 0.17 * (1 - p0);
          portrait.rotation.y = mx * 0.14 + Math.sin(t * 0.32) * 0.055;
          portrait.rotation.x = my * 0.06;
          if (pMat) {
            pMat.opacity = 1 - smooth(0.42, 0.92, p0);
            pMat.size = 0.055 + smooth(0.1, 1, p0) * 0.05;
          }
          if (basePos && p0 > 0.02 && p0 < 1) {
            var sAmt = easeIO(p0) * 1.25;
            var arr = portrait.children[0].geometry.attributes.position.array;
            for (var i3 = 0; i3 < basePos.length; i3++) arr[i3] = basePos[i3] + scatterVec[i3] * sAmt;
            portrait.children[0].geometry.attributes.position.needsUpdate = true;
          }
          camZ += ((9 + p0 * 6) - camZ) * 0.08;
          camY += ((1.2 - p0 * 0.6) - camY) * 0.08;
          camLookY += (0.9 - camLookY) * 0.08;
        } else {
          camZ += (9 - camZ) * 0.05;
          camY += (0 - camY) * 0.05;
          camLookY += (0 - camLookY) * 0.05;
        }
        camera.position.z = camZ;
        camera.position.y = camY;

        /* dust: chapter color + opacity */
        curCol.lerp(new THREE.Color(DUST_COL[active] || 0xffffff), 0.05);
        dMat.color.copy(curCol);
        curOp += ((DUST_OP[active] || 0) - curOp) * 0.06;
        dMat.opacity = curOp;
        if (!reduced && curOp > 0.03) {
          var dp = dGeo.attributes.position;
          for (var i4 = 0; i4 < N; i4++) {
            var yy = dp.getY(i4) + spd[i4] * dt;
            if (yy > 7.2) { yy = -7.2; dp.setX(i4, (Math.random() - 0.5) * 22); }
            dp.setY(i4, yy);
            dp.setX(i4, dp.getX(i4) + Math.sin(t * 0.7 + ph[i4]) * 0.0028);
          }
          dp.needsUpdate = true;
        }
        camera.position.x += (mx * 0.7 - camera.position.x) * 0.05;
        camera.lookAt(0, camLookY, 0);
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
    docEl.classList.add('no-gl');   /* hero shows the static scan plate instead */
  }

  /* ══════════ lightbox ════════════════════════════════════ */
  var player = document.getElementById('jPlayer');
  var jpVideo = document.getElementById('jpVideo');
  var jpTitle = document.getElementById('jpTitle');
  function openFilm(src, title) {
    if (!player || !jpVideo) return;
    jpVideo.src = src;
    if (jpTitle) jpTitle.textContent = (title || 'FILM').toUpperCase();
    player.classList.add('on'); player.setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden';
    window.setTimeout(function () { jpVideo.play().catch(function () {}); }, 90);
  }
  function closeFilm() {
    if (!player) return;
    jpVideo.pause(); player.classList.remove('on'); player.setAttribute('aria-hidden', 'true');
    document.body.style.overflow = '';
  }
  Array.prototype.forEach.call(document.querySelectorAll('[data-src]'), function (btn) {
    btn.addEventListener('click', function () { openFilm(btn.dataset.src, btn.dataset.title); });
  });
  var jpClose = document.getElementById('jpClose');
  if (jpClose) jpClose.addEventListener('click', closeFilm);
  if (player) player.addEventListener('click', function (e) { if (e.target === player) closeFilm(); });
  window.addEventListener('keydown', function (e) { if (e.key === 'Escape') closeFilm(); });
})();
