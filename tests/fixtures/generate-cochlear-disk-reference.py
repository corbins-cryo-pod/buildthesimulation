"""Independent off-axis disk references for tests/cochlear-fields.mjs.

Uses an analytic angular integral (complete elliptic K) plus adaptive radial
integration, rather than the production tensor-product disk quadrature.
Requires NumPy/SciPy only to regenerate the committed JSON, not to run JS tests.
"""
import json
from math import pi, sqrt
from pathlib import Path

from scipy.integrate import quad
from scipy.special import ellipk

sigma = 1 / 3
specifications = [
    (0.15, 0.5, 0.1),
    (0.15, 0.5, 0.5),
    (0.35, 0.1, 0.2),
    (0.35, 0.1, 0.35),
    (0.35, 0.1, 0.5),
    (0.03, 0.1, 0.05),
    (0.35, 2.0, 1.0),
    (0.15, 0.0, 0.3),
]
cases = []
for radius, axial, lateral in specifications:
    def angular_integral(radial):
        denominator_squared = (lateral + radial) ** 2 + axial ** 2
        parameter = 4 * lateral * radial / denominator_squared
        return 4 * radial * ellipk(parameter) / sqrt(denominator_squared)

    integral, estimated_error = quad(
        angular_integral, 0, radius,
        epsabs=1e-13, epsrel=1e-13, limit=300,
    )
    scale = 1 / (4 * pi * sigma * pi * radius ** 2)
    cases.append({
        "radiusMm": radius,
        "pointMm": [lateral, 0, axial],
        "expectedMvPerUa": integral * scale,
        "estimatedAbsoluteErrorMvPerUa": estimated_error * scale,
    })

record = {
    "description": "Uniform-current circular disk in unbounded homogeneous conductor",
    "conductivitySPerM": sigma,
    "sourcePositionMm": [0, 0, 0],
    "sourceNormal": [0, 0, 1],
    "method": "Complete elliptic K angular integral + scipy.integrate.quad radial integral",
    "greenFunction": "1/(4*pi*sigma*distance)",
    "angularIntegral": "4*K(4*r*rho/((r+rho)^2+z^2))/sqrt((r+rho)^2+z^2)",
    "potentialUnit": "mV/uA",
    "cases": cases,
}
target = Path(__file__).with_name("cochlear-disk-reference.json")
target.write_text(json.dumps(record, indent=2) + "\n")
print(f"Wrote {len(cases)} independent reference cases to {target.name}")
