#!/usr/bin/env python3
"""Gemini TTS audition generator — pick ONE sweet girl voice, lock it, forever.

Generates 3 short samples per candidate voice (English, Roman Urdu, Urdu script)
so Adil can listen and choose. The winner is locked via the GEMINI_VOICE repo
variable; the workflow never changes it unless he says so.

Env:
  GEMINI_API_KEY   (required) — GitHub secret
  GEMINI_TTS_MODEL model id (default: gemini-2.5-flash-preview-tts)
  GEMINI_AUDITION  comma-separated voice names (default: Aoede,Leda,Achernar,Zephyr,Kore)

Usage: python3 tools/gen_voice_gemini.py audition <outdir>
       python3 tools/gen_voice_gemini.py full <outdir>   (uses GEMINI_VOICE, all clips)
"""
import base64, json, os, re, subprocess, sys, urllib.request

API = 'https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent'
_CFG = {}
try:
    _CFG = json.load(open(os.path.join(os.path.dirname(os.path.abspath(__file__)), 'voice-config.json'), encoding='utf-8')) or {}
except Exception:
    _CFG = {}
_forced = os.environ.get('GEMINI_TTS_MODEL') or _CFG.get('gemini_model')
MODEL_CANDIDATES = [_forced] if _forced else []
MODEL_CANDIDATES += ['gemini-2.5-flash-preview-tts', 'gemini-2.5-flash-tts', 'gemini-2.5-pro-preview-tts', 'gemini-2.5-pro-tts']
KEY = os.environ.get('GEMINI_API_KEY') or ''
ACTIVE_MODEL = [None]

LINES = [  # same three languages the concierge speaks
    ('en', "Assalam-o-Alaikum! I'm the Monarch Concierge — Adil's always-awake desk. What do you want to see?"),
    ('roman', 'Assalam-o-Alaikum! Main Monarch Concierge hun — Adil ki jagah. Kya dekhna chahoge?'),
    ('ur', 'السلام علیکم! میں Monarch Concierge ہوں۔ بتائیں، آپ کیا دیکھنا چاہیں گے؟'),
]
CANDIDATES = [v.strip() for v in (os.environ.get('GEMINI_AUDITION') or 'Aoede,Leda,Achernar,Zephyr,Kore').split(',') if v.strip()]
FULL = LINES + None  # full mode reads the kb manifest instead

def synth(text, voice):
    model = ACTIVE_MODEL[0]
    payload = {
        'contents': [{'parts': [{'text': 'Say in a warm, friendly, natural voice:\n' + text}]}],
        'generationConfig': {
            'responseModalities': ['AUDIO'],
            'speechConfig': {'voiceConfig': {'prebuiltVoiceConfig': {'voiceName': voice}}},
        },
    }
    req = urllib.request.Request(
        API.format(model=model), data=json.dumps(payload).encode(),
        headers={'Content-Type': 'application/json', 'x-goog-api-key': KEY}, method='POST')
    with urllib.request.urlopen(req, timeout=90) as r:
        data = json.loads(r.read())
    parts = data['candidates'][0]['content']['parts']
    inline = next((p.get('inlineData') or p.get('inline_data') for p in parts if (p.get('inlineData') or p.get('inline_data'))), None)
    if not inline:
        raise RuntimeError('no audio in response: %s' % json.dumps(data)[:300])
    pcm = base64.b64decode(inline['data'])
    rate = 24000
    m = re.search(r'rate=(\d+)', inline.get('mimeType') or inline.get('mime_type') or '')
    if m: rate = int(m.group(1))
    hdr = byte_hdr = None
    # minimal WAV wrapper (PCM 16-bit mono)
    n = len(pcm)
    wav = bytearray()
    wav += b'RIFF' + (36 + n).to_bytes(4, 'little') + b'WAVE'
    wav += b'fmt ' + (16).to_bytes(4, 'little') + (1).to_bytes(2, 'little') + (1).to_bytes(2, 'little')
    wav += rate.to_bytes(4, 'little') + (rate * 2).to_bytes(4, 'little') + (2).to_bytes(2, 'little') + (16).to_bytes(2, 'little')
    wav += b'data' + n.to_bytes(4, 'little') + pcm
    return bytes(wav)

def save_mp3(wav_bytes, out_path):
    with open(out_path.replace('.mp3', '.wav'), 'wb') as f:
        f.write(wav_bytes)
    subprocess.run(['ffmpeg', '-y', '-loglevel', 'error', '-i', out_path.replace('.mp3', '.wav'),
                    '-ac', '1', '-ar', '24000', '-b:a', '56k', out_path], check=True)
    os.remove(out_path.replace('.mp3', '.wav'))

def probe():
    for cand in MODEL_CANDIDATES:
        try:
            x = synth('Monarch voice check.', 'Kore')
            if x and len(x) > 2000:
                ACTIVE_MODEL[0] = cand
                print(f'PROBE OK: model={cand} ({len(x)} bytes wav)')
                return
            print(f'PROBE WEAK: model={cand} ({len(x)} bytes)')
        except Exception as e:
            print(f'PROBE FAIL: model={cand}: {e}')
    print('ERROR: no Gemini TTS model available on this key', file=sys.stderr)
    sys.exit(1)

def main():
    if not KEY:
        print('ERROR: GEMINI_API_KEY not set', file=sys.stderr); sys.exit(2)
    mode, outdir = sys.argv[1], sys.argv[2]
    probe()
    os.makedirs(outdir, exist_ok=True)
    if mode == 'audition':
        ok = 0
        for voice in CANDIDATES:
            for lang, line in LINES:
                base = f'gemini-{voice}-{lang}'
                try:
                    save_mp3(synth(line, voice), os.path.join(outdir, base + '.mp3'))
                    print(f'WROTE {base}.mp3'); ok += 1
                except Exception as e:
                    print(f'FAIL  {base}: {e}')
        print(f'audition done: {ok} samples')
        if ok == 0: sys.exit(1)
    elif mode == 'full':
        voice = os.environ.get('GEMINI_VOICE') or _CFG.get('gemini_voice')
        if not voice:
            print('ERROR: gemini_voice not set in tools/voice-config.json — audition first', file=sys.stderr); sys.exit(2)
        import json as js
        manifest = js.load(open(sys.argv[3], encoding='utf-8'))
        for f in os.listdir(outdir):
            if f.startswith('gemini-') and f.endswith('.mp3'):
                os.remove(os.path.join(outdir, f))
        ok = 0
        for item in manifest['items']:
            if item.get('exclude'): continue
            base = f"{item['lang']}-{item['id']}"
            try:
                save_mp3(synth(item['text'], voice), os.path.join(outdir, base + '.mp3'))
                print(f'WROTE {base}.mp3'); ok += 1
            except Exception as e:
                print(f'FAIL  {base}: {e}'); sys.exit(1)
        print(f'full set done: {ok} clips with locked voice {voice}')
    else:
        print('unknown mode', file=sys.stderr); sys.exit(2)

if __name__ == '__main__':
    main()
