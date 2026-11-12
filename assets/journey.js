/* ══ MONARCH: SPACES-inside-index — journey helpers ══════════
   Lazy scene videos (play in view) + hall parallax. Vanilla JS. */
'use strict';

const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const $  = (s, c) => (c || document).querySelector(s);
const $$ = (s, c) => Array.from((c || document).querySelectorAll(s));

/* lazy scene background videos: src on first view, play/pause by visibility */
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
  }, { threshold: 0.25 });
  vids.forEach(v => io.observe(v));
})();

/* hall parallax — name follows pointer (subtle) */
(function parallax() {
  if (reduceMotion) return;
  const name = $('#entryName'); if (!name) return;
  const hall = $('#hall'); if (!hall) return;
  hall.addEventListener('mousemove', (e) => {
    const r = hall.getBoundingClientRect();
    const x = ((e.clientX - r.left) / r.width - 0.5) * 2;
    const y = ((e.clientY - r.top) / r.height - 0.5) * 2;
    name.style.transform = 'translate3d(' + (x * 14) + 'px,' + (y * 10) + 'px,0)';
  });
  hall.addEventListener('mouseleave', () => { name.style.transform = 'translate3d(0,0,0)'; });
})();

/* hall local-time clock (independent of main.js) */
(function clock() {
  const el = document.getElementById('clkSpace'); if (!el) return;
  const fmt = () => new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false });
  const tick = () => { el.textContent = fmt(); };
  tick(); setInterval(tick, 1000);
})();

/* "WATCH THE MAIN FILM" — reuses the site's #player modal (mirrors main.js plOpen) */
(function watchMainFilm() {
  const btn = document.getElementById('btnWatchFilm'); if (!btn) return;
  const pl = document.getElementById('player'), plV = document.getElementById('plVideo'), plT = document.getElementById('plTitle');
  if (!pl || !plV) return;
  btn.addEventListener('click', () => {
    plV.style.display = '';
    plV.dataset.wide = '1';
    plV.src = btn.dataset.src;
    if (plT) plT.textContent = (btn.dataset.title || 'FILM').toUpperCase();
    pl.classList.add('on'); pl.setAttribute('aria-hidden', 'false'); document.body.classList.add('locked');
    setTimeout(() => { plV.play().catch(() => {}); }, 80);
  });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && pl.classList.contains('on')) {
      plV.pause(); plV.removeAttribute('src'); plV.load();
      pl.classList.remove('on'); pl.setAttribute('aria-hidden', 'true'); document.body.classList.remove('locked');
    }
  });
})();
