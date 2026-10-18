"""Download pinned, unmodified published cells; never synthesize a morphology/fit."""
from pathlib import Path
from concurrent.futures import ThreadPoolExecutor
import urllib.request
import csv
import io
import json

ROOT = Path(__file__).resolve().parents[1]
COMMIT = '750e7840cc1a9eb32492c924e79609a85a893b8a'
BASE = f'https://raw.githubusercontent.com/AllenInstitute/Human_all_active_models_EAP/{COMMIT}/'
DEST = ROOT / 'public/models/cortex/human-eap'

def download(path, dest):
    data = urllib.request.urlopen(BASE + path, timeout=60).read()
    dest.parent.mkdir(parents=True, exist_ok=True)
    dest.write_bytes(data)
    return data

def main():
    table = download('assets/morphologies/human_celltypes_table.csv', DEST / 'human_celltypes_table.csv')
    download('LICENSE.txt', DEST / 'LICENSE.txt')
    download('codes/morph_func.py', DEST / 'source-morph_func.py')
    rows = list(csv.DictReader(io.StringIO(table.decode())))
    def cell(row):
        sid = row['specimen__id']
        download(f'assets/morphologies/{sid}.swc', DEST / f'{sid}.swc')
        fit = download(f'assets/models/optim_param_{sid}.json', DEST / f'optim_param_{sid}.json')
        print(sid, sorted({p['mechanism'] for p in json.loads(fit)['genome']}), flush=True)
    with ThreadPoolExecutor(max_workers=6) as executor:
        list(executor.map(cell, rows))
    for name in ['Im_v2', 'Kd', 'Kv2like', 'K_T']:
        download(f'assets/modfiles/{name}.mod', ROOT / f'scripts/cortex-active-mechanisms/{name}.mod')

if __name__ == '__main__':
    main()
