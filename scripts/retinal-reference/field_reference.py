"""Independent full-space uniform-current disk solution.

Azimuth is integrated analytically with complete elliptic integrals K and E;
the radial integral uses adaptive SciPy quadrature. This does not import the JS
source quadrature or interpolation. All mathematical functions use SI units.
"""
from dataclasses import dataclass
from functools import lru_cache
from pathlib import Path
import argparse
import json
import math
import platform
import numpy as np
import scipy
from scipy.integrate import quad
from scipy.special import ellipk, ellipe


@dataclass(frozen=True)
class Disk:
    x_m: float = 0
    y_m: float = 0
    z_m: float = 100e-6
    radius_m: float = 100e-6
    current_A: float = 80e-6


def axis_solution(current_A, radius_m, z_m, conductivity_S_m=.2):
    if radius_m <= 0 or conductivity_S_m <= 0 or z_m == 0:
        raise ValueError('Require positive radius and conductivity, nonzero separation.')
    s = math.hypot(radius_m, z_m)
    potential = current_A / (2 * math.pi * conductivity_S_m * (s + abs(z_m)))
    ez = math.copysign(1, z_m) * current_A / (2 * math.pi * conductivity_S_m * s * (s + abs(z_m)))
    return potential, ez


@lru_cache(maxsize=8192)
def dimensionless_reference(rho, z):
    if not math.isfinite(rho) or not math.isfinite(z) or rho < 0 or z == 0:
        raise ValueError('Require rho >= 0 and finite nonzero axial separation.')
    h = abs(z)
    if rho < 1e-7 * max(1, h):
        s = math.hypot(1, h)
        return np.array([2 / (s + h) - rho**2 / (2 * s**3), rho / s**3,
                         math.copysign(1, z) * (2 / (s * (s + h)) - 1.5 * h * rho**2 / s**5)])

    def kernel(u, component):
        a = (rho + u)**2 + h*h
        d = (rho - u)**2 + h*h
        m = 4 * rho * u / a  # scipy uses parameter m=k², not modulus k.
        k, e = ellipk(m), ellipe(m)
        root = math.sqrt(a)
        if component == 0:
            angular = 4*k/root
        elif component == 1:
            angular = 2/(rho*root) * (k + (rho*rho - u*u - h*h)/d * e)
        else:
            angular = 4*h*e/(d*root)
        return u * angular / math.pi

    boundaries = [0, rho, 1] if 0 < rho < 1 else [0, 1]
    result = np.array([sum(quad(kernel, left, right, args=(component,), epsabs=2e-11,
                                    epsrel=2e-11, limit=250)[0]
                           for left, right in zip(boundaries[:-1], boundaries[1:]))
                       for component in range(3)])
    result[2] *= math.copysign(1, z)
    return result


def reference(sources, point, conductivity_S_m=.2):
    if conductivity_S_m <= 0 or not math.isfinite(conductivity_S_m):
        raise ValueError('Conductivity must be finite and positive.')
    result = np.zeros(4)
    for source in sources:
        if source.current_A == 0:
            continue
        if source.radius_m <= 0:
            raise ValueError('Radius must be positive.')
        delta = np.asarray(point) - np.array([source.x_m, source.y_m, source.z_m])
        radial = math.hypot(delta[0], delta[1])
        p, er, ez = dimensionless_reference(radial/source.radius_m, delta[2]/source.radius_m)
        coefficient = source.current_A/(4*math.pi*conductivity_S_m)
        result[0] += coefficient/source.radius_m*p
        if radial > 0:
            result[1:3] += coefficient/source.radius_m**2*er*delta[:2]/radial
        result[3] += coefficient/source.radius_m**2*ez
    return result


def source_quadrature(rho, h, order=32, angular_offset=0):
    nodes, weights = np.polynomial.legendre.leggauss(order)
    u = (nodes+1)/2
    w = weights/2
    cosine = np.cos(2*np.pi*(np.arange(4*order)+angular_offset)/(4*order))
    d = rho-u[:, None]*cosine[None, :]
    radius = np.sqrt(rho*rho + u[:, None]**2 - 2*rho*u[:, None]*cosine[None, :] + h*h)
    normalized = 2*u[:, None]*w[:, None]/(4*order)
    return np.array([np.sum(normalized/radius), np.sum(normalized*d/radius**3), np.sum(normalized*h/radius**3)])


def fixture(name, sources, point, conductivity=.2):
    physical = [Disk(s['xUm']*1e-6, s['yUm']*1e-6, s['zUm']*1e-6, s['radiusUm']*1e-6, s['currentUa']*1e-6) for s in sources]
    result = reference(physical, np.array([point['xUm'], point['yUm'], point['zUm']])*1e-6, conductivity)
    return dict(name=name, sources=sources, point=point, conductivitySm=conductivity,
                expected=dict(potentialMv=float(1000*result[0]), exVm=float(result[1]), eyVm=float(result[2]), ezVm=float(result[3]), currentDensityAm2=float(conductivity*np.linalg.norm(result[1:]))))


def fixtures():
    cases = []
    for ratio in [.025, .1, .25, 1, 4]:
        for rho in [0, .25, .5, .8, .95, 1, 1.05, 1.2, 1.5, 3, 10]:
            source = dict(id='S', xUm=0, yUm=0, zUm=100*ratio, radiusUm=100, currentUa=80)
            cases.append(fixture(f'unit-h{ratio}-r{rho}', [source], dict(xUm=100*rho, yUm=0, zUm=0)))
    for k in range(7):
        angle = (k+.5)*math.pi/7
        radius = [50, 75, 112.5, 150, 200, 225, 250][k]
        source = dict(id='S', xUm=125, yUm=-250, zUm=25+50*k, radiusUm=radius, currentUa=-80+10*k)
        point = dict(xUm=125+radius*.91*math.cos(angle), yUm=-250+radius*.91*math.sin(angle), zUm=0)
        cases.append(fixture(f'rotated-physical-{k}', [source], point, [.05, .1, .2, .3, .5, .7, 1][k]))
    for k in range(7):
        stim = [dict(id='S0', xUm=-350, yUm=175, zUm=25+50*k, radiusUm=100, currentUa=-80),
                dict(id='S1', xUm=225, yUm=-150, zUm=25+50*k, radiusUm=112.5, currentUa=-40)]
        if k%2:
            returns = [dict(id='R'+str(j), xUm=6000*math.cos(j*math.pi/4), yUm=6000*math.sin(j*math.pi/4), zUm=25+50*k, radiusUm=250, currentUa=15) for j in range(8)]
        else:
            returns = [dict(id='R', xUm=12000, yUm=0, zUm=25+50*k, radiusUm=250, currentUa=120)]
        cases.append(fixture(f'balanced-multiple-{k}', stim+returns, dict(xUm=100*k-250, yUm=50*k-125, zUm=0), .2))
    assert len(cases) == 69
    return cases


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--output', default='tests/fixtures/retinal-field/independent-reference.json')
    args = parser.parse_args()
    data = dict(schema='retinal-field-independent-reference-v1', method='Analytical complete-elliptic angular integration and adaptive radial quadrature.',
                model='Uniform source disks in homogeneous isotropic full space; no insulating backing.', referenceTolerances=dict(absolute=2e-11, relative=2e-11),
                # The reproducible fixture identifies the Python language/runtime
                # series used by CI, while numerical libraries remain exact pins.
                # A Python maintenance release must not alter numerical evidence
                # solely by changing a provenance string.
                referenceEnvironment=dict(python='.'.join(platform.python_version_tuple()[:2]), numpy=np.__version__, scipy=scipy.__version__), cases=fixtures())
    destination = Path(args.output); destination.parent.mkdir(parents=True, exist_ok=True)
    destination.write_text(json.dumps(data, indent=2)+'\n')
    print(f'Wrote {len(data["cases"])} independently computed finite-disk fixtures.')
