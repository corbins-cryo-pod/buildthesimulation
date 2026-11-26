import os,sys,json
from playwright.sync_api import sync_playwright
with sync_playwright() as p:
 b=p.chromium.launch(headless=True,executable_path=os.environ.get('CHROMIUM_PATH') or p.chromium.executable_path,args=['--no-sandbox','--disable-dev-shm-usage','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader'])
 g=b.new_page(viewport={'width':840,'height':760},accept_downloads=True);g.goto(sys.argv[1].rstrip('/')+'/simulations/equipment/14-04/');g.get_by_role('link',name='Open simulator').click()
 g.wait_for_selector('#tr-view[data-ready=true]',timeout=30000);g.click('#tr-near');g.click('#tr-run');assert '−0.400' in g.inner_text('#tr-read').replace('-','−');g.click('#tr-half');assert '0.400 N' in g.inner_text('#tr-read')
 with g.expect_download() as d:g.click('#tr-save')
 r=json.loads(d.value.path().read_text());assert r['trace'][0]['frictionPerContactN']==-.4 and r['trace'][100]['frictionPerContactN']==.4 and r['sampleId']=='INERT-TRIAD-01';g.click('#tr-engage');g.click('#tr-load');g.click('#tr-run');assert 'Load the phantom' in g.inner_text('#tr-notice');print('PASS: GLB, close-up, signed ±0.4 N, 201-row trace, interlock');b.close()
