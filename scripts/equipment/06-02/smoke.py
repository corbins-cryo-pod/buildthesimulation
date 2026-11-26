import os,sys,json
from playwright.sync_api import sync_playwright
with sync_playwright() as p:
 b=p.chromium.launch(headless=True,executable_path=os.environ.get('CHROMIUM_PATH') or p.chromium.executable_path,args=['--no-sandbox','--disable-dev-shm-usage','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader'])
 g=b.new_page(viewport={'width':930,'height':850},accept_downloads=True);errors=[];g.on('pageerror',lambda e:errors.append(str(e)));g.goto(sys.argv[1].rstrip('/')+'/simulations/equipment/06-02/');g.get_by_role('link',name='Open simulator').click();g.wait_for_selector('#bx-view[data-ready=true]',timeout=25000)
 g.locator('#bx-view').screenshot(path=os.environ.get('BX_SHOT','/tmp/bts-biox6-actual.png'));assert 'x = -8 mm' in g.inner_text('#bx-result')
 g.click('#bx-ruler');g.click('#bx-R');assert 'x = 10 mm' in g.inner_text('#bx-result') and '18 mm' in g.inner_text('#bx-result')
 with g.expect_download() as d:g.click('#bx-save')
 r=json.loads(d.value.path().read_text());assert r['sampleId']=='BTS-GENERIC-SIGNED-RULER-01' and r['selected']=='R' and r['revision']==1 and r['coordinateMm']==10
 assert not errors,errors;print('PASS: documentary enclosure, separate negative/positive printed-coordinate cases and immutable export');b.close()
