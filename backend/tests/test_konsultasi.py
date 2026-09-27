import unittest

from analisis.konsultasi import PEMETAAN_KATEGORI, saran_kategori_kasus


def risiko(kategori, level="high"):
    return {"pasal": "Pasal 1", "kutipan": "x", "kategori": kategori, "level": level, "alasan": "x"}


class TestSaranKategoriKasus(unittest.TestCase):
    def test_kategori_terpetakan_disarankan(self):
        for nama, id_kasus in PEMETAAN_KATEGORI.items():
            self.assertEqual(saran_kategori_kasus([risiko(nama)]), [id_kasus])

    def test_hanya_level_high(self):
        nama = next(iter(PEMETAAN_KATEGORI))
        self.assertEqual(saran_kategori_kasus([risiko(nama, "medium")]), [])
        self.assertEqual(saran_kategori_kasus([risiko(nama, "low")]), [])

    def test_kategori_tak_terpetakan_dilewati(self):
        self.assertEqual(saran_kategori_kasus([risiko("Pajak dan biaya tidak jelas")]), [])
        self.assertEqual(saran_kategori_kasus([risiko("Kategori asal-asalan")]), [])

    def test_duplikat_kategori_kasus_tidak_diulang(self):
        # "Subjek hak tidak memenuhi syarat" & "Hilangnya hak somasi/upaya hukum" -> sengketa-tanah, sama-sama
        r = [risiko("Subjek hak tidak memenuhi syarat"), risiko("Hilangnya hak somasi/upaya hukum")]
        self.assertEqual(saran_kategori_kasus(r), ["sengketa-tanah"])

    def test_urutan_kemunculan_dipertahankan(self):
        r = [risiko("Kuasa mutlak yang berisiko disalahgunakan"), risiko("Peralihan hak tanpa akta PPAT")]
        self.assertEqual(saran_kategori_kasus(r), ["mafia-tanah", "balik-nama"])

    def test_daftar_kosong_atau_none(self):
        self.assertEqual(saran_kategori_kasus([]), [])
        self.assertEqual(saran_kategori_kasus(None), [])

    def test_item_bukan_dict_dilewati(self):
        self.assertEqual(saran_kategori_kasus(["bukan dict"]), [])


if __name__ == "__main__":
    unittest.main()
