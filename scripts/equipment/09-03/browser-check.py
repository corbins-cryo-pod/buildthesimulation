"""Run against local production preview or an actual deployed origin. Optional --refs regenerates original renders."""
import os,sys,json,pathlib,io,math
from playwright.sync_api import sync_playwright
from PIL import Image
base=os.getenv('BTS_ORIGIN','http://127.0.0.1:4393').rstrip('/');out=pathlib.Path(__file__).resolve().parents[3]/'public/equipment/09-03'
with sync_playwright() as p:
 b=p.chromium.launch(executable_path=os.getenv('BTS_CHROME') or None,args=['--no-sandbox','--enable-unsafe-swiftshader','--use-gl=angle','--use-angle=swiftshader','--disable-dev-shm-usage'],headless=True)
 pg=b.new_page(viewport={'width':1390,'height':950},device_scale_factor=1)
 errs=[];pg.on('pageerror',lambda e:errs.append(str(e)));pg.goto(base+'/simulations/equipment/09-03/',wait_until='domcontentloaded')
 pg.locator('a[href="/simulations/equipment/09-03/simulator/"]').click();pg.locator('#loadstate').filter(has_text='3D asset loaded').wait_for(timeout=100000)
 pg.locator('[data-view=front]').click();pg.locator('#instrument').scroll_into_view_if_needed();bb=pg.locator('#instrument').bounding_box();px=bb['height']/(2*math.tan(math.radians(16)));pg.mouse.click(bb['x']+bb['width']/2+0.076*px/.552,bb['y']+bb['height']/2-(.085-.0556)*px/.552);assert 'Output on.' in pg.locator('#notice').inner_text(),'3D ON/OFF key failed';pg.mouse.click(bb['x']+bb['width']/2+0.044*px/.55,bb['y']+bb['height']/2-(.078-.0556)*px/.55);assert pg.locator('[name=limit]').input_value()=='10','3D encoder failed';pg.locator('#demo').click();
 pg.locator('#run').click();assert '1 V / 1 mA' in pg.locator('#summary').inner_text();assert pg.locator('#rows tr').count()==11
 pg.locator('[name=limit]').fill('0.5');assert pg.locator('[data-export=json]').is_disabled();pg.locator('#run').click()
 assert '0.5 V / 0.5 mA' in pg.locator('#summary').inner_text() and '5/11 limited' in pg.locator('#summary').inner_text()
 for kind in ['json','csv','wave']:
  with pg.expect_download() as pending:pg.locator('[data-export='+kind+']').click()
  path=pending.value.path();raw=path.read_text()
  if kind=='json':
   trace=json.loads(raw);assert trace['points'][-1]['compliance'] and trace['revision']==2
  elif kind=='wave':assert json.loads(raw)['channels'][0]['samples'][-1]==.5
  else:assert raw.count('\n')==12 and 'DUT-HI' in raw
 pg.locator('#off').click();assert 'Output off.' in pg.locator('#notice').inner_text();pg.locator('#fixture').click();pg.locator('#run').click();assert 'disconnected' in pg.locator('#notice').inner_text();assert pg.locator('[data-export=json]').is_disabled()
 pg.locator('#demo').click();pg.locator('[name=sense]').select_option('4');pg.locator('#senseLeads').click();pg.locator('#run').click();assert 'Remote sense circuit open' in pg.locator('#notice').inner_text();pg.locator('#senseLeads').click();pg.locator('#run').click()
 for view in ['bench','front','rear','side','work']:
  pg.locator('[data-view='+view+']').click();pg.wait_for_timeout(300)
  if '--refs' in sys.argv and view!='bench':
   # Draw original image from the very same WebGL asset, not an external photo.
   im=Image.open(io.BytesIO(pg.locator('#instrument').screenshot()));im.thumbnail((720,440));im.save(out/(view+'.webp'),quality=87)
 pg.set_viewport_size({'width':390,'height':844});pg.locator('#demo').click();pg.locator('#run').click();assert '1 V / 1 mA' in pg.locator('#summary').inner_text()
 assert pg.locator('.bench').evaluate('(n)=>n.getBoundingClientRect().width<=window.innerWidth')
 print(json.dumps({'origin':base,'model':'GLB decoded and rendered','acceptance':'1 V/1 mA then 0.5 V/0.5 mA; five of eleven points limited','modelControls':['ON/OFF key','rotary limit encoder'],'downloads':['sweep JSON','point CSV','sampled voltage JSON'],'failure':'disconnected DUT and disconnected sense rejected','mobile':'390 px viewport sweep and layout checked','headset':'not tested','pageErrors':errs},indent=2));assert not errs;b.close()
