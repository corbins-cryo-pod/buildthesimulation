import sys, time, json
from playwright.sync_api import sync_playwright
S='/tmp/claude-0/-home-claude/851a9dde-cdc8-5a51-878e-ae5ccd715fd8/scratchpad/'
html=open('/home/claude/neurosim3/dist/neuron-engine-v3.html').read()
doc='<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><style>html,body{margin:0}[hidden]{display:none!important}</style></head><body>'+html+'</body></html>'
open(S+'page3.html','w').write(doc)
jobs = json.loads(sys.argv[1]); W = int(sys.argv[2]) if len(sys.argv)>2 else 1400; H = int(sys.argv[3]) if len(sys.argv)>3 else 860
with sync_playwright() as p:
    b = p.chromium.launch(args=['--disable-gpu','--no-sandbox'])
    pg = b.new_page(viewport={'width':W,'height':H})
    errs=[]; pg.on('console', lambda m: errs.append(m.type+': '+m.text) if m.type in ('error','warning') else None); pg.on('pageerror', lambda e: errs.append('PAGEERR '+str(e)))
    pg.goto('file://'+S+'page3.html'); time.sleep(2.5)
    for j in jobs:
        if j.get('preset'): pg.evaluate(f"neuronApp.load('{j['preset']}')"); time.sleep(1.5)
        if j.get('js'): pg.evaluate(j['js'])
        time.sleep(j.get('wait',2))
        if j.get('after'): pg.evaluate(j['after']); time.sleep(0.6)
        clip = None if j.get('full') else {'x':16,'y':14,'width':W-16-364-14-16+0,'height':H-28}
        pg.screenshot(path=S+j['out'], clip=clip, timeout=60000)
        print(j['out'], pg.evaluate("document.getElementById('perf').textContent+' | '+document.getElementById('clock').textContent"))
    print('\n'.join(e for e in errs if 'ERR_TUNNEL' not in e and 'fonts' not in e)[:3000])
    b.close()
