/* ============================================================
   THE MONARCH HOUSE — structure v1
   A real-time 3D lobby: four doors, four worlds.
   Adil's assets only. Performance-first. No frameworks.
   01 EDIT SUITE · 02 RENDER LAB · 03 BUILD FORGE · 04 THE SITE
   ============================================================ */
(function () {
  'use strict';

  var docEl = document.documentElement;
  var reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var coarse = window.matchMedia('(pointer: coarse)').matches || window.innerWidth < 760;

  /* ── potato guard: weak/software GPUs get the static doors ── */
  function failSoft() { docEl.classList.add('no-gl'); }
  try {
    var probe = document.createElement('canvas');
    var pctx = probe.getContext('webgl') || probe.getContext('experimental-webgl');
    var dbg = pctx && pctx.getExtension('WEBGL_debug_renderer_info');
    var gpu = dbg ? String(pctx.getParameter(dbg.UNMASKED_RENDERER_WEBGL) || '') : '';
    var mem = navigator.deviceMemory || 8, cores = navigator.hardwareConcurrency || 8;
    var weak = /(SwiftShader|llvmpipe|softpipe|VideoCore|Mali-[0-9T]|Mali-G[0-3][0-9]|Adreno\s?(\(TM\))?\s?[234]|PowerVR)/i.test(gpu);
    if (weak || (mem <= 2 && cores <= 4)) { failSoft(); return; }
  } catch (e) { /* detection failed — try GL anyway */ }

  var canvas = document.getElementById('house');
  if (!canvas || !window.THREE) { failSoft(); return; }
  var THREE = window.THREE;
  var renderer;
  try { renderer = new THREE.WebGLRenderer({ canvas: canvas, antialias: true, powerPreference: 'high-performance' }); }
  catch (e) { failSoft(); return; }
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, coarse ? 1.25 : 1.75));
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setClearColor(0x050507, 1);
  docEl.classList.add('gl-ok');
  canvas.addEventListener('webglcontextlost', function (ev) { ev.preventDefault(); failSoft(); }, false);

  var scene = new THREE.Scene();
  scene.fog = new THREE.Fog(0x050507, 5.5, 30);
  var camera = new THREE.PerspectiveCamera(58, window.innerWidth / window.innerHeight, 0.1, 120);

  /* ══════════ canvas textures ══════════════════════════════ */
  function noiseTex(base, speckA, speckB, seams) {
    var c = document.createElement('canvas'); c.width = c.height = 512;
    var g = c.getContext('2d');
    g.fillStyle = base; g.fillRect(0, 0, 512, 512);
    for (var i = 0; i < 5200; i++) {
      var a = Math.random();
      g.fillStyle = a < 0.5 ? speckA : speckB;
      g.fillRect(Math.random() * 512, Math.random() * 512, Math.random() * 2.4 + 0.4, Math.random() * 2.4 + 0.4);
    }
    if (seams) {
      g.strokeStyle = 'rgba(255,255,255,0.055)'; g.lineWidth = 2;
      for (var s = 0; s <= 512; s += 128) {
        g.beginPath(); g.moveTo(s + .5, 0); g.lineTo(s + .5, 512); g.stroke();
        g.beginPath(); g.moveTo(0, s + .5); g.lineTo(512, s + .5); g.stroke();
      }
    }
    var t = new THREE.CanvasTexture(c);
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    return t;
  }
  function floorTex() {
    var c = document.createElement('canvas'); c.width = c.height = 512;
    var g = c.getContext('2d');
    g.fillStyle = '#0a0a0e'; g.fillRect(0, 0, 512, 512);
    /* large stone tiles */
    g.strokeStyle = 'rgba(255,255,255,0.05)'; g.lineWidth = 3;
    for (var i = 0; i <= 512; i += 170) {
      g.beginPath(); g.moveTo(i + .5, 0); g.lineTo(i + .5, 512); g.stroke();
      g.beginPath(); g.moveTo(0, i + .5); g.lineTo(512, i + .5); g.stroke();
    }
    for (var j = 0; j < 1400; j++) {
      g.fillStyle = Math.random() < 0.5 ? 'rgba(255,255,255,0.025)' : 'rgba(0,0,0,0.35)';
      g.fillRect(Math.random() * 512, Math.random() * 512, Math.random() * 3 + 1, Math.random() * 3 + 1);
    }
    var t = new THREE.CanvasTexture(c);
    t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(4, 4);
    return t;
  }
  function glowTex() {
    var c = document.createElement('canvas'); c.width = c.height = 128;
    var g = c.getContext('2d');
    var grad = g.createRadialGradient(64, 64, 4, 64, 64, 64);
    grad.addColorStop(0, 'rgba(255,64,54,0.85)');
    grad.addColorStop(0.4, 'rgba(227,32,47,0.28)');
    grad.addColorStop(1, 'rgba(227,32,47,0)');
    g.fillStyle = grad; g.fillRect(0, 0, 128, 128);
    return new THREE.CanvasTexture(c);
  }
  var GLOW = null;
  function signTex(num, title, sub, big) {
    var c = document.createElement('canvas'); c.width = 512; c.height = 256;
    var g = c.getContext('2d');
    g.fillStyle = '#08080a'; g.fillRect(0, 0, 512, 256);
    g.strokeStyle = 'rgba(227,32,47,0.8)'; g.lineWidth = 6; g.strokeRect(8, 8, 496, 240);
    g.fillStyle = '#e3202f'; g.font = '800 44px Manrope, Arial Black, sans-serif';
    g.fillText(num, 36, 78);
    g.fillStyle = '#f2efe6'; g.font = '800 ' + (big ? 64 : 54) + 'px Manrope, Arial Black, sans-serif';
    var words = title.split(' ');
    var line = '', y = 150, maxW = 440;
    for (var i = 0; i < words.length; i++) {
      var test = line ? line + ' ' + words[i] : words[i];
      if (g.measureText(test).width > maxW && line) { g.fillText(line, 36, y); y += 62; line = words[i]; }
      else line = test;
    }
    if (line) g.fillText(line, 36, y);
    if (sub) { g.fillStyle = 'rgba(239,235,226,0.55)'; g.font = '400 17px "IBM Plex Mono", monospace'; g.fillText(sub, 36, 236); }
    return new THREE.CanvasTexture(c);
  }
  function terminalTex() {
    var c = document.createElement('canvas'); c.width = 1024; c.height = 512;
    var g = c.getContext('2d');
    g.fillStyle = '#050d08'; g.fillRect(0, 0, 1024, 512);
    g.fillStyle = '#071409'; g.fillRect(0, 0, 1024, 46);
    g.fillStyle = '#2bff70'; g.font = '600 19px "IBM Plex Mono", monospace';
    g.fillText('MONARCH.FORGE — SERVICES — zsh', 24, 30);
    var lines = [
      ['$ ', 'which services'],
      ['', ''],
      ['EDIT      ', 'films cut to the beat — CapCut x FFmpeg'],
      ['BUILD     ', 'sites with a pulse — this one & MONARCH Concierge'],
      ['AUTOMATE  ', 'YT pipelines — research > script > voice > schedule'],
      ['', ''],
      ['STACK     ', 'python · javascript · ffmpeg · git · three.js'],
      ['PROOF     ', '583K views / one short · $400 Dell · 2024 -> now'],
      ['', ''],
      ['$ ', 'start a project -> workadilchandio@gmail.com']
    ];
    var y = 96;
    lines.forEach(function (ln) {
      var prompt = ln[0], text = ln[1];
      if (prompt) { g.fillStyle = '#3dff8a'; g.fillText(prompt, 24, y); g.fillStyle = '#d9ffe6'; g.fillText(text, 24 + g.measureText(prompt).width, y); }
      else if (text) { g.fillStyle = '#8affab'; g.fillText(text, 24 + g.measureText('  ').width, y); }
      y += 42;
    });
    g.fillStyle = '#3dff8a'; g.fillRect(24, y - 8, 15, 24);
    return new THREE.CanvasTexture(c);
  }

  var wallT = noiseTex('#101014', 'rgba(255,255,255,0.045)', 'rgba(0,0,0,0.4)', true);
  wallT.repeat.set(6, 2);
  var roomWallT = noiseTex('#0e0e12', 'rgba(255,255,255,0.04)', 'rgba(0,0,0,0.4)', true);
  roomWallT.repeat.set(4, 1.6);
  var floorT = floorTex();
  var wallMat = new THREE.MeshBasicMaterial({ map: wallT, color: 0xbfc0c6 });
  var roomWallMat = new THREE.MeshBasicMaterial({ map: roomWallT, color: 0xb4b5bb });
  var floorMat = new THREE.MeshBasicMaterial({ map: floorT, color: 0xd8d8de });
  var ceilMat = new THREE.MeshBasicMaterial({ color: 0x060608 });
  var trimMat = new THREE.MeshBasicMaterial({ color: 0x1a1a20 });
  var redMat = new THREE.MeshBasicMaterial({ color: 0xe3202f });
  var blackMat = new THREE.MeshBasicMaterial({ color: 0x070709 });

  /* ══════════ geometry helpers ═════════════════════════════ */
  function box(w, h, d, mat, x, y, z, ry) {
    var m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
    m.position.set(x || 0, y || 0, z || 0);
    if (ry) m.rotation.y = ry;
    return m;
  }
  function plane(w, h, mat, x, y, z, ry, rx) {
    var m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), mat);
    m.position.set(x || 0, y || 0, z || 0);
    if (ry) m.rotation.y = ry;
    if (rx) m.rotation.x = rx;
    return m;
  }
  /* wall with a centered door hole (segments: left, right, lintel) */
  function wallWithDoor(width, height, doorW, doorH, mat, doorMat) {
    var g = new THREE.Group();
    var sideW = (width - doorW) / 2;
    g.add(plane(sideW, height, mat, -(doorW / 2 + sideW / 2), height / 2, 0));
    g.add(plane(sideW, height, mat, (doorW / 2 + sideW / 2), height / 2, 0));
    g.add(plane(doorW, height - doorH, mat, 0, doorH + (height - doorH) / 2, 0));
    /* door frame */
    var fw = 0.28, fd = 0.3;
    g.add(box(fw, doorH, fd, trimMat, -(doorW / 2 - fw / 2), doorH / 2, 0.02));
    g.add(box(fw, doorH, fd, trimMat, (doorW / 2 - fw / 2), doorH / 2, 0.02));
    g.add(box(doorW + fw, fw, fd, trimMat, 0, doorH - fw / 2, 0.02));
    /* the door itself — slides down into the floor when opened */
    var door = box(doorW - fw, doorH - fw, 0.16, doorMat || blackMat, 0, (doorH - fw) / 2, 0.06);
    door.userData.door = true;
    g.add(door);
    return { group: g, door: door, doorH: doorH };
  }
  function roomShell(w, h, d, mat) {
    var g = new THREE.Group();
    g.add(plane(w, d, floorMat, 0, 0, 0, 0, -Math.PI / 2));
    g.add(plane(w, d, ceilMat, 0, h, 0, 0, Math.PI / 2));
    g.add(plane(w, h, mat, 0, h / 2, -d / 2, 0));
    g.add(plane(w, h, mat, 0, h / 2, d / 2, Math.PI));
    g.add(plane(d, h, mat, -w / 2, h / 2, 0, Math.PI / 2));
    g.add(plane(d, h, mat, w / 2, h / 2, 0, -Math.PI / 2));
    return g;
  }
  /* ceiling light bar + warm pool */
  function lightBar(w, x, y, z, ry) {
    var g = new THREE.Group();
    g.add(box(w, 0.09, 0.24, new THREE.MeshBasicMaterial({ color: 0xfff3df }), 0, 0, 0));
    var housing = box(w + 0.14, 0.05, 0.34, trimMat, 0, 0.08, 0);
    g.add(housing);
    g.position.set(x || 0, y || 6.28, z || 0);
    if (ry) g.rotation.y = ry;
    return g;
  }

  /* ══════════ THE HALL ══════════════════════════════════════
     Chamber 22 x 6.4 x 15 — doors on all four walls. */
  var HALL = { w: 22, h: 6.4, d: 15 };
  var hall = new THREE.Group();

  var hw = wallWithDoor(HALL.d, HALL.h, 2.7, 3.7, wallMat);  /* west — EDIT */
  hw.group.rotation.y = Math.PI / 2; hw.group.position.set(-HALL.w / 2, 0, 0); hall.add(hw.group);
  var he = wallWithDoor(HALL.d, HALL.h, 2.7, 3.7, wallMat);  /* east — RENDER */
  he.group.rotation.y = -Math.PI / 2; he.group.position.set(HALL.w / 2, 0, 0); hall.add(he.group);
  var hn = wallWithDoor(HALL.w, HALL.h, 4.6, 4.5, wallMat, new THREE.MeshBasicMaterial({ color: 0x12060a })); /* north — THE SITE (grand) */
  hn.group.position.set(0, 0, -HALL.d / 2); hall.add(hn.group);
  var hs = wallWithDoor(HALL.w, HALL.h, 2.7, 3.7, wallMat);  /* south — FORGE */
  hs.group.rotation.y = Math.PI; hs.group.position.set(0, 0, HALL.d / 2); hall.add(hs.group);

  hall.add(plane(HALL.w, HALL.d, floorMat, 0, 0, 0, 0, -Math.PI / 2));
  hall.add(plane(HALL.w, HALL.d, ceilMat, 0, HALL.h, 0, 0, Math.PI / 2));
  /* red carpet runner */
  var carpet = plane(3.4, HALL.d - 0.4, new THREE.MeshBasicMaterial({ color: 0x4d0d13 }), 0, 0.012, 0, 0, -Math.PI / 2);
  hall.add(carpet);
  var carpetEdgeL = plane(0.09, HALL.d - 0.4, new THREE.MeshBasicMaterial({ color: 0x8a6a2f }), -1.75, 0.014, 0, 0, -Math.PI / 2);
  var carpetEdgeR = plane(0.09, HALL.d - 0.4, new THREE.MeshBasicMaterial({ color: 0x8a6a2f }), 1.75, 0.014, 0, 0, -Math.PI / 2);
  hall.add(carpetEdgeL); hall.add(carpetEdgeR);
  /* ceiling light bars */
  hall.add(lightBar(10, 0, 6.3, -2.5)); hall.add(lightBar(10, 0, 6.3, 2.5));
  /* pillars */
  hall.add(box(0.8, HALL.h, 0.8, trimMat, -6.5, HALL.h / 2, -3.5));
  hall.add(box(0.8, HALL.h, 0.8, trimMat, 6.5, HALL.h / 2, -3.5));
  hall.add(box(0.8, HALL.h, 0.8, trimMat, -6.5, HALL.h / 2, 3.5));
  hall.add(box(0.8, HALL.h, 0.8, trimMat, 6.5, HALL.h / 2, 3.5));
  /* red glow above the grand door + MONARCH wordmark plate */
  GLOW = glowTex();
  var grandGlow = plane(9.4, 4.6, new THREE.MeshBasicMaterial({ map: GLOW, transparent: true, opacity: 0.95, depthWrite: false, blending: THREE.AdditiveBlending }), 0, 4.35, -HALL.d / 2 + 0.09);
  hall.add(grandGlow);
  var monoC = document.createElement('canvas'); monoC.width = 1024; monoC.height = 128;
  (function () {
    var g = monoC.getContext('2d');
    g.fillStyle = 'rgba(0,0,0,0)'; g.fillRect(0, 0, 1024, 128);
    g.fillStyle = '#f2efe6'; g.font = '800 88px Manrope, Arial Black, sans-serif';
    g.textAlign = 'center'; g.fillText('M O N A R C H', 512, 84);
    g.fillStyle = '#e3202f'; g.font = '400 40px Manrope, Arial Black, sans-serif'; g.fillText('®', 915, 42);
  })();
  hall.add(plane(7.6, 0.95, new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(monoC), transparent: true, depthWrite: false }), 0, 5.5, -HALL.d / 2 + 0.07));
  scene.add(hall);

  /* ══════════ DOOR SIGNS (above every door) ═══════════════ */
  function hangSign(tex, w, h, x, y, z, ry) {
    var p = plane(w, h, new THREE.MeshBasicMaterial({ map: tex }), x, y, z, ry);
    scene.add(p);
    return p;
  }
  hangSign(signTex('01', 'EDIT SUITE', 'FILMS CUT TO THE BEAT', false), 3.0, 1.5, -HALL.w / 2 + 0.12, 4.9, 0, Math.PI / 2);
  hangSign(signTex('02', 'RENDER LAB', 'CG & MOTION FRAMES', false), 3.0, 1.5, HALL.w / 2 - 0.12, 4.9, 0, -Math.PI / 2);
  hangSign(signTex('03', 'BUILD FORGE', '3D WEB & SYSTEMS', false), 4.2, 2.0, 0, 5.15, HALL.d / 2 - 0.12, Math.PI);
  hangSign(signTex('04', 'THE SITE', 'THE FULL PORTFOLIO', true), 4.4, 2.2, 0, 5.6, -HALL.d / 2 + 0.12, 0);

  /* door hotspot registry */
  var hotspots = [];   /* {mesh, id, action} */
  function addHotspot(mesh, id, action) { mesh.userData.hot = { id: id, action: action }; hotspots.push(mesh); }
  [hw, he, hn, hs].forEach(function (w, i) {
    var id = ['edit', 'render', 'portfolio', 'build'][i];
    addHotspot(w.door, id, id === 'portfolio' ? 'portfolio' : 'enter');
  });

  /* ══════════ ROOM 01 — THE EDIT SUITE ═════════════════════
     Monitor wall of Adil's edit films — click any screen. */
  var EB_THUMB = [
    { img: 'assets/thumbs/th-power.jpg', vid: 'media/monarch-portfolio-v5.mp4', title: 'MONARCH — THE MAIN FILM' },
    { img: 'assets/thumbs/th-paanch.jpg', vid: 'media/paanch.web.mp4', title: 'PAANCH RULES' },
    { img: 'assets/thumbs/th-lawone.jpg', vid: 'media/lawone.web.mp4', title: 'MONARCH: LAW ONE' },
    { img: 'assets/thumbs/monarch-01.jpg', vid: 'media/monarch-01-web.mp4', title: 'MONARCH STUDIO' },
    { img: 'assets/thumbs/monarch-02.jpg', vid: 'media/monarch-02-web.mp4', title: 'CLARITY IN MOTION' },
    { img: 'assets/thumbs/monarch-03.jpg', vid: 'media/monarch-03-web.mp4', title: 'YOUR CREATIVE PARTNER' }
  ];
  var RL_THUMB = [
    { img: 'assets/thumbs/monarch-06.jpg', vid: 'media/monarch-reference-06-enhanced.mp4', title: 'MONARCH OS' },
    { img: 'assets/thumbs/monarch-07.jpg', vid: 'media/monarch-reference-07-enhanced.mp4', title: 'THE VISION' },
    { img: 'assets/thumbs/monarch-04.jpg', vid: 'media/monarch-04-web.mp4', title: 'FROM IDEA TO IMPACT' },
    { img: 'assets/thumbs/monarch-05.jpg', vid: 'media/monarch-05-web.mp4', title: 'WHERE IDEAS BEGIN' },
    { img: 'assets/thumbs/monarch-00.jpg', vid: 'media/monarch-portfolio-v5.mp4', title: 'MONARCH — THE MAIN FILM' },
    { img: 'assets/thumbs/monarch-01.jpg', vid: 'media/monarch-01-web.mp4', title: 'MONARCH STUDIO' }
  ];
  var texLoader = new THREE.TextureLoader();
  function buildScreenWall(group, thumbs, facing) {
    /* facing: +1 screens look toward +x, -1 toward -x, 0 toward +z (back wall) */
    var scrW = 2.35, scrH = 1.42, gap = 0.5;
    for (var i = 0; i < thumbs.length; i++) {
      var col = i % 3, row = Math.floor(i / 3);
      var tex = texLoader.load(thumbs[i].img);
      if ('colorSpace' in tex && THREE.SRGBColorSpace) tex.colorSpace = THREE.SRGBColorSpace;
      var mat = new THREE.MeshBasicMaterial({ map: tex });
      var frame = box(scrW + 0.18, scrH + 0.18, 0.1, blackMat, 0, 0, 0);
      var scr = plane(scrW, scrH, mat, 0, 0, 0.07);
      scr.userData.film = { src: thumbs[i].vid, title: thumbs[i].title };
      var cell = new THREE.Group();
      cell.add(frame); cell.add(scr);
      hotspots.push(scr);
      if (facing === 1) { cell.position.set(-7.4, 3.4 - row * 2.0, (col - 1) * (scrW + gap)); cell.rotation.y = Math.PI / 2; }
      else if (facing === -1) { cell.position.set(7.4, 3.4 - row * 2.0, (col - 1) * (scrW + gap)); cell.rotation.y = -Math.PI / 2; }
      else { cell.position.set((col - 1) * (scrW + gap), 3.4 - row * 2.0, -5.4); }
      group.add(cell);
    }
  }
  function buildEditRoom() {
    var g = roomShell(15, 5.6, 13, roomWallMat);
    g.position.set(-HALL.w / 2 - 7.5, 0, 0);
    g.add(lightBar(7, 0, 5.45, 0));
    buildScreenWall(g, EB_THUMB, 1);
    /* desk + chair silhouettes */
    g.add(box(6.4, 0.1, 1.5, trimMat, -4.6, 1.05, 0));
    g.add(box(0.14, 1.05, 1.4, trimMat, -7.4, 0.52, -2.6)); g.add(box(0.14, 1.05, 1.4, trimMat, -7.4, 0.52, 2.6));
    g.add(box(1.0, 0.5, 1.0, blackMat, -3.2, 0.62, 0));
    g.add(box(1.0, 1.3, 0.24, blackMat, -2.78, 1.15, 0));
    /* red LED strip along the desk */
    g.add(box(6.4, 0.06, 0.05, redMat, -4.6, 1.02, 0.78));
    /* wall sign */
    var t = signTex('01', 'THE EDIT SUITE', '583K VIEWS · ONE SHORT · NO ADS', false);
    g.add(plane(4.6, 2.3, new THREE.MeshBasicMaterial({ map: t }), -7.4, 5.0, 0, Math.PI / 2));
    return g;
  }
  function buildRenderRoom() {
    var g = roomShell(15, 5.6, 13, roomWallMat);
    g.position.set(HALL.w / 2 + 7.5, 0, 0);
    g.add(lightBar(7, 0, 5.45, 0));
    buildScreenWall(g, RL_THUMB, -1);
    /* render request plate */
    var c = document.createElement('canvas'); c.width = 1024; c.height = 128;
    var ctx = c.getContext('2d');
    ctx.fillStyle = '#08080a'; ctx.fillRect(0, 0, 1024, 128);
    ctx.strokeStyle = '#e3202f'; ctx.lineWidth = 4; ctx.strokeRect(6, 6, 1012, 116);
    ctx.fillStyle = '#f2efe6'; ctx.font = '800 34px Manrope, Arial Black, sans-serif'; ctx.textAlign = 'center';
    ctx.fillText('RENDER REEL ON REQUEST', 512, 56);
    ctx.fillStyle = 'rgba(239,235,226,0.6)'; ctx.font = '400 19px "IBM Plex Mono", monospace';
    ctx.fillText('workadilchandio@gmail.com', 512, 96);
    g.add(plane(4.6, 0.58, new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(c) }), 7.4, 1.15, 0, -Math.PI / 2));
    /* pedestal render frames */
    g.add(box(0.9, 1.1, 0.9, trimMat, 4.6, 0.55, -3.4));
    g.add(box(0.9, 1.1, 0.9, trimMat, 4.6, 0.55, 3.4));
    g.add(box(2.6, 1.7, 0.1, blackMat, 4.6, 1.95, -3.4));
    g.add(box(2.6, 1.7, 0.1, blackMat, 4.6, 1.95, 3.4));
    var t = signTex('02', 'THE RENDER LAB', 'MONARCH OS · THE VISION', false);
    g.add(plane(4.6, 2.3, new THREE.MeshBasicMaterial({ map: t }), 7.4, 5.0, 0, -Math.PI / 2));
    return g;
  }
  var editRoom = buildEditRoom(); scene.add(editRoom);
  var renderRoom = buildRenderRoom(); scene.add(renderRoom);

  /* ══════════ ROOM 03 — THE BUILD FORGE ════════════════════ */
  function buildForgeRoom() {
    var g = roomShell(19, 6.0, 13, roomWallMat);
    g.position.set(0, 0, HALL.d / 2 + 6.5);
    g.add(lightBar(9, 0, 5.85, 0));
    /* the terminal — the room's heart */
    var term = plane(8.2, 4.1, new THREE.MeshBasicMaterial({ map: terminalTex() }), 0, 3.15, 6.35, Math.PI);
    g.add(term);
    g.add(box(8.5, 0.16, 0.2, redMat, 0, 1.06, 6.3));
    /* two pedestals with service plates */
    var p1 = plane(3.0, 1.5, new THREE.MeshBasicMaterial({ map: signTex('A', 'THIS SITE', 'HAND-BUILT · THREE.JS', false) }), -5.6, 2.4, -5.9, 0.5);
    var p2 = plane(3.0, 1.5, new THREE.MeshBasicMaterial({ map: signTex('B', 'CONCIERGE', 'GROQ x GEMINI · ZERO-KEY', false) }), 5.6, 2.4, -5.9, -0.5);
    g.add(p1); g.add(p2);
    g.add(box(0.8, 1.15, 0.8, trimMat, -5.6, 0.57, -4.4));
    g.add(box(0.8, 1.15, 0.8, trimMat, 5.6, 0.57, -4.4));
    /* GitHub hotspot + start-a-project hotspot */
    var ghTex = signTex('↗', 'GITHUB', 'github.com/adil-chandio', false);
    var gh = plane(2.6, 1.3, new THREE.MeshBasicMaterial({ map: ghTex }), -8.4, 2.1, -2.0, Math.PI / 2);
    addHotspot(gh, 'github', 'link'); gh.userData.href = 'https://github.com/adil-chandio';
    g.add(gh);
    var ctTex = signTex('→', 'START A PROJECT', 'workadilchandio@gmail.com', false);
    var ct = plane(2.9, 1.45, new THREE.MeshBasicMaterial({ map: ctTex }), 8.4, 2.1, -2.0, -Math.PI / 2);
    addHotspot(ct, 'email', 'link'); ct.userData.href = 'mailto:workadilchandio@gmail.com?subject=PROJECT%20—%20THE%20MONARCH%20HOUSE';
    g.add(ct);
    var t = signTex('03', 'THE BUILD FORGE', '3D WEB · SYSTEMS · SITES WITH A PULSE', false);
    g.add(plane(5.4, 2.2, new THREE.MeshBasicMaterial({ map: t }), 0, 5.4, 6.38, Math.PI));
    return g;
  }
  var forgeRoom = buildForgeRoom(); scene.add(forgeRoom);

  /* ══════════ camera rig + navigation ══════════════════════ */
  var STOPS = {
    hall:      { x: 0, y: 1.78, z: 5.3, yaw: 0 },
    edit:      { x: -HALL.w / 2 - 4.4, y: 1.72, z: 0, yaw: Math.PI / 2 },
    render:    { x: HALL.w / 2 + 4.4, y: 1.72, z: 0, yaw: -Math.PI / 2 },
    build:     { x: 0, y: 1.72, z: HALL.d / 2 + 4.6, yaw: Math.PI }
  };
  var current = 'hall';
  var cam = { x: STOPS.hall.x, y: STOPS.hall.y, z: STOPS.hall.z, yaw: 0 };
  var look = { yaw: 0, pitch: 0, tyaw: 0, tpitch: 0 };
  var travel = null;   /* {fx,fy,fz,fyaw, tx,ty,tz,tyaw, t, dur, onDone} */
  var HUD = {
    kick: document.getElementById('hudKick'), name: document.getElementById('hudName'), sub: document.getElementById('hudSub'),
    back: document.getElementById('hudBack'),
    doors: Array.prototype.slice.call(document.querySelectorAll('.hud-door'))
  };
  var ROOM_HUD = {
    hall: { kick: 'THE MONARCH HOUSE', name: 'FOUR DOORS.<br>ONE MIND.', sub: 'Drag to look around · click a door to walk through' },
    edit: { kick: 'ROOM 01 — THE EDIT SUITE', name: 'CUT TO<br>THE BEAT.', sub: '583K views / one short · films & motion' },
    render: { kick: 'ROOM 02 — THE RENDER LAB', name: 'FRAMES<br>THAT BREATHE.', sub: 'MONARCH OS · The Vision · render reel on request' },
    build: { kick: 'ROOM 03 — THE BUILD FORGE', name: 'SITES WITH<br>A PULSE.', sub: '3D web · MONARCH Concierge · GitHub on the left wall' }
  };
  function setHud(key) {
    var h = ROOM_HUD[key]; if (!h) return;
    HUD.kick.textContent = h.kick; HUD.name.innerHTML = h.name; HUD.sub.textContent = h.sub;
    HUD.back.hidden = (key === 'hall');
    HUD.doors.forEach(function (b) { b.classList.toggle('on', b.dataset.room === key); });
  }
  function easeInOut(t) { return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2; }
  function goTo(stopKey, onDone) {
    var t = STOPS[stopKey]; if (!t) return;
    travel = { fx: cam.x, fy: cam.y, fz: cam.z, fyaw: cam.yaw, tx: t.x, ty: t.y, tz: t.z, tyaw: t.yaw, t: 0, dur: reduced ? 0.01 : 1.35, onDone: onDone };
    current = stopKey;
    setHud(stopKey === 'hall' ? 'hall' : stopKey);
  }
  /* doors slide open once, permanently */
  var opened = { edit: false, render: false, portfolio: false, build: false };
  var doorMeshes = { edit: hw.door, render: he.door, portfolio: hn.door, build: hs.door };
  function openDoor(id) {
    if (opened[id]) return; opened[id] = true;
    var d = doorMeshes[id];
    var dy = d.position.y;
    var target = -(d.geometry.parameters.height) + 0.04;
    var t0 = performance.now();
    (function slide(now) {
      var k = Math.min(1, (now - t0) / (reduced ? 1 : 750));
      var e = 1 - Math.pow(1 - k, 3);
      d.position.y = dy + (target - dy) * e;
      if (k < 1) requestAnimationFrame(slide);
    })(t0);
  }
  function enterPortfolio() {
    docEl.classList.add('leaving');
    window.setTimeout(function () { window.location.href = 'home.html'; }, reduced ? 30 : 520);
  }
  function goRoom(id) {
    if (id === 'portfolio') { openDoor('portfolio'); enterPortfolio(); return; }
    openDoor(id);
    goTo(id);
  }
  HUD.doors.forEach(function (b) { b.addEventListener('click', function () { goRoom(b.dataset.room); }); });
  HUD.back.addEventListener('click', function () { goTo('hall'); });

  /* ── drag look ── */
  var dragging = false, dragX = 0, dragY = 0, dragMoved = 0;
  canvas.addEventListener('pointerdown', function (e) {
    dragging = true; dragMoved = 0; dragX = e.clientX; dragY = e.clientY;
    canvas.setPointerCapture(e.pointerId);
  });
  canvas.addEventListener('pointermove', function (e) {
    if (!dragging) return;
    var dx = e.clientX - dragX, dy = e.clientY - dragY;
    dragMoved += Math.abs(dx) + Math.abs(dy);
    dragX = e.clientX; dragY = e.clientY;
    look.tyaw = Math.max(-1.05, Math.min(1.05, look.tyaw - dx * 0.0042));
    look.tpitch = Math.max(-0.42, Math.min(0.42, look.tpitch - dy * 0.0032));
  });
  canvas.addEventListener('pointerup', function (e) {
    dragging = false;
    if (dragMoved < 8) handleTap(e);
  });
  canvas.addEventListener('pointercancel', function () { dragging = false; });

  /* ── tap → raycast ── */
  var raycaster = new THREE.Raycaster();
  var pointer = new THREE.Vector2();
  var hp = document.getElementById('housePlayer'), hpV = document.getElementById('hpVideo'), hpT = document.getElementById('hpTitle');
  function openFilm(src, title) {
    if (!hp || !hpV) return;
    hpV.src = src; if (hpT) hpT.textContent = (title || 'FILM').toUpperCase();
    hp.classList.add('on'); hp.setAttribute('aria-hidden', 'false');
    window.setTimeout(function () { hpV.play().catch(function () {}); }, 90);
  }
  var hpClose = document.getElementById('hpClose');
  if (hpClose) hpClose.addEventListener('click', closeFilm);
  function closeFilm() {
    if (!hp) return;
    hpV.pause(); hp.classList.remove('on'); hp.setAttribute('aria-hidden', 'true');
  }
  function handleTap(e) {
    pointer.x = (e.clientX / window.innerWidth) * 2 - 1;
    pointer.y = -(e.clientY / window.innerHeight) * 2 + 1;
    raycaster.setFromCamera(pointer, camera);
    var hits = raycaster.intersectObjects(hotspots, false);
    if (!hits.length) return;
    var obj = hits[0].object;
    if (obj.userData.film) { openFilm(obj.userData.film.src, obj.userData.film.title); return; }
    var hot = obj.userData.hot;
    if (hot) {
      if (hot.id === 'github' || hot.id === 'email') { window.open(obj.userData.href, '_blank', 'noopener'); return; }
      goRoom(hot.id);
    }
  }

  /* ── ESC: film → room → hall ── */
  window.addEventListener('keydown', function (e) {
    if (e.key !== 'Escape') return;
    if (hp && hp.classList.contains('on')) { closeFilm(); return; }
    if (current !== 'hall') goTo('hall');
  });

  /* ── resize ── */
  window.addEventListener('resize', function () {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
  });

  /* ══════════ main loop ══════════════════════════════════ */
  var tPrev = performance.now() / 1000;
  var lastLite = 0;
  var glPaused = false;
  document.addEventListener('visibilitychange', function () { glPaused = document.hidden; });

  function tick() {
    requestAnimationFrame(tick);
    var t = performance.now() / 1000;
    if (glPaused) { tPrev = t; return; }
    if (coarse) { if (t - lastLite < 0.032) return; lastLite = t; }
    var dt = Math.min(0.05, t - tPrev); tPrev = t;

    /* camera travel easing */
    if (travel) {
      travel.t += dt / travel.dur;
      var k = easeInOut(Math.min(1, travel.t));
      cam.x = travel.fx + (travel.tx - travel.fx) * k;
      cam.y = travel.fy + (travel.ty - travel.fy) * k;
      cam.z = travel.fz + (travel.tz - travel.fz) * k;
      cam.yaw = travel.fyaw + (travel.tyaw - travel.fyaw) * k;
      if (travel.t >= 1) { var done = travel.onDone; travel = null; if (done) done(); }
    }
    /* look offset easing */
    look.yaw += (look.tyaw - look.yaw) * 0.09;
    look.pitch += (look.tpitch - look.pitch) * 0.09;

    var yaw = cam.yaw + look.yaw;
    var bobY = reduced ? 0 : Math.sin(t * 0.55) * 0.045;
    camera.position.set(cam.x, cam.y + bobY, cam.z);
    var lx = cam.x - Math.sin(yaw) * 6;
    var lz = cam.z - Math.cos(yaw) * 6;
    camera.lookAt(lx, cam.y + bobY + Math.tan(look.pitch) * 6, lz);
    camera.rotateZ(reduced ? 0 : Math.sin(t * 0.4) * 0.0028);

    renderer.render(scene, camera);
  }
  setHud('hall');
  tick();
  /* fade the black away once frames are flowing */
  window.requestAnimationFrame(function () { docEl.classList.add('on'); });
})();
