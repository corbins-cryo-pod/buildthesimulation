# Utah real-recordings explorer

Three small excerpts from Willett et al. (2021), BrainGate2 participant T5, session 2019-12-18. Data: https://datadryad.org/dataset/doi:10.5061/dryad.wh70rxwmv . CC0-1.0 archive mirror: https://zenodo.org/records/4695519 . Paper: https://www.nature.com/articles/s41586-021-03506-2 . Documentation: https://zenodo.org/api/records/4695519/files/readme.pdf/content .

## Reproduce

Download `handwritingBCIData.tar.gz` from the dataset or archive mirror (1,408,201,020 bytes). Install Python 3 with numpy and scipy, then run:

```sh
python3 scripts/prepare-handwriting.py /path/to/handwritingBCIData.tar.gz
npm ci
npm run build
```

The script checks the published archive MD5, uses the unprocessed `Datasets/t5.2019.12.18/sentences.mat`, skips excluded trials, selects the first three valid trials lasting at least 10 seconds, and exports at most 20 seconds each beginning 2 seconds before the go cue. It converts MATLAB indices to zero-based Python slices and never crosses a block or sentence boundary. Base64 packed uint4 (low nibble first, two counts per byte) stores all 192 channels in time-major order; original integer 10 ms counts are preserved exactly. JSON records the source file hash and source indices. No raw archive is committed.

## Interpretation

These are threshold-crossing counts at -3.5 times RMS, not voltage traces, exact spike timestamps, or spike-sorted neurons. Raster rows follow source channel order: 1-96 lateral array, 97-192 medial array. Raster brightness saturates for readability; the original count values remain unchanged in the download. The rate trace averages 10 neighboring bins (100 ms, centered with a 5 ms discretization offset) and converts counts to crossings per second. The average clips its support at excerpt boundaries. Trace y-axis rescales to a labeled ceiling for each view; do not compare amplitudes without reading the axis.

Time is relative to each excerpt's start, and the go cue is marked. Prompts are copy instructions, not decoder predictions. This is an educational viewer, not a decoder or a physical electrode mapping onto the 3D model. It does not imply performance typical of all participants or devices.

## Runtime

A `client:visible` Preact island on the Utah Array device page only. The static JSON is fetched once on hydration. Rendering uses canvas and ResizeObserver, no added production dependency, server, account, or analytics. Controls include trial, array, all 192 channels, time window, play/pause, reset, and keyboard-accessible scrubbing. Source/limitations text is server-rendered. The viewer has an explicit load-error state and a JSON download. Recording data are public under CC0; no new participant information is collected.
