/**
 * Primary-source evidence map for the Peripheral Nerve Regeneration Laboratory.
 *
 * These sources ground the represented mechanisms. They do not calibrate the
 * whole simulator or validate its output as a forecast for a patient, animal,
 * surgical technique, or commercial product. Findings are paraphrases.
 */
export const REFERENCES = Object.freeze([
  {
    id: 'chaudhry-1992', authors: 'Chaudhry V, Cornblath DR', year: 1992,
    title: 'Wallerian degeneration in human nerves: serial electrophysiological studies',
    journal: 'Muscle & Nerve 15:687–693', doi: '10.1002/mus.880150610',
    url: 'https://pubmed.ncbi.nlm.nih.gov/1324426/', species: 'Human; five patients',
    finding: 'Distal motor responses fell by half at 3–5 days and disappeared by day 9; sensory responses fell by half around day 7 and disappeared by day 11. Distal stump length affected timing.',
    modelUse: 'Separates injury from the subsequent loss of distal axon integrity and illustrates why degeneration has a finite time course.',
    limits: 'A small electrophysiological series, not a direct measurement of myelin-debris clearance or a universal degeneration clock.'
  },
  {
    id: 'arthur-farraj-2012', authors: 'Arthur-Farraj PJ et al.', year: 2012,
    title: 'c-Jun reprograms Schwann cells of injured nerves to generate a repair cell essential for regeneration',
    journal: 'Neuron 75:633–647', doi: '10.1016/j.neuron.2012.06.021',
    url: 'https://pmc.ncbi.nlm.nih.gov/articles/PMC3657176/', species: 'Mouse; conditional genetics and cell studies',
    finding: 'Schwann-cell c-Jun controls an injury-induced repair program; removing it disrupts trophic support, regeneration tracks, and successful nerve repair.',
    modelUse: 'Motivates a repair-support state distinct from mature myelination and a dependence of growth on the local Schwann environment.',
    limits: 'The simulated support index is not a c-Jun concentration, gene-expression measurement, or gene-regulatory model.'
  },
  {
    id: 'gomez-sanchez-2015', authors: 'Gomez-Sanchez JA et al.', year: 2015,
    title: 'Schwann cell autophagy, myelinophagy, initiates myelin clearance from injured nerves',
    journal: 'Journal of Cell Biology 210:153–168', doi: '10.1083/jcb.201503019',
    url: 'https://rupress.org/jcb/article/210/1/153/38076/Schwann-cell-autophagy-myelinophagy-initiates', species: 'Mouse and Schwann-cell / nerve cultures',
    finding: 'Injury activates Schwann-cell autophagy of myelin, regulated in part by JNK/c-Jun; disrupting autophagy delays myelin breakdown.',
    modelUse: 'Supports gradual debris clearance and the role of repair Schwann cells in preparing the distal pathway.',
    limits: 'The model compresses several clearance pathways into a normalized state and does not reproduce autophagosome or lipid kinetics.'
  },
  {
    id: 'lutz-2017', authors: 'Brosius Lutz A et al.', year: 2017,
    title: 'Schwann cells use TAM receptor-mediated phagocytosis in addition to autophagy to clear myelin in a mouse model of nerve injury',
    journal: 'PNAS 114:E8072–E8080', doi: '10.1073/pnas.1710566114',
    url: 'https://pmc.ncbi.nlm.nih.gov/articles/PMC5617301/', species: 'Mouse',
    finding: 'Schwann cells and recruited macrophages cooperate in myelin removal; Schwann cells use TAM-receptor phagocytosis as well as autophagy.',
    modelUse: 'Grounds the interaction between debris, macrophage activity, and Schwann support rather than assigning all clearance to one cell type.',
    limits: 'Macrophage activity is an aggregate index, not a cell count or an M1/M2 classification.'
  },
  {
    id: 'cattin-2015', authors: 'Cattin AL et al.', year: 2015,
    title: 'Macrophage-induced blood vessels guide Schwann cell-mediated regeneration of peripheral nerves',
    journal: 'Cell 162:1127–1139', doi: '10.1016/j.cell.2015.07.021',
    url: 'https://pmc.ncbi.nlm.nih.gov/articles/PMC4553238/', species: 'Rodent transection models; mouse and rat',
    finding: 'Hypoxia-sensing macrophages induce polarized vessels through VEGF-A. Migrating Schwann cells use those vessels as tracks, and disrupting vessel orientation disrupts repair.',
    modelUse: 'Motivates separate vascular support and aligned guidance in the repair bridge.',
    limits: 'Perfusion is a normalized support parameter. The simulator does not solve oxygen transport, VEGF chemistry, blood flow, or endothelial sprouting.'
  },
  {
    id: 'gomez-sanchez-2017', authors: 'Gomez-Sanchez JA et al.', year: 2017,
    title: 'After nerve injury, lineage tracing shows that myelin and Remak Schwann cells elongate extensively and branch to form repair Schwann cells, which shorten radically on remyelination',
    journal: 'Journal of Neuroscience 37:9086–9099', doi: '10.1523/JNEUROSCI.1453-17.2017',
    url: 'https://pmc.ncbi.nlm.nih.gov/articles/PMC5597985/', species: 'Mouse; lineage tracing and serial block-face electron microscopy',
    finding: 'Adult myelin and Remak Schwann cells form elongated, branched repair cells after injury and shorten again when they remyelinate regenerated axons.',
    modelUse: 'Grounds longitudinal Schwann tracks and the visual distinction between repair cells and new myelin segments.',
    limits: 'Rendered cells and tracks are synthetic. They are not segmented from the electron-microscopy dataset.'
  },
  {
    id: 'sulaiman-2000', authors: 'Sulaiman OAR, Gordon T', year: 2000,
    title: 'Effects of short- and long-term Schwann cell denervation on peripheral nerve regeneration, myelination, and size',
    journal: 'Glia 32:234–246', doi: '10.1002/1098-1136(200012)32:3<234::AID-GLIA40>3.0.CO;2-3',
    url: 'https://pubmed.ncbi.nlm.nih.gov/11102965/', species: 'Rat; delayed nerve cross-suture',
    finding: 'Denervation of four weeks or less did not reduce regeneration in this paradigm; longer denervation reduced axon recruitment. Atrophic Schwann cells still remyelinated axons that reached them.',
    modelUse: 'Separates the ability to support axon entry from the ability to remyelinate an axon after arrival.',
    limits: 'Neither four weeks nor the reported decline is a human deadline. Local reinnervation can restore a myelinating phenotype.'
  },
  {
    id: 'fu-1995', authors: 'Fu SY, Gordon T', year: 1995,
    title: 'Contributing factors to poor functional recovery after delayed nerve repair: prolonged axotomy',
    journal: 'Journal of Neuroscience 15:3876–3885', doi: '10.1523/JNEUROSCI.15-05-03876.1995',
    url: 'https://pubmed.ncbi.nlm.nih.gov/7751952/', species: 'Rat; delayed cross-suture and motor-unit measurements',
    finding: 'Prolonging the interval without a target connection reduced the number of motoneurons that successfully regenerated, even when the distal pathway was freshly denervated.',
    modelUse: 'Motivates a neuronal regenerative-competence factor separate from distal Schwann support and target condition.',
    limits: 'A failure to regenerate is not equivalent to neuronal death. The model does not infer surviving neuron counts from stalled trajectories.'
  },
  {
    id: 'gordon-2011', authors: 'Gordon T, Tyreman N, Raji MA', year: 2011,
    title: 'The basis for diminished functional recovery after delayed peripheral nerve repair',
    journal: 'Journal of Neuroscience 31:5325–5334', doi: '10.1523/JNEUROSCI.6156-10.2011',
    url: 'https://pmc.ncbi.nlm.nih.gov/articles/PMC6622714/', species: 'Rat; isolated periods of axotomy, nerve-graft denervation, and muscle denervation',
    finding: 'The neuron, distal Schwann pathway, and muscle make distinguishable contributions to delayed repair. Surviving axons can enlarge their motor units, so axon number and muscle force need not change proportionally.',
    modelUse: 'Keeps arrival, correct target routing, maturation, and target viability separate rather than reporting one recovery percentage.',
    limits: 'The simulator has no motor-unit recruitment, compensatory sprouting, muscle mechanics, or measured force prediction.'
  },
  {
    id: 'wagstaff-2021', authors: 'Wagstaff LJ et al.', year: 2021,
    title: 'Failures of nerve regeneration caused by aging or chronic denervation are rescued by restoring Schwann cell c-Jun',
    journal: 'eLife 10:e62232', doi: '10.7554/eLife.62232',
    url: 'https://elifesciences.org/articles/62232', species: 'Mouse; genetic rescue',
    finding: 'Distal-stump c-Jun protein declined to about 40% of its one-week level after ten weeks of denervation. Maintaining Schwann-cell c-Jun rescued impaired regeneration in the tested models.',
    modelUse: 'Supports time-dependent loss of repair support and sensitivity experiments on the assumed support-persistence time.',
    limits: 'A measured protein fraction is not the same as regeneration probability. The ten-week mouse result is not used as a calibrated human half-life.'
  },
  {
    id: 'wilcox-2020', authors: 'Wilcox MB et al.', year: 2020,
    title: 'Characterising cellular and molecular features of human peripheral nerve degeneration',
    journal: 'Acta Neuropathologica Communications 8:51', doi: '10.1186/s40478-020-00921-w',
    url: 'https://link.springer.com/article/10.1186/s40478-020-00921-w', species: 'Human; 34 denervated and five healthy samples from 27 patients',
    finding: 'Human injured nerves increased repair-associated c-Jun and p75NTR and reduced EGR2. Repair markers declined with long denervation; c-Jun approached or fell below uninjured levels around 500 days in the sampled data.',
    modelUse: 'Provides human evidence that repair-support deterioration is relevant beyond rodents.',
    limits: 'Heterogeneous cross-sectional tissue samples do not establish a universal time constant, a sharp recovery deadline, or a patient-specific prognosis.'
  },
  {
    id: 'brushart-1993', authors: 'Brushart TME', year: 1993,
    title: 'Motor axons preferentially reinnervate motor pathways',
    journal: 'Journal of Neuroscience 13:2730–2738', doi: '10.1523/JNEUROSCI.13-06-02730.1993',
    url: 'https://pure.johnshopkins.edu/en/publications/motor-axons-preferentially-reinnervate-motor-pathways-3/', species: 'Rat; femoral nerve repair and graft experiments',
    finding: 'Motor axon collaterals can enter both motor and sensory pathways. Selectivity emerges partly through collateral pruning and pathway properties retained after degeneration.',
    modelUse: 'Motivates separating anatomical arrival from route matching. The implemented check is whether an axon returns to its original synthetic fascicle family.',
    limits: 'Motor/sensory labels do not implement molecular target recognition. A fascicle match is not proof of correct organ reinnervation; collateral competition, pruning, and central relearning are absent.'
  },
  {
    id: 'brushart-2002', authors: 'Brushart TM et al.', year: 2002,
    title: 'Electrical stimulation promotes motoneuron regeneration without increasing its speed or conditioning the neuron',
    journal: 'Journal of Neuroscience 22:6631–6638', doi: '10.1523/JNEUROSCI.22-15-06631.2002',
    url: 'https://pmc.ncbi.nlm.nih.gov/articles/PMC6758126/', species: 'Rat; motor nerve regeneration',
    finding: 'Measured elongation rates were 3.38 ± 0.58 mm/day with stimulation and 3.27 ± 0.90 mm/day without it. Stimulation improved the onset of regeneration rather than elongation speed.',
    modelUse: 'Demonstrates why repair-entry lag and subsequent extension speed are separate model terms; supports a rodent-scale speed reference.',
    limits: 'These rates and treatment effects apply to the experimental protocol. They are not a universal rat rate or a human treatment prescription.'
  },
  {
    id: 'ikeda-2012', authors: 'Ikeda M, Oka Y', year: 2012,
    title: 'The relationship between nerve conduction velocity and fiber morphology during peripheral nerve regeneration',
    journal: 'Brain and Behavior 2:382–390', doi: '10.1002/brb3.61',
    url: 'https://pmc.ncbi.nlm.nih.gov/articles/PMC3432961/', species: 'Rat; 30 animals, immediate sciatic repair, 50–200 days',
    finding: 'Motor conduction velocity and total fiber diameter increased during recovery. Axon diameter or g-ratio alone did not track recovery consistently, and internodes remained short.',
    modelUse: 'Motivates a delayed maturation state and cautious conduction-related readouts after structural arrival.',
    limits: 'A maturation index or diameter-based speed estimate is not a simulated compound action potential, muscle response, or validated functional score.'
  },
  {
    id: 'sunderland-1947', authors: 'Sunderland S', year: 1947,
    title: 'Rate of regeneration in human peripheral nerves: analysis of the interval between injury and onset of recovery',
    journal: 'Archives of Neurology & Psychiatry 58:251–295', doi: '10.1001/archneurpsyc.1947.02300320002001',
    url: 'https://jamanetwork.com/journals/archneurpsyc/article-abstract/650478', species: 'Human; clinical observations',
    finding: 'Clinical observations related injury-to-recovery intervals to nerve regeneration distance, providing a historical basis for distance-and-time estimates.',
    modelUse: 'Supports displaying extension speed in mm/day and separating the travel-distance calculation from time to useful recovery. The human-scale default is an illustrative scenario.',
    limits: 'The familiar approximately 1 mm/day rule is an order-of-magnitude heuristic, not an exact constant or a calibration of this simulator.'
  },
  {
    id: 'isaacs-2023', authors: 'Isaacs J et al.; RECON Study Group', year: 2023,
    title: 'A multicenter prospective randomized comparison of conduits versus decellularized nerve allograft for digital nerve repairs',
    journal: 'Journal of Hand Surgery 48:904–913', doi: '10.1016/j.jhsa.2023.05.020',
    url: 'https://pubmed.ncbi.nlm.nih.gov/37530686/', species: 'Human; digital sensory nerve repair trial',
    finding: 'The trial compared specific collagen conduits and processed nerve allografts in 5–14 mm and 15–25 mm digital-nerve gaps.',
    modelUse: 'Establishes that repair evidence is specific to nerve type, gap length, device, and outcome; motivates separate generic repair scenarios.',
    limits: 'Generic simulated conduits and grafts are not the tested products. No trial success rate, motor-nerve efficacy, or universal critical-gap threshold is inferred.'
  },
  {
    id: 'buchthal-1979', authors: 'Buchthal F, Kühl V', year: 1979,
    title: 'Nerve conduction, tactile sensibility, and the electromyogram after suture or compression of peripheral nerve: a longitudinal study in man',
    journal: 'Journal of Neurology, Neurosurgery & Psychiatry 42(5):436–451', doi: '10.1136/jnnp.42.5.436',
    url: 'https://pubmed.ncbi.nlm.nih.gov/448383/', species: 'Human; longitudinal median-nerve suture and compression observations',
    finding: 'After median-nerve suture, sensory potentials returned at three to four months, corresponding to inferred advance of 1.5–2.0 mm/day. Electrical response properties and tactile sensibility recovered on different time courses.',
    modelUse: 'Adds a measured human distance/time reference and supports distinguishing arrival, electrical maturation, and sensory recovery.',
    limits: 'The suture observations included three complete sections and one partial section. Response-return timing is not direct growth-cone tracking or a universal human speed distribution; no coefficients or recovery forecasts are fitted to these cases.'
  },
  {
    id: 'podhajsky-1995', authors: 'Podhajsky RJ, Myers RR', year: 1995,
    title: 'A diffusion-reaction model of nerve regeneration',
    journal: 'Journal of Neuroscience Methods 60(1–2):79–88', doi: '10.1016/0165-0270(94)00222-3',
    url: 'https://pubmed.ncbi.nlm.nih.gov/8544490/', species: 'Computational study; peripheral-nerve transection and crush models',
    finding: 'A five-population diffusion-reaction framework represented interacting regenerative processes, with simulated vascular advance preceding neurite growth.',
    modelUse: 'Provides historical computational context for separating supportive tissue processes from neurite advance.',
    limits: 'This laboratory uses local reaction equations and prescribed spatial fronts without spatial diffusion. It does not reproduce this published model, inherit its coefficients, or acquire validation from its reported agreement with experiments.'
  },
  {
    id: 'laranjeira-2022', authors: 'Laranjeira S, Pellegrino G, Bhangra KS, Phillips JB, Shipley RJ', year: 2022,
    title: 'In silico framework to inform the design of repair constructs for peripheral nerve injury repair',
    journal: 'Journal of the Royal Society Interface 19(188):20210824', doi: '10.1098/rsif.2021.0824',
    url: 'https://discovery.ucl.ac.uk/id/eprint/10145037/', species: 'Computational study; literature-parameterized neurites in engineered tissue',
    finding: 'A random-walk neurite-growth framework explored collagen hydrogels containing biomaterial fibers, optimized fiber geometry, and assessed robustness through sensitivity analysis.',
    modelUse: 'Provides a computational precedent for inspecting how explicit geometric assumptions affect growth and for reporting sensitivity analyses.',
    limits: 'The present simulator uses predetermined synthetic curves and its own support laws. It does not implement the published random-walk or durotaxis model, use its fitted parameters, or claim its validation.'
  }
]);

export const PARAMETER_EVIDENCE = Object.freeze([
  {
    id: 'extension-speed', label: 'Axon extension speed', unit: 'mm/day',
    classification: 'Literature scale; adjustable assumption',
    evidence: 'Human distance/time estimates are of order millimeters per day; Buchthal and Kühl inferred 1.5–2.0 mm/day from sensory-response return after median-nerve suture. Brushart et al. measured approximately 3.3 mm/day in their rat motor-axon experiment.',
    implementation: 'A chosen speed scale is modified by the modeled local environment; it is not a fitted patient or species distribution.',
    references: ['sunderland-1947', 'buchthal-1979', 'brushart-2002']
  },
  {
    id: 'entry-lag', label: 'Repair-entry latency', unit: 'days',
    classification: 'Mechanism supported; numerical assumption',
    evidence: 'Axons do not all begin successful regeneration at the same instant; an intervention can alter the onset without altering elongation speed.',
    implementation: 'A separate, heterogeneous start delay controls entry into the repair rather than hiding all delay in a slower speed.',
    references: ['brushart-2002']
  },
  {
    id: 'degeneration', label: 'Wallerian degeneration and debris clearance', unit: 'days; normalized state',
    classification: 'Mechanism supported; phenomenological kinetics',
    evidence: 'Human distal electrical responses disappear over days; Schwann-cell and macrophage clearance involves multiple cellular pathways.',
    implementation: 'Distal integrity and debris have distinct time courses. Neither normalized field is an assay value.',
    references: ['chaudhry-1992', 'gomez-sanchez-2015', 'lutz-2017']
  },
  {
    id: 'schwann-support', label: 'Repair Schwann support and persistence', unit: '0–1; days',
    classification: 'Mechanism supported; uncertain time constant',
    evidence: 'Repair-state loss with prolonged denervation is documented in rodents and human tissue, on different time scales and with different measurements.',
    implementation: 'The support index and its persistence time are explicit assumptions. Mouse c-Jun protein levels are not directly converted to human growth probabilities.',
    references: ['arthur-farraj-2012', 'sulaiman-2000', 'wagstaff-2021', 'wilcox-2020']
  },
  {
    id: 'vascular-support', label: 'Vascular support', unit: '0–1',
    classification: 'Mechanism supported; normalized surrogate',
    evidence: 'Macrophage-induced vessels guide Schwann migration across rodent nerve bridges.',
    implementation: 'A dimensionless parameter modifies the local growth environment. It is not blood flow, oxygen tension, or an angiogenesis calculation.',
    references: ['cattin-2015']
  },
  {
    id: 'guidance', label: 'Guidance, alignment, and scar resistance', unit: '0–1; degrees / mm for geometry',
    classification: 'Mechanism supported; numerical assumptions',
    evidence: 'Repair Schwann cells form longitudinal tracks, and the architecture of the bridge and distal pathways influences regeneration.',
    implementation: 'Synthetic fascicles, guidance vectors, and path perturbations encode selected geometry. They are not reconstructed histology or a continuum mechanics model.',
    references: ['gomez-sanchez-2017', 'cattin-2015', 'brushart-1993']
  },
  {
    id: 'routing', label: 'Original fascicle matching', unit: 'fraction of modeled parent axons',
    classification: 'Mechanism supported; simplified routing rule',
    evidence: 'Axons reaching a distal pathway can still be misdirected; anatomical continuity alone does not guarantee a useful target connection.',
    implementation: 'The original and destination synthetic fascicle indices are compared. Motor/sensory labels are descriptive; this check does not establish correct organ reinnervation or functional recovery.',
    references: ['brushart-1993', 'gordon-2011']
  },
  {
    id: 'target', label: 'Target viability and maturation', unit: '0–1; days since arrival',
    classification: 'Mechanism supported; exploratory surrogate',
    evidence: 'Long denervation changes the target environment, while structural regeneration, remyelination, conduction, and force recover differently.',
    implementation: 'Target condition and post-arrival maturation are separate assumptions. These are neither an NMJ count nor a clinical prognosis.',
    references: ['gordon-2011', 'sulaiman-2000', 'ikeda-2012', 'buchthal-1979']
  },
  {
    id: 'repair', label: 'Repair geometry and material choice', unit: 'mm; scenario',
    classification: 'Scenario design, not comparative-effectiveness evidence',
    evidence: 'Clinical repair results depend on the exact nerve, gap, intervention, timing, and endpoint.',
    implementation: 'Generic suture, graft, and conduit scenarios alter model geometry and assumptions. They do not rank commercial devices or surgical treatments.',
    references: ['isaacs-2023']
  },
  {
    id: 'sampling', label: 'Axon population, seed, and repeated runs', unit: 'modeled axons; integer seed',
    classification: 'Computational design',
    evidence: 'A finite representative population is used so trajectories can be inspected in a browser.',
    implementation: 'Repeatability and a spread across seeds describe numerical stochastic variability. They do not supply population confidence intervals or capture uncertainty in biological assumptions.',
    references: []
  },
  {
    id: 'computational-precedents', label: 'Published computational precedents', unit: 'model architecture',
    classification: 'Methodological context; no transferred calibration',
    evidence: 'Published regeneration frameworks include diffusion-reaction populations and random-walk neurite trajectories coupled to engineered-tissue geometry.',
    implementation: 'This release instead integrates local reactions along prescribed spatial fronts and advances axons on seeded synthetic curves. Citing earlier frameworks does not make it a reproduction or an independently validated extension of them.',
    references: ['podhajsky-1995', 'laranjeira-2022']
  }
]);

export const MODEL_LIMITATIONS = Object.freeze([
  'Mechanism-informed exploratory model; not calibrated or clinically validated.',
  'Synthetic nerve geometry and representative axons; not patient-specific anatomy or a complete nerve census.',
  'Normalized environmental states; no molecular concentration, oxygen transport, immune lineage, or gene-regulatory solver.',
  'Structural arrival, target matching, and maturation are distinct; none is a clinical recovery probability.',
  'Human-scale and rodent-scale scenarios are separate parameter hypotheses, not an interspecies conversion.',
  'No collagen mechanics, surgical tension calculation, neuroma pain model, motor-unit recruitment, muscle force, or cortical adaptation.',
  'Conduction-related readouts are surrogates; no biophysical action-potential or extracellular recording calculation.',
  'Changing random seeds samples model stochasticity; it does not establish empirical confidence limits.',
  'Replay and local-myelin positions interpolate adaptively simplified trajectories; exact initiation and crossing events are retained.'
]);

/** Original reduced equations; source-grounded mechanisms, uncalibrated coefficients. */
export const MODEL_EQUATIONS = Object.freeze([
  {
    id: 'field-states', title: 'Local reaction states',
    formula: 'Q, D, M, S, V, F ∈ [0, 1]',
    description: 'Q: disconnected distal axon integrity; D: debris; M: macrophage activity; S: support available to still-advancing axons; V: vascular support; F: fibrosis burden. Every state is dimensionless.',
    assumption: 'The fields are local reaction variables with prescribed spatial bridge fronts. There is no diffusion equation, cell census, molecular concentration, or reinnervation feedback into S.'
  },
  {
    id: 'debris-equation', title: 'Fragmentation and debris removal',
    formula: 'dQ/dt = −kQ; dD/dt = kQ − (0.035 + 0.34M + 0.075S)D',
    description: 'The fragmentation rate k rises smoothly from zero at day 1 to 0.7/day at day 2, then stays constant. Intact distal material transfers into debris, while baseline, macrophage, and Schwann activity clear it. The cleared fraction is tracked by mass bookkeeping.',
    assumption: 'Rates are model assumptions. Electrical response disappearance in human nerves does not measure the same quantity as Q or D.'
  },
  {
    id: 'macrophage-equation', title: 'Aggregate macrophage activity',
    formula: 'dM/dt = 0.65(D + 0.35W)(1 − M) − 0.11(1 − D)M',
    description: 'W = exp(−t/6) exp(−|x − g/2|/max(2, g/2)) is an injury-centered wound pulse; g is gap length in mm and t is days since injury.',
    assumption: 'The state is not a macrophage count or immune-subtype model. Recruitment and resolution rates are illustrative coefficients.'
  },
  {
    id: 'environment-equation', title: 'Support, vascular, and fibrosis relaxation',
    formula: 'dS/dt = (S* − S)/2.3; dV/dt = (V* − V)/τV; dF/dt = [F*(1 − exp(−t/9)) − F]/7',
    description: 'τV is 3.5 days within the bridge and 1.5 days in the distal stump. S*, V*, and F* are prescribed local target states, not measured equilibrium values.',
    assumption: 'This closure gives a responsive, bounded environment. It does not solve oxygen delivery, vessel growth, collagen deposition, or c-Jun kinetics.'
  },
  {
    id: 'support-equation', title: 'Activation and chronic support loss',
    formula: 'A(t) = 1 − exp[−max(0, t − 0.5)/2]; Cs(t) = 2^(−max(0, t − 28)/Hs)',
    description: 'In the distal stump, S* = S0 A(t) Cs(t). Hs is the user-selected repair-support half-life. Bridge S* is also multiplied by the prescribed bridge occupancy. A newly inserted structured bridge uses its own time since repair for A and Cs; the distal recipient and host-derived conduit support retain time since injury.',
    assumption: 'The 28-day plateau and half-life are assumptions, including in human-scale scenarios. Mouse and human molecular findings do not calibrate this curve.'
  },
  {
    id: 'bridge-equation', title: 'Bridge occupancy from both stumps',
    formula: 'BV = logistic[(0.75 max(0, tr − 1) − d)/0.8]; BS = logistic[(0.45 max(0, tr − 2) − d)/0.65]',
    description: 'tr is time after repair; d = min(x, g − x). After repair V* = V0(0.06 + 0.94BV), and S* = S0 A Cs [a + (1 − a)BS], with a = 0.72 for the structured-bridge scenario and zero for a hollow conduit.',
    assumption: 'Before repair, bridge S is zero. Front speeds in mm/day, transition widths in mm, and scaffold support are numerical assumptions. These are prescribed logistic fronts, not measured migration or angiogenesis solutions.'
  },
  {
    id: 'growth-equation', title: 'Axon extension along a synthetic path',
    formula: 'dxi/dt = v0 ai S(0.25 + 0.75V)(1 − 0.65D)(1 − 0.75F) / Ti',
    description: 'v0 is the chosen extension scale, ai is a fixed seeded speed trait, and Ti = √[1 + (dy/dx)² + (dz/dx)²] converts path-length growth to axial advance. Fields are sampled at the tip.',
    assumption: 'The multiplicative coefficients and synthetic path shape are original assumptions. This is not a molecular growth-cone force balance or chemotaxis model.'
  },
  {
    id: 'initiation-equation', title: 'Chronic axotomy and initiation',
    formula: 'Pinit = 2^(−repairDelay / Hi); initiate when Ui < Pinit',
    description: 'Hi is an assumed competence half-life. Ui and each axon’s onset and speed traits are sampled once from the seed, before time integration.',
    assumption: 'A noninitiating modeled axon is not declared dead. Changing the seed samples hypothetical cohort variability, not an empirical distribution of patients.'
  },
  {
    id: 'myelin-equation', title: 'Local post-arrival maturation',
    formula: 'mi(x,t) = 0 before ai(x) + Lm; otherwise 1 − exp[−(t − ai(x) − Lm)/τm]',
    description: 'ai(x) is that axon’s first arrival time at x. Lm is the assumed myelination lag and τm is the chosen maturation time constant. This clock is independent of repair-state support loss.',
    assumption: 'm is a maturation proxy, not a g-ratio, sheath thickness, or measured conduction velocity. The whole-cohort conduction proxy averages target-arrival maturation multiplied by a seeded caliber factor.'
  },
  {
    id: 'target-equation', title: 'Target-condition diagnostic',
    formula: 'Rtarget(t) = 2^(−max(0, t − 30)/Ht)',
    description: 'Ht is an assumed target-receptivity half-life. This displayed diagnostic is separate from the growth equations and does not gate arrival counts.',
    assumption: 'The diagnostic has no axon-contact rescue feedback and is not a neuromuscular-junction count, muscle strength, irreversible deadline, or clinical prognosis.'
  }
]);

export function referenceById(id) {
  return REFERENCES.find((reference) => reference.id === id);
}
