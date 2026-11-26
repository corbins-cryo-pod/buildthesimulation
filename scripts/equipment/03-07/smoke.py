import io,math,os,json
from pathlib import Path
from playwright.sync_api import sync_playwright
base=os.getenv('OXFORD_ORIGIN','http://127.0.0.1:4307')
def norm(a):
 n=math.sqrt(sum(q*q for q in a));return tuple(q/n for q in a)
def cross(a,b):return (a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0])
def dot(a,b):return sum(x*y for x,y in zip(a,b))
def hit(cv,eye,target,xyz):
 cv.scroll_into_view_if_needed();b=cv.bounding_box();f=norm(tuple(a-b for a,b in zip(target,eye)));r=norm(cross(f,(0,1,0)));up=cross(r,f);v=tuple(a-b for a,b in zip(xyz,eye));px=b['height']/(2*math.tan(math.radians(18))*dot(v,f));cv.click(position={'x':b['width']/2+dot(v,r)*px,'y':b['height']/2-dot(v,up)*px})
with sync_playwright() as p:
 kw={'args':['--no-sandbox','--use-angle=swiftshader','--enable-unsafe-swiftshader','--disable-dev-shm-usage']};
 if os.getenv('CHROME_BIN'):kw['executable_path']=os.environ['CHROME_BIN']
 b=p.chromium.launch(**kw);pg=b.new_page(viewport={'width':1200,'height':850},accept_downloads=True);pg.goto(base+'/simulations/equipment/03-07/');pg.locator('a[href="/simulations/equipment/03-07/simulator/"]').first.click();pg.locator('#ox-viewstatus').filter(has_text='Metric GLB loaded').wait_for(timeout=60000);cv=pg.locator('#ox-model')
 if os.getenv('REF_IMAGES'):
  from PIL import Image
  pg.add_style_tag(content='astro-dev-toolbar {display:none!important}')
  Image.open(io.BytesIO(cv.screenshot())).convert('RGB').save('public/equipment/03-07/station.webp',quality=88)
 pg.locator('#ox-check').click();assert 'cutaway' in pg.locator('#ox-status').inner_text()
 hit(cv,(1.42,1.65,2.57),(.22,.72,0),(-.024,1.340,.322));assert 'Return exterior' in pg.locator('#ox-inspect').inner_text(),pg.locator('#ox-status').inner_text()
 pg.locator('#ox-stage').click();hit(cv,(.22,1.49,.67),(-.024,1.19,.096),(-.024,1.186,.096));assert '10.00 mm' in pg.locator('#ox-read').inner_text(),pg.locator('#ox-status').inner_text()
 if os.getenv('REF_IMAGES'):Image.open(io.BytesIO(cv.screenshot())).convert('RGB').save('public/equipment/03-07/stage.webp',quality=90)
 pg.locator('#ox-x').fill('6');pg.locator('#ox-z').fill('8');pg.select_option('#ox-map','thick');pg.locator('#ox-check').click();assert '0.00 mm' in pg.locator('#ox-read').inner_text()
 with pg.expect_download() as d:pg.locator('#ox-export').click()
 q=json.loads(Path(d.value.path()).read_text());assert q['geometry']['fits'] and q['map']['nominalCenterNm']==800 and q['processStateChanged'] is False
 pg.select_option('#ox-size','140');pg.locator('#ox-check').click();assert 'DOES NOT FIT' in pg.locator('#ox-read').inner_text()
 pg.set_viewport_size({'width':390,'height':844});pg.locator('#ox-reset').click();assert pg.evaluate('document.documentElement.scrollWidth<=innerWidth+1');print('PASS metric GLB, cutaway/stage rays, circular fit/tangency, frozen-map JSON, mobile');b.close()
