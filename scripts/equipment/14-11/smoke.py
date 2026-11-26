import os,sys,json
from playwright.sync_api import sync_playwright
with sync_playwright() as p:
 b=p.chromium.launch(headless=True,executable_path=os.environ.get('CHROMIUM_PATH') or p.chromium.executable_path,args=['--no-sandbox','--disable-dev-shm-usage','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader'])
 g=b.new_page(viewport={'width':800,'height':760},accept_downloads=True);g.goto(sys.argv[1].rstrip('/')+'/simulations/equipment/14-11/');g.get_by_role('link',name='Open simulator').click()
 g.wait_for_selector('#sw-view[data-ready=true]',timeout=30000);g.click('#sw-run');assert '+10.00%' in g.inner_text('#sw-result')
 with g.expect_download() as d:g.click('#sw-export')
 r=json.loads(d.value.path().read_text());assert r['packageId']=='PKG-B' and len(r['conditionHistory'])==4 and abs(r['selected']['deltaMagnitudePercent']-10)<1e-9
 g.select_option('#sw-bath','0');g.click('#sw-run');assert 'PKG-A · +0.00%' in g.inner_text('#sw-result');g.click('#sw-near');g.click('#sw-run');assert 'Close' in g.inner_text('#sw-status')
 g.click('#sw-reset');g.get_by_text('Replay a simulated 09-01 spectrum',exact=True).click();g.click('#sw-fixture');g.locator('#sw-replayState').filter(has_text='baseline').wait_for();g.click('#sw-run');assert 'baseline only' in g.inner_text('#sw-result');print('PASS: GLB, B-only drift, A control, JSON export, blocked open cover, original 09-01 EIS baseline');b.close()
