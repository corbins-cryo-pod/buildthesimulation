"""Focused guards for portable adaptive-reference verification.

The retained fixture remains immutable. Only the declared adaptive quantities
receive absolute unit tolerances; all other numerical/provenance data are exact.
"""
import copy
import json
import math
import unittest

import physics_reference as reference

# Actual changed leaves observed with pinned NumPy 1.26.4 and
# NPY_DISABLE_CPU_FEATURES=AVX2,FMA3,AVX512F. This delta reconstructs the full
# alternate fixture from the retained baseline without storing a duplicate.
CPU_VARIANT_CHANGES = [(('smallCircuits', 3, 'adaptive', 'snapshot', 'currentA', 0), 2.313964613e-11),
 (('smallCircuits', 3, 'adaptive', 'snapshot', 'currentA', 1), 2.320868259e-11),
 (('smallCircuits', 3, 'adaptive', 'snapshot', 'currentA', 2), -6.920845713e-11),
 (('smallCircuits', 3, 'adaptive', 'snapshot', 'currentA', 3), -6.914478166e-11),
 (('smallCircuits', 3, 'adaptive', 'snapshot', 'currentA', 4), 2.459314644e-11),
 (('smallCircuits', 3, 'adaptive', 'snapshot', 'currentA', 5), -6.914478166e-11),
 (('smallCircuits', 3, 'adaptive', 'snapshot', 'currentA', 6), -6.920845713e-11),
 (('smallCircuits', 3, 'adaptive', 'snapshot', 'voltageV', 2), 6.920759318e-05),
 (('smallCircuits', 3, 'adaptive', 'snapshot', 'voltageV', 3), 6.914391851e-05),
 (('smallCircuits', 3, 'adaptive', 'snapshot', 'voltageV', 5), 6.914391851e-05),
 (('smallCircuits', 3, 'adaptive', 'snapshot', 'voltageV', 6), 6.920759318e-05),
 (('smallCircuits', 3, 'adaptive', 'finalChargeC', 0), 1.218735555e-19),
 (('smallCircuits', 3, 'adaptive', 'finalChargeC', 1), 1.226104839e-19),
 (('smallCircuits', 3, 'adaptive', 'finalChargeC', 2), -8.817703407e-20),
 (('smallCircuits', 3, 'adaptive', 'finalChargeC', 3), -8.839775108e-20),
 (('smallCircuits', 3, 'adaptive', 'finalChargeC', 4), 1.088613587e-19),
 (('smallCircuits', 3, 'adaptive', 'finalChargeC', 5), -8.839775108e-20),
 (('smallCircuits', 3, 'adaptive', 'finalChargeC', 6), -8.817703407e-20),
 (('smallCircuits', 3, 'adaptive', 'phaseChargeC', 0), 7.2087259e-10),
 (('smallCircuits', 3, 'adaptive', 'phaseChargeC', 1), 7.2087259e-10),
 (('convergence', 'time', 12, 'maxPhaseChargeErrorRelativeToPeak'), 1.078616369e-07),
 (('convergence', 'time', 12, 'maxSnapshotCurrentErrorRelativeToPeak'), 2.019134033),
 (('convergence', 'time', 12, 'maxSnapshotCurrentErrorUa'), 0.0001397411512),
 (('convergence', 'time', 12, 'maxSnapshotCurrentErrorRelativeToPeakPhotocurrent'), 2.293396687e-05),
 (('convergence', 'time', 12, 'referencePeakSnapshotCurrentUa'), 6.920845713e-05),
 (('convergence', 'time', 13, 'maxPhaseChargeErrorRelativeToPeak'), 3.148038561e-08),
 (('convergence', 'time', 13, 'maxSnapshotCurrentErrorRelativeToPeak'), 0.8389818939),
 (('convergence', 'time', 13, 'maxSnapshotCurrentErrorUa'), 5.806464244e-05),
 (('convergence', 'time', 13, 'maxSnapshotCurrentErrorRelativeToPeakPhotocurrent'), 9.529423327e-06),
 (('convergence', 'time', 13, 'referencePeakSnapshotCurrentUa'), 6.920845713e-05),
 (('convergence', 'time', 14, 'maxPhaseChargeErrorRelativeToPeak'), 1.171176873e-08),
 (('convergence', 'time', 14, 'maxSnapshotCurrentErrorRelativeToPeak'), 0.3758837644),
 (('convergence', 'time', 14, 'maxSnapshotCurrentErrorUa'), 2.601433539e-05),
 (('convergence', 'time', 14, 'maxSnapshotCurrentErrorRelativeToPeakPhotocurrent'), 4.269407407e-06),
 (('convergence', 'time', 14, 'referencePeakSnapshotCurrentUa'), 6.920845713e-05),
 (('convergence', 'time', 15, 'maxPhaseChargeErrorRelativeToPeak'), 5.050989972e-09),
 (('convergence', 'time', 15, 'maxSnapshotCurrentErrorRelativeToPeak'), 0.1775351865),
 (('convergence', 'time', 15, 'maxSnapshotCurrentErrorUa'), 1.228693635e-05),
 (('convergence', 'time', 15, 'maxSnapshotCurrentErrorRelativeToPeakPhotocurrent'), 2.016501143e-06),
 (('convergence', 'time', 15, 'referencePeakSnapshotCurrentUa'), 6.920845713e-05)]


# Observed OPENBLAS_CORETYPE=Haswell variants, with ordinary NumPy dispatch
# and with AVX2,FMA3,AVX512F disabled. The latter reproduces the CI runner.
HASWELL_VARIANT_CHANGES = {'haswell': [(('smallCircuits', 3, 'adaptive', 'snapshot', 'chargeC', 0), 7.208591074e-10),
             (('smallCircuits', 3, 'adaptive', 'snapshot', 'chargeC', 1), 7.208590671e-10),
             (('smallCircuits', 3, 'adaptive', 'snapshot', 'currentA', 0), 2.314113223e-11),
             (('smallCircuits', 3, 'adaptive', 'snapshot', 'currentA', 1), 2.321017377e-11),
             (('smallCircuits', 3, 'adaptive', 'snapshot', 'currentA', 2), -6.920843562e-11),
             (('smallCircuits', 3, 'adaptive', 'snapshot', 'currentA', 3), -6.914475931e-11),
             (('smallCircuits', 3, 'adaptive', 'snapshot', 'currentA', 4), 2.459355432e-11),
             (('smallCircuits', 3, 'adaptive', 'snapshot', 'currentA', 5), -6.914475931e-11),
             (('smallCircuits', 3, 'adaptive', 'snapshot', 'currentA', 6), -6.920843562e-11),
             (('smallCircuits', 3, 'adaptive', 'snapshot', 'voltageV', 2), 6.920757167e-05),
             (('smallCircuits', 3, 'adaptive', 'snapshot', 'voltageV', 3), 6.914389617e-05),
             (('smallCircuits', 3, 'adaptive', 'snapshot', 'voltageV', 5), 6.914389617e-05),
             (('smallCircuits', 3, 'adaptive', 'snapshot', 'voltageV', 6), 6.920757167e-05),
             (('smallCircuits', 3, 'adaptive', 'finalChargeC', 0), 1.218735472e-19),
             (('smallCircuits', 3, 'adaptive', 'finalChargeC', 1), 1.226104755e-19),
             (('smallCircuits', 3, 'adaptive', 'finalChargeC', 2), -8.817702807e-20),
             (('smallCircuits', 3, 'adaptive', 'finalChargeC', 3), -8.839774507e-20),
             (('smallCircuits', 3, 'adaptive', 'finalChargeC', 4), 1.088613513e-19),
             (('smallCircuits', 3, 'adaptive', 'finalChargeC', 5), -8.839774507e-20),
             (('smallCircuits', 3, 'adaptive', 'finalChargeC', 6), -8.817702807e-20),
             (('smallCircuits', 3, 'adaptive', 'phaseChargeC', 0), 7.208725898e-10),
             (('smallCircuits', 3, 'adaptive', 'phaseChargeC', 1), 7.208725898e-10),
             (('convergence', 'time', 6, 'maxSnapshotCurrentErrorRelativeToPeak'), 5.834755356e-05),
             (('convergence', 'time', 12, 'maxPhaseChargeErrorRelativeToPeak'), 1.078652426e-07),
             (('convergence', 'time', 12, 'maxSnapshotCurrentErrorRelativeToPeak'), 2.019134984),
             (('convergence', 'time', 12, 'maxSnapshotCurrentErrorUa'), 0.0001397411735),
             (('convergence', 'time', 12, 'maxSnapshotCurrentErrorRelativeToPeakPhotocurrent'),
              2.293397054e-05),
             (('convergence', 'time', 12, 'referencePeakSnapshotCurrentUa'), 6.920843562e-05),
             (('convergence', 'time', 13, 'maxPhaseChargeErrorRelativeToPeak'), 3.148399129e-08),
             (('convergence', 'time', 13, 'maxSnapshotCurrentErrorRelativeToPeak'), 0.8389824655),
             (('convergence', 'time', 13, 'maxSnapshotCurrentErrorUa'), 5.806466395e-05),
             (('convergence', 'time', 13, 'maxSnapshotCurrentErrorRelativeToPeakPhotocurrent'),
              9.529426857e-06),
             (('convergence', 'time', 13, 'referencePeakSnapshotCurrentUa'), 6.920843562e-05),
             (('convergence', 'time', 14, 'maxPhaseChargeErrorRelativeToPeak'), 1.171537441e-08),
             (('convergence', 'time', 14, 'maxSnapshotCurrentErrorRelativeToPeak'), 0.375884192),
             (('convergence', 'time', 14, 'maxSnapshotCurrentErrorUa'), 2.60143569e-05),
             (('convergence', 'time', 14, 'maxSnapshotCurrentErrorRelativeToPeakPhotocurrent'),
              4.269410938e-06),
             (('convergence', 'time', 14, 'referencePeakSnapshotCurrentUa'), 6.920843562e-05),
             (('convergence', 'time', 15, 'maxPhaseChargeErrorRelativeToPeak'), 5.054595651e-09),
             (('convergence', 'time', 15, 'maxSnapshotCurrentErrorRelativeToPeak'), 0.1775355525),
             (('convergence', 'time', 15, 'maxSnapshotCurrentErrorUa'), 1.228695786e-05),
             (('convergence', 'time', 15, 'maxSnapshotCurrentErrorRelativeToPeakPhotocurrent'),
              2.016504673e-06),
             (('convergence', 'time', 15, 'referencePeakSnapshotCurrentUa'), 6.920843562e-05)],
 'haswell-no-simd': [(('smallCircuits', 3, 'adaptive', 'snapshot', 'chargeC', 0), 7.208591074e-10),
                     (('smallCircuits', 3, 'adaptive', 'snapshot', 'chargeC', 1), 7.208590671e-10),
                     (('smallCircuits', 3, 'adaptive', 'snapshot', 'currentA', 0), 2.314105983e-11),
                     (('smallCircuits', 3, 'adaptive', 'snapshot', 'currentA', 1), 2.321014211e-11),
                     (('smallCircuits', 3, 'adaptive', 'snapshot', 'currentA', 2), -6.920843641e-11),
                     (('smallCircuits', 3, 'adaptive', 'snapshot', 'currentA', 3), -6.914476012e-11),
                     (('smallCircuits', 3, 'adaptive', 'snapshot', 'currentA', 4), 2.459353627e-11),
                     (('smallCircuits', 3, 'adaptive', 'snapshot', 'currentA', 5), -6.914476012e-11),
                     (('smallCircuits', 3, 'adaptive', 'snapshot', 'currentA', 6), -6.920843641e-11),
                     (('smallCircuits', 3, 'adaptive', 'snapshot', 'voltageV', 2), 6.920757247e-05),
                     (('smallCircuits', 3, 'adaptive', 'snapshot', 'voltageV', 3), 6.914389697e-05),
                     (('smallCircuits', 3, 'adaptive', 'snapshot', 'voltageV', 5), 6.914389697e-05),
                     (('smallCircuits', 3, 'adaptive', 'snapshot', 'voltageV', 6), 6.920757247e-05),
                     (('smallCircuits', 3, 'adaptive', 'finalChargeC', 0), 1.218735497e-19),
                     (('smallCircuits', 3, 'adaptive', 'finalChargeC', 1), 1.22610478e-19),
                     (('smallCircuits', 3, 'adaptive', 'finalChargeC', 2), -8.817702989e-20),
                     (('smallCircuits', 3, 'adaptive', 'finalChargeC', 3), -8.839774689e-20),
                     (('smallCircuits', 3, 'adaptive', 'finalChargeC', 4), 1.088613535e-19),
                     (('smallCircuits', 3, 'adaptive', 'finalChargeC', 5), -8.839774689e-20),
                     (('smallCircuits', 3, 'adaptive', 'finalChargeC', 6), -8.817702989e-20),
                     (('smallCircuits', 3, 'adaptive', 'phaseChargeC', 0), 7.208725898e-10),
                     (('smallCircuits', 3, 'adaptive', 'phaseChargeC', 1), 7.208725898e-10),
                     (('convergence', 'time', 6, 'maxSnapshotCurrentErrorRelativeToPeak'),
                      5.834755356e-05),
                     (('convergence', 'time', 12, 'maxPhaseChargeErrorRelativeToPeak'), 1.078652497e-07),
                     (('convergence', 'time', 12, 'maxSnapshotCurrentErrorRelativeToPeak'), 2.019134949),
                     (('convergence', 'time', 12, 'maxSnapshotCurrentErrorUa'), 0.0001397411727),
                     (('convergence', 'time', 12, 'maxSnapshotCurrentErrorRelativeToPeakPhotocurrent'),
                      2.29339704e-05),
                     (('convergence', 'time', 12, 'referencePeakSnapshotCurrentUa'), 6.920843641e-05),
                     (('convergence', 'time', 13, 'maxPhaseChargeErrorRelativeToPeak'), 3.148399836e-08),
                     (('convergence', 'time', 13, 'maxSnapshotCurrentErrorRelativeToPeak'),
                      0.8389824443),
                     (('convergence', 'time', 13, 'maxSnapshotCurrentErrorUa'), 5.806466315e-05),
                     (('convergence', 'time', 13, 'maxSnapshotCurrentErrorRelativeToPeakPhotocurrent'),
                      9.529426726e-06),
                     (('convergence', 'time', 13, 'referencePeakSnapshotCurrentUa'), 6.920843641e-05),
                     (('convergence', 'time', 14, 'maxPhaseChargeErrorRelativeToPeak'), 1.171538148e-08),
                     (('convergence', 'time', 14, 'maxSnapshotCurrentErrorRelativeToPeak'),
                      0.3758841762),
                     (('convergence', 'time', 14, 'maxSnapshotCurrentErrorUa'), 2.601435611e-05),
                     (('convergence', 'time', 14, 'maxSnapshotCurrentErrorRelativeToPeakPhotocurrent'),
                      4.269410807e-06),
                     (('convergence', 'time', 14, 'referencePeakSnapshotCurrentUa'), 6.920843641e-05),
                     (('convergence', 'time', 15, 'maxPhaseChargeErrorRelativeToPeak'), 5.054602715e-09),
                     (('convergence', 'time', 15, 'maxSnapshotCurrentErrorRelativeToPeak'), 0.177535539),
                     (('convergence', 'time', 15, 'maxSnapshotCurrentErrorUa'), 1.228695706e-05),
                     (('convergence', 'time', 15, 'maxSnapshotCurrentErrorRelativeToPeakPhotocurrent'),
                      2.016504542e-06),
                     (('convergence', 'time', 15, 'referencePeakSnapshotCurrentUa'), 6.920843641e-05)]}

def set_path(data, path, value):
    target = data
    for part in path[:-1]:
        target = target[part]
    target[path[-1]] = value


def get_path(data, path):
    for part in path:
        data = data[part]
    return data


def encode(data):
    return (json.dumps(data, indent=2, ensure_ascii=False) + '\n').encode()


class PhysicsReferenceCheckTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.fixture_bytes = (reference.ROOT / 'public/assets/prima/physics-reference.json').read_bytes()
        cls.report_bytes = (reference.ROOT / 'docs/prima/PHYSICS_VALIDATION.json').read_bytes()
        cls.fixture = json.loads(cls.fixture_bytes)
        cls.report = json.loads(cls.report_bytes)

    def packet(self, data):
        fixture_bytes = encode(data)
        return fixture_bytes, encode(reference.validation_report(data, fixture_bytes))

    def check_data(self, data):
        generated, report = self.packet(data)
        return reference.check_reference(self.fixture_bytes, generated, self.report_bytes, report)

    def test_identical_retained_fixture_and_report(self):
        self.assertTrue(reference.check_reference(self.fixture_bytes, self.fixture_bytes,
                                                 self.report_bytes, self.report_bytes))

    def test_observed_cpu_variant_is_accepted_with_different_valid_digest(self):
        changed = copy.deepcopy(self.fixture)
        self.assertEqual(len(CPU_VARIANT_CHANGES), 40)
        for path, value in CPU_VARIANT_CHANGES:
            set_path(changed, path, value)
        generated, report = self.packet(changed)
        self.assertNotEqual(json.loads(report)['fixtureSha256'], self.report['fixtureSha256'])
        self.assertFalse(reference.check_reference(self.fixture_bytes, generated,
                                                  self.report_bytes, report))

    def test_observed_haswell_variants_are_accepted(self):
        for name, changes in HASWELL_VARIANT_CHANGES.items():
            with self.subTest(cpu_variant=name):
                changed = copy.deepcopy(self.fixture)
                self.assertEqual(len(changes), 43)
                for path, value in changes:
                    set_path(changed, path, value)
                generated, report = self.packet(changed)
                self.assertNotEqual(json.loads(report)['fixtureSha256'], self.report['fixtureSha256'])
                self.assertFalse(reference.check_reference(self.fixture_bytes, generated,
                                                          self.report_bytes, report))

    def test_declared_adaptive_unit_bounds_accept_small_absolute_drift(self):
        paths = [
            ('smallCircuits', 0, 'adaptive', 'snapshot', 'currentA', 0),
            ('smallCircuits', 0, 'adaptive', 'snapshot', 'voltageV', 0),
            ('smallCircuits', 0, 'adaptive', 'snapshot', 'chargeC', 0),
            ('smallCircuits', 0, 'adaptive', 'phaseChargeC', 0),
            ('smallCircuits', 0, 'adaptive', 'finalChargeC', 0),
        ]
        for path in paths:
            with self.subTest(path=path):
                changed = copy.deepcopy(self.fixture)
                bound = reference.adaptive_absolute_tolerance(path)
                self.assertGreater(bound, 0)
                set_path(changed, path, get_path(changed, path) + bound / 2)
                self.check_data(changed)

    def test_out_of_bound_adaptive_drift_is_rejected(self):
        paths = [
            ('smallCircuits', 0, 'adaptive', 'snapshot', 'currentA', 0),
            ('smallCircuits', 0, 'adaptive', 'snapshot', 'voltageV', 0),
            ('smallCircuits', 0, 'adaptive', 'snapshot', 'chargeC', 0),
            ('smallCircuits', 0, 'adaptive', 'phaseChargeC', 0),
            ('smallCircuits', 0, 'adaptive', 'finalChargeC', 0),
        ]
        for path in paths:
            with self.subTest(path=path):
                changed = copy.deepcopy(self.fixture)
                bound = reference.adaptive_absolute_tolerance(path)
                set_path(changed, path, get_path(changed, path) + 2 * bound)
                with self.assertRaises(ValueError):
                    self.check_data(changed)

    def test_out_of_bound_temporal_summary_drift_is_rejected(self):
        for key, bound in reference.TIME_SUMMARY_ABSOLUTE_TOLERANCES.items():
            with self.subTest(field=key):
                changed = copy.deepcopy(self.fixture)
                path = ('convergence', 'time', 0, key)
                set_path(changed, path, get_path(changed, path) + 2 * bound)
                with self.assertRaises(ValueError):
                    self.check_data(changed)

    def test_even_one_ulp_change_to_nonadaptive_values_is_rejected(self):
        paths = [
            ('fullCircuit', 'backwardEuler', 'snapshot', 'currentA', 0),
            ('greenCases', 0, 'resistanceOhm'),
            ('smallCircuits', 0, 'impedanceOhm', 0, 0),
            ('smallCircuits', 0, 'returnMap', 0, 0),
            ('smallCircuits', 0, 'config', 'timeStepMs'),
            ('convergence', 'time', 0, 'timeStepMs'),
            ('convergence', 'fullArrayTime', 'phaseChargeChangeRelativeToFinePeak'),
            ('convergence', 'returnBasis', 3, 'potentialMv', 0),
        ]
        for path in paths:
            with self.subTest(path=path):
                changed = copy.deepcopy(self.fixture)
                self.assertEqual(reference.adaptive_absolute_tolerance(path), 0)
                set_path(changed, path, math.nextafter(get_path(changed, path), math.inf))
                with self.assertRaises(ValueError):
                    self.check_data(changed)

    def test_wrong_shapes_types_and_keys_are_rejected(self):
        for corruption in ('short-array', 'extra-key', 'wrong-type'):
            with self.subTest(corruption=corruption):
                changed = copy.deepcopy(self.fixture)
                snapshot = changed['smallCircuits'][0]['adaptive']['snapshot']
                if corruption == 'short-array':
                    snapshot['currentA'].pop()
                elif corruption == 'extra-key':
                    snapshot['extraCurrentA'] = [0.0] * 7
                else:
                    snapshot['currentA'][0] = '0.0'
                with self.assertRaises(ValueError):
                    self.check_data(changed)

    def test_nonfinite_adaptive_or_exact_values_are_rejected(self):
        for path in [('smallCircuits', 0, 'adaptive', 'snapshot', 'currentA', 0),
                     ('greenCases', 0, 'resistanceOhm')]:
            for value in (math.nan, math.inf, -math.inf):
                with self.subTest(path=path, value=value):
                    changed = copy.deepcopy(self.fixture)
                    set_path(changed, path, value)
                    with self.assertRaises(ValueError):
                        self.check_data(changed)

    def test_provenance_corruption_is_rejected(self):
        changed = copy.deepcopy(self.fixture)
        changed['provenance']['numpy'] = 'unverified'
        with self.assertRaises(ValueError):
            self.check_data(changed)
        report = copy.deepcopy(self.report)
        report['provenance']['scipy'] = 'unverified'
        with self.assertRaises(ValueError):
            reference.check_reference(self.fixture_bytes, self.fixture_bytes,
                                      encode(report), self.report_bytes)

    def test_both_fixture_checksums_are_verified(self):
        for target in ('stored', 'regenerated'):
            with self.subTest(target=target):
                report = copy.deepcopy(self.report)
                report['fixtureSha256'] = '0' * 64
                stored = encode(report) if target == 'stored' else self.report_bytes
                regenerated = encode(report) if target == 'regenerated' else self.report_bytes
                with self.assertRaises(ValueError):
                    reference.check_reference(self.fixture_bytes, self.fixture_bytes,
                                              stored, regenerated)

    def test_reports_must_exactly_summarize_their_own_fixture(self):
        # This difference is within the CPU allowance between two independently
        # generated fixtures. It is still forbidden inside one fixture/report pair.
        report = copy.deepcopy(self.report)
        report['convergence']['time'][0]['maxPhaseChargeErrorRelativeToPeak'] += 1e-12
        for target in ('stored', 'regenerated'):
            with self.subTest(target=target):
                stored = encode(report) if target == 'stored' else self.report_bytes
                regenerated = encode(report) if target == 'regenerated' else self.report_bytes
                with self.assertRaises(ValueError):
                    reference.check_reference(self.fixture_bytes, self.fixture_bytes,
                                              stored, regenerated)

    def test_duplicate_json_keys_are_rejected(self):
        duplicate = self.report_bytes.replace(b'"schema":', b'"schema":"duplicate","schema":', 1)
        with self.assertRaises(ValueError):
            reference.check_reference(self.fixture_bytes, self.fixture_bytes,
                                      duplicate, self.report_bytes)


if __name__ == '__main__':
    unittest.main()
