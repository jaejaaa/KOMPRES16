"""Uji cepat retrieval: pertanyaan contoh + cek apakah Pasal yang diharapkan ada di top-5.
Jalankan: SEARCH_BACKEND=local python scripts/04_search.py   (atau firestore)"""
import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).parent))
from search import search

PANDUAN_TESTS = [  # (pertanyaan, doc_slug panduan yang harus ada di top-3)
    ('Bagaimana cara balik nama sertifikat tanah?', 'Panduan: Balik Nama Sertifikat Tanah'),
    ('Apa saja syarat dokumen balik nama setelah beli rumah?', 'Panduan: Balik Nama Sertifikat Tanah'),
    ('Gimana cara cek keaslian sertifikat tanah?', 'Panduan: Cek Keaslian Sertifikat Tanah'),
    ('Apakah sertifikat elektronik bisa dicek asli atau tidak?', 'Panduan: Cek Keaslian Sertifikat Tanah'),
]

TESTS = [  # (pertanyaan, [(dokumen, pasal) yang dianggap benar])
    ("Apa syarat dan tata cara balik nama sertifikat tanah?", [("PP 24/1997", "37"), ("PP 24/1997", "38"), ("PP 24/1997", "40")]),
    ("Bagaimana prosedur peralihan hak atas tanah karena jual beli?", [("PP 24/1997", "37"), ("PP 24/1997", "38"), ("PP 24/1997", "40")]),
    ("Berapa tarif BPHTB yang harus dibayar pembeli?", [("UU 28/2009", "88")]),
    ("Apakah sertifikat elektronik sah sebagai alat bukti?", [("PP 18/2021", "84")]),
    ("Bagaimana cara mendaftarkan tanah yang belum bersertifikat?", [("PP 24/1997", "13"), ("PP 24/1997", "24")]),
    ("Apa itu tanah musnah dan apakah haknya hapus?", [("PP 18/2021", "66")]),
    ("Siapa yang boleh memiliki hak milik atas tanah?", [("UU 5/1960", "21")]),
    ("Berapa lama jangka waktu hak guna bangunan?", [("PP 18/2021", "37")]),
    ("Data pribadi pemilik tanah harus dilindungi bagaimana?", [("UU 27/2022", "35"), ("UU 27/2022", "39")]),
]
if __name__ == "__main__":
    for hybrid in (False, True):
        hit = 0
        for q, exp in TESTS:
            r = search(q, 5, hybrid=hybrid, include_panduan=False)  # ukur retrieval regulasi saja
            ok = any((x["sumber"], x["pasal"]) in exp for x in r); hit += ok
            if hybrid: print(("OK  " if ok else "MISS"), q, "->", [(x["sumber"], x["pasal"], x["score"]) for x in r[:3]])
        print(f"{'hybrid' if hybrid else 'vektor'}: {hit}/{len(TESTS)} Pasal benar di top-5")
    ok = sum(any(x["sumber"] == exp for x in search(q, 3)) for q, exp in PANDUAN_TESTS)
    print(f"panduan: {ok}/{len(PANDUAN_TESTS)} pertanyaan prosedur menemukan panduan yang tepat di top-3")
