"""Samarkan data pribadi sebelum teks dikirim ke LLM (UU PDP No. 27/2022), lalu kembalikan ke hasil.

Yang disamarkan: NIK, NPWP, nomor telepon, email. Nama orang dan alamat TIDAK disamarkan
(tidak bisa dikenali andal dengan aturan sederhana); itu batasan yang perlu disebut di proposal.
"""
import re

_POLA = [
    ("NIK", re.compile(r"(?<!\d)\d{16}(?!\d)")),
    ("NPWP", re.compile(r"(?<!\d)\d{2}\.\d{3}\.\d{3}\.\d-\d{3}\.\d{3}(?!\d)")),
    ("TELEPON", re.compile(r"(?<![\d.])(?:\+62|62|0)8\d{8,11}(?!\d)")),
    ("EMAIL", re.compile(r"[\w.+-]+@[\w-]+(?:\.[\w-]+)+")),
]


def samarkan(teks: str) -> tuple[str, dict[str, str]]:
    """Ganti data pribadi dengan placeholder unik ([NIK_1], ...). Nilai sama -> placeholder sama."""
    peta: dict[str, str] = {}
    urutan: dict[str, int] = {}

    def pengganti(label: str):
        def _ganti(m: re.Match) -> str:
            asli = m.group(0)
            for kode, nilai in peta.items():
                if nilai == asli:
                    return kode
            urutan[label] = urutan.get(label, 0) + 1
            kode = f"[{label}_{urutan[label]}]"
            peta[kode] = asli
            return kode

        return _ganti

    for label, pola in _POLA:
        teks = pola.sub(pengganti(label), teks)
    return teks, peta


def kembalikan(teks: str, peta: dict[str, str]) -> str:
    for kode, asli in peta.items():
        teks = teks.replace(kode, asli)
    return teks
