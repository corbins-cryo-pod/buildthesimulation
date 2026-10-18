"""Independent current-loaded boundary formulation for polarity/scaling checks.

Uses the same FEM volume operator, but imposes a shared unknown disk voltage and
loads its equation with prescribed total current. This does not constitute an
independent second spatial solver or analytical reference.
"""
from __future__ import annotations
import argparse
import json
import time
from pathlib import Path
import numpy as np
from scipy.sparse import coo_matrix
from scipy.sparse.linalg import splu
from .fem import _assemble, load


def validate_current_control(solution, currents=(1.0, .25, -.5, 0.0)):
    started=time.perf_counter()
    r,z=solution['r'],solution['z']
    d=solution['diagnostics'];nr,nz=len(r),len(z)
    K=_assemble(r,z,d['conductivity_S_per_m'],d['disk_radius_m'])
    contact=np.zeros(nr*nz,dtype=bool);contact[:nr]=r<=1+1e-13
    outer=np.zeros(nr*nz,dtype=bool);outer[-nr:]=True;outer[nr-1::nr]=True
    free=~(contact|outer)
    count=int(free.sum())
    mapping=np.full(nr*nz,-1,dtype=np.int64)
    mapping[free]=np.arange(count);mapping[contact]=count
    # Assemble the reduction by merging the disk's DOFs. Use undirected
    # conductance edges to avoid cancellation of contact-to-contact terms.
    coo=K.tocoo()
    keep=(coo.row<coo.col)&(coo.data!=0)
    ii,jj=mapping[coo.row[keep]],mapping[coo.col[keep]]
    weights=-coo.data[keep]
    distinct=ii!=jj;ii,jj,weights=ii[distinct],jj[distinct],weights[distinct]
    valid_i,valid_j=ii>=0,jj>=0
    both=valid_i&valid_j
    rows=np.concatenate((ii[valid_i],jj[valid_j],ii[both],jj[both]))
    cols=np.concatenate((ii[valid_i],jj[valid_j],jj[both],ii[both]))
    data=np.concatenate((weights[valid_i],weights[valid_j],-weights[both],-weights[both]))
    reduced=coo_matrix((data,(rows,cols)),shape=(count+1,count+1)).tocsc()
    lu=splu(reduced)
    full_rows=np.repeat(np.arange(nr*nz),np.diff(K.indptr))
    def action(values):
        return np.add.reduceat(K.data*(values[K.indices]-values[full_rows]),K.indptr[:-1])
    def expand(values):
        full=np.zeros(nr*nz);full[free]=values[:count];full[contact]=values[count]
        return full
    cases=[]
    expected_basis=solution['unit_potential'].ravel()
    for current in currents:
        rhs=np.zeros(count+1);rhs[-1]=current
        values=lu.solve(rhs)
        for _ in range(2):
            full=expand(values);reaction=action(full)
            residual=np.r_[reaction[free],reaction[contact].sum()]-rhs
            values-=lu.solve(residual)
        full=expand(values);reaction=action(full)
        expected=expected_basis*current
        difference=np.abs(full-expected)
        maxabs=float(np.max(difference))
        reference_scale=float(np.max(np.abs(expected)))
        cases.append({'prescribed_current_A':current,
            'contact_voltage_V':float(values[-1]),
            'maximum_absolute_difference_V':maxabs,
            'maximum_difference_relative_to_peak':maxabs/reference_scale if reference_scale else 0.0,
            'integrated_contact_current_A':float(reaction[contact].sum()),
            'integrated_outer_return_current_A':-float(reaction[outer].sum()),
            'free_residual_linf_A':float(np.max(np.abs(reaction[free]))),
            'shared_contact_current_residual_A':float(abs(reaction[contact].sum()-current)),
            'reduced_unknowns':count+1})
    return {'method':'shared equipotential-contact unknown with prescribed total current load; same FEM spatial operator as voltage-controlled solve',
            'source_level':d['level'],'source_domain_radius_in_a':d['domain_radius_in_a'],
            'cases':cases,'seconds':time.perf_counter()-started}


def main():
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--solution',required=True)
    parser.add_argument('--output',required=True)
    args=parser.parse_args()
    result=validate_current_control(load(args.solution))
    path=Path(args.output);path.parent.mkdir(parents=True,exist_ok=True)
    path.write_text(json.dumps(result,indent=2)+'\n')
    print(json.dumps(result,indent=2))


if __name__=='__main__':
    main()
