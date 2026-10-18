# Planar contact field gallery

Route: `/cortex/fields/`. Exploratory model, separate from the disk FEM sampler and neuron replay. Browser visual verification is pending.

## Physical problem

One zero-thickness equipotential contact in the insulating plane z=0 injects total current I into homogeneous isotropic tissue z>0, conductivity 0.3 S/m. Potential is zero at infinity. There is no finite return electrode, shank, interface impedance, tissue anisotropy or membrane model. The ring has an insulating central opening.

The half-space surface-source Green function is `1/(2πσr)`. We discretize the contact into rectangular constant-current-density panels. Analytically integrating this kernel over each panel, including its self term, gives a dense matrix evaluated at panel centers. Solve `M q = 1`, then normalize panel currents to sum to unity. This enforces potential at collocation centers, not at every surface point. Current density is not imposed uniformly across the contact. Source-panel integration and four-point Gaussian evaluation are distinct checks.

Nominal shapes: disk, square, 4:1 rectangle, annulus with inner/outer radius 1:2. Panels are included by center location and uniformly rescaled to give exact exposed area π in normalized coordinates. Curved boundaries are stair-stepped; the UI outlines the actual panel boundary. Nominal dimensions describe intended shapes, with finite boundary discretization error. The physical scale is the equivalent disk radius a: area = πa². Currents stay normalized when the shape is scaled.

At runtime a Worker evaluates four Gaussian source points per panel. Potential scales as `I/(2πσa)` and field as `I/(2πσa²)`. Electric field is the analytic negative gradient of that quadrature kernel. Potential is shown in mV; field magnitude in V/m. Negative current reverses potential and vector direction, but not magnitude. Zero current yields zero everywhere sampled.

The map uses 65×65 cell-center samples. All cards share physical axes and a linear color scale; its range is recalculated across the visible cards on every comparison. Colors are not comparable across different settings without reading the legend. Top slices are XY; side slices are XZ at y=0. Heights below 0.2a are masked. This numerical guard does not establish biological safety or resolve the ideal sharp-rim singularity.

## Reproduce and assess

Run `OPENBLAS_NUM_THREADS=2 python scripts/generate-cortex-field-gallery.py` with NumPy and SciPy, then `node --test tests/cortex-field-gallery.mjs`.

The generator solves resolutions 12, 24 and 48 panels across the widest dimension. It compares the final two meshes at 180 points spanning normalized heights 0.2, 0.4, 1, 2 and 4. These are sampled checks, not global error bounds. The generated JSON report retains gates and measured results. A failed gate prevents writing a new model asset. All maps outside those sampled points remain exploratory.

Predeclared relative gates: analytical disk potential 3%, disk field-vector norm error 7%, final mesh change 4% potential / 8% field, quadrature-versus-analytic-panel integration 1% potential / 2% field. The independent disk potential is `asin(2a / (hypot(r-a,z)+hypot(r+a,z))) / (2πσa)`. Its negative spatial gradient is evaluated by a five-point finite difference. Exact panel integration is independently differentiated for quadrature field checks. Current conservation, positive panel currents and collocation residuals are consistency checks, not independent physical validation.

Results: disk reference maximum error 0.421% potential / 1.428% field; final mesh changes across shapes at most 1.102% potential / 3.099% field. Quadrature error is much smaller than discretization error. See `field-gallery-validation.json` for all values. Node tests additionally check SI scaling, sign reversal, zero current, minimum-height masking, far-field asymptotics and the actual browser sampler against the disk reference. These checks do not establish neural response or stimulation selectivity.

## References

- Newman, J. (1966), *Resistance for Flow of Current to a Disk*, Journal of the Electrochemical Society 113, 501–502. DOI: 10.1149/1.2424003. Analytical spreading resistance / equipotential disk benchmark.
- [COMSOL, Current Distribution, Boundary Elements](https://doc.comsol.com/6.4/doc/com.comsol.help.edecm/edecm_ug_electrochem.06.028.html): Laplace equation and boundary-element treatment of electrolyte potential.
- Existing independent disk reference: `workbench/cortex-finite-contact-field/validation/reference.py`.

This gallery does not replace or extend the validated finite-cylinder FEM export. Its return is at infinity, its mesh is different, and it is not wired into the neuron solver.
