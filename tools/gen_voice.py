#!/usr/bin/env python3
"""Generate pre-baked voice clips for the Monarch Concierge.

Reads a manifest produced by tools/dump-kb.mjs and writes one WAV per
clip using Kokoro-82M (int8 ONNX, Apache-2.0). Runs on CI (or anywhere with
the model on disk) — never in a visitor's browser.

Env:
  MODEL_DIR  directory holding kokoro-v1.0.int8.onnx + voices-v1.0.bin
  VOICE      Kokoro voice id (default: af_heart)
  SPEED      speech speed (default: 1.0)

Usage: MODEL_DIR=/tmp/kokoro python3 tools/gen_voice.py kb.json <outdir>
Exit code is non-zero if ANY clip fails — a half-built voice must be loud,
not silent."""
import json, os, re, sys
import numpy as np
import soundfile as sf
from kokoro_onnx import Kokoro

manifest_path, outdir = sys.argv[1], sys.argv[2]
model_dir = os.environ.get('MODEL_DIR', '/tmp/kokoro')
voice = os.environ.get('VOICE', 'af_heart')
speed = float(os.environ.get('SPEED', '1.0'))
os.makedirs(outdir, exist_ok=True)

manifest = json.load(open(manifest_path, encoding='utf-8'))
print(f"clips to generate: {manifest['count']}  voice={voice} speed={speed}")

kokoro = Kokoro(
    os.path.join(model_dir, 'kokoro-v1.0.int8.onnx'),
    os.path.join(model_dir, 'voices-v1.0.bin'),
)

SILENCE_S = 0.16
errors, wrote = [], []
for item in manifest['items']:
    if item.get('exclude'):
        print(f"SKIP  {item['lang']}-{item['id']}  ({item.get('reason', 'excluded')})")
        continue
    text = (item.get('text') or '').strip()
    if not text:
        errors.append(item)
        continue
    try:
        # Kokoro's phoneme budget is small — split on sentence boundaries and
        # stitch with short silences.
        chunks = [c.strip() for c in re.split(r'(?<=[.!?…])\s+|(?<=:)\s+(?=[A-Z0-9])|\n+', text) if c.strip()]
        parts, sr = [], None
        for chunk in chunks:
            samples, sample_rate = kokoro.create(chunk, voice=voice, speed=speed, lang='en-us')
            sr = sample_rate
            parts.append(samples)
            parts.append(np.zeros(int(SILENCE_S * sample_rate), dtype=samples.dtype))
        audio = np.concatenate(parts)
        peak = float(np.max(np.abs(audio))) if len(audio) else 0.0
        if len(audio) / (sr or 1) < 0.4 or peak < 1e-4:
            raise RuntimeError(f'too short or silent ({len(audio)/(sr or 1):.2f}s peak={peak:.4f})')
        base = f"{item['lang']}-{item['id']}"
        sf.write(os.path.join(outdir, base + '.wav'), audio, sr, subtype='PCM_16')
        wrote.append(base)
        print(f"WROTE {base}.wav  {len(audio)/sr:.1f}s  peak={peak:.2f}")
    except Exception as e:  # noqa: BLE001 — collect every failure, fail loudly at the end
        errors.append({**item, 'error': str(e)})
        print(f"FAIL  {item['lang']}-{item['id']}: {e}")

json.dump({'voice': voice, 'clips': sorted(wrote)},
          open(os.path.join(outdir, 'manifest.json'), 'w', encoding='utf-8'), indent=2)
print(f"\ndone: {len(wrote)} clips written, {len(errors)} failed")
if errors:
    sys.exit(1)
