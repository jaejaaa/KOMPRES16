import unittest
from pathlib import Path

from analisis import analyze
from analisis.analyzer import _bagi_bagian
from analisis.masking import kembalikan, samarkan

CONTOH = (Path(__file__).parent.parent / "analisis" / "contoh" / "ppjb_berisiko.txt").read_text(encoding="utf-8")
K4 = "Uang muka yang telah dibayarkan tidak dapat dikembalikan dengan alasan apa pun dan menjadi hangus seluruhnya"


def risiko(pasal="Pasal 4", kutipan=K4, kategori="Uang muka (DP) hangus tanpa syarat jelas",
           level="high", alasan="DP hangus walau kesalahan penjual.", **extra):
    return {"pasal": pasal, "kutipan": kutipan, "kategori": kategori, "level": level, "alasan": alasan, **extra}


class FakeLLM:
    def __init__(self, *jawaban, error=False):
        self.jawaban = list(jawaban)
        self.prompts = []
        self.error = error

    def generate_json(self, system, user):
        self.prompts.append(user)
        if self.error:
            raise RuntimeError("boom")
        return self.jawaban.pop(0) if len(self.jawaban) > 1 else self.jawaban[0]


def jalankan(*risks, ringkasan="Perjanjian jual beli tanah.", teks=CONTOH, **kw):
    return analyze(teks, llm=FakeLLM({"ringkasan": ringkasan, "risks": list(risks)}), **kw)


class TestMasking(unittest.TestCase):
    def test_samarkan_dan_kembalikan(self):
        teks = "NIK 3273010101900001, telp 081234567890, email a.b@x.co.id, NPWP 12.345.678.9-012.345"
        aman, peta = samarkan(teks)
        for asli in ("3273010101900001", "081234567890", "a.b@x.co.id", "12.345.678.9-012.345"):
            self.assertNotIn(asli, aman)
        self.assertEqual(kembalikan(aman, peta), teks)

    def test_nilai_sama_placeholder_sama(self):
        aman, peta = samarkan("NIK 3273010101900001 dan lagi 3273010101900001")
        self.assertEqual(len(peta), 1)

    def test_data_pribadi_tidak_dikirim_ke_llm(self):
        llm = FakeLLM({"ringkasan": "Ok [NIK_1]", "risks": []})
        hasil = analyze(CONTOH, llm=llm)
        semua = " ".join(llm.prompts)
        for asli in ("3273010101900001", "081234567890", "sari.lestari@example.com"):
            self.assertNotIn(asli, semua)
        self.assertIn("3273010101900001", hasil["summary"])  # dikembalikan di hasil


class TestPemecah(unittest.TestCase):
    def test_rujukan_pasal_di_tengah_kalimat_tidak_memecah(self):
        teks = "Pasal 1\nIsi satu.\nPasal 2\nSebagaimana dimaksud dalam Pasal 1 maka berlaku.\n"
        self.assertEqual(len(_bagi_bagian(teks, 10_000)), 1)
        self.assertEqual(len(_bagi_bagian(teks, 60)), 2)

    def test_dokumen_panjang_dipecah_dan_ringkasan_digabung(self):
        llm = FakeLLM(
            {"ringkasan": "Bagian A.", "risks": [risiko()]},
            {"ringkasan": "Bagian B.", "risks": []},
            {"ringkasan": "Ringkasan gabungan."},
        )
        hasil = analyze(CONTOH, llm=llm, maks_karakter=1500)
        self.assertGreaterEqual(len(llm.prompts), 3)
        self.assertEqual(hasil["summary"], "Ringkasan gabungan.")


class TestAnalyze(unittest.TestCase):
    def test_kontrak_keluaran(self):
        h = jalankan(risiko(), risiko("Pasal 2", "Batas-batas tanah akan ditentukan kemudian oleh PIHAK PERTAMA.",
                                      "Ketidakjelasan objek tanah", "medium", "Batas tanah belum jelas."))
        self.assertEqual(set(h), {"summary", "risks"})
        for r in h["risks"]:
            self.assertEqual(set(r), {"pasal", "kutipan", "kategori", "level", "alasan"})
            self.assertIn(r["level"], ("low", "medium", "high"))
        self.assertEqual([r["level"] for r in h["risks"]], ["high", "medium"])  # merah dulu

    def test_kutipan_karangan_dibuang(self):
        h = jalankan(risiko(kutipan="Penjual wajib membayar ganti rugi sepuluh miliar rupiah kepada pembeli."))
        self.assertEqual(h["risks"], [])

    def test_kutipan_parafrase_dikoreksi_ke_kalimat_asli(self):
        h = jalankan(risiko(kutipan="Uang muka tidak bisa dikembalikan dan hangus semuanya"))
        self.assertEqual(len(h["risks"]), 1)
        self.assertIn(K4, h["risks"][0]["kutipan"])

    def test_kategori_dan_level_dinormalisasi(self):
        h = jalankan(risiko(kategori="uang muka (dp) hangus tanpa syarat jelas", level="Tinggi"))
        self.assertEqual((h["risks"][0]["kategori"], h["risks"][0]["level"]),
                         ("Uang muka (DP) hangus tanpa syarat jelas", "high"))

    def test_kategori_di_luar_taksonomi_dibuang(self):
        self.assertEqual(jalankan(risiko(kategori="Risiko lain-lain"))["risks"], [])
        self.assertEqual(jalankan(risiko(level="parah"))["risks"], [])

    def test_duplikat_dipertahankan_yang_terparah(self):
        h = jalankan(risiko(level="low"), risiko(level="high"))
        self.assertEqual([r["level"] for r in h["risks"]], ["high"])

    def test_absen_hanya_untuk_kategori_jaminan(self):
        ok = jalankan({"kategori": "Tidak ada jaminan bebas sengketa/sita", "level": "high",
                       "alasan": "Tidak ada jaminan bebas sengketa.", "absen": True})
        self.assertEqual(ok["risks"][0]["pasal"], "Tidak ada klausul")
        tidak = jalankan({"kategori": "Klausul pembatalan sepihak", "level": "high",
                          "alasan": "x", "absen": True})
        self.assertEqual(tidak["risks"], [])

    def test_dokumen_kosong_atau_pendek_error(self):
        for teks in ("", "   ", "terlalu pendek"):
            with self.assertRaises(ValueError):
                analyze(teks, llm=FakeLLM({"ringkasan": "x", "risks": []}))

    def test_error_llm_diteruskan(self):
        with self.assertRaises(RuntimeError):
            analyze(CONTOH, llm=FakeLLM(error=True))

    def test_keluaran_llm_bukan_dict_error(self):
        with self.assertRaises(ValueError):
            analyze(CONTOH, llm=FakeLLM(["bukan", "dict"]))

    def test_ringkasan_kosong_pakai_cadangan(self):
        self.assertTrue(jalankan(ringkasan="")["summary"])


if __name__ == "__main__":
    unittest.main()
