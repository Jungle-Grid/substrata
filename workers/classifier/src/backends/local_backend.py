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


DEFAULT_OLLAMA_MODEL = "gemma4:e2b"
DEFAULT_TRANSFORMERS_MODEL = "google/gemma-4-E4B-it"

# The classifier process handles a single run at a time today, but this cache is
# deliberately module-scoped so a long-lived worker/notebook does not reload a
# multi-billion parameter model for every document.
_TRANSFORMERS_CACHE: dict[tuple[str, str, str], tuple[Any, Any, Any]] = {}


def _ollama_host() -> str:
    host = os.getenv("LOCAL_GEMMA_BASE_URL") or os.getenv("OLLAMA_HOST") or os.getenv("OLLAMA_BASE_URL") or "http://localhost:11434"
    return host.rstrip("/")


def _model() -> str:
    default = DEFAULT_TRANSFORMERS_MODEL if _runtime() == "transformers" else DEFAULT_OLLAMA_MODEL
    return (
        (os.getenv("LOCAL_GEMMA_MODEL") or "").strip()
        or (os.getenv("GEMMA_MODEL") or "").strip()
        or default
    )


def _runtime() -> str:
    runtime = os.getenv("LOCAL_GEMMA_RUNTIME", "ollama").strip().lower()
    if runtime not in {"ollama", "transformers"}:
        raise RuntimeError(
            "LOCAL_GEMMA_RUNTIME must be either 'ollama' or 'transformers'."
        )
    return runtime


def _transformers_settings() -> tuple[str, str, str, int, float]:
    device = os.getenv("LOCAL_GEMMA_DEVICE", "cuda").strip() or "cuda"
    attention = os.getenv("LOCAL_GEMMA_ATTENTION", "eager").strip() or "eager"
    try:
        max_new_tokens = max(1, int(os.getenv("LOCAL_GEMMA_MAX_NEW_TOKENS", "1024")))
        temperature = max(0.0, float(os.getenv("LOCAL_GEMMA_TEMPERATURE", "0")))
    except ValueError as exc:
        raise RuntimeError("LOCAL_GEMMA_MAX_NEW_TOKENS and LOCAL_GEMMA_TEMPERATURE must be numeric.") from exc
    return _model(), device, attention, max_new_tokens, temperature


def _load_transformers_model(model_id: str, device: str, attention: str) -> tuple[Any, Any, Any]:
    cache_key = (model_id, device, attention)
    if cache_key in _TRANSFORMERS_CACHE:
        return _TRANSFORMERS_CACHE[cache_key]

    try:
        import torch
        from transformers import AutoModelForCausalLM, AutoTokenizer
    except ImportError as exc:
        raise RuntimeError(
            "Local Transformers execution requires PyTorch and Transformers with ROCm support. "
            "Install them in the configured Gemma environment or choose Remote."
        ) from exc

    if device == "cuda" and not torch.cuda.is_available():
        raise RuntimeError(
            "Local execution requires the Gemma model to be running on the configured CUDA/ROCm device. "
            "PyTorch did not detect a GPU. Start the AMD ROCm environment or choose Remote."
        )

    tokenizer = AutoTokenizer.from_pretrained(model_id)
    model = AutoModelForCausalLM.from_pretrained(
        model_id,
        torch_dtype=torch.float16,
        device_map="auto",
        attn_implementation=attention,
    )
    model.eval()
    loaded = (tokenizer, model, torch)
    _TRANSFORMERS_CACHE[cache_key] = loaded
    return loaded


def _decode_generated_tokens(tokenizer: Any, outputs: Any, input_ids: Any) -> str:
    """Decode only the completion; Gemma output includes the input prompt prefix."""
    new_tokens = outputs[0][input_ids.shape[-1] :]
    return str(tokenizer.decode(new_tokens, skip_special_tokens=True))


class LocalBackend(ClassificationBackend):
    def run_classification(
        self,
        document_text: str,
        document_metadata: dict[str, Any],
    ) -> BackendResult:
        if _runtime() == "transformers":
            return self._run_transformers(document_text, document_metadata)
        return self._run_ollama(document_text, document_metadata)

    def _run_ollama(
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
                "Local execution requires the Gemma model to be running. Start the configured Gemma service or choose Remote. "
                f"Configured endpoint: {_ollama_host()}. Original error: {reason}"
            ) from exc

        latency_ms = (time.perf_counter() - started) * 1000.0
        output_text = str(payload.get("response") or "")
        parsed_output = parse_json_output(output_text)
        prompt_tokens = int(payload.get("prompt_eval_count") or 0)
        completion_tokens = int(payload.get("eval_count") or 0)

        return BackendResult(
            backend="local",
            underlying_provider="ollama",
            output=parsed_output,
            cost_usd=0.0,
            latency_ms=latency_ms,
            tokens_used=prompt_tokens + completion_tokens,
            reason=str(document_metadata.get("backend_reason") or "User selected local execution."),
            status="completed",
            runtime_metadata={
                "localRuntime": "ollama",
                "model": model,
                "device": "ollama_service",
                "backend": "ollama",
            },
        )

    def _run_transformers(
        self,
        document_text: str,
        document_metadata: dict[str, Any],
    ) -> BackendResult:
        prompt = build_system_and_user_prompt(document_text, document_metadata)
        model_id, device, attention, max_new_tokens, temperature = _transformers_settings()
        tokenizer, model, torch = _load_transformers_model(model_id, device, attention)
        messages = [{"role": "user", "content": prompt}]
        rendered_prompt = tokenizer.apply_chat_template(
            messages,
            tokenize=False,
            add_generation_prompt=True,
        )
        inputs = tokenizer(rendered_prompt, return_tensors="pt")
        target_device = getattr(model, "device", None)
        if target_device is not None:
            inputs = inputs.to(target_device)

        generation_kwargs: dict[str, Any] = {
            **inputs,
            "max_new_tokens": max_new_tokens,
            "do_sample": temperature > 0,
        }
        if temperature > 0:
            generation_kwargs["temperature"] = temperature

        started = time.perf_counter()
        try:
            with torch.inference_mode():
                outputs = model.generate(**generation_kwargs)
        except Exception as exc:
            raise RuntimeError(
                "Local execution requires the Gemma model to be running. "
                "Check the configured Transformers/ROCm environment or choose Remote. "
                f"Original error: {exc}"
            ) from exc

        output_text = _decode_generated_tokens(tokenizer, outputs, inputs["input_ids"])
        latency_ms = (time.perf_counter() - started) * 1000.0
        input_tokens = int(inputs["input_ids"].shape[-1])
        output_tokens = int(outputs[0].shape[-1] - input_tokens)
        return BackendResult(
            backend="local",
            underlying_provider="transformers",
            output=parse_json_output(output_text),
            cost_usd=0.0,
            latency_ms=latency_ms,
            tokens_used=input_tokens + output_tokens,
            input_tokens=input_tokens,
            output_tokens=output_tokens,
            reason=str(document_metadata.get("backend_reason") or "User selected local execution."),
            status="completed",
            gpu_vendor="AMD",
            runtime_version=str(getattr(torch, "__version__", "unknown")),
            runtime_metadata={
                "localRuntime": "transformers",
                "model": model_id,
                "device": device,
                "backend": "torch-rocm",
            },
        )


def run_classification(document_text: str, document_metadata: dict[str, Any]) -> BackendResult:
    return LocalBackend().run_classification(document_text, document_metadata)
