"""Buat dokumen sintetis untuk uji deteksi risiko -> data/synthetic/{pdf/*.pdf, ground_truth.json, taksonomi_risiko.json}

  python scripts/08_make_synthetic.py

Dokumen berupa PDF *digital* (teks bisa diekstrak; PDF scan ditolak backend) berisi perjanjian jual-beli / sewa tanah FIKTIF
(nama, alamat, dan nomor sertifikat rekaan). Tiap dokumen disusun dari pasal "bersih" dan pasal "berisiko" dengan kunci jawaban
(pasal, kategori, level) yang diketahui, sehingga precision/recall deteksi risiko dapat dihitung (scripts/09_eval_risk.py).

CATATAN: pelabelan risiko adalah penilaian perancang dataset sebagai bahan uji, BUKAN nasihat hukum; taksonomi ini adalah DRAF
yang perlu disepakati dengan AI Engineer. Dasar hukum dicantumkan hanya bila ada di korpus regulasi (sudah diverifikasi)."""
import json
from pathlib import Path
import fitz  # PyMuPDF

OUT = Path(__file__).resolve().parent.parent / "data/synthetic"

# --------------------------------------------------------------------------- taksonomi (draf 8 kategori)
TAKSONOMI = [
    {"id": "K1", "nama": "Uang muka (DP) hangus tanpa syarat jelas", "level_umum": "high",
     "deskripsi": "Uang muka tidak dapat dikembalikan / hangus walau pembatalan disebabkan pihak penjual atau objek tidak dapat dialihkan.",
     "dasar_hukum": []},
    {"id": "K2", "nama": "Ketidakjelasan objek tanah", "level_umum": "high",
     "deskripsi": "Letak, luas, batas, atau nomor sertifikat tanah tidak jelas atau dapat diubah sepihak.",
     "dasar_hukum": [{"sumber": "PP 24/1997", "pasal": "32", "catatan": "Sertifikat = alat pembuktian kuat atas data fisik dan yuridis (sesuai surat ukur dan buku tanah)"}]},
    {"id": "K3", "nama": "Status hak dan beban atas tanah tidak dijamin", "level_umum": "high",
     "deskripsi": "Penjual tidak menjamin tanah bebas sengketa, sitaan, atau jaminan (hak tanggungan) dan pembeli diminta melepaskan tuntutan.",
     "dasar_hukum": [{"sumber": "PP 24/1997", "pasal": "39", "catatan": "PPAT menolak membuat akta bila sertifikat tidak sesuai daftar Kantor Pertanahan"},
                     {"sumber": "PP 24/1997", "pasal": "45", "catatan": "Kantor Pertanahan menolak mendaftar peralihan bila sertifikat tidak sesuai daftar"}]},
    {"id": "K4", "nama": "Peralihan hak tanpa akta PPAT", "level_umum": "high",
     "deskripsi": "Jual beli hanya dengan kuitansi/perjanjian di bawah tangan; akta PPAT dan balik nama ditiadakan atau ditunda tanpa batas.",
     "dasar_hukum": [{"sumber": "PP 24/1997", "pasal": "37", "catatan": "Peralihan hak melalui jual beli hanya dapat didaftarkan bila dibuktikan dengan akta PPAT"}]},
    {"id": "K5", "nama": "Pajak dan biaya tidak jelas", "level_umum": "medium",
     "deskripsi": "Pembebanan pajak (BPHTB/PPh) dan biaya PPAT/balik nama tidak jelas, ditentukan sepihak, atau ditunda.",
     "dasar_hukum": [{"sumber": "UU 28/2009", "pasal": "86", "catatan": "Subjek BPHTB = pihak yang memperoleh hak"},
                     {"sumber": "UU 28/2009", "pasal": "91", "catatan": "PPAT hanya menandatangani akta setelah bukti pembayaran pajak diserahkan"}]},
    {"id": "K6", "nama": "Klausul denda/syarat berat sebelah", "level_umum": "high",
     "deskripsi": "Denda tanpa batas, sanksi hanya untuk satu pihak, kenaikan sewa sepihak, atau syarat yang bersifat memeras.",
     "dasar_hukum": [{"sumber": "UU 5/1960", "pasal": "44", "catatan": "Perjanjian sewa tanah tidak boleh disertai syarat yang mengandung unsur pemerasan (ayat 3)"}]},
    {"id": "K7", "nama": "Waktu pelaksanaan tidak jelas", "level_umum": "medium",
     "deskripsi": "Tanggal serah terima, pelunasan, penandatanganan AJB, atau jangka waktu sewa tidak ditentukan atau ditentukan sepihak.",
     "dasar_hukum": [{"sumber": "PP 24/1997", "pasal": "40", "catatan": "PPAT wajib menyampaikan akta ke Kantor Pertanahan paling lambat 7 hari kerja"}]},
    {"id": "K8", "nama": "Subjek hak tidak memenuhi syarat", "level_umum": "high",
     "deskripsi": "Pihak yang tidak berhak (mis. warga negara asing) diberi Hak Milik atas tanah.",
     "dasar_hukum": [{"sumber": "UU 5/1960", "pasal": "21", "catatan": "Hanya warga negara Indonesia dapat mempunyai hak milik"}]},
]

# --------------------------------------------------------------------------- pustaka klausul
# varian: "bersih" atau (kategori, level). Setiap klausul = (judul, teks).
def jb(nama_p, nama_b):
    return {
        "objek": {
            "bersih": ("Objek Jual Beli", f"PENJUAL menjual kepada PEMBELI sebidang tanah Hak Milik berdasarkan Sertifikat Hak Milik (SHM) No. 01234/Sukajadi atas nama PENJUAL, seluas 120 m² (seratus dua puluh meter persegi), terletak di Jalan Melati, Kelurahan Sukajadi, Kota Bandung, dengan batas-batas: sebelah utara berbatasan dengan tanah milik Bapak Andi, sebelah selatan berbatasan dengan Jalan Melati, sebelah timur berbatasan dengan tanah milik Ibu Rina, dan sebelah barat berbatasan dengan saluran air, sebagaimana tercantum dalam Surat Ukur."),
            ("K2", "high"): ("Objek Jual Beli", "Objek jual beli adalah sebidang tanah kosong seluas kurang lebih 100 m² yang terletak di belakang rumah PENJUAL di daerah Bandung. Letak dan batas-batas tanah akan ditunjukkan oleh PENJUAL di lapangan dan dapat disesuaikan sewaktu-waktu oleh PENJUAL. Nomor sertifikat menyusul."),
            ("K2", "medium"): ("Objek Jual Beli", "PENJUAL menjual kepada PEMBELI sebidang tanah berdasarkan SHM No. 01234/Sukajadi atas nama PENJUAL, seluas kurang lebih 120 m² di Kelurahan Sukajadi, Kota Bandung. Batas-batas tanah mengikuti keadaan di lapangan."),
            ("K8", "high"): ("Objek dan Status Hak", "PENJUAL menjual kepada PEMBELI sebidang tanah berdasarkan SHM No. 01234/Sukajadi seluas 120 m² di Kelurahan Sukajadi, Kota Bandung, dengan batas-batas sebagaimana tercantum dalam Surat Ukur. PEMBELI adalah Warga Negara Asing pemegang paspor dan tanah tersebut akan didaftarkan atas nama PEMBELI dengan status Hak Milik."),
        },
        "harga": {
            "bersih": ("Harga dan Cara Pembayaran", "Harga jual beli disepakati sebesar Rp600.000.000,00 (enam ratus juta rupiah), dibayar sebagai berikut: a. uang muka sebesar Rp120.000.000,00 pada saat penandatanganan perjanjian ini; b. pelunasan sebesar Rp480.000.000,00 selambat-lambatnya pada saat penandatanganan Akta Jual Beli di hadapan PPAT."),
        },
        "dp": {
            "bersih": ("Uang Muka dan Pembatalan", "Apabila perjanjian batal karena kesalahan PENJUAL, PENJUAL wajib mengembalikan uang muka seluruhnya kepada PEMBELI dalam 7 (tujuh) hari kerja. Apabila batal karena kesalahan PEMBELI, PENJUAL berhak menahan paling banyak 10% (sepuluh persen) dari harga sebagai ganti kerugian yang wajar dan sisanya dikembalikan kepada PEMBELI."),
            ("K1", "high"): ("Uang Muka dan Pembatalan", "Uang muka yang telah dibayarkan PEMBELI tidak dapat dikembalikan dengan alasan apa pun, termasuk apabila pembatalan terjadi karena kesalahan PENJUAL atau karena tanah ternyata tidak dapat dialihkan."),
            ("K1", "low"): ("Uang Muka dan Pembatalan", "Apabila pembatalan terjadi karena kesalahan PEMBELI, uang muka hangus sebesar 50% (lima puluh persen) dari nilai uang muka, sedangkan sisanya dikembalikan dalam 14 (empat belas) hari kerja. Apabila pembatalan karena kesalahan PENJUAL, uang muka dikembalikan seluruhnya."),
        },
        "jaminan": {
            "bersih": ("Jaminan PENJUAL", "PENJUAL menjamin bahwa tanah tersebut adalah miliknya yang sah, tidak sedang dalam sengketa, tidak disita, dan tidak sedang dijaminkan kepada pihak mana pun. PENJUAL wajib membebaskan PEMBELI dari tuntutan pihak lain atas tanah tersebut."),
            ("K3", "high"): ("Jaminan PENJUAL", "PEMBELI menerima tanah dalam keadaan apa adanya. PENJUAL tidak memberikan jaminan apa pun mengenai status tanah, termasuk adanya sengketa, sitaan, atau pembebanan hak tanggungan, dan PEMBELI melepaskan haknya untuk menuntut PENJUAL atas hal tersebut."),
        },
        "pajak": {
            "bersih": ("Pajak dan Biaya", "Pajak Penghasilan (PPh) atas pengalihan hak dibayar oleh PENJUAL, sedangkan Bea Perolehan Hak atas Tanah dan Bangunan (BPHTB) dibayar oleh PEMBELI. Kedua pihak menyerahkan bukti pembayaran pajak kepada PPAT sebelum penandatanganan Akta Jual Beli. Biaya PPAT dan biaya balik nama ditanggung PEMBELI."),
            ("K5", "medium"): ("Pajak dan Biaya", "Seluruh pajak, bea, dan biaya yang timbul atas jual beli ini ditanggung oleh pihak yang akan ditentukan kemudian oleh PENJUAL, dan besarnya mengikuti perhitungan PENJUAL."),
            ("K5", "low"): ("Pajak dan Biaya", "Biaya PPAT dan biaya balik nama dibagi dua antara PENJUAL dan PEMBELI, sedangkan pembagian pajak lainnya akan dibicarakan kemudian oleh para pihak."),
        },
        "peralihan": {
            "bersih": ("Peralihan Hak", "Peralihan hak atas tanah dilakukan dengan Akta Jual Beli yang dibuat di hadapan Pejabat Pembuat Akta Tanah (PPAT) yang berwenang, dan PPAT mendaftarkan peralihan hak tersebut ke Kantor Pertanahan sesuai ketentuan peraturan perundang-undangan."),
            ("K4", "high"): ("Peralihan Hak", "Jual beli ini dianggap sah dan lengkap dengan penandatanganan perjanjian ini dan kuitansi bermeterai. Para pihak sepakat tidak membuat Akta Jual Beli di hadapan PPAT, dan balik nama sertifikat baru akan diurus apabila PEMBELI merasa perlu."),
        },
        "waktu": {
            "bersih": ("Waktu Pelaksanaan", "Penyerahan tanah dan dokumen dilakukan paling lambat 14 Juli 2026 setelah pelunasan. Penandatanganan Akta Jual Beli dilakukan paling lambat 30 (tiga puluh) hari sejak perjanjian ini ditandatangani."),
            ("K7", "medium"): ("Waktu Pelaksanaan", "Penyerahan tanah dan penandatanganan Akta Jual Beli dilakukan pada waktu yang akan ditentukan kemudian oleh PENJUAL, setelah PENJUAL siap."),
        },
        "wanprestasi": {
            "bersih": ("Wanprestasi", "Apabila salah satu pihak terlambat memenuhi kewajibannya, pihak lainnya memberikan teguran tertulis dan kesempatan memperbaiki selama 14 (empat belas) hari sebelum menuntut ganti kerugian yang wajar."),
            ("K6", "medium"): ("Wanprestasi", "Apabila PEMBELI terlambat membayar, PEMBELI dikenakan denda sebesar 5% (lima persen) dari harga jual beli untuk setiap hari keterlambatan tanpa batas maksimum, sedangkan keterlambatan PENJUAL tidak menimbulkan denda apa pun."),
        },
        "sengketa": {
            "bersih": ("Penyelesaian Perselisihan", "Perselisihan yang timbul diselesaikan secara musyawarah untuk mufakat; jika tidak tercapai, diselesaikan melalui Pengadilan Negeri Bandung."),
        },
    }

SEWA = {
    "objek": {"bersih": ("Objek Sewa", "PEMILIK menyewakan kepada PENYEWA sebidang tanah berdasarkan Sertifikat Hak Milik (SHM) No. 05678/Cihapit atas nama PEMILIK, seluas 500 m² (lima ratus meter persegi), terletak di Jalan Cihapit, Kelurahan Cihapit, Kota Bandung, dengan batas-batas sebagaimana tercantum dalam Surat Ukur, untuk digunakan sebagai tempat usaha."),},
    "jangka": {
        "bersih": ("Jangka Waktu Sewa", "Jangka waktu sewa adalah 5 (lima) tahun terhitung sejak 1 Agustus 2026 sampai dengan 31 Juli 2031, dan dapat diperpanjang dengan kesepakatan tertulis kedua pihak."),
        ("K7", "medium"): ("Jangka Waktu Sewa", "Jangka waktu sewa dimulai sejak tanah diserahkan kepada PENYEWA dan berakhir pada saat yang ditentukan oleh PEMILIK."),
    },
    "uang": {
        "bersih": ("Uang Sewa", "Uang sewa ditetapkan sebesar Rp50.000.000,00 (lima puluh juta rupiah) per tahun, dibayar setiap awal tahun sewa."),
        ("K6", "high"): ("Uang Sewa", "Uang sewa untuk seluruh masa sewa dibayar di muka sekaligus dan tidak dapat dikembalikan dalam keadaan apa pun, termasuk apabila PEMILIK memutus sewa sebelum jangka waktu berakhir."),
    },
    "kenaikan": {
        "bersih": ("Perubahan Uang Sewa", "Uang sewa tidak berubah selama jangka waktu sewa kecuali disepakati tertulis oleh kedua pihak, dengan kenaikan paling banyak 10% (sepuluh persen) pada saat perpanjangan."),
        ("K6", "high"): ("Perubahan Uang Sewa", "PEMILIK berhak menaikkan uang sewa sewaktu-waktu secara sepihak tanpa batas persentase. PENYEWA wajib membayar kenaikan tersebut dalam 3 (tiga) hari, jika tidak tanah wajib dikosongkan tanpa ganti rugi atas bangunan yang telah didirikan PENYEWA."),
    },
    "penggunaan": {"bersih": ("Penggunaan Tanah", "PENYEWA menggunakan tanah sebagai tempat usaha sesuai peruntukannya, tidak mengalihkan sewa kepada pihak lain tanpa persetujuan tertulis PEMILIK, dan mengembalikan tanah dalam keadaan baik pada saat sewa berakhir."),},
    "pemutusan": {"bersih": ("Pengakhiran Sewa", "Masing-masing pihak dapat mengakhiri sewa dengan pemberitahuan tertulis 60 (enam puluh) hari sebelumnya; uang sewa yang telah dibayar untuk sisa waktu dikembalikan secara proporsional."),},
    "pajak": {"bersih": ("Pajak", "Pajak Bumi dan Bangunan atas tanah ditanggung oleh PEMILIK, sedangkan izin dan pajak atas kegiatan usaha PENYEWA ditanggung oleh PENYEWA."),},
    "sengketa": {"bersih": ("Penyelesaian Perselisihan", "Perselisihan diselesaikan secara musyawarah; jika tidak tercapai, diselesaikan melalui Pengadilan Negeri Bandung."),},
}

JB_URUTAN = ["objek", "harga", "dp", "jaminan", "pajak", "peralihan", "waktu", "wanprestasi", "sengketa"]
SEWA_URUTAN = ["objek", "jangka", "uang", "kenaikan", "penggunaan", "pemutusan", "pajak", "sengketa"]

# id, berkas, jenis, para pihak, {kunci_klausul: (kategori, level)}
DOKUMEN = [
    ("D01", "D01_jual_beli_bersih", "jual_beli", ("Budi Santoso", "Sari Wulandari"), {}),
    ("D02", "D02_jual_beli_dp_hangus", "jual_beli", ("Agus Prasetyo", "Dewi Lestari"), {"dp": ("K1", "high"), "waktu": ("K7", "medium")}),
    ("D03", "D03_jual_beli_objek_tidak_jelas", "jual_beli", ("Hendra Wijaya", "Maya Anggraini"), {"objek": ("K2", "high"), "jaminan": ("K3", "high")}),
    ("D04", "D04_jual_beli_tanpa_ppat", "jual_beli", ("Rudi Hartono", "Lina Marlina"), {"pajak": ("K5", "medium"), "peralihan": ("K4", "high")}),
    ("D05", "D05_jual_beli_pembeli_asing", "jual_beli", ("Taufik Ramadhan", "John Smith (warga negara asing)"), {"objek": ("K8", "high"), "wanprestasi": ("K6", "medium")}),
    ("D06", "D06_sewa_memberatkan", "sewa", ("Ny. Siti Rahmawati", "Bambang Kusuma"), {"jangka": ("K7", "medium"), "uang": ("K6", "high"), "kenaikan": ("K6", "high")}),
    ("D07", "D07_sewa_bersih", "sewa", ("Ir. Joko Susilo", "Fitri Handayani"), {}),
    ("D08", "D08_jual_beli_risiko_ringan", "jual_beli", ("Eko Nugroho", "Ratna Sari"), {"objek": ("K2", "medium"), "dp": ("K1", "low"), "pajak": ("K5", "low")}),
]

TANGGAL = {"D01": "3 Juni 2026", "D02": "10 Juni 2026", "D03": "17 Juni 2026", "D04": "24 Juni 2026", "D05": "1 Juli 2026",
           "D06": "8 Juli 2026", "D07": "15 Juli 2026", "D08": "22 Juli 2026"}


def susun(did, jenis, pihak, risiko):
    """Kembalikan (judul, pembuka, [(nomor, judul, teks, label)], kunci_jawaban)."""
    if jenis == "jual_beli":
        lib, urutan, judul = jb(*pihak), JB_URUTAN, "PERJANJIAN JUAL BELI TANAH"
        a, b, sa, sb = "PENJUAL", "PEMBELI", pihak[0], pihak[1]
        alamat = ("Jalan Melati No. 12, Bandung", "Jalan Kenanga No. 7, Bandung")
    else:
        lib, urutan, judul = SEWA, SEWA_URUTAN, "PERJANJIAN SEWA TANAH"
        a, b, sa, sb = "PEMILIK", "PENYEWA", pihak[0], pihak[1]
        alamat = ("Jalan Dago No. 21, Bandung", "Jalan Riau No. 5, Bandung")
    pembuka = (f"Pada hari ini, tanggal {TANGGAL[did]}, bertempat di Kota Bandung, yang bertanda tangan di bawah ini: "
               f"1. {sa}, bertempat tinggal di {alamat[0]}, selanjutnya disebut {a}; "
               f"2. {sb}, bertempat tinggal di {alamat[1]}, selanjutnya disebut {b}. "
               f"Para pihak sepakat mengikatkan diri dalam perjanjian ini dengan ketentuan sebagai berikut:")
    pasal, kunci = [], []
    for n, k in enumerate(urutan, 1):
        var = risiko.get(k)
        jd, teks = lib[k][var if var else "bersih"]
        label = None
        if var:
            cat = next(t for t in TAKSONOMI if t["id"] == var[0])
            label = {"pasal": f"Pasal {n}", "kategori_id": var[0], "kategori": cat["nama"], "level": var[1], "kutipan_kunci": teks.split(". ")[0][:160]}
            kunci.append(label)
        pasal.append((n, jd, teks, label))
    return judul, pembuka, pasal, kunci


def tulis_pdf(path, judul, pembuka, pasal, meta_judul):
    doc = fitz.open()
    W, H, M, LH = 595, 842, 64, 15
    state = {"page": None, "y": 0}
    def baru():
        state["page"] = doc.new_page(width=W, height=H); state["y"] = M
    def baris(teks, font="helv", size=10.5, indent=0):
        maks = W - 2 * M - indent
        kata, cur, hasil = teks.split(), "", []
        for k in kata:
            t = (cur + " " + k).strip()
            if fitz.get_text_length(t, fontname=font, fontsize=size) <= maks: cur = t
            else: hasil.append(cur); cur = k
        if cur: hasil.append(cur)
        for h in hasil:
            if state["y"] > H - M: baru()
            state["page"].insert_text((M + indent, state["y"]), h, fontname=font, fontsize=size); state["y"] += LH
    baru()
    state["page"].insert_text((W / 2 - fitz.get_text_length(judul, fontname="hebo", fontsize=14) / 2, state["y"]), judul, fontname="hebo", fontsize=14)
    state["y"] += 28
    baris(pembuka); state["y"] += 8
    for n, jd, teks, _ in pasal:
        if state["y"] > H - M - 60: baru()
        baris(f"Pasal {n}", "hebo", 11); baris(jd, "hebo", 10.5); baris(teks); state["y"] += 8
    state["y"] += 10
    baris("Demikian perjanjian ini dibuat dan ditandatangani oleh para pihak di atas materai yang cukup.")
    doc.set_metadata({"title": meta_judul, "subject": "DATA SINTETIS untuk pengujian; bukan perjanjian sungguhan", "author": "Data Engineer KOMPRES16"})
    doc.save(path); doc.close()


def main():
    (OUT / "pdf").mkdir(parents=True, exist_ok=True)
    gt = {"_catatan": "Kunci jawaban dokumen sintetis. Pelabelan = penilaian perancang dataset untuk uji, bukan nasihat hukum. Draf taksonomi perlu disepakati dengan AI Engineer.",
          "dokumen": []}
    for did, berkas, jenis, pihak, risiko in DOKUMEN:
        judul, pembuka, pasal, kunci = susun(did, jenis, pihak, risiko)
        path = OUT / "pdf" / f"{berkas}.pdf"
        tulis_pdf(path, judul, pembuka, pasal, f"{judul} ({did}, sintetis)")
        gt["dokumen"].append({"id": did, "berkas": f"pdf/{berkas}.pdf", "jenis": jenis,
                              "pasal_total": [f"Pasal {n}" for n, *_ in pasal], "risks": kunci,
                              "pasal_aman": [f"Pasal {n}" for n, _, _, lab in pasal if lab is None]})
    (OUT / "ground_truth.json").write_text(json.dumps(gt, ensure_ascii=False, indent=1))
    (OUT / "taksonomi_risiko.json").write_text(json.dumps({"_status": "DRAF untuk disepakati dengan AI Engineer", "level": ["low", "medium", "high"],
                                                            "kategori": TAKSONOMI}, ensure_ascii=False, indent=1))
    n_risk = sum(len(d["risks"]) for d in gt["dokumen"])
    print(f"{len(gt['dokumen'])} dokumen, {n_risk} pasal berisiko, {sum(len(d['pasal_aman']) for d in gt['dokumen'])} pasal aman -> {OUT}")

if __name__ == "__main__":
    main()
