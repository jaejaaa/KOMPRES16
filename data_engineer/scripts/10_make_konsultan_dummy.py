"""Buat data DUMMY direktori konsultan profesional (Notaris/PPAT + Advokat) untuk fitur "Konsultasi Profesional".

PENTING: seluruh nama, kantor, kontak, harga, dan jadwal di sini FIKTIF (bukan orang/kantor sungguhan). Nama
kota & provinsi SAJA yang asli (dari data/wilayah/kabupaten_kota.json, sumber Kemendagri/BPS via
emsifa/api-wilayah-indonesia; file itu berisi 514 kabupaten/kota, tapi cakupan skrip ini SENGAJA dibatasi ke
98 Kota saja, Kabupaten tidak diikutkan) -- itu supaya dropdown lokasi bertingkat di FE realistis, BUKAN klaim
ada konsultan sungguhan di kota itu. Tujuannya demo/prototipe, BUKAN pengganti scraping data asli. Scraping
data asli tidak dilakukan karena:
  - Sumber resmi Notaris (ini.id, Mitra ATR/BPN) berbasis cari-per-nama, bukan daftar yang bisa diambil sekaligus.
  - Organisasi advokat terpecah (PERADI/PERADIN/KAI dll), tidak ada satu sumber otoritatif.
  - Data profesi + kontak orang sungguhan yang dipublikasikan ulang tanpa izin berisiko kena UU 27/2022 PDP
    (relevan, itu ada di korpus regulasi proyek ini) dan bisa jadi utang keakuratan (nomor berubah, dsb).

Kolom tambahan (nomor telepon, peta, harga, jadwal) sengaja dibuat agar TIDAK bisa disalahartikan sebagai data asli:
  - Nomor telepon: pola berurutan (0812-0000-0001, dst), bukan nomor acak yang terlihat asli.
  - Lokasi: tautan PENCARIAN Google Maps (nama kantor + kota), bukan alamat/koordinat presisi yang bisa
    kebetulan menunjuk ke bangunan sungguhan.
  - Harga (field "tarif"): kisaran indikatif PER ORANG (3 tingkatan diputar per indeks, supaya tidak seragam),
    diberi label "(indikatif/dummy)".
  - Jadwal: pola mingguan generik, diberi label "(contoh)".

Jika nanti mau data ASLI: cara yang aman & berkelanjutan adalah PENDAFTARAN MANDIRI oleh notaris/PPAT/advokat mitra
(mereka isi profil sendiri, app hanya menampilkan), bukan scraping. Lihat catatan di README data_engineer.

Jalankan: python scripts/10_make_konsultan_dummy.py -> data/konsultan/{kategori_kasus,notaris_ppat_dummy,advokat_dummy}.json
"""
import json
from pathlib import Path
from urllib.parse import quote

OUT = Path(__file__).resolve().parent.parent / "data/konsultan"

# Jadwal mingguan generik (dummy); "waktu setempat" karena provinsi tersebar di 3 zona waktu (WIB/WITA/WIT).
JADWAL_TEMPLATES = [
    "Senin–Jumat 09.00–16.00 (waktu setempat, dummy)",
    "Senin–Jumat 08.30–15.30, Sabtu 09.00–12.00 (waktu setempat, dummy)",
    "Senin–Sabtu 09.00–17.00 (waktu setempat, dummy)",
    "Senin–Jumat 10.00–18.00, janji temu di luar jam tersebut bisa diatur (dummy)",
]

# Tarif per orang, 3 tingkatan (diputar per indeks agar bervariasi, BUKAN korelasi dengan kualitas sungguhan).
# Notaris/PPAT: tarif per akta. Advokat: tarif konsultasi awal per sesi (penanganan perkara lanjutan dirundingkan).
TARIF_NOTARIS = [
    "Rp 750.000 – Rp 1.500.000 per akta (indikatif/dummy)",
    "Rp 1.000.000 – Rp 2.000.000 per akta (indikatif/dummy)",
    "Rp 1.500.000 – Rp 3.000.000 per akta (indikatif/dummy)",
]
TARIF_ADVOKAT = [
    "Konsultasi awal Rp 250.000 – Rp 500.000/sesi (indikatif/dummy)",
    "Konsultasi awal Rp 400.000 – Rp 750.000/sesi (indikatif/dummy)",
    "Konsultasi awal Rp 600.000 – Rp 1.200.000/sesi (indikatif/dummy)",
]

# Kategori kasus -> profesi yang relevan. Notaris/PPAT: administratif (akta, balik nama, cek dokumen), tidak
# beracara di pengadilan dan bukan penegak hukum. Advokat: litigasi perdata & pidana.
KATEGORI_KASUS = [
    {"id": "balik-nama", "nama": "Balik nama / peralihan hak (jual-beli, hibah)", "profesi": ["notaris_ppat"]},
    {"id": "waris", "nama": "Mengurus warisan tanah", "profesi": ["notaris_ppat", "advokat"],
     "catatan": "Notaris/PPAT bila para ahli waris sepakat damai; advokat bila ahli waris tidak sepakat atau bersengketa."},
    {"id": "cek-sertifikat", "nama": "Pengecekan keabsahan sertifikat", "profesi": ["notaris_ppat"]},
    {"id": "sertifikat-ganda", "nama": "Sertifikat ganda / tumpang tindih", "profesi": ["notaris_ppat", "advokat"],
     "catatan": "Notaris/PPAT untuk pengecekan awal ke Kantor Pertanahan; advokat bila sudah bersengketa/berlanjut ke gugatan."},
    {"id": "hak-tanggungan", "nama": "Pembebanan / pelepasan hak tanggungan (agunan)", "profesi": ["notaris_ppat"]},
    {"id": "sengketa-tanah", "nama": "Sengketa tanah (sudah/berpotensi ke pengadilan)", "profesi": ["advokat"],
     "catatan": "Ranah advokat (litigasi perdata). Notaris/PPAT tidak mewakili di pengadilan."},
    {"id": "mafia-tanah", "nama": "Dugaan mafia tanah / pemalsuan dokumen", "profesi": ["advokat"],
     "catatan": "Advokat pidana dapat mendampingi proses hukum. Laporkan juga ke Satgas Anti Mafia Tanah "
                "(Kementerian ATR/BPN bersama Polri) untuk penindakan (gratis, tidak dipungut biaya). Notaris/PPAT bukan penegak hukum."},
]

# (nama, gelar, kantor, kota, provinsi, [id_kategori yang bisa dibantu])
NOTARIS = [
    ("Ahmad Fauzi", "S.H., M.Kn.", "Kantor Notaris & PPAT Ahmad Fauzi", "Banda Aceh", "Aceh", ["balik-nama", "waris", "cek-sertifikat"]),
    ("Rina Simatupang", "S.H., M.Kn.", "Kantor Notaris & PPAT Rina Simatupang", "Medan", "Sumatera Utara", ["balik-nama", "sertifikat-ganda", "cek-sertifikat"]),
    ("Yusuf Hakim", "S.H., M.Kn.", "Kantor Notaris & PPAT Yusuf Hakim", "Padang", "Sumatera Barat", ["balik-nama", "waris"]),
    ("Siti Rahmadhani", "S.H., M.Kn.", "Kantor Notaris & PPAT Siti Rahmadhani", "Pekanbaru", "Riau", ["balik-nama", "hak-tanggungan"]),
    ("Deni Saputra", "S.H., M.Kn.", "Kantor Notaris & PPAT Deni Saputra", "Batam", "Kepulauan Riau", ["balik-nama", "cek-sertifikat"]),
    ("Muhammad Ridwan", "S.H., M.Kn.", "Kantor Notaris & PPAT M. Ridwan", "Jambi", "Jambi", ["balik-nama", "waris"]),
    ("Elisa Wijaya", "S.H., M.Kn.", "Kantor Notaris & PPAT Elisa Wijaya", "Palembang", "Sumatera Selatan", ["balik-nama", "sertifikat-ganda"]),
    ("Bambang Prasetyo", "S.H., M.Kn.", "Kantor Notaris & PPAT Bambang Prasetyo", "Bengkulu", "Bengkulu", ["balik-nama", "waris"]),
    ("Meilani Putri", "S.H., M.Kn.", "Kantor Notaris & PPAT Meilani Putri", "Bandar Lampung", "Lampung", ["balik-nama", "cek-sertifikat", "waris"]),
    ("Hasan Basri", "S.H., M.Kn.", "Kantor Notaris & PPAT Hasan Basri", "Pangkalpinang", "Kepulauan Bangka Belitung", ["balik-nama"]),
    ("Anisa Rahmawati", "S.H., M.Kn.", "Kantor Notaris & PPAT Anisa Rahmawati", "Jakarta Selatan", "DKI Jakarta", ["balik-nama", "sertifikat-ganda", "cek-sertifikat", "hak-tanggungan"]),
    ("Dedi Kurniawan", "S.H., M.Kn.", "Kantor Notaris & PPAT Dedi Kurniawan", "Jakarta Pusat", "DKI Jakarta", ["balik-nama", "waris"]),
    ("Fitriani Handayani", "S.H., M.Kn.", "Kantor Notaris & PPAT Fitriani Handayani", "Bandung", "Jawa Barat", ["balik-nama", "waris", "cek-sertifikat"]),
    ("Agus Salim", "S.H., M.Kn.", "Kantor Notaris & PPAT Agus Salim", "Bekasi", "Jawa Barat", ["balik-nama", "hak-tanggungan"]),
    ("Christine Marpaung", "S.H., M.Kn.", "Kantor Notaris & PPAT Christine Marpaung", "Bogor", "Jawa Barat", ["balik-nama", "sertifikat-ganda"]),
    ("Sutrisno Wijaya", "S.H., M.Kn.", "Kantor Notaris & PPAT Sutrisno Wijaya", "Serang", "Banten", ["balik-nama", "waris"]),
    ("Kartika Sari", "S.H., M.Kn.", "Kantor Notaris & PPAT Kartika Sari", "Tangerang", "Banten", ["balik-nama", "cek-sertifikat"]),
    ("Wahyu Setiawan", "S.H., M.Kn.", "Kantor Notaris & PPAT Wahyu Setiawan", "Semarang", "Jawa Tengah", ["balik-nama", "waris", "sertifikat-ganda"]),
    ("Retno Wulandari", "S.H., M.Kn.", "Kantor Notaris & PPAT Retno Wulandari", "Surakarta", "Jawa Tengah", ["balik-nama", "cek-sertifikat"]),
    ("Bagus Nugroho", "S.H., M.Kn.", "Kantor Notaris & PPAT Bagus Nugroho", "Yogyakarta", "D.I. Yogyakarta", ["balik-nama", "waris"]),
    ("Indra Gunawan", "S.H., M.Kn.", "Kantor Notaris & PPAT Indra Gunawan", "Surabaya", "Jawa Timur", ["balik-nama", "sertifikat-ganda", "hak-tanggungan"]),
    ("Puspita Ayu", "S.H., M.Kn.", "Kantor Notaris & PPAT Puspita Ayu", "Malang", "Jawa Timur", ["balik-nama", "waris", "cek-sertifikat"]),
    ("Made Sudiartha", "S.H., M.Kn.", "Kantor Notaris & PPAT Made Sudiartha", "Denpasar", "Bali", ["balik-nama", "cek-sertifikat", "sertifikat-ganda"]),
    ("Ni Kadek Ariani", "S.H., M.Kn.", "Kantor Notaris & PPAT Ni Kadek Ariani", "Singaraja", "Bali", ["balik-nama", "waris"]),
    ("Lalu Ahmad Zaini", "S.H., M.Kn.", "Kantor Notaris & PPAT L. Ahmad Zaini", "Mataram", "Nusa Tenggara Barat", ["balik-nama", "waris"]),
    ("Maria Goreti", "S.H., M.Kn.", "Kantor Notaris & PPAT Maria Goreti", "Kupang", "Nusa Tenggara Timur", ["balik-nama", "cek-sertifikat"]),
    ("Yohanes Situmorang", "S.H., M.Kn.", "Kantor Notaris & PPAT Yohanes Situmorang", "Pontianak", "Kalimantan Barat", ["balik-nama", "sertifikat-ganda"]),
    ("Herlina Wati", "S.H., M.Kn.", "Kantor Notaris & PPAT Herlina Wati", "Palangkaraya", "Kalimantan Tengah", ["balik-nama", "waris"]),
    ("Rudi Hartono", "S.H., M.Kn.", "Kantor Notaris & PPAT Rudi Hartono", "Banjarmasin", "Kalimantan Selatan", ["balik-nama", "cek-sertifikat", "hak-tanggungan"]),
    ("Nurul Aini", "S.H., M.Kn.", "Kantor Notaris & PPAT Nurul Aini", "Samarinda", "Kalimantan Timur", ["balik-nama", "sertifikat-ganda"]),
    ("Andi Saputra", "S.H., M.Kn.", "Kantor Notaris & PPAT Andi Saputra", "Tanjung Selor", "Kalimantan Utara", ["balik-nama"]),
    ("Grace Tumbelaka", "S.H., M.Kn.", "Kantor Notaris & PPAT Grace Tumbelaka", "Manado", "Sulawesi Utara", ["balik-nama", "waris"]),
    ("Moh. Iqbal", "S.H., M.Kn.", "Kantor Notaris & PPAT Moh. Iqbal", "Palu", "Sulawesi Tengah", ["balik-nama", "cek-sertifikat"]),
    ("Andi Nurul Fadillah", "S.H., M.Kn.", "Kantor Notaris & PPAT Andi Nurul Fadillah", "Makassar", "Sulawesi Selatan", ["balik-nama", "waris", "sertifikat-ganda"]),
    ("La Ode Amir", "S.H., M.Kn.", "Kantor Notaris & PPAT La Ode Amir", "Kendari", "Sulawesi Tenggara", ["balik-nama", "cek-sertifikat"]),
    ("Frangky Mokodompit", "S.H., M.Kn.", "Kantor Notaris & PPAT Frangky Mokodompit", "Gorontalo", "Gorontalo", ["balik-nama"]),
    ("Nurhayati Mandacan", "S.H., M.Kn.", "Kantor Notaris & PPAT Nurhayati Mandacan", "Mamuju", "Sulawesi Barat", ["balik-nama", "waris"]),
    ("Sarah Sahetapy", "S.H., M.Kn.", "Kantor Notaris & PPAT Sarah Sahetapy", "Ambon", "Maluku", ["balik-nama", "cek-sertifikat"]),
    ("Yusrin Kabalmay", "S.H., M.Kn.", "Kantor Notaris & PPAT Yusrin Kabalmay", "Ternate", "Maluku Utara", ["balik-nama", "waris"]),
    ("Yance Wamafma", "S.H., M.Kn.", "Kantor Notaris & PPAT Yance Wamafma", "Jayapura", "Papua", ["balik-nama", "sertifikat-ganda"]),
    ("Dorince Mansim", "S.H., M.Kn.", "Kantor Notaris & PPAT Dorince Mansim", "Manokwari", "Papua Barat", ["balik-nama", "waris"]),
]

# (nama, gelar, kantor, kota, provinsi, [id_kategori]) -- fokus litigasi: sengketa-tanah, mafia-tanah, + waris/sertifikat-ganda yang bersengketa
ADVOKAT = [
    ("Teuku Rizal", "S.H.", "Kantor Hukum Teuku Rizal & Rekan", "Banda Aceh", "Aceh", ["sengketa-tanah", "waris"]),
    ("Boru Panggabean", "S.H., M.H.", "Kantor Hukum Panggabean & Partners", "Medan", "Sumatera Utara", ["sengketa-tanah", "mafia-tanah"]),
    ("Rico Alfino", "S.H.", "Kantor Hukum Rico Alfino & Rekan", "Padang", "Sumatera Barat", ["sengketa-tanah"]),
    ("Melly Anggraini", "S.H., M.H.", "Kantor Hukum Melly Anggraini & Associates", "Pekanbaru", "Riau", ["sengketa-tanah", "sertifikat-ganda"]),
    ("Johan Tanoto", "S.H.", "Kantor Hukum Johan Tanoto & Partners", "Batam", "Kepulauan Riau", ["sengketa-tanah", "mafia-tanah"]),
    ("Fajar Ramadhan", "S.H.", "Kantor Hukum Fajar Ramadhan & Rekan", "Jambi", "Jambi", ["sengketa-tanah"]),
    ("Sinta Marbun", "S.H., M.H.", "Kantor Hukum Marbun & Partners", "Palembang", "Sumatera Selatan", ["sengketa-tanah", "sertifikat-ganda"]),
    ("Dian Kusuma", "S.H.", "Kantor Hukum Dian Kusuma & Rekan", "Bengkulu", "Bengkulu", ["sengketa-tanah"]),
    ("Reza Pratama", "S.H., M.H.", "Kantor Hukum Pratama & Associates", "Bandar Lampung", "Lampung", ["sengketa-tanah", "waris"]),
    ("Wina Aditya", "S.H.", "Kantor Hukum Wina Aditya & Rekan", "Pangkalpinang", "Kepulauan Bangka Belitung", ["sengketa-tanah"]),
    ("Gunawan Santoso", "S.H., M.H.", "Kantor Hukum Santoso & Partners", "Jakarta Selatan", "DKI Jakarta", ["sengketa-tanah", "mafia-tanah", "sertifikat-ganda"]),
    ("Angelina Kusnadi", "S.H., LL.M.", "Kantor Hukum Kusnadi & Associates", "Jakarta Pusat", "DKI Jakarta", ["sengketa-tanah", "mafia-tanah"]),
    ("Fadli Ramadhan", "S.H.", "Kantor Hukum Fadli Ramadhan & Rekan", "Bandung", "Jawa Barat", ["sengketa-tanah", "waris"]),
    ("Yenny Kristanto", "S.H., M.H.", "Kantor Hukum Kristanto & Partners", "Bekasi", "Jawa Barat", ["sengketa-tanah", "sertifikat-ganda"]),
    ("Hendra Wijaya", "S.H.", "Kantor Hukum Hendra Wijaya & Rekan", "Bogor", "Jawa Barat", ["sengketa-tanah"]),
    ("Nina Marlina", "S.H., M.H.", "Kantor Hukum Marlina & Associates", "Serang", "Banten", ["sengketa-tanah", "waris"]),
    ("Yudi Prasetya", "S.H.", "Kantor Hukum Yudi Prasetya & Rekan", "Tangerang", "Banten", ["sengketa-tanah", "mafia-tanah"]),
    ("Diah Permatasari", "S.H., M.H.", "Kantor Hukum Permatasari & Partners", "Semarang", "Jawa Tengah", ["sengketa-tanah", "sertifikat-ganda"]),
    ("Bayu Firmansyah", "S.H.", "Kantor Hukum Bayu Firmansyah & Rekan", "Surakarta", "Jawa Tengah", ["sengketa-tanah"]),
    ("Rahmat Hidayat", "S.H., M.H.", "Kantor Hukum Hidayat & Associates", "Yogyakarta", "D.I. Yogyakarta", ["sengketa-tanah", "waris"]),
    ("Sri Wahyuni", "S.H., M.H.", "Kantor Hukum Wahyuni & Partners", "Surabaya", "Jawa Timur", ["sengketa-tanah", "mafia-tanah", "sertifikat-ganda"]),
    ("Arief Budiman", "S.H.", "Kantor Hukum Arief Budiman & Rekan", "Malang", "Jawa Timur", ["sengketa-tanah", "waris"]),
    ("I Wayan Sudiana", "S.H., M.H.", "Kantor Hukum Sudiana & Partners", "Denpasar", "Bali", ["sengketa-tanah", "mafia-tanah"]),
    ("Ni Luh Sriwidari", "S.H.", "Kantor Hukum Sriwidari & Rekan", "Singaraja", "Bali", ["sengketa-tanah"]),
    ("Baiq Nurjannah", "S.H., M.H.", "Kantor Hukum Nurjannah & Associates", "Mataram", "Nusa Tenggara Barat", ["sengketa-tanah", "waris"]),
    ("Yosef Nahak", "S.H.", "Kantor Hukum Yosef Nahak & Rekan", "Kupang", "Nusa Tenggara Timur", ["sengketa-tanah"]),
    ("Erwin Halim", "S.H., M.H.", "Kantor Hukum Halim & Partners", "Pontianak", "Kalimantan Barat", ["sengketa-tanah", "sertifikat-ganda"]),
    ("Novi Ratnasari", "S.H.", "Kantor Hukum Novi Ratnasari & Rekan", "Palangkaraya", "Kalimantan Tengah", ["sengketa-tanah"]),
    ("Ahmad Zulkarnain", "S.H., M.H.", "Kantor Hukum Zulkarnain & Associates", "Banjarmasin", "Kalimantan Selatan", ["sengketa-tanah", "mafia-tanah"]),
    ("Dewi Anjani", "S.H.", "Kantor Hukum Dewi Anjani & Rekan", "Samarinda", "Kalimantan Timur", ["sengketa-tanah", "sertifikat-ganda"]),
    ("Farid Maulana", "S.H.", "Kantor Hukum Farid Maulana & Rekan", "Tanjung Selor", "Kalimantan Utara", ["sengketa-tanah"]),
    ("Meike Rumondor", "S.H., M.H.", "Kantor Hukum Rumondor & Partners", "Manado", "Sulawesi Utara", ["sengketa-tanah", "waris"]),
    ("Moh. Taufik", "S.H.", "Kantor Hukum Moh. Taufik & Rekan", "Palu", "Sulawesi Tengah", ["sengketa-tanah"]),
    ("Andi Pallawagau", "S.H., M.H.", "Kantor Hukum Pallawagau & Associates", "Makassar", "Sulawesi Selatan", ["sengketa-tanah", "mafia-tanah", "sertifikat-ganda"]),
    ("Wa Ode Sitti", "S.H.", "Kantor Hukum Wa Ode Sitti & Rekan", "Kendari", "Sulawesi Tenggara", ["sengketa-tanah"]),
    ("Rian Katili", "S.H., M.H.", "Kantor Hukum Katili & Partners", "Gorontalo", "Gorontalo", ["sengketa-tanah", "waris"]),
    ("Andi Rahman Massepe", "S.H.", "Kantor Hukum Massepe & Rekan", "Mamuju", "Sulawesi Barat", ["sengketa-tanah"]),
    ("Ruth Latumahina", "S.H., M.H.", "Kantor Hukum Latumahina & Associates", "Ambon", "Maluku", ["sengketa-tanah", "mafia-tanah"]),
    ("Ridwan Soamole", "S.H.", "Kantor Hukum Ridwan Soamole & Rekan", "Ternate", "Maluku Utara", ["sengketa-tanah"]),
    ("Yance Kapisa", "S.H., M.H.", "Kantor Hukum Kapisa & Partners", "Jayapura", "Papua", ["sengketa-tanah", "mafia-tanah", "sertifikat-ganda"]),
    ("Beatrix Rumbewas", "S.H.", "Kantor Hukum Beatrix Rumbewas & Rekan", "Manokwari", "Papua Barat", ["sengketa-tanah", "waris"]),
]

def _entri(i, prefix, jenis, kode_telepon, tarif_templates, row):
    nama, gelar, kantor, kota, provinsi, kategori = row
    telepon = f"{kode_telepon}-0000-{i:04d} (dummy - nomor tidak aktif, jangan dihubungi)"
    peta = f"https://www.google.com/maps/search/?api=1&query={quote(f'{kantor}, {kota}, {provinsi}')}"
    jadwal = JADWAL_TEMPLATES[(i - 1) % len(JADWAL_TEMPLATES)]
    tarif = tarif_templates[(i - 1) % len(tarif_templates)]  # per orang, diputar 3 tingkatan (bukan cerminan kualitas asli)
    return {"id": f"{prefix}{i:02d}", "nama": f"{nama}, {gelar}", "jenis": jenis, "kantor": kantor,
            "kota": kota, "provinsi": provinsi, "kategori_kasus": kategori,
            "telepon": telepon, "peta": peta, "jadwal": jadwal, "tarif": tarif, "_dummy": True}


# --- Perluasan ke SEMUA 514 kabupaten/kota resmi (Kemendagri/BPS, via data/wilayah/kabupaten_kota.json) ---
# NOTARIS/ADVOKAT di atas cuma isi 1 kota per provinsi (ibu kota). Supaya tiap kabupaten/kota PUNYA
# setidaknya 1 notaris + 1 advokat (untuk dropdown lokasi bertingkat), sisanya di-generate dari pool nama
# di bawah -- tetap fiktif, sama seperti entri tulisan tangan (lihat catatan di awal file).
NAMA_DEPAN = [
    "Ahmad", "Budi", "Chandra", "Dedi", "Eko", "Fajar", "Gilang", "Hadi", "Iwan", "Joko",
    "Krisna", "Lukman", "Made", "Nugroho", "Oscar", "Putu", "Rian", "Surya", "Taufik", "Umar",
    "Wayan", "Zainal", "Bayu", "Dimas", "Farhan", "Galih", "Hendra", "Indra", "Kevin", "Nyoman",
    "Pandu", "Rizki", "Sandi", "Teguh", "Wahyu", "Yudha", "Arif", "Bagas", "Doni", "Erlangga",
    "Firman", "Guntur", "Hasan", "Ivan", "Kurnia", "Lutfi", "Mardi", "Naufal",
    "Ayu", "Bella", "Citra", "Dewi", "Eka", "Fitri", "Gita", "Hana", "Indah", "Kartika",
    "Laila", "Maya", "Nadia", "Oktavia", "Putri", "Ratna", "Sari", "Tia", "Utami", "Vina",
    "Wulan", "Yuni", "Zahra", "Anisa", "Bunga", "Clara", "Diah", "Elsa", "Farah", "Gina",
    "Hesti", "Ika", "Julia", "Kirana", "Lestari", "Mira", "Nia", "Puspa", "Rina", "Sinta",
    "Tari", "Vera", "Widya", "Yanti",
]
NAMA_BELAKANG = [
    "Wijaya", "Santoso", "Kusuma", "Pratama", "Nugraha", "Saputra", "Setiawan", "Gunawan", "Hidayat",
    "Permana", "Suryanto", "Halim", "Wibowo", "Lubis", "Siregar", "Nasution", "Harahap", "Simatupang",
    "Sitorus", "Panggabean", "Marbun", "Situmorang", "Tampubolon", "Hutagalung", "Sinaga", "Manurung",
    "Purba", "Sembiring", "Ginting", "Tarigan", "Bangun", "Siagian", "Simamora", "Sudrajat", "Prasetyo",
    "Wirawan", "Mulyono", "Rahardjo", "Susanto", "Handoko", "Wibisono", "Kurniawan", "Kusnadi", "Suryana",
    "Rukmana", "Wardana", "Puja", "Sahetapy", "Latumahina", "Pattiasina", "Hehanussa", "Rumbewas",
    "Mansim", "Kapisa", "Soamole", "Katili", "Massepe", "Pallawagau", "Daeng", "Malik", "Firmansyah",
    "Ramadhan", "Anggraini", "Marlina", "Kristanto", "Permatasari", "Nurjannah", "Ratnasari", "Zulkarnain",
]
SUFIKS_KANTOR_ADVOKAT = ["Rekan", "Partners", "Associates"]


def _generate_untuk_kota(kota, provinsi, indeks_global):
    """1 baris notaris + 1 baris advokat untuk 1 kabupaten/kota, dari pool nama (deterministik, bukan acak)."""
    dpn = NAMA_DEPAN[(indeks_global * 7) % len(NAMA_DEPAN)]
    blk = NAMA_BELAKANG[(indeks_global * 11) % len(NAMA_BELAKANG)]
    nama = f"{dpn} {blk}"
    kat_notaris = ["balik-nama"]
    extra_n = ["waris", "cek-sertifikat", "sertifikat-ganda", "hak-tanggungan"][indeks_global % 4]
    if indeks_global % 3 != 0: kat_notaris.append(extra_n)  # sebagian kecil cuma balik-nama, mayoritas 2 kategori
    baris_notaris = (nama, "S.H., M.Kn.", f"Kantor Notaris & PPAT {nama}", kota, provinsi, kat_notaris)

    dpn2 = NAMA_DEPAN[(indeks_global * 13 + 5) % len(NAMA_DEPAN)]
    blk2 = NAMA_BELAKANG[(indeks_global * 17 + 3) % len(NAMA_BELAKANG)]
    nama2 = f"{dpn2} {blk2}"
    sufiks = SUFIKS_KANTOR_ADVOKAT[indeks_global % len(SUFIKS_KANTOR_ADVOKAT)]
    kat_advokat = ["sengketa-tanah"]
    extra_a = ["waris", "mafia-tanah", "sertifikat-ganda"][indeks_global % 3]
    if indeks_global % 3 != 0: kat_advokat.append(extra_a)
    gelar_advokat = ["S.H.", "S.H., M.H.", "S.H., LL.M."][indeks_global % 3]
    baris_advokat = (nama2, gelar_advokat, f"Kantor Hukum {nama2} & {sufiks}", kota, provinsi, kat_advokat)
    return baris_notaris, baris_advokat


def _normalisasi_kota_curated(row, wilayah):
    """Cocokkan kota hasil tulisan tangan (mis. 'Bandung', 'Palangkaraya') ke nama Kota resmi ('Kota Bandung',
    'Kota Palangka Raya'). Cakupan sengaja dibatasi ke level Kota saja (bukan Kabupaten) -- pencocokan tanpa
    spasi supaya ejaan gabung ('Palangkaraya') tetap ketemu nama resmi berspasi ('Palangka Raya'). Kalau tidak
    ketemu (mis. 'Singaraja', 'Tanjung Selor' -- ibu kota kabupaten, bukan Kota tersendiri), biarkan apa adanya."""
    nama, gelar, kantor, kota, provinsi, kategori = row
    resmi = wilayah.get(provinsi, [])
    tanpa_spasi = {r.replace(" ", "").lower(): r for r in resmi}
    cocok = tanpa_spasi.get(f"kota{kota}".replace(" ", "").lower())
    if cocok:
        return (nama, gelar, kantor, cocok, provinsi, kategori)
    return row


def _muat_wilayah():
    p = Path(__file__).resolve().parent.parent / "data/wilayah/kabupaten_kota.json"
    return json.loads(p.read_text(encoding="utf-8")) if p.exists() else {}


def main():
    OUT.mkdir(parents=True, exist_ok=True)
    wilayah = _muat_wilayah()

    notaris_rows = [_normalisasi_kota_curated(r, wilayah) for r in NOTARIS]
    advokat_rows = [_normalisasi_kota_curated(r, wilayah) for r in ADVOKAT]
    kota_tercakup = {(r[3], r[4]) for r in notaris_rows} | {(r[3], r[4]) for r in advokat_rows}

    idx = 0
    for provinsi, daftar_kota in wilayah.items():
        for kota in daftar_kota:
            if not kota.startswith("Kota "):
                continue  # cakupan sengaja dibatasi ke level Kota, Kabupaten tidak diikutkan
            if (kota, provinsi) in kota_tercakup:
                continue
            idx += 1
            n, a = _generate_untuk_kota(kota, provinsi, idx)
            notaris_rows.append(n)
            advokat_rows.append(a)
    (OUT / "kategori_kasus.json").write_text(json.dumps(
        {"kategori_kasus": KATEGORI_KASUS}, ensure_ascii=False, indent=1), encoding="utf-8")
    notaris = [_entri(i, "N", "Notaris/PPAT (dummy)", "0812", TARIF_NOTARIS, r) for i, r in enumerate(notaris_rows, 1)]
    advokat = [_entri(i, "A", "Advokat (dummy)", "0813", TARIF_ADVOKAT, r) for i, r in enumerate(advokat_rows, 1)]
    (OUT / "notaris_ppat_dummy.json").write_text(json.dumps({"konsultan": notaris}, ensure_ascii=False, indent=1), encoding="utf-8")
    (OUT / "advokat_dummy.json").write_text(json.dumps({"konsultan": advokat}, ensure_ascii=False, indent=1), encoding="utf-8")
    print(f"Notaris/PPAT: {len(notaris)} entri, {len(set(k['provinsi'] for k in notaris))} provinsi")
    print(f"Advokat     : {len(advokat)} entri, {len(set(k['provinsi'] for k in advokat))} provinsi")

if __name__ == "__main__":
    main()
