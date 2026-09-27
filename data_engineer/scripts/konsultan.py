"""Direktori konsultan profesional (Notaris/PPAT + Advokat) untuk fitur "Konsultasi Profesional".

STATUS: data/konsultan/*.json berisi data DUMMY (fiktif), belum data asli. Lihat scripts/10_make_konsultan_dummy.py
dan data_engineer/README.md bagian "Fitur Konsultasi Profesional" untuk rencana menuju data asli (pendaftaran
mandiri mitra, bukan scraping).

    from konsultan import cari_konsultan, kategori_kasus
    cari_konsultan("sengketa-tanah")             # -> notaris_ppat=[] (bukan ranahnya), advokat=[...]
    cari_konsultan("waris", provinsi="Jawa Barat")
"""
from __future__ import annotations
import json
from pathlib import Path

DIR = Path(__file__).resolve().parent.parent / "data/konsultan"
_cache: dict = {}


def _load(nama: str) -> dict:
    if nama not in _cache:
        _cache[nama] = json.loads((DIR / f"{nama}.json").read_text(encoding="utf-8"))
    return _cache[nama]


def kategori_kasus() -> list[dict]:
    """Daftar kategori kasus, tiap item: {id, nama, profesi: ['notaris_ppat'|'advokat', ...], catatan?}."""
    return _load("kategori_kasus")["kategori_kasus"]


def _filter(konsultan: list[dict], kategori_id: str, provinsi: str | None, kota: str | None, top_n: int) -> list[dict]:
    hasil = [k for k in konsultan if kategori_id in k["kategori_kasus"]]
    if provinsi: hasil = [k for k in hasil if k["provinsi"].lower() == provinsi.lower()]
    if kota: hasil = [k for k in hasil if k["kota"].lower() == kota.lower()]
    return hasil[:top_n]


def cari_konsultan(kategori_id: str, provinsi: str | None = None, kota: str | None = None, top_n: int = 5) -> dict:
    """Cari konsultan (dummy) untuk suatu kategori kasus, di kedua profesi sekaligus.

    Return: {"kategori": str, "catatan": str|None, "notaris_ppat": [...], "advokat": [...], "peringatan": str}
    - list untuk profesi yang TIDAK relevan pada kategori ini SELALU kosong (mis. 'sengketa-tanah' -> notaris_ppat=[]),
      bukan bug: Notaris/PPAT tidak beracara di pengadilan dan bukan penegak hukum. Jangan menampilkan Notaris
      untuk kasus itu meski daftarnya diisi manual nanti.
    - Tiap konsultan (notaris_ppat/advokat) punya field 'telepon', 'peta', 'jadwal', 'tarif' -- SEMUA dummy dan
      berbeda PER ORANG (tarif diputar dari 3 tingkatan, bukan cerminan kualitas asli). Lihat _PERINGATAN dan
      komentar di scripts/10_make_konsultan_dummy.py sebelum ditampilkan ke pengguna.
    - Semua entri berasal dari data dummy; 'peringatan' selalu disertakan dan wajib ditampilkan ke pengguna.
    """
    kat = next((k for k in kategori_kasus() if k["id"] == kategori_id), None)
    peringatan = _load("kategori_kasus")["_PERINGATAN"]
    if kat is None:
        return {"kategori": None, "catatan": f"Kategori '{kategori_id}' tidak dikenal.", "notaris_ppat": [], "advokat": [], "peringatan": peringatan}
    profesi = kat["profesi"]
    notaris = _filter(_load("notaris_ppat_dummy")["konsultan"], kategori_id, provinsi, kota, top_n) if "notaris_ppat" in profesi else []
    advokat = _filter(_load("advokat_dummy")["konsultan"], kategori_id, provinsi, kota, top_n) if "advokat" in profesi else []
    return {"kategori": kat["nama"], "catatan": kat.get("catatan"), "notaris_ppat": notaris, "advokat": advokat, "peringatan": peringatan}
