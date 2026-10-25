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
from pathlib import Path
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


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--output", type=Path, default=ROOT / "tests/fixtures/prima-percept",
                        help="Directory for the manifest and bounded ASCII chunks")
    parser.add_argument("--check", action="store_true")
    args = parser.parse_args()
    fixture = generate()
    text = json.dumps(fixture, indent=2, allow_nan=False) + "\n"
    manifest, chunks = package_fixture(text.encode("ascii"))
    if args.check:
        if (args.output / "manifest.json").read_bytes() != manifest:
            raise SystemExit("Reference manifest differs; use the pinned percept requirements.")
        for filename, data in chunks.items():
            if (args.output / filename).read_bytes() != data:
                raise SystemExit(f"Reference chunk differs: {filename}; use the pinned percept requirements.")
        if {p.name for p in args.output.glob("chunk-*.txt")} != set(chunks):
            raise SystemExit("Reference directory contains missing or obsolete chunks.")
        print(f"ProViSim reference: all {len(fixture['cases'])} full-image fixtures reproduce byte-for-byte in {len(chunks)} checked chunks.")
    else:
        args.output.mkdir(parents=True, exist_ok=True)
        for filename, data in chunks.items():
            (args.output / filename).write_bytes(data)
        for obsolete in args.output.glob("chunk-*.txt"):
            if obsolete.name not in chunks: obsolete.unlink()
        (args.output / "manifest.json").write_bytes(manifest)
        print(f"Wrote {len(fixture['cases'])} native ProViSim cases in {len(chunks)} chunks to {args.output}")


if __name__ == "__main__": main()
