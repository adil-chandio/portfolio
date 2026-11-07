/* Dump Concierge KB answers as SPOKEN text for clip generation.
   Usage: node tools/dump-kb.mjs <output.json>
   Mirrors cleanForSpeech() in assets/assistant.js (regex variant, no DOM). */
import fs from 'node:fs';
import vm from 'node:vm';

const src = fs.readFileSync(new URL('../assets/assistant.js', import.meta.url), 'utf8');
const old = '\n})();\n';
const inject = `
;globalThis.__KB = KB.map(k => {
  const langs = {};
  for (const l of ['en', 'roman', 'ur']) {
    try { langs[l] = String(k.answer(l, { raw: '' })); } catch (e) { langs[l] = null; }
  }
  return { id: k.id, langs };
});
})();
`;
const code = src.slice(0, src.length - old.length) + inject;

const makeEl = () => {
  const el = { _t: '' };
  Object.defineProperty(el, 'innerHTML', { set(v) { this._t = String(v); }, get() { return this._t; } });
  Object.defineProperty(el, 'textContent', { set(v) { this._t = String(v).replace(/<[^>]+>/g, ' '); }, get() { return this._t; } });
  return el;
};
const sandbox = {
  console, window: {}, navigator: { language: 'en-US' },
  document: { addEventListener() {}, createElement: makeEl }
};
sandbox.window = sandbox;
vm.createContext(sandbox);
vm.runInContext(code, sandbox);

/* MUST MATCH cleanForSpeech() — keep in sync with assets/assistant.js */
function cleanForSpeech(html) {
  return String(html)
    .replace(/<[^>]+>/g, ' ')
    .replace(/\*\*([^*]+)\*\*/g, '$1')
    .replace(/[*_`#~]/g, ' ')
    .replace(/(?:https?:\/\/)?(?:www\.)?github\.com\/\S*/gi, ' his GitHub ')
    .replace(/https?:\/\/\S+/g, ' ')
    .replace(/[\u{1F000}-\u{1FAFF}\u{2600}-\u{27BF}\u{2B00}-\u{2BFF}\u{FE00}-\u{FE0F}\u{200D}]/gu, ' ')
    .replace(/[→←↑↓•·]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

const INCLUDE_URDU = process.env.INCLUDE_URDU === '1'; // Fish speaks Urdu; Kokoro doesn't
const EXCLUDE = { name: 'dynamic — visitor name interpolated' };
const items = [];
for (const { id, langs } of sandbox.__KB) {
  for (const lang of ['en', 'roman', 'ur']) {
    const raw = langs[lang];
    const entry = { id, lang, exclude: false, reason: '', text: '' };
    if (!raw) { entry.exclude = true; entry.reason = 'render error'; }
    else if (lang === 'ur' && !INCLUDE_URDU) { entry.exclude = true; entry.reason = 'No Urdu-capable engine configured (Urdu script keeps the device ur-PK voice)'; }
    else if (EXCLUDE[id]) { entry.exclude = true; entry.reason = EXCLUDE[id]; }
    else entry.text = cleanForSpeech(raw);
    items.push(entry);
  }
}
const out = {
  generated: new Date().toISOString(),
  count: items.filter(i => !i.exclude).length,
  items
};
fs.writeFileSync(process.argv[2], JSON.stringify(out, null, 2));
console.log(`dumped ${out.count} clips (excluded ${items.length - out.count}) → ${process.argv[2]}`);
