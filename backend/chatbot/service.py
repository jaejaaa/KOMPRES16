import re

from . import config, guardrails
from .llm import LLM
from .prompts import SYSTEM_PROMPT, bangun_prompt_user
from .retrieval import (
    Chunk,
    KeywordRetriever,
    Retriever,
    muat_regulasi,
    pecah_dokumen,
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
    retriever: ganti dengan retriever pgvector kalau sudah ada. Kalau diisi,
               chunk dokumen tetap ditambahkan lewat KeywordRetriever terpisah.
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

    # Lapis 1b: gerbang skor retrieval
    query = _query_retrieval(pertanyaan, riwayat)
    hasil: list[tuple[Chunk, float]] = []
    reg = retriever or KeywordRetriever(_get_regulasi() + chunks_dok)
    hasil.extend(reg.search(query, config.TOP_K))
    if retriever and chunks_dok:
        hasil.extend(KeywordRetriever(chunks_dok).search(query, config.TOP_K))

    terpilih: dict[str, Chunk] = {
        c.id: c for c, skor in hasil if skor >= config.MIN_RETRIEVAL_SCORE
    }
    # "Pasal 5 di kontrak saya..." -> selalu sertakan pasal dokumen yang disebut
    for n in re.findall(r"\bpasal\s+(\d+)", pertanyaan, re.IGNORECASE):
        for c in chunks_dok:
            if c.id == f"dok-{n}":
                terpilih[c.id] = c
    if not terpilih:
        return _respons(guardrails.PESAN_DI_LUAR_CAKUPAN, "di_luar_cakupan")

    chunks = list(terpilih.values())
    sensitif = guardrails.is_sensitif(pertanyaan)

    try:
        out = (llm or _get_llm()).generate_json(
            SYSTEM_PROMPT, bangun_prompt_user(pertanyaan, chunks, riwayat, sensitif)
        )
    except Exception:
        return _respons(guardrails.PESAN_ERROR, "error")

    # Lapis 3: validasi sitasi. Sumber dibangun dari chunk asli, bukan dari teks LLM.
    if not isinstance(out, dict) or out.get("di_luar_cakupan"):
        return _respons(guardrails.PESAN_DI_LUAR_CAKUPAN, "di_luar_cakupan")
    ids = [i for i in out.get("sumber_ids", []) if i in terpilih]
    jawaban = str(out.get("jawaban", "")).strip()
    if not ids or not jawaban:
        return _respons(guardrails.PESAN_DI_LUAR_CAKUPAN, "di_luar_cakupan")

    if sensitif:
        jawaban += guardrails.CATATAN_SENSITIF
    sumber = [
        {
            "id": i,
            "uu": terpilih[i].sumber,
            "pasal": terpilih[i].pasal,
            "kutipan": terpilih[i].teks,
            "asal": terpilih[i].asal,
        }
        for i in dict.fromkeys(ids)
    ]
    return _respons(jawaban, "ok", sumber)
