# Transparent Graphene Foundry

Open release/index.html in any recent browser. This portable Build The Simulation lab explores one dry test coupon per reference architecture: a **CLEAR-derived graphene transfer stack** and a **TU Delft transfer-free multilayer stack**. The two workflows are independent. They use original geometrical teaching coupons, not the authors’ recovered masks or a complete device reproduction.

- **CL-04.** Four separately grown sheets are transferred sequentially to a Parylene-C/Cr/Au assembly on temporary silicon. The protective oxide separates the graphene from downstream pattern transfer. After upper parylene windows are cut, the film releases from Si and the oxide is removed at the exposure. In the research paper this material stack supports 16 channels; the drawing here is one nominal 100 µm teaching contact, not a recovered contact size or array map.
- **DL-ML.** Carbon grows directly on patterned Mo on fused silica. Temporary backside Ti and a local Ti/Al cap have distinct purposes. Outer Ti/Au routing and parylene follow. Quartz remains after dicing. Mo stays under the covered inner tracks but is cleared under the contact. A 10, 30 or 50 µm diameter contact is selectable, as size classes documented in the source; actual mask layouts were not reconstructed.

Both twelve-stage travelers link their corresponding facilities in the virtual equipment register. The term “external” marks operations that cannot be inferred from those station links, including qualified high-temperature catalytic growth, donor transfer qualification and calibrated optical transmission. Device use, optical stimulation, tissue, electrophysiology, and biological or clinical claims are outside this work. No INBRAIN or rGO product equivalence is assumed.

## Try the case studies

1. Select an individual traveler station or **Run both to bench**. Changing one sample’s stage or fault does not rewrite the other.
2. Use **Plan** for equally scaled planar teaching coupons, **Layer cutaway** for a deliberately Z-exaggerated assembly, or **Window proof** for circles normalized to each contact diameter. The colored proof is geometry, not a simulated optical instrument.
3. **One transfer tears** leaves three full through-paths and the nominal opening. In the selected terminal-tie model the dry line resistance rises by 4/3.
4. **Four staggered tears** gives an open circuit under terminal ties only. Switch to **Ideal interior ties (hypothetical)**: a composite path can exist even though none of the four modeled sheets is individually intact. This does not establish that real layer interfaces conduct that way.
5. **Mo left at the face** retains the calculated electrical path but reduces unobstructed carbon area. Conversely, **Carbon track opens** can still read through the Mo intended to remain beneath the inner route. Both hold engineering interpretation even when a limited bench observable passes.

## Provenance — do not swap the transmission numbers

| Sample | Reported observation | Witness, not this drawn coupon |
| --- | --- | --- |
| CLEAR | 152 Ω/□ (one sheet) and 76 Ω/□ (four sheets) | Material TLM witness, Figure 2e, not a full pad-to-site resistance |
| CLEAR | About 90% transmission at the two highlighted visible bands (470 and 570 nm) | Four sheets on a 15 µm parylene-C witness, Figure 2f. Approximate summary, not two exact samples and not a claimed 550 nm value. |
| Delft | Raman D, G, 2D positions approximately 1335, 1582 and 2660 cm⁻¹ | Averaged measurements (n=5) compared after growth and after fabrication, Fig. 2a. The plot here marks centers only. |
| Delft | 47.5% at 550 nm | **Separate, centimeter-scale transferred film on glass**, Fig. 2b. The paper subtracts the glass contribution. The device process itself is transfer-free. |
| Delft | Roughly 20–25 layers | Film estimate from a linear optical-loss approximation, not a direct count at a device contact. |

These values do not rank identical coupons at one wavelength or establish a final transparent neural device's performance. The links to the two papers are preserved in every JSON export. Each SVG is labeled with its sample ID and DOI and is a view export, not a manufacturing file.

## Rebuild and run checks

    python build.py
    node --test tests/engine.cjs
    CHROMIUM_BIN=/path/to/chromium python tests/browser.py

The standalone HTML includes engine, styles, original SVG views and register snapshot. To refresh the latter, run python build.py --repo /path/to/buildthesimulation. This source archive is sufficient for offline rebuilding. The reports record 19 model cases and Chromium desktop, iPhone 13 touch emulation and 360 px layout checks. A browser emulator is not the same as a physical Safari session. No remote resources are loaded when the lab opens.

The assumptions and equations are also described in docs/engineering.md. Model/source limits are visible inside the public lab and in exported JSON.

## Primary sources

- [Park et al., Nature Communications 5:5258 (2014)](https://www.nature.com/articles/ncomms6258). Fig. 1, Fig. 2e–f, Methods and Supplementary Fig. S5.
- [Alvarez de Eulate et al., Advanced Science 13:e17524 (2026)](https://advanced.onlinelibrary.wiley.com/doi/10.1002/advs.202517524). Fig. 1, Fig. 2a–b, Exp. §4 and Supplement S2.
