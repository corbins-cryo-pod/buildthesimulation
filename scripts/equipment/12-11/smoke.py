import io,math,os,json
from pathlib import Path
from playwright.sync_api import sync_playwright
base=os.getenv('LMD_ORIGIN','http://127.0.0.1:4211')
def norm(a):
 n=math.sqrt(sum(q*q for q in a));return tuple(q/n for q in a)
def cross(a,b):return (a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0])
def dot(a,b):return sum(x*y for x,y in zip(a,b))
def hit(cv,eye,target,xyz):
 cv.scroll_into_view_if_needed();b=cv.bounding_box();f=norm(tuple(a-b for a,b in zip(target,eye)));r=norm(cross(f,(0,1,0)));up=cross(r,f);v=tuple(a-b for a,b in zip(xyz,eye));px=b['height']/(2*math.tan(math.radians(18))*dot(v,f));cv.click(position={'x':b['width']/2+dot(v,r)*px,'y':b['height']/2-dot(v,up)*px})
with sync_playwright() as p:
 kw={'args':['--no-sandbox','--use-angle=swiftshader','--enable-unsafe-swiftshader','--disable-dev-shm-usage']};ch=os.getenv('CHROME_BIN')
 if ch:kw['executable_path']=ch
 b=p.chromium.launch(**kw);pg=b.new_page(viewport={'width':1200,'height':850},accept_downloads=True);pg.goto(base+'/simulations/equipment/12-11/')
 pg.locator('a[href="/simulations/equipment/12-11/simulator/"]').first.click();pg.locator('#lmd-viewstatus').filter(has_text='Metric GLB loaded').wait_for(timeout=60000);cv=pg.locator('#lmd-model')
 assert '1,000' in pg.locator('#lmd-area').inner_text()
 if os.getenv('REF_IMAGES'):
  from PIL import Image
  pg.add_style_tag(content='astro-dev-toolbar {display:none!important}')
  Image.open(io.BytesIO(cv.screenshot())).convert('RGB').save('public/equipment/12-11/station.webp',quality=89)
 pg.locator('#lmd-side').click()
 if os.getenv('REF_IMAGES'):Image.open(io.BytesIO(cv.screenshot())).convert('RGB').save('public/equipment/12-11/side.webp',quality=89)
 pg.locator('#lmd-clear').click();pg.locator('#lmd-board').click();hit(cv,(.65,.42,.80),(.43,.037,.276),(.43,.0405,.276))
 assert '1,000' in pg.locator('#lmd-area').inner_text()
 pg.locator('#lmd-clear').click();pg.locator('#lmd-close').click();assert 'at least three' in pg.locator('#lmd-notice').inner_text()
 for x,y in [(2,2),(12,2),(2,12)]:
  pg.locator('#lmd-x').fill(str(x));pg.locator('#lmd-y').fill(str(y));pg.locator('#lmd-add').click()
 pg.locator('#lmd-close').click();assert '50 grid' in pg.locator('#lmd-area').inner_text()
 with pg.expect_download() as d:pg.locator('#lmd-export').click()
 q=json.loads(Path(d.value.path()).read_text());assert q['result']['areaGridUnits2']==50 and not q['containsCoordinateData'] and not q['deviceConnection']
 pg.set_viewport_size({'width':390,'height':844});pg.locator('#lmd-clear').click();chart=pg.locator('#lmd-chart');cb=chart.bounding_box();chart.click(position={'x':cb['width']*.25,'y':cb['height']*.25});assert '1 vertex' in pg.locator('#lmd-area').inner_text();assert pg.evaluate('document.documentElement.scrollWidth<=innerWidth+1')
 b.close();print('PASS catalogue, GLB, separate board ray, independent coordinates and triangle area 50, invalid close, no-coordinate aggregate and mobile SVG')
