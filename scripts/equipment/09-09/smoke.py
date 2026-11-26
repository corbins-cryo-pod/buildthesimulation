"""Verify local static output or public PSU_ORIGIN. Set REF_IMAGES=1 to author original reference panels."""
import os,json,math
from pathlib import Path
from playwright.sync_api import sync_playwright
origin=os.getenv('PSU_ORIGIN','http://127.0.0.1:4309');out=Path('public/equipment/09-09')
with sync_playwright() as pw:
 opts={'headless':True,'args':['--no-sandbox','--disable-dev-shm-usage','--use-angle=swiftshader','--enable-unsafe-swiftshader']}
 if os.getenv('CHROME_BIN'):opts['executable_path']=os.environ['CHROME_BIN']
 b=pw.chromium.launch(**opts);page=b.new_page(viewport={'width':1440,'height':950},accept_downloads=True);errs=[];page.on('pageerror',lambda e:errs.append(str(e)));page.goto(origin+'/simulations/equipment/09-09/',wait_until='domcontentloaded',timeout=90000);page.locator('a[href="/simulations/equipment/09-09/simulator/"]').first.click();page.locator('#p-modelstatus').filter(has_text='GLB loaded').wait_for(timeout=90000)
 assert '5.000 V at load' in page.locator('#p-msg').inner_text() and '50.000 mA' in page.locator('#p-msg').inner_text();page.locator('#p-cc').click();assert 'CC' in page.locator('#p-msg').inner_text() and '1.000 V at load' in page.locator('#p-msg').inner_text()
 page.locator('#p-remote').click();assert '5.1000' in page.locator('#p-rows').inner_text();page.select_option('#p-pair','open');assert 'sense circuit open' in page.locator('#p-msg').inner_text() and page.locator('#p-json').is_disabled()
 page.locator('#p-reset').click()
 if os.getenv('REF_IMAGES'):
  from PIL import Image
  import io
  for n in ('front','posts','rear','body'):
   page.locator('[data-camera="'+n+'"]').click();page.wait_for_timeout(450);img=Image.open(io.BytesIO(page.locator('#p-model').screenshot())).convert('RGB');img.save(out/(n+'.webp'),'WEBP',quality=90)
 page.locator('[data-camera="front"]').click();canvas=page.locator('#p-model');canvas.scroll_into_view_if_needed();box=canvas.bounding_box();targets=json.loads((out/'vr-manifest.json').read_text())['hitBoundsAtRest']
 def pick(id):
  q=targets[id];x,y,z=[(i+j)/2 for i,j in zip(q['minM'],q['maxM'])];z=q['maxM'][2];mult=box['height']/2/math.tan(math.radians(16))/(.49-z);canvas.click(position={'x':box['width']/2+x*mult,'y':box['height']/2-(y-.084)*mult})
 pick('Select_2');assert page.locator('[data-ch="1"]').get_attribute('aria-pressed')=='true';pick('Output_2');assert 'OPEN / CV' in page.locator('#p-msg').inner_text();pick('Knob_Voltage');assert abs(float(page.locator('#p-volts').input_value())-12.1)<1e-6;pick('Post_CH2_hi');assert '12.100 V at load' in page.locator('#p-msg').inner_text()
 page.locator('#p-reset').click()
 def download(id):
  with page.expect_download() as dl:page.locator(id).click()
  return Path(dl.value.path()).read_text()
 r=json.loads(download('#p-json'));assert r['channels'][0]['currentA']==.05 and r['totalW']==.25
 assert 'contactId,mode,terminal_V' in download('#p-csv')
 w=json.loads(download('#p-wave'));assert w['channels'][0]['samples'][50]==1 and w['channels'][0]['samples'][100]==5
 state=json.loads(download('#p-bank'));assert state['state']['revision']==1
 page.locator('#p-upload').set_input_files({'name':'handoff.json','mimeType':'application/json','buffer':json.dumps(state).encode()});page.wait_for_function("document.querySelector('#p-total').textContent.includes('revision 2')")
 page.set_viewport_size({'width':390,'height':844});page.locator('#p-cc').click();assert page.locator('#p-json').is_enabled() and page.evaluate('document.documentElement.scrollWidth<=innerWidth+1')
 if errs:raise AssertionError(errs)
 print('PASS GLB, 5 V/50 mA CV, 1 V/100 mA CC, remote sense, failed open sense, 4 physical mesh hits, JSON/CSV/waveform downloads, revisioned reimport and 390px width. No headset test.');b.close()
