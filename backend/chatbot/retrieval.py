"""Retrieval chunk regulasi / dokumen user.

KeywordRetriever hanya untuk pengembangan awal. Kalau pgvector dari Data
Engineer sudah siap, cukup bikin class baru dengan method `search` yang sama
(lihat `Retriever`) dan oper ke `jawab_chat(retriever=...)`.
"""
import json
import math
import re
from collections import Counter
from dataclasses import dataclass
from pathlib import Path
from typing import Protocol

DATA_REGULASI = Path(__file__).parent / "data" / "regulasi_contoh.json"

_STOP = {
    "apa", "yang", "dan", "di", "ke", "dari", "untuk", "saya", "kamu", "anda",
    "itu", "ini", "adalah", "bisa", "apakah", "bagaimana", "berapa", "siapa",
    "kenapa", "mengapa", "dengan", "atau", "pada", "akan", "ada", "jika",
    "kalau", "tidak", "sih", "dong", "nih", "aku", "gw", "gue", "mau",
    # kata umum yang muncul di hampir semua sitasi, bukan penanda topik
    "indonesia", "republik", "undang", "nomor", "no", "tahun", "pasal",
}


@dataclass(frozen=True)
class Chunk:
    id: str
    sumber: str  # nama UU / dokumen
    pasal: str
    teks: str
    asal: str = "regulasi"  # "regulasi" | "dokumen" | "panduan"
    kata_kunci: str = ""


class Retriever(Protocol):
    def search(self, query: str, top_k: int) -> list[tuple[Chunk, float]]: ...


def tokenize(text: str) -> list[str]:
    return [t for t in re.findall(r"[a-z0-9]+", text.lower()) if t not in _STOP]


class KeywordRetriever:
    """Pencocokan kata berbobot IDF. Skor 0-1 = porsi bobot kata pertanyaan yang ketemu."""

    def __init__(self, chunks: list[Chunk]):
        self.chunks = list(chunks)
        self._tokens = [
            set(tokenize(f"{c.sumber} {c.pasal} {c.teks} {c.kata_kunci}"))
            for c in self.chunks
        ]
        self._df = Counter(t for s in self._tokens for t in s)

    def _idf(self, token: str) -> float:
        idf = math.log((len(self.chunks) + 1) / (self._df.get(token, 0) + 0.5)) + 1
        # kata yang tak ada di korpus (mis. "menang", "soal") dibobot kecil supaya
        # tidak mengencerkan skor, tapi pertanyaan yang semuanya asing tetap 0.
        return idf if token in self._df else idf * 0.3

    def search(self, query: str, top_k: int) -> list[tuple[Chunk, float]]:
        q = set(tokenize(query))
        if not q:
            return []
        total = sum(self._idf(t) for t in q)
        hasil = []
        for chunk, toks in zip(self.chunks, self._tokens):
            skor = sum(self._idf(t) for t in q if t in toks) / total
            if skor > 0:
                hasil.append((chunk, skor))
        hasil.sort(key=lambda x: x[1], reverse=True)
        return hasil[:top_k]


def muat_regulasi(path: Path = DATA_REGULASI) -> list[Chunk]:
    with open(path, encoding="utf-8") as f:
        return [Chunk(**item) for item in json.load(f)["chunks"]]


def pecah_dokumen(teks: str) -> list[Chunk]:
    """Pecah teks dokumen user per 'Pasal N' (fallback: per paragraf)."""
    bagian = [b.strip() for b in re.split(r"(?m)(?=^[ \t]*Pasal\s+\d+\b)", teks) if b.strip()]
    if len(bagian) <= 1:
        bagian = [b.strip() for b in re.split(r"\n\s*\n", teks) if b.strip()]
    chunks = []
    for i, b in enumerate(bagian, 1):
        m = re.match(r"Pasal\s+(\d+)", b)
        chunks.append(
            Chunk(
                id=f"dok-{m.group(1) if m else 'bag' + str(i)}",
                sumber="Dokumen yang Anda unggah",
                pasal=f"Pasal {m.group(1)}" if m else f"Bagian {i}",
                teks=b,
                asal="dokumen",
            )
        )
    return chunks


def label_pasal(pasal: str) -> str:
    """"35" -> "Pasal 35"; label lain ("Ketentuan umum") dibiarkan."""
    p = str(pasal).strip()
    return f"Pasal {p}" if p[:1].isdigit() else p


_BUANG = re.compile(r"\b(apa\s+)?(bedanya|perbedaan|beda|bandingkan|perbandingan)\b", re.IGNORECASE)
_BANDING = re.compile(r"\b(vs|versus)\b", re.IGNORECASE)
_PEMISAH = re.compile(r"\s+(?:dan|vs|versus|atau|dengan|sama)\s+", re.IGNORECASE)


def pecah_perbandingan(pertanyaan: str) -> list[str]:
    """"Apa bedanya SHM dan HGB?" -> ["SHM", "HGB"]. Bukan pertanyaan perbandingan -> [].

    Jawaban perbandingan tersebar di dua pasal, jadi masing-masing sisi dicari sendiri.
    """
    if not (_BUANG.search(pertanyaan) or _BANDING.search(pertanyaan)):
        return []
    inti = re.sub(r"[?!.]+", " ", _BUANG.sub(" ", pertanyaan)).strip()
    bagian = [b.strip() for b in _PEMISAH.split(inti) if b.strip()]
    return bagian if len(bagian) == 2 else []
