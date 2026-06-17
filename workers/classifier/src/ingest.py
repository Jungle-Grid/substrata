from __future__ import annotations

import json
from pathlib import Path

from schemas import WorkerInput


def load_input(payload_path: str) -> WorkerInput:
    payload = json.loads(Path(payload_path).read_text())
    return WorkerInput(**payload)

