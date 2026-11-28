# PtNRGrid Virtual Foundry

An offline, opt-in static lab for Tchoe et al.’s PtNRGrid, intended for Build the Simulation. This educational model joins a source-anchored virtual process traveler to a separately labeled synthetic wiring graph and inert bench cell. It never generates a production mask, device pin map, chemistry recipe, patient/animal procedure, neural signal, or validated yield.

## Open / deploy

Open `dist/index.html` directly, or stage that file at `public/simulations/ptnrgrid-foundry/index.html` in the existing site. No dependencies, services, image files, CDN assets, external requests, or WebGL are needed to run. Links to the atlas, device and equipment records and published references leave the page only when selected. The UI is touch and keyboard tested. The 1024/2048-site CSV and traveler JSON exports are generated from the current run.

## Try these independently

1. Select the published square configuration and **Compare route rescue**. Station 5 shows an interrupted A witness. Advance to station 7. A registered B deposition restores continuity. Move B offset to the 4 µm demonstration boundary: the teaching metal strips no longer touch, so the A break stays open. This is not lithography qualification or a predicted defect rate.
2. **Find a blocked site**. Select the blocked contact and a neighbor. The modeled conductor graph still maps 1,024 paths, but only 1,023 sites have usable wet windows. The covered site retains its alloy/cap under the film and has no synthetic electrochemical measurement. This check is not a physical dry probe through the sealed contact.
3. **Trace a missing group**. The synthetic 64-position connector fixture retains all 1,024 routes and loses exactly 64 mapped outputs. Its repeatable bank numbering is not the public product pinout. In a separate fault, swapped outputs are still conductive but both fail mapping.
4. In **Inert mold**, compare representative relief openings with a solid witness. This is a qualitative sketch aligned with the authors’ Fig. S3 passive wet mold comparison. The labels explicitly distinguish relief holes from electrical contacts.
5. Switch to the wide 2,048-site option. The map is logical; it intentionally does not squeeze arbitrary center positions into the approximate 80 × 80 mm envelope. CSV coordinates are withheld unless the square lattice reconstruction is active.

## Evidence boundaries

- [Tchoe et al., Science Translational Medicine 14, eabj1441 (2022)](https://doi.org/10.1126/scitranslmed.abj1441), [author laboratory copy of article and supplement](https://iebl.ucsd.edu/sites/default/files/iebl/2022-05/Human%20Brain%20Mapping%20with%20Multi%20Thousand%20Channels_0.pdf): Figure 1 / Results, Figure 2A, Figure 3B, Supplement §§1.1–1.4, 1.6–1.7 and Figures S1–S6.
- The nominal carrier is often written as **18 × 18 cm**. The methods give **7 in × 7 in × 0.06 in** (177.8 × 177.8 × 1.524 mm). The atlas’s [02-03](https://buildthesimulation.com/simulations/equipment/02-03/) illustrates a different hardware constraint: 150 × 150 mm standard writing area. [Heidelberg’s fact sheet](https://heidelberg-instruments.com/wp-content/uploads/2025/02/Fact-Sheet-MLA150.pdf) also lists separately equipped 200 mm field and 8-inch mount options. Neither the exact panel pattern bounds nor the authors’ mount/options are inferred.
- Supplement §1.1 describes re-patterning **the same intended traces** over the first 10/250 nm Cr/Au pass with a second 10/250 nm pass; no routing crossover or intervening dielectric. Layout data, overlay statistics and actual trace lengths are not recovered. The graph uses two three-span witness nets whose junctions conduct where the modeled 4 µm-wide strips overlap. Route resistance assumes bulk Au at 2.44×10⁻⁸ Ω·m and independent parallel surviving spans; no contact resistance, deposition variation, resistor accuracy, or true routing length is inferred.
- Contact-site mask, Pt–Ag co-sputter and Ti cap lead to upper conformal parylene and a separate Ti hard mask. Passivation opening is followed by stress relief, mask/cap strip, release in water and then selective removal of Ag. [Ganji et al.](https://pmc.ncbi.nlm.nih.gov/articles/PMC7174248/) provides the early morphology comparison, not a substitute for the large-panel traveler. “Pt-rich” is a state label, not a measured alloy composition or morphology calculation.
- Finished geometry references: **6.6 µm overall parylene** in the main paper (3.5 + 3.1) and **3.7 µm lower deposited** in the supplement (3.7 + 3.1 = 6.8 µm arithmetic, not a measured released thickness). Sites nominally 30 µm diameter and ~2 µm recessed. No local stack thickness, porosity or effective electrochemical area follows from these nominal measurements.
- The 1,024-site square is reconstructed as a regular 32 × 32 at 1 mm pitch with centered coordinates. The 1,024-site narrow case is a labeled inferred display lattice; the 1,024-site fine-pitch version uses the reported 4.8 mm figure and an explicitly inferred regular display. The 2,048-site wide case is a logical index field. All case connections are synthetic and the right visualization is never claimed as recovered artwork.
- Figure 1 reports 1 kHz magnitude of **11 ± 2 kΩ for the square 1,024-site** and **8 ± 4 kΩ for the wide 2,048-site** examples, with yields up to 99.4% and 95.2%, respectively. They are displayed as historical benchmarks only. The unrelated model circuit is two-terminal Rs + (Rct ∥ Cdl), with an assumed 550 Ω baseline series resistance plus the wire witness, 40 kΩ and 14 nF nominal, and a scaled effective-area proxy for the single incomplete-contact case. Only 20 computed frequency points are emitted; no literature curves are fabricated.
- The article describes an LGA1155-style connector, conductive-epoxy bonded extender and custom Intan RHD2164 setup. The generic Intan instrument in our register is **not** the authors’ system. The wide virtual ledger is not proof that one 1,024-input instrument reads 2,048 simultaneously.
- Equipment links identify analogues in the virtual register. A sputter system needs an actual qualified two-target configuration, and comparison to the register's generic wet bench does not establish ability, access, chemical preparation, or approval.

## Reproduce outputs

From this directory:

```sh
python build.py
node --test test/engine.test.cjs
CHROME_BIN=/path/to/chromium python test/browser.py --screens /tmp/ptnrgrid-screens
blender -b --python src/geometry.py -- "$PWD/model"
python test/mesh.test.py
```

- `src/`: static UI, drawing engine, deterministic stage/network model, and editable Blender generator.
- `test/`: independent numerical fixture assertions (including overlapping and non-overlapping breaks, misplaced pads, duplicate outputs, covered/blocked wet cases and order of material state), full HTML Chromium desktop/iPhone 13/360 px touch dark-mode tests, output logs, and binary GLB unit/geometry verification.
- `model/`: optional editable Blender file and a usable glTF binary **of the square contact crop only**. The crop omits the flex outline, perforations, leads, pads, package and active wiring. GLB uses meters and does not include the carrier. Blender keeps the temporary glass object in a separate hidden collection. Both are reference-only surfaces, not fabrication CAD or a physical implant.
