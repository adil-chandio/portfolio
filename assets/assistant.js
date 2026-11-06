/* ══ MONARCH CONCIERGE — Adil Chandio's web assistant ═══════
   Client-side, zero-key, zero-tracking. Speaks English,
   Roman Urdu and Urdu script. Voice in via Web Speech API.
   Personality lineage: Monarch-Assistant (WhatsApp) — warm,
   brief, ruthless with vagueness, routes to the human.      */
(function () {
'use strict';

/* Optional remote brain (default OFF). If Adil later exposes his
   Monarch-Assistant endpoint, set window.MQ_API_URL before loading
   this file — it will be tried first, and the site falls back to
   the local concierge on any failure. */
const MQ_API_URL = (typeof window !== 'undefined' && window.MQ_API_URL) || '';

const $  = (s, r = document) => r.querySelector(s);
const store = {
  get(k, d) { try { const v = localStorage.getItem('mq:' + k); return v === null ? d : JSON.parse(v); } catch (_) { return d; } },
  set(k, v) { try { localStorage.setItem('mq:' + k, JSON.stringify(v)); } catch (_) {} }
};
const state = {
  open: false,
  sound: store.get('sound', true),
  name: store.get('name', ''),
  greeted: false,
  listening: false,
  lang: (navigator.language || 'en')
};
const pickName = s => { const t = String(s).replace(/^(?:my name is|mera naam|mera nam|my nam|call me|i am|i'm|i'm just|naam hai)\s*/i, ''); const m = t.match(/[A-Za-z][A-Za-z .'-]{1,24}[A-Za-z]/); return (m ? m[0] : (t.match(/[A-Za-z]{2,}/) || [''])[0]).trim(); };

/* ── Language detect: ur (script) | roman | en ─────────────── */
const ROMAN = /\b(hai|hun|hain|main|mujhe|mere|tera|meri|kya|kaun|kaise|kase|kahan|kb|chahye|chahta|chahte|batao|batayein|bataye|dekh|krna|karna|krdo|kardo|bhej|bhejo|paise|rate|salary|film|video|bhai|yaar|dost|achha|acha|shukriya|theek|thik|han|nahi|nhi|plz|please kr|apna|mera|humara|kaam|madad|website|site par|edhar|udhar|abhi|jaldi|milega|chahiye)\b/i;
function detectLang(q) {
  if (/[\u0600-\u06FF]/.test(q)) return 'ur';
  if (ROMAN.test(q)) return 'roman';
  return 'en';
}
const L = (lang, en, roman, ur) => lang === 'roman' ? roman : lang === 'ur' ? (ur || roman) : en;

/* ── Quick-reply chips ─────────────────────────────────────── */
const CHIPS_MAIN  = ['Who is Adil?', 'What does he do?', 'Show the work', 'Get in touch', 'Giveaways 🎁'];
const CHIPS_WORK  = ['Services & pricing', 'Show the work', 'Get in touch'];
const CHIPS_LOOT  = ['Get the playbook', 'More repos', 'Get in touch'];

/* ── Knowledge base ──────────────────────────────────────────
   Every answer is real: pulled from the site itself and from
   Adil's public GitHub (github.com/adil-chandio).             */
const KB = [
{
  id: 'greeting',
  patterns: ['\\bhi\\b','\\bhello\\b','\\bhey\\b','salam','assalam','aoa','hola','yo\\b','good morning','good evening','good night','kya haal','kaise ho','kaisa hai','السلام','ہیلو','سلام','کیسے ہو'],
  answer: (lang) => L(lang,
    `Assalam-o-Alaikum! 👋 I'm the **Monarch Concierge** — Adil's always-awake assistant (the human is usually losing sleep over a timeline, so I cover the desk).\n\nI can tell you who he is, what he does, show you the receipts, hand you the free drops, or route you straight to him. What's on your mind?`,
    `Assalam-o-Alaikum! 👋 Main **Monarch Concierge** hun — Adil ka hamesha-jaagta assistant (insaan usually kisi timeline pe mara hota hai, to main desk sambhalta hun).\n\nWho he is, kya karta hai, receipts, free drops — ya seedha Adil se connect karwana. Bolo, kya chahiye?`,
    `السلام علیکم! 👋 میں **Monarch Concierge** ہوں — عادل کا ہمیشہ جاگتا ہوا اسسٹنٹ۔ بتائیں، میں آپ کی کیا مدد کر سکتا ہوں؟`),
  chips: CHIPS_MAIN
},
{
  id: 'name',
  patterns: ['my name is','mera naam','mera nam','my nam','call me','naam hai','i am '],
  answer: (lang, ctx) => {
    const n = pickName(ctx.raw);
    if (n) { state.name = n; store.set('name', n); }
    return L(lang,
      `Noted, **${n || 'boss'}** 👑. I'll remember you. What do you want to do — see the work, get the drops, or get in touch?`,
      `Liya note, **${n || 'boss'}** 👑. Yaad rakha. Ab bolo — work dekhna hai, drops lene hain, ya contact karna hai?`,
      `نوٹ کر لیا، **${n || 'دوست'}** 👑۔ یاد رہا۔ اب بتائیں — کام دیکھنا ہے، loot لینی ہے، یا رابطہ کرنا ہے؟`);
  },
  chips: CHIPS_MAIN
},
{
  id: 'who',
  patterns: ['who is adil','who are you','about adil','about him','who is he','tell me about adil','adil kaun','kaun hai ye','kaun hai adil','kon hai','عادل کون','عادل کے بارے','کون ہے','کون ہیں'],
  answer: (lang) => L(lang,
    `**Adil Chandio** — 21, self-made, based in **Hyderabad, Pakistan** 📍\n\nMarch 2024: put his last money into a **second-hand Dell (~$400)** and started a YouTube automation experiment. Monetized in 3 months, first payout $700 — then broke his own discipline, looped for a year… and rebuilt himself on **Oct 31, 2026**: AI unlocked the fun again.\n\nToday: **AI films, YouTube automation, agent stacks, and motion** — building under the **MONARCH** label.\n\nThe headline: one Short did **583K views (+1.6K subs, 74% retention)**. Organic. No ads.`,
    `**Adil Chandio** — 21 saal, self-made, **Hyderabad (Sindh), Pakistan** 📍\n\nMarch 2024: aakhri paise **second-hand Dell (~$400)** pe lagaye aur YouTube automation shuru kiya. 3 mahine mein monetize, pehla payout $700 — phir discipline toola, ek saal loop ghooma… aur **31 Oct 2026** ko khud ko rebuild kiya — AI ne mza wapis la diya.\n\nAaj: **AI films, YouTube automation, agent stacks, motion** — sab **MONARCH** label ke neeche.\n\nHeadline: ek Short pe **583K views (+1.6K subs, 74% retention)**. Organic. No ads.`,
    `**عادل چندیو** — 21 سال، سیلف میڈ، **حیدرآباد (سندھ)، پاکستان** 📍\n\nمارچ 2024 میں دوسری ہینڈ Dell (~$400) خریدی اور YouTube automation شروع کی۔ 3 ماہ میں monetize، پہلا payout $700 — پھر ڈسپلن ٹوٹا، ایک سال بے سمت گھوما… اور **31 اکتوبر 2026** کو خود کو دوبارہ بنایا۔\n\nآج: **AI فلمیں، YouTube automation، agent stacks، motion** — سب کچھ **MONARCH** لیبل تلے۔\n\nنمبرز: ایک Short پر **583K views (+1.6K subs، 74% retention)** — organic، کوئی ads نہیں۔`),
  chips: CHIPS_WORK
},
{
  id: 'work',
  patterns: ['what does he do','what has he done','what do you do','services','services do','your work','work dikhao','kaam dikhao','show work','show the work','portfolio','skills','voiceover','voice over','voice acting','ai voice','voice clone','kya karta hai','kya karte ho','کام دکھاؤ','کام کیا ہے'],
  answer: (lang) => L(lang,
    `Adil builds under **MONARCH** —\n\n**01 · AI Films** — cinematic short films & channel films (e.g. the MONARCH Portfolio Film)\n**02 · YouTube Automation** — channels that research, script, voice and upload themselves\n**03 · Agent Stacks** — Monarch agents that plan, run and delegate work\n**04 · Motion & Video Editing** — frame-perfect, beat-locked cuts\n**05 · Workflow Automation** — n8n-style pipelines for boring busywork\n\nOne Short did **583K views (+1.6K subs, 74% retention)** — organic, no ads.\n\n**Rates:** depend on scope — send a brief and he'll quote honestly.\n\n<a class="mq-cta" href="mailto:workadilchandio@gmail.com?subject=Work%20brief%20%E2%80%94%20from%20your%20website">SEND A BRIEF →</a>`,
    `Adil **MONARCH** ke under banata hai —\n\n**01 · AI Films** — cinematic short films aur channel films\n**02 · YouTube Automation** — aise channels jo khud research, script, voice aur upload karte hain\n**03 · Agent Stacks** — Monarch agents jo plan karte hain, kaam chalate hain, delegate karte hain\n**04 · Motion & Video Editing** — frame-perfect, beat-locked cuts\n**05 · Workflow Automation** — boring busywork ke pipelines\n\nEk Short pe **583K views (+1.6K subs, 74% retention)** — organic, koi ads nahi.\n\n**Rates:** scope pe depend — brief bhejo, seedha quote milega.\n\n<a class="mq-cta" href="mailto:workadilchandio@gmail.com?subject=Work%20brief%20%E2%80%94%20from%20your%20website">BRIEF BHEJO →</a>`,
    `عادل **MONARCH** کے تحت بناتا ہے —\n\n**01 · AI فلمیں** — سنیماٹک شارٹ فلمیں\n**02 · YouTube Automation** — ایسے چینل جو خود ریسرچ، اسکرپٹ، وائس اور اپلوڈ کرتے ہیں\n**03 · Agent Stacks** — Monarch ایجنٹس جو کام پلان اور چلا کر دیتے ہیں\n**04 · Motion & Video Editing** — frame-perfect، beat-locked cuts\n**05 · Workflow Automation** — بورنگ کاموں کے پائپ لائنز\n\nایک Short پر **583K views (+1.6K subs، 74% retention)** — organic۔\n\n<a class="mq-cta" href="mailto:workadilchandio@gmail.com?subject=Work%20brief%20%E2%80%94%20from%20your%20website">بریف بھیجو →</a>`),
  chips: CHIPS_WORK
},
{
  id: 'films',
  patterns: ['film','films','paanch rules','paanch','monarch film','show reel','reel','videos','trinity','monarch os','the vision','clarity in motion','your creative partner','فلم','فلمیں','ریل'],
  answer: (lang) => L(lang,
    `The reel so far — all cut by hand-with-agents:\n\n🎬 **MONARCH Portfolio Film** — the main film, 2026\n🎬 **Paanch Rules** — Urdu motion, 505K+ views energy\n🎬 **MONARCH OS** — main frame, silent brand study\n🎬 **The Vision** — visual story, silent\n🎬 **Clarity in Motion** — brand story\n🎬 **From Idea to Impact** — brand strategy study\n\nScroll to **03 — REEL** on this page to watch them all in the grid →`,
    `Reel ab tak — sab hand-with-agents cuts hain:\n\n🎬 **MONARCH Portfolio Film** — main film, 2026\n🎬 **Paanch Rules** — Urdu motion, 505K+ views wali\n🎬 **MONARCH OS** — silent brand study\n🎬 **The Vision** — silent visual story\n🎬 **Clarity in Motion** — brand story\n🎬 **From Idea to Impact** — brand strategy\n\nIs page pe neeche **03 — REEL** mein sab grid mein dekh sakte ho →`,
    `ریل اب تک — سب ہینڈ ود ایجنٹس کٹس:\n\n🎬 **MONARCH Portfolio Film** — مین فلم، 2026\n🎬 **Paanch Rules** — اردو موشن\n🎬 **MONARCH OS** — خاموش برانڈ اسٹڈی\n🎬 **The Vision** — خاموش بصری کہانی\n🎬 **Clarity in Motion** — برانڈ کہانی\n\nاسی پیج پر **03 — REEL** میں سب گرڈ میں دیکھیں →`),
  chips: ['Show the work', 'Get in touch', 'Giveaways 🎁']
},
{
  id: 'contact',
  patterns: ['contact','email','gmail','reach','reach him','get in touch','touch me','rabta','rabta karo','rabta karna','rabta kaise','baat karni','baat karna','message him','dm him','hire','hire him','collaborate','collaboration','work with him','mail him','رابطہ','ای میل','رابطہ کریں','رابطے','کیسے رابطہ'],
  answer: (lang) => L(lang,
    `Fastest lane — **email** (he reads everything):\n\n📧 **workadilchandio@gmail.com**\n\nElsewhere in the wild:\n• 🎵 TikTok → **@adil.chandiio**\n• 📸 Instagram → **@adill.chandio**\n• 💻 GitHub → **github.com/adil-chandio**\n\nHe's in **Hyderabad, Pakistan (UTC+5)** — usually replies fast, usually replies at night.\n\n<a class="mq-cta" href="mailto:workadilchandio@gmail.com?subject=Hi%20Adil%20%E2%80%94%20from%20your%20website">EMAIL ADIL →</a>`,
    `Sabse fast lane — **email** (sab kuchh padhta hai):\n\n📧 **workadilchandio@gmail.com**\n\nBaqi platforms:\n• 🎵 TikTok → **@adil.chandiio**\n• 📸 Instagram → **@adill.chandio**\n• 💻 GitHub → **github.com/adil-chandio**\n\n**Hyderabad, Pakistan (UTC+5)** — usually fast reply, usually raat ko.\n\n<a class="mq-cta" href="mailto:workadilchandio@gmail.com?subject=Hi%20Adil%20%E2%80%94%20from%20your%20website">ADIL KO EMAIL KARO →</a>`,
    `سب سے تیز راستہ — **ای میل** (سب کچھ پڑھتا ہے):\n\n📧 **workadilchandio@gmail.com**\n\nباقی پلیٹ فارمز:\n• 🎵 TikTok → **@adil.chandiio**\n• 📸 Instagram → **@adill.chandio**\n• 💻 GitHub → **github.com/adil-chandio**\n\n**حیدرآباد، پاکستان** — عام طور پر جلدی جواب، عام طور پر رات کو۔\n\n<a class="mq-cta" href="mailto:workadilchandio@gmail.com?subject=Hi%20Adil%20%E2%80%94%20from%20your%20website">عادل کو ای میل کریں →</a>`),
  chips: ['Services & pricing', 'Giveaways 🎁', 'Who is Adil?']
},
{
  id: 'socials',
  patterns: ['social','tiktok','instagram','insta','github','youtube','twitter','x account','follow','accounts','channel'],
  answer: (lang) => L(lang,
    `Adil online:\n\n• 🎵 TikTok → <a href="https://www.tiktok.com/@adil.chandiio" target="_blank" rel="noopener">@adil.chandiio</a>\n• 📸 Instagram → <a href="https://www.instagram.com/adill.chandio" target="_blank" rel="noopener">@adill.chandio</a>\n• 💻 GitHub → <a href="https://github.com/adil-chandio" target="_blank" rel="noopener">github.com/adil-chandio</a>\n• 📧 Email → <a href="mailto:workadilchandio@gmail.com">workadilchandio@gmail.com</a>\n\nDMs are open — tell him the Concierge sent you.`,
    `Adil online:\n\n• 🎵 TikTok → <a href="https://www.tiktok.com/@adil.chandiio" target="_blank" rel="noopener">@adil.chandiio</a>\n• 📸 Instagram → <a href="https://www.instagram.com/adill.chandio" target="_blank" rel="noopener">@adill.chandio</a>\n• 💻 GitHub → <a href="https://github.com/adil-chandio" target="_blank" rel="noopener">github.com/adil-chandio</a>\n• 📧 Email → <a href="mailto:workadilchandio@gmail.com">workadilchandio@gmail.com</a>\n\nDMs khule hain — kehna Concierge ne bheja hai.`,
    `عادل آن لائن:\n\n• 🎵 TikTok → <a href="https://www.tiktok.com/@adil.chandiio" target="_blank" rel="noopener">@adil.chandiio</a>\n• 📸 Instagram → <a href="https://www.instagram.com/adill.chandio" target="_blank" rel="noopener">@adill.chandio</a>\n• 💻 GitHub → <a href="https://github.com/adil-chandio" target="_blank" rel="noopener">github.com/adil-chandio</a>\n• 📧 Email → <a href="mailto:workadilchandio@gmail.com">workadilchandio@gmail.com</a>`),
  chips: CHIPS_MAIN
},
{
  id: 'giveaway',
  patterns: ['giveaway','free','freebies','free stuff','loot','gift','repo','repos','repository','repositories','prompt','prompts','strategy','strategies','resources','drops','opensource','open source','source code','kitna free','free mein','kuch free','مفت','فری','تحفہ','گیور','ریپوز','پرومپٹ','پلے بک'],
  answer: (lang) => L(lang,
    `🎁 **THE MONARCH LOOT DROP** — Adil keeps his best work public:\n\n<ul class="mq-list"><li>🛠 <a href="https://github.com/adil-chandio/Monarch-Studio" target="_blank" rel="noopener">Monarch-Studio</a> — durable multi-style video editing + animation system, crash-proof. The production brain.</li><li>🤖 <a href="https://github.com/adil-chandio/Monarch-Agent" target="_blank" rel="noopener">Monarch-Agent</a> — the agent stack that plans, runs and delegates</li><li>🕺 <a href="https://github.com/adil-chandio/Monarch.Stickman" target="_blank" rel="noopener">Monarch.Stickman</a> — stickman animation system</li><li>📣 <a href="https://github.com/adil-chandio/Social.Automation" target="_blank" rel="noopener">Social.Automation</a> — social automation pipeline</li><li>🎯 <a href="https://github.com/adil-chandio/creatorreach-ai" target="_blank" rel="noopener">creatorreach-ai</a> — creator outreach, automated</li><li>🌐 <a href="https://github.com/adil-chandio/portfolio" target="_blank" rel="noopener">this portfolio</a> — the whole site, vanilla JS/CSS, free to study</li></ul>\n\nAsk me for **"the playbook"** for his AI content strategy prompts. More drops → follow <a href="https://github.com/adil-chandio" target="_blank" rel="noopener">github.com/adil-chandio</a>`,
    `🎁 **THE MONARCH LOOT DROP** — Adil apni best cheezein public rakhta hai:\n\n<ul class="mq-list"><li>🛠 <a href="https://github.com/adil-chandio/Monarch-Studio" target="_blank" rel="noopener">Monarch-Studio</a> — durable multi-style video editing + animation system. Production ka dimagh.</li><li>🤖 <a href="https://github.com/adil-chandio/Monarch-Agent" target="_blank" rel="noopener">Monarch-Agent</a> — agent stack jo plan karta hai, kaam chalata hai, delegate karta hai</li><li>🕺 <a href="https://github.com/adil-chandio/Monarch.Stickman" target="_blank" rel="noopener">Monarch.Stickman</a> — stickman animation system</li><li>📣 <a href="https://github.com/adil-chandio/Social.Automation" target="_blank" rel="noopener">Social.Automation</a> — social automation pipeline</li><li>🎯 <a href="https://github.com/adil-chandio/creatorreach-ai" target="_blank" rel="noopener">creatorreach-ai</a> — creator outreach, automated</li><li>🌐 <a href="https://github.com/adil-chandio/portfolio" target="_blank" rel="noopener">yeh portfolio</a> — poori site, vanilla JS/CSS, study karne ke liye free</li></ul>\n\n**"playbook"** bolo to uski AI content strategy ke prompts mill jayenge. Zyada drops ke liye → <a href="https://github.com/adil-chandio" target="_blank" rel="noopener">github.com/adil-chandio</a>`,
    `🎁 **دی MONARCH لوٹ ڈراپ** — عادل اپنا بہترین کام پبلک رکھتا ہے:\n\n<ul class="mq-list"><li>🛠 <a href="https://github.com/adil-chandio/Monarch-Studio" target="_blank" rel="noopener">Monarch-Studio</a> — crash-proof ویڈیو ایڈیٹنگ + اینیمیشن سسٹم</li><li>🤖 <a href="https://github.com/adil-chandio/Monarch-Agent" target="_blank" rel="noopener">Monarch-Agent</a> — ایجنٹ اسٹیک</li><li>🕺 <a href="https://github.com/adil-chandio/Monarch.Stickman" target="_blank" rel="noopener">Monarch.Stickman</a> — اسٹک مین اینیمیشن</li><li>📣 <a href="https://github.com/adil-chandio/Social.Automation" target="_blank" rel="noopener">Social.Automation</a> — سوشل آٹومیشن</li><li>🎯 <a href="https://github.com/adil-chandio/creatorreach-ai" target="_blank" rel="noopener">creatorreach-ai</a> — کریئیٹر آؤٹ ریچ</li><li>🌐 <a href="https://github.com/adil-chandio/portfolio" target="_blank" rel="noopener">یہ پورٹ فولیو</a> — پوری سائٹ سٹڈی کے لیے فری</li></ul>\n\n**"playbook"** لکھیں تو AI کنٹینٹ اسٹریٹجی کے پرومپٹس مل جائیں گے۔`),
  chips: CHIPS_LOOT
},
{
  id: 'playbook',
  patterns: ['playbook','strategy','prompts','prompt pack','ai strategy','prompt engineering','secrets','tips','how to grow','viral','short','prompts do','prompt do'],
  answer: (lang) => L(lang,
    `📓 **THE MONARCH PLAYBOOK** (free, condensed):\n\n**1. Frame-by-frame teardown** — pick one viral Short in your niche, log hook (0-3s), cut density, caption style, CTA. Never copy — extract the *pattern*.\n**2. Hook first, always** — write 10 hooks before scripting one line. First 3 seconds decide 74% retention.\n**3. One pipeline, not ten tools** — research → script → voice → edit → upload. Agents (Monarch-Studio) run it; humans decide taste.\n**4. Silence is a frame** — 2-4 silent seconds per beat build dread. Urdu audiences hold attention through pauses.\n**5. Monetize boring** — automation + discipline beats inspiration. Ship daily, study weekly, cry monthly, rebuild yearly.\n\nWant this as a repo drop? → <a href="https://github.com/adil-chandio" target="_blank" rel="noopener">github.com/adil-chandio</a> — or email him with **"PLAYBOOK"** in the subject.`,
    `📓 **THE MONARCH PLAYBOOK** (free, condensed):\n\n**1. Frame-by-frame teardown** — niche ka ek viral Short uthao, hook (0-3s), cut density, caption style, CTA log karo. Copy nahi — *pattern* extract karo.\n**2. Hook pehle, hamesha** — pehli line se pehle 10 hooks likho. Pehle 3 second 74% retention decide karte hain.\n**3. Ek pipeline, das tools nahi** — research → script → voice → edit → upload. Agents (Monarch-Studio) chalate hain; taste insaan decide karta hai.\n**4. Khamoshi bhi frame hai** — 2-4 second ki silence bheed rokti hai.\n**5. Boring cheezein monetize hoti hain** — automation + discipline > inspiration. Roz ship, hafte mein study, mahine mein rona, saal mein rebuild.\n\nRepo drop chahiye to → <a href="https://github.com/adil-chandio" target="_blank" rel="noopener">github.com/adil-chandio</a> — ya email mein **"PLAYBOOK"** likh kar bhejo.`,
    `📓 **دی MONARCH پلے بک** —\n\n**1. Frame چھوڑنا** — کسی ایک وائرل شارٹ کا جائزہ: ہک (0-3 سیکنڈ)، کٹس، کیپشن، CTA۔ کاپی نہیں — *پیٹرن* نکالو۔\n**2. ہک پہلے** — ایک بھی لائن لکھنے سے پہلے 10 ہکس۔\n**3. ایک پائپ لائن** — ریسرچ → اسکرپٹ → وائس → ایڈٹ → اپلوڈ۔\n**4. خاموشی بھی فریم ہے** — 2-4 سیکنڈ کی سکوت توجہ روکتی ہے۔\n**5. بورنگ چیزیں monetize ہوتی ہیں** — آٹومیشن + ڈسپلن۔\n\n<a href="https://github.com/adil-chandio" target="_blank" rel="noopener">github.com/adil-chandio</a> دیکھیں یا **"PLAYBOOK"** لکھ کر ای میل کریں۔`),
  chips: CHIPS_LOOT
},
{
  id: 'availability',
  patterns: ['available','free for work','busy','hiring','open to work','freelance','job','jobs','career','internship','openings','opening','intern','kya free hai','abhi free','timing','time zone','timezone','location','where is he','kahan rehta','kitne baje','awake','reply fast','دستیاب','فری ہے','کہاں رہتا'],
  answer: (lang) => L(lang,
    `**Status: available** 🟢 (that green dot in the footer is live — it's tied to his actual clock)\n\n**Hyderabad, Pakistan — UTC+5.** Night operator; 11 PM - 3 AM is peak brain hours.\n\nResponse time: usually fast. Usually at night. Never boring.`,
    `**Status: available hai** 🟢 (footer ka green dot live hai — asli clock se tied)\n\n**Hyderabad, Pakistan — UTC+5.** Night operator; 11 PM - 3 AM peak brain hours hain.\n\nResponse time: usually fast. Usually raat ko. Kabhi bhi boring nahi.`,
    `**حالت: دستیاب ہے** 🟢 — **حیدرآباد، پاکستان (UTC+5)**۔ رات کا آپریٹر؛ 11 بجے سے 3 بجے تک بہترین دماغی وقت۔ جواب عام طور پر تیز، عام طور پر رات کو۔`),
  chips: ['Get in touch', 'Services & pricing']
},
{
  id: 'pricing',
  patterns: ['pricing','price','cost','quote','kitna','paise','charge','budget','rate card','rates','fees','kitne kaam','kitna charge','kitne paise','how much','\bhow much\b','salary','pay rate','compensation','how much for','how much do','how much does','how much is','kitna lena','قیمت','کتنے پیسے','ریٹ','سیلری'],
  answer: (lang) => L(lang,
    `Honest answer: **it depends on scope** — films, automation builds, agent stacks and editing all price differently.\n\nNo fake "starting from $X" here. Send the brief (goal, deadline, platform) and he'll come back with a number, not a runaround.\n\n<a class="mq-cta" href="mailto:workadilchandio@gmail.com?subject=Quote%20%E2%80%94%20from%20your%20website&body=Goal%3A%20%0ADeadline%3A%20%0APlatform%3A%20">GET A QUOTE →</a>`,
    `seedha jawab: **scope pe depend karta hai** — films, automation, agent stacks, editing sab alag price hain.\n\nFake "starting from $X" nahi. Brief bhejo (goal, deadline, platform) — number milega, bakwas nahi.\n\n<a class="mq-cta" href="mailto:workadilchandio@gmail.com?subject=Quote%20%E2%80%94%20from%20your%20website&body=Goal%3A%20%0ADeadline%3A%20%0APlatform%3A%20">QUOTE LO →</a>`,
    `سیدھا جواب: **اسکوپ پر منحصر ہے**۔ بریف بھیجیں (مقصد، ڈیڈ لائن، پلیٹ فارم) اور نمبر ملے گا۔\n\n<a class="mq-cta" href="mailto:workadilchandio@gmail.com?subject=Quote%20%E2%80%94%20from%20your%20website&body=Goal%3A%20%0ADeadline%3A%20%0APlatform%3A%20">کوٹ لیں →</a>`),
  chips: ['Get in touch', 'Services & pricing', 'Giveaways 🎁']
},
{
  id: 'palestine',
  patterns: ['palestine','palestina','falasteen','free palestine','gaza','stance','believe','values'],
  answer: (lang) => L(lang,
    `That section on the site isn't decoration. Adil stands with **Palestine** — the flag at the bottom is the quietest loudest thing on the page. Everything else he builds, he builds with that weight in the chair.`,
    `Woh section site pe decoration nahi hai. Adil **Palestine** ke sath کھڑا hai — flag neeche legta hai, sabse zyada bolta hai. Jo bhi banta hai, us weight ke sath banta hai.`,
    `سائٹ کا وہ حصہ محض تزئین نہیں۔ عادل **فلسطین** کے ساتھ کھڑا ہے — نیچے لگا جھنڈا سب سے زیادہ بولتا ہے۔`),
  chips: ['Who is Adil?', 'Giveaways 🎁']
},
{
  id: 'site',
  patterns: ['this site','website','how was this made','tech stack','built with','portfolio made','source code','github repo','how did you build','cursor','rebuild'],
  answer: (lang) => L(lang,
    `This site? **Vanilla HTML/CSS/JS on GitHub Pages** — no frameworks, no build step, no mercy.\n\nThe opening sequence — cursors literally *rebuilding the site in front of you* — is hand-rolled JS. And when the cursors finish, the void stays.\n\nSource: <a href="https://github.com/adil-chandio/portfolio" target="_blank" rel="noopener">github.com/adil-chandio/portfolio</a> — study it, steal from it, just make it yours.\n\nAnd this Concierge? Rule-based, right here in your browser — **nothing you type ever leaves this page.**`,
    `Yeh site? **Vanilla HTML/CSS/JS, GitHub Pages pe** — koi framework nahi, koi build step nahi.\n\nOpening — cursors site ko *aake saamne rebuild karte hain* — hand-rolled JS hai. Aur jab cursors khatam hon, void wahi rehta hai.\n\nSource: <a href="https://github.com/adil-chandio/portfolio" target="_blank" rel="noopener">github.com/adil-chandio/portfolio</a> — study karo, steal karo, par apna banana.\n\nAur yeh Concierge? Rule-based, yahin tumhare browser mein — **jo tum type karte ho woh kahin nahi jata.**`,
    `یہ سائٹ؟ **Vanilla HTML/CSS/JS، GitHub Pages پر**۔ اوپننگ — کرسرز سائٹ کو تمہارے سامنے دوبارہ بناتے ہیں — وہ ہینڈ رولڈ JS ہے۔\n\nسورس: <a href="https://github.com/adil-chandio/portfolio" target="_blank" rel="noopener">github.com/adil-chandio/portfolio</a>\n\nاور یہ Concierge؟ تمہارے براؤزر میں rule-based — **جو کچھ تم لکھتے ہو، وہ کہیں نہیں جاتا۔**`),
  chips: ['Giveaways 🎁', 'Who is Adil?', 'Get in touch']
},
{
  id: 'human',
  patterns: ['are you human','are you a bot','are you ai','who built you','is this ai','real person','what are you','tum kaun ho','aap kaun hain','insan ho','bot ho','machine ho'],
  answer: (lang) => L(lang,
    `Sharp eye. I'm the **Monarch Concierge** — Adil's assistant, not the man himself.\n\nI'm rule-based and I live entirely in your browser: fast, private, zero tracking. When you need the human, say **"get in touch"** and I'll point you at email/socials.`,
    `Tez aankhein. Main **Monarch Concierge** hun — Adil ka assistant, khud Adil nahi.\n\nMain rule-based hun aur poora browser mein rehta hun: fast, private, zero tracking. Insaan chahiye to **"get in touch"** bolo.`,
    `تیز آنکھیں۔ میں **Monarch Concierge** ہوں — عادل کا اسسٹنٹ، خود عادل نہیں۔ rule-based ہوں، صرف تمہارے براؤزر میں۔ اصل انسان کے لیے **"get in touch"** لکھو۔`),
  chips: CHIPS_MAIN
},
{
  id: 'hours',
  patterns: ['hours','open','when are you','reply time','response time','kitni der','jab jawab','kab reply','kab milega','کب جواب','کتنے گھنٹے'],
  answer: (lang) => L(lang,
    `I don't sleep — that's the point of me. Adil reads messages when he surfaces (usually 10 PM onwards PKT) and clears the queue every night.\n\nUrgent? Put **"URGENT"** in your email subject — it gets seen first.`,
    `Main sota nahi — wahi to mera point hai. Adil jab surface karta hai (usually 10 PM ke baad PKT) queue clear karta hai.\n\nUrgent? Email subject mein **"URGENT"** likh do — pehle dikhta hai.`,
    `میں نہیں سوتا — یہی میرا نقطہ ہے۔ عادل جب سطح پر آتا ہے (عموماً رات 10 بجے کے بعد) سب کچھ دیکھتا ہے۔ ارجنٹ ہو تو ای میل کے سبجیکٹ میں **"URGENT"** لکھو۔`),
  chips: ['Get in touch', 'Giveaways 🎁']
},
{
  id: 'forgetme',
  patterns: ['forget me','delete my name','clear my name','forget everything','unremember','erase my name','mera naam hatao','yaad mat','yaad nahi rakh','naam mat rakh','bhool','bhul ja','bhool jao','بھول','مجھے بھول','نام مٹاؤ','نام ہٹاؤ','یاد نہ رکھو'],
  answer: (lang) => {
    state.name = ''; store.set('name', '');
    return L(lang,
      `Done. Name deleted from this browser. I now know **nothing** about you — as it was. 🕳️`,
      `Ho gaya. Naam is browser se delete. Ab main tumhare baare mein **kuch nahi** jaanta. 🕳️`,
      `ہو گیا۔ نام اس براؤزر سے مٹا دیا گیا۔ اب میں آپ کے بارے میں **کچھ نہیں** جانتا۔ 🕳️`);
  },
  chips: CHIPS_MAIN
},
{
  id: 'delete',
  patterns: ['delete my data','privacy','track','tracking','cookies','my data','forget me','data store'],
  answer: (lang) => L(lang,
    `Clean slate policy: the only thing I store is the **name you tell me** — and even that lives in **your browser's localStorage**, never on a server.\n\nWant it gone? Clear this site's data in browser settings, or say **"forget me"**. No analytics, no cookies, no pixels.`,
    `Clean slate: bas **tumhara bataya naam** store hota hai — woh bhi **tumhare browser** mein, server pe kabhi nahi.\n\nKhatam karna ho to browser mein site data clear kar do, ya **"forget me"** bolo. Koi analytics nahi, koi cookie nahi.`,
    `صرف وہ نام محفوظ ہوتا ہے جو تم بتاتے ہو — اور وہ بھی **تمہارے براؤزر** میں۔ ختم کرنا ہو تو براؤزر میں سائٹ کا ڈیٹا صاف کر دو، یا **"forget me"** لکھو۔`),
  chips: ['Get in touch', 'Who is Adil?']
},
];

/* ── Matcher ───────────────────────────────────────────────── */
function normalize(q) {
  return String(q).toLowerCase().replace(/[“”"‘’`]/g, "'").replace(/\s+/g, ' ').trim();
}
function lev(a, b) {
  const m = a.length, n = b.length;
  if (Math.abs(m - n) > 2) return 3;
  const dp = Array.from({ length: m + 1 }, () => new Array(n + 1).fill(0));
  for (let i = 0; i <= m; i++) dp[i][0] = i;
  for (let j = 0; j <= n; j++) dp[0][j] = j;
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      dp[i][j] = Math.min(dp[i-1][j] + 1, dp[i][j-1] + 1, dp[i-1][j-1] + (a[i-1] === b[j-1] ? 0 : 1));
    }
  }
  return dp[m][n];
}
function scoreIntent(qn, intent) {
  let score = 0;
  for (const p of intent.patterns) {
    if (p.includes('\\b')) {
      if (new RegExp(p, 'i').test(qn)) score += 6;
    } else if (qn.includes(p)) {
      score += 5;
    }
  }
  if (intent.patterns.includes(qn)) score += 8; // exact phrase
  // token overlap bonus (with small-typo tolerance)
  const qt = [...new Set(qn.split(/[^a-z0-9\u0600-\u06FF]+/).filter(Boolean))];
  if (qt.length) {
    for (const p of intent.patterns) {
      for (const tok of p.replace(/\\b/g, '').split(/[^a-z0-9\u0600-\u06FF]+/).filter(t => t.length > 3)) {
        for (const q of qt) {
          if (q === tok) { score += 1; break; }
          if (tok.length >= 5 && q.length >= 5 && Math.abs(q.length - tok.length) <= 2 && lev(q, tok) <= 2) { score += 3; break; }
        }
      }
    }
  }
  return score;
}
function bestIntent(raw) {
  const qn = normalize(raw);
  let best = null, bestScore = 0;
  for (const intent of KB) {
    const s = scoreIntent(qn, intent);
    if (s > bestScore) { bestScore = s; best = intent; }
  }
  return bestScore >= 3 ? best : null;
}

/* ── Remote brain (optional, off by default) ─────────────── */
async function remoteAnswer(raw) {
  if (!MQ_API_URL) return null;
  try {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), 4500);
    const res = await fetch(MQ_API_URL, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ q: raw, lang: detectLang(raw), name: state.name || undefined }),
      signal: ctrl.signal
    });
    clearTimeout(t);
    if (!res.ok) return null;
    const data = await res.json();
    return (data && (data.answer || data.text || data.reply)) || null;
  } catch (_) { return null; }
}

/* ── DOM helpers ───────────────────────────────────────────── */
const logEl = () => $('#mqLog');
function escapeHtml(s) { const d = document.createElement('div'); d.textContent = s; return d.innerHTML; }
function addBubble(role, html, { htmlSafe = true } = {}) {
  const row = document.createElement('div');
  row.className = 'mq-row ' + role;
  if (role === 'bot') {
    row.innerHTML = `<div class="mq-ava"><img src="assets/logo-192.png?v=14" alt="" width="26" height="26"></div><div class="mq-bub"></div>`;
    const bub = row.querySelector('.mq-bub');
    if (htmlSafe) bub.innerHTML = html; else bub.textContent = html;
  } else {
    row.innerHTML = `<div class="mq-bub"></div>`;
    const bub = row.querySelector('.mq-bub');
    bub.textContent = html;
  }
  logEl().appendChild(row);
  logEl().scrollTop = logEl().scrollHeight;
  return row;
}
function renderChips(chips) {
  const wrap = $('#mqChips');
  wrap.innerHTML = '';
  if (!chips) return;
  for (const c of chips) {
    const b = document.createElement('button');
    b.className = 'mq-chip'; b.type = 'button'; b.textContent = c;
    b.addEventListener('click', () => { $('#mqInput').value = c.replace(/🎁|📓|→/g, '').trim(); sendCurrent(); });
    wrap.appendChild(b);
  }
}
function typing(on) {
  let t = $('#mqTyping');
  if (on && !t) {
    const row = document.createElement('div');
    row.className = 'mq-row bot'; row.id = 'mqTyping';
    row.innerHTML = `<div class="mq-ava"><img src="assets/logo-192.png?v=14" alt="" width="26" height="26"></div><div class="mq-typing"><i></i><i></i></div>`;
    logEl().appendChild(row);
    logEl().scrollTop = logEl().scrollHeight;
  } else if (!on && t) t.remove();
}

/* ── Voice out (text → speech) ─────────────────────────────── */
const synth = window.speechSynthesis || null;

/* Warm, human-leaning voice pick. Browser TTS quality depends on the
   visitor's device — prefer neural/natural Google & Microsoft voices,
   iOS Samantha-class voices; degrade gracefully to any en/ur voice.   */
const VOICE_WISH_EN = ['aria', 'emma', 'jenny', 'ava', 'google us english', 'google uk english female',
  'samantha', 'karen', 'moira', 'tessa', 'zira', 'veena', 'zoe'];
const VOICE_WISH_UR = ['urdu', 'veena', 'heera', 'swara', 'hindi'];
function pickVoice(isUrdu, voices) {
  const v = voices || [];
  const norm = x => (x.lang || '').replace('_', '-').toLowerCase();
  const byName = (wish) => v.find(x => wish.some(n => (x.name || '').toLowerCase().includes(n))) || null;
  if (isUrdu) {
    const ur = v.find(x => norm(x).startsWith('ur'));
    if (ur) return ur;
    const wished = byName(VOICE_WISH_UR); if (wished) return wished;
    const hi = v.find(x => norm(x).startsWith('hi')); if (hi) return hi;
  }
  const enWished = byName(VOICE_WISH_EN); if (enWished) return enWished;
  const natural = v.find(x => /natural|neural|premium|enhanced/i.test(x.name || '')); if (natural) return natural;
  const enUS = v.find(x => norm(x).startsWith('en-us')); if (enUS) return enUS;
  const en = v.find(x => norm(x).startsWith('en')); if (en) return en;
  return v[0] || null;
}
function speakText(html) {
  if (!state.sound || !synth) return;
  try {
    const tmp = document.createElement('div');
    tmp.innerHTML = html;
    const text = (tmp.textContent || '').replace(/\s+/g, ' ').trim();
    if (!text) return;
    synth.cancel();
    const isUrdu = /[\u0600-\u06FF]/.test(text);
    const u = new SpeechSynthesisUtterance(text.slice(0, 420));
    u.rate = 0.97; u.pitch = 1.05; u.volume = 1;
    const v = pickVoice(isUrdu, synth.getVoices() || []);
    if (v) u.voice = v;
    u.lang = v ? v.lang : (isUrdu ? 'ur-PK' : 'en-US');
    synth.speak(u);
  } catch (_) {}
}

/* ── Answer pipeline ───────────────────────────────────────── */
const wait = ms => new Promise(r => setTimeout(r, ms));
async function respond(raw) {
  typing(true);
  const lang = detectLang(raw);
  const minDelay = 320 + Math.random() * 420;
  const t0 = Date.now();
  const remote = await remoteAnswer(raw);
  await wait(Math.max(0, minDelay - (Date.now() - t0)));
  typing(false);
  if (remote) {
    addBubble('bot', escapeHtml(remote).replace(/\n/g, '<br>'));
    speakText(remote);
    renderChips(CHIPS_MAIN);
    return;
  }
  const hit = bestIntent(raw);
  if (hit) {
    const html = hit.answer(lang, { raw });
    addBubble('bot', html);
    speakText(html);
    renderChips(hit.chips);
    return;
  }
  const who = state.name ? `, ${state.name}` : '';
  const fb = L(lang,
    `Hmm — that one's above my pay grade${who}. 👑\n\nTry one of these, or email him directly: **workadilchandio@gmail.com**`,
    `Hmm — yeh thoda upar ki league ka hai${who}. 👑\n\nYe try karo, ya seedha email: **workadilchandio@gmail.com**`,
    `یہ میرے دائرے سے اوپر ہے${who}۔ نیچے سے کچھ چنو، یا سیدھا ای میل: **workadilchandio@gmail.com**`);
  addBubble('bot', fb);
  speakText(fb);
  renderChips(CHIPS_MAIN);
}

/* ── Send ──────────────────────────────────────────────────── */
async function sendCurrent() {
  const input = $('#mqInput');
  const raw = input.value.trim();
  if (!raw) return;
  addBubble('user', raw);
  input.value = '';
  renderChips(null);
  await respond(raw);
}

/* ── Voice in (speech → text) ──────────────────────────────── */
const SR = window.SpeechRecognition || window.webkitSpeechRecognition || null;
let rec = null;
function toggleMic() {
  const input = $('#mqInput');
  const micBtn = $('#mqMic');
  if (!SR) {
    addBubble('bot', L('en',
      `Voice isn't supported in this browser — **Chrome or Android Chrome** works best. Until then, type away 👇`,
      `Is browser mein voice kaam nahi karta — **Chrome ya Android Chrome** best hai. Tab tak type karo 👇`,
      `اس براؤزر میں وائس نہیں چلتی — **Chrome** بہترین ہے۔ تب تک ٹائپ کریں 👇`));
    return;
  }
  if (state.listening && rec) { try { rec.stop(); } catch (_) {} return; }
  try {
    rec = new SR();
    rec.lang = (state.lang || '').toLowerCase().startsWith('ur') ? 'ur-PK' : 'en-US';
    rec.interimResults = true;
    rec.maxAlternatives = 3;
    rec.continuous = false;
    let finalText = '';
    rec.onstart = () => {
      state.listening = true;
      micBtn.setAttribute('aria-pressed', 'true');
      input.classList.add('mq-listening');
      input.placeholder = 'Listening…';
    };
    const done = () => {
      state.listening = false;
      micBtn.setAttribute('aria-pressed', 'false');
      input.classList.remove('mq-listening');
      input.placeholder = 'Type anything… or tap the mic';
      if (finalText.trim()) { input.value = finalText.trim(); sendCurrent(); }
    };
    rec.onresult = (ev) => {
      let interim = '';
      for (const res of ev.results) {
        if (res.isFinal) finalText += res[0].transcript;
        else interim += res[0].transcript;
      }
      input.value = (finalText + interim).trim();
    };
    rec.onerror = (ev) => {
      done();
      const err = (ev && ev.error) || 'unknown';
      if (err === 'not-allowed' || err === 'service-not-allowed') {
        addBubble('bot', `Mic is blocked — allow microphone access for this site, or just type. (Agar mic block hai to site settings se allow karo.)`);
      } else if (err !== 'aborted' && err !== 'no-speech') {
        addBubble('bot', `Mic glitch: <span class="mq-mono">${escapeHtml(err)}</span> — try again or type.`);
      }
    };
    rec.onend = done;
    rec.start();
  } catch (_) {
    state.listening = false;
    $('#mqMic').setAttribute('aria-pressed', 'false');
  }
}

/* ── Panel open/close ──────────────────────────────────────── */
function setOpen(open) {
  state.open = open;
  const panel = $('#mqPanel');
  const fab = $('#mqFab');
  panel.classList.toggle('open', open);
  panel.setAttribute('aria-hidden', open ? 'false' : 'true');
  fab.setAttribute('aria-expanded', open ? 'true' : 'false');
  fab.classList.remove('has-unread');
  if (open) {
    setTimeout(() => $('#mqInput').focus({ preventScroll: true }), 160);
    if (!state.greeted && !state.sound) {
      state.greeted = 'muted';
      const who = state.name ? ` ${escapeHtml(state.name)}` : '';
      const hint = L('en',
        `Welcome${who}. 🔇 Voice replies are **muted** right now — tap the speaker icon (top-right) and I'll talk back warm. Meanwhile, ask away.`,
        `Welcome${who}. 🔇 Abhi voice replies **mute** hain — speaker icon (top-right) daba do, main bol kar jawab dunga. Tab tak type karo.`,
        `خوش آمدید${who}۔ 🔇 آواز ابھی بند ہے — اوپر دائیں اسپیکر آئیکن دبائیں، میں بولا کر جواب دوں گا۔`);
      addBubble('bot', hint);
      renderChips(CHIPS_MAIN);
      return;
    }
    if (!state.greeted) {
      state.greeted = true;
      const who = state.name ? ` ${escapeHtml(state.name)}` : '';
      const g = state.name
        ? L('en', `Welcome back${who}. 👑 What do you want to see?`, `Welcome back${who}. 👑 Kya dekhna hai?`, `خوش آمدید${who}۔`)
        : KB.find(k => k.id === 'greeting').answer(detectLang(navigator.language || 'en'), { raw: '' });
      addBubble('bot', g);
      speakText(g);
      renderChips(CHIPS_MAIN);
    }
  }
}

/* ── Sound toggle ──────────────────────────────────────────── */
function renderSound() {
  const btn = $('#mqSound');
  btn.setAttribute('aria-pressed', state.sound ? 'true' : 'false');
  btn.title = state.sound ? 'Voice replies: on' : 'Voice replies: off';
}

/* ── Wire up ───────────────────────────────────────────────── */
document.addEventListener('DOMContentLoaded', () => {
  const fab = $('#mqFab'), panel = $('#mqPanel');
  if (!fab || !panel) return;

  fab.addEventListener('click', () => setOpen(!state.open));
  $('#mqClose').addEventListener('click', () => setOpen(false));
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && state.open) setOpen(false);
  });
  document.addEventListener('click', (e) => {
    if (state.open && !panel.contains(e.target) && !fab.contains(e.target)) setOpen(false);
  });

  $('#mqForm').addEventListener('submit', (e) => { e.preventDefault(); sendCurrent(); });
  $('#mqMic').addEventListener('click', toggleMic);

  const soundBtn = $('#mqSound');
  renderSound();
  soundBtn.addEventListener('click', () => {
    state.sound = !state.sound;
    store.set('sound', state.sound);
    renderSound();
    if (!state.sound && synth) synth.cancel();
    else speakText('Voice on. I will talk back.');
  });

  // Warm up voices (Chrome lazily loads them)
  if (synth) { try { synth.getVoices(); synth.onvoiceschanged = () => synth.getVoices(); } catch (_) {} }

  // Unread badge nudge after 8s if never opened this session
  const ssGet = k => { try { return sessionStorage.getItem(k); } catch (_) { return null; } };
  const ssSet = k => { try { sessionStorage.setItem(k, '1'); } catch (_) {} };
  setTimeout(() => { if (!state.open && !ssGet('mq:nudged')) { fab.classList.add('has-unread'); } }, 8000);
  fab.addEventListener('click', () => ssSet('mq:nudged'), { once: true });
});
})();
