import io,math,os,json
from pathlib import Path
from playwright.sync_api import sync_playwright
base=os.getenv('CSU_ORIGIN','http://127.0.0.1:4155')
def norm(a):
 n=math.sqrt(sum(q*q for q in a));return tuple(q/n for q in a)
def cross(a,b):return (a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0])
def dot(a,b):return sum(x*y for x,y in zip(a,b))
def hit(cv,eye,target,xyz):
 cv.scroll_into_view_if_needed();b=cv.bounding_box();f=norm(tuple(a-b for a,b in zip(target,eye)));r=norm(cross(f,(0,1,0)));up=cross(r,f);v=tuple(a-b for a,b in zip(xyz,eye));px=b['height']/(2*math.tan(math.radians(18))*dot(v,f));cv.click(position={'x':b['width']/2+dot(v,r)*px,'y':b['height']/2-dot(v,up)*px})
with sync_playwright() as p:
 kw={'args':['--no-sandbox','--use-angle=swiftshader','--enable-unsafe-swiftshader','--disable-dev-shm-usage']};ch=os.getenv('CHROME_BIN')
 if ch:kw['executable_path']=ch
 b=p.chromium.launch(**kw);pg=b.new_page(viewport={'width':1200,'height':850},accept_downloads=True)
 pg.goto(base+'/simulations/equipment/12-05/');pg.locator('a[href="/simulations/equipment/12-05/simulator/"]').first.click()
 pg.locator('#w1-viewstatus').filter(has_text='Metric GLB loaded').wait_for(timeout=60000);cv=pg.locator('#w1-model')
 if os.getenv('REF_IMAGES'):
  from PIL import Image
  pg.add_style_tag(content='astro-dev-toolbar {display:none!important}')
  Image.open(io.BytesIO(cv.screenshot())).convert('RGB').save('public/equipment/12-05/station.webp',quality=88)
 pg.locator('#w1-module').click()
 if os.getenv('REF_IMAGES'):Image.open(io.BytesIO(cv.screenshot())).convert('RGB').save('public/equipment/12-05/module.webp',quality=88)
 pg.locator('#w1-cards').click();hit(cv,(.32,.38,.84),(.173,.050,.446),(.174,.061,.446))
 assert pg.locator('#w1-plane').input_value()=='middle' and '(72, 58)' in pg.locator('#w1-readout').inner_text()
 pg.locator('#w1-expression').select_option('registered');assert '(64, 64)' in pg.locator('#w1-readout').inner_text()
 with pg.expect_download() as d:pg.locator('#w1-export').click()
 q=json.loads(Path(d.value.path()).read_text());assert q['zUm']==8 and q['centroidUm']==[64,64] and not q['deviceConnection'] and len(q['pixels'])==4096
 pg.set_viewport_size({'width':390,'height':844});pg.locator('#w1-plane').select_option('upper')
 assert pg.locator('#w1-readout').get_attribute('data-z')=='16';assert pg.evaluate('document.documentElement.scrollWidth<=innerWidth+1')
 b.close();print('PASS catalogue, GLB orbit/close-ups, middle card ray, raw 72/58 and registered 64/64 µm, JSON, mobile')
