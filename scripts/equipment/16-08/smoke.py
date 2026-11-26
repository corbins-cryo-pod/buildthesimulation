import io,math,os,json
from pathlib import Path
from playwright.sync_api import sync_playwright
base=os.getenv('PIP_ORIGIN','http://127.0.0.1:4608')
def norm(a):
 n=math.sqrt(sum(q*q for q in a));return tuple(q/n for q in a)
def cross(a,b):return (a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0])
def dot(a,b):return sum(x*y for x,y in zip(a,b))
def hit(cv,eye,target,xyz):
 cv.scroll_into_view_if_needed();b=cv.bounding_box();f=norm(tuple(a-b for a,b in zip(target,eye)));r=norm(cross(f,(0,1,0)));up=cross(r,f);v=tuple(a-b for a,b in zip(xyz,eye));px=b['height']/(2*math.tan(math.radians(18))*dot(v,f));cv.click(position={'x':b['width']/2+dot(v,r)*px,'y':b['height']/2-dot(v,up)*px})
with sync_playwright() as p:
 kw={'args':['--no-sandbox','--use-angle=swiftshader','--enable-unsafe-swiftshader','--disable-dev-shm-usage']};
 if os.getenv('CHROME_BIN'):kw['executable_path']=os.environ['CHROME_BIN']
 b=p.chromium.launch(**kw);pg=b.new_page(viewport={'width':1200,'height':850},accept_downloads=True);pg.goto(base+'/simulations/equipment/16-08/');pg.locator('a[href="/simulations/equipment/16-08/simulator/"]').first.click();pg.locator('#pip-viewstatus').filter(has_text='Metric GLB loaded').wait_for(timeout=60000);cv=pg.locator('#pip-model')
 if os.getenv('REF_IMAGES'):
  from PIL import Image
  pg.add_style_tag(content='astro-dev-toolbar {display:none!important}')
  Image.open(io.BytesIO(cv.screenshot())).convert('RGB').save('public/equipment/16-08/station.webp',quality=88)
 pg.locator('#pip-run').click();assert 'Seat' in pg.locator('#pip-status').inner_text();pg.select_option('#pip-choice','other');pg.locator('#pip-attach').click();assert 'does not fit' in pg.locator('#pip-status').inner_text();pg.select_option('#pip-choice','matched');pg.locator('#pip-attach').click()
 pg.locator('#pip-dial').click()
 if os.getenv('REF_IMAGES'):Image.open(io.BytesIO(cv.screenshot())).convert('RGB').save('public/equipment/16-08/head.webp',quality=90)
 hit(cv,(.107,.313,.212),(0,.244,0),(0,.2795,0));assert '75.0' in pg.locator('#pip-source').inner_text() and '25.0' in pg.locator('#pip-destination').inner_text()
 pg.locator('#pip-setting').fill('80');pg.locator('#pip-run').click();assert 'Insufficient' in pg.locator('#pip-status').inner_text()
 with pg.expect_download() as d:pg.locator('#pip-export').click()
 r=json.loads(Path(d.value.path()).read_text());assert r['revision']==3 and r['vessels']=={'DRY-SOURCE-01':75,'DRY-RECEIVER-01':25} and r['events'][1]['childSampleId'].endswith('R3')
 pg.set_viewport_size({'width':390,'height':844});pg.locator('#pip-reset').click();assert pg.evaluate('document.documentElement.scrollWidth<=innerWidth+1');print('PASS metric GLB, physical plunger ray, fit rejection, atomic ledger rejection, export and mobile');b.close()
