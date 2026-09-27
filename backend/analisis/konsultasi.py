"""Petakan kategori risiko (10 kategori taksonomi.py) ke kategori kasus konsultan (Data Engineer).

Pemetaan ini KEPUTUSAN PRODUK sederhana yang kami buat sendiri (bukan aturan hukum baku) — silakan
disesuaikan bersama tim/Data Engineer kalau ada kategori kasus yang lebih pas. Kategori yang tidak
disebut di sini (mis. "Pajak dan biaya tidak jelas", "Waktu pelaksanaan tidak jelas") sengaja tidak
disarankan konsultan: risikonya perlu dinegosiasikan ke pihak lawan, bukan kasus untuk notaris/advokat.

Hanya risiko level "high" yang disarankan konsultasi (paling butuh pendapat profesional); level medium/low
biasanya cukup diperhatikan/dinegosiasikan sendiri sebelum tanda tangan.
"""
from .taksonomi import NAMA_KATEGORI

# nama kategori -> id kategori_kasus (lihat data_engineer/scripts/konsultan.py -> kategori_kasus())
PEMETAAN_KATEGORI = {
    "Ketidakjelasan objek tanah": "cek-sertifikat",
    "Status hak dan beban atas tanah tidak dijamin": "hak-tanggungan",
    "Peralihan hak tanpa akta PPAT": "balik-nama",
    "Klausul denda/syarat berat sebelah": "sengketa-tanah",
    "Subjek hak tidak memenuhi syarat": "sengketa-tanah",
    "Hilangnya hak somasi/upaya hukum": "sengketa-tanah",
    "Kuasa mutlak yang berisiko disalahgunakan": "mafia-tanah",
}
assert set(PEMETAAN_KATEGORI) <= set(NAMA_KATEGORI)  # jaga-jaga: taksonomi berubah tapi lupa update pemetaan


def saran_kategori_kasus(risks: list[dict]) -> list[str]:
    """ID kategori_kasus (unik, urut kemunculan) yang layak disarankan dari daftar risiko `analyze()`.

    Cuma risiko "high" yang dipakai. `risks` boleh berisi kategori mana pun (termasuk yang tidak
    dikenal/tidak ada di PEMETAAN_KATEGORI) — yang tidak dikenal dilewati begitu saja.
    """
    hasil: list[str] = []
    for r in risks or []:
        if not isinstance(r, dict) or r.get("level") != "high":
            continue
        kasus = PEMETAAN_KATEGORI.get(r.get("kategori"))
        if kasus and kasus not in hasil:
            hasil.append(kasus)
    return hasil
