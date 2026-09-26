"""Taksonomi risiko klausul dokumen pertanahan (10 kategori) + pemetaan level.

K1-K8 = draf Data Engineer (nama persis sama dengan kunci jawaban dataset sintetis, jadi evaluasi
tanpa mapping). Dua kategori tambahan dari brief awal: somasi/upaya hukum dan kuasa mutlak.
"Klausul pembatalan sepihak" dari brief dilebur ke K6 (syarat berat sebelah).
"""
import difflib

# (nama kategori, penjelasan untuk LLM). Nama dipakai apa adanya oleh Frontend.
KATEGORI = [
    ("Uang muka (DP) hangus tanpa syarat jelas",
     "Uang muka/tanda jadi tidak dapat dikembalikan atau hangus tanpa kondisi yang jelas dan proporsional, "
     "termasuk walau pembatalan disebabkan pihak penjual atau objek tidak dapat dialihkan."),
    ("Ketidakjelasan objek tanah",
     "Letak, luas ('kurang lebih'), batas-batas, atau nomor/jenis sertifikat tanah tidak jelas, "
     "belum ditentukan, atau dapat diubah sepihak."),
    ("Status hak dan beban atas tanah tidak dijamin",
     "Penjual tidak menjamin tanah bebas sengketa, sitaan, atau jaminan utang (hak tanggungan), "
     "atau pembeli diminta melepaskan tuntutan atas hal itu."),
    ("Peralihan hak tanpa akta PPAT",
     "Jual beli hanya dengan kuitansi/perjanjian di bawah tangan; akta PPAT dan balik nama ditiadakan "
     "atau ditunda tanpa batas."),
    ("Pajak dan biaya tidak jelas",
     "Pembebanan pajak (BPHTB/PPh) dan biaya notaris/PPAT/balik nama tidak jelas, ditentukan sepihak, "
     "ditunda, atau seluruhnya dibebankan ke satu pihak."),
    ("Klausul denda/syarat berat sebelah",
     "Denda tanpa batas atau persentase tinggi, sanksi hanya untuk satu pihak, hak membatalkan/mengubah "
     "perjanjian secara sepihak, kenaikan sewa sepihak, atau syarat yang bersifat memeras."),
    ("Waktu pelaksanaan tidak jelas",
     "Tanggal serah terima, pelunasan, penandatanganan AJB, atau jangka waktu sewa tidak ditentukan "
     "atau ditentukan sepihak."),
    ("Subjek hak tidak memenuhi syarat",
     "Pihak yang tidak berhak (mis. warga negara asing) diberi Hak Milik atas tanah, atau status "
     "subjek pihak tidak memenuhi syarat untuk hak yang dialihkan."),
    ("Hilangnya hak somasi/upaya hukum",
     "Para pihak melepaskan hak somasi, hak menggugat, hak menempuh jalur hukum/pengadilan, atau "
     "penyelesaian sengketa dibuat berat sebelah."),
    ("Kuasa mutlak yang berisiko disalahgunakan",
     "Pemberian kuasa yang tidak dapat ditarik kembali / kuasa mutlak, terutama untuk menjual atau "
     "memindahkan hak atas tanah."),
]

NAMA_KATEGORI = [nama for nama, _ in KATEGORI]

# Hanya kategori ini yang boleh dilaporkan sebagai "klausul tidak ditemukan" (ketiadaan itu sendiri risiko).
KATEGORI_BOLEH_ABSEN = {"Status hak dan beban atas tanah tidak dijamin"}

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
