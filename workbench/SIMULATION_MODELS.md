# Simulation overhaul

## Cortical recording lab

- Seeded population with fixed 4 ms simulation steps, 8 kHz output samples.
- Waveform tails are carried into following blocks instead of discarded.
- Raster events retain their electrode identity and use the same expected-peak criterion as visible raster rows.
- Up to six contacts; changing geometry clears recording buffers.
- Depth and grid presets, noise control, restart, pause, and raw CSV export.
- Raw exports are independent of display filtering, gain, and the visual reference line.
- Signal amplitudes and network dynamics are illustrative, not calibrated measurements.

The peripheral nerve sandbox remains on its original implementation.

Run `node tests/simulation-models.mjs` for cortex repeatability, channel detection, buffer clearing, and waveform-tail checks.
