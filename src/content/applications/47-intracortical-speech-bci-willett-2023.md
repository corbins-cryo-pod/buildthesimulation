---
title: "Intracortical speech BCI (Willett, 2023)"
order: 47
pubDate: 2026-10-06
updatedDate: 2026-10-06
application_id: "BTSD-ACAD-0026"
interface_class: "intracortical"
status: "human"
last_updated: 2026-10-06
description: "A speech-to-text BCI recording spiking activity from four intracortical microelectrode arrays in a participant with ALS: 62 words per minute and a 23.8% word error rate on a 125,000-word vocabulary. Willett et al., Nature, August 2023."
modality: "Intracortical"
successRank: 47
website: "https://www.nature.com/articles/s41586-023-06377-x"
tags: ["speech", "intracortical", "ALS", "BrainGate2", "large vocabulary", "microelectrode array", "academic", "human"]
devices: []
orgs: ["13-braingate-consortium-lab-brief"]
draft: false
---

# Intracortical speech BCI (Willett, 2023)

> *One-line verdict:* The penetrating-array counterpart to the surface-array UCSF speech work published the same day. It shows large-vocabulary decoding from a small patch of cortex.

*Quick tags:* Recording · Intracortical · Human · Published 23 August 2023 (Nature)

---

### Overview

*What it is:* A speech-to-text BCI that records spiking activity from intracortical microelectrode arrays. The participant, T12, is in the BrainGate2 pilot clinical trial and has bulbar-onset ALS. The participant keeps some orofacial movement and can vocalize but cannot produce intelligible speech.

*Array placement:* Four microelectrode arrays, two in area 6v (ventral premotor cortex) and two in area 44 (part of Broca's area). Locations were chosen with the Human Connectome Project multimodal cortical parcellation. The paper gives the 6v arrays as 3.2 x 3.2 mm each.

*Decoding:* A five-layer recurrent network converts neural activity to phoneme probabilities, which a 125,000-word trigram language model turns into sentences.

*Results (as reported):* 9.1% word error rate on a 50-word vocabulary, 2.7 times fewer errors than the previous state-of-the-art speech BCI. 23.8% on a 125,000-word vocabulary, which the authors call the first successful demonstration of large-vocabulary decoding. Decoding ran at 62 words per minute, 3.4 times the previous record, against about 160 for natural conversation.

*Neural findings:* Tuning to speech articulators is spatially intermixed, so accurate decoding is possible from only a small region of cortex. A detailed articulatory representation of phonemes persists years after paralysis.

*Limits:* One participant.

---

### Spec Card Grid

### Identity
- *Paper:* "A high-performance speech neuroprosthesis," Nature, 23 August 2023, open access
- *Trial:* BrainGate2 pilot clinical trial; participant T12

### Architecture
- *Arrays:* four intracortical microelectrode arrays, two in area 6v and two in area 44
- *Decoder:* five-layer GRU network plus 125,000-word language model

### Results
- *50-word vocabulary:* 9.1% word error rate
- *125,000-word vocabulary:* 23.8% word error rate
- *Rate:* 62 words per minute

### Evidence and limits
- *Arrays (preprint methods):* four 64-channel, 1.5 mm silicon microelectrode arrays coated with sputtered iridium oxide, Blackrock Microsystems. This is a 64-channel build, so it is not linked to the 96-channel Utah array entry
- *Not covered here:* the published Nature methods were not read for this entry; no 3D model yet
- *Compare with:* the surface-array [UCSF speech work](/applications/46-ucsf-speech-neuroprosthesis-2023/)

---

### References
- Willett FR, Kunz EM, Fan C, et al. *A high-performance speech neuroprosthesis.* Nature, 23 Aug 2023. <https://www.nature.com/articles/s41586-023-06377-x>
- Willett FR, et al. *A high-performance speech neuroprosthesis.* bioRxiv preprint, methods section. <https://www.biorxiv.org/content/10.1101/2023.01.21.524489v2.full>
