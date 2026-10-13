# Physics and numerical specification

Version `cortex-passive/0.1.0`. Source locators are in `evidence.js`.
All numerical physics is authored from equations, not copied simulator source.

## Passive finite-volume tree

For area A in µm², membrane capacitance c_m in µF/cm², resistance r_m in Ωcm²:

```
C [nF] = c_m × A × 1e−5
g_leak [µS] = A × .01 / r_m
```

Cylinders use lateral area πdL, with sealed caps (no additional cap area). Soma
uses 4πr². Each connection is two constant-radius half-segment resistances:

```
R_ij [Ω] = R_a [Ωcm] × 1e4 × (L_i/(2πr_i²) + L_j/(2πr_j²))
G_ij [µS] = 1e6 / R_ij
```

The soma's axial connection uses an equivalent 20 µm long, 20 µm diameter
cylinder, whereas its membrane uses spherical area. Branches start at the sphere
surface. This is a stated reduced-model choice, not resolved intracellular 3D
conduction. Tree parents precede children; no cycles or intercellular junctions.
Each of the five branches has its own half-soma radial resistance. The independent
NEURON reference expresses it using a separate membrane-free 10 µm × 20 µm
connector from the soma center, followed by the dendritic branch. Connecting all
branches to one soma endpoint would instead share that resistance and change the
model. These reference connectors are numerical circuit adapters, not extra
anatomical neurites. See REFERENCE_COMPARISONS.md.

Let V be transmembrane voltage, Ve the prescribed extracellular voltage,
EL the leak reversal, gs a synaptic conductance and Es its reversal:

```
C_i dV_i/dt + gL_i(V_i−EL) + gs_i(V_i−Es)
  = Σ_j G_ij[(V_j+Ve_j)−(V_i+Ve_i)] + Iinj_i
Im_i = C_i dV_i/dt + gL_i(V_i−EL) + gs_i(V_i−Es)
```

Positive Im is outward; positive Iinj enters the intracellular soma. Summing
over the sealed tree cancels axial terms: ΣIm = ΣIinj. A synaptic membrane
conductance is NOT an intracellular electrode injection.

Backward Euler puts C/dt, gL, gs and the axial Laplacian on the matrix diagonal
and uses `ΣG(Ve_neighbor−Ve_i)` as forcing. A Hines elimination/back-substitution
solves the tree in O(N) per step using Float64 arrays. No iterative tolerance is
needed; roundoff and discretization errors remain. Im is evaluated from the SAME
step's capacitive, leak and synaptic terms; KCL and total balance are reported.
The model starts at V=EL=−65 mV; all terminal axial currents are zero (sealed ends).

## Defined interventions

1. Synaptic protocol: 1 nS total conductance, Es=0 mV, onset 5 ms, duration 5 ms.
   It is distributed uniformly over the distal 100 µm of the 600 µm apical branch.
   Per-compartment overlap weights sum to one, preserving input location during
   mesh refinement. A step is a specified experimental input, not a fake trace.
2. Intracellular protocol: +0.05 nA soma injection during the same window. An
   equal/opposite point bath return at (2000,2000,−500) µm closes the external
   circuit. Its prescribed potential acts on the cable and appears separately
   in the recorded applied signal. Pipette impedance/geometry is not modeled.
3. Extracellular protocol: source A −1 µA, B +1 µA for 200 µs, 100 µs gap, then
   reversed 200 µs phase. One pulse begins at 5 ms. Contacts are ideal points at
   catalog apices, distinct from recording sites. Pulse overlap is integrated
   within each dt, not rounded to whole steps. Average drive preserves charge;
   coarse dt still loses transient fidelity and may require refinement.

## Full-space extracellular solution

An infinite, homogeneous, isotropic, real-valued ohmic medium satisfies
`∇·(σ∇φ) = −I δ(r−r_source)` with φ→0 at infinity. In SI:

```
φ(r) [V] = I [A] / (4π σ [S/m] distance [m])
E = −∇φ                  J = σE
```

The code's transfer coefficient is `1000/(4πσr_um)` in µV/nA. Thus 1 nA at
100 µm with σ=.3 S/m gives 2.6525823849 µV. Stimulation's µA→nA and µV→mV
conversions cancel numerically for its unit-field coefficient; units are still
distinct in the contract. Electric field output is V/m.

For a cylindrical compartment of length L, total current Im, projection z and
perpendicular distance ρ from its axis:

```
φ = Im/(4πσL) [asinh(z/ρ) − asinh((z−L)/ρ)]
```

The current is uniformly distributed along the line. Collinear points outside
the segment use its finite logarithmic limit; on-segment singularities throw.
Soma remains a point source. Lead matrices are computed once per geometry,
then multiplied by each frame's currents. No arbitrary spike template or sine
wave generates a recording. Recording contacts are ideal point samplers; finite
area averaging and electrode impedance remain absent.

Near sources, point/line approximations fail: selected contacts within 25 µm of
any modeled membrane are rejected. This cutoff is an explicit domain restriction,
not an established accuracy radius. Substrates and unused shanks do not exclude
neurons or alter current flow. Mechanical collision validity is not asserted.

## Recording and reference

`neural = lead × Im`; `applied = stimulus/bath-return potential`; `total = neural + applied`.
Infinity-reference A/B and bipolar A−B are both exported. There is no ground at a
nearby anatomical boundary. Stimulation contacts cannot be their own point probes.
No amplifier, ADC, alias control, noise, electrode polarization or artifact
recovery is modeled; outputs are ideal continuous-model samples, not device data.

Frame zero is equilibrium. Frame k>0 reports voltage/current at the step end;
its applied field and drive are interval averages over the preceding step. The
last dt is shortened to end exactly at duration. Full outputs use Float64.

## Omitted physics and operating regime

No active channels, spikes, axon, recruitment, ephaptic feedback, heterogeneity,
anisotropy, CSF/skull boundary effects, material interface, substrate conductivity,
vascular space, extracellular volume fraction, deformation or injury model.
Large passive excursions (>10 mV) trigger a warning, not a fictional spike.
This threshold is a scope warning, not a biological activation/safety threshold.

Charge per phase is |I|×duration (µA·ms=nC); each phase's interval overlap and net
charge are integrated independently. Phase charge does not cancel when opposing
phases share a timestep. Correct charge does not imply resolved polarization:
interval averaging can suppress fast opposing drives, so timestep refinement is required.
Unknown exposed Utah area prevents a meaningful geometric charge-density output.
Charge balance alone establishes neither electrochemical nor tissue safety.
