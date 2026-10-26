#!/usr/bin/env python3
"""Regression tests for portable retinal reference verification."""
from contextlib import contextmanager
from copy import deepcopy
import json
from pathlib import Path
import shutil
import tempfile
import unittest

import numpy as np

import verify_reproduction as verification


class ReferenceReproductionTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.stored = verification.load_reference(verification.ROOT)

    def candidate(self):
        return deepcopy(self.stored)

    def compare(self, candidate):
        return verification.compare_references(self.stored, candidate)

    @contextmanager
    def temporary_reference(self):
        with tempfile.TemporaryDirectory(prefix="retinal-verification-test-") as temporary:
            root = Path(temporary)
            for relative in (verification.ASSETS, verification.PERCEPT):
                shutil.copytree(verification.ROOT / relative, root / relative)
            (root / verification.FIELD).parent.mkdir(parents=True)
            shutil.copyfile(verification.ROOT / verification.FIELD, root / verification.FIELD)
            yield root

    def test_exact_reproduction_is_accepted(self):
        report = self.compare(self.candidate())
        self.assertEqual(report["geometryMaximumAbsoluteUm"], 0)
        self.assertEqual(report["perceptMaximumRelativeToPeak"], 0)
        self.assertEqual(report["currentDensityMaximumRelative"], 0)

    def test_bounded_roundoff_is_accepted(self):
        candidate = self.candidate()
        candidate["arrays"]["RE.d0"][5] += 0.001
        values = candidate["percepts"]["scoreboard-center"]
        index = np.argmax(values)
        values[index] = np.nextafter(values[index], np.float32(np.inf))
        expected = candidate["field"]["cases"][0]["expected"]
        expected["currentDensityAm2"] = float(np.nextafter(expected["currentDensityAm2"], np.inf))
        report = self.compare(candidate)
        self.assertGreater(report["geometryMaximumAbsoluteUm"], 0)
        self.assertGreater(report["perceptMaximumRelativeToPeak"], 0)
        self.assertGreater(report["currentDensityMaximumRelative"], 0)

    def test_corrupted_stored_chunk_is_rejected(self):
        with self.temporary_reference() as root:
            path = root / verification.ASSETS / "axon-part-000.bin"
            data = bytearray(path.read_bytes())
            data[8] ^= 1
            path.write_bytes(data)
            with self.assertRaisesRegex(ValueError, "Checksum mismatch"):
                verification.load_reference(root)

    def test_generator_provenance_mismatch_is_rejected(self):
        with self.temporary_reference() as root:
            path = root / verification.PERCEPT / "provenance.json"
            provenance = json.loads(path.read_text())
            provenance["generatorSha256"] = "0" * 64
            path.write_text(json.dumps(provenance))
            with self.assertRaisesRegex(ValueError, "Generator provenance checksum differs"):
                verification.load_reference(root)

    def test_source_provenance_change_is_rejected(self):
        candidate = self.candidate()
        candidate["provenance"]["sourceSdistSha256"] = "0" * 64
        with self.assertRaisesRegex(ValueError, "source/generator/dependency provenance"):
            self.compare(candidate)

    def test_integer_bundle_assignment_change_is_rejected(self):
        candidate = self.candidate()
        candidate["arrays"]["RE.bundleIndex"][5] += 1
        with self.assertRaisesRegex(ValueError, "Integer geometry assignments differ"):
            self.compare(candidate)

    def test_model_metadata_change_is_rejected(self):
        candidate = self.candidate()
        candidate["geometry"]["settings"]["nAxons"] += 1
        with self.assertRaisesRegex(ValueError, "geometry structure/settings"):
            self.compare(candidate)

    def test_array_shape_change_is_rejected(self):
        candidate = self.candidate()
        candidate["arrays"]["RE.d0"] = candidate["arrays"]["RE.d0"][:-1]
        with self.assertRaisesRegex(ValueError, "Array shape/dtype differs"):
            self.compare(candidate)

    def test_geometry_just_above_bound_is_rejected(self):
        candidate = self.candidate()
        candidate["arrays"]["RE.d0"][5] += verification.GEOMETRY_ABSOLUTE_UM * 1.01
        with self.assertRaisesRegex(ValueError, "Geometry difference exceeds"):
            self.compare(candidate)

    def test_percept_maximum_above_bound_is_rejected(self):
        candidate = self.candidate()
        values = candidate["percepts"]["scoreboard-center"]
        peak = float(values.max())
        values[np.argmax(values)] += np.float32(peak * verification.PERCEPT_MAXIMUM_RELATIVE_TO_PEAK * 1.1)
        with self.assertRaisesRegex(ValueError, "Percept maximum error exceeds bound"):
            self.compare(candidate)

    def test_percept_rms_above_bound_is_rejected(self):
        candidate = self.candidate()
        values = candidate["percepts"]["scoreboard-center"]
        values += np.float32(float(values.max()) * verification.PERCEPT_RMS_RELATIVE_TO_PEAK * 2)
        with self.assertRaisesRegex(ValueError, "Percept RMS error exceeds bound"):
            self.compare(candidate)

    def test_zero_percept_control_change_is_rejected(self):
        candidate = self.candidate()
        candidate["percepts"]["axon-zero"][0] = np.float32(1e-20)
        with self.assertRaisesRegex(ValueError, "Zero percept control differs"):
            self.compare(candidate)

    def test_nonfinite_percept_value_is_rejected(self):
        candidate = self.candidate()
        candidate["percepts"]["scoreboard-center"][0] = np.nan
        with self.assertRaisesRegex(ValueError, "Nonfinite array"):
            self.compare(candidate)

    def test_density_above_bound_is_rejected(self):
        candidate = self.candidate()
        candidate["field"]["cases"][0]["expected"]["currentDensityAm2"] *= 1 + 2e-15
        with self.assertRaisesRegex(ValueError, "Current density difference exceeds bound"):
            self.compare(candidate)

    def test_non_density_field_change_is_rejected(self):
        candidate = self.candidate()
        expected = candidate["field"]["cases"][0]["expected"]
        expected["potentialMv"] = float(np.nextafter(expected["potentialMv"], np.inf))
        with self.assertRaisesRegex(ValueError, "field potential/vector"):
            self.compare(candidate)

    def test_field_input_change_is_rejected(self):
        candidate = self.candidate()
        candidate["field"]["cases"][0]["sources"][0]["currentUa"] += 1
        with self.assertRaisesRegex(ValueError, "field inputs"):
            self.compare(candidate)


if __name__ == "__main__":
    unittest.main(verbosity=2)
