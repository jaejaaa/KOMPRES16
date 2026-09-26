import logging
import re

from . import config, guardrails
from .llm import LLM
from .prompts import SYSTEM_PROMPT, bangun_prompt_user
from .retrieval import (
    Chunk,
    KeywordRetriever,
    Retriever,
    label_pasal,
    muat_regulasi,
    pecah_dokumen,
    pecah_perbandingan,
    tokenize,
)

_llm_default: LLM | None = None
_regulasi_default: list[Chunk] | None = None


def _get_llm() -> LLM:
    global _llm_default
    if _llm_default is None:
        from .llm import GeminiLLM

        _llm_default = GeminiLLM()
    return _llm_default


def _get_regulasi() -> list[Chunk]:
    global _regulasi_default
    if _regulasi_default is None:
        _regulasi_default = muat_regulasi()
    return _regulasi_default


def _respons(jawaban: str, status: str, sumber: list[dict] | None = None) -> dict:
    return {
        "jawaban": jawaban,
        "sumber": sumber or [],
        "di_luar_cakupan": status == "di_luar_cakupan",
        "status": status,  # "ok" | "di_luar_cakupan" | "error"
        "disclaimer": guardrails.DISCLAIMER,
    }


def _bersihkan_riwayat(riwayat: list[dict] | None) -> list[dict]:
    hasil = []
    for m in (riwayat or [])[-config.MAX_RIWAYAT :]:
        if m.get("role") in ("user", "assistant") and isinstance(m.get("content"), str):
            hasil.append(
                {"role": m["role"], "content": m["content"][: config.MAX_RIWAYAT_CHARS]}
            )
    return hasil


def _query_retrieval(pertanyaan: str, riwayat: list[dict]) -> str:
    """Pertanyaan lanjutan pendek ("kalau HGB?") digabung dengan pertanyaan user sebelumnya."""
    if len(tokenize(pertanyaan)) <= 3:
        for m in reversed(riwayat):
            if m["role"] == "user":
                return f"{m['content']} {pertanyaan}"
    return pertanyaan


def _cari(
    retriever: Retriever, queries: list[str], top_k: int
) -> dict[str, tuple[Chunk, float]]:
    """Cari tiap query, gabungkan; chunk yang sama dipakai skor tertingginya."""
    hasil: dict[str, tuple[Chunk, float]] = {}
    for q in queries:
        for chunk, skor in retriever.search(q, top_k):
            if chunk.id not in hasil or skor > hasil[chunk.id][1]:
                hasil[chunk.id] = (chunk, skor)
    return hasil


def _sumber(chunk: Chunk) -> dict:
    s = {
        "id": chunk.id,
        "uu": chunk.sumber,
        "pasal": label_pasal(chunk.pasal),
        "kutipan": chunk.teks,
        "asal": chunk.asal,
    }
    # field tambahan dari retriever Data Engineer (opsional)
    if getattr(chunk, "status", None):
        s["status"] = chunk.status
    if getattr(chunk, "page_start", None):
        s["halaman"] = chunk.page_start
    return s


def jawab_chat(
    pertanyaan: str,
    riwayat: list[dict] | None = None,
    konteks_dokumen: str | None = None,
    *,
    llm: LLM | None = None,
    retriever: Retriever | None = None,
) -> dict:
    """Jawab satu pertanyaan chat.

    riwayat: [{"role": "user"|"assistant", "content": "..."}]
    konteks_dokumen: teks dokumen yang sedang dibuka user (opsional)
    retriever: retriever regulasi dengan method `search(query, top_k) -> [(Chunk, skor 0-1)]`.
               Kosong = KeywordRetriever + data contoh. Chunk dokumen user selalu
               dicari terpisah (pencocokan kata). Atur ambang lewat env
               MIN_RETRIEVAL_SCORE (regulasi) dan MIN_DOK_SCORE (dokumen).
    """
    pertanyaan = (pertanyaan or "").strip()

    # Lapis 1a: filter input
    tolak = guardrails.cek_input(pertanyaan)
    if tolak:
        return _respons(tolak, "di_luar_cakupan")
    tetap = guardrails.jawaban_tetap(pertanyaan)
    if tetap:
        return _respons(tetap, "ok")

    riwayat = _bersihkan_riwayat(riwayat)
    chunks_dok = pecah_dokumen(konteks_dokumen) if konteks_dokumen else []

    # Lapis 1b: gerbang skor retrieval (skor terbaik, bukan skor chunk pertama:
    # urutan hasil retriever bisa hybrid sehingga skornya tidak selalu menurun)
    query = _query_retrieval(pertanyaan, riwayat)
    sisi = pecah_perbandingan(pertanyaan)  # "bedanya X dan Y" -> cari X dan Y sendiri-sendiri
    # sub-query pendek ("HGB") melenceng di embedding; bungkus jadi kalimat utuh
    queries = [f"Apa pengertian {x}?" for x in sisi] + [query] if sisi else [query]
    per_query = max(2, config.TOP_K // 2) if sisi else config.TOP_K

    reg = retriever or KeywordRetriever(_get_regulasi())
    try:
        kandidat = _cari(reg, queries, per_query)
    except Exception:  # kuota embedding habis / jaringan putus: jawab sopan, bukan 500
        logging.getLogger(__name__).exception("retrieval gagal")
        return _respons(guardrails.PESAN_ERROR, "error")
    lolos_reg = bool(kandidat) and (
        max(skor for _, skor in kandidat.values()) >= config.MIN_RETRIEVAL_SCORE
    )

    dok: dict[str, Chunk] = {}
    if chunks_dok:
        for i, (c, skor) in _cari(KeywordRetriever(chunks_dok), [query], config.TOP_K).items():
            if skor >= config.MIN_DOK_SCORE:
                dok[i] = c
        # "Pasal 5 di kontrak saya..." -> selalu sertakan pasal dokumen yang disebut
        for n in re.findall(r"\bpasal\s+(\d+)", pertanyaan, re.IGNORECASE):
            for c in chunks_dok:
                if c.id == f"dok-{n}":
                    dok[c.id] = c

    chunks = list(dok.values()) + ([c for c, _ in kandidat.values()] if lolos_reg else [])
    if not chunks:
        return _respons(guardrails.PESAN_DI_LUAR_CAKUPAN, "di_luar_cakupan")
    peta = {str(i): c for i, c in enumerate(chunks, 1)}  # nomor prompt -> chunk asli
    sensitif = guardrails.is_sensitif(pertanyaan)

    try:
        out = (llm or _get_llm()).generate_json(
            SYSTEM_PROMPT, bangun_prompt_user(pertanyaan, chunks, riwayat, sensitif)
        )
    except Exception:
        return _respons(guardrails.PESAN_ERROR, "error")

    # Lapis 3: validasi sitasi. Sumber dibangun dari chunk asli, bukan dari teks LLM.
    if not isinstance(out, dict) or out.get("di_luar_cakupan") or out.get("topik_sesuai") is False:
        return _respons(guardrails.PESAN_DI_LUAR_CAKUPAN, "di_luar_cakupan")
    ids = [str(i).strip() for i in out.get("sumber_ids", []) if str(i).strip() in peta]
    jawaban = str(out.get("jawaban", "")).strip()
    if not ids or not jawaban:
        return _respons(guardrails.PESAN_DI_LUAR_CAKUPAN, "di_luar_cakupan")

    if sensitif:
        jawaban += guardrails.CATATAN_SENSITIF
    return _respons(jawaban, "ok", [_sumber(peta[i]) for i in dict.fromkeys(ids)])
