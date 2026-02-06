---
title: "Blackrock Neurotech (company brief)"
order: 4
pubDate: 2026-02-02
updatedDate: 2026-02-02
description: "Blackrock Neurotech’s Utah Array / NeuroPort ecosystem and clinical ambitions (MoveAgain): what it is, why it matters, and what’s public about the company."
region: "American"
kind: "Company"
website: "https://blackrockneurotech.com/"
location: "Salt Lake City, UT, USA"
lat: 40.7608
lon: -111.891
tags: ["BCI", "implant", "intracortical", "Utah Array", "Blackrock Neurotech"]
draft: false
---
Blackrock Neurotech is one of the longest-running infrastructure companies in invasive BCI: it supplies **implantable electrode arrays** and a **recording ecosystem** that has been used across a large fraction of academic human BCI work. Their core legacy technology is the **Utah Array** (also called the **NeuroPort Electrode**) and a family of headstages, amplifiers, and software.

This brief emphasizes the tech stack and what’s been demonstrated in peer‑reviewed literature, while being careful about private-company “stats.”

## At a glance

- **Website:** <https://blackrockneurotech.com/>
- **Headquarters (public listing):** Salt Lake City, Utah (LinkedIn).
  - LinkedIn: <https://www.linkedin.com/company/blackrock-neurotech/>
- **Employees (best-effort public signal):** LinkedIn lists company size **51–200 employees** and shows “discover all **178 employees**” at time of access (approximate; not audited).
  - <https://www.linkedin.com/company/blackrock-neurotech/>
- **Company type:** privately held (LinkedIn).
- **Revenue:** not publicly disclosed (private company).

## The technology: what Blackrock actually sells/builds

Blackrock describes itself as a full “ecosystem,” not a single implant:
- implantable electrodes (Utah Array / NeuroPort Electrode)
- headstages / front-end acquisition
- neural signal processing hardware
- software/tools

- Company overview (Our Tech): <https://blackrockneurotech.com/our-tech/>

### 1) Utah Array (intracortical microelectrode array)
The Utah Array is a rigid, 3D microelectrode array classically used for **single-unit and multiunit recordings** from cortex.

Blackrock claims:
- implanted in humans since 2004
- “nearly all BCIs implanted in humans have used Blackrock’s technology—specifically the Utah Array” (this is a strong claim; treat as company marketing language)

- Blackrock “Our Tech”: <https://blackrockneurotech.com/our-tech/>

Background reference (device class overview):
- Microelectrode arrays / Utah array discussion: <https://en.wikipedia.org/wiki/Utah_array>

### 2) Research-to-clinic bridge: MoveAgain
Blackrock presents **MoveAgain** as its first device designed for clinical use.

- Blackrock homepage (MoveAgain mention): <https://blackrockneurotech.com/>
- Blackrock “Our Tech” (MoveAgain + FDA Breakthrough Designation claim): <https://blackrockneurotech.com/our-tech/>

(For “Breakthrough Device” details, we should later link the FDA database entry if we want to state it with maximum rigor; the company page is a start.)

## What has been demonstrated (peer‑reviewed examples that intersect Blackrock’s platform)

A lot of famous “human BCI” papers are consortia-driven (BrainGate, UCSF, etc.) and may use Blackrock-manufactured arrays and recording hardware. The goal here is not to claim every result is “by Blackrock,” but to anchor what this class of technology can enable.

### Decoding attempted speech into words/sentences (NEJM, 2021)
A well-known demonstration of decoding attempted speech used cortical recordings and deep-learning + language-model decoding.

- Moses et al., *New England Journal of Medicine* (2021): “Neuroprosthesis for Decoding Speech in a Paralyzed Person with Anarthria.”
  - PubMed: <https://pubmed.ncbi.nlm.nih.gov/34260835/>
  - PMCID (free full text): <https://pmc.ncbi.nlm.nih.gov/articles/PMC8972947/>

### High-bandwidth wireless intracortical recording used at home (Brown, 2021)
Brown University reported the first human use of a high-bandwidth wireless BCI system at home, and notes a licensing agreement with Blackrock Microsystems for making the device available to researchers.

- Brown University news: <https://www.brown.edu/news/2021-03-31/braingate-wireless>

### Evoked visual percepts with a 96‑channel intracortical array (JCI, 2021)
An example of what intracortical stimulation/recording arrays can enable is artificial vision work using a 96‑channel intracortical microelectrode array.

- Fernández et al., *J Clin Invest* (2021): “Visual percepts evoked with an intracortical 96‑channel microelectrode array inserted in human occipital cortex.”
  - DOI: <https://doi.org/10.1172/JCI151331>
  - Article: <https://www.jci.org/articles/view/151331>

## What they’re doing recently (public signals)

Blackrock’s own public messaging emphasizes:
- long duration of human implant experience (years of studies; many implanted-days)
- broad research-customer base
- a push toward clinical products (MoveAgain)

- Blackrock homepage: <https://blackrockneurotech.com/>
- “Our Tech”: <https://blackrockneurotech.com/our-tech/>
- “Our Story” timeline (links to specific publications and milestones): <https://blackrockneurotech.com/our-story/>

## Key questions to watch

1) **Longevity and signal stability**
Utah Arrays have a long track record, but chronic stability (unit yield vs time, encapsulation, connector reliability) remains a central engineering constraint.

2) **Surgical burden and infection risk**
Historically, many Utah Array deployments used percutaneous connectors. Clinical systems tend to require fully implanted telemetry/power solutions.

3) **Scaling beyond ~100 channels**
Utah Array classically means ~100 electrodes per array. The path to richer control often requires either multiple arrays or different electrode technologies.

4) **Clinical commercialization**
The hardest step is turning research performance into a product: training burden, calibration drift, support model, and regulatory requirements.

---

### Notes on sourcing
- Company metrics (HQ, employee counts) are taken from LinkedIn and treated as approximate.
- For technical credibility, I cited peer‑reviewed examples and university reporting, rather than only company marketing.
