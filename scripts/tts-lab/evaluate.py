"""Scores every rendered clip and picks the best engine per language.

- Intelligibility: Whisper (large-v3-turbo) transcribes each clip with the language forced; the
  character error rate (CER) against the input text tells gibberish from clear speech.
- Distinctness: an ECAPA speaker embedding per voice (averaged over its sentences). Two voices
  whose cosine similarity is above SAME_SPEAKER sound like the same person.

For every engine and language, the intelligible voices are greedily collected into a cast where
no two are too similar; the engine with the largest such cast (then the lowest CER) wins.
Writes <LAB>/report.json and <LAB>/report.html (with audio players, for listening).
"""
import html
import json
import os
import re
import unicodedata
from pathlib import Path

import numpy as np
import soundfile as sf
import torch
import torchaudio

from common import LAB, OUT, SENTENCES

MAX_CER = 0.10
SAME_SPEAKER = 0.55
CACHE = LAB / "scores.json"
device = "cuda" if torch.cuda.is_available() else "cpu"


def normalize(text: str) -> str:
    text = unicodedata.normalize("NFKC", text).lower()
    text = re.sub(r"[^\w\s]", " ", text)
    return re.sub(r"\s+", " ", text).strip()


def cer(reference: str, hypothesis: str) -> float:
    ref, hyp = normalize(reference), normalize(hypothesis)
    previous = list(range(len(hyp) + 1))
    for i, r in enumerate(ref, 1):
        current = [i]
        for j, h in enumerate(hyp, 1):
            current.append(min(previous[j] + 1, current[j - 1] + 1, previous[j - 1] + (r != h)))
        previous = current
    return previous[-1] / max(1, len(ref))


def load16k(path: Path) -> torch.Tensor:
    data, rate = sf.read(path, dtype="float32", always_2d=True)
    wav = torch.from_numpy(data.mean(axis=1))
    return torchaudio.functional.resample(wav, rate, 16000) if rate != 16000 else wav


def score_clips():
    cache = json.loads(CACHE.read_text(encoding="utf-8")) if CACHE.exists() else {}
    clips = sorted(OUT.glob("*/*/*.wav"))
    missing = [p for p in clips if cache.get(str(p), {}).get("mtime") != p.stat().st_mtime]
    if missing:
        from faster_whisper import WhisperModel
        from speechbrain.inference.speaker import EncoderClassifier
        from speechbrain.utils.fetching import LocalStrategy

        whisper = WhisperModel("large-v3-turbo", device=device, compute_type="float16" if device == "cuda" else "int8")
        ecapa = EncoderClassifier.from_hparams(source="speechbrain/spkrec-ecapa-voxceleb", savedir=str(LAB / "models" / "ecapa"), run_opts={"device": device}, local_strategy=LocalStrategy.COPY)
        for path in missing:
            engine, lang, name = path.parts[-3], path.parts[-2], path.stem
            voice, index = name.rsplit("_", 1)
            wav = load16k(path)
            segments, _ = whisper.transcribe(wav.numpy(), language=lang, beam_size=5, vad_filter=False)
            heard = " ".join(segment.text for segment in segments).strip()
            with torch.no_grad():
                embedding = ecapa.encode_batch(wav.unsqueeze(0).to(device)).squeeze().cpu().numpy()
            pitch = torchaudio.functional.detect_pitch_frequency(wav.unsqueeze(0), 16000).squeeze()
            voiced = pitch[(pitch > 60) & (pitch < 500)]
            text = SENTENCES[lang][int(index)]
            cache[str(path)] = {
                "mtime": path.stat().st_mtime, "engine": engine, "lang": lang, "voice": voice, "index": int(index),
                "text": text, "heard": heard, "cer": cer(text, heard), "seconds": len(wav) / 16000,
                "f0": float(voiced.median()) if len(voiced) else 0.0, "embedding": embedding.tolist(),
            }
            print(f"{engine:10} {lang} {voice:10} {index} cer={cache[str(path)]['cer']:.2f} {heard}", flush=True)
            CACHE.write_text(json.dumps(cache), encoding="utf-8")
    return [entry | {"path": path} for path, entry in cache.items() if Path(path).exists()]


def summarize(entries):
    groups = {}
    for entry in entries:
        groups.setdefault((entry["engine"], entry["lang"]), {}).setdefault(entry["voice"], []).append(entry)
    report = {}
    for (engine, lang), voices in sorted(groups.items()):
        summary = {}
        for voice, clips in voices.items():
            mean = np.mean([c["embedding"] for c in clips], axis=0)
            summary[voice] = {
                "cer": float(np.mean([c["cer"] for c in clips])), "worst": float(max(c["cer"] for c in clips)),
                "f0": float(np.median([c["f0"] for c in clips])), "embedding": mean / np.linalg.norm(mean),
                "clips": sorted(clips, key=lambda c: c["index"]),
            }
        similarity = lambda a, b: float(summary[a]["embedding"] @ summary[b]["embedding"])
        cast = []
        for voice in sorted(summary, key=lambda v: summary[v]["cer"]):
            if summary[voice]["cer"] <= MAX_CER and all(similarity(voice, other) < SAME_SPEAKER for other in cast):
                cast.append(voice)
        report.setdefault(lang, {})[engine] = {
            "voices": {v: {k: s[k] for k in ("cer", "worst", "f0")} for v, s in summary.items()},
            "distinct_cast": cast,
            "cast_cer": float(np.mean([summary[v]["cer"] for v in cast])) if cast else None,
            "similarity": {a: {b: round(similarity(a, b), 2) for b in summary} for a in summary},
            "_clips": {v: s["clips"] for v, s in summary.items()},
        }
    for lang, engines in report.items():
        ranked = sorted(engines, key=lambda e: (-len(engines[e]["distinct_cast"]), engines[e]["cast_cer"] if engines[e]["cast_cer"] is not None else 9))
        engines["_ranking"] = ranked
    return report


def write_html(report):
    rows = ["<!doctype html><meta charset=utf-8><title>TTS lab</title><style>body{font:14px system-ui;margin:2rem}table{border-collapse:collapse;margin:.5rem 0 2rem}td,th{border:1px solid #ccc;padding:.25rem .5rem;vertical-align:top}.bad{color:#b00}.win{background:#e7f6e7}audio{height:28px;width:220px}</style>"]
    rows.append(f"<h1>TTS lab</h1><p>Intelligible = mean CER ≤ {MAX_CER:.0%}. Distinct = ECAPA cosine &lt; {SAME_SPEAKER} to every other cast voice.</p>")
    for lang in sorted(report):
        engines = report[lang]
        ranking = engines["_ranking"]
        rows.append(f"<h2>{lang} — best: {html.escape(ranking[0])}</h2><table><tr><th>engine</th><th>distinct intelligible voices</th><th>cast CER</th></tr>")
        for engine in ranking:
            e = engines[engine]
            rows.append(f"<tr class={'win' if engine == ranking[0] else ''}><td>{engine}</td><td>{len(e['distinct_cast'])}: {', '.join(e['distinct_cast'])}</td><td>{'' if e['cast_cer'] is None else f'{e['cast_cer']:.1%}'}</td></tr>")
        rows.append("</table>")
        for engine in ranking:
            e = engines[engine]
            rows.append(f"<h3>{lang} · {engine}</h3><table><tr><th>voice</th><th>CER</th><th>f0</th><th>most similar</th><th>clips (heard)</th></tr>")
            for voice, stats in sorted(e["voices"].items(), key=lambda item: item[1]["cer"]):
                others = sorted(((s, o) for o, s in e["similarity"][voice].items() if o != voice), reverse=True)
                near = f"{others[0][1]} {others[0][0]:.2f}" if others else ""
                cells = "".join(f"<div><audio controls preload=none src='{Path(os.path.relpath(c['path'], LAB)).as_posix()}'></audio> <small class={'bad' if c['cer'] > MAX_CER else ''}>{html.escape(c['heard'])}</small></div>" for c in e["_clips"][voice])
                cls = "bad" if stats["cer"] > MAX_CER else ("win" if voice in e["distinct_cast"] else "")
                rows.append(f"<tr class={cls}><td>{voice}</td><td>{stats['cer']:.1%}</td><td>{stats['f0']:.0f} Hz</td><td>{near}</td><td>{cells}</td></tr>")
            rows.append("</table>")
    (LAB / "report.html").write_text("\n".join(rows), encoding="utf-8")


if __name__ == "__main__":
    report = summarize(score_clips())
    write_html(report)
    plain = {lang: {e: ({k: v for k, v in d.items() if k != "_clips"} if isinstance(d, dict) else d) for e, d in engines.items()} for lang, engines in report.items()}
    (LAB / "report.json").write_text(json.dumps(plain, indent=1, ensure_ascii=False), encoding="utf-8")
    for lang, engines in sorted(report.items()):
        print(lang, " > ".join(f"{e}({len(engines[e]['distinct_cast'])}, {engines[e]['cast_cer'] or 0:.1%})" for e in engines["_ranking"]))
