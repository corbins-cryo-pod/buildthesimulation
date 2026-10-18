"""Publication/export-friendly figures from recorded numerical measurements."""
import json
from pathlib import Path
import numpy as np
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
from solver.fem import load,sample

ROOT=Path(__file__).resolve().parents[1]
OUT=ROOT/'validation/plots'
OUT.mkdir(exist_ok=True)
n=json.loads((ROOT/'validation/numerical-results.json').read_text())
j=json.loads((ROOT/'validation/js-results.json').read_text())
plt.rcParams.update({'font.size':10,'axes.spines.top':False,'axes.spines.right':False,'figure.dpi':150,'savefig.bbox':'tight'})
def save(fig,name):
    fig.savefig(OUT/(name+'.png'))
    fig.savefig(OUT/(name+'.pdf'))
    plt.close(fig)

fig,ax=plt.subplots(1,2,figsize=(10.8,4.2),layout='constrained')
for index in [0,3,6,9,12]:
    ax[0].plot([x['diagnostics']['nodes'] for x in n['mesh_convergence']], [100*abs(x['values_V_per_A'][index]/n['reference_V_per_A'][index]-1) for x in n['mesh_convergence']],'-o',label=n['fixed_point_labels'][index])
ax[0].set(xscale='log',xlabel='Mesh nodes (fixed 50 mm domain)',ylabel='Absolute relative potential error (%)',title='Three mesh levels, fixed tissue points')
ax[0].legend(fontsize=8)
ax[0].axhline(2,color='k',ls='--',lw=.8,label='2% gate')
ax[1].plot([x['radius_and_height_over_a']*.025 for x in n['domain_convergence']],[100*x['reference_error']['max_relative'] for x in n['domain_convergence']],'-o',color='#186b72',label='Maximum reference error')
ax[1].axhline(2,color='k',ls='--',lw=.8,label='2% potential gate')
ax[1].set(xscale='log',xlabel='Cylinder radius = height (mm)',ylabel='Max fixed-point relative error (%)',title='Domain extension; identical local mesh')
ax[1].legend(fontsize=8)
save(fig,'convergence')

fig,ax=plt.subplots(1,2,figsize=(10.8,4.2),layout='constrained')
eps=np.array([x['offset_over_a'] for x in n['rim_approach']])
for index,level in enumerate([1,2,4]):
    ax[0].loglog(eps*25,[100*x['mesh_levels'][index]['relative_errors'][1] for x in n['rim_approach']],'-o',label=f'Level {level}, r=a')
    ax[1].semilogx(eps*25,[x['mesh_levels'][index]['values_V_per_A'][1]*.001 for x in n['rim_approach']],'-o',label=f'Level {level}')
ax[0].axvspan(eps.min()*25,.5,color='#c36545',alpha=.15,label='Excluded rim region')
ax[0].axhline(2,color='k',ls='--',lw=.8)
ax[0].set(xlabel='Height above rim (µm)',ylabel='Potential error (%)',title='Rim approach: same points at every level')
ax[1].plot(eps*25,[x['reference_V_per_A'][1]*.001 for x in n['rim_approach']],'k--',label='Independent analytical reference')
ax[1].set(xlabel='Height above rim (µm)',ylabel='Potential at +1 µA (mV)',title='Finite potential does not imply bounded gradient')
for a in ax: a.legend(fontsize=8)
save(fig,'rim')

fine=load(ROOT/'validation/checkpoints/L4_R2000.npz')
r,z=np.meshgrid(np.linspace(0,3,201),np.linspace(.001,3,201))
vals=sample(fine,np.column_stack((r.ravel(),z.ravel()))).reshape(r.shape)*.001
fixture=json.loads((ROOT/'validation/neuron-fixture.json').read_text())
points=np.array(fixture['pointsMeters'])*1e6
fig,ax=plt.subplots(1,3,figsize=(13,4),layout='constrained')
im=ax[0].pcolormesh(r*25,z*25,vals,shading='auto',cmap='viridis')
ax[0].plot([0,25],[0,0],lw=5,color='#e4a845',clip_on=False)
ax[0].set(xlabel='Radial coordinate (µm)',ylabel='Tissue height (µm)',title='FEM potential at +1 µA',aspect='equal')
fig.colorbar(im,ax=ax[0],label='mV')
for i,p in enumerate(fixture['parents']):
    if p>=0:ax[1].plot(points[[p,i],0],points[[p,i],2],color='gray',lw=.7)
im=ax[1].scatter(points[:,0],points[:,2],c=np.array(j['neuron']['unitPotentialVoltsPerAmp'])*.001,s=10,cmap='viridis',zorder=3)
ax[1].set(xlabel='x (µm)',ylabel='z (µm)',title='97-compartment synthetic fixture')
fig.colorbar(im,ax=ax[1],label='mV at +1 µA')
actual=np.array(j['neuron']['neighborDifferencesVoltsPerAmp'][1:])*.001
ref=np.array(j['neuron']['analyticNeighborDifferencesVoltsPerAmp'][1:])*.001
ax[2].plot(ref,actual,'.',ms=4)
lim=[min(ref.min(),actual.min()),max(ref.max(),actual.max())]
ax[2].plot(lim,lim,'k--',lw=.8)
ax[2].set(xlabel='Analytical neighbor ΔVe (mV)',ylabel='Browser neighbor ΔVe (mV)',title='Spatial differences at +1 µA')
save(fig,'field-neuron')
print('Wrote six PNG/PDF figure artifacts')
