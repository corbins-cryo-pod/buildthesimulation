import math
import unittest
import numpy as np
from field_reference import Disk, axis_solution, dimensionless_reference, reference, source_quadrature


class FieldReferenceTests(unittest.TestCase):
    def test_axis_closed_form(self):
        expected = axis_solution(80e-6, 100e-6, -100e-6, .2)
        actual = reference([Disk()], [0, 0, 0])
        np.testing.assert_allclose(actual[[0, 3]], expected, rtol=2e-13)

    def test_negative_gradient(self):
        p = np.array([80e-6, 70e-6, 0.])
        calculated = reference([Disk()], p)
        gradient = []
        for i in range(3):
            dp = np.zeros(3); dp[i] = 1e-8
            gradient.append(-(reference([Disk()], p+dp)[0]-reference([Disk()], p-dp)[0])/(2e-8))
        np.testing.assert_allclose(calculated[1:], gradient, rtol=2e-8)

    def test_polarity_and_conductivity(self):
        point = [80e-6, 90e-6, 0.]
        a = reference([Disk()], point, .2)
        b = reference([Disk(current_A=-80e-6)], point, .4)
        np.testing.assert_allclose(b, -.5*a, rtol=1e-13)

    def test_far_field_monopole(self):
        p = np.array([.2, -.3, .4])
        source = Disk(z_m=0)
        actual = reference([source], p)
        expected = source.current_A/(4*math.pi*.2*np.linalg.norm(p))
        self.assertLess(abs(actual[0]/expected-1), 2e-8)

    def test_independent_source_quadrature(self):
        reference_value = dimensionless_reference(1.05, .1)
        np.testing.assert_allclose(source_quadrature(1.05, .1, 48), reference_value, rtol=3e-8)

    def sphere_flux(self, sources):
        radius = .005
        cosines, weights = np.polynomial.legendre.leggauss(48)
        integral = 0
        for cosine, weight in zip(cosines, weights):
            normal = np.array([math.sqrt(1-cosine*cosine), 0., cosine])
            field = reference(sources, radius*normal)[1:]
            integral += weight * np.dot(field, normal)
        return float(2*math.pi*radius**2*.2*integral)

    def test_closed_sphere_flux_source(self):
        self.assertAlmostEqual(self.sphere_flux([Disk(z_m=0)]), 80e-6, delta=1e-14)

    def test_closed_sphere_flux_balanced_pair(self):
        sources = [Disk(z_m=-.0005), Disk(z_m=.0005, current_A=-80e-6)]
        self.assertAlmostEqual(self.sphere_flux(sources), 0., delta=1e-14)

    def test_exact_phase_charge_in_misaligned_bins(self):
        phases = [(.123, .260, -100), (.333, .470, 100)]
        edges = np.linspace(0, .7, 23)
        charge = sum(current * max(0, min(b, end)-max(a, start))
                     for a, b in zip(edges[:-1], edges[1:]) for start, end, current in phases)
        self.assertAlmostEqual(charge, 0., delta=1e-12)
        self.assertAlmostEqual(100*(.260-.123), 13.7, delta=1e-12)

    def test_invalid_conductivity_and_source_plane(self):
        with self.assertRaises(ValueError): reference([Disk()], [0, 0, 0], 0)
        with self.assertRaises(ValueError): dimensionless_reference(1, 0)


if __name__ == '__main__':
    unittest.main(verbosity=2)
