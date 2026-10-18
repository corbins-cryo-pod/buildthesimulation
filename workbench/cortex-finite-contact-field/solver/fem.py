"""Axisymmetric P1 finite-element solver for a conducting disk in a half-space.

The numerical solver contains no analytical disk solution. Dimensionless mesh
coordinates are divided by disk radius a. The stiffness includes 2*pi*sigma*a.
"""
from __future__ import annotations
import argparse
import hashlib
import json
import platform
import resource
import sys
import time
from pathlib import Path

import numpy as np
import scipy
from scipy.sparse import coo_matrix
from scipy.sparse.linalg import splu

SOLVER_VERSION = 'axisymmetric-p1-fem/1.0.0'


def _piecewise_axis(segments, level):
    pieces = [np.linspace(lo, hi, n * level + 1)[:-1] for lo, hi, n in segments]
    return np.concatenate([*pieces, [segments[-1][1]]])


def make_axes(level=1, domain=500.0):
    """Create a conforming graded mesh; local nodes do not depend on domain.

    Extending the outer boundary only appends intervals beyond r=z=10a.
    Refinement splits every interval into `level` equal subintervals.
    """
    if level not in (1, 2, 4, 8):
        raise ValueError('level must be one of 1, 2, 4, 8')
    if domain <= 10 or not np.isfinite(domain):
        raise ValueError('domain must be finite and exceed 10 disk radii')
    radial = [(0,.5,10),(.5,.9,10),(.9,.98,8),(.98,.995,6),(.995,1,10),
              (1,1.005,10),(1.005,1.02,6),(1.02,1.1,8),(1.1,1.5,10),
              (1.5,3,12),(3,10,16)]
    axial = [(0,.005,10),(.005,.02,6),(.02,.1,12),(.1,.5,14),
             (.5,1.5,14),(1.5,3,12),(3,10,16)]
    # Fixed geometric knots ensure domains with a shared inner region retain
    # exactly the same local discretization. Only the last truncated interval
    # differs. No mesh mapping redistributes local nodes when R changes.
    outer = [10.0]
    while outer[-1] * 1.22 < domain:
        outer.append(outer[-1] * 1.22)
    outer.append(float(domain))
    tail = [(lo, hi, 1) for lo, hi in zip(outer[:-1], outer[1:])]
    return _piecewise_axis(radial + tail, level), _piecewise_axis(axial + tail, level)


def _assemble(r, z, sigma, a):
    nr, nz = len(r), len(z)
    dr, dz = np.meshgrid(np.diff(r), np.diff(z))
    rlo = np.broadcast_to(r[:-1], dr.shape)
    sw = (np.arange(nz-1)[:,None]*nr + np.arange(nr-1)[None,:]).ravel()
    dr, dz, rlo = dr.ravel(), dz.ravel(), rlo.ravel()
    count = len(sw)
    rows = np.empty(18 * count, dtype=np.int32)
    cols = np.empty_like(rows)
    vals = np.empty(18 * count, dtype=np.float64)
    for tri in (0,1):
        if tri == 0:  # SW, SE, NE
            nodes = (sw,sw+1,sw+nr+1)
            gr = (-1/dr,1/dr,np.zeros(count))
            gz = (np.zeros(count),-1/dz,1/dz)
            rmean = rlo + 2*dr/3
        else:  # SW, NE, NW
            nodes = (sw,sw+nr+1,sw+nr)
            gr = (np.zeros(count),1/dr,-1/dr)
            gz = (-1/dz,np.zeros(count),1/dz)
            rmean = rlo + dr/3
        weight = np.pi * sigma * a * rmean * dr * dz
        for i in range(3):
            for j in range(3):
                sl = slice((tri*9+i*3+j)*count,(tri*9+i*3+j+1)*count)
                rows[sl] = nodes[i]
                cols[sl] = nodes[j]
                vals[sl] = weight*(gr[i]*gr[j]+gz[i]*gz[j])
    matrix = coo_matrix((vals,(rows,cols)),shape=(nr*nz,nr*nz)).tocsr()
    matrix.sum_duplicates()
    return matrix


def _raw_fluxes(r,z,u,sigma,a):
    """Integrate J.n from one-sided P1 element gradients on boundary edges.

    These raw gradients are not an equilibrated conservative flux recovery.
    Near the mixed-BC rim, their convergence is slower than potential's.
    """
    factor = 2*np.pi*sigma*a
    dr,dz = np.diff(r),np.diff(z)
    annulus = ((r[1:]**2-r[:-1]**2)/2)
    # Bottom edge belongs to lower-right SW,SE,NE triangle.
    bottom_dz = (u[1,1:]-u[0,1:])/dz[0]
    bottom_out = factor * annulus * bottom_dz
    disk_edges = r[1:] <= 1 + 1e-13
    # Top edge belongs to upper-left SW,NE,NW triangle.
    top_dz = (u[-1,:-1]-u[-2,:-1])/dz[-1]
    top_out = -factor * annulus * top_dz
    # Right boundary belongs to lower-right triangle.
    right_dr = (u[:-1,-1]-u[:-1,-2])/dr[-1]
    right_out = -factor*r[-1]*dz*right_dr
    injected = -float(bottom_out[disk_edges].sum())
    returned = float(top_out.sum()+right_out.sum())
    insulation = float(bottom_out[~disk_edges].sum())
    return {
        'injecting_current_A': injected,
        'outer_return_current_A': returned,
        'insulating_plane_signed_outward_current_A': insulation,
        'insulating_plane_absolute_leakage_A': float(np.abs(bottom_out[~disk_edges]).sum()),
        'source_return_relative_imbalance': abs(injected-returned),
        'all_boundaries_signed_outward_current_A': returned+insulation-injected,
        'method': 'exact boundary-edge integration of adjacent P1 element-gradient J.n; not equilibrated',
    }


def solve(level=1, domain=500.0, radius_m=25e-6, conductivity_s_per_m=.3):
    """Solve disk=1V, outer cylinder=0V, then normalize disk injection to +1A.

    Returns dict with r,z (dimensionless), unit_potential[nz,nr] (V/A),
    and diagnostics. Prescribed boundary potentials are used as an intermediate
    linear solve only; the final basis has prescribed total current +1A.
    """
    if radius_m<=0 or conductivity_s_per_m<=0:
        raise ValueError('radius and conductivity must be positive')
    started=time.perf_counter()
    r,z=make_axes(level,domain)
    nr,nz=len(r),len(z)
    K=_assemble(r,z,conductivity_s_per_m,radius_m)
    contact=np.zeros(nr*nz,dtype=bool)
    contact[:nr]=r<=1+1e-13
    outer=np.zeros(nr*nz,dtype=bool)
    outer[-nr:]=True
    outer[nr-1::nr]=True
    fixed=contact|outer
    free=~fixed
    v=np.zeros(nr*nz)
    v[contact]=1
    # Evaluate stiffness action through pairwise voltage differences. This
    # is algebraically K@v because each element has zero row sum, but avoids
    # cancellation of large constant-potential terms near the contact.
    rows=np.repeat(np.arange(nr*nz),np.diff(K.indptr))
    def conservative_action(values):
        contributions=K.data*(values[K.indices]-values[rows])
        return np.add.reduceat(contributions,K.indptr[:-1])
    rhs=-conservative_action(v)[free]
    assembled=time.perf_counter()
    lu=splu(K[free][:,free].tocsc(),permc_spec='COLAMD')
    v[free]=lu.solve(rhs)
    # Two iterative-refinement steps reduce roundoff in current reactions.
    # The same sparse factors solve each correction; no tolerances change.
    for _ in range(2):
        v[free]-=lu.solve(conservative_action(v)[free])
    reacted=conservative_action(v)
    conductance=float(reacted[contact].sum())
    if conductance<=0 or not np.isfinite(conductance):
        raise RuntimeError('nonpositive disk conductance')
    unit=(v/conductance).reshape((nz,nr))
    reactions=reacted/conductance
    # FEM boundary reaction sums integrate the weak conormal flux, including
    # the correct axisymmetric boundary measure. Their equality is a
    # discrete conservation test, not an independent accuracy benchmark.
    injection=float(reactions[contact].sum())
    returning=-float(reactions[outer].sum())
    free_residual=reactions[free]
    diagnostics={
        'solver_version':SOLVER_VERSION,
        'level':level,'domain_radius_in_a':domain,'domain_height_in_a':domain,
        'disk_radius_m':radius_m,'conductivity_S_per_m':conductivity_s_per_m,
        'radial_nodes':nr,'axial_nodes':nz,'nodes':nr*nz,'triangles':2*(nr-1)*(nz-1),
        'matrix_nnz':int(K.nnz),'free_dofs':int(free.sum()),
        'one_volt_conductance_S':conductance,'contact_potential_V_per_A':1/conductance,
        'weak_flux':{'injecting_current_A':injection,'outer_return_current_A':returning,
            'relative_current_imbalance':abs(injection-returning),
            'free_residual_linf_A':float(np.max(np.abs(free_residual))),
            'free_residual_l1_A':float(np.sum(np.abs(free_residual))),
            'method':'integrated FEM boundary reactions (weak conormal flux), evaluated by cancellation-resistant edge voltage differences'},
        'raw_gradient_flux':_raw_fluxes(r,z,unit,conductivity_s_per_m,radius_m),
        'linear_system_relative_residual_l2':float(np.linalg.norm((K@v)[free])/np.linalg.norm(rhs)),
        'generation_seconds':time.perf_counter()-started,
        'assembly_seconds':assembled-started,
        'peak_process_rss_MiB':resource.getrusage(resource.RUSAGE_SELF).ru_maxrss/1024,
        'runtime':{'python':platform.python_version(),'numpy':np.__version__,
                   'scipy':scipy.__version__,'platform':platform.platform()},
    }
    return {'r':r,'z':z,'unit_potential':unit,'diagnostics':diagnostics}


def sample(solution,points_rz_dimensionless):
    """P1 interpolation of the numerical solution; Nx2 [r/a,z/a] -> N V/A.

    Source-solution helper accepts the closed computational domain. The browser
    sampler separately enforces the narrower validated tissue region.
    """
    points=np.asarray(points_rz_dimensionless,dtype=np.float64)
    if points.ndim!=2 or points.shape[1]!=2:
        raise ValueError('points must have shape (N,2)')
    r,z=solution['r'],solution['z']
    if not np.all(np.isfinite(points)) or np.any(points<0) or np.any(points[:,0]>r[-1]) or np.any(points[:,1]>z[-1]):
        raise ValueError('source-solution query outside the closed mesh domain')
    ir=np.minimum(np.searchsorted(r,points[:,0],side='right')-1,len(r)-2)
    iz=np.minimum(np.searchsorted(z,points[:,1],side='right')-1,len(z)-2)
    u=(points[:,0]-r[ir])/(r[ir+1]-r[ir])
    v=(points[:,1]-z[iz])/(z[iz+1]-z[iz])
    p=solution['unit_potential']
    sw,se,nw,ne=p[iz,ir],p[iz,ir+1],p[iz+1,ir],p[iz+1,ir+1]
    return np.where(v<=u,(1-u)*sw+(u-v)*se+v*ne,(1-v)*sw+u*ne+(v-u)*nw)


def save(solution,path):
    path=Path(path); path.parent.mkdir(parents=True,exist_ok=True)
    temporary=path.with_name(path.name+'.tmp')
    with temporary.open('wb') as handle:
        np.savez_compressed(handle,r=solution['r'],z=solution['z'],
            unit_potential=solution['unit_potential'],
            diagnostics=np.array(json.dumps(solution['diagnostics'])))
    temporary.replace(path)


def load(path):
    with np.load(path,allow_pickle=False) as data:
        return {'r':data['r'],'z':data['z'],'unit_potential':data['unit_potential'],
                'diagnostics':json.loads(str(data['diagnostics']))}


def export(solution,artifact_dir):
    """Write the portable versioned, checksummed SI field package."""
    dest=Path(artifact_dir);dest.mkdir(parents=True,exist_ok=True)
    d=solution['diagnostics']; a=d['disk_radius_m'];sigma=d['conductivity_S_per_m']
    r,z=solution['r']*a,solution['z']*a
    payload=r.astype('<f8').tobytes()+z.astype('<f8').tobytes()+solution['unit_potential'].astype('<f4').tobytes(order='C')
    (dest/'field.bin').write_bytes(payload)
    source_hash=hashlib.sha256(Path(__file__).read_bytes()).hexdigest()
    manifest={
        'schemaVersion':'finite-contact-field/1.0',
        'packageId':'equipotential-disk-a25um-sigma0p3',
        'geometry':{'type':'axisymmetric_disk_in_insulating_plane','radiusMeters':a,
            'exposedSurface':'z=0 and x*x+y*y<=radiusMeters*radiusMeters',
            'thicknessMeters':0,'tissueSide':'z>0',
            'contactAreaSquareMeters':float(np.pi*a*a),'insulatingSurface':'z=0 outside disk; z<0 solid insulation'},
        'conductivitySiemensPerMeter':sigma,
        'coordinateFrame':{'originMeters':[0,0,0],'axis':'z','units':'m','handedness':'right',
            'description':'disk center at origin; local +z points into conducting tissue; rotational symmetry around z'},
        'domain':{'radialExtentMeters':float(r[-1]),'axialExtentMeters':float(z[-1]),
            'shape':'finite axisymmetric cylinder','outerBoundary':'r=R or z=H grounded at 0 V',
            'intendedDomain':'homogeneous isotropic tissue half-space z>0; cylinder approximates return at infinity'},
        'validity':{'maxRadiusMeters':10*a,'maxHeightMeters':10*a,'minRimDistanceMeters':.02*a,
            'tissueRequiresPositiveZ':True,
            'restriction':'potential sampling only; reject tissue outside validated box or within excluded rim neighborhood',
            'surfaceDistanceDefinition':'sqrt(max(hypot(x,y)-a,0)^2+z^2)',
            'rimDistanceDefinition':'sqrt((hypot(x,y)-a)^2+z^2)',
            'noUniversalSafeDistance':True},
        'bases':[{'id':'disk_to_outer_ground','units':'V/A','normalizationCurrentAmps':1,
            'contactCurrentsAmps':{'disk':1},
            'return':{'type':'artificial_grounded_outer_cylinder','boundary':'r=R or z=H','totalCurrentAmps':-1,
                'isFiniteReturnElectrode':False},
            'inactiveContacts':'none; single exposed conducting disk',
            'signConvention':'positive current injects conventional current from disk into tissue; outer boundary removes it',
            'voltageReference':'outer cylinder is 0 V','compatibleBasisSet':'single-disk-one-outer-ground'}],
        'data':{'file':'field.bin','sha256':hashlib.sha256(payload).hexdigest(),'byteLength':len(payload),
            'radialCount':len(r),'axialCount':len(z),'basisCount':1,
            'layout':'r-f64le,z-f64le,potential-f32le-z-major','triangulation':'SW-NE',
            'radialAxisByteOffset':0,'axialAxisByteOffset':8*len(r),
            'potentialByteOffset':8*(len(r)+len(z)),
            'potentialUnits':'V/A','axisUnits':'m'},
        'solver':{'name':SOLVER_VERSION,'method':'axisymmetric continuous piecewise-linear Galerkin FEM',
            'element':'P1 triangles; exact 2*pi*r conductivity weighting',
            'mesh':{'level':d['level'],'nodes':d['nodes'],'triangles':d['triangles'],
                'radialNodeCount':len(r),'axialNodeCount':len(z),'domainRadiusInDiskRadii':d['domain_radius_in_a'],
                'domainHeightInDiskRadii':d['domain_height_in_a'],'grading':'piecewise-linear near rim, fixed geometric outer knots ratio 1.22'}},
        'provenance':{'generator':'solver/fem.py','generatorSha256':source_hash,
            'command':f"python -m solver.fem --level {d['level']} --domain {d['domain_radius_in_a']:g} --export artifacts/reference --output work/cache/export.npz",
            'runtime':d['runtime'],'deterministicInputs':True},
        'limitations':['ideal zero-thickness circular contact; not a validated commercial implant',
            'homogeneous isotropic ohmic tissue; no electrode interface impedance or capacitance',
            'sharp rim current density is singular; no electric-field output is provided',
            'single basis; arbitrary contacts, floating inactive contacts, and insulating shanks are not implemented',
            'field verification does not establish neuron cable discretization, timestep convergence, firing, or selectivity'],
    }
    (dest/'field.json').write_text(json.dumps(manifest,indent=2)+'\n')
    (dest/'solver_diagnostics.json').write_text(json.dumps(d,indent=2)+'\n')
    return manifest


def main():
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--level',type=int,default=4)
    parser.add_argument('--domain',type=float,default=500)
    parser.add_argument('--output',default='work/cache/disk-l4-r500.npz')
    parser.add_argument('--export',default=None)
    parser.add_argument('--force',action='store_true')
    args=parser.parse_args()
    path=Path(args.output)
    if path.exists() and not args.force:
        solution=load(path)
        if solution['diagnostics']['level']!=args.level or solution['diagnostics']['domain_radius_in_a']!=args.domain:
            parser.error('checkpoint parameters differ; use another output path or --force')
    else:
        solution=solve(args.level,args.domain)
        save(solution,path)
    if args.export:
        export(solution,args.export)
    print(json.dumps(solution['diagnostics'],indent=2))


if __name__=='__main__':
    main()
