# Studio 2.1 — Designer-to-cleanroom handoff

Base repository commit: `b59adb6fe3f2c9f3d646528a3c9a5712eb6ef74a`.
Model: `neural-interface-studio/2.1.0`.
Project export schema version: 3; versions 1 and 2 remain readable.

## Delivered scope

The standalone Studio now imports the existing Designer's version-1 JSON output.
Saved paths are used directly: the adapter never reroutes, rescales, collapses
metal planes or substitutes the original four-channel layout. It preserves
negative coordinates, terminal/channel mappings, shapes, conductor widths and
the Designer's rounded envelope. The original Designer and Microfabrication
Laboratory files are unchanged.

The transfer preview explicitly separates supplied geometry from added process
assumptions. Users choose opening axis inset, film thickness and grid, then
accept the candidate. Recorded runs survive a new Designer draft. Unrouted or
conflicting paths, unsupported layers, unsuitable aperture insets, inconsistent
terminal mapping, unsupported dielectric/substrate types and oversized grids
are rejected without changing the active project.

Three examples exercise the actual adapter: split-bank planar array, side-entry
annular contacts and orthogonal routed coupon. The original nine examples remain.
A real Cancel calculation action terminates the computation worker. Changing an
input cancels obsolete work; late results cannot replace the current specimen.
SVG exports now include physical millimetre width/height and the micrometre origin.
Oversized notebooks are rejected on export; Export draft only retains a portable
backup when the full notebook exceeds the 2 MB limit.

## Physical assumptions and support boundaries

- One occupied metal plane (plane 1), Polyimide, rounded envelope substrate.
- 1–16 nets; 256 points per trace; 1,024 route points in total.
- Explicit 1, 2 or 4 µm grids; at most 640,000 cells and 20,000 µm per window side.
- Source contact/pad/channel IDs are retained in the provenance mapping. Studio
  uses its own unique feature/net IDs. Declared routing success does not override
  material-based continuity testing.
- Circles, squares, rectangles, rotated ellipses and annuli are supported.
- Round joins and miter joins (SVG miter limit 4, bevel beyond the limit) are
  represented. Saved sampled centerlines are not replaced with new curves.
- Designer substrate envelope bounds/radius are retained analytically. A trace
  outside that envelope is clipped at the outline stage, not silently enclosed.
- Contact and pad openings are NEW masks using a user-selected axis inset.
  For rings, the outer dimensions shrink and the inner opening grows.
  For ellipses, axis inset is not constant-distance morphological erosion.
- Effective resistivity is `sourceSheetResistance * chosenMetalThicknessMetres`.
  This reconciles the two tools' assumptions, not their experimental calibration.
  Changing film thickness later in Studio holds effective resistivity fixed.
- Remaining recipe parameters are inherited Studio teaching assumptions; metal
  labels do not introduce material-specific plasma chemistry or electrochemistry.
- Passing the importer is not a full fabrication DRC pass. In particular, no
  process-qualified spacing, overlay, adhesion, mechanical or lifetime claim is made.
- Version 3 reports preserve their physical window and original import assumptions.
  Those assumptions describe the transfer, not a claim that later edits match the
  source. Historical notebook reports are not relabeled as new model results.

## Executed verification — 25 October 2026

1. **44 new Node subtests passed**, zero failures, skips or cancellations.
   Command: `node --test tests/neural-interface-studio-transfer.mjs`.
2. **90 legacy process frames matched the baseline exactly** for all five material
   masks and channel/process/measurement results with resistance disabled:
   nine existing examples, ten stages each. The baseline source was restored
   byte-for-byte and checked against Git blob
   `b896fcf528749e59947510a7771e094cdd74f9f9` before comparison.
   The existing reference still returns **13.664 Ω** for each channel.
3. **Independent Shapely geometry audit** of all three new demos: **323,040 cells**,
   zero metal-mask differences and zero substrate-mask differences. The audit
   independently constructed buffered paths, rotated terminal shapes and rounded
   envelopes. Circular buffers used 256 segments per quadrant. This verifies
   these discretized cases, not arbitrary shape/process accuracy.
4. **Refinement runs at 4, 2 and 1 µm** completed for all three demos. The first
   channel's results are below. Every reported solver converged.
5. **Seven Chromium 144.0.7559.96 numerical-engine/worker harness checks passed**:
   all three demos, a physically sized SVG download, v3 file-picker import and
   recomputation, worker cancellation, and restart. No uncaught JavaScript errors.
   This harness bundles the actual numerical functions in an owned about:blank
   page. It is NOT a production Preact interface or module-loading test.
6. TypeScript's JSX transpiler reported zero syntax diagnostics for the updated
   component. Full Astro integration and repository-wide tests are separate CI
   evidence; do not infer them from the local tests above.

| Demo, net N01 | 4 µm grid / Ω | 2 µm grid / Ω | 1 µm grid / Ω | 1 vs 2 µm |
| --- | ---: | ---: | ---: | ---: |
| Split-bank | 4.600000 | 6.100000 | 6.084451 | -0.255% |
| Annular | 6.800000 | 9.000000 | 8.984451 | -0.173% |
| Orthogonal coupon | 8.026622 | 10.721895 | 10.682904 | -0.364% |

The coarse-grid results differ by approximately 25% in these examples because
of rasterized widths. Refinement agreement on the three examples does not imply
full convergence on every imported design. The four-cells-per-trace warning is
a heuristic; it is not an acceptance tolerance or accuracy certificate.

### Local environment limitations

Direct repository cloning and package-registry access were unavailable in the
execution container. Focused local tests used the byte-verified Studio model and
unchanged dependency exports (`STAGES` and `labelConnectedComponents`) extracted
from the original Microfabrication model. No replacement dependency file is part
of the patch. Complete integration must be assessed by the GitHub workflows.

The browser blocked local HTTP navigation with `ERR_BLOCKED_BY_ADMINISTRATOR`.
No browser policy was disabled or changed. Production Preact interaction,
responsive phone/tablet rendering, Safari and physical-device testing remain
unverified. The owned in-memory harness is reported separately above.

## Next milestones

1. Frozen baseline comparisons and parameter sweeps with replayable reports.
2. Per-design grid-refinement reports and stronger geometry-level rule checks.
3. Conformal ribbon footprints and richer mask editing.
4. Explicit multilayer dielectric stacks and vias before multilayer fabrication.
5. Separate measured/calibrated electrochemical and mechanical models.

## Engineering references

- Existing Designer serialization: `src/lib/designer/export.js` and routing model.
- Existing Studio 2.0 process and sheet-conduction methods remain applicable.
- KLayout DRC basics: https://www.klayout.de/doc/manual/drc_basic.html — distinction
  between width, spacing, overlap and enclosure checks. KLayout is not executed.
- Worker termination semantics: https://developer.mozilla.org/en-US/docs/Web/API/Worker/terminate
