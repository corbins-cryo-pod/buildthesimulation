import os,sys,json
from playwright.sync_api import sync_playwright
with sync_playwright() as p:
 b=p.chromium.launch(headless=True,executable_path=os.environ.get('CHROMIUM_PATH') or p.chromium.executable_path,args=['--no-sandbox','--disable-dev-shm-usage','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader'])
 g=b.new_page(viewport={'width':930,'height':850},accept_downloads=True);errors=[];g.on('pageerror',lambda e:errors.append(str(e)));g.goto(sys.argv[1].rstrip('/')+'/simulations/equipment/13-02/');g.get_by_role('link',name='Open simulator').click();g.wait_for_selector('#cb-view[data-ready=true]',timeout=27000)
 g.locator('#cb-view').screenshot(path=os.environ.get('CROSSBEAM_SHOT','/tmp/bts-cross550-actual.png'));assert '9,600 µm²' in g.inner_text('#cb-result')
 g.click('#cb-panel');g.click('#cb-void');assert '24 µm across · 4.712%' in g.inner_text('#cb-result')
 g.click('#cb-diagonal');assert '100 µm' in g.inner_text('#cb-result') and '80 µm' in g.inner_text('#cb-result')
 with g.expect_download() as d:g.click('#cb-save')
 r=json.loads(d.value.path().read_text());assert r['sampleId']=='DRY-SECTION-LOCK-01' and r['selected']=='diagonal' and r['diagonal']['lengthUm']==100 and r['revision']==1
 assert not errors,errors;print('PASS: linked metric exterior, locked 24 µm void, 100 µm chord, unchanged diagram identity, JSON export');b.close()
