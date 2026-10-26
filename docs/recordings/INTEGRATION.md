# Measured recording integration — 2026-10-25

## Audit before changes

The deployed site and current main branch contained three device-level data integrations:

- `RealRecordingExplorer.tsx`: Utah / Willett 2021, three 2019-12-18 T5 handwriting excerpts, 192-channel threshold-crossing counts in 10 ms bins. Source payload in `public/data/handwriting/excerpts.json`.
- `NeuropixelsExplorer.tsx`: IBL mouse MFD_09, probe00, sorted units by depth, a 20-second excerpt and stimulus-aligned averages. Source payload in `public/data/neuropixels/excerpt.json`.
- `HandwritingDecoder.tsx`: FALCON H2 T5 feature-to-character demonstration. This is derived decoder output, distinct from measured samples.

Those viewers and their payloads remain unchanged. Device geometry viewers and engineering assets also remain unchanged. Existing Cortex/Allen/H01 and laboratory model data are morphology, fitted parameters, numerical fixtures or simulation outputs; this addition does not relabel them as implanted-device recordings.

## New integration

`/recordings/` hosts seven lazily loaded dataset views. Device pages mount the same shared components via `client:visible`, with an explicit `Measured recordings` jump link. Device and Simulations directories link to the library. Dataset selection is addressable with `?dataset=<id>` and supports browser back/forward.

| Dataset | Payload | Device association |
|---|---|---|
| IBL Neuropixels voltage | Eight real channels, AP + LFP, independent source coordinates | Neuropixels 1.0, recorded hardware |
| BrainGate long-term | 3,757 author-published array-session rows, 20 arrays, 14 participants | Utah arrays, recorded hardware |
| WIMAGINE | Eight channels, 20 s, task events, filtered continuous ECoG | WIMAGINE, recorded hardware |
| SPARC 430 | Three single cuff ENG/needle EMG events, 100 kHz | CWRU cuff pages, related experiment only |
| miRPNI | Three gestures, eight named graft/residual-muscle channels, released 1 kHz EMG | RPNI, recorded biological interface |
| SPARC 177 | Two 100 ms windows, four carbon-fiber intraneural channels, 30 kHz | Michigan carbon fibers, related vagus configuration |
| Retinal CMOS-MEA | Two 20 s preparations, exact sorted timestamps and 10 ms counts | PRIMA / Argus II, related ex-vivo research only |

No generic dataset is assigned to Neuralink, Synchron, Paradromics or every member of a device family. A broad modality match is insufficient for an exact-device claim.

## Scientific display rules

- No generated recording values, fitted trends, invented contact positions, reconstructed voltage from binned counts or new decoder predictions.
- AP/LFP data use the acquisition clock, not the existing trial-aligned raster clock. Channel positions use released raw-index mappings and are not attached to the separate 960-contact illustrative mesh.
- WIMAGINE's archive assumes µV, but its original source does not state units. Cuff ABF vs author plots disagree on units, and miRPNI CSV calibration is unstated. These views show **source units**, without converting or claiming calibrated µV.
- SPARC cuff event markers are observed artifact threshold crossings, not independently measured stimulus times. Initial artifacts remain present. Each current setting is one event, not a recruitment curve.
- RPNI channel labels distinguish residual muscles from grafts. Motion labels are prompts. Displayed data are the authors' filtered/resampled 1 kHz release, not the original 30 kHz stream.
- Retina counts are computed from accepted source timestamps. No reliable stimulus-event timestamps were supplied, so none were invented. Wildtype/rd10 recordings are different preparations, not a matched comparison.
- BrainGate uses the authors' genuine summary CSV because archive downloads were unavailable. Scalar waveform metrics must not be presented as waveform samples. Missing measurements remain null. The 20-year study period is not 20 years of follow-up per implant.
- Trace axes show original amplitude; overview rows scale independently and state this. Wide plots retain minima/maxima; binned counts use bars. All readouts and CSV exports use retained numeric values, not display-decimated arrays.
- Recordings are observations, not predictions under changed geometry/tissue/stimulation settings.

## Reproduce

Preparation scripts live in `scripts/recordings/`. Run them into a scratch directory, not `public/`, to avoid including large source archives in the site:

```sh
python scripts/recordings/prepare-neuropixels-voltage.py /tmp/ibl-excerpt
python scripts/recordings/prepare-wimagine.py /tmp/wimagine-excerpt
python scripts/recordings/prepare-retinal-recordings.py /tmp/retina-excerpt
python scripts/recordings/prepare-peripheral-recordings.py --cache /tmp/peripheral-source --out /tmp/peripheral-excerpts
python scripts/recordings/prepare-carbon-fiber.py --cache /tmp/carbon-source --out /tmp/peripheral-excerpts
python scripts/recordings/prepare-braingate-longterm.py --output /tmp/braingate-longterm.json
python scripts/recordings/publish-excerpts.py /tmp/ibl-excerpt/ibl-neuropixels-voltage.json /tmp/wimagine-excerpt/wimagine-reaching.json /tmp/retina-excerpt/retinal-cmos-mea.json /tmp/peripheral-excerpts/mirpni.json /tmp/peripheral-excerpts/sparc-cuff.json /tmp/peripheral-excerpts/carbon-fiber-vagus.json /tmp/braingate-longterm.json
```

Python dependencies: NumPy, SciPy, h5py and pyABF, depending on extractor. Source URLs, pinned versions/commits, byte ranges and hashes accompany each payload. The normalizer changes metadata/schema only, never numeric samples. Source-specific validation reports are retained in this directory. Unit tests independently check waveform calibration, exact spike bins, missingness, yield denominators, event bounds, route identities, extrema-preserving plotting and original-value CSV export.

## License boundaries

Each excerpt retains its own data license: IBL / WIMAGINE / cuff CC BY 4.0; carbon-fiber CC BY-SA 4.0; miRPNI and retina CC BY-NC-SA 4.0; BrainGate underlying data CC0 and author repository summaries MIT. The noncommercial/share-alike terms apply to those data derivatives. The site does not claim a single blanket license for these files. The BrainGate MIT notice and retinal source license are included beside the payloads. Attribution and license links remain visible even before hydration or after a loading failure.
