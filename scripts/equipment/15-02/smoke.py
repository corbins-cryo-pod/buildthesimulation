import io,math,os,json
from pathlib import Path
from playwright.sync_api import sync_playwright
base=os.getenv('SMZ_ORIGIN','http://127.0.0.1:5502')
def norm(a):
 n=math.sqrt(sum(q*q for q in a));return tuple(q/n for q in a)
def cross(a,b):return (a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0])
def dot(a,b):return sum(x*y for x,y in zip(a,b))
def hit(cv,eye,target,xyz):
 cv.scroll_into_view_if_needed();b=cv.bounding_box();f=norm(tuple(a-b for a,b in zip(target,eye)));r=norm(cross(f,(0,1,0)));up=cross(r,f);v=tuple(a-b for a,b in zip(xyz,eye));px=b['height']/(2*math.tan(math.radians(18))*dot(v,f));cv.click(position={'x':b['width']/2+dot(v,r)*px,'y':b['height']/2-dot(v,up)*px})
with sync_playwright() as p:
 kw={'args':['--no-sandbox','--use-angle=swiftshader','--enable-unsafe-swiftshader','--disable-dev-shm-usage']};ch=os.getenv('CHROME_BIN')
 if ch:kw['executable_path']=ch
 b=p.chromium.launch(**kw);pg=b.new_page(viewport={'width':1200,'height':850},accept_downloads=True);pg.goto(base+'/simulations/equipment/15-02/');pg.locator('a[href="/simulations/equipment/15-02/simulator/"]').first.click()
 pg.locator('#sm-viewstatus').filter(has_text='Metric GLB loaded').wait_for(timeout=60000);cv=pg.locator('#sm-model')
 assert pg.locator('#sm-readout').inner_text()=='20 chart px · 1 mm on the drawing'
 if os.getenv('REF_IMAGES'):
  from PIL import Image
  pg.add_style_tag(content='astro-dev-toolbar {display:none!important}')
  Image.open(io.BytesIO(cv.screenshot())).convert('RGB').save('public/equipment/15-02/station.webp',quality=89)
 pg.locator('#sm-side').click()
 if os.getenv('REF_IMAGES'):Image.open(io.BytesIO(cv.screenshot())).convert('RGB').save('public/equipment/15-02/side.webp',quality=89)
 pg.locator('#sm-board').click();hit(cv,(.44,.324,.39),(.30,.079,.057),(.343,.0885,.093));assert pg.locator('#sm-readout').inner_text()=='40 chart px · 1 mm on the drawing'
 assert pg.locator('#sm-line').get_attribute('x2')=='58' and 'scale(2)' in pg.locator('#sm-zoomGroup').get_attribute('transform')
 with pg.expect_download() as d:pg.locator('#sm-export').click()
 q=json.loads(Path(d.value.path()).read_text());assert q['chartDistanceMm']==1 and q['chartSpanPx']==40 and not q['deviceConnection']
 pg.set_viewport_size({'width':390,'height':844});pg.locator('#sm-span').select_option('zero');assert '0 chart px · 0 mm' in pg.locator('#sm-readout').inner_text();assert pg.evaluate('document.documentElement.scrollWidth<=innerWidth+1')
 b.close();print('PASS catalog, metric inert GLB, detached zoom tile ray, authored span invariant, 0 mm boundary, JSON and mobile')
