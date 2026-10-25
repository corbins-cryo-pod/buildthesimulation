"""Reproduce a 28-row source-quadrature convergence sweep in the UI gap range."""
from pathlib import Path
import json
import numpy as np
from field_reference import dimensionless_reference, source_quadrature

positions = np.sort(np.append(np.linspace(0, 3, 63), .5))
rows = []
for gap in [.1, .125, .25, .5, 1, 2, 4]:
    references = [dimensionless_reference(float(rho), gap) for rho in positions]
    for order in [16, 24, 32, 48]:
        pmax, emax = 0., 0.
        for rho, reference in zip(positions, references):
            for alignment in [0., .5]:
                result = source_quadrature(float(rho), gap, order, alignment)
                pmax = max(pmax, abs(result[0]/reference[0]-1))
                emax = max(emax, np.linalg.norm(result[1:]-reference[1:])/np.linalg.norm(reference[1:]))
        rows.append(dict(gapOverRadius=gap, radialOrder=order, angularOrder=4*order,
                         evaluations=128, maximumRelativePotentialError=float(pmax), maximumRelativeVectorError=float(emax)))
path = Path('tests/fixtures/retinal-field/convergence.json')
path.parent.mkdir(parents=True, exist_ok=True)
path.write_text(json.dumps(dict(schema='retinal-field-convergence-v1',
    method='Independent elliptic/adaptive reference versus raw Gauss-Legendre/periodic source quadrature.',
    observationRadii=list(map(float, positions)), angularAlignments=[0., .5], rows=rows,
    limitation='Measured values on the listed samples are not a global error bound; observation-grid peak sampling is a separate issue.'), indent=2)+'\n')
print(f'Wrote {len(rows)} quadrature-convergence rows.')
