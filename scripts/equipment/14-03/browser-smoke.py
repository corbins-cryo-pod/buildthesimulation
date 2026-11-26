import json,os,pathlib
from playwright.sync_api import expect,sync_playwright
base=os.environ.get('BTS_SITE','http://127.0.0.1:4143').rstrip('/')
with sync_playwright() as p:
 b=p.chromium.launch(headless=True,executable_path=os.environ.get('CHROMIUM',p.chromium.executable_path),args=['--no-sandbox','--use-angle=swiftshader','--enable-unsafe-swiftshader','--disable-dev-shm-usage'])
 page=b.new_page(viewport={'width':1180,'height':900},accept_downloads=True)
 errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
 page.goto(base+'/simulations/equipment/14-03/',wait_until='domcontentloaded')
 page.get_by_role('link',name='Open simulator →').first.click()
 q=lambda i:page.locator('#dhr-'+i)
 expect(q('model')).to_have_attribute('data-loaded','true',timeout=30000)
 expect(q('fit')).to_contain_text('2 Pa·s')
 assert q('rows').locator('tr').nth(1).locator('td').all_text_contents()[:4]==['1','0','12.5664','90']
 q('head').click();q('run').click();expect(q('status')).to_contain_text('lower the parallel plate')
 q('maxwell').click();q('head').click();q('run').click()
 expect(q('sample')).to_contain_text('Maxwell')
 with page.expect_download() as d:q('json').click()
 out=json.loads(pathlib.Path(d.value.path()).read_text())
 assert out['schema']=='bts.rheology-sweep.v1' and out['geometry']['diameterMm']==40 and out['points'][1]['storagePa']>0
 assert not errors,errors
 print('Loaded GLB, fixture interlock, Newtonian/Maxwell outputs and JSON verified')
 b.close()
