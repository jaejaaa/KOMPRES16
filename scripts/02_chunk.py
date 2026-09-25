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

def split_ayat(body: str):
    """Pasal panjang dipecah di batas ayat '(n)' agar tiap chunk tetap utuh secara makna."""
    parts = re.split(r"\n(?=\(\d+\)\s)", body)
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
        if d["slug"] == "kuhperdata-buku2" and pg["page"] in (1, len(d["pages"])):
            continue  # halaman sampul/kosong Wikisource
        lines += [(pg["page"], l) for l in pg["text"].split("\n")]
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

def main():
    OUT.mkdir(parents=True, exist_ok=True)
    allc, report = [], []
    for f in sorted(EXT.glob("*.json")):
        d = json.loads(f.read_text()); cs = chunk_doc(d); allc += cs
        body = [c for c in cs if c["section"] == "batang_tubuh"]
        nums = sorted({int(c["pasal"].rstrip("ABCDEFGH")) for c in body if c["pasal"][0].isdigit()})
        missing = [n for n in range(nums[0], nums[-1] + 1) if n not in nums] if nums else []
        report.append(f"{d['short']:24s} chunk={len(cs):4d} (batang tubuh={len(body):4d}, penjelasan={len(cs)-len(body):3d}) "
                      f"pasal {nums[0] if nums else '-'}–{nums[-1] if nums else '-'}  hilang: {missing}")
    with open(OUT / "chunks.jsonl", "w") as fh:
        for c in allc: fh.write(json.dumps(c, ensure_ascii=False) + "\n")
    (OUT / "report.txt").write_text("\n".join(report))
    print("\n".join(report)); print("TOTAL chunk:", len(allc), "| rata2 char:", sum(c["n_chars"] for c in allc)//len(allc))
main()
