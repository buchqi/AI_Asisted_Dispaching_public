"""
Gemini LLM client.
"""

import json
import logging
from urllib.error import HTTPError, URLError
from urllib.parse import quote
from urllib.request import Request, urlopen

from app.core.config import settings


logger = logging.getLogger(__name__)


class GeminiClient:
    provider = "gemini"
    model_name = "gemini-3-flash-preview"

    def __init__(self, api_key: str | None = None):
        self.api_key = api_key if api_key is not None else settings.gemini_api_key

    def generate_text(self, prompt: str, *, timeout_seconds: int = 20) -> str:
        """
        Send a prompt to Gemini and return the response text.
        """

        if not self.api_key:
            raise ValueError("GEMINI_API_KEY is not configured.")

        model = quote(self.model_name, safe="")
        url = (
            "https://generativelanguage.googleapis.com/v1beta/models/"
            f"{model}:generateContent?key={self.api_key}"
        )
        payload = {
            "contents": [
                {
                    "role": "user",
                    "parts": [{"text": prompt}],
                }
            ],
            "generationConfig": {
                "temperature": 0.2,
                "maxOutputTokens": 180,
            },
        }
        request = Request(
            url=url,
            data=json.dumps(payload).encode("utf-8"),
            headers={"Content-Type": "application/json"},
            method="POST",
        )

        try:
            with urlopen(request, timeout=timeout_seconds) as response:
                response_body = response.read().decode("utf-8")
        except HTTPError as exc:
            error_body = exc.read().decode("utf-8", errors="replace")
            logger.error("Gemini request failed: %s %s", exc.code, error_body)
            raise
        except URLError:
            logger.exception("Gemini request failed before receiving a response.")
            raise

        data = json.loads(response_body)
        candidates = data.get("candidates") or []

        if not candidates:
            raise ValueError("Gemini returned no candidates.")

        parts = (
            candidates[0]
            .get("content", {})
            .get("parts", [])
        )
        text = "".join(
            part.get("text", "")
            for part in parts
            if isinstance(part, dict)
        ).strip()

        if not text:
            raise ValueError("Gemini returned an empty text response.")

        return text
