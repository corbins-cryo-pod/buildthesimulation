import io,math,os,json
from pathlib import Path
from playwright.sync_api import sync_playwright
base=os.getenv('HLT_ORIGIN','http://127.0.0.1:4809')
def norm(a):
 n=math.sqrt(sum(q*q for q in a));return tuple(q/n for q in a)
def cross(a,b):return (a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0])
def dot(a,b):return sum(x*y for x,y in zip(a,b))
def hit(cv,eye,target,xyz):
 cv.scroll_into_view_if_needed();b=cv.bounding_box();f=norm(tuple(a-b for a,b in zip(target,eye)));r=norm(cross(f,(0,1,0)));up=cross(r,f);v=tuple(a-b for a,b in zip(xyz,eye));px=b['height']/(2*math.tan(math.radians(18))*dot(v,f));cv.click(position={'x':b['width']/2+dot(v,r)*px,'y':b['height']/2-dot(v,up)*px})
with sync_playwright() as p:
 kw={'args':['--no-sandbox','--use-angle=swiftshader','--enable-unsafe-swiftshader','--disable-dev-shm-usage']};
 if os.getenv('CHROME_BIN'):kw['executable_path']=os.environ['CHROME_BIN']
 b=p.chromium.launch(**kw);pg=b.new_page(viewport={'width':1200,'height':850},accept_downloads=True);pg.goto(base+'/simulations/equipment/08-09/');pg.locator('a[href="/simulations/equipment/08-09/simulator/"]').first.click();pg.locator('#hlt-viewstatus').filter(has_text='Metric GLB loaded').wait_for(timeout=60000);cv=pg.locator('#hlt-model')
 if os.getenv('REF_IMAGES'):
  from PIL import Image
  pg.add_style_tag(content='astro-dev-toolbar {display:none!important}')
  Image.open(io.BytesIO(cv.screenshot())).convert('RGB').save('public/equipment/08-09/station.webp',quality=87);pg.locator('#hlt-port').click();Image.open(io.BytesIO(cv.screenshot())).convert('RGB').save('public/equipment/08-09/port.webp',quality=88)
 pg.locator('#hlt-run').click();assert 'blank' in pg.locator('#hlt-status').inner_text()
 pg.locator('#hlt-control').click();hit(cv,(.185,.45,.47),(.158,.369,.17),(.177,.375,.189));assert '1100 counts' in pg.locator('#hlt-state').inner_text();hit(cv,(.185,.45,.47),(.158,.369,.17),(.177,.403,.189));assert 'PASS' in pg.locator('#hlt-read').inner_text()
 pg.select_option('#hlt-fixture','high');pg.locator('#hlt-run').click();assert 'FAIL' in pg.locator('#hlt-read').inner_text()
 with pg.expect_download() as a:pg.locator('#hlt-json').click()
 d=json.loads(Path(a.value.path()).read_text());assert d['decision']=='fail' and len(d['samples'])==129 and d['calibration']['blank']['meanCount']==1100
 with pg.expect_download() as a:pg.locator('#hlt-csv').click()
 assert len(Path(a.value.path()).read_text().strip().splitlines())==131
 pg.locator('#hlt-duration').fill('3');pg.locator('#hlt-run').click();assert 'UNSTABLE' in pg.locator('#hlt-read').inner_text();pg.locator('#hlt-duration').fill('16');pg.select_option('#hlt-fixture','near');pg.locator('#hlt-run').click();assert 'INDETERMINATE' in pg.locator('#hlt-read').inner_text();pg.set_viewport_size({'width':390,'height':844});pg.locator('#hlt-reset').click();assert pg.evaluate('document.documentElement.scrollWidth<=innerWidth+1');print('PASS real GLB, physical blank/replay keys, low/high/near/unstable, JSON & CSV and mobile');b.close()
