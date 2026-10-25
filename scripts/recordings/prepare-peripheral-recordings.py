#!/usr/bin/env python3
"""Prepare true SPARC430 and miRPNI excerpts. Requires numpy and pyabf.
Run: python prepare-peripheral-recordings.py --cache /tmp/peripheral-source --out public/data/recordings
Downloads ~34 MB using member-specific HTTP ranges; never synthesizes samples.
"""
import argparse,base64,csv,hashlib,io,json,struct,urllib.parse,urllib.request,zipfile,zlib
from pathlib import Path
import numpy as np
import pyabf

def sha(b): return hashlib.sha256(b).hexdigest()
def fetch(url,path,headers=None):
    if path.exists(): return path.read_bytes()
    req=urllib.request.Request(url,headers=headers or {})
    with urllib.request.urlopen(req,timeout=120) as r:
        if headers and 'Range' in headers: assert r.status==206,'Server must honor range'
        b=r.read()
    path.write_bytes(b)
    return b

def write(path,data):
    path.write_text(json.dumps(data,separators=(',',':'),ensure_ascii=False,allow_nan=False)+'\n')

def rpni(cache,out):
    base='https://zenodo.org/api/records/23377398/files/'
    required={'miRPNI_readme.md':'cd0ba0691f8a50c51f3a13f7996b7096','P1_meta.zip':'544e9ca6423fab5589337b7bf41a0aeb','movements.json':'7a7061089c55298447dcf523e43a931f','P1_notes.txt':'05ec78a103af9ef9588526b5c601ab53'}
    sourceFiles=[]
    for n,md5 in required.items():
        b=fetch(base+n+'/content',cache/n);assert hashlib.md5(b).hexdigest()==md5,n
        sourceFiles.append({'url':base+n+'/content','sha256':sha(b),'md5Verified':md5})
    url=base+'P1_csv.zip/content';size=481853558
    tail=fetch(url,cache/'P1_tail.bin',{'Range':'bytes=-65536'})
    assert len(tail)==65536
    zipDirectory=zipfile.ZipFile(io.BytesIO(tail));members={}
    for n in ['csv/P1_S1_EMG1kHz_filt.csv','csv/P1_S1_MAVS.csv']:
        info=zipDirectory.getinfo(n);offset=info.header_offset+size-len(tail);file=cache/Path(n).name
        if file.exists(): raw=file.read_bytes()
        else:
            chunk=fetch(url,cache/(Path(n).name+'.compressed'),{'Range':f'bytes={offset}-{offset+info.compress_size+1024}'})
            assert chunk[:4]==b'PK\x03\x04'
            nlen,xlen=struct.unpack_from('<HH',chunk,26);start=30+nlen+xlen
            raw=zlib.decompress(chunk[start:start+info.compress_size],-15);file.write_bytes(raw)
        assert len(raw)==info.file_size and zlib.crc32(raw)==info.CRC,n
        sourceFiles.append({'archiveUrl':url,'archiveBytes':size,'archiveMd5Published':'16c902b93c83acc98c37dee8401ea2c8','member':n,'memberBytes':info.file_size,'memberCrc32Verified':f'{info.CRC:08x}','sha256':sha(raw),'integrity':'Member CRC32 verified; full archive MD5 not downloaded/verified.'})
        members[n]=list(csv.DictReader(io.StringIO(raw.decode())))
    z=zipfile.ZipFile(cache/'P1_meta.zip');trials=json.loads(z.read('meta/P1_S1_meta.json'));chmeta=json.loads(z.read('meta/P1_metadata.json'));tasks={int(x['TaskNumber']):x['TaskName'] for x in json.loads((cache/'movements.json').read_text())}
    chosen=[next(t for t in trials if t['TaskNumber']==task and t['TrialNumber']==1) for task in [2,3,6]]
    segments=[]
    for t in chosen:
        rows=[r for r in members['csv/P1_S1_EMG1kHz_filt.csv'] if int(r['TrialID'])==t['TrialID']]
        assert len(rows)==8000 and t['RestTime']==5000 and t['HoldTime']==3000
        assert all(int(r['MovementCue'])==int(i>=5000) for i,r in enumerate(rows))
        first,last=4000,8000;excerpt=rows[first:last]
        channels=[]
        for c in chmeta:
            j=c['channelNumber'];label=c['channelName'];channels.append({'id':f'ch{j}','label':label,'unit':'source units','signalType':'RPNI graft EMG' if 'RPNI' in label else 'Residual muscle EMG','samples':[float(r[f'EMG1k_filt_{j}']) for r in excerpt]})
        segments.append({'id':f'p1-s1-trial{t["TrialID"]}','label':f'{tasks[t["TaskNumber"]]} · P1/S1 trial {t["TrialID"]}','sampleRateHz':1000,'startTimeSeconds':4,'timeReference':'Seconds from excerpt start; source trial starts 4 seconds earlier.','unit':'source units','sourceStartSample':first,'sourceStopSampleExclusive':last,'sourceTrial':t,'channels':channels,'events':[{'timeSeconds':1,'durationSeconds':3,'label':f'Cued {tasks[t["TaskNumber"]]}'}]})
    data={'schemaVersion':1,'id':'mirpni','title':'miRPNI · human graft and residual-muscle EMG','sourceUrl':'https://zenodo.org/records/23377398','license':'CC BY-NC-SA 4.0','licenseUrl':'https://creativecommons.org/licenses/by-nc-sa/4.0/','citation':'Nwokeabia, C. et al. (2026). miRPNI: A dataset of intramuscular electromyography from Regenerative Peripheral Nerve Interfaces and residual muscles. Version 8.0. doi:10.5281/zenodo.23377398.','version':'8.0','species':'Human','signalType':'Released filtered intramuscular EMG','originalSampleRateHz':30000,'releasedSampleRateHz':1000,'processing':'Original acquisition 30 kHz. Authors release 1 kHz resampled, band-pass and notch-filtered EMG. This excerpt preserves the CSV numerical values without further filtering, smoothing, scaling or resampling. Three first repetitions, source samples 4000–7999 of each 8-second trial.','provenance':{'datasetVersion':'8.0','participant':'P1','session':'S1','selection':'First trial of thumb, index-finger and small-finger flexion; last 4 seconds of each trial. This retains 1 second of rest followed by 3 seconds of cued movement.','channelMap':'P1_meta.zip/meta/P1_metadata.json; source channel numbers retained; no geometric positions released here.','amplitudeUnits':'CSV and README do not define a calibrated unit. Companion MATLAB script contains a commented µV ylabel, insufficient to establish calibration; values are explicitly labeled source units.','sourceFiles':sourceFiles},'limitations':['These are muscle signals from reinnervated grafts and residual muscles, not direct single-axon recordings.','Movement labels are prompts, not decoder predictions or measured prosthetic motion.','This is one participant and session, not a population summary or claim of device performance.','Amplitude calibration is not established by the supplied CSV metadata; no voltage-unit conversion is applied.','Excerpt and derivative data retain CC BY-NC-SA 4.0; noncommercial use and share-alike terms apply.'],'segments':segments}
    write(out/'mirpni.json',data)
    print('miRPNI',len(segments),'segments',[(s['id'],len(s['channels'][0]['samples'])) for s in segments],flush=True)

def cuff(cache,out):
    api='https://api.pennsieve.io/discover/datasets/430/versions/1/files/browse?path=files/primary/sub-20241014/perf-20241014-200-ms-Stimulation'
    manifest=json.loads(fetch(api,cache/'penn-files.json'));files={f['name']:f for f in manifest['files']}
    sourceFiles=[];segments=[]
    for current in [300,500,700]:
        name=f'{current}uA_200ms.abf';f=files[name]
        u=f['uri'].replace('s3://sparc-prod-aod-discover-publish50-use1/','https://sparc-prod-aod-discover-publish50-use1.s3.amazonaws.com/')+'?versionId='+urllib.parse.quote(f['s3Version'])
        b=fetch(u,cache/name);assert len(b)==f['size'] and hashlib.sha256(b).digest()==base64.b64decode(f['sha256'])
        abf=pyabf.ABF(str(cache/name));assert abf.dataRate==100000 and abf.channelCount==4 and abf.sweepCount==1
        trigger=abf.data[0];indices=np.where((trigger[:-1]<700)&(trigger[1:]>=700))[0]+1
        first=int(next(i for i in indices if i>=60 and i+4940<=abf.data.shape[1]));start=first-60;stop=start+5000
        chans=[]
        for idx,label in [(2,'ENG · silicone recording cuff'),(1,'EMG · muscle needle electrodes')]:
            chans.append({'id':f'adc{idx}','label':label,'unit':'source units','sourceChannelIndex':idx,'sourceChannelName':abf.adcNames[idx],'abfDeclaredUnit':abf.adcUnits[idx],'samples':abf.data[idx,start:stop].astype(float).tolist()})
        sourceFiles.append({'url':u,'path':f['path'],'bytes':len(b),'sha256':sha(b),'publishedSha256Base64Verified':f['sha256'],'s3VersionId':f['s3Version'],'abfADCNames':abf.adcNames,'abfADCUnits':abf.adcUnits,'sampleRateHz':abf.dataRate,'sourceDate':str(abf.abfDateTime)})
        segments.append({'id':f'cuff-{current}ua','label':f'{current} µA · single recorded event','sampleRateHz':100000,'startTimeSeconds':start/100000,'timeReference':'Seconds from excerpt start. Marker is an observed artifact threshold crossing, not an independently timed stimulus onset.','unit':'source units','sourceStartSample':start,'sourceStopSampleExclusive':stop,'stimulationAmplitudeMicroamps':current,'pulseWidthMicrosecondsAsDocumented':200,'channels':chans,'events':[{'timeSeconds':.0006,'label':'Artifact threshold crossing (ADC0 > 700)'}]})
    notebook='https://sparc-prod-aod-discover-publish50-use1.s3.amazonaws.com/430/files/code/Sparc_Data_Submission.ipynb'
    code=fetch(notebook,cache/'penn-code.ipynb');sourceFiles.append({'url':notebook,'sha256':sha(code),'purpose':'Channel identity and threshold alignment convention; code Figure 3 assigns zero-based ENG channel2 and EMG channel1 for sub-20241014.'})
    data={'schemaVersion':1,'id':'sparc-cuff','title':'Sciatic cuff · measured ENG and EMG','sourceUrl':'https://discover.pennsieve.io/datasets/430','license':'CC BY 4.0','licenseUrl':'https://creativecommons.org/licenses/by/4.0/','citation':'Li, M., Elyahoodayan, S., Rezard, Q., Chen, J., Baldwin, A., Meng, E., & Song, D. (2025). Acute stimulation and recording of the rat sciatic nerve using a self-sizing and soft closing polymer cuff electrode (Version 1). SPARC. doi:10.26275/6fxa-8gef.','version':'1','species':'Rat','signalType':'Acquired ENG/EMG including stimulation artifact','originalSampleRateHz':100000,'releasedSampleRateHz':100000,'processing':'pyABF reads native scaled samples; 50 ms unfiltered excerpts from three source ABF files. No averaging, baseline subtraction, artifact removal or downsampling. Alignment follows the authors’ positive 700 threshold convention on ADC0 and begins 0.6 ms before the first qualifying crossing.','provenance':{'datasetVersion':1,'subject':'sub-20241014','channelMap':'Authors’ Figure 3 notebook: zero-based channel2 ENG, channel1 EMG. ADC0 is used only for artifact alignment.','amplitudeUnits':'ABF declares V, while authors’ notebook plots these same numbers as µV. Preserve values without conversion; display source units because this is a source metadata conflict.','pulseWidth':'Published filenames/folder say 200ms; notebook and study protocol describe 200µs. Filename is retained; 200µs is labeled as documented, not inferred from filename.','timing':'Artifact threshold crossing is observed; hardware stimulus-onset timestamps are not independently provided. Do not infer conduction latency from this marker.','sourceFiles':sourceFiles},'limitations':['Research polymer cuff stimulates; a separate commercial silicone cuff records ENG, and needle electrodes record EMG. This is related cuff research, not measurements from a named CWRU/FINE/LivaNova product.','Stimulation artifacts are retained; a large initial deflection is not automatically a neural response.','ABF and author-plot amplitude units conflict; values are displayed in source units, not calibrated µV.','The event marker is an artifact threshold crossing, not exact stimulus onset.','Three single events from one rat; this is not an averaged recruitment curve or a device prediction.'],'segments':segments}
    write(out/'sparc-cuff.json',data)
    print('SPARC430',len(segments),'segments',[(s['id'],s['sourceStartSample']) for s in segments],flush=True)

def main():
    p=argparse.ArgumentParser();p.add_argument('--cache',type=Path,default=Path('/tmp/peripheral-recordings'));p.add_argument('--out',type=Path,default=Path('public/data/recordings'));a=p.parse_args();a.cache.mkdir(parents=True,exist_ok=True);a.out.mkdir(parents=True,exist_ok=True)
    rpni(a.cache,a.out);cuff(a.cache,a.out)
if __name__=='__main__':main()
