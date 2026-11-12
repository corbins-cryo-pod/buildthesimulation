# Stage 2 — modalities and selectivity (development checkpoint)

This branch builds on the numerically verified Stage 1 bipolar-electrode model. **Stage 2 is not yet validated or ready to merge.**

## Development work completed in this session

A standalone testable source package was produced for:

- Magnetic microcoil: discrete finite-filament loop integral for vector potential, induced axial electric field from dI/dt, spatial derivative along the axon, and approximate DC winding resistance/inductance.
- Optical micro-LED: Gaussian beam spread, effective attenuation and a simplified aperture/liner transmission assumption.
- Opsin occupancy: an explicit conservative four-state C1/O1/O2/C2 state model with stability checks.
- Full small-cohort target-versus-off-target **physical proxy** comparison, numerical table, and exact-parameter JSON export.
- Interactive controls for coil orientation, turn count, drive current and rise time, optical power, spectral peaks, aperture and liner transmittance.

The separate source archive and 10-test suite were generated and executed locally. **They have not yet been incorporated into this GitHub branch**; this note records the work without falsely claiming its deployment.

## Scientific boundary

This is **not** action-potential or host-axon recruitment. The coil field omits conductivity-boundary scalar-potential corrections; the optical field is not validated photon Monte Carlo; the opsin kinetics are hypothetical and not tied to a named fitted opsin. No coupled membrane calculation, recruited-axon rank, effective independent channels, mutual information, tissue heating or clinical safety is established. Field contrast must never be substituted for unique neural addressability.

## Stage 2 release gates

1. Independently validate the conductivity-aware induced field for real multilayer coil geometry.
2. Replace heuristic photon transport with independently validated photon calculations and documented optical tissue properties.
3. Fit opsin kinetics and conductance to published measurements; couple photocurrent and induced fields to the Stage 1 five-band bipolar cable.
4. Execute channel-isolated, zero-input, soma-only, regional and whole-cell matched controls at every declared operating point.
5. Sweep amplitudes for all channels and retain failed points. Derive the actual binary recruitment matrix, exclusive/shared tiers, real matrix rank and information measure using a declared input prior.
6. Validate independent solver agreement, temporal/spatial convergence, budgets and browser interaction before release.

Keep Stage 1's frozen numerical files and acceptance limits unchanged; Stage 2 must have its own distinct validation status.
