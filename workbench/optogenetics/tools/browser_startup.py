#!/usr/bin/env python3
"""Verify the unmodified startup path, default experiment, and evidence panel."""
from pathlib import Path
from playwright.sync_api import sync_playwright
import json,shutil,time
ROOT=Path(__file__).resolve().parents[1]
errors=[];requests=[];checks=[];t=time.time()
def check(name,value,detail=None):
    checks.append({'name':name,'passed':bool(value),'details':detail});print(name,value,flush=True);assert value,name
with sync_playwright() as p:
    browser=p.chromium.launch(executable_path=shutil.which('chromium') or '/usr/bin/chromium',headless=True,args=['--no-sandbox','--disable-dev-shm-usage'])
    page=browser.new_page(viewport={'width':1440,'height':1100})
    page.on('pageerror',lambda e:errors.append(str(e)));page.on('request',lambda r:requests.append(r.url))
    page.set_content((ROOT/'optogenetics-laboratory.html').read_text())
    page.wait_for_function('window.OptoLab && !OptoLab.isBusy() && !!OptoLab.getResult()',timeout=35000)
    check('Unmodified startup autocalculates',page.evaluate('OptoLab.getResult().frames===1001&&OptoLab.getConfig().dtMs===.005'))
    check('Default browser train has three exactly-one events',page.evaluate('OptoLab.getResult().spikes.length===3 && OptoLab.getResult().pulseMetrics.exactlyOnePulses===3 && OptoLab.getResult().pulseMetrics.extraEvents===0'))
    page.screenshot(path=str(ROOT/'previews/default-train.png'),full_page=True)
    page.click('#tab-evidence')
    check('Current validation ledger embedded', '46/46 Node' in page.locator('#validation-summary').inner_text() and '0.220 ms' in page.locator('#validation-summary').inner_text())
    page.screenshot(path=str(ROOT/'previews/model-evidence.png'),full_page=True)
    check('No uncaught startup exceptions',not errors,errors)
    external=[x for x in requests if x.startswith(('http:','https:'))]
    check('No startup HTTP(S) requests',not external,external)
    report={'part':'startup','browser':browser.version,'execution':'Playwright set_content; unmodified autostart and inline Blob worker','passed':len(checks),'failed':0,'checks':checks,'elapsedSeconds':time.time()-t}
    (ROOT/'validation/browser-startup.json').write_text(json.dumps(report,indent=2))
    browser.close()
