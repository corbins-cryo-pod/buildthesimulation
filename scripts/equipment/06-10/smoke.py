import io,math,os,json
from pathlib import Path
from playwright.sync_api import sync_playwright
base=os.getenv('DRY_ORIGIN','http://127.0.0.1:4610')
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
 pg.goto(base+'/simulations/equipment/06-10/');pg.locator('a[href="/simulations/equipment/06-10/simulator/"]').first.click()
 pg.locator('#dry-viewstatus').filter(has_text='Metric GLB loaded').wait_for(timeout=60000);cv=pg.locator('#dry-model')
 assert pg.locator('#dry-readout').get_attribute('data-fits')=='yes'
 if os.getenv('REF_IMAGES'):
  from PIL import Image
  pg.add_style_tag(content='astro-dev-toolbar {display:none!important}')
  Image.open(io.BytesIO(cv.screenshot())).convert('RGB').save('public/equipment/06-10/station.webp',quality=89)
 pg.locator('#dry-furniture').click();pg.locator('#dry-board').click();hit(cv,(1.39,1.40,.72),(1.106,.695,.159),(1.106,.7175,.159));assert '126 × 112' in pg.locator('#dry-readout').inner_text() and pg.locator('#dry-readout').get_attribute('data-fits')=='no'
 if os.getenv('REF_IMAGES'):Image.open(io.BytesIO(cv.screenshot())).convert('RGB').save('public/equipment/06-10/board.webp',quality=89)
 with pg.expect_download() as d:pg.locator('#dry-export').click()
 q=json.loads(Path(d.value.path()).read_text());assert q['totalMargin']==[2,-2] and not q['deviceConnection'] and not q['fits']
 pg.set_viewport_size({'width':390,'height':844});pg.locator('#dry-pose').select_option('right');assert '50 × 120' in pg.locator('#dry-readout').inner_text();assert pg.evaluate('document.documentElement.scrollWidth<=innerWidth+1')
 b.close();print('PASS catalog, original GLB, detached pose ray, independent fit and overhang, scalar JSON and mobile')
