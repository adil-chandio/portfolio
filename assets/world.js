/* ============================================================
   MONARCH — WORLD v4 · THE CINEMATIC REBUILD
   Reference: dominikfojcik.com technique (unified GL chapters,
   paper-curl transitions, scroll-velocity fisheye, flash dive)
   — Adil's assets only. Structure-first. No blind passes.
   ============================================================ */
(function () {
  'use strict';

  var reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var glLoader = document.getElementById('glLoader');
  var fill = glLoader ? glLoader.querySelector('.ld-bar i') : null;
  function setProg(p) { if (fill) fill.style.width = Math.round(Math.min(1, p) * 100) + '%'; }
  function finishLoader() {
    if (!glLoader || glLoader.classList.contains('done')) return;
    setProg(1);
    glLoader.classList.add('done');
    window.setTimeout(function () { if (glLoader.parentNode) glLoader.parentNode.removeChild(glLoader); }, 1200);
  }
  function failSoft() { document.documentElement.classList.add('no-gl'); finishLoader(); }
  setProg(0.18);

  var canvas = document.getElementById('gl');
  if (!canvas || !window.THREE) { failSoft(); return; }

  var THREE = window.THREE;
  var renderer;
  try {
    renderer = new THREE.WebGLRenderer({ canvas: canvas, antialias: true, powerPreference: 'high-performance' });
  } catch (e) { failSoft(); return; }

  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setClearColor(0x060606, 1);
  setProg(0.4);

  var scene = new THREE.Scene();
  scene.fog = new THREE.Fog(0x060606, 13, 96);
  var camera = new THREE.PerspectiveCamera(56, window.innerWidth / window.innerHeight, 0.1, 400);
  camera.position.set(0, 1.72, 12);

  /* ── sprites & textures ────────────────────────────────────── */
  function makeSprite() {
    var c = document.createElement('canvas'); c.width = c.height = 64;
    var g = c.getContext('2d');
    var grad = g.createRadialGradient(32, 32, 0, 32, 32, 32);
    grad.addColorStop(0, 'rgba(255,255,255,1)');
    grad.addColorStop(0.38, 'rgba(255,255,255,.8)');
    grad.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = grad; g.fillRect(0, 0, 64, 64);
    return new THREE.CanvasTexture(c);
  }
  var sprite = makeSprite();

  function makeGridTex() {
    var c = document.createElement('canvas'); c.width = c.height = 512;
    var g = c.getContext('2d');
    g.fillStyle = '#050505'; g.fillRect(0, 0, 512, 512);
    g.strokeStyle = 'rgba(255,255,255,0.20)'; g.lineWidth = 1;
    for (var i = 0; i <= 512; i += 32) {
      g.beginPath(); g.moveTo(i + .5, 0); g.lineTo(i + .5, 512); g.stroke();
      g.beginPath(); g.moveTo(0, i + .5); g.lineTo(512, i + .5); g.stroke();
    }
    g.strokeStyle = 'rgba(255,255,255,0.55)'; g.lineWidth = 2;
    for (var j = 0; j <= 512; j += 128) {
      g.beginPath(); g.moveTo(j + .5, 0); g.lineTo(j + .5, 512); g.stroke();
      g.beginPath(); g.moveTo(0, j + .5); g.lineTo(512, j + .5); g.stroke();
    }
    var t = new THREE.CanvasTexture(c);
    t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(4, 64);
    return t;
  }
  function makePanelTex() {
    var c = document.createElement('canvas'); c.width = 512; c.height = 256;
    var g = c.getContext('2d');
    g.fillStyle = '#0b0b0f'; g.fillRect(0, 0, 512, 256);
    for (var x = 0; x < 512; x += 64) {
      g.fillStyle = '#0e0e14'; g.fillRect(x + 4, 12, 56, 232);
      g.fillStyle = 'rgba(255,255,255,0.05)'; g.fillRect(x + 4, 12, 2, 232);
      g.fillStyle = 'rgba(255,255,255,0.04)';
      for (var y = 42; y < 230; y += 34) g.fillRect(x + 14, y, 36, 3);
    }
    var t = new THREE.CanvasTexture(c);
    t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(36, 1);
    return t;
  }
  function makeChipTex() {
    var c = document.createElement('canvas'); c.width = 128; c.height = 160;
    var g = c.getContext('2d');
    g.fillStyle = '#0a130c'; g.fillRect(0, 0, 128, 160);
    g.strokeStyle = 'rgba(64,255,148,0.5)'; g.lineWidth = 1.4;
    for (var i = 0; i < 26; i++) {
      var x = 6 + Math.random() * 116, y = 6 + Math.random() * 148;
      g.beginPath(); g.moveTo(x, y);
      g.lineTo(x + (Math.random() - 0.5) * 70, y);
      g.lineTo(x + (Math.random() - 0.5) * 70, y + (Math.random() - 0.5) * 60);
      g.stroke();
    }
    g.fillStyle = '#123b22'; g.fillRect(40, 52, 48, 52);
    g.strokeStyle = 'rgba(120,255,180,0.85)'; g.strokeRect(40, 52, 48, 52);
    var t = new THREE.CanvasTexture(c); return t;
  }
  function makeWindowsTex() {
    var c = document.createElement('canvas'); c.width = 256; c.height = 512;
    var g = c.getContext('2d');
    g.fillStyle = '#04070f'; g.fillRect(0, 0, 256, 512);
    for (var y = 18; y < 500; y += 42) {
      for (var x = 12; x < 244; x += 34) {
        var r = Math.random();
        if (r < 0.30) g.fillStyle = 'rgba(150,195,255,0.95)';
        else if (r < 0.36) g.fillStyle = 'rgba(255,190,120,0.9)';
        else g.fillStyle = 'rgba(38,58,92,0.55)';
        g.fillRect(x, y, 22, 26);
      }
    }
    return new THREE.CanvasTexture(c);
  }
  function makePoolTex() {
    var c = document.createElement('canvas'); c.width = c.height = 128;
    var g = c.getContext('2d');
    var grad = g.createRadialGradient(64, 64, 4, 64, 64, 64);
    grad.addColorStop(0, 'rgba(255,235,205,0.9)');
    grad.addColorStop(0.5, 'rgba(255,225,190,0.28)');
    grad.addColorStop(1, 'rgba(255,225,190,0)');
    g.fillStyle = grad; g.fillRect(0, 0, 128, 128);
    return new THREE.CanvasTexture(c);
  }
  function makeConeTex() {
    var c = document.createElement('canvas'); c.width = 64; c.height = 256;
    var g = c.getContext('2d');
    var grad = g.createLinearGradient(0, 0, 0, 256);
    grad.addColorStop(0, 'rgba(255,255,255,0.55)');
    grad.addColorStop(0.75, 'rgba(255,255,255,0.06)');
    grad.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = grad; g.fillRect(0, 0, 64, 256);
    return new THREE.CanvasTexture(c);
  }
  /* typographic case posters — the reference's white screen style */
  function makePosterTex(lines, opts) {
    opts = opts || {};
    var c = document.createElement('canvas'); c.width = 512; c.height = 300;
    var g = c.getContext('2d');
    g.fillStyle = opts.bg || '#f2efe6'; g.fillRect(0, 0, 512, 300);
    g.fillStyle = opts.fg || '#101010';
    g.font = '800 64px Manrope, sans-serif';
    g.textBaseline = 'top';
    var y = 26;
    lines.forEach(function (ln, i) {
      g.font = (i === 0 ? '800 74px' : '800 34px') + ' Manrope, sans-serif';
      g.fillText(ln, 28, y);
      y += (i === 0 ? 88 : 46);
    });
    if (opts.accent) {
      g.fillStyle = opts.accent;
      g.fillRect(28, 262, 120, 14);
    }
    return new THREE.CanvasTexture(c);
  }

  /* ── corridor shell ──────────────────────────────────────────── */
  var corridor = new THREE.Group();
  var floorMat = new THREE.MeshBasicMaterial({ map: makeGridTex(), color: 0xffffff, transparent: true, opacity: 0.92 });
  var floor = new THREE.Mesh(new THREE.PlaneGeometry(16, 340), floorMat);
  floor.rotation.x = -Math.PI / 2; floor.position.set(0, 0, -100);
  corridor.add(floor);

  var wallMat = new THREE.MeshBasicMaterial({ map: makePanelTex(), color: 0x9d9da6 });
  var wallGeo = new THREE.PlaneGeometry(340, 7);
  var wallL = new THREE.Mesh(wallGeo, wallMat);
  wallL.rotation.y = Math.PI / 2; wallL.position.set(-7.6, 3.4, -100);
  var wallR = new THREE.Mesh(wallGeo, wallMat);
  wallR.rotation.y = -Math.PI / 2; wallR.position.set(7.6, 3.4, -100);
  corridor.add(wallL); corridor.add(wallR);

  var ceil = new THREE.Mesh(new THREE.PlaneGeometry(16, 340), new THREE.MeshBasicMaterial({ color: 0x030304 }));
  ceil.rotation.x = Math.PI / 2; ceil.position.set(0, 6.9, -100);
  corridor.add(ceil);

  var stripMat = new THREE.MeshBasicMaterial({ color: 0xff2b36 });
  var stripGeo = new THREE.BoxGeometry(0.12, 0.09, 330);
  [2.35, 4.7].forEach(function (y) {
    [-7.38, 7.38].forEach(function (x) {
      var s = new THREE.Mesh(stripGeo, stripMat);
      s.position.set(x, y, -100); corridor.add(s);
    });
  });

  var pillarMat = new THREE.MeshBasicMaterial({ color: 0x101016 });
  var pillarGeo = new THREE.BoxGeometry(0.7, 6.9, 0.7);
  for (var pz = 10; pz > -250; pz -= 15) {
    [-6.9, 6.9].forEach(function (x) {
      var p = new THREE.Mesh(pillarGeo, pillarMat);
      p.position.set(x, 3.45, pz); corridor.add(p);
    });
  }
  var benchMat = new THREE.MeshBasicMaterial({ color: 0x121218 });
  var benchLedMat = new THREE.MeshBasicMaterial({ color: 0xfff1d6 });
  var benchGeo = new THREE.BoxGeometry(3.4, 0.55, 1.15);
  var benchLedGeo = new THREE.BoxGeometry(0.08, 0.34, 1.0);
  [-46, -68, -90, -112].forEach(function (z) {
    var b = new THREE.Mesh(benchGeo, benchMat);
    b.position.set(0, 0.27, z); corridor.add(b);
    [-1.68, 1.68].forEach(function (x) {
      var led = new THREE.Mesh(benchLedGeo, benchLedMat);
      led.position.set(x, 0.27, z); corridor.add(led);
    });
  });
  /* spot cones — visible light shafts in the gallery */
  var coneTex = makeConeTex();
  var coneGeo = new THREE.ConeGeometry(2.4, 6.4, 18, 1, true);
  for (var cz = -38; cz >= -100; cz -= 14.2) {
    var cone = new THREE.Mesh(coneGeo, new THREE.MeshBasicMaterial({
      map: coneTex, transparent: true, opacity: 0.32, depthWrite: false,
      blending: THREE.AdditiveBlending, side: THREE.DoubleSide
    }));
    cone.position.set(0, 3.9, cz);
    corridor.add(cone);
  }
  scene.add(corridor);

  /* ── hero: the face IS the grid ─────────────────────────────── */
  var heroGrid = (function () {
    var geo = new THREE.PlaneGeometry(90, 90, 56, 56);
    var pos = geo.attributes.position;
    for (var i = 0; i < pos.count; i++) {
      var x = pos.getX(i), y = pos.getY(i);
      var d2 = (x * x) / 230 + Math.pow(y - 7, 2) / 150;
      pos.setZ(i, 10.5 * Math.exp(-d2) + Math.random() * 0.1);
    }
    var mat = new THREE.MeshBasicMaterial({ color: 0xdfe6da, wireframe: true, transparent: true, opacity: 0.4 });
    var m = new THREE.Mesh(geo, mat);
    m.rotation.x = -Math.PI / 2;
    m.position.set(0, -2.6, -8);
    return m;
  })();
  scene.add(heroGrid);

  var face = { group: new THREE.Group(), ready: false, form: 0, formTarget: 1 };
  var faceBase = { pos: null, pointPos: null };
  (function buildFace() {
    var img = new Image();
    img.onload = function () {
      var w = 168, h = Math.round(168 * (img.height / img.width));
      var c = document.createElement('canvas'); c.width = w; c.height = h;
      var g = c.getContext('2d');
      g.drawImage(img, 0, 0, w, h);
      var data = g.getImageData(0, 0, w, h).data;
      function depthAt(u, v) {           /* u,v in 0..1, v top=0 */
        var px = Math.min(w - 1, Math.max(0, Math.floor(u * w)));
        var py = Math.min(h - 1, Math.max(0, Math.floor(v * h)));
        var i = (py * w + px) * 4;
        var lum = (0.2126 * data[i] + 0.7152 * data[i + 1] + 0.0722 * data[i + 2]) / 255;
        return Math.pow(lum, 1.55);
      }
      /* full-screen displaced grid plane — the reference's unified surface */
      var PW = 26, PH = 14, SX = 96, SY = 60;
      var geo = new THREE.PlaneGeometry(PW, PH, SX, SY);
      var pos = geo.attributes.position;
      for (var i = 0; i < pos.count; i++) {
        var u = pos.getX(i) / PW + 0.5;
        var v = 1 - (pos.getY(i) / PH + 0.5);
        var d = depthAt(u, v);
        var edge = Math.pow(Math.max(0, 1 - Math.pow((u - 0.5) * 2, 2)), 0.5);
        pos.setZ(i, d * 2.6 * (0.35 + 0.65 * edge) - 0.55);
      }
      geo.computeVertexNormals();
      var occluder = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ color: 0x050608 }));
      occluder.renderOrder = 1;
      var wire = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({
        color: 0xcfeeda, wireframe: true, transparent: true, opacity: 0.42
      }));
      wire.renderOrder = 2; wire.position.z = 0.006;
      face.group.add(occluder); face.group.add(wire);
      faceBase.pos = Float32Array.from(geo.attributes.position.array);

      /* grid-aligned bright nodes on the same displaced surface */
      var pts = [], cols = [];
      for (var py = 0; py < h; py += 3) {
        for (var px2 = 0; px2 < w; px2 += 3) {
          var idx = (py * w + px2) * 4;
          var r = data[idx], gg = data[idx + 1], b = data[idx + 2];
          var lum = 0.2126 * r + 0.7152 * gg + 0.0722 * b;
          if (lum < 26) continue;
          var u2 = px2 / w, v2 = py / h;
          var X = (u2 - 0.5) * PW;
          var Y = (0.5 - v2) * PH;
          var d2 = depthAt(u2, v2);
          var Z = d2 * 2.6 * (0.35 + 0.65 * Math.pow(Math.max(0, 1 - Math.pow((u2 - 0.5) * 2, 2)), 0.5)) - 0.55;
          pts.push(X, Y, Z + 0.02);
          var boost = 1.2, rr = Math.min(1, (r / 255) * boost), gb = Math.min(1, (gg / 255) * boost), bb = Math.min(1, (b / 255) * boost);
          if (r > gg * 1.3 && r > b * 1.3) rr = Math.min(1, rr * 1.65 + 0.08);
          cols.push(rr, gb, bb);
        }
      }
      var pgeo = new THREE.BufferGeometry();
      pgeo.setAttribute('position', new THREE.Float32BufferAttribute(pts, 3));
      pgeo.setAttribute('color', new THREE.Float32BufferAttribute(cols, 3));
      var pmat = new THREE.PointsMaterial({
        size: 0.052, map: sprite, vertexColors: true, transparent: true, opacity: 0,
        depthWrite: false, blending: THREE.AdditiveBlending
      });
      var points = new THREE.Points(pgeo, pmat);
      points.renderOrder = 3;
      face.group.add(points);
      face.pointMat = pmat;
      faceBase.pointPos = Float32Array.from(pgeo.attributes.position.array);
      face.geo = geo; face.pgeo = pgeo;
      face.group.position.set(2.4, 2.45, 0);
      face.ready = true;
      setProg(0.72);
    };
    img.src = 'assets/portrait-masked.png';
  })();
  scene.add(face.group);

  /* hero dust */
  var DUST_N = 90, dustPos = new Float32Array(DUST_N * 3), dustSpd = new Float32Array(DUST_N);
  for (var di = 0; di < DUST_N; di++) {
    dustPos[di * 3] = (Math.random() - 0.5) * 11;
    dustPos[di * 3 + 1] = Math.random() * 7;
    dustPos[di * 3 + 2] = 1 + Math.random() * 6;
    dustSpd[di] = 0.12 + Math.random() * 0.25;
  }
  var dustGeo = new THREE.BufferGeometry();
  dustGeo.setAttribute('position', new THREE.BufferAttribute(dustPos, 3));
  var dust = new THREE.Points(dustGeo, new THREE.PointsMaterial({
    color: 0xfff6e8, size: 0.05, map: sprite, transparent: true, opacity: 0.55,
    depthWrite: false, blending: THREE.AdditiveBlending
  }));
  scene.add(dust);

  /* ── factory interlude — enclosed machine hall of chips & cobots ── */
  var factory = new THREE.Group();
  var whiteMat = new THREE.MeshBasicMaterial({ color: 0xe9edf2 });
  var steelMat = new THREE.MeshBasicMaterial({ color: 0x15171c });
  var jointMat = new THREE.MeshBasicMaterial({ color: 0xdfe5ec });
  var pcbGlowMat = new THREE.MeshBasicMaterial({ color: 0x2bff70 });
  var chipTex = makeChipTex();
  [-1, 1].forEach(function (side) {
    for (var i = 0; i < 6; i++) {
      var z = -9 - i * 3.0, x = side * 5.5;
      var base = new THREE.Mesh(new THREE.CylinderGeometry(0.52, 0.58, 0.4, 12), steelMat);
      base.position.set(x, 0.2, z); factory.add(base);
      var ring = new THREE.Mesh(new THREE.TorusGeometry(0.55, 0.05, 8, 22), pcbGlowMat);
      ring.rotation.x = Math.PI / 2; ring.position.set(x, 0.42, z); factory.add(ring);
      var col = new THREE.Mesh(new THREE.BoxGeometry(0.36, 0.95, 0.36), whiteMat);
      col.position.set(x, 0.9, z); factory.add(col);
      var j1 = new THREE.Mesh(new THREE.SphereGeometry(0.2, 10, 8), jointMat);
      j1.position.set(x, 1.42, z); factory.add(j1);
      var arm1 = new THREE.Mesh(new THREE.BoxGeometry(0.2, 1.25, 0.2), whiteMat);
      arm1.position.set(x - side * 0.32, 1.9, z); arm1.rotation.z = side * 0.52; factory.add(arm1);
      var j2 = new THREE.Mesh(new THREE.SphereGeometry(0.17, 10, 8), jointMat);
      j2.position.set(x - side * 0.66, 2.42, z); factory.add(j2);
      var arm2 = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.95, 0.16), whiteMat);
      arm2.position.set(x - side * 0.6, 2.75, z); arm2.rotation.z = side * -0.85; factory.add(arm2);
    }
  });
  var chipMat = new THREE.MeshBasicMaterial({ color: 0x0d1410 });
  var chipTopMat = new THREE.MeshBasicMaterial({ map: chipTex });
  for (var ci = 0; ci < 15; ci++) {
    var cz2 = -8 - ci * 1.5;
    [-1.6, 1.6].forEach(function (x) {
      var chip = new THREE.Mesh(new THREE.BoxGeometry(1.0, 0.14, 1.3), chipMat);
      chip.position.set(x, 0.07, cz2); factory.add(chip);
      var top = new THREE.Mesh(new THREE.PlaneGeometry(0.96, 1.26), chipTopMat);
      top.rotation.x = -Math.PI / 2; top.position.set(x, 0.145, cz2); factory.add(top);
    });
  }
  var cableMat = new THREE.MeshBasicMaterial({ color: 0xff3a1f });
  [1.15, 2.0].forEach(function (y) {
    [-6.75, 6.75].forEach(function (x) {
      var cab = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.09, 30), cableMat);
      cab.position.set(x, y, -17.5); factory.add(cab);
    });
  });
  factory.position.z = -62;
  scene.add(factory);

  /* ── gallery: typographic posters + mirrored reflections ───── */
  var SCREENS = [
    { poster: makePosterTex(['THE MAIN', 'REEL', 'MONARCH®'], { accent: '#c21e28' }), vid: 'media/monarch-portfolio-v5.mp4', title: 'MONARCH — THE MAIN FILM', info: 'The 37-second showreel — M4, mask, red.', tags: ['EDIT', 'GRADE'] },
    { img: 'assets/thumbs/monarch-00.jpg', vid: 'media/paanch.web.mp4', title: 'PAANCH RULES — MOTIVATIONAL SHORT', info: 'Cuts locked to the beat — one short.', tags: ['EDIT'] },
    { poster: makePosterTex(['MONARCH', 'STUDIO'], { bg: '#101010', fg: '#f2efe6', accent: '#c21e28' }), vid: 'media/monarch-01-web.mp4', title: 'MONARCH STUDIO', info: 'Studio identity film for the MONARCH brand.', tags: ['EDIT', 'BRAND'] },
    { img: 'assets/thumbs/th-lawone.jpg', vid: 'media/lawone.web.mp4', title: 'MONARCH: LAW ONE', info: 'Cinematic law story — paced for retention.', tags: ['EDIT', 'STORY'] },
    { poster: makePosterTex(['CLARITY', 'IN MOTION'], {}), vid: 'media/monarch-02-web.mp4', title: 'CLARITY IN MOTION', info: 'Motion study for MONARCH — clarity in the cut.', tags: ['EDIT', 'MOTION'] },
    { img: 'assets/thumbs/monarch-03.jpg', vid: 'media/monarch-03-web.mp4', title: 'YOUR CREATIVE PARTNER', info: 'Partnership film for creative brands.', tags: ['EDIT', 'BRAND'] },
    { poster: makePosterTex(['IDEA', 'TO IMPACT'], { bg: '#f2efe6', fg: '#101010', accent: '#c21e28' }), vid: 'media/monarch-04-web.mp4', title: 'FROM IDEA TO IMPACT', info: 'From first frame to final impact.', tags: ['EDIT'] },
    { img: 'assets/thumbs/monarch-05.jpg', vid: 'media/monarch-05-web.mp4', title: 'WHERE IDEAS BEGIN', info: 'Origin film — where MONARCH ideas begin.', tags: ['EDIT'] },
    { poster: makePosterTex(['MONARCH', 'OS'], { bg: '#0d1410', fg: '#2bff70' }), vid: 'media/monarch-reference-06-enhanced.mp4', title: 'MONARCH OS', info: 'The OS of the MONARCH pipeline.', tags: ['EDIT', 'SYSTEMS'] },
    { img: 'assets/thumbs/monarch-07.jpg', vid: 'media/monarch-reference-07-enhanced.mp4', title: 'THE VISION', info: 'The long-vision film for MONARCH.', tags: ['EDIT', 'VISION'] }
  ];
  var hall = new THREE.Group();
  var screenMeshes = [];
  var texLoader = new THREE.TextureLoader();
  var poolTex = makePoolTex();
  SCREENS.forEach(function (s, i) {
    var side = (i % 2 === 0) ? 1 : -1;
    var z = -34 - i * 7.1;
    var tex = s.poster ? s.poster : texLoader.load(s.img);
    if (tex && 'colorSpace' in tex && THREE.SRGBColorSpace) tex.colorSpace = THREE.SRGBColorSpace;
    var mat = new THREE.MeshBasicMaterial({ map: tex, color: 0xffffff });
    var frame = new THREE.Mesh(new THREE.BoxGeometry(5.15, 3.15, 0.1), new THREE.MeshBasicMaterial({ color: 0x0d0d12 }));
    var scr = new THREE.Mesh(new THREE.PlaneGeometry(4.8, 2.8), mat);
    scr.position.z = 0.09;
    scr.userData = { video: s.vid, title: s.title };
    var grp = new THREE.Group();
    grp.add(frame); grp.add(scr);
    grp.position.set(side * 7.28, 2.6, z);
    grp.rotation.y = -side * (Math.PI / 2 - 0.46);
    hall.add(grp);
    screenMeshes.push(scr);
    /* mirrored reflection beneath — polished floor */
    var refl = new THREE.Group();
    var rFrame = frame.clone(); rFrame.material = new THREE.MeshBasicMaterial({ color: 0x0a0a0e, transparent: true, opacity: 0.4 });
    var rScr = new THREE.Mesh(new THREE.PlaneGeometry(4.8, 2.8), new THREE.MeshBasicMaterial({
      map: tex, transparent: true, opacity: 0.26, depthWrite: false
    }));
    rScr.position.z = 0.09;
    refl.add(rFrame); refl.add(rScr);
    refl.position.set(side * 7.28, -2.62, z);
    refl.scale.y = -1;
    refl.rotation.y = grp.rotation.y;
    hall.add(refl);
    var pool = new THREE.Mesh(new THREE.PlaneGeometry(5.6, 4.2),
      new THREE.MeshBasicMaterial({ map: poolTex, transparent: true, opacity: 0.5, depthWrite: false, blending: THREE.AdditiveBlending }));
    pool.rotation.x = -Math.PI / 2; pool.position.set(side * 5.6, 0.02, z);
    hall.add(pool);
  });
  scene.add(hall);

  var galIdx = document.getElementById('galIdx');
  var galTitle = document.getElementById('galTitle');
  var galInfo = document.getElementById('galInfo');
  var galTags = document.getElementById('galTags');
  var galActive = -1;
  function updateGalleryPanel(camZ) {
    if (!galIdx || !galTitle) return;
    var idx = Math.round((-camZ - 30) / 7.1);
    idx = Math.max(0, Math.min(SCREENS.length - 1, idx));
    if (idx === galActive) return;
    galActive = idx;
    galIdx.textContent = ('0' + (idx + 1)).slice(-2) + ' / ' + SCREENS.length;
    galTitle.textContent = SCREENS[idx].title;
    if (galInfo) galInfo.textContent = SCREENS[idx].info;
    if (galTags) galTags.innerHTML = SCREENS[idx].tags.map(function (t) { return '<span>' + t + '</span>'; }).join('');
  }

  var raycaster = new THREE.Raycaster();
  var pointer = new THREE.Vector2();
  function openPlayer(src, title, wide) {
    var pl = document.getElementById('player'), plV = document.getElementById('plVideo'), plT = document.getElementById('plTitle');
    if (!pl || !plV) return;
    plV.style.display = ''; plV.dataset.wide = wide ? '1' : '0'; plV.src = src;
    if (plT) plT.textContent = (title || 'FILM').toUpperCase();
    pl.classList.add('on'); pl.setAttribute('aria-hidden', 'false');
    document.body.classList.add('locked');
    window.setTimeout(function () { plV.play().catch(function () {}); }, 80);
  }
  canvas.addEventListener('click', function (ev) {
    pointer.x = (ev.clientX / window.innerWidth) * 2 - 1;
    pointer.y = -(ev.clientY / window.innerHeight) * 2 + 1;
    raycaster.setFromCamera(pointer, camera);
    var hits = raycaster.intersectObjects(screenMeshes, false);
    if (hits.length) openPlayer(hits[0].object.userData.video, hits[0].object.userData.title, true);
  });

  /* ── WHO canyon: window towers + speed streaks ──────────────── */
  var winTexA = makeWindowsTex(), winTexB = makeWindowsTex();
  var winMatA = new THREE.MeshBasicMaterial({ map: winTexA });
  var winMatB = new THREE.MeshBasicMaterial({ map: winTexB });
  for (var wi = 0; wi < 7; wi++) {
    var wz = -124 - wi * 4.6;
    var wL = new THREE.Mesh(new THREE.PlaneGeometry(3.4, 5.6), winMatA);
    wL.rotation.y = Math.PI / 2; wL.position.set(-7.45, 3.35, wz);
    var wR = new THREE.Mesh(new THREE.PlaneGeometry(3.4, 5.6), winMatB);
    wR.rotation.y = -Math.PI / 2; wR.position.set(7.45, 3.35, wz + 2.3);
    scene.add(wL); scene.add(wR);
  }
  var STREAK_N = 26, streakPos = [], streaks = [];
  var streakMat = new THREE.MeshBasicMaterial({ color: 0xcfe4ff, transparent: true, opacity: 0.7, blending: THREE.AdditiveBlending, depthWrite: false });
  for (var si = 0; si < STREAK_N; si++) {
    var sm = new THREE.Mesh(new THREE.PlaneGeometry(0.05, 2.6), streakMat);
    sm.position.set((Math.random() < 0.5 ? -1 : 1) * (3 + Math.random() * 3.6), 1.4 + Math.random() * 4.4, -120 - Math.random() * 30);
    scene.add(sm); streaks.push(sm);
  }

  /* ── ALLEY: AI CG diorama plate + embers + heart glow ───────── */
  var alleyTex = texLoader.load('assets/alley-plate.jpg');
  if ('colorSpace' in alleyTex && THREE.SRGBColorSpace) alleyTex.colorSpace = THREE.SRGBColorSpace;
  var alleyWall = new THREE.Mesh(new THREE.PlaneGeometry(52, 29), new THREE.MeshBasicMaterial({ map: alleyTex }));
  alleyWall.position.set(0, 5.4, -166);
  scene.add(alleyWall);

  var EMBER_N = 240;
  var emberPos = new Float32Array(EMBER_N * 3);
  var emberSpd = new Float32Array(EMBER_N);
  var emberPhase = new Float32Array(EMBER_N);
  for (var ei = 0; ei < EMBER_N; ei++) {
    emberPos[ei * 3] = (Math.random() - 0.5) * 13.5;
    emberPos[ei * 3 + 1] = Math.random() * 6.6;
    emberPos[ei * 3 + 2] = -118 - Math.random() * 40;
    emberSpd[ei] = 0.4 + Math.random() * 0.75;
    emberPhase[ei] = Math.random() * Math.PI * 2;
  }
  var emberGeo = new THREE.BufferGeometry();
  emberGeo.setAttribute('position', new THREE.BufferAttribute(emberPos, 3));
  var embers = new THREE.Points(emberGeo, new THREE.PointsMaterial({
    color: 0xff7a30, size: 0.18, map: sprite, transparent: true, opacity: 0.95,
    depthWrite: false, blending: THREE.AdditiveBlending
  }));
  embers.visible = false;
  scene.add(embers);

  /* ── PAPER-CURL WIPE — the reference's signature transition ──── */
  var wipeCanvas = document.getElementById('wipeFx');
  var wctx = wipeCanvas ? wipeCanvas.getContext('2d') : null;
  var wipeAnim = null;
  function sizeWipe() {
    if (!wipeCanvas) return;
    wipeCanvas.width = window.innerWidth; wipeCanvas.height = window.innerHeight;
  }
  sizeWipe();
  function runWipe(mode, midCb) {
    if (!wctx) { if (midCb) midCb(); return; }
    if (wipeAnim) cancelAnimationFrame(wipeAnim.raf);
    var t0 = performance.now(), dur = mode === 'flash' ? 750 : 900, didMid = false;
    function frame(now) {
      var t = Math.min(1, (now - t0) / dur);
      var W = wipeCanvas.width, H = wipeCanvas.height;
      wctx.clearRect(0, 0, W, H);
      if (mode === 'flash') {
        var a = t < 0.35 ? t / 0.35 : 1 - (t - 0.35) / 0.65;
        var fg = wctx.createRadialGradient(W / 2, H / 2, 10, W / 2, H / 2, Math.max(W, H) * 0.75);
        fg.addColorStop(0, 'rgba(255,255,255,' + a + ')');
        fg.addColorStop(0.55, 'rgba(255,244,228,' + a * 0.9 + ')');
        fg.addColorStop(1, 'rgba(255,255,255,0)');
        wctx.fillStyle = fg; wctx.fillRect(0, 0, W, H);
        if (t >= 0.35 && !didMid && midCb) { didMid = true; midCb(); }
      } else {
        /* page curl: a lit white sheet sweeps L→R with a curled leading edge */
        var ease = t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t;
        var x = -W * 0.25 + ease * W * 1.55;
        wctx.fillStyle = '#f4f1ea';
        wctx.fillRect(0, 0, Math.max(0, x), H);
        if (x > -W * 0.25 && x < W * 1.3) {
          var curlW = W * 0.16;
          var grad = wctx.createLinearGradient(x - curlW, 0, x, 0);
          grad.addColorStop(0, 'rgba(244,241,234,0)');
          grad.addColorStop(0.42, 'rgba(210,205,192,0.9)');
          grad.addColorStop(0.78, '#fffdf6');
          grad.addColorStop(0.92, 'rgba(120,112,96,0.85)');
          grad.addColorStop(1, 'rgba(20,18,14,0)');
          wctx.fillStyle = grad;
          wctx.fillRect(x - curlW, 0, curlW, H);
          var shadow = wctx.createLinearGradient(x, 0, x + W * 0.09, 0);
          shadow.addColorStop(0, 'rgba(0,0,0,0.5)');
          shadow.addColorStop(1, 'rgba(0,0,0,0)');
          wctx.fillStyle = shadow; wctx.fillRect(x, 0, W * 0.09, H);
        }
        if (t >= 0.5 && !didMid && midCb) { didMid = true; midCb(); }
      }
      if (t < 1) wipeAnim = { raf: requestAnimationFrame(frame) };
      else { wctx.clearRect(0, 0, W, H); wipeAnim = null; }
    }
    wipeAnim = { raf: requestAnimationFrame(frame) };
  }
  if (!reduced) {
    document.addEventListener('click', function (e) {
      var a = e.target && e.target.closest ? e.target.closest('a[href^="#"]') : null;
      if (!a) return;
      var id = a.getAttribute('href');
      if (id.length < 2) return;
      var dest = document.querySelector(id);
      if (!dest) return;
      e.preventDefault();
      runWipe('curl', function () {
        dest.scrollIntoView({ behavior: 'auto', block: 'start' });
      });
    }, true);
  }

  /* ── scroll rail: element-anchored atmosphere keyframes ─────── */
  var STOPS = [
    { id: 'chHero',    fog: [6, 6, 6],      ac: [255, 43, 54]  },
    { id: 'chFactory', fog: [4, 9, 7],      ac: [64, 255, 148] },
    { id: 'chGallery', fog: [10, 10, 15],   ac: [255, 43, 54]  },
    { id: 'chWho',     fog: [4, 8, 18],     ac: [110, 168, 255]},
    { id: 'chAlley',   fog: [22, 4, 2],     ac: [255, 58, 26]  },
    { id: 'contact',   fog: [9, 2, 2],      ac: [255, 43, 54]  }
  ];
  var stops = [];
  function docMetrics() {
    var docH = Math.max(document.body.scrollHeight, document.documentElement.scrollHeight);
    var vh = window.innerHeight;
    stops = STOPS.map(function (s) {
      var el = document.getElementById(s.id);
      var f = 0;
      if (el) {
        var top = el.getBoundingClientRect().top + window.scrollY;
        f = Math.max(0, Math.min(1, (top + el.offsetHeight * 0.5 - vh * 0.5) / Math.max(1, docH - vh)));
      }
      return { f: f, fog: s.fog, ac: s.ac };
    }).sort(function (a, b) { return a.f - b.f; });
    return { docH: docH, vh: vh };
  }
  var metrics = docMetrics();
  function lerp(a, b, t) { return a + (b - a) * t; }
  function lerp3(a, b, t) { return [lerp(a[0], b[0], t), lerp(a[1], b[1], t), lerp(a[2], b[2], t)]; }
  function colorsAt(p) {
    if (!stops.length) return { fog: [6, 6, 6], ac: [255, 43, 54] };
    if (p <= stops[0].f) return { fog: stops[0].fog, ac: stops[0].ac };
    for (var i = 0; i < stops.length - 1; i++) {
      var A = stops[i], B = stops[i + 1];
      if (p <= B.f) {
        var t = (p - A.f) / Math.max(0.0001, B.f - A.f);
        return { fog: lerp3(A.fog, B.fog, t), ac: lerp3(A.ac, B.ac, t) };
      }
    }
    var last = stops[stops.length - 1];
    return { fog: last.fog, ac: last.ac };
  }

  var heroEls = ['.glh-core', '.glh-side', '.glh-caps', '.glh-cue', '.glh-socials'].map(function (q) { return document.querySelector(q); });

  /* scroll-velocity for the editorial fisheye */
  var lastProg = 0, velS = 0;

  /* lw-cover cards driven per-frame (velocity fisheye) */
  var lwCards = [];
  Array.prototype.forEach.call(document.querySelectorAll('.lw-card'), function (el, i) {
    lwCards.push({ el: el, i: i, hover: false, hl: 0 });
    el.addEventListener('mouseenter', function () { lwCards[i].hover = true; });
    el.addEventListener('mouseleave', function () { lwCards[i].hover = false; });
  });

  var mx = 0, my = 0, mxS = 0, myS = 0;
  window.addEventListener('mousemove', function (e) {
    mx = (e.clientX / window.innerWidth) * 2 - 1;
    my = (e.clientY / window.innerHeight) * 2 - 1;
  }, { passive: true });

  window.addEventListener('resize', function () {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
    metrics = docMetrics();
    sizeWipe();
  });

  /* ── main loop ──────────────────────────────────────────────── */
  var scrollCur = 0, tPrev = performance.now() / 1000;
  var glitchAt = 2.6, glitchUntil = 0, glitchBands = [];
  var fogCol = new THREE.Color(6 / 255, 6 / 255, 6 / 255);
  var acCol = new THREE.Color(1, 0.17, 0.21);
  var white = new THREE.Color(1, 1, 1);
  var tmpColor = new THREE.Color();

  function tick() {
    requestAnimationFrame(tick);
    var t = performance.now() / 1000;
    var dt = Math.min(0.05, t - tPrev); tPrev = t;

    var maxScroll = Math.max(1, metrics.docH - metrics.vh);
    var target = Math.max(0, Math.min(1, window.scrollY / maxScroll));
    scrollCur += (target - scrollCur) * (reduced ? 1 : 0.085);
    var prog = scrollCur;
    velS += (((Math.abs(prog - lastProg) / Math.max(dt, 0.001)) - velS) * 0.08);
    var vel = Math.min(1, velS * 0.55);
    lastProg = prog;

    /* camera — dolly with roll, FOV breath, velocity stretch */
    var camZ = 12 - 154 * prog;
    var camX = reduced ? 0 : Math.sin(prog * Math.PI * 4.2) * 0.72;
    var camY = 1.72 + (reduced ? 0 : Math.sin(prog * Math.PI * 3.1) * 0.14);
    camera.position.set(camX, camY, camZ);
    camera.lookAt(camX * 0.45, 2.05, camZ - 9);
    /* the world ROLLS into the canyon — structural transition */
    var roll = Math.sin(prog * Math.PI * 2.3) * 0.014 + Math.sin(prog * Math.PI * 1.12) * 0.055 * (prog > 0.6 ? Math.sin((prog - 0.6) / 0.28 * Math.PI) : 0);
    if (!reduced) camera.rotateZ(roll);
    camera.fov = 56 + Math.sin(prog * Math.PI * 2) * 1.6 + vel * 2.4;
    camera.updateProjectionMatrix();

    /* atmosphere */
    var c = colorsAt(prog);
    fogCol.setRGB(c.fog[0] / 255, c.fog[1] / 255, c.fog[2] / 255);
    acCol.setRGB(c.ac[0] / 255, c.ac[1] / 255, c.ac[2] / 255);
    scene.fog.color.copy(fogCol);
    renderer.setClearColor(fogCol, 1);
    stripMat.color.copy(acCol);
    floorMat.color.copy(tmpColor.copy(acCol).lerp(white, 0.35));

    /* hero fade + face forming */
    var heroVis = Math.max(0, Math.min(1, 1 - (-camZ) / 17));
    heroGrid.visible = heroVis > 0.02;
    heroGrid.material.opacity = 0.4 * heroVis;
    corridor.visible = prog > 0.03;
    factory.visible = prog > 0.36 && prog < 0.74;
    face.group.visible = heroVis > 0.02;
    dust.visible = heroVis > 0.05;
    if (face.ready) {
      face.form += (face.formTarget - face.form) * 0.045;
      var fv = face.form * face.form; /* ease */
      /* apply forming + row-band glitch on the shared surface */
      var glitchOn = t < glitchUntil;
      if (t > glitchAt) {
        glitchOn = true; glitchUntil = t + 0.38; glitchAt = t + 3.6 + Math.random() * 3.2;
        glitchBands = [];
        for (var gb = 0; gb < 7; gb++) glitchBands.push((Math.random() - 0.5) * 1.6);
      }
      var posAttr = face.geo.attributes.position;
      var base = faceBase.pos;
      for (var vi = 0; vi < posAttr.count; vi++) {
        var by = base[vi * 3 + 1];
        var band = Math.max(0, Math.min(6, Math.floor(((by + PH0) / 14) * 7)));
        var off = glitchOn ? glitchBands[band] * (0.55 + 0.45 * Math.sin(t * 55 + band * 9)) : 0;
        posAttr.setX(vi, base[vi * 3] + off);
        posAttr.setZ(vi, base[vi * 3 + 2] * fv);
      }
      posAttr.needsUpdate = true;
      var ppos = face.pgeo.attributes.position;
      var pbase = faceBase.pointPos;
      for (var pi = 0; pi < ppos.count; pi++) {
        var pby = pbase[pi * 3 + 1];
        var pband = Math.max(0, Math.min(6, Math.floor(((pby + PH0) / 14) * 7)));
        var poff = glitchOn ? glitchBands[pband] * (0.55 + 0.45 * Math.sin(t * 55 + pband * 9)) : 0;
        ppos.setX(pi, pbase[pi * 3] + poff);
        ppos.setZ(pi, pbase[pi * 3 + 2] * fv + 0.02);
      }
      ppos.needsUpdate = true;
      face.pointMat.opacity = Math.min(1, fv * 1.15);
      face.pointMat.size = glitchOn ? 0.075 : 0.052;
      face.group.position.x = 2.4 + mxS * 0.12;
      face.group.position.y = 2.45 + Math.sin(t * 0.6) * 0.16;
      face.group.rotation.y = mxS * 0.12 + Math.sin(t * 0.32) * 0.05;
      face.group.rotation.x = myS * 0.05;
      mxS += (mx - mxS) * 0.06; myS += (my - myS) * 0.06;
    }
    if (dust.visible && !reduced) {
      var dp = dustGeo.attributes.position;
      for (var i2 = 0; i2 < DUST_N; i2++) {
        var yy = dp.getY(i2) + dustSpd[i2] * dt;
        if (yy > 7) yy = 0.05;
        dp.setY(i2, yy);
      }
      dp.needsUpdate = true;
    }
    var heroFade = Math.max(0, Math.min(1, 1 - prog / 0.085));
    for (var hi = 0; hi < heroEls.length; hi++) {
      var el = heroEls[hi]; if (!el) continue;
      el.style.opacity = heroFade;
      el.style.transform = 'translateY(' + ((1 - heroFade) * -46) + 'px)';
      el.style.pointerEvents = heroFade < 0.25 ? 'none' : '';
    }

    /* canyon streaks — visible only in the rush */
    var canyon = prog > 0.78 && prog < 0.965;
    for (var si2 = 0; si2 < streaks.length; si2++) {
      var sm2 = streaks[si2];
      sm2.visible = canyon;
      if (canyon) {
        sm2.position.z += 34 * dt;
        if (sm2.position.z > -118) {
          sm2.position.z = -152 - Math.random() * 4;
          sm2.position.x = (Math.random() < 0.5 ? -1 : 1) * (3 + Math.random() * 3.6);
          sm2.position.y = 1.4 + Math.random() * 4.4;
        }
      }
    }

    /* alley */
    embers.visible = prog > 0.74;
    alleyWall.visible = prog > 0.6;
    if (embers.visible) {
      var p = emberGeo.attributes.position;
      for (var ei2 = 0; ei2 < EMBER_N; ei2++) {
        var y = p.getY(ei2) + emberSpd[ei2] * dt;
        var x = p.getX(ei2) + Math.sin(t * 0.9 + emberPhase[ei2]) * 0.0035;
        if (y > 6.7) { y = 0.05; x = (Math.random() - 0.5) * 13.5; }
        p.setY(ei2, y); p.setX(ei2, x);
      }
      p.needsUpdate = true;
    }

    /* gallery panel follows camera */
    if (camZ < -24 && camZ > -112) updateGalleryPanel(camZ);

    /* velocity fisheye — the editorial capsules breathe */
    for (var li = 0; li < lwCards.length; li++) {
      var card = lwCards[li];
      card.hl += ((card.hover ? 1 : 0) - card.hl) * 0.12;
      var baseTilt = (li % 2 === 0 ? -16 : -10) - vel * 9;
      var ry = baseTilt * (1 - card.hl);
      var rx = (5 + vel * 7) * (1 - card.hl);
      var ty = (li % 2 === 0 ? 0 : 26) * (1 - card.hl);
      var sc = 1 + vel * 0.05 + card.hl * 0.03;
      card.el.style.transform = 'rotateY(' + ry.toFixed(2) + 'deg) rotateX(' + rx.toFixed(2) + 'deg) translateY(' + ty.toFixed(1) + 'px) scale(' + sc.toFixed(4) + ')';
      card.el.style.filter = 'blur(' + (vel * 4.2).toFixed(2) + 'px) saturate(' + (1 + vel * 0.15).toFixed(3) + ')';
      card.el.style.zIndex = card.hover ? 3 : 1;
    }

    renderer.render(scene, camera);
  }
  var PH0 = 14 / 2;
  tick();

  /* ── light-chapter covers → same #player lightbox ───────────── */
  (function bindLightCards() {
    var cards = document.querySelectorAll('.lw-card[data-src]');
    Array.prototype.forEach.call(cards, function (c) {
      c.addEventListener('click', function () {
        openPlayer(c.dataset.src, c.dataset.title, c.dataset.wide === '1');
      });
    });
  })();

  /* ── loader completion ───────────────────────────────────────── */
  var loaderDone = false;
  function done() { if (loaderDone) return; loaderDone = true; finishLoader(); }
  window.addEventListener('load', function () { window.setTimeout(done, 350); });
  window.setTimeout(done, 2800);
})();
