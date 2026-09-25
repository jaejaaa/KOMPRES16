"""Langkah 2: potong teks regulasi per Pasal -> data/chunks/chunks.jsonl (+ laporan validasi)."""
import json, re
from pathlib import Path

EXT, OUT = Path("data/extracted"), Path("data/chunks")
PASAL = re.compile(r"^\s*Pasal\s+(\d+\s?[A-Z]?)\s*$")
PASAL_NOISY = re.compile(r"^\s*Pasal\s+([^\sa-z]{1,3})\s*$")  # heading rusak OCR, mis. 'Pasal D', 'Pasal 1!' -> ditebak dari urutan
BAB = re.compile(r"^\s*BAB\s+([IVXLC]+)\s*$")
PENJ = re.compile(r"^\s*(PENJELASAN|Penjelasan)\s*$|^\s*PENJELASAN\s+(ATAS|ATAS\s*$)", re.I)
ROMAN = re.compile(r"^\s*Pasal\s+([IVX]{1,4})\s*$")  # Ketentuan Konversi UUPA: Pasal I–IX
MAX_CHARS = 1800
# Dokumen besar: hanya Pasal yang relevan untuk hukum tanah yang di-chunk (batang tubuh + penjelasan)
# Status berlaku; UU 21/1997 (BPHTB) digantikan UU 28/2009 Pasal 85-93, PP 24/1997 diubah PP 18/2021
STATUS = {"uu-21-1997": "dicabut (digantikan UU 28/2009)", "pp-24-1997": "diubah sebagian (PP 18/2021)"}
BOUNDS = {"kuhperdata-buku2": ("BUKU KEDUA", "BUKU KETIGA")}  # PDF memuat 4 Buku; ambil teks di antara dua penanda
SCOPE = {"uu-28-2009": (85, 93)}  # BPHTB dalam UU PDRD

NOISE_LINE = re.compile(r"^\s*(-?\s*\d{1,3}\s*-?|PRESIDEN|REPUBLIK\s+INDONESIA|PRESIDEN\s+REPUBLIK\s+INDONESIA|SK\s+No\s.*|www\.hukumonline\.com|Diunduh dari .*jdih\.atrbpn\.go\.id.*)\s*$", re.I)
CONTINUED = re.compile(r"^\s*(Pasal\s+\d+|BAB\s+[IVXL]+|\(\d+\)\s*\w*|\w+)?\s*(\.\s?){2,}\s*(-\s*\d+\s*-)?\s*$")  # footer 'Pasal 89 . . .'
PENUTUP = re.compile(r"\n\s*(Ditetapkan|Disahkan)\s+di\b")

def is_noise(line: str) -> bool:
    t = line.strip()
    if not t: return False
    if NOISE_LINE.match(t) or CONTINUED.match(t): return True
    letters = sum(ch.isalpha() for ch in t)
    return len(t) >= 8 and letters / len(t) < 0.45 and not re.search(r"[A-Za-z]{4,}", t) and not re.match(r"^[\(\d]", t)  # baris sampah OCR

def only_cukup_jelas(t: str) -> bool:
    rest = re.sub(r"Cukup jelas\.?|Ayat\s*\(\d+\)|Huruf\s+[a-z]|Angka\s+\d+|Pasal\s+\d+[A-Z]?|[|\s.\-]", "", t, flags=re.I)
    return len(rest) < 5

def split_ayat(body: str):
    """Pasal panjang dipecah di batas ayat '(n)' agar tiap chunk tetap utuh secara makna."""
    parts = re.split(r"\n(?=(?:\(\d+\)|\d+\.|Ayat\s*\(\d+\))\s)", body)
    out, cur = [], ""
    for p in parts:
        if cur and len(cur) + len(p) > MAX_CHARS:
            out.append(cur); cur = p
        else:
            cur = f"{cur}\n{p}" if cur else p
    if cur: out.append(cur)
    return out

def chunk_doc(d):
    lines = []  # (page, line)
    for pg in d["pages"]:
        lines += [(pg["page"], l) for l in pg["text"].split("\n") if not is_noise(l)]
    if d["slug"] in BOUNDS:
        start, end = BOUNDS[d["slug"]]
        i0 = next(i for i, (_, l) in enumerate(lines) if l.strip() == start)
        i1 = next(i for i, (_, l) in enumerate(lines) if i > i0 and l.strip() == end)
        lines = lines[i0:i1]
    section, bab, cur = "batang_tubuh", None, None
    raw = []
    def flush():
        nonlocal cur
        if cur and cur["text"].strip(): raw.append(cur)
        cur = None
    for page, line in lines:
        if PENJ.match(line) and section == "batang_tubuh" and raw:
            flush(); section = "penjelasan"; bab = None; continue
        if m := BAB.match(line):
            flush() if section == "batang_tubuh" else None
            bab = m.group(1)
            if cur: continue
        m, inferred = PASAL.match(line), False
        if not m and d["slug"] == "uupa-1960" and section == "batang_tubuh":
            m = ROMAN.match(line)
        if not m and (m := PASAL_NOISY.match(line)):
            prev = [r for r in raw if r["section"] == section][-1:] if not cur or cur["section"] != section else [cur]
            last = re.match(r"\d+", prev[0]["pasal"]) if prev else None
            if last and section == "batang_tubuh" and d["slug"] != "uupa-1960": inferred = True
            else: m = None
        if m:
            flush()
            num = str(int(last.group()) + 1) if inferred else m.group(1).replace(" ", "")
            if d["slug"] == "uupa-1960" and ROMAN.match(line): num = "konversi-" + num
            cur = {"pasal": num, "inferred": inferred, "section": section, "bab": bab, "page_start": page, "page_end": page, "text": ""}
            continue
        if cur:
            cur["text"] += line + "\n"; cur["page_end"] = page
    flush()
    chunks = []
    for r in raw:
        text = re.sub(r"\n{2,}", "\n", re.sub(r"-\n(?=[a-z])", "", r["text"])).strip()
        if r["section"] == "batang_tubuh" and (m := PENUTUP.search("\n" + text)):
            text = text[: max(m.start() - 1, 0)].strip()  # buang blok tanda tangan + lampiran
        if r["section"] == "penjelasan" and only_cukup_jelas(text): continue  # tanpa isi
        if len(text) < 15: continue  # header/judul salah deteksi
        pieces = split_ayat(text) if len(text) > MAX_CHARS else [text]
        for j, piece in enumerate(pieces, 1):
            chunks.append({
                "id": f"{d['slug']}:{r['section'][:4]}:ps{r['pasal']}" + (f":{j}" if len(pieces) > 1 else ""),
                "doc_slug": d["slug"], "doc": d["short"], "doc_title": d["title"],
                "section": r["section"], "bab": r["bab"], "pasal": r["pasal"], "pasal_inferred": r.get("inferred", False),
                "page_start": r["page_start"], "page_end": r["page_end"],
                "text": piece.strip(), "n_chars": len(piece),
            })
    return chunks

def load_manual():
    """Pasal yang diketik manual (OCR gagal) -> data/manual/*.json; menggantikan chunk otomatis dengan nomor sama."""
    out = []
    for f in sorted(Path("data/manual").glob("*.json")):
        m = json.loads(f.read_text()); d = json.loads((EXT / f"{m['doc_slug']}.json").read_text())
        for c in m["chunks"]:
            out.append({"id": f"{m['doc_slug']}:bata:ps{c['pasal']}", "doc_slug": m["doc_slug"], "doc": d["short"],
                        "doc_title": d["title"], "section": "batang_tubuh", "bab": c.get("bab"), "pasal": c["pasal"],
                        "pasal_inferred": False, "source": "manual", "page_start": c["page_start"],
                        "page_end": c["page_end"], "text": c["text"], "n_chars": len(c["text"])})
    return out

def load_panduan():
    """Panduan prosedur (bukan regulasi) -> data/panduan/*.json; section='panduan', status='panduan'."""
    out = []
    for f in sorted(Path("data/panduan").glob("*.json")):
        m = json.loads(f.read_text())
        for i, c in enumerate(m["chunks"], 1):
            out.append({"id": f"{m['doc_slug']}:{i:02d}", "doc_slug": m["doc_slug"], "doc": m["doc"], "doc_title": m["doc_title"],
                        "section": "panduan", "bab": None, "pasal": c["judul"], "pasal_inferred": False,
                        "page_start": None, "page_end": None, "text": c["text"], "n_chars": len(c["text"]), "status": "panduan"})
    return out

def main():
    OUT.mkdir(parents=True, exist_ok=True)
    allc, report = [], []
    for f in sorted(EXT.glob("*.json")):
        d = json.loads(f.read_text()); cs = chunk_doc(d)
        man = [c for c in load_manual() if c["doc_slug"] == d["slug"]]
        keys = {c["id"] for c in man}
        cs = [c for c in cs if c["id"] not in keys] + man
        if d["slug"] in SCOPE:
            lo, hi = SCOPE[d["slug"]]
            cs = [c for c in cs if c["pasal"][0].isdigit() and lo <= int(c["pasal"].rstrip("ABCDEFGH")) <= hi]
        cs.sort(key=lambda c: (c["section"] != "batang_tubuh", c["page_start"]))
        seen = {}
        for c in cs:
            c["status"] = STATUS.get(c["doc_slug"], "berlaku")
            seen[c["id"]] = seen.get(c["id"], 0) + 1
            if seen[c["id"]] > 1: c["id"] += f"~{seen[c['id']]}"  # id unik untuk Pasal duplikat
        allc += cs
        body = [c for c in cs if c["section"] == "batang_tubuh"]
        nums = sorted({int(c["pasal"].rstrip("ABCDEFGH")) for c in body if c["pasal"][0].isdigit()})
        missing = [n for n in range(nums[0], nums[-1] + 1) if n not in nums] if nums else []
        report.append(f"{d['short']:24s} chunk={len(cs):4d} (batang tubuh={len(body):4d}, penjelasan={len(cs)-len(body):3d}) "
                      f"pasal {nums[0] if nums else '-'}–{nums[-1] if nums else '-'}  hilang: {missing}")
    pan = load_panduan(); allc += pan
    report.append(f"{'Panduan prosedur':24s} chunk={len(pan):4d}")
    with open(OUT / "chunks.jsonl", "w") as fh:
        for c in allc: fh.write(json.dumps(c, ensure_ascii=False) + "\n")
    (OUT / "report.txt").write_text("\n".join(report))
    print("\n".join(report)); print("TOTAL chunk:", len(allc), "| rata2 char:", sum(c["n_chars"] for c in allc)//len(allc))
main()
