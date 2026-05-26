"""
Shared LLM client interfaces.
"""

from typing import Protocol


class LLMClient(Protocol):
    provider: str
    model_name: str

    def generate_text(self, prompt: str, *, timeout_seconds: int = 20) -> str:
        """
        Generate text from a prompt.
        """
