from __future__ import annotations

from pathlib import Path


def extract_text(file_path: str) -> str:
    path = Path(file_path)

    if path.suffix.lower() == ".pdf":
        return (
            "PDF parsing is stubbed in the MVP. "
            "Use a text sample or replace this module with a real extractor later."
        )

    return path.read_text()

