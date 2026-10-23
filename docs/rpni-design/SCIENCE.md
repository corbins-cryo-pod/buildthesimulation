# RPNI Design Laboratory: scientific scope and interpretation

Evidence review: **23 October 2026**. The machine-readable evidence ledger is `src/lib/rpni-design/evidence.mjs`. This document describes an original reduced model; it does not claim reproduction of a published simulator or validation against patient data.

## 1. What is being designed

The modeled construct is a **muscle-graft regenerative peripheral nerve interface (RPNI)**: a terminal nerve or fascicle enters a free muscle graft, and electrodes detect electrical activity from its reinnervated muscle. Experimental evidence for this biological interface includes graft histology and evoked recordings in rats [Kung 2014](https://doi.org/10.1097/PRS.0000000000000168), and voluntary recordings in humans [Vu 2020](https://doi.org/10.1126/scitranslmed.aay2857).

The electrical signal represented here is **muscle-derived EMG**. The model does not simply multiply an extracellular nerve signal by a gain factor. It prescribes muscle source activity following hypothetical nerve arrival, computes extracellular potentials, and samples those potentials with finite contacts.

This laboratory compares graft layouts and recording designs. Its useful questions are conditional:

- For the same synthetic sources, how does moving the contacts change the intended signal and pickup from another graft?
- Does a geometry remain distinguishable when source activity, noise, conductivity or source placement changes?
- How much of an apparent improvement depends on one random source realization or one assumed maturation state?
- What transport gradients follow from a separately specified, idealized avascular slab?

A nerve-bridging conduit, a regenerative sieve electrode and a tissue-engineered electronic nerve interface require different source anatomy and interface equations. Targeted muscle reinnervation, muscle-cuff RPNIs, dermal RPNIs and composite RPNIs likewise are not selectable substitutes for this free muscle-graft model. Those exclusions describe the implementation scope, not a ranking of the approaches.

## 2. What the evidence establishes

Three evidence distinctions prevent misleading calibration.

**Harvest geometry is not mature geometry.** The initial 30 × 15 × 5 mm scale comes from a human study’s harvested muscle graft; it is not an optimized implant prescription, a mature ultrasound measurement or a statement that all grafts have that shape [Vu 2020](https://doi.org/10.1126/scitranslmed.aay2857).

**A rat size comparison is not a human survival threshold.** The rat mass experiment supports a size/function tradeoff, but the browser does not convert its groups into a millimeter cutoff, perfusion requirement or clinical success probability [Hu 2021](https://doi.org/10.1002/mus.27138).

**An implanted control system contains more than an RPNI.** Human longitudinal and comparative studies used RPNI channels together with residual-muscle channels, recording hardware and decoders. They therefore do not identify a universal function from graft dimensions or SNR to prosthesis performance [Vu 2023](https://doi.org/10.1088/1741-2552/accb0c), [Wallace 2026](https://doi.org/10.1088/1741-2552/ae36d2).

The evidence ledger labels species, study design, finding, model use and limits separately. None of its 15 sources calibrates the full laboratory. Most numerical defaults, including conductivity, current strength, motor-unit population, firing rates and time constants, are explicit exploratory assumptions.

## 3. Geometry and the source population

One to four idealized graft domains contain seeded **equivalent motor-unit sources**. The modeled count is a computational population, not a histologically inferred motor-unit census. Changing the count changes the number of independently timed sources unless a separate normalization is imposed; comparisons should therefore state whether total source number or source density is being held fixed.

Coordinates are in millimeters: x follows the representative muscle fibers, y separates grafts, and z spans thickness. All grafts have the same rectangular dimensions. Inter-graft spacing is the edge-to-edge gap. Each module has one terminal nerve and one bipolar recording pair. Three equally weighted, parallel representative fibers sample each equivalent motor-unit territory. Their endplates and source-strength multipliers are seeded; they do not reproduce a measured endplate band or motor-unit distribution.

Geometry normalization keeps contacts within the selected placement envelope and constrains dependent dimensions. Sweeps should be interpreted using their retained, normalized configurations, since changing graft size can consequently move a contact or reduce a territory radius. Coincident or overlapping contacts can be useful mathematical controls even though overlapping separate physical electrodes do not constitute a realizable implant layout.

Nerve diameter provides geometric context. It does not determine axon number, motor/sensory composition, fascicular organization or surgical feasibility. The nerve-tip location affects the assumed arrival distances. The straight geometric distance used by the surrogate does not reconstruct Schwann-cell tracks, branching trajectories, failed axon growth or a complete intramuscular nerve arbor.

Routing is an input assumption describing which synthetic command activates which source. It does not estimate the probability of successful surgical fascicular sorting. An arrangement with independent command inputs explores electrical separability; correlated command inputs can produce correlated recorded signals even with little volume-conducted contamination.

Adjacent rat grafts have been studied with antagonist inputs and deliberately chosen electrode positions, but the small study does not supply a universal minimum spacing [Ursu 2017](https://doi.org/10.1186/s12984-017-0243-0).

## 4. Prescribed arrival and electrical maturation

For source \(i\), let \(d_i\) be the distance from the modeled nerve tip, \(v_a\) the assumed axon extension speed, and \(t_0\) the assumed delay. Arrival is prescribed as

\[
t_{a,i}=t_0+\frac{d_i}{v_a}.
\]

After arrival, source gain is

\[
m_i(t)=
\begin{cases}
0,&t\leq t_{a,i},\\
a\left[1-\exp\left(-\frac{t-t_{a,i}}{\tau_m}\right)\right],&t>t_{a,i},
\end{cases}
\]

where \(a\) is the selected source-availability ceiling and \(\tau_m\) the selected maturation time constant. Days are used for this slow clock. Electrical waveforms use milliseconds or seconds after an activation event; the two clocks represent different scales.

When the selected extension speed is zero, sources are assigned no arrival time. At the exact arrival instant the maturation gain remains zero. The displayed mean gain averages this prescribed amplitude factor over the complete modeled population, including sources that have not arrived; it is not a fraction of verified mature biological motor units.

This equation controls the current of a synthetic equivalent source. It is not measured NMJ occupancy, muscle-fiber survival, functional reinnervation probability or a mechanistic model of synapse formation. It has no feedback from the oxygen diagnostic. A simulation can consequently show developed electrical sources alongside a low hypothetical slab oxygen ratio without claiming that such a tissue state is biologically viable.

A free graft’s biological evolution includes tissue loss and rebuilding; representing maturation only as a monotonic gain omits those processes. The historical cultured-myoblast experiment is kept distinct from a conventional free muscle graft [Urbanchek 2016](https://doi.org/10.1155/2016/5726730).

## 5. Electrical forward model

### 5.1 Homogeneous anisotropic conductor

The mathematical starting point is a quasi-static conductor with a positive conductivity tensor \(\boldsymbol\Sigma\), constant everywhere. For a point current \(I\) at \(\mathbf r_s\), the infinite-domain solution is

\[
\phi(\mathbf r)=
\frac{I}{4\pi\sqrt{\det\boldsymbol\Sigma}}
\frac{1}{\sqrt{(\mathbf r-\mathbf r_s)^\mathsf T
\boldsymbol\Sigma^{-1}(\mathbf r-\mathbf r_s)}}.
\]

This follows by transforming coordinates with \(\boldsymbol\Sigma^{-1/2}\), reducing the constant-tensor Poisson equation to the isotropic Green-function problem. It tends to zero at infinity. When all three conductivities equal \(\sigma\), it reduces to \(I/(4\pi\sigma r)\).

Conductivity is in S/m, source current in A and electrical distances in m. User-facing millimeters and microamperes must therefore be converted before evaluating the expression. Potentials in V are converted to microvolts only for output. This distinction matters: mixing millimeters with SI conductivity changes the voltage by a factor of one thousand.

The implementation combines these conversions into a factor of 1000. With coordinates and regularization radius \(a_s\) in mm, current \(I_{\mu A}\) in microamperes and \(\sigma_g=(\sigma_L\sigma_T^2)^{1/3}\), its implemented regularized kernel is

\[
\phi_{\mu V}=\frac{1000 I_{\mu A}}
{4\pi\sqrt{\sigma_L\sigma_T^2}
\sqrt{\Delta x^2/\sigma_L+(\Delta y^2+\Delta z^2)/\sigma_T+a_s^2/\sigma_g}}.
\]

The zero-radius expression is the exact infinite-conductor point-source solution. A positive radius gives the explicit smooth near-field approximation.

The tensor uses a longitudinal and a transverse conductivity. The model treats the complete space as that same material. The visible graft surface bounds source placement; it is **not an electrical interface**. There is no fat layer, skin boundary, saline pocket, scar shell, insulating wrap or conductivity jump at that outline.

Published forward models include layered and spatially varying conductors [Farina and Merletti 2001](https://doi.org/10.1109/10.923782), [Mesin and Farina 2006](https://doi.org/10.1109/TBME.2006.872825). Those papers motivate the decomposition into source, conductor and detector. Their more complete models are not implemented here.

### 5.2 Equivalent traveling sources

An activation launches two prescribed traveling tripoles from each of the three representative fibers’ endplates in opposite directions. The current weights within each tripole are \(+1,-2,+1\), so their instantaneous sum is zero. They are **current-balanced spatial sources**, not charge-balanced stimulation pulses. Each direction receives half the nominal unit current, distributed equally among the three fibers and multiplied by its seeded unit-strength factor, temporal taper and slow maturation gain.

Current amplitude, pole separation, propagation speed and endpoint taper are specified model parameters. A smooth source-radius regularization avoids an infinite point-source voltage near a contact; this changes the ideal point-source solution in the near field. Sensitivity to this radius is therefore part of model uncertainty, especially when a contact approaches a source.

These sources do not solve a muscle-fiber membrane equation or reproduce all fibers of a biological motor unit. The prescribed end taper is not a complete model of current redistribution at tendons or the generation and extinction of a membrane action potential. A plausible trace shape is not evidence that physiological waveform details are identified.

### 5.3 Contact averaging and differential voltage

For ideal contact area \(A\), the sampled voltage is

\[
\bar\phi_A(t)=\frac{1}{|A|}\int_A\phi(\mathbf r,t)\,dA.
\]

The implementation uses Gauss-Legendre integration in squared radius and equally spaced angular samples: quadrature order \(n\) uses \(4n^2\) contact samples. Increasing the order tests integration error. A zero-radius contact reduces to a point detector. A bipolar channel is the difference between its two contact averages:

\[
v_{AB}(t)=\bar\phi_A(t)-\bar\phi_B(t).
\]

Coincident identical contacts must cancel. Swapping their order must reverse polarity without changing RMS amplitude. The disk average is an ideal high-impedance sensing approximation; it does not impose a conducting electrode boundary or model contact impedance, polarization, a coating, amplifier input impedance or motion of a lead.

An electrode comparison in native rat muscle supports treating contact design and recording configuration explicitly, but does not establish a universal electrode ranking for human RPNIs [Sando 2016](https://doi.org/10.1055/s-0035-1565248).

### 5.4 Summation, noise and signal separation

The conductor is linear in current. The recorded trace is the sum of the contributions from every active source plus prescribed acquisition noise. That permits exact attribution **within the model** to an intended command pool and to other command pools. At imperfect routing fidelity, a command pool can contain sources in more than one physical graft. Experimental measurements generally do not provide those source-separated traces without additional interventions or identification methods.

Recruitment thresholds are distributed between zero and 0.8 across the equivalent-unit population. Below threshold a source has no events; above threshold its firing rate rises linearly between the selected minimum and maximum rates. Each unit has an independent Poisson event train. There is no refractory interval, common synaptic drive, fatigue, adaptation or physiological spike synchrony. Representative fibers within a unit share its activation events.

The model deliberately distinguishes two forms of output:

1. **Expected signal power.** Let \(h_{ci}(t)\) be source \(i\)'s bipolar waveform on channel \(c\), \(\lambda_i\) its event rate in Hz and \(m_i\) its slow source gain. For independent stationary Poisson events, centered variance is

   \[
   P_c=\sum_i\lambda_i m_i^2\int h_{ci}(t)^2\,dt.
   \]

   The integral has units of microvolt squared times seconds; multiplying by event rate in inverse seconds gives variance in microvolt squared. The biological-time curves and design-sweep summaries use this expected variance, not the RMS of a particular 400 ms trace. The transfer matrix reports its square root separately for each recording channel (row) and command pool (column). It is not a dimensionless transfer gain or an efficacy score.

2. **Finite synthetic recording.** Seeded events are convolved with sampled waveforms using linear interpolation for fractional event times. Each pool's sample mean is removed, and independent white Gaussian channel noise is added and demeaned. No recording bandpass, electrode impedance, quantization, correlated noise or stimulus artifact is modeled. RMS over this finite realization can differ from the stationary expected result. Removing the sample mean also reduces the expectation of squared RMS by the variance of that sample mean, an effect that can matter for short recording windows.

For a sampled signal, RMS is \(\sqrt{N^{-1}\sum_n v_n^2}\). Because the finite traces are demeaned, their reported RMS is an AC measure. Every ratio must state its numerator and denominator. The laboratory reports clean signal/noise, with **both target and other command pools included in the clean signal**; high SNR alone therefore does not imply selective target pickup. Target/other ratio and target power fraction assess a different question.

The expected target fraction is \(P_T/(P_T+P_O)\); additive noise is excluded. In the finite recording the analogous component-power ratio is reported separately from actual clean-trace power, because finite target and other traces can have nonzero covariance. Actual summed RMS must retain that cross term. The expected clean-channel similarity matrix is the normalized covariance obtained from \(\sum_i\lambda_i m_i^2\int h_{ci}h_{di}\,dt\); it is signed and undefined when either channel has no clean variance.

For an amplitude ratio \(R\), the decibel conversion is \(20\log_{10}R\). It must not be converted with \(10\log_{10}R\), which is for a power ratio. When a denominator is zero, an undefined or infinite ratio should be represented explicitly rather than reported as a finite measured result.

Measured EMG can contain activity from neighboring muscles [Woo 2014](https://doi.org/10.1109/EMBC.2014.6944595). Reported study SNRs also use different preprocessing and signal definitions [Frost 2018](https://doi.org/10.1186/s12984-018-0452-1). The laboratory’s synthetic ratios should not be plotted as if they directly reproduced those experiments.

### 5.5 Temporal resolution and the recorded samples

The recording grid has interval \(\Delta t_r=1000/f_s\) ms. Source waveforms are evaluated on a finer grid with \(\Delta t_k=1000/(f_s q)\) ms, where \(q\) is `kernelOversampling`. The defaults are \(f_s=8000\) Hz and \(q=4\): a 0.125 ms recording step and a 0.03125 ms kernel step. The kernel is piecewise linear between its sampled values; an event at a fractional time is evaluated using that same interpolant.

Expected source power and covariance integrate the piecewise-linear kernel exactly. On a segment of duration \(\Delta t\) seconds, with waveform endpoint values \(a_0,a_1\) and \(b_0,b_1\), the implemented product integral is

\[
\int_0^{\Delta t}a(t)b(t)\,dt
=\frac{\Delta t}{6}
\left(2a_0b_0+a_0b_1+a_1b_0+2a_1b_1\right).
\]

Setting \(a=b\) gives the kernel energy. Exact integration of the interpolant does not establish that the sampled waveform accurately resolves the underlying moving sources. Refine the kernel grid for fast propagation, short pole spacing, small regularization cores and near-contact configurations; refine contact quadrature separately for spatial averaging.

Kernel oversampling does not implement an antialias filter for the recording output. Fast, narrow sources can require refinement of both temporal grids to reproduce waveform detail. The imposed white-noise RMS is a per-sample assumption, not a fixed amplifier noise spectral density; changing the sample rate at unchanged noise RMS does not model a physical change in acquisition bandwidth.

## 6. Independent oxygen-transport diagnostic

The oxygen panel solves an assumed, steady, one-dimensional diffusion/first-order-consumption equation across a slab of full thickness \(h\):

\[
D\frac{d^2c}{dz^2}-kc=0,\qquad
c(-h/2)=c(h/2)=c_b.
\]

Here \(D\) is in mm²/s and \(k\) in 1/s. For \(k>0\), define \(\alpha=\sqrt{k/D}\) and \(\lambda=\sqrt{D/k}\). The exact concentration ratio for these assumptions is

\[
\frac{c(z)}{c_b}=\frac{\cosh(\alpha z)}{\cosh(\alpha h/2)}.
\]

The center and thickness-averaged ratios are

\[
\frac{c(0)}{c_b}=\operatorname{sech}(\alpha h/2),\qquad
\frac{\bar c}{c_b}=\frac{\tanh(\alpha h/2)}{\alpha h/2}.
\]

At zero consumption both limits are one. Only the dimensionless combination \(h\sqrt{k/D}/2\) determines these ratios: a concentration profile alone therefore cannot identify \(D\) and \(k\) independently.

This diagnostic assumes two equal, fixed oxygen-supply faces, no supply from side faces, no internal capillaries, no vascular ingrowth and no change with postimplantation day. First-order consumption is a chosen closure, not a measured metabolic law for a regenerating graft. The boundary concentration is normalized out; there is no measured tissue oxygen tension or concentration in the output.

For the initial hypotheses \(D=0.002\) mm²/s, \(k=0.01\) s⁻¹ and \(h=5\) mm, the mathematical ratios are approximately 0.0075 at the center and 0.179 on average. These values describe an **avascular model slab**. They are not a mature graft’s oxygen measurement, an infarction threshold or a prediction that 99% of a graft dies.

No oxygen ratio is multiplied into electrical source availability. The current model therefore tests an electrical design and a separate transport hypothesis; it does not solve their biological coupling. Coupling would require measured vascular distribution, consumption kinetics, time-dependent tissue remodeling and an independently validated relationship between oxygen history and viable regenerated fibers.

## 7. Interpretation of design comparisons

Use a fixed seed and identical source assumptions when isolating an electrode-position or contact-size change. Then vary the source seed and uncertain assumptions to test whether the direction of the result persists. A single realization can place an unusually strong source near a contact and produce a misleadingly favorable design.

Keep the intended comparison explicit. Holding motor-unit count fixed while enlarging the graft tests source redistribution. Holding density fixed tests a different problem because the number of sources changes. Increasing assumed current or decreasing noise can improve every SNR while leaving the underlying geometry unchanged.

Absolute voltage is especially nonidentifiable without external measurements: scaling all source currents by a factor \(b\) scales all voltages by \(b\), while scaling every conductivity by \(b\) scales voltages by \(1/b\). Source maturation and source-current amplitude can also compensate for one another. Matching an observed RMS value is consequently insufficient to validate the model.

Crosstalk, covariance, mutual information and decoder accuracy are different quantities. A source-isolation transfer ratio measures electrical pickup under a specified input. Recorded correlation can additionally reflect shared command drive. A decoder’s task accuracy depends on training data, movement classes, temporal features and behavior. The present forward model does not convert one of these metrics into another.

Longitudinal animal recordings motivate stability assessment [Irwin 2016](https://doi.org/10.1088/1741-2560/13/4/046007), and gait experiments motivate active/rest controls [Ursu 2016](https://doi.org/10.1088/1741-2560/13/2/026012). Neither is a test that this synthetic geometry has already passed.

## 8. Verification versus validation

Numerical verification asks whether the implementation solves its declared equations. Relevant checks include SI conversions, isotropic limits, current linearity, superposition, zero-source behavior, current balance, bipolar cancellation, polarity reversal, contact-integration convergence, seed repeatability and the analytic oxygen limits. The model owner’s verification record describes the checks actually run; this document does not assert that a proposed check passed.

Biological validation asks whether a model predicts independent observations in its intended domain. That remains open. A useful dataset would connect the same construct’s three-dimensional graft and electrode geometry, recording filters, nerve input, reinnervation state, raw multi-channel EMG and source-isolation measurements. Transport validation would additionally require oxygen or vascular measurements over time. Calibration and held-out validation should be separated by construct or subject, not merely by neighboring waveform samples.

For each design claim, record the endpoint and the allowed prediction error before fitting. A near-contact waveform fit does not validate distant crosstalk. An electrical fit does not validate graft viability. A rat fit does not validate human parameters. A spread across random seeds measures stochastic variability under fixed assumptions; it is not a patient confidence interval and omits model-form uncertainty.

Sensory stimulation requires further models and experiments. Referred sensations have been measured in people with RPNIs, with perception and discomfort assessed separately [Gonzalez 2024](https://doi.org/10.1109/TNSRE.2023.3345164). The present model has no axon activation, electrode electrochemistry or psychophysical mapping and supplies no safe-stimulation verdict.

## 9. Primary-source index

Full titles, study contexts and limitations appear in the evidence ledger and the site’s methods view. The evidence ledger uses these stable source identifiers:

| Identifier | Primary publication | DOI |
|---|---|---|
| `kung-2014` | Kung et al.; rat graft and implanted electrode | [10.1097/PRS.0000000000000168](https://doi.org/10.1097/PRS.0000000000000168) |
| `hu-2021` | Hu et al.; graft mass and function | [10.1002/mus.27138](https://doi.org/10.1002/mus.27138) |
| `sando-2016` | Sando et al.; native-muscle electrode comparison | [10.1055/s-0035-1565248](https://doi.org/10.1055/s-0035-1565248) |
| `woo-2014` | Woo et al.; neighboring-muscle interference | [10.1109/EMBC.2014.6944595](https://doi.org/10.1109/EMBC.2014.6944595) |
| `ursu-2016` | Ursu et al.; in vivo gait recordings | [10.1088/1741-2560/13/2/026012](https://doi.org/10.1088/1741-2560/13/2/026012) |
| `ursu-2017` | Ursu et al.; adjacent antagonist grafts | [10.1186/s12984-017-0243-0](https://doi.org/10.1186/s12984-017-0243-0) |
| `frost-2018` | Frost et al.; proportional rat EMG control | [10.1186/s12984-018-0452-1](https://doi.org/10.1186/s12984-018-0452-1) |
| `irwin-2016` | Irwin et al.; chronic macaque recordings | [10.1088/1741-2560/13/4/046007](https://doi.org/10.1088/1741-2560/13/4/046007) |
| `vu-2020` | Vu et al.; human feasibility | [10.1126/scitranslmed.aay2857](https://doi.org/10.1126/scitranslmed.aay2857) |
| `vu-2023` | Vu et al.; human longitudinal recordings | [10.1088/1741-2552/accb0c](https://doi.org/10.1088/1741-2552/accb0c) |
| `wallace-2026` | Wallace et al.; hand and wrist control comparison | [10.1088/1741-2552/ae36d2](https://doi.org/10.1088/1741-2552/ae36d2) |
| `gonzalez-2024` | Gonzalez et al.; referred sensory stimulation | [10.1109/TNSRE.2023.3345164](https://doi.org/10.1109/TNSRE.2023.3345164) |
| `farina-2001` | Farina and Merletti; EMG forward model | [10.1109/10.923782](https://doi.org/10.1109/10.923782) |
| `mesin-2006` | Mesin and Farina; nonuniform conductivity model | [10.1109/TBME.2006.872825](https://doi.org/10.1109/TBME.2006.872825) |
| `urbanchek-2016` | Urbanchek et al.; cultured-myoblast scaffold study | [10.1155/2016/5726730](https://doi.org/10.1155/2016/5726730) |
