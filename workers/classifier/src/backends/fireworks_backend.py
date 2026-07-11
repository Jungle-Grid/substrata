from __future__ import annotations

import json
import os
import time
import urllib.error
import urllib.request
from typing import Any

from .base import (
    BackendResult,
    ClassificationBackend,
    build_backend_prompt,
    parse_json_output,
)


DEFAULT_MODEL = "accounts/fireworks/models/gpt-oss-120b"
DEFAULT_INPUT_TOKEN_USD = 0.0000018
DEFAULT_OUTPUT_TOKEN_USD = 0.0000030


def _base_url() -> str:
    return os.getenv("FIREWORKS_BASE_URL", "https://api.fireworks.ai/inference/v1").rstrip("/")


def _api_key() -> str:
    api_key = os.getenv("FIREWORKS_API_KEY", "").strip()
    if not api_key:
        raise RuntimeError("FIREWORKS_API_KEY is not configured.")
    return api_key


def _model() -> str:
    return os.getenv("FIREWORKS_MODEL", DEFAULT_MODEL).strip() or DEFAULT_MODEL


def _pricing() -> tuple[float, float]:
    return (
        float(os.getenv("FIREWORKS_INPUT_TOKEN_USD", DEFAULT_INPUT_TOKEN_USD)),
        float(os.getenv("FIREWORKS_OUTPUT_TOKEN_USD", DEFAULT_OUTPUT_TOKEN_USD)),
    )


def _extract_output(payload: dict[str, Any]) -> str:
    choices = payload.get("choices") or []
    if not choices:
        return ""
    first = choices[0] or {}
    message = first.get("message") or {}
    return str(message.get("content") or "")


def _extract_usage(payload: dict[str, Any]) -> tuple[int, int]:
    usage = payload.get("usage") or {}
    return int(usage.get("prompt_tokens") or 0), int(usage.get("completion_tokens") or 0)


class FireworksBackend(ClassificationBackend):
    def run_classification(
        self,
        document_text: str,
        document_metadata: dict[str, Any],
    ) -> BackendResult:
        prompt = build_backend_prompt(document_text, document_metadata)
        model = _model()
        body = json.dumps(
            {
                "model": model,
                "messages": [
                    {
                        "role": "system",
                        "content": (
                            "You extract strict JSON from semiconductor datasheet text. "
                            "Return JSON only with no markdown fences."
                        ),
                    },
                    {"role": "user", "content": prompt},
                ],
                "max_tokens": 4000,
                "temperature": 0.1,
                "response_format": {"type": "json_object"},
            }
        ).encode("utf-8")

        started = time.perf_counter()
        retries = max(0, int(os.getenv("FIREWORKS_MAX_RETRIES", "3")))
        timeout_seconds = max(5.0, float(os.getenv("FIREWORKS_TIMEOUT_SECONDS", "90")))
        delay = 0.8
        last_error: str | None = None

        for attempt in range(retries + 1):
            request = urllib.request.Request(
                f"{_base_url()}/chat/completions",
                data=body,
                headers={
                    "Content-Type": "application/json",
                    "Authorization": f"Bearer {_api_key()}",
                },
                method="POST",
            )
            try:
                with urllib.request.urlopen(request, timeout=timeout_seconds) as response:
                    payload = json.loads(response.read().decode("utf-8"))

                latency_ms = (time.perf_counter() - started) * 1000.0
                prompt_tokens, completion_tokens = _extract_usage(payload)
                input_price, output_price = _pricing()
                return BackendResult(
                    backend="fireworks",
                    underlying_provider=None,
                    output=parse_json_output(_extract_output(payload)),
                    cost_usd=(prompt_tokens * input_price) + (completion_tokens * output_price),
                    latency_ms=latency_ms,
                    tokens_used=prompt_tokens + completion_tokens,
                    reason=str(document_metadata.get("backend_reason") or "User selected Fireworks execution."),
                    status="completed",
                )
            except urllib.error.HTTPError as exc:
                response_body = exc.read().decode("utf-8", errors="replace")
                if exc.code == 429 and attempt < retries:
                    last_error = f"rate_limited: HTTP 429 {response_body.strip() or exc.reason}"
                    time.sleep(delay)
                    delay *= 2
                    continue
                if exc.code == 429:
                    return BackendResult(
                        backend="fireworks",
                        underlying_provider=None,
                        output={},
                        cost_usd=0.0,
                        latency_ms=(time.perf_counter() - started) * 1000.0,
                        tokens_used=0,
                        reason=str(document_metadata.get("backend_reason") or "User selected Fireworks execution."),
                        status="failed",
                        error="Fireworks rate limit reached after retries.",
                    )
                raise RuntimeError(
                    f"Fireworks request failed with HTTP {exc.code}: {response_body.strip() or exc.reason}"
                ) from exc
            except urllib.error.URLError as exc:
                reason = getattr(exc, "reason", exc)
                message = str(reason).lower()
                if ("timed out" in message or "timeout" in message) and attempt < retries:
                    last_error = f"timeout: {reason}"
                    time.sleep(delay)
                    delay *= 2
                    continue
                if "timed out" in message or "timeout" in message:
                    return BackendResult(
                        backend="fireworks",
                        underlying_provider=None,
                        output={},
                        cost_usd=0.0,
                        latency_ms=(time.perf_counter() - started) * 1000.0,
                        tokens_used=0,
                        reason=str(document_metadata.get("backend_reason") or "User selected Fireworks execution."),
                        status="failed",
                        error="Fireworks request timed out after retries.",
                    )
                raise RuntimeError(
                    "Fireworks is not reachable. Check FIREWORKS_API_KEY and network access. "
                    f"Original error: {reason}"
                ) from exc

        return BackendResult(
            backend="fireworks",
            underlying_provider=None,
            output={},
            cost_usd=0.0,
            latency_ms=(time.perf_counter() - started) * 1000.0,
            tokens_used=0,
            reason=str(document_metadata.get("backend_reason") or "User selected Fireworks execution."),
            status="failed",
            error=last_error or "Fireworks request did not complete.",
        )


def run_classification(document_text: str, document_metadata: dict[str, Any]) -> BackendResult:
    return FireworksBackend().run_classification(document_text, document_metadata)
