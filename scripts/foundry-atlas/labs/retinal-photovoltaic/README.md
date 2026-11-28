# PV–12 · Photovoltaic retinal pixel foundry bench

`index.html` is an offline standalone user entry point. No runtime libraries, external fonts, external images, API calls, storage or service worker are required. `src/` contains the auditable evidence table, state/physics model, SVG renderer, UI and template. `build.py` inlines them into a single file. This educational model contains no photos copied from the papers, no masks or commercial foundry process, and no clinical, tissue, biological, exposure or human-use model.

## What to try

1. Open **Wafer traveler** and compare checkpoint **B** (both trenches etched to BOX), **C** (both lined and filled), **J** (outer trenches reopened only), and **L** (released wafer stack). The input plus panels A–L shows exactly eight mask steps. Use **Oblique** to inspect how the same 5 µm gap looks against the three 70/140/280 µm nominal widths. Reported active pad diameters are 20/40/80 µm respectively. The original mask convention and cross-section dimensions beyond documented anchors are not implied.
2. With the released **140 µm** witness and **50 µW** of purely virtual scalar input, the zero-bias single-diode slope model shows **20 µA**. Choose **Optical obscuration** and watch it change to **9 µA** while the separately compared dark sample and dry neighbor fixture stay the same. With **Leaky junction**, the reverse dark synthetic point goes from 8 to 240 pA without affecting those other two witnesses.
3. A **Suspended BOX remnant** can obstruct geometric release without producing conductive transfer in the dry network. Switch to **Conductive silicon web** or **Across-gap metal stringer**, place the defect at a different boundary, and compare. For the same boundary those two different structures give the same synthetic electrical signature; the section drawing distinguishes them.
4. Select **First-generation PRIMA**. The public schematic changes to two series junctions, a polysilicon shunt and a linked circumferential return mesh. The 378-pixel, 2 mm-wide die is not the Wang route. No Wang processing steps, fixture, downloads, or fitted values are exposed in this branch. Returning restores the previous Wang state in that page session.

## Evidence and model limits

| Witness | Basis | Calculation / missing data |
| --- | --- | --- |
| Materials | [Wang et al. 2012](https://doi.org/10.1088/1741-2560/9/4/046014), §2.1, Figs. 1–5 | Fig. 1(a–l) checkpoint order and eight-mask accounting. Anchors: 30 µm Si, 5 µm trenches. Film thickness, lateral mask registration, stress, yield, exact implant, conductance and materials transfer are not simulated. The original paper distinguishes a 60 nm design oxide from the described 80 nm growth step; neither corrects the measured optical slope. |
| Optical | Wang §3.2, Fig. 9(b) | Reported A/W slopes for one-diode structures at zero bias and 880 nm. For the 140 µm coupon the displayed 0–80 µW interval lies within the approximate plotted power span; 70/280 µm options are slope-only illustrations with no claim of matched power spans. `abs(I) = R P T`; `EQE = R h c / (q λ)` using SI physical constants. No raw trace was digitized; no loaded series output, optics focusing, irradiance, wavelength sweep or heating. |
| Reverse dark | Wang §3.1 | A 1–100 pA reported discussion interval for reverse-biased three-series-junction structures at room temperature. This is not a fitted I–V curve, acceptance range or measurement resolution. Synthetic points are 8 and 240 pA. The displayed light response and reverse dark check are not from the same structure or bias. |
| Dry isolation | Uncalibrated fixture authored for this model | Fixed center node C at a virtual 100 mV. Six neighbors each terminate into 1 GΩ. Twelve nominal connections (six spokes, six ring edges) are 10 TΩ. A modeled conductive defect substitutes one 50 MΩ connection; an insulating BOX remnant does not. The solver enforces Kirchhoff's current law at every unknown node and tracks applied vs terminated current. No measured resistance or electrochemical/optical/electrolyte field is implied. 1% transfer is an arbitrary teaching decision threshold. |
| Product branch | [Palanker et al. 2022 Fig. 1](https://doi.org/10.1038/s41467-022-28125-x) · [Chen et al. 2022 introduction/Fig. 1A](https://doi.org/10.1088/1741-2552/ac8ed8) · [Shin et al. 2025 §2.2](https://doi.org/10.1088/1741-2552/ae0522) | First-generation PRIMA: public nominal architecture only. Separate later research fixtures and masks do not become PRIMA production data. No processing or performance extrapolation. |

The equipment links identify station classes rather than interchangeable tools. The inventory lacks a qualified SOI feedstock process, thermal oxidation, the original dopant steps, conformal LPCVD polysilicon, selective XeF₂, conformal spray resist and controlled BOX release. The register's pA probe-floor and specimen-plane optical calibration are also unverified.

## Build and verify

Run from this directory:

```sh
python3 build.py
node tests/model.cjs > validation/numerical.json
python3 tests/browser.py
```

The browser suite uses the workspace's verified Chromium if present, `CHROME_BIN=/path/to/chrome` if set, or the locally installed Playwright Chromium. The two browser profiles are desktop Chromium and true click/tap dispatch on an iPhone 13 touch viewport emulator; no assertion is made about physical iPhone Safari. Checks travel both directions across branches, follow actual controls, download and parse all three exports, and verify no third-party requests or dynamic errors. Browser-run example files and reviewed screenshots are in `validation/`. The register evidence table was checked against the current site atlas's actual equipment IDs; links describe limits, not proof of implementation.

Deploy only the portable `index.html`. Source/layout, numerical and browser fixtures, checksums and export samples are staged for independent review. Nothing in this folder has been published by the implementation worker.
