import io,math,os,json
from pathlib import Path
from playwright.sync_api import sync_playwright
base=os.getenv('CPD_ORIGIN','http://127.0.0.1:4311')
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
 pg.goto(base+'/simulations/equipment/13-11/');pg.locator('a[href="/simulations/equipment/13-11/simulator/"]').first.click()
 pg.locator('#cpd-viewstatus').filter(has_text='Metric GLB loaded').wait_for(timeout=60000);cv=pg.locator('#cpd-model')
 assert pg.locator('#cpd-volume').inner_text()=='1'
 if os.getenv('REF_IMAGES'):
  from PIL import Image
  pg.add_style_tag(content='astro-dev-toolbar {display:none!important}')
  Image.open(io.BytesIO(cv.screenshot())).convert('RGB').save('public/equipment/13-11/station.webp',quality=89)
 pg.locator('#cpd-rear').click()
 if os.getenv('REF_IMAGES'):Image.open(io.BytesIO(cv.screenshot())).convert('RGB').save('public/equipment/13-11/rear.webp',quality=89)
 pg.locator('#cpd-board').click();hit(cv,(.52,.39,.54),(.34,.083,.14),(.390,.1255,.141));assert pg.locator('#cpd-volume').inner_text()=='3.375'
 pg.locator('#cpd-ratio').select_option('0.5');assert pg.locator('#cpd-volume').inner_text()=='0.125'
 with pg.expect_download() as d:pg.locator('#cpd-export').click()
 q=json.loads(Path(d.value.path()).read_text());assert q['volumeRatio']==.125 and not q['deviceConnection']
 pg.set_viewport_size({'width':390,'height':844});pg.locator('#cpd-next').click();assert pg.locator('#cpd-volume').inner_text()=='1';assert pg.evaluate('document.documentElement.scrollWidth<=innerWidth+1')
 b.close();print('PASS catalogue, static metric GLB, rear, detached cube ray, 3.375/.125 controls/JSON and mobile')
