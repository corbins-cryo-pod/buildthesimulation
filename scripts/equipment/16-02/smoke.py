import io,math,os,json
from pathlib import Path
from playwright.sync_api import sync_playwright
base=os.getenv('SHIELD_ORIGIN','http://127.0.0.1:4602')
def norm(a):
 n=math.sqrt(sum(q*q for q in a));return tuple(q/n for q in a)
def cross(a,b):return (a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0])
def dot(a,b):return sum(x*y for x,y in zip(a,b))
def hit(cv,eye,target,xyz):
 cv.scroll_into_view_if_needed();b=cv.bounding_box();f=norm(tuple(a-b for a,b in zip(target,eye)));r=norm(cross(f,(0,1,0)));up=cross(r,f);v=tuple(a-b for a,b in zip(xyz,eye));px=b['height']/(2*math.tan(math.radians(18))*dot(v,f));cv.click(position={'x':b['width']/2+dot(v,r)*px,'y':b['height']/2-dot(v,up)*px})
with sync_playwright() as p:
 kw={'args':['--no-sandbox','--use-angle=swiftshader','--enable-unsafe-swiftshader','--disable-dev-shm-usage']};
 if os.getenv('CHROME_BIN'):kw['executable_path']=os.environ['CHROME_BIN']
 b=p.chromium.launch(**kw);pg=b.new_page(viewport={'width':1200,'height':850},accept_downloads=True);pg.goto(base+'/simulations/equipment/16-02/');pg.locator('a[href="/simulations/equipment/16-02/simulator/"]').first.click();pg.locator('#shield-viewstatus').filter(has_text='Metric GLB loaded').wait_for(timeout=60000);cv=pg.locator('#shield-model')
 assert '20.000 µV' in pg.locator('#shield-read').inner_text()
 if os.getenv('REF_IMAGES'):
  from PIL import Image
  pg.add_style_tag(content='astro-dev-toolbar {display:none!important}')
  Image.open(io.BytesIO(cv.screenshot())).convert('RGB').save('public/equipment/16-02/closed.webp',quality=88)
 hit(cv,(.65,.61,1.10),(0,.30,0),(.238,.358,.3015));assert '200.00 µV' in pg.locator('#shield-read').inner_text()
 if os.getenv('REF_IMAGES'):Image.open(io.BytesIO(cv.screenshot())).convert('RGB').save('public/equipment/16-02/open.webp',quality=88)
 pg.locator('#shield-door').click();pg.locator('#shield-side').click();hit(cv,(.95,.35,.25),(.25,.20,.12),(.313,.203,.171));assert 'Missing trace' in pg.locator('#shield-read').inner_text() and pg.locator('#shield-export').is_disabled()
 pg.locator('#shield-feed').click();hit(cv,(.95,.35,.25),(.25,.20,.12),(.313,.144,.171));assert '200.00 µV' in pg.locator('#shield-read').inner_text()
 with pg.expect_download() as a:pg.locator('#shield-export').click()
 d=json.loads(Path(a.value.path()).read_text());assert d['schema']=='bts.analog-waveform.v1' and len(d['channels'][0]['samples'])==1000 and not d['provenance']['settings']['grounded']
 pg.set_viewport_size({'width':390,'height':844});pg.locator('#shield-reset').click();assert pg.evaluate('document.documentElement.scrollWidth<=innerWidth+1');print('PASS metric GLB, named physical door/feedthrough/ground, 200→20 µV, typed waveform download and mobile');b.close()
