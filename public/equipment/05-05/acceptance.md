# Predeclared F40 optical checks
Recorded at the start of 05-05, before solver implementation. These verify the normal-incidence optical model and inverse problem; not real F40 measurement accuracy.
1. Zero thickness: air n0=1, lossless film n=1.48, semi-infinite glass n=1.52. Every grid point must equal [(1−1.52)/(1+1.52)]² within 1e−12 absolute reflectance. Repeat with an absorbing substrate against |(n0−nS)/(n0+nS)|².
2. At 550 nm, nfilm=1.5, nsubstrate=2.25: quarter-wave d=550/(4×1.5) nm has zero reflectance (1e−12 absolute); half-wave d=550/(2×1.5) nm restores bare reflectance within 1e−12.
3. An independent declared synthetic 300 nm uniform layer over a contrasting substrate, wide 400–850 nm band, no noise: recover within 1 nm. This is an inverse-consistency check, not measured data. Narrow-band or index-matched flat spectra must not return a unique-thickness claim.
4. Dark and known-reflector calibration must cancel dark offset, lamp gain and smooth source spectrum. Missing calibration, disconnected fiber, out-of-sample spot and invalid optical constants must stop acquisition.
5. Host scale follows Olympus BX51M dimension plate. F40 receiver/adapter and cable dimensions are estimates, not product specifications. Verify metric model and named hardware interactions.
