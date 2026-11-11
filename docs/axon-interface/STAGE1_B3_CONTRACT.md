# Fixed-topology Stage 1 B3 contract

This new experiment is separate from the recovered straight-cable checkpoint. It models an explicitly assumed, pre-grown bipolar engineered-cell topology at an electrical instant. It does not calculate growth, target reinnervation, fabrication or survival.

## Identity ledger and denominators

Create an immutable declared original census H0001…HNNNN from the named anatomy seed. It is a synthetic preoperative census for this one-fascicle experiment, not an estimated complete human cochlear nerve. For complete resection, every original neuron loses the connection across the removed ganglion region. Preserve its identity in the ledger; do not relabel new engineered cells as those originals. The matched B3 and no-device states BOTH explicitly assume original remnant processes absent from the modeled domain. This is a fixed anatomical input, not a simulated degeneration history.

Create distinct E0001…ENNNN engineered identities and an explicit correspondence to anatomical output slots, not to inherited biological identity. Each E owns its soma and both modeled projections. Their fixed continuity to electrical observation planes is a hypothetical input condition. It is not demonstrated correct biological target innervation. The original-host numerator is zero by the declared complete-resection topology. Its denominator remains N in both B3 and matched postoperative no-device conditions. A separate engineered electrical fraction may divide unique qualifying E outputs by that retained N, always labelled conditional on the assumed topology.

An intact-native context can state N continuous originals under a separate assumed intact anatomy. It must never be called the matched postoperative no-device comparator: it uses a different surgical condition.

## Explicit morphology

Use an explicit soma, asymmetric peripheral and central stems, and two myelinated arms at 37 °C. True myelinated nodes are distinct from soma/stem active sites. Expose initiation-region indices, outward-ordered arm node arrays and three distal monitor nodes on each arm. Whole-cell silencing affects every active site; regional silencing affects the soma/stems/proximal initiation region while distal axonal excitability remains unchanged. A stable hypothetical membrane prescription and independent numerical agreement do not imply a fitted human SGN.

A separate viable-stump diagnostic comprises two sealed native-stump morphologies after removing the soma/stems. It is not the matched no-device condition. No axial edge crosses the gap, and its assumed viability does not predict survival. In the true matched no-device condition there are no original remnants, no implanted E cells and therefore no excitable population.

## Matched conditions

| Condition | Cells and topology | Field and drive | Interpretation |
| --- | --- | --- | --- |
| Assigned | Fixed engineered bipolar cells; all isolated-channel trials | Explicit insulating-well/aperture field and declared biphasic drive | Electrical recruitment of assumed E projections |
| Zero stimulus | Identical engineered topology and initial state | Same conductor, zero drive | Baseline stability |
| Channel isolation | Identical engineered cohort | One named pair active; all others inactive | Defines each matrix row |
| Local initiation-region silencing | Soma/stem/proximal active conductances removed; distal active membrane unchanged | Exact same transfer and waveform | Regional conductance dependence plus separately checked initiation location |
| Whole engineered-cell silencing | All engineered active conductances removed; passive membranes retained | Exact same transfer and waveform | Active-source removal, not proof of soma mediation by itself |
| Junction block | No engineered–host junction exists | No numerical perturbation invented | Not applicable, never passed |
| Matched true no-device | Original remnants absent as in B3; E cells, walls and contacts removed | No drive, no excitable population; exact analytical zero | No membrane trajectory is invented; original continuity remains structurally zero |
| Separate viable-stump diagnostic | Explicit alternative population of viable disconnected H stumps | Two actual zero-drive cable simulations | Additional electrical diagnostic, never the matched no-device condition |
| Soma-only active block | Only active conductances in every soma band removed | Same E field, drive and initial state | Conditional conductance necessity, not proof of initiation |
| Optional electrode-only counterfactual (not implemented) | Would use a separately declared viable-stump population | Requires an additional external test-contact fixture and recomputed conductor; requesting it currently raises an explicit error | Never substituted for true no-device or counted as a completed control |

The matched no-device condition holds the original-remnant state fixed and removes only the implanted cells, well structure, contacts and their drive. Its zero is analytical: no excitable compartments, no current sources, and homogeneous grounded boundaries. The separate viable-stump diagnostic has an explicitly different population and cannot estimate implant benefit. Its two zero-field trajectories may be reused across positions only because the declared morphology and zero-field dynamics are identical. Every driven-cell control uses the same initial state, field, waveform, temperature, time step and observation window except for the named active-conductance removal.

## Counts and eligibility

All raw matrices and traces remain available after audit failure, but derived electrical selectivity is withheld. An engineered exclusive output requires a row containing only that recruited E identity. Conditional local-initiation eligibility additionally requires post-stimulus earliest observed threshold crossings in the initiation region, loss of distal propagation under local silencing, and valid zero-input/whole-silencing controls. Ordered crossings remain a diagnostic, not proof of the source of depolarization, somatic initiation, biological continuity or a unique event identity.

Original-host Y equals zero from complete-resection identity bookkeeping, independently of a successful numerical stimulus solve; describe its basis as topology, not a numerical selectivity result. Engineered conditioned Y is null if its electrical audit fails. Biological target innervation and survival yields remain null in every condition.

## Implementation and fresh gates

The implemented modules are stage1-settings.mjs, identities.mjs and stage1-protocol.mjs with separate tests. They do not change legacy core defaults or protocol. Settings explicitly identify the mode and topology assumptions, include new soma/stem/arm parameters and declare whether the optional electrode-only comparison is requested. Never silently omit that comparison to fit a budget.

Use independent membrane and field APIs provided by their owners. Required fresh gates include baseline stability; real two-arm propagation; local and whole-cell interventions; disconnected stump topology; exact seed and identity matching; explicit source/wall removal; current conservation; temporal and spatial refinement; native-NEURON and independent field comparisons; finite exports; complete work budgets; cancellation and replay. Fixed topology is an input assumption, not a numerical validation target or an experimental biological achievement.

## Declared numerical configuration

The numerical default verified by the reported fixtures uses five soma bands, three segments per stem and passive myelinated section, a 0.000625 ms step and 50 ms preparation. The earlier 1.25 µs temporal test and 1→3 / 3→5 soma comparisons failed and are retained by the membrane owner. Every declared cell has one physical insulating well; only the named channel pairs are driven. The independent Stage 1 membrane budget is 2.4 billion compartment steps and five million retained/temporary values. Field mesh and memory caps are exported separately. The requested full-population evidence fixture is 256 cells and wells, one active channel, 350 µm fascicle radius and 0.5 µA. It was executed without downsampling after numerical sources froze; results and scope follow below.


## Electrical coupling boundary

The imposed finite-contact stimulus field drives each cable independently. Computed outer membrane currents are projected through the same reciprocal surface-transfer weights to calculate a known-source recording. Their generated fields are not fed back into other cables: there is no self-consistent ephaptic interaction between cells. The soma resolves axial spherical bands with surface-averaged extracellular drive, not circumferential nonlinear membrane patches. These are explicit modeling assumptions, particularly relevant in a confined well. Numerical convergence inside the assumed model does not validate either omission biologically.

The membrane source partition is known by construction. Host current is exactly zero because the matched fixed anatomies exclude original processes, not because a stimulated host population was measured to remain quiet. The no-device condition has no electrodes and therefore no electrode recording object.

## Protocol report and retained failures

The standalone command `node scripts/axon-interface/stage1-protocol-validate.mjs` runs the contracts and complete four-cell and 256-cell protocols in separate processes. It writes `docs/axon-interface/stage1-protocol-validation.json`, including the exact settings, all matrix columns, original and introduced identity sets, every channel/cell control summary, current field and membrane versions, before/after source hashes, actual runtime, and isolated-process peak resident memory. Raw traces and full JSON/CSV exports are regenerable artifacts outside the repository; their hashes and locations are retained in the report. A small-only invocation cannot produce a passing full Stage 1 report.

`docs/axon-interface/stage1-amplitude-probe.json` retains a historical one-band probe, including the 2 µA model-domain rejection without clipping. It is separate from final five-band acceptance. Runtime failures in user-requested parameter studies remain on the exact predeclared grid with an error and null electrical metrics; threshold brackets are withheld if any execution or matched audit fails. Invalid settings, geometry and total budgets reject the whole study at preflight. No point is filtered or replaced by a smaller, easier run.


## Executed final population fixture

The source-frozen protocol completed with **28/28 report checks passing**, including its nine contract cases, the four-cell fixture, the complete 256-cell fixture and source-stability checks. Every one of 256 physical wells and introduced cells remained in the field and membrane calculations. One isolated channel was tested at 0.5 µA: assigned recruitment included E0001 alone; regional and whole-cell conductance removal eliminated qualifying output; soma-only removal retained it. Thus this fixture supports conditional local-region dependence, **not a requirement for active somatic conductances or proof of somatic initiation**. The earliest observed crossing was in the peripheral stem. Both arms met the declared three-distal-node diagnostic.

Original-host Y is 0/256 from the assumed complete-resection identity topology. The separate unique engineered electrical fraction is 1/256 = 0.00390625 for this one tested input. One input does not demonstrate 256 independent channels. Growth, target reinnervation and survival remain uncomputed; the matched no-device comparator remains an exact empty-population zero under the same absent-original-remnant state.

The actual field contained 1,409,165 vertices and 6,778,368 conducting tetrahedra. Its 2,610 iterations reached a relative residual of 1.99806e-12; global current closure was -5.82125e-13 µA for the normalized source pair. Every introduced cell used 323 compartments and 23 active sites, a 0.000625 ms step, 50 ms preparation and a 4 ms observation window. The plan totaled 2,177,878,400 compartment steps, and the final result retained 2,153,032 numerical/boolean values.

The isolated full-fixture process took 663.709 seconds (11.06 minutes) and peaked at 1,817,440 KiB (1.733 GiB) resident memory, including full-result export. These are measured Node-executor costs, not a browser speed guarantee. The 16 numerical/source files remained unchanged throughout both protocol fixtures. The field matrix’s internal estimated storage (955,026,068 bytes) is distinct from measured process RSS, which also includes sampling, membrane work, metadata and export.

The forward recording’s artifact, engineered membrane contribution and total peak-to-peak values were approximately 566,515.136, 4,864.604 and 567,192.104 µV respectively. Host contribution was zero because original processes are absent by assumption. Instantaneous components sum; their separate extrema do not. This known-source partition is not blind artifact rejection or spike sorting. See [stage1-protocol-summary.json](stage1-protocol-summary.json) for the compact derived values and full report/raw-export hashes.
