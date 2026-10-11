---
title: "Blackrock Neurotech (company brief)"
order: 4
pubDate: 2026-02-02
updatedDate: 2026-10-11
lastVerified: 2026-10-04
description: "Blackrock Neurotech’s Utah Array / NeuroPort ecosystem and clinical ambitions (MoveAgain): what it is, why it matters, and what’s public about the company."
region: "American"
kind: "Company"
sizeRank: 2
website: "https://blackrockneurotech.com/"
location: "Salt Lake City, UT, USA"
lat: 40.7608
lon: -111.891
tags: ["BCI", "implant", "intracortical", "Utah Array", "Blackrock Neurotech"]
draft: false
---
Blackrock Neurotech is one of the longest-running infrastructure companies in invasive BCI: it supplies *implantable electrode arrays* and a *recording ecosystem* that has been used across a large fraction of academic human BCI work. Their core legacy technology is the *Utah Array* (also called the *NeuroPort Electrode*) and a family of headstages, amplifiers, and software.

This brief emphasizes the tech stack and what’s been demonstrated in peer‑reviewed literature, while being careful about private-company “stats.”

## At a glance

- *Website:* <sup><a href="#source-01" aria-label="Source 01: Blackrock official website">01</a></sup>
- *Headquarters (public listing):* Salt Lake City, Utah (LinkedIn). <sup><a href="#source-02" aria-label="Source 02: Historical Blackrock company profile">02</a></sup>
- *Employees (best-effort public signal):* LinkedIn lists company size *51–200 employees* and shows “discover all *178 employees*” at time of access (approximate; not audited). <sup><a href="#source-02" aria-label="Source 02: Historical Blackrock company profile">02</a></sup>
- *Company type:* privately held (LinkedIn).
- *Revenue:* not publicly disclosed (private company).

## The technology: what Blackrock actually sells/builds

Blackrock describes itself as a full “ecosystem,” not a single implant:
- implantable electrodes (Utah Array / NeuroPort Electrode)
- headstages / front-end acquisition
- neural signal processing hardware
- software/tools <sup><a href="#source-03" aria-label="Source 03: Blackrock technology ecosystem and company claims">03</a></sup>

### 1) Utah Array (intracortical microelectrode array)
The Utah Array is a rigid, 3D microelectrode array classically used for *single-unit and multiunit recordings* from cortex.

Blackrock claims:
- implanted in humans since 2004
- “nearly all BCIs implanted in humans have used Blackrock’s technology—specifically the Utah Array” (this is a strong claim; treat as company marketing language) <sup><a href="#source-03" aria-label="Source 03: Blackrock technology ecosystem and company claims">03</a></sup> <sup><a href="#source-04" aria-label="Source 04: Utah Array background">04</a></sup>

Catalog hardware: [Utah Microelectrode Array](/devices/01-utah-microelectrode-array/).

### 2) Research-to-clinic bridge: MoveAgain
Blackrock presents *MoveAgain* as its first device designed for clinical use. <sup><a href="#source-01" aria-label="Source 01: Blackrock official website">01</a></sup> <sup><a href="#source-03" aria-label="Source 03: Blackrock technology ecosystem and company claims">03</a></sup>

The FDA Breakthrough Device Designation claim for MoveAgain is attributed to Blackrock; it has not been independently verified here against an FDA listing.

## What has been demonstrated (peer‑reviewed examples that intersect Blackrock’s platform)

A lot of famous “human BCI” papers are consortia-driven (BrainGate, UCSF, etc.) and may use Blackrock-manufactured arrays and recording hardware. The goal here is not to claim every result is “by Blackrock,” but to anchor what this class of technology can enable.

### Decoding attempted speech into words/sentences (NEJM, 2021)
A well-known demonstration of decoding attempted speech used cortical recordings and deep-learning + language-model decoding.

This study used a *cortical-surface ECoG array*. It belongs to the wider BCI context, rather than serving as evidence for Utah-array performance.

- Moses et al., *New England Journal of Medicine* (2021): “Neuroprosthesis for Decoding Speech in a Paralyzed Person with Anarthria.” <sup><a href="#source-05" aria-label="Source 05: Moses et al. speech decoding study">05</a></sup>

### High-bandwidth wireless intracortical recording used at home (Brown, 2021)
Brown University reported the first human use of a high-bandwidth wireless BCI system at home, and notes a licensing agreement with Blackrock Microsystems for making the device available to researchers. <sup><a href="#source-06" aria-label="Source 06: Brown University wireless BCI report">06</a></sup>

### Evoked visual percepts with a 96‑channel intracortical array (JCI, 2021)
An example of what intracortical stimulation/recording arrays can enable is artificial vision work using a 96‑channel intracortical microelectrode array.

- Fernández et al., *J Clin Invest* (2021): “Visual percepts evoked with an intracortical 96‑channel microelectrode array inserted in human occipital cortex.” <sup><a href="#source-07" aria-label="Source 07: Fernández et al. visual percept study">07</a></sup>

## What they’re doing recently (public signals)

Blackrock’s own public messaging emphasizes:
- long duration of human implant experience (years of studies; many implanted-days)
- broad research-customer base
- a push toward clinical products (MoveAgain) <sup><a href="#source-01" aria-label="Source 01: Blackrock official website">01</a></sup> <sup><a href="#source-03" aria-label="Source 03: Blackrock technology ecosystem and company claims">03</a></sup> <sup><a href="#source-08" aria-label="Source 08: Blackrock company timeline">08</a></sup>

## Key questions to watch

1. *Longevity and signal stability*

   Utah Arrays have a long track record, but chronic stability (unit yield vs time, encapsulation, connector reliability) remains a central engineering constraint.

2. *Surgical burden and infection risk*

   Historically, many Utah Array deployments used percutaneous connectors. Clinical systems tend to require fully implanted telemetry/power solutions.

3. *Scaling beyond ~100 channels*

   Utah Array classically means ~100 electrodes per array. The path to richer control often requires either multiple arrays or different electrode technologies.

4. *Clinical commercialization*

   The hardest step is turning research performance into a product: training burden, calibration drift, support model, and regulatory requirements.

---

## 2026 update (reviewed Oct 4, 2026)

- *Ownership:* Tether invested $200M in Apr 2024 and became the majority stakeholder. Source: <sup><a href="#source-09" aria-label="Source 09: Tether investment announcement">09</a></sup>
- *Leadership:* the October 2026 review lists Marcus Gerhardt as CEO; in an Aug 2026 interview he said Blackrock has implanted 56 people (secondary: <sup><a href="#source-10" aria-label="Source 10: Interview cited in the October 2026 review">10</a></sup>).
- The employee count above is a point-in-time LinkedIn figure and may be out of date.
