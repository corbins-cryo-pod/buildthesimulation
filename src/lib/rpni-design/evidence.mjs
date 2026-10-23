/**
 * Primary evidence for the RPNI Design Laboratory.
 *
 * Literature findings are paraphrased and tied to their experimental context.
 * No study listed here calibrates or validates the complete browser model.
 * The model is an original reduced design experiment, not a patient forecast.
 */
export const EVIDENCE_REVIEWED_AT = '2026-10-23';

export const SOURCES = Object.freeze([
  {
    id: 'kung-2014', authors: 'Kung TA et al.', year: 2014,
    title: 'Regenerative peripheral nerve interface viability and signal transduction with an implanted electrode',
    url: 'https://pubmed.ncbi.nlm.nih.gov/24867721/',
    doi: '10.1097/PRS.0000000000000168',
    species: 'Rat; 16 free EDL muscle grafts',
    studyType: 'Primary animal experiment; seven-month electrode study',
    finding: 'Free grafts developed vascular supply, axonal ingrowth and neuromuscular connections. Both stainless steel and PEDOT-coated electrodes recorded evoked muscle responses; coating affected amplitude.',
    modelUse: 'Defines the nerve-to-muscle-to-electrode interface and separates biological regeneration from electrical recording.',
    limits: 'No universal human graft-survival rule, source-current calibration or electrode-service-life guarantee follows from this rat experiment.'
  },
  {
    id: 'hu-2021', authors: 'Hu Y et al.', year: 2021,
    title: 'Regenerative peripheral nerve interface free muscle graft mass and function',
    url: 'https://onlinelibrary.wiley.com/doi/abs/10.1002/mus.27138',
    doi: '10.1002/mus.27138',
    species: 'Rat; divided peroneal nerve and free muscle grafts',
    studyType: 'Primary animal experiment; four initial graft masses',
    finding: 'At three months, 150 and 300 mg grafts had greater CMAP and force measures than 600 and 1200 mg grafts; larger grafts contained central regions without regenerated muscle fibers.',
    modelUse: 'Motivates examining transport distance alongside electrical pickup when varying graft geometry.',
    limits: 'These rat mass groups do not establish a human thickness cutoff or a quantitative oxygen-to-survival relation.'
  },
  {
    id: 'sando-2016', authors: 'Sando IC et al.', year: 2016,
    title: 'Regenerative Peripheral Nerve Interface for Prostheses Control: Electrode Comparison',
    url: 'https://pubmed.ncbi.nlm.nih.gov/26502083/',
    doi: '10.1055/s-0035-1565248',
    species: 'Rat; native EDL muscles, patch n = 4 and hook n = 6',
    studyType: 'Primary chronic electrode comparison; four months',
    finding: 'Epimysial patches recorded larger target responses than intramuscular hooks, and bipolar recording reduced noise relative to monopolar recording in the tested preparation.',
    modelUse: 'Motivates contact geometry, positioning and differential recording as separate design variables.',
    limits: 'Despite the title, this comparison used native muscle implantation; its ranking is not a universal result for regenerated human grafts.'
  },
  {
    id: 'woo-2014', authors: 'Woo SL et al.', year: 2014,
    title: 'Quantification of muscle-derived signal interference during monopolar needle electromyography of a peripheral nerve interface in the rat hind limb',
    url: 'https://pubmed.ncbi.nlm.nih.gov/25570963/',
    doi: '10.1109/EMBC.2014.6944595',
    species: 'Rat; 18 preparations with preserved neurovascular supply',
    studyType: 'Primary conference study; adjacent-muscle removal experiment',
    finding: 'Removing adjacent anterior-compartment muscles reduced monopolar EDL CMAP amplitude by 32 ± 18% (mean ± SD), demonstrating substantial volume-conducted contamination in that configuration.',
    modelUse: 'Supports explicit source-by-source crosstalk measurements rather than equating recorded voltage with target activity.',
    limits: 'The preparation preserved innervation and perfusion. Its contamination fraction is not a benchmark for all regenerated grafts or bipolar electrodes.'
  },
  {
    id: 'ursu-2016', authors: 'Ursu DC et al.', year: 2016,
    title: 'In vivo characterization of regenerative peripheral nerve interface function',
    url: 'https://pubmed.ncbi.nlm.nih.gov/26859115/',
    doi: '10.1088/1741-2560/13/2/026012',
    species: 'Rat; two animals each in RPNI, intact-control and denervated groups',
    studyType: 'Primary treadmill EMG and kinematics experiment',
    finding: 'Four-month RPNIs produced gait-related signals around 1 mV peak-to-peak during walking and below 0.1 mV during standing; denervated preparations remained relatively quiet.',
    modelUse: 'Suggests active/rest and source-isolation experiments for later validation.',
    limits: 'Small animal groups and task-specific recordings; simulated signal magnitudes are not fitted to these observations.'
  },
  {
    id: 'ursu-2017', authors: 'Ursu D et al.', year: 2017,
    title: 'Adjacent regenerative peripheral nerve interfaces produce phase-antagonist signals during voluntary walking in rats',
    url: 'https://link.springer.com/article/10.1186/s12984-017-0243-0',
    doi: '10.1186/s12984-017-0243-0',
    species: 'Rat; two dual-RPNI animals and two controls',
    studyType: 'Primary adjacent-graft and gait experiment',
    finding: 'Adjacent grafts innervated by antagonist nerves showed different gait-phase activation patterns at four months. Bipolar patches were placed on opposite sides of the graft pair.',
    modelUse: 'Motivates independent graft inputs, electrode placement and off-target pickup comparisons.',
    limits: 'No universal minimum graft separation was established. Correlation can reflect neural coactivation as well as electrical crosstalk.'
  },
  {
    id: 'frost-2018', authors: 'Frost CM et al.', year: 2018,
    title: 'Regenerative peripheral nerve interfaces for real-time, proportional control of a Neuroprosthetic hand',
    url: 'https://link.springer.com/article/10.1186/s12984-018-0452-1',
    doi: '10.1186/s12984-018-0452-1',
    species: 'Rat; RPNI, intact and denervated groups',
    studyType: 'Primary EMG-to-prosthesis demonstration',
    finding: 'Integrated EMG supported graded hand actuation. Active/rest iEMG ratios were 3.81 ± 0.52 for RPNIs and 3.55 ± 0.38 for controls (mean ± SD).',
    modelUse: 'Shows why signal processing and task definitions belong beside a reported recording metric.',
    limits: 'The ratios used integrated EMG and a particular controller; they are neither decibels nor the laboratory model’s RMS/noise metric.'
  },
  {
    id: 'irwin-2016', authors: 'Irwin ZT et al.', year: 2016,
    title: 'Chronic recording of hand prosthesis control signals via a regenerative peripheral nerve interface in a rhesus macaque',
    url: 'https://pubmed.ncbi.nlm.nih.gov/27247270/',
    doi: '10.1088/1741-2560/13/4/046007',
    species: 'Rhesus macaque; nine RPNIs in two animals',
    studyType: 'Primary chronic recording and behavioral study',
    finding: 'RPNI EMG associated with cued finger movements was recorded for up to 20 months; reported SNR exceeded eight under the study’s recording conditions.',
    modelUse: 'Supports distinct motor-command inputs and the need to evaluate chronic signal stability.',
    limits: 'Two nonhuman primates do not supply human longevity distributions, electrode failure probabilities or a geometry-to-control function.'
  },
  {
    id: 'vu-2020', authors: 'Vu PP et al.', year: 2020,
    title: 'A regenerative peripheral nerve interface allows real-time control of an artificial hand in upper limb amputees',
    url: 'https://pmc.ncbi.nlm.nih.gov/articles/PMC8082695/',
    doi: '10.1126/scitranslmed.aay2857',
    species: 'Human; four reported participants, two prosthesis-control participants',
    studyType: 'Primary nonrandomized feasibility study',
    finding: 'The protocol harvested 30 × 15 × 5 mm muscle grafts. RPNIs showed voluntary contractions and motor-related EMG; two participants performed prosthetic control tasks.',
    modelUse: 'Provides a labeled human-scale starting geometry and motivates separate biological and recording endpoints.',
    limits: 'Harvest dimensions are not mature graft measurements or an optimized prescription. Electrode spacing, targeting and time after surgery varied.'
  },
  {
    id: 'vu-2023', authors: 'Vu PP et al.', year: 2023,
    title: 'Long-term upper-extremity prosthetic control using regenerative peripheral nerve interfaces and implanted EMG electrodes',
    url: 'https://pubmed.ncbi.nlm.nih.gov/37023743/',
    doi: '10.1088/1741-2552/accb0c',
    species: 'Human; two participants',
    studyType: 'Primary longitudinal recording and control study',
    finding: 'RPNI active/rest RMS ratios remained above 15 through observations up to 276 and 1054 days. Control experiments used RPNI and residual-muscle channels together.',
    modelUse: 'Motivates recording repeatability, explicit noise definitions and combined-channel evaluation.',
    limits: 'The ratio is not dB. A two-participant series cannot calibrate a survival probability, general decoder accuracy or the assumed source-current scale.'
  },
  {
    id: 'wallace-2026', authors: 'Wallace DM et al.', year: 2026,
    title: 'Regenerative peripheral nerve interfaces (RPNIs) and implanted electrodes improve online control of prostheses for hand and wrist',
    url: 'https://pmc.ncbi.nlm.nih.gov/articles/PMC12874230/',
    doi: '10.1088/1741-2552/ae36d2',
    species: 'Human; two transradial participants',
    studyType: 'Primary implanted-versus-surface control comparison',
    finding: 'A combined RPNI/residual-muscle implanted-electrode system supported more accurate hand-and-wrist control than the tested surface recordings, including during arm motion.',
    modelUse: 'Identifies channel independence, motion robustness and task-level validation as distinct future endpoints.',
    limits: 'One participant completed the functional coffee task. The study does not isolate RPNI geometry effects or establish population-wide comparative effectiveness.'
  },
  {
    id: 'gonzalez-2024', authors: 'Gonzalez MA et al.', year: 2024,
    title: 'Electrical Stimulation of Regenerative Peripheral Nerve Interfaces (RPNIs) Induces Referred Sensations in People With Upper Limb Loss',
    url: 'https://pubmed.ncbi.nlm.nih.gov/38145529/',
    doi: '10.1109/TNSRE.2023.3345164',
    species: 'Human; four participants',
    studyType: 'Primary longitudinal sensory-stimulation study',
    finding: 'Electrical stimulation elicited sensations referred to the missing limb. Perception, discomfort and discrimination were measured as distinct endpoints over observations extending to 54 months.',
    modelUse: 'Defines the evidence needed for a future sensory module; the present laboratory models recording only.',
    limits: 'Percept locations and thresholds depended on participant and interface. They cannot be inferred from recording amplitude or a passive field map.'
  },
  {
    id: 'farina-2001', authors: 'Farina D, Merletti R', year: 2001,
    title: 'A novel approach for precise simulation of the EMG signal detected by surface electrodes',
    url: 'https://pubmed.ncbi.nlm.nih.gov/11396594/',
    doi: '10.1109/10.923782',
    species: 'Computational; muscle-fiber source and volume-conductor model',
    studyType: 'Primary mathematical model',
    finding: 'Separates the traveling muscle source, layered anisotropic tissue and electrode spatial filtering, including source generation and extinction at fiber boundaries.',
    modelUse: 'Motivates explicit source, conductor and finite-contact components.',
    limits: 'This laboratory is a simpler original approximation. It does not reproduce the paper’s layered or capacitive conductor, detailed fiber currents or physiological end effects.'
  },
  {
    id: 'mesin-2006', authors: 'Mesin L, Farina D', year: 2006,
    title: 'An analytical model for surface EMG generation in volume conductors with smooth conductivity variations',
    url: 'https://pubmed.ncbi.nlm.nih.gov/16686399/',
    doi: '10.1109/TBME.2006.872825',
    species: 'Computational; anisotropic muscle and nonuniform subcutaneous layer',
    studyType: 'Primary analytical volume-conductor model',
    finding: 'Analyzes how spatial conductivity variation changes extracellular EMG using a layered conductor and perturbation method.',
    modelUse: 'Identifies tissue heterogeneity as a material limitation of a homogeneous anisotropic approximation.',
    limits: 'The current solver has one conductivity tensor throughout space; it does not reproduce tissue boundaries, scars, fat or skin layers.'
  },
  {
    id: 'urbanchek-2016', authors: 'Urbanchek MG et al.', year: 2016,
    title: 'Development of a Regenerative Peripheral Nerve Interface for Control of a Neuroprosthetic Limb',
    url: 'https://onlinelibrary.wiley.com/doi/full/10.1155/2016/5726730',
    doi: '10.1155/2016/5726730',
    species: 'Rat; 25 cultured-myoblast scaffold constructs',
    studyType: 'Primary developmental tissue-engineering experiment',
    finding: 'Cultured-myoblast constructs formed vascularized muscle, nerve connections and recordable evoked responses after implantation, with a mean evaluation time of 93 days.',
    modelUse: 'Historical evidence that regeneration and neuromuscular coupling are separate requirements for a biological interface.',
    limits: 'These were myoblast-populated scaffolds, not conventional autologous free muscle grafts; their dimensions and maturation cannot be transferred directly.'
  }
]);

export const EVIDENCE = SOURCES;

export const MODEL_SCOPE = Object.freeze({
  title: 'Exploratory muscle-graft RPNI design model',
  purpose: 'Compare geometry, electrode placement and assumed source activity under an explicit, reproducible electrical model.',
  construct: 'A terminal peripheral nerve or fascicle entering a free muscle graft, with muscle-derived electrical activity sampled by bipolar contacts.',
  represented: [
    'One to four idealized graft modules, independent synthetic motor-command inputs and source-by-source recording contributions.',
    'Assumed axon arrival and post-arrival source maturation; these prescribe electrical source availability.',
    'Bidirectional current-balanced traveling tripoles, a homogeneous anisotropic conductor and finite disk-contact averages.',
    'A separate steady one-dimensional diffusion/consumption slab diagnostic for oxygen relative to its prescribed boundary value.',
    'Conditional RMS amplitudes, signal/noise and source-separation measures, design sweeps and repeatable synthetic traces.'
  ],
  excluded: [
    'Graft survival probability, clinical efficacy, neuroma pain, prosthesis task accuracy or an optimized surgical prescription.',
    'Patient-specific anatomy, cell-resolved angiogenesis, free-graft myonecrosis and myogenesis, or measured motor-unit reconstruction.',
    'Nerve conduits, sieve electrodes, TEENI constructs, targeted muscle reinnervation and dermal or composite RPNIs as interchangeable configurations.',
    'Layered scar/skin/fat fields, full membrane electrophysiology, muscle force, electrode electrochemistry and mechanical failure.',
    'Stimulus recruitment, safe charge limits, sensory perception and stimulation discomfort thresholds.'
  ],
  interpretation: 'An engineering comparison conditional on chosen assumptions. A source citation supports a mechanism or study context; it does not validate the simulator’s outputs.'
});

export const PARAMETER_PROVENANCE = Object.freeze([
  {
    id: 'graft-geometry', label: 'Graft dimensions and module layout',
    keys: ['graftLengthMm', 'graftWidthMm', 'graftThicknessMm', 'moduleCount', 'moduleGapMm'],
    classification: 'Published size context plus exploratory geometry',
    evidence: 'The 30 × 15 × 5 mm starting dimensions describe the harvested graft in one human study.',
    implementation: 'The same dimensions define a simplified computational domain. Module count, separation and alternative sizes are design hypotheses; mature shape, folding, atrophy and perfusion are not inferred.',
    references: ['vu-2020', 'hu-2021', 'ursu-2017']
  },
  {
    id: 'nerve-and-routing', label: 'Nerve entry and motor-command routing',
    keys: ['nerveDiameterMm', 'insertionDepthMm', 'routingFidelity', 'targetModule'],
    classification: 'Exploratory geometry and functional-mapping assumptions',
    evidence: 'Different reinnervated grafts can convey distinct command-related activity, but fascicles are not guaranteed to represent one isolated action.',
    implementation: 'Nerve diameter is geometric context, not a calibrated motor-axon count. Routing fidelity specifies hypothetical source-to-command assignments; it is not an observed surgical success probability.',
    references: ['ursu-2017', 'vu-2020']
  },
  {
    id: 'equivalent-sources', label: 'Equivalent motor units and current source',
    keys: ['motorUnitsPerModule', 'territoryRadiusMm', 'sourceAmplitudeUa', 'sourceRadiusMm', 'poleSpacingMm', 'conductionVelocityMps'],
    classification: 'Synthetic source model; uncalibrated coefficients',
    evidence: 'EMG forward models separate excitable sources from tissue conduction and detector geometry.',
    implementation: 'Each modeled unit is an equivalent source, not a counted biological motor unit. Current, territory, propagation speed and source regularization are explicit assumptions; absolute microvolt outputs depend on them.',
    references: ['farina-2001']
  },
  {
    id: 'maturation-clock', label: 'Assumed arrival and source maturation',
    keys: ['regenerationLagDays', 'axonSpeedMmDay', 'nmjMaturationDays', 'sourceAvailability', 'observationDay', 'durationDays'],
    classification: 'Prescribed temporal surrogate; not a calibrated regeneration model',
    evidence: 'Experiments evaluate structural reinnervation and electrical function on different timescales.',
    implementation: 'A distance/speed arrival time followed by exponential source gain controls the synthetic signal. The gain is not NMJ occupancy, surviving fiber fraction or measured regeneration probability.',
    references: ['kung-2014', 'hu-2021', 'ursu-2016']
  },
  {
    id: 'electrode-geometry', label: 'Bipolar contact geometry and position',
    keys: ['electrodeSpacingMm', 'electrodeOffsetMm', 'electrodeLateralMm', 'electrodeDepthMm', 'contactRadiusMm', 'contactOrder'],
    classification: 'Exploratory geometry with numerical contact integration',
    evidence: 'Placement, electrode form and differential recording affect target signal and contamination.',
    implementation: 'Ideal disk contacts average extracellular potential; bipolar voltage is their difference. No contact impedance, coating, interface capacitance, lead failure or surgical placement error is calculated.',
    references: ['sando-2016', 'woo-2014', 'ursu-2017']
  },
  {
    id: 'conductor', label: 'Tissue conductivities',
    keys: ['sigmaLongitudinalSm', 'sigmaTransverseSm'],
    classification: 'Homogeneous anisotropic conductor assumption',
    evidence: 'Published EMG models show that anisotropy, tissue layers and conductivity variations affect recorded fields.',
    implementation: 'Conductivities in S/m apply throughout space. The displayed graft outline is a source-domain boundary, not an electrical material boundary. Defaults are not measured RPNI conductivity values.',
    references: ['farina-2001', 'mesin-2006']
  },
  {
    id: 'drive-and-noise', label: 'Recruitment, firing and recording noise',
    keys: ['targetDrive', 'otherDrive', 'minFiringHz', 'maxFiringHz', 'noiseRmsUv', 'sampleRateHz', 'traceDurationMs'],
    classification: 'Synthetic activity and acquisition assumptions',
    evidence: 'Published amplitude and SNR values depend on task, electrode and processing definitions.',
    implementation: 'Seeded spike trains and additive noise create test signals. Noise, firing rates and input independence are prescribed. A simulated RMS ratio or dB conversion is not a clinical study’s controller performance.',
    references: ['frost-2018', 'vu-2023', 'wallace-2026']
  },
  {
    id: 'oxygen-diagnostic', label: 'Oxygen transport diagnostic',
    keys: ['oxygenDiffusivityMm2S', 'oxygenConsumptionPerS', 'graftThicknessMm'],
    classification: 'Exact solution of an assumed steady slab equation',
    evidence: 'Graft size can affect regenerated tissue and function; this does not identify oxygen coefficients or a viability threshold.',
    implementation: 'D in mm²/s and first-order consumption k in 1/s are hypotheses. The dimensionless concentration ratio assumes equal fixed oxygen at two slab faces. It does not drive source availability or predict survival.',
    references: ['hu-2021']
  },
  {
    id: 'replicates', label: 'Numerical resolution, seeds and robustness',
    keys: ['seed', 'kernelOversampling'],
    classification: 'Numerical resolution and computational experiment design',
    evidence: 'Refining the source time grid tests numerical resolution. Repeating the model with different synthetic populations probes conditional model variability.',
    implementation: 'Kernels use kernelOversampling steps per recording sample; expected variance and covariance integrate their piecewise-linear interpolants exactly. This does not provide an antialias filter for the recording grid. Use matched seeds for design comparisons, then vary seeds and assumptions. Seed intervals are not patient confidence intervals, and numerical agreement is not biological validation.',
    references: []
  }
]);

export const BENCHMARK_TARGETS = Object.freeze([
  {
    id: 'graft-mass', label: 'Graft geometry and tissue outcome', sourceIds: ['hu-2021'],
    observed: 'Rat graft-mass groups differed in tissue regeneration, CMAP and force.',
    comparison: 'A later coupled biological model should predict independently measured histology and electrophysiology across held-out geometries.',
    missingData: 'Individual geometry, vascular measurements, fiber counts, electrode positions and subject-level outcome data.',
    status: 'Candidate validation study; no fit performed. The current oxygen slab cannot reproduce survival or force.'
  },
  {
    id: 'source-isolation', label: 'Target signal versus crosstalk', sourceIds: ['woo-2014', 'sando-2016', 'ursu-2017'],
    observed: 'Recordings change when neighboring sources or recording configurations change.',
    comparison: 'Measure one graft at a time, preserving contact geometry, and compare off-target/target RMS transfer ratios with simulation.',
    missingData: 'Three-dimensional electrode and source locations, conductivity estimates, raw traces and matched activation levels.',
    status: 'Mechanism-informed comparison only; no percentage imported as a universal crosstalk target.'
  },
  {
    id: 'human-recording', label: 'Human channel amplitudes and stability', sourceIds: ['vu-2020', 'vu-2023'],
    observed: 'Human studies demonstrate voluntary RPNI signals and repeated recordings.',
    comparison: 'Fit source scale and acquisition noise on a training session, then evaluate waveform and amplitude predictions on separate sessions.',
    missingData: 'Matched graft geometry, acquisition filters, source recruitment, electrode position and independently measured noise.',
    status: 'No human calibration. Matching an amplitude by adjusting source current would not validate the mechanism.'
  },
  {
    id: 'control-endpoint', label: 'Functional hand and wrist control', sourceIds: ['irwin-2016', 'frost-2018', 'wallace-2026'],
    observed: 'Published systems evaluate behavior, control errors and task completion in addition to electrical signal quality.',
    comparison: 'A future decoder module needs defined training/test splits and prospective closed-loop task validation.',
    missingData: 'Labeled motor commands, multi-channel recordings, controller implementation and task-level outcomes.',
    status: 'Outside this forward model. No simulated SNR-to-task-accuracy conversion is supplied.'
  },
  {
    id: 'sensory-endpoint', label: 'Sensory stimulation', sourceIds: ['gonzalez-2024'],
    observed: 'Perception, discomfort, localization and discrimination are experimentally distinct outcomes.',
    comparison: 'A future stimulation model would require electrode electrochemistry, axon activation and participant-specific psychophysics.',
    missingData: 'Validated recruitment models, electrode polarization, actual nerve trajectories and prospective percept measurements.',
    status: 'Outside this recording model. Passive field strength does not establish percept quality or safe stimulation.'
  }
]);

export function sourceById(id) {
  return SOURCES.find((source) => source.id === id);
}
