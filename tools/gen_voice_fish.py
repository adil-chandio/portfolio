#!/usr/bin/env python3
"""Fish Audio (fish.audio) voice-clip builder for the Monarch Concierge.

Reads a manifest produced by tools/dump-kb.mjs and writes one MP3 per clip
using the official `fishaudio` SDK. Runs on CI with the key from GitHub
Secrets (FISH_API_KEY) — never in a visitor's browser, never in the repo.

Env:
  FISH_API_KEY        (required) — GitHub secret, masked in logs by GitHub
  FISH_MODEL          model id (default: s2.1-pro; s2.1-pro-free also exists)
  FISH_REFERENCE_ID   optional voice id from fish.audio (premade or cloned).
                      Leave unset to use Fish's default built-in multilingual voice.
  VOICE_SPEED         speech speed multiplier (default: 1.0)

Modes:
  --list-voices   print account credits + top voices (id, title, languages)
                  so a voice can be picked, then set as FISH_REFERENCE_ID variable
  (default)       read manifest, synthesize every non-excluded clip to outdir

Usage: python3 tools/gen_voice_fish.py kb.json <outdir>   (or plan view first)
Exit code is non-zero if ANY clip fails — a half-built voice must be loud."""
import json, os, sys

def client():
    from fishaudio import FishAudio
    key = os.environ.get('FISH_API_KEY', '').strip()
    if not key:
        print('ERROR: FISH_API_KEY is not set', file=sys.stderr)
        sys.exit(2)
    return FishAudio(api_key=key)

if '--list-voices' in sys.argv:
    c = client()
    try:
        print('credits:', c.account.get_credits())
        print('package:', c.account.get_package())
    except Exception as e:
        print('credits: unavailable (%s)' % e)
    for label, kwargs in [('top voices', dict(page_size=30, sort_by='task_count'))]:
        v = c.voices.list(**kwargs)
        print(f'--- {label} (total={getattr(v, "total", "?")})')
        for item in getattr(v, 'items', []):
            langs = getattr(item, 'languages', None)
            print(f'  id={item.id}  title={item.title!r}  langs={langs}')
    sys.exit(0)

import json as _json
CONFIG_PATH = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'voice-config.json')
CFG = {}
try:
    CFG = _json.load(open(CONFIG_PATH, encoding='utf-8')) or {}
except Exception:
    pass
manifest_path, outdir = sys.argv[1], sys.argv[2]
model = os.environ.get('FISH_MODEL') or CFG.get('fish_model') or 's2.1-pro-free'
reference_id = os.environ.get('FISH_REFERENCE_ID') or CFG.get('fish_reference_id') or None
speed = float(os.environ.get('VOICE_SPEED') or CFG.get('fish_speed') or '1.0')
os.makedirs(outdir, exist_ok=True)

manifest = json.load(open(manifest_path, encoding='utf-8'))
import hashlib
source_md5 = hashlib.md5(json.dumps(
    [{k: i.get(k) for k in ('id', 'lang', 'text', 'exclude', 'reason')} for i in manifest['items']],
    sort_keys=True).encode()).hexdigest()
prev_path = os.path.join(outdir, 'manifest.json')
if os.path.exists(prev_path):
    try:
        prev = json.load(open(prev_path, encoding='utf-8'))
        if (prev.get('source_md5') == source_md5 and prev.get('engine') == 'fish'
                and prev.get('voice') == (reference_id or 'default') and prev.get('model')
                and os.path.exists(os.path.join(outdir, 'en-greeting.mp3'))):
            print(f"voice clips up to date (source {source_md5[:8]}, voice {prev.get('voice')}) — skipping generation, zero quota spent")
            sys.exit(0)
    except Exception:
        pass
print(f"fish plan: {manifest['count']} clips  voice={reference_id or 'default'} speed={speed}")

c = client()

# Probe models in order — s2.1-pro-free first (free tier), then paid fallbacks.
# No clip files are touched until a model actually works.
candidates = [model, 's2.1-pro-free', 's2.1-pro', 's1']
model = None
for cand in dict.fromkeys(candidates):
    try:
        audio = c.tts.convert(text='Monarch voice check.', format='mp3', speed=1.0, model=cand)
        if audio and len(audio) > 5000:
            model = cand
            print(f'PROBE OK: model={cand} ({len(audio)} bytes)')
            break
        print(f'PROBE WEAK: model={cand} returned {len(audio or b"")} bytes')
    except Exception as e:
        print(f'PROBE FAIL: model={cand}: {e}')
if not model:
    print('ERROR: no Fish model accepted the key/plan — set repo variable FISH_MODEL to a model your account can use', file=sys.stderr)
    sys.exit(1)
try:
    print('credits before:', c.account.get_credits())
except Exception as e:
    print('credits: unavailable (%s)' % e)

tmpdir = outdir.rstrip('/') + '.tmp'
os.makedirs(tmpdir, exist_ok=True)
errors, wrote, total_chars = [], [], 0
for item in manifest['items']:
    if item.get('exclude'):
        print(f"SKIP  {item['lang']}-{item['id']}  ({item.get('reason', 'excluded')})")
        continue
    text = (item.get('text') or '').strip()
    if not text:
        errors.append(item); continue
    base = f"{item['lang']}-{item['id']}"
    try:
        audio = c.tts.convert(text=text, reference_id=reference_id, format='mp3',
                              speed=speed, model=model)
        total_chars += len(text)
        if len(audio) < 5000:
            raise RuntimeError(f'suspiciously small audio payload ({len(audio)} bytes)')
        with open(os.path.join(tmpdir, base + '.mp3'), 'wb') as fh:
            fh.write(audio)
        wrote.append(base)
        print(f"WROTE {base}.mp3  {len(audio)/1024:.0f}KB  chars={len(text)}")
    except Exception as e:  # noqa: BLE001 — collect everything, fail loudly at the end
        errors.append({**item, 'error': str(e)})
        print(f"FAIL  {item['lang']}-{item['id']}: {e}")

if errors:
    print(f"\nFAILED {len(errors)} clips — old voice clips left untouched")
    sys.exit(1)

# all green → swap atomically
for f in os.listdir(outdir):
    if f.endswith('.mp3'):
        os.remove(os.path.join(outdir, f))
for f in os.listdir(tmpdir):
    os.rename(os.path.join(tmpdir, f), os.path.join(outdir, f))
os.rmdir(tmpdir)
json.dump({'engine': 'fish', 'model': model, 'voice': reference_id or 'default', 'source_md5': source_md5, 'clips': sorted(wrote)},
          open(os.path.join(outdir, 'manifest.json'), 'w', encoding='utf-8'), indent=2)
print(f"\nchars synthesized: {total_chars}")
print(f"done: {len(wrote)} clips written with model={model}, {len(errors)} failed")
