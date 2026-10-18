"""Reproducible numerical study. Checkpoints avoid repeating expensive cases.

Run from package root: python -m validation.study [--force]
Tolerances are read, never modified. Browser tests run separately afterward.
"""
import argparse
import hashlib
import json
import os
from pathlib import Path
import platform
import subprocess
import sys
import time
import numpy as np
from solver.fem import load, sample, export
from validation.reference import disk_unit_potential, halfspace_point_unit_potential

ROOT = Path(__file__).resolve().parents[1]
A = 25e-6

def write_json(path, value):
    path.write_text(json.dumps(value, indent=2, allow_nan=False)+'\n')

def metrics(actual, expected):
    actual, expected = np.asarray(actual), np.asarray(expected)
    err = np.abs(actual-expected)
    return {'max_absolute_V_per_A':float(err.max()),
            'rms_absolute_V_per_A':float(np.sqrt(np.mean(err**2))),
            'max_relative':float(np.max(err/np.maximum(np.abs(expected), 1e-300))),
            'rms_relative':float(np.sqrt(np.mean((err/np.maximum(np.abs(expected),1e-300))**2)))}

def analytic_rz(rz):
    return disk_unit_potential(rz[:,0]*A,rz[:,1]*A)

def make_fixture():
    xyz, parents = [], []
    # Rooted trunk followed by four oblique dendrite-like branches.
    for k in range(17):
        xyz.append([0.15, 0.05, 0.15+0.25*k])
        parents.append(k-1)
    for root, angle in [(7,0.0),(7,np.pi),(12,np.pi/2),(12,3*np.pi/2)]:
        parent = root
        origin = np.array(xyz[root])
        for k in range(1,21):
            xyz.append((origin+np.array([0.14*k*np.cos(angle),0.14*k*np.sin(angle),.10*k])).tolist())
            parents.append(parent)
            parent = len(xyz)-1
    xyz=np.array(xyz)*A
    rz=np.column_stack((np.hypot(xyz[:,0],xyz[:,1]),xyz[:,2]))/A
    return {'pointsMeters':xyz.tolist(),'parents':parents,
            'analyticPotentialVoltsPerAmp':analytic_rz(rz).tolist(),
            'description':'97 synthetic point compartments, 96 parent edges; no morphology diameter or biological mechanism.'}

def main():
    parser=argparse.ArgumentParser()
    parser.add_argument('--force',action='store_true')
    args=parser.parse_args()
    os.chdir(ROOT)
    out=ROOT/'validation'
    checkpoints=out/'checkpoints'
    checkpoints.mkdir(exist_ok=True)
    tol_path=out/'tolerances.json'
    tol=json.loads(tol_path.read_text())
    fingerprint=hashlib.sha256((ROOT/'solver/fem.py').read_bytes()).hexdigest()
    cases=[(1,1000),(2,1000),(4,1000),(4,250),(4,500),(1,2000),(2,2000),(4,2000)]
    start=time.perf_counter()
    solutions={}
    timings=[]
    for level,domain in cases:
        tag=f'L{level}_R{domain}'
        path=checkpoints/(tag+'.npz')
        provenance=checkpoints/(tag+'.provenance.json')
        reuse=not args.force and path.exists() and provenance.exists() and json.loads(provenance.read_text()).get('solver_sha256')==fingerprint
        t=time.perf_counter()
        if not reuse:
            run=subprocess.run([sys.executable,'-m','validation.run_case','--level',str(level),'--domain',str(domain),'--output',str(path)],capture_output=True,text=True,timeout=240)
            (checkpoints/(tag+'.log')).write_text(run.stdout+run.stderr)
            if run.returncode:
                raise RuntimeError(f'{tag} failed; see checkpoint log')
            write_json(provenance,{'solver_sha256':fingerprint,'case':tag,'command':run.args})
        elapsed=time.perf_counter()-t
        solution=load(path)
        solutions[(level,domain)]=solution
        timings.append({'case':tag,'reused_checkpoint':reuse,'subprocess_wall_seconds_this_run':elapsed,'diagnostics':solution['diagnostics']})
        print(f'{tag}: {elapsed:.3f}s '+('cached' if reuse else 'solved'),flush=True)
    fine=solutions[(4,2000)]
    export(fine,ROOT/'artifacts/disk-v1')
    rz=np.array([[0,.005],[.5,.01],[.95,.02],[1,.025],[1.05,.02],[0,1],[1,1],[3,2],[0,5],[5,5],[10,1],[1,10],[10,10]],float)
    labels=['above_center_0.125um','above_disk_0.25um','inner_rim','above_rim_0.625um','outer_rim','axis_one_radius','one_one','intermediate','axis_five','far_diagonal','radial_ten','axial_ten','far_corner']
    ref=analytic_rz(rz)
    mesh=[]
    for level in [1,2,4]:
        vals=sample(solutions[(level,2000)],rz)
        mesh.append({'level':level,'values_V_per_A':vals.tolist(),'reference_error':metrics(vals,ref),'diagnostics':solutions[(level,2000)]['diagnostics']})
    mesh_change=metrics(np.array(mesh[-1]['values_V_per_A']),np.array(mesh[-2]['values_V_per_A']))
    domain=[]
    for R in [250,500,1000,2000]:
        vals=sample(solutions[(4,R)],rz)
        domain.append({'radius_and_height_over_a':R,'values_V_per_A':vals.tolist(),'reference_error':metrics(vals,ref),'diagnostics':solutions[(4,R)]['diagnostics']})
    domain_change=metrics(np.array(domain[-1]['values_V_per_A']),np.array(domain[-2]['values_V_per_A']))
    local_mesh_unchanged=all(np.array_equal(solutions[(4,250)][axis][solutions[(4,250)][axis]<=10],solutions[(4,R)][axis][solutions[(4,R)][axis]<=10]) for R in [500,1000,2000] for axis in ['r','z'])
    rng=np.random.default_rng(20261018)
    # Independent locations, not solver nodes: uniform volume-ish coverage and
    # intentionally oversampled near-contact tissue. Seed is part of provenance.
    random_rz=np.column_stack((rng.uniform(0,10,1200),rng.uniform(.0001,10,1200)))
    near_rz=np.column_stack((rng.uniform(0,2,800),10**rng.uniform(-4,0,800)))
    held=np.vstack([rz,random_rz,near_rz])
    held=held[np.hypot(held[:,0]-1,held[:,1])>=.02]
    angles=rng.uniform(-np.pi,np.pi,len(held))
    xyz=np.column_stack((held[:,0]*np.cos(angles),held[:,0]*np.sin(angles),held[:,1]))*A
    # Keep fixed r=10 boundary queries exact under Cartesian hypot rounding.
    xyz[:len(rz),0]=rz[:,0]*A; xyz[:len(rz),1]=0
    held_values=sample(fine,held)
    held_ref=analytic_rz(held)
    write_json(out/'heldout.json',{'pointsMeters':xyz.tolist(),'sourcePotentialVoltsPerAmp':held_values.tolist(),'analyticPotentialVoltsPerAmp':held_ref.tolist(),'labels':labels+['heldout']*(len(held)-len(labels)),'seed':20261018})
    fixture=make_fixture()
    fixture_xyz=np.array(fixture['pointsMeters'])
    fixture_rz=np.column_stack((np.hypot(fixture_xyz[:,0],fixture_xyz[:,1]),fixture_xyz[:,2]))/A
    fixture_values=sample(fine,fixture_rz)
    fixture['sourcePotentialVoltsPerAmp']=fixture_values.tolist()
    write_json(out/'neuron-fixture.json',fixture)
    parents=np.array(fixture['parents'])[1:]
    delta=fixture_values[1:]-fixture_values[parents]
    fixture_ref=np.array(fixture['analyticPotentialVoltsPerAmp'])
    delta_ref=fixture_ref[1:]-fixture_ref[parents]
    delta_error=np.abs(delta-delta_ref)
    neuron={'potential_error':metrics(fixture_values,fixture_ref),'delta_max_absolute_error_V_per_A':float(delta_error.max()),'delta_rms_absolute_error_V_per_A':float(np.sqrt(np.mean(delta_error**2))),'delta_max_scaled_error':float(np.max(delta_error/(tol['neuron_delta_absolute_volts_per_amp']+tol['neuron_delta_relative']*np.abs(delta_ref)))),'potentials_V_per_A':fixture_values.tolist(),'neighbor_differences_V_per_A':delta.tolist(),'reference_neighbor_differences_V_per_A':delta_ref.tolist()}
    rim=[]
    for eps in [.1,.03,.02,.01,.003,.001,.0003,.0001,.00003,.00001]:
        points=np.array([[1-eps,eps],[1,eps],[1+eps,eps]])
        actual=sample(fine,points); expected=analytic_rz(points)
        rim.append({'offset_over_a':eps,'mesh_levels':[{'level':level,'values_V_per_A':sample(solutions[(level,2000)],points).tolist(),'relative_errors':(np.abs(sample(solutions[(level,2000)],points)-expected)/expected).tolist()} for level in [1,2,4]],'points_rz_over_a':points.tolist(),'values_V_per_A':actual.tolist(),'reference_V_per_A':expected.tolist(),'relative_errors':(np.abs(actual-expected)/expected).tolist(),'outside_predeclared_rim_restriction':(np.hypot(points[:,0]-1,points[:,1])>=.02).tolist(),'max_relative_error':float(np.max(np.abs(actual-expected)/expected))})
    # Far field must still lie much closer than the artificial return boundary.
    far=np.array([[0,8],[0,10],[8,0.1],[10,.1],[6,8]],float)
    point_ref=halfspace_point_unit_potential(far[:,0]*A,far[:,1]*A)
    far_values=sample(fine,far)
    farfield={'points_rz_over_a':far.tolist(),'numerical_V_per_A':far_values.tolist(),'finite_disk_V_per_A':analytic_rz(far).tolist(),'halfspace_point_V_per_A':point_ref.tolist(),'numerical_vs_halfspace_point':metrics(far_values,point_ref),'analytic_disk_vs_halfspace_point':metrics(analytic_rz(far),point_ref),'infinite_medium_factor':4,'halfspace_factor':2}
    gates=[]
    def gate(name, value, limit, scope='release'):
        gates.append({'name':name,'value':float(value),'limit':float(limit),'passed':bool(value<=limit),'scope':scope})
    gate('independent_reference_fixed',mesh[-1]['reference_error']['max_relative'],tol['reference_max_relative'])
    gate('independent_reference_heldout',metrics(held_values,held_ref)['max_relative'],tol['reference_max_relative'])
    gate('mesh_last_change',mesh_change['max_relative'],tol['mesh_last_change_max_relative'])
    gate('domain_last_change',domain_change['max_relative'],tol['domain_last_change_max_relative'])
    gate('domain_local_mesh_identical',0 if local_mesh_unchanged else 1,0)
    gate('far_field_halfspace_factor',farfield['numerical_vs_halfspace_point']['max_relative'],tol['far_field_max_relative'])
    gate('neuron_neighbor_differences',neuron['delta_max_scaled_error'],1)
    gate('near_rim_exploratory',max(x['max_relative_error'] for x in rim),tol['near_rim_diagnostic_relative'],'diagnostic_excluded_region')
    result={'schema':'finite-contact-validation/1.0','tolerances_sha256':hashlib.sha256(tol_path.read_bytes()).hexdigest(),'solver_sha256':fingerprint,'environment':{'python':sys.version,'platform':platform.platform(),'numpy':np.__version__,'cpu':next((line.split(':',1)[1].strip() for line in Path('/proc/cpuinfo').read_text().splitlines() if line.startswith('model name')),'unknown'),'cpu_count':os.cpu_count()},'study_wall_seconds_this_run':time.perf_counter()-start,'cases':timings,'fixed_points_rz_over_a':rz.tolist(),'fixed_point_labels':labels,'reference_V_per_A':ref.tolist(),'mesh_convergence':mesh,'mesh_last_change':mesh_change,'domain_convergence':domain,'domain_last_change':domain_change,'domain_local_mesh_identical':local_mesh_unchanged,'heldout_reference_error':metrics(held_values,held_ref),'heldout_count':len(held),'rim_approach':rim,'far_field':farfield,'neuron':neuron,'gates':gates,'note':'Conservation/residual/linearity gates and browser results are consolidated by validation.finalize after all environments run.'}
    write_json(out/'numerical-results.json',result)
    print(json.dumps({'gates':gates,'heldout':result['heldout_reference_error']},indent=2))

if __name__=='__main__':
    main()
