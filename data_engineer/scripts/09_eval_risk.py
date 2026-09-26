"""Evaluasi deteksi risiko (analyze) terhadap dokumen sintetis (data/synthetic/ground_truth.json).

  python scripts/09_eval_risk.py --selftest                          # uji metrik dengan penebak sempurna / kosong / contoh dummy
  python scripts/09_eval_risk.py --predictions prediksi.json         # {"D01": {"risks": [...]}, ...}
  python scripts/09_eval_risk.py --analyzer analisis.modul:analyze --path backend   # panggil analyze(text) untuk tiap PDF

Format risiko yang dibaca (sama dengan kontrak backend): {pasal, kutipan, kategori, level(low|medium|high), alasan}.
Metrik:
  * Deteksi per pasal: precision / recall / F1 (pasal berisiko yang ditandai vs kunci jawaban). Tidak bergantung pada nama kategori.
  * Kecocokan kategori dan level di antara pasal yang benar terdeteksi (kategori dicocokkan lewat nama taksonomi/ID K1..K8;
    bila AI Engineer memakai taksonomi lain, sediakan --mapping peta.json {"nama kategori mereka": "K1"}).
  * Alarm palsu: pasal aman yang ditandai, khusus dokumen bersih (D01, D07) dan keseluruhan."""
import argparse, importlib, json, re, sys
from pathlib import Path
ROOT = Path(__file__).resolve().parent.parent
SYN = ROOT / "data/synthetic"
LEVELS = {"low": 0, "medium": 1, "high": 2}

def norm_pasal(s):
    m = re.search(r"\d+", str(s or ""))
    return f"Pasal {int(m.group())}" if m else None

def norm_txt(s): return re.sub(r"[^a-z0-9 ]", "", str(s or "").lower()).strip()

def kategori_id(pred_kat, taks, mapping):
    """Petakan nama/ID kategori prediksi ke ID taksonomi (K1..K8), atau None bila tidak dikenali."""
    if pred_kat in mapping: return mapping[pred_kat]
    s = norm_txt(pred_kat)
    for t in taks:
        if s == t["id"].lower() or s == norm_txt(t["nama"]): return t["id"]
    for t in taks:  # toleransi: nama taksonomi termuat di teks kategori prediksi
        if norm_txt(t["nama"]) in s: return t["id"]
    return None

def score(preds, mapping=None):
    gt = json.loads((SYN / "ground_truth.json").read_text())["dokumen"]
    taks = json.loads((SYN / "taksonomi_risiko.json").read_text())["kategori"]
    mapping = mapping or {}
    tp = fp = fn = 0; kat_ok = kat_n = lvl_ok = lvl_dekat = lvl_n = 0
    per_doc, per_kat, per_level = [], {t["id"]: [0, 0] for t in taks}, {l: [0, 0] for l in LEVELS}
    fp_bersih = n_bersih_pasal = 0
    for d in gt:
        truth = {r["pasal"]: r for r in d["risks"]}
        pr = {}
        for r in (preds.get(d["id"]) or {}).get("risks", []) or []:
            p = norm_pasal(r.get("pasal"))
            if p and (p not in pr or LEVELS.get(r.get("level"), -1) > LEVELS.get(pr[p].get("level"), -1)): pr[p] = r
        d_tp = [p for p in pr if p in truth]; d_fp = [p for p in pr if p not in truth]; d_fn = [p for p in truth if p not in pr]
        tp += len(d_tp); fp += len(d_fp); fn += len(d_fn)
        for p, t in truth.items():
            per_kat[t["kategori_id"]][1] += 1; per_level[t["level"]][1] += 1
            if p in pr: per_kat[t["kategori_id"]][0] += 1; per_level[t["level"]][0] += 1
        for p in d_tp:
            kat_n += 1; lvl_n += 1
            kat_ok += kategori_id(pr[p].get("kategori"), taks, mapping) == truth[p]["kategori_id"]
            a, b = LEVELS.get(pr[p].get("level"), -9), LEVELS[truth[p]["level"]]
            lvl_ok += a == b; lvl_dekat += abs(a - b) <= 1
        if not d["risks"]: fp_bersih += len(d_fp); n_bersih_pasal += len(d["pasal_total"])
        per_doc.append({"id": d["id"], "benar": len(d_tp), "meleset": len(d_fn), "alarm_palsu": len(d_fp), "jumlah_risiko": len(truth)})
    P = tp / (tp + fp) if tp + fp else 0.0; R = tp / (tp + fn) if tp + fn else 0.0
    return {"deteksi_pasal": {"tp": tp, "fp": fp, "fn": fn, "precision": P, "recall": R, "f1": (2 * P * R / (P + R)) if P + R else 0.0},
            "kecocokan_kategori": kat_ok / kat_n if kat_n else None, "level_tepat": lvl_ok / lvl_n if lvl_n else None,
            "level_selisih_maks_1": lvl_dekat / lvl_n if lvl_n else None,
            "recall_per_kategori": {k: (v[0] / v[1] if v[1] else None) for k, v in per_kat.items()},
            "recall_per_level": {k: (v[0] / v[1] if v[1] else None) for k, v in per_level.items()},
            "alarm_palsu_dokumen_bersih": {"pasal_ditandai": fp_bersih, "dari_pasal": n_bersih_pasal},
            "per_dokumen": per_doc}

def cetak(nama, r):
    d = r["deteksi_pasal"]
    print(f"\n== Deteksi risiko [{nama}] ==")
    print(f"Deteksi pasal berisiko : precision {d['precision']:.2f} | recall {d['recall']:.2f} | F1 {d['f1']:.2f}   (benar {d['tp']}, alarm palsu {d['fp']}, terlewat {d['fn']})")
    f = lambda x: "-" if x is None else f"{x:.2f}"
    print(f"Kategori cocok (dari yang terdeteksi): {f(r['kecocokan_kategori'])} | level tepat: {f(r['level_tepat'])} | level selisih ≤1: {f(r['level_selisih_maks_1'])}")
    print("Recall per kategori    : " + ", ".join(f"{k}={f(v)}" for k, v in r["recall_per_kategori"].items()))
    print("Recall per level       : " + ", ".join(f"{k}={f(v)}" for k, v in r["recall_per_level"].items()))
    b = r["alarm_palsu_dokumen_bersih"]; print(f"Alarm palsu pada dokumen bersih: {b['pasal_ditandai']} dari {b['dari_pasal']} pasal")
    print("Per dokumen            : " + " | ".join(f"{x['id']}: {x['benar']}/{x['jumlah_risiko']} benar, {x['alarm_palsu']} palsu" for x in r["per_dokumen"]))

def ekstrak_teks(pdf: Path) -> str:
    import fitz  # sama seperti backend/main.py: extract_text
    with fitz.open(pdf) as doc: return "\n".join(p.get_text() for p in doc).strip()

def selftest():
    gt = json.loads((SYN / "ground_truth.json").read_text())["dokumen"]
    oracle = {d["id"]: {"risks": [{"pasal": r["pasal"], "kutipan": r["kutipan_kunci"], "kategori": r["kategori"], "level": r["level"], "alasan": ""} for r in d["risks"]]} for d in gt}
    kosong = {d["id"]: {"risks": []} for d in gt}
    dummy = {d["id"]: {"risks": [{"pasal": "Pasal 5", "kutipan": "x", "kategori": "Uang muka (DP) hangus tanpa syarat jelas", "level": "high", "alasan": ""},
                                  {"pasal": "Pasal 2", "kutipan": "x", "kategori": "Ketidakjelasan objek tanah", "level": "low", "alasan": ""}]} for d in gt}  # meniru analyze() dummy backend
    semua = {d["id"]: {"risks": [{"pasal": p, "kutipan": "", "kategori": "?", "level": "high", "alasan": ""} for p in d["pasal_total"]]} for d in gt}
    hasil = {}
    for nama, p, harap in (("penebak sempurna", oracle, "precision=1, recall=1"), ("tanpa prediksi", kosong, "recall=0"),
                           ("analyze() dummy backend", dummy, "recall & precision rendah"), ("menandai semua pasal", semua, "recall=1, precision rendah")):
        r = score(p); cetak(nama + f"  (harapan: {harap})", r); hasil[nama] = r
    d = hasil["penebak sempurna"]["deteksi_pasal"]; assert d["precision"] == d["recall"] == 1.0 and hasil["penebak sempurna"]["kecocokan_kategori"] == 1.0
    assert hasil["tanpa prediksi"]["deteksi_pasal"]["recall"] == 0.0 and hasil["menandai semua pasal"]["deteksi_pasal"]["recall"] == 1.0
    assert hasil["menandai semua pasal"]["deteksi_pasal"]["precision"] < 0.3
    print("\nselftest metrik: LULUS")

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--selftest", action="store_true"); ap.add_argument("--predictions"); ap.add_argument("--analyzer")
    ap.add_argument("--path", default=None, help="folder yang ditambahkan ke sys.path untuk --analyzer"); ap.add_argument("--mapping")
    ap.add_argument("--name")
    a = ap.parse_args()
    if a.selftest: return selftest()
    mapping = json.loads(Path(a.mapping).read_text()) if a.mapping else {}
    if a.predictions:
        preds = json.loads(Path(a.predictions).read_text()); nama = a.name or Path(a.predictions).stem
    elif a.analyzer:
        if a.path: sys.path.insert(0, str(Path(a.path).resolve()))
        mod, fn = a.analyzer.split(":"); analyze = getattr(importlib.import_module(mod), fn)
        gt = json.loads((SYN / "ground_truth.json").read_text())["dokumen"]; preds = {}
        for d in gt:
            try: preds[d["id"]] = analyze(ekstrak_teks(SYN / d["berkas"]))
            except Exception as e: print(f"[{d['id']}] analyze() gagal: {type(e).__name__}: {e}"); preds[d["id"]] = {"risks": []}
        nama = a.name or a.analyzer.replace(":", ".")
        (ROOT / f"data/eval/prediksi_{nama}.json").write_text(json.dumps(preds, ensure_ascii=False, indent=1))
    else:
        ap.error("pilih --selftest, --predictions, atau --analyzer")
    r = score(preds, mapping); cetak(nama, r)
    (ROOT / f"data/eval/hasil_risiko_{nama}.json").write_text(json.dumps(r, ensure_ascii=False, indent=1))

if __name__ == "__main__":
    main()
