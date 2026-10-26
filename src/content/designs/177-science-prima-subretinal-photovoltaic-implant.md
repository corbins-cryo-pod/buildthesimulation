---
title: "Science PRIMA subretinal photovoltaic implant"
order: 177
pubDate: 2026-10-08
updatedDate: 2026-10-25
device_id: "BTSD-STUP-0004"
interface_class: "retinal"
status: "human"
last_updated: 2026-10-25
description: "Subretinal 378-pixel photovoltaic implant with near-infrared camera glasses for geographic atrophy, with a 38-participant European study published in NEJM in October 2025."
modality: "Other"
website: "https://pmc.ncbi.nlm.nih.gov/articles/PMC7618305/"
axis: ["retina"]
function: ["stimulation"]
regulatory: "ce-marked"
origin: "US"
tags: ["Science Corporation", "retinal prosthesis"]
draft: false
---

# Science PRIMA subretinal photovoltaic implant

PRIMA is a 2 x 2 mm, 30 um thick silicon implant of 378 photovoltaic pixels placed under the retina and driven by 880 nm light from camera glasses. Clinical evidence, engineering publications and company-reported regulatory updates are identified separately below.

Company brief: [Science Corporation](/companies/06-science-corporation-company-brief/).

Interactive research model: [Retina Laboratory: PRIMA](/simulations/retinal-implant/?technology=photovoltaic) · [model assumptions and verification](/simulations/retinal-implant/prima/methods/). The laboratory uses an idealized array and reduced device equations; it is not a manufacturer-calibrated digital twin.

## Identity

| Field | Value and source scope |
| --- | --- |
| Device | Science Corporation PRIMA system: subretinal photovoltaic implant, glasses with camera and near-infrared projector, and a pocket processor [1] |
| Manufacturer | Science Corporation, Alameda, California [1][2] |
| Interface class | Subretinal photovoltaic retinal prosthesis, wirelessly activated by light [1] |
| Origin | Company device; the paper reports a multicenter study at 17 sites in 5 European countries [1] |
| First demonstrated | Feasibility trial in five participants: three reliably recognized letter sequences, with acuity near the 20/420 limit set by the 100 um pixels; mean 20/135 with magnification at 4 years in the three-participant acuity follow-up (reference 21 of the paper) [1] |
| First human implant | First-in-human feasibility trial of PRIMA in five participants with geographic atrophy, preceding PRIMAvera; implant date not stated in the paper text read [1] |
| Species studied | Human [1] |
| Regulatory status | CE marked under the EU Medical Device Regulation (DEKRA), commercial launch in Europe announced July 22, 2026, and later reported available in the UK; US: FDA review pending, with Breakthrough Device and Humanitarian Use Device designations. All company-reported [3][4]. The pivotal trial in the NEJM paper was investigational [1][2] |
| Function | Restores central vision in geographic atrophy due to age-related macular degeneration [1] |
| Target tissue | Subretinal space under the atrophic lesion [1] |

## Geometry and architecture

| Field | Value and source scope |
| --- | --- |
| Interface type | Crystalline silicon array implanted subretinally within the atrophic lesion [1] |
| Array layout | 378 photovoltaic pixels, each 100 um [1] |
| Electrode count | 378 photovoltaic pixels, each with a central active electrode; the surrounding returns form a connected mesh. Pixel count is not the total number of independent electrical terminals [1][5] |
| Pitch | Pixel size 100 um (pitch not separately stated in the text read) [1] |
| Electrode lengths |  |
| Shank width and thickness | Implant 2 x 2 mm wide and 30 um thick [1] |
| Tip and exposed site geometry |  |
| Contact coating |  |
| Insulation |  |
| Insertion method | Subretinal implantation through vitrectomy and a retinal bleb with retinotomy, placed within the atrophic lesion. The paper notes advanced intraoperative imaging could help [1] |
| Anchoring and fixation |  |

## Electrode and channel physics

| Field | Value and source scope |
| --- | --- |
| Exposed site area |  |
| Electrode material |  |
| Impedance (with measurement frequency) |  |
| Noise floor or SNR |  |
| Recording modality |  |
| Sampling rate |  |
| Stimulation capability | Each pixel contains two series photodiodes. Pulsed near-infrared illumination drives its electrode interfaces and tissue load; the principal intended target is surviving bipolar-cell circuitry [5][6] |
| Charge injection limit |  |
| Reference and ground | Connected circumferential return mesh around the pixels. Published modeling accounts for redistribution through the shared return [6] |

## Tissue interface and bioresponse

| Field | Value and source scope |
| --- | --- |
| Target tissue |  |
| Insertion trauma and BBB disruption |  |
| Vascular disruption risk |  |
| Micromotion sensitivity |  |
| Gliosis and encapsulation |  |
| Neuron loss near sites |  |
| Foreign-body response mitigation |  |
| Typical failure modes |  |

## System architecture

| Field | Value and source scope |
| --- | --- |
| Onboard electronics |  |
| Data path | A frame-mounted camera captures images; processed images are projected onto the implant with 880 nm near-infrared light [1] |
| Telemetry bandwidth |  |
| Sampling rate |  |
| Power | Implant pixels convert the near-infrared light into electrical current; no implanted battery [1] |
| Thermal management |  |
| Packaging and hermeticity |  |
| MRI compatibility |  |
| Surgical complexity |  |
| Output connectors |  |

## Performance envelope

| Field | Value and source scope |
| --- | --- |
| Acute yield |  |
| Chronic yield |  |
| Stability over time |  |
| Longevity |  |
| Revision and explant experience | No implants explanted in humans at the 12-month report; the authors note the wireless design allows replacement or tiling with next-generation chips [1] |
| Adverse events | PRIMAvera, 12 months: 26 device- or procedure-related serious adverse events in 19 participants. Per-event-category participant counts overlap and must not be summed as unique participants. No serious event was related to the device alone; 21 of 26 occurred within 2 months of surgery [1] |
| Notable demonstrations | Prosthetic visual acuity without zoom or image processing: mean logMAR 1.32 +/- 0.16 (Snellen 20/417), matching the sampling limit of the 100 um pixels. 30 of 32 participants had central perception at 12 months [1] |

## Clinical and preclinical evidence

| Field | Value and source scope |
| --- | --- |
| Human subjects | PRIMAvera: 38 participants implanted, 17 sites in 5 European countries; 32 reached 12 months; mean age 78.9; an earlier feasibility trial had 5 participants [1] |
| Preclinical cohort | The paper cites pre-clinical rat work on subretinal flat and pillar arrays and on retinal response to photovoltaic stimulation (its references 18 to 20); cohort sizes not read here [1] |
| Follow-up duration | 12 months [1] |
| Indications | Geographic atrophy from AMD, age 60 or older, visual acuity logMAR 1.2 or worse, fovea-involving atrophy larger than 2.4 mm [1] |
| Trials and registries | NCT04676854 PRIMAvera: open-label, baseline-controlled, single-arm, multicenter. Published online October 20, 2025; N Engl J Med 394(3):232-242, January 15, 2026 [1] |
| Primary outcomes | 26 of 32 (81.3%; 95% CI 63.56 to 92.79) improved visual acuity by at least logMAR 0.2 at 12 months; with glasses, mean improvement logMAR 0.49 (about 24.5 letters). Prosthetic acuity logMAR 1.32 (20/417), matching the 100 um pixel sampling limit [1] |
| Key limitations | Single-arm, open-label. 26 serious adverse events in 19 participants, 81% within the first two months. Three of the six who did not reach 12 months died. Mean atrophy area grew 8.5 mm2 in study eyes versus 2.5 mm2 in fellow eyes [1] |

## Engineering tradeoffs

| Field | Value and source scope |
| --- | --- |
| Strengths | Wireless optical delivery carries image information and power; local returns support spatial confinement. Transparent glasses permit concurrent use of remaining natural vision [5] |
| Limitations | Native retinal sampling and magnification-assisted reading are different measures. Field penetration depends on electrode geometry and separation from target neurons [1][6] |
| Scaling constraints | Smaller planar pixels restrict field penetration and require stronger drive under published model assumptions. Pillar-electrode successors are research designs; their predicted human acuity must not be assigned to the current flat PRIMA device [6] |

## Version boundary

The implant and glasses as used in the PRIMAvera trial.

## References

1. [Holz et al., subretinal photovoltaic implant (online October 2025; NEJM 394:232-242, January 2026)](https://pmc.ncbi.nlm.nih.gov/articles/PMC7618305/).
2. [Science Corporation release on the NEJM paper](https://science.xyz/news/new-england-journal-of-medicine-prima/).
3. [Science Corporation, European commercial launch and CE mark, July 22, 2026](https://science.xyz/news/ce-mark/).
4. [Science Corporation, 36-month PRIMAvera results, October 5, 2026](https://science.xyz/news/long-term-prima-results/).
5. [Palanker et al., simultaneous perception of prosthetic and natural vision, Nature Communications 2022](https://www.nature.com/articles/s41467-022-28125-x).
6. [Jensen et al., maximizing the fidelity of a photovoltaic subretinal prosthesis, Journal of Neural Engineering 2026](https://doi.org/10.1088/1741-2552/ae6d77).
