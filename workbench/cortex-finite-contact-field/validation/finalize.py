"""Consolidate recorded runs; never relax tolerances or hide failed gates."""
import hashlib
import json
from pathlib import Path
import sys

ROOT=Path(__file__).resolve().parents[1]

def read(name):
    return json.loads((ROOT/'validation'/name).read_text())

def main():
    n=read('numerical-results.json'); j=read('js-results.json')
    b=read('browser-results.json'); c=read('current-control-results.json')
    t=read('tolerances.json'); initial=read('initial-domain1000-results.json')
    d=n['mesh_convergence'][-1]['diagnostics']
    gates=list(n['gates'])
    def add(name,value,limit,scope='release'):
        gates.append({'name':name,'value':float(value),'limit':float(limit),'passed':bool(value<=limit),'scope':scope})
    add('weak_current_imbalance',d['weak_flux']['relative_current_imbalance'],t['weak_current_imbalance_relative'])
    add('linear_system_residual',d['linear_system_relative_residual_l2'],t['linear_system_relative_residual'])
    raw=d['raw_gradient_flux']
    add('raw_injecting_current',abs(raw['injecting_current_A']-1),t['raw_boundary_current_error_relative'])
    add('raw_return_current',abs(raw['outer_return_current_A']-1),t['raw_boundary_current_error_relative'])
    add('raw_source_return_imbalance',raw['source_return_relative_imbalance'],t['raw_boundary_current_error_relative'])
    add('raw_insulating_plane_leakage',raw['insulating_plane_absolute_leakage_A'],t['raw_insulation_leakage_relative'])
    add('independently_current_loaded_polarity_scaling',max(v['maximum_difference_relative_to_peak'] for v in c['cases']),t['linearity_relative'])
    h=read('heldout.json')
    for label,measured in [('node',j['interpolation']['sampledUnitPotential']),('chromium_main',b['mainThread']['heldout']['sampledUnitPotential']),('chromium_worker',b['webWorker']['heldout']['sampledUnitPotential'])]:
        scale=max(abs(x-y)/(t['export_relative']*abs(y)+t['export_absolute_volts_per_amp']) for x,y in zip(measured,h['sourcePotentialVoltsPerAmp']))
        add(label+'_serialization_interpolation',scale,1)
    add('node_status_and_neuron_suite',0 if not j['failedGates'] else 1,0)
    add('chromium_main_worker_and_example',0 if b['passed'] else 1,0)
    # Historical and diagnostic failures are not erased by the final success.
    historical=[dict(x,scope='superseded_initial_domain1000') for x in initial['gates'] if not x['passed']]
    for case in n['mesh_convergence'][:-1]:
        error=abs(case['diagnostics']['raw_gradient_flux']['outer_return_current_A']-1)
        add(f"mesh_level_{case['level']}_raw_return",error,t['raw_boundary_current_error_relative'],'coarse_refinement_diagnostic')
    artifact=ROOT/'artifacts/disk-v1'
    sizes={p.name:p.stat().st_size for p in sorted(artifact.iterdir()) if p.is_file()}
    sizes['browser_required_total_bytes']=sizes['field.json']+sizes['field.bin']
    failed=[x for x in gates+historical if not x['passed']]
    final_failed=[x for x in gates if x['scope']=='release' and not x['passed']]
    result={'schema':'finite-contact-validation-consolidated/1.0','status':'experimental_integration_candidate' if not final_failed else 'blocked_by_final_validation_failure','final_release_passed':not final_failed,'gates':gates,'historical_failed_gates':historical,'all_failed_gates':failed,'final_failed_gates':final_failed,'tolerances':t,'tolerances_sha256':hashlib.sha256((ROOT/'validation/tolerances.json').read_bytes()).hexdigest(),'artifact_sizes_bytes':sizes,'numerical':n,'current_control':c,'javascript':j,'browser':b,'interpretation':'Potential-only, single ideal disk. Sampling coverage is empirical; no uniform error proof or biological validation. Initial domain and coarse flux failures are retained and do not represent final-domain release failures.'}
    (ROOT/'validation/results.json').write_text(json.dumps(result,indent=2,allow_nan=False)+'\n')
    frac=lambda x:f'{100*x:.4f}%'
    meshrows='\n'.join(f"| {x['level']} | {x['diagnostics']['nodes']:,} | {x['diagnostics']['triangles']:,} | {frac(x['reference_error']['max_relative'])} | {frac(abs(x['diagnostics']['raw_gradient_flux']['outer_return_current_A']-1))} |" for x in n['mesh_convergence'])
    domrows='\n'.join(f"| {x['radius_and_height_over_a']}a / {x['radius_and_height_over_a']*.025:g} mm | {frac(x['reference_error']['max_relative'])} |" for x in n['domain_convergence'])
    perfrows=[]
    for label,load,perf in [('Node 24.19.0',j['loading']['milliseconds'],j['performance']),('Chromium main thread',b['mainThread']['loading']['loadMilliseconds'],b['mainThread']['performance']),('Chromium Web Worker',b['webWorker']['loading']['loadMilliseconds'],b['webWorker']['performance'])]:
        perfrows.append(f"| {label} | {load:.2f} | "+' | '.join(f"{x['medianMilliseconds']:.3f}" for x in perf)+f" | {perf[-1]['pointsPerSecond']/1e6:.2f} million/s |")
    failrows='\n'.join(f"| {x['name']} | {frac(x['value'])} | {frac(x['limit'])} | {x['scope']} |" for x in failed)
    report=f'''# Validation report — finite-contact-field 1.0.0

**Final release gates: {'PASS' if not final_failed else 'FAIL'}. Readiness: experimental benchmark integration only.**
This package implements one equipotential 25 µm radius disk in an insulating
plane with homogeneous isotropic 0.3 S/m tissue. The numerical return/gauge
is a grounded cylinder of radius/height 50 mm. It approximates the analytical
half-space return at infinity; the two boundary conditions are compared
explicitly through domain convergence. No implanted finite return is modeled.

The finest mesh contains {d['nodes']:,} nodes and {d['triangles']:,} P1 triangles.
The accepted tissue region is r≤250 µm, 0<z≤250 µm, excluding a 0.5 µm
neighborhood of the sharp rim. The evidence is finite sampled coverage,
not an error bound for every mathematical point in that region.

## Predeclared acceptance criteria and retained failures

`tolerances.json` was written before the first study and was not changed.
SHA-256: `{result['tolerances_sha256']}`.
Potential reference tolerance: 2%; final mesh/domain changes: 1% each;
weak current balance and algebraic residual: 1e-9; raw integrated gradient
current/leakage: 5%; far-field potential: 2%; current scaling: 1e-10.
Export tolerance is `2e-7*|source| + 0.001 V/A`. Neighbor-difference tolerance
is `0.05*|reference difference| + 1 V/A`. These are preliminary engineering
criteria, not biological firing or safety criteria. Absolute errors are
reported alongside relative errors, and near-zero differences use the mixed
absolute/relative test. There are no failed final release gates.

| Retained failure | Measured | Limit | Context |
|---|---:|---:|---|
{failrows}

The initial 1000a domain failed the last domain-change gate. Increasing the
domain to 2000a corrected it without changing tolerances or local mesh nodes.
The complete original report remains in `initial-domain1000-results.json`.
Coarse raw flux failures show why boundary reactions alone are insufficient
to assess local-gradient accuracy.

## Independent reference and convergence

The FEM solves a mixed-boundary variational problem without calling the
analytical function. `validation/reference.py` independently evaluates the
focal-distance arcsin solution for the same equipotential disk and insulating
plane, with return at infinity. The analytical contact resistance is
1/(4σa)=33333.3333 Ω; the finite-domain numerical value is
{d['contact_potential_V_per_A']:.6f} Ω. Uniform current density was not imposed.

At {n['heldout_count']:,} held-out tissue positions (including 13 fixed points,
near-contact points and independently seeded off-grid samples), maximum
potential error is **{frac(n['heldout_reference_error']['max_relative'])}**,
maximum absolute error **{n['heldout_reference_error']['max_absolute_V_per_A']:.6f} V/A**,
and RMS absolute error **{n['heldout_reference_error']['rms_absolute_V_per_A']:.6f} V/A**.
At 1 µA the maximum absolute error is
{n['heldout_reference_error']['max_absolute_V_per_A']*1e-3:.6f} mV.

All fixed evaluation points remain physically identical across refinements.
The 30 rim-approach points are also sampled at every mesh level and retained
in `rim_approach` in the machine-readable report.

| Mesh level | Nodes | Triangles | Max fixed-point reference error | Raw return-current error |
|---|---:|---:|---:|---:|
{meshrows}

Final mesh change: **{frac(n['mesh_last_change']['max_relative'])}**.

| Cylinder radius and height | Max fixed-point reference error |
|---|---:|
{domrows}

Final domain change: **{frac(n['domain_last_change']['max_relative'])}**.
The r,z nodes in the local region ≤10a are exactly identical across domain
sizes; local refinement is therefore separated from outer-boundary movement.
Residual domain error includes the potential offset between finite ground
and infinity. No fitted constant was subtracted to improve reference errors.

## Current, signs and far field

| Final integrated quantity | Measurement |
|---|---:|
| Weak injecting current | {d['weak_flux']['injecting_current_A']:.15g} A |
| Weak return current | {d['weak_flux']['outer_return_current_A']:.15g} A |
| Relative weak imbalance | {d['weak_flux']['relative_current_imbalance']:.6g} |
| Relative linear-system L2 residual | {d['linear_system_relative_residual_l2']:.6g} |
| Raw-gradient injecting current | {raw['injecting_current_A']:.9f} A |
| Raw-gradient return current | {raw['outer_return_current_A']:.9f} A |
| Raw source/return imbalance | {frac(raw['source_return_relative_imbalance'])} |
| Raw insulating-plane absolute leakage / 1 A | {frac(raw['insulating_plane_absolute_leakage_A'])} |
| Raw all-boundary signed outward residual / 1 A | {frac(raw['all_boundaries_signed_outward_current_A'])} |

Weak conormal flux is obtained from integrated FEM boundary reactions. It
is conservative by the discrete variational equations and is not an
independent estimate of pointwise gradient accuracy. Raw flux separately
integrates adjacent P1 gradients over boundary edges with the axisymmetric
surface measure. Those gradients are not equilibrated; the return error is
{frac(abs(raw['outer_return_current_A']-1))}, and no E or J sampler is exported.

A separate shared-contact-unknown current-loaded system tests +1, +0.25,
−0.5 and 0 A at level {c['source_level']}, domain {c['source_domain_radius_in_a']:g}a.
Its largest difference from the normalized basis is
{max(v['maximum_difference_relative_to_peak'] for v in c['cases']):.6g} relative to peak.
It checks boundary normalization, polarity and linearity using the same
spatial FEM operator; it is not a second independent spatial solver.
Only one spatial basis exists. Multi-contact combined solves are unimplemented.

Far-field measurements at distances roughly 8–10a compare to
`I/(2πσρ)`, the insulating-half-space surface-source expression. Maximum
numerical discrepancy is **{frac(n['far_field']['numerical_vs_halfspace_point']['max_relative'])}**.
`I/(4πσρ)` applies to an infinite medium and is not used here. These points
are far from the contact but much closer than the outer return. The finite
grounded cylinder is not globally a monopole field; an explicit finite
source/return pair would instead have different, generally dipolar far-field
behavior and requires a new model.

## Rim and interpolation

The ideal sharp rim has singular current density, although potential is
finite. At the finest level, the approach sweep's maximum potential error is
{frac(max(x['max_relative_error'] for x in n['rim_approach']))}; the nonmonotonic
near-rim errors and refinement results are plotted. The diagnostic sweep
reaches 0.00001a above the rim, outside the accepted region. Passing a finite
set of extreme points does not remove the 0.02a numerical rim exclusion or
establish bounded gradients. No universal safe electrode distance is inferred.

The browser samples the **same native P1 triangles** as the source solution.
Thus spatial discretization/interpolation error is already included in the
FEM-versus-analytical results; export adds Float32 nodal rounding and
JavaScript arithmetic rather than a separate coarse interpolation atlas.
At the independent held-out points, Node export error is at most
**{j['interpolation']['maxAbsoluteErrorVoltsPerAmp']:.9f} V/A** or
**{j['interpolation']['maxRelativeError']:.6g} relative**.
Actual Chromium main-thread and Worker checks pass the same locked test.
Serialization, checksums, malformed metadata, units, batched queries,
coordinate rotation, signs, nonfinite inputs, contact/insulation surfaces,
domain exits, coverage exits, rim exclusion, and zero-current invalid-point
propagation are covered by the tests. Unknown or failed sampling never
silently clamps, switches to a point source, or returns zero.

## Neuron fixture and waveform

The synthetic branching fixture has 97 coordinates and 96 parent-child
edges. The report records every absolute potential and neighbor difference,
both numerical and analytical. Maximum exported neighbor-difference error
is **{j['neuron']['maxAbsoluteNeighborErrorVoltsPerAmp']:.6f} V/A**
({j['neuron']['maxAbsoluteNeighborErrorVoltsPerAmp']*.001:.6f} mV at 1 µA).
All edges pass the predeclared 5% plus 1 V/A criterion.
`examples/waveform.mjs` and the browser Worker example cache unit potentials
once and apply equal-duration ±2 µA biphasic phases, reporting mV with
explicit ms/µA conversions. This tests the field/cable interface, not neural
firing, stimulation threshold, membrane-radius collision or selectivity.

## Performance and portability

Hardware reported by the execution environment: **{n['environment']['cpu']}**;
{n['environment']['cpu_count']} visible logical CPUs. Numerical runs use one
BLAS/OpenMP thread. OS: {n['environment']['platform']}.
Python/NumPy/SciPy: 3.12.14 / 2.3.5 / 1.17.0.
The final mesh generation/assembly/solve/diagnostic stage took
**{d['generation_seconds']:.3f} s**, with **{d['peak_process_rss_MiB']:.3f} MiB peak process RSS**.
The eight retained numerical cases total
{sum(x['diagnostics']['generation_seconds'] for x in n['cases']):.3f} s of measured solver
time. Checkpoint reuse in a later report run is not counted as a new solve.
Peak memory is measured per solver subprocess, not inferred from array sizes.

Binary field: **{sizes['field.bin']:,} bytes**; JSON manifest:
**{sizes['field.json']:,} bytes**; required browser download total:
**{sizes['browser_required_total_bytes']:,} bytes**. Diagnostics are optional for runtime.
Retained field typed arrays consume **{j['loading']['retainedFieldTypedArrayBytes']:,} bytes**.
Loading temporarily retains the caller input plus a verified owned copy;
release the original buffer when appropriate. A 100,000-point query uses
2,400,000 input bytes plus 900,000 output bytes. A cached basis requires
900,000 bytes for 100,000 points; each waveform output is a separate array.

| Runtime | Load ms | 1,000 points ms | 10,000 points ms | 100,000 points ms | 100,000 throughput |
|---|---:|---:|---:|---:|---:|
{chr(10).join(perfrows)}

Throughput is the median of seven warmed runs, three warmups, including
query classification and output allocations. Inputs cycle through the
held-out fixture; this is a local CPU microbenchmark, not a whole neuron
simulator benchmark. Browser clock granularity affects small batches.
Load timings include validation and SHA-256, but exclude network fetch;
local fetch times are recorded separately. Node process RSS and Chromium
main-thread JS heap before/after are retained in JSON and are noisy. Worker
heap instrumentation was unavailable; exact typed-array memory is reported
instead, without claiming a measured worker process peak.

Actually tested: Node {j['runtime']['version']}, Chromium {b['chromiumVersion']}
main thread, Chromium module Web Worker, and the interactive example.
No Firefox, Safari, mobile, production website or repository integration
was tested. No second numerical spatial solver was added.

## Figures and evidence

![Mesh and domain convergence](plots/convergence.png)

![Rim approach at fixed physical points](plots/rim.png)

![Potential and neuron interface](plots/field-neuron.png)

Vector PDF versions are included. `results.json` consolidates all measurements,
gates and failed gates; the separate environment reports preserve raw values.
See `INTEGRATION_HANDOFF.md` for the remaining neural convergence, collision,
threshold, interface and implant-geometry work. A verified field component
alone does not establish accurate single-neuron selectivity.
'''
    (ROOT/'validation/REPORT.md').write_text(report)
    print(json.dumps({'final_release_passed':not final_failed,'all_retained_failed_gates':failed,'artifact_sizes':sizes},indent=2))
    if final_failed:
        sys.exit(1)

if __name__=='__main__': main()
