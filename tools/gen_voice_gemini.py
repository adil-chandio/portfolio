#!/usr/bin/env python3
"""Gemini TTS audition generator — pick ONE sweet girl voice, lock it, forever.

Generates 3 short samples per candidate voice (English, Roman Urdu, Urdu script)
so Adil can listen and choose. The winner is locked via tools/voice-config.json
("gemini_voice") — changes only when he says so.

Env:
  GEMINI_API_KEY   (required) — GitHub secret
  GEMINI_TTS_MODEL optional forced model id
  GEMINI_AUDITION  comma-separated voice names (default girls: Aoede,Leda,Achernar,Zephyr,Kore)

Usage: python3 tools/gen_voice_gemini.py audition <outdir>
       python3 tools/gen_voice_gemini.py full <outdir> <kb.json>   (gemini_voice locked in voice-config.json)
"""
import base64, json, os, sys, urllib.request, urllib.error

KEY = os.environ.get('GEMINI_API_KEY') or ''
CFG_PATH = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'voice-config.json')
ERR_PATH = os.path.join(os.path.dirname(os.path.abspath(__file__)), '.last_gemini_error.txt')
_CFG = {}
try:
    with open(CFG_PATH, encoding='utf-8') as fh:
        _CFG = json.load(fh) or {}
except Exception:
    _CFG = {}
_forced = os.environ.get('GEMINI_TTS_MODEL') or _CFG.get('gemini_model')
MODEL_CANDIDATES = [_forced] if _forced else []
MODEL_CANDIDATES += ['gemini-2.5-flash-preview-tts', 'gemini-2.5-flash-tts', 'gemini-2.5-pro-preview-tts', 'gemini-2.5-pro-tts']
API_VERSIONS = ['v1beta', 'v1alpha']

LINES = [
    ('en', "Assalam-o-Alaikum! I'm the Monarch Concierge — Adil's always-awake desk. What do you want to see?"),
    ('roman', 'Assalam-o-Alaikum! Main Monarch Concierge hun — Adil ki jagah. Kya dekhna chahoge?'),
    ('ur', 'السلام علیکم! میں Monarch Concierge ہوں۔ بتائیں، آپ کیا دیکھنا چاہیں گے؟'),
]
CANDIDATES = [v.strip() for v in (os.environ.get('GEMINI_AUDITION') or 'Aoede,Leda,Achernar').split(',') if v.strip()]
ACTIVE = {'model': None, 'api': 'v1beta', 'errors': []}


def synth(text, voice):
    payload = {
        'contents': [{'parts': [{'text': 'Warm, friendly, natural delivery:\n' + text}]}],
        'generationConfig': {
            'responseModalities': ['AUDIO'],
            'speechConfig': {'voiceConfig': {'prebuiltVoiceConfig': {'voiceName': voice}}},
        },
    }
    url = 'https://generativelanguage.googleapis.com/{}/models/{}:generateContent'.format(ACTIVE['api'], ACTIVE['model'])
    req = urllib.request.Request(
        url, data=json.dumps(payload).encode(),
        headers={'Content-Type': 'application/json', 'x-goog-api-key': KEY}, method='POST')
    try:
        with urllib.request.urlopen(req, timeout=90) as r:
            data = json.loads(r.read())
    except urllib.error.HTTPError as e:
        body = e.read().decode('utf-8', 'ignore')[:800]
        raise RuntimeError('HTTP %d (%s/%s): %s' % (e.code, ACTIVE['api'], ACTIVE['model'], body))
    parts = data.get('candidates', [{}])[0].get('content', {}).get('parts', [])
    inline = None
    for p in parts:
        inline = p.get('inlineData') or p.get('inline_data')
        if inline:
            break
    if not inline:
        raise RuntimeError('no audio in response: ' + json.dumps(data)[:400])
    pcm = base64.b64decode(inline['data'])
    rate = 24000
    mt = (inline.get('mimeType') or inline.get('mime_type') or '')
    for tok in mt.split(';'):
        tok = tok.strip()
        if tok.startswith('rate='):
            try:
                rate = int(tok.split('=', 1)[1])
            except Exception:
                pass
    n = len(pcm)
    wav = bytearray()
    wav += b'RIFF' + (36 + n).to_bytes(4, 'little') + b'WAVE'
    wav += b'fmt ' + (16).to_bytes(4, 'little') + (1).to_bytes(2, 'little') + (1).to_bytes(2, 'little')
    wav += rate.to_bytes(4, 'little') + (rate * 2).to_bytes(4, 'little') + (2).to_bytes(2, 'little') + (16).to_bytes(2, 'little')
    wav += b'data' + n.to_bytes(4, 'little') + pcm
    return bytes(wav)


def probe():
    for cand in MODEL_CANDIDATES:
        for api in API_VERSIONS:
            ACTIVE['model'], ACTIVE['api'] = cand, api
            try:
                w = synth('Monarch voice check.', 'Kore')
                if w and len(w) > 2000:
                    print('PROBE OK: %s on %s (%d bytes wav)' % (cand, api, len(w)))
                    return
                msg = 'PROBE WEAK: %s/%s returned %d bytes' % (cand, api, len(w))
                ACTIVE['errors'].append(msg)
                print(msg)
            except Exception as e:
                ACTIVE['errors'].append('%s/%s: %s' % (cand, api, e))
                print('PROBE FAIL:', cand, api, e)
    with open(ERR_PATH, 'w', encoding='utf-8') as fh:
        fh.write('\n\n'.join(ACTIVE['errors']))
    print('ERROR: no Gemini TTS model available on this key', file=sys.stderr)
    sys.exit(1)


def save_mp3(wav_bytes, out_path):
    tmp = out_path.replace('.mp3', '.wav')
    with open(tmp, 'wb') as f:
        f.write(wav_bytes)
    import subprocess
    subprocess.run(['ffmpeg', '-y', '-loglevel', 'error', '-i', tmp, '-ac', '1', '-ar', '24000', '-b:a', '56k', out_path], check=True)
    os.remove(tmp)


def main():
    if not KEY:
        print('ERROR: GEMINI_API_KEY not set', file=sys.stderr); sys.exit(2)
    mode, outdir = sys.argv[1], sys.argv[2]
    probe()
    if mode == 'audition':
        ok = 0
        for voice in CANDIDATES:
            for lang, line in LINES:
                base = 'gemini-%s-%s' % (voice, lang)
                try:
                    save_mp3(synth(line, voice), os.path.join(outdir, base + '.mp3'))
                    print('WROTE', base + '.mp3'); ok += 1
                except Exception as e:
                    print('FAIL  %s: %s' % (base, e))
        print('audition done: %d samples' % ok)
        if ok == 0:
            sys.exit(1)
    elif mode == 'full':
        voice = os.environ.get('GEMINI_VOICE') or _CFG.get('gemini_voice')
        if not voice:
            print('ERROR: gemini_voice not set in tools/voice-config.json', file=sys.stderr); sys.exit(2)
        manifest = json.load(open(sys.argv[3], encoding='utf-8'))
        ok = 0
        for item in manifest['items']:
            if item.get('exclude'):
                continue
            base = '%s-%s' % (item['lang'], item['id'])
            save_mp3(synth(item['text'], voice), os.path.join(outdir, base + '.mp3'))
            print('WROTE', base + '.mp3'); ok += 1
        print('full set done: %d clips with locked voice %s' % (ok, voice))
    else:
        print('unknown mode', file=sys.stderr); sys.exit(2)


if __name__ == '__main__':
    main()
