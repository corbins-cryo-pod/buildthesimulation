# Home index organization audit

Reviewed 22 October 2026. Scope: all 142 published device pages, 89 company/lab pages and 65 application pages. Two draft devices are excluded.

## Grouping rule

Each device appears once, beneath its reviewed primary manufacturer or development program. Application links, reverse links in organization briefs and shared institution names cannot establish that role. Applications remain documented uses/collaborations; listing a study with a maker does not mean the maker conducted or sponsored it.

`src/data/device-organizations.json` records all 142 decisions, quoted identity evidence from each device page, a source URL, a rationale and selected related organizations with explicit roles. These are editorial grouping decisions based on the catalog's existing cited identity sections, with targeted official-source verification of Utah and Neuropixels. This is not a fresh independent verification of every engineering specification, corporate acquisition or paper.

103 devices have matching primary organization briefs. Of the 39 without one, 35 are grouped under their reviewed development program as plain entries whose name links to the program's key paper or official page from this audit (Corbin, 2026-10-22: simple entries, no full brief pages). The remaining 4 stay under a "Miscellaneous" label because no single program is grounded in the audit evidence: ActiGait (historical manufacturer not inferred), LIFE (no institution stated), the Veith 2021 hyperflexible sieve (team named without institution) and the 196-channel active micro-ECoG (five-plus institutions, no lead stated). The Miscellaneous label is a grouping, not a placeholder developer name; the audit JSON carries each device's quoted developer identity. New published devices require an explicit audit record through the catalog tests.

## Important distinctions

| Device or family | Primary grouping | Related role / boundary |
| --- | --- | --- |
| Utah MEA / UEA, Utah Slanted Array | Blackrock Neurotech | University of Utah: origin; BrainGate: clinical research user |
| Neuropixels 1.0, Ultra, NHP, 2.0 Alpha, Quad Base | imec | Collaborators and research users do not become separate makers |
| Neuropixels NXT | Johns Hopkins Harris BME program | imec design/manufacturing partner; distinct from Johns Hopkins APL |
| Neuropixels Opto | Allen/UCL Opto collaboration | Prototype-specific collaboration, not every Neuropixels partner |
| CWRU spiral cuffs / FINE | CWRU Cleveland FES development program | Ardiem manufactured the reported human components; no Ardiem brief exists |
| PMT custom speech ECoG system | Unassigned | PMT array plus Blackrock connector; UCSF is a research user |
| UCSD high-density transparent graphene array | Unassigned | Kuzum group is distinct from the cataloged Dayeh group |
| CMU multimodal neurochemical probe | Unassigned | CMU institution overlap does not establish Yu/Chase group development |
| Axonics sacral system | Axonics | Boston Scientific parent relationship does not duplicate the branded device |
| Argus II | Cortigent, per this sheet's current FDA identity | Second Sight is the historical predecessor |
| DOT research prototype / Motif company device | Rice research program / Motif respectively | Preserve the distinction between research and company device entries |
| SIMIT IVI / micro-ECoG | Unassigned | NeuroXess is a collaborator; no SIMIT brief exists |

Official checks: [Blackrock Utah Array](https://blackrockneurotech.com/products/utah-array/), [Blackrock research-array IFU](https://blackrockneurotech.com/wp-content/uploads/2023/04/LB-0514_Blackrock_Research_Arrays_IFU.pdf), [imec Neuropixels release](https://www.imec-int.com/en/articles/imec-releases-neuropixels-neural-probe-to-the-global-neuroscience-community), [Neuropixels collaboration](https://www.neuropixels.org/about).

## Entries retained without a matching primary grouping

These are intentionally not assigned to a convenient research user, collaborator or similarly named institution. On the home index they appear under their stated development program (external key-paper or official-page link) or, for the four ungroundable cases, under Miscellaneous. Consult the device identity rows and the audit JSON for their stated developers and source scope.

- [TIME (Transverse Intrafascicular Multichannel Electrode)](../src/content/designs/06-time-transverse-intrafascicular-multichannel-electrode.md)
- [Neurotrophic Electrode (Kennedy cone electrode)](../src/content/designs/08-neurotrophic-electrode-kennedy-cone.md)
- [µSEEG flexible stylet-guided depth electrode](../src/content/designs/100-microseeg-flexible-stylet-depth-electrode.md)
- [Neurotassel elastocapillary filament arrays](../src/content/designs/102-neurotassel-elastocapillary-filament-arrays.md)
- [CHIME glass-gold microwire CMOS interface, 2020](../src/content/designs/109-chime-glass-gold-microwire-cmos.md)
- [ActiGait implanted drop-foot stimulator (common peroneal nerve multi-contact cuff)](../src/content/designs/12-actigait-implantable-drop-foot-stimulator.md)
- [LIFE (Longitudinal Intrafascicular Electrode)](../src/content/designs/15-life-longitudinal-intrafascicular-electrode.md)
- [Hyperflexible Regenerative Sieve](../src/content/designs/16-hyperflexible-regenerative-sieve-electrode-veith-2021.md)
- [Macro-Sieve Electrode](../src/content/designs/17-macro-sieve-electrode-macewan-2016.md)
- [Regenerative Microchannel Interface](../src/content/designs/18-microchannel-regenerative-scaffold-srinivasan-2015.md)
- [MERF 128-channel ultraflexible polyimide array (CEBSIT)](../src/content/designs/185-merf-ultraflexible-nhp-array-cebsit.md)
- [SIMIT mosquito-mouthpart bionic neural probe (128-channel flexible array)](../src/content/designs/186-simit-mosquito-mouthpart-bionic-neural-probe.md)
- [SIMIT silk-enabled intraventricular interface (IVI)](../src/content/designs/187-simit-silk-intraventricular-interface.md)
- [SIMIT 256-channel high-density micro-ECoG (64 electrodes/cm2)](../src/content/designs/188-simit-256-channel-high-density-uecog.md)
- [SIAT NeuroWorm movable fibre electrode](../src/content/designs/191-siat-neuroworm-movable-fibre-electrode.md)
- [Tsinghua NeuroCam 4096-channel TFT ECoG array](../src/content/designs/192-tsinghua-neurocam-4096-channel-tft-ecog.md)
- [Tsinghua SIGS all-organic CHIP hydrogel ECoG array](../src/content/designs/193-tsinghua-sz-chip-hydrogel-ecog.md)
- [SIAT liquid-crystal MXene/PEDOT:PSS fibre electrode](../src/content/designs/194-siat-liquid-crystal-mxene-pedot-fibre-electrode.md)
- [CIBR umbrella-type stretchable electrode array (USEs probe)](../src/content/designs/195-cibr-umbrella-type-stretchable-electrode-array.md)
- [AIR-CAS MultiTransm dual-mode MEA (dopamine plus electrophysiology)](../src/content/designs/196-aircas-multitransm-dopamine-electrophysiology-mea.md)
- [CIBR aGel-µECoG adhesive-hydrogel micro-ECoG array](../src/content/designs/197-cibr-agel-hydrogel-micro-ecog.md)
- [CIBR kirigami microelectrode array (ki-MEA) for primate brain](../src/content/designs/199-cibr-kirigami-microelectrode-array-ki-mea.md)
- [SIAT laser-induced graphene multimodal physiological-electrophysiological electrodes](../src/content/designs/200-siat-laser-induced-graphene-multimodal-electrode.md)
- [Semi CAS silicon microneedle array with local de-insulation](../src/content/designs/201-semi-cas-silicon-microneedle-array-local-deinsulation.md)
- [SIAT ferroelectric bioelectronic interface (FBI) for vagus nerve](../src/content/designs/202-siat-ferroelectric-bioelectronic-vagus-cuff.md)
- [SINANO neuron-scale all-hydrogel fibre electrode array](../src/content/designs/204-sinano-neuron-scale-all-hydrogel-fibre-array.md)
- [SJTU implantable nanoscale neural probe (INNP) for in vivo intracellular recording](../src/content/designs/205-sjtu-implantable-nanoscale-neural-probe-innp.md)
- [SJTU opto-electrophysiology nanotube probe with total-internal-reflection layer](../src/content/designs/206-sjtu-opto-electrophysiology-nanotube-probe.md)
- [ITIS/Ljubljana 33-contact spiral cuff (2018 research prototype)](../src/content/designs/208-itis-33-contact-spiral-cuff.md)
- [TU Delft transfer-free multilayer graphene MEA (DBI2 TS4)](../src/content/designs/209-tu-delft-transfer-free-multilayer-graphene-mea.md)
- [Dobelle cortical visual prosthesis](../src/content/designs/34-dobelle-cortical-visual-prosthesis.md)
- [High-density subdural ECoG array with percutaneous connector (PMT array, Blackrock connector)](../src/content/designs/63-pmt-high-density-ecog-array-percutaneous-connector.md)
- [196-Channel Active Micro-ECoG](../src/content/designs/65-active-microecog-auditory-cortex-array.md)
- [Sewn Polymer Electrode Array](../src/content/designs/66-sewing-machine-polymer-electrode-threads.md)
- [Modular polymer probe system (UCSF and Lawrence Livermore)](../src/content/designs/67-modular-polymer-probe-recording-system.md)
- [CLEAR transparent graphene micro-ECoG array](../src/content/designs/68-clear-transparent-graphene-microecog.md)
- [High-density transparent graphene array (UC San Diego)](../src/content/designs/69-ucsd-high-density-transparent-graphene-array.md)
- [CMU Multimodal Neurochemical Probe](../src/content/designs/77-flexible-neurochemical-recording-probe.md)
- [Ultra-Flexible Tentacle Electrodes (UFTE)](../src/content/designs/92-ultra-flexible-tentacle-electrodes.md)
