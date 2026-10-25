#!/usr/bin/env python3
"""Normalize prepared excerpts for the browser; never modify numeric samples.
Run preparation scripts in a scratch output folder, then pass their JSON exports here.
"""
import argparse, hashlib, json
from pathlib import Path

def normalize(path):
    original=path.read_bytes(); data=json.loads(original)
    if data.get('kind')=='longitudinal-summary':
        data['acquisitionNotes']=[s for s in data['limitations'] if '403/401' in s]
        data['limitations']=[s for s in data['limitations'] if '403/401' not in s]
        data['sourceUrl']=data['provenance']['datasetUrl']
    else:
        data['schema']='bts-recording-v1'
        if isinstance(data.get('processing'),str):data['processing']=[data['processing']]
        for segment in data['segments']:
            if data.get('signalKind') and not segment.get('signalKind'):segment['signalKind']=data['signalKind']
            if data['id']=='ibl-neuropixels-voltage':
                segment['mappingLabel']='IBL local channel coordinates (independent x/y scales)'
                segment['timeReference']=f"Excerpt begins at {segment['startTimeSeconds']:.6f} s on the probe acquisition clock; not aligned to behavioral events."
    data['webExport']={'normalizer':'scripts/recordings/publish-excerpts.py','preparedFileSha256':hashlib.sha256(original).hexdigest(),'numericSamplesModified':False}
    return data

if __name__=='__main__':
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument('files',type=Path,nargs='+')
    parser.add_argument('--out',type=Path,default=Path('public/data/recordings'))
    a=parser.parse_args();a.out.mkdir(parents=True,exist_ok=True)
    for path in a.files:
        data=normalize(path);target=a.out/(data['id']+'.json');target.write_text(json.dumps(data,ensure_ascii=False,separators=(',',':'),allow_nan=False)+'\n')
        print(target, target.stat().st_size)
