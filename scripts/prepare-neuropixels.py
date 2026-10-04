#!/usr/bin/env python3
"""Build the Neuropixels explorer excerpt from the International Brain Laboratory
Brainwide Map (public OpenAlyx release). Requires Python 3, numpy, pandas, one-api.
Usage: python3 scripts/prepare-neuropixels.py
Downloads one probe's spike-sorted output (large: ~1.6 GB of spike arrays, read with memory mapping)
and writes public/data/neuropixels/excerpt.json. No raw data is committed.
"""
import json, hashlib, urllib.request
from pathlib import Path
import numpy as np
from one.api import ONE

EID = 'ebce500b-c530-47de-8cb1-963c552703ea'   # MFD_09, churchlandlab_ucla, 2023-10-19
PROBE_COL = 'alf/probe00/pykilosort'
WINDOW_S = 20.0          # raster excerpt length
START_TRIAL = 150        # excerpt begins 1 s before this trial's interval start
BIN = 0.02               # PSTH bin, s
PRE, POST = 0.3, 0.8     # PSTH window around stimulus onset, s

one = ONE(base_url='https://openalyx.internationalbrainlab.org', password='international', silent=True)
load = lambda n: one.load_dataset(EID, n, collection=PROBE_COL)
times_path = one.load_dataset(EID, 'spikes.times', collection=PROBE_COL, download_only=True)
clus_path = one.load_dataset(EID, 'spikes.clusters', collection=PROBE_COL, download_only=True)
st = np.load(times_path, mmap_mode='r'); sc = np.load(clus_path, mmap_mode='r')
metrics = load('clusters.metrics'); cdepth = load('clusters.depths'); cchan = load('clusters.channels')
coords = load('channels.localCoordinates'); locids = load('channels.brainLocationIds_ccf_2017')
trials = one.load_dataset(EID, '_ibl_trials.table.pqt')

# Allen CCF structure names for the channel locations
req = urllib.request.urlopen('http://api.brain-map.org/api/v2/structure_graph_download/1.json', timeout=60)
ont = {}
def walk(n):
    ont[n['id']] = (n['acronym'], n['name'])
    for c in n.get('children', []): walk(c)
for n in json.load(req)['msg']: walk(n)

good = np.where(metrics['label'].to_numpy() == 1.0)[0]            # IBL "good" units (all 3 QC criteria pass)
gidx = -np.ones(len(metrics), dtype=np.int32); gidx[good] = np.arange(len(good))
order = np.argsort(cdepth[good], kind='stable')                    # sort units by depth along the shank
good = good[order]; gidx[:] = -1; gidx[good] = np.arange(len(good))

# raster excerpt
t0 = float(trials['intervals_0'].iloc[START_TRIAL]) - 1.0
lo, hi = np.searchsorted(st, [t0, t0 + WINDOW_S])
w_t = np.asarray(st[lo:hi]); w_c = np.asarray(sc[lo:hi])
units_spikes = [[] for _ in good]
for t, c in zip(w_t, w_c):
    g = gidx[c]
    if g >= 0: units_spikes[g].append(int(round((t - t0) * 1000)))
ev = trials[(trials['intervals_0'] >= t0) & (trials['intervals_1'] <= t0 + WINDOW_S)]
events = [dict(trial=int(i) + 1, stim=round(float(r.stimOn_times - t0), 3),
               side='left' if not np.isnan(r.contrastLeft) else 'right',
               contrast=float(r.contrastLeft if not np.isnan(r.contrastLeft) else r.contrastRight),
               choice=int(r.choice), move=None if np.isnan(r.firstMovement_times) else round(float(r.firstMovement_times - t0), 3),
               feedback=round(float(r.feedback_times - t0), 3), correct=int(r.feedbackType) == 1)
          for i, r in ev.iterrows()]

# PSTH around stimulus onset, whole session, split by stimulus side (all trials with a stimulus)
nb = int(round((PRE + POST) / BIN)); edges = np.arange(nb + 1) * BIN - PRE
psth = {'left': np.zeros((len(good), nb)), 'right': np.zeros((len(good), nb))}; ntr = {'left': 0, 'right': 0}
for _, r in trials.iterrows():
    if np.isnan(r.stimOn_times): continue
    side = 'left' if not np.isnan(r.contrastLeft) else 'right'
    a, b = np.searchsorted(st, [r.stimOn_times - PRE, r.stimOn_times + POST])
    c = np.asarray(sc[a:b]); t = np.asarray(st[a:b]) - r.stimOn_times
    g = gidx[c]; m = g >= 0
    h, _, _ = np.histogram2d(g[m], t[m], bins=[np.arange(len(good) + 1), edges])
    psth[side] += h; ntr[side] += 1
for s in psth: psth[s] = psth[s] / ntr[s] / BIN

units = []
for k, cid in enumerate(good):
    ch = int(cchan[cid]); aid = int(locids[ch]); acr, name = ont.get(aid, ('?', 'unknown'))
    units.append(dict(id=int(cid), depth=round(float(cdepth[cid]), 1), x=float(coords[ch][0]), ch=ch + 1, region=acr,
                      rate=round(float(metrics['firing_rate'].iloc[cid]), 2), spikes=units_spikes[k],
                      psthLeft=[round(float(v), 1) for v in psth['left'][k]], psthRight=[round(float(v), 1) for v in psth['right'][k]]))
regions = {}
for ch in range(384):
    acr, name = ont.get(int(locids[ch]), ('?', 'unknown')); regions.setdefault(acr, dict(acronym=acr, name=name, minDepth=1e9, maxDepth=-1e9, channels=0))
    r = regions[acr]; r['minDepth'] = min(r['minDepth'], float(coords[ch][1])); r['maxDepth'] = max(r['maxDepth'], float(coords[ch][1])); r['channels'] += 1
out = dict(schemaVersion=1, eid=EID, probe='probe00', sorter='pykilosort', subject='MFD_09', lab='churchlandlab_ucla', date='2023-10-19',
           probeModel='Neuropixels 1.0 (IBL model 3B2)', licenseNote='IBL public data release (CC BY 4.0)',
           windowMs=int(WINDOW_S * 1000), psth=dict(binMs=int(BIN * 1000), preMs=int(PRE * 1000), postMs=int(POST * 1000), trialsLeft=ntr['left'], trialsRight=ntr['right']),
           sessionUnitsTotal=int(len(metrics)), sessionGoodUnits=int(len(good)), sessionSpikes=int(len(st)), sessionTrials=int(len(trials)),
           events=events, regions=sorted(regions.values(), key=lambda r: r['minDepth']), units=units)
p = Path(__file__).resolve().parents[1] / 'public/data/neuropixels/excerpt.json'
p.parent.mkdir(parents=True, exist_ok=True)
p.write_text(json.dumps(out, separators=(',', ':')) + '\n')
print(p, p.stat().st_size, len(units), sum(len(u['spikes']) for u in units), len(events), ntr)
print([ (r['acronym'], r['minDepth'], r['maxDepth']) for r in out['regions']])
