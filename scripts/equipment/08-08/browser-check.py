import os,json
from playwright.sync_api import sync_playwright
u=os.getenv('BTS_ORIGIN','http://127.0.0.1:4428').rstrip('/')
with sync_playwright() as p:
 proxy={'server':os.environ['BTS_BROWSER_PROXY']} if os.getenv('BTS_BROWSER_PROXY') else None
 b=p.chromium.launch(proxy=proxy,executable_path=os.getenv('BTS_CHROME') or None,headless=True,args=['--no-sandbox','--enable-unsafe-swiftshader','--use-gl=angle','--use-angle=swiftshader'])
 x=b.new_page(viewport={'width':1380,'height':945});x.goto(u+'/simulations/equipment/08-08/',wait_until='domcontentloaded');x.locator('a[href="/simulations/equipment/08-08/simulator/"]').click()
 x.locator('#seam-asset').filter(has_text='3D asset loaded').wait_for(timeout=90000);x.locator('[data-view=fixture]').click()
 x.locator('#seam-run').click();assert '100% registered' in x.locator('#seam-result').inner_text()
 x.locator('#seam-missing').click();x.locator('#seam-run').click();assert '81.25% registered' in x.locator('#seam-result').inner_text()
 with x.expect_download() as d:x.locator('#seam-json').click()
 q=json.loads(d.value.path().read_text());assert q['coveredMm']==52 and q['leakTest']['measuredRate'] is None
 x.locator('#seam-door').click();x.locator('#seam-seat').click();x.locator('#seam-run').click();assert 'Seat the virtual package' in x.locator('#seam-status').inner_text()
 x.set_viewport_size({'width':390,'height':838});x.locator('#seam-reset').click();x.locator('#seam-run').click();assert '100% registered' in x.locator('#seam-result').inner_text()
 print(json.dumps({'origin':u,'model':'decoded','coverage':'100% / 81.25%','leak':'unknown','failure':'fixture removed','json':'parsed','mobile':390,'headset':'untested'}));b.close()
