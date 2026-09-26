"""Langkah 1: ekstrak teks PDF regulasi -> data/extracted/<slug>.json + .txt (per halaman)."""
import fitz, json, re, subprocess, sys, tempfile
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path
for _s in (sys.stdout, sys.stderr): getattr(_s, "reconfigure", lambda **k: None)(encoding="utf-8", errors="replace")  # konsol Windows (cp1252) tidak crash

RAW, OUT = Path("data/raw"), Path("data/extracted")
DOCS = {  # file -> (slug, nama_pendek, judul)
    "UU No. 5 Tahun 1960.pdf": ("uupa-1960", "UU 5/1960", "Peraturan Dasar Pokok-Pokok Agraria (UUPA)"),
    "pp24-1997.pdf": ("pp-24-1997", "PP 24/1997", "Pendaftaran Tanah"),
    "PP Nomor 18 Tahun 2021.pdf": ("pp-18-2021", "PP 18/2021", "Hak Pengelolaan, Hak Atas Tanah, Satuan Rumah Susun, dan Pendaftaran Tanah"),
    "UU Nomor 21 Tahun 1997_.pdf": ("uu-21-1997", "UU 21/1997", "Bea Perolehan Hak atas Tanah dan Bangunan (BPHTB)"),
    "Permen ATRKBPN Nomor 3 Tahun 2023.pdf": ("permen-3-2023", "Permen ATR/BPN 3/2023", "Penerbitan Dokumen Elektronik dalam Kegiatan Pendaftaran Tanah"),
    "Kitab-Undang-undang-Hukum-Perdata.pdf": ("kuhperdata-buku2", "KUHPerdata Buku II", "Tentang Kebendaan"),
    "UU Nomor 2 Tahun 2012.pdf": ("uu-2-2012", "UU 2/2012", "Pengadaan Tanah bagi Pembangunan untuk Kepentingan Umum"),
    "UU Nomor 28 Tahun 2009.pdf": ("uu-28-2009", "UU 28/2009", "Pajak Daerah dan Retribusi Daerah (PDRD)"),
    "UU Nomor 27 Tahun 2022.pdf": ("uu-27-2022", "UU 27/2022", "Pelindungan Data Pribadi"),
}

def clean(t: str) -> str:
    t = t.replace("­", "").replace("\xa0", " ")
    t = re.sub(r"[ \t]+", " ", t)
    return re.sub(r"\n{3,}", "\n\n", t).strip()

PAGE_RANGE = {"kuhperdata-buku2": (90, 189)}  # PDF berisi 4 Buku; hanya Buku Kedua (nomor halaman tetap mengacu ke PDF asli)
SCANNED = {"pp-18-2021", "permen-3-2023", "uu-21-1997", "uu-2-2012", "uu-27-2022", "pp-24-1997"}  # PDF scan: text layer bawaan rusak -> OCR ulang

def ocr_page(args):
    fn, i = args
    pix = fitz.open(RAW / fn)[i].get_pixmap(dpi=300, colorspace=fitz.csGRAY)
    with tempfile.NamedTemporaryFile(suffix=".png") as tmp:
        pix.save(tmp.name)
        r = subprocess.run(["tesseract", tmp.name, "-", "-l", "ind", "--psm", "4"], capture_output=True, text=True)
    return r.stdout

OUT.mkdir(parents=True, exist_ok=True)
for fn, (slug, short, title) in DOCS.items():
    if sys.argv[1:] and slug not in sys.argv[1:]: continue  # opsional: python 01_extract.py <slug> ...
    doc = fitz.open(RAW / fn)
    lo, hi = PAGE_RANGE.get(slug, (1, len(doc)))
    if slug in SCANNED:
        with ThreadPoolExecutor(8) as ex:
            texts = list(ex.map(ocr_page, [(fn, i) for i in range(len(doc))]))
    else:
        texts = [p.get_text(sort=True) for p in doc]
    texts = [re.sub(r"^\s*www\.hukumonline\.com\s*$", "", t, flags=re.M) for t in texts]  # watermark
    pages = [{"page": i + 1, "text": clean(t), "ocr": slug in SCANNED}
             for i, t in enumerate(texts) if lo <= i + 1 <= hi]
    (OUT / f"{slug}.json").write_text(json.dumps(
        {"slug": slug, "short": short, "title": title, "source_file": fn, "pages": pages},
        ensure_ascii=False, indent=1), encoding="utf-8")
    (OUT / f"{slug}.txt").write_text("\n\n".join(f"[[hal {p['page']}]]\n{p['text']}" for p in pages), encoding="utf-8")
    n = sum(len(p["text"]) for p in pages)
    empty = [p["page"] for p in pages if len(p["text"]) < 50]
    print(f"{short:24s} {len(pages):4d} hal {n:8d} char  halaman kosong: {empty}")
