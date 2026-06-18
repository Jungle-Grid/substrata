from __future__ import annotations

import json
import os
import sys
import time
import urllib.error
import urllib.request
from typing import Any


class GeminiClientError(RuntimeError):
    pass


def _log_ai_event(event: str, **fields: object) -> None:
    print(
        json.dumps(
            {
                "event": event,
                **fields,
            },
            default=str,
        ),
        file=sys.stderr,
    )


class GeminiClient:
    def __init__(self) -> None:
        self.api_key = os.environ.get("GEMINI_API_KEY", "").strip()
        self.model = os.environ.get("AI_MODEL", "gemini-2.5-flash").strip() or "gemini-2.5-flash"
        self.timeout_seconds = float(os.environ.get("AI_TIMEOUT_SECONDS", "60"))
        self.max_retries = int(os.environ.get("AI_MAX_RETRIES", "2"))
        if not self.api_key:
            raise GeminiClientError("GEMINI_API_KEY is required for AI_PROVIDER=gemini")
        _log_ai_event(
            "gemini.client_initialized",
            ai_model=self.model,
            timeout_seconds=self.timeout_seconds,
            max_retries=self.max_retries,
        )

    def generate_json(
        self,
        *,
        prompt_type: str,
        system_instruction: str,
        user_prompt: str,
        input_character_count: int,
    ) -> dict[str, Any]:
        response_text = self._generate(
            prompt_type=prompt_type,
            system_instruction=system_instruction,
            user_prompt=user_prompt,
            input_character_count=input_character_count,
            response_mime_type="application/json",
        )
        try:
            parsed = json.loads(response_text)
        except json.JSONDecodeError as error:
            self._log(
                prompt_type=prompt_type,
                input_character_count=input_character_count,
                output_character_count=len(response_text),
                validation_result=f"invalid_json:{error}",
            )
            raise GeminiClientError(f"Gemini returned invalid JSON for {prompt_type}: {error}") from error

        self._log(
            prompt_type=prompt_type,
            input_character_count=input_character_count,
            output_character_count=len(response_text),
            validation_result="json_parse_ok",
        )
        return parsed

    def generate_markdown(
        self,
        *,
        prompt_type: str,
        system_instruction: str,
        user_prompt: str,
        input_character_count: int,
    ) -> str:
        response_text = self._generate(
            prompt_type=prompt_type,
            system_instruction=system_instruction,
            user_prompt=user_prompt,
            input_character_count=input_character_count,
            response_mime_type="text/plain",
        ).strip()
        if not response_text:
            raise GeminiClientError(f"Gemini returned an empty response for {prompt_type}")
        self._log(
            prompt_type=prompt_type,
            input_character_count=input_character_count,
            output_character_count=len(response_text),
            validation_result="markdown_nonempty",
        )
        return response_text

    def _generate(
        self,
        *,
        prompt_type: str,
        system_instruction: str,
        user_prompt: str,
        input_character_count: int,
        response_mime_type: str,
    ) -> str:
        url = (
            f"https://generativelanguage.googleapis.com/v1beta/models/"
            f"{self.model}:generateContent?key={self.api_key}"
        )
        body = {
            "systemInstruction": {"parts": [{"text": system_instruction}]},
            "contents": [{"role": "user", "parts": [{"text": user_prompt}]}],
            "generationConfig": {
                "temperature": 0.1,
                "topP": 0.8,
                "responseMimeType": response_mime_type,
            },
        }
        encoded = json.dumps(body).encode("utf-8")
        last_error: Exception | None = None

        for attempt in range(self.max_retries + 1):
            _log_ai_event(
                "gemini.request_attempt",
                prompt_type=prompt_type,
                ai_model=self.model,
                attempt=attempt + 1,
                max_attempts=self.max_retries + 1,
                input_character_count=input_character_count,
                request_body_bytes=len(encoded),
                response_mime_type=response_mime_type,
            )
            request = urllib.request.Request(
                url,
                data=encoded,
                headers={"Content-Type": "application/json"},
                method="POST",
            )
            try:
                started_at = time.monotonic()
                with urllib.request.urlopen(request, timeout=self.timeout_seconds) as response:
                    raw_response = response.read().decode("utf-8")
                    status_code = response.status
                elapsed_ms = int((time.monotonic() - started_at) * 1000)
                _log_ai_event(
                    "gemini.http_response",
                    prompt_type=prompt_type,
                    ai_model=self.model,
                    attempt=attempt + 1,
                    status_code=status_code,
                    response_bytes=len(raw_response.encode("utf-8")),
                    elapsed_ms=elapsed_ms,
                )
                payload = json.loads(raw_response)
                text = self._extract_text(payload)
                if not text:
                    raise GeminiClientError(f"Gemini returned no text for {prompt_type}")
                _log_ai_event(
                    "gemini.text_extracted",
                    prompt_type=prompt_type,
                    ai_model=self.model,
                    attempt=attempt + 1,
                    output_character_count=len(text),
                )
                return text
            except urllib.error.HTTPError as error:
                last_error = error
                detail = error.read().decode("utf-8", errors="replace")[:600]
                _log_ai_event(
                    "gemini.http_error",
                    prompt_type=prompt_type,
                    ai_model=self.model,
                    attempt=attempt + 1,
                    status_code=error.code,
                    retryable=error.code in {429, 500, 502, 503, 504} and attempt < self.max_retries,
                    detail=detail,
                )
                if error.code not in {429, 500, 502, 503, 504} or attempt >= self.max_retries:
                    raise GeminiClientError(
                        f"Gemini request failed for {prompt_type}: HTTP {error.code} {detail}"
                    ) from error
            except (TimeoutError, urllib.error.URLError, GeminiClientError, json.JSONDecodeError) as error:
                last_error = error
                _log_ai_event(
                    "gemini.request_error",
                    prompt_type=prompt_type,
                    ai_model=self.model,
                    attempt=attempt + 1,
                    error_type=type(error).__name__,
                    error_message=str(error)[:600],
                    retryable=attempt < self.max_retries,
                )
                if attempt >= self.max_retries:
                    raise GeminiClientError(f"Gemini request failed for {prompt_type}: {error}") from error

            _log_ai_event(
                "gemini.retry_sleep",
                prompt_type=prompt_type,
                ai_model=self.model,
                attempt=attempt + 1,
                sleep_seconds=0.8 * (2**attempt),
            )
            time.sleep(0.8 * (2**attempt))

        raise GeminiClientError(f"Gemini request failed for {prompt_type}: {last_error}")

    def _extract_text(self, payload: dict[str, Any]) -> str:
        candidates = payload.get("candidates")
        if not isinstance(candidates, list) or not candidates:
            raise GeminiClientError("Gemini response did not include candidates")
        parts = candidates[0].get("content", {}).get("parts", [])
        if not isinstance(parts, list):
            raise GeminiClientError("Gemini response content parts were invalid")
        return "".join(part.get("text", "") for part in parts if isinstance(part, dict))

    def _log(
        self,
        *,
        prompt_type: str,
        input_character_count: int,
        output_character_count: int,
        validation_result: str,
    ) -> None:
        print(
            json.dumps(
                {
                    "event": "gemini.validation",
                    "ai_model": self.model,
                    "prompt_type": prompt_type,
                    "input_character_count": input_character_count,
                    "output_character_count": output_character_count,
                    "validation_result": validation_result,
                }
            ),
            file=sys.stderr,
        )
