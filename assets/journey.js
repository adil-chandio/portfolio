/* ============================================================
   THE SCROLL v3 — REAL 3D WORLD
   One continuous three.js corridor: the camera physically flies
   through built geometry — grid hero → (white gap) → machine
   tunnel → blue corridor → (study) → red alley.
   All unlit MeshBasic + fog + instancing = cheap, no lag.
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
  window.setTimeout(done, 3600);

  /* ── chapters ───────────────────────────────────────────── */
  var vh = window.innerHeight;
  var IDS = ['ch0', 'ch1', 'ch2', 'ch3', 'ch4', 'ch5'];
  var COUNTER = ['00 / 05', '01 / 05', '02 / 05', '03 / 05', '04 / 05', '05 / 05'];
  var FLASH = ['', '#ffffff', '#cfe6ff', '#d5e4ff', '#ffd9a8', '#ff5a3d'];
  var DUST_COL = [0xe8e4da, 0x000000, 0x3dff8a, 0x8fc0ff, 0xffc36b, 0xff4530];
  var DUST_OP = [0.7, 0, 0.6, 0.55, 0.5, 0.8];
  /* camera segments: [zStart, zEnd, y, lookY, fogNear, fogFar, clearColor] */
  var SEG = [
    [10, 16, 1.2, 0.9, 7, 70, 0x050507],      /* hero: pull-back, portrait dissolves */
    [0, 0, 0, 0, 7, 70, 0x050507],            /* white gap: canvas hidden */
    [-85, -170, 1.7, 1.9, 6, 64, 0x04070a],   /* machine tunnel */
    [-215, -296, 2.4, 2.2, 8, 72, 0x0a1322],  /* blue corridor */
    [-330, -336, 0, 0, 7, 70, 0x000000],      /* study: transparent (plate behind), dust only */
    [-385, -444, 1.8, 2.0, 5, 58, 0x170404]   /* red alley */
  ];
  var CANVAS_ALPHA = [1, 1, 1, 1, 0, 1];      /* chapter 5 (index 4) transparent over plate */

  var chapters = IDS.map(function (id, i) {
    var el = document.getElementById(id);
    return {
      el: el, i: i,
      bg: el ? el.querySelector('.j-bg') : null,
      fades: el ? Array.prototype.slice.call(el.querySelectorAll('.j-fade')) : [],
      top: 0, h: 0, p: 0
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
  var covers = Array.prototype.slice.call(document.querySelectorAll('.j-cover'));

  function frame() {
    requestAnimationFrame(frame);
    var y = window.scrollY || window.pageYOffset || 0;
    var docH = Math.max(document.body.scrollHeight, docEl.scrollHeight) - vh;
    if (progEl) progEl.style.transform = 'scaleX(' + (docH > 0 ? (y / docH).toFixed(4) : 0) + ')';

    var bestVis = -1, bestIdx = 0;
    for (var i = 0; i < chapters.length; i++) {
      var c = chapters[i]; if (!c.el) continue;
      c.p = clamp01((y - c.top) / Math.max(1, c.h - vh));
      var centerOffset = (c.top + c.h / 2) - (y + vh / 2);
      var vis = clamp01(1 - Math.abs(centerOffset) / (vh * 0.78));
      var v = view[i];
      /* plate parallax (only chapters that keep a CSS plate: hero-fallback + study) */
      if (c.bg) {
        var targetS = 1.24 - smooth(0.05, 0.85, vis) * 0.18;
        var targetX = (centerOffset / vh) * 3.2 - mx * 1.1;
        var targetY = -(my * 0.9);
        v.s += (targetS - v.s) * (reduced ? 1 : 0.085);
        v.x += (targetX - v.x) * (reduced ? 1 : 0.075);
        v.y += (targetY - v.y) * (reduced ? 1 : 0.075);
        c.bg.style.transform = 'scale(' + v.s.toFixed(4) + ') translate3d(' + v.x.toFixed(2) + '%,' + v.y.toFixed(2) + '%,0)';
      }
      var fade = smooth(0.1, 0.45, vis) * (1 - smooth(0.86, 1.0, vis) * 0.4);
      for (var j = 0; j < c.fades.length; j++) {
        c.fades[j].style.opacity = fade.toFixed(3);
        c.fades[j].style.transform = 'translateY(' + ((1 - fade) * 26).toFixed(1) + 'px)';
      }
      if (i === 0) {
        var hf = 1 - smooth(0.08, 0.38, c.p);
        c.fades.forEach(function (f) { f.style.opacity = hf.toFixed(3); f.style.transform = ''; });
      }
      if (i === 1) {
        var fan = 0.3 + smooth(0.15, 0.7, vis);
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
      if (countEl) countEl.textContent = COUNTER[active];
      CHIPS.forEach(function (b) { b.classList.toggle('on', chapters[active] && b.dataset.go === chapters[active].el.id); });
      document.body.classList.toggle('light-ch', active === 1);
    }

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

  /* ══════════ THE 3D WORLD ═══════════════════════════════ */
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

      var scene = new THREE.Scene();
      scene.fog = new THREE.Fog(0x050507, 7, 70);
      var camera = new THREE.PerspectiveCamera(55, window.innerWidth / window.innerHeight, 0.1, 140);
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

      function gridTex() {
        var c = document.createElement('canvas'); c.width = c.height = 256;
        var g = c.getContext('2d');
        g.fillStyle = '#07080a'; g.fillRect(0, 0, 256, 256);
        g.strokeStyle = 'rgba(150,160,175,0.28)'; g.lineWidth = 1;
        for (var i = 0; i <= 256; i += 32) {
          g.beginPath(); g.moveTo(i + .5, 0); g.lineTo(i + .5, 256); g.stroke();
          g.beginPath(); g.moveTo(0, i + .5); g.lineTo(256, i + .5); g.stroke();
        }
        var t = new THREE.CanvasTexture(c);
        t.wrapS = t.wrapT = THREE.RepeatWrapping;
        return t;
      }

      function plane(w, h, color, x, y, z, rx, ry, opacity) {
        var m = new THREE.Mesh(
          new THREE.PlaneGeometry(w, h),
          new THREE.MeshBasicMaterial({ color: color, transparent: opacity !== undefined, opacity: opacity === undefined ? 1 : opacity, side: THREE.DoubleSide })
        );
        m.position.set(x, y, z);
        if (rx) m.rotation.x = rx;
        if (ry) m.rotation.y = ry;
        return m;
      }
      /* instanced boxes: arr of [x,y,z, sx,sy,sz, ry] */
      function inst(geo, color, arr, opacity) {
        var im = new THREE.InstancedMesh(geo, new THREE.MeshBasicMaterial({ color: color, transparent: opacity !== undefined, opacity: opacity === undefined ? 1 : opacity }), arr.length);
        var M = new THREE.Matrix4(), Q = new THREE.Quaternion(), S = new THREE.Vector3(), P = new THREE.Vector3(), E = new THREE.Euler();
        for (var i = 0; i < arr.length; i++) {
          var a = arr[i];
          P.set(a[0], a[1], a[2]); S.set(a[3] || 1, a[4] || 1, a[5] || 1);
          Q.setFromEuler(E.set(0, a[6] || 0, 0));
          M.compose(P, Q, S);
          im.setMatrixAt(i, M);
        }
        im.instanceMatrix.needsUpdate = true;
        im.frustumCulled = false;
        return im;
      }

      /* ══ ZONE 0 — HERO: grid + point-cloud portrait ══ */
      var heroGrid = (function () {
        var geo = new THREE.PlaneGeometry(80, 80, 56, 56);
        var pos = geo.attributes.position;
        for (var i = 0; i < pos.count; i++) {
          var x = pos.getX(i), yy = pos.getY(i);
          var d2 = (x * x) / 210 + Math.pow(yy - 6, 2) / 130;
          pos.setZ(i, 9.5 * Math.exp(-d2) + Math.random() * 0.12);
        }
        var m = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ color: 0xdfe3ea, wireframe: true, transparent: true, opacity: 0.38 }));
        m.rotation.x = -Math.PI / 2;
        m.position.set(0, -2.1, -14);
        return m;
      })();
      scene.add(heroGrid);

      var portrait = new THREE.Group();
      var pMat = null, basePos = null, scatterVec = null;
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
          setFill(0.8);
        };
        img.src = 'assets/portrait-masked.png';
      })();
      scene.add(portrait);

      /* ══ ZONE 2 — MACHINE TUNNEL (z -90 → -172) ══ */
      (function () {
        var gt = gridTex(); gt.repeat.set(2, 24);
        var floor = new THREE.Mesh(new THREE.PlaneGeometry(15, 92), new THREE.MeshBasicMaterial({ map: gt, color: 0xffffff, transparent: true, opacity: 0.85 }));
        floor.rotation.x = -Math.PI / 2; floor.position.set(0, 0, -131);
        scene.add(floor);
        scene.add(plane(15, 92, 0x08090c, 0, 9.6, -131, Math.PI / 2, 0));
        scene.add(plane(0.5, 92, 0x16181d, -5.3, 0.28, -131));   /* rails */
        scene.add(plane(0.5, 92, 0x16181d, 5.3, 0.28, -131));
        var posts = [], arms = [], lights = [], slabs = [];
        for (var s = -1; s <= 1; s += 2) {
          for (var z = -94; z >= -169; z -= 4.6) {
            posts.push([s * 5.3, 1.3, z, 0.55, 2.6, 0.55]);
            arms.push([s * 4.35, 2.62, z, 2.5, 0.34, 0.34, s * 0.12]);
            lights.push([s * 3.2, 2.44, z, 0.3, 0.22, 0.3]);
            if (z % 9.2 === 0) slabs.push([s * 7.9, 3.4, z, 1.4, 6.8, 8.4]);
          }
        }
        scene.add(inst(new THREE.BoxGeometry(1, 1, 1), 0xc9ced8, posts));
        scene.add(inst(new THREE.BoxGeometry(1, 1, 1), 0x9aa1ad, arms));
        scene.add(inst(new THREE.BoxGeometry(1, 1, 1), 0x35ff7a, lights));
        scene.add(inst(new THREE.BoxGeometry(1, 1, 1), 0x0d0f14, slabs));
        /* far focal glow */
        var glow = new THREE.Sprite(new THREE.SpriteMaterial({ map: sprite, color: 0xbfe8ff, transparent: true, opacity: 0.55, blending: THREE.AdditiveBlending, depthWrite: false }));
        glow.scale.set(14, 8, 1); glow.position.set(0, 3, -172);
        scene.add(glow);
      })();

      /* ══ ZONE 3 — BLUE CORRIDOR (z -210 → -300) ══ */
      (function () {
        var g2 = gridTex(); g2.repeat.set(4, 22);
        var ground = new THREE.Mesh(new THREE.PlaneGeometry(34, 104), new THREE.MeshBasicMaterial({ map: g2, color: 0x2a3648, transparent: true, opacity: 0.7 }));
        ground.rotation.x = -Math.PI / 2; ground.position.set(0, 0, -255);
        scene.add(ground);
        var bld = [], win = [];
        for (var s = -1; s <= 1; s += 2) {
          for (var z = -212; z >= -298; z -= 8) {
            var hgt = 5 + Math.random() * 8;
            bld.push([s * 11, hgt / 2, z, 9, hgt, 7]);
            var wn = 2 + Math.floor(Math.random() * 3);
            for (var wi = 0; wi < wn; wi++) {
              win.push([s * 6.62, 1.6 + Math.random() * (hgt - 2.4), z - 2.5 + Math.random() * 5, 0.55, 0.8]);
            }
          }
        }
        scene.add(inst(new THREE.BoxGeometry(1, 1, 1), 0x141e2c, bld));
        scene.add(inst(new THREE.BoxGeometry(1, 1, 1), 0xffb066, win, 0.9));
        var shaft = plane(1.8, 11, 0xcfe6ff, 0, 4.6, -299, 0, 0, 0.32);
        scene.add(shaft);
        var glow2 = new THREE.Sprite(new THREE.SpriteMaterial({ map: sprite, color: 0xdceeff, transparent: true, opacity: 0.85, blending: THREE.AdditiveBlending, depthWrite: false }));
        glow2.scale.set(16, 12, 1); glow2.position.set(0, 4.4, -300);
        scene.add(glow2);
      })();

      /* ══ ZONE 5 — RED ALLEY (z -385 → -455) ══ */
      (function () {
        var g3 = gridTex(); g3.repeat.set(3, 20);
        var ground = new THREE.Mesh(new THREE.PlaneGeometry(17, 82), new THREE.MeshBasicMaterial({ map: g3, color: 0x38130e, transparent: true, opacity: 0.8 }));
        ground.rotation.x = -Math.PI / 2; ground.position.set(0, 0, -420);
        scene.add(ground);
        var walls = [], shut = [], lant = [], wires = [], lantPos = [];
        for (var s = -1; s <= 1; s += 2) {
          for (var z = -388; z >= -448; z -= 4.6) {
            walls.push([s * 5.5, 2.9, z, 6, 5.8, 4.4]);
            if (Math.random() < 0.75) shut.push([s * 2.45, 1.4 + Math.random() * 1.2, z - 0.8 + Math.random() * 1.6, 1.5, 3.2, 0.14]);
          }
        }
        for (var lz = -387; lz >= -444; lz -= 3.4) {
          for (var s2 = -1; s2 <= 1; s2 += 2) {
            if ((Math.round(lz) % 2 === 0) !== (s2 > 0)) { lant.push([s2 * 2.0, 3.6, lz, 0.34, 0.42, 0.34]); lantPos.push(s2 * 2.0, 3.6, lz); }
          }
          wires.push([0, 4.15, lz, 4.0, 0.05, 0.05]);
        }
        scene.add(inst(new THREE.BoxGeometry(1, 1, 1), 0x2b0d09, walls));
        scene.add(inst(new THREE.BoxGeometry(1, 1, 1), 0x180704, shut));
        scene.add(inst(new THREE.BoxGeometry(1, 1, 1), 0xffc06a, lant));
        scene.add(inst(new THREE.BoxGeometry(1, 1, 1), 0x0d0503, wires));
        /* lantern glow points */
        var lg = new THREE.BufferGeometry();
        lg.setAttribute('position', new THREE.BufferAttribute(new Float32Array(lantPos), 3));
        scene.add(new THREE.Points(lg, new THREE.PointsMaterial({ size: 2.4, map: sprite, color: 0xff8a3d, transparent: true, opacity: 0.75, depthWrite: false, blending: THREE.AdditiveBlending })));
        /* far focal: warm light at the end of the alley */
        var glow3 = new THREE.Sprite(new THREE.SpriteMaterial({ map: sprite, color: 0xff6a3a, transparent: true, opacity: 0.9, blending: THREE.AdditiveBlending, depthWrite: false }));
        glow3.scale.set(15, 10, 1); glow3.position.set(0, 2.6, -452);
        scene.add(glow3);
        scene.add(plane(5, 2.2, 0xff4526, 0, 0.15, -447, -Math.PI / 2, 0, 0.4));
      })();

      /* ══ DUST (follows the camera) ══ */
      var N = coarse ? 80 : 150;
      var dpos = new Float32Array(N * 3), spd = new Float32Array(N), ph = new Float32Array(N);
      for (var i = 0; i < N; i++) {
        dpos[i * 3] = (Math.random() - 0.5) * 20;
        dpos[i * 3 + 1] = (Math.random() - 0.5) * 12;
        dpos[i * 3 + 2] = -10 + Math.random() * 16;
        spd[i] = 0.1 + Math.random() * 0.22;
        ph[i] = Math.random() * Math.PI * 2;
      }
      var dGeo = new THREE.BufferGeometry();
      dGeo.setAttribute('position', new THREE.BufferAttribute(dpos, 3));
      var dMat = new THREE.PointsMaterial({ size: 0.13, map: sprite, transparent: true, opacity: 0.7, depthWrite: false, blending: THREE.AdditiveBlending, color: 0xe8e4da });
      var dust = new THREE.Points(dGeo, dMat);
      camera.add(dust);

      /* ══ main loop ══ */
      var curFogCol = new THREE.Color(0x050507);
      var curClear = new THREE.Color(0x050507);
      var curAlpha = 1, curOp = 0.7;
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

        var seg = SEG[active];
        var p = chapters[active].p || 0;
        var e = easeIO(p);
        var camZ = seg[0] + (seg[1] - seg[0]) * e;
        var camY = seg[2] + (reduced ? 0 : Math.sin(t * 0.5) * 0.05);

        /* hero dissolves as its chapter progresses */
        var p0 = chapters[0].p || 0;
        var heroVis = clamp01(1 - p0 * 1.7);
        heroGrid.visible = heroVis > 0.02 && active === 0;
        if (heroGrid.visible) heroGrid.material.opacity = 0.38 * heroVis;
        portrait.visible = heroVis > 0.02 && active === 0;
        if (portrait.visible) {
          portrait.position.y = Math.sin(t * 0.6) * 0.17 * (1 - p0);
          portrait.rotation.y = mx * 0.14 + Math.sin(t * 0.32) * 0.055;
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

        /* camera */
        camera.position.x += (mx * 0.7 - camera.position.x) * 0.05;
        camera.position.y = camY;
        camera.position.z = camZ;
        var lookZ = active === 0 ? 0 : camZ - 9;
        camera.lookAt(active === 0 ? 0 : camera.position.x * 0.3, active === 0 ? 0.9 : seg[3], lookZ);

        /* fog + clear color drift toward the active zone */
        curFogCol.lerp(new THREE.Color(seg[6]), 0.07);
        scene.fog.color.copy(curFogCol);
        scene.fog.near = scene.fog.near + (seg[4] - scene.fog.near) * 0.07;
        scene.fog.far = scene.fog.far + (seg[5] - scene.fog.far) * 0.07;
        curClear.lerp(new THREE.Color(seg[6]), 0.07);
        curAlpha += (CANVAS_ALPHA[active] - curAlpha) * 0.08;
        renderer.setClearColor(curClear, curAlpha);

        /* white chapter: hide the canvas entirely (DOM white takes over) */
        canvas.style.visibility = (active === 1) ? 'hidden' : 'visible';

        /* dust: chapter color */
        dMat.color.lerp(new THREE.Color(DUST_COL[active]), 0.06);
        curOp += ((DUST_OP[active]) - curOp) * 0.06;
        dMat.opacity = curOp;
        if (!reduced && curOp > 0.03) {
          var dp = dGeo.attributes.position;
          for (var i4 = 0; i4 < N; i4++) {
            var zz = dp.getZ(i4) - 2.4 * dt;
            if (zz < -10) zz = 6;
            dp.setZ(i4, zz);
            dp.setX(i4, dp.getX(i4) + Math.sin(t * 0.7 + ph[i4]) * 0.0026);
          }
          dp.needsUpdate = true;
        }
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
