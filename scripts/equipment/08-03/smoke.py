import os,sys,json
from playwright.sync_api import sync_playwright
with sync_playwright() as p:
 b=p.chromium.launch(headless=True,executable_path=os.environ.get('CHROMIUM_PATH') or p.chromium.executable_path,args=['--no-sandbox','--disable-dev-shm-usage','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader'])
 g=b.new_page(viewport={'width':820,'height':760},accept_downloads=True);errors=[];g.on('pageerror',lambda e:errors.append(str(e)));g.goto(sys.argv[1].rstrip('/')+'/simulations/equipment/08-03/');g.get_by_role('link',name='Open simulator').click()
 g.wait_for_selector('#bw-view[data-ready=true]',timeout=30000);g.click('#bw-run');assert '1 accepted · 1 rejected' in g.inner_text('#bw-result');assert 'keep-out FRAME_TAB' in g.inner_text('#bw-rows');g.click('#bw-coupon')
 with g.expect_download() as d:g.click('#bw-save')
 r=json.loads(d.value.path().read_text());assert len(r['netEdges'])==1 and r['netEdges'][0]['wire']=='W1';g.click('#bw-raise');g.click('#bw-run');assert '2 accepted · 0 rejected' in g.inner_text('#bw-result')
 g.click('#bw-seat');g.click('#bw-run');assert 'Seat the specimen' in g.inner_text('#bw-status');assert not errors,errors;print('PASS: GLB, W2 fixture rejection, 1-edge JSON, geometric clearance at 500 µm, specimen gate');b.close()
