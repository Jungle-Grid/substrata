from __future__ import annotations

import json
import os
import time
import urllib.error
import urllib.parse
import urllib.request
import uuid
from typing import Any

from .base import (
    BackendResult,
    ClassificationBackend,
    build_backend_prompt,
    parse_json_output,
)


DEFAULT_API_URL = "https://api.junglegrid.dev"
DEFAULT_IMAGE = "ghcr.io/jungle-grid/substrata-jungle-grid-inference:rocm"
DEFAULT_MODEL = "gemma4:12b"


def _api_url() -> str:
    api_url = os.getenv("JUNGLE_GRID_API_URL") or os.getenv("JUNGLE_GRID_BASE_URL") or DEFAULT_API_URL
    return api_url.rstrip("/")


def _api_key() -> str:
    api_key = os.getenv("JUNGLE_GRID_API_KEY", "").strip()
    if not api_key:
        raise RuntimeError("JUNGLE_GRID_API_KEY is not configured.")
    return api_key


def _headers() -> dict[str, str]:
    return {
        "Content-Type": "application/json",
        "Authorization": f"Bearer {_api_key()}",
    }


def _request(method: str, path: str, payload: dict[str, Any] | None = None, timeout_s: float = 30.0) -> dict[str, Any]:
    data = None if payload is None else json.dumps(payload).encode("utf-8")
    request = urllib.request.Request(
        f"{_api_url()}{path}",
        data=data,
        headers=_headers(),
        method=method,
    )
    with urllib.request.urlopen(request, timeout=timeout_s) as response:
        return json.loads(response.read().decode("utf-8"))


def submit_job(payload: dict[str, Any], timeout_s: float = 20.0) -> dict[str, Any]:
    try:
        return _request("POST", "/v1/jobs", payload, timeout_s=timeout_s)
    except urllib.error.HTTPError as exc:
        response_body = exc.read().decode("utf-8", errors="replace")
        raise RuntimeError(
            "Execution submit failed validation. Treat this as unknown/reconciling only if "
            f"the service may still have accepted the job. HTTP {exc.code}: {response_body.strip() or exc.reason}"
        ) from exc
    except urllib.error.URLError as exc:
        reason = getattr(exc, "reason", exc)
        raise RuntimeError(
            "Execution submit could not be completed. Treat this as unknown/reconciling and "
            f"poll for the job outcome instead of resubmitting. Original error: {reason}"
        ) from exc


def estimate_job(payload: dict[str, Any]) -> dict[str, Any]:
    return _request("POST", "/v1/jobs/estimate", payload, timeout_s=30.0)


def get_job(job_id: str) -> dict[str, Any]:
    return _request("GET", f"/v1/jobs/{urllib.parse.quote(job_id)}", timeout_s=30.0)


def get_job_logs(job_id: str, limit: int = 100, cursor: str | None = None) -> dict[str, Any]:
    query = {"limit": str(limit)}
    if cursor:
        query["cursor"] = cursor
    return _request(
        "GET",
        f"/v1/jobs/{urllib.parse.quote(job_id)}/logs?{urllib.parse.urlencode(query)}",
        timeout_s=30.0,
    )


def list_jobs(limit: int = 20, cursor: str | None = None, status: str | None = None) -> dict[str, Any]:
    query = {"limit": str(limit)}
    if cursor:
        query["cursor"] = cursor
    if status:
        query["status"] = status
    return _request("GET", f"/v1/jobs?{urllib.parse.urlencode(query)}", timeout_s=30.0)


def _normalize_status(payload: dict[str, Any]) -> str:
    status = str(payload.get("status") or payload.get("phase") or "").lower()
    if status in {"queued", "pending", "waiting", "submitted"}:
        return "queued"
    if status in {"running", "starting", "provisioning", "booting", "scheduled", "assigned"}:
        return "running"
    if status in {"completed", "success", "succeeded", "done"}:
        return "completed"
    if status in {"failed", "error", "cancelled", "canceled"}:
        return "failed"
    if status in {"unknown", "reconciling"}:
        return "reconciling"
    return "unknown"


def _extract_provider(payload: dict[str, Any]) -> str | None:
    scheduling = payload.get("scheduling") or {}
    provider = payload.get("provider") or scheduling.get("provider") or scheduling.get("placement_provider")
    if isinstance(provider, dict):
        return str(provider.get("name") or provider.get("provider") or provider.get("id") or "").strip() or None
    return str(provider).strip() or None if provider is not None else None


def _extract_cost(payload: dict[str, Any]) -> float:
    for key in ("cost_usd", "costUsd", "actual_cost_usd", "actualCostUsd"):
        if payload.get(key) is not None:
            try:
                return float(payload[key])
            except (TypeError, ValueError):
                continue
    billing = payload.get("billing") or {}
    for key in ("cost_usd", "costUsd", "total_cost_usd"):
        if billing.get(key) is not None:
            try:
                return float(billing[key])
            except (TypeError, ValueError):
                continue
    return 0.0


def _extract_tokens(payload: dict[str, Any]) -> int:
    usage = payload.get("usage") or payload.get("metrics") or {}
    prompt_tokens = int(usage.get("prompt_tokens") or usage.get("input_tokens") or 0)
    completion_tokens = int(usage.get("completion_tokens") or usage.get("output_tokens") or 0)
    return prompt_tokens + completion_tokens


def _extract_usage(payload: dict[str, Any]) -> tuple[int, int]:
    usage = payload.get("usage") or payload.get("metrics") or {}
    return (
        int(usage.get("prompt_tokens") or usage.get("input_tokens") or 0),
        int(usage.get("completion_tokens") or usage.get("output_tokens") or 0),
    )


def _extract_hardware(payload: dict[str, Any]) -> tuple[str | None, str | None, str | None]:
    scheduling = payload.get("scheduling") or {}
    hardware = payload.get("hardware") or scheduling.get("hardware") or {}
    gpu = payload.get("gpu") or scheduling.get("gpu") or hardware.get("gpu") or {}
    if not isinstance(gpu, dict):
        gpu = {}
    vendor = gpu.get("vendor") or hardware.get("gpu_vendor") or payload.get("gpu_vendor")
    name = gpu.get("name") or gpu.get("model") or hardware.get("gpu_name") or payload.get("gpu_name")
    runtime = gpu.get("runtime_version") or hardware.get("rocm_version") or payload.get("rocm_version")
    return (
        str(vendor).strip() if vendor else None,
        str(name).strip() if name else None,
        str(runtime).strip() if runtime else None,
    )


def _extract_image_digest(payload: dict[str, Any]) -> str | None:
    image = payload.get("image") or (payload.get("scheduling") or {}).get("image") or {}
    value = image.get("digest") if isinstance(image, dict) else payload.get("image_digest")
    return str(value).strip() if value else None


def _extract_output(payload: dict[str, Any]) -> str:
    for key in ("output", "response", "result"):
        value = payload.get(key)
        if isinstance(value, str):
            return value

    artifacts = payload.get("artifacts") or []
    if isinstance(artifacts, list) and artifacts:
        first = artifacts[0] or {}
        if isinstance(first, dict):
            for key in ("content", "text", "data"):
                if isinstance(first.get(key), str):
                    return first[key]
    return ""


def poll_until_resolved(job_id: str, timeout_s: float = 300.0, interval_s: float = 5.0) -> dict[str, Any]:
    started = time.perf_counter()
    last_payload: dict[str, Any] | None = None

    while True:
        payload = get_job(job_id)
        last_payload = payload
        status = _normalize_status(payload)
        if status in {"completed", "failed"}:
            return payload

        if (time.perf_counter() - started) >= timeout_s:
            return {
                "job_id": job_id,
                "status": "unknown",
                "phase": payload.get("phase"),
                "provider": payload.get("provider"),
                "raw": last_payload,
                "error": "Timed out while polling the execution backend; job remains reconciling/unknown.",
            }

        time.sleep(interval_s)


def find_recent_job_by_request_id(request_id: str, limit: int = 20) -> dict[str, Any] | None:
    try:
        payload = list_jobs(limit=limit)
    except Exception:
        return None

    jobs = payload.get("jobs") or []
    if not isinstance(jobs, list):
        return None
    for job in jobs:
        if not isinstance(job, dict):
            continue
        metadata = job.get("metadata") or {}
        if isinstance(metadata, dict) and metadata.get("client_request_id") == request_id:
            return job
    return None


def normalize_execution(job_id: str, payload: dict[str, Any], logs: dict[str, Any] | None = None) -> dict[str, Any]:
    status = _normalize_status(payload)
    output = _extract_output(payload)
    if not output and logs:
        items = logs.get("items") or []
        if isinstance(items, list):
            stdout_lines = []
            for item in items:
                if not isinstance(item, dict):
                    continue
                if item.get("stream") == "stdout" and isinstance(item.get("message"), str):
                    stdout_lines.append(item["message"])
            output = "\n".join(stdout_lines).strip()

    return {
        "job_id": job_id,
        "status": status,
        "output": output,
        "latency_ms": float(payload.get("latency_ms") or payload.get("duration_ms") or 0.0),
        "cost_usd": _extract_cost(payload),
        "tokens": _extract_tokens(payload),
        "raw": payload,
        "underlying_provider": _extract_provider(payload),
        "error": (
            str(
                (payload.get("failure") or {}).get("summary")
                or payload.get("status_reason")
                or payload.get("status_message")
                or "Execution backend reported a failed job."
            )
            if status == "failed"
            else None
            if status == "completed"
            else "Job is still reconciling."
        ),
    }


def _build_payload(document_text: str, document_metadata: dict[str, Any]) -> dict[str, Any]:
    prompt = build_backend_prompt(document_text, document_metadata)
    request_id = str(uuid.uuid4())
    image = os.getenv("JUNGLE_GRID_IMAGE", DEFAULT_IMAGE).strip() or DEFAULT_IMAGE
    model = os.getenv("JUNGLE_GRID_MODEL", DEFAULT_MODEL).strip() or DEFAULT_MODEL
    command = ["/app/run-extraction.sh"]
    return {
        "name": "Substrata ECCN review extraction",
        "workload_type": "inference",
        "image": image,
        "command": command,
        "environment": {
            "SUBSTRATA_MODEL": model,
            "SUBSTRATA_PROMPT": prompt,
            "SUBSTRATA_RUNTIME_BACKEND": os.getenv("JUNGLE_GRID_RUNTIME_BACKEND", "rocm"),
        },
        "resources": {
            "gpu": True,
            "gpu_count": 1,
            "gpu_vendor": os.getenv("JUNGLE_GRID_GPU_VENDOR", "AMD"),
        },
        "prompt": prompt,
        "max_output_tokens": 4000,
        "routing": {
            "preference": "auto",
            "max_cost_usd": 1.0,
            "preferred_latency_ms": 30000,
        },
        "metadata": {
            "source": "substrata",
            "document_id": document_metadata.get("document_id"),
            "document_title": document_metadata.get("document_title"),
            "image": image,
            "model": model,
            "runtime_backend": os.getenv("JUNGLE_GRID_RUNTIME_BACKEND", "rocm"),
            "client_request_id": request_id,
        },
    }


class JungleGridBackend(ClassificationBackend):
    def run_classification(
        self,
        document_text: str,
        document_metadata: dict[str, Any],
    ) -> BackendResult:
        payload = _build_payload(document_text, document_metadata)
        request_id = str(payload["metadata"]["client_request_id"])
        reason = str(document_metadata.get("backend_reason") or "User selected managed remote execution.")

        try:
            estimate_job(payload)
        except Exception:
            pass

        started = time.perf_counter()
        try:
            submitted = submit_job(payload, timeout_s=20.0)
        except Exception as exc:
            reconciled = find_recent_job_by_request_id(request_id, limit=20)
            if reconciled and reconciled.get("job_id"):
                job_id = str(reconciled["job_id"])
                resolved = poll_until_resolved(job_id, timeout_s=300.0)
                logs = None
                try:
                    logs = get_job_logs(job_id)
                except Exception:
                    logs = None
                execution = normalize_execution(job_id, resolved, logs=logs)
                latency_ms = (time.perf_counter() - started) * 1000.0
                if execution["status"] == "completed":
                    input_tokens, output_tokens = _extract_usage(resolved)
                    gpu_vendor, gpu_name, runtime_version = _extract_hardware(resolved)
                    return BackendResult(
                        backend="jungle_grid",
                        underlying_provider=execution["underlying_provider"],
                        output=parse_json_output(str(execution["output"] or "")),
                        cost_usd=float(execution["cost_usd"] or 0.0),
                        latency_ms=latency_ms,
                        tokens_used=int(execution["tokens"] or 0),
                        reason=reason,
                        status="completed",
                        job_id=job_id,
                        gpu_vendor=gpu_vendor,
                        gpu_name=gpu_name,
                        runtime_version=runtime_version,
                        image_name=str(payload["image"]),
                        image_digest=_extract_image_digest(resolved),
                        input_tokens=input_tokens,
                        output_tokens=output_tokens,
                    )
                return BackendResult(
                    backend="jungle_grid",
                    underlying_provider=execution["underlying_provider"],
                    output={},
                    cost_usd=float(execution["cost_usd"] or 0.0),
                    latency_ms=latency_ms,
                    tokens_used=int(execution["tokens"] or 0),
                    reason=reason,
                    status="unknown",
                    error=str(execution.get("error") or exc),
                )

            return BackendResult(
                backend="jungle_grid",
                underlying_provider=None,
                output={},
                cost_usd=0.0,
                latency_ms=(time.perf_counter() - started) * 1000.0,
                tokens_used=0,
                reason=reason,
                status="unknown",
                error=f"Execution submit is still reconciling: {exc}",
            )

        job_id = str(submitted.get("job_id") or submitted.get("id") or submitted.get("jobId") or "")
        if not job_id:
            return BackendResult(
                backend="jungle_grid",
                underlying_provider=None,
                output={},
                cost_usd=0.0,
                latency_ms=(time.perf_counter() - started) * 1000.0,
                tokens_used=0,
                reason=reason,
                status="unknown",
                error="Execution backend did not return a job identifier.",
            )

        resolved = poll_until_resolved(job_id, timeout_s=300.0)
        logs = None
        try:
            logs = get_job_logs(job_id)
        except Exception:
            logs = None

        execution = normalize_execution(job_id, resolved, logs=logs)
        latency_ms = (time.perf_counter() - started) * 1000.0

        if execution["status"] == "completed":
            input_tokens, output_tokens = _extract_usage(resolved)
            gpu_vendor, gpu_name, runtime_version = _extract_hardware(resolved)
            return BackendResult(
                backend="jungle_grid",
                underlying_provider=execution["underlying_provider"],
                output=parse_json_output(str(execution["output"] or "")),
                cost_usd=float(execution["cost_usd"] or 0.0),
                latency_ms=latency_ms,
                tokens_used=int(execution["tokens"] or 0),
                reason=reason,
                status="completed",
                job_id=job_id,
                gpu_vendor=gpu_vendor,
                gpu_name=gpu_name,
                runtime_version=runtime_version,
                image_name=str(payload["image"]),
                image_digest=_extract_image_digest(resolved),
                input_tokens=input_tokens,
                output_tokens=output_tokens,
            )

        if execution["status"] == "failed":
            return BackendResult(
                backend="jungle_grid",
                underlying_provider=execution["underlying_provider"],
                output={},
                cost_usd=float(execution["cost_usd"] or 0.0),
                latency_ms=latency_ms,
                tokens_used=int(execution["tokens"] or 0),
                reason=reason,
                status="failed",
                error=str(execution.get("error") or "Execution backend reported a failed job."),
                job_id=job_id,
                image_name=str(payload["image"]),
                image_digest=_extract_image_digest(resolved),
            )

        return BackendResult(
            backend="jungle_grid",
            underlying_provider=execution["underlying_provider"],
            output={},
            cost_usd=float(execution["cost_usd"] or 0.0),
            latency_ms=latency_ms,
            tokens_used=int(execution["tokens"] or 0),
            reason=reason,
            status="unknown",
            error=str(execution.get("error") or "Execution backend remains unresolved."),
            job_id=job_id,
            image_name=str(payload["image"]),
            image_digest=_extract_image_digest(resolved),
        )


def run_classification(document_text: str, document_metadata: dict[str, Any]) -> BackendResult:
    return JungleGridBackend().run_classification(document_text, document_metadata)
