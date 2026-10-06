---
title: "Speech neuroprosthesis for anarthria (Moses, 2021)"
order: 51
pubDate: 2026-10-06
updatedDate: 2026-10-06
device_id: "BTSD-ACAD-0030"
interface_class: "ecog"
status: "human"
last_updated: 2026-10-06
description: "A 128-electrode high-density ECoG array on the speech cortex of a person with anarthria after a brainstem stroke, decoding a 50-word vocabulary into sentences in real time at 15.2 words per minute. NEJM, 2021."
modality: "Cortical surface"
successRank: 51
website: "https://www.nejm.org/doi/full/10.1056/NEJMoa2027540"
tags: ["speech", "ECoG", "anarthria", "brainstem stroke", "percutaneous connector", "128 electrodes", "academic", "human"]
draft: false
---

# Speech neuroprosthesis for anarthria (Moses, 2021)

> *One-line verdict:* A surface-array speech decoder. Slow and limited to 50 words, but with signals that stayed stable over 81 weeks.

*Quick tags:* Recording · Cortical surface · Human · NEJM 2021 (385:217-227)

---

### Overview

*What it is:* A neuroprosthesis for decoding speech in a paralyzed person with anarthria (loss of the ability to articulate speech) and spastic quadriparesis from a brainstem stroke. It uses electrocorticography with custom decoding techniques. An FDA investigational device exemption covered the device.

*Hardware:* A customized combination of a high-density ECoG electrode array (manufactured by PMT) and a percutaneous connector (manufactured by Blackrock Microsystems). The rectangular array is 6.7 cm long, 3.5 cm wide and 0.51 mm thick, with 128 flat disk-shaped electrodes. It lies on the pial surface in the subdural space, covering several speech-related cortical regions. The connector passes signals through the skin to a detachable digital link and cable, so this is a wired system.

*Study:* Over 48 sessions, 22 hours of cortical activity were recorded as the participant attempted to say individual words from a 50-word vocabulary. The isolated-word task had 9,800 trials.

*Results (as reported):* Sentences were decoded in real time at a median 15.2 words per minute, with a median word error rate of 25.6% using a language model (60.5% without one). The lowest word error rate for a single sentence block was 7.0%. In post hoc analyses, 98% of attempts to produce individual words were detected, and words were classified with 47.1% accuracy using cortical signals that were stable throughout the 81-week study period.

*Limits:* One participant, a 50-word vocabulary, and a percutaneous connector.

---

### Spec Card Grid

### Identity
- *Paper:* "Neuroprosthesis for decoding speech in a paralyzed person with anarthria," N Engl J Med 2021;385:217-227
- *Participant:* one person with brainstem stroke

### Architecture
- *Array:* 128 electrodes, 6.7 cm by 3.5 cm by 0.51 mm, subdural, made by PMT
- *Connector:* percutaneous, Blackrock Microsystems
- *Vocabulary:* 50 words

### Results
- *Real-time sentences:* median 15.2 words per minute, 25.6% word error rate with language model
- *Stability:* signals stable across the 81-week study period

### Evidence and limits
- *Not covered here:* electrode diameter and pitch; no 3D model yet
- *Related:* the [2023 surface-array speech neuroprosthesis](/devices/46-ucsf-speech-neuroprosthesis-2023/) entry

---

### References
- Moses DA, Metzger SL, Liu JR, et al. *Neuroprosthesis for decoding speech in a paralyzed person with anarthria.* N Engl J Med. 2021;385:217-227. <https://www.nejm.org/doi/full/10.1056/NEJMoa2027540>
