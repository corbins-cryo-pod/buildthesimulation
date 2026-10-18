"""Independent closed-form equipotential disk benchmark, not used by FEM.

Uses distances to the two radial foci and arcsin, rather than the FEM's
discrete variational operator. r,z and radius are in meters. Returns V/A.
The expression is equivalent to the oblate-spheroidal solution to the
mixed Dirichlet/Neumann half-space problem (Newman 1966).
"""
import numpy as np


def disk_unit_potential(r, z, radius=25e-6, conductivity=0.3):
    r, z = np.broadcast_arrays(np.asarray(r, float), np.asarray(z, float))
    if np.any(r < 0) or np.any(z < 0):
        raise ValueError("Reference is defined in tissue half-space only")
    d1 = np.hypot(r - radius, z)
    d2 = np.hypot(r + radius, z)
    # At a surface point on the conducting disk the argument is exactly 1.
    argument = 2 * radius / (d1 + d2)
    if np.any(argument > 1 + 8*np.finfo(float).eps):
        raise ArithmeticError("Invalid disk geometry")
    return np.arcsin(np.minimum(argument, 1.0)) / (2*np.pi*conductivity*radius)


def surface_current_density(r, radius=25e-6):
    """A/m² per ampere; diverges at r=a. This is not uniform injection."""
    return 1 / (2*np.pi*radius*np.sqrt(radius**2 - np.asarray(r)**2))


def halfspace_point_unit_potential(r, z, conductivity=0.3):
    return 1 / (2*np.pi*conductivity*np.hypot(r, z))
