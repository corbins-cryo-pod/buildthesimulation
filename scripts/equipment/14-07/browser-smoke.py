import json,os,pathlib
from playwright.sync_api import expect,sync_playwright
base=os.environ.get('BTS_SITE','http://127.0.0.1:4147').rstrip('/')
with sync_playwright() as p:
 b=p.chromium.launch(headless=True,executable_path=os.environ.get('CHROMIUM',p.chromium.executable_path),args=['--no-sandbox','--use-angle=swiftshader','--enable-unsafe-swiftshader','--disable-dev-shm-usage'])
 page=b.new_page(viewport={'width':1250,'height':900},accept_downloads=True)
 errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
 page.goto(base+'/simulations/equipment/14-07/',wait_until='domcontentloaded')
 page.get_by_role('link',name='Open simulator →').first.click()
 q=lambda n:page.locator('#q50-'+n)
 expect(q('model')).to_have_attribute('data-loaded','true',timeout=30000)
 expect(q('result')).to_contain_text('10 mg → 8 mg · 80%')
 q('net').click();q('replay').click();expect(q('result')).to_contain_text('80%')
 expect(q('applied')).to_contain_text('0 mg')
 q('drift').click();q('blank').uncheck();q('replay').click();expect(q('result')).to_contain_text('82%')
 q('blank').check();q('replay').click();expect(q('result')).to_contain_text('80%')
 q('chamber').click();q('load').click();q('tare').click();expect(q('tare-info')).to_contain_text('2 mg')
 q('load').click();q('chamber').click();q('replay').click();expect(q('result')).to_contain_text('80%')
 with page.expect_download() as d:q('json').click()
 out=json.loads(pathlib.Path(d.value.path()).read_text());assert out['schema']=='bts.tga-replay.v1' and out['terminalPercent']==80
 assert not errors,errors
 print('Loaded GLB, gross/net, blank correction, retare and export verified.')
 b.close()
