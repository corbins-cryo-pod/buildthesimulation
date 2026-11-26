"""Chromium/Playwright quality gate for the Bruker GT-K station."""
import os,sys,json,pathlib,io,math
from playwright.sync_api import sync_playwright
from PIL import Image
base=os.getenv('BTS_ORIGIN','http://127.0.0.1:4392').rstrip('/')
out=pathlib.Path(__file__).resolve().parents[3]/'public/equipment/05-02'
with sync_playwright() as p:
 proxy={'server':os.environ['BTS_BROWSER_PROXY']} if os.getenv('BTS_BROWSER_PROXY') else None
 b=p.chromium.launch(proxy=proxy,executable_path=os.getenv('BTS_CHROME') or None,args=['--no-sandbox','--enable-unsafe-swiftshader','--use-gl=angle','--use-angle=swiftshader','--disable-dev-shm-usage'],headless=True)
 pg=b.new_page(viewport={'width':1390,'height':950},device_scale_factor=1)
 errors=[];pg.on('pageerror',lambda e:errors.append(str(e)));pg.goto(base+'/simulations/equipment/05-02/',wait_until='domcontentloaded')
 pg.locator('a[href="/simulations/equipment/05-02/simulator/"]').click();pg.locator('#gtk-asset').filter(has_text='3D asset loaded').wait_for(timeout=90000)
 g=pg.locator('#gtk-model');pg.locator('[data-view=front]').click();g.scroll_into_view_if_needed();q=g.bounding_box()
 fac=q['height']/(2*math.tan(math.radians(17))*(1.67-.15))
 pg.mouse.click(q['x']+q['width']/2+.069*fac,q['y']+q['height']/2-(.373-.36)*fac)
 assert pg.locator('[name=objective]').input_value()=='20','select 20× from the physical turret'
 pg.locator('#gtk-run').click();assert 'Step 5 µm' in pg.locator('#gtk-result').inner_text()
 assert '5 µm pixel pitch' in pg.locator('#gtk-scale').inner_text()
 pg.locator('#gtk-stage').click();pg.locator('#gtk-load').click();pg.locator('#gtk-stage').click();pg.locator('#gtk-run').click()
 assert 'No scan: load a coupon.' in pg.locator('#gtk-status').inner_text() and pg.locator('#gtk-json').is_disabled()
 pg.locator('#gtk-flat').click();pg.locator('#gtk-run').click();assert '63 invalid' in pg.locator('#gtk-result').inner_text() and '0.001, Y -0.0005' in pg.locator('#gtk-result').inner_text()
 def download(k):
  with pg.expect_download() as dl:pg.locator('#gtk-'+k).click()
  return dl.value.path().read_text()
 fh=json.loads(download('json'));assert sum(fh['mask'])==63 and fh['metrics']['SqUm']<1e-6 and fh['grid']['dxUm']==20
 assert download('csv').count('\n')==3073
 pg.locator('#gtk-reset').click();pg.locator('[name=contrast]').select_option('0.05');pg.locator('#gtk-run').click();assert '3072 invalid' in pg.locator('#gtk-result').inner_text()
 pg.locator('#gtk-rough').click();pg.locator('#gtk-run').click();assert 'Sa 0.130656 µm' in pg.locator('#gtk-result').inner_text()
 pg.locator('#gtk-reset').click();pg.locator('#gtk-run').click()
 for view in ['bench','front','rear','side','work']:
  pg.locator('[data-view='+view+']').click();pg.wait_for_timeout(260)
  if '--refs' in sys.argv and view!='bench':
   im=Image.open(io.BytesIO(g.screenshot()));im.thumbnail((720,440));im.save(out/(view+'.webp'),quality=88)
 pg.set_viewport_size({'width':390,'height':844});pg.locator('#gtk-flat').click();pg.locator('#gtk-run').click();assert '63 invalid' in pg.locator('#gtk-result').inner_text()
 assert g.evaluate('(n)=>n.getBoundingClientRect().width<=window.innerWidth')
 print(json.dumps({'origin':base,'gltf':'loaded and rendered; physical turret clicked; loading controls checked','step':'5 µm','flat':'slopes +0.001 and −0.0005; 63 masked pixels','roughness':'Sa = 0.130656 µm; all-invalid and unloaded sample checked','downloads':['JSON','CSV'],'mobile':'390 px checked','headset':'not tested','pageErrors':errors},indent=2));assert not errors;b.close()
