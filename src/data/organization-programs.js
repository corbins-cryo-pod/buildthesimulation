// Curated program scopes from the existing catalog, with direct authorization records.
// A is a site umbrella for clinical marketing authorization; the pathway is shown in details.
// Research tool sales, funding, IDEs, patents and Breakthrough designations never confer stage 4.
export default {
  "01-neuralink-company-brief": [
    {
      "name": "N1 clinical BCI",
      "stage": 3,
      "regulatory": "R",
      "evidenceUrl": "/devices/02-neuralink-n1/",
      "notes": "Investigational N1 implant; PRIME and VOICE are clinical research, not marketing authorization.",
      "interfaces": [
        "Intracortical"
      ]
    }
  ],
  "02-synchron-company-brief": [
    {
      "name": "Stentrode BCI",
      "stage": 3,
      "regulatory": "R",
      "evidenceUrl": "/devices/03-stentrode-synchron/",
      "notes": "Human endovascular BCI studies; research program.",
      "interfaces": [
        "Endovascular"
      ]
    }
  ],
  "03-paradromics-company-brief": [
    {
      "name": "Connexus BCI",
      "stage": 3,
      "regulatory": "R",
      "evidenceUrl": "/devices/04-neuropixels-probe/",
      "notes": "Human Connexus research; an IDE permits a study, not commercial marketing.",
      "interfaces": [
        "Intracortical"
      ]
    }
  ],
  "04-blackrock-neurotech-company-brief": [
    {
      "name": "NeuroPort cortical microelectrode array",
      "stage": 4,
      "regulatory": "K",
      "evidenceUrl": "/devices/01-utah-microelectrode-array/",
      "notes": "FDA-cleared NeuroPort array. This does not clear MoveAgain or every Utah-array BCI application.",
      "authorizationLabel": "FDA 510(k) K110010",
      "authorizationUrl": "https://www.accessdata.fda.gov/scripts/cdrh/cfdocs/cfpmn/pmn.cfm?ID=K110010",
      "interfaces": [
        "Intracortical"
      ]
    },
    {
      "name": "MoveAgain BCI research",
      "stage": 3,
      "regulatory": "R",
      "evidenceUrl": "/companies/04-blackrock-neurotech-company-brief/#source-index",
      "notes": "Human BCI research and Breakthrough designation; NeuroPort array clearance does not authorize MoveAgain.",
      "interfaces": [
        "Intracortical"
      ]
    }
  ],
  "05-precision-neuroscience-company-brief": [
    {
      "name": "Layer 7-T cortical array",
      "stage": 4,
      "regulatory": "K",
      "evidenceUrl": "/devices/42-precision-layer-7-cortical-interface/",
      "notes": "Cleared for cortical recording, monitoring and stimulation with implantation up to 30 days; the future wireless BCI is separate.",
      "authorizationLabel": "FDA 510(k) K242618",
      "authorizationUrl": "https://www.accessdata.fda.gov/scripts/cdrh/cfdocs/cfpmn/pmn.cfm?ID=K242618",
      "interfaces": [
        "Cortical surface"
      ]
    }
  ],
  "06-science-corporation-company-brief": [
    {
      "name": "PRIMA retinal implant",
      "stage": 4,
      "regulatory": "A",
      "evidenceUrl": "/devices/177-science-prima-subretinal-photovoltaic-implant/",
      "notes": "European CE marking under the MDR, reported by Science; this is not U.S. FDA approval or approval of the cortical biohybrid program.",
      "authorizationLabel": "Science CE-mark announcement",
      "authorizationUrl": "https://www.businesswire.com/news/home/20260722965902/en/",
      "interfaces": [
        "Other"
      ]
    },
    {
      "name": "Cortical biohybrid interface",
      "stage": 2,
      "regulatory": "R",
      "evidenceUrl": "https://science.xyz/news/biohybrid-neural-interfaces/",
      "notes": "Mouse optogenetic biohybrid proof of concept; PRIMA retinal authorization does not approve this cortical interface.",
      "interfaces": [
        "Intracortical"
      ]
    }
  ],
  "07-inbrain-neuroelectronics-company-brief": [
    {
      "name": "Graphene cortical interface",
      "stage": 3,
      "regulatory": "R",
      "evidenceUrl": "/devices/176-inbrain-graphene-cortical-interface/",
      "notes": "First-in-human graphene interface research; Breakthrough designation is not marketing authorization.",
      "interfaces": [
        "Cortical surface"
      ]
    }
  ],
  "08-axoft-company-brief": [
    {
      "name": "Fleuron / FINESSE",
      "stage": 3,
      "regulatory": "R",
      "evidenceUrl": "/devices/174-axoft-fleuron-ultrasoft-neural-probe/",
      "notes": "Human feasibility research, not a clinical product authorization.",
      "interfaces": [
        "Intracortical"
      ]
    }
  ],
  "09-cortec-company-brief": [
    {
      "name": "Brain Interchange BCI",
      "stage": 3,
      "regulatory": "R",
      "evidenceUrl": "/companies/09-cortec-company-brief/#source-index",
      "notes": "Human Brain Interchange research; FDA IDE and Breakthrough designations are not market approval.",
      "interfaces": [
        "Intracortical"
      ]
    }
  ],
  "10-neuroxess-company-brief": [
    {
      "name": "Flexible ECoG / Triple-F BCI",
      "stage": 3,
      "regulatory": "R",
      "evidenceUrl": "/devices/180-neuroxess-triple-f-fully-implanted-subdural-bci/",
      "notes": "Human studies and a registration trial; marketing authorization is not established by trial registration.",
      "interfaces": [
        "Cortical surface"
      ]
    }
  ],
  "11-neucyber-beinao-1-company-brief": [
    {
      "name": "Beinao BCI human research",
      "stage": 3,
      "regulatory": "R",
      "evidenceUrl": "/devices/45-beinao-1-cibr-neucyber/",
      "notes": "Human research described in the organization brief; do not transfer results between Beinao generations.",
      "interfaces": [
        "Cortical surface"
      ]
    }
  ],
  "12-stairmed-company-brief": [
    {
      "name": "WRS ultraflexible BCI",
      "stage": 3,
      "regulatory": "R",
      "evidenceUrl": "/devices/178-stairmed-wrs-ultraflexible-wireless-bci/",
      "notes": "Human investigational BCI; a registration trial or innovative-device review is not market approval.",
      "interfaces": [
        "Intracortical"
      ]
    }
  ],
  "13-braingate-consortium-lab-brief": [
    {
      "name": "BrainGate intracortical BCI studies",
      "stage": 3,
      "regulatory": "R",
      "evidenceUrl": "/companies/13-braingate-consortium-lab-brief/#source-index",
      "notes": "Human BCI research; authorization of an array component does not authorize the BrainGate research system.",
      "interfaces": [
        "Intracortical"
      ]
    }
  ],
  "14-cea-clinatec-wimagine-lab-brief": [
    {
      "name": "WIMAGINE BCI studies",
      "stage": 3,
      "regulatory": "R",
      "evidenceUrl": "/companies/14-cea-clinatec-wimagine-lab-brief/#source-index",
      "notes": "Human assistive-control and rehabilitation research.",
      "interfaces": [
        "Cortical surface"
      ]
    }
  ],
  "15-technical-university-of-munich-bci-lab-brief": [
    {
      "name": "Intracortical robotic-arm control",
      "stage": 3,
      "regulatory": "R",
      "evidenceUrl": "/companies/15-technical-university-of-munich-bci-lab-brief/#source-index",
      "notes": "Human implant and robotic-control research described by TUM.",
      "interfaces": [
        "Intracortical"
      ]
    }
  ],
  "16-university-of-utah-neural-engineering-lab-brief": [
    {
      "name": "Cortical visual prosthesis research",
      "stage": 3,
      "regulatory": "R",
      "evidenceUrl": "/companies/16-university-of-utah-neural-engineering-lab-brief/#source-index",
      "notes": "Human intracortical visual-stimulation study; a university research program, not a marketed prosthesis.",
      "interfaces": [
        "Intracortical"
      ]
    }
  ],
  "17-university-of-michigan-neural-engineering-lab-brief": [
    {
      "name": "Connexus intraoperative recording research",
      "stage": 3,
      "regulatory": "R",
      "evidenceUrl": "/companies/17-university-of-michigan-neural-engineering-lab-brief/#source-index",
      "notes": "Human intraoperative and clinical research; an affiliation does not imply ownership of Connexus.",
      "interfaces": [
        "Intracortical"
      ]
    }
  ],
  "18-upenn-cullenlab-neuroengineering-lab-brief": [
    {
      "name": "Cullen living-electrode constructs",
      "stage": 2,
      "regulatory": "R",
      "evidenceUrl": "https://pmc.ncbi.nlm.nih.gov/articles/PMC8152180/",
      "notes": "Animal implantation and synaptic integration described in the living-electrode paper; other Penn programs are separate.",
      "interfaces": [
        "Intracortical"
      ]
    }
  ],
  "19-uflorida-neural-engineering-lab-brief": [
    {
      "name": "MEG speech-decoding research",
      "stage": 3,
      "regulatory": "R",
      "evidenceUrl": "/companies/19-uflorida-neural-engineering-lab-brief/#source-index",
      "notes": "Human noninvasive MEG decoding research; no implant product is implied.",
      "interfaces": [
        "Noninvasive"
      ]
    }
  ],
  "20-axogen-company-brief": [
    {
      "name": "Avance nerve graft",
      "stage": 4,
      "regulatory": "A",
      "evidenceUrl": "/companies/20-axogen-company-brief/#source-index",
      "notes": "FDA biologics approval, BLA 125816; nerve repair scaffold, not an electrical BCI. Traditional and accelerated indications differ.",
      "authorizationLabel": "FDA biologics approval BLA 125816",
      "authorizationUrl": "https://www.fda.gov/vaccines-blood-biologics/avance",
      "interfaces": [
        "Peripheral nerve"
      ]
    }
  ],
  "21-stanford-neural-engineering-bci-ecosystem-lab-brief": [
    {
      "name": "NPTL intracortical communication studies",
      "stage": 3,
      "regulatory": "R",
      "evidenceUrl": "/companies/21-stanford-neural-engineering-bci-ecosystem-lab-brief/#source-index",
      "notes": "Human handwriting and speech neuroprosthesis research.",
      "interfaces": [
        "Intracortical"
      ]
    }
  ],
  "22-mit-neural-engineering-neurotech-ecosystem-lab-brief": [
    {
      "name": "Multimodal neural fibers / MEND",
      "stage": 2,
      "regulatory": "R",
      "evidenceUrl": "/devices/132-mend-magnetoelectric-nanodiscs-2024/",
      "notes": "Mouse neural-interface research; fibers and injected nanodiscs are separate platforms.",
      "interfaces": [
        "Other"
      ]
    }
  ],
  "23-second-sight-medical-products-company-brief": [
    {
      "name": "Argus II retinal prosthesis",
      "stage": 4,
      "regulatory": "A",
      "evidenceUrl": "/devices/165-argus-ii-retinal-prosthesis/",
      "notes": "Historical FDA humanitarian approval H110002; discontinued and no longer available. HDE uses a probable-benefit standard.",
      "authorizationLabel": "FDA HDE H110002",
      "authorizationUrl": "https://www.accessdata.fda.gov/scripts/cdrh/cfdocs/cfhde/hde.cfm?id=H110002",
      "historical": true,
      "interfaces": [
        "Other"
      ]
    }
  ],
  "24-cortigent-company-brief": [
    {
      "name": "Orion cortical visual prosthesis",
      "stage": 3,
      "regulatory": "R",
      "evidenceUrl": "/devices/166-cortigent-orion-visual-cortical-prosthesis/",
      "notes": "Investigational cortical prosthesis; historical Argus II approval does not approve Orion.",
      "interfaces": [
        "Cortical surface"
      ]
    },
    {
      "name": "Argus II retinal prosthesis",
      "stage": 4,
      "regulatory": "A",
      "evidenceUrl": "/devices/165-argus-ii-retinal-prosthesis/",
      "notes": "Historical FDA HDE approval, discontinued. The current investigational Orion program remains separate.",
      "historical": true,
      "authorizationLabel": "FDA HDE H110002",
      "authorizationUrl": "https://www.accessdata.fda.gov/scripts/cdrh/cfdocs/cfhde/hde.cfm?id=H110002",
      "interfaces": [
        "Other"
      ]
    }
  ],
  "25-neuronexus-technologies-company-brief": [
    {
      "name": "Silicon probes for animal electrophysiology",
      "stage": 2,
      "regulatory": "R",
      "evidenceUrl": "/companies/25-neuronexus-technologies-company-brief/#source-index",
      "notes": "Commercial animal research tools; selling a research probe does not make it an authorized human clinical product.",
      "interfaces": [
        "Intracortical"
      ]
    }
  ],
  "26-merge-labs-company-brief": [
    {
      "name": "Molecular / ultrasound BCI concept",
      "stage": 0,
      "regulatory": "R",
      "evidenceUrl": "/companies/26-merge-labs-company-brief/#source-index",
      "notes": "Publicly described concept and development partnership; no demonstrated stage is inferred from funding.",
      "interfaces": [
        "Noninvasive"
      ]
    }
  ],
  "27-harvard-lieber-group-lab-brief": [
    {
      "name": "Injectable mesh electronics",
      "stage": 2,
      "regulatory": "R",
      "evidenceUrl": "/devices/23-syringe-injectable-mesh-electronics/",
      "notes": "Mouse mesh-electronics experiments.",
      "interfaces": [
        "Intracortical"
      ]
    }
  ],
  "28-nyu-buzsaki-lab-lab-brief": [
    {
      "name": "NeuroGrid surface recording",
      "stage": 3,
      "regulatory": "R",
      "evidenceUrl": "/devices/24-neurogrid-pedot-pss-surface-array/",
      "notes": "Two human intraoperative recordings and rat studies in the 2015 NeuroGrid report.",
      "interfaces": [
        "Cortical surface"
      ]
    }
  ],
  "29-ucsf-chang-lab-lab-brief": [
    {
      "name": "BRAVO speech neuroprosthesis",
      "stage": 3,
      "regulatory": "R",
      "evidenceUrl": "/companies/29-ucsf-chang-lab-lab-brief/#source-index",
      "notes": "Human ECoG speech-neuroprosthesis research.",
      "interfaces": [
        "Cortical surface"
      ]
    }
  ],
  "30-duke-viventi-lab-lab-brief": [
    {
      "name": "Flexible active-matrix ECoG arrays",
      "stage": 2,
      "regulatory": "R",
      "evidenceUrl": "/devices/29-active-matrix-flexible-ecog-array-viventi/",
      "notes": "Animal cortical recordings; research devices.",
      "interfaces": [
        "Cortical surface"
      ]
    }
  ],
  "31-neuracle-company-brief": [
    {
      "name": "NeuSen NEO hand-function system",
      "stage": 4,
      "regulatory": "A",
      "evidenceUrl": "/devices/41-neo-neuracle-tsinghua-epidural-bci/",
      "notes": "Chinese NMPA market authorization for the specified hand-grasp compensation system and cervical spinal-cord-injury indication; not FDA approval.",
      "authorizationLabel": "NMPA announcement, Shanghai regulator republication",
      "authorizationUrl": "https://yjj.sh.gov.cn/zjyw/20260313/04985a5fbe284e9c806ff5f370cb00b2.html",
      "interfaces": [
        "Cortical surface"
      ]
    }
  ],
  "32-uc-berkeley-neural-dust-lab-brief": [
    {
      "name": "Neural dust / StimDust",
      "stage": 2,
      "regulatory": "R",
      "evidenceUrl": "/devices/111-stimdust-ultrasonic-nerve-stimulator/",
      "notes": "Animal ultrasonic recording and stimulation research; distinct mote designs.",
      "interfaces": [
        "Peripheral nerve"
      ]
    }
  ],
  "33-brown-nurmikko-neurograins-lab-brief": [
    {
      "name": "Neurograins",
      "stage": 2,
      "regulatory": "R",
      "evidenceUrl": "/devices/25-neurograins-wireless-microimplant-network/",
      "notes": "Rodent distributed recording research; separate from BrainGate human work.",
      "interfaces": [
        "Cortical surface"
      ]
    }
  ],
  "34-epfl-neuroprosthetics-lab-brief": [
    {
      "name": "E-dura multimodal neural interface",
      "stage": 2,
      "regulatory": "R",
      "evidenceUrl": "/devices/28-e-dura-electronic-dura-mater/",
      "notes": "Animal soft cortical and spinal-interface research; not a claim about all EPFL programs.",
      "interfaces": [
        "Cortical surface"
      ]
    }
  ],
  "35-ut-austin-nanoelectronic-thread-lab-brief": [
    {
      "name": "Nanoelectronic thread probes",
      "stage": 2,
      "regulatory": "R",
      "evidenceUrl": "/devices/27-nanoelectronic-thread-net-probes/",
      "notes": "Historical UT Austin animal NET research; current Rice affiliations are separate.",
      "interfaces": [
        "Intracortical"
      ]
    }
  ],
  "36-cochlear-corporation-company-brief": [
    {
      "name": "Nucleus cochlear implant family",
      "stage": 4,
      "regulatory": "A",
      "evidenceUrl": "/devices/161-cochlear-nucleus-implant-system/",
      "notes": "FDA PMA-authorized Nucleus family; the approval applies to specified models and indications.",
      "authorizationLabel": "FDA PMA P840024/S096",
      "authorizationUrl": "https://www.accessdata.fda.gov/scripts/cdrh/cfdocs/cfpma/pma.cfm?id=P840024S096",
      "interfaces": [
        "Other"
      ]
    }
  ],
  "37-livanova-company-brief": [
    {
      "name": "VNS Therapy / SenTiva",
      "stage": 4,
      "regulatory": "A",
      "evidenceUrl": "/devices/157-livanova-vns-therapy-sentiva/",
      "notes": "FDA PMA P970003 and relevant supplements; approved VNS indications are device-specific.",
      "authorizationLabel": "FDA PMA P970003",
      "authorizationUrl": "https://www.accessdata.fda.gov/scripts/cdrh/cfdocs/cfpma/pma.cfm?id=P970003",
      "interfaces": [
        "Peripheral nerve"
      ]
    }
  ],
  "38-pitt-rehab-neural-engineering-labs-lab-brief": [
    {
      "name": "Intracortical control and tactile feedback",
      "stage": 3,
      "regulatory": "R",
      "evidenceUrl": "/companies/38-pitt-rehab-neural-engineering-labs-lab-brief/#source-index",
      "notes": "Human motor-control and sensory-feedback research at Pittsburgh.",
      "interfaces": [
        "Intracortical"
      ]
    }
  ],
  "39-jhu-apl-modular-prosthetic-limb-lab-brief": [
    {
      "name": "Modular Prosthetic Limb human studies",
      "stage": 3,
      "regulatory": "R",
      "evidenceUrl": "/companies/39-jhu-apl-modular-prosthetic-limb-lab-brief/#source-index",
      "notes": "Human prosthetic-limb studies; APL built the limb, not the cortical electrode interface.",
      "interfaces": [
        "Other"
      ]
    }
  ],
  "40-rice-ultraflexible-neural-interface-labs": [
    {
      "name": "NET / StimNET neural threads",
      "stage": 2,
      "regulatory": "R",
      "evidenceUrl": "/devices/98-stimnet-ultraflexible-stimulation-thread/",
      "notes": "Mouse/rodent ultraflexible interface studies; lab collaboration is not sole device ownership.",
      "interfaces": [
        "Intracortical"
      ]
    }
  ],
  "41-ucsd-integrated-electronics-biointerfaces-lab": [
    {
      "name": "PtNRGrid / microSEEG surgical research",
      "stage": 3,
      "regulatory": "R",
      "evidenceUrl": "/devices/100-microseeg-flexible-stylet-depth-electrode/",
      "notes": "Acute human recordings; no marketed chronic implant is inferred.",
      "interfaces": [
        "Intracortical"
      ]
    }
  ],
  "42-jhu-harris-high-capacity-electrophysiology-lab": [
    {
      "name": "Neuropixels Quad Base / NXT research",
      "stage": 2,
      "regulatory": "R",
      "evidenceUrl": "/devices/104-neuropixels-20-quad-base-probe/",
      "notes": "Mouse electrophysiology evidence; future prototype availability is a plan.",
      "interfaces": [
        "Intracortical"
      ]
    }
  ],
  "43-rice-magnetoelectric-bioelectronics-labs": [
    {
      "name": "DOT acute stimulation research",
      "stage": 3,
      "regulatory": "R",
      "evidenceUrl": "/devices/117-dot-magnetoelectric-epidural-stimulator-2024/",
      "notes": "The acute human proof of concept is separate from the rat and pig magnetoelectric implant studies; no chronic clinical authorization is implied.",
      "interfaces": [
        "Other"
      ]
    }
  ],
  "44-cornell-mote-neurotechnology-collaboration": [
    {
      "name": "MOTE optoelectronic recorder",
      "stage": 2,
      "regulatory": "R",
      "evidenceUrl": "/devices/135-mote-optoelectronic-tetherless-recorder-2025/",
      "notes": "Mouse recordings in a multi-institution collaboration.",
      "interfaces": [
        "Other"
      ]
    }
  ],
  "45-columbia-shepard-optical-and-electrical-interfaces": [
    {
      "name": "SCOPe / BISC interfaces",
      "stage": 2,
      "regulatory": "R",
      "evidenceUrl": "/devices/137-scope-subdural-cmos-optical-probe/",
      "notes": "Mouse and macaque research; the optical and electrical devices are separate.",
      "interfaces": [
        "Other"
      ]
    }
  ],
  "46-allen-ucl-neuropixels-opto-collaboration": [
    {
      "name": "Neuropixels Opto prototype",
      "stage": 2,
      "regulatory": "R",
      "evidenceUrl": "/devices/107-neuropixels-opto-photonic-prototype/",
      "notes": "Mouse prototype evidence; community availability in 2028 is a forecast.",
      "interfaces": [
        "Intracortical"
      ]
    }
  ],
  "47-rice-xie-lab": [
    {
      "name": "NET / StimNET neural threads",
      "stage": 2,
      "regulatory": "R",
      "evidenceUrl": "/devices/98-stimnet-ultraflexible-stimulation-thread/",
      "notes": "Mouse/rodent studies with Rice collaborators.",
      "interfaces": [
        "Intracortical"
      ]
    }
  ],
  "48-rice-yang-lab": [
    {
      "name": "ME-BIT magnetoelectric interface",
      "stage": 2,
      "regulatory": "R",
      "evidenceUrl": "/devices/113-mebit-magnetoelectric-endovascular-stimulator/",
      "notes": "Rat/pig experiments; delivery demonstrations and stimulation experiments have different scopes.",
      "interfaces": [
        "Endovascular"
      ]
    }
  ],
  "49-cornell-xu-group": [
    {
      "name": "MOTE optoelectronic recorder",
      "stage": 2,
      "regulatory": "R",
      "evidenceUrl": "/devices/135-mote-optoelectronic-tetherless-recorder-2025/",
      "notes": "Mouse research; listed as a collaboration, not sole ownership.",
      "interfaces": [
        "Other"
      ]
    }
  ],
  "50-ucl-carandini-lab": [
    {
      "name": "Neuropixels Opto prototype",
      "stage": 2,
      "regulatory": "R",
      "evidenceUrl": "/devices/107-neuropixels-opto-photonic-prototype/",
      "notes": "Mouse research with Allen and IMEC collaborators.",
      "interfaces": [
        "Intracortical"
      ]
    }
  ],
  "51-imec": [
    {
      "name": "Neuropixels Opto prototype",
      "stage": 2,
      "regulatory": "R",
      "evidenceUrl": "/devices/107-neuropixels-opto-photonic-prototype/",
      "notes": "Mouse prototype collaboration; institutional affiliation does not identify ownership of every component.",
      "interfaces": [
        "Intracortical"
      ]
    }
  ],
  "52-neuropace-company-brief": [
    {
      "name": "RNS System",
      "stage": 4,
      "regulatory": "A",
      "evidenceUrl": "/devices/150-neuropace-rns-system/",
      "notes": "FDA PMA P100026; responsive stimulation for the labeled epilepsy indication.",
      "authorizationLabel": "FDA PMA P100026",
      "authorizationUrl": "https://www.accessdata.fda.gov/scripts/cdrh/cfdocs/cfpma/pma.cfm?id=P100026",
      "interfaces": [
        "Other"
      ]
    }
  ],
  "53-medtronic-company-brief": [
    {
      "name": "Percept / SenSight DBS",
      "stage": 4,
      "regulatory": "A",
      "evidenceUrl": "/devices/151-medtronic-percept-sensight-dbs/",
      "notes": "FDA PMA P960009 and relevant supplements; models and indications are scoped in the device brief.",
      "authorizationLabel": "FDA Percept RC approval P960009/S438",
      "authorizationUrl": "https://www.accessdata.fda.gov/scripts/cdrh/cfdocs/cfpma/pma.cfm?id=P960009S438",
      "interfaces": [
        "Other"
      ]
    }
  ],
  "54-abbott-company-brief": [
    {
      "name": "Liberta RC DBS",
      "stage": 4,
      "regulatory": "A",
      "evidenceUrl": "/devices/152-abbott-liberta-rc-dbs/",
      "notes": "FDA PMA P140009/S087; clearance is not the applicable pathway.",
      "authorizationLabel": "FDA Liberta RC approval P140009/S087",
      "authorizationUrl": "https://www.accessdata.fda.gov/scripts/cdrh/cfdocs/cfpma/pma.cfm?ID=P140009S087",
      "interfaces": [
        "Other"
      ]
    }
  ],
  "55-boston-scientific-company-brief": [
    {
      "name": "Vercise Genus DBS",
      "stage": 4,
      "regulatory": "A",
      "evidenceUrl": "/devices/153-boston-scientific-vercise-genus-dbs/",
      "notes": "FDA PMA P150031 and relevant supplements; approved indications are model-specific.",
      "authorizationLabel": "FDA Vercise overview",
      "authorizationUrl": "https://www.fda.gov/medical-devices/recently-approved-devices/vercise-pc-vercise-gevia-and-vercise-genus-deep-brain-stimulation-systems-p150031s064",
      "interfaces": [
        "Other"
      ]
    }
  ],
  "56-nevro-company-brief": [
    {
      "name": "Senza HFX iQ",
      "stage": 4,
      "regulatory": "A",
      "evidenceUrl": "/devices/155-nevro-senza-hfx-iq-scs/",
      "notes": "FDA PMA P130022/S044; spinal cord stimulation clinical product.",
      "authorizationLabel": "FDA Senza HFX iQ approval P130022/S044",
      "authorizationUrl": "https://www.accessdata.fda.gov/scripts/cdrh/cfdocs/cfpma/pma.cfm?id=P130022S044",
      "interfaces": [
        "Other"
      ]
    }
  ],
  "57-saluda-medical-company-brief": [
    {
      "name": "Evoke SCS",
      "stage": 4,
      "regulatory": "A",
      "evidenceUrl": "/devices/156-saluda-evoke-closed-loop-scs/",
      "notes": "FDA PMA P190002; clinical spinal cord stimulation system.",
      "authorizationLabel": "FDA Evoke approval P190002",
      "authorizationUrl": "https://www.accessdata.fda.gov/scripts/cdrh/cfdocs/cfpma/pma.cfm?id=P190002",
      "interfaces": [
        "Other"
      ]
    }
  ],
  "58-inspire-medical-systems-company-brief": [
    {
      "name": "Inspire upper-airway stimulation",
      "stage": 4,
      "regulatory": "A",
      "evidenceUrl": "/devices/158-inspire-upper-airway-stimulation/",
      "notes": "FDA PMA P130008 and relevant supplements; obstructive sleep apnea indications.",
      "authorizationLabel": "FDA Inspire approval overview",
      "authorizationUrl": "https://www.fda.gov/medical-devices/recently-approved-devices/inspire-upper-airway-stimulation-p130008s090",
      "interfaces": [
        "Peripheral nerve"
      ]
    }
  ],
  "59-setpoint-medical-company-brief": [
    {
      "name": "SetPoint System",
      "stage": 4,
      "regulatory": "A",
      "evidenceUrl": "/devices/159-setpoint-vagus-nerve-stimulation-ra/",
      "notes": "FDA PMA P240039; specified rheumatoid-arthritis indication, not every autoimmune disease.",
      "authorizationLabel": "FDA SetPoint approval P240039",
      "authorizationUrl": "https://www.accessdata.fda.gov/scripts/cdrh/cfdocs/cfpma/pma.cfm?id=P240039",
      "interfaces": [
        "Peripheral nerve"
      ]
    }
  ],
  "60-axonics-company-brief": [
    {
      "name": "Axonics sacral neuromodulation",
      "stage": 4,
      "regulatory": "A",
      "evidenceUrl": "/devices/160-axonics-sacral-neuromodulation/",
      "notes": "FDA PMA P190006 for fecal incontinence; a different PMA covers urinary indications.",
      "authorizationLabel": "FDA Axonics approval P190006",
      "authorizationUrl": "https://www.accessdata.fda.gov/scripts/cdrh/cfdocs/cfpma/pma.cfm?id=P190006",
      "interfaces": [
        "Peripheral nerve"
      ]
    }
  ],
  "61-neuros-medical-company-brief": [
    {
      "name": "Altius nerve stimulation",
      "stage": 4,
      "regulatory": "A",
      "evidenceUrl": "/devices/162-neuros-altius-hfac-nerve-block/",
      "notes": "FDA PMA P230020; post-amputation phantom and residual limb pain.",
      "authorizationLabel": "FDA Altius approval overview",
      "authorizationUrl": "https://www.fda.gov/medical-devices/recently-approved-devices/altius-direct-electrical-nerve-stimulation-system-p230020",
      "interfaces": [
        "Peripheral nerve"
      ]
    }
  ],
  "62-bluewind-medical-company-brief": [
    {
      "name": "Revi tibial neuromodulation (2024)",
      "stage": 4,
      "regulatory": "K",
      "evidenceUrl": "/devices/163-bluewind-revi-tibial-neuromodulation/",
      "notes": "FDA 510(k) K240037 for this configuration; original Revi authorization used De Novo DEN220073.",
      "authorizationLabel": "FDA Revi clearance K240037",
      "authorizationUrl": "https://www.accessdata.fda.gov/scripts/cdrh/cfdocs/cfpmn/pmn.cfm?ID=K240037",
      "interfaces": [
        "Peripheral nerve"
      ]
    },
    {
      "name": "Original Revi De Novo configuration",
      "stage": 4,
      "regulatory": "A",
      "evidenceUrl": "/devices/163-bluewind-revi-tibial-neuromodulation/",
      "notes": "FDA De Novo marketing authorization, not PMA approval. The 2024 configuration uses 510(k) clearance.",
      "authorizationLabel": "FDA De Novo DEN220073",
      "authorizationUrl": "https://www.accessdata.fda.gov/scripts/cdrh/cfdocs/cfpmn/denovo.cfm?id=DEN220073",
      "interfaces": [
        "Peripheral nerve"
      ]
    }
  ],
  "63-spr-therapeutics-company-brief": [
    {
      "name": "SPRINT PNS",
      "stage": 4,
      "regulatory": "K",
      "evidenceUrl": "/devices/164-spr-sprint-percutaneous-pns/",
      "notes": "FDA 510(k) K223306; temporary percutaneous peripheral nerve stimulation.",
      "authorizationLabel": "FDA SPRINT clearance K223306",
      "authorizationUrl": "https://www.accessdata.fda.gov/scripts/cdrh/cfdocs/cfpmn/pmn.cfm?ID=K223306",
      "interfaces": [
        "Peripheral nerve"
      ]
    }
  ],
  "64-onward-medical-company-brief": [
    {
      "name": "ARC-IM implantable spinal stimulation",
      "stage": 3,
      "regulatory": "R",
      "evidenceUrl": "/devices/167-onward-arc-im-implantable-spinal-stimulation/",
      "notes": "Investigational implanted system; do not transfer authorization from the separate ARC-EX external device.",
      "interfaces": [
        "Other"
      ]
    }
  ],
  "65-med-el-company-brief": [
    {
      "name": "SYNCHRONY 2 cochlear implant",
      "stage": 4,
      "regulatory": "A",
      "evidenceUrl": "/devices/168-med-el-cochlear-implant-system/",
      "notes": "FDA PMA P000025/S110; later indication expansions have their own supplements.",
      "authorizationLabel": "FDA SYNCHRONY 2 approval P000025/S110",
      "authorizationUrl": "https://www.accessdata.fda.gov/scripts/cdrh/cfdocs/cfpma/pma.cfm?id=P000025S110",
      "interfaces": [
        "Other"
      ]
    }
  ],
  "66-advanced-bionics-company-brief": [
    {
      "name": "HiRes Ultra 3D cochlear implant",
      "stage": 4,
      "regulatory": "A",
      "evidenceUrl": "/devices/169-advanced-bionics-hires-ultra-3d-cochlear-implant/",
      "notes": "FDA PMA P960058/S129; regulatory authorization does not imply the absence of recalls or device failures.",
      "authorizationLabel": "FDA HiRes Ultra 3D approval P960058/S129",
      "authorizationUrl": "https://www.accessdata.fda.gov/scripts/cdrh/cfdocs/cfpma/pma.cfm?id=P960058S129",
      "interfaces": [
        "Other"
      ]
    }
  ],
  "67-nalu-medical-company-brief": [
    {
      "name": "Nalu peripheral neurostimulation",
      "stage": 4,
      "regulatory": "K",
      "evidenceUrl": "/devices/172-nalu-neurostimulation-system-pns/",
      "notes": "FDA 510(k) K232415; scope is peripheral nerve stimulation, not every Nalu configuration.",
      "authorizationLabel": "FDA Nalu clearance K232415",
      "authorizationUrl": "https://www.accessdata.fda.gov/scripts/cdrh/cfdocs/cfpmn/pmn.cfm?ID=K232415",
      "interfaces": [
        "Peripheral nerve"
      ]
    }
  ],
  "68-bioness-company-brief": [
    {
      "name": "StimRouter neuromodulation",
      "stage": 4,
      "regulatory": "K",
      "evidenceUrl": "/devices/173-bioness-stimrouter-pns/",
      "notes": "FDA 510(k) K211965; peripheral nerve pain indication.",
      "authorizationLabel": "FDA StimRouter clearance K211965",
      "authorizationUrl": "https://www.accessdata.fda.gov/scripts/cdrh/cfdocs/cfpmn/pmn.cfm?ID=K211965",
      "interfaces": [
        "Peripheral nerve"
      ]
    }
  ],
  "69-motif-neurotech-company-brief": [
    {
      "name": "DOT / XCS clinical research",
      "stage": 3,
      "regulatory": "R",
      "evidenceUrl": "/devices/175-motif-dot-magnetoelectric-brain-stimulator/",
      "notes": "Acute human proof of concept and an investigational XCS trial; trial permission is not market approval.",
      "interfaces": [
        "Other"
      ]
    }
  ],
  "70-shenfu-jianxing-company-brief": [
    {
      "name": "Brain-spine interface research",
      "stage": 3,
      "regulatory": "R",
      "evidenceUrl": "/devices/182-shenfu-jianxing-brain-spine-interface-fudan/",
      "notes": "Human investigator-initiated study; a reported Breakthrough pathway is not market approval.",
      "interfaces": [
        "Other"
      ]
    }
  ],
  "71-mindtrix-company-brief": [
    {
      "name": "Visual-cortex stimulation proof of concept",
      "stage": 3,
      "regulatory": "R",
      "evidenceUrl": "/devices/183-mindtrix-cortical-visual-reconstruction-system/",
      "notes": "Human result used temporary therapeutic electrodes during epilepsy care; the company implant itself was not established as the study hardware.",
      "interfaces": [
        "Cortical surface"
      ]
    }
  ],
  "72-zhiran-medical-company-brief": [
    {
      "name": "Flexible BCI / LEAP",
      "stage": 3,
      "regulatory": "R",
      "evidenceUrl": "/devices/184-zhiran-ultra-100-channel-flexible-bci-leap/",
      "notes": "Human implant and multicenter trial; patents are not regulatory approval.",
      "interfaces": [
        "Intracortical"
      ]
    }
  ],
  "73-tianjin-rongyuan-company-brief": [
    {
      "name": "Endovascular BCI pilot",
      "stage": 3,
      "regulatory": "R",
      "evidenceUrl": "/devices/189-nankai-rongyuan-interventional-bci/",
      "notes": "Human pilot described by institutional and registry sources; separate from Synchron Stentrode.",
      "interfaces": [
        "Endovascular"
      ]
    }
  ],
  "74-zhejiang-norkang-company-brief": [
    {
      "name": "WH-01A auditory brainstem implant",
      "stage": 3,
      "regulatory": "R",
      "evidenceUrl": "/devices/190-nurotron-wh-01a-auditory-brainstem-implant/",
      "notes": "Human study and phase III registry; innovative-device review is not market authorization.",
      "interfaces": [
        "Other"
      ]
    }
  ],
  "75-fudan-university-neural-interface-groups": [
    {
      "name": "Fudan ECoG array, fiber electrode and brain-spine research",
      "stage": 2,
      "regulatory": "R",
      "evidenceUrl": "/devices/198-fudan-mnis-silicon-transistor-multimodal-ecog/",
      "notes": "Rat studies for the array and fiber electrode; the brain-spine interface is covered by its own sheet and the Shenfu Jianxing brief.",
      "interfaces": [
        "Cortical surface"
      ]
    }
  ],
  "76-northwestern-rogers-research-group": [
    {
      "name": "Flexible, injectable and bioresorbable neural electronics",
      "stage": 2,
      "regulatory": "R",
      "evidenceUrl": "/devices/30-injectable-micro-iled-optoelectronics/",
      "notes": "Academic research devices; animal and acute studies on the cataloged sheets.",
      "interfaces": [
        "Cortical surface"
      ]
    }
  ],
  "77-hhmi-janelia-neuropixels-program": [
    {
      "name": "Neuropixels collaboration probes",
      "stage": 2,
      "regulatory": "R",
      "evidenceUrl": "/devices/04-neuropixels-probe/",
      "notes": "Research probes used in animal electrophysiology; manufacturing and sales are by imec.",
      "interfaces": [
        "Intracortical"
      ]
    }
  ],
  "78-uc-davis-brandman-stavisky-group": [
    {
      "name": "Intracortical speech neuroprosthesis (BrainGate2)",
      "stage": 3,
      "regulatory": "R",
      "evidenceUrl": "/applications/152-uc-davis-speech-neuroprosthesis-als-2024/",
      "notes": "Investigational clinical study in one participant; no marketing authorization.",
      "interfaces": [
        "Intracortical"
      ]
    }
  ]
};
