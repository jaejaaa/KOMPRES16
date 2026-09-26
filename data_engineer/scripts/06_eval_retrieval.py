"""Evaluasi retrieval terhadap test set Q&A (data/eval/testset_qa.json).

  python scripts/06_eval_retrieval.py --validate          # cek grounding test set (tanpa model/API)
  python scripts/06_eval_retrieval.py                     # ukur retrieval (penyedia dari EMBED_PROVIDER, default gemini)
  python scripts/06_eval_retrieval.py --provider bge-m3 --top-k 5
  python scripts/06_eval_retrieval.py --set heldout      # set penguji terpisah: jalankan HANYA untuk angka final, jangan dipakai menyetel
Metrik: Hit@1/3/5, MRR, Precision@k dan Recall@k (pertanyaan yang bisa dijawab); sapuan ambang tolak (kosinus terbaik); pelanggaran 'tidak_boleh_dikutip'.
Hasil disimpan di data/eval/hasil_retrieval_<penyedia>.json."""
import argparse, json, re, sys, time
from pathlib import Path
sys.path.insert(0, str(Path(__file__).parent))
ROOT = Path(__file__).resolve().parent.parent
SETS = {"dev": "testset_qa.json", "heldout": "testset_heldout.json"}  # dev = dipakai tuning; heldout = hanya untuk angka final
TEST = json.loads((ROOT / "data/eval/testset_qa.json").read_text())["items"]

def use_set(name):
    global TEST
    TEST = json.loads((ROOT / "data/eval" / SETS[name]).read_text())["items"]
THRESHOLDS = (0.35, 0.4, 0.45, 0.5, 0.55, 0.6, 0.65, 0.7, 0.75)

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

def evaluate(top_k=5, provider=None, verbose=True, set_name="dev"):
    use_set(set_name)
    from search import search
    from embed_util import provider_name
    p = provider_name(provider)
    ans = [i for i in TEST if not i.get("harus_menolak")]; oos = [i for i in TEST if i.get("harus_menolak")]
    search("pemanasan", top_k=1, provider=p)  # muat model/cache sekali, supaya waktu kueri tidak ikut memuat
    res, ms = {}, []
    for it in TEST:
        t0 = time.time(); res[it["id"]] = search(it["pertanyaan"], top_k=top_k, provider=p); ms.append((time.time() - t0) * 1000)
    def rank(it):
        rs = res[it["id"]]
        if it.get("harus_semua"):
            ranks = [next((n for n, r in enumerate(rs, 1) if match(r, ref)), None) for ref in it["rujukan"]]
            return max(ranks) if None not in ranks else None
        return next((n for n, r in enumerate(rs, 1) if any(match(r, ref) for ref in it["rujukan"])), None)
    ranks = {i["id"]: rank(i) for i in ans}
    def prec_rec(it, k):
        """precision@k = porsi hasil top-k yang cocok dengan rujukan; recall@k = porsi rujukan yang ditemukan
        (harus_semua: tiap rujukan; selain itu satu rujukan cukup -> 1 bila ada yang ketemu)."""
        rs = res[it["id"]][:k]
        rel = sum(1 for r in rs if any(match(r, ref) for ref in it["rujukan"]))
        found = [any(match(r, ref) for r in rs) for ref in it["rujukan"]]
        rec = (sum(found) / len(found)) if it.get("harus_semua") else float(any(found))
        return rel / max(len(rs), 1), rec
    def agg(items):
        rk = [ranks[i["id"]] for i in items]
        out = {"n": len(items), **{f"hit@{k}": sum(1 for r in rk if r and r <= k) / len(items) for k in (1, 3, 5)},
               "mrr": sum(1 / r for r in rk if r) / len(items)}
        for k in (1, 3, 5):
            pr = [prec_rec(i, k) for i in items]
            out[f"precision@{k}"] = sum(p for p, _ in pr) / len(items); out[f"recall@{k}"] = sum(r for _, r in pr) / len(items)
        return out
    stats = {c: agg([i for i in ans if i["kategori"] == c]) for c in sorted({i["kategori"] for i in ans})}
    total = agg(ans)
    best = {i["id"]: max((r["score"] for r in res[i["id"]]), default=0.0) for i in TEST}
    sweep = [{"ambang": t, "salah_tolak": sum(best[i["id"]] < t for i in ans) / len(ans),
              "salah_terima": sum(best[i["id"]] >= t for i in oos) / len(oos)} for t in THRESHOLDS]
    viol = [(i["id"], x["sumber"]) for i in ans for x in res[i["id"]] if x["sumber"] in i.get("tidak_boleh_dikutip", [])]
    top3 = {i["id"]: [(x["sumber"], x["pasal"][:25], x["score"]) for x in res[i["id"]][:3]] for i in TEST}
    out = {"waktu": time.strftime("%Y-%m-%d %H:%M"), "set": set_name, "provider": p, "top_k": top_k, "kategori": stats, "total": total,
           "sapuan_ambang": sweep, "kutipan_terlarang": viol, "rata2_ms_per_kueri": sum(ms) / len(ms),
           "peringkat": ranks, "skor_terbaik": best, "top3": top3,
           "meleset": [{"id": i["id"], "pertanyaan": i["pertanyaan"], "peringkat": ranks[i["id"]], "top3": top3[i["id"]]}
                       for i in ans if not ranks[i["id"]] or ranks[i["id"]] > 3]}
    (ROOT / f"data/eval/hasil_retrieval_{p.replace(':', '_')}{'' if set_name == 'dev' else '_' + set_name}.json").write_text(json.dumps(out, ensure_ascii=False, indent=1))
    if verbose:
        print(f"\n== Retrieval [{p}] top_k={top_k}, rata-rata {out['rata2_ms_per_kueri']:.0f} ms/kueri ==")
        print(f"{'kategori':<10}{'n':>3}{'Hit@1':>8}{'Hit@3':>8}{'Hit@5':>8}{'MRR':>8}{'P@5':>8}{'R@5':>8}")
        for c, s in {**stats, 'TOTAL': total}.items():
            print(f"{c:<10}{s['n']:>3}{s['hit@1']:>8.2f}{s['hit@3']:>8.2f}{s['hit@5']:>8.2f}{s['mrr']:>8.2f}{s['precision@5']:>8.2f}{s['recall@5']:>8.2f}")
        print(f"\n== Ambang tolak (skor kosinus terbaik) ==\n{'ambang':>7}{'salah tolak':>13}{'salah terima':>14}")
        for s in sweep: print(f"{s['ambang']:>7.2f}{s['salah_tolak']:>13.2f}{s['salah_terima']:>14.2f}")
        print("skor terbaik di luar cakupan: " + ", ".join(f"{i['id']}={best[i['id']]:.2f}" for i in oos))
        print(f"kutipan terlarang (aturan dicabut): {viol or 'tidak ada'}")
        for m in out["meleset"]: print(f"- meleset [{m['id']}] {m['pertanyaan']} (peringkat: {m['peringkat']}) top-3: {m['top3']}")
    return out

if __name__ == "__main__":
    ap = argparse.ArgumentParser(); ap.add_argument("--validate", action="store_true")
    ap.add_argument("--top-k", type=int, default=5); ap.add_argument("--provider"); ap.add_argument("--set", choices=list(SETS), default="dev")
    a = ap.parse_args()
    use_set(a.set)
    if a.validate: sys.exit(1 if validate() else 0)
    if validate(): print("Perbaiki test set dulu."); sys.exit(1)
    evaluate(a.top_k, a.provider, set_name=a.set)
