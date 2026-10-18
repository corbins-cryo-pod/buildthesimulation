# Physical model: an equipotential disk in an insulating plane

This package computes the extracellular **potential** of one ideal benchmark contact. It is not a geometric or electrochemical model of a Utah, Neuralink, or Neuropixels implant. It contains a numerical finite-element volume-conductor solution; the analytical disk formula is a separate validation reference, not the calculation used to generate the numerical field.

## Geometry, coordinates, and material

The contact center is the origin. Cartesian coordinates are in meters, the contact plane is `z = 0`, and tissue occupies `z > 0`. Axisymmetry uses `r = hypot(x, y)`; the azimuthal angle has no effect on this particular field.

| Quantity | Definition |
| --- | --- |
| Contact | Circular, perfectly conducting, equipotential disk |
| Radius `a` | `25e-6 m` (25 micrometers) |
| Diameter | `50e-6 m` |
| Exposed conducting surface | Only the planar face `z = 0`, `0 <= r <= a` |
| Exposed area | `pi*a^2 = 1.963495408493621e-9 m^2` |
| Tissue conductivity `sigma` | `0.3 S/m`, a declared benchmark value |
| Tissue | Homogeneous, isotropic, linear, ohmic conductor |
| Insulation | Plane `z = 0`, `r > a`, with zero normal current |
| Rotational axis | `r = 0`, symmetry/regularity condition |
| Metal depth, shank, edge rounding | Not represented |

There is no exposed cylindrical sidewall or underside. The disk is a boundary patch, not a meshed metal volume. The region below the plane is excluded backing/solid space; its internal metal-versus-insulator layout does not affect this ideal boundary-value problem. Classifier labels below the plane are geometric conventions for rejecting queries, not a representation of a manufactured implant.

## Equations and signs

In tissue,

```text
div(sigma grad(phi)) = 0
E = -grad(phi)
J = sigma E = -sigma grad(phi).
```

Positive contact current `I` flows **from the disk into tissue**. With tissue's outward normal `n = -ez` on the contact,

```text
I = -integral_contact J dot n dS
  =  integral_contact sigma grad(phi) dot n dS.
```

Thus positive `I` gives positive tissue potential relative to the return; negative `I` reverses it. “Anodic” and “cathodic” labels should be assigned only after reconciling this convention with the simulator and stimulator convention. The exported basis has `I = +1 A` and units `V/A`; a value of 1 A is a normalization, not a recommended stimulation amplitude.

The contact boundary condition is `phi = Vc`, with one **unknown constant** `Vc` chosen to satisfy the prescribed total current. Local current density is not prescribed. A numerical implementation may first solve with `Vc = 1 V`, calculate total current, and scale the entire solution by its reciprocal. Linearity makes this exactly the same discrete boundary-value problem as a prescribed total-current equipotential contact.

Uniform normal current density over the face is a different boundary condition and is not used here. For the ideal half-space equipotential disk, current density increases without bound at the sharp rim.

## Return, domain, and voltage reference

The intended reference geometry is the infinite tissue half-space with current returning at infinity and `phi -> 0` at infinity. It has no finite, local return electrode.

The numerical calculation truncates tissue to a cylinder,

```text
0 <= r <= R*a,   0 <= z <= R*a,
```

and grounds the lateral wall `r = R*a` and top `z = R*a` (`phi = 0`). The insulating plane and contact conditions remain as above. The grounded surfaces together are the **complete computational return boundary**; they accept the contact's outgoing current. This is an explicit distant-boundary approximation to an infinity return, not an explicit finite implanted return electrode. All quoted numerical potentials use this grounded-cylinder voltage reference.

Domain checks use `R = 250, 500, 1000, 2000`, corresponding to cylinder radii and heights of `6.25, 12.5, 25, 50 mm`. The delivered field uses `R = 2000` (50 mm radius and 50 mm height). Increasing the outer domain with unchanged local mesh construction separates truncation effects from local refinement. The exported domain parameters and actual browser sampling extent are recorded in the field manifest; a sampler's supported extent can be smaller than the solved domain.

The initial `R = 1000` candidate failed the predeclared 1% last-domain-change gate: changing `R = 500` to `1000` changed a fixed-point potential by up to approximately 1.337%. Its independent-reference error was below the separate 2% gate, but passing that check did not override the failed domain gate. The initial results are retained in `validation/initial-domain1000-results.json`. The outer domain was extended to `R = 2000` with unchanged tolerances, and all three local mesh refinement levels were evaluated on that final domain. The final `1000 -> 2000` maximum fixed-point change was approximately 0.660% (9.762 V/A absolute), passing the unchanged 1% gate. This is a numerical-resolution correction, not a relaxation of the acceptance criterion; all measured gates remain in the validation report.

Because the exact disk has nonzero potential on any finite cylinder, homogeneous zero potential on the finite outer boundary changes the solution. Near the contact, much of that difference resembles a voltage offset, but it is not permissible to subtract an optimized fitted offset from the validation comparison and then claim absolute-potential accuracy. Raw absolute potentials and their reference must remain visible. The change between two finite domains estimates truncation sensitivity; it does not prove that the larger domain is indistinguishable from infinity. Comparison to the half-space formula supplies an additional check.

A later finite return electrode must be meshed and included in the geometry and every basis's current pattern. It cannot be added only as an accounting entry or by reinterpreting this infinity-return basis.

## Analytical reference with matching boundary conditions

For `z >= 0`, define the oblate spheroidal coordinate

```text
q  = (r^2 + z^2 - a^2) / a^2
xi = sqrt((q + sqrt(q^2 + 4*z^2/a^2))/2).
```

The reference solution is

```text
phi(r,z) = I/(2*pi*sigma*a) * atan(1/xi).
```

The independent reference implementation in `validation/reference.py` uses the equivalent focal-distance expression

```text
dminus = sqrt((r-a)^2 + z^2)
dplus  = sqrt((r+a)^2 + z^2)
phi(r,z) = I/(2*pi*sigma*a) * asin(2*a/(dminus+dplus)).
```

This avoids cancellation in the direct formula for `xi` near the contact. It is evaluated independently of mesh construction, FEM stiffness assembly, and nodal values.

At `xi = 0`, take `atan(1/xi) = pi/2`. Implementations should use an algebraically equivalent stable expression when subtractive cancellation would occur, and `atan2(1, xi)` at the disk. This analytical half-space solution has all of the following properties:

- A constant potential `Vc = I/(4*sigma*a)` over the entire disk.
- Zero normal current through the rest of the infinite plane.
- A total current of `I` through the disk.
- A zero potential reference at infinity.

The corresponding tissue-directed current density over the exposed disk is

```text
jz(r,0+) = I / (2*pi*a*sqrt(a^2-r^2)),  0 <= r < a.
```

Indeed, integrating `jz * 2*pi*r dr` from `0` to `a` yields `I`. For this benchmark, the access/spreading resistance is `1/(4*sigma*a) = 33333.3333333333 ohm`. This is an analytical physical check, not an assertion that a finite-domain numerical solve must equal it exactly.

The finite-element solver does not evaluate this formula to set its nodal solution or its finite outer boundary. It solves the weak form on the mesh. The reference and finite-element calculation therefore use different calculations, while matching the limiting geometry and contact conditions. Their finite-domain boundary conditions intentionally differ, and the domain-convergence experiment measures that effect.

## What finite geometry does and does not regularize

The disk potential is finite at the face and the rim. The ideal sharp conducting/insulating junction gives a singular current density and electric field as the rim is approached. Finite electrode size therefore does **not** make every field quantity bounded. P1 finite-element gradients are elementwise constant, and resolving the edge's integral flux is harder than resolving potential away from the edge.

This package's acceptance gates concern potential and the documented sampling region. It does not deliver a validated electric-field or current-density sampler. Differentiating the exported interpolation is not an independently verified electric-field calculation. No maximum tissue field, edge current density, charge density, or electrode safety limit is established by this model.

## Finite-element formulation and conservation evidence

The offline implementation uses a custom open-source axisymmetric linear-triangle (P1) finite-element assembly, NumPy, and SciPy's sparse linear solver. Axisymmetry allows a two-dimensional meridional mesh while retaining the three-dimensional volume weight `2*pi*r`:

```text
Kij = integral_meridional_domain
        sigma * 2*pi*r * grad(Ni) dot grad(Nj) dr dz.
```

Because gradients are constant on a P1 triangle and `r` is linear, centroid integration is exact for this element stiffness integrand. The disk and outer return have essential boundary conditions; insulating and axial boundaries have the appropriate natural condition. The disk edge is included as a mesh landmark. The exported mesh, refinement parameters, solver version, and numerical residuals make the implementation auditable.

Two current diagnostics answer different questions:

1. **Weak/reaction current:** sums of constrained-node residuals `K*phi` give the variational boundary flux. On the disk their sign is incoming current; on the grounded outer boundary the sign reverses for outgoing current. Discrete conservation should be close to linear-solver accuracy. Normalizing by this disk reaction current enforces the unit-current constraint.
2. **Raw boundary-gradient flux:** integrating `-sigma*grad(phi) dot n` along the boundary using adjacent elements estimates physical normal flux directly. P1 gradients are not globally flux continuous; this diagnostic can show substantial rim-related errors even when weak conservation is excellent. It is reported separately, with its own acceptance criterion. Excellent reaction balance alone is not evidence that local edge gradients are accurate.

The validation report retains the measured values and any failed gates. Integral current conservation, algebraic residual, potential convergence, and edge-gradient accuracy must not be conflated.

## Far-field limits

For a single contact with infinity return and distance `s = sqrt(r^2 + z^2)` much larger than `a`,

```text
phi ~ I/(2*pi*sigma*s).
```

The factor `2*pi` is the surface-source half-space factor: an insulating plane confines current to a hemisphere. An isolated point source in an **infinite medium** instead has `I/(4*pi*sigma*s)`. Mixing these factors gives a factor-of-two error. In the finite calculation, the half-space comparison is meaningful only in a scale-separated region `a << s << R*a`; approaching the grounded boundary forces potential to zero and invalidates the infinity-return asymptotic comparison.

A finite source-return pair with zero net current has a dipolar leading far field, generally proportional to `1/s^2` rather than the single-source `1/s` potential. The supplied single-contact distant-return basis is not evidence for the far field of such a pair.

## Interface physics omitted

The model sets the tissue-side contact potential equal to the single metal potential. It neglects electrode-interface impedance, double-layer capacitance, charge-transfer kinetics, polarization, concentration changes, and frequency dependence. There is no interface voltage drop, phase lag, or stored interfacial charge. Consequently, the model maps an **ideal imposed tissue current** to an instantaneous ohmic tissue potential; it cannot predict the stimulator compliance voltage or how an imposed metal voltage produces current through a real interface.

For a prescribed current waveform and a linear, frequency-independent volume conductor, scaling the unit-current potential at each time is consistent with this model. It does not show that a real electrode can deliver that waveform or that a charge-balanced waveform is electrochemically safe. Biphasic examples exercise current scaling and units only.

## Remaining assumptions and validity boundaries

The model omits conductivity anisotropy and heterogeneity, cellular microstructure, membrane-induced perturbations to the bulk field, tissue displacement, encapsulation, electrode motion, tissue permittivity, and electromagnetic wave propagation. It treats the imposed field as independent of neural state. The conductivity is an assumed benchmark parameter, not a measured property of a particular person's cortex.

For a point `(x,y,z)`, the distance to the actual exposed disk is

```text
distance_to_contact = sqrt(z^2 + max(r-a,0)^2).
distance_to_rim     = sqrt(z^2 + (r-a)^2).
```

These are different from distance to the contact center. A point over the interior of the disk has contact distance `abs(z)`, however far it is laterally from the center. Both distances and geometric classification matter near the rim. Reported numerical validity is limited to the documented validation region and tests; it is not a universal safe distance.

The existing simulator's application-specific **25 micrometer guardrail must remain unchanged** until the integrating team explicitly reviews it. The present calculation supplies field accuracy evidence only. It does not establish a biological boundary, stimulation threshold, single-neuron selectivity, or tissue safety. Compartment centers outside a solid do not prove that their connecting segments and finite-radius membrane surfaces avoid it; the simulator needs segment/swept-radius collision checks.

Improved field calculation also does not resolve the simulator's independent compartment discretization or timestep convergence problems. Neural membrane mechanisms, branch geometry, stimulus waveform timing, and threshold extraction require their own convergence and biological validation.

## Sources and scope of citation

1. **J. Newman (1966), “Resistance for Flow of Current to a Disk,” Journal of The Electrochemical Society 113(5), 501–502.** DOI: [10.1149/1.2424003](https://doi.org/10.1149/1.2424003). Primary analytical treatment of current flow to a conducting disk; supports the access resistance and the nonuniform current distribution. The electrode-interface model in this package is the zero-interface-impedance idealization, not a general consequence of all disk electrodes.
2. **J. E. Hall (1975), “Access resistance of a small circular pore,” Journal of General Physiology 66(4), 531–532.** DOI: [10.1085/jgp.66.4.531](https://doi.org/10.1085/jgp.66.4.531). Primary derivation of the one-sided circular access resistance. A pore's full device resistance may include both access regions and a pore interior; this package uses only the corresponding one-sided equipotential access geometry.
3. **W. R. Smythe (1968), Static and Dynamic Electricity, third edition, McGraw-Hill.** Classical reference for Laplace boundary-value problems and oblate spheroidal coordinates. This is a mathematical reference, not a validation of a neural implant or a particular tissue conductivity.

The equations and limiting checks above explicitly state what is used from the references. Citation does not substitute for the package's executable numerical checks. Bibliographic references are supplied for review; no claim is made that this delivery includes the copyrighted source texts or a fresh systematic review of electrode literature.
