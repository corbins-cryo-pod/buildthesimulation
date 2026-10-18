"""Import published basket fits with current same-specimen Allen morphology.
Historical morphology revision is unavailable: this is a disclosed adaptation.
Preserve source aibs_allactive_granule axon processing and original mechanisms.
"""
import json, math, gzip
from pathlib import Path
from importlib.machinery import SourceFileLoader
import numpy as np
from neuron import h
ROOT=Path(__file__).resolve().parents[1]
ASSETS=ROOT/'public/models/cortex/human-epilepsy'
original=SourceFileLoader('original_cortex_model',str(ROOT/'scripts/cortex-active-model.py')).load_module()
sha=original.sha
def make_cell(specimen,maximum_length=40):
    fit=json.loads((ASSETS/f'{specimen}.json').read_text())
    h.load_file('stdrun.hoc');h.load_file('import3d.hoc')
    for sec in list(h.allsec()):h.delete_section(sec=sec)
    reader=h.Import3d_SWC_read();reader.input(str(ASSETS/f'{specimen}.swc'))
    h.Import3d_GUI(reader,0).instantiate(None)
    source=list(h.allsec());soma=next(s for s in source if s.name().startswith('soma'))
    axons=[s for s in source if s.name().startswith('axon')]
    diameters=[axons[0].diam]*2
    h.distance(sec=soma)
    for sec in axons:
        sec.push()
        for seg in sec:
            if h.distance(seg.x)>60:diameters[1]=sec.diam
        h.pop_section()
    for sec in axons:h.delete_section(sec=sec)
    stub=[h.Section(name=f'axon_stub[{i}]') for i in range(2)]
    for i,sec in enumerate(stub):
        sec.L=30;sec.diam=diameters[i]
        sec.connect(soma(1) if i==0 else stub[i-1](1))
    h.define_shape()
    mid=int(h.n3d(sec=soma)/2)
    center=np.array([h.x3d(mid,sec=soma),h.y3d(mid,sec=soma),h.z3d(mid,sec=soma)])
    sections=[s for s in source if s not in axons]+stub
    for sec in sections:
        typ='axon' if sec in stub else sec.name().split('[')[0]
        sec.nseg=1 if typ=='soma' else int(math.ceil(sec.L/maximum_length))|1
        sec.insert('pas');sec.Ra=fit['passive'][0]['ra']
        for param in fit['genome']:
            if param['section']==typ:
                if param['mechanism']:sec.insert(param['mechanism'])
                setattr(sec,param['name'],float(param['value']))
        if h.ismembrane('na_ion',sec=sec):sec.ena=53
        if h.ismembrane('k_ion',sec=sec):sec.ek=-107
    h.celsius=34
    return sections,soma,stub,center
def generate():
    original.load_mechanisms();metadata=[]
    for sid in [529807751,541536216]:
        fit=json.loads((ASSETS/f'{sid}.json').read_text());variants={}
        for length in [10,20,40,80]:
            sections,soma,stub,center=make_cell(sid,length)
            nodes,_=original.discretize(sections,soma,center);variants[str(length)]=nodes
        mechanisms=sorted({p['mechanism'] for p in fit['genome'] if p['mechanism'] and p['mechanism']!='pas'})
        item={'id':f'allen-human-{sid}/1','specimenId':sid,'sourceCommit':'b09dcdada4ed6b94c4141ae2cab5cff9b50897f9',
              'neuronVersion':'9.0.1','fit':fit,'kv2TauGuard':False,'generatorSha256':sha(__file__),
              'geometryAdapterSha256':sha(ROOT/'scripts/cortex-active-model.py'),
              'sourceHashes':{p.name:sha(p) for p in [ASSETS/f'{sid}.swc',ASSETS/f'{sid}.json',*[ASSETS/f'mechanisms/{m}.mod' for m in mechanisms]]}}
        for length,nodes in variants.items():
            dest=ROOT/f'public/models/cortex/library/allen{sid}-{length}.json.gz'
            dest.write_bytes(gzip.compress(json.dumps({**item,'variants':{length:nodes}},separators=(',',':')).encode(),mtime=0))
        metadata.append({'id':item['id'],'specimenId':sid,'layer':'L3','class':'inhibitory','orientationRadians':[0,0,0],
                         'nodes':{k:len(v) for k,v in variants.items()},'mechanisms':mechanisms})
        print(sid,metadata[-1]['nodes'],flush=True)
    (ROOT/'src/lib/cortex/models/epilepsy-metadata.json').write_text(json.dumps(metadata,indent=2)+'\n')
if __name__=='__main__':generate()
