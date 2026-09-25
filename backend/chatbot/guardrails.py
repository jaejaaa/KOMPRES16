"""Guardrail sebelum LLM dipanggil (lapis 1) dan template jawaban tetap."""
import re

from . import config

DISCLAIMER = "Jawaban ini bersifat informatif, bukan pengganti nasihat hukum resmi."

PESAN_DI_LUAR_CAKUPAN = (
    "Pertanyaan ini di luar cakupan basis pengetahuan saya yang berfokus pada "
    "hukum pertanahan dan fitur aplikasi ini. Disarankan konsultasi dengan "
    "notaris/PPAT atau advokat untuk kepastian lebih lanjut."
)
PESAN_INJEKSI = (
    "Maaf, saya hanya bisa membantu seputar hukum pertanahan dan penggunaan "
    "aplikasi ini. Silakan ajukan pertanyaan terkait topik tersebut."
)
PESAN_SAPAAN = (
    "Halo! Saya asisten hukum pertanahan. Anda bisa bertanya soal sertifikat "
    "tanah (SHM/HGB), jual beli, balik nama, pajak (BPHTB), atau isi dokumen "
    "yang Anda unggah."
)
PESAN_IDENTITAS = (
    "Saya asisten AI hukum pertanahan di aplikasi ini. Saya membantu "
    "menjelaskan regulasi dan dokumen pertanahan berdasarkan basis pengetahuan "
    "yang tersedia."
)
PESAN_ERROR = "Maaf, layanan sedang bermasalah. Silakan coba lagi beberapa saat."
CATATAN_SENSITIF = (
    "\n\nCatatan: hasil perkara sangat bergantung pada fakta dan bukti lengkap. "
    "Untuk keputusan hukum yang konkret (mis. menggugat atau membatalkan "
    "perjanjian), konsultasikan dengan notaris/advokat."
)

_INJEKSI = re.compile(
    r"(abaikan|lupakan|ignore|disregard).{0,30}(instruksi|perintah|aturan|instruction|prompt|rules?)"
    r"|system\s*prompt|prompt\s*(sistem|kamu|mu)|jailbreak|developer\s*mode|(?-i:\bDAN\b)"
    r"|(berperan|bertindak|berpura-pura|pretend|act)\s+(sebagai|as|like)"
    r"|(kamu|anda|you)\s+(sekarang|are now)",
    re.IGNORECASE,
)
_SENSITIF = re.compile(
    r"\b(menang|kalah|pasti\s+(menang|berhasil|bisa)|dipenjara|penjara|"
    r"menggugat|gugat|tuntut|lapor(kan)?\s+polisi)\b",
    re.IGNORECASE,
)
_SAPAAN = re.compile(
    r"^\s*(halo|hai|hi|hello|selamat\s+(pagi|siang|sore|malam)|terima\s*kasih|makasih|thanks?)\W*$",
    re.IGNORECASE,
)
_IDENTITAS = re.compile(
    r"^\s*(kamu|anda|lu|lo)\s+(itu\s+)?siapa\W*$|^\s*siapa\s+(kamu|anda|lu|lo)\W*$|"
    r"^\s*(kamu|anda)\s+(itu\s+)?(bisa\s+)?apa\W*$",
    re.IGNORECASE,
)


def cek_input(pertanyaan: str) -> str | None:
    """Balikkan pesan tetap kalau input harus ditolak/dijawab tanpa LLM, else None."""
    p = (pertanyaan or "").strip()
    if not p:
        return PESAN_DI_LUAR_CAKUPAN
    if len(p) > config.MAX_PERTANYAAN_CHARS:
        return "Pertanyaan terlalu panjang. Mohon ringkas pertanyaan Anda."
    if _INJEKSI.search(p):
        return PESAN_INJEKSI
    return None


def jawaban_tetap(pertanyaan: str) -> str | None:
    if _SAPAAN.match(pertanyaan):
        return PESAN_SAPAAN
    if _IDENTITAS.match(pertanyaan):
        return PESAN_IDENTITAS
    return None


def is_sensitif(pertanyaan: str) -> bool:
    return bool(_SENSITIF.search(pertanyaan))
