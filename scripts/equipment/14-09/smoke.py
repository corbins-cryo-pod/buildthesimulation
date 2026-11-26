import math,os,json
from pathlib import Path
from playwright.sync_api import sync_playwright
base=os.getenv('E95_ORIGIN','http://127.0.0.1:4409')
with sync_playwright() as p:
 kw={'args':['--no-sandbox','--use-angle=swiftshader','--enable-unsafe-swiftshader','--disable-dev-shm-usage']};
 if os.getenv('CHROME_BIN'):kw['executable_path']=os.environ['CHROME_BIN']
 b=p.chromium.launch(**kw);pg=b.new_page(viewport={'width':1200,'height':850},accept_downloads=True);pg.goto(base+'/simulations/equipment/14-09/');pg.locator('a[href="/simulations/equipment/14-09/simulator/"]').first.click();pg.locator('#e95-viewstatus').filter(has_text='Metric GLB loaded').wait_for(timeout=60000);assert '30.61 °C' in pg.locator('#e95-read').inner_text();pg.locator('#e95-rear').click()
 # Known physical center of rear menu key projected using the site's camera.
 cv=pg.locator('#e95-model');cv.scroll_into_view_if_needed();bb=cv.bounding_box();eye=(.17,.24,-.40)
 def norm(a):
  n=math.sqrt(sum(q*q for q in a));return tuple(q/n for q in a)
 def cross(a,b):return (a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0])
 def dot(a,b):return sum(x*y for x,y in zip(a,b))
 f=norm((-.17,-.095,.40));r=norm(cross(f,(0,1,0)));up=cross(r,f);v=tuple(a-b for a,b in zip((0,.176,-.049),eye));px=bb['height']/(2*math.tan(math.pi/10)*dot(v,f));cv.click(position={'x':bb['width']/2+dot(v,r)*px,'y':bb['height']/2-dot(v,up)*px});assert 'masked' in pg.locator('#e95-read').inner_text();pg.locator('#e95-blackbody').click();assert pg.locator('#e95-read').inner_text().count('40.00 °C')==2;pg.locator('#e95-rear').click()
 if os.getenv('REF_IMAGES'):
  from PIL import Image
  import io
  pg.locator('#e95-reset').click()
  for n in ['front','rear']:
   pg.locator('#e95-'+n).click();pg.wait_for_timeout(250);Image.open(io.BytesIO(pg.locator('#e95-model').screenshot())).convert('RGB').save('public/equipment/14-09/'+n+'.webp',quality=88)
 pg.locator('#e95-blackbody').click()
 with pg.expect_download() as dl:pg.locator('#e95-json').click()
 d=json.loads(Path(dl.value.path()).read_text());assert d['source']=='simulated' and d['patches'][0]['inferredC']>39.99999
 with pg.expect_download() as dl:pg.locator('#e95-csv').click()
 assert len(Path(dl.value.path()).read_text().strip().splitlines())==10094
 pg.locator('#e95-eps').fill('0');pg.locator('#e95-capture').click();assert pg.locator('#e95-json').is_disabled() and '0.01' in pg.locator('#e95-status').inner_text()
 pg.set_viewport_size({'width':390,'height':844});pg.locator('#e95-reset').click();assert pg.evaluate('document.documentElement.scrollWidth<=innerWidth+1');print('PASS actual GLB, record links, emissivity and blackbody, JSON and 10,092-bin CSV, invalid setting and mobile');b.close()
