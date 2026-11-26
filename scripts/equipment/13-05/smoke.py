import io,math,os,json
from pathlib import Path
from playwright.sync_api import sync_playwright
base=os.getenv('JEM_ORIGIN','http://127.0.0.1:4305')
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
 pg.goto(base+'/simulations/equipment/13-05/');pg.locator('a[href="/simulations/equipment/13-05/simulator/"]').first.click()
 pg.locator('#jem-viewstatus').filter(has_text='Metric GLB loaded').wait_for(timeout=60000);cv=pg.locator('#jem-model')
 assert '0.23 nm (2.3 Å)' in pg.locator('#jem-result').inner_text()
 if os.getenv('REF_IMAGES'):
  from PIL import Image
  pg.add_style_tag(content='astro-dev-toolbar {display:none!important}')
  Image.open(io.BytesIO(cv.screenshot())).convert('RGB').save('public/equipment/13-05/station.webp',quality=89)
 pg.locator('#jem-column').click()
 if os.getenv('REF_IMAGES'):Image.open(io.BytesIO(cv.screenshot())).convert('RGB').save('public/equipment/13-05/column.webp',quality=89)
 pg.locator('#jem-board').click();hit(cv,(2.08,1.68,1.78),(1.51,.65,.628),(1.52,.6685,.638));assert '0.41 nm (4.1 Å)' in pg.locator('#jem-result').inner_text()
 with pg.expect_download() as d:pg.locator('#jem-export').click()
 q=json.loads(Path(d.value.path()).read_text());assert abs(q['pitchNm']-.41)<1e-12 and q['spanPx']==164 and not q['deviceConnection']
 pg.set_viewport_size({'width':390,'height':844});pg.locator('#jem-plate').select_option('fine');assert '92 px' in pg.locator('#jem-result').inner_text();assert pg.evaluate('document.documentElement.scrollWidth<=innerWidth+1')
 b.close();print('PASS catalogue, metric GLB, column close-up, separate board ray, fixed 0.23/0.41 nm, JSON and mobile dropdown')
