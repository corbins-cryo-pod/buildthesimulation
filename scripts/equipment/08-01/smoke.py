import io,math,os,json
from pathlib import Path
from playwright.sync_api import sync_playwright
base=os.getenv('BOND_ORIGIN','http://127.0.0.1:4801')
def norm(a):
 n=math.sqrt(sum(q*q for q in a));return tuple(q/n for q in a)
def cross(a,b):return (a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0])
def dot(a,b):return sum(x*y for x,y in zip(a,b))
def hit(cv,eye,target,xyz):
 cv.scroll_into_view_if_needed();b=cv.bounding_box();f=norm(tuple(a-b for a,b in zip(target,eye)));r=norm(cross(f,(0,1,0)));up=cross(r,f);v=tuple(a-b for a,b in zip(xyz,eye));px=b['height']/(2*math.tan(math.radians(35/2))*dot(v,f));cv.click(position={'x':b['width']/2+dot(v,r)*px,'y':b['height']/2-dot(v,up)*px})
with sync_playwright() as p:
 kw={'args':['--no-sandbox','--use-angle=swiftshader','--enable-unsafe-swiftshader','--disable-dev-shm-usage']};
 if os.getenv('CHROME_BIN'):kw['executable_path']=os.environ['CHROME_BIN']
 b=p.chromium.launch(**kw);pg=b.new_page(viewport={'width':1200,'height':850},accept_downloads=True);pg.goto(base+'/simulations/equipment/08-01/');pg.locator('a[href="/simulations/equipment/08-01/simulator/"]').first.click();pg.locator('#bond-viewstatus').filter(has_text='Metric GLB loaded').wait_for(timeout=60000);cv=pg.locator('#bond-model')
 if os.getenv('REF_IMAGES'):
  from PIL import Image
  pg.add_style_tag(content='astro-dev-toolbar {display:none!important}')
  Image.open(io.BytesIO(cv.screenshot())).convert('RGB').save('public/equipment/08-01/station.webp',quality=88)
 hit(cv,(.55,.51,.90),(-.015,.17,.035),(.200,.064,.129));assert 'Place stitch' in pg.locator('#bond-place').inner_text(),pg.locator('#bond-status').inner_text()
 pg.locator('#bond-coupon').click();hit(cv,(.073,.098,.1405),(.072,.0895,.1362),(.07155,.089456,.1374));assert 'C_A selected' in pg.locator('#bond-phase').inner_text()
 pg.locator('#bond-place').click();assert 'D_A → C_A' in pg.locator('#bond-edges').inner_text() and 'From D_B: D_B' in pg.locator('#bond-test').inner_text();pg.wait_for_timeout(360)
 if os.getenv('REF_IMAGES'):Image.open(io.BytesIO(cv.screenshot())).convert('RGB').save('public/equipment/08-01/coupon.webp',quality=90)
 with pg.expect_download() as dl:pg.locator('#bond-export').click()
 j=json.loads(Path(dl.value.path()).read_text());assert j['revision']==2 and j['graph']['components']['C_B']==['C_B']
 pg.locator('#bond-reset').click();pg.locator('#bond-shift').fill('12.501');pg.locator('#bond-place').click();assert 'footprint' in pg.locator('#bond-status').inner_text()
 pg.locator('#bond-reset').click();pg.locator('#bond-place').click();pg.locator('[data-bond-pad=C_B]').click();pg.locator('#bond-place').click();assert 'SHORT' in pg.locator('#bond-edges').inner_text();pg.set_viewport_size({'width':390,'height':844});pg.locator('#bond-reset').click();assert pg.evaluate('document.documentElement.scrollWidth<=innerWidth+1');print('PASS GLB, physical placements, real export, boundary, wrong net and mobile');b.close()
