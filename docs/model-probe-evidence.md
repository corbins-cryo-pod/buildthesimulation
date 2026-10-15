# Penetrating-shank geometry evidence

Reviewed 2026-10-15. All model coordinates use millimetres. These are implanted-shank references rather than complete probe assemblies or recovered manufacturing masks.

| Catalog device | Selected version | Directly documented geometry | Reconstruction and omissions |
| --- | --- | --- | --- |
| Neuropixels 2.0 alpha | Four-shank 2021 alpha | 10 mm × 70 µm × 24 µm per shank; 250 µm shank pitch; 1,280 square 12 µm sites per shank; 15 µm axial and 32 µm lateral pitch; 175 µm chisel taper | 200 µm tip-to-first-row registration; undeformed shanks; simple triangular tip; reference pads and base omitted |
| Neuropixels Quad Base | Four implanted shanks | Same shank dimensions and recording-site arrangement; 5,120 physical sites; 1,536 recording channels | Electronics base outside modeled scope; no channel map; same registration and taper caveats |
| Neuropixels NXT | Officially identical NP2 shank architecture | Official project states shank geometry and site layout identical to NP2; 1,536 recording channels | Physical count follows that explicit identity; not independently recovered NXT mask; electronics omitted |
| Neuropixels NHP Long | Current NP1032 linear variant | Manufacturer gives 45 mm × 125 µm × 122 µm; 4,416 square 12 µm sites; two aligned columns 103 µm apart; 20 µm axial pitch; 342 µm taper | 360 µm tip-to-first-row registration; centered columns; approximately 25° out-of-plane bevel and large reference pad omitted |

## Primary sources inspected

- [Steinmetz et al. (2021)](https://pmc.ncbi.nlm.nih.gov/articles/PMC8244810/): alpha probe fabrication and 175 µm tip description.
- [imec Neuropixels 2.0 datasheet](https://www.neuropixels.org/_files/ugd/328966_2b39661f072d405b8d284c3c73588bc6.pdf): implanted shank dimensions, contact pitch, site area and taper.
- [imec Quad Base datasheet](https://www.neuropixels.org/_files/ugd/328966_4e39ab2e46424dc9b3efa446d286ab0f.pdf): inspected text and Figure 1 SEM; 5,120 sites and 1,536 channels are distinct quantities.
- [Neuropixels Central](https://www.neuropixelscentral.org/technology): NXT identical-shank/layout statement. This is the justification for transferring NP2 geometry, not a generic same-family assumption.
- [Harris Lab/Bill Karsh ProbeTable](https://github.com/billkarsh/ProbeTable/blob/main/Tables/probe_features.json): NP2010 and NP2020 lateral centers are 27 and 59 µm from the left edge. The columns must not be arbitrarily centered at ±16 µm about the shank center. Absolute axial tip registration was not recovered.
- [imec NHP datasheet](https://www.neuropixels.org/_files/ugd/328966_4228a68261964794ad55f98d80ac3f45.pdf): inspected full table and NP1032 ordering code. The current linear long variant is 122 µm thick and has 103 µm column pitch. Its taper is 342 µm in this source.
- [Trautmann et al. (2025)](https://www.nature.com/articles/s41593-025-01976-5): inspected Figure 1 and primary text. Earlier research shanks are 90 µm silicon with staggered sites; the model deliberately selects the separately specified NP1032 hardware instead of blending those revisions.

## Known source differences

The primary ProbeTable lists 206 µm NP2 tapers and 373 µm NP1032 tapers, differing from 175 and 342 µm in the manufacturer PDFs. These models use the named PDF outline dimensions and state the discrepancy; they must not be presented as a manufacturing blueprint for every revision. The first recording row is positioned by an explicit approximate registration. Relative contact size and pitch remain documented.

The large tip-reference electrodes are omitted because their complete exposed boundaries were not recovered. `physicalSites` is the manufacturer's count of recording sites; it is not the number of every conductor on the probe.

## Candidates withheld

NET-50/NET-10 thread lengths and contact coordinates were not established. Modular NET has three layouts without a recovered full mask. The 2019 UCSF/LLNL polymer paper documents 20 µm circular sites, 20 µm edge spacing and 80 µm shanks, but the dual-line stagger and full outline still need an unambiguous drawing. StimNET reports a 1,800 µm functional length alongside 32 contacts at 60 µm pitch, whose end-to-end centers would span 1,860 µm in a straight line; its exact end registration therefore was not invented. MERF has 25 µm edge-protruding contacts and a 1–1.5 µm variable film, but its full width/profile and contact-placement map were not sufficiently recovered here. These devices remain candidates instead of receiving generic contact grids.
