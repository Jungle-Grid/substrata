from __future__ import annotations

import abc
import json
from dataclasses import dataclass
from typing import Any

from prompts import EXTRACTION_SYSTEM_PROMPT, build_extraction_prompt


@dataclass
class BackendResult:
    backend: str
    underlying_provider: str | None
    output: dict[str, Any]
    cost_usd: float
    latency_ms: float
    tokens_used: int | None
    reason: str
    status: str
    error: str | None = None
    job_id: str | None = None
    gpu_vendor: str | None = None
    gpu_name: str | None = None
    runtime_version: str | None = None
    image_name: str | None = None
    image_digest: str | None = None
    input_tokens: int | None = None
    output_tokens: int | None = None
    log_path: str | None = None
    runtime_metadata: dict[str, Any] | None = None


class ClassificationBackend(abc.ABC):
    @abc.abstractmethod
    def run_classification(
        self,
        document_text: str,
        document_metadata: dict[str, Any],
    ) -> BackendResult:
        raise NotImplementedError


def build_backend_prompt(document_text: str, document_metadata: dict[str, Any]) -> str:
    return build_extraction_prompt(
        document_title=str(document_metadata.get("document_title") or "Untitled document"),
        file_name=str(document_metadata.get("file_name") or "document.txt"),
        document_text=document_text,
    )


def parse_json_output(raw_text: str) -> dict[str, Any]:
    candidate = raw_text.strip()
    if candidate.startswith("```"):
        candidate = candidate.strip("`")
        if "\n" in candidate:
            candidate = candidate.split("\n", 1)[1]
        if candidate.endswith("```"):
            candidate = candidate[:-3].strip()

    try:
        parsed = json.loads(candidate)
    except json.JSONDecodeError as error:
        raise RuntimeError(f"Backend returned invalid JSON: {error}") from error

    if not isinstance(parsed, dict):
        raise RuntimeError("Backend returned JSON that was not an object.")
    return parsed


def build_system_and_user_prompt(document_text: str, document_metadata: dict[str, Any]) -> str:
    return (
        f"{EXTRACTION_SYSTEM_PROMPT}\n\n"
        f"{build_backend_prompt(document_text, document_metadata)}"
    )
