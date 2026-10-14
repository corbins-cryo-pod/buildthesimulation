"""Pinned SWC -> NEURON geometry adapter and original-mechanism model loader.

The website receives geometry/parameters only, never simulated solutions. Native
NEURON area and axial resistances retain taper and shared branch junctions.
"""
import hashlib
import json
import math
import os
from pathlib import Path

import numpy as np
from neuron import h

ROOT = Path(__file__).resolve().parents[1]
ASSETS = ROOT / "public/models/cortex/allen571654895"
KINETICS = ROOT / "scripts/cortex-active-mechanisms"
FIT = json.loads((ASSETS / "optim_param_571654895.json").read_text())
MECHANISMS = ["NaV", "Ih", "Im", "K_Pst", "K_Tst", "Kv3_1", "Ca_HVA", "Ca_LVA", "SK", "CaDynamics"]
MODEL_COMMIT = "750e7840cc1a9eb32492c924e79609a85a893b8a"


def sha(path):
    return hashlib.sha256(Path(path).read_bytes()).hexdigest()


def load_mechanisms():
    path = os.environ.get("CORTEX_ACTIVE_MECHANISM_LIBRARY")
    if not path:
        raise RuntimeError("Set CORTEX_ACTIVE_MECHANISM_LIBRARY to the compiled original-mechanism library")
    h.nrn_load_dll(path)


def make_cell(maximum_length=40):
    h.load_file("stdrun.hoc")
    h.load_file("import3d.hoc")
    for sec in list(h.allsec()):
        h.delete_section(sec=sec)
    reader = h.Import3d_SWC_read()
    reader.input(str(ASSETS / "571654895.swc"))
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
        sec.Ra = FIT["passive"][0]["ra"]
        for param in FIT["genome"]:
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


def location(sec, x):
    arcs = np.array([h.arc3d(i, sec=sec) for i in range(int(h.n3d(sec=sec)))])
    return [float(np.interp(x * sec.L, arcs, [fn(i, sec=sec) for i in range(len(arcs))])) for fn in [h.x3d, h.y3d, h.z3d]]


def discretize(sections, soma, center):
    nodes, segments, endpoint = [], [], {}
    children = {sec: [] for sec in sections}
    for sec in sections:
        if sec != soma:
            children[sec.parentseg().sec].append(sec)

    def visit(sec):
        typ = "axon" if sec.name().startswith("axon") else sec.name().split("[")[0]
        if sec == soma:
            parent = -1
        else:
            p = sec.parentseg()
            if p.sec == soma and abs(p.x - .5) < 1e-10:
                parent = 0
            elif abs(p.x - 1) < 1e-10:
                parent = endpoint[p.sec]
            else:
                raise RuntimeError(f"Unsupported section attachment {sec.name()} {p}")
        for k, seg in enumerate(sec):
            x = seg.x
            node = {
                "id": f"{sec.name()}:{k}", "parent": parent,
                "kind": "soma" if typ == "soma" else "axon" if typ == "axon" else "dendrite",
                "sectionType": typ, "sectionId": sec.name(), "sectionX": x,
                "areaUm2": seg.area(), "lengthUm": sec.L / sec.nseg, "diameterUm": seg.diam,
                "startUm": location(sec, k / sec.nseg), "endUm": location(sec, (k+1) / sec.nseg),
                "centerUm": location(sec, x), "edgeUs": 0 if parent < 0 else 1 / seg.ri(),
            }
            # Display follows the complete original polyline inside each compartment.
            pts = [node["startUm"]]
            arcs=[h.arc3d(j,sec=sec) for j in range(int(h.n3d(sec=sec)))]
            diameters=[h.diam3d(j,sec=sec) for j in range(int(h.n3d(sec=sec)))]
            path_diameters=[float(np.interp(k*sec.L/sec.nseg,arcs,diameters))]
            for j in range(int(h.n3d(sec=sec))):
                if k / sec.nseg < h.arc3d(j, sec=sec) / sec.L < (k+1) / sec.nseg:
                    pts.append([h.x3d(j, sec=sec), h.y3d(j, sec=sec), h.z3d(j, sec=sec)])
                    path_diameters.append(h.diam3d(j,sec=sec))
            pts.append(node["endUm"])
            path_diameters.append(float(np.interp((k+1)*sec.L/sec.nseg,arcs,diameters)))
            node["pathUm"] = pts
            node["pathDiameterUm"] = path_diameters
            nodes.append(node)
            segments.append(seg)
            parent = len(nodes)-1
        # Retain shared zero-area branch junctions. They carry axial current,
        # have no membrane/source/channel, and are not selectable/rendered cells.
        endpoint[sec] = len(nodes)
        nodes.append({"id": f"{sec.name()}:junction", "parent": parent, "kind": "junction",
                      "sectionType": typ, "sectionId": sec.name(), "sectionX": 1,
                      "areaUm2": 0, "lengthUm": 0, "diameterUm": 0,
                      "startUm": location(sec, 1), "endUm": location(sec, 1), "centerUm": location(sec, 1),
                      "edgeUs": 1 / h.ri(1, sec=sec), "pathUm": []})
        segments.append(sec(1))
        for child in children[sec]:
            visit(child)
    visit(soma)
    for node in nodes:
        for key in ["startUm", "endUm", "centerUm"]:
            node[key] = [v - float(center[i]) for i, v in enumerate(node[key])]
        node["pathUm"] = [[v - float(center[i]) for i, v in enumerate(p)] for p in node["pathUm"]]
    return nodes, segments


def generate():
    load_mechanisms()
    variants = {}
    for length in [10, 20, 40, 80]:
        sections, soma, stub, center = make_cell(length)
        nodes, _ = discretize(sections, soma, center)
        variants[str(length)] = nodes
    out = {"id": "allen-human-571654895/1", "specimenId": 571654895,
           "sourceCommit": MODEL_COMMIT, "neuronVersion": "9.0.1", "fit": FIT,
           "sourceHashes": {p.name: sha(p) for p in [ASSETS/"571654895.swc", ASSETS/"optim_param_571654895.json", *[KINETICS/f"{m}.mod" for m in MECHANISMS]]},
           "generatorSha256": sha(__file__), "variants": variants}
    target = ROOT / "src/lib/cortex/models/allen571654895.json"
    target.write_text(json.dumps(out, separators=(",", ":")) + "\n")
    print({k: {"nodes": len(v), "membranes": sum(n["areaUm2"] > 0 for n in v)} for k, v in variants.items()})


if __name__ == "__main__":
    generate()
