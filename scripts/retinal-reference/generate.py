#!/usr/bin/env python3
"""Generate compressed retinal geometry and independent native-model fixtures.

No browser code is imported. Python uses the unmodified pinned package. Every
published binary part is <=64 KiB, avoiding a monolithic upload while preserving
the exact reconstructed data and checksums.
"""
from __future__ import annotations
import argparse
import gzip
import hashlib
import importlib.metadata
import json
import os
import pickle
from pathlib import Path
import tempfile

os.environ.setdefault('MPLCONFIGDIR', '/tmp/retinal-reference-matplotlib')
import numpy as np
import pulse2percept as p2p
from pulse2percept.implants import DiskElectrode, ElectrodeArray
from pulse2percept.implants.retina import RetinalImplant
from pulse2percept.models.retina import AxonMapModel, ScoreboardModel, BiphasicAxonMapModel, BiphasicScoreboardModel
from pulse2percept.stimuli import BiphasicPulseTrain
from pulse2percept.topography.retina import Watson2014Map

VERSION = '0.11.0'
SDIST_SHA256 = '8a9ba4997212ca1b9e386814808c4aadf2a6ba5427664f3961911ab461104b34'
COMMON = dict(xrange=(-15,15), yrange=(-15,15), step=0.25,
    n_axons=1000, n_ax_segments=500, axons_range=(-180,180),
    ax_segments_range=(0,50), loc_od=(15.5,1.5), min_ax_sensitivity=1e-3,
    min_current_spread=1e-8, meridian_blend=0, thresh_percept=0,
    n_gray=None, n_threads=2, verbose=False)
SCORE_KEYS = ('xrange','yrange','step','min_current_spread','thresh_percept','n_gray','n_threads','verbose')
def sha(data): return hashlib.sha256(data).hexdigest()
def write_json(path, value): path.write_text(json.dumps(value, separators=(',',':'), allow_nan=False)+'\n')
def implant_for(electrodes, eye):
    return RetinalImplant(ElectrodeArray({e['id']: DiskElectrode(e['xUm'],e['yUm'],0,100) for e in electrodes}),
                         eye='right' if eye=='RE' else 'left', preprocess=False)
def config(model='axon', eye='RE', grid=0.5, rho=300, lam=700, electrodes=None, frequency=20, phase=0.45):
    return dict(model=model,eye=eye,gridStepDeg=grid,rhoUm=rho,lambdaUm=lam,
                frequencyHz=frequency,phaseDurationMs=phase,electrodes=electrodes or [dict(id='E01',xUm=0,yUm=0,amplitudeUa=100,thresholdUa=50)])
def reference_predict(c, temp, trajectory_scale=1):
    implant=implant_for(c['electrodes'],c['eye'])
    common={**COMMON,'step':c['gridStepDeg'],'n_axons':1000*trajectory_scale,'n_ax_segments':500*trajectory_scale}
    kind=c['model']
    if kind in ('scoreboard','biphasic-scoreboard'):
        params={k:common[k] for k in SCORE_KEYS}; cls=ScoreboardModel if kind=='scoreboard' else BiphasicScoreboardModel
    else:
        params={**common,'lam':c['lambdaUm'],'axon_pickle':str(temp/f"{c['eye']}-{c['gridStepDeg']}-{trajectory_scale}.pickle")}
        cls=AxonMapModel if kind=='axon' else BiphasicAxonMapModel
    model=cls(implant,rho=c['rhoUm'],**params)
    if kind.startswith('biphasic'):
        stim={e['id']:BiphasicPulseTrain(c['frequencyHz'],e['amplitudeUa'],c['phaseDurationMs'],stim_dur=1000,threshold_amp=e['thresholdUa']) for e in c['electrodes']}
    else: stim={e['id']:e['amplitudeUa'] for e in c['electrodes']}
    out=model.predict_percept(stim)
    assert model.spatial.grid.y[0,0]==15
    return np.asarray(out.data[...,0],dtype='<f4'), model

def cases():
    asym=[dict(id='A',xUm=-1300,yUm=900,amplitudeUa=80,thresholdUa=50),dict(id='B',xUm=500,yUm=-800,amplitudeUa=120,thresholdUa=65),dict(id='C',xUm=1700,yUm=600,amplitudeUa=40,thresholdUa=40)]
    dense=[]
    for row in range(6):
        for col in range(10):
            dense.append(dict(id=f'E{row*10+col+1:02}',xUm=(col-4.5)*575,yUm=(2.5-row)*575,amplitudeUa=80 if col<2 or row in (0,2,5) else 0,thresholdUa=60))
    zero=[dict(id='E01',xUm=0,yUm=0,amplitudeUa=0,thresholdUa=50)]
    center=[dict(id='E01',xUm=0,yUm=0,amplitudeUa=100,thresholdUa=50)]
    return [
      ('scoreboard-center',config('scoreboard')),
      ('axon-center-detailed',config(grid=.25)),
      ('axon-asymmetric-right',config(electrodes=asym)),
      ('axon-asymmetric-left',config(eye='LE',electrodes=asym)),
      ('axon-peripheral-streak',config(lam=1300,electrodes=[dict(id='P',xUm=-2500,yUm=1600,amplitudeUa=120,thresholdUa=50)])),
      ('axon-dense-pattern',config(electrodes=dense)),
      ('axon-edge-clipped',config(lam=1700,electrodes=[dict(id='P',xUm=3800,yUm=3000,amplitudeUa=100,thresholdUa=50)])),
      ('axon-zero',config(electrodes=zero)),
      ('biphasic-center',config('biphasic',electrodes=center)),
      ('biphasic-short-phase',config('biphasic',phase=.1)),
      ('biphasic-long-phase',config('biphasic',phase=.9)),
      ('biphasic-frequency',config('biphasic',frequency=80)),
      ('biphasic-asymmetric-right',config('biphasic',electrodes=asym)),
      ('biphasic-asymmetric-left-detailed',config('biphasic',eye='LE',grid=.25,electrodes=asym)),
      ('biphasic-scoreboard',config('biphasic-scoreboard',electrodes=asym)),
      ('biphasic-zero-frequency',config('biphasic',frequency=0)),
    ]

def main():
    p=argparse.ArgumentParser();p.add_argument('--repo',type=Path,default=Path(__file__).resolve().parents[2]);args=p.parse_args()
    assert p2p.__version__==VERSION
    assets=args.repo/'public/assets/retinal-implant';fixtures=args.repo/'tests/fixtures/retinal-percept'
    assets.mkdir(parents=True,exist_ok=True);fixtures.mkdir(parents=True,exist_ok=True)
    binary=bytearray(); arrays={}; eyes={}; display=None
    def append(name,a,dtype):
        nonlocal binary
        while len(binary)%8: binary.append(0)
        a=np.asarray(a,dtype=dtype).ravel();offset=len(binary);b=a.tobytes(order='C');binary+=b
        arrays[name]=dict(offset=offset,length=len(a),dtype=dtype)
        return name
    with tempfile.TemporaryDirectory(prefix='retinal-native-') as folder:
        temp=Path(folder)
        for eye in ('RE','LE'):
            c=config(eye=eye,grid=.25,lam=2000)
            _,model=reference_predict(c,temp)
            _,(_,bundles,bundle_id,idx_segment)=pickle.load(open(temp/f'{eye}-0.25-1.pickle','rb'))
            boff=np.concatenate(([0],np.cumsum([len(b) for b in bundles])))
            xy=np.concatenate(bundles).astype(np.float64)
            lengths=np.diff(boff)
            step=np.hypot(*(xy[1:]-xy[:-1]).T);step[boff[1:-1]-1]=0
            arc=np.empty(len(xy));arc[0]=0;np.cumsum(step,out=arc[1:]);arc-=np.repeat(arc[boff[:-1]],lengths)
            grid=np.column_stack((model.spatial.grid.ret.x.ravel(),model.spatial.grid.ret.y.ravel())).astype(np.float32)
            original_seg=boff[bundle_id]+idx_segment
            d0=np.hypot(xy[original_seg,0]-grid[:,0],xy[original_seg,1]-grid[:,1])
            # Keep each selected bundle only through its furthest assigned soma.
            maxima=np.zeros(len(bundles),dtype=np.int64);np.maximum.at(maxima,bundle_id,idx_segment)
            kept=[np.arange(boff[i],boff[i]+maxima[i]+1) for i in range(len(bundles))]
            take=np.concatenate(kept); newoff=np.concatenate(([0],np.cumsum(maxima+1)))
            absolute=newoff[bundle_id]+idx_segment
            prefix=eye+'.'
            eyes[eye]=dict(
                xy=append(prefix+'xy',xy[take],'<f4'),arc=append(prefix+'arc',arc[take],'<f8'),
                offsets=append(prefix+'offsets',newoff,'<u4'),
                bundleIndex=append(prefix+'bundleIndex',bundle_id,'<u4'),segmentIndex=append(prefix+'segmentIndex',absolute,'<u4'),
                d0=append(prefix+'d0',d0,'<f8'),gridXY=append(prefix+'gridXY',grid,'<f4'),
                bundleCount=len(bundles),segmentCount=len(take),width=121,height=121)
            if eye=='RE':
                optic=np.array(Watson2014Map().dva_to_ret(15.5,1.5)).tolist()
                chosen=np.linspace(0,len(bundles)-1,96,dtype=int)
                paths=[]
                for i in chosen:
                    b=np.asarray(bundles[i]);b=b[(np.abs(b[:,0])<7500)&(np.abs(b[:,1])<6500)]
                    if len(b)>1:paths.append(np.round(b[np.unique(np.linspace(0,len(b)-1,min(len(b),55),dtype=int))],3).tolist())
                display=dict(schema='retinal-display-v1',eye='RE',opticDiscUm=optic,bundles=paths,source='pulse2percept 0.11.0 Jansonius trajectories',interpretation='Thinned display-only paths; the solver uses the binary reference.')
        data=bytes(binary)
        # Lossless storage transforms: corresponding eye blocks are XOR-delta
        # encoded, then byte planes are grouped before gzip. All native float32
        # and float64 bits are restored before parsing or checksum verification.
        assert len(data)%16==0 and arrays['LE.xy']['offset']==len(data)//2
        encoded=np.frombuffer(data,dtype=np.uint8).copy();half=len(data)//2
        encoded[half:]^=encoded[:half]
        encoded=encoded.reshape(-1,8).T.copy().ravel().tobytes()
        packed=gzip.compress(encoded,compresslevel=9,mtime=0);chunks=[]
        for old in assets.glob('axon-part-*.bin'):old.unlink()
        for index,start in enumerate(range(0,len(packed),65536)):
            part=packed[start:start+65536];name=f'axon-part-{index:03}.bin';(assets/name).write_bytes(part)
            chunks.append(dict(file=name,bytes=len(part),sha256=sha(part)))
        manifest=dict(schema='retinal-axon-reference-v2',referencePackage='pulse2percept',referenceVersion=VERSION,
          sourceSdistSha256=SDIST_SHA256,dataSha256=sha(data),byteLength=len(data),
          storage=dict(format='gzip-chunks',transform='xor-halves-byte-shuffle-8',compressedBytes=len(packed),chunks=chunks),arrays=arrays,eyes=eyes,
          grid=dict(minDeg=-15,maxDeg=15,fineStepDeg=.25,availableStepsDeg=[.5,.25],rowZero='superior +15 degrees'),
          settings=dict(nAxons=1000,nAxSegments=500,minAxonSensitivity=1e-3,minCurrentSpread=1e-8,meridianBlendDeg=0),
          coordinateConvention='Watson2014: visual x sign preserved, visual y sign reversed relative to retinal y; forward and reverse are separately fitted.',
          license='BSD-3-Clause; see PULSE2PERCEPT-LICENSE.txt')
        write_json(assets/'axon-reference.json',manifest);write_json(assets/'axon-display.json',display)
        native_license=next(Path(importlib.metadata.distribution('pulse2percept')._path).rglob('LICENSE'))
        (assets/'PULSE2PERCEPT-LICENSE.txt').write_bytes(native_license.read_bytes())
        fixture_manifest=dict(referenceVersion=VERSION,cases=[],coordinates=[])
        for name,c in cases():
            out,_=reference_predict(c,temp);filename=name+'.f32';b=out.tobytes();(fixtures/filename).write_bytes(b)
            fixture_manifest['cases'].append(dict(name=name,file=filename,config=c,width=out.shape[1],height=out.shape[0],sha256=sha(b),peak=float(out.max())))
        for x,y in ((0,0),(3,4),(-5,7),(15,-15)):
            u,v=Watson2014Map().dva_to_ret(x,y);a,b=Watson2014Map().ret_to_dva(u,v)
            fixture_manifest['coordinates'].append(dict(visual=[x,y],retinal=[float(u),float(v)],reverseVisual=[float(a),float(b)]))
        write_json(fixtures/'manifest.json',fixture_manifest)
        write_json(fixtures/'provenance.json',dict(dependencies={n:importlib.metadata.version(n) for n in ('pulse2percept','numpy','scipy','matplotlib','scikit-image','pandas')},python='3.12',sourceSdistSha256=SDIST_SHA256,geometrySha256=sha(data),generatorSha256=sha(Path(__file__).read_bytes()),note='All fixture outputs computed by unmodified native Python package, independent of browser implementation.'))
        print(json.dumps(dict(uncompressedBytes=len(data),compressedBytes=len(packed),parts=len(chunks),sha256=sha(data),eyes=eyes),indent=2))
if __name__=='__main__':main()
