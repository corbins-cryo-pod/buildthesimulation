#!/usr/bin/env python3
"""Regression checks for reference integrity and bounded CPU roundoff."""
from __future__ import annotations

import base64
from contextlib import redirect_stdout
from copy import deepcopy
import io
from pathlib import Path
import shutil
import tempfile
import unittest
import zlib

import numpy as np

import percept_reference as reference


class PerceptReferenceVerificationTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.directory = reference.ROOT / "tests/fixtures/prima-percept"
        cls.stored, _, _ = reference.load_verified_fixture(cls.directory)
        cls.case_index = next(
            index for index, case in enumerate(cls.stored["cases"])
            if case["name"] == "gradient-gamma"
        )

    def candidate(self, field, transform):
        result = deepcopy(self.stored)
        case = result["cases"][self.case_index]
        values = np.frombuffer(
            zlib.decompress(base64.b64decode(case[field])), dtype="<f8"
        ).copy()
        case[field] = reference.encode(transform(values))
        return result

    @staticmethod
    def change_sample(values, value):
        values[5] = value(values[5])
        return values

    def compare(self, candidate):
        # Keep intentional rejection diagnostics out of unittest's summary.
        with redirect_stdout(io.StringIO()):
            return reference.compare_reference(self.stored, candidate)

    def test_tone_roundoff_within_bound_is_accepted(self):
        candidate = self.candidate("expected", lambda values: self.change_sample(
            values, lambda value: value + np.finfo(np.float64).eps
        ))
        delta = self.compare(candidate)
        self.assertGreater(delta, 0)
        self.assertLessEqual(delta, reference.TONE_REGEN_ABSOLUTE_TOLERANCE)

    def test_tone_error_above_bound_is_rejected(self):
        candidate = self.candidate("expected", lambda values: self.change_sample(
            values, lambda value: value + 1e-14
        ))
        with self.assertRaisesRegex(ValueError, "Reference numerical mismatch: gradient-gamma/expected"):
            self.compare(candidate)

    def test_nonfinite_tone_value_is_rejected(self):
        candidate = self.candidate("expected", lambda values: self.change_sample(
            values, lambda _: np.nan
        ))
        with self.assertRaisesRegex(ValueError, "Nonfinite reference values: gradient-gamma/expected"):
            self.compare(candidate)

    def test_wrong_array_length_is_rejected(self):
        candidate = self.candidate("expected", lambda values: values[:-1])
        with self.assertRaisesRegex(ValueError, "Reference array byte length differs: gradient-gamma/expected"):
            self.compare(candidate)

    def test_one_ulp_spatial_change_is_rejected(self):
        candidate = self.candidate("spatial", lambda values: self.change_sample(
            values, lambda value: np.nextafter(value, np.inf)
        ))
        with self.assertRaisesRegex(ValueError, "Reference numerical mismatch: gradient-gamma/spatial"):
            self.compare(candidate)

    def test_corrupted_chunk_is_rejected_before_fixture_parsing(self):
        with tempfile.TemporaryDirectory(prefix="prima-reference-integrity-") as temporary:
            directory = Path(temporary) / "fixture"
            shutil.copytree(self.directory, directory)
            first_chunk = directory / "chunk-0000.txt"
            data = bytearray(first_chunk.read_bytes())
            data[0] ^= 1  # Also makes the reconstructed JSON invalid.
            first_chunk.write_bytes(data)
            with self.assertRaisesRegex(ValueError, "Stored reference chunk checksum mismatch: chunk-0000.txt"):
                reference.load_verified_fixture(directory)


if __name__ == "__main__":
    unittest.main(verbosity=2)
