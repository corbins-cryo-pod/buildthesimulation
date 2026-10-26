#!/usr/bin/env python3
"""Exercise the standalone HTML in real Chromium, without network resources.

Uses set_content because direct file/http navigation is administratively blocked
in the review environment. Does not disable browser security policies.
Requires playwright and a system Chromium; no Playwright browser download needed.
"""
from pathlib import Path
from playwright.sync_api import sync_playwright
import argparse, csv, io, json, time, shutil
ROOT=Path(__file__).resolve().parents[1]
parser=argparse.ArgumentParser();parser.add_argument('--part',choices=['core','map','mobile'],default='core');args=parser.parse_args()
checks=[];errors=[];requests=[];started=time.time()
def check(name, ok, details=None):
    checks.append({'name':name,'passed':bool(ok),'details':details});print(name,':',ok,flush=True)
    assert ok,name
with sync_playwright() as p:
    browser=p.chromium.launch(executable_path=shutil.which('chromium') or '/usr/bin/chromium',headless=True,args=['--no-sandbox','--disable-dev-shm-usage'])
    context=browser.new_context(viewport={'width':1440,'height':1100},accept_downloads=True)
    page=context.new_page();page.on('pageerror',lambda err:errors.append(str(err)))
    page.on('request',lambda req:requests.append(req.url))
    page.evaluate('window.OPTO_REVIEW_OPTIONS={disableAutoRun:true}')
    page.set_content((ROOT/'optogenetics-laboratory.html').read_text())
    page.wait_for_function('!!window.OptoLab')
    page.click('#tab-neuron')
    def cfg(changes):
        page.evaluate('(d)=>{const c=OptoLab.getConfig();OptoLab.setConfig({...c,...d,light:{...c.light,...(d.light||{})}})}',changes)
    def run():
        page.click('#run');page.wait_for_function('!OptoLab.isBusy()',timeout=35000)
        assert page.evaluate('!!OptoLab.getResult()'),page.locator('#error').text_content()
    def download(selector):
        with page.expect_download() as capture:page.click(selector)
        d=capture.value
        return Path(d.path()).read_text()
    cfg({'protocol':'single','durationMs':80,'onsetMs':20,'pulseWidthMs':5,'dtMs':0.01})
    if args.part=='core':
        run()
        check('Single-pulse browser solve',page.evaluate('OptoLab.getResult().spikes.length===1'))
        check('211 membrane compartments and 75 junctions',page.evaluate('OptoLab.getResult().n===286 && OptoLab.getResult().nodes.filter(n=>n.areaUm2>0).length===211'))
        page.evaluate('OptoLab.setTime(22)')
        check('Replay light is on during pulse',page.locator('#local-light').inner_text().startswith('1.000'))
        page.evaluate('OptoLab.setTime(40)')
        check('Replay light is off after pulse',page.locator('#local-light').inner_text().startswith('0.000'))
        page.locator('#events-panel').evaluate('(e)=>e.open=true')
        check('Pulse event table from actual events',page.locator('#pulse-table-body tr').count()==1 and 'Exactly one' in page.locator('#pulse-table-body').inner_text())
        trace=download('#export-csv');rows=list(csv.DictReader(io.StringIO(trace)))
        check('CSV contains all saved frames',len(rows)==321 and len(json.loads(rows[0]['config_json']))>5)
        payload=json.loads(download('#export-result'))
        check('JSON retains compartment recordings',len(payload['voltageMv'])==payload['n']*payload['frames'] and payload['schema']=='opto-lab-result/1')
        check('Reported bytes equal typed recording arrays',page.evaluate('Object.values(OptoLab.getResult()).filter(ArrayBuffer.isView).reduce((s,a)=>s+a.byteLength,0)===OptoLab.getResult().diagnostics.outputBytes'))
        setup=download('#export-config');saved=json.loads(setup)
        check('Setup includes model provenance',saved['modelId']=='allen-human-571654895/1' and len(saved['sourceCommit'])==40)
        page.click('#pin');page.locator('#irradiance').evaluate('(el)=>{el.value=0;el.dispatchEvent(new Event("input",{bubbles:true}))}')
        check('Parameter edit clears stale pulse table',page.locator('#events-panel').is_hidden() and page.locator('#pulse-table-body tr').count()==0)
        check('Parameter edit clears stale recording, retains baseline',page.evaluate('OptoLab.getResult()===null') and page.locator('#baseline-key').is_visible() and page.locator('#export-csv').is_disabled())
        # A saved file must round-trip through the visible import handler.
        page.set_input_files('#import-file',{'name':'review-setup.json','mimeType':'application/json','buffer':setup.encode()})
        page.wait_for_function("document.querySelector('#run-status').textContent.startsWith('Setup loaded')")
        check('Setup JSON round trip',page.evaluate('OptoLab.getConfig()')==saved['config'])
        page.set_input_files('#import-file',{'name':'bad.json','mimeType':'application/json','buffer':b'{"schema":"unknown","config":{}}'})
        page.wait_for_function("!document.querySelector('#error').hidden")
        check('Invalid import rejected without replacing setup',page.evaluate('OptoLab.getConfig()')==saved['config'])
        # Cancellation starts a new worker, and a subsequent solve must still finish.
        page.click('#run');page.click('#cancel');page.wait_for_timeout(200)
        check('Cancel terminates calculation and leaves no stale result',not page.evaluate('OptoLab.isBusy()') and page.evaluate('OptoLab.getResult()===null'))
        run();check('Run works after cancellation',page.evaluate('OptoLab.getResult().spikes.length===1'))
        page.evaluate('OptoLab.setTime(26)');page.screenshot(path=str(ROOT/'previews/neuron-experiment.png'),full_page=True)
        # Target a real apical branch; only its anatomical section should express.
        apical=page.evaluate('OptoLab.getResult().nodes.findIndex(n=>n.areaUm2>0&&n.sectionType==="apic")')
        page.select_option('#compartment',str(apical));page.click('#express-selected')
        check('Section-specific expression picks actual section',page.evaluate('OptoLab.getConfig().expression==="section" && !!OptoLab.getConfig().expressionSectionId'))
        page.click('#aim-selected');page.click('#match-exposure')
        check('Fiber target and local-exposure matching',page.evaluate('OptoLab.getConfig().light.kind==="fiber"') and page.locator('#local-light').inner_text().startswith('1.000'),page.locator('#local-light').inner_text())
        page.screenshot(path=str(ROOT/'previews/fiber-targeting.png'),full_page=True)
        page.click('#tab-clamp');cfg({'mode':'clamp','protocol':'paired','durationMs':100,'onsetMs':20,'pulseWidthMs':10,'pairGapMs':20,'light':{'irradianceMwMm2':1},'expression':'all','expressionSectionId':None})
        run();page.evaluate('OptoLab.setTime(26)')
        check('Ideal channel assay stays at requested holding voltage',page.evaluate('OptoLab.getResult().voltageMv.every(v=>v===-60)'))
        check('State occupancy displayed',page.locator('#state-probabilities progress').count()==5)
        page.screenshot(path=str(ROOT/'previews/channel-assay.png'),full_page=True)
    elif args.part=='map':
        page.click('#tab-sweep');page.fill('#sweep-levels','0, 1');page.fill('#sweep-widths','1, 5');page.click('#run-sweep')
        page.wait_for_function('!OptoLab.isBusy()',timeout=35000)
        check('Four independent map trials completed',page.evaluate('OptoLab.getSweep().filter(Boolean).length===4'),page.locator('#sweep-status').inner_text())
        check('No-light map trials have no spikes',page.evaluate('OptoLab.getSweep().filter(r=>r.config.light.irradianceMwMm2===0).every(r=>r.spikes.length===0)'))
        check('Map retains actual recordings for every point',page.evaluate('OptoLab.getSweep().every(r=>r.voltageMv.length===r.n*r.frames)'))
        check('Completed cells are accessible buttons',page.locator('#response-map button:not([disabled])').count()==4)
        csv_rows=list(csv.DictReader(io.StringIO(download('#export-sweep'))))
        check('Map export contains one configuration per trial',len(csv_rows)==4 and all(json.loads(r['config_json'])['mode']=='neuron' for r in csv_rows))
        page.screenshot(path=str(ROOT/'previews/response-map.png'),full_page=True)
        expected=page.evaluate('OptoLab.getSweep()[3].spikes.map(s=>s.timeMs)')
        page.locator('#response-map button').nth(3).click()
        check('Selecting map cell opens that exact trace',page.locator('#experiment-panel').is_visible() and page.evaluate('OptoLab.getResult().spikes.map(s=>s.timeMs)')==expected)
        check('Map selection updates experiment controls',page.input_value('#source')=='uniform' and page.input_value('#protocol')=='single' and page.input_value('#width')=='5')
        page.click('#tab-sweep');page.fill('#sweep-levels','0,1,2,3,4');page.fill('#sweep-widths','1,2,3,4');page.click('#run-sweep')
        check('Overlarge maps rejected without starting computation',not page.evaluate('OptoLab.isBusy()') and '16 trials' in page.locator('#sweep-status').inner_text())
        page.fill('#sweep-levels','0, 1');page.fill('#sweep-widths','1, 5');page.click('#run-sweep')
        page.wait_for_function('OptoLab.getSweep().filter(Boolean).length>=1',timeout=12000);page.click('#cancel-sweep')
        check('Cancellation retains usable completed map cells',not page.evaluate('OptoLab.isBusy()') and page.locator('#response-map button:not([disabled])').count()>=1)
        page.locator('#response-map button:not([disabled])').first.click()
        check('Cancelled-map completed trace can be reopened',page.evaluate('!!OptoLab.getResult()') and page.locator('#experiment-panel').is_visible())
    elif args.part=='mobile':
        # A short ideal assay exercises mobile worker and display without a long run.
        page.set_viewport_size({'width':390,'height':844});page.click('#toggle-controls')
        check('Mobile controls disclose',page.locator('#experiment-controls').get_attribute('data-expanded')=='true')
        cfg({'mode':'clamp','protocol':'single','durationMs':80,'light':{'irradianceMwMm2':1}});run()
        page.click('#toggle-controls')
        page.evaluate('window.scrollTo(0,0)')
        check('Mobile viewport has no document horizontal overflow',page.evaluate('document.documentElement.scrollWidth<=window.innerWidth+1'),page.evaluate('({scroll:document.documentElement.scrollWidth,width:innerWidth})'))
        page.screenshot(path=str(ROOT/'previews/mobile-light.png'),full_page=True)
        page.click('#theme');check('Dark appearance toggles',page.evaluate('document.documentElement.dataset.theme==="dark"'))
        page.screenshot(path=str(ROOT/'previews/mobile-dark.png'),full_page=True)
        page.click('#tab-evidence');check('Evidence accessible on mobile',page.locator('#evidence-panel').is_visible())
        check('Evidence mobile no overflow',page.evaluate('document.documentElement.scrollWidth<=innerWidth+1'))
        page.click('#tab-sweep');page.fill('#sweep-levels','0,1');page.fill('#sweep-widths','1,5')
        check('Mobile map panel no document overflow',page.evaluate('document.documentElement.scrollWidth<=innerWidth+1'))
    check('No uncaught browser exceptions',not errors,errors)
    external=[r for r in requests if r.startswith(('http:','https:'))]
    check('No runtime network resource requests',not external,external)
    report={'part':args.part,'browser':browser.version,'execution':'Playwright set_content, inline Blob worker; direct file/http navigation not exercised in policy-restricted review container','passed':len(checks),'failed':0,'checks':checks,'elapsedSeconds':time.time()-started}
    (ROOT/f'validation/browser-{args.part}.json').write_text(json.dumps(report,indent=2))
    browser.close()
