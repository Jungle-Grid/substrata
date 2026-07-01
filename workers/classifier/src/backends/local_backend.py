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
    build_system_and_user_prompt,
    parse_json_output,
)


DEFAULT_MODEL = "gemma4:e2b"


def _ollama_host() -> str:
    host = os.getenv("OLLAMA_HOST") or os.getenv("OLLAMA_BASE_URL") or "http://localhost:11434"
    return host.rstrip("/")


def _model() -> str:
    return os.getenv("GEMMA_MODEL", DEFAULT_MODEL).strip() or DEFAULT_MODEL


class LocalBackend(ClassificationBackend):
    def run_classification(
        self,
        document_text: str,
        document_metadata: dict[str, Any],
    ) -> BackendResult:
        prompt = build_system_and_user_prompt(document_text, document_metadata)
        model = _model()
        body = json.dumps(
            {
                "model": model,
                "prompt": prompt,
                "stream": False,
                "format": "json",
            }
        ).encode("utf-8")
        request = urllib.request.Request(
            f"{_ollama_host()}/api/generate",
            data=body,
            headers={"Content-Type": "application/json"},
            method="POST",
        )

        started = time.perf_counter()
        try:
            with urllib.request.urlopen(request, timeout=90) as response:
                payload = json.loads(response.read().decode("utf-8"))
        except urllib.error.HTTPError as exc:
            response_body = exc.read().decode("utf-8", errors="replace")
            if exc.code in {404, 500} and ("not found" in response_body.lower() or "model" in response_body.lower()):
                raise RuntimeError(
                    f"Local model '{model}' is not available. Pull it first with: ollama pull {model}"
                ) from exc
            raise RuntimeError(
                f"Local backend request failed with HTTP {exc.code}: {response_body.strip() or exc.reason}"
            ) from exc
        except urllib.error.URLError as exc:
            reason = getattr(exc, "reason", exc)
            raise RuntimeError(
                "Local inference is not reachable. Start Ollama and confirm "
                f"OLLAMA_HOST is correct ({_ollama_host()}). Original error: {reason}"
            ) from exc

        latency_ms = (time.perf_counter() - started) * 1000.0
        output_text = str(payload.get("response") or "")
        parsed_output = parse_json_output(output_text)
        prompt_tokens = int(payload.get("prompt_eval_count") or 0)
        completion_tokens = int(payload.get("eval_count") or 0)

        return BackendResult(
            backend="local",
            underlying_provider=None,
            output=parsed_output,
            cost_usd=0.0,
            latency_ms=latency_ms,
            tokens_used=prompt_tokens + completion_tokens,
            reason=str(document_metadata.get("backend_reason") or "User selected local execution."),
            status="completed",
        )


def run_classification(document_text: str, document_metadata: dict[str, Any]) -> BackendResult:
    return LocalBackend().run_classification(document_text, document_metadata)
