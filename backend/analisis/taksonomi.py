"""Taksonomi risiko klausul dokumen pertanahan (8 kategori dari brief) + pemetaan level."""
import difflib

# (nama kategori, penjelasan untuk LLM). Nama dipakai apa adanya oleh Frontend.
KATEGORI = [
    ("Klausul pembatalan sepihak",
     "Salah satu pihak (biasanya penjual/pengembang) boleh membatalkan atau mengubah perjanjian "
     "kapan saja tanpa persetujuan atau alasan yang jelas, sementara pihak lain tidak."),
    ("Denda/penalti tidak wajar",
     "Denda, bunga, atau penalti yang sangat besar, berat sebelah, atau tidak sebanding "
     "(mis. persentase tinggi per hari) atau hanya berlaku untuk satu pihak."),
    ("Uang muka (DP) hangus tanpa syarat jelas",
     "Uang muka/tanda jadi hangus atau tidak dikembalikan tanpa kondisi yang jelas dan proporsional, "
     "termasuk saat pembatalan terjadi karena kesalahan pihak lain."),
    ("Tidak ada jaminan bebas sengketa/sita",
     "Penjual tidak menjamin tanah bebas sengketa, sitaan, jaminan utang/hak tanggungan, atau "
     "klaim pihak ketiga, atau membebaskan diri dari tanggung jawab itu."),
    ("Pembebanan seluruh pajak ke satu pihak",
     "Seluruh pajak dan biaya (BPHTB, PPh, biaya notaris/PPAT, dll) dibebankan ke satu pihak saja."),
    ("Ketidakjelasan objek tanah",
     "Objek tanah tidak jelas: luas 'kurang lebih', batas-batas tidak disebut, nomor/jenis sertifikat "
     "atau letak tanah tidak lengkap."),
    ("Hilangnya hak somasi/upaya hukum",
     "Para pihak melepaskan hak somasi, hak menggugat, hak menempuh jalur hukum/pengadilan, atau "
     "penyelesaian sengketa dibuat berat sebelah."),
    ("Kuasa mutlak yang berisiko disalahgunakan",
     "Pemberian kuasa yang tidak dapat ditarik kembali / kuasa mutlak, terutama untuk menjual atau "
     "memindahkan hak atas tanah."),
]

NAMA_KATEGORI = [nama for nama, _ in KATEGORI]

# Hanya kategori ini yang boleh dilaporkan sebagai "klausul tidak ditemukan" (ketiadaan itu sendiri risiko).
KATEGORI_BOLEH_ABSEN = {"Tidak ada jaminan bebas sengketa/sita"}

_LEVEL = {
    "low": "low", "medium": "medium", "high": "high",
    "rendah": "low", "sedang": "medium", "tinggi": "high",
    "hijau": "low", "kuning": "medium", "merah": "high",
}


def petakan_level(nilai) -> str | None:
    return _LEVEL.get(str(nilai).strip().lower())


def petakan_kategori(nilai) -> str | None:
    """Cocokkan keluaran LLM ke nama kategori resmi (toleran huruf besar/kecil & salah ketik kecil)."""
    n = str(nilai).strip().lower()
    for nama in NAMA_KATEGORI:
        if n == nama.lower():
            return nama
    cocok = difflib.get_close_matches(n, [k.lower() for k in NAMA_KATEGORI], n=1, cutoff=0.8)
    return next((k for k in NAMA_KATEGORI if k.lower() == cocok[0]), None) if cocok else None
