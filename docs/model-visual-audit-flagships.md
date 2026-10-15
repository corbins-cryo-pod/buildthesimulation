# Flagship implant visual audit

Reviewed 2026-10-15 UTC. This audit compared the current mesh construction and
dimensions with the source images listed below. Images were actually opened and
inspected; conclusions about shape or color are visual observations, not new
dimensional measurements. The applied profiles, material colors and reconstructed
contact maps remain labeled as illustrative in the model registry. This ledger
records the final appearance choices and their accuracy boundaries.

Independent implementation recheck completed after the visual changes. All six
families retain their expected site counts and finite unit mesh normals. Both
Utah profiles advance monotonically along the needle axis. All 224 ribbon
meshes (64 N1 threads and 160 Stentrode struts) have outward-facing start and
end caps. All 16 Stentrode mounts connect the scaffold to the electrode backs.
These checks inspect the actual mesh; they are not a claim of browser/WebGL
interaction testing.

## Utah Array — `utah-10x10-1p5`

Viewed:

- `public/images/devices/btsd-0001.webp`: Fernandez et al. (2014), Figure 1A,
  a 100-electrode SEM with its 2 mm bar. Source:
  <https://www.frontiersin.org/journals/neuroengineering/articles/10.3389/fneng.2014.00024/full>.
- Blackrock's current side photograph:
  <https://blackrockneurotech.com/wp-content/uploads/Array-tip-e1691617824598.jpg>.
- Blackrock's current 10 × 10 backside photograph:
  <https://blackrockneurotech.com/wp-content/uploads/Array-edges-e1691617416409.jpg>.
  This shows the regular array and lead attachment, but is not a view of the
  penetrating tissue-facing tips.

The current [manufacturer page](https://blackrockneurotech.com/products/utah-array/)
supports the retained 400 µm pitch, selected 1.5 mm length, and 4 × 4 × 0.2 mm
substrate. The photographs show slender continuously tapered needles, with a
flared transition at the substrate. A nearly cylindrical shaft topped by a broad,
short cone makes the model look more like a pin bed than the observed array.

Applied visual profile, retaining the existing unmeasured 40 µm maximum
shaft radius: let `h = length - tipLength` and `R = shaftRadius`. Interpolate the
`(z, radius)` samples `(0,R)`, `(0.025h,0.82R)`, `(0.08h,0.65R)`,
`(0.5h,0.43R)`, `(h,0.22R)`, followed by a tip ending at the original apex.
The profile samples are a silhouette reconstruction, not metrology. Centripetal
interpolation preserves a monotone axial profile without the local backward
fold produced by a uniform spline. The mesh uses 32 radial segments and a
neutral metallic tip finish rather than gold.
The unspecified tip metallization is not assigned an exact composition from the
photograph. No exposed-area value can be inferred from either photograph.

## Utah Slanted Array — `usea-10x10-0p5-1p5`

Viewed:

- `public/images/devices/btsd-0005-slanted-sem.webp`, a side SEM with 2 mm bar.
- `public/images/devices/btsd-0005-manufacturer-side-render.png`, the Blackrock
  side rendering at
  <https://blackrockneurotech.com/wp-content/uploads/2023/04/1-Slant_Array_Electrode_Longevity_Array.png>.

The [manufacturer page](https://blackrockneurotech.com/products/slant-array/)
still distinguishes a feature description of 0.5–1.5 mm linear grading from the
table's customizable 0.75–1.5 mm range. Retain the named model's 0.5–1.5 mm
choice and 400 µm pitch; the different 2017 study
range is not substituted. The source rendering clearly shows flared bases,
slender shafts and pointed tips, supporting the applied continuous profile
improvement shared with Utah. Every tip's original height and the count of 100
remain unchanged.
The ten-column progression and Utah-family substrate remain assumptions.

## Connexus — `connexus-421-cortical-reference`

Viewed `public/images/devices/btsd-imbci-0010.webp`, the circular module photograph
from the [2024 manufacturer article](https://paradromics.com/blog/neurotech-that-lasts/):
<https://paradromics.com/wp-content/uploads/2024/05/Cortical-Module-Close-Up_Paradromics_2-copy.jpg>.

The source shows a reflective silver enclosure, a narrow warm-colored perimeter
seal and a dark tissue-facing center beneath the wires. The pale gray ceramic
surface in the original model did not match this appearance. The model now has
a dark face, a warm perimeter finish and neutral metallic wire tips. This
does not establish the actual ceramic composition or calibrated color.

Preserve the documented 421 wires, 300 µm pitch and 1.5 mm insertion depth, and
the nominal 10 mm circular envelope. The 8 mm face diameter, 1.5 mm housing
thickness, tip shape and older-source 40 µm wire bound remain explicit
reconstruction assumptions. The pictured lateral lead can be omitted rather
than fabricated. The older square package's 9 mm dimension must not be applied
to this circular version.

## Neuralink N1 — `neuralink-n1-64x16-2024-reference`

Viewed:

- The 2024 PRIME exploded N1 image:
  <https://cdn.buttercms.com/HsyAIkHURhOFMwmjO16q>, linked from the
  [PRIME update](https://neuralink.com/updates/prime-study-progress-update/).
- `public/images/devices/btsd-0002-threads-2019.png`, the earlier paper's thread
  microscopy. This is a different generation and does not establish the current
  2024 contact shape or insertion-loop dimensions.

The exploded manufacturer image shows smooth pale gray enclosure pieces. The
dark concentric inlay ring and center disc in the original model have no support
in that image and have been removed. A pale matte enclosure provides the closer
visual reference. The image locates a charging-coil assembly qualitatively within the
stack, but does not give dimensions sufficient to add a scale-accurate coil.

The 64 × 16 configuration, nominal 24 × 9 mm enclosure, 200 µm along-thread
pitch and 4.4 µm thread stack are retained as the existing named reference.
The unfurled fan is a display pose. The original 3.4 mm-wide tab was narrower
than the total span of its thread entries. The revised tab spans
`63 × 0.085 + 0.084 = 5.439 mm`, covering all 64 entry ribbons; this remains an
illustrative tab dimension. Its upper face at Z=0 touches the entry ribbons and
its inner portion intersects the rounded enclosure, avoiding detached geometry.
Contact geometry and exposed area remain unknown; neutral visual markers are
not a new claimed electrode geometry.

## Stentrode — `stentrode-16-500um-reference`

Viewed:

- Kacker et al. (2025), Figure 1a, in the complete publisher PDF hosted by the
  [University of Melbourne](https://minerva-access.unimelb.edu.au/server/api/core/bitstreams/57a1e343-1a2d-4651-9380-1957524f0a05/content).
  PDF page 5 / journal page 4 was rendered and the embedded figure extracted
  for inspection. Section 2.2 was also checked in the PDF.
- `public/images/devices/btsd-0003-device-view.jpg` and
  `public/images/devices/btsd-0003-closeup.jpg`: owner-supplied reference
  photographs, the latter with its 10 mm scale. Exact hardware revision is
  unspecified, so they do not override the named Kacker configuration.
- Synchron's [contact-junction macro photograph](https://cdn.sanity.io/images/e828r2sn/production/5cfebc7a8c391f90bfffba4ffd35cc02d654c82a-2400x1600.jpg),
  linked from its research material.

Section 2.2 supports 16 platinum electrodes, 500 µm diameter, a nominal 8 × 40 mm
nitinol scaffold and approximately 3 mm interelectrode spacing. Figure 1a shows
long, sparse open cells, distributed contacts and a proximal convergence into
the lead. The original 20 axial intervals create a visibly dense tube; the
single alternating 0°/30° contact strip also reads unlike the source. The macro
image shows a pale metallic contact face in a thin integrated mounting region,
not a glowing gold button.

A new *illustrative* reconstruction uses 10 axial intervals and 8
circumferential nodes, with 16 contacts at nodes on rows 2–9, two adjacent
circumferential nodes per row. Consecutive row pairs use base columns
`0,0,2,2,4,4,6,6`, distributing contacts around the tube. Contact node angles use
the scaffold's own formula `(2*column + row%2)*π/8`; all 16 bindings were checked
against the scaffold node positions. At the existing face-center radius of 4.07 mm, adjacent contacts at
one level are about 3.115 mm apart; axial level spacing is 4 mm. This supports
a visual nearest-neighbor example but is not evidence that the manufacturer's
map has this pattern. The registry explicitly identifies the new reconstructed
map and both its paired and axial spacings.

The proximal transition tapers the first 4 mm of the existing 40 mm envelope
from lead radius to scaffold radius; the exact transition length and shape are
illustrative. The distal end remains open and the lead joins the convergence.
The 500 µm contact face and its derived area remain unchanged. The contact
finish is now neutral platinum and the scaffold uses a metallic nitinol finish;
the old emissive gold has been removed. Each solid mounting support is centered
at radius 4.02 mm and has an illustrative 0.06 mm radial thickness, overlapping
both the scaffold and the back of its disk. The front contact face stays at
radius 4.07 mm. Thus the mounting collar no longer floats above the scaffold.

## Neurograin — `neurograin-packaged-envelope`

Viewed:

- `public/images/devices/btsd-acad-0004-microimplants.webp`: Lee et al. (2021),
  Figure 1b, showing the actual chiplets on a dime and an inset optional wire.
  [Original Figure 1 image](https://media.springernature.com/full/springer-static/image/art%3A10.1038%2Fs41928-021-00631-8/MediaObjects/41928_2021_631_Fig1_HTML.png).
- `public/images/devices/btsd-acad-0004-chip-detail.webp`: Figure 2a, a separately
  described stimulating ASIC micrograph. Its coil and pads must not be copied
  onto the Figure 1 package envelope.

The Figure 1 chiplets have warm gold/yellow faces and dark edges; a uniformly
blue-gray cuboid missed that appearance. The revised model uses a gold-toned
top material and dark silicon side material without changing a single
dimension. The 650 × 650 × 250 µm envelope and zero reconstructed contact sites
remain intact. No Figure 2 stimulation layout, guessed coil traces, optional
microwire or unsupported bevel radius has been added. This remains a package
envelope, not a complete microimplant architecture.
