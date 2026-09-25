import json
import os
import re
import time
from typing import Protocol

from . import config

MAX_PERCOBAAN = 3
JEDA_DASAR = 2  # detik; jeda antar percobaan: 2s, 4s


class LLM(Protocol):
    def generate_json(self, system: str, user: str) -> dict: ...


class GeminiLLM:
    def __init__(self, api_key: str | None = None, model: str | None = None):
        from google import genai  # import di sini biar tes tidak butuh library ini

        try:
            from dotenv import load_dotenv

            load_dotenv()
        except ImportError:
            pass
        key = api_key or os.environ.get("GEMINI_API_KEY")
        if not key:
            raise RuntimeError("GEMINI_API_KEY belum di-set (lihat .env.example)")
        self._client = genai.Client(api_key=key)
        self._model = model or config.GEMINI_MODEL

    def generate_json(self, system: str, user: str) -> dict:
        from google.genai import errors, types

        cfg = types.GenerateContentConfig(
            system_instruction=system,
            temperature=0.2,
            response_mime_type="application/json",
        )
        # Server Gemini kadang sibuk (503) / kena rate limit (429): coba ulang.
        for percobaan in range(MAX_PERCOBAAN):
            try:
                resp = self._client.models.generate_content(
                    model=self._model, contents=user, config=cfg
                )
                return parse_json(resp.text)
            except errors.APIError as e:
                sementara = e.code in (429, 500, 502, 503, 504)
                if not sementara or percobaan == MAX_PERCOBAAN - 1:
                    raise
                time.sleep(JEDA_DASAR * 2**percobaan)


def parse_json(teks: str) -> dict:
    teks = (teks or "").strip()
    teks = re.sub(r"^```(?:json)?\s*|\s*```$", "", teks)
    return json.loads(teks)
