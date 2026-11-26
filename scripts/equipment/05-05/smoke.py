"""Real GLB + calibration + fit + file ingress/egress. Set F40_ORIGIN or REF_IMAGES=1 for local authoring."""
import os,io,json,math
from pathlib import Path
from playwright.sync_api import sync_playwright
out=Path('public/equipment/05-05');origin=os.getenv('F40_ORIGIN','http://127.0.0.1:4505')
with sync_playwright() as p:
 opt=dict(headless=True,args=['--no-sandbox','--use-angle=swiftshader','--disable-dev-shm-usage','--enable-unsafe-swiftshader'])
 if os.getenv('CHROME_BIN'):opt['executable_path']=os.environ['CHROME_BIN']
 b=p.chromium.launch(**opt);pg=b.new_page(viewport={'width':1440,'height':920},accept_downloads=True);errors=[];pg.on('pageerror',lambda e:errors.append(str(e)));pg.goto(origin+'/simulations/equipment/05-05/',wait_until='domcontentloaded',timeout=90000);pg.locator('a[href="/simulations/equipment/05-05/simulator/"]').first.click();pg.locator('#f-viewstate').filter(has_text='Metric GLB loaded').wait_for(timeout=90000)
 assert '300.00 nm fitted' in pg.locator('#f-read').inner_text();pg.locator('#f-step').click();assert '340.00 nm' in pg.locator('#f-read').inner_text();pg.locator('#f-reset').click()
 if os.getenv('REF_IMAGES'):
  from PIL import Image
  for n in ['station','spot','head','rear']:
   pg.locator('[data-camera="'+n+'"]').click();pg.wait_for_timeout(300);Image.open(io.BytesIO(pg.locator('#f-model').screenshot())).convert('RGB').save(out/(n+'.webp'),'WEBP',quality=90)
 pg.locator('[data-camera=side]').click();cv=pg.locator('#f-model');cv.scroll_into_view_if_needed();box=cv.bounding_box();bounds=json.loads((out/'vr-manifest.json').read_text())['boundsAtRest'];v=bounds['Focus_fine_1'];x=v['maxM'][0];y=(v['minM'][1]+v['maxM'][1])/2;z=(v['minM'][2]+v['maxM'][2])/2
 # Side-view camera at +X; camera screen-right points toward –Z.
 mult=box['height']/2/math.tan(math.radians(16))/(1.15-x);cv.click(position={'x':box['width']/2-z*mult,'y':box['height']/2-(y-.220)*mult});assert pg.locator('#f-focus').inner_text()=='Focus specimen'
 pg.locator('#f-run').click();assert 'Focus required' in pg.locator('#f-status').inner_text() and pg.locator('#f-export').is_disabled();pg.locator('#f-focus').click();pg.locator('#f-run').click()
 pg.locator('#f-lamp').fill('.6');pg.locator('#f-run').click();assert 'Missing matching' in pg.locator('#f-status').inner_text();pg.locator('#f-dark').click();pg.locator('#f-reference').click();pg.locator('#f-specimen').click();pg.locator('#f-run').click();assert '300.00 nm' in pg.locator('#f-read').inner_text()
 pg.select_option('#f-band','narrow');pg.locator('#f-run').click();assert 'thickness withheld' in pg.locator('#f-read').inner_text()
 def fetch(id):
  with pg.expect_download() as dl:pg.locator(id).click()
  return Path(dl.value.path()).read_text()
 assert json.loads(fetch('#f-fitout'))['thicknessNm'] is None;pg.locator('#f-reset').click()
 j=json.loads(fetch('#f-export'));assert j['samples'][0]['wavelengthNm']==400 and j['samples'][-1]['wavelengthNm']==850;assert 'wavelength_nm,reflectance_fraction' in fetch('#f-csv')
 pg.locator('#f-import').set_input_files({'name':'spectrum.json','mimeType':'application/json','buffer':json.dumps(j).encode()});pg.locator('#f-status').filter(has_text='Imported calibrated').wait_for();assert json.loads(fetch('#f-fitout'))['parentRevision']==1
 pg.locator('#f-assume').check();pg.locator('#f-spin').click();pg.locator('#f-read').filter(has_text='1326.26 nm fitted').wait_for();fit=json.loads(fetch('#f-fitout'));assert fit['sampleId']=='SI-WAFER-150-001' and fit['revision']==3
 pg.set_viewport_size({'width':390,'height':844});pg.locator('#f-reset').click();assert pg.locator('#f-export').is_enabled() and pg.evaluate('document.documentElement.scrollWidth<=innerWidth+1')
 assert not errors,errors;print('PASS actual GLB and focus ray target, two film regions, dark/BK7 recalibration, withheld ambiguous fit, CSV/JSON downloads, spectrum reimport, published 02-07 native sample, 390px viewport; not headset-tested');b.close()
