/* ============================================================
   THE SCROLL — MONARCH cinematic corridor
   Plates are CSS (compositor-cheap). WebGL adds the dust —
   amber → icy → phosphor → candle — plus camera-grade easing.
   Potato guard: no GL → plates + copy still perfect.
   ============================================================ */
(function () {
  'use strict';

  var reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var coarse = window.matchMedia('(pointer: coarse)').matches || window.innerWidth < 760;
  var docEl = document.documentElement;

  /* ── loader ─────────────────────────────────────────────── */
  var loader = document.getElementById('jLoader');
  var fill = document.getElementById('jldFill');
  var prog = 0.12, loadDone = false;
  function setFill(p) { prog = Math.max(prog, p); if (fill) fill.style.width = Math.round(Math.min(1, prog) * 100) + '%'; }
  function done() {
    if (loadDone) return; loadDone = true;
    setFill(1);
    if (loader) loader.classList.add('done');
    window.setTimeout(function () { if (loader && loader.parentNode) loader.parentNode.removeChild(loader); }, 1000);
  }
  setFill(0.3);
  window.addEventListener('load', function () { window.setTimeout(done, 300); });
  window.setTimeout(done, 3200);

  /* ── chapters ─────────────────────────────────────────────── */
  var vh = window.innerHeight;
  var sections = ['ch1', 'ch2', 'ch3', 'ch4'].map(function (id) { return document.getElementById(id); });
  var chapters = sections.map(function (sec, i) {
    return {
      el: sec, i: i,
      bg: sec ? sec.querySelector('.j-bg') : null,
      fades: sec ? Array.prototype.slice.call(sec.querySelectorAll('.j-fade')) : [],
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

  var TINTS = ['#ffd9c2', '#dceaff', '#c9ffd9', '#ffe3b0'];
  var CHIPS = Array.prototype.slice.call(document.querySelectorAll('.j-chip'));
  var countEl = document.getElementById('jCount');
  var progEl = document.getElementById('jProg');
  var flashEl = document.getElementById('jFlash');
  var FLASH_TINT = ['', '#dfe9ff', '#c9ffd9', '#ffd9a8'];   /* flash entering 2/3/4 */

  function clamp01(v) { return v < 0 ? 0 : v > 1 ? 1 : v; }
  function smooth(a, b, v) { var t = clamp01((v - a) / (b - a)); return t * t * (3 - 2 * t); }

  var active = 0;
  var mx = 0, my = 0;
  window.addEventListener('mousemove', function (e) {
    mx = (e.clientX / window.innerWidth) * 2 - 1;
    my = (e.clientY / window.innerHeight) * 2 - 1;
  }, { passive: true });

  /* per-frame lerped state for butter motion */
  var view = chapters.map(function () { return { s: 1.18, x: 0, y: 0 }; });

  function frame() {
    requestAnimationFrame(frame);
    var y = window.scrollY || window.pageYOffset || 0;
    var docH = Math.max(document.body.scrollHeight, docEl.scrollHeight) - vh;
    if (progEl) progEl.style.transform = 'scaleX(' + (docH > 0 ? y / docH : 0) + ')';

    var bestVis = -1, bestIdx = 0;
    for (var i = 0; i < chapters.length; i++) {
      var c = chapters[i]; if (!c.el) continue;
      var centerOffset = (c.top + c.h / 2) - (y + vh / 2);         /* px from viewport center */
      var vis = clamp01(1 - Math.abs(centerOffset) / (vh * 0.78)); /* 1 dead centre → 0 at edges */
      var v = view[i];
      var targetS = 1.18 - smooth(0.05, 0.85, vis) * 0.16;         /* dolly-in at focus */
      var targetX = (centerOffset / vh) * 3.2 - mx * 1.1;
      var targetY = -(my * 0.9);
      v.s += (targetS - v.s) * (reduced ? 1 : 0.085);
      v.x += (targetX - v.x) * (reduced ? 1 : 0.075);
      v.y += (targetY - v.y) * (reduced ? 1 : 0.075);
      if (c.bg) c.bg.style.transform = 'scale(' + v.s.toFixed(4) + ') translate3d(' + v.x.toFixed(2) + '%,' + v.y.toFixed(2) + '%,0)';
      /* copy fades with approach to focus */
      var fade = smooth(0.14, 0.5, vis) * (1 - smooth(0.82, 0.99, vis) * 0.35);
      for (var j = 0; j < c.fades.length; j++) {
        c.fades[j].style.opacity = fade.toFixed(3);
        c.fades[j].style.transform = 'translateY(' + ((1 - fade) * 26).toFixed(1) + 'px)';
      }
      if (vis > bestVis) { bestVis = vis; bestIdx = i; }
    }

    /* chapter counter + chips */
    if (bestIdx !== active) {
      active = bestIdx;
      if (countEl) countEl.textContent = ('0' + (active + 1)).slice(-2) + ' / 04';
      CHIPS.forEach(function (b) { b.classList.toggle('on', chapters[active] && b.dataset.go === chapters[active].el.id); });
    }

    /* boundary flashes — white rush entering each new room */
    if (flashEl) {
      var o = 0, tint = '';
      for (var b = 1; b < chapters.length; b++) {
        var boundary = chapters[b].top;
        var d = Math.abs(y - boundary);
        if (d < 130) {
          var k = Math.pow(1 - d / 130, 2.1) * 0.88;
          if (k > o) { o = k; tint = FLASH_TINT[b]; }
        }
      }
      flashEl.style.opacity = o.toFixed(3);
      if (tint && flashEl.style.background !== tint) flashEl.style.background = tint;
    }
  }
  frame();

  /* chips jump */
  CHIPS.forEach(function (b) {
    b.addEventListener('click', function () {
      var target = document.getElementById(b.dataset.go);
      if (target) target.scrollIntoView({ behavior: reduced ? 'auto' : 'smooth', block: 'start' });
    });
  });

  window.addEventListener('resize', function () { measure(); });

  /* ══════════ particles — the dust of each room ══════════ */
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
      var DPR = coarse ? 1.15 : 1.5;
      renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, DPR));
      renderer.setSize(window.innerWidth, window.innerHeight);
      renderer.setClearColor(0x000000, 0);

      var scene = new THREE.Scene();
      var camera = new THREE.PerspectiveCamera(52, window.innerWidth / window.innerHeight, 0.1, 60);
      camera.position.set(0, 0, 9);

      function mote() {
        var c = document.createElement('canvas'); c.width = c.height = 64;
        var g = c.getContext('2d');
        var grad = g.createRadialGradient(32, 32, 0, 32, 32, 32);
        grad.addColorStop(0, 'rgba(255,255,255,1)');
        grad.addColorStop(0.4, 'rgba(255,255,255,.7)');
        grad.addColorStop(1, 'rgba(255,255,255,0)');
        g.fillStyle = grad; g.fillRect(0, 0, 64, 64);
        return new THREE.CanvasTexture(c);
      }
      var sprite = mote();

      var N = coarse ? 90 : 170;
      var pos = new Float32Array(N * 3);
      var spd = new Float32Array(N);
      var ph = new Float32Array(N);
      for (var i = 0; i < N; i++) {
        pos[i * 3] = (Math.random() - 0.5) * 22;
        pos[i * 3 + 1] = (Math.random() - 0.5) * 13;
        pos[i * 3 + 2] = -2 + Math.random() * 11;
        spd[i] = 0.1 + Math.random() * 0.24;
        ph[i] = Math.random() * Math.PI * 2;
      }
      var pGeo = new THREE.BufferGeometry();
      pGeo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
      var pMat = new THREE.PointsMaterial({
        size: 0.14, map: sprite, transparent: true, opacity: 0.85,
        depthWrite: false, blending: THREE.AdditiveBlending, color: 0xffc9a0
      });
      var dust = new THREE.Points(pGeo, pMat);
      scene.add(dust);

      /* chapter-tinted motes, eased in the loop */
      var CH_COL = [new THREE.Color(1.0, 0.72, 0.42), new THREE.Color(0.72, 0.86, 1.0), new THREE.Color(0.38, 1.0, 0.6), new THREE.Color(1.0, 0.82, 0.5)];
      var curCol = new THREE.Color(1.0, 0.72, 0.42);
      var lastLite = 0;
      var glPaused = false;
      document.addEventListener('visibilitychange', function () { glPaused = document.hidden; });

      var tPrev = performance.now() / 1000;
      function glTick() {
        requestAnimationFrame(glTick);
        var t = performance.now() / 1000;
        if (glPaused) { tPrev = t; return; }
        if (coarse && t - lastLite < 0.033) return;
        lastLite = t;
        var dt = Math.min(0.05, t - tPrev); tPrev = t;

        var target = CH_COL[active] || CH_COL[0];
        curCol.lerp(target, 0.045);
        pMat.color.copy(curCol);

        if (!reduced) {
          var p = pGeo.attributes.position;
          for (var i = 0; i < N; i++) {
            var yy = p.getY(i) + spd[i] * dt;
            var xx = p.getX(i) + Math.sin(t * 0.7 + ph[i]) * 0.0028;
            if (yy > 7.2) { yy = -7.2; xx = (Math.random() - 0.5) * 22; }
            p.setY(i, yy); p.setX(i, xx);
          }
          p.needsUpdate = true;
        }
        camera.position.x += ((mx * 0.7) - camera.position.x) * 0.05;
        camera.position.y += ((-my * 0.5) - camera.position.y) * 0.05;
        camera.lookAt(0, 0, 0);
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
    canvas.style.display = 'none';   /* plates + copy carry the show */
  }

  /* ══════════ lightbox ════════════════════════════════════ */
  var player = document.getElementById('jPlayer');
  var jpVideo = document.getElementById('jpVideo');
  var jpTitle = document.getElementById('jpTitle');
  function openFilm(src, title, wide) {
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
  Array.prototype.forEach.call(document.querySelectorAll('.j-film[data-src]'), function (btn) {
    btn.addEventListener('click', function () { openFilm(btn.dataset.src, btn.dataset.title, btn.dataset.wide === '1'); });
  });
  var jpClose = document.getElementById('jpClose');
  if (jpClose) jpClose.addEventListener('click', closeFilm);
  if (player) player.addEventListener('click', function (e) { if (e.target === player) closeFilm(); });
  window.addEventListener('keydown', function (e) { if (e.key === 'Escape') closeFilm(); });
})();
