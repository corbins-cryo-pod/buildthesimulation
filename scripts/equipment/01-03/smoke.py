import io,math,os,json
from pathlib import Path
from playwright.sync_api import sync_playwright
base=os.getenv('P7_ORIGIN','http://127.0.0.1:4103')
def norm(a):
 n=math.sqrt(sum(q*q for q in a));return tuple(q/n for q in a)
def cross(a,b):return (a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0])
def dot(a,b):return sum(x*y for x,y in zip(a,b))
def hit(cv,eye,target,xyz):
 cv.scroll_into_view_if_needed();b=cv.bounding_box();f=norm(tuple(a-b for a,b in zip(target,eye)));r=norm(cross(f,(0,1,0)));up=cross(r,f);v=tuple(a-b for a,b in zip(xyz,eye));px=b['height']/(2*math.tan(math.radians(18))*dot(v,f));cv.click(position={'x':b['width']/2+dot(v,r)*px,'y':b['height']/2-dot(v,up)*px})
with sync_playwright() as p:
 kw={'args':['--no-sandbox','--use-angle=swiftshader','--enable-unsafe-swiftshader','--disable-dev-shm-usage']};
 if os.getenv('CHROME_BIN'):kw['executable_path']=os.environ['CHROME_BIN']
 b=p.chromium.launch(**kw);pg=b.new_page(viewport={'width':1200,'height':850},accept_downloads=True);pg.goto(base+'/simulations/equipment/01-03/');pg.locator('a[href="/simulations/equipment/01-03/simulator/"]').first.click();pg.locator('#p7-viewstatus').filter(has_text='Metric GLB loaded').wait_for(timeout=60000);cv=pg.locator('#p7-model')
 if os.getenv('REF_IMAGES'):
  from PIL import Image
  pg.add_style_tag(content='astro-dev-toolbar {display:none!important}')
  Image.open(io.BytesIO(cv.screenshot())).convert('RGB').save('public/equipment/01-03/station.webp',quality=88)
 hit(cv,(-.68,.57,.97),(0,.218,0),(.068,.395,.2535));assert 'resident' in pg.locator('#p7-jobs li').first.inner_text();assert 'waiting' in pg.locator('#p7-jobs li').last.inner_text()
 pg.locator('#p7-side').click();hit(cv,(-.95,.34,.19),(0,.22,0),(-.0875,.22,.05));assert 'Replace side panel' in pg.locator('#p7-panel').inner_text();pg.locator('#p7-gpu').click()
 if os.getenv('REF_IMAGES'):Image.open(io.BytesIO(cv.screenshot())).convert('RGB').save('public/equipment/01-03/gpu.webp',quality=88)
 pg.locator('#p7-run').click()
 with pg.expect_download() as a:pg.locator('#p7-export').click()
 d=json.loads(Path(a.value.path()).read_text());assert [x['kind'] for x in d['events']]==['start','complete','release','start','complete','release'] and d['allocatedBytes']==0
 pg.locator('#p7-reset').click();pg.select_option('#p7-quality','overview');pg.locator('#p7-step').click();assert pg.locator('#p7-jobs').inner_text().count('resident')==2
 pg.set_viewport_size({'width':390,'height':844});pg.locator('#p7-reset').click();assert pg.evaluate('document.documentElement.scrollWidth<=innerWidth+1');print('PASS GLB, physical power and panel rays, deterministic FIFO/full, both jobs overview, real JSON and mobile');b.close()
