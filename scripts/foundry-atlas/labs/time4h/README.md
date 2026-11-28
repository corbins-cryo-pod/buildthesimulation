# TIME-4H virtual foundry

Open `index.html` directly or serve it from an ordinary static HTTP server. All scripts, SVG plates and styles are embedded; only source and institutional navigation links go off-page. No patient, tissue, live hardware or physical stimulation instructions.

## Try the differential diagnosis

1. Run the nominal traveler (or accept 13 sequential handoffs). Under the local-return fixture, all 16 expected identities and 14 dummy-load loops qualify.
2. Use **Broken left return**: all 14 individual active trace identities remain intact, but only the seven right-hand local loops qualify. Select GR for every loop and repeat the test: all fourteen now qualify. This is an alternative test jig, **not** a prescribed operating mode.
3. Use **Blind left ground**: the same seven-loop loss now occurs with all 16 dry net identities correct. Restricting area differs from breaking an electrical path. Occluding just 35 of 109 openings leaves current paths valid but changes this pedagogical model's complex impedance.
4. Use **Swapped right leads**: every cable path goes somewhere, but two expected physical identities are wrong. A bridge differs from a transposition in the exported Boolean matrix.
5. In Contact map, rotate and explode the two-face model; inspect the two finite ground-patch graphs and the independent bend witness. Camera rotation does not invalidate tests. Changing physical assumptions invalidates downstream traveler steps and produces `results: null` for untested exports.

## Model and boundary

- Primary: [TIME implants, 2021, §2.2.2](https://www.mdpi.com/1424-8220/21/21/7219). Fourteen independent 80 µm openings, 0.75 mm within-face pitch, 0.375 mm offset between opposing sides, 109 connected geometric openings per ground, two separate external ground legs, source stack/assembly. The early [Boretius TIME](https://doi.org/10.1016/j.bios.2010.05.010) is **not** the 4H process record.
- Graph: fixture label to intermediate ceramic endpoint to physical net. The dry test is an ideal buried-conductor witness. Swaps preserve one-to-one connectivity but defeat identity checks. Shorts create multi-target rows. The proximal terminal order, hidden traces, film/patch shape and arrangement of the 109 openings on the schematic hex grid are not original masks or vendor pin assignments.
- Default geometric area = π(0.040 mm)² per opening. The reference model uses disk-intersection area versus overlay on an **assumed** circular 48 µm-radius metal landing. A 109-window return spans 0.5479 mm² of nominal open area at zero mask offset. This is **not** the measured electrochemical surface area.
- A synthetic saline-fixture impedance is the series sum of two area-scaled parallel RC elements and a 150 Ω fixture resistor. Chosen values 25 Ω·mm² and 0.3 µF/mm² are not fitted to the active iridium oxide or the unknown ground surface. No applied stimulus, neural recording or biological response is generated.
- Ideal outer bending strain ε = t/(2R), homogeneous strip, radius to the neutral plane. No multilayer elasticity, contact-pressure or failure criterion. The display's arbitrary exploded separation must not be interpreted as real laminate thickness.
- Register links are facility-level category matches. The screen-printed ceramic and specialized MFI joint are sourced as an external boundary, not passed as local manufacturing capability.

## Rebuild and verify

```sh
python build.py
node model-test.cjs
CHROME_BIN=/path/to/chromium python browser-test.py
```

The numerical suite checks opens, shorts, harness transpositions, electrically good but occluded surfaces, masks and local/shared returns, analytic RC and bend scaling, unique projected apertures, source pitch and edge cases. The browser suite runs the real static HTML with 1360, 390 and 320 px viewports, offline local-file mode, touch emulation, both export states, source navigation, controls, headings and page overflow. An emulated mobile viewport is not physical Safari validation. The optional positional URL argument tests a served deployment instead of the local file.
