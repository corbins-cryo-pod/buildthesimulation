"""Exercise the actual component UI and worker; never inject application results."""
from pathlib import Path
import json,time,platform
from playwright.sync_api import sync_playwright
ROOT=Path(__file__).resolve().parents[1];PUBLIC=ROOT/'overlay/public/simulations/biohybrid-axon-interface/stage2'
checks=[];errors=[]
def check(name,ok,detail=None):
    checks.append({'name':name,'passed':bool(ok),'detail':detail})
    if not ok:raise AssertionError(name+': '+str(detail))
with sync_playwright() as p:
    browser=p.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox'])
    ctx=browser.new_context(viewport={'width':1360,'height':1020},accept_downloads=True)
    page=ctx.new_page();page.on('pageerror',lambda e:errors.append(str(e)))
    page.set_content((ROOT/'biohybrid-stage2-preview.html').read_text())
    check('Self-contained component HTML loads with incomplete-stage boundary','STAGE 2 · COMPONENT PREVIEW' in page.inner_text('body'))
    def run():
        page.locator('#run').click();page.wait_for_function("document.getElementById('status').textContent.startsWith('Completed component')",timeout=90000)
        assert page.locator('#error').is_hidden()
    run()
    check('Synthetic matrix calculates two exclusive outputs and real rank3','1.922 bit' in page.inner_text('#result') and '2 / 256' in page.inner_text('#result'))
    page.locator('[data-pair="0,0"]').click();check('Pair inspection shows block classification','lost with block' in page.inner_text('#pair-detail'))
    page.locator('#pin').click();page.locator('#census').fill('128');check('Input edits preserve pinned completed settings',not page.locator('#dirty').is_hidden() and '256' in page.locator('#comparison pre').text_content())
    with page.expect_download() as event:page.locator('#json').click()
    download=event.value;download.save_as(ROOT/'reports/browser-matrix-export.json');x=json.loads((ROOT/'reports/browser-matrix-export.json').read_text())
    check('JSON keeps completed256 census despite edited128 input',x['result']['census']==256 and x['completeStage2'] is False)
    with page.expect_download() as event:page.locator('#csv').click()
    event.value.save_as(ROOT/'reports/browser-matrix-export.csv');check('CSV contains retained limits and metadata','retained_metadata_json' in (ROOT/'reports/browser-matrix-export.csv').read_text())
    page.locator('#matrix-input').fill('[[1,null]]');page.locator('#run').click();page.locator('#error').wait_for(state='visible');check('Malformed matrix rejected without replacing previous result','2 / 256' in page.inner_text('#result'))
    # Import a clearly synthetic contract fixture, not a claimed production neuronal experiment.
    fixture={'modelVersion':'synthetic-import-contract-fixture','settings':{'axonCount':2,'channelCount':1,'seed':11},'geometry':{'cells':[{'id':'test-A'},{'id':'test-B'}],'channels':[{'id':'test-C'}]},'matrices':{'assigned':[[True,False]],'localSilenced':[[False,False]],'wholeSilenced':[[False,False]]},'auditComplete':True,'auditValid':True,'identities':{'originalCensus':10},'metrics':{'originalHostY':0},'limitations':['Synthetic browser contract fixture; not a neural experiment.']}
    import_path=ROOT/'reports/import-contract-fixture.json';import_path.write_text(json.dumps(fixture))
    page.locator('#import-file').set_input_files(import_path);page.wait_for_function("document.querySelector('#stamp').textContent==='Imported · not rerun'",timeout=15000)
    check('Result import preserves names and unverified provenance','test-A' in page.inner_text('#result') and '1 / 10' in page.inner_text('#result'))
    page.locator('[data-tab="magnetic"]').click();run();check('Actual coil field worker completes with no neural recruitment claim','No firing threshold is reported.' in page.inner_text('#result'))
    page.locator('.observation-head').scroll_into_view_if_needed();page.screenshot(path=str(ROOT/'reports/browser-magnetic-desktop.png'),full_page=False)
    page.locator('[data-tab="opsin"]').click();run();check('Opsin clamp renders current, illumination and all four states',page.locator('#result svg').count()==3 and 'Action potentials' in page.inner_text('#result'))
    with page.expect_download() as event:page.locator('#json').click()
    event.value.save_as(ROOT/'reports/browser-opsin-export.json');assay=json.loads((ROOT/'reports/browser-opsin-export.json').read_text())
    check('Downloaded opsin result conserves state and reports unknown recruitment',assay['result']['diagnostics']['massError']<1e-10 and assay['result']['recruitment'] is None)
    page.locator('.observation-head').scroll_into_view_if_needed();page.screenshot(path=str(ROOT/'reports/browser-opsin-desktop.png'),full_page=False)
    page.locator('[data-tab="optical"]').click();run();check('Photon transport completes, withholding rare-event ratio','Unresolved' in page.inner_text('#result') and 'not infinite isolation' in page.inner_text('#result'))
    with page.expect_download() as event:page.locator('#json').click()
    event.value.save_as(ROOT/'reports/browser-optical-export.json');light=json.loads((ROOT/'reports/browser-optical-export.json').read_text())
    check('Photon export energy ledger and deterministic batch seeds present',light['result']['transport']['energyResidual']<1e-10 and len(light['result']['transport']['batchSeeds'])==8)
    prior=page.inner_text('#result');page.locator('#photons').select_option('64000');page.locator('#run').click();page.locator('#cancel').click();check('Cancellation retains completed result and enables restart',page.locator('#run').is_enabled() and page.inner_text('#result')==prior)
    page.locator('#cells').fill('16');page.locator('#run').click();page.locator('#error').wait_for(state='visible',timeout=10000);check('Over-budget input rejected rather than reduced','budget exceeded' in page.inner_text('#error') and page.inner_text('#result')==prior)
    page.locator('[data-tab="spectral"]').click();page.locator('#populations').select_option('4');run();check('Spectral examples state hypothetical scope and no channel-gain claim','not measured opsin spectra' in page.inner_text('#result') and 'quadrupling' in page.inner_text('#result'))
    page.set_viewport_size({'width':390,'height':844});page.locator('[data-tab="opsin"]').click();check('390px page has no horizontal document overflow',page.evaluate('document.documentElement.scrollWidth<=window.innerWidth'))
    page.locator('.observation-head').scroll_into_view_if_needed();page.screenshot(path=str(ROOT/'reports/browser-opsin-phone.png'),full_page=False)
    page.locator('#json').click();check('Phone retained result remains exportable',page.locator('#json').is_enabled())
    check('No uncaught page errors in self-contained bench',len(errors)==0,errors)
    # Test packaged offline artifact on file://, including its blob worker and internal methods.
    standalone=ctx.new_page();standalone.on('pageerror',lambda e:errors.append(str(e)));standalone.set_content((ROOT/'biohybrid-stage2-preview.html').read_text())
    standalone.locator('#run').click();standalone.wait_for_function("document.getElementById('status').textContent.startsWith('Completed component')",timeout=15000)
    check('Second clean page computes from self-contained source with blob worker','1.922 bit' in standalone.inner_text('#result'))
    with standalone.expect_popup() as event:standalone.locator('#open-methods').click()
    methods=event.value;methods.wait_for_load_state();check('Self-contained methods and question register open without network','Stage 2 scientific questions' in methods.inner_text('body') and 'Complete parameter register' in methods.inner_text('body'))
    check('No uncaught page errors in offline package',len(errors)==0,errors)
    browser.close()
report={'schema':'axon-stage2.browser-qa.v1','status':'pass','checks':checks,'passed':len(checks),'failed':0,'browser':'Chromium headless / self-contained HTML loaded via page.set_content on about:blank','completeStage2':False,'hostedDeploymentTested':False,'fileNavigationTested':False,'localHttpNavigationTested':False,'navigationLimit':'This browser rejected both localhost and file:// navigation with ERR_BLOCKED_BY_ADMINISTRATOR. No policies were changed. All checks execute the delivered HTML via in-memory document loading and its actual worker; no application results were injected.','fullAstroBuildTested':False,'scope':'Actual component controls, workers and exported files. Synthetic table/import fixtures are not neuronal results.'}
(ROOT/'reports/browser-qa.json').write_text(json.dumps(report,indent=2));print(f'{len(checks)} browser checks passed.')
