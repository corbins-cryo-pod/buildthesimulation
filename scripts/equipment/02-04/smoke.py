import io,math,os,json
from pathlib import Path
from playwright.sync_api import sync_playwright
base=os.getenv('DWL_ORIGIN','http://127.0.0.1:4204')
def norm(a):
 n=math.sqrt(sum(q*q for q in a));return tuple(q/n for q in a)
def cross(a,b):return (a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0])
def dot(a,b):return sum(x*y for x,y in zip(a,b))
def hit(cv,eye,target,xyz):
 cv.scroll_into_view_if_needed();b=cv.bounding_box();f=norm(tuple(a-b for a,b in zip(target,eye)));r=norm(cross(f,(0,1,0)));up=cross(r,f);v=tuple(a-b for a,b in zip(xyz,eye));px=b['height']/(2*math.tan(math.radians(18))*dot(v,f));cv.click(position={'x':b['width']/2+dot(v,r)*px,'y':b['height']/2-dot(v,up)*px})
with sync_playwright() as p:
 kw={'args':['--no-sandbox','--use-angle=swiftshader','--enable-unsafe-swiftshader','--disable-dev-shm-usage']};
 if os.getenv('CHROME_BIN'):kw['executable_path']=os.environ['CHROME_BIN']
 b=p.chromium.launch(**kw);pg=b.new_page(viewport={'width':1200,'height':850},accept_downloads=True);pg.goto(base+'/simulations/equipment/02-04/');pg.locator('a[href="/simulations/equipment/02-04/simulator/"]').first.click();pg.locator('#dwl-viewstatus').filter(has_text='Metric GLB loaded').wait_for(timeout=60000);cv=pg.locator('#dwl-model')
 if os.getenv('REF_IMAGES'):
  from PIL import Image
  pg.add_style_tag(content='astro-dev-toolbar {display:none!important}')
  Image.open(io.BytesIO(cv.screenshot())).convert('RGB').save('public/equipment/02-04/station.webp',quality=88)
 pg.locator('#dwl-preview').click();assert 'viewport' in pg.locator('#dwl-status').inner_text()
 hit(cv,(1.61,1.5,2.74),(.27,1.0,.03),(0,.772,.525));assert 'Viewport open' in pg.locator('#dwl-state').inner_text()
 pg.locator('#dwl-carrier').click();pg.locator('#dwl-chamber').click();pg.select_option('#dwl-tone','dark');pg.locator('#dwl-angle').fill('90');hit(cv,(.39,1.32,1.19),(0,.967,.37),(0,.92685,.434));assert '90.00°' in pg.locator('#dwl-read').inner_text(),pg.locator('#dwl-status').inner_text()
 if os.getenv('REF_IMAGES'):Image.open(io.BytesIO(cv.screenshot())).convert('RGB').save('public/equipment/02-04/carrier.webp',quality=90)
 with pg.expect_download() as d:pg.locator('#dwl-export').click()
 payload=Path(d.value.path()).read_bytes();q=json.loads(payload);assert q['source']=='simulated' and q['tone']=='dark' and q['waferModified'] is False
 pg.locator('#dwl-error').fill('1');pg.locator('#dwl-preview').click();assert 'spacing mismatch' in pg.locator('#dwl-status').inner_text() and pg.locator('#dwl-export').is_disabled()
 pg.locator('#dwl-import').set_input_files({'name':'preview.json','mimeType':'application/json','buffer':payload});pg.locator('#dwl-read').filter(has_text='90.00°').wait_for();assert 'dark' in pg.locator('#dwl-read').inner_text()
 pg.set_viewport_size({'width':390,'height':844});pg.locator('#dwl-reset').click();assert pg.evaluate('document.documentElement.scrollWidth<=innerWidth+1');print('PASS metric GLB, physical viewport and blank rays, rigid preview, invalid spacing, JSON roundtrip and mobile');b.close()
