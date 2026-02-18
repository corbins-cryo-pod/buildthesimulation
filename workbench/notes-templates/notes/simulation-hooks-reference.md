# Simulation Hooks Reference (Internal)

Consolidated from device/design pages for internal simulation planning. Removed from public-facing device pages.

## Utah Microelectrode Array (UEA)
- Source file: `src/content/designs/01-utah-microelectrode-array.md`

- *Minimal model to reproduce:* rigid shank array in tissue with a time-varying gliosis/encapsulation layer
- *Parameters to expose as sliders:* insertion depth, neuron density, encapsulation thickness, impedance drift
- *What outputs to visualize:* spike yield, SNR proxy, channel survival vs time

## Neuralink N1 (device brief)
- Source file: `src/content/designs/02-neuralink-n1.md`

- *Minimal model to reproduce:* flexible penetrators in viscoelastic tissue + per-site coupling + a time-varying encapsulation layer
- *Parameters to expose as sliders:* thread stiffness, insertion depth, encapsulation thickness, channel count
- *What outputs to visualize:* yield vs time, SNR vs time, spatial drift sensitivity, thermal budget proxy

## Stentrode (Synchron)
- Source file: `src/content/designs/03-stentrode-synchron.md`

- *Minimal model to reproduce:* stent electrode inside a compliant venous tube adjacent to cortex; coupling transfer function from cortical sources → vessel wall → electrode
- *Parameters to expose as sliders:* stent diameter/oversizing proxy, electrode spacing/count, vessel-wall thickness/neointimal growth (attenuation), source depth/orientation
- *What outputs to visualize:* bandwidth/SNR proxy vs anatomy, long‑term attenuation vs neointimal thickness, patency risk proxy vs oversizing

## Neuropixels Probe
- Source file: `src/content/designs/04-neuropixels-probe.md`

- *Minimal model to reproduce:* dense electrode column in cortical tissue with spike propagation + distance-dependent attenuation
- *Parameters to expose as sliders:* site spacing, shank thickness, noise floor, tissue damage zone / encapsulation thickness
- *What outputs to visualize:* spike yield proxy, neuron count proxy, SNR proxy, stability vs time proxy

## Utah Slanted Electrode Array (USEA)
- Source file: `src/content/designs/05-utah-slanted-electrode-array-usea.md`

- *Minimal model to reproduce:* fascicle bundle + penetrating shank array + activation volumes and crosstalk
- *Parameters to expose as sliders:* shank depth gradient, fascicle size/count, fibrosis thickness, electrode-fascicle offset
- *What outputs to visualize:* selectivity matrix, cross-talk heatmap, stimulation maps

## TIME (Transverse Intrafascicular Multichannel Electrode)
- Source file: `src/content/designs/06-time-transverse-intrafascicular-multichannel-electrode.md`

- *Minimal model to reproduce:* fascicle bundle + thin‑film ribbon contact array + field overlap/crosstalk
- *Parameters to expose as sliders:* contact spacing, fascicle diameter/count, fibrosis thickness, electrode-fascicle offset
- *What outputs to visualize:* selectivity matrix, crosstalk heatmap, sensory map resolution proxy

## WIMAGINE (CEA‑Clinatec) epidural wireless ECoG implant
- Source file: `src/content/designs/07-wimagine-cea-clinatec-epidural-wireless-ecog.md`

- *Minimal model to reproduce:* epidural ECoG grid over layered cortex with volume conduction
- *Parameters to expose as sliders:* electrode size, dura thickness, cortical synchrony, noise floor
- *What outputs to visualize:* spatial smoothing, decoding proxy vs electrode density

## Neurotrophic Electrode (Kennedy cone electrode)
- Source file: `src/content/designs/08-neurotrophic-electrode-kennedy-cone.md`

- *Minimal model to reproduce:* neurite ingrowth into a hollow cone with spike generation at an internal microwire
- *Parameters to expose as sliders:* ingrowth success probability, neurite density, micromotion amplitude, spike SNR
- *What outputs to visualize:* unit stability over time, failure probability vs integration parameters

## Paradromics Connexus (acute first-in-human recording)
- Source file: `src/content/designs/09-paradromics-connexus-acute-first-in-human.md`

- *Minimal model to reproduce:* high-density intracortical recording array with spike yield vs insertion depth and tissue coupling
- *Parameters to expose as sliders:* insertion depth, micromotion amplitude, encapsulation thickness, noise floor, yield fraction
- *What outputs to visualize:* expected unit yield distribution; decoding proxy vs channel count; stability vs encapsulation

## Spiral nerve cuff electrode (self-sizing / helical cuff)
- Source file: `src/content/designs/10-spiral-nerve-cuff-electrode-helical.md`

- *Minimal model to reproduce:* cuff-on-nerve volume conductor + recruitment curves vs contact geometry
- *Parameters to expose as sliders:* cuff inner diameter vs nerve diameter (compression proxy), contact count and placement, encapsulation thickness/conductivity, bipolar vs tripolar patterns
- *What outputs to visualize:* selectivity vs contact geometry, threshold drift vs encapsulation, fascicle activation heatmaps in a toy nerve cross-section

## LivaNova VNS Therapy System (SenTiva Model 1000 + PerenniaFLEX Model 304 lead)
- Source file: `src/content/designs/11-livanova-vns-sentiva-1000-perenniaflex-304.md`

- *Minimal model to reproduce:* cervical vagus as multi-fascicle cable + extraneural bipolar cuff recruitment model
- *Parameters to expose as sliders:* cuff inner diameter, electrode spacing, encapsulation thickness, pulse width/amplitude/frequency
- *What outputs to visualize:* fiber recruitment curves by diameter and distance; off-target recruitment proxy

## ActiGait implanted drop-foot stimulator (common peroneal nerve multi-contact cuff)
- Source file: `src/content/designs/12-actigait-implantable-drop-foot-stimulator.md`

- *Minimal model to reproduce:* peroneal nerve cross-section + circumferential cuff recruitment + gait-phase timing
- *Parameters to expose as sliders:* channel angular positions, encapsulation thickness, amplitude/pulse width per channel, trigger jitter
- *What outputs to visualize:* dorsiflexion torque proxy vs channel pattern; fascicle recruitment map per channel

## CWRU self-sizing spiral nerve cuff (upper-limb sensory stimulation research deployments)
- Source file: `src/content/designs/13-cwru-spiral-cuff-radial-nerve-sensory-amputees.md`

- *Minimal model to reproduce:* spiral cuff with circumferential contacts on a multi-fascicle nerve; recruitment overlap/selectivity metrics
- *Parameters to expose as sliders:* cuff diameter vs nerve diameter (fit), contact count/positions, encapsulation thickness
- *What outputs to visualize:* recruitment curves per contact; overlap/selectivity matrix; threshold drift proxy

## FINE (Flat Interface Nerve Electrode)
- Source file: `src/content/designs/14-fine-flat-interface-nerve-electrode.md`

- *Minimal model to reproduce:* multi-fascicle nerve cross-section + cuff-induced deformation (round → oblong) + extracellular stimulation field
- *Parameters to expose as sliders:* flattening ratio, contact count/placement, encapsulation thickness/conductivity, bipolar vs multipolar drive patterns
- *What outputs to visualize:* fascicle recruitment/selectivity maps vs flattening; “selectivity gain” vs round cuff baseline; threshold drift proxy vs encapsulation

## LIFE (Longitudinal Intrafascicular Electrode)
- Source file: `src/content/designs/15-life-longitudinal-intrafascicular-electrode.md`

- *Minimal model to reproduce:* intrafascicular wire inside a fascicle with an encapsulation layer and longitudinal current spread
- *Parameters to expose as sliders:* wire diameter, distance to axons, encapsulation thickness, micromotion amplitude
- *What outputs to visualize:* CAP amplitude vs time proxy; selectivity vs fibrosis; threshold drift curves

## Hyperflexible regenerative sieve electrode (Veith et al., 2021)
- Source file: `src/content/designs/16-hyperflexible-regenerative-sieve-electrode-veith-2021.md`

- regeneration probability vs opening size and mechanical compliance
- axon density vs interface stiffness and encapsulation
- electrode proximity vs extracellular resistance across the mesh

## Macro-sieve regenerative electrode with transit zones (MacEwan et al., 2016)
- Source file: `src/content/designs/17-macro-sieve-electrode-macewan-2016.md`

- transit-zone size vs axon caliber preservation
- electrode spacing vs recruitment selectivity across zones
- regeneration delay vs “time to stimulation”

## Microchannel-based regenerative scaffold interface (Srinivasan et al., 2015)
- Source file: `src/content/designs/18-microchannel-regenerative-scaffold-srinivasan-2015.md`

- microchannel size vs signal amplitude proxy
- channel separation vs selectivity
- fibrosis vs channel patency over time

## TEENI-RPNI (tissue-engineered electronic nerve interface – regenerative peripheral nerve interface)
- Source file: `src/content/designs/19-teeni-rpni.md`

- nerve firing → motor unit recruitment → EMG generation
- reinnervation fraction vs EMG amplitude and separability across multiple RPNIs
- stability vs muscle health (atrophy) and electrode placement

## Science biohybrid cortical engraftment implant (microwell / waffle device)
- Source file: `src/content/designs/20-science-biohybrid-cortical-engraftment-microwell.md`

- neurite ingrowth depth/distribution vs coupling strength proxy
- engrafted neuron survival fraction vs information transfer reliability
- optical stimulation amplitude/duty cycle vs safety proxy (heating/phototoxicity)

## Science biohybrid neuronal-embedded penetrating probe (architecture concept)
- Source file: `src/content/designs/21-science-biohybrid-neuronal-embedded-penetrating-probe.md`

- neurite outgrowth + synapse formation vs effective coupling/bandwidth proxy
- immune rejection pressure vs survival curve
- optical drive vs heating/phototoxicity proxy
