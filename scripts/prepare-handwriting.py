#!/usr/bin/env python3
"""Extract three 20 s excerpts. Requires Python 3, numpy, scipy; no decoder inference.
Usage: python3 scripts/prepare-handwriting.py /path/to/handwritingBCIData.tar.gz
"""
import base64, hashlib, io, json, sys, tarfile
from pathlib import Path
import numpy as np
from scipy.io import loadmat
archive = Path(sys.argv[1])
# Verify the published archive before using any recordings.
digest = hashlib.md5()
with archive.open('rb') as stream:
    for chunk in iter(lambda: stream.read(1024 * 1024), b''):
        digest.update(chunk)
archive_md5 = digest.hexdigest()
assert archive_md5 == '38b804d8bd271bd5981c7fda7f925eb8', 'Archive checksum mismatch'
member = 'handwritingBCIData/Datasets/t5.2019.12.18/sentences.mat'
with tarfile.open(archive, 'r|gz') as tar:
    for entry in tar:
        if entry.name.lstrip('./') == member:
            raw = tar.extractfile(entry).read()
            break
    else:
        raise ValueError('Source MATLAB file not found')
d = loadmat(io.BytesIO(raw), simplify_cells=True)
x = d['neuralActivityTimeSeries']
assert x.shape[1] == 192 and np.all(x >= 0) and np.all(x == np.floor(x))
trials = []
for i in range(len(d['goCueOnsetTimeBin'])):
    if d['excludedSentences'][i]: continue
    # Source indices are MATLAB 1-based. Start 2 s before go cue, end at trial boundary.
    go = int(d['goCueOnsetTimeBin'][i]) - 1
    start = max(int(d['delayCueOnsetTimeBin'][i]) - 1, go - 200)
    end = min(int(d['sentenceEndTimeBin'][i]), start + 2000)
    if end - start < 1000: continue
    counts = x[start:end].astype(np.uint8)
    assert np.array_equal(counts, x[start:end]) and len(np.unique(d['blockNumsTimeSeries'][start:end])) == 1
    assert counts.max() < 16
    flat = counts.ravel()
    packed = flat[::2] | (flat[1::2] << 4)
    prompt = str(d['sentencePrompt'][i]).replace('>', ' ').replace('~', '.')
    trials.append(dict(trial=i+1, prompt=prompt, condition=str(d['sentenceCondition'][i]),
        block=int(d['sentenceBlockNums'][i]), sourceStartBin=start+1, bins=end-start,
        goCueBin=go-start, counts=base64.b64encode(packed.tobytes()).decode()))
    if len(trials) == 3: break
assert len(trials) == 3
out = dict(schemaVersion=1, session='2019-12-18', participant='T5', channels=192, binMs=10,
    encoding='base64 packed uint4, low nibble first, time-major [bin][channel]', sourceFile=member,
    sourceFileSha256=hashlib.sha256(raw).hexdigest(), archiveMd5='38b804d8bd271bd5981c7fda7f925eb8',
    doi='10.5061/dryad.wh70rxwmv', license='CC0-1.0', trials=trials)
p = Path(__file__).resolve().parents[1] / 'public/data/handwriting/excerpts.json'
p.write_text(json.dumps(out, separators=(',', ':')) + '\n')
print(p, p.stat().st_size, [(t['trial'], t['prompt'], t['bins']) for t in trials])
