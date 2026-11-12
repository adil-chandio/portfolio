/* ============================================================
   MONARCH — WORLD v3.1 · "reference-grade" WebGL scroll film
   Dominikfojcik-technique. Adil's own assets only.
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
  setProg(0.42);

  var scene = new THREE.Scene();
  scene.fog = new THREE.Fog(0x060606, 13, 92);

  var camera = new THREE.PerspectiveCamera(56, window.innerWidth / window.innerHeight, 0.1, 400);
  camera.position.set(0, 1.72, 12);

  /* ── sprites & canvas textures ────────────────────────────── */
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
  /* city-canyon windows for the WHO chapter (blue chapter) */
  function makeWindowsTex() {
    var c = document.createElement('canvas'); c.width = 256; c.height = 512;
    var g = c.getContext('2d');
    g.fillStyle = '#04070f'; g.fillRect(0, 0, 256, 512);
    for (var y = 18; y < 500; y += 42) {
      for (var x = 12; x < 244; x += 34) {
        var r = Math.random();
        if (r < 0.30) g.fillStyle = 'rgba(150,195,255,0.95)';       /* lit cool */
        else if (r < 0.36) g.fillStyle = 'rgba(255,190,120,0.9)';   /* rare warm */
        else g.fillStyle = 'rgba(38,58,92,0.55)';                   /* dark */
        g.fillRect(x, y, 22, 26);
      }
    }
    var t = new THREE.CanvasTexture(c); return t;
  }
  /* warm pools of light under the screens (fake floor bounce) */
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
  /* fire glow for the red alley */
  function makeFireTex() {
    var c = document.createElement('canvas'); c.width = c.height = 256;
    var g = c.getContext('2d');
    var grad = g.createRadialGradient(128, 170, 6, 128, 150, 150);
    grad.addColorStop(0, 'rgba(255,240,210,1)');
    grad.addColorStop(0.22, 'rgba(255,150,60,0.9)');
    grad.addColorStop(0.55, 'rgba(255,60,20,0.45)');
    grad.addColorStop(1, 'rgba(255,40,10,0)');
    g.fillStyle = grad; g.fillRect(0, 0, 256, 256);
    return new THREE.CanvasTexture(c);
  }

  /* ── corridor: floor · walls · ceiling · glow strips · pillars ── */
  var corridor = new THREE.Group();
  var floorMat = new THREE.MeshBasicMaterial({ map: makeGridTex(), color: 0xffffff, transparent: true, opacity: 0.92 });
  var floor = new THREE.Mesh(new THREE.PlaneGeometry(16, 330), floorMat);
  floor.rotation.x = -Math.PI / 2; floor.position.set(0, 0, -98);
  corridor.add(floor);

  var wallMat = new THREE.MeshBasicMaterial({ map: makePanelTex(), color: 0x9d9da6 });
  var wallGeo = new THREE.PlaneGeometry(330, 7);
  var wallL = new THREE.Mesh(wallGeo, wallMat);
  wallL.rotation.y = Math.PI / 2; wallL.position.set(-7.6, 3.4, -98);
  var wallR = new THREE.Mesh(wallGeo, wallMat);
  wallR.rotation.y = -Math.PI / 2; wallR.position.set(7.6, 3.4, -98);
  corridor.add(wallL); corridor.add(wallR);

  var ceil = new THREE.Mesh(new THREE.PlaneGeometry(16, 330), new THREE.MeshBasicMaterial({ color: 0x030304 }));
  ceil.rotation.x = Math.PI / 2; ceil.position.set(0, 6.9, -98);
  corridor.add(ceil);

  var stripMat = new THREE.MeshBasicMaterial({ color: 0xff2b36 });
  var stripGeo = new THREE.BoxGeometry(0.12, 0.09, 310);
  [2.35, 4.7].forEach(function (y) {
    [-7.38, 7.38].forEach(function (x) {
      var s = new THREE.Mesh(stripGeo, stripMat);
      s.position.set(x, y, -98); corridor.add(s);
    });
  });

  var pillarMat = new THREE.MeshBasicMaterial({ color: 0x101016 });
  var pillarGeo = new THREE.BoxGeometry(0.7, 6.9, 0.7);
  for (var pz = 10; pz > -240; pz -= 15) {
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

  /* ── hero: warped wireframe grid dome (the fojcik bulge) ───── */
  var heroGrid = (function () {
    var geo = new THREE.PlaneGeometry(80, 80, 64, 64);
    var pos = geo.attributes.position;
    for (var i = 0; i < pos.count; i++) {
      var x = pos.getX(i), y = pos.getY(i);
      var d2 = (x * x) / 210 + Math.pow(y - 6, 2) / 130;
      pos.setZ(i, 9.5 * Math.exp(-d2) + Math.random() * 0.12);
    }
    var mat = new THREE.MeshBasicMaterial({ color: 0xe8e4da, wireframe: true, transparent: true, opacity: 0.5 });
    var m = new THREE.Mesh(geo, mat);
    m.rotation.x = -Math.PI / 2;
    m.position.set(0, -2.1, 4);
    return m;
  })();
  scene.add(heroGrid);

  /* ── hero: ~24k-point portrait of Adil (mask ignites red) ──── */
  var portrait = new THREE.Group();
  var portraitMat = null;
  (function buildPortrait() {
    var img = new Image();
    img.onload = function () {
      var w = 190, h = Math.round(190 * (img.height / img.width));
      var c = document.createElement('canvas'); c.width = w; c.height = h;
      var g = c.getContext('2d');
      g.drawImage(img, 0, 0, w, h);
      var data = g.getImageData(0, 0, w, h).data;
      var pts = [], cols = [];
      var H = 7.3, W = H * (w / h);
      for (var y = 0; y < h; y += 1) {
        for (var x = 0; x < w; x += 1) {
          var idx = (y * w + x) * 4;
          var r = data[idx], gg = data[idx + 1], b = data[idx + 2];
          var lum = 0.2126 * r + 0.7152 * gg + 0.0722 * b;
          if (lum < 20) continue;
          if (Math.random() > (lum / 255) * 1.3 + 0.13) continue;
          var px = (x / w - 0.5) * W;
          var py = (0.5 - y / h) * H + 0.75;
          var nd = Math.hypot((x / w - 0.5) * 1.35, (y / h - 0.45) * 1.7);
          var pz = (1 - Math.min(1, nd)) * 1.4 + (Math.random() - 0.5) * 0.22;
          pts.push(px, py, pz);
          var boost = 1.16;
          var rr = Math.min(1, (r / 255) * boost), gb = Math.min(1, (gg / 255) * boost), bb = Math.min(1, (b / 255) * boost);
          if (r > gg * 1.3 && r > b * 1.3) rr = Math.min(1, rr * 1.62 + 0.09);   /* the mask burns */
          cols.push(rr, gb, bb);
        }
      }
      if (pts.length > 24000 * 3) { pts = pts.slice(0, 24000 * 3); cols = cols.slice(0, 24000 * 3); }
      var geo = new THREE.BufferGeometry();
      geo.setAttribute('position', new THREE.Float32BufferAttribute(pts, 3));
      geo.setAttribute('color', new THREE.Float32BufferAttribute(cols, 3));
      portraitMat = new THREE.PointsMaterial({
        size: 0.062, map: sprite, vertexColors: true, transparent: true,
        depthWrite: false, blending: THREE.AdditiveBlending, sizeAttenuation: true
      });
      portrait.add(new THREE.Points(geo, portraitMat));
      setProg(Math.max(0.8, 0.8));
    };
    img.src = 'assets/portrait-masked.png';
  })();
  scene.add(portrait);

  /* hero dust — slow rising motes in the beam */
  var DUST_N = 90, dustPos = new Float32Array(DUST_N * 3), dustSpd = new Float32Array(DUST_N);
  for (var di = 0; di < DUST_N; di++) {
    dustPos[di * 3] = (Math.random() - 0.5) * 9;
    dustPos[di * 3 + 1] = Math.random() * 6.5;
    dustPos[di * 3 + 2] = 2 + Math.random() * 6;
    dustSpd[di] = 0.12 + Math.random() * 0.25;
  }
  var dustGeo = new THREE.BufferGeometry();
  dustGeo.setAttribute('position', new THREE.BufferAttribute(dustPos, 3));
  var dust = new THREE.Points(dustGeo, new THREE.PointsMaterial({
    color: 0xfff6e8, size: 0.05, map: sprite, transparent: true, opacity: 0.55,
    depthWrite: false, blending: THREE.AdditiveBlending
  }));
  scene.add(dust);

  /* ── gallery: floating screens + floor light pools ─────────── */
  var SCREENS = [
    { img: 'assets/thumbs/th-power.jpg',            vid: 'media/monarch-portfolio-v5.mp4',        title: 'MONARCH — THE MAIN FILM',   info: 'The 37-second showreel — M4, mask, red.', tags: ['EDIT', 'GRADE'] },
    { img: 'assets/thumbs/monarch-00.jpg',          vid: 'media/paanch.web.mp4',                  title: 'PAANCH RULES — MOTIVATIONAL SHORT', info: 'Cuts locked to the beat — one short.', tags: ['EDIT'] },
    { img: 'assets/thumbs/monarch-01.jpg',          vid: 'media/monarch-01-web.mp4',              title: 'MONARCH STUDIO',            info: 'Studio identity film for the MONARCH brand.', tags: ['EDIT', 'BRAND'] },
    { img: 'assets/thumbs/th-lawone.jpg',           vid: 'media/lawone.web.mp4',                  title: 'MONARCH: LAW ONE',          info: 'Cinematic law story — paced for retention.', tags: ['EDIT', 'STORY'] },
    { img: 'assets/thumbs/monarch-02.jpg',          vid: 'media/monarch-02-web.mp4',              title: 'CLARITY IN MOTION',         info: 'Motion study for MONARCH — clarity in the cut.', tags: ['EDIT', 'MOTION'] },
    { img: 'assets/thumbs/monarch-03.jpg',          vid: 'media/monarch-03-web.mp4',              title: 'YOUR CREATIVE PARTNER',     info: 'Partnership film for creative brands.', tags: ['EDIT', 'BRAND'] },
    { img: 'assets/thumbs/monarch-04.jpg',          vid: 'media/monarch-04-web.mp4',              title: 'FROM IDEA TO IMPACT',       info: 'From first frame to final impact.', tags: ['EDIT'] },
    { img: 'assets/thumbs/monarch-05.jpg',          vid: 'media/monarch-05-web.mp4',              title: 'WHERE IDEAS BEGIN',         info: 'Origin film — where MONARCH ideas begin.', tags: ['EDIT'] },
    { img: 'assets/thumbs/monarch-06.jpg',          vid: 'media/monarch-reference-06-enhanced.mp4', title: 'MONARCH OS',              info: 'The OS of the MONARCH pipeline.', tags: ['EDIT', 'SYSTEMS'] },
    { img: 'assets/thumbs/monarch-07.jpg',          vid: 'media/monarch-reference-07-enhanced.mp4', title: 'THE VISION',              info: 'The long-vision film for MONARCH.', tags: ['EDIT', 'VISION'] }
  ];
  var hall = new THREE.Group();
  var screenMeshes = [];
  var texLoader = new THREE.TextureLoader();
  var poolTex = makePoolTex();
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
    /* warm pool of light on the floor beneath the screen */
    var pool = new THREE.Mesh(new THREE.PlaneGeometry(5.6, 4.2),
      new THREE.MeshBasicMaterial({ map: poolTex, transparent: true, opacity: 0.55, depthWrite: false, blending: THREE.AdditiveBlending }));
    pool.rotation.x = -Math.PI / 2;
    pool.position.set(side * 5.6, 0.02, z);
    hall.add(pool);
  });
  scene.add(hall);

  /* gallery DOM panel (reference: PROJECT / INFO / ROLE) */
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

  /* click screens → existing #player lightbox */
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

  /* ── WHO canyon: blue-lit window walls (the city street) ───── */
  var winTexA = makeWindowsTex(), winTexB = makeWindowsTex();
  var winMatA = new THREE.MeshBasicMaterial({ map: winTexA, color: 0xffffff });
  var winMatB = new THREE.MeshBasicMaterial({ map: winTexB, color: 0xffffff });
  for (var wi = 0; wi < 7; wi++) {
    var wz = -97 - wi * 4.6;
    var wL = new THREE.Mesh(new THREE.PlaneGeometry(3.4, 5.6), winMatA);
    wL.rotation.y = Math.PI / 2; wL.position.set(-7.45, 3.35, wz);
    var wR = new THREE.Mesh(new THREE.PlaneGeometry(3.4, 5.6), winMatB);
    wR.rotation.y = -Math.PI / 2; wR.position.set(7.45, 3.35, wz + 2.3);
    scene.add(wL); scene.add(wR);
  }

  /* ── ALLEY finale: fire glows + rising embers ──────────────── */
  var fireTex = makeFireTex();
  var fires = [];
  [[-3.4, 2.4, -121, 7.5], [2.8, 3.0, -131, 10.5], [0, 1.7, -139, 5.6]].forEach(function (f, i) {
    var m = new THREE.Mesh(new THREE.PlaneGeometry(f[3], f[3] * 1.18),
      new THREE.MeshBasicMaterial({ map: fireTex, transparent: true, opacity: 0.85, depthWrite: false, blending: THREE.AdditiveBlending }));
    m.position.set(f[0], f[1], f[2]);
    scene.add(m); fires.push(m);
  });

  var EMBER_N = 240;
  var emberPos = new Float32Array(EMBER_N * 3);
  var emberSpd = new Float32Array(EMBER_N);
  var emberPhase = new Float32Array(EMBER_N);
  for (var ei = 0; ei < EMBER_N; ei++) {
    emberPos[ei * 3] = (Math.random() - 0.5) * 13;
    emberPos[ei * 3 + 1] = Math.random() * 6.4;
    emberPos[ei * 3 + 2] = -112 - Math.random() * 34;
    emberSpd[ei] = 0.35 + Math.random() * 0.7;
    emberPhase[ei] = Math.random() * Math.PI * 2;
  }
  var emberGeo = new THREE.BufferGeometry();
  emberGeo.setAttribute('position', new THREE.BufferAttribute(emberPos, 3));
  var embers = new THREE.Points(emberGeo, new THREE.PointsMaterial({
    color: 0xff6a30, size: 0.17, map: sprite, transparent: true, opacity: 0.95,
    depthWrite: false, blending: THREE.AdditiveBlending
  }));
  embers.visible = false;
  scene.add(embers);

  /* ── scroll rail: element-anchored atmosphere keyframes ─────── */
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

  /* ── hero DOM fade ─────────────────────────────────────────── */
  var heroEls = ['.glh-core', '.glh-side', '.glh-caps', '.glh-cue'].map(function (q) { return document.querySelector(q); });

  /* ── mouse parallax ─────────────────────────────────────────── */
  var mx = 0, my = 0, mxS = 0, myS = 0;
  window.addEventListener('mousemove', function (e) {
    mx = (e.clientX / window.innerWidth) * 2 - 1;
    my = (e.clientY / window.innerHeight) * 2 - 1;
  }, { passive: true });

  /* ── resize ─────────────────────────────────────────────────── */
  window.addEventListener('resize', function () {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
    metrics = docMetrics();
  });

  /* ── main loop ──────────────────────────────────────────────── */
  var scrollCur = 0, tPrev = performance.now() / 1000;
  var glitchAt = 2.2, glitchUntil = 0;
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
    scrollCur += (target - scrollCur) * (reduced ? 1 : 0.075);
    var prog = scrollCur;

    /* camera rail — with a whisper of roll + breathing focal length */
    var camZ = 12 - 152 * prog;
    var camX = reduced ? 0 : Math.sin(prog * Math.PI * 4.2) * 0.72;
    var camY = 1.72 + (reduced ? 0 : Math.sin(prog * Math.PI * 3.1) * 0.14);
    camera.position.set(camX, camY, camZ);
    camera.lookAt(camX * 0.45, 2.05, camZ - 9);
    if (!reduced) camera.rotateZ(Math.sin(prog * Math.PI * 2.3) * 0.013);
    camera.fov = 56 + Math.sin(prog * Math.PI * 2) * 1.5;
    camera.updateProjectionMatrix();

    /* atmosphere */
    var c = colorsAt(prog);
    fogCol.setRGB(c.fog[0] / 255, c.fog[1] / 255, c.fog[2] / 255);
    acCol.setRGB(c.ac[0] / 255, c.ac[1] / 255, c.ac[2] / 255);
    scene.fog.color.copy(fogCol);
    renderer.setClearColor(fogCol, 1);
    stripMat.color.copy(acCol);
    floorMat.color.copy(tmpColor.copy(acCol).lerp(white, 0.35));

    /* hero zone */
    var heroVis = Math.max(0, Math.min(1, 1 - (-camZ) / 17));
    heroGrid.visible = heroVis > 0.02;
    heroGrid.material.opacity = 0.5 * heroVis;
    corridor.visible = prog > 0.05;
    portrait.visible = heroVis > 0.02;
    dust.visible = heroVis > 0.05;
    if (portrait.visible) {
      portrait.position.y = Math.sin(t * 0.6) * 0.17;
      portrait.rotation.y = mxS * 0.12 + Math.sin(t * 0.32) * 0.055;
      portrait.rotation.x = myS * 0.05;
      mxS += (mx - mxS) * 0.06; myS += (my - myS) * 0.06;
      if (portraitMat) {
        if (t > glitchAt) { glitchUntil = t + 0.16; glitchAt = t + 3.0 + Math.random() * 3.4; }
        portraitMat.size = (t < glitchUntil) ? 0.092 : 0.062;
        portrait.position.x = (t < glitchUntil) ? (Math.random() - 0.5) * 0.18 : 0;
      }
    }
    if (dust.visible && !reduced) {
      var dp = dustGeo.attributes.position;
      for (var i2 = 0; i2 < DUST_N; i2++) {
        var yy = dp.getY(i2) + dustSpd[i2] * dt;
        if (yy > 6.6) yy = 0.05;
        dp.setY(i2, yy);
      }
      dp.needsUpdate = true;
    }
    /* hero DOM fades as the rail leaves it */
    var heroFade = Math.max(0, Math.min(1, 1 - prog / 0.085));
    for (var hi = 0; hi < heroEls.length; hi++) {
      var el = heroEls[hi]; if (!el) continue;
      el.style.opacity = heroFade;
      el.style.transform = 'translateY(' + ((1 - heroFade) * -46) + 'px)';
      el.style.pointerEvents = heroFade < 0.25 ? 'none' : '';
    }

    /* alley fires flicker */
    var fireOn = prog > 0.78;
    for (var fi = 0; fi < fires.length; fi++) {
      var fm = fires[fi];
      fm.visible = fireOn;
      if (fireOn) {
        var fl = 1 + 0.16 * Math.sin(t * 6.4 + fi * 2.1) + 0.07 * Math.sin(t * 11.7 + fi);
        fm.scale.set(fl, fl * (1 + 0.1 * Math.sin(t * 8.3 + fi * 1.7)), 1);
        fm.material.opacity = 0.62 + 0.3 * (0.5 + 0.5 * Math.sin(t * 7.1 + fi * 2.6));
      }
    }

    /* embers */
    embers.visible = prog > 0.72;
    if (embers.visible) {
      var p = emberGeo.attributes.position;
      for (var ei2 = 0; ei2 < EMBER_N; ei2++) {
        var y = p.getY(ei2) + emberSpd[ei2] * dt;
        var x = p.getX(ei2) + Math.sin(t * 0.9 + emberPhase[ei2]) * 0.0035;
        if (y > 6.6) { y = 0.05; x = (Math.random() - 0.5) * 13; }
        p.setY(ei2, y); p.setX(ei2, x);
      }
      p.needsUpdate = true;
    }

    /* gallery panel follows the camera */
    if (camZ < -24 && camZ > -112) updateGalleryPanel(camZ);

    renderer.render(scene, camera);
  }
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
