# Electrical-core integration review

## Scope and recovery identity

This first section records the recovery-checkpoint review of `axon-interface-0.1.0-recovery.1`, the recovered electrical core. That checkpoint does not certify a ganglion-replacement architecture. The later fixed-topology B3 review appears separately below. The source recovery is recorded in [RECOVERED_AUDIT.md](RECOVERED_AUDIT.md). The original final settings SHA-256 was `2536274c719f3f6a772533338636fe73acbf7fa7137b2a36ddb92d3d61806e5b`; the current recovered settings have a different hash and release identity.

The frozen recovered core completed the fresh five-stage [recovered-core reproduction run](development/recovered-core-reproduction-report.json), including field, membrane, coupled-field/native-NEURON comparison and 15 integration checks. This fresh result is separate from the pre-reset reports. It verifies only its declared fixtures and source hashes. Later Stage 1 extensions require independent acceptance and reproduction records.

## Count and causal semantics

The cable-only core contains no original preoperative census or replacement operation. `originalHostCensus`, `originalHostPreservedCount`, `originalHostUniqueCount` and `originalHostY` therefore remain null. A separate `hypotheticalCompleteB3` annotation says that complete replacement would preserve no original neuronal identities by definition; this is not a result of the cable run.

Exclusive recruitment is counted over unique output identities, not successful channel rows. Duplicate channels cannot inflate the unique count. Co-recruited outputs remain in a shared tier unless some other isolated row recruits them exclusively. Each local-silencing result retains its actual recruitment value. Loss under local silencing is recorded separately from conditional initiation evidence: a conduction block can suppress a spike initiated elsewhere. Conditional evidence additionally requires the earliest observed events to occur in the designated local region. If initiation evidence is absent, the corresponding count is null.

Failed matched audits withhold every derived yield, rank and information headline. Raw matrices and pair traces remain diagnostic evidence. Threshold studies reject missing or failed observations instead of treating them as non-recruitment; finite ordered samples retain every observed onset and descending transition without interpolation or a monotonicity assumption.

Three ordered distal crossings are a diagnostic, not proof of the identity of one traveling event or of biological target continuity. The node choices lie beyond the locally silenced region. The event-ordinal, velocity and timing rules are explicit in the exported numerical contract. Individual local crossings are not labelled as propagating or assigned a direction.

## Geometry and controls

Input normalization accepts only own known keys, finite values and supported discrete diameters/resolutions. Unsupported geometry, source overlap and cell-envelope collisions are errors; the code never silently moves cells, enlarges sources or reduces census/resolution. Anatomy has an independent seeded stream and does not change when stimulation, conductivity or Poisson-loading diagnostic settings change.

Junction block is not applicable because the core has no junction. A no-drive intact cable is not presented as a postoperative no-construct experiment. Local conductance removal and whole-cell removal are different interventions; the whole-cell test alone cannot establish soma mediation. Matched control runs use the same equilibrated initial state. Missing current-residual values are accepted only when membrane currents were deliberately not saved, not for assigned runs that require current conservation.

The finite source radius is 75 µm, angular field resolution 32, and the default endoneurial transverse/longitudinal and epineurial conductivities are exactly 0.083/0.571/0.083 S/m, matching the recovered field fixture. They remain estimated effective parameters. A Gaussian source support is distinct from metal contact area. Geometric wells do not contribute electrical insulation or aperture resistance.

## Storage, timing and exports

The default 128-cell, two-channel, three-passive-segment, 4 ms / 0.00125 ms plan reserves 771 cable solves, 772,275,200 compartment steps and 1,743,988 saved/temporary numerical values. The declared caps are 4096 solves, 1.2 billion compartment steps, 5 million values and eight upward events per site per solve as enforced by the relevant solver. The planning budget includes shared baseline preparation, retained pair traces, transfer matrices, event records and peak transient membrane-current storage. A final traversal records actual retained numerical/boolean values. This is a scalar count, not a byte or heap estimate.

Saved state time and drive interval remain separate. The saved stimulus and artifact use the canonical preceding solver-step index, not a rounded display timestamp or a recomputed time shift. An integration-test expectation that used subtraction instead of the canonical index grid was corrected; exact equality was retained, and numerical acceptance thresholds were not relaxed.

JSON retains the run's original normalized settings, shared initial state, morphology, controls, limits, field transfers, source partition, events and limitations. CSV includes model version, audit status, units, fixed observation-window metadata and complete run metadata. Failed-audit matrices are labelled diagnostic. Nonfinite data, including typed arrays, are rejected instead of becoming JSON null. Imports require the exact schema and model version and every normalized field, reject unknown keys and malformed values, and restore parameters only. They do not adopt imported predictions as verified results.

## Remaining biological and architectural work

The recovered core does not instantiate a bipolar SGN, individual insulating electrode wells, an original-host identity ledger, a surgical resection or disconnected-native-stump comparator. The subsequent separate Stage 1 extension, reviewed below, introduces a fixed, explicitly hypothetical pre-grown topology without asserting that growth, target innervation, survival or fabrication have been solved. A complete B3 replacement has zero original-host continuity by its declared topology; the engineered electrical fraction requires its own identity set and retained original-census denominator.

Numerical verification must be repeated for any new morphology, intervention, field geometry or source boundary. The original active-soma and coarse-resolution failures remain failures. A new stable parameterization is a different hypothesis, not retroactive validation. Primary biological and model boundaries are documented in [SCIENCE.md](SCIENCE.md).


# Fixed-topology B3 extension review

The new B3 experiment is a separate, explicit architecture. Its source contract is [STAGE1_B3_CONTRACT.md](STAGE1_B3_CONTRACT.md). It retains the original H census, introduces separate E identities with their own soma and two processes, and reports strict original-host structural Y=0 under complete resection. Engineered electrical metrics remain conditional on assumed pre-grown continuity to observation planes. Biological target reinnervation and survival fields remain null. The straight-cable experiment above retains its null original-host endpoint; a model-mode switch does not retroactively assign it a resection operation.

The matched no-device control preserves the same assumed absence of original remnants in the modeled domain. Removing E cells, wells, contacts and implant drive leaves an empty excitable population and a source-free conductor with homogeneous grounded boundaries. Its exact zero is an analytical consequence of the stated inputs. It has no invented membrane trace or recording contact. Actual simulations of viable disconnected native stumps are explicitly separate and cannot estimate implant benefit. An intact original population is another distinct context.

Every declared E cell has a physical meshed insulating well, whether its contact pair is addressed or inactive. All cells are resolved under each tested isolated pair. Assigned, local-region, whole-cell and soma-only active-conductance interventions share the exact equilibrated state and imposed field. Soma-only intervention covers all five default somatic bands. Earliest observed threshold crossings are not relabeled as the source of depolarization. Regional dependence and active-somatic-conductance necessity remain separate endpoints; junction block remains not applicable.

The explicit B3 default uses a 0.000625 ms step after the retained 1.25 µs failure, five soma bands after retained 1→3 and 3→5 failures, and three subdivisions in passive sections and stems. The full-population fixture uses 256 cells and physical wells, one addressed pair, 350 µm fascicle radius and a declared 0.5 µA operating point. The separate Stage 1 budget allows 2.4 billion compartment steps; its actual plan is 2,177,878,400. It does not change the retained motor-core caps. Field mesh and memory limits are separately exposed.

The current acceptance record is [stage1-protocol-validation.json](stage1-protocol-validation.json), generated by a standalone script that checks complete population coverage, all control matrices, immutable identities, exact observation windows, source partition, exports and before/after source hashes. Each fixture executes in a separate process to measure its own peak resident memory. Runtime execution failures in user studies remain as failed points at their declared values, with null electrical metrics and withheld threshold brackets. Invalid settings, geometry or aggregate work budgets reject the requested study before execution.

The imposed-field cable calculation does not feed generated membrane fields back onto neighboring cells. Those currents enter only the reciprocal recording calculation. Surface-averaged axial soma bands also do not resolve circumferential nonlinear polarization. These model assumptions, the material estimates and the absence of human SGN calibration remain explicit even if every numerical gate passes.


## Final executed protocol status

The frozen four-cell and full 256-cell protocol runs passed all 28 report checks with no skipped conditions or changed source hashes. The full fixture resolved all 256 wells, 256 cell/channel pairs and 1,024 driven intervention solves. Its single tested contact pair recruited only E0001; local and whole-cell interventions eliminated propagation, while soma-only intervention preserved it. The result therefore does not establish active-soma necessity. The complete matrices, original/engineered identity arrays, control summaries, resource measurements and source hashes are retained in the protocol report. The [derived summary](stage1-protocol-summary.json) gives measured mesh counts, step counts, source-recording components and artifact hashes without introducing another simulation.
