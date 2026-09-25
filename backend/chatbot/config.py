import os

GEMINI_MODEL = os.environ.get("GEMINI_MODEL", "gemini-3.5-flash")

# Skor minimal (0-1) supaya pertanyaan dianggap masih dalam cakupan.
# Di bawah ini chatbot langsung jawab "di luar cakupan" tanpa memanggil LLM.
MIN_RETRIEVAL_SCORE = float(os.environ.get("MIN_RETRIEVAL_SCORE", "0.25"))

TOP_K = 4
MAX_RIWAYAT = 6
MAX_PERTANYAAN_CHARS = 1000
MAX_RIWAYAT_CHARS = 800
