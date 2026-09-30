import difflib
import re

from chatbot.llm import LLM

from .masking import kembalikan, samarkan
from .prompts import (
    SYSTEM_PROMPT,
    SYSTEM_PROMPT_GABUNG,
    SYSTEM_PROMPT_RELEVANSI,
    prompt_bagian,
    prompt_gabung,
    prompt_relevansi,
)
from .taksonomi import KATEGORI_BOLEH_ABSEN, petakan_kategori, petakan_level

MAKS_KARAKTER_BAGIAN = 12000  # dokumen lebih panjang dipecah per kelompok pasal
MIN_KARAKTER_DOKUMEN = 50
MAKS_KUTIPAN = 400
MAKS_KARAKTER_SAMPEL_RELEVANSI = 3000  # cukup buat judul + para pihak; hemat token
KUTIPAN_ABSEN = "(klausul ini tidak ditemukan dalam dokumen)"
PASAL_ABSEN = "Tidak ada klausul"
PESAN_TIDAK_RELEVAN = (
    "Fitur ini memeriksa perjanjian/akta pertanahan pribadi (PPJB, AJB, akta hibah, sewa tanah, "
    "sertifikat, dsb), bukan teks undang-undang/peraturan itu sendiri. Kalau dokumen Anda adalah "
    "salinan UU/PP (mis. UUPA, KUHPerdata) atau dokumen lain di luar itu, silakan tanyakan isinya "
    "lewat JagaTanah AI (chatbot), atau unggah dokumen perjanjian yang sesuai."
)


class DokumenTidakRelevan(ValueError):
    """Dokumen bukan dokumen hukum pertanahan/properti (di luar cakupan aplikasi)."""


_llm_default: LLM | None = None
_URUTAN_LEVEL = {"high": 0, "medium": 1, "low": 2}
_AWAL_PASAL = re.compile(r"(?m)(?=^[ \t]*Pasal\s+\d+\b)")  # "Pasal N" di awal baris (bukan rujukan di tengah kalimat)


def _get_llm() -> LLM:
    global _llm_default
    if _llm_default is None:
        from chatbot.llm import GeminiLLM

        _llm_default = GeminiLLM()
    return _llm_default


def _norm(s: str) -> str:
    return re.sub(r"\s+", " ", s).strip().lower()


def _bagi_bagian(teks: str, maks: int) -> list[str]:
    """Pecah per 'Pasal N' lalu kelompokkan sampai batas karakter (fallback: per paragraf)."""
    potongan = [p for p in _AWAL_PASAL.split(teks) if p.strip()]
    if len(potongan) <= 1:
        potongan = [p for p in re.split(r"\n\s*\n", teks) if p.strip()]
    grup, cur = [], ""
    for p in potongan:
        while len(p) > maks:  # satu pasal raksasa: potong paksa
            if cur:
                grup.append(cur)
                cur = ""
            grup.append(p[:maks])
            p = p[maks:]
        if cur and len(cur) + len(p) > maks:
            grup.append(cur)
            cur = ""
        cur += p
    if cur:
        grup.append(cur)
    return grup


def _kalimat(teks: str) -> list[str]:
    return [k.strip() for k in re.split(r"(?<=[.;:])\s+|\n+", teks) if len(k.strip()) > 15]


def _bagian_pasal(teks: str, pasal: str) -> str:
    m = re.match(r"\s*pasal\s+(\d+)", pasal, re.IGNORECASE)
    if m:
        for p in _AWAL_PASAL.split(teks):
            if re.match(rf"\s*Pasal\s+{m.group(1)}\b", p, re.IGNORECASE):
                return p
    return teks


def _kutipan_nyata(kutipan: str, pasal: str, teks: str, teks_norm: str) -> str | None:
    """Kutipan harus benar-benar ada di dokumen. Kalau LLM memparafrase, ganti ke kalimat terdekat."""
    k = re.sub(r"\s+", " ", kutipan).strip()
    if k and _norm(k) in teks_norm:
        return k[:MAKS_KUTIPAN]
    terbaik, skor = None, 0.0
    for kal in _kalimat(_bagian_pasal(teks, pasal)):
        r = _kemiripan(k, kal)
        if r > skor:
            terbaik, skor = kal, r
    return terbaik[:MAKS_KUTIPAN] if terbaik and skor >= 0.6 else None


def _kemiripan(kutipan: str, kalimat: str) -> float:
    """Ambil yang lebih besar: kemiripan karakter, atau porsi kata kutipan yang ada di kalimat
    (adil untuk kutipan pendek hasil parafrase vs kalimat asli yang panjang)."""
    a, b = _norm(kutipan), _norm(kalimat)
    rasio = difflib.SequenceMatcher(None, a, b).ratio()
    kata_a, kata_b = set(re.findall(r"\w+", a)), set(re.findall(r"\w+", b))
    cakupan = len(kata_a & kata_b) / len(kata_a) if len(kata_a) >= 3 else 0.0
    return max(rasio, cakupan)


def _no_pasal(pasal: str) -> int:
    m = re.search(r"\d+", pasal)
    return int(m.group()) if m else 10**6


def _bersihkan_risiko(mentah: list, teks: str) -> list[dict]:
    teks_norm = _norm(teks)
    hasil: dict[tuple[str, str], dict] = {}
    for r in mentah if isinstance(mentah, list) else []:
        if not isinstance(r, dict):
            continue
        kategori = petakan_kategori(r.get("kategori"))
        level = petakan_level(r.get("level"))
        alasan = str(r.get("alasan", "")).strip()
        if not (kategori and level and alasan):
            continue
        if r.get("absen"):
            if kategori not in KATEGORI_BOLEH_ABSEN:
                continue
            pasal, kutipan = PASAL_ABSEN, KUTIPAN_ABSEN
        else:
            pasal = str(r.get("pasal", "")).strip() or "-"
            kutipan = _kutipan_nyata(str(r.get("kutipan", "")), pasal, teks, teks_norm)
            if not kutipan:
                continue  # kutipan karangan LLM yang tidak ada di dokumen -> buang
        kunci = (pasal.lower(), kategori)
        item = {"pasal": pasal, "kutipan": kutipan, "kategori": kategori, "level": level, "alasan": alasan}
        if kunci not in hasil or _URUTAN_LEVEL[level] < _URUTAN_LEVEL[hasil[kunci]["level"]]:
            hasil[kunci] = item
    return sorted(hasil.values(), key=lambda x: (_URUTAN_LEVEL[x["level"]], _no_pasal(x["pasal"])))


def _cek_relevansi(llm: LLM, teks: str) -> None:
    """Tolak dokumen yang jelas bukan dokumen hukum pertanahan (mis. CV, resep, artikel berita).

    Gagal-aman: kalau pemeriksaan ini error atau formatnya tidak jelas, dokumen TETAP dianalisis
    (fail open) — supaya gangguan sesaat tidak memblokir dokumen yang sah.
    """
    try:
        out = llm.generate_json(SYSTEM_PROMPT_RELEVANSI, prompt_relevansi(teks[:MAKS_KARAKTER_SAMPEL_RELEVANSI]))
    except Exception:
        return
    if isinstance(out, dict) and out.get("relevan") is False:
        raise DokumenTidakRelevan(PESAN_TIDAK_RELEVAN)


def analyze(text: str, *, llm: LLM | None = None, maks_karakter: int = MAKS_KARAKTER_BAGIAN) -> dict:
    """Ringkas dokumen ke bahasa awam dan tandai klausul berisiko.

    Return: {"summary": str, "risks": [{pasal, kutipan, kategori, level, alasan}]}
    level: "low" (hijau) | "medium" (kuning) | "high" (merah). Melempar DokumenTidakRelevan kalau
    dokumen bukan dokumen hukum pertanahan, atau ValueError/exception lain kalau dokumen
    kosong/terlalu pendek atau Gemini gagal (pemanggil menandai dokumen "failed").
    """
    teks_asli = (text or "").strip()
    if len(teks_asli) < MIN_KARAKTER_DOKUMEN:
        raise ValueError("Teks dokumen kosong atau terlalu pendek untuk dianalisis")

    llm = llm or _get_llm()
    teks, peta = samarkan(teks_asli)  # data pribadi tidak dikirim ke LLM
    _cek_relevansi(llm, teks)
    bagian = _bagi_bagian(teks, maks_karakter)

    ringkasan_bagian: list[str] = []
    risiko_mentah: list = []
    for i, b in enumerate(bagian, 1):
        out = llm.generate_json(SYSTEM_PROMPT, prompt_bagian(b, i, len(bagian)))
        if not isinstance(out, dict):
            raise ValueError("Format keluaran LLM tidak valid")
        if str(out.get("ringkasan", "")).strip():
            ringkasan_bagian.append(str(out["ringkasan"]).strip())
        risiko_mentah.extend(out.get("risks") or [])

    if len(ringkasan_bagian) > 1:
        try:
            gabung = llm.generate_json(SYSTEM_PROMPT_GABUNG, prompt_gabung(ringkasan_bagian))
            ringkasan = str(gabung.get("ringkasan", "")).strip()
        except Exception:
            ringkasan = ""
        ringkasan = ringkasan or " ".join(ringkasan_bagian[:2])
    else:
        ringkasan = ringkasan_bagian[0] if ringkasan_bagian else ""
    ringkasan = ringkasan or "Ringkasan otomatis tidak tersedia. Lihat daftar risiko di bawah."

    risiko = _bersihkan_risiko(risiko_mentah, teks)
    return {
        "summary": kembalikan(ringkasan, peta),
        "risks": [
            {**r, "kutipan": kembalikan(r["kutipan"], peta), "alasan": kembalikan(r["alasan"], peta)}
            for r in risiko
        ],
    }
