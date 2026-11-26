import os,json
from playwright.sync_api import sync_playwright
u=os.getenv('BTS_ORIGIN','http://127.0.0.1:4422').rstrip('/')
with sync_playwright() as p:
 proxy={'server':os.environ['BTS_BROWSER_PROXY']} if os.getenv('BTS_BROWSER_PROXY') else None
 b=p.chromium.launch(proxy=proxy,executable_path=os.getenv('BTS_CHROME') or None,headless=True,args=['--no-sandbox','--enable-unsafe-swiftshader','--use-gl=angle','--use-angle=swiftshader'])
 x=b.new_page(viewport={'width':1380,'height':945});x.goto(u+'/simulations/equipment/08-02/',wait_until='domcontentloaded');x.locator('a[href="/simulations/equipment/08-02/simulator/"]').click()
 x.locator('#bond-asset').filter(has_text='3D asset loaded').wait_for(timeout=90000);x.locator('[data-view=work]').click()
 x.locator('#bond-run').click();assert 'Collision · -12.3 µm' in x.locator('#bond-result').inner_text()
 x.locator('#bond-apex').click();x.locator('#bond-run').click();assert 'Clearance pass · 26.1 µm' in x.locator('#bond-result').inner_text()
 with x.expect_download() as d:x.locator('#bond-json').click()
 q=json.loads(d.value.path().read_text());assert abs(q['gapUm']-26.1)<1e-9 and q['connectivity']['idealEligible']
 x.locator('#bond-seat').click();x.locator('#bond-run').click();assert 'Seat the package' in x.locator('#bond-status').inner_text()
 x.set_viewport_size({'width':390,'height':838});x.locator('#bond-reset').click();x.locator('#bond-run').click();assert 'Collision' in x.locator('#bond-result').inner_text()
 print(json.dumps({'origin':u,'glb':'decoded','clearance':'−12.3 µm collision / +26.1 µm clear','failure':'package lifted','json':'download parsed','mobile':390,'headset':'untested'}));b.close()
