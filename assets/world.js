/* ============================================================
   MONARCH — WORLD v3 · WebGL scroll journey
   Dominikfojcik-technique (scroll-scrubbed cinematic chapters)
   — Adil's own assets, no frameworks, graceful degradation.
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
  function failSoft() {
    document.documentElement.classList.add('no-gl');
    finishLoader();
  }
  setProg(0.2);

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
  setProg(0.45);

  var scene = new THREE.Scene();
  scene.fog = new THREE.Fog(0x060606, 14, 88);

  var camera = new THREE.PerspectiveCamera(56, window.innerWidth / window.innerHeight, 0.1, 400);
  camera.position.set(0, 1.72, 12);

  /* ── sprite: soft radial dot ─────────────────────────────── */
  function makeSprite() {
    var c = document.createElement('canvas'); c.width = c.height = 64;
    var g = c.getContext('2d');
    var grad = g.createRadialGradient(32, 32, 0, 32, 32, 32);
    grad.addColorStop(0, 'rgba(255,255,255,1)');
    grad.addColorStop(0.4, 'rgba(255,255,255,.85)');
    grad.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = grad; g.fillRect(0, 0, 64, 64);
    var t = new THREE.CanvasTexture(c); return t;
  }
  var sprite = makeSprite();

  /* ── canvas textures: grid floor + wall panels ────────────── */
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
      g.fillStyle = '#0e0e13'; g.fillRect(x + 4, 12, 56, 232);
      g.fillStyle = 'rgba(255,255,255,0.05)'; g.fillRect(x + 4, 12, 2, 232);
      g.fillStyle = 'rgba(255,255,255,0.045)';
      for (var y = 40; y < 230; y += 34) g.fillRect(x + 14, y, 36, 3);
    }
    var t = new THREE.CanvasTexture(c);
    t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(36, 1);
    return t;
  }

  /* ── corridor: floor · walls · ceiling · glow strips · pillars */
  var corridor = new THREE.Group();
  var gridTex = makeGridTex();
  var floorMat = new THREE.MeshBasicMaterial({ map: gridTex, color: 0xffffff, transparent: true, opacity: 0.92 });
  var floor = new THREE.Mesh(new THREE.PlaneGeometry(16, 320), floorMat);
  floor.rotation.x = -Math.PI / 2; floor.position.set(0, 0, -96);
  corridor.add(floor);

  var panelTex = makePanelTex();
  var wallMat = new THREE.MeshBasicMaterial({ map: panelTex, color: 0x9d9da6 });
  var wallGeo = new THREE.PlaneGeometry(320, 7);
  var wallL = new THREE.Mesh(wallGeo, wallMat);
  wallL.rotation.y = Math.PI / 2; wallL.position.set(-7.6, 3.4, -96);
  var wallR = new THREE.Mesh(wallGeo, wallMat);
  wallR.rotation.y = -Math.PI / 2; wallR.position.set(7.6, 3.4, -96);
  corridor.add(wallL); corridor.add(wallR);

  var ceil = new THREE.Mesh(new THREE.PlaneGeometry(16, 320), new THREE.MeshBasicMaterial({ color: 0x030304 }));
  ceil.rotation.x = Math.PI / 2; ceil.position.set(0, 6.9, -96);
  corridor.add(ceil);

  var stripMat = new THREE.MeshBasicMaterial({ color: 0xff2b36 });
  var stripGeo = new THREE.BoxGeometry(0.12, 0.09, 300);
  [2.35, 4.7].forEach(function (y) {
    [-7.38, 7.38].forEach(function (x) {
      var s = new THREE.Mesh(stripGeo, stripMat);
      s.position.set(x, y, -96); corridor.add(s);
    });
  });

  var pillarMat = new THREE.MeshBasicMaterial({ color: 0x101016 });
  var pillarGeo = new THREE.BoxGeometry(0.7, 6.9, 0.7);
  for (var pz = 10; pz > -232; pz -= 15) {
    [-6.9, 6.9].forEach(function (x) {
      var p = new THREE.Mesh(pillarGeo, pillarMat);
      p.position.set(x, 3.45, pz); corridor.add(p);
    });
  }
  var benchMat = new THREE.MeshBasicMaterial({ color: 0x121218 });
  var benchGeo = new THREE.BoxGeometry(3.4, 0.55, 1.15);
  [-46, -68, -90, -112].forEach(function (z) {
    var b = new THREE.Mesh(benchGeo, benchMat);
    b.position.set(0, 0.27, z); corridor.add(b);
  });
  scene.add(corridor);

  /* ── hero: warped wireframe grid floor (the dominik bulge) ── */
  var heroGrid = (function () {
    var geo = new THREE.PlaneGeometry(80, 80, 64, 64);
    var pos = geo.attributes.position;
    for (var i = 0; i < pos.count; i++) {
      var x = pos.getX(i), y = pos.getY(i);
      var d2 = (x * x) / 210 + Math.pow(y - 6, 2) / 130;
      pos.setZ(i, 9.5 * Math.exp(-d2) + Math.random() * 0.12);
    }
    geo.computeVertexNormals();
    var mat = new THREE.MeshBasicMaterial({ color: 0xe8e4da, wireframe: true, transparent: true, opacity: 0.5 });
    var m = new THREE.Mesh(geo, mat);
    m.rotation.x = -Math.PI / 2;
    m.position.set(0, -2.1, 4);
    return m;
  })();
  scene.add(heroGrid);

  /* ── hero: the portrait, rebuilt as ~22k glowing points ────── */
  var portrait = new THREE.Group();
  var portraitMat = null;
  var portraitBaseY = 0.65;
  (function buildPortrait() {
    var img = new Image();
    img.onload = function () {
      var w = 190, h = Math.round(190 * (img.height / img.width));
      var c = document.createElement('canvas'); c.width = w; c.height = h;
      var g = c.getContext('2d');
      g.drawImage(img, 0, 0, w, h);
      var data = g.getImageData(0, 0, w, h).data;
      var pts = [], cols = [];
      for (var y = 0; y < h; y += 1) {
        for (var x = 0; x < w; x += 1) {
          var idx = (y * w + x) * 4;
          var r = data[idx], gg = data[idx + 1], b = data[idx + 2];
          var lum = 0.2126 * r + 0.7152 * gg + 0.0722 * b;
          if (lum < 22) continue;                       /* black room falls away */
          if (Math.random() > (lum / 255) * 1.28 + 0.14) continue;
          var H = 6.6, W = H * (w / h);
          var px = (x / w - 0.5) * W;
          var py = (0.5 - y / h) * H + portraitBaseY;
          var nd = Math.hypot((x / w - 0.5) * 1.35, (y / h - 0.45) * 1.7);
          var pz = (1 - Math.min(1, nd)) * 1.35 + (Math.random() - 0.5) * 0.22;
          pts.push(px, py, pz);
          var boost = 1.18;
          var rr = Math.min(1, (r / 255) * boost), gb = Math.min(1, (gg / 255) * boost), bb = Math.min(1, (b / 255) * boost);
          if (r > gg * 1.35 && r > b * 1.35) rr = Math.min(1, rr * 1.45 + 0.08); /* the red mask ignites */
          cols.push(rr, gb, bb);
        }
      }
      if (pts.length > 24000 * 3) { pts = pts.slice(0, 24000 * 3); cols = cols.slice(0, 24000 * 3); }
      var geo = new THREE.BufferGeometry();
      geo.setAttribute('position', new THREE.Float32BufferAttribute(pts, 3));
      geo.setAttribute('color', new THREE.Float32BufferAttribute(cols, 3));
      portraitMat = new THREE.PointsMaterial({
        size: 0.055, map: sprite, vertexColors: true, transparent: true,
        depthWrite: false, blending: THREE.AdditiveBlending, sizeAttenuation: true
      });
      var points = new THREE.Points(geo, portraitMat);
      portrait.add(points);
      setProg(0.8);
    };
    img.src = 'assets/portrait-masked.png';
  })();
  scene.add(portrait);

  /* ── gallery: floating screens, click = play the film ─────── */
  var SCREENS = [
    { img: 'assets/thumbs/th-power.jpg',            vid: 'media/monarch-portfolio-v5.mp4',        title: 'MONARCH — THE MAIN FILM', meta: '37 SEC · SOUND ON' },
    { img: 'assets/thumbs/monarch-00.jpg',          vid: 'media/paanch.web.mp4',                  title: 'PAANCH RULES — MOTIVATIONAL SHORT', meta: 'FILM · MONARCH' },
    { img: 'assets/thumbs/monarch-01.jpg',          vid: 'media/monarch-01-web.mp4',              title: 'MONARCH STUDIO',          meta: 'FILM · MONARCH' },
    { img: 'assets/thumbs/th-lawone.jpg',           vid: 'media/lawone.web.mp4',                  title: 'MONARCH: LAW ONE',        meta: 'CINEMATIC LAW STORY' },
    { img: 'assets/thumbs/monarch-02.jpg',          vid: 'media/monarch-02-web.mp4',              title: 'CLARITY IN MOTION',       meta: 'FILM · MONARCH' },
    { img: 'assets/thumbs/monarch-03.jpg',          vid: 'media/monarch-03-web.mp4',              title: 'YOUR CREATIVE PARTNER',   meta: 'FILM · MONARCH' },
    { img: 'assets/thumbs/monarch-04.jpg',          vid: 'media/monarch-04-web.mp4',              title: 'FROM IDEA TO IMPACT',     meta: 'FILM · MONARCH' },
    { img: 'assets/thumbs/monarch-05.jpg',          vid: 'media/monarch-05-web.mp4',              title: 'WHERE IDEAS BEGIN',       meta: 'FILM · MONARCH' },
    { img: 'assets/thumbs/monarch-06.jpg',          vid: 'media/monarch-reference-06-enhanced.mp4', title: 'MONARCH OS',            meta: 'FILM · MONARCH' },
    { img: 'assets/thumbs/monarch-07.jpg',          vid: 'media/monarch-reference-07-enhanced.mp4', title: 'THE VISION',            meta: 'FILM · MONARCH' }
  ];
  var hall = new THREE.Group();
  var screenMeshes = [];
  var texLoader = new THREE.TextureLoader();
  SCREENS.forEach(function (s, i) {
    var side = (i % 2 === 0) ? 1 : -1;
    var z = -34 - i * 7.1;
    var tex = texLoader.load(s.img);
    if ('colorSpace' in tex && THREE.SRGBColorSpace) tex.colorSpace = THREE.SRGBColorSpace;
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
  });
  scene.add(hall);

  /* gallery DOM label */
  var galIdx = document.getElementById('galIdx');
  var galTitle = document.getElementById('galTitle');
  var galMeta = document.getElementById('galMeta');
  var galActive = -1;
  function updateGalleryLabel(camZ) {
    if (!galIdx || !galTitle) return;
    var idx = Math.round((-camZ - 30) / 7.1);
    idx = Math.max(0, Math.min(SCREENS.length - 1, idx));
    if (idx !== galActive) {
      galActive = idx;
      galIdx.textContent = ('0' + (idx + 1)).slice(-2);
      galTitle.textContent = SCREENS[idx].title;
      galMeta.textContent = SCREENS[idx].meta;
    }
  }

  /* click screens → existing #player lightbox */
  var raycaster = new THREE.Raycaster();
  var pointer = new THREE.Vector2();
  canvas.addEventListener('click', function (ev) {
    pointer.x = (ev.clientX / window.innerWidth) * 2 - 1;
    pointer.y = -(ev.clientY / window.innerHeight) * 2 + 1;
    raycaster.setFromCamera(pointer, camera);
    var hits = raycaster.intersectObjects(screenMeshes, false);
    if (!hits.length) return;
    var d = hits[0].object.userData;
    var pl = document.getElementById('player'), plV = document.getElementById('plVideo'),
        plT = document.getElementById('plTitle');
    if (!pl || !plV) return;
    plV.style.display = ''; plV.dataset.wide = '1'; plV.src = d.video;
    if (plT) plT.textContent = (d.title || 'FILM').toUpperCase();
    pl.classList.add('on'); pl.setAttribute('aria-hidden', 'false');
    document.body.classList.add('locked');
    window.setTimeout(function () { plV.play().catch(function () {}); }, 80);
  });

  /* ── alley: rising embers ─────────────────────────────────── */
  var EMBER_N = 210;
  var emberPos = new Float32Array(EMBER_N * 3);
  var emberSpd = new Float32Array(EMBER_N);
  var emberPhase = new Float32Array(EMBER_N);
  for (var ei = 0; ei < EMBER_N; ei++) {
    emberPos[ei * 3] = (Math.random() - 0.5) * 13;
    emberPos[ei * 3 + 1] = Math.random() * 6.4;
    emberPos[ei * 3 + 2] = -104 - Math.random() * 38;
    emberSpd[ei] = 0.35 + Math.random() * 0.65;
    emberPhase[ei] = Math.random() * Math.PI * 2;
  }
  var emberGeo = new THREE.BufferGeometry();
  emberGeo.setAttribute('position', new THREE.BufferAttribute(emberPos, 3));
  var emberMat = new THREE.PointsMaterial({
    color: 0xff6a30, size: 0.16, map: sprite, transparent: true,
    depthWrite: false, blending: THREE.AdditiveBlending, opacity: 0.95
  });
  var embers = new THREE.Points(emberGeo, emberMat);
  embers.visible = false;
  scene.add(embers);

  /* ── scroll rail: element-anchored fog/accent keyframes ────── */
  var STOPS = [
    { id: 'chHero',    fog: [6, 6, 6],      ac: [255, 43, 54]  },
    { id: 'chGallery', fog: [10, 10, 15],   ac: [255, 43, 54]  },
    { id: 'chWho',     fog: [4, 8, 18],     ac: [110, 168, 255]},
    { id: 'chAlley',   fog: [23, 4, 2],     ac: [255, 58, 26]  },
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
        f = (top + el.offsetHeight * 0.5 - vh * 0.5) / Math.max(1, docH - vh);
        f = Math.max(0, Math.min(1, f));
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

  /* ── mouse parallax ───────────────────────────────────────── */
  var mx = 0, my = 0, mxS = 0, myS = 0;
  window.addEventListener('mousemove', function (e) {
    mx = (e.clientX / window.innerWidth) * 2 - 1;
    my = (e.clientY / window.innerHeight) * 2 - 1;
  }, { passive: true });

  /* ── resize ───────────────────────────────────────────────── */
  window.addEventListener('resize', function () {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
    metrics = docMetrics();
  });

  /* ── main loop ────────────────────────────────────────────── */
  var scrollCur = 0, tPrev = performance.now() / 1000;
  var glitchAt = 2.4, glitchUntil = 0;
  var fogCol = new THREE.Color(6 / 255, 6 / 255, 6 / 255);
  var acCol = new THREE.Color(1, 0.17, 0.21);

  function tick() {
    requestAnimationFrame(tick);
    var t = performance.now() / 1000;
    var dt = Math.min(0.05, t - tPrev); tPrev = t;

    var maxScroll = Math.max(1, metrics.docH - metrics.vh);
    var target = Math.max(0, Math.min(1, window.scrollY / maxScroll));
    scrollCur += (target - scrollCur) * (reduced ? 1 : 0.075);
    var prog = scrollCur;

    /* camera rail */
    var camZ = 12 - 152 * prog;
    var camX = reduced ? 0 : Math.sin(prog * Math.PI * 4.2) * 0.72;
    var camY = 1.72 + (reduced ? 0 : Math.sin(prog * Math.PI * 3.1) * 0.14);
    camera.position.set(camX, camY, camZ);
    camera.lookAt(camX * 0.45, 2.05, camZ - 9);

    /* atmosphere from keyframes */
    var c = colorsAt(prog);
    fogCol.setRGB(c.fog[0] / 255, c.fog[1] / 255, c.fog[2] / 255);
    acCol.setRGB(c.ac[0] / 255, c.ac[1] / 255, c.ac[2] / 255);
    scene.fog.color.copy(fogCol);
    renderer.setClearColor(fogCol, 1);
    stripMat.color.copy(acCol);
    floorMat.color.copy(acCol).lerp(new THREE.Color(1, 1, 1), 0.35);

    /* hero zone fades */
    var heroVis = Math.max(0, Math.min(1, 1 - (-camZ) / 17));   /* 1 at hero → 0 by z=-17 */
    heroGrid.visible = heroVis > 0.02;
    heroGrid.material.opacity = 0.5 * heroVis;
    corridor.visible = prog > 0.055;
    portrait.visible = heroVis > 0.02;
    if (portrait.visible) {
      portrait.position.y = Math.sin(t * 0.6) * 0.17;
      portrait.rotation.y = mxS * 0.12 + Math.sin(t * 0.32) * 0.055;
      portrait.rotation.x = myS * 0.05;
      mxS += (mx - mxS) * 0.06; myS += (my - myS) * 0.06;
      /* glitch bursts */
      if (portraitMat) {
        if (t > glitchAt) { glitchUntil = t + 0.16; glitchAt = t + 3.1 + Math.random() * 3.6; }
        portraitMat.size = (t < glitchUntil) ? 0.088 : 0.055;
        portrait.position.x = (t < glitchUntil) ? (Math.random() - 0.5) * 0.16 : 0;
      }
    }

    /* embers in the alley */
    embers.visible = prog > 0.74;
    if (embers.visible) {
      var p = emberGeo.attributes.position;
      for (var i = 0; i < EMBER_N; i++) {
        var y = p.getY(i) + emberSpd[i] * dt;
        var x = p.getX(i) + Math.sin(t * 0.9 + emberPhase[i]) * 0.0035;
        if (y > 6.6) { y = 0.05; x = (Math.random() - 0.5) * 13; }
        p.setY(i, y); p.setX(i, x);
      }
      p.needsUpdate = true;
    }

    /* gallery label follows the camera */
    if (camZ < -24 && camZ > -112) updateGalleryLabel(camZ);

    renderer.render(scene, camera);
  }
  tick();

  /* light chapter covers → same #player lightbox */
  $$lwClick();
  function $$lwClick() {
    var cards = document.querySelectorAll('.lw-card[data-src]');
    Array.prototype.forEach.call(cards, function (c) {
      c.addEventListener('click', function () {
        var pl = document.getElementById('player'), plV = document.getElementById('plVideo'),
            plT = document.getElementById('plTitle');
        if (!pl || !plV) return;
        plV.style.display = ''; plV.dataset.wide = c.dataset.wide === '1' ? '1' : '0';
        plV.src = c.dataset.src;
        if (plT) plT.textContent = (c.dataset.title || 'FILM').toUpperCase();
        pl.classList.add('on'); pl.setAttribute('aria-hidden', 'false');
        document.body.classList.add('locked');
        window.setTimeout(function () { plV.play().catch(function () {}); }, 80);
      });
    });
  }

  /* ── loader completion ────────────────────────────────────── */
  var loaderDone = false;
  function done() { if (loaderDone) return; loaderDone = true; finishLoader(); }
  window.addEventListener('load', function () { window.setTimeout(done, 350); });
  window.setTimeout(done, 2800); /* never trap the user behind a loader */
})();
