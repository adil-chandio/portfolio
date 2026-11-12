/* ══ MONARCH: SPACES — interactions ═════════════════════════
   Vanilla JS. No dependencies. Honours prefers-reduced-motion. */
'use strict';

const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const $  = (s, c) => (c || document).querySelector(s);
const $$ = (s, c) => Array.from((c || document).querySelectorAll(s));

/* ── loader ─────────────────────────────────────────────── */
(function loader() {
  const el = $('#sloader'); if (!el) return;
  const fill = $('#slFill'), pct = $('#slPct');
  let p = 0, done = false;
  const tick = setInterval(() => {
    p = Math.min(p + 4 + Math.random() * 9, 96);
    if (fill) fill.style.width = p + '%';
    if (pct) pct.textContent = Math.round(p) + '%';
  }, 45);
  const finish = () => {
    if (done) return; done = true;
    clearInterval(tick);
    if (fill) fill.style.width = '100%';
    if (pct) pct.textContent = '100%';
    setTimeout(() => el.classList.add('gone'), reduceMotion ? 60 : 380);
  };
  window.addEventListener('load', () => setTimeout(finish, 350));
  setTimeout(finish, 3200); // hard cap — never trap the user
})();

/* ── works catalogue → rows ─────────────────────────────── */
const WORKS = [
  { src:'media/monarch-portfolio-v5.mp4',   thumb:'assets/thumbs/monarch-00.jpg', title:'MONARCH Portfolio Film', meta:'PORTFOLIO — THE MAIN FILM · 2026', tag:'37S' },
  { src:'media/paanch.web.mp4',             thumb:'assets/thumbs/th-paanch.jpg?v=64', title:'Paanch Rules',        meta:'SHORT — 583K+ VIEWS · URDU MOTION', tag:'75S' },
  { src:'media/lawone.web.mp4',             thumb:'assets/thumbs/th-lawone.jpg?v=64', title:'Monarch: Law One',    meta:'MONARCH — CINEMATIC LAW STORY',  tag:'63S' },
  { src:'media/monarch-01-web.mp4',         thumb:'assets/thumbs/monarch-01.jpg', title:'MONARCH Studio',        meta:'MOTION — PROJECTOR STUDY',        tag:'11S' },
  { src:'media/monarch-02-web.mp4',         thumb:'assets/thumbs/monarch-02.jpg', title:'Clarity in Motion',     meta:'MOTION — BRAND STORY',           tag:'26S' },
  { src:'media/monarch-03-web.mp4',         thumb:'assets/thumbs/monarch-03.jpg', title:'Your Creative Partner', meta:'MOTION — IDENTITY',              tag:'12S' },
  { src:'media/monarch-04-web.mp4',         thumb:'assets/thumbs/monarch-04.jpg', title:'From Idea to Impact',   meta:'MOTION — BRAND STRATEGY',        tag:'37S' },
  { src:'media/monarch-05-web.mp4',         thumb:'assets/thumbs/monarch-05.jpg', title:'Where Ideas Begin',     meta:'MOTION — CREATIVE PROCESS',      tag:'18S' },
  { src:'media/monarch-reference-06-enhanced.mp4', thumb:'assets/thumbs/monarch-06.jpg', title:'MONARCH OS',     meta:'MOTION — MAIN FRAME · SILENT STUDY', tag:'10S' },
  { src:'media/monarch-reference-07-enhanced.mp4', thumb:'assets/thumbs/monarch-07.jpg', title:'The Vision',     meta:'MOTION — VISUAL STORY · SILENT STUDY', tag:'23S' }
];
const list = $('#workList');
if (list) {
  const frag = document.createDocumentFragment();
  WORKS.forEach((w, i) => {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'workrow';
    b.dataset.src = w.src; b.dataset.title = w.title.toUpperCase();
    b.setAttribute('aria-label', 'Play ' + w.title);
    b.innerHTML =
      '<span class="wr-idx">' + String(i + 1).padStart(2, '0') + '</span>' +
      '<img src="' + w.thumb + '" alt="' + w.title + ' thumbnail" loading="lazy" decoding="async">' +
      '<span><h3>' + w.title + '</h3><span class="wr-meta">' + w.meta + '</span></span>' +
      '<span class="wr-play">▶ ' + w.tag + '</span>';
    frag.appendChild(b);
  });
  list.appendChild(frag);
}

/* ── lightbox player ────────────────────────────────────── */
(function lightbox() {
  const box = $('#slightbox'), video = $('#slbVideo'), title = $('#slbTitle');
  if (!box || !video) return;
  const open = (src, t) => {
    video.src = src; if (title) title.textContent = t || 'FILM';
    box.classList.add('open'); box.setAttribute('aria-hidden', 'false');
    const p = video.play(); if (p && p.catch) p.catch(() => {});
    document.body.style.overflow = 'hidden';
  };
  const close = () => {
    box.classList.remove('open'); box.setAttribute('aria-hidden', 'true');
    video.pause(); video.removeAttribute('src'); video.load();
    document.body.style.overflow = '';
  };
  document.addEventListener('click', (e) => {
    const t = e.target.closest('[data-src]');
    if (t) { e.preventDefault(); open(t.dataset.src, t.dataset.title); return; }
    if (e.target === box || e.target.closest('#slbClose')) close();
  });
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') close(); });
})();

/* ── reveal on scroll ───────────────────────────────────── */
(function reveal() {
  const els = $$('.rv');
  if (!('IntersectionObserver' in window) || reduceMotion) { els.forEach(el => el.classList.add('in')); return; }
  const io = new IntersectionObserver((entries) => {
    entries.forEach(en => { if (en.isIntersecting) { en.target.classList.add('in'); io.unobserve(en.target); } });
  }, { threshold: 0.12, rootMargin: '0px 0px -6% 0px' });
  els.forEach(el => io.observe(el));
})();

/* ── lazy scene videos: src on first view, play in view ─── */
(function sceneVideos() {
  const vids = $$('video[data-src]');
  if (!vids.length) return;
  const ensure = v => { if (!v.src) { v.src = v.dataset.src; v.preload = 'auto'; } };
  if (!('IntersectionObserver' in window)) { vids.forEach(ensure); return; }
  const io = new IntersectionObserver((entries) => {
    entries.forEach(en => {
      const v = en.target;
      if (en.isIntersecting) { ensure(v); const p = v.play(); if (p && p.catch) p.catch(() => {}); }
      else v.pause();
    });
  }, { threshold: 0.28 });
  vids.forEach(v => io.observe(v));
})();

/* ── progress bar + active dots + counter ───────────────── */
(function chromeState() {
  const bar = $('#sprog'), dotsWrap = $('#sdots'), counter = $('#chromeIdx');
  const scenes = $$('.scene[data-idx]');
  const total = String(scenes.length).padStart(2, '0');
  // build dots
  if (dotsWrap) {
    scenes.forEach(sc => {
      const a = document.createElement('a');
      a.href = '#' + sc.id;
      a.dataset.lbl = sc.dataset.name || sc.id.toUpperCase();
      a.setAttribute('aria-label', 'Go to ' + (sc.dataset.name || sc.id));
      dotsWrap.appendChild(a);
    });
  }
  const dots = dotsWrap ? $$('a', dotsWrap) : [];
  const setActive = (i) => {
    dots.forEach((d, j) => d.classList.toggle('on', j === i));
    if (counter) counter.textContent = String(i + 1).padStart(2, '0') + ' / ' + total;
  };
  let ticking = false;
  const onScroll = () => {
    if (ticking) return; ticking = true;
    requestAnimationFrame(() => {
      const doc = document.documentElement;
      const max = doc.scrollHeight - doc.clientHeight;
      if (bar) bar.style.width = (max > 0 ? (doc.scrollTop / max) * 100 : 0) + '%';
      // active = scene whose middle line is closest to 40% viewport height
      const probe = doc.clientHeight * 0.4;
      let active = 0, best = Infinity;
      scenes.forEach((sc, i) => {
        const r = sc.getBoundingClientRect();
        const mid = r.top + r.height / 2;
        const d = Math.abs(mid - probe);
        if (d < best) { best = d; active = i; }
      });
      setActive(active);
      ticking = false;
    });
  };
  document.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('resize', onScroll);
  onScroll();
})();

/* ── entry parallax (name follows pointer, subtle) ──────── */
(function parallax() {
  if (reduceMotion) return;
  const name = $('#entryName'); if (!name) return;
  const scene = $('#entry');
  scene.addEventListener('mousemove', (e) => {
    const r = scene.getBoundingClientRect();
    const x = ((e.clientX - r.left) / r.width - 0.5) * 2;
    const y = ((e.clientY - r.top) / r.height - 0.5) * 2;
    name.style.transform = 'translate3d(' + (x * 14) + 'px,' + (y * 10) + 'px,0)';
  });
  scene.addEventListener('mouseleave', () => { name.style.transform = 'translate3d(0,0,0)'; });
})();

/* ── local time ─────────────────────────────────────────── */
(function clock() {
  const fmt = () => new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false });
  const els = [$('#clk'), $('#clk2')].filter(Boolean);
  const tick = () => els.forEach(el => { el.textContent = fmt(); });
  tick(); setInterval(tick, 1000);
})();
