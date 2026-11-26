"""Actual desktop/mobile user flow; supply BTS_SITE for production."""
import json, os, pathlib
from playwright.sync_api import sync_playwright,expect
base=os.environ.get('BTS_SITE','http://127.0.0.1:4100').rstrip('/')
with sync_playwright() as p:
 b=p.chromium.launch(executable_path=os.environ.get('CHROMIUM',p.chromium.executable_path),headless=True,args=['--no-sandbox','--use-angle=swiftshader','--enable-unsafe-swiftshader','--disable-dev-shm-usage'])
 for width in (1280,390):
  page=b.new_page(viewport={'width':width,'height':900},accept_downloads=True)
  errors=[]; page.on('pageerror',lambda e:errors.append(str(e)))
  page.goto(base+'/simulations/equipment/09-10/',wait_until='domcontentloaded',timeout=120000)
  page.get_by_role('link',name='Open simulator →').first.click()
  expect(page.locator('#pre-model')).to_have_attribute('data-loaded','true',timeout=60000)
  if width==1280:
   page.get_by_role('button',name='Front panel').click()
   target=page.locator('#pre-viewer canvas').evaluate('''canvas=>{
    const r=canvas.getBoundingClientRect();
    for(let y=4;y<r.height;y+=5)for(let x=4;x<r.width;x+=5){
     canvas.dispatchEvent(new PointerEvent('pointermove',{clientX:r.left+x,clientY:r.top+y}));
     if(canvas.title==='Increase gain')return [r.left+x,r.top+y];
    }
    return null;
   }''')
   assert target,'Visible 3D gain target not found'
   page.mouse.click(*target)
   expect(page.locator('#pre-gain')).to_have_value('200')
   page.locator('#pre-reset').click()
  page.locator('#pre-capture').click()
  expect(page.locator('#pre-result')).to_contain_text('2.0000 Vpp')
  with page.expect_download() as d:
   page.locator('#pre-json').click()
  output=json.loads(pathlib.Path(d.value.path()).read_text())
  assert output['schema']=='bts.analog-waveform.v1' and output['channels'][0]['unit']=='V' and len(output['channels'][0]['samples'])==8192
  page.locator('#pre-load').select_option('50')
  page.locator('#pre-capture').click()
  expect(page.locator('#pre-result')).to_contain_text('1.0000 Vpp')
  page.locator('#pre-load').select_option('high')
  page.locator('#pre-filter').select_option('lp')
  page.locator('#pre-capture').click()
  expect(page.locator('#pre-result')).to_contain_text('1.4142 Vpp')
  with page.expect_download() as d2:
   page.locator('#pre-csv').click()
  assert pathlib.Path(d2.value.path()).read_text().startswith('time_s,output_V\n')
  page.locator('#pre-filter').select_option('bypass')
  page.locator('#pre-gain').select_option('1000')
  page.locator('#pre-capture').click()
  expect(page.locator('#pre-status')).to_have_attribute('data-error','true')
  expect(page.locator('#pre-status')).to_contain_text('unloaded output exceeds')
  page.locator('#pre-reset').click()
  page.locator('#pre-gain').select_option('1')
  page.locator('#pre-import').set_input_files({'name':'from-generator.json','mimeType':'application/json','buffer':json.dumps(output).encode()})
  expect(page.locator('#pre-source-note')).to_contain_text('Imported SR560-DIFFERENTIAL-CAL')
  expect(page.locator('#pre-source')).to_have_value('A')
  page.locator('#pre-capture').click()
  expect(page.locator('#pre-result')).to_contain_text('2.0000 Vpp')
  page.get_by_role('button',name='Rear ports').click()
  page.get_by_role('button',name='Source close-up').click()
  assert page.evaluate('document.documentElement.scrollWidth<=innerWidth+1')
  assert not errors,errors
  print(f'{width}px: 3D, gain, matched load, cutoff, overload, both exports, input import and camera controls pass.')
  if width==1280 and os.environ.get('BTS_SCREENSHOT'):page.screenshot(full_page=True,path=os.environ['BTS_SCREENSHOT'])
  page.close()
 b.close()
