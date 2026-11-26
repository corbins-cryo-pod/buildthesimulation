import io,math,os,json
from pathlib import Path
from playwright.sync_api import sync_playwright
base=os.getenv('AM2100_ORIGIN','http://127.0.0.1:4115')
def norm(a):
 n=math.sqrt(sum(q*q for q in a));return tuple(q/n for q in a)
def cross(a,b):return (a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0])
def dot(a,b):return sum(x*y for x,y in zip(a,b))
def hit(cv,eye,target,xyz):
 cv.scroll_into_view_if_needed();b=cv.bounding_box();f=norm(tuple(a-b for a,b in zip(target,eye)));r=norm(cross(f,(0,1,0)));up=cross(r,f);v=tuple(a-b for a,b in zip(xyz,eye));px=b['height']/(2*math.tan(math.radians(18))*dot(v,f));cv.click(position={'x':b['width']/2+dot(v,r)*px,'y':b['height']/2-dot(v,up)*px})
with sync_playwright() as p:
 kw={'args':['--no-sandbox','--use-angle=swiftshader','--enable-unsafe-swiftshader','--disable-dev-shm-usage']};
 if os.getenv('CHROME_BIN'):kw['executable_path']=os.environ['CHROME_BIN']
 b=p.chromium.launch(**kw);pg=b.new_page(viewport={'width':1200,'height':850},accept_downloads=True);pg.goto(base+'/simulations/equipment/10-15/');pg.locator('a[href="/simulations/equipment/10-15/simulator/"]').first.click();pg.locator('#am-viewstatus').filter(has_text='Metric GLB loaded').wait_for(timeout=60000);cv=pg.locator('#am-model')
 if os.getenv('REF_IMAGES'):
  from PIL import Image
  pg.add_style_tag(content='astro-dev-toolbar {display:none!important}')
  Image.open(io.BytesIO(cv.screenshot())).convert('RGB').save('public/equipment/10-15/station.webp',quality=88)
 hit(cv,(.20,.27,.75),(.09,.058,0),(-.014,.087,.1505));assert 'No device action' in pg.locator('#am-status').inner_text()
 pg.locator('#am-board').click();hit(cv,(.48,.295,.40),(.327,.030,.093),(.326,.0287,.058));assert pg.locator('#am-slot').input_value()=='square'
 if os.getenv('REF_IMAGES'):Image.open(io.BytesIO(cv.screenshot())).convert('RGB').save('public/equipment/10-15/board.webp',quality=90)
 pg.locator('#am-place').click();assert 'mismatch' in pg.locator('#am-status').inner_text();hit(cv,(.48,.295,.40),(.327,.030,.093),(.369,.033,.059));assert pg.locator('#am-token').input_value()=='square'
 pg.locator('#am-place').click();assert 'S-AMBER' in pg.locator('#am-square').inner_text() and 'Empty' in pg.locator('#am-round').inner_text()
 with pg.expect_download() as d:pg.locator('#am-export').click()
 q=json.loads(Path(d.value.path()).read_text());assert not q['electricalConnection'] and q['slots']['round'] is None and q['revision']==2
 pg.set_viewport_size({'width':390,'height':844});pg.locator('#am-reset').click();assert pg.evaluate('document.documentElement.scrollWidth<=innerWidth+1');print('PASS metric GLB, static exterior, mock slot/token rays, blocked mismatch, JSON and mobile');b.close()
