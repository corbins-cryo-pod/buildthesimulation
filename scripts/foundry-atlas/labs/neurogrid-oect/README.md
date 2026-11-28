# NeuroGrid & OECT comparison bench

A compact offline companion for the Foundry Atlas. Stage the self-contained `dist/index.html` at `/simulations/neurogrid-oect-foundry/` in the existing website, or open it directly as a file. No installation, APIs, image downloads, WebGL, credentials or network traffic are needed. Suggested index: opt-in from the `flex-neurogrid` profile and/or foundry hub.

## What the papers establish

- **NeuroGrid (2015):** [Khodagholy et al., Fig. 1, Results and Online Methods](https://pmc.ncbi.nlm.nih.gov/articles/PMC4308485/), DOI 10.1038/nn.3905. The named 256-site array has 10 × 10 µm exposed PEDOT:PSS faces, 30 µm reported separation and approximately 4 µm of flexible parylene. Methods describe 2 µm deposition and Ti/Pt/Au of 10/150/50 nm. One recording face routes to one output; the electrolyte reference is not an extra acquisition channel and there is no source, drain or gate. The centered 16 × 16 model interprets separation as pitch and keeps artwork, native connector map, film perimeter and layer order uncertainties explicit.
- **Separate OECT research variant (2013):** [Khodagholy et al., Figs. 1–2 and Methods](https://www.nature.com/articles/ncomms2573.pdf), DOI 10.1038/ncomms2573. Reports a distinct ~4 µm film with 17 OECTs whose channels are 6 × 15 µm (length × width) and eight independent 12 × 12 µm passive contacts. The upper and lower parylene layers are described as 2 µm each. The Methods give 5 nm Ti and 100 nm Au, and the Figure 1 legend depicts 200 nm PEDOT:PSS. The gold dry leads remain insulated; exposed polymer contacts both source and drain while its channel remains open to the electrolyte. The gate is a spatially separate electrode in the liquid, not an integrated gold gate or gate oxide. Only one OECT witness is simulated, not 17 simultaneous traces or the eight auxiliary sites.
- Fig. 2 reports a peak transconductance near 900 µS at V_G ≈ +0.42 V and V_D = −0.4 V under its own bench conditions. This is historical reference, not the lab model’s calibration or minimum criterion. See [the related 2013 transistor mechanism paper](https://pmc.ncbi.nlm.nih.gov/articles/PMC3717497/) for the distinction between ionic and electronic conduction.
- Equipment codes are credible process-class links, not proof of facility access, a validated recipe or equivalence to the actual paper’s models. The 2015 GCA projection stepper is not the register ASML; the 2013 SUSS MJB4 is not the MJB3. A single-channel Keithley 2450 in the register does not replace the published dual SourceMeter. Here “feedthrough” means **an insulated flex conductor passing from the schematic wet side to the dry connection**, not a hermetic package feedthrough.

## Reading the virtual bench

Both routes have eight independently tracked stations. They share material vocabulary but have different connectivity logic and different figures. In each route, **Try the covered-window case** shows why a dry connected conductor is insufficient:

- Passive: 256 logical dry paths remain; the selected blocked site has no interpretable impedance spectrum, yielding 255 isolated wet sites. Bridging two virtual neighboring nets fails both sites. A pinhole toward an interconnect can lower apparent impedance and is an error rather than improved performance; losing the external reference breaks the bench measurement, not all 256 traces.
- Active: a covered polymer channel can remain source–drain continuous yet suppress the modeled response to V_G. Disconnecting the separate gate removes control with the channel still exposed. An open source or drain eliminates intended current. A feedthrough leak changes the independent I_G witness despite a normal-looking synthetic I_D slope. A direct metal short bypasses the polymer model. Faults are deliberately isolated, not manufacturing probabilities. Changing the inspected passive contact does not move the simulated fault.
- Passive synthetic circuit: Rs + (Rct ∥ C), with assumed Rs = 1.2 kΩ, Rct = 410 kΩ, C = 1.8 nF, 20 sample frequencies and optional area-factor 3.2 for the insulation-breach diagnostic, not a fitted electrochemical model or measured spectrum.
- OECT synthetic teaching surface: source at 0 V, drain has negative bias, positive gate depletes the channel. With f = 1/(1+exp((V_G−0.33)/0.073)), G = 20 + 320f µS and I_D = V_DG in µA. This makes dI_D/dV_G positive at negative drain bias while |I_D| decreases. Single branch leakage is G_G V_G in nA with intentionally distinct 5 and 560 nS witnesses. This bounded transfer toy does not model saturation, capacitive transients, ion migration, noise, absolute stability or measured electrochemistry. Index outputs and numeric sample curves are only synthetic.
- Exports separate passive 256-site 1 kHz summaries plus a selected frequency sweep in JSON, from the active 61-point signed transfer CSV, voltage conventions and independent synthetic I_G. Exports contain no production masks, original recording data, implementation or use instructions, or clinical claims. No biology or implantation workflow is present.

## Reproduce and verify

```sh
python build.py
node --test test/engine.test.cjs
CHROME_BIN=/path/to/chromium python test/browser.py --screens /tmp/neurogrid-oect-screens
sha256sum -c SHA256SUMS
```

Source under `src/` consists of plain HTML, CSS, original diagram code and the pure deterministic engine. `test/` contains the analytical checks plus Chromium desktop, iPhone 13 touch and 360 px dark narrow render tests. The file-origin run verifies that static links still reach their canonical destinations when deliberately clicked; no network is needed for the actual experiment.
