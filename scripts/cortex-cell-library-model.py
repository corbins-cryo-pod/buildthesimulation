"""NEURON geometry import for distinct published human cells. No fitting or synthesis.
Directed axon processing matches the upstream human EAP publication.
"""
import csv, hashlib, json, math, os, gzip
from pathlib import Path
from importlib.machinery import SourceFileLoader
import numpy as np
from neuron import h
ROOT = Path(__file__).resolve().parents[1]
ASSETS = ROOT / 'public/models/cortex/human-eap'
COMMIT = '750e7840cc1a9eb32492c924e79609a85a893b8a'
original = SourceFileLoader('original_cortex_model', str(ROOT / 'scripts/cortex-active-model.py')).load_module()
sha = original.sha

def make_cell(specimen, maximum_length=40):
    fit = json.loads((ASSETS / f"optim_param_{specimen}.json").read_text())
    h.load_file("stdrun.hoc")
    h.load_file("import3d.hoc")
    for sec in list(h.allsec()):
        h.delete_section(sec=sec)
    reader = h.Import3d_SWC_read()
    reader.input(str(ASSETS / f"{specimen}.swc"))
    h.Import3d_GUI(reader, 0).instantiate(None)
    original = list(h.allsec())
    soma = next(sec for sec in original if sec.name().startswith("soma"))
    axons = [sec for sec in original if sec.name().startswith("axon")]
    # Literal directed-processor convention: its loop retains the final axon
    # section for PCA, rather than concatenating the entire reconstructed axon.
    last = axons[-1]
    pts = np.array([[h.x3d(i, sec=last), h.y3d(i, sec=last), h.z3d(i, sec=last)] for i in range(int(h.n3d(sec=last)))])
    mid = int(h.n3d(sec=soma) / 2)
    center = np.array([h.x3d(mid, sec=soma), h.y3d(mid, sec=soma), h.z3d(mid, sec=soma)])
    end = np.array([h.x3d(int(h.n3d(sec=soma))-1, sec=soma), h.y3d(int(h.n3d(sec=soma))-1, sec=soma), h.z3d(int(h.n3d(sec=soma))-1, sec=soma)])
    samples = np.vstack([center, pts])
    direction = np.linalg.svd(samples - samples.mean(axis=0), full_matrices=False)[2][0]
    if np.dot(direction, pts[-1] - center) < 0:
        direction *= -1
    for sec in axons:
        h.delete_section(sec=sec)
    stub = [h.Section(name=f"axon_stub[{i}]") for i in range(2)]
    for i, sec in enumerate(stub):
        for p in [end + i * 30 * direction, end + (i+1) * 30 * direction]:
            h.pt3dadd(*p, 1, sec=sec)
        sec.connect(soma(1) if i == 0 else stub[i-1](1))
        sec.L = 30
    h.define_shape()
    sections = [sec for sec in original if sec not in axons] + stub
    for sec in sections:
        typ = "axon" if sec in stub else sec.name().split("[")[0]
        sec.nseg = 1 if typ == "soma" else int(math.ceil(sec.L / maximum_length)) | 1
        sec.insert("pas")
        sec.Ra = fit["passive"][0]["ra"]
        for param in fit["genome"]:
            if param["section"] == typ:
                if param["mechanism"]:
                    sec.insert(param["mechanism"])
                setattr(sec, param["name"], float(param["value"]))
        if h.ismembrane("na_ion", sec=sec):
            sec.ena = 53
        if h.ismembrane("k_ion", sec=sec):
            sec.ek = -107
    h.celsius = 34
    return sections, soma, stub, center


def generate():
    original.load_mechanisms()
    rows = list(csv.DictReader((ASSETS / 'human_celltypes_table.csv').open()))
    manifest=[]
    for row in rows:
        sid=int(row['specimen__id'])
        fit=json.loads((ASSETS / f'optim_param_{sid}.json').read_text())
        mechanisms=sorted({p['mechanism'] for p in fit['genome'] if p['mechanism']})
        variants={}
        for length in [10,20,40,80]:
            sections,soma,stub,center=make_cell(sid,length)
            nodes,_=original.discretize(sections,soma,center)
            variants[str(length)]=nodes
        item={'id':f'allen-human-{sid}/1','specimenId':sid,'sourceCommit':COMMIT,'neuronVersion':'9.0.1','fit':fit,
              'sourceHashes':{p.name:sha(p) for p in [ASSETS/f'{sid}.swc',ASSETS/f'optim_param_{sid}.json',*[ROOT/f'scripts/cortex-active-mechanisms/{m}.mod' for m in mechanisms]]},
              'generatorSha256':sha(__file__),'geometryAdapterSha256':sha(ROOT/'scripts/cortex-active-model.py'),
              'variants':variants}
        if sid!=571654895:
            dest=ROOT/'public/models/cortex/library';dest.mkdir(parents=True,exist_ok=True)
            for length,nodes in variants.items():
                payload={**item,'variants':{length:nodes}}
                (dest/f'allen{sid}-{length}.json.gz').write_bytes(gzip.compress(json.dumps(payload,separators=(',',':')).encode(),mtime=0))
        manifest.append({'id':item['id'],'specimenId':sid,'layer':row['layer'],'class': 'excitatory' if row['ei']=='e' else 'inhibitory',
                         'orientationRadians':[float(row[f'theta_{a}']) for a in 'xyz'],
                         'nodes':{k:len(v) for k,v in variants.items()},'mechanisms':mechanisms})
        print(sid,manifest[-1]['nodes'],flush=True)
    (ROOT/'src/lib/cortex/models/library-metadata.json').write_text(json.dumps(manifest,indent=2)+'\n')

if __name__=='__main__':generate()
