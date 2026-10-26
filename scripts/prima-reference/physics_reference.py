#!/usr/bin/env python3
"""Independent PRIMA reduced-model reference.

This file does not import, execute, or translate JavaScript results. Geometry is
constructed independently; shared returns are obtained with one augmented
linear solve; nonlinear circuits use full Newton/Cholesky rather than browser
coordinate descent. Adaptive DOP853 provides the temporal reference.
"""
from __future__ import annotations

import argparse
import hashlib
import json
import math
import pathlib
import sys

import numpy as np
import scipy
from scipy.integrate import quad, solve_ivp
from scipy.linalg import cho_factor, cho_solve, eigvalsh, solve
from scipy.special import j0, j1

ROOT = pathlib.Path(__file__).resolve().parents[2]
DEFAULT = dict(irradianceMwMm2=3.5, pulseDurationMs=5.6, frequencyHz=30,
               cycles=1, timeStepMs=0.05, conductivitySm=0.2, gapUm=35,
               bipolarLengthUm=50, activeRadiusUm=15, returnWidthUm=4,
               capacitanceDensityFm2=20, shuntMohm=1, responsivityAW=0.5,
               diodeIdeality=1.5, diodeSaturationNa=0.001)


def geometry(config=DEFAULT, small=False):
    width = 100.0
    radius = width / np.sqrt(3.0)
    if small:
        centers = np.array([[0., 0.]] + [[100 * math.cos(k * math.pi / 3),
                                         100 * math.sin(k * math.pi / 3)] for k in range(6)])
    else:
        half = []
        for row in range(20):
            for col in range(-20, 21):
                x = width * (col + (row + .5) / 2)
                y = width * np.sqrt(3) / 2 * (row + .5)
                if abs(x) > 950 or y > 1000 - radius:
                    continue
                score = max(abs(x), y, (abs(x) + y) / np.sqrt(2))
                half.append((math.floor(score * 1e6 + .5), y, x))
        chosen = sorted(half)[:189]
        centers = np.array(sorted([(x, y) for _, y, x in chosen] +
                                 [(-x, -y) for _, y, x in chosen], key=lambda p: (-p[1], p[0])))
    vertex_angles = np.pi / 6 + np.arange(6) * np.pi / 3
    offsets = np.stack([radius * np.cos(vertex_angles), radius * np.sin(vertex_angles)], axis=1)
    vertices = centers[:, None, :] + offsets[None, :, :]
    edge_set = set()
    for polygon in vertices:
        for k in range(6):
            a = tuple(np.rint(polygon[k] * 1e5).astype(np.int64))
            b = tuple(np.rint(polygon[(k + 1) % 6] * 1e5).astype(np.int64))
            edge_set.add(tuple(sorted((a, b))))
    area = np.sqrt(3) / 2 * width**2
    active_area = np.pi * config['activeRadiusUm']**2
    return_area = len(edge_set) * radius * config['returnWidthUm']
    return dict(centers=centers, vertices=vertices, pixel_area=area,
                active_area=active_area, return_area=return_area,
                photo_area=(area - active_area - return_area / len(centers)) / 2,
                edge_count=len(edge_set))


def transfer(g, config=DEFAULT, subdivisions=16):
    n = len(g['centers'])
    a = config['activeRadiusUm'] / np.pi
    b = config['returnWidthUm'] / 2
    vertices = g['vertices'][0] - g['centers'][0]
    offsets = []
    for k in range(6):
        for j in range(subdivisions):
            t = (j + .5) / subdivisions
            offsets.append((1 - t) * vertices[k] + t * vertices[(k + 1) % 6])
    offsets = np.array(offsets)
    d = g['centers'][:, None, :] - g['centers'][None, :, :]
    # A lattice contains many repeated displacements. Evaluate each distinct
    # displacement once; this preserves the equations and makes 32-point
    # perimeter refinement practical in continuous integration.
    flat_d = d.reshape(-1, 2)
    _, unique_index, inverse = np.unique(np.rint(flat_d * 1e6).astype(np.int64),
                                       axis=0, return_index=True, return_inverse=True)
    unique_d = flat_d[unique_index]
    factor = 1e6 / (2 * np.pi * config['conductivitySm'])

    def basis(delta, height):
        return factor / np.sqrt(np.sum(delta**2, axis=-1) + height**2)

    raa = basis(unique_d, 2 * a)[inverse].reshape(n, n)
    rar_values = sum(basis(unique_d - offset, a + b) for offset in offsets) / len(offsets)
    rar = rar_values[inverse].reshape(n, n)
    rrr_values = np.zeros(len(unique_d))
    # Accumulate repeated offset differences only once for efficiency.
    differences = {}
    for oa in offsets:
        for ob in offsets:
            delta = oa - ob
            key = tuple(np.rint(delta * 1e8).astype(np.int64))
            if key not in differences:
                differences[key] = [delta, 0]
            differences[key][1] += 1
    for delta, multiplicity in differences.values():
        rrr_values += multiplicity * basis(unique_d + delta, 2 * b) / len(offsets)**2
    rrr = rrr_values[inverse].reshape(n, n)
    # [Rrr -1; 1' 0] [Ireturn; Vreturn] = [-Rra; -1'] Iactive.
    augmented = np.block([[rrr, -np.ones((n, 1))], [np.ones((1, n)), np.zeros((1, 1))]])
    right = np.vstack([-rar.T, -np.ones((1, n))])
    answer = solve(augmented, right, assume_a='gen')
    return_map, return_potential = answer[:-1], answer[-1]
    z = raa + rar @ return_map - return_potential[None, :]
    ca = config['capacitanceDensityFm2'] * g['active_area'] * 1e-12
    cr = config['capacitanceDensityFm2'] * g['return_area'] * 1e-12
    s = np.eye(n) / ca + np.ones((n, n)) / cr
    return dict(z=z, return_map=return_map, return_potential=return_potential,
                ca=ca, cr=cr, s=s, a=a, b=b, offsets=offsets, g_cache={}, n=n)


def circuit(model, config, q, photocurrent, h=0.0):
    if h not in model['g_cache']:
        a = model['z'] + h * model['s']
        model['g_cache'][h] = cho_solve(cho_factor(a, lower=True), np.eye(model['n']))
    conductance = model['g_cache'][h]
    offset = model['s'] @ q
    alpha = 2 * config['diodeIdeality'] * 8.617333262145e-5 * 310
    saturation = config['diodeSaturationNa'] * 1e-9
    shunt_g = 1 / (config['shuntMohm'] * 1e6)
    v = np.minimum(1.1, offset + (model['z'] + h * model['s']) @ photocurrent)

    def residual(voltage):
        current = conductance @ (voltage - offset)
        diode = saturation * np.expm1(np.minimum(100, voltage / alpha))
        return current + diode + shunt_g * voltage - photocurrent

    for _ in range(80):
        error = residual(v)
        norm = np.max(np.abs(error))
        if norm < 2e-16:
            current = conductance @ (v - offset)
            return current, v
        diagonal = saturation / alpha * np.exp(np.minimum(100, v / alpha)) + shunt_g
        jac = conductance + np.diag(diagonal)
        step = cho_solve(cho_factor(jac, lower=True), -error)
        scale = 1.0
        while scale > 2**-30:
            candidate = v + scale * step
            if np.max(np.abs(residual(candidate))) < norm:
                v = candidate
                break
            scale *= .5
        else:
            raise RuntimeError('Reference Newton line search failed')
    raise RuntimeError('Reference circuit did not converge')


def photocurrent(g, config, illumination):
    return np.asarray(illumination) * config['irradianceMwMm2'] * g['photo_area'] * 1e-9 * config['responsivityAW']


def simulate_be(model, config, photo, dt_ms=None):
    dt = config['timeStepMs'] if dt_ms is None else dt_ms
    n_on = math.ceil(config['pulseDurationMs'] / dt)
    n_on += n_on % 2
    period = 1000 / config['frequencyHz']
    n_off = math.ceil((period - config['pulseDurationMs']) / dt)
    on_h = config['pulseDurationMs'] / n_on * 1e-3
    off_h = (period - config['pulseDurationMs']) / n_off * 1e-3
    q = np.zeros(model['n'])
    snapshot = None
    for cyc in range(config['cycles']):
        phase_start = q.copy()
        for step in range(1, n_on + 1):
            current, voltage = circuit(model, config, q, photo, on_h)
            q += on_h * current
            if cyc == config['cycles'] - 1 and step == n_on // 2:
                snapshot = dict(chargeC=q.copy(), currentA=current.copy(), voltageV=voltage.copy())
        phase_end = q.copy()
        for _ in range(n_off):
            current, voltage = circuit(model, config, q, np.zeros(model['n']), off_h)
            q += off_h * current
    return dict(snapshot=snapshot, finalChargeC=q, phaseChargeC=phase_end - phase_start,
                onDtMs=on_h * 1000, offDtMs=off_h * 1000)


def simulate_adaptive(model, config, photo):
    q = np.zeros(model['n'])
    duration = config['pulseDurationMs'] * 1e-3
    period = 1 / config['frequencyHz']
    for cyc in range(config['cycles']):
        phase_start = q.copy()
        on = solve_ivp(lambda t, state: circuit(model, config, state, photo)[0],
                       (0, duration), q, method='DOP853', rtol=2e-10, atol=1e-20, dense_output=True)
        if not on.success:
            raise RuntimeError(on.message)
        if cyc == config['cycles'] - 1:
            qm = on.sol(duration / 2)
            im, vm = circuit(model, config, qm, photo)
            snapshot = dict(chargeC=qm, currentA=im, voltageV=vm)
        phase_end = on.y[:, -1]
        off = solve_ivp(lambda t, state: circuit(model, config, state, np.zeros(model['n']))[0],
                        (0, period - duration), phase_end, method='DOP853', rtol=2e-10, atol=1e-20)
        if not off.success:
            raise RuntimeError(off.message)
        q = off.y[:, -1]
    return dict(snapshot=snapshot, finalChargeC=q, phaseChargeC=phase_end - phase_start)


def fields(model, g, currents, points):
    returns = model['return_map'] @ currents
    xy = [g['centers']]
    widths = [np.full(model['n'], model['a'])]
    amplitudes = [np.asarray(currents)]
    for offset in model['offsets']:
        xy.append(g['centers'] + offset)
        widths.append(np.full(model['n'], model['b']))
        amplitudes.append(returns / len(model['offsets']))
    xy, widths, amplitudes = np.vstack(xy), np.concatenate(widths), np.concatenate(amplitudes)
    out = []
    factor = 1e6 / (2 * np.pi * g['conductivity'])
    for x, y, z in points:
        delta = np.column_stack([x - xy[:, 0], y - xy[:, 1], z + widths])
        length = np.linalg.norm(delta, axis=1)
        potential = factor * np.sum(amplitudes / length)
        e = factor * 1e6 * np.sum((amplitudes / length**3)[:, None] * delta, axis=0)
        out.append([potential * 1e3, *e])
    return np.asarray(out)


def clean(value):
    if isinstance(value, np.ndarray):
        return clean(value.tolist())
    if isinstance(value, (np.floating, float)):
        if not math.isfinite(value):
            raise ValueError('Nonfinite fixture result')
        return float(f'{float(value):.10g}') if value else 0
    if isinstance(value, np.integer):
        return int(value)
    if isinstance(value, dict):
        return {k: clean(v) for k, v in value.items()}
    if isinstance(value, (tuple, list)):
        return [clean(x) for x in value]
    return value


def generate():
    result = dict(schema='bts.prima.physics-reference.v1', provenance={
        'pythonSeries': f'{sys.version_info.major}.{sys.version_info.minor}',
        'numpy': np.__version__, 'scipy': scipy.__version__,
        'generator': 'Independent augmented shared-return solve, global Newton/Cholesky, adaptive DOP853',
        'roundedSignificantDigits': 10,
        'scope': 'Numerical verification of the documented reduced model; not measured PRIMA device data',
    })
    green = []
    for radius, depth, width in [(0, 0, 5), (0, 35, 5), (20, 35, 5), (100, 10, 2), (300, 85, 5), (50, 0, 10)]:
        a = depth + width
        v_integral = quad(lambda u: np.exp(-u) * j0(radius / a * u), 0, np.inf, epsabs=1e-12, limit=1000)[0] / a
        ez_integral = quad(lambda u: u * np.exp(-u) * j0(radius / a * u), 0, np.inf, epsabs=1e-12, limit=1000)[0] / a**2
        er_integral = quad(lambda u: u * np.exp(-u) * j1(radius / a * u), 0, np.inf, epsabs=1e-12, limit=1000)[0] / a**2
        factor = 1e6 / (2 * np.pi * .2)
        green.append(dict(radiusUm=radius, zUm=depth, sourceWidthUm=width, conductivitySm=.2,
                          resistanceOhm=factor * v_integral, radialFieldPerAmpVm=factor * 1e6 * er_integral,
                          axialFieldPerAmpVm=factor * 1e6 * ez_integral))
    result['greenCases'] = green
    cases, convergence = [], []
    for name, changes, illumination in [
        ('seven-center', {}, [1, 0, 0, 0, 0, 0, 0]),
        ('seven-pattern', dict(irradianceMwMm2=2, pulseDurationMs=.7, cycles=2), [1, .2, .7, 0, .4, 0, .9]),
        ('seven-low-conductivity', dict(conductivitySm=.05, shuntMohm=3), [1, 0, .5, 0, 0, .25, 0]),
        ('seven-low-capacitance', dict(capacitanceDensityFm2=1, pulseDurationMs=9.8), [1, 1, 0, 0, .4, 0, 0]),
    ]:
        print(name, flush=True)
        c = {**DEFAULT, **changes}
        g = geometry(c, small=True); g['conductivity'] = c['conductivitySm']
        model = transfer(g, c)
        photo = photocurrent(g, c, illumination)
        exact = simulate_adaptive(model, c, photo)
        be = simulate_be(model, c, photo)
        cases.append(dict(name=name, config=c, centersUm=g['centers'], edgeCount=g['edge_count'],
                          photoAreaPerDiodeUm2=g['photo_area'], illumination=illumination,
                          impedanceOhm=model['z'], returnMap=model['return_map'], photocurrentA=photo,
                          backwardEuler=be, adaptive=exact))
        for dt in [.2, .1, .05, .025]:
            approx = simulate_be(model, c, photo, dt)
            qscale = max(np.max(np.abs(exact['phaseChargeC'])), 1e-20)
            iscale = max(np.max(np.abs(exact['snapshot']['currentA'])), 1e-20)
            current_error = np.max(np.abs(approx['snapshot']['currentA'] - exact['snapshot']['currentA']))
            convergence.append(dict(case=name, timeStepMs=dt,
                                    maxPhaseChargeErrorRelativeToPeak=np.max(np.abs(approx['phaseChargeC'] - exact['phaseChargeC'])) / qscale,
                                    maxSnapshotCurrentErrorRelativeToPeak=current_error / iscale,
                                    maxSnapshotCurrentErrorUa=current_error * 1e6,
                                    maxSnapshotCurrentErrorRelativeToPeakPhotocurrent=current_error / max(np.max(photo), 1e-20),
                                    referencePeakSnapshotCurrentUa=iscale * 1e6))
    result['smallCircuits'] = cases
    print('full-378', flush=True)
    c = {**DEFAULT}
    g = geometry(c); g['conductivity'] = c['conductivitySm']
    illumination = np.array([float(180 <= np.hypot(x, y) <= 450 and not (x > 0 and abs(y) < 120)) for x, y in g['centers']])
    model = transfer(g, c)
    photo = photocurrent(g, c, illumination)
    be = simulate_be(model, c, photo)
    points = np.array([[0, 0, 35], [100, 0, 35], [-300, 100, 35], [250, -200, 85], [0, 0, 150], [975, 0, 35]])
    result['fullCircuit'] = dict(name='full-378-landolt-like', config=c, centersUm=g['centers'], edgeCount=g['edge_count'],
                               illumination=illumination, photocurrentA=photo, backwardEuler=be,
                               fieldPointsUm=points, fieldValuesMvVm=fields(model, g, be['snapshot']['currentA'], points),
                               returnCurrentsA=model['return_map'] @ be['snapshot']['currentA'],
                               minPortResistanceEigenvalueOhm=eigvalsh(model['z'], subset_by_index=[0, 0])[0])
    # Refine full-array time step independently; no agreement tolerance is
    # inferred from this difference alone.
    finer = simulate_be(model, c, photo, .025)
    full_time = dict(coarseStepMs=.05, fineStepMs=.025,
                     phaseChargeChangeRelativeToFinePeak=np.max(np.abs(be['phaseChargeC'] - finer['phaseChargeC'])) / np.max(np.abs(finer['phaseChargeC'])),
                     snapshotCurrentChangeRelativeToFinePeak=np.max(np.abs(be['snapshot']['currentA'] - finer['snapshot']['currentA'])) / np.max(np.abs(finer['snapshot']['currentA'])))
    print('return basis convergence', flush=True)
    previous = None
    spatial = []
    for subdivision in [4, 8, 16, 32]:
        refined = transfer(g, c, subdivision)
        values = fields(refined, g, be['snapshot']['currentA'], points)
        scale = np.max(np.abs(values[:, 0]))
        spatial.append(dict(returnSegmentsPerSide=subdivision,
                            potentialMv=values[:, 0],
                            potentialChangeRelativeToPeak=None if previous is None else np.max(np.abs(values[:, 0] - previous)) / scale))
        previous = values[:, 0]
    result['convergence'] = dict(time=convergence, fullArrayTime=full_time, returnBasis=spatial)
    return clean(result)


ADAPTIVE_ABSOLUTE_TOLERANCES = {
    'currentA': 1e-14,
    'voltageV': 1e-10,
    'chargeC': 1e-18,
    'phaseChargeC': 1e-18,
    'finalChargeC': 1e-18,
}
TIME_SUMMARY_ABSOLUTE_TOLERANCES = {
    'maxPhaseChargeErrorRelativeToPeak': 1e-11,
    'maxSnapshotCurrentErrorUa': 1e-9,
    'referencePeakSnapshotCurrentUa': 1e-9,
    'maxSnapshotCurrentErrorRelativeToPeakPhotocurrent': 1e-9,
    'maxSnapshotCurrentErrorRelativeToPeak': 1e-6,
}


def adaptive_absolute_tolerance(path):
    """Only the named adaptive data leaves have a CPU-portability allowance.

    All tolerances are absolute, in the units named by the JSON key; rtol=0.
    Full-array/backward-Euler data, fields, geometry, matrices and provenance
    remain exact. Array lengths and object keys are checked independently.
    """
    if (len(path) == 6 and path[0] == 'smallCircuits'
            and isinstance(path[1], int) and path[2:4] == ('adaptive', 'snapshot')
            and isinstance(path[5], int)):
        return ADAPTIVE_ABSOLUTE_TOLERANCES.get(path[4], 0.0)
    if (len(path) == 5 and path[0] == 'smallCircuits'
            and isinstance(path[1], int) and path[2] == 'adaptive'
            and path[3] in ('phaseChargeC', 'finalChargeC')
            and isinstance(path[4], int)):
        return ADAPTIVE_ABSOLUTE_TOLERANCES[path[3]]
    if (len(path) == 4 and path[:2] == ('convergence', 'time')
            and isinstance(path[2], int)):
        return TIME_SUMMARY_ABSOLUTE_TOLERANCES.get(path[3], 0.0)
    return 0.0


def _strict_json(content):
    def reject_constant(value):
        raise ValueError(f'Nonfinite JSON value: {value}')

    def unique_object(pairs):
        result = {}
        for key, value in pairs:
            if key in result:
                raise ValueError(f'Duplicate JSON key: {key}')
            result[key] = value
        return result

    return json.loads(content, parse_constant=reject_constant,
                      object_pairs_hook=unique_object)


def _compare_values(stored, regenerated, path=(), tolerance=None, ignore_digest=False):
    label = '/' + '/'.join(map(str, path))
    if type(stored) is not type(regenerated):
        raise ValueError(f'{label}: JSON types differ')
    if isinstance(stored, dict):
        if stored.keys() != regenerated.keys():
            raise ValueError(f'{label}: object keys differ')
        for key in stored:
            _compare_values(stored[key], regenerated[key], path + (key,), tolerance, ignore_digest)
    elif isinstance(stored, list):
        if len(stored) != len(regenerated):
            raise ValueError(f'{label}: array lengths differ')
        for index, (left, right) in enumerate(zip(stored, regenerated)):
            _compare_values(left, right, path + (index,), tolerance, ignore_digest)
    elif type(stored) in (float, int):
        if not math.isfinite(stored) or not math.isfinite(regenerated):
            raise ValueError(f'{label}: nonfinite numeric value')
        bound = tolerance(path) if tolerance else 0.0
        error = abs(stored - regenerated)
        if error > bound:
            raise ValueError(f'{label}: absolute difference {error:.12g} exceeds {bound:.12g}')
    elif ignore_digest and path == ('fixtureSha256',):
        # Both digests have already been checked against their respective
        # fixture bytes. No other metadata is exempt from exact comparison.
        return
    elif stored != regenerated:
        raise ValueError(f'{label}: exact value differs')


def validation_report(data, fixture_bytes):
    """A report describes and hashes these exact fixture bytes."""
    return dict(schema='bts.prima.physics-validation.v1',
                fixtureSha256=hashlib.sha256(fixture_bytes).hexdigest(),
                provenance=data['provenance'],
                validationScope='Independent numerical verification of the reduced circuit and source basis; no commercial device or patient validation',
                referenceCases=dict(hankelIntegrals=len(data['greenCases']), independentSmallNetworks=len(data['smallCircuits']), fullArrayPixels=len(data['fullCircuit']['centersUm'])),
                browserResidualGatePa=.2,
                productionDiscretization=dict(maximumTimeStepMs=.05, returnSegmentsPerHexSide=16),
                minFullArrayPortResistanceEigenvalueOhm=data['fullCircuit']['minPortResistanceEigenvalueOhm'],
                convergence=data['convergence'])


def check_reference(stored_bytes, regenerated_bytes, stored_report_bytes, regenerated_report_bytes):
    """Verify retained evidence without rewriting fixtures or weakening JS gates.

    Exact metadata, structure and non-adaptive numerical data are required.
    Every report must exactly describe its own fixture, including its checksum.
    A regenerated digest may differ only after the numerical comparison passes.
    """
    stored, regenerated = _strict_json(stored_bytes), _strict_json(regenerated_bytes)
    stored_report = _strict_json(stored_report_bytes)
    regenerated_report = _strict_json(regenerated_report_bytes)
    _compare_values(stored, regenerated, tolerance=adaptive_absolute_tolerance)
    _compare_values(stored_report, validation_report(stored, stored_bytes))
    _compare_values(regenerated_report, validation_report(regenerated, regenerated_bytes))
    _compare_values(stored_report, regenerated_report,
                    tolerance=adaptive_absolute_tolerance, ignore_digest=True)
    return stored_bytes == regenerated_bytes and stored_report_bytes == regenerated_report_bytes


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--check', action='store_true')
    parser.add_argument('--output', type=pathlib.Path, default=ROOT / 'public/assets/prima/physics-reference.json')
    parser.add_argument('--report-output', type=pathlib.Path, default=ROOT / 'docs/prima/PHYSICS_VALIDATION.json')
    args = parser.parse_args()
    data = generate()
    content = json.dumps(data, indent=2, ensure_ascii=False, allow_nan=False) + '\n'
    report = validation_report(data, content.encode())
    report_content = json.dumps(report, indent=2, ensure_ascii=False, allow_nan=False) + '\n'
    if args.check:
        if not args.output.exists() or not args.report_output.exists():
            raise SystemExit('The retained physics fixture and validation report are required.')
        try:
            identical = check_reference(args.output.read_bytes(), content.encode(),
                                        args.report_output.read_bytes(), report_content.encode())
        except (ValueError, KeyError, TypeError) as error:
            raise SystemExit(f'Physics reference verification failed: {error}') from error
        print('Physics reference and report are byte-identical.' if identical else
              'Physics reference matches within declared adaptive CPU tolerances; stored fixture checksum verified.',
              flush=True)
    else:
        args.output.parent.mkdir(parents=True, exist_ok=True)
        args.output.write_text(content)
        args.report_output.parent.mkdir(parents=True, exist_ok=True)
        args.report_output.write_text(report_content)
        print(f'Wrote {args.output}', flush=True)


if __name__ == '__main__':
    main()
