"""Quick browser check for 14-01: GLB, virtual tensile run, range guard, result download."""
import os,json
from playwright.sync_api import sync_playwright
base=os.getenv('BTS_ORIGIN','http://127.0.0.1:4414').rstrip('/')
with sync_playwright() as p:
 proxy={'server':os.environ['BTS_BROWSER_PROXY']} if os.getenv('BTS_BROWSER_PROXY') else None
 b=p.chromium.launch(proxy=proxy,executable_path=os.getenv('BTS_CHROME') or None,headless=True,args=['--no-sandbox','--enable-unsafe-swiftshader','--use-gl=angle','--use-angle=swiftshader'])
 q=b.new_page(viewport={'width':1390,'height':960});e=[];q.on('pageerror',lambda a:e.append(str(a)))
 q.goto(base+'/simulations/equipment/14-01/',wait_until='domcontentloaded');q.locator('a[href="/simulations/equipment/14-01/simulator/"]').click()
 q.locator('#t-asset').filter(has_text='3D asset loaded').wait_for(timeout=90000)
 q.locator('[data-view=grips]').click();q.locator('#t-run').click()
 assert 'Last force 40 N' in q.locator('#t-result').inner_text() and '400 N/mm' in q.locator('#t-result').inner_text()
 q.locator('[name=cellN]').select_option('50');q.locator('[name=strokeMm]').fill('0.2');q.locator('#t-run').click()
 assert 'Last force withheld' in q.locator('#t-result').inner_text()
 with q.expect_download() as d:q.locator('#t-json').click()
 out=json.loads(d.value.path().read_text());assert out['points'][-1]['overRange'] and out['points'][-1]['idealForceN']==80
 q.locator('#t-upper').click();q.locator('#t-run').click();assert 'Close both virtual grips' in q.locator('#t-status').inner_text()
 q.set_viewport_size({'width':390,'height':844});q.locator('#t-reset').click();q.locator('#t-run').click();assert 'Last force 40 N' in q.locator('#t-result').inner_text() and not e,e
 print(json.dumps({'origin':base,'result':'40 N at 0.1 mm; overrange at 80 N demand/50 N cell','glb':'rendered; grip view','mobile':'390 px','exports':'JSON OK','headset':'not tested'}));b.close()
