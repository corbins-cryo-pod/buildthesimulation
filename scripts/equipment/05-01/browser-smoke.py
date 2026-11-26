"""Ready, boundary, cross-station and download smoke. BTS_SITE can point to production."""
import math,json,os,pathlib
from playwright.sync_api import expect,sync_playwright
url=os.environ.get('BTS_SITE','http://127.0.0.1:4051').rstrip('/')
with sync_playwright() as p:
 b=p.chromium.launch(headless=True,executable_path=os.environ.get('CHROMIUM',p.chromium.executable_path),args=['--no-sandbox','--use-angle=swiftshader','--enable-unsafe-swiftshader','--disable-dev-shm-usage'])
 for w in (1280,390):
  page=b.new_page(viewport={'width':w,'height':905},accept_downloads=True)
  page.emulate_media(color_scheme='light' if w==1280 else 'dark')
  errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
  page.goto(url+'/simulations/equipment/05-01/',wait_until='domcontentloaded',timeout=120000)
  page.get_by_role('link',name='Open simulator →').first.click()
  q=lambda name:page.locator('#prof-'+name)
  expect(q('model')).to_have_attribute('data-loaded','true',timeout=60000)
  expect(q('result')).to_contain_text('9.993 µm mean step')
  expect(q('result')).to_contain_text('forward / reverse')
  if w==1280:
   page.get_by_role('button',name='Front controls').click()
   c=q('viewer').locator('canvas');c.scroll_into_view_if_needed()
   target=c.evaluate('''c=>{const r=c.getBoundingClientRect();for(let y=3;y<r.height;y+=5)for(let x=3;x<r.width;x+=5){
      c.dispatchEvent(new PointerEvent('pointermove',{clientX:r.left+x,clientY:r.top+y}));
      if(c.title==='Open or close draft hood')return [r.left+x,r.top+y];
    }return null;}''')
   assert target,'No hood action in front view'
   page.mouse.click(*target);expect(q('hood')).to_have_attribute('aria-pressed','true')
   q('scan').click();expect(q('status')).to_contain_text('Close the hood')
   q('reset').click()
  q('range').select_option('6.5');q('scan').click();expect(q('status')).to_contain_text('exceeds selected LVDT range')
  q('reset').click()
  q('tilt').fill('2');q('tilt').press('Tab');q('level').uncheck();q('scan').click()
  assert float(q('result').inner_text().split()[0])>11
  q('level').check();q('scan').click()
  assert abs(float(q('result').inner_text().split()[0])-9.993)<.0015
  q('hood').click();q('mill').click();expect(q('sample')).to_contain_text('AU-STEP-TRANSFER')
  q('hood').click();q('tower').click();q('scan').click();expect(q('result')).to_contain_text('0.06 µm mean step')
  assert q('rows').locator('tr').first.locator('td').nth(1).inner_text()=='-0.06'
  with page.expect_download() as d:q('json').click()
  data=json.loads(pathlib.Path(d.value.path()).read_text())
  assert data['schema']=='bts.stylus-profile.v1' and data['sourceProfile']['map']['row']==8 and data['sampleRevision']==1
  assert data['runs'][1]['direction']=='reverse'
  with page.expect_download() as d:q('csv').click()
  assert pathlib.Path(d.value.path()).read_text().startswith('sampleId,sampleRevision,scanRevision,calibrationId')
  page.get_by_role('button',name='Rear inspection').click();page.get_by_role('button',name='Stylus close-up').click()
  assert page.evaluate('document.documentElement.scrollWidth<=innerWidth+1')
  assert not errors,errors
  if w==1280 and os.environ.get('BTS_SCREENSHOT'):page.screenshot(path=os.environ['BTS_SCREENSHOT'],full_page=True)
  print(str(w)+'px: GLB, paired steps, tilt/range, original 04-04 example and both exports passed.')
  page.close()
 b.close()
