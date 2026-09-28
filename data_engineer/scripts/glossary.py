"""Perluasan query: singkatan/istilah awam -> istilah yang dipakai teks regulasi.
Diterapkan di search() sebelum embedding dan pencarian kata kunci (query asli tetap dipertahankan)."""
import re

GLOSSARY = {  # kunci huruf kecil; dicocokkan sebagai kata utuh
    "shm": "hak milik",
    "hm": "hak milik",
    "hgb": "hak guna bangunan",
    "shgb": "sertifikat hak guna bangunan",
    "hgu": "hak guna usaha",
    "hp": "hak pakai",
    "hpl": "hak pengelolaan",
    "shmsrs": "hak milik atas satuan rumah susun",
    "sarusun": "satuan rumah susun",
    "ajb": "akta jual beli akta PPAT",
    "ppjb": "perjanjian pengikatan jual beli",
    "ppat": "pejabat pembuat akta tanah",
    "bpn": "badan pertanahan nasional kantor pertanahan",
    "bphtb": "bea perolehan hak atas tanah dan bangunan",
    "njop": "nilai jual objek pajak",
    "pbb": "pajak bumi dan bangunan",
    "uupa": "undang-undang pokok agraria",
    "pdp": "pelindungan data pribadi",
    "girik": "tanah bekas hak milik adat pendaftaran tanah",
    "sertipikat": "sertifikat",
}
PHRASES = {  # frasa awam
    "balik nama": "peralihan hak pendaftaran peralihan hak pemindahan hak",
    "sertifikat elektronik": "sertipikat elektronik dokumen elektronik",
    "sertifikat palsu": "keaslian sertifikat pemalsuan data yuridis",
    "cek sertifikat": "pengecekan sertifikat keaslian sertifikat buku tanah",
    "tanah sengketa": "sengketa tanah pembatalan hak atas tanah",
    "tanah negara": "tanah negara hak atas tanah pemberian hak",
    "tanah garapan": "girik petok d tanah bekas hak milik adat penguasaan fisik pembuktian hak konversi hak",
    "tanah adat": "tanah bekas hak milik adat konversi hak penguasaan fisik pembuktian hak",
}

def expand_query(q: str) -> str:
    low, extra = q.lower(), []
    for k, v in PHRASES.items():
        if k in low: extra.append(v)
    for w in re.findall(r"[a-z0-9]+", low):
        if w in GLOSSARY: extra.append(GLOSSARY[w])
    return q if not extra else q + " (" + "; ".join(dict.fromkeys(extra)) + ")"
