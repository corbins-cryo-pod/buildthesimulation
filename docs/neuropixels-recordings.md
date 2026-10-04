# Neuropixels real-recordings explorer

One probe from the International Brain Laboratory (IBL) Brainwide Map public release, shown on the Neuropixels device page (`BTSD-0004`).

- Session: https://openalyx.internationalbrainlab.org/sessions/ebce500b-c530-47de-8cb1-963c552703ea (mouse MFD_09, Churchland lab, 2023-10-19, `_iblrig_tasks_ephysChoiceWorld`), probe00, Neuropixels 1.0 (IBL model 3B2), pykilosort spike sorting.
- Paper: https://doi.org/10.1101/2023.07.04.547681 . Data license: CC BY 4.0 (IBL public release).
- Chosen because the insertion has QC PASS, resolved histology alignment, and the standard ephysChoiceWorld task. It is one session among hundreds; the choice is illustrative, not representative of every IBL recording.

## Reproduce

```sh
pip install one-api numpy pandas
python3 scripts/prepare-neuropixels.py
npm ci && npm run build
```

The script downloads about 1.6 GB of spike arrays (read with memory mapping; the machine needs only a few hundred MB of RAM) and writes `public/data/neuropixels/excerpt.json` (about 350 KB). No raw data is committed.

## What is in the JSON

- 291 units labeled good by IBL quality control (label = 1), sorted by depth along the shank, with the channel, Allen CCF region, mean firing rate and spike times.
- Spike times for a 20 second excerpt (trials 151-155), rounded to 1 ms.
- Stimulus-aligned firing rate per unit (20 ms bins, -300 to +800 ms around stimulus onset), averaged over all trials in the session with a stimulus, split by stimulus side (291 left, 278 right).
- Trial events in the excerpt: stimulus side and contrast, first movement, feedback and whether it was correct.
- Region extents along the probe, from histology-aligned channel locations.

## Interpretation and limits

Units are sorter output, an estimate of single neurons. Depth is the sorter's estimate along the probe, not a contact-by-contact map onto the 3D model. The initially selected unit is the one with the largest rate change around stimulus onset, which is a convenience, not a claim that it is stimulus-driven. A mouse acute recording is not a human implant, and no decoder runs here.

## Runtime

A `client:visible` Preact island on the Neuropixels device page only. Static JSON is fetched once on hydration; canvas rendering, no new dependency.
