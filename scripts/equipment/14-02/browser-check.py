import os,json
from playwright.sync_api import sync_playwright
u=os.getenv('BTS_ORIGIN','http://127.0.0.1:4414').rstrip('/')
with sync_playwright() as p:
 proxy={'server':os.environ['BTS_BROWSER_PROXY']} if os.getenv('BTS_BROWSER_PROXY') else None
 b=p.chromium.launch(proxy=proxy,executable_path=os.getenv('BTS_CHROME') or None,headless=True,args=['--no-sandbox','--enable-unsafe-swiftshader','--use-gl=angle','--use-angle=swiftshader'])
 x=b.new_page(viewport={'width':1380,'height':945})
 x.goto(u+'/simulations/equipment/14-02/',wait_until='domcontentloaded');x.locator('a[href="/simulations/equipment/14-02/simulator/"]').click()
 x.locator('#flex-view-status').filter(has_text='3D asset loaded').wait_for(timeout=90000)
 x.locator('[data-view=fixture]').click();x.locator('#flex-run').click()
 assert 'Last force 6 N' in x.locator('#flex-result').inner_text()
 x.locator('#flex-span').click();x.locator('#flex-tare').click();x.locator('#flex-run').click()
 assert 'Last force 0.75 N' in x.locator('#flex-result').inner_text()
 with x.expect_download() as d:x.locator('#flex-json').click()
 j=json.loads(d.value.path().read_text());assert j['fixture']['spanM']==.08 and j['points'][-1]['forceN']==.75
 x.locator('[name=spanMm]').fill('0');x.locator('#flex-run').click()
 assert 'Support span must be positive' in x.locator('#flex-status').inner_text()
 x.set_viewport_size({'width':390,'height':836});x.locator('#flex-reset').click();x.locator('#flex-run').click()
 assert '15 N/mm' in x.locator('#flex-result').inner_text()
 print(json.dumps({'origin':u,'glb':'decoded and rendered','force':'6 N then 0.75 N','failure':'zero span rejected','file':'JSON parsed','mobile':390,'headset':'untested'}));b.close()
