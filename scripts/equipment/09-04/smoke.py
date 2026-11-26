"""Run with Playwright Chromium, optionally SCOPE_ORIGIN set to production, REF_IMAGES=1 for local authoring."""
import os,json,math
from pathlib import Path
from playwright.sync_api import sync_playwright
origin=os.getenv('SCOPE_ORIGIN','http://127.0.0.1:4304'); out=Path('public/equipment/09-04')
with sync_playwright() as p:
 opts=dict(headless=True,args=['--no-sandbox','--disable-dev-shm-usage','--use-angle=swiftshader','--enable-unsafe-swiftshader'])
 if os.environ.get('CHROME_BIN'):opts['executable_path']=os.environ['CHROME_BIN']
 b=p.chromium.launch(**opts);page=b.new_page(viewport={'width':1440,'height':1000},accept_downloads=True,device_scale_factor=1.2)
 errors=[];page.on('pageerror',lambda e:errors.append(str(e)));page.on('console',lambda m:print('browser',m.type,m.text[:200]) if m.type=='error' else None)
 page.goto(origin+'/simulations/equipment/09-04/',wait_until='domcontentloaded',timeout=90000)
 page.locator('a[href="/simulations/equipment/09-04/simulator/"]').first.click()
 page.locator('#model-state').filter(has_text='3D model loaded').wait_for(timeout=90000)
 page.locator('#measurement').filter(has_text='5,001 samples').wait_for(timeout=10000);assert '1.000 ms' in page.locator('#cursor-label').inner_text()
 print('Desktop',page.title(),page.locator('#measurement').inner_text(),page.locator('#cursor-label').inner_text())
 page.locator('[data-view=front]').click();canvas=page.locator('#scope-3d');canvas.scroll_into_view_if_needed();box=canvas.bounding_box()
 bounds=json.loads(Path('public/equipment/09-04/vr-manifest.json').read_text())['hitBoundsAtRest']
 def pick(id):
  v=bounds[id];x,y,z=[(a+b)/2 for a,b in zip(v['minM'],v['maxM'])];z=v['maxM'][2]
  mult=box['height']/2/math.tan(math.radians(16))/(.73-z);point={'x':box['width']/2+x*mult,'y':box['height']/2-(y-.173)*mult};canvas.click(position=point);print(id,page.locator('#scope-status').inner_text())
 pick('Probe_CH1_TekVPI');assert 'disconnected' in page.locator('#scope-status').inner_text()
 pick('Flex_1_barrel');assert page.locator('#plug').inner_text()=='Disconnect CH1'
 pick('Timebase_scale');assert float(page.locator('#time').input_value())==1.0
 pick('Single_key');assert '10,001 samples' in page.locator('#measurement').inner_text()
 page.locator('#restore').click()
 if os.environ.get('REF_IMAGES'):
  for name in ('front','controls','rear','ports'):
   page.locator('[data-view="'+('reset' if name=='front' else name)+'"]').click();page.wait_for_timeout(450);page.locator('#scope-3d').screenshot(path=out/(name+'.png'))
 page.locator('#plug').click();page.locator('#acquire').click();assert 'disconnected' in page.locator('#scope-status').inner_text();assert page.locator('#save-csv').is_disabled()
 page.locator('#plug').click();page.select_option('#edge','falling');page.locator('#acquire').click();assert '1.000 ms' in page.locator('#cursor-label').inner_text()
 with page.expect_download() as dl:page.locator('#save-csv').click()
 csv=Path(dl.value.path()).read_text();assert 'time_s,voltage_V' in csv and len(csv.splitlines())>5000
 with page.expect_download() as dl:page.locator('#save-json').click()
 cap=json.loads(Path(dl.value.path()).read_text());assert cap['settings']['edge']=='falling' and cap['sampling']['triggerIndex']==1250
 page.locator('#restore').click()
 page.locator('summary').filter(has_text='Import').click()
 page.locator('#input-file').set_input_files(str(out/'example-lockin-capture.csv'));page.locator('#scope-status').filter(has_text='Loaded').wait_for();page.locator('#acquire').click();assert 'Captured bench-sine' in page.locator('#scope-status').inner_text()
 with page.expect_download() as dl:page.locator('#save-json').click()
 cap=json.loads(Path(dl.value.path()).read_text());assert cap['sampleId']=='bench-sine' and cap['revision']==2
 page.set_viewport_size({'width':390,'height':844});page.locator('#restore').click();assert page.locator('#save-csv').is_enabled();assert page.evaluate('document.documentElement.scrollWidth<=window.innerWidth+1')
 if errors:raise Exception(errors)
 print('PASS four actual mesh-pointer interactions, model, two edge triggers, failure, cursor timing, JSON/CSV export, upstream CSV import, narrow-screen controls. NOT a Quest session.')
 b.close()
