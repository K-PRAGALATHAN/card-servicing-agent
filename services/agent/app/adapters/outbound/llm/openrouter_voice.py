"""OpenRouter voice adapter — speech-to-text and text-to-speech.

Uses OpenRouter's audio endpoints (`/audio/transcriptions`, `/audio/speech`) via
the OpenAI SDK, so the whole assistant runs on one key. Same text brain answers
both chat and voice; only the ears and mouth differ.
"""

from __future__ import annotations

import io


class OpenRouterVoice:
    def __init__(self, api_key: str, base_url: str, stt_model: str, tts_model: str, voice: str) -> None:
        from openai import OpenAI

        self._client = OpenAI(
            api_key=api_key,
            base_url=base_url,
            default_headers={"HTTP-Referer": "https://localhost", "X-Title": "Card Servicing Agent"},
        )
        self._stt_model = stt_model
        self._tts_model = tts_model
        self._voice = voice

    def transcribe(self, audio: bytes, filename: str = "speech.webm") -> str:
        buffer = io.BytesIO(audio)
        buffer.name = filename
        result = self._client.audio.transcriptions.create(model=self._stt_model, file=buffer)
        return getattr(result, "text", "") or ""

    def synthesize(self, text: str) -> bytes:
        response = self._client.audio.speech.create(
            model=self._tts_model, voice=self._voice, input=text
        )
        # OpenAI SDK returns a binary response; `.read()` yields the audio bytes.
        return response.read()
