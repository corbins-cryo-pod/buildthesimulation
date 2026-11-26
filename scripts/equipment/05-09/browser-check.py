"""Desktop/mobile 05-09 QA; supports remote Cloudflare origin and managed HTTPS proxy."""
import os, json
from playwright.sync_api import sync_playwright
root=os.environ.get('BTS_ORIGIN','http://127.0.0.1:4399').rstrip('/')
with sync_playwright() as p:
 proxy={'server':os.environ['BTS_BROWSER_PROXY']} if os.getenv('BTS_BROWSER_PROXY') else None
 b=p.chromium.launch(proxy=proxy,executable_path=os.getenv('BTS_CHROME') or None,headless=True,args=['--no-sandbox','--enable-unsafe-swiftshader','--use-gl=angle','--use-angle=swiftshader','--disable-dev-shm-usage'])
 pg=b.new_page(viewport={'width':1370,'height':980});errors=[];pg.on('pageerror',lambda e:errors.append(str(e)))
 pg.goto(root+'/simulations/equipment/05-09/',wait_until='domcontentloaded')
 pg.locator('a[href="/simulations/equipment/05-09/simulator/"]').click()
 pg.locator('#xps-asset').filter(has_text='3D asset loaded').wait_for(timeout=90000)
 pg.locator('#xps-run').click();assert 'Au 50% / Ag 50%' in pg.locator('#xps-result').inner_text()
 pg.locator('[name=rsfAu]').fill('2');pg.locator('#xps-run').click();assert 'Au 33.333% / Ag 66.667%' in pg.locator('#xps-result').inner_text()
 pg.locator('[name=axis]').select_option('raw');pg.locator('#xps-run').click();assert '368.6941' in pg.locator('#xps-rows').inner_text()
 with pg.expect_download() as d:pg.locator('#xps-json').click()
 data=json.loads(d.value.path().read_text());assert data['kind']=='simulated' and data['calibration']['mode']=='raw' and len(data['windows'])==2
 with pg.expect_download() as d:pg.locator('#xps-csv').click()
 assert len(d.value.path().read_text().splitlines())==483
 pg.locator('#xps-transfer').click();pg.locator('#xps-run').click();assert 'Move the coupon to the analysis position first.' in pg.locator('#xps-status').inner_text()
 pg.locator('[data-view=work]').click();c=pg.locator('#xps-model');c.scroll_into_view_if_needed();q=c.bounding_box();pg.mouse.click(q['x']+q['width']/2,q['y']+q['height']/2)
 assert pg.locator('#xps-door').inner_text()=='Close intro cover','direct 3D cover click failed'
 pg.locator('#xps-transfer').click();assert 'Close the virtual intro cover before transfer.' in pg.locator('#xps-status').inner_text()
 pg.locator('#xps-load').click();pg.locator('#xps-door').click();pg.locator('#xps-transfer').click();pg.locator('#xps-run').click();assert 'No coupon loaded.' in pg.locator('#xps-status').inner_text()
 pg.set_viewport_size({'width':390,'height':844});pg.locator('#xps-reset').click();pg.locator('#xps-run').click();assert 'Au 50% / Ag 50%' in pg.locator('#xps-result').inner_text()
 assert c.evaluate('(n)=>n.getBoundingClientRect().width<=innerWidth') and not errors,errors
 print(json.dumps({'origin':root,'model':'GLB and direct 3D cover clicked','fit':'50:50, raw axis, RSF changes','downloads':['CSV','JSON'],'failureStates':True,'mobile':'390 px','headset':'not verified'},indent=2));b.close()
