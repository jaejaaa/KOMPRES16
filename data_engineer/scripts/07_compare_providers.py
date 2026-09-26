"""Bandingkan dua penyedia embedding pada test set yang sama -> data/eval/PERBANDINGAN_EMBEDDING.md

  python scripts/07_compare_providers.py                 # jalankan evaluasi kedua penyedia (Gemini butuh GEMINI_API_KEY)
  python scripts/07_compare_providers.py --reuse         # pakai hasil_retrieval_<penyedia>.json yang sudah ada
  python scripts/07_compare_providers.py --selftest      # uji format laporan (bge-m3 dibandingkan dengan dirinya sendiri)
Semua angka di laporan diambil dari hasil evaluasi, bukan diketik tangan."""
import argparse, importlib, json, sys, time
from pathlib import Path
sys.path.insert(0, str(Path(__file__).parent))
ROOT = Path(__file__).resolve().parent.parent
EV = importlib.import_module("06_eval_retrieval")
A, B = "bge-m3", "gemini"   # A = pembanding (sekarang), B = kandidat pengganti (bisa diganti lewat --candidate)

def load(p, reuse):
    f = ROOT / f"data/eval/hasil_retrieval_{p.replace(':', '_')}.json"
    if reuse and f.exists(): return json.loads(f.read_text())
    return EV.evaluate(5, p, verbose=False)

def pct(x): return f"{int(x * 100 + 0.5)}%"  # bulatkan setengah ke atas, konsisten dengan tabel 2 desimal
def d(a, b, pts=False):
    v = (b - a) * (100 if pts else 1)
    return f"{v:+.0f} poin" if pts else f"{v:+.2f}"

def ambang_rekomendasi(sweep, maks_salah_tolak=0.05):
    ok = [s for s in sweep if s["salah_tolak"] <= maks_salah_tolak]
    if not ok: return None
    return min(ok, key=lambda s: (s["salah_terima"], s["ambang"]))

def info_file(p):
    from embed_util import cache_paths
    npy, meta = cache_paths(p)
    m = json.loads(meta.read_text()) if meta.exists() else {}
    return {"dim": m.get("dim", "?"), "model": m.get("model", "?"), "mb": npy.stat().st_size / 1e6 if npy.exists() else 0}

def build(ra, rb):
    ia, ib = info_file(A), info_file(B)
    ta, tb = ra["total"], rb["total"]
    L = []
    w = L.append
    w(f"# Perbandingan embedding: {A} vs {B}\n")
    w(f"Dibuat otomatis oleh `scripts/07_compare_providers.py` pada {time.strftime('%Y-%m-%d %H:%M')}. Test set yang sama untuk keduanya: "
      f"`data/eval/testset_qa.json` ({ta['n']} pertanyaan yang bisa dijawab + pertanyaan di luar cakupan), top-5.\n")

    # --- kesimpulan otomatis berdasarkan angka
    selisih5 = tb["hit@5"] - ta["hit@5"]; selisih1 = tb["hit@1"] - ta["hit@1"]
    if selisih5 >= -0.03 and selisih1 >= -0.05: verdict = f"**{B} sepadan atau lebih baik** dari {A} pada test set ini, jadi pindah ke {B} masuk akal."
    elif selisih5 >= -0.08: verdict = f"**{B} sedikit di bawah {A}**. Pindah masih mungkin bila kemudahan deploy lebih penting, tapi ada penurunan akurasi yang perlu diterima tim."
    else: verdict = f"**{B} jelas di bawah {A}** pada test set ini. Pertimbangkan tetap {A} atau menyetel ulang ({B} dengan dimensi lebih besar)."
    w("## Kesimpulan\n")
    w(verdict + "\n")
    w(f"- Pasal yang benar ada di 5 teratas: **{A} {pct(ta['hit@5'])}** vs **{B} {pct(tb['hit@5'])}** ({d(ta['hit@5'], tb['hit@5'], True)}).")
    w(f"- Pasal yang benar di peringkat 1: {A} {pct(ta['hit@1'])} vs {B} {pct(tb['hit@1'])} ({d(ta['hit@1'], tb['hit@1'], True)}).")
    n_a = ta["n"]; sel = round((tb["hit@1"] - ta["hit@1"]) * n_a)
    w(f"- Skala perbedaan: hanya {n_a} pertanyaan, jadi selisih Hit@1 di atas setara **{sel:+d} pertanyaan**; anggap sebagai **indikasi, bukan bukti kuat**.")
    w(f"- Catatan: test set ini juga dipakai untuk menyetel parameter, jadi angka bersifat **optimistis**. Angka final proposal harus dari set penguji terpisah.\n")

    w("## 1. Akurasi (semakin tinggi semakin baik)\n")
    w(f"| Ukuran | {A} | {B} | Selisih |\n|---|---|---|---|")
    for k, nm in (("hit@1", "Hit@1 (benar di peringkat 1)"), ("hit@3", "Hit@3"), ("hit@5", "Hit@5"), ("mrr", "MRR (rata-rata 1/peringkat)"),
                  ("recall@5", "Recall@5 (porsi Pasal rujukan yang ditemukan)"), ("precision@5", "Precision@5 (porsi hasil top-5 yang relevan)")):
        if k in ta and k in tb: w(f"| {nm} | {ta[k]:.2f} | {tb[k]:.2f} | {d(ta[k], tb[k])} |")
    w("\n*Catatan Precision@5:* tiap pertanyaan hanya punya 1–2 Pasal rujukan, jadi presisi di top-5 secara matematis tidak bisa melebihi sekitar 0,2–0,4 "
      "(1–2 hasil relevan dari 5). Angka ini dipakai untuk **membandingkan model**, bukan sebagai skor mutlak; ukuran utama yang bermakna untuk RAG adalah Recall@5 dan Hit@k.")
    w(f"\nPer kategori pertanyaan (Hit@5):\n\n| Kategori | jumlah | {A} | {B} |\n|---|---|---|---|")
    for c in ra["kategori"]:
        w(f"| {c} | {ra['kategori'][c]['n']} | {ra['kategori'][c]['hit@5']:.2f} | {rb['kategori'].get(c, {}).get('hit@5', float('nan')):.2f} |")

    w("\n## 2. Pertanyaan yang berubah\n")
    naik, turun = [], []
    tq = {i["id"]: i["pertanyaan"] for i in EV.TEST}
    for qid, ka in ra["peringkat"].items():
        kb = rb["peringkat"].get(qid)
        sa, sb = (ka or 99), (kb or 99)
        if sb < sa: naik.append((qid, ka, kb))
        elif sb > sa: turun.append((qid, ka, kb))
    fmt = lambda r: f"peringkat {r}" if r else "tidak ada di top-5"
    w(f"Membaik di {B}: **{len(naik)}** pertanyaan. Memburuk: **{len(turun)}**.\n")
    for title, lst in ((f"Membaik di {B}", naik), (f"Memburuk di {B}", turun)):
        if lst:
            w(f"**{title}**\n")
            for qid, ka, kb in lst: w(f"- [{qid}] {tq[qid]}  ({A}: {fmt(ka)} → {B}: {fmt(kb)})")
            w("")

    w("## 3. Ambang \"di luar cakupan\" (WAJIB disetel ulang bila ganti model)\n")
    w("Skor kosinus tiap model punya skala berbeda, jadi ambang lama tidak boleh dipakai apa adanya. "
      "\"Salah tolak\" = pertanyaan valid ikut ditolak; \"salah terima\" = pertanyaan di luar cakupan lolos.\n")
    w(f"| Ambang | {A}: salah tolak | {A}: salah terima | {B}: salah tolak | {B}: salah terima |\n|---|---|---|---|---|")
    sa = {round(s['ambang'], 2): s for s in ra["sapuan_ambang"]}; sb = {round(s['ambang'], 2): s for s in rb["sapuan_ambang"]}
    for t in sorted(set(sa) | set(sb)):
        x, y = sa.get(t), sb.get(t)
        w(f"| {t:.2f} | {pct(x['salah_tolak']) if x else '-'} | {pct(x['salah_terima']) if x else '-'} | {pct(y['salah_tolak']) if y else '-'} | {pct(y['salah_terima']) if y else '-'} |")
    ra_, rb_ = ambang_rekomendasi(ra["sapuan_ambang"]), ambang_rekomendasi(rb["sapuan_ambang"])
    w("")
    if ra_: w(f"- Ambang saran {A}: **{ra_['ambang']:.2f}** (salah tolak {pct(ra_['salah_tolak'])}, salah terima {pct(ra_['salah_terima'])}).")
    if rb_: w(f"- Ambang saran {B}: **{rb_['ambang']:.2f}** (salah tolak {pct(rb_['salah_tolak'])}, salah terima {pct(rb_['salah_terima'])}).")
    if ra_ and rb_ and rb_["salah_terima"] > ra_["salah_terima"]:
        w(f"- **Perhatian:** pada ambang sarannya, {B} meloloskan lebih banyak pertanyaan di luar cakupan ({pct(rb_['salah_terima'])} vs {pct(ra_['salah_terima'])} untuk {A}): "
          f"skor kosinusnya cenderung tinggi untuk semua teks (skor terbaik pertanyaan di luar cakupan: " + ", ".join(f"{k}={v:.2f}" for k, v in rb["skor_terbaik"].items() if k.startswith("O")) + "). "
          "Akibatnya gerbang skor kurang tajam; **andalkan juga aturan prompt \"jawab hanya dari konteks\"** dan jangan menganggap skor tinggi = relevan.")
    w("- Aturan pemilihan: ambang terendah yang menjaga salah tolak ≤ 5% dengan salah terima terkecil. Sampel kecil (5 pertanyaan di luar cakupan), jadi anggap sebagai titik awal.")
    w("- Pertanyaan yang dekat topik tapi tidak tercakup (mis. tarif PPh penjualan tanah) tidak bisa dipisahkan oleh skor; itu tetap ditangani aturan prompt \"jawab hanya dari konteks\".\n")

    w("## 4. Hal praktis\n")
    w(f"| | {A} | {B} |\n|---|---|---|")
    w(f"| Model | {ia['model']} | {ib['model']} |")
    w(f"| Dijalankan di | komputer/server kita | server Google (API) |")
    w(f"| Dimensi vektor | {ia['dim']} | {ib['dim']} |")
    w(f"| Ukuran file vektor | {ia['mb']:.1f} MB | {ib['mb']:.1f} MB |")
    w(f"| Rata-rata waktu per kueri (termasuk embed pertanyaan) | {ra['rata2_ms_per_kueri']:.0f} ms | {rb['rata2_ms_per_kueri']:.0f} ms |")
    w(f"| Butuh di server | PyTorch + model ±2,3 GB, RAM besar | hanya internet + GEMINI_API_KEY |")
    w(f"| Data pertanyaan pengguna | tetap di server kita | dikirim ke Google |")
    w("\nWaktu kueri Gemini tergantung jaringan, dan tier gratis memiliki batas kecepatan; cek kuota terbaru di dokumentasi Google sebelum produksi.\n")

    w("## 5. Apa yang berubah untuk tiap orang\n")
    w(f"- **Data Engineer:** embedding dibangun dengan `{B}` (`EMBED_PROVIDER={B}`); file vektor menjadi `embeddings_{B.replace(':', '_')}.npy` (+ `.meta.json`). Bila teks chunk berubah, vektor dibangun ulang otomatis.")
    w(f"- **AI Engineer:** `search()` dan `Retriever` **tidak berubah antarmukanya**. Yang berubah: skala `score`, jadi `MIN_RETRIEVAL_SCORE` harus diganti ke ambang saran {B} di atas. Tes ulang gerbang \"di luar cakupan\".")
    w(f"- **Backend:** tidak perlu PyTorch/`sentence-transformers` bila memakai {B}; cukup `google-genai` (sudah ada di requirements) dan `GEMINI_API_KEY` sebagai variabel lingkungan/secret. Pastikan `data_engineer/scripts` dan `data_engineer/data/chunks/` (chunks.jsonl + file vektor) ikut ke deployment.")
    w(f"- **Semua:** setiap pertanyaan pengguna sekarang membuat 1 panggilan API embedding; perhatikan kuota (bagi key: satu key per orang/peran, jangan dipakai bersama).\n")

    w("## 6. Langkah selanjutnya\n")
    w("1. Tim membaca laporan ini dan mengonfirmasi model embedding final.")
    w("2. Data Engineer: commit file vektor final (setelah baris whitelist `*.npy` di `.gitignore` dibuka) atau sepakati cara lain berbagi vektor.")
    w("3. AI Engineer: set `MIN_RETRIEVAL_SCORE` ke ambang baru, sambungkan `Retriever` ke `jawab_chat(retriever=...)`, uji dengan Gemini asli.")
    w("4. Backend: sesuaikan Dockerfile/requirements, uji `/chat` end-to-end.")
    w("5. Setelah tahap ini sinkron: Data Engineer melanjutkan set penguji terpisah, dokumen sintetis (menunggu taksonomi risiko), dan bagian dataset & metode proposal.")
    return "\n".join(L) + "\n"

if __name__ == "__main__":
    ap = argparse.ArgumentParser(); ap.add_argument("--reuse", action="store_true"); ap.add_argument("--selftest", action="store_true")
    ap.add_argument("--candidate", default="gemini", help="penyedia kandidat, mis. gemini:gemini-embedding-2")
    a = ap.parse_args(); B = a.candidate
    if a.selftest:
        r = load(A, True); B = A
        out = build(r, r); (ROOT / "data/eval/_selftest_perbandingan.md").write_text(out); print(out[:1800]); sys.exit(0)
    ra, rb = load(A, a.reuse), load(B, a.reuse)
    (ROOT / "data/eval/PERBANDINGAN_EMBEDDING.md").write_text(build(ra, rb))
    print("ditulis: data/eval/PERBANDINGAN_EMBEDDING.md")
