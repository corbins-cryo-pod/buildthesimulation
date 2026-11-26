import io,math,os,json
from pathlib import Path
from playwright.sync_api import sync_playwright
base=os.getenv('COUNT_ORIGIN','http://127.0.0.1:4707')
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
 pg.goto(base+'/simulations/equipment/07-07/');pg.locator('a[href="/simulations/equipment/07-07/simulator/"]').first.click()
 pg.locator('#count-viewstatus').filter(has_text='Metric GLB loaded').wait_for(timeout=60000);cv=pg.locator('#count-model')
 assert pg.locator('#count-measure').inner_text()=='4 connected groups · 100 foreground pixels'
 if os.getenv('REF_IMAGES'):
  from PIL import Image
  pg.add_style_tag(content='astro-dev-toolbar {display:none!important}')
  Image.open(io.BytesIO(cv.screenshot())).convert('RGB').save('public/equipment/07-07/station.webp',quality=89)
 pg.locator('#count-rear').click()
 if os.getenv('REF_IMAGES'):Image.open(io.BytesIO(cv.screenshot())).convert('RGB').save('public/equipment/07-07/rear.webp',quality=89)
 pg.locator('#count-board').click();hit(cv,(.36,.27,.29),(.254,.052,.045),(.254,.0615,.045));assert pg.locator('#count-measure').inner_text()=='3 connected groups · 100 foreground pixels'
 with pg.expect_download() as d:pg.locator('#count-export').click()
 q=json.loads(Path(d.value.path()).read_text());assert q['groupPixels']==[50,25,25] and not q['deviceConnection']
 pg.set_viewport_size({'width':390,'height':844});pg.locator('#count-card').select_option('isolated');assert '4 connected groups' in pg.locator('#count-measure').inner_text();assert pg.evaluate('document.documentElement.scrollWidth<=innerWidth+1')
 b.close();print('PASS catalog, sealed GLB, detached card ray, 4→3 at 100 px, summary and mobile')
