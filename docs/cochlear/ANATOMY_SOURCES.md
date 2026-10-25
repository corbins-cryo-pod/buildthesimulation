# Anatomical display: sources, derivation and limits

The 3D display combines **measured human CT + serial-section anatomy** with explicitly reconstructed membranes, individual neurons and sensory cells. The electrical experiment continues to use its original unrolled homogeneous-conductor geometry and 65-compartment auditory-nerve model. The anatomical asset is not a conductivity mesh, patient reconstruction, insertion-planning tool or mechanical cochlear simulation.

## Measured asset and required attribution

**Source:** Sieber D, Erfurt P, John S, Ribeiro dos Santos G, Schurzig D, Sørensen MS, Lenarz T. *The OpenEar library of 3D models of the human temporal bone based on computed tomography and micro-slicing.* Scientific Data (2019). [Article, DOI 10.1038/sdata.2018.297](https://www.nature.com/articles/sdata2018297). [OpenEar version 2 dataset, DOI 10.5281/zenodo.1473724](https://zenodo.org/records/1473724).

The dataset uses registered cone-beam CT and serial micro-slicing; calling the whole OpenEar dataset “micro-CT” would misstate its acquisition method. ZETA is one cadaveric specimen, not a population-average cochlea. The [Zenodo API record](https://zenodo.org/api/records/1473724) declares **[Creative Commons Attribution 4.0 International](https://creativecommons.org/licenses/by/4.0/)**. This project credits the authors, identifies the source and license, and records its changes: surface simplification, decimal serialization, a rigid display transform, derived centreline and optional display clipping. The microanatomy added around the surfaces was not segmented by OpenEar.

Only three members of the 3.868 GB `ZETA.zip` archive were retrieved, using HTTP byte ranges and its ZIP central directory. Python `zipfile` verified each extracted member's CRC. The browser asset records SHA-256 hashes of the original selected PLY payloads. The published full-archive MD5 is retained as metadata but marked **not verified**, because the full archive was not downloaded.

| Native ZIP member | Original triangles | Display triangles | What it contains |
| --- | ---: | ---: | --- |
| `07_3D_Models/01_Scala Tympani.ply` |15,996|8,500|Scala tympani lumen surface|
| `07_3D_Models/02_Scala Vestibuli.ply` |20,008|9,500|Scala vestibuli **plus vestibule and semicircular labyrinth**, despite its short filename|
| `07_3D_Models/08_Cochleovestibular Nerve.ply` |16,018|4,500|Measured cochleovestibular nerve surface; not individual auditory fibers|

`public/assets/cochlear/openear-zeta-atlas.json` holds 22,500 triangles in the original shared native millimetre frame. Its 619,230-byte JSON keeps the original member identities, native bounds and source hashes. The display uses a single proper rigid transform for every mesh. The native axes are not relabeled as RAS or LPS without evidence. All three complete simplified meshes remain watertight. Cropped scene surfaces intentionally have open display cuts.

Whole/cutaway views keep the cochlear neighborhood of the SV/labyrinth surface and a faint, coherent portion of the nerve surface near the estimated modiolar axis. Shared-edge polygon clipping avoids dropping whole triangles along a boundary. This is an explanatory cutaway, not an additional tissue segmentation. The complete simplified registered source surfaces remain available in the asset.

## Registered centreline and physical units

`src/lib/cochlear/atlas-reference.json` provides a small registration file independent of the asynchronously fetched surfaces. The ST medial path was derived as follows:

1. Fill a 0.075 mm voxelization of the original closed ST surface.
2. Extract a Lee medial skeleton and the longest weighted path of its principal connected component.
3. Orient the wider end as the basal end, smooth coordinates with a Gaussian of 1.5 voxels, and resample with PCHIP at 181 arc positions.
4. Use a rigid PCA frame, with positive Y toward the apical endpoint and positive determinant. No Cartesian scaling or independent mesh registration is applied.
5. Compute each centreline point's exact minimum distance to triangles of the **original** ST surface. Preserve the initial voxel distances separately for auditing.

The smoothed path arc parameter is **22.247394 mm**. The 181-point displayed polyline has a 22.232031 mm chord sum, a 0.069% sampling difference. This is a lumen medial curve, **not** a measured basilar-membrane length, lateral-wall path, organ-of-Corti map or surgical insertion trajectory. The display-frame ST bounding box is approximately 8.818 × 4.034 × 6.612 mm; those PCA extents are not the clinical cochlear A/B dimensions.

`clearanceMm` is the sampled exact point-to-surface distance. `conservativeClearanceMm` subtracts half the larger adjacent polyline-segment length and 0.00002 mm for coordinate rounding. Distance to a closed surface is 1-Lipschitz, so linearly interpolating these reduced radii gives a conservative distance bound along each stored straight segment. This can support a simple geometric tube-fit check. It does **not** validate carrier deformation, tissue mechanics, surgical clearance, cochlear-wall force or safe insertion.

Inward and superior frame vectors are estimated from the curve and the centroid of its apical third. No segmented modiolus or Rosenthal canal is present in the source asset; the frame and displayed modiolus are explicitly reconstructed.

### Display mapping versus numerical calculation

The generic experiment keeps its 35 mm reference place coordinate. For whole/cutaway display only, reference place `x` maps to ST arc `s = 22.247394×x/35`. The generic contact's circular radius is retained in millimetres, but its displayed distance to a curved neuron is not used in the field calculation. Moving electrical radial distance does not silently move the registered anatomy.

The manufacturer-device view instead uses the supplied physical carrier/contact dimensions and physical centreline arc. It never rescales a long array to make it fit this specimen. Achieved/requested insertion, residual carrier and pads outside the available curve remain available as scene metadata. It has no generic source-contact identity, Greenwood assignment or simulated voltage association. See [IMPLANT_SOURCES.md](IMPLANT_SOURCES.md) for device-specific dimensions and limitations.

## Derivation checks

The complete results are in [anatomy-validation.json](anatomy-validation.json). Each surface comparison used 1,500 area-weighted samples in **each direction**, seed 24520, with exact point-to-triangle minimum distances. Reported maxima are maxima of these finite samples, **not** a global Hausdorff bound. Errors measure the simplification relative to the deposited meshes, not the biological accuracy of the original segmentation.

| Surface | Volume change | Largest bounding-coordinate change | Largest bidirectional sampled surface distance |
| --- | ---: | ---: | ---: |
| ST |−0.03715%|0.000510 mm|0.005320 mm|
| SV/labyrinth |−0.06535%|0.004624 mm|0.014755 mm|
| Cochleovestibular nerve |−0.07139%|0.005767 mm|0.017630 mm|

Every one of 1,981 samples along the 181-point centreline polyline is inside the original closed ST mesh according to the signed solid-angle winding number. The smallest sampled exact surface distance is 0.198654 mm; the median is 0.440960 mm. Winding magnitudes were 1 to floating-point roundoff. This is a strong sampled containment check, not a proof for arbitrary smooth interpolants.

The stored rigid transform has determinant 1.00000000022 and maximum orthonormal residual 7.93×10⁻¹⁰. Native/display centreline coordinates agree within 0.0000104 mm after decimal serialization. More displayed decimal places do not imply biological measurement precision.

### Reproduce the asset and checks

[derive-anatomy-atlas.py](derive-anatomy-atlas.py) retrieves only the three selected public ZIP members, caches them, derives the centreline and writes the compact asset/reference files. [validate-anatomy-atlas.py](validate-anatomy-atlas.py) independently checks simplification distances, volume, rigid registration and sampled containment against those original PLY files. They accept `--root-dir` and `--cache-dir`.

The derivation used NumPy/SciPy, trimesh 5.2.0, scikit-image 0.26.0 and fast-simplification 0.2.0. Example in a Python environment with these dependencies:

```sh
python docs/cochlear/derive-anatomy-atlas.py --cache-dir /tmp/cochlear-anatomy-research
python docs/cochlear/validate-anatomy-atlas.py --cache-dir /tmp/cochlear-anatomy-research
node --test tests/cochlear-anatomy.mjs
```

The JavaScript suite checks the actual connected components and positions of hair-cell meshes, stereocilium height ranks, rigid transforms, immutable electrical coordinates, source-contact radii, preserved vendor placement metadata, selection-to-compartment associations, and absence of physiological replay identifiers on hair cells, type II fibers and measured nerve trunks.

## Reconstructed microanatomy and primary sources

The following studies guide topology and representative scale. They do not make this one procedural reconstruction a histologically validated patient model.

| Structure | Display decision and supported evidence | Primary/official source |
| --- | --- | --- |
| Overall coil | Use the actual measured stacked, asymmetric turns. Human cochleae vary: Avci et al.'s 16 specimens had 2.64 ± 0.17 turns, base length 9.2 ± 0.4 mm, width 7.0 ± 0.3 mm and height 4.4 ± 0.3 mm. These are context, not dimensions imposed on ZETA. |[Avci et al. 2014, DOI 10.1002/cne.23594](https://pmc.ncbi.nlm.nih.gov/articles/PMC4265794/)|
| Scala media and membranes | The reconstructed scala-media wedge has basilar membrane below, Reissner's membrane above, and lateral wall. SV/ST are perilymphatic spaces; scala media is endolymphatic. |[Duke School of Medicine histology: ear](https://histology.oit.duke.edu/NormalBody/EyeEar/Ear.html)|
| Basilar membrane | Representative width increases from 0.13 to 0.42 mm along the reconstructed coil, informed by a human SEM report of 126 µm basal to 418 µm apical width. No membrane thickness, stiffness or vibration is computed. |[Liu et al. 2015, DOI 10.1007/s00441-014-2098-z](https://link.springer.com/article/10.1007/s00441-014-2098-z)|
| Osseous spiral lamina | A medial shelf connects the reconstructed bony core and partition. The real human OSL has two plates, pillars and pores carrying radial nerves; the displayed solid ribbon is simplified. |[Bom Braga et al. 2023, DOI 10.1007/s10162-023-00904-3](https://link.springer.com/article/10.1007/s10162-023-00904-3)|
| Hair cells and bundles | One inner row and three outer rows; human regions can have a fourth outer row. IHC bundles use shallow arcs and OHC bundles use chevrons, with three height ranks. The displayed 27 stereocilia/cell are a sampled representation, not a complete census. |[Wright 1983, DOI 10.1177/014107688307600407](https://pubmed.ncbi.nlm.nih.gov/6341584/); [Wright 1984, human stereocilium dimensions](https://pubmed.ncbi.nlm.nih.gov/6706866/)|
| Supporting architecture | Pillar legs bound the tunnel of Corti; Deiters cups/processes support OHCs. The reticular lamina and tectorial canopy are separate from the basilar membrane. Tallest OHC bundles approach the canopy while IHC bundles remain beneath it. |[Duke histology](https://histology.oit.duke.edu/NormalBody/EyeEar/Ear.html); [Rask-Andersen et al. 2012 human cochlear microscopy, DOI 10.1002/ar.22599](https://anatomypubs.onlinelibrary.wiley.com/doi/10.1002/ar.22599)|
| Type I fibers and ganglion | Type I afferents run radially to IHCs. Large human ganglion somata lack the thick myelin of their processes; satellite glia surround them. The terminal neurite becomes unmyelinated near the habenular opening. |[Liu et al. 2021, DOI 10.3389/fncel.2021.642211](https://www.frontiersin.org/journals/cellular-neuroscience/articles/10.3389/fncel.2021.642211/full)|
| Type II fibers | Thin outer-spiral afferents turn beneath multiple OHCs. Their anatomy is shown in a distinct static color; they are outside the cable simulation. |[Nadol 1983 serial-section reconstruction, outer hair cells](https://pubmed.ncbi.nlm.nih.gov/6855401/)|

The organ view contains ten cells along each of the four displayed rows, on a representative micrometre-scale patch. It is reconstructed histology, not a magnified crop of the CT/serial-section mesh. Cell survival, transduction, synaptic release, hair-bundle mechanics, acoustic amplification and fluid flow are not simulated.

The macro view shows at most eight representative type I pathways, always including the selected fiber. Their 65 color indices map to the real modeled compartments; the curved routes and enlarged neurite/soma diameters are display constructions. Myelin is restricted to model internodes, leaving the somatic region bare. In the organ close-up, only one explicitly indexed selected terminal can carry compartment 0 replay. The source measured nerve trunk, other illustrative terminals, hair cells and type II branches have no replay mapping.

## Visual review landmarks

A whole-cochlea view should show a broad asymmetric basal turn and stacked smaller apical turns, with separate ST/SV surfaces. A cutaway should expose the reconstructed scala-media wedge and distinguish the basilar partition from Reissner's membrane. The central bony core must not be mistaken for measured segmentation. Curved radial fibers should converge toward ganglion somata and continue centrally with discrete myelin segments; they should not form a solid myelin sphere around the soma.

At cellular scale, count one IHC row and three OHC rows, verify clear staircases on the bundles, a triangular pillar tunnel, Deiters supports, distinct basal/reticular/tectorial surfaces, radial IHC terminals and a thin longitudinal OHC type II arbor. Membranes may be toggled to expose cells. Device inspection must retain true relative pad size and physical length, and distinguish inserted residual carrier from carrier inside the available registered lumen path.
