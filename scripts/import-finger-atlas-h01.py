#!/usr/bin/env python3
"""Build a small, attributed H01 neurite reference pack. Requires numpy.
Input: official proofread SWC ZIP and soma-layer lookup from official layers.
The proofread Neuroglancer skeleton independently verifies SWC xyz * (32,32,33)
is nanometres, whereas SWC radius is already nanometres. No isotropic voxel
assumption. Only connected .0 components are included; other fragments omitted.
"""
import argparse,json,zipfile,hashlib,gzip
from pathlib import Path
import numpy as np
p=argparse.ArgumentParser();p.add_argument('archive');p.add_argument('classified');p.add_argument('--output',default='public/assets/finger-pathway-atlas/v4/h01/reference-neurites.json');args=p.parse_args()
z=zipfile.ZipFile(args.archive);records=json.load(open(args.classified))['records']
# Fit an outward direction to the release's *own* layer classifications. This
# provides a rigid display orientation, not a warped transfer to M1 or S1.
r=[r for r in records if 1<=r['layerLabel']<=6]
x=np.array([a['somaNm'] for a in r])/1e6;y=np.array([a['layerLabel'] for a in r]);gradient=np.linalg.lstsq(np.column_stack([x,np.ones(len(x))]),y,rcond=None)[0][:3];gradient[2]=0;normal=-gradient/np.linalg.norm(gradient)
selected=[]
for layer in range(1,7):
 pool=sorted([r for r in records if r['layerLabel']==layer and r['nodes']>4500 and r['axonNodes']>10 and len(r['somaClusterNm'])>=12 and np.min(np.ptp(np.array(r['somaClusterNm']),axis=0))>=4000],key=lambda r:r['nodes'])
 selected.extend(pool[:2])

def simplify(ids,points,tol=.0007):
 # RDP on each nonbranching chain; preserve branch junctions and leaf endpoints.
 if len(ids)<3:return ids
 a,b=points[ids[0]],points[ids[-1]];d=b-a;t=np.clip(((points[ids]-a)@d)/(d@d) if d@d else np.zeros(len(ids)),0,1);dist=np.linalg.norm(points[ids]-(a+t[:,None]*d),axis=1);i=int(np.argmax(dist))
 if dist[i]<=tol:return [ids[0],ids[-1]]
 return simplify(ids[:i+1],points,tol)[:-1]+simplify(ids[i:],points,tol)

templates=[]
for r in selected:
 raw=z.read(r['file']);a=np.loadtxt(z.open(r['file']));ids=a[:,0].astype(int);index={int(v):i for i,v in enumerate(ids)};children=[[] for _ in ids];parents=a[:,-1].astype(int)
 for i,parent in enumerate(parents):
  if parent in index:children[index[parent]].append(i)
 points=(a[:,2:5]*[32,32,33]-np.array(r['somaNm']))/1e6;radii=a[:,5]/1e6;paths=[]
 axon_indices=np.flatnonzero(a[:,1]==0);port_index=int(axon_indices[np.argmin(points[axon_indices]@normal)]) if len(axon_indices) else -1
 for i,c in enumerate(children):
  if len(c)==1 and parents[i]>=0:continue
  for child in c:
   chain=[i,child]
   while len(children[chain[-1]])==1:chain.append(children[chain[-1]][0])
   split=chain.index(port_index) if port_index in chain else -1
   kept=(simplify(chain[:split+1],points)[:-1]+simplify(chain[split:],points)) if 0<split<len(chain)-1 else simplify(chain,points)
   labels=a[chain,1].astype(int);known=labels[labels>=0];role='axon' if len(known) and np.sum(known==0)>len(known)/2 else 'dendrite' if len(known) and np.sum(known==1)>len(known)/2 else 'neurite'
   paths.append({'points':np.round(points[kept],8).tolist(),'radii':np.round(radii[kept],8).tolist(),'role':role})
 axon=np.flatnonzero(a[:,1]==0);port=points[axon[np.argmin(points[axon]@normal)]] if len(axon) else None
 soma=(a[:,1]==3)&(np.linalg.norm(points,axis=1)<.020)
 cluster=(np.array(r['somaClusterNm'])-np.array(r['somaNm']))/1e6
 soma_extent=np.quantile(np.abs(cluster),.90,axis=0)+np.median(radii[soma])
 templates.append({'sourceId':r['sourceId'],'sourceFile':r['file'],'sourceSha256':hashlib.sha256(raw).hexdigest(),'sourceRegion':'human temporal cortex','layer':r['layerLabel'],'layerBasis':'Densest 15-micrometre class-3 soma cluster median sampled in official H01 layers at 4 x 4 x 4.224 micrometres; no M1/S1 labels inferred.','somaSourceNm':r['somaNm'],'somaAxesMm':soma_extent.tolist(),'somaShapeNote':'Display ellipsoid from robust 90% source soma-cluster extent plus median soma skeleton radius; not segmented EM soma membrane.','axonPort':port.tolist() if port is not None else None,'originalNodes':len(a),'displayNodes':sum(len(p['points']) for p in paths),'paths':paths})
 print(r['sourceId'],'layer',r['layerLabel'],'paths',len(paths),'display nodes',templates[-1]['displayNodes'])
output={'source':'H01 proofread_104','license':'CC BY 4.0','attribution':'Lichtman Laboratory (Harvard University) and Connectomics at Google; Shapson-Coe et al., Science 384, eadk4858 (2024), doi:10.1126/science.adk4858','sourceUrl':'https://h01-release.storage.googleapis.com/data/20210601/proofread_104/skeletons/104_proofread_neurons_swc.zip','archiveSha256':hashlib.sha256(Path(args.archive).read_bytes()).hexdigest(),'units':'mm','swcPositionScaleNm':[32,32,33],'swcRadiusScaleNm':1,'scaleValidation':'Compared first source node and radius to original proofread_104 Neuroglancer skeleton 1072605926: zero position error at 32,32,33 nm; matching radius.','outwardNormal':normal.tolist(),'displaySimplification':'Nonbranching chains simplified with 0.7 micrometre positional tolerance; all junctions/leaf endpoints of largest .0 component retained. Omitted other disconnected SWC components. Cylinders approximate measured skeleton radii, not original segmented membrane meshes.','selection':'Two smallest qualifying connected components per layer: >4500 nodes, >10 axon labels, >=12 clustered soma nodes, >=4 micrometres cluster extent on each axis. This is a reference subset, not a population estimate.','templates':templates}
path=Path(args.output);path.parent.mkdir(parents=True,exist_ok=True);data=json.dumps(output,separators=(',',':')).encode();path.write_bytes(data);Path(str(path)+'.gz').write_bytes(gzip.compress(data,mtime=0));print('output',len(data),'gzip',len(gzip.compress(data)), 'templates',len(templates))
