export const simulationGroups = [
  {
    "title": "Design & Microfabrication",
    "entries": [
      {
        "href": "/simulations/microfabrication/",
        "title": "Microfabrication Laboratory",
        "desc": "Build a flexible neural electrode one material layer at a time. Inspect masks and live cross-sections, change alignment and etching, then test continuity, isolation and exposed contact area."
      }
    ]
  },
  {
    "title": "Neural Interface Laboratories",
    "entries": [
      {
        "href": "/simulations/rpni-design/",
        "title": "RPNI Design & Testing Laboratory",
        "desc": "Design muscle-graft regenerative peripheral nerve interfaces. Position finite bipolar contacts, route synthetic motor units, calculate recordings and cross-talk, and compare geometry with an explicit transport diagnostic."
      },
      {
        "href": "/simulations/biohybrid-interface/",
        "title": "Biohybrid Neural Interface Laboratory",
        "desc": "Calculate an engineered living neural bridge: active branched cells, axonal propagation, host–graft synapses and finite-contact recordings. Compare seven experiments and a separate exploratory growth model."
      },
      {
        "href": "/cortex/interface/",
        "title": "Neural Interface Laboratory",
        "desc": "A single pointed test shank with eight finite surface contacts and twelve active human neurons. Follow voltage across every cell, stimulate selected pads, and inspect ideal recordings and somatic spike rasters."
      },
      {
        "href": "/cortex/",
        "title": "Cortex Laboratory",
        "desc": "The original single-cell laboratory: stimulate a reconstructed human neuron, run sustained patch-clamp experiments, and replay membrane voltage across its morphology."
      },
      {
        "href": "/simulations/cortical-stimulation/",
        "title": "Cortical Stimulation Laboratory",
        "desc": "Shape finite electrodes, steer current through cortical tissue, and follow active neuron responses. Compare materials, pulse waveforms, membrane traces and recruitment at realistic cellular scale."
      },
      {
        "href": "/simulations/cortex-slab/",
        "title": "Cortical Recording Laboratory",
        "desc": "Explore a volume of neurons in 3D. Place up to six contacts in the neural population, compare a depth probe or array, inspect synthetic recordings and export raw traces."
      }
    ]
  },
  {
    "title": "Cell Models & Electrophysiology",
    "entries": [
      {
        "href": "/cortex/population/",
        "title": "Cortex Population Laboratory",
        "desc": "Place distinct human neuron models in seeded random distance clouds, shells or grids. Shuffle angles, apply shared electrode stimulation, and inspect population voltage replay and recordings."
      },
      {
        "href": "/simulations/cellular-electrophysiology/",
        "title": "Cellular Electrophysiology Laboratory",
        "desc": "Three linked scales of electrical behavior in one workspace: current-clamp responses, membrane-channel kinetics and passive cable spread. Each explorer retains its original controls, plots and model references."
      },
      {
        "href": "/cells/",
        "title": "Cell Model Atlas",
        "desc": "Browse published human neuron fits and measured Allen and H01 morphology references. Open individual electrical models in the Cortex Laboratory."
      }
    ]
  },
  {
    "title": "Tissue Mechanics",
    "entries": [
      {
        "href": "/simulations/tissue-mechanics/",
        "title": "Brain Tissue Mechanics Laboratory",
        "desc": "Explore nonlinear tissue mechanics, physical-time relaxation, creep and recovery. Compare published regional material fits, finite-element formulations and experimental curves with explicit accuracy limits."
      },
      {
        "href": "/simulations/cellular-mechanics/",
        "title": "Cellular Tissue Mechanics Laboratory",
        "desc": "Deform a native-position crop of measured H01 human-cortex neurites with the shared Phase 2 mechanics field. Replay physical-time histories, inspect source identities and import attributed surface geometry."
      }
    ]
  },
  {
    "title": "Anatomy & Pathways",
    "entries": [
      {
        "href": "/simulations/nerve-regeneration/",
        "title": "Peripheral Nerve Regeneration Laboratory",
        "desc": "Follow seeded parent axons through degeneration, repair, distal growth and remyelination. Inspect anatomical trajectories, compare assumptions, run ensembles and consult the primary-source evidence."
      },
      {
        "href": "/simulations/finger-pathway-atlas/v4/",
        "title": "Finger Pathway Atlas V4",
        "desc": "V4: follow 78 connected sensory and motor routes through 306 individual cells in one intact anatomical model. Zoom from finger to cortex with adaptive cellular detail and 50 scientific reference plates."
      },
      {
        "href": "/simulations/finger-pathway-atlas/v3/",
        "title": "Finger Pathway Atlas V3",
        "desc": "The complete original V3 atlas: anatomical models, detailed cellular specimens, sensory and motor journeys, original controls and 50 comparison plates. Available alongside V4 for comparison."
      },
      {
        "href": "/sim/",
        "title": "Peripheral nerve cross-section",
        "desc": "Original sandbox with electrodes, pulse visualization, zoom/pan, and experiment export/import."
      }
    ]
  }
];

export const simulationLinks = simulationGroups.flatMap(group => group.entries);
