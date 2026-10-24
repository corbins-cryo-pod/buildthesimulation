#!/usr/bin/env python3
"""Regenerate independent auditory-nerve reference fixtures using author code.

This script does not include or redistribute third-party source code. It runs
the public implementation accompanying Bachmaier et al. (2019), using Brian2
as a genuinely separate numerical engine from the browser implementation.

Requirements: brian2, numpy, pandas, matplotlib. Example:
  python scripts/cochlear-neural-reference.py --fetch-author-source

Alternatively, supply --author-source /path/to/human-anf-models. The three
source files are checked against their published Git blob identities. Optional
--brian-path permits an isolated, temporary dependency installation. Downloaded
reference source is kept outside the repository, under the system temp folder.
"""

from __future__ import annotations

import argparse
from datetime import datetime
import hashlib
import json
import os
from pathlib import Path
import sys
import tempfile
from urllib.request import urlopen
from zoneinfo import ZoneInfo


SOURCE_BLOBS = {
    "models/Rattay_2001.py": "b320016b7080fbae220ab968136840462d8b6485",
    "functions/stimulation.py": "8362e8f172c4c90df3f8f46be25a97b872b33762",
    "functions/calculations.py": "7d7731ae7bf61c30b1fa74803bba35d01e9a4fef",
}
PUBLISHED_THRESHOLDS = [
    (40, "mono", 313.8657522201538),
    (50, "mono", 257.86888599395747),
    (100, "mono", 146.11027717590335),
    (50, "bi", 391.1433839797973),
    (200, "bi", 92.44431495666502),
    (400, "bi", 56.657977104187007),
]


def git_blob_sha1(content: bytes) -> str:
    return hashlib.sha1(b"blob " + str(len(content)).encode() + b"\0" + content).hexdigest()


def main() -> None:
    repository = Path(__file__).resolve().parents[1]
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--author-source", type=Path, default=Path(tempfile.gettempdir()) / "cochlear-author-reference")
    parser.add_argument("--fetch-author-source", action="store_true")
    parser.add_argument("--brian-path", type=Path)
    parser.add_argument("--output", type=Path, default=repository / "docs/cochlear/nerve-reference.json")
    args = parser.parse_args()
    for relative, blob in SOURCE_BLOBS.items():
        target = args.author_source / relative
        if args.fetch_author_source and not target.exists():
            url = f"https://gitlab.lrz.de/api/v4/projects/37137/repository/blobs/{blob}/raw"
            content = urlopen(url, timeout=45).read()
            if git_blob_sha1(content) != blob:
                raise RuntimeError(f"Source identity mismatch for {relative}")
            target.parent.mkdir(parents=True, exist_ok=True)
            target.write_bytes(content)
        if not target.exists():
            parser.error(f"Missing {target}. Use --fetch-author-source or provide the published source directory.")
        if git_blob_sha1(target.read_bytes()) != blob:
            raise RuntimeError(f"Source identity mismatch for {relative}")

    os.environ.setdefault("MPLCONFIGDIR", str(Path(tempfile.gettempdir()) / "cochlear-reference-matplotlib"))
    if args.brian_path:
        sys.path.insert(0, str(args.brian_path))
    sys.path.insert(0, str(args.author_source))
    import brian2 as b
    import numpy as np
    import models.Rattay_2001 as author_model
    import functions.stimulation as author_stimulation

    b.prefs.codegen.target = "numpy"
    cases = []
    # 1 ms before the stimulus, 3 ms after its final phase; pulse-train onset
    # spacing is 2 ms (108 us biphasic waveform + 1892 us silent interval).
    specs = [
        ("single_mono", "mono", 200, 100, 0, 1, 0),
        ("single_biphasic", "bi", 500, 50, 8, 1, 0),
        ("short_train", "bi", 500, 50, 8, 3, 1892),
    ]
    for name, form, amplitude, width, gap, count, interval in specs:
        neuron, model = author_model.set_up_model(1 * b.us, author_model)
        currents, runtime = author_stimulation.get_stimulus_current(
            model=model, dt=1 * b.us, pulse_form=form, time_before=1 * b.ms,
            time_after=3 * b.ms, nof_pulses=count, amp_mono=-amplitude * b.uA,
            duration_mono=width * b.us, amps_bi=np.array([-amplitude, amplitude]) * b.uA,
            durations_bi=np.array([width, gap, width]) * b.us,
            inter_pulse_gap=interval * b.us,
        )
        stimulus = b.TimedArray(currents.T, dt=1 * b.us)
        indices = [6, 20, 39, 45, 55]
        monitor = b.StateMonitor(neuron, "v", record=indices, dt=20 * b.us)
        b.run(runtime, namespace={"stimulus": stimulus})
        time_ms = np.round(np.asarray(monitor.t / b.ms), 8).tolist()
        voltages = [np.round(np.asarray(v / b.mV), 8).tolist() for v in monitor.v]
        distal = voltages[indices.index(45)]
        spike_times = []
        armed = True
        for j in range(1, len(distal)):
            if armed and distal[j - 1] < -5 <= distal[j]:
                fraction = (-5 - distal[j - 1]) / (distal[j] - distal[j - 1])
                spike_times.append(time_ms[j - 1] + fraction * (time_ms[j] - time_ms[j - 1]))
                armed = False
            if not armed and distal[j] < -40:
                armed = True
        cases.append({
            "name": name, "dtUs": 1, "durationMs": float(runtime / b.ms),
            "amplitudeUA": amplitude, "widthUs": width, "gapUs": gap,
            "pulseForm": form,
            "onsetUs": [1000 + i * (2 * width + gap + interval) for i in range(count)],
            "recordCompartments": indices, "timeMs": time_ms,
            "membraneMv": voltages, "referenceSpikeTimesMs": spike_times,
        })
        print(f"{name}: {len(spike_times)} distal spikes, {len(time_ms)} recorded samples", flush=True)

    result = {
        "description": "Independent runs of authors’ original Python model in Brian2. Numeric verification data; no author source code redistributed.",
        "retrievedDate": datetime.now(ZoneInfo("America/New_York")).date().isoformat(),
        "sourceRepository": "https://gitlab.lrz.de/tueibai-public/human-anf-models",
        "sourceBlobSha1": SOURCE_BLOBS,
        "paperDoi": "10.3389/fnins.2019.01173",
        "originalModelDoi": "10.1016/S0378-5955(00)00256-2",
        "brianVersion": b.__version__,
        "geometry": {"pointSourceNode": 6, "distanceMm": 0.5, "conductivitySm": 1 / 3, "restingMv": -65, "spikeThresholdMv": -5},
        "publishedThresholds": {
            "dtUs": 5, "sourceFile": "results/Rattay et al. 2001/Threshold_table Rattay et al. 2001.csv", "phaseGapUs": 0,
            "rows": [{"phaseWidthUs": w, "pulseForm": form, "thresholdUA": threshold} for w, form, threshold in PUBLISHED_THRESHOLDS],
        },
        "cases": cases,
    }
    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_text(json.dumps(result, indent=2) + "\n")
    print(f"Wrote {args.output}")


if __name__ == "__main__":
    main()
