"""Production-ready Playwright LabRAM acceptance. BTS_SITE points to built/live site."""
import json,os,pathlib,re
from playwright.sync_api import expect,sync_playwright
base=os.environ.get('BTS_SITE','http://127.0.0.1:4050').rstrip('/')
with sync_playwright() as p:
 b=p.chromium.launch(headless=True,executable_path=os.environ.get('CHROMIUM',p.chromium.executable_path),args=['--no-sandbox','--use-angle=swiftshader','--enable-unsafe-swiftshader','--disable-dev-shm-usage'])
 for width in (1280,390):
  page=b.new_page(viewport={'width':width,'height':920},accept_downloads=True)
  page.emulate_media(color_scheme='light' if width==1280 else 'dark')
  errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
  page.goto(base+'/simulations/equipment/05-10/',wait_until='domcontentloaded',timeout=120000)
  page.get_by_role('link',name='Open simulator →').first.click()
  q=lambda n:page.locator('#raman-'+n)
  expect(q('model')).to_have_attribute('data-loaded','true',timeout=60000)
  expect(q('status')).to_contain_text('20 spatially indexed spectra')
  assert q('si').locator('button').count()==20
  def fit():
   t=q('tile').inner_text()
   m=re.search(r'peak ([\d.]+) cm⁻¹ · FWHM ([\d.]+)',t)
   assert m,t
   return tuple(float(x) for x in m.groups())
  assert abs(fit()[0]-520.45)<.02
  assert q('si').locator('button').first.get_attribute('data-row')=='3'
  q('ps').locator('[data-row="0"][data-col="1"]').click()
  loc,w=fit();assert abs(loc-1001.4)<.02
  q('lsf').fill('6');q('lsf').press('Tab');q('map').click()
  q('ps').locator('[data-row="0"][data-col="1"]').click()
  loc,w2=fit();assert w2>w+1
  q('clear-axis').click();q('map').click();expect(q('status')).to_contain_text('silicon witness correction')
  q('calibrate').click();q('map').click();assert abs(fit()[0]-520.45)<.02
  if width==1280:
   page.get_by_role('button',name='Front panel').click()
   canvas=q('viewer').locator('canvas');canvas.scroll_into_view_if_needed()
   hit=canvas.evaluate('''c=>{const r=c.getBoundingClientRect();for(let y=3;y<r.height;y+=5)for(let x=3;x<r.width;x+=5){
      c.dispatchEvent(new PointerEvent('pointermove',{clientX:r.left+x,clientY:r.top+y}));
      if(c.title==='Open or close sample visor')return [r.left+x,r.top+y];
    }return null;}''')
   assert hit,'Model visor ray missing in front view'
   page.mouse.click(*hit);expect(q('door')).to_have_attribute('aria-pressed','true')
  else:q('door').click()
  q('map').click();expect(q('status')).to_contain_text('close the cover')
  fixture={'schema':'bts.raman-tiles.v1','sampleId':'BROWSER-AS43','revision':8,'columns':3,'rows':2,'pitchUm':20,'materials':list('SPSPSS')}
  q('file').set_input_files({'name':'coupon.json','mimeType':'application/json','buffer':json.dumps(fixture).encode()})
  expect(q('sample')).to_contain_text('BROWSER-AS43 · revision 8')
  q('door').click();q('arm').click();q('map').click()
  expect(q('status')).to_contain_text('6 spatially indexed spectra')
  q('ps').locator('[data-row="1"][data-col="0"]').click()
  expect(q('tile')).to_contain_text('(10, 30) µm · polystyrene')
  with page.expect_download() as d:q('json').click()
  doc=json.loads(pathlib.Path(d.value.path()).read_text())
  assert doc['schema']=='bts.raman-map.v1' and doc['sampleRevision']==8 and ''.join(p['assigned'] for p in doc['points'])=='SPSPSS'
  with page.expect_download() as d:q('csv').click()
  assert pathlib.Path(d.value.path()).read_text().startswith('sample_id,sample_revision,map_revision,row,col,x_um,y_um')
  page.get_by_role('button',name='Rear panel').click();page.get_by_role('button',name='Objective close-up').click()
  assert not errors,errors
  assert page.evaluate('document.documentElement.scrollWidth <= innerWidth + 1')
  if width==1280 and os.environ.get('BTS_SCREENSHOT'):page.screenshot(full_page=True,path=os.environ['BTS_SCREENSHOT'])
  print(f'{width}px: GLB, visor, spectral fit/blur, calibrated map, physical axis orientation and exports passed.')
  page.close()
 b.close()
