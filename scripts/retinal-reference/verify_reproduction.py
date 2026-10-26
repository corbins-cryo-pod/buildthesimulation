#!/usr/bin/env python3
"""Verify immutable retinal references against a separate native regeneration.

Stored hashes remain exact. Only demonstrated CPU-dependent floating arithmetic
is compared numerically; source, topology, inputs, and zero controls stay exact.
"""
from __future__ import annotations

import argparse
import gzip
import hashlib
import json
import math
import os
from pathlib import Path
import platform

import numpy as np

ROOT = Path(__file__).resolve().parents[2]
ASSETS = Path("public/assets/retinal-implant")
PERCEPT = Path("tests/fixtures/retinal-percept")
FIELD = Path("tests/fixtures/retinal-field/independent-reference.json")
GEOMETRY_ABSOLUTE_UM = 0.004
PERCEPT_MAXIMUM_RELATIVE_TO_PEAK = 2e-6
PERCEPT_RMS_RELATIVE_TO_PEAK = 1e-7
CURRENT_DENSITY_RELATIVE = 1e-15


def require(condition, message):
    if not condition:
        raise ValueError(message)


def canonical(value):
    return json.dumps(value, sort_keys=True, separators=(",", ":"), allow_nan=False)


def exact(left, right, label):
    require(canonical(left) == canonical(right), f"Exact metadata differs: {label}")


def without(value, *keys):
    return {key: item for key, item in value.items() if key not in keys}


def read_json(path):
    result = json.loads(path.read_text())
    canonical(result)  # Reject nonfinite JSON numbers, including metadata.
    return result


def digest(data):
    return hashlib.sha256(data).hexdigest()


def checked_bytes(path, expected_hash, expected_size=None):
    data = path.read_bytes()
    require(expected_size is None or len(data) == expected_size, f"Byte count differs: {path.name}")
    require(digest(data) == expected_hash, f"Checksum mismatch: {path.name}")
    return data


def finite_arrays(left, right, label):
    require(left.shape == right.shape and left.dtype == right.dtype, f"Array shape/dtype differs: {label}")
    require(np.all(np.isfinite(left)) and np.all(np.isfinite(right)), f"Nonfinite array: {label}")


def load_reference(root):
    assets, fixtures = root / ASSETS, root / PERCEPT
    geometry = read_json(assets / "axon-reference.json")
    require(geometry["schema"] == "retinal-axon-reference-v2", "Unsupported geometry schema")
    storage = geometry["storage"]
    require(storage["format"] == "gzip-chunks" and storage["transform"] == "xor-halves-byte-shuffle-8",
            "Unsupported geometry storage")
    parts = []
    for index, entry in enumerate(storage["chunks"]):
        require(entry["file"] == f"axon-part-{index:03}.bin", "Invalid geometry chunk order")
        require(type(entry["bytes"]) is int and 0 < entry["bytes"] <= 65536, "Invalid geometry chunk size")
        parts.append(checked_bytes(assets / entry["file"], entry["sha256"], entry["bytes"]))
    packed = b"".join(parts)
    require(len(packed) == storage["compressedBytes"], "Compressed geometry byte count differs")
    encoded = gzip.decompress(packed)
    require(len(encoded) == geometry["byteLength"] and len(encoded) % 16 == 0, "Geometry byte count differs")
    decoded = np.frombuffer(encoded, dtype=np.uint8).reshape(8, -1).T.copy().ravel()
    decoded[len(decoded) // 2:] ^= decoded[:len(decoded) // 2]
    raw = decoded.tobytes()
    require(digest(raw) == geometry["dataSha256"], "Reconstructed geometry checksum mismatch")
    arrays, covered = {}, np.zeros(len(raw), dtype=bool)
    for name, entry in geometry["arrays"].items():
        require(entry["dtype"] in ("<f4", "<f8", "<u4"), f"Unsupported geometry dtype: {name}")
        dtype, offset, length = np.dtype(entry["dtype"]), entry["offset"], entry["length"]
        require(type(offset) is int and type(length) is int and offset >= 0 and length > 0,
                f"Invalid geometry layout: {name}")
        end = offset + length * dtype.itemsize
        require(offset % dtype.itemsize == 0 and end <= len(raw) and not np.any(covered[offset:end]),
                f"Invalid or overlapping geometry layout: {name}")
        covered[offset:end] = True
        arrays[name] = np.frombuffer(raw, dtype=dtype, offset=offset, count=length)
        require(np.all(np.isfinite(arrays[name])), f"Nonfinite geometry: {name}")
    fixture_manifest = read_json(fixtures / "manifest.json")
    percepts = {}
    for case in fixture_manifest["cases"]:
        require(case["file"] == case["name"] + ".f32" and Path(case["file"]).name == case["file"],
                "Invalid percept filename")
        require(case["name"] not in percepts, "Duplicate percept case")
        data = checked_bytes(fixtures / case["file"], case["sha256"], case["width"] * case["height"] * 4)
        values = np.frombuffer(data, dtype="<f4")
        require(np.all(np.isfinite(values)) and np.all(values >= 0), f"Invalid percept values: {case['name']}")
        require(float(values.max()) == case["peak"], f"Percept peak metadata differs: {case['name']}")
        percepts[case["name"]] = values
    provenance = read_json(fixtures / "provenance.json")
    require(provenance["geometrySha256"] == geometry["dataSha256"], "Geometry provenance checksum differs")
    require(provenance["generatorSha256"] == digest((Path(__file__).parent / "generate.py").read_bytes()),
            "Generator provenance checksum differs")
    require(provenance["sourceSdistSha256"] == geometry["sourceSdistSha256"], "Source provenance checksum differs")
    inventory = sorted(str(relative / path.name) for relative in (ASSETS, PERCEPT)
                       for path in (root / relative).iterdir() if path.is_file() and path.name != "convergence.json")
    return dict(geometry=geometry, arrays=arrays, padding=decoded[~covered].tobytes(),
                display=read_json(assets / "axon-display.json"),
                license=(assets / "PULSE2PERCEPT-LICENSE.txt").read_bytes(),
                fixture_manifest=fixture_manifest, percepts=percepts, provenance=provenance,
                field=read_json(root / FIELD), inventory=inventory)


def compare_references(stored, regenerated):
    exact(stored["inventory"], regenerated["inventory"], "generated file inventory")
    exact(without(stored["geometry"], "dataSha256", "storage"),
          without(regenerated["geometry"], "dataSha256", "storage"), "geometry structure/settings")
    exact(without(stored["geometry"]["storage"], "chunks", "compressedBytes"),
          without(regenerated["geometry"]["storage"], "chunks", "compressedBytes"), "storage format")
    exact(without(stored["provenance"], "geometrySha256"),
          without(regenerated["provenance"], "geometrySha256"), "source/generator/dependency provenance")
    require(stored["padding"] == regenerated["padding"], "Geometry padding bytes differ")
    require(stored["license"] == regenerated["license"], "Upstream license bytes differ")
    geometry_deltas = {}
    for name, left in stored["arrays"].items():
        right = regenerated["arrays"][name]
        finite_arrays(left, right, name)
        if left.dtype.kind == "u":
            require(left.tobytes() == right.tobytes(), f"Integer geometry assignments differ: {name}")
        else:
            delta = float(np.max(np.abs(left.astype(np.float64) - right.astype(np.float64))))
            require(delta <= GEOMETRY_ABSOLUTE_UM, f"Geometry difference exceeds {GEOMETRY_ABSOLUTE_UM} um: {name}: {delta}")
            geometry_deltas[name] = delta
    exact(without(stored["display"], "bundles"), without(regenerated["display"], "bundles"), "display metadata")
    left_paths, right_paths = stored["display"]["bundles"], regenerated["display"]["bundles"]
    require(len(left_paths) == len(right_paths), "Display bundle count differs")
    display_delta = 0.0
    for index, (left, right) in enumerate(zip(left_paths, right_paths)):
        left, right = np.asarray(left, dtype=np.float64), np.asarray(right, dtype=np.float64)
        finite_arrays(left, right, f"display bundle {index}")
        display_delta = max(display_delta, float(np.max(np.abs(left - right))))
    require(display_delta <= GEOMETRY_ABSOLUTE_UM, "Display geometry exceeds coordinate tolerance")
    fm, other = stored["fixture_manifest"], regenerated["fixture_manifest"]
    exact(without(fm, "cases"), without(other, "cases"), "percept metadata/coordinate samples")
    require(len(fm["cases"]) == len(other["cases"]), "Percept case count differs")
    percept_deltas = []
    for case, other_case in zip(fm["cases"], other["cases"]):
        name = case["name"]
        exact(without(case, "sha256", "peak"), without(other_case, "sha256", "peak"), f"percept case {name}")
        left, right = stored["percepts"][name], regenerated["percepts"][name]
        finite_arrays(left, right, name)
        if case["peak"] == 0:
            require(left.tobytes() == right.tobytes(), f"Zero percept control differs: {name}")
            maximum = rms = 0.0
        else:
            delta = left.astype(np.float64) - right.astype(np.float64)
            maximum = float(np.max(np.abs(delta))) / case["peak"]
            rms = float(np.sqrt(np.mean(delta * delta))) / case["peak"]
            require(maximum <= PERCEPT_MAXIMUM_RELATIVE_TO_PEAK, f"Percept maximum error exceeds bound: {name}: {maximum}")
            require(rms <= PERCEPT_RMS_RELATIVE_TO_PEAK, f"Percept RMS error exceeds bound: {name}: {rms}")
        percept_deltas.append(dict(case=name, peakNormalizedMaximum=maximum, peakNormalizedRms=rms))
    field, other_field = stored["field"], regenerated["field"]
    exact(without(field, "cases"), without(other_field, "cases"), "field method/environment/tolerances")
    require(len(field["cases"]) == len(other_field["cases"]), "Field case count differs")
    field_relative = field_absolute = 0.0
    for case, other_case in zip(field["cases"], other_field["cases"]):
        name = case["name"]
        exact(without(case, "expected"), without(other_case, "expected"), f"field inputs {name}")
        left, right = case["expected"], other_case["expected"]
        exact(without(left, "currentDensityAm2"), without(right, "currentDensityAm2"), f"field potential/vector {name}")
        a, b = left["currentDensityAm2"], right["currentDensityAm2"]
        require(math.isfinite(a) and math.isfinite(b), f"Nonfinite current density: {name}")
        delta = abs(a - b)
        relative = delta / abs(a) if a else 0.0
        require((a == b) if a == 0 else relative <= CURRENT_DENSITY_RELATIVE,
                f"Current density difference exceeds bound: {name}: {delta}")
        field_relative, field_absolute = max(field_relative, relative), max(field_absolute, delta)
    return dict(geometryMaximumAbsoluteUm=max(geometry_deltas.values()), geometryArrays=geometry_deltas,
                displayMaximumAbsoluteUm=display_delta, perceptCases=len(percept_deltas),
                perceptMaximumRelativeToPeak=max(row["peakNormalizedMaximum"] for row in percept_deltas),
                perceptRmsRelativeToPeak=max(row["peakNormalizedRms"] for row in percept_deltas),
                perceptComparisons=percept_deltas, fieldCases=len(field["cases"]),
                currentDensityMaximumAbsoluteAm2=field_absolute, currentDensityMaximumRelative=field_relative)


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--generated", required=True, type=Path, help="Separate output root passed to generate.py --repo")
    args = parser.parse_args()
    require(args.generated.resolve() != ROOT, "Regenerate into a separate directory, preserving committed references")
    print("Reference runtime: " + canonical(dict(python=platform.python_version(), numpy=np.__version__,
          disabledCpuFeatures=os.environ.get("NPY_DISABLE_CPU_FEATURES", ""),
          openblasCoreType=os.environ.get("OPENBLAS_CORETYPE", ""))))
    stored, regenerated = load_reference(ROOT), load_reference(args.generated)
    report = compare_references(stored, regenerated)
    report["storedGeometrySha256"] = stored["geometry"]["dataSha256"]
    report["regeneratedGeometrySha256"] = regenerated["geometry"]["dataSha256"]
    report["bounds"] = dict(geometryAbsoluteUm=GEOMETRY_ABSOLUTE_UM,
                           perceptMaximumRelativeToPeak=PERCEPT_MAXIMUM_RELATIVE_TO_PEAK,
                           perceptRmsRelativeToPeak=PERCEPT_RMS_RELATIVE_TO_PEAK,
                           currentDensityRelative=CURRENT_DENSITY_RELATIVE)
    print(json.dumps(report, indent=2, allow_nan=False))


if __name__ == "__main__":
    try:
        main()
    except (ValueError, OSError, KeyError, TypeError) as error:
        raise SystemExit(f"Reference reproduction failed: {error}") from error
