# Predeclared E36313A checks
These are analytic DC checks, not measurements of a physical instrument. The load model solves Ohm’s law and a two-limit source; displayed readings are not vendor-calibrated.

1. CH1 enabled, Vset = 5 V, Ilim = 0.1 A, R = 100 Ω, zero series resistance: CV, Vload = 5 V, I = 50 mA, P = 0.25 W. At R = 10 Ω: CC, Vload = 1 V, I = 100 mA, P = 0.1 W. Tolerance 1 µV, 1 µA, 1 µW for unrounded ideal outputs.
2. Independently derived boundary R = Vset/Ilim = 50 Ω. At exactly 50 Ω the CV solution is just at the current ceiling; label crossover. Below it assert CC. Above it assert CV.
3. With combined lead resistance 2 Ω and Rload = 100 Ω, local sensing gives 5/102 A and 100 × 5/102 V at the load. In remote sensing, hold 5 V at load while sufficient headroom exists. Test remote sense operation only within the documented maximum lead-drop correction; reject invalid sense wiring.
4. Channel disabled and open load are different states: disabled returns no delivery (V, I, P zero in the passive steady-state model); enabled/open reads terminal voltage with zero current. Resistive short: I limited, Vload = 0. Reject miswired or physically out-of-range configurations.
5. GLB scale: reconstructed net enclosure W × H × D = 213 × 133 × 364 mm (±1 mm, excluding feet and strap). Three color-coded, independent front DC output pairs. Model-specific front, rear and side evidence required; inferred sizes are not mechanical inspection data.
6. Total power equals the sum of isolated channel terminal powers, Vload × I plus I²Rlead; analytic balance tolerance 1 µW.
