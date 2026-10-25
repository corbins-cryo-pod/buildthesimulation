#!/usr/bin/env python3
"""Export the authors' published array-session summaries without recomputation.

Run: python3 prepare-braingate-longterm.py --output braingate-longterm.json
Optional --csv /path/to/yield_summary.csv avoids a network download.
Uses only the Python standard library. Never substitutes synthetic samples.
"""
import argparse, collections, csv, hashlib, io, json, math
from pathlib import Path
from urllib.request import urlopen

COMMIT = '93beb76b4329f0e3d5b3fd5ffba9be1c7cfa2834'
REPO = 'https://github.com/nptl-stanford/array-paper'
CSV_URL = f'https://raw.githubusercontent.com/nptl-stanford/array-paper/{COMMIT}/data/yield_summary.csv'
CSV_SHA256 = '9b84b99fb2848a6a85f30d127bd64f54b68e4e76609d67e220466ef4df7ade3f'
METRICS = [
    {'id':'percentYield','sourceColumn':'percent_yield','label':'Electrode yield','unit':'%','domain':[0,100],
     'definition':'100 × n_spiking_electrodes / 96. An electrode meets the authors\' criterion when its robust threshold-crossing rate at −4.5 times robust standard deviation is at least 2 Hz. This is an array-level summary, not a neuron count.'},
    {'id':'nSpikingElectrodes','sourceColumn':'n_spiking_electrodes','label':'Spiking electrodes','unit':'electrodes','domain':[0,96],
     'definition':'Number of electrodes meeting the ≥2 Hz robust threshold-crossing-rate criterion at the −4.5 threshold; denominator is 96 electrodes per array.'},
    {'id':'medianImpedanceKohm','sourceColumn':'median_impedance','label':'Median impedance','unit':'kΩ',
     'definition':'Median across array electrodes, excluding impedance values ≥4000 kΩ. Null indicates unavailable measurements; the source does not give a universal measurement frequency in this summary.'},
    {'id':'waveformNegativePeakUv','sourceColumn':'spike_waveform_amplitude','label':'Median negative waveform peak','unit':'µV',
     'definition':'Median of the minimum value of each spiking electrode\'s mean threshold-crossing waveform. Negative sign retained. This is one scalar per array-session, not waveform samples.'},
    {'id':'noiseThresholdUv','sourceColumn':'spike_waveform_noise','label':'Mean noise threshold','unit':'µV',
     'definition':'Mean voltage threshold at −3 times robust standard deviation across the included spiking electrodes. A negative threshold, not an RMS noise amplitude.'},
    {'id':'waveformSnr','sourceColumn':'spike_waveform_snr','label':'Authors\' waveform ratio','unit':'ratio',
     'definition':'Median negative waveform peak divided by mean negative noise threshold. Both numerator and denominator are negative, giving a positive ratio. This is the authors\' specific SNR definition, not generic peak-to-peak/RMS SNR.'},
]

def export(raw):
    assert hashlib.sha256(raw).hexdigest() == CSV_SHA256, 'Unexpected source CSV SHA-256'
    rows = list(csv.DictReader(io.StringIO(raw.decode('utf-8'))))
    series = collections.defaultdict(list)
    keys = set()
    for row in rows:
        participant, array = row['participant_id'], row['array_name']
        day = int(row['post_implant_day'])
        key = (participant,array,day)
        assert key not in keys, f'Duplicate array-session {key}'
        keys.add(key)
        point = {'day':day}
        for metric in METRICS:
            s = row[metric['sourceColumn']]
            value = None if s == '' else (int(s) if metric['id']=='nSpikingElectrodes' else float(s))
            assert value is None or math.isfinite(value), 'Nonfinite metric'
            point[metric['id']] = value
        assert 0 <= point['nSpikingElectrodes'] <= 96
        assert abs(point['percentYield'] - point['nSpikingElectrodes']/96*100) < 1e-10
        series[(participant,array)].append(point)
    output_series = [dict(id=f'{participant}-{array}',participant=participant,array=array,
        label=f'{participant} · {array}',points=sorted(points,key=lambda p:p['day']))
        for (participant,array),points in sorted(series.items())]
    assert len(rows)==3757 and len(series)==20
    assert len(set(row['participant_id'] for row in rows))==14
    assert len(set((row['participant_id'],row['post_implant_day']) for row in rows))==2289
    return {
      'schema':'bts-recording-summary-v1','id':'braingate-longterm','kind':'longitudinal-summary',
      'title':'BrainGate · Utah-array recording yield',
      'summary':'Published array-level measurements from 2,289 research sessions, covering 20 Utah arrays in 14 BrainGate participants. Each plotted point is one measured array-session.',
      'species':'Human','device':'96-channel Utah microelectrode arrays',
      'counts':{'participants':14,'arrays':20,'sessions':2289,'arraySessionRows':3757,'electrodesPerArray':96},
      'timeAxis':{'label':'Days after implantation','unit':'days','irregular':True},
      'metrics':METRICS,'series':output_series,
      'provenance':{
        'citation':'Hahn NV, Stein E, BrainGate Consortium, Donoghue JP, Simeral JD, Hochberg LR, Willett FR (2026). Performance of intracortical microelectrode arrays in people with implanted brain-computer interfaces over a 20-year period.',
        'datasetUrl':'https://doi.org/10.5061/dryad.x0k6djj1h','datasetRelease':'2026-09-09','dryadVersionId':462702,
        'repositoryUrl':REPO,'repositoryCommit':COMMIT,'sourceUrl':CSV_URL,
        'sourcePath':'data/yield_summary.csv','sourceSha256':CSV_SHA256,'sourceBytes':len(raw),
        'methodsUrl':f'{REPO}/blob/{COMMIT}/array_paper/metrics/yield_metrics.py',
        'sourceLicense':'MIT (authors\' code repository, including distributed summary CSV); underlying Dryad dataset CC0-1.0',
        'licenseUrl':f'{REPO}/blob/{COMMIT}/LICENSE',
        'transformation':'All 3,757 source rows preserved. Columns renamed to explicit units; blank CSV cells converted to null. Values parsed to JSON numbers without rounding, interpolation, smoothing, or recalculation. Rows grouped by participant and array, then sorted by implantation day.',
        'accessedOn':'2026-10-25',
      },
      'limitations':[
        'These are published summary measurements, not continuous electrode voltages, per-electrode channel maps, waveform samples, or a live decoder.',
        'Days are relative to each participant\'s implantation and sampling intervals differ. The data do not follow every implant continuously, and a study spanning 20 years does not mean 20 years of follow-up for each array.',
        'Recordings under different participants, tasks and acquisition conditions are not a controlled device comparison. No clinical performance prediction or device lifespan estimate is computed.',
        'Missing impedance or waveform metrics stay null and should be shown as unavailable; do not connect a curve through missing values.',
      ]
    }

if __name__=='__main__':
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--csv',type=Path)
    parser.add_argument('--output',type=Path,default=Path('braingate-longterm.json'))
    args=parser.parse_args()
    raw=args.csv.read_bytes() if args.csv else urlopen(CSV_URL,timeout=90).read()
    result=export(raw)
    args.output.parent.mkdir(parents=True,exist_ok=True)
    args.output.write_text(json.dumps(result,ensure_ascii=False,separators=(',',':'),allow_nan=False)+'\n')
    print(json.dumps({'output':str(args.output),'bytes':args.output.stat().st_size,**result['counts']}))
