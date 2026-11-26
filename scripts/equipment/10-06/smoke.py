import io,math,os,json
from pathlib import Path
from playwright.sync_api import sync_playwright
base=os.getenv('SUTTER_ORIGIN','http://127.0.0.1:4106')
def norm(a):
 n=math.sqrt(sum(q*q for q in a));return tuple(q/n for q in a)
def cross(a,b):return (a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0])
def dot(a,b):return sum(x*y for x,y in zip(a,b))
def hit(cv,eye,target,xyz):
 cv.scroll_into_view_if_needed();b=cv.bounding_box();f=norm(tuple(a-b for a,b in zip(target,eye)));r=norm(cross(f,(0,1,0)));up=cross(r,f);v=tuple(a-b for a,b in zip(xyz,eye));px=b['height']/(2*math.tan(math.radians(18))*dot(v,f));cv.click(position={'x':b['width']/2+dot(v,r)*px,'y':b['height']/2-dot(v,up)*px})
with sync_playwright() as p:
 kw={'args':['--no-sandbox','--use-angle=swiftshader','--enable-unsafe-swiftshader','--disable-dev-shm-usage']};
 if os.getenv('CHROME_BIN'):kw['executable_path']=os.environ['CHROME_BIN']
 b=p.chromium.launch(**kw);pg=b.new_page(viewport={'width':1200,'height':850},accept_downloads=True);pg.goto(base+'/simulations/equipment/10-06/');pg.locator('a[href="/simulations/equipment/10-06/simulator/"]').first.click();pg.locator('#sut-viewstatus').filter(has_text='Metric GLB loaded').wait_for(timeout=60000);cv=pg.locator('#sut-model')
 if os.getenv('REF_IMAGES'):
  from PIL import Image
  pg.add_style_tag(content='astro-dev-toolbar {display:none!important}')
  Image.open(io.BytesIO(cv.screenshot())).convert('RGB').save('public/equipment/10-06/station.webp',quality=88)
 pg.locator('#sut-check').click();assert 'Open the visual' in pg.locator('#sut-status').inner_text()
 hit(cv,(.47,.42,.71),(0,.14,0),(0,.297,.142));assert 'Close visual cover' in pg.locator('#sut-cover').inner_text()
 pg.locator('#sut-gauge').click();hit(cv,(.099,.33,.29),(0,.161,.046),(.048,.1665,.043));assert '14.00 / 14.00' in pg.locator('#sut-read').inner_text(),pg.locator('#sut-status').inner_text()
 if os.getenv('REF_IMAGES'):Image.open(io.BytesIO(cv.screenshot())).convert('RGB').save('public/equipment/10-06/gauge.webp',quality=90)
 pg.select_option('#sut-length','100');pg.locator('#sut-center').fill('12');pg.locator('#sut-check').click();assert '0.00 / 14.00' in pg.locator('#sut-read').inner_text() and 'DOES NOT FIT' in pg.locator('#sut-read').inner_text()
 with pg.expect_download() as d:pg.locator('#sut-export').click()
 q=json.loads(Path(d.value.path()).read_text());assert not q['geometry']['fits'] and q['state']=='non-operational-visualization'
 pg.set_viewport_size({'width':390,'height':844});pg.locator('#sut-reset').click();assert pg.evaluate('document.documentElement.scrollWidth<=innerWidth+1');print('PASS metric GLB, visual cover and dry gauge rays, accepted/rejected fits, real JSON and mobile');b.close()
