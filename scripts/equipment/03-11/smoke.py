import io,math,os,json
from pathlib import Path
from playwright.sync_api import sync_playwright
base=os.getenv('RTP_ORIGIN','http://127.0.0.1:4311')
def norm(a):
 n=math.sqrt(sum(q*q for q in a));return tuple(q/n for q in a)
def cross(a,b):return (a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0])
def dot(a,b):return sum(x*y for x,y in zip(a,b))
def hit(cv,eye,target,xyz):
 cv.scroll_into_view_if_needed();b=cv.bounding_box();f=norm(tuple(a-b for a,b in zip(target,eye)));r=norm(cross(f,(0,1,0)));up=cross(r,f);v=tuple(a-b for a,b in zip(xyz,eye));px=b['height']/(2*math.tan(math.radians(18))*dot(v,f));cv.click(position={'x':b['width']/2+dot(v,r)*px,'y':b['height']/2-dot(v,up)*px})
with sync_playwright() as p:
 kw={'args':['--no-sandbox','--use-angle=swiftshader','--enable-unsafe-swiftshader','--disable-dev-shm-usage']};
 if os.getenv('CHROME_BIN'):kw['executable_path']=os.environ['CHROME_BIN']
 b=p.chromium.launch(**kw);pg=b.new_page(viewport={'width':1200,'height':850},accept_downloads=True);pg.goto(base+'/simulations/equipment/03-11/');pg.locator('a[href="/simulations/equipment/03-11/simulator/"]').first.click();pg.locator('#rtp-viewstatus').filter(has_text='Metric GLB loaded').wait_for(timeout=60000);cv=pg.locator('#rtp-model')
 if os.getenv('REF_IMAGES'):
  from PIL import Image
  pg.add_style_tag(content='astro-dev-toolbar {display:none!important}')
  Image.open(io.BytesIO(cv.screenshot())).convert('RGB').save('public/equipment/03-11/station.webp',quality=88)
 pg.locator('#rtp-check').click();assert 'Extend' in pg.locator('#rtp-status').inner_text()
 hit(cv,(.72,.56,1.55),(.18,.075,0),(.096,.118,.3065));assert 'Retract' in pg.locator('#rtp-drawer').inner_text()
 pg.locator('#rtp-tray').click();hit(cv,(.49,.46,.95),(.096,.108,.36),(.096,.102,.370));assert pg.locator('#rtp-read').inner_text().count('28.00')==2,pg.locator('#rtp-status').inner_text()
 if os.getenv('REF_IMAGES'):Image.open(io.BytesIO(cv.screenshot())).convert('RGB').save('public/equipment/03-11/tray.webp',quality=90)
 pg.select_option('#rtp-size','200');pg.locator('#rtp-offset').fill('5');pg.locator('#rtp-check').click();assert '-2.00' in pg.locator('#rtp-read').inner_text()
 with pg.expect_download() as d:pg.locator('#rtp-export').click()
 q=json.loads(Path(d.value.path()).read_text());assert not q['dryGeometry']['fits'] and q['machineState']=='de-energized-display-only'
 pg.set_viewport_size({'width':390,'height':844});pg.locator('#rtp-reset').click();assert pg.evaluate('document.documentElement.scrollWidth<=innerWidth+1');print('PASS metric GLB, physical drawer and tray rays, lateral checks, JSON and mobile');b.close()
