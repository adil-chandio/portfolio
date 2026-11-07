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

manifest_path, outdir = sys.argv[1], sys.argv[2]
model = os.environ.get('FISH_MODEL') or 's2.1-pro'
reference_id = os.environ.get('FISH_REFERENCE_ID') or None
speed = float(os.environ.get('VOICE_SPEED') or '1.0')
os.makedirs(outdir, exist_ok=True)

manifest = json.load(open(manifest_path, encoding='utf-8'))
for f in os.listdir(outdir):
    if f.endswith('.mp3'):
        os.remove(os.path.join(outdir, f))  # engine switch must never leave stale clips
print(f"fish plan: {manifest['count']} clips  model={model} voice={reference_id or 'default'} speed={speed}")

c = client()
try:
    print('credits before:', c.account.get_credits())
except Exception as e:
    print('credits: unavailable (%s)' % e)

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
        head = audio[:3]
        ok = head == b'ID3' or (len(audio) > 10_000 and audio[0] == 0xFF and (audio[1] & 0xE0) == 0xE0)
        if not ok:
            raise RuntimeError(f'downloaded bytes do not look like mp3 (len={len(audio)} head={head!r})')
        with open(os.path.join(outdir, base + '.mp3'), 'wb') as fh:
            fh.write(audio)
        wrote.append(base)
        print(f"WROTE {base}.mp3  {len(audio)/1024:.0f}KB  chars={len(text)}")
    except Exception as e:  # noqa: BLE001 — collect everything, fail loudly at the end
        errors.append({**item, 'error': str(e)})
        print(f"FAIL  {item['lang']}-{item['id']}: {e}")

json.dump({'engine': 'fish', 'model': model, 'voice': reference_id or 'default', 'clips': sorted(wrote)},
          open(os.path.join(outdir, 'manifest.json'), 'w', encoding='utf-8'), indent=2)
print(f"\nchars synthesized: {total_chars}")
print(f"done: {len(wrote)} clips written, {len(errors)} failed")
if errors:
    sys.exit(1)
