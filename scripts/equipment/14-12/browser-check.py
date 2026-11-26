import os,json
from playwright.sync_api import sync_playwright
u=os.getenv('BTS_ORIGIN','http://127.0.0.1:4414').rstrip('/')
with sync_playwright() as p:
 proxy={'server':os.environ['BTS_BROWSER_PROXY']} if os.getenv('BTS_BROWSER_PROXY') else None
 b=p.chromium.launch(proxy=proxy,executable_path=os.getenv('BTS_CHROME') or None,headless=True,args=['--no-sandbox','--enable-unsafe-swiftshader','--use-gl=angle','--use-angle=swiftshader'])
 x=b.new_page(viewport={'width':1380,'height':945});x.goto(u+'/simulations/equipment/14-12/',wait_until='domcontentloaded');x.locator('a[href="/simulations/equipment/14-12/simulator/"]').click()
 x.locator('#env-asset').filter(has_text='3D asset loaded').wait_for(timeout=90000)
 x.locator('#env-run').click();assert '32.64241 °C' in x.locator('#env-result').inner_text()
 with x.expect_download() as d:x.locator('#env-json').click()
 assert abs(json.loads(d.value.path().read_text())['oneTau']['fraction']-.6321205588285577)<1e-10
 x.locator('[data-view=front]').click();c=x.locator('#env-model');c.scroll_into_view_if_needed();q=c.bounding_box();x.mouse.click(q['x']+q['width']/2,q['y']+q['height']/2)
 assert x.locator('#env-door').inner_text()=='Close door';x.locator('#env-run').click();assert 'DOOR_OPEN' in x.locator('#env-status').inner_text()
 x.locator('#env-door').click();x.locator('[name=stepC]').fill('90');x.locator('#env-run').click();assert 'OUTSIDE_PROFILE' in x.locator('#env-status').inner_text()
 x.set_viewport_size({'width':390,'height':838});x.locator('#env-reset').click();x.locator('#env-run').click();assert '63.21206%' in x.locator('#env-result').inner_text()
 print(json.dumps({'origin':u,'glb':'decoded and door clicked','sample':'32.64241 C at 120 s','profile':'out-of-profile rejected','download':'JSON validated','mobile':390,'headset':'untested'}));b.close()
