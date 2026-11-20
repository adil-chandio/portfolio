/* ============================================================
   MONARCH — WORLD v6 · Photorealistic WebGL hall
   Real architecture, PBR materials, shadow-casting light rig,
   environment reflections, ACES filmic tone mapping.
   Scroll-scrubbed cinematic flight — Adil's own assets.
   ============================================================ */
(function () {
  'use strict';

  var reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var glLoader = document.getElementById('glLoader');
  var fill = glLoader ? glLoader.querySelector('.ld-bar i') : null;
  function setProg(p) { if (fill) fill.style.width = Math.min(100, Math.round(Math.min(1, p) * 100)) + '%'; }
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
  /* THE SITE MUST NEVER BE TRAPPED BEHIND THIS LOADER. If anything below
     is slow (network, shader compile) or dead (crashed context), the
     site opens anyway — the 3D world is a bonus, not a gate. */
  window.setTimeout(finishLoader, 4000);
  window.addEventListener('error', function () {
    document.documentElement.classList.add('no-gl');
    finishLoader();
  }, { once: true });
  setProg(0.15);

  var canvas = document.getElementById('gl');
  if (!canvas || !window.THREE) { failSoft(); return; }

  var THREE = window.THREE;
  var lite30 = window.matchMedia('(pointer: coarse)').matches || window.innerWidth < 760;
  var renderer;
  try {
    renderer = new THREE.WebGLRenderer({ canvas: canvas, antialias: !lite30, powerPreference: 'high-performance' });
  } catch (e) { failSoft(); return; }

  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, lite30 ? 1.25 : 1.5));
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.12;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.setClearColor(0x050506, 1);
  setProg(0.35);

  var scene = new THREE.Scene();
  scene.fog = new THREE.Fog(0x060606, 12, 64);

  var camera = new THREE.PerspectiveCamera(56, window.innerWidth / window.innerHeight, 0.1, 400);
  camera.position.set(0, 1.72, 12);

  /* ── environment: a small lit room baked into an IBL map —
       this is what makes the metal + polished floor REAL ──── */
  var pmrem = new THREE.PMREMGenerator(renderer);
  (function bakeEnv() {
    var env = new THREE.Scene();
    var room = new THREE.Mesh(new THREE.BoxGeometry(40, 26, 40), new THREE.MeshBasicMaterial({ color: 0x0a0a0e, side: THREE.BackSide }));
    env.add(room);
    var top = new THREE.Mesh(new THREE.PlaneGeometry(30, 14), new THREE.MeshBasicMaterial({ color: 0xfff1dd }));
    top.rotation.x = Math.PI / 2; top.position.y = 12.9; env.add(top);
    var redL = new THREE.Mesh(new THREE.PlaneGeometry(1.4, 30), new THREE.MeshBasicMaterial({ color: 0xff2b36 }));
    redL.rotation.y = Math.PI / 2; redL.position.set(-19.8, 1.6, 0); env.add(redL);
    var redR = redL.clone(); redR.rotation.y = -Math.PI / 2; redR.position.x = 19.8; env.add(redR);
    var cool = new THREE.Mesh(new THREE.PlaneGeometry(10, 4), new THREE.MeshBasicMaterial({ color: 0x3a4a6a }));
    cool.position.set(0, 3, -19.8); env.add(cool);
    var bounce = new THREE.Mesh(new THREE.PlaneGeometry(38, 38), new THREE.MeshBasicMaterial({ color: 0x16161c }));
    bounce.rotation.x = -Math.PI / 2; bounce.position.y = 0.05; env.add(bounce);
    scene.environment = pmrem.fromScene(env, 0.06).texture;
    pmrem.dispose();
  })();
  setProg(0.5);

  /* ── textures ─────────────────────────────────────────────── */
  function makeSprite() {
    var c = document.createElement('canvas'); c.width = c.height = 64;
    var g = c.getContext('2d');
    var grad = g.createRadialGradient(32, 32, 0, 32, 32, 32);
    grad.addColorStop(0, 'rgba(255,255,255,1)');
    grad.addColorStop(0.4, 'rgba(255,255,255,.85)');
    grad.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = grad; g.fillRect(0, 0, 64, 64);
    return new THREE.CanvasTexture(c);
  }
  var sprite = makeSprite();

  function makeFloorTex() {
    var c = document.createElement('canvas'); c.width = c.height = 512;
    var g = c.getContext('2d');
    g.fillStyle = '#141417'; g.fillRect(0, 0, 512, 512);
    g.strokeStyle = 'rgba(255,255,255,0.055)'; g.lineWidth = 1;
    for (var i = 0; i <= 512; i += 64) {
      g.beginPath(); g.moveTo(i + .5, 0); g.lineTo(i + .5, 512); g.stroke();
      g.beginPath(); g.moveTo(0, i + .5); g.lineTo(512, i + .5); g.stroke();
    }
    /* faint panel wear */
    for (var n = 0; n < 420; n++) {
      g.fillStyle = 'rgba(255,255,255,' + (Math.random() * 0.03) + ')';
      g.fillRect(Math.random() * 512, Math.random() * 512, Math.random() * 26, 1);
    }
    var t = new THREE.CanvasTexture(c);
    t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(6, 88);
    if (THREE.SRGBColorSpace) t.colorSpace = THREE.SRGBColorSpace;
    return t;
  }
  function makeGateTex() {
    var c = document.createElement('canvas'); c.width = 512; c.height = 320;
    var g = c.getContext('2d');
    g.fillStyle = '#000'; g.fillRect(0, 0, 512, 320);
    var grad = g.createRadialGradient(256, 140, 0, 256, 140, 250);
    grad.addColorStop(0, 'rgba(255,244,230,1)');
    grad.addColorStop(0.22, 'rgba(255,120,80,.85)');
    grad.addColorStop(0.55, 'rgba(160,26,18,.4)');
    grad.addColorStop(1, 'rgba(0,0,0,0)');
    g.fillStyle = grad; g.fillRect(0, 0, 512, 320);
    var t = new THREE.CanvasTexture(c);
    if (THREE.SRGBColorSpace) t.colorSpace = THREE.SRGBColorSpace;
    return t;
  }
  var floorTex = makeFloorTex();
  var gateTex = makeGateTex();

  /* ── PBR material palette ─────────────────────────────────── */
  var floorMat = new THREE.MeshStandardMaterial({ map: floorTex, color: 0x8a8a92, metalness: 0.88, roughness: 0.32, envMapIntensity: 1.15 });
  var inlayMat = new THREE.MeshStandardMaterial({ color: 0x2a2a33, metalness: 1.0, roughness: 0.14, envMapIntensity: 1.6 });
  var wallMat = new THREE.MeshStandardMaterial({ color: 0x1a1a21, metalness: 0.85, roughness: 0.44, envMapIntensity: 0.55 });
  var trimMat = new THREE.MeshStandardMaterial({ color: 0x0d0d11, metalness: 0.7, roughness: 0.5, envMapIntensity: 0.4 });
  var ceilMat = new THREE.MeshStandardMaterial({ color: 0x0b0b0e, metalness: 0.4, roughness: 0.85, envMapIntensity: 0.25 });
  var pillarMat = new THREE.MeshStandardMaterial({ color: 0x23232c, metalness: 0.95, roughness: 0.26, envMapIntensity: 0.95 });
  var frameMat = new THREE.MeshStandardMaterial({ color: 0x1c1c24, metalness: 0.9, roughness: 0.3, envMapIntensity: 0.7 });
  var pedMat = new THREE.MeshStandardMaterial({ color: 0x26262f, metalness: 0.95, roughness: 0.2, envMapIntensity: 1.2 });
  var discMat = new THREE.MeshStandardMaterial({ color: 0x131318, metalness: 0.8, roughness: 0.28, envMapIntensity: 1.0 });
  /* emissive light sources (real geometry that glows) */
  var coveMat = new THREE.MeshStandardMaterial({ color: 0x000000, emissive: 0xff2b36, emissiveIntensity: 2.6 });
  var lineMat = new THREE.MeshStandardMaterial({ color: 0x000000, emissive: 0xff2b36, emissiveIntensity: 3.2 });
  var lampMat = new THREE.MeshStandardMaterial({ color: 0x181818, emissive: 0xfff1dd, emissiveIntensity: 2.2 });
  var ringMat = new THREE.MeshStandardMaterial({ color: 0x000000, emissive: 0xff2b36, emissiveIntensity: 1.9 });
  var rimMat = new THREE.MeshStandardMaterial({ color: 0x000000, emissive: 0xff2b36, emissiveIntensity: 4.5 });
  var gateFieldMat = new THREE.MeshBasicMaterial({ map: gateTex, transparent: true, depthWrite: false });
  gateFieldMat.color.setRGB(2.4, 1.7, 1.45);

  /* ── the floor + polished center inlay ────────────────────── */
  var floor = new THREE.Mesh(new THREE.PlaneGeometry(26, 320), floorMat);
  floor.rotation.x = -Math.PI / 2; floor.position.set(0, 0, -96);
  floor.receiveShadow = true;
  scene.add(floor);

  var inlay = new THREE.Mesh(new THREE.BoxGeometry(3.2, 0.035, 214), inlayMat);
  inlay.position.set(0, 0.018, -52);
  inlay.receiveShadow = true;
  scene.add(inlay);

  /* ── walls: real panels with glowing cove gaps (instanced) ── */
  var PANELS = 29;
  var panelGeo = new THREE.BoxGeometry(0.24, 7, 5.2);
  var coveGeo = new THREE.BoxGeometry(0.1, 6.55, 0.62);
  var baseGeo = new THREE.BoxGeometry(0.5, 0.34, 178);
  var crownGeo = new THREE.BoxGeometry(0.5, 0.4, 178);
  [-1, 1].forEach(function (side) {
    var panels = new THREE.InstancedMesh(panelGeo, wallMat, PANELS);
    var coves = new THREE.InstancedMesh(coveGeo, coveMat, PANELS - 1);
    var m = new THREE.Matrix4();
    for (var k = 0; k < PANELS; k++) {
      m.setPosition(side * 7.62, 3.5, 10 - k * 6);
      panels.setMatrixAt(k, m);
    }
    panels.instanceMatrix.needsUpdate = true;
    panels.receiveShadow = true;
    scene.add(panels);
    for (var j = 0; j < PANELS - 1; j++) {
      m.setPosition(side * 7.5, 3.5, 7 - j * 6);
      coves.setMatrixAt(j, m);
    }
    coves.instanceMatrix.needsUpdate = true;
    scene.add(coves);
    var base = new THREE.Mesh(baseGeo, trimMat);
    base.position.set(side * 7.55, 0.17, -85); base.receiveShadow = true; scene.add(base);
    var crown = new THREE.Mesh(crownGeo, trimMat);
    crown.position.set(side * 7.55, 6.95, -85); scene.add(crown);
  });

  var ceil = new THREE.Mesh(new THREE.PlaneGeometry(26, 320), ceilMat);
  ceil.rotation.x = Math.PI / 2; ceil.position.set(0, 7, -96);
  scene.add(ceil);

  /* ceiling lamp discs — the real sources of the overhead light */
  var lampGeo = new THREE.CylinderGeometry(0.3, 0.34, 0.06, 20);
  var LAMP_N = 28;
  var lamps = new THREE.InstancedMesh(lampGeo, lampMat, LAMP_N);
  (function () {
    var m = new THREE.Matrix4(); var i = 0;
    for (var z = 4; z > -152; z -= 12) {
      m.setPosition(-2.4, 6.96, z); lamps.setMatrixAt(i++, m);
      m.setPosition(2.4, 6.96, z); lamps.setMatrixAt(i++, m);
    }
    lamps.instanceMatrix.needsUpdate = true;
  })();
  scene.add(lamps);

  /* ── monolith pillars with a red energy line ──────────────── */
  var PILLARS = 7;
  var pillarGeo2 = new THREE.BoxGeometry(0.9, 7, 0.9);
  var lineGeo = new THREE.BoxGeometry(0.07, 6.4, 0.07);
  var pillars = new THREE.InstancedMesh(pillarGeo2, pillarMat, PILLARS);
  var pLines = new THREE.InstancedMesh(lineGeo, lineMat, PILLARS);
  (function () {
    var m = new THREE.Matrix4();
    for (var k = 0; k < PILLARS; k++) {
      var side = (k % 2 === 0) ? 1 : -1;
      var z = 4 - k * 24;
      m.setPosition(side * 6.3, 3.5, z); pillars.setMatrixAt(k, m);
      m.setPosition(-side * 6.3 + side * 0.48, 3.5, z); pLines.setMatrixAt(k, m);
    }
    pillars.instanceMatrix.needsUpdate = true;
    pLines.instanceMatrix.needsUpdate = true;
    pillars.castShadow = true; pillars.receiveShadow = true;
  })();
  scene.add(pillars); scene.add(pLines);

  /* ── HERO: stage disc, glowing rings, pedestal, the portrait ─ */
  var heroGroup = new THREE.Group();
  var disc = new THREE.Mesh(new THREE.CircleGeometry(6.2, 48), discMat);
  disc.rotation.x = -Math.PI / 2; disc.position.y = 0.012;
  disc.receiveShadow = true;
  heroGroup.add(disc);
  [2.2, 3.4, 4.7].forEach(function (r, i) {
    var ring = new THREE.Mesh(new THREE.TorusGeometry(r, 0.026, 8, 72), ringMat);
    ring.rotation.x = -Math.PI / 2; ring.position.y = 0.03 + i * 0.002;
    heroGroup.add(ring);
  });
  var pedestal = new THREE.Mesh(new THREE.CylinderGeometry(1.0, 1.28, 0.55, 40), pedMat);
  pedestal.position.set(0, 0.275, 0.6);
  pedestal.castShadow = true; pedestal.receiveShadow = true;
  heroGroup.add(pedestal);
  var pedTop = new THREE.Mesh(new THREE.CylinderGeometry(1.02, 1.02, 0.03, 40), inlayMat);
  pedTop.position.set(0, 0.565, 0.6);
  heroGroup.add(pedTop);
  scene.add(heroGroup);

  var portrait = new THREE.Group();
  var portraitMat = null;
  var portraitBaseY = 0.92;
  (function buildPortrait() {
    var img = new Image();
    img.onload = function () {
      var w = 190, h = Math.round(190 * (img.height / img.width));
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
          var H = 5.6, W = H * (w / h);
          var px = (x / w - 0.5) * W;
          var py = (0.5 - y / h) * H + portraitBaseY;
          var nd = Math.hypot((x / w - 0.5) * 1.35, (y / h - 0.45) * 1.7);
          var pz = (1 - Math.min(1, nd)) * 1.35 + (Math.random() - 0.5) * 0.22;
          pts.push(px, py, pz);
          var boost = 1.18;
          var rr = Math.min(1, (r / 255) * boost), gb = Math.min(1, (gg / 255) * boost), bb = Math.min(1, (b / 255) * boost);
          if (r > gg * 1.35 && r > b * 1.35) rr = Math.min(1, rr * 1.45 + 0.08);
          cols.push(rr, gb, bb);
        }
      }
      if (pts.length > 24000 * 3) { pts = pts.slice(0, 24000 * 3); cols = cols.slice(0, 24000 * 3); }
      var geo = new THREE.BufferGeometry();
      geo.setAttribute('position', new THREE.Float32BufferAttribute(pts, 3));
      geo.setAttribute('color', new THREE.Float32BufferAttribute(cols, 3));
      portraitMat = new THREE.PointsMaterial({
        size: 0.05, map: sprite, vertexColors: true, transparent: true,
        depthWrite: false, blending: THREE.AdditiveBlending, sizeAttenuation: true
      });
      portrait.add(new THREE.Points(geo, portraitMat));
      setProg(0.75);
    };
    img.src = 'assets/portrait-masked.png';
  })();
  scene.add(portrait);

  /* ── gallery: the ten screens — real framed displays ──────── */
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
  var screenRigs = [];
  var texLoader = new THREE.TextureLoader();
  SCREENS.forEach(function (s, i) {
    var side = (i % 2 === 0) ? 1 : -1;
    var z = -34 - i * 7.1;
    var tex = texLoader.load(s.img);
    if ('colorSpace' in tex && THREE.SRGBColorSpace) tex.colorSpace = THREE.SRGBColorSpace;
    var mat = new THREE.MeshBasicMaterial({ map: tex, color: 0xffffff });
    var frame = new THREE.Mesh(new THREE.BoxGeometry(5.15, 3.15, 0.12), frameMat);
    frame.castShadow = true;
    var scr = new THREE.Mesh(new THREE.PlaneGeometry(4.8, 2.8), mat);
    scr.position.z = 0.075;
    scr.userData = { video: s.vid, title: s.title };
    var grp = new THREE.Group();
    grp.add(frame); grp.add(scr);
    grp.position.set(side * 7.28, 2.6, z);
    grp.rotation.y = -side * (Math.PI / 2 - 0.46);
    hall.add(grp);
    screenMeshes.push(scr);
    /* screen light spilling on the floor as you approach */
    var leakMat = new THREE.MeshBasicMaterial({ map: gateTex, color: 0xff2b36, transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending });
    var leak = new THREE.Mesh(new THREE.PlaneGeometry(7, 3.6), leakMat);
    leak.rotation.x = -Math.PI / 2;
    leak.position.set(-side * 5.0, 0.025, z + 1.1);
    hall.add(leak);
    screenRigs.push({ mat: mat, leakMat: leakMat, z: z, leak: leak });
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

  /* ── the alley: the hall closes in ────────────────────────── */
  var alleyWallGeo = new THREE.BoxGeometry(1.3, 2.5, 46);
  [-1, 1].forEach(function (side) {
    var w = new THREE.Mesh(alleyWallGeo, wallMat);
    w.position.set(side * 5.9, 1.25, -122);
    w.castShadow = true; w.receiveShadow = true;
    scene.add(w);
    var l = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.07, 46), lineMat);
    l.position.set(-side * 5.28, 2.45, -122);
    scene.add(l);
  });

  /* ── the GATE: the arch the whole flight is for ───────────── */
  var gate = new THREE.Group();
  var arch = new THREE.Mesh(new THREE.TorusGeometry(6.4, 0.62, 22, 80, Math.PI), pillarMat);
  arch.position.set(0, 0, -152);
  arch.castShadow = true; arch.receiveShadow = true;
  gate.add(arch);
  var rim = new THREE.Mesh(new THREE.TorusGeometry(6.4, 0.13, 14, 80, Math.PI), rimMat);
  rim.position.set(0, 0.05, -151.72);
  gate.add(rim);
  var field = new THREE.Mesh(new THREE.PlaneGeometry(34, 22), gateFieldMat);
  field.position.set(0, 6.2, -171);
  gate.add(field);
  scene.add(gate);

  /* ── the light rig (physical units — r160) ────────────────── */
  var hemi = new THREE.HemisphereLight(0x25324a, 0x08080a, 0.62);
  scene.add(hemi);
  var key = new THREE.DirectionalLight(0xffe4d2, 1.5);
  key.castShadow = true;
  key.shadow.mapSize.set(lite30 ? 512 : 1024, lite30 ? 512 : 1024);
  key.shadow.camera.left = -15; key.shadow.camera.right = 15;
  key.shadow.camera.top = 15; key.shadow.camera.bottom = -15;
  key.shadow.camera.near = 2; key.shadow.camera.far = 55;
  key.shadow.bias = -0.0018;
  /* the scene is static and only the CAMERA flies — so the shadow map
     is rendered only when the flight moves ~0.8u, never per frame */
  key.shadow.autoUpdate = false;
  key.shadow.needsUpdate = true;
  scene.add(key); scene.add(key.target);
  var fillRed = new THREE.PointLight(0xff2b36, 32, 30, 1.9);
  scene.add(fillRed);
  var heroLight = new THREE.PointLight(0xff2b36, 42, 20, 1.9);
  heroLight.position.set(0, 4.4, 1.6);
  scene.add(heroLight);
  var gateLight = new THREE.PointLight(0xff3a26, 130, 60, 1.8);
  gateLight.position.set(0, 5.2, -149);
  scene.add(gateLight);
  var cursorSpot = new THREE.SpotLight(0xffe9d6, 0, 17, 0.52, 0.85, 1.6);
  scene.add(cursorSpot); scene.add(cursorSpot.target);

  /* ── atmosphere: dust (catches the light) + god-ray planes ── */
  function makeDust(count, xRange, yMin, yMax, zNear, zFar, size, opacity) {
    var pos = new Float32Array(count * 3);
    for (var i = 0; i < count; i++) {
      pos[i * 3] = (Math.random() * 2 - 1) * xRange;
      pos[i * 3 + 1] = yMin + Math.random() * (yMax - yMin);
      pos[i * 3 + 2] = zNear - Math.random() * (zNear - zFar);
    }
    var geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    var mat = new THREE.PointsMaterial({ size: size, map: sprite, transparent: true, opacity: opacity, color: 0xbfc3cc, depthWrite: false, blending: THREE.AdditiveBlending });
    var pts = new THREE.Points(geo, mat);
    scene.add(pts);
    return { pts: pts, mat: mat };
  }
  var dustFar = makeDust(lite30 ? 150 : 420, 9.5, 0.15, 6.7, -4, -165, 0.07, 0.34);
  var dustMid = makeDust(lite30 ? 80 : 240, 6.9, 0.1, 6.5, -6, -155, 0.12, 0.42);
  var dustNear = makeDust(lite30 ? 10 : 26, 8.5, 0.35, 5.8, -2, -75, 1.0, 0.15);

  var shaftRigs = [];
  var shaftGeo = new THREE.PlaneGeometry(2.2, 6.9);
  for (var sz = -6; sz > -150; sz -= 15) {
    var sside = ((Math.round(-sz / 15) % 2) === 0) ? 1 : -1;
    var sMat = new THREE.MeshBasicMaterial({ color: 0xff2b36, transparent: true, opacity: 0.04, side: THREE.DoubleSide, depthWrite: false, blending: THREE.AdditiveBlending });
    var sm = new THREE.Mesh(shaftGeo, sMat);
    sm.position.set(sside * 4.7, 3.45, sz);
    sm.rotation.y = Math.PI / 2;
    scene.add(sm);
    shaftRigs.push({ mesh: sm, mat: sMat, z: sz });
  }

  /* ── alley embers + finale storm ──────────────────────────── */
  var EMBER_N = 200;
  var emberPos = new Float32Array(EMBER_N * 3);
  var emberSpd = new Float32Array(EMBER_N);
  var emberPhase = new Float32Array(EMBER_N);
  for (var ei = 0; ei < EMBER_N; ei++) {
    emberPos[ei * 3] = (Math.random() - 0.5) * 10;
    emberPos[ei * 3 + 1] = Math.random() * 6;
    emberPos[ei * 3 + 2] = -104 - Math.random() * 38;
    emberSpd[ei] = 0.35 + Math.random() * 0.65;
    emberPhase[ei] = Math.random() * Math.PI * 2;
  }
  var emberGeo = new THREE.BufferGeometry();
  emberGeo.setAttribute('position', new THREE.BufferAttribute(emberPos, 3));
  var emberMat = new THREE.PointsMaterial({ color: 0xff6a30, size: 0.15, map: sprite, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, opacity: 0.9 });
  var embers = new THREE.Points(emberGeo, emberMat);
  embers.visible = false;
  scene.add(embers);

  var STORM_N = lite30 ? 90 : 220;
  var stormPos = new Float32Array(STORM_N * 3);
  var stormSpd = new Float32Array(STORM_N);
  var stormPhase = new Float32Array(STORM_N);
  for (var st = 0; st < STORM_N; st++) {
    stormPos[st * 3] = (Math.random() - 0.5) * 12;
    stormPos[st * 3 + 1] = Math.random() * 6.5;
    stormPos[st * 3 + 2] = -100 - Math.random() * 48;
    stormSpd[st] = 1.2 + Math.random() * 1.1;
    stormPhase[st] = Math.random() * Math.PI * 2;
  }
  var stormGeo = new THREE.BufferGeometry();
  stormGeo.setAttribute('position', new THREE.BufferAttribute(stormPos, 3));
  var stormMat = new THREE.PointsMaterial({ color: 0xff3a20, size: 0.19, map: sprite, transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending });
  var stormEmbers = new THREE.Points(stormGeo, stormMat);
  scene.add(stormEmbers);

  /* ── chapter keyframes (fog + accent drive the whole rig) ─── */
  var STOPS = [
    { id: 'chHero',    fog: [6, 6, 6],      ac: [255, 43, 54],  fn: 12, ff: 64 },
    { id: 'chGallery', fog: [10, 10, 15],   ac: [255, 43, 54],  fn: 16, ff: 96 },
    { id: 'chWho',     fog: [4, 8, 18],     ac: [110, 168, 255], fn: 14, ff: 84 },
    { id: 'chAlley',   fog: [23, 4, 2],     ac: [255, 58, 26],  fn: 7,  ff: 48 },
    { id: 'contact',   fog: [9, 2, 2],      ac: [255, 43, 54],  fn: 6,  ff: 44 }
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
      return { f: f, fog: s.fog, ac: s.ac, fn: s.fn, ff: s.ff };
    }).sort(function (a, b) { return a.f - b.f; });
    return { docH: docH, vh: vh };
  }
  var metrics = docMetrics();

  /* allocation-free: writes into one preallocated object, zero GC churn */
  var cOut = { fog: [6, 6, 6], ac: [255, 43, 54], fn: 14, ff: 80 };
  function colorsAt(p, out) {
    var i, A, B, t, S;
    if (stops.length && p > stops[0].f) {
      S = null;
      for (i = 0; i < stops.length - 1; i++) {
        A = stops[i]; B = stops[i + 1];
        if (p <= B.f) {
          t = (p - A.f) / Math.max(0.0001, B.f - A.f);
          out.fog[0] = A.fog[0] + (B.fog[0] - A.fog[0]) * t;
          out.fog[1] = A.fog[1] + (B.fog[1] - A.fog[1]) * t;
          out.fog[2] = A.fog[2] + (B.fog[2] - A.fog[2]) * t;
          out.ac[0] = A.ac[0] + (B.ac[0] - A.ac[0]) * t;
          out.ac[1] = A.ac[1] + (B.ac[1] - A.ac[1]) * t;
          out.ac[2] = A.ac[2] + (B.ac[2] - A.ac[2]) * t;
          out.fn = A.fn + (B.fn - A.fn) * t;
          out.ff = A.ff + (B.ff - A.ff) * t;
          return out;
        }
      }
      S = stops[stops.length - 1];
    } else if (stops.length) {
      S = stops[0];
    }
    if (S) {
      out.fog[0] = S.fog[0]; out.fog[1] = S.fog[1]; out.fog[2] = S.fog[2];
      out.ac[0] = S.ac[0]; out.ac[1] = S.ac[1]; out.ac[2] = S.ac[2];
      out.fn = S.fn; out.ff = S.ff;
    }
    return out;
  }

  /* ── mouse + resize ───────────────────────────────────────── */
  var mx = 0, my = 0, mxS = 0, myS = 0;
  function poke() { lastAct = performance.now() / 1000; }
  window.addEventListener('mousemove', function (e) {
    mx = (e.clientX / window.innerWidth) * 2 - 1;
    my = (e.clientY / window.innerHeight) * 2 - 1;
    poke();
  }, { passive: true });
  window.addEventListener('scroll', poke, { passive: true });

  window.addEventListener('resize', function () {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    applySize();
    metrics = docMetrics();
  });

  /* ── reaction: pulses, ripples, screen clicks ─────────────── */
  var pulse = 0, dustFarBase = 0.34;
  window.addEventListener('monarch:pulse', function () { pulse = 1; lastAct = performance.now() / 1000; });
  var ripples = [];
  var ripGeo = new THREE.PlaneGeometry(1, 1);

  var raycaster = new THREE.Raycaster();
  var pointer = new THREE.Vector2();
  canvas.addEventListener('click', function (ev) {
    pointer.x = (ev.clientX / window.innerWidth) * 2 - 1;
    pointer.y = -(ev.clientY / window.innerHeight) * 2 + 1;
    raycaster.setFromCamera(pointer, camera);
    var hits = raycaster.intersectObjects(screenMeshes, false);
    if (!hits.length) {
      if (!reduced) {
        raycaster.setFromCamera(pointer, camera);
        var fh = raycaster.intersectObject(floor, false);
        if (fh.length) {
          var m = new THREE.Mesh(ripGeo, new THREE.MeshBasicMaterial({ map: gateTex, color: 0xff2b36, transparent: true, opacity: 0.5, depthWrite: false, blending: THREE.AdditiveBlending }));
          m.rotation.x = -Math.PI / 2;
          m.position.set(fh[0].point.x, 0.045, fh[0].point.z);
          scene.add(m);
          ripples.push({ mesh: m, mat: m.material, born: performance.now() / 1000 });
          pulse = Math.max(pulse, 0.8);
        }
      }
      return;
    }
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

  /* ── the butter ladder: the SAME photorealistic hall, four ways
       of spending pixels. The big trick: it renders at a FRACTION of
       screen resolution and the browser bilinear-upscales — in a
       foggy, soft-lit scene the upscale is invisible, but pixel work
       drops 40-75%. L0 full · L1 0.8× · L2 0.65×+30fps+no shadow
       · L3 0.5×+30fps. Starts at FULL (L0) so the first frame is
       crisp; if the machine can't hold it, drops within ~0.4s. */
  var QL = lite30 ? 2 : 0, lastQL = 0, eco = false;
  var SC = [1.0, 0.8, 0.65, 0.5];
  var DPRM = lite30 ? [1.25, 1.0, 0.9, 0.9] : [1.5, 1.25, 1.0, 0.9];
  var shadowZ = 1e9;
  var lastAct = performance.now() / 1000;
  function applySize() {
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, DPRM[QL]));
    renderer.setSize(Math.max(2, Math.round(window.innerWidth * SC[QL])), Math.max(2, Math.round(window.innerHeight * SC[QL])), false);
  }
  function applyQ() {
    eco = QL >= 2;
    applySize();
    dustFarBase = [0.34, 0.24, 0.16, 0.14][QL];
    var sm = QL === 0 ? (lite30 ? 512 : 1024) : (QL === 1 ? (lite30 ? 384 : 512) : 0);
    if (sm > 0) {
      if (key.shadow.map) { key.shadow.map.dispose(); key.shadow.map = null; }
      key.shadow.mapSize.set(sm, sm);
      key.castShadow = true;
      key.shadow.needsUpdate = true;
    } else {
      key.castShadow = false;
    }
    dustNear.pts.visible = !lite30 && QL < 2;
  }
  applyQ();

  /* ── main loop ────────────────────────────────────────────── */
  var lastLiteFrame = 0;
  var scrollCur = 0, tPrev = performance.now() / 1000;
  var chapterIdx = -1, cutT = -1, slowN = 0, fastN = 0, tRawPrev = 0;
  var plEl = document.getElementById('player');
  var glitchAt = 2.4, glitchUntil = 0;
  var fogCol = new THREE.Color(6 / 255, 6 / 255, 6 / 255);
  var acCol = new THREE.Color(1, 0.17, 0.21);
  var WHITE = new THREE.Color(0.78, 0.8, 0.86);
  var finePointer = window.matchMedia('(pointer: fine)').matches;
  var floorRay = new THREE.Raycaster();
  var floorNDC = new THREE.Vector2();
  var cursorOn = false;
  var cursorTarget = new THREE.Vector3(0, 0.04, -12);

  function tick() {
    requestAnimationFrame(tick);
    /* frame gate: 30fps cap on weak levels, and an idle sleep — when
       nothing moves (no scroll, no mouse, no pulse) the hall eases to
       15fps; the first touch wakes it to full rate instantly */
    var nowS = performance.now() / 1000;
    var gate = (lite30 || QL >= 2) ? 0.032 : (nowS - lastAct > 1.8 ? 0.033 : 0);
    if (gate && nowS - lastLiteFrame < gate) return;
    lastLiteFrame = nowS;
    if (document.hidden || (plEl && plEl.classList.contains('on'))) { tPrev = performance.now() / 1000; tRawPrev = 0; return; }
    var t = performance.now() / 1000;
    var rawMs = tRawPrev ? (t - tRawPrev) * 1000 : 16; tRawPrev = t;
    var dt = Math.min(0.05, t - tPrev); tPrev = t;

    /* butter ladder — drops fast, climbs slow, never lags */
    if (rawMs > 22) { slowN = Math.min(999, slowN + 1); fastN = 0; }
    else { slowN = Math.max(0, slowN - 2); fastN = rawMs < 16 ? fastN + 1 : 0; }
    if (slowN > 20 && QL < 3) { QL++; applyQ(); slowN = 0; lastQL = t; }
    else if (fastN > 500 && QL > (lite30 ? 1 : 0) && (t - lastQL) > 10) { QL--; applyQ(); fastN = 0; lastQL = t; }
    pulse = Math.max(0, pulse - dt * 1.5);

    var maxScroll = Math.max(1, metrics.docH - metrics.vh);
    var target = Math.max(0, Math.min(1, window.scrollY / maxScroll));
    scrollCur += (target - scrollCur) * (reduced ? 1 : (1 - Math.pow(0.925, dt * 60)));
    var prog = scrollCur;

    /* camera rail + finale crane */
    var camZ = 12 - 152 * prog;
    var camX = reduced ? 0 : Math.sin(prog * Math.PI * 4.2) * 0.72;
    var camY = 1.72 + (reduced ? 0 : Math.sin(prog * Math.PI * 3.1) * 0.14);
    var endE = 0;
    if (!reduced) {
      var endP = Math.max(0, Math.min(1, (prog - 0.8) / 0.2));
      endE = endP * endP * (3 - 2 * endP);
      camY += endE * 3.4;
    }
    camera.position.set(camX, camY, camZ);
    if (key.castShadow && Math.abs(camZ - shadowZ) > 0.8) { shadowZ = camZ; key.shadow.needsUpdate = true; }
    camera.lookAt(camX * 0.45, 2.05 + endE * 2.8, camZ - 9);
    if (!reduced) {
      camera.rotateZ(Math.sin(prog * Math.PI * 2.6) * 0.03 + mxS * 0.015);
      var fovT = 56 + Math.sin(prog * Math.PI * 3.4) * 2.6;
      if (Math.abs(camera.fov - fovT) > 0.05) { camera.fov = fovT; camera.updateProjectionMatrix(); }
    }
    var mk = 1 - Math.pow(0.94, dt * 60); mxS += (mx - mxS) * mk; myS += (my - myS) * mk;

    /* atmosphere from chapter keyframes */
    var c = colorsAt(prog, cOut);
    fogCol.setRGB(c.fog[0] / 255, c.fog[1] / 255, c.fog[2] / 255);
    acCol.setRGB(c.ac[0] / 255, c.ac[1] / 255, c.ac[2] / 255);
    scene.fog.color.copy(fogCol);
    renderer.setClearColor(fogCol, 1);

    /* chapter light-cut: the lamps flicker once, the fog surges */
    var ci = 0;
    if (stops.length) {
      if (prog <= stops[0].f) ci = 0;
      else { ci = stops.length - 1; for (var ci2 = 0; ci2 < stops.length - 1; ci2++) { if (prog <= stops[ci2 + 1].f) { ci = ci2 + 1; break; } } }
    }
    if (ci !== chapterIdx) { chapterIdx = ci; cutT = reduced ? -1 : t; }
    var cutFlicker = 1, fogFar = c.ff;
    if (cutT >= 0) {
      var ct = t - cutT;
      if (ct > 0.9) cutT = -1;
      else {
        var seq = [1, 0.22, 0.95, 0.1, 1.4, 0.88, 1];
        cutFlicker = seq[Math.min(seq.length - 1, Math.floor(ct / 0.13))];
        if (ct < 0.5) fogFar = c.ff * 0.62;
      }
    }
    scene.fog.near = c.fn;
    scene.fog.far = fogFar;

    /* the rig responds: chapters tint the light, pulses flare it */
    var fl = cutFlicker * (1 + pulse * 1.1);
    key.color.copy(WHITE).lerp(acCol, 0.4);
    key.intensity = 1.5 * fl;
    key.position.set(camX + 3.5, 8.5, camZ + 7);
    key.target.position.set(camX * 0.4, 1.2, camZ - 9);
    fillRed.color.copy(acCol);
    fillRed.intensity = 32 * fl;
    fillRed.position.set(0, 4.6, camZ - 11);
    coveMat.emissiveIntensity = 2.6 * fl;
    lineMat.emissiveIntensity = 3.2 * fl;
    lampMat.emissiveIntensity = 2.2 * cutFlicker * (1 + pulse * 0.5);
    ringMat.emissiveIntensity = 1.9 * fl;
    rimMat.emissiveIntensity = 4.5 * (0.5 + 0.5 * fl) * (1 + endE * 0.8);
    gateLight.intensity = 130 * fl;
    coveMat.emissive.copy(acCol);
    lineMat.emissive.copy(acCol);
    ringMat.emissive.copy(acCol);
    rimMat.emissive.copy(acCol);

    /* the gate only matters in the finale — skip its draws before then */
    gate.visible = prog > 0.55;
    /* hero zone: real lights fade with distance */
    var heroVis = Math.max(0, Math.min(1, 1 - (-camZ) / 17));
    heroGroup.visible = heroVis > 0.02;
    heroLight.intensity = 42 * heroVis * fl;

    portrait.visible = heroVis > 0.02;
    if (portrait.visible) {
      portrait.position.y = Math.sin(t * 0.6) * 0.14;
      portrait.rotation.y = mxS * 0.12 + Math.sin(t * 0.32) * 0.055;
      portrait.rotation.x = myS * 0.05;
      if (portraitMat) {
        if (t > glitchAt) { glitchUntil = t + 0.18; glitchAt = t + 2.6 + Math.random() * 3.2; }
        var breathe = 1 + Math.sin(t * 0.9) * 0.06;
        var ignite = Math.max(0, 1 - ((t % 4.4) / 0.6)); ignite = ignite * ignite;
        portraitMat.size = (0.05 * breathe + 0.045 * ignite + pulse * 0.045) * ((t < glitchUntil) ? 1.7 : 1);
        portrait.position.x = (t < glitchUntil) ? (Math.random() - 0.5) * 0.26 : 0;
      }
    }

    /* embers + finale storm */
    var stormP = Math.max(0, Math.min(1, (prog - 0.82) / 0.18));
    embers.visible = prog > 0.74 && !reduced;
    if (embers.visible) {
      var p = emberGeo.attributes.position;
      for (var i = 0; i < EMBER_N; i++) {
        var y = p.getY(i) + emberSpd[i] * (1 + stormP * 1.8) * dt;
        var x = p.getX(i) + Math.sin(t * 0.9 + emberPhase[i]) * 0.0035;
        if (y > 6.2) { y = 0.05; x = (Math.random() - 0.5) * 10; }
        p.setY(i, y); p.setX(i, x);
      }
      p.needsUpdate = true;
    }
    stormEmbers.visible = stormP > 0.01 && !reduced;
    stormMat.opacity = stormP * 0.85;
    if (stormEmbers.visible) {
      var sp2 = stormGeo.attributes.position;
      for (var s3 = 0; s3 < STORM_N; s3++) {
        var yy = sp2.getY(s3) + stormSpd[s3] * dt;
        var xx = sp2.getX(s3) + Math.sin(t * 1.4 + stormPhase[s3]) * 0.009;
        if (yy > 6.6) { yy = 0.05; xx = (Math.random() - 0.5) * 12; }
        sp2.setY(s3, yy);
        sp2.setX(s3, xx);
      }
      sp2.needsUpdate = true;
    }

    /* click shockwaves */
    for (var rri = ripples.length - 1; rri >= 0; rri--) {
      var RR = ripples[rri];
      var age = t - RR.born;
      if (age > 0.9) { RR.mesh.parent.remove(RR.mesh); RR.mat.dispose(); ripples.splice(rri, 1); continue; }
      var k = age / 0.9;
      RR.mesh.scale.set(0.6 + k * 8, 0.6 + k * 8, 1);
      RR.mat.opacity = 0.5 * (1 - k);
      RR.mat.color.copy(acCol);
    }

    /* dust catches the light */
    dustFar.mat.color.copy(WHITE).lerp(acCol, 0.35);
    dustMid.mat.color.copy(WHITE).lerp(acCol, 0.6);
    dustFar.mat.opacity = dustFarBase * (1 + pulse * 0.4);
    dustMid.mat.opacity = 0.42 * (1 + pulse * 0.5);
    for (var si = 0; si < shaftRigs.length; si++) {
      var SR2 = shaftRigs[si];
      var dz = camZ - SR2.z;
      var so = (0.035 + 0.15 * Math.exp(-(dz * dz) / 110)) * cutFlicker * (1 + pulse * 0.7);
      if (so < 0.02 || (eco && si % 2 === 1)) { SR2.mesh.visible = false; }
      else { SR2.mesh.visible = true; SR2.mat.opacity = so; SR2.mat.color.copy(acCol); }
    }
    for (var ri = 0; ri < screenRigs.length; ri++) {
      var SR3 = screenRigs[ri];
      var on = Math.max(0, Math.min(1, 1 - Math.abs(camZ - SR3.z) / 13));
      SR3.mat.color.setScalar(0.5 + 0.5 * on);
      if (on < 0.03) { SR3.leak.visible = false; }
      else { SR3.leak.visible = true; SR3.leakMat.opacity = on * 0.22 * cutFlicker; SR3.leakMat.color.copy(acCol); }
    }

    /* the cursor carries a real spotlight */
    if (finePointer && !eco) {
      floorNDC.set(mxS, -myS);
      floorRay.setFromCamera(floorNDC, camera);
      var chits = floorRay.intersectObject(floor, false);
      if (chits.length) {
        cursorOn = true;
        cursorTarget.set(chits[0].point.x, 0.05, chits[0].point.z);
      }
      if (cursorOn) {
        cursorSpot.position.set(camera.position.x, camera.position.y + 2.4, camera.position.z);
        cursorSpot.target.position.lerp(cursorTarget, 0.12);
        cursorSpot.intensity += (62 * cutFlicker - cursorSpot.intensity) * 0.08;
      }
    } else {
      cursorSpot.intensity += (0 - cursorSpot.intensity) * 0.1;
    }

    if (camZ < -24 && camZ > -112) updateGalleryLabel(camZ);

    renderer.render(scene, camera);
  }
  requestAnimationFrame(tick); /* first frame on the NEXT frame — the
                                   expensive first shader-compile pass can
                                   never block the page from opening */

  /* light chapter covers → same #player lightbox */
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
  $$lwClick();

  var loaderDone = false;
  function done() { if (loaderDone) return; loaderDone = true; finishLoader(); }
  window.addEventListener('load', function () { window.setTimeout(done, 350); });
  window.setTimeout(done, 2800);
})();
