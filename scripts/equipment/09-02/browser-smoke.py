"""Real deployed or built site smoke. Set BTS_SITE or use dedicated localhost default."""
import json, os, pathlib
from playwright.sync_api import sync_playwright,expect
base=os.environ.get('BTS_SITE','http://127.0.0.1:4092').rstrip('/')
with sync_playwright() as p:
 b=p.chromium.launch(executable_path=os.environ.get('CHROMIUM',p.chromium.executable_path),headless=True,args=['--no-sandbox','--use-angle=swiftshader','--enable-unsafe-swiftshader','--disable-dev-shm-usage'])
 for width in (1280,390):
  page=b.new_page(viewport={'width':width,'height':900},accept_downloads=True)
  page.emulate_media(color_scheme='light' if width==1280 else 'dark')
  errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
  page.goto(base+'/simulations/equipment/09-02/',wait_until='domcontentloaded',timeout=120000)
  page.get_by_role('link',name='Open simulator →').first.click()
  q=lambda k:page.locator('#b1500-'+k)
  expect(q('model')).to_have_attribute('data-loaded','true',timeout=60000)
  expect(q('result')).to_contain_text('4 of 9 points limited')
  assert q('rows').locator('tr').count()==9
  assert q('rows').locator('tr').last.locator('td').all_text_contents()==['9','0.4','0.25','0.25','COMPLIANCE']
  if width==1280:
   page.get_by_role('button',name='Front panel').click()
   canvas=q('viewer').locator('canvas')
   canvas.scroll_into_view_if_needed()
   target=canvas.evaluate('''canvas=>{
    const r=canvas.getBoundingClientRect();
    for(let y=3;y<r.height;y+=5)for(let x=3;x<r.width;x+=5){
     canvas.dispatchEvent(new PointerEvent('pointermove',{clientX:r.left+x,clientY:r.top+y}));
     if(canvas.title==='Clear last reading')return [r.left+x,r.top+y];
    }
    return null;
   }''')
   assert target,'Expected directly clickable Stop button'
   page.mouse.click(*target)
   expect(q('result')).to_contain_text('No current sweep')
  q('value').fill('2000');q('value').press('Tab');q('run').click()
  expect(q('result')).to_contain_text('0 of 9 points limited')
  q('mode').select_option('CV');q('run').click()
  expect(q('status')).to_contain_text('Connect the selected module leads')
  q('wire').click();q('run').click()
  expect(q('status')).to_contain_text('Lower both probes')
  q('seat').click();q('run').click()
  expect(q('status')).to_contain_text('Install an ideal capacitor')
  fixture={'schema':'bts.two-terminal-fixture.v1','kind':'capacitor','sampleId':'CAP-BROWSER-0902','revision':7,'contacts':[{'id':'CAP_LOW','role':'LO'},{'id':'CAP_HIGH','role':'HI'}],'value':1e-9,'unit':'F'}
  q('import').set_input_files({'name':'coupon.json','mimeType':'application/json','buffer':json.dumps(fixture).encode()})
  expect(q('fixture')).to_contain_text('CAP-BROWSER-0902 · revision 7')
  q('seat').click();q('run').click()
  expect(q('result')).to_contain_text('1.000 nF at each bias')
  expect(q('result')).to_contain_text('1.885')
  q('frequency').fill('100');q('frequency').press('Tab');q('run').click()
  expect(q('result')).to_contain_text('18.85')
  with page.expect_download() as d:q('json').click()
  j=json.loads(pathlib.Path(d.value.path()).read_text())
  assert j['schema']=='bts.parametric-sweep.v1' and j['parent']['revision']==7 and j['contacts']['HI']=='CAP_HIGH'
  assert len(j['points'])==9 and all(abs(x['capacitanceF']-1e-9)<1e-12 for x in j['points'])
  with page.expect_download() as d:q('csv').click()
  assert pathlib.Path(d.value.path()).read_text().startswith('sampleId,sampleRevision,measurementId,measurementRevision')
  page.get_by_role('button',name='Module ports').click();page.get_by_role('button',name='Probe fixture').click()
  assert page.evaluate('document.documentElement.scrollWidth <= innerWidth + 1')
  assert not errors,errors
  if width==1280 and os.environ.get('BTS_SCREENSHOT'):page.screenshot(full_page=True,path=os.environ['BTS_SCREENSHOT'])
  print(f'{width}px: loaded model, I–V compliance, missing lead/lifted probe/wrong coupon, C–V, physical controls and exports verified.')
  page.close()
 b.close()
