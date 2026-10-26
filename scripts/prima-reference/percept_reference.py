#!/usr/bin/env python3
"""Independent ProViSim v2.0.0 golden generation using the original Python bodies.

Run in the environment defined by percept-requirements.txt. This AST-loads only
the unmodified published numerical functions, avoiding unrelated MediaPipe,
OpenCV, and plotting imports. No browser or JavaScript calculation is imported.
"""
from __future__ import annotations

import argparse
import ast
import base64
import hashlib
import json
import os
from pathlib import Path
import platform
import zlib

import numpy as np
import scipy
import skimage
from skimage.filters import window

ROOT = Path(__file__).resolve().parents[2]
VENDOR = Path(__file__).resolve().parent / "vendor" / "provisim"
EXPECTED_HASHES = {
    "image_processing.py": "00318dde83a2ae1e1f386de32393398c53a1287cea7920998970e840b2ea60d0",
    "prosthetic_vision.py": "7c00aea805065df17c84e880f283f219c6be81d52e26dbd66860fd8af087c799",
    "utils.py": "e3d41eb8d46bac04f756e7db2bed43ce5fa7cd51569c052fee1955158c403b51",
    "LICENSE": "f19ec7244b4068cfc4660243034b99b196233de4d9f350d075dc9756fa7b6dfa",
}
ARRAY_FIELDS = ("input", "mask", "spatial", "expected")
# NumPy's AVX-512 and scalar power/exp implementations differ by up to
# 2.220446049250313e-16 on these pinned cases. This applies only to the final
# gamma/sigmoid arrays, not input generation, masks, FFT results, or metadata.
TONE_REGEN_ABSOLUTE_TOLERANCE = 1e-15


def load_native():
    for filename, expected in EXPECTED_HASHES.items():
        actual = hashlib.sha256((VENDOR / filename).read_bytes()).hexdigest()
        if actual != expected:
            raise ValueError(f"Published source changed: {filename}: {actual}")
    namespace = {"np": np, "window": window}
    selections = {
        "utils.py": {"validate_gray_img"},
        "image_processing.py": {"create_tukey_window", "fft_filter", "gamma_transform", "sigmoid_transform"},
    }
    for filename, names in selections.items():
        tree = ast.parse((VENDOR / filename).read_text())
        nodes = [node for node in tree.body if isinstance(node, ast.FunctionDef) and node.name in names]
        if {node.name for node in nodes} != names:
            raise ValueError(f"Could not load required published functions from {filename}")
        exec(compile(ast.Module(body=nodes, type_ignores=[]), str(VENDOR / filename), "exec"), namespace)
    return namespace


def encode(values):
    # Full float64 images, not samples or reference outputs computed by JS.
    raw = np.asarray(values, dtype="<f8").tobytes(order="C")
    return base64.b64encode(zlib.compress(raw, level=9)).decode("ascii")


def make_input(kind, size):
    y, x = np.mgrid[0:size, 0:size].astype(np.float64)
    if kind == "blank": return np.zeros((size, size), dtype=np.float64)
    if kind == "white": return np.ones((size, size), dtype=np.float64)
    if kind == "gray": return np.full((size, size), 0.37, dtype=np.float64)
    if kind == "ramp": return np.clip((0.8 * x + 0.2 * y) / (size - 1), 0, 1)
    if kind == "impulse":
        result = np.zeros((size, size), dtype=np.float64)
        result[size // 2 - 3, size // 2 + 2] = 1.0
        return result
    if kind == "landolt":
        xx, yy = x + 0.5 - size / 2, size / 2 - y - 0.5
        gap = size * 0.06
        radius = np.hypot(xx, yy)
        return ((radius >= 1.5 * gap) & (radius <= 2.5 * gap)
                & ~((xx >= 0) & (np.abs(yy) < gap / 2))).astype(np.float64)
    if kind == "default-ui-landolt":
        # Independently rasterize the UI's default 120-µm gap in a 2000-µm
        # projection. Average four subpixel samples; do not load a JS image.
        result = np.zeros((size, size), dtype=np.float64)
        for sy in (0.25, 0.75):
            for sx in (0.25, 0.75):
                xx = ((x + sx) / size - 0.5) * 2000
                yy = (0.5 - (y + sy) / size) * 2000
                radius = np.hypot(xx, yy)
                result += ((radius >= 180) & (radius <= 300)
                           & ~((xx >= 0) & (np.abs(yy) < 60))) / 4
        return result
    if kind == "shifted-edge":
        # An asymmetric off-center slanted edge with a separate compact feature
        # exposes FFT orientation, phase, padding, and clipping differences.
        edge = (x + 0.5 >= 0.61 * size + 0.21 * (y + 0.5 - 0.37 * size))
        spot = ((x + 0.5 - 0.23 * size) ** 2 + (y + 0.5 - 0.31 * size) ** 2 < (0.055 * size) ** 2)
        return 0.1 + 0.75 * edge + 0.15 * spot
    if kind.startswith("grating"):
        frequency = float(kind.split(":")[1])
        return 0.5 + 0.45 * np.cos(2 * np.pi * frequency * x / size)
    if kind == "diagonal": return 0.5 + 0.4 * np.sin(2 * np.pi * (9 * x + 5 * y) / size)
    if kind == "checker": return (((x // 4) + (y // 4)) % 2).astype(np.float64)
    raise ValueError(kind)


def generate():
    native = load_native()
    specifications = [
        ("blank-gamma", "blank", 64, {}),
        ("blank-sigmoid", "blank", 64, {"contrastModel": "sigmoid"}),
        ("white", "white", 64, {"contrastModel": "none"}),
        ("gray-signed-gamma", "gray", 64, {}),
        ("gradient-gamma", "ramp", 64, {}),
        ("gradient-sigmoid", "ramp", 64, {"contrastModel": "sigmoid", "sigmoidGain": 30}),
        ("landolt-128", "landolt", 128, {}),
        ("default-ui-landolt-256", "default-ui-landolt", 256, {}),
        ("shifted-edge-sigmoid-256", "shifted-edge", 256, {"contrastModel": "sigmoid"}),
        ("low-frequency", "grating:4", 64, {"contrastModel": "none"}),
        ("transition-frequency", "grating:11", 64, {"contrastModel": "none"}),
        ("high-frequency", "grating:18", 64, {"contrastModel": "none"}),
        ("diagonal-frequency", "diagonal", 64, {"contrastModel": "none"}),
        ("checkerboard", "checker", 64, {"contrastModel": "sigmoid"}),
        ("impulse", "impulse", 64, {"contrastModel": "none"}),
        ("fractional-cutoff", "ramp", 64, {"cutoffCyclesPerImage": 8.5, "contrastModel": "none"}),
        ("hann-window", "ramp", 64, {"taper": 1, "radiusExpansion": 0, "contrastModel": "none"}),
        ("boxcar-window", "diagonal", 64, {"taper": 0, "radiusExpansion": 0, "contrastModel": "none"}),
    ]
    cases = []
    for name, kind, size, override in specifications:
        settings = {"pixelWidthUm": 100, "implantWidthUm": 2000, "contrastModel": "gamma", "gamma": 2.6,
                    "sigmoidGain": 20, "sigmoidOffset": 0.2, "taper": 0.3, "radiusExpansion": 0.3, **override}
        cutoff = settings.get("cutoffCyclesPerImage", settings["implantWidthUm"] / (2 * settings["pixelWidthUm"]))
        image = make_input(kind, size)
        mask = native["create_tukey_window"](cutoff, size, settings["taper"], settings["radiusExpansion"])
        spatial = native["fft_filter"](image, mask)
        if settings["contrastModel"] == "gamma":
            output = native["gamma_transform"](spatial, settings["gamma"])
        elif settings["contrastModel"] == "sigmoid":
            output = native["sigmoid_transform"](spatial, settings["sigmoidGain"], settings["sigmoidOffset"])
        else:
            output = spatial
        cases.append({"name": name, "size": size, "settings": settings,
                      "input": encode(image), "mask": encode(mask), "spatial": encode(spatial), "expected": encode(output)})
    return {
        "schema": "bts.prima.percept.reference.v1", "encoding": "base64 zlib little-endian float64 row-major",
        "source": {"doi": "10.5281/zenodo.19212252", "tag": "v2.0.0",
                   "archiveSha256": "c3cecdeeb2cb4afcd14ba591a3b285354c6be45d719fc3244912363fef0f9a13",
                   "filesSha256": EXPECTED_HASHES,
                   "execution": "Unmodified numerical function AST bodies from published files; unrelated imports omitted."},
        "versions": {"numpy": np.__version__, "scipy": scipy.__version__, "scikit-image": skimage.__version__},
        "cases": cases,
    }


def package_fixture(payload):
    """Store exact ASCII JSON bytes in bounded, independently checked chunks."""
    payload.decode("ascii")
    chunk_bytes = 65536
    chunks = {f"chunk-{i // chunk_bytes:04d}.txt": payload[i:i + chunk_bytes]
              for i in range(0, len(payload), chunk_bytes)}
    manifest = {
        "schema": "bts.prima.percept.storage.v1",
        "encoding": "ASCII JSON, concatenated in manifest order",
        "byteLength": len(payload),
        "sha256": hashlib.sha256(payload).hexdigest(),
        "maximumChunkBytes": chunk_bytes,
        "chunks": [{"file": name, "byteLength": len(data),
                    "sha256": hashlib.sha256(data).hexdigest()}
                   for name, data in chunks.items()],
    }
    return (json.dumps(manifest, indent=2) + "\n").encode("ascii"), chunks


def load_verified_fixture(directory):
    """Authenticate stored bytes before parsing any numerical fixture JSON."""
    manifest_bytes = (directory / "manifest.json").read_bytes()
    manifest = json.loads(manifest_bytes.decode("ascii"))
    if (not isinstance(manifest, dict) or manifest.get("schema") != "bts.prima.percept.storage.v1"
            or manifest.get("maximumChunkBytes") != 65536
            or not isinstance(manifest.get("chunks"), list) or not manifest["chunks"]):
        raise ValueError("Unsupported reference storage manifest")
    chunks = {}
    for index, entry in enumerate(manifest["chunks"]):
        filename = f"chunk-{index:04d}.txt"
        if (not isinstance(entry, dict) or entry.get("file") != filename or type(entry.get("byteLength")) is not int
                or not 0 < entry["byteLength"] <= 65536):
            raise ValueError(f"Invalid reference chunk definition: {filename}")
        data = (directory / filename).read_bytes()
        if len(data) != entry["byteLength"] or hashlib.sha256(data).hexdigest() != entry.get("sha256"):
            raise ValueError(f"Stored reference chunk checksum mismatch: {filename}")
        chunks[filename] = data
    if {p.name for p in directory.glob("chunk-*.txt")} != set(chunks):
        raise ValueError("Reference directory contains missing or obsolete chunks")
    payload = b"".join(chunks.values())
    if len(payload) != manifest.get("byteLength") or hashlib.sha256(payload).hexdigest() != manifest.get("sha256"):
        raise ValueError("Stored reference JSON checksum mismatch")
    # Repackaging stored bytes must still reproduce every manifest/chunk byte.
    canonical_manifest, canonical_chunks = package_fixture(payload)
    if manifest_bytes != canonical_manifest or chunks != canonical_chunks:
        raise ValueError("Stored reference manifest or chunk boundaries are not canonical")
    return json.loads(payload.decode("ascii")), payload, len(chunks)


def runtime_diagnostics():
    features = getattr(np.core._multiarray_umath, "__cpu_features__", {})
    return {
        "python": platform.python_version(), "platform": platform.platform(),
        "numpy": np.__version__, "scipy": scipy.__version__, "scikit-image": skimage.__version__,
        "zlibCompile": zlib.ZLIB_VERSION, "zlibRuntime": zlib.ZLIB_RUNTIME_VERSION,
        "disabledCpuFeatures": os.environ.get("NPY_DISABLE_CPU_FEATURES", ""),
        "enabledCpuFeatures": sorted(name for name, enabled in features.items() if enabled),
    }


def compare_reference(stored, regenerated):
    """Require exact upstream data; bound only demonstrated tone-curve roundoff."""
    if {k: v for k, v in stored.items() if k != "cases"} != {k: v for k, v in regenerated.items() if k != "cases"}:
        raise ValueError("Reference metadata differs; use the pinned percept requirements")
    if len(stored["cases"]) != len(regenerated["cases"]):
        raise ValueError("Reference case count differs")
    differences = []
    failures = []
    max_tone_delta = 0.0
    for expected, actual in zip(stored["cases"], regenerated["cases"]):
        label = expected["name"]
        if ({k: v for k, v in expected.items() if k not in ARRAY_FIELDS}
                != {k: v for k, v in actual.items() if k not in ARRAY_FIELDS}):
            raise ValueError(f"Reference case metadata differs: {label}")
        length = expected["size"] ** 2 * 8
        for field in ARRAY_FIELDS:
            expected_raw = zlib.decompress(base64.b64decode(expected[field], validate=True))
            actual_raw = zlib.decompress(base64.b64decode(actual[field], validate=True))
            if len(expected_raw) != length or len(actual_raw) != length:
                raise ValueError(f"Reference array byte length differs: {label}/{field}; expected {length}")
            x = np.frombuffer(expected_raw, dtype="<f8")
            y = np.frombuffer(actual_raw, dtype="<f8")
            if not np.all(np.isfinite(x)) or not np.all(np.isfinite(y)):
                raise ValueError(f"Nonfinite reference values: {label}/{field}")
            tone = field == "expected" and expected["settings"]["contrastModel"] in ("gamma", "sigmoid")
            raw_equal = expected_raw == actual_raw
            delta = float(np.max(np.abs(x - y))) if not raw_equal else 0.0
            if tone:
                max_tone_delta = max(max_tone_delta, delta)
            accepted = delta <= TONE_REGEN_ABSOLUTE_TOLERANCE if tone else raw_equal
            if expected[field] != actual[field]:
                differences.append({
                    "case": label, "array": field, "compressedEqual": False, "rawEqual": raw_equal,
                    "maxAbsoluteDelta": delta, "differentValues": int(np.count_nonzero(x != y)),
                    "absoluteTolerance": TONE_REGEN_ABSOLUTE_TOLERANCE if tone else 0,
                    "accepted": accepted,
                })
            if not accepted:
                failures.append(f"{label}/{field}: max absolute delta {delta:.17g}")
    for difference in differences:
        print("Reference array comparison: " + json.dumps(difference, sort_keys=True))
    if failures:
        raise ValueError("Reference numerical mismatch: " + "; ".join(failures))
    return max_tone_delta


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--output", type=Path, default=ROOT / "tests/fixtures/prima-percept",
                        help="Directory for the manifest and bounded ASCII chunks")
    parser.add_argument("--check", action="store_true",
                        help="Verify exact stored checksums and independently regenerate all numerical arrays")
    args = parser.parse_args()
    if args.check:
        print("ProViSim reference runtime: " + json.dumps(runtime_diagnostics(), sort_keys=True))
        try:
            stored, stored_payload, chunk_count = load_verified_fixture(args.output)
            fixture = generate()
            max_tone_delta = compare_reference(stored, fixture)
            regenerated_payload = (json.dumps(fixture, indent=2, allow_nan=False) + "\n").encode("ascii")
            print("ProViSim reference payloads: " + json.dumps({
                "storedSha256": hashlib.sha256(stored_payload).hexdigest(),
                "regeneratedSha256": hashlib.sha256(regenerated_payload).hexdigest(),
                "byteEqual": stored_payload == regenerated_payload,
            }, sort_keys=True))
            print(f"ProViSim reference: {len(fixture['cases'])} full-image fixtures verified in {chunk_count} "
                  f"checksum-checked chunks; exact metadata/input/mask/spatial; "
                  f"maximum tone-curve delta {max_tone_delta:.17g} <= {TONE_REGEN_ABSOLUTE_TOLERANCE:.1g} "
                  "(absolute, relative tolerance 0).")
        except (ValueError, OSError, KeyError, TypeError, zlib.error) as error:
            raise SystemExit(f"Reference verification failed: {error}") from error
        return
    fixture = generate()
    text = json.dumps(fixture, indent=2, allow_nan=False) + "\n"
    manifest, chunks = package_fixture(text.encode("ascii"))
    args.output.mkdir(parents=True, exist_ok=True)
    for filename, data in chunks.items():
        (args.output / filename).write_bytes(data)
    for obsolete in args.output.glob("chunk-*.txt"):
        if obsolete.name not in chunks: obsolete.unlink()
    (args.output / "manifest.json").write_bytes(manifest)
    print(f"Wrote {len(fixture['cases'])} native ProViSim cases in {len(chunks)} chunks to {args.output}")


if __name__ == "__main__": main()
