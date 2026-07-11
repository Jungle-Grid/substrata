from __future__ import annotations

import contextlib
import os
import sys
import unittest
from pathlib import Path
from unittest.mock import patch

SRC_DIR = Path(__file__).resolve().parents[1] / "src"
if str(SRC_DIR) not in sys.path:
    sys.path.insert(0, str(SRC_DIR))

from backends.local_backend import LocalBackend, _TRANSFORMERS_CACHE, _decode_generated_tokens
from main import select_backend


class FakeTokens:
    def __init__(self, values: list[int]):
        self.values = values
        self.shape = (len(values),)

    def __getitem__(self, item):
        return self.values[item]


class FakeInputs(dict):
    def to(self, _device):
        return self


class FakeTokenizer:
    def apply_chat_template(self, messages, *, tokenize, add_generation_prompt):
        self.messages = messages
        self.tokenize = tokenize
        self.add_generation_prompt = add_generation_prompt
        return "rendered prompt"

    def __call__(self, _prompt, *, return_tensors):
        assert return_tensors == "pt"
        return FakeInputs(input_ids=FakeTokens([10, 11, 12]))

    def decode(self, tokens, *, skip_special_tokens):
        assert skip_special_tokens is True
        self.decoded_tokens = tokens
        return '{"product_identity": {"product_name": "AX920"}}'


class FakeModel:
    device = None

    def generate(self, **kwargs):
        self.generation_kwargs = kwargs
        return [FakeTokens([10, 11, 12, 20, 21])]


class FakeTorch:
    __version__ = "rocm-test"

    @staticmethod
    def inference_mode():
        return contextlib.nullcontext()


class LocalTransformersBackendTests(unittest.TestCase):
    def setUp(self):
        _TRANSFORMERS_CACHE.clear()
        self.env = {
            "LOCAL_GEMMA_RUNTIME": "transformers",
            "LOCAL_GEMMA_MODEL": "google/gemma-4-E4B-it",
            "LOCAL_GEMMA_DEVICE": "cuda",
            "LOCAL_GEMMA_ATTENTION": "eager",
            "LOCAL_GEMMA_MAX_NEW_TOKENS": "1024",
            "LOCAL_GEMMA_TEMPERATURE": "0",
        }

    def test_decodes_only_generated_tokens(self):
        tokenizer = FakeTokenizer()
        decoded = _decode_generated_tokens(tokenizer, [FakeTokens([1, 2, 3, 4, 5])], FakeTokens([1, 2, 3]))
        self.assertEqual(decoded, '{"product_identity": {"product_name": "AX920"}}')
        self.assertEqual(tokenizer.decoded_tokens, [4, 5])

    def test_transformers_runtime_returns_parsed_json_and_trace_metadata(self):
        tokenizer, model, torch = FakeTokenizer(), FakeModel(), FakeTorch()
        with patch.dict(os.environ, self.env, clear=False), patch(
            "backends.local_backend._load_transformers_model",
            return_value=(tokenizer, model, torch),
        ):
            result = LocalBackend().run_classification("AX920 accelerator", {"document_title": "AX920"})

        self.assertEqual(result.output["product_identity"]["product_name"], "AX920")
        self.assertEqual(result.underlying_provider, "transformers")
        self.assertEqual(result.runtime_metadata, {
            "localRuntime": "transformers",
            "model": "google/gemma-4-E4B-it",
            "device": "cuda",
            "backend": "torch-rocm",
        })
        self.assertFalse(model.generation_kwargs["do_sample"])

    def test_ollama_runtime_preserves_existing_local_path(self):
        ollama_result = object()
        with patch.dict(os.environ, {"LOCAL_GEMMA_RUNTIME": "ollama"}, clear=False), patch.object(
            LocalBackend, "_run_ollama", return_value=ollama_result
        ) as ollama, patch.object(LocalBackend, "_run_transformers") as transformers:
            result = LocalBackend().run_classification("AX920", {})

        self.assertIs(result, ollama_result)
        ollama.assert_called_once()
        transformers.assert_not_called()

    def test_local_execution_selects_only_the_local_backend(self):
        self.assertEqual(select_backend("local", "gemma_local"), "local")
        self.assertNotEqual(select_backend("local", "gemma_local"), "fireworks")


if __name__ == "__main__":
    unittest.main()
