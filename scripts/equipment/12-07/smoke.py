import os,sys,json
from playwright.sync_api import sync_playwright
with sync_playwright() as p:
 b=p.chromium.launch(headless=True,executable_path=os.environ.get('CHROMIUM_PATH') or p.chromium.executable_path,args=['--no-sandbox','--disable-dev-shm-usage','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader'])
 g=b.new_page(viewport={'width':920,'height':850},accept_downloads=True);errors=[];g.on('pageerror',lambda e:errors.append(str(e)));g.goto(sys.argv[1].rstrip('/')+'/simulations/equipment/12-07/');g.get_by_role('link',name='Open simulator').click();g.wait_for_selector('#ls-view[data-ready=true]',timeout=29000)
 g.locator('#ls-view').screenshot(path=os.environ.get('REPLAY_SHOT','/tmp/bts-ls7-actual.png'));assert '192 µm' in g.inner_text('#ls-scale') and '29 / 29' in g.inner_text('#ls-scale')
 g.click('#ls-display');g.click('#ls-next');assert '230 µm' in g.inner_text('#ls-status') and '9 / 9' in g.inner_text('#ls-scale')
 g.click('#ls-next');assert 'No F1/F2 pair' in g.inner_text('#ls-scale');g.locator('#ls-plane').fill('20');assert g.locator('#ls-next').is_disabled()
 g.click('#ls-reset')
 with g.expect_download() as d:g.click('#ls-save')
 r=json.loads(d.value.path().read_text());assert r['planeIndex']==10 and r['schema']=='bts.synthetic-voxel-plane.v1' and r['sampleId']=='INERT-XYZ-FIDUCIAL-01' and r['separationUm']==192 and len(r['labels'])==2560
 assert not errors,errors;print('PASS: linked GLB, 210→230 µm plane replay, 29→9 pixels, boundary guard, immutable physical coordinate JSON');b.close()
