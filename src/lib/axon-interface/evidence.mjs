/** Reconstructed primary-source register and scientific boundary.
 * A source supports only the claim described in scope; none validates this device. */
export const evidenceClasses = Object.freeze([
  { id: 'experimental', title: 'Experimental', meaning: 'Observed in a named species, preparation and experiment.' },
  { id: 'mathematical', title: 'Mathematical', meaning: 'An equation, model definition or consequence of explicit definitions.' },
  { id: 'estimated', title: 'Estimated', meaning: 'An explicit numerical choice or effective parameter without a preparation-specific fit.' },
  { id: 'hypothetical', title: 'Hypothetical', meaning: 'A proposed architecture or mechanism not established by this calculation.' }
].map(Object.freeze));

export const references = Object.freeze([
  { id: 'mrg2002', title: 'McIntyre, Richardson & Grill (2002). Modeling the excitability of mammalian nerve fibers: influence of afterpotentials on the recovery cycle.', url: 'https://doi.org/10.1152/jn.00353.2001', evidence: 'mathematical', scope: 'Published myelinated motor-axon model and diameter table. Its use here specifies a cable benchmark; it supplies neither engineered-cell measurements nor a human spiral-ganglion fit.' },
  { id: 'modeldb3810', title: 'ModelDB 3810: original MRG channel and cable source.', url: 'https://github.com/ModelDBRepository/3810/tree/b15daeda6ea368df0198d257f339cf5e840cf31c', evidence: 'mathematical', scope: 'Pinned AXNODE.mod, MRGaxon.hoc and README provenance for the independent reference. Retain author headers and source notices; no separate model-specific license was found in the inspected snapshot.' },
  { id: 'rattay1986', title: 'Rattay (1986). Analysis of models for external stimulation of axons.', url: 'https://doi.org/10.1109/TBME.1986.325670', evidence: 'mathematical', scope: 'Extracellular stimulation enters the cable equations through the spatial extracellular potential. Electrode current is not interchangeable with current injected into a membrane compartment.' },
  { id: 'pelot2019', title: 'Pelot, Behrend & Grill (2019). On the parameters used in finite element modeling of compound peripheral nerves.', url: 'https://pmc.ncbi.nlm.nih.gov/articles/PMC7309635/', evidence: 'estimated', scope: 'Primary computational sensitivity study and provenance of widely used nerve-conductor parameters. The 1149 Ω m perineurial value is an adjusted estimate, not a direct human measurement at 37 °C.' },
  { id: 'horn2023', title: 'Horn et al. (2023). Characterization of the Electrical Properties of Mammalian Peripheral Nerve Laminae.', url: 'https://pmc.ncbi.nlm.nih.gov/articles/PMC10426281/', evidence: 'experimental', scope: 'Freshly excised canine vagus nerves measured at 22 ± 1 °C with impedance spectroscopy and circuit-derived material estimates. Establishes preparation and frequency dependence; it is not a human in-vivo 37 °C parameter set.' },
  { id: 'potrusil2012', title: 'Potrusil et al. (2012). Morphometric classification and spatial organization of spiral ganglion neurons in the human cochlea: consequences for single fiber response to electrical stimulation.', url: 'https://pmc.ncbi.nlm.nih.gov/articles/PMC3377987/', evidence: 'experimental', scope: 'Human cochlear morphology motivates distinct soma and process geometry. It does not turn a cylindrical enlarged MRG node into a measured SGN.' },
  { id: 'rattay2013', title: 'Rattay et al. (2013). Impact of Morphometry, Myelinization and Synaptic Current Strength on Spike Conduction in Human and Cat Spiral Ganglion Neurons.', url: 'https://doi.org/10.1371/journal.pone.0079256', evidence: 'mathematical', scope: 'Explicit soma, presomatic/postsomatic and unequal peripheral/central process model. Its temperature-fitted Hodgkin–Huxley formulation differs from current 37 °C MRG nodal kinetics; it is a future reference, not silently combined code.' },
  { id: 'farooqui2024', title: 'Farooqui et al. (2024). The effects of neuron morphology and spatial distribution on the selectivity of dorsal root ganglion stimulation.', url: 'https://pmc.ncbi.nlm.nih.gov/articles/PMC11475779/', evidence: 'mathematical', scope: 'Primary morphology-sensitive DRG stimulation model. A pseudounipolar DRG with a stem and branch point is a different topology from a bipolar SGN or a straight cable.' },
  { id: 'chen2012', title: 'Chen et al. (2012). Restoration of auditory evoked responses by human ES-cell-derived otic progenitors.', url: 'https://pmc.ncbi.nlm.nih.gov/articles/PMC3480718/', evidence: 'experimental', scope: 'Human-derived otic progenitors improved auditory evoked-response thresholds in an animal neuropathy model. This is motivation for replacement research, not evidence of original-host axon preservation or one-channel/one-axon selectivity.' },
  { id: 'chen2024', title: 'Chen et al. (2024). Optogenetically modified human embryonic stem cell-derived otic neurons establish functional synaptic connection with cochlear nuclei.', url: 'https://pubmed.ncbi.nlm.nih.gov/39092452/', evidence: 'experimental', scope: 'Functional connectivity in coculture with rat cochlear nucleus cells or slices. It does not demonstrate a chronic implanted human device or excitatory coupling to a mature peripheral axon shaft.' },
  { id: 'pelot2021', title: 'Pelot et al. (2021). Excitation properties of computational models of unmyelinated peripheral axons.', url: 'https://pmc.ncbi.nlm.nih.gov/articles/PMC8087387/', evidence: 'mathematical', scope: 'Separate unmyelinated axon models and implementation comparisons. C fibers cannot be represented by applying a new label to a smaller MRG myelinated fiber.' },
  { id: 'arthurfarraj2012', title: 'Arthur-Farraj et al. (2012). c-Jun reprograms Schwann cells of injured nerves to generate a repair cell essential for regeneration.', url: 'https://pmc.ncbi.nlm.nih.gov/articles/PMC3657176/', evidence: 'experimental', scope: 'Mouse Schwann-cell injury response and its role in regeneration. Glial reprogramming and axonal regrowth are distinct from routine division of mature neurons.' },
  { id: 'cns2024', title: 'Augmenting fibronectin levels in injured adult CNS promotes robust axon regeneration in vivo (2024).', url: 'https://pmc.ncbi.nlm.nih.gov/articles/PMC11283980/', evidence: 'experimental', scope: 'Experimental adult CNS/optic-nerve regeneration. Retinal ganglion cells and optic nerve remain CNS structures; successful interventions do not create a general PNS regeneration exemption.' },
  { id: 'shannon1992', title: 'Shannon (1992). A model of safe levels for electrical stimulation.', url: 'https://doi.org/10.1109/10.126616', evidence: 'estimated', scope: 'An empirical charge/charge-density relation with a specific experimental context. It cannot certify a new geometry, electrode chemistry, pulse train, tissue, or implant as safe.' },
  { id: 'modeldb2017', title: 'McDougal et al. (2017). Twenty years of ModelDB and beyond: building essential modeling tools for the future of neuroscience.', url: 'https://pmc.ncbi.nlm.nih.gov/articles/PMC5279891/', evidence: 'mathematical', scope: 'The model repository authors describe provenance, reproducibility and reuse. Their discussion of citation practice is not a new model-specific software license.' },
  { id: 'boydkalu1979', title: 'Boyd & Kalu (1979). Scaling factor relating conduction velocity and diameter for myelinated afferent nerve fibres in the cat hind limb.', url: 'https://pubmed.ncbi.nlm.nih.gov/458657/', evidence: 'experimental', scope: 'Cat afferent diameter–velocity relations differ by fiber class. The large-fiber relation used in MRG Figure 8 is a comparison target, not a fitted human sensory identity classifier.' },
  { id: 'shannon1948', title: 'Shannon (1948). A Mathematical Theory of Communication.', url: 'https://doi.org/10.1002/j.1538-7305.1948.tb01338.x', evidence: 'mathematical', scope: 'Entropy and information require a defined probability law. The current deterministic uniform-channel diagnostic must not be presented as measured neural communication capacity.' }
].map(Object.freeze));

const questionData = [
  {
    "id": "identities",
    "title": "What does the original-host addressability fraction count?",
    "evidence": "mathematical",
    "referenceIds": [
      "chen2012"
    ],
    "answer": "The denominator is the declared original pre-intervention identity census. The strict endpoint counts original identities that remain continuous, propagate, satisfy the architecture-specific mechanism test, and have an isolated channel that recruits no other identity at the declared operating point. It is an intersection of identity sets, not a product of assumed yields. In the fixed B3 complete-resection model every original H identity loses continuity, so original-host Y is exactly zero by topology. Newly introduced E identities own their two projections and cannot inherit H identity. Unique engineered electrical outputs divided by the retained original census are reported separately, conditional on the assumed pre-grown topology and valid controls. Neither endpoint predicts target reinnervation or survival. The retained straight-cable benchmark has no original identity census, so its original-host yield remains null. Animal transplantation evidence motivates replacement research without changing this accounting."
  },
  {
    "id": "mrg-scope",
    "title": "Is a 37 °C MRG cable a human spiral-ganglion neuron?",
    "evidence": "mathematical",
    "referenceIds": [
      "mrg2002",
      "modeldb3810",
      "potrusil2012",
      "pelot2021"
    ],
    "answer": "No. MRG is a myelinated motor-fiber model with specified nodal, paranodal and internodal mechanisms. The retained straight-cable experiment verifies this published numerical benchmark at 37 °C and its nine tabulated diameters. The separate B3 experiment explicitly adds a spherical-band soma, two unmyelinated stems and myelinated peripheral and central arms, assigning declared fractions of MRG nodal active conductance to the new soma and stems. That is a hypothetical electrical model, not measured engineered tissue or a fitted human spiral-ganglion neuron. Its axial soma bands average the extracellular field over each membrane surface; they do not resolve circumferential channel patches or full three-dimensional intracellular voltage. Matching native NEURON verifies implementation of these equations. It does not establish sensory identity, represent a pseudounipolar DRG branch, or turn a myelinated cable into an unmyelinated C fiber."
  },
  {
    "id": "ganglion-topology",
    "title": "Which ganglion geometry does the B3 hypothesis represent?",
    "evidence": "hypothetical",
    "referenceIds": [
      "potrusil2012",
      "rattay2013",
      "farooqui2024"
    ],
    "answer": "The B3 candidate now has distinct peripheral and central projections belonging to each introduced neuron, an explicit 20 µm soma, unequal 30/50 µm unmyelinated stems with 1.5/2.5 µm diameters, and six true myelinated nodes on each arm by default. These dimensions and active-density choices are declared hypotheses. Soma subdivision is a numerical choice: five axial bands are the current supported candidate after retained coarse-resolution failures. Both arms are assumed to reach electrical observation planes; no correct biological target connection is manufactured. Human morphometry and published SGN models motivate distinguishing these regions, but do not validate this exact parameterization. Rattay’s SGN kinetics and temperature treatment differ from MRG. A DRG model would instead require its own pseudounipolar stem, branch point and filtering tests. Names and compartment size alone cannot substitute for that topology."
  },
  {
    "id": "matched-controls",
    "title": "What can the matched controls actually establish?",
    "evidence": "mathematical",
    "referenceIds": [
      "rattay1986",
      "chen2024"
    ],
    "answer": "Each isolated contact pair is tested against the complete declared engineered population. Assigned, local-region silenced, whole-cell silenced and soma-only silenced runs preserve geometry, field, temperature, time resolution and the same equilibrated state. Local silencing removes active soma, stem and proximal-heminode conductances while leaving distal excitability; soma-only silencing removes all somatic bands. Loss under either intervention establishes conditional conductance necessity and may also reflect propagation block. Earliest observed crossings help classify the response but do not prove the source of depolarization. Zero-drive variants audit stability. B3 has no engineered-to-host junction, so junction block is not applicable, never passed. In the matched no-device condition the original remnants are absent exactly as in B3; only introduced cells, wells, contacts and implant drive are removed. The resulting empty population and source-free field have analytical zero output, with no fabricated membrane trace. Actual viable disconnected-stump simulations are a separately labeled diagnostic with different anatomy, never the matched comparator or evidence of implant benefit."
  },
  {
    "id": "propagation",
    "title": "When is an output classified as a propagating response?",
    "evidence": "estimated",
    "referenceIds": [
      "mrg2002",
      "rattay1986"
    ],
    "answer": "Each arm has three true distal-node monitors outside the local intervention region. The diagnostic requires same-ordinal upward crossings after stimulus onset, strictly positive outward inter-node delays, segment speeds between 1 and 200 m/s, and at most a twofold speed discrepancy. These are declared temporal diagnostics, not a fitted human physiological band. The central-arm result defines the reported output matrix; both arm results and all active-site crossing events remain inspectable. A simultaneous field deflection or single local voltage excursion is insufficient. Three ordered crossings still do not prove that a uniquely identified traveling event caused them, or that the arm reaches an appropriate biological target. The earliest observed threshold crossing is reported as such: it is not necessarily the location at which depolarization began. Full traces, intervention results and the fixed observation window remain part of the exported evidence."
  },
  {
    "id": "perineurium",
    "title": "Why are anisotropy and the perineurial shell part of the solve?",
    "evidence": "estimated",
    "referenceIds": [
      "pelot2019",
      "horn2023"
    ],
    "answer": "The conductor solves a three-dimensional field with endoneurial, perineurial, epineurial and surrounding regions. Longitudinal and transverse endoneurial conductivities differ, and the explicitly meshed low-conductivity sheath changes current access and spatial spread. The B3 solve also resolves insulating well walls, end caps, open apertures, cavity fluid and the local cell surfaces. Default material values remain effective exploratory choices rather than preparation-specific human fits. The 1149 Ω m perineurial resistivity is an adjusted literature estimate. Canine room-temperature spectroscopy shows frequency-dependent tissue response that the present ohmic conductor omits. Species, preparation, temperature, frequency and geometry therefore belong in provenance and uncertainty. A numerically converged field does not remove those material uncertainties."
  },
  {
    "id": "electrode-wells",
    "title": "What distinguishes explicit electrode wells from the retained Gaussian benchmark?",
    "evidence": "mathematical",
    "referenceIds": [
      "pelot2019",
      "rattay1986"
    ],
    "answer": "The retained motor benchmark uses finite Gaussian volume source and sink distributions; its 75 µm support radius is not metal contact area and it cannot establish insulating-well selectivity. The separate B3 model now explicitly meshes every declared well, including unaddressed wells, its wall and end-cap insulation, open apertures, cavity fluid and finite rectangular source/return surface patches. Each solved channel imposes balanced current flux on its named pair, and the actual mesh-integrated patch area is exported. It does not impose equipotential metal or calculate electrode polarization. Local neuronal surfaces are resolved around the soma and stems before transitioning to effective bulk endoneurial material along distal arms. Field refinement, independent sparse-solver comparison, domain checks and membrane-surface quadrature tests apply to this new geometry; the legacy Gaussian-field validation cannot certify it."
  },
  {
    "id": "recording",
    "title": "Does a clean extracellular trace prove selective neural activation?",
    "evidence": "mathematical",
    "referenceIds": [
      "rattay1986",
      "pelot2019"
    ],
    "answer": "No. The forward calculation separates applied-field artifact, engineered membrane-current contribution, the modeled host contribution and their instantaneous sum. The known source partition is not spike sorting or recovery of unknown sources. In fixed B3, host current is zero because original remnants are explicitly absent in both matched anatomical states; it is not evidence of preserved silent host axons. The engineered signal uses the same membrane-surface transfer weights as stimulation in the ohmic reciprocal conductor. Cells are driven independently by the imposed stimulus field; their computed membrane-current fields contribute to recording but are not fed back into other cells, so self-consistent ephaptic interaction is absent. True no-device has no contacts, so it has no electrode recording object; a zero voltage trace at imaginary implanted contacts is not manufactured. Voltages sum sample by sample, while separate peak-to-peak amplitudes generally do not. Recruitment comes from membrane propagation and controls. Saved stimulus and artifact values refer to the exact solver interval ending at each saved state."
  },
  {
    "id": "matrix-information",
    "title": "What do exclusivity, matrix rank and information quantify?",
    "evidence": "mathematical",
    "referenceIds": [
      "shannon1948"
    ],
    "answer": "A uniquely addressed engineered output needs at least one isolated-channel row recruiting exactly that identity. Duplicate rows do not create additional unique outputs; cells recruited only in shared sets remain a separate tier. Every declared cell and physical well participates in each row, but only explicitly tested contact pairs are represented as input channels. Testing one channel in a 256-well array does not establish 256 independent channels. Matrix rank is a real-number linear-algebra descriptor; nonlinear simultaneous stimulation need not reproduce that span. The information diagnostic is the entropy of deterministic recruitment patterns under a uniform prior over the tested isolated inputs, including duplicate and empty patterns and assuming no trial noise. It is not measured communication capacity, bit rate or percept count. Failed electrical audits withhold derived selectivity and information metrics. Original-host structural zero remains a separate consequence of the declared replacement topology."
  },
  {
    "id": "conduction-calibration",
    "title": "Does a plausible conduction speed establish biological calibration?",
    "evidence": "estimated",
    "referenceIds": [
      "boydkalu1979",
      "mrg2002"
    ],
    "answer": "A plausible speed is a diagnostic rather than biological calibration. MRG’s published comparison includes an approximately 5.66D large-cat-fiber relation, with D in µm and speed in m/s; Boyd and Kalu report class-dependent cat afferent relations. Refined long-cable diagnostics for the retained motor benchmark were about 49.13 m/s at 10 µm and 82.22 m/s at 16 µm, roughly 13.2% and 9.2% below that comparison line. Such values must be tied to the source hashes, discretization, stimulation site and measurement interval in their report; historical results cannot certify changed code. Same-discretization native NEURON agreement verifies the implemented equations. The new B3 soma and stems require their own coupled tests and do not inherit a human SGN fit from the motor benchmark, a broad velocity band, or a selected diameter label."
  },
  {
    "id": "retained-failures",
    "title": "Why keep failed soma and convergence experiments visible?",
    "evidence": "mathematical",
    "referenceIds": [
      "mrg2002",
      "modeldb3810",
      "modeldb2017"
    ],
    "answer": "A failed model or coarse discretization stays visible when a new candidate is introduced. The original enlarged 20 µm cylindrical MRG node with full nodal density produced zero-input activity; a passive load is a different hypothesis, not a successful repair of that active-soma model. Original motor time and passive-section refinement failures and the earlier Gaussian-field quadrature failure are retained with unchanged tolerances. In the new bipolar model, the 1.25-to-0.625 µs comparison exceeded the frozen 1 mV maximum-site RMS gate at about 1.115 mV. The soma 1-to-3 and 3-to-5 band comparisons also failed actual-well spatial gates; the 5-to-9 and 9-to-13 comparisons passed the tested cases and motivated the explicit five-band candidate. Final coupled reports determine its accepted scope. A historical one-band amplitude probe retained a 2 µA membrane-domain rejection without clipping, while all lower tested points remain recorded. A later pass does not erase any of these failures or expand the tested biological claims."
  },
  {
    "id": "biological-yields",
    "title": "Can geometric capacity or electrical activity predict regeneration and survival?",
    "evidence": "hypothetical",
    "referenceIds": [
      "chen2012",
      "arthurfarraj2012"
    ],
    "answer": "No. The fixed B3 population is an assumed anatomical input: a specified number of introduced neurons and pre-existing projections to observation planes. It is not a fabrication, loading, differentiation, survival or target-innervation yield of one. Geometric well capacity and a Poisson single-occupancy calculation are separate arithmetic diagnostics and are never multiplied into observed electrical recruitment. Both matched conditions assume original remnants absent within the modeled domain; that common assumption does not predict degeneration after resection. Viable-stump diagnostics use a separately stated hypothetical population. Experimental otic-cell transplantation and Schwann-cell repair biology motivate further models, but neither supplies unmeasured probabilities for this construct. Growth, cell fate, oxygen transport, chronic survival and correct target recognition remain unimplemented and their output fields remain null."
  },
  {
    "id": "optic-nerve",
    "title": "Can a retinal ganglion preset use peripheral regeneration assumptions?",
    "evidence": "experimental",
    "referenceIds": [
      "cns2024"
    ],
    "answer": "Retinal ganglion cells and the optic nerve are CNS structures. Their names do not make them a peripheral sensory ganglion. Adult mammalian optic-nerve regeneration is ordinarily limited, although experimental interventions demonstrate that regrowth is not categorically impossible. A future optic-nerve preset may illustrate a stated census or geometry while disabling unsupported peripheral repair dynamics. It cannot inherit an automatic regenerative yield from a PNS model or present an experimental molecular intervention as a demonstrated engineered interface. Neither the retained motor benchmark nor the fixed B3 bipolar hypothesis implements retinal physiology, optic-nerve injury biology or a CNS growth model."
  },
  {
    "id": "safety",
    "title": "Does charge balance or a Shannon number identify safe settings?",
    "evidence": "estimated",
    "referenceIds": [
      "shannon1992",
      "horn2023"
    ],
    "answer": "Charge balance, charge per phase and charge divided by actual mesh-integrated surface-patch area are electrical descriptors. They do not calculate electrode polarization, electrochemical products, local injury, stimulation-train effects or chronic safety. An empirical Shannon relation retains its original experimental scope and is not a universal safe/unsafe classifier. In B3, contact area comes from the finite surface mesh; in the retained Gaussian benchmark, source support and any declared metal area are separate quantities. Neither an ohmic current-flux boundary nor a charge-balanced pulse specifies real electrode material or its permissible potential excursion. Displayed arithmetic remains a diagnostic, without a recommended implant current, safety certification or clinical claim."
  },
  {
    "id": "stage-one",
    "title": "What does the implemented Stage 1 candidate establish?",
    "evidence": "hypothetical",
    "referenceIds": [
      "rattay2013",
      "potrusil2012",
      "pelot2019",
      "chen2024"
    ],
    "answer": "The Stage 1 candidate now implements a fixed-topology B3 electrical experiment: explicit hypothetical bipolar cells, every declared insulating well and aperture, finite surface contact pairs, distinct original and engineered identities, propagation diagnostics and matched electrical controls. A correct no-device comparator removes the construct under the same original-remnant assumption; junction block stays not applicable. Completion of the computational stage depends on the current source-hashed independent field and membrane comparisons, unchanged-tolerance convergence, coupled controls, full declared population execution and export/reproduction checks. Those reports, rather than this prose or the retained motor benchmark, determine verification status. This stage tests electrical consequences of assumed anatomy. It does not validate human SGN physiology, cell manufacture, survival, regeneration or target repair. Distinct coil and optical modalities, growth, whole-nerve scaling, transport, fabrication, routing, heating and chronic adaptation remain later stages until implemented and independently assessed."
  }
];

export const questions = Object.freeze(questionData.map(item => Object.freeze({ ...item, question: item.title, referenceIds: Object.freeze([...item.referenceIds]) })));
export const scientificQuestions = questions;

const boundary = {
  "status": "Fixed-topology B3 electrical candidate; current source-hashed numerical and protocol reports determine verification status.",
  "evidence": "hypothetical",
  "implemented": [
    "Explicit spherical-band soma, unequal unmyelinated stems and two myelinated arms at 37 °C with declared conductance-density hypotheses",
    "Every declared insulating well, its end caps and open apertures, local cell exclusions and finite balanced surface-current contact pairs",
    "Layered anisotropic ohmic field coupled to compartment membrane dynamics and reciprocal source-resolved recording",
    "Original H census retained separately from introduced E identities; strict original-host structural Y=0 under complete replacement",
    "Isolated channels, zero drive, local-region, whole-cell and all-somatic-band conductance interventions",
    "Matched no-device analytical zero under the same absent-original-remnant assumption; separate explicitly simulated viable-stump diagnostic",
    "Fixed-window traces, complete recruitment matrices, source hashes, work budgets and inspectable numerical failures"
  ],
  "assumed": [
    "Engineered cells and both projections already exist to electrical observation planes",
    "Original remnant processes are absent in both matched B3 and no-device states",
    "All chosen morphology and soma/stem membrane-density values are declared hypotheses, not fitted human SGN parameters"
  ],
  "retainedBenchmark": [
    "Original MRG straight motor cable and hypothetical enlarged load experiments",
    "Legacy layered conductor with finite Gaussian volume sources; its validation is distinct from the explicit-well field"
  ],
  "unimplemented": [
    "Measured human SGN calibration or engineered-cell physiology",
    "Electrode metal polarization, electrochemistry and injury prediction",
    "Self-consistent ephaptic feedback between independently solved cells, or circumferential nonlinear membrane polarization",
    "Growth, correct biological target reinnervation, cell fate, survival and oxygen transport",
    "Organoid-to-host junctions in this junction-free B3 architecture",
    "Coil and optical modalities, chronic adaptation, fabrication, routing and whole-nerve biological forecasts"
  ]
};
export const implementationBoundary = Object.freeze(Object.fromEntries(Object.entries(boundary).map(([key,value])=>[key,Array.isArray(value)?Object.freeze(value):value])));
export const biologicalBoundary = implementationBoundary;

export const futureRequirements = Object.freeze([
  {
    "stage": 1,
    "requirement": "Maintain the explicit bipolar/well equations, fixed identity assumptions and matched comparator definitions with source-specific numerical evidence.",
    "status": "implemented candidate; verification determined by current reports",
    "evidence": "hypothetical"
  },
  {
    "stage": 1,
    "requirement": "Retain independent reference, time/space convergence, coupled intervention and actual full-population protocol evidence without relabeling historical failures.",
    "status": "current report gates; no inherited benchmark certification",
    "evidence": "mathematical"
  },
  {
    "stage": 1,
    "requirement": "Fit and validate the model against a named biological preparation before making human SGN or engineered-cell predictions.",
    "status": "not established; outside numerical verification",
    "evidence": "experimental"
  },
  {
    "stage": 2,
    "requirement": "Implement physically distinct coil and optical modalities and comparable operating-point studies.",
    "status": "unimplemented",
    "evidence": "hypothetical"
  },
  {
    "stage": 3,
    "requirement": "Implement explicitly calibrated growth and identity-aware target contact.",
    "status": "unimplemented",
    "evidence": "hypothetical"
  },
  {
    "stage": 4,
    "requirement": "Represent a biologically justified full nerve census and validate any screening approximation; a few-hundred-cell electrical fixture does not supply a whole human nerve.",
    "status": "unimplemented",
    "evidence": "hypothetical"
  },
  {
    "stage": 5,
    "requirement": "Implement transport, fabrication, routing, thermal and chronic mechanisms.",
    "status": "unimplemented",
    "evidence": "hypothetical"
  },
  {
    "stage": 6,
    "requirement": "Implement and independently assess activity-dependent refinement.",
    "status": "unimplemented",
    "evidence": "hypothetical"
  }
].map(Object.freeze));
