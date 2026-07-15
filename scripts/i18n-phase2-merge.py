#!/usr/bin/env python3
"""Merge Phase 2 dashboard i18n keys into en.json and pt-BR.json."""
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
PHASE2 = ROOT / "scripts" / "i18n-phase2-keys.json"

def deep_merge(base: dict, extra: dict) -> dict:
    for k, v in extra.items():
        if k in base and isinstance(base[k], dict) and isinstance(v, dict):
            deep_merge(base[k], v)
        else:
            base[k] = v
    return base

def main():
    keys = json.loads(PHASE2.read_text(encoding="utf-8"))
    for locale in ("en", "pt-BR"):
        path = ROOT / "i18n" / "locales" / f"{locale}.json"
        data = json.loads(path.read_text(encoding="utf-8"))
        deep_merge(data, keys[locale])
        path.write_text(json.dumps(data, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
        json.loads(path.read_text(encoding="utf-8"))
        print(f"OK {path}")

if __name__ == "__main__":
    main()
