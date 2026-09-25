"""Adapter untuk chatbot: Retriever().search(query, top_k) -> list[(Chunk, skor 0-1)]

    from retriever import Retriever
    r = Retriever()
    hasil = r.search("cara balik nama sertifikat", top_k=5)
    for chunk, skor in hasil: ...
skor = kemiripan kosinus 0-1 (murni, bukan skor hybrid). Urutan list = urutan relevansi hybrid, jadi skor
belum tentu menurun; untuk ambang 'di luar cakupan' pakai max(skor), bukan skor elemen pertama.
"""
from __future__ import annotations
from dataclasses import dataclass
from search import search as _search

@dataclass(frozen=True)
class Chunk:
    id: str
    sumber: str      # 'PP 24/1997' | 'Panduan: Balik Nama Sertifikat Tanah'
    pasal: str       # nomor Pasal; untuk panduan = judul bagian
    teks: str
    asal: str        # 'regulasi' | 'penjelasan' | 'panduan'
    status: str      # 'berlaku' | 'diubah sebagian (...)' | 'dicabut (...)' | 'panduan'
    page_start: int | None = None
    page_end: int | None = None

    @property
    def sitasi(self) -> str:
        return f"{self.sumber} Pasal {self.pasal}" if self.asal != "panduan" else f"{self.sumber} - {self.pasal}"

class Retriever:
    def __init__(self, **opsi):  # opsi diteruskan ke search(): doc_slug, include_penjelasan, include_panduan, include_dicabut, hybrid
        self.opsi = opsi

    def search(self, query: str, top_k: int = 5):
        return [(Chunk(r["id"], r["sumber"], r["pasal"], r["teks"], r["asal"], r["status"], r["page_start"], r["page_end"]), r["score"])
                for r in _search(query, top_k=top_k, **self.opsi)]

    @staticmethod
    def skor_terbaik(hasil) -> float:
        return max((s for _, s in hasil), default=0.0)
