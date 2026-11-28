"""Check exact deployed atlas and teaching artifacts after a main-branch push."""
import argparse,concurrent.futures,hashlib,json,re,subprocess,time
from pathlib import Path
HOST='https://buildthesimulation.com'
ROOT=Path(__file__).resolve().parents[3]
p=argparse.ArgumentParser()
p.add_argument('--repo',type=Path,default=ROOT)
p.add_argument('--ref',help='Read deployment expectations from this local Git revision instead of the working tree')
p.add_argument('--attempts',type=int,default=1)
p.add_argument('--interval',type=float,default=15)
a=p.parse_args()
public=a.repo/'public'
def expected(path):
    if a.ref: return subprocess.check_output(['git','-C',str(a.repo),'show',a.ref+':'+path])
    return (a.repo/path).read_bytes()
ledger='src/data/foundry-atlas/lab-releases.json'
apps=json.loads(expected(ledger)) if a.ref or (a.repo/ledger).exists() else {}
def digest(b):return hashlib.sha256(b).hexdigest()
atlas='/simulations/foundry/atlas/'
hub='/simulations/foundry/'
atlas_expected=digest(expected('public'+atlas+'index.html'))
def get(path):
    assert re.fullmatch(r'/simulations/(?:[a-z0-9-]+/)+',path),path
    return subprocess.check_output(['curl','-fLsS','--max-time','15',HOST+path])
def verify():
    b=get(atlas);assert digest(b)==atlas_expected,('Atlas bytes',digest(b),atlas_expected)
    home=get(hub);assert atlas.encode() in home,'hub -> atlas link'
    def check(x):
        url=x['url'];assert url.encode() in home,('hub link',url)
        b=get(url);digest_seen=digest(b)
        assert digest_seen==x['sha256'],(url,digest_seen,x['sha256'])
        return url,digest_seen
    with concurrent.futures.ThreadPoolExecutor(max_workers=6) as work:
        verified=list(work.map(check,apps.values()))
    print(json.dumps({'status':'PASS','atlas':atlas,'sha256':atlas_expected,'verifiedLabs':verified},indent=2))
for i in range(a.attempts):
    try:verify();break
    except (AssertionError,subprocess.CalledProcessError) as err:
        print(f'Attempt {i+1}: {err}',flush=True)
        if i+1==a.attempts:raise
        time.sleep(a.interval)
