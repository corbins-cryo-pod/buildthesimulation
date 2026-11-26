import json,os,pathlib
from playwright.sync_api import expect,sync_playwright
base=os.environ.get('BTS_SITE','http://127.0.0.1:4085').rstrip('/')
with sync_playwright() as p:
 b=p.chromium.launch(headless=True,executable_path=os.environ.get('CHROMIUM',p.chromium.executable_path),args=['--no-sandbox','--use-angle=swiftshader','--enable-unsafe-swiftshader','--disable-dev-shm-usage'])
 page=b.new_page(viewport={'width':1240,'height':900},accept_downloads=True)
 errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
 page.goto(base+'/simulations/equipment/08-05/',wait_until='domcontentloaded')
 page.get_by_role('link',name='Open simulator →').first.click();q=lambda n:page.locator('#fl-'+n)
 expect(q('model')).to_have_attribute('data-loaded','true',timeout=30000)
 expect(q('result')).to_contain_text('Pose: 29.43%')
 q('dx').fill('5');q('dx').press('Tab');q('sweep').click();expect(q('result')).to_contain_text('Pose: 29.43%')
 q('center').click();q('sweep').click();expect(q('result')).to_contain_text('Pose: 80%');expect(q('pads')).to_contain_text('100%')
 q('cover').click();q('sweep').click();expect(q('status')).to_contain_text('close the guard')
 q('cover').click();q('sweep').click()
 with page.expect_download() as d:q('json').click()
 o=json.loads(pathlib.Path(d.value.path()).read_text())
 assert o['schema']=='bts.fl300-alignment.v1' and o['pose']['powerFraction']==.8
 assert not errors,errors
 print('Loaded FL300, symmetric poses, guard interlock, registered axes and JSON verified')
 b.close()
