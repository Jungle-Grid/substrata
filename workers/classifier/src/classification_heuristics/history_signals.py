from __future__ import annotations

import re


ECCN_PATTERN = re.compile(r"\b[0-9][A-Z][0-9]{3}(?:\.[A-Za-z0-9]+|[A-Za-z0-9]*)?\b")


def build_history_signals(matches: list[dict] | None) -> list[dict]:
    signals: list[dict] = []
    for match in matches or []:
        text = " ".join(str(match.get(key, "")) for key in ("title", "sourceFileName", "excerpt", "content"))
        codes = sorted(set(ECCN_PATTERN.findall(text)))
        signals.append({
            "source": match.get("sourceFileName") or match.get("title") or "Internal company history",
            "score": float(match.get("score", 0)),
            "matchTier": match.get("matchTier", "partial"),
            "priorEccns": codes,
            "influence": "priority_only",
            "warning": "Internal company history is comparison context, not classification authority.",
        })
    return signals
