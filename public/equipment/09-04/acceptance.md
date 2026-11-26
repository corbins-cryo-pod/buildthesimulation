# Frozen reference cases — 09-04

Declared before implementing the acquisition solver. Idealized virtual instrument, not Tektronix calibration data.
1. A digital 1 kHz pulse with a rising edge at an integer index on a 1 MS/s clock: first sample crossing 1 V anchors trigger; positive-edge cursor separation must equal 1 ms within 1 sample. Default 0–2.5 V compensator nominal into ideal compensated 10 MΩ: loaded high = 2.5 × 10,000,000 / 10,001,000 V, allow one display ADC step.
2. On a falling trigger, the first edge at/above to below the level follows the rising edge by half a period for a 50% duty source (one sample).
3. An unloaded external 1 V-peak 1 kHz sine: RMS over an integer cycle = 1/√2 V (one ADC step). AC coupling rejects settled DC, while DC coupling retains the baseline.
4. A missing CH1 connection and a level exceeding all samples must not return a successful acquisition. Malformed or nonmonotone timestamps must fail explicitly. Unavailable source history is not to be invented on import.
5. Peak-to-peak overload flags clipping, and an input frequency above Nyquist exhibits its expected alias instead of silently substituting the original frequency.
6. Handle-up envelope without detachable cable: 454 × 371 × 205 mm (W×H×D); glTF max-min tolerance 1 mm. Four FlexChannel inputs, CH1 mating cable removable.
