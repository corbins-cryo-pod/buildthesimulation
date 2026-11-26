import io,math,os,json
from pathlib import Path
from playwright.sync_api import sync_playwright
base=os.getenv('EN_ORIGIN','http://127.0.0.1:5510')
def norm(a):
 n=math.sqrt(sum(q*q for q in a));return tuple(q/n for q in a)
def cross(a,b):return (a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0])
def dot(a,b):return sum(x*y for x,y in zip(a,b))
def hit(cv,eye,target,xyz):
 cv.scroll_into_view_if_needed();b=cv.bounding_box();f=norm(tuple(a-b for a,b in zip(target,eye)));r=norm(cross(f,(0,1,0)));up=cross(r,f);v=tuple(a-b for a,b in zip(xyz,eye));px=b['height']/(2*math.tan(math.radians(18))*dot(v,f));cv.click(position={'x':b['width']/2+dot(v,r)*px,'y':b['height']/2-dot(v,up)*px})
with sync_playwright() as p:
 kw={'args':['--no-sandbox','--use-angle=swiftshader','--enable-unsafe-swiftshader','--disable-dev-shm-usage']};ch=os.getenv('CHROME_BIN')
 if ch:kw['executable_path']=ch
 b=p.chromium.launch(**kw);pg=b.new_page(viewport={'width':1200,'height':850},accept_downloads=True);pg.goto(base+'/simulations/equipment/15-10/');pg.locator('a[href="/simulations/equipment/15-10/simulator/"]').first.click()
 pg.locator('#en-viewstatus').filter(has_text='Metric GLB loaded').wait_for(timeout=60000);cv=pg.locator('#en-model')
 art=pg.locator('#en-art').inner_html();assert '5 row steps · 20 graphic units' in pg.locator('#en-readout').inner_text()
 if os.getenv('REF_IMAGES'):
  from PIL import Image
  pg.add_style_tag(content='astro-dev-toolbar {display:none!important}')
  Image.open(io.BytesIO(cv.screenshot())).convert('RGB').save('public/equipment/15-10/station.webp',quality=89)
 pg.locator('#en-case').click()
 if os.getenv('REF_IMAGES'):Image.open(io.BytesIO(cv.screenshot())).convert('RGB').save('public/equipment/15-10/case.webp',quality=89)
 pg.locator('#en-board').click();hit(cv,(.89,1.35,.84),(.65,.756,.205),(.754,.783,.283))
 assert 'Column D · missing lower mark; no result' in pg.locator('#en-readout').inner_text() and pg.locator('#en-gap').get_attribute('visibility')=='hidden'
 assert pg.locator('#en-art').inner_html()==art
 with pg.expect_download() as d:pg.locator('#en-export').click()
 q=json.loads(Path(d.value.path()).read_text());assert q['separationGraphicUnits'] is None and not q['deviceConnection']
 pg.set_viewport_size({'width':390,'height':844});pg.locator('#en-column').select_option('5');assert 'Column F · 5 row steps' in pg.locator('#en-readout').inner_text();assert pg.evaluate('document.documentElement.scrollWidth<=innerWidth+1')
 b.close();print('PASS catalog, genuine inactive GLB, detached ray, immutable paired/missing, null JSON and mobile')
