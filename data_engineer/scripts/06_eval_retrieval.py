"""Evaluasi retrieval terhadap test set Q&A (data/eval/testset_qa.json).

  python scripts/06_eval_retrieval.py --validate        # cek grounding test set (tanpa model/DB)
  python scripts/06_eval_retrieval.py                   # ukur retrieval (backend auto; SEARCH_BACKEND=local|firestore)
  python scripts/06_eval_retrieval.py --threshold 0.5 --top-k 5
Metrik: Hit@1/3/5, MRR (pertanyaan yang bisa dijawab); penolakan di luar cakupan berdasar skor kosinus terbaik;
sapuan ambang; pelanggaran 'tidak_boleh_dikutip'. Hasil disimpan di data/eval/hasil_retrieval.json."""
import argparse, json, re, sys, time
from pathlib import Path
sys.path.insert(0, str(Path(__file__).parent))
ROOT = Path(__file__).resolve().parent.parent
TEST = json.loads((ROOT / "data/eval/testset_qa.json").read_text())["items"]

def norm(t): return re.sub(r"\s+", " ", re.sub(r"-\s*\n\s*", "", t)).lower()

def match(r, ref):  # r: hasil search; ref: {'sumber','pasal'}; pasal kosong = semua bagian dokumen itu
    return r["sumber"] == ref["sumber"] and (not ref.get("pasal") or r["pasal"] == ref["pasal"])

def validate():
    rows = [json.loads(l) for l in open(ROOT / "data/chunks/chunks.jsonl")]
    bad = 0
    for it in TEST:
        text = ""
        for ref in it["rujukan"]:
            hit = [r for r in rows if r["doc"] == ref["sumber"] and (not ref.get("pasal") or r["pasal"] == ref["pasal"])
                   and r["section"] in ("batang_tubuh", "panduan")]
            if not hit: print(f"[{it['id']}] rujukan tidak ada di korpus: {ref}"); bad += 1
            text += " " + norm(" ".join(r["text"] for r in hit))
        for k in it.get("bukti_kunci", []):
            if norm(k) not in text: print(f"[{it['id']}] bukti_kunci tidak ditemukan: {k!r}"); bad += 1
    print(f"validasi: {len(TEST)} item, {bad} masalah"); return bad

def evaluate(top_k, threshold):
    from search import search
    ans = [i for i in TEST if not i.get("harus_menolak")]; oos = [i for i in TEST if i.get("harus_menolak")]
    res, misses = {}, []
    for it in TEST:
        res[it["id"]] = search(it["pertanyaan"], top_k=top_k)
    def rank(it):
        rs = res[it["id"]]
        if it.get("harus_semua"):
            ranks = [next((n for n, r in enumerate(rs, 1) if match(r, ref)), None) for ref in it["rujukan"]]
            return max(ranks) if None not in ranks else None
        return next((n for n, r in enumerate(rs, 1) if any(match(r, ref) for ref in it["rujukan"])), None)
    stats = {}
    for cat in sorted({i["kategori"] for i in ans}):
        g = [i for i in ans if i["kategori"] == cat]; rk = [rank(i) for i in g]
        stats[cat] = {"n": len(g), **{f"hit@{k}": sum(1 for r in rk if r and r <= k) / len(g) for k in (1, 3, 5)},
                      "mrr": sum(1 / r for r in rk if r) / len(g)}
        for i, r in zip(g, rk):
            if not r or r > 3: misses.append((i["id"], i["pertanyaan"], r, [(x["sumber"], x["pasal"][:25], x["score"]) for x in res[i["id"]][:3]]))
    rk = [rank(i) for i in ans]
    total = {"n": len(ans), **{f"hit@{k}": sum(1 for r in rk if r and r <= k) / len(ans) for k in (1, 3, 5)},
             "mrr": sum(1 / r for r in rk if r) / len(ans)}
    best = lambda it: max((r["score"] for r in res[it["id"]]), default=0.0)
    sweep = [{"ambang": t, "salah_tolak": sum(best(i) < t for i in ans) / len(ans),
              "salah_terima": sum(best(i) >= t for i in oos) / len(oos)} for t in (0.35, 0.4, 0.45, 0.5, 0.55, 0.6, 0.65)]
    viol = [(i["id"], x["sumber"]) for i in ans for x in res[i["id"]] if x["sumber"] in i.get("tidak_boleh_dikutip", [])]
    print(f"\n== Retrieval (top_k={top_k}, backend={__import__('os').getenv('SEARCH_BACKEND') or 'auto'}) ==")
    print(f"{'kategori':<10}{'n':>3}{'Hit@1':>8}{'Hit@3':>8}{'Hit@5':>8}{'MRR':>8}")
    for c, s in {**stats, 'TOTAL': total}.items():
        print(f"{c:<10}{s['n']:>3}{s['hit@1']:>8.2f}{s['hit@3']:>8.2f}{s['hit@5']:>8.2f}{s['mrr']:>8.2f}")
    print(f"\n== Ambang tolak (skor kosinus terbaik) ==\n{'ambang':>7}{'salah tolak':>13}{'salah terima':>14}   (salah tolak: pertanyaan valid ditolak; salah terima: di luar cakupan lolos)")
    for s in sweep: print(f"{s['ambang']:>7.2f}{s['salah_tolak']:>13.2f}{s['salah_terima']:>14.2f}")
    print(f"\nskor terbaik di luar cakupan: " + ", ".join(f"{i['id']}={best(i):.2f}" for i in oos))
    print(f"kutipan terlarang (aturan dicabut): {viol or 'tidak ada'}")
    if misses:
        print("\n== Meleset dari top-3 ==")
        for m in misses: print(f"- [{m[0]}] {m[1]}  (peringkat rujukan: {m[2]})\n    top-3: {m[3]}")
    out = {"waktu": time.strftime("%Y-%m-%d %H:%M"), "top_k": top_k, "ambang": threshold, "kategori": stats, "total": total,
           "sapuan_ambang": sweep, "kutipan_terlarang": viol,
           "meleset": [{"id": m[0], "pertanyaan": m[1], "peringkat": m[2], "top3": m[3]} for m in misses]}
    (ROOT / "data/eval/hasil_retrieval.json").write_text(json.dumps(out, ensure_ascii=False, indent=1))

if __name__ == "__main__":
    ap = argparse.ArgumentParser(); ap.add_argument("--validate", action="store_true")
    ap.add_argument("--top-k", type=int, default=5); ap.add_argument("--threshold", type=float, default=0.5)
    a = ap.parse_args()
    if a.validate: sys.exit(1 if validate() else 0)
    if validate(): print("Perbaiki test set dulu."); sys.exit(1)
    evaluate(a.top_k, a.threshold)
