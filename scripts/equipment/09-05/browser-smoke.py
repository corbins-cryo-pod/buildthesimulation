"""Real entry-point Chromium user flow. Set BTS_SITE for deployed QA."""
import json, math, os, pathlib
from playwright.sync_api import sync_playwright,expect
base=os.environ.get('BTS_SITE','http://127.0.0.1:4095').rstrip('/')
with sync_playwright() as p:
 b=p.chromium.launch(executable_path=os.environ.get('CHROMIUM',p.chromium.executable_path),headless=True,args=['--no-sandbox','--use-angle=swiftshader','--enable-unsafe-swiftshader','--disable-dev-shm-usage'])
 for width in (1280,390):
  page=b.new_page(viewport={'width':width,'height':900},accept_downloads=True)
  errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
  page.goto(base+'/simulations/equipment/09-05/',wait_until='domcontentloaded',timeout=120000)
  page.get_by_role('link',name='Open simulator →').first.click()
  expect(page.locator('#crt-model')).to_have_attribute('data-loaded','true',timeout=60000)
  expect(page.locator('#crt-readout')).to_contain_text('3 div peak to peak')
  expect(page.locator('#crt-readout')).to_contain_text('1 ms between triggers')
  if width==1280:
   page.get_by_role('button',name='Front panel').click()
   target=page.locator('#crt-viewer canvas').evaluate('''canvas=>{
    const r=canvas.getBoundingClientRect();
    for(let y=3;y<r.height;y+=5)for(let x=3;x<r.width;x+=5){
     canvas.dispatchEvent(new PointerEvent('pointermove',{clientX:r.left+x,clientY:r.top+y}));
     if(canvas.title==='Step channel volts/div')return [r.left+x,r.top+y];
    }
    return null;
   }''')
   assert target,'Expected directly operable volts/div knob'
   page.mouse.click(*target)
   expect(page.locator('#crt-volts')).to_have_value('0.2')
   page.locator('#crt-reset').click()
  page.locator('#crt-probe').select_option('10')
  page.locator('#crt-sweep').click()
  expect(page.locator('#crt-status')).to_contain_text('No trigger')
  page.locator('#crt-level').fill('0.015')
  page.locator('#crt-level').press('Tab')
  page.locator('#crt-sweep').click()
  expect(page.locator('#crt-readout')).to_contain_text('0.3 div peak to peak')
  with page.expect_download() as d:
   page.locator('#crt-json').click()
  out=json.loads(pathlib.Path(d.value.path()).read_text())
  assert out['schema']=='bts.analog-trace.screen.v1' and abs(out['summary']['tipEquivalentVpp']-.3)<1e-8
  with page.expect_download() as d:
   page.locator('#crt-csv').click()
  assert pathlib.Path(d.value.path()).read_text().startswith('time_since_sweep_s,x_div,y_div,bnc_input_V')
  page.locator('#crt-arm').click()
  page.locator('#crt-sweep').click()
  expect(page.locator('#crt-readout')).to_contain_text('Triggered A sweep')
  page.locator('#crt-sweep').click()
  expect(page.locator('#crt-status')).to_contain_text('not armed')
  page.locator('#crt-level').fill('1')
  page.locator('#crt-level').press('Tab')
  page.locator('#crt-mode').select_option('AUTO')
  page.locator('#crt-sweep').click()
  expect(page.locator('#crt-readout')).to_contain_text('Free-running')
  page.locator('#crt-reset').click()
  fixture={'schema':'bts.analog-waveform.v1','sampleId':'BROWSER-CAL','revision':7,'dtS':1/256000,'channels':[{'id':'A','unit':'V','samples':[math.sin(2*math.pi*i/256) for i in range(8192)]}]}
  page.locator('#crt-file').set_input_files({'name':'fixture.json','mimeType':'application/json','buffer':json.dumps(fixture).encode()})
  expect(page.locator('#crt-input')).to_have_value('file')
  page.locator('#crt-volts').select_option('0.5')
  page.locator('#crt-sweep').click()
  expect(page.locator('#crt-readout')).to_contain_text('4 div peak to peak')
  page.get_by_role('button',name='Rear ports').click()
  page.get_by_role('button',name='CRT close-up').click()
  assert page.evaluate('document.documentElement.scrollWidth<=innerWidth+1')
  assert not errors,errors
  print(f'{width}px: GLB, calibrator, ×10, trigger/blanking/SINGLE/AUTO, import and both exports verified.')
  if width==1280 and os.environ.get('BTS_SCREENSHOT'):page.screenshot(full_page=True,path=os.environ['BTS_SCREENSHOT'])
  page.close()
 b.close()
