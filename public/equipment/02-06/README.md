# ASML PAS 5500/275D — 02-06
Selected NIST NanoFab 100 mm default configuration. The 3D model is an approximate metric reconstruction (outer enclosure estimated; nominal wafer/reticle dimensions). No exact enclosure or stage travel drawing was found. Front and internal layout were reconstructed qualitatively to the NIST installed photo and CNST News winter 2011 p.7 schematic; side/rear ports are inferred and no physical metrology or actual render-to-photo registration is claimed.

Sources:
- https://www.asml.com/en/products/refurbished-systems (official spec-sheet index)
- https://www.readkong.com/page/asml-product-catalog-custom-pdf-ieee-mems-2022-7027024 (ASML 2021 catalog pp. 11–12)
- https://lithoguru.com/scientist/litho_papers/2003_133_Methods%20for%20Benchmarking%20Photolithography%20Simulators.pdf (analytical partially coherent imaging benchmark)
- https://edge.sitecorecloud.io/asmlnetherlaaea-asmlcom-prd-5369/media/project/asmlcom/asmlcom/asml/files/products/refurbished-products/pas-5500-275d.pdf (ASML product data, 2019, p. 2)
- https://www.nist.gov/laboratories/tools-instruments/nanofab-tool-asml-pas5500275d-stepper
- https://www.nist.gov/system/files/documents/cnst/CNST_News_Winter2011.pdf (p. 7)
- https://nvlpubs.nist.gov/nistpubs/ams/NIST.AMS.100-63.pdf (PDF page 9, printed p. 2, independent 5:1 field mapping)

Geometry is defined in model-source.json. model-generator.mjs creates glTF JSON and binary data from that source. The downloadable GLB and glTF are generated from the same named primitives. Scene coordinates are meters (+Y up, +Z front). Reticle, wafer, beam and stage have separate groups. The stage translations are virtual command positions not measured actuator limits.

Revision 1.1: dark-field clear-aperture geometric projection, feature-level disk clipping and ideal local dose; the independent periodic line-space assay uses scalar Abbe imaging, 365 nm, NA 0.48–0.60, conventional or annular source with exact scalar defocus phase. It is not a full-reticle aerial image or calibrated resist/process model. Artwork and completed exposures also update the 3D specimen overlays. Reference cases include coherent three-order interference, cutoff, open/opaque masks, exact two-circle overlap with 81/161 point grids and dose scaling. See optics.mjs and verification.json. Inputs and outputs documented on the simulator. All verification.json checks were executed in isolated JS before integration; node tests and desktop/mobile Chromium checks are included in CI. Production and browser results must be read from the workflow, not inferred from the static reference table. No downstream station adapter claimed.
