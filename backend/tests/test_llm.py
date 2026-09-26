import unittest
from unittest import mock

from google.genai import errors

from chatbot import llm as modul_llm
from chatbot.llm import GeminiLLM, kuota_harian_habis


def _err(code, pesan):
    return errors.APIError(code, {"error": {"code": code, "message": pesan, "status": "X"}})


class _Klien:
    """Meniru client.models.generate_content: melempar error berurutan, lalu sukses."""

    def __init__(self, *errs):
        self.errs = list(errs)
        self.panggilan = 0
        self.models = self

    def generate_content(self, **kw):
        self.panggilan += 1
        if self.errs:
            raise self.errs.pop(0)
        return mock.Mock(text='{"ok": true}')


def _llm(klien):
    g = object.__new__(GeminiLLM)  # lewati __init__ (butuh API key)
    g._client, g._model = klien, "model-tes"
    return g


class TestRetry(unittest.TestCase):
    def setUp(self):
        p = mock.patch.object(modul_llm.time, "sleep")
        self.sleep = p.start()
        self.addCleanup(p.stop)

    def test_deteksi_kuota_harian(self):
        harian = _err(429, "Quota exceeded ... GenerateRequestsPerDayPerProjectPerModel-FreeTier")
        per_menit = _err(429, "Quota exceeded ... GenerateRequestsPerMinutePerProjectPerModel")
        self.assertTrue(kuota_harian_habis(harian))
        self.assertFalse(kuota_harian_habis(per_menit))
        self.assertFalse(kuota_harian_habis(_err(503, "PerDay tapi bukan 429")))

    def test_kuota_harian_gagal_cepat_tanpa_retry(self):
        k = _Klien(_err(429, "GenerateRequestsPerDayPerProjectPerModel-FreeTier"))
        with self.assertRaises(errors.APIError):
            _llm(k).generate_json("s", "u")
        self.assertEqual(k.panggilan, 1)
        self.sleep.assert_not_called()

    def test_503_diulang_lalu_berhasil(self):
        k = _Klien(_err(503, "high demand"), _err(503, "high demand"))
        self.assertEqual(_llm(k).generate_json("s", "u"), {"ok": True})
        self.assertEqual(k.panggilan, 3)

    def test_429_per_menit_diulang(self):
        k = _Klien(_err(429, "GenerateRequestsPerMinutePerProjectPerModel"))
        self.assertEqual(_llm(k).generate_json("s", "u"), {"ok": True})
        self.assertEqual(k.panggilan, 2)

    def test_error_lain_tidak_diulang(self):
        k = _Klien(_err(404, "model tidak ada"))
        with self.assertRaises(errors.APIError):
            _llm(k).generate_json("s", "u")
        self.assertEqual(k.panggilan, 1)

    def test_batas_percobaan(self):
        k = _Klien(*[_err(503, "sibuk")] * 5)
        with self.assertRaises(errors.APIError):
            _llm(k).generate_json("s", "u")
        self.assertEqual(k.panggilan, modul_llm.MAX_PERCOBAAN)


if __name__ == "__main__":
    unittest.main()
