---
title: "Science Corporation (company brief)"
order: 6
pubDate: 2026-02-02
updatedDate: 2026-10-17
lastVerified: 2026-10-17
description: "Science Corporation’s BCI work with an emphasis on its biohybrid neural interface concept (neurons-as-the-interface), plus its PRIMA retinal prosthesis program."
region: "American"
kind: "Company"
sizeRank: 6
website: "https://science.xyz/"
location: "Alameda, CA, USA"
lat: 37.7652
lon: -122.2416
tags: ["BCI", "biohybrid", "neural interface", "Science Corporation", "PRIMA", "retinal prosthesis"]
draft: false
---
Science Corporation is building neurotechnology with an unusually explicit thesis: *if electrodes don’t scale because they damage tissue, try scaling with biology*.

They are best known publicly for two efforts:
1) *PRIMA*, a subretinal photovoltaic visual prosthesis program in clinical studies.
2) A *biohybrid brain interface* concept where *living neurons* are embedded in a device and then *engrafted* so that *their axons/dendrites grow into the brain*, potentially creating enormous connection density without “putting wires into a brain.”

### At a glance

- *Website:* <https://science.xyz/>
- *Company overview:* <https://science.xyz/company/>
- *HQ (company statement):* Alameda, California.
  - Science says it has secondary offices in Research Triangle Park (NC) and Paris (France).
  - <https://science.xyz/company/>
- *Clinical posture:* Science describes itself as a clinical-stage medical technology company with “dozens of patients in six countries” enrolled in ongoing clinical studies.
  - <https://science.xyz/company/>

### The big idea: biohybrid neural interfaces (neurons as the interface)

### The scaling bottleneck they’re attacking
Science’s biohybrid writeup frames a core constraint in invasive BCI as a scaling law: *to get physically close to neurons, you destroy some brain tissue*, and that becomes an ugly trade when you try to scale to very large numbers of “channels.”

- “Biohybrid neural interfaces” essay: <https://science.xyz/news/biohybrid-neural-interfaces/>

### What they mean by “biohybrid”
In Science’s version, the cell/device interface is created *in vitro*:
- *Stem cell–derived neurons* are engineered and embedded in an electronic device in the lab.
- The device is implanted so that *only the processes (axons/dendrites)* grow out into the brain.
- The *cell bodies stay with the device*, which they argue helps with SNR, power, and enables new types of stimulation concepts (e.g., neuron types / synaptic chemistry).

- Science’s essay (high-level concept): <https://science.xyz/news/biohybrid-neural-interfaces/>

### “Channels” vs synapses (why they think this could be different)
Science pushes a reframing: don’t count electrodes; count potential synapses.

On their biohybrid tech page, they argue (conceptually) that:
- neurons are denser than electrodes
- each neuron can form many connections
- “a million embedded neurons could form a billion synapses” with brain tissue

- Science biohybrid technology page: <https://science.xyz/technologies/biohybrid/>

They cite a scaling dataset as context:
- Stevenson Lab scaling reference linked by Science: <https://stevenson.lab.uconn.edu/scaling/>

### Proof-of-concept: optogenetic stimulation via an engrafted cortical “waffle” (mouse study)
Science released an early feasibility result showing that a *cortical biohybrid implant can transmit information into the brain* strongly enough to shape behavior.

Core design (as described in both Science’s post and IEEE Spectrum’s coverage):
- a *waffle-like* scaffold of *microwells* placed on the cortical surface
- neurons are loaded into microwells (aiming for ~one neuron per well)
- neurons survive and extend into superficial cortex
- optical stimulation (“turning on” graft neurons) can be used as a cue that mice learn to report

Primary source:
- Zappitelli et al. (bioRxiv, 2024): “Optogenetic stimulation of a cortical biohybrid implant guides goal directed behavior.”
  - DOI: <https://doi.org/10.1101/2024.11.22.624907>
  - Full text: <https://www.biorxiv.org/content/10.1101/2024.11.22.624907v1.full>

Independent coverage with helpful engineering details:
- IEEE Spectrum (Jun 4, 2025): “Science Corp's Biohybrid BCI Adds Neurons to the Brain.”
  - <https://spectrum.ieee.org/brain-computer-interface-2671151260>

### The hard problems (they openly acknowledge)
Science’s own essay is refreshingly explicit that biohybrid BCIs are low “technology readiness” and require solving tough bioengineering:
- immune compatibility (autologous vs allogeneic, “hypoimmunogenic” lines)
- keeping graft cells alive through hypoxia, glycemic shock, and host responses
- device design that supports neuron survival (including glial support)

- Science essay (technical challenges): <https://science.xyz/news/biohybrid-neural-interfaces/>

### What else they’re building: PRIMA visual prosthesis (clinical program)

Science’s most advanced clinical program appears to be PRIMA, a subretinal implant intended to stimulate remaining retinal circuitry when photoreceptors are lost in advanced retinal degeneration.

Science describes PRIMA as:
- a *light-powered subretinal implant* with *378 pixels*
- paired with *glasses* containing an infrared projector + camera that provide both *power and data* via patterned IR light
- being evaluated in clinical studies (Europe and US trials listed)

- PRIMA overview page: <https://science.xyz/technologies/prima/>

The PRIMA page also links peer-reviewed and trial references (e.g., PubMed-linked items and NCT IDs).

### My read (why it’s exciting)

Science’s biohybrid pitch is one of the few that feels like it’s attacking the *geometry* and *biology* of the interface, not just the electronics:
- If you can get stable, high-density connectivity via living processes, you potentially change the scaling laws.
- It also makes the interface problem less like “a bundle of wires” and more like “a grafted microcircuit,” which could open novel stimulation/learning paradigms.

But the credibility hinge is the same as always: can they make it *reliable, safe, manufacturable*, and ultimately *clinically supportable*?

---

### 2026 update (reviewed Oct 4, 2026)

- *PRIMA in Europe (Jul 22, 2026):* PRIMA received a CE mark and Science announced its European commercial launch for geographic atrophy from age-related macular degeneration; US FDA approval process is underway and PRIMA holds two FDA Humanitarian Use Device designations. Sources: <https://science.xyz/news/ce-mark/> and <https://science.xyz/news/hud-designation/>
- *Leadership (Sep 17, 2026):* Darius Shahida, previously Chief Strategy Officer, was named President. Source: <https://investor.wedbush.com/wedbush/article/bizwire-2026-9-17-science-corporation-names-darius-shahida-as-president>
- Pixium Vision, mentioned in older coverage, is now part of Science (per Science press materials).
- *PRIMA 36-month results (Oct 5, 2026, company press release):* Science reported 36-month follow-up from the PRIMAvera trial (NCT04676854), presented at the 26th EURETINA Congress in Vienna by Mahi Muqit (Moorfields Eye Hospital). Per the release: 38 patients implanted at 17 sites in five European countries; 27 evaluable for safety and 18 for efficacy at 36 months; mean gain of 29 ETDRS letters (24.5 at 12 months); 14 of 18 (78%) gained at least 15 letters; no new safety signal between months 12 and 36. The release states PRIMA is commercially available in Europe and the UK and pending FDA approval. The 36-month averages cover 18 of 38 implanted patients, and Inside BCI notes the data are not yet peer reviewed and that Science has not said which glasses setting the 36-month figure uses. Sources: <https://science.xyz/news/long-term-prima-results/> (company) and <https://insidebci.com/news/2026-10-06-science-corp-prima-36-month-results-durable-vision-geographic-atrophy-euretina/> (secondary)

### Oct 13, 2026 update: first Stargardt patient (reviewed Oct 17, 2026)

- *First Stargardt patient (Oct 13, 2026, company update):* Science reported that its first patient with Stargardt disease received the PRIMA implant in *May 2026* in the PRIMAlia trial (NCT07266584) at Sydney Eye Hospital under Dr. Matthew Simunovic. Per the company, during his first rehabilitation session he saw a letter, and during his second session he read a word (single patient, company-reported, not peer reviewed). TechCrunch covered the announcement the same day from TechCrunch Disrupt, where CEO Max Hodak said a next-generation PRIMA implant is being worked on that he expects "in humans in the next year" (his statement). Sources: <https://science.xyz/news/stargardt-first-rehab/> (company) and <https://techcrunch.com/2026/10/13/science-corporation-implants-its-vision-restoring-chip-in-its-first-stargardt-disease-patient/> (secondary)

### Device entries

- [Science PRIMA subretinal photovoltaic implant](/devices/177-science-prima-subretinal-photovoltaic-implant/)
