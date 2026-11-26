import io,math,os,json
from pathlib import Path
from playwright.sync_api import sync_playwright
base=os.getenv('MAXTWO_ORIGIN','http://127.0.0.1:4112')
def norm(a):
 n=math.sqrt(sum(q*q for q in a));return tuple(q/n for q in a)
def cross(a,b):return (a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0])
def dot(a,b):return sum(x*y for x,y in zip(a,b))
def hit(cv,eye,target,xyz):
 cv.scroll_into_view_if_needed();b=cv.bounding_box();f=norm(tuple(a-b for a,b in zip(target,eye)));r=norm(cross(f,(0,1,0)));up=cross(r,f);v=tuple(a-b for a,b in zip(xyz,eye));px=b['height']/(2*math.tan(math.radians(18))*dot(v,f));cv.click(position={'x':b['width']/2+dot(v,r)*px,'y':b['height']/2-dot(v,up)*px})
with sync_playwright() as p:
 kw={'args':['--no-sandbox','--use-angle=swiftshader','--enable-unsafe-swiftshader','--disable-dev-shm-usage']};
 if os.getenv('CHROME_BIN'):kw['executable_path']=os.environ['CHROME_BIN']
 b=p.chromium.launch(**kw);pg=b.new_page(viewport={'width':1200,'height':850},accept_downloads=True);pg.goto(base+'/simulations/equipment/10-12/');pg.locator('a[href="/simulations/equipment/10-12/simulator/"]').first.click();pg.locator('#max-viewstatus').filter(has_text='Metric GLB loaded').wait_for(timeout=60000);cv=pg.locator('#max-model')
 if os.getenv('REF_IMAGES'):
  from PIL import Image
  pg.add_style_tag(content='astro-dev-toolbar {display:none!important}')
  Image.open(io.BytesIO(cv.screenshot())).convert('RGB').save('public/equipment/10-12/dock.webp',quality=88)
 hit(cv,(.29,.29,.53),(0,.052,0),(0,.064,.199));assert 'Close reference drawer' in pg.locator('#max-drawer').inner_text()
 pg.locator('#max-plate').click();hit(cv,(.12,.30,.43),(0,.052,.225),(-.0204,.0479,.2967));assert '3 pulses' in pg.locator('#max-read').inner_text()
 if os.getenv('REF_IMAGES'):Image.open(io.BytesIO(cv.screenshot())).convert('RGB').save('public/equipment/10-12/plate.webp',quality=90)
 def fetch():
  with pg.expect_download() as d:pg.locator('#max-json').click()
  return json.loads(Path(d.value.path()).read_text())
 a=fetch();hit(cv,(.12,.30,.43),(0,.052,.225),(.0204,.0479,.2967));assert '0 pulses' in pg.locator('#max-read').inner_text();z=fetch();assert z['wellId']=='B1' and all(v==0 for v in z['channel']['samples'])
 pg.locator('#max-unload').click();assert pg.locator('#max-json').is_disabled();pg.select_option('#max-well','A1');assert fetch()==a;pg.select_option('#max-well','B1');assert fetch()==z
 pg.set_viewport_size({'width':390,'height':844});pg.locator('#max-reset').click();assert pg.evaluate('document.documentElement.scrollWidth<=innerWidth+1');print('PASS metric GLB, physical drawer and well rays, A1/B1 isolation and unload, actual JSON and mobile');b.close()
