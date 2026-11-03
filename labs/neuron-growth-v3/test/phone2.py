import time
from playwright.sync_api import sync_playwright
S='/tmp/claude-0/-home-claude/851a9dde-cdc8-5a51-878e-ae5ccd715fd8/scratchpad/'
html=open('/home/claude/neurosim2/dist/neuron-engine-v2.html').read()
doc='<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><style>html,body{margin:0}[hidden]{display:none!important}</style></head><body>'+html+'</body></html>'
open(S+'page2.html','w').write(doc)
with sync_playwright() as p:
    b = p.chromium.launch(args=['--disable-gpu','--no-sandbox'])
    pg = b.new_page(viewport={'width':390,'height':844}, device_scale_factor=2)
    errs=[]; pg.on('pageerror', lambda e: errs.append(str(e)))
    pg.goto('file://'+S+'page2.html'); time.sleep(6)
    pg.screenshot(path=S+'p2_top.png', timeout=60000)
    sw = pg.evaluate("[document.documentElement.scrollWidth, document.documentElement.clientWidth]")
    pg.evaluate("window.scrollTo(0, 1250)"); time.sleep(1.2)
    pg.screenshot(path=S+'p2_mid.png', timeout=60000)
    print(sw, errs)
    b.close()
