# Simulation overhaul

## Peripheral nerve lab

The `/sim/` and `/simulations/nerve-cross-section/` routes render the same lab.
A deterministic four-fascicle geometry replaces the original single-fascicle animated proxy.
The old implementation remains recoverable in Git history before this commit.

- 1,200 seeded sample sites, equally divided among four fascicles.
- Fixed site threshold multipliers drawn from 0.8–1.2.
- Additive exponential distance kernel; arbitrary amplitude and threshold units.
- No return electrode, pulse dynamics, or clinical validation.
- Focused contact, cuff pair, and four-contact presets.
- Contact selection, pointer dragging, numeric positioning, JSON save/load, and amplitude sweep CSV.
- JSON version 1 describes the new experiment format; old sandbox exports are not compatible.
- Recruitment uses a static geometry model. The previous sine-train and spontaneous recording animation have been retired; use the cortex lab for time-domain synthetic recordings.

## Cortical recording lab

- Seeded population with fixed 4 ms simulation steps, 8 kHz output samples.
- Waveform tails are carried into following blocks instead of discarded.
- Raster events retain their electrode identity and use the same expected-peak criterion as visible raster rows.
- Up to six contacts; changing geometry clears recording buffers.
- Depth and grid presets, noise control, restart, pause, and raw CSV export.
- Raw exports are independent of display filtering, gain, and the visual reference line.
- Signal amplitudes and network dynamics are illustrative, not calibrated measurements.

Run `node tests/simulation-models.mjs` for deterministic geometry, recruitment monotonicity, import validation, repeatability, channel detection, buffer clearing, and waveform-tail checks.
