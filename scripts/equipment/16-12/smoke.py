import io,math,os,json
from pathlib import Path
from playwright.sync_api import sync_playwright
base=os.getenv('WARE_ORIGIN','http://127.0.0.1:4612')
def norm(a):
 n=math.sqrt(sum(q*q for q in a));return tuple(q/n for q in a)
def cross(a,b):return (a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0])
def dot(a,b):return sum(x*y for x,y in zip(a,b))
def hit(cv,eye,target,xyz):
 cv.scroll_into_view_if_needed();b=cv.bounding_box();f=norm(tuple(a-b for a,b in zip(target,eye)));r=norm(cross(f,(0,1,0)));up=cross(r,f);v=tuple(a-b for a,b in zip(xyz,eye));px=b['height']/(2*math.tan(math.radians(18))*dot(v,f));cv.click(position={'x':b['width']/2+dot(v,r)*px,'y':b['height']/2-dot(v,up)*px})
with sync_playwright() as p:
 kw={'args':['--no-sandbox','--use-angle=swiftshader','--enable-unsafe-swiftshader','--disable-dev-shm-usage']};
 if os.getenv('CHROME_BIN'):kw['executable_path']=os.environ['CHROME_BIN']
 b=p.chromium.launch(**kw);pg=b.new_page(viewport={'width':1200,'height':850},accept_downloads=True);pg.goto(base+'/simulations/equipment/16-12/');pg.locator('a[href="/simulations/equipment/16-12/simulator/"]').first.click();pg.locator('#ware-viewstatus').filter(has_text='96 instances').wait_for(timeout=60000);cv=pg.locator('#ware-model')
 if os.getenv('REF_IMAGES'):
  from PIL import Image
  pg.add_style_tag(content='astro-dev-toolbar {display:none!important}')
  Image.open(io.BytesIO(cv.screenshot())).convert('RGB').save('public/equipment/16-12/kit.webp',quality=88)
 pg.locator('#ware-put').click();assert '80 / 200' in pg.locator('#ware-selectedlabel').inner_text()
 pg.locator('#ware-plate').click();hit(cv,(.058,.207,.122),(.034,.014,.020),(-.0065,.00758,.0515));assert 'A2' in pg.locator('#ware-selectedlabel').inner_text(),pg.locator('#ware-selectedlabel').inner_text();pg.select_option('#ware-label','amber');pg.locator('#ware-volume').fill('110');pg.locator('#ware-put').click()
 if os.getenv('REF_IMAGES'):Image.open(io.BytesIO(cv.screenshot())).convert('RGB').save('public/equipment/16-12/plate.webp',quality=90)
 pg.locator('#ware-move').click();pg.locator('[data-well=A1]').click();pg.locator('#ware-volume').fill('150');pg.locator('#ware-put').click();assert 'Overfill rejected' in pg.locator('#ware-status').inner_text()
 with pg.expect_download() as d:pg.locator('#ware-export').click()
 r=json.loads(Path(d.value.path()).read_text());assert r['fixtureRevision']==4 and r['rackPose']['originGlbMm']==[86,0,45] and r['slots']['A1']['totalUl']==80 and r['slots']['A2']['totalUl']==110 and r['slots']['A2']['entries'][0]['label']=='amber'
 pg.locator('#ware-lid').click();pg.locator('#ware-put').click();assert 'Remove the plate cover' in pg.locator('#ware-status').inner_text()
 pg.set_viewport_size({'width':390,'height':844});pg.locator('#ware-reset').click();assert pg.evaluate('document.documentElement.scrollWidth<=innerWidth+1');print('PASS metric GLB, instanced physical well pick, two dry placements, rack move, overfill rejection, JSON and mobile');b.close()
