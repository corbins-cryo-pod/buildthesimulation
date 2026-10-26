# Implant reference models: dimensions, provenance, and reconstruction

This record supports the independent **Implant models** inspection view in the Cochlear Implant Laboratory. It preserves the manufacturer research and documents the geometric choices in `src/lib/cochlear/implants.js` and `src/lib/cochlear/implantGeometry.js`.

The five named objects are manufacturer-dimension references, not manufacturer CAD, clinical recommendations, insertion-mechanics simulations, or commercial sound-processor emulations. They do not change the laboratory's calculated fields, nerve model, or generic frequency-place mapping. Public sources were checked on **2026-10-25**.

## Verified physical dimensions

All lengths and cross-sections are in **mm**. An active contact span, tip-to-marker distance, overall array extent, and receiver-to-tip lead length are different measurements.

| Reference profile | Longitudinal stimulation sites / physical stimulating pads | Manufacturer active span | Other length landmarks | Distal carrier section | Proximal carrier section | Design family |
| --- | ---: | ---: | --- | --- | --- | --- |
| Cochlear CI622 Slim Straight | 22 / 22 | 19.1, straightened | Tip to white markers: 20 and 25 | 0.35 × 0.25 | 0.60 × 0.50 | Straight lateral wall |
| Cochlear CI632 Slim Modiolar | 22 / 22 | 14.0, straightened | Tip to most basal contact: 14.4; tip to most proximal white marker: 18.4 | 0.35 × 0.40 | 0.475 × 0.50 | Precurved perimodiolar |
| MED-EL FLEX28 | 12 / 19 | 23.1 stimulation range | Nominal array length: 28 | 0.50 × 0.40 | Diameter 0.80 | Flexible straight lateral wall |
| AB HiFocus SlimJ | 16 / 16 | Approximately 20 | Tip to blue marker: 23; proximal wing length: 10 | At contact 1: 0.55 × 0.26 | At contact 16: 0.76 × 0.56 | Lateral wall, slight resting curve |
| AB HiFocus Mid-Scala | 16 / 16 | Approximately 15 | Tip to proximal blue marker: 18.5; tip to proximal neck/jog: 23.7 | At contact 1: 0.50 × 0.50 | At contact 16: 0.70 × 0.70 | Precurved open spiral / mid-scala |

Sources: Cochlear guides [1–3], MED-EL technical/professional documentation [4–5], and AB manual, specifications, and design descriptions [6–9]. The model uses exact array identifiers rather than assuming that an array name also identifies every later receiver generation.

## Contact topology, surfaces, and orientation

### Cochlear CI622 Slim Straight

The manufacturer identifies **half-band** contacts, oriented toward the modiolus. The stated exposed-area range is **0.14–0.20 mm²**, and the straightened centre-spacing range is **0.85–0.95 mm** [1]. The mesh therefore uses partial inward metallic bands rather than complete rings. Its uniform reconstruction has 21 intervals across 19.1 mm, or about 0.9095 mm, inside that specified spacing range. The unpublished tip-to-first-site offset is not represented as a verified measurement.

### Cochlear CI632 Slim Modiolar

The manufacturer specifies inward-facing stimulating pads, areas **0.15–0.16 mm²**, and nominal **0.6 mm centre spacing when curled** [2]. Its **14 mm active span when straightened** describes a different measurement condition. The exact free-rest spiral and pad outline were not available in the retrieved specifications. The inspection model retains the documented dimensions and inward orientation, while using a reconstructed precurve and rounded pad outline. Marker distances use the additional official product diagram [3].

### MED-EL FLEX28

The **five most apical sites are single-pad sites**; the remaining **seven sites have paired pads**, giving **5 + 7 × 2 = 19 physical pads at 12 longitudinal channel positions** [4–5]. The SYNCHRONY 2 electronics separately specify 12 electrode channels and 24 independent current sources [4]. Neither that circuit count nor the physical-pad count should replace the longitudinal channel count.

The retrieved primary material did not establish pad area, detailed pad outline, or circumferential pair azimuth. The paired topology is verified; the opposed pair placement in this mesh is explicitly schematic. The 23.1 mm active range is retained separately from the 28 mm nominal array length. Uniform 2.1 mm spacing is a model derivation from 23.1 mm divided by eleven intervals, rather than an independently verified manufacturing pitch.

### Advanced Bionics SlimJ and Mid-Scala

Both references have sixteen platinum stimulating contacts. The Ultra 3D receiver has sixteen independent output circuits; current-steered virtual sites are not additional physical electrodes [6–7]. Contact-facing direction is toward the modiolus [6]. The specification **0.12 mm² minimum exposed area** is a lower-bound specification, not an exact nominal area for each pad [7].

The Mid-Scala design includes a separate inactive radiopaque marker under its distal blue marker [8]. The model represents it with role `inactive-marker`, no picking index, and no stimulation-site membership. Exact pad outlines are reconstructed.

## Source discrepancies and measurement conventions

The AB surgeon manual distinguishes SlimJ's contact-16 section (**0.76 × 0.56 mm**) from its typical cochlear-entry section (**0.79 × 0.61 mm**) [6]. The earlier SlimJ design white paper describes the latter at the proximal contact [9]. The implementation uses the manual's contact-16 value, then interpolates toward the separately specified entry dimensions.

The AB technical sheet specifies pitches of **1.3 mm** for SlimJ and **0.975 mm** for Mid-Scala [7]. Fifteen intervals imply centre spans of **19.5 mm** and **14.625 mm**. The approximately 20 and 15 mm manufacturer active spans are stored separately, rather than making those quantities artificially identical. This also makes clear why rounded span figures cannot determine all contact centres to manufacturing precision.

The Mid-Scala **18.5 mm** dimension ends at the proximal insertion marker; the **23.7 mm** dimension ends at the proximal neck/jog [6]. Neither is the complete receiver-to-electrode lead length.

## Optional receiver and lead context

These dimensions are retained here for a future context inset; the first inspection implementation concentrates on the electrode array.

| Receiver reference | Useful dimensions | Source |
| --- | --- | --- |
| Cochlear CI622 / CI632 | Case 24 × 23 × 3.9 mm; coil diameter 31 mm, thickness 3.9 mm. Receiver-to-tip lead 105 mm (CI622) or 98 mm (CI632). | [1–2] |
| MED-EL SYNCHRONY 2 | Stimulator 18.8 × 24 × 4.5 mm; coil diameter 29 mm, thickness 3.3 mm. | [4] |
| AB Ultra 3D | Case thickness including silicone 4.5 mm; antenna-coil thickness 3.6 mm; distinct case and ring grounds. | [7] |

These external grounds and receiver features must remain separate from intracochlear stimulating pads. No housing CAD, receiver magnet physics, or surgical lead routing is inferred from these few dimensions.

## Implemented profile API

`implants.js` exports:

- `IMPLANT_PROFILES`: five immutable named profiles.
- `DEFAULT_IMPLANT_PROFILE_ID`: `cochlear-ci622`.
- `GENERIC_IMPLANT_PROFILE`: a separate generic mechanical reference.
- `getImplantProfile(id)`: returns a known profile or rejects an unknown identifier.
- `getImplantContactMap(profileOrId)`: returns one entry per physical stimulating pad.

Stable profile fields are `id`, `manufacturer`, `name`, `family`, `channelCount`, `padCount`, `activeSpanMm`, `bodyLengthMm`, `bodyLengthLabel`, `tipSizeMm`, `baseSizeMm`, `description`, `sources`, and `notes`. The `measurements` object keeps uncertain manufacturer dimensions null. The separate `geometry` object records complete reconstruction choices, their status, and the values needed to draw an inspectable object.

Profile identifiers are:

| ID | Reference |
| --- | --- |
| `cochlear-ci622` | Cochlear Slim Straight CI622 |
| `cochlear-ci632` | Cochlear Slim Modiolar CI632 |
| `medel-flex28` | MED-EL FLEX28 |
| `ab-slimj` | AB HiFocus SlimJ |
| `ab-mid-scala` | AB HiFocus Mid-Scala |
| `generic` | Separate generic mechanical reference; not in the five-device list |

Contact-map entries contain `implantContactIndex`, `siteIndex`, `channelIndex`, `siteNumber`, `padInSite`, `padsAtSite`, `distanceFromTipMm`, `azimuthRadians`, `shape`, `label`, and a numbering note. **Inspection site indices run apical to basal and are model indices.** They are not vendor contact numbers and are not the electrical experiment's basal-to-apical `contactIndex` values. The two physical pads at a FLEX28 paired site share one inspection site index.

`implantGeometry.js` exports:

```js
createImplantGeometry(profileOrId, {
  pose: 'bench', // or 'inserted'
  centerline, // required only for inserted
  insertionDepthMm, // optional physical tip depth along reference path
  radialSegments: 16,
});
```

The optional `centerline` contract is `{ displayPoints, arcMm, inwardNormals?, clearanceMm?, conservativeClearanceMm? }`, with millimetre points and strictly increasing physical arc length starting at zero. When supplied, conservative clearance takes precedence over point-sample clearance. Output includes renderer-neutral `meshes`, `paths`, `tubes`, `markers`, `labels`, `bounds`, `contacts`, `profile`, `placement`, and `notes`. Meshes use flat plain `positions`, `indices`, and `normals` arrays, layer `implant`, a material, and top-level color/opacity. Only physical stimulating-pad meshes carry `implantContactIndex`. They do not carry `contactIndex`, voltage, current, or an electrical source membership.

## Reconstruction choices and unknown dimensions

The model retains actual dimension references without claiming unpublished manufacturing precision. Specific choices are:

| Feature | Implementation and status |
| --- | --- |
| Carrier taper | Linear interpolation between published distal/proximal sections; intermediate shape is reconstructed. |
| Tip end | Short rounded leading nose; the exact nose profile is not published. Distal dimensions apply in the distal carrier/contact region. |
| CI622 site offset | 0.4 mm tip-to-first-site offset is schematic; uniform sites span the documented 19.1 mm. |
| CI632 site offset | 0.4 mm is derived from 14.4 mm tip-to-basal distance minus 14 mm straightened active span. Sites are uniformly reconstructed in that span. |
| FLEX28 site offset | 1.2 mm is a visual allocation, not a verified manufacturer dimension; exact tip-to-first-pad distance remains null in `measurements`. |
| SlimJ centre positions | 0.5 mm first-site offset derives from 23 mm tip-to-marker minus 3 mm last-site-to-marker minus fifteen 1.3 mm intervals. The source measurements are approximate. |
| Mid-Scala centre positions | 0.875 mm first-site offset derives from 18.5 mm minus 3 mm minus fifteen 0.975 mm intervals. The source measurements are approximate. |
| CI622 pad outline | Half-band topology and inward orientation are documented. Axial footprint follows an interpolated area within the documented range. |
| CI632 pad outline | Rounded inward pad approximation; footprint follows the documented area range. Exact outline remains unknown. |
| FLEX28 pads | Oval visual patches with an explicitly unverified 0.12 mm² reconstruction footprint. Opposed paired azimuth is schematic. No electrical area is assigned. |
| AB pads | Rectangular visual surface patches using the documented 0.12 mm² minimum as a reconstruction footprint, not as an exact nominal area. |
| Cross-section shapes | Elliptical sections except for a rounded-square Mid-Scala reconstruction. Manufacturer width/height endpoints are preserved; exact intermediate outlines are not supplied. |
| Rest curvature | CI622/FLEX28 straight; SlimJ gently curved; CI632 tightly precurved; Mid-Scala more open. Numerical rest curves are illustrative, not manufacturer CAD. Curved paths are rescaled by arc length to retain the specified physical carrier length. |
| Marker bands | Documented landmark distances where known; widths and some outline details are schematic. The carrier continues by a half-band width when its length label ends at a marker landmark. |
| FLEX28 green marker | Color/design feature documented; exact axial location and width are reconstructed. |
| SlimJ wing | Documented 10 mm length; cross-section, taper, and outline are reconstructed. The wing faces away from the contact side. |

These distinctions are available in the profile's notes and per-contact footprint status. Selecting a pad does not enlarge its physical mesh; a highlight may change material or overlay a separate interaction outline.

## Bench and inserted poses

The bench pose is a dimensionally scaled reference with straight or reconstructed natural curvature. It uses physical millimetres. There is no screen-space enlargement of contacts baked into the geometry.

The inserted pose parameterizes the supplied measured scala-tympani path by physical arc length. The apical tip is placed at the requested insertion distance, and successive positions toward the carrier base are sampled backward along the path. Any residual carrier length extends outside the entry along its tangent. Arrays are never shortened, shrunk, or stretched to force them into the reference anatomy.

When valid clearance samples are available, the builder compares a conservative sampled carrier cross-section radius, including a small surface offset, with the supplied lumen-clearance bound. The atlas now uses exact distances from its stored centreline samples to the original scala-tympani triangles, with a conservative segment-length subtraction based on the 1-Lipschitz property of distance to a surface. `conservativeClearanceMm` takes precedence over `clearanceMm`; a zero or negative lower bound remains adverse geometric information and is not treated as missing data. The old voxel-distance samples remain in the atlas only for audit. If needed, the builder reduces tip depth in 0.05 mm steps. Its 0.01 mm additional geometric margin is a numerical reconstruction choice, **not a clinical safety margin**. Output reports requested/achieved insertion, the clearance source, approximate clearance status, estimated minimum radial margin, partial placement, and physical-pad counts inside/outside the reference path.

The measured centreline is not automatically a lateral-wall, perimodiolar, or organ-of-Corti path. This first inserted comparison places the different array dimensions on the same reference centreline; it does not predict a device's actual resting position in the scala. Family-specific free-rest shapes are shown in the bench view. Neither pose changes the frequency-place map or any neural calculation.

The 22.247 mm reference path is shorter than some nominal insertion distances. Placement is regenerated from the current atlas clearance each time; earlier voxel-distance results are superseded by the original-surface conservative bound. The diagnostic insertion values are not observed implantations, clinical targets, or validated fit predictions. Changes to atlas extraction or clearance can change these outputs without changing any manufacturer dimensions.

## Electrical and processing boundaries

The existing generic solver uses prescribed uniform-source disks. A detailed mechanical mesh does not turn those sources into manufacturer-accurate half-band or pad fields. This inspection module has no solver dependency and supplies no voltage overlays.

If an equal-area source approximation is introduced separately, its radius would be `sqrt(A / π)`. For example, 0.15 mm² corresponds to approximately 0.219 mm. Carrier radius and exposed contact area are different quantities. The MED-EL paired-pad topology would additionally require a verified pad geometry and an explicitly stated current-sharing model before individual-pad electrical fields could be claimed.

An explicit UI action may copy a profile's longitudinal channel count into a generic experiment. Such an action should state any generic strategy change and preserve the existing 35 mm cochlear-reference mapping unless the user changes that experiment. Physical array length is not a direct replacement for the cochlear-place coordinate, especially for a precurved array.

At 50 µs per phase, an 8 µs interphase gap, and a 2 µs guard, a sequential pulse slot takes 110 µs. At 600 selection frames/s, all-channel CIS would occupy 79.2% for 12 sources, 105.6% for 16, and 145.2% for 22. The latter two are invalid serial schedules. Eight selected sources per frame use 52.8%. A UI must explicitly choose a feasible generic schedule or show the invalid setting; it must not silently drop pulses or imply a vendor strategy.

## Focused verification

The implementation was checked directly in Node for all five profiles in both poses. Checks covered physical-pad and longitudinal-site counts; finite vertex/normal coordinates; triangle indices within each mesh; one selectable mesh per physical stimulating pad; absence of solver `contactIndex`; and a separate non-stimulating Mid-Scala marker. The initial geometry builds completed in approximately 14–44 ms each in the development environment. These are software and geometry checks, not biological validation.

The first implementation stores no manufacturer mesh/image assets and copies no vendor processor code. Numerical specification facts are cited; reconstructed meshes are generated independently. Manufacturer names identify the reference devices and do not imply endorsement.

## Primary sources

1. **Cochlear CI622 Physician’s Guide — D1144275-V3, April 2024.** Device description, orientation, and specifications, printed pages 21, 46–48, 71. [Official PDF](https://assets.cochlear.com/api/public/content/f54880005c87443c9326bbebc85d78e2?v=a67de1e6).

2. **Cochlear CI632 Physician’s Guide — D1144281-V4, April 2024.** Orientation and specifications, printed pages 51 and 81–83. [Official PDF](https://assets.cochlear.com/api/public/content/4c09b3bcf6684f38b0134c52dcc6934a?v=916ac969).

3. **Cochlear Slim Modiolar CI632 official product specifications.** Additional tip-to-contact and tip-to-marker dimensions. [Manufacturer page](https://www.cochlear.com/us/en/professionals/products-and-candidacy/nucleus/implant/electrodes/slim-modiolar).

4. **MED-EL SYNCHRONY 2 official technical data.** FLEX28 cross-sections, stimulation range, physical contact count, channel/current-source distinction, and receiver dimensions. [Manufacturer page](https://www.medel.com/hearing-solutions/cochlear-implants/synchrony2).

5. **MED-EL professional FLEX array description.** Published November 22, 2017; displayed update June 21, 2023. Straight/lateral-wall design, nominal array length, and single/paired topology. [Manufacturer professional article](https://blog.medel.pro/products-updates/flex-cochlear-implant-electrode-arrays/).

6. **AB Ultra 3D Surgeon Manual — 029-Q816-03 Rev A, December 15, 2021.** Output circuits, dimensions, and orientation; printed pages 6, 30, 36, 40, 48. [Official PDF](https://www.advancedbionics.com/content/dam/advancedbionics/documents/regional/en-us/professionals/HiRes-Ultra-3D-Surgeons-Manual-FDA.pdf). The research service retrieved indexed manual text, although direct PDF opening through that service returned an error. [Alternative official-hosted URL](https://www.advancedbionics.com/content/dam/advancedbionics/Documents/Regional/en-us/Professionals/HiRes-Ultra%203D-Surgeons-Manual-FDA.pdf).

7. **AB HiRes Ultra 3D technical specifications.** Contact count, minimum exposed area, pitches, approximate active lengths, and receiver dimensions. [Manufacturer URL retained for provenance](https://www.advancedbionics.com/content/dam/advancedbionics/Documents/Regional/en-gb/Professional/Ultra-3D-Tech-Specs-Brochure.pdf). The manufacturer search index supplied this record, but direct retrieval returned **404** during the 2026-10-25 audit. It is not presented as a currently accessible PDF; the companion surgeon manual [6] supplies technical specification tables and the dimensional corroboration described above.

8. **AB HiFocus Mid-Scala electrode design white paper.** Preformed spiral, construction, dimensions, and inactive radiopaque marker. [Manufacturer-hosted PDF](https://www.advancedbionics.com/content/dam/advancedbionics/documents/regional/es/seorl-2025/imlpante-coclear-hiresultra3d/HiFocus%20Mid-Scala%20Electrode%20White%20Paper.pdf.coredownload.pdf).

9. **AB HiFocus SlimJ electrode design white paper.** Slight curvature, wing/marker arrangement, and construction. Its proximal cross-section wording is distinguished from the surgeon manual above. [Manufacturer-hosted PDF](https://www.advancedbionics.com/content/dam/advancedbionics/documents/regional/es/seorl-2025/imlpante-coclear-hiresultra3d/HiFocus%20SlimJ%20Electrode%20White%20Paper.pdf.coredownload.pdf).

