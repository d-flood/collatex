import unittest
from unittest.mock import patch
import importlib.util
from pathlib import Path


_MODULE_PATH = Path(__file__).resolve().parents[1] / "collatex" / "string_similarity.py"
_SPEC = importlib.util.spec_from_file_location("collatex_string_similarity", _MODULE_PATH)
_MOD = importlib.util.module_from_spec(_SPEC)
_SPEC.loader.exec_module(_MOD)
similarity_ratio = _MOD.similarity_ratio


class TestStringSimilarity(unittest.TestCase):
    def test_ratio_is_normalized(self):
        score = similarity_ratio("this", "this")
        self.assertGreaterEqual(score, 0.0)
        self.assertLessEqual(score, 1.0)
        self.assertEqual(1.0, score)

    def test_fallback_without_rapidfuzz(self):
        with patch.object(_MOD, "fuzz", None):
            score = similarity_ratio("abcd", "abce")
        self.assertGreaterEqual(score, 0.0)
        self.assertLessEqual(score, 1.0)


if __name__ == "__main__":
    unittest.main()
