import math,os,json
from pathlib import Path
from playwright.sync_api import sync_playwright
base=os.getenv('Q20_ORIGIN','http://127.0.0.1:4408')
with sync_playwright() as p:
 kw={'args':['--no-sandbox','--use-angle=swiftshader','--enable-unsafe-swiftshader','--disable-dev-shm-usage']};
 if os.getenv('CHROME_BIN'):kw['executable_path']=os.environ['CHROME_BIN']
 b=p.chromium.launch(**kw);pg=b.new_page(viewport={'width':1200,'height':850},accept_downloads=True);pg.goto(base+'/simulations/equipment/14-08/');pg.locator('a[href="/simulations/equipment/14-08/simulator/"]').first.click();pg.locator('#dsc-viewstatus').filter(has_text='Metric GLB loaded').wait_for(timeout=60000);assert '450.0 mJ' in pg.locator('#dsc-read').inner_text()
 cv=pg.locator('#dsc-model')
 if os.getenv('REF_IMAGES'):
  from PIL import Image
  import io
  pg.add_style_tag(content='astro-dev-toolbar {display:none!important}')
  Image.open(io.BytesIO(cv.screenshot())).convert('RGB').save('public/equipment/14-08/station.webp',quality=88)
 pg.locator('#dsc-cell').click();cv.scroll_into_view_if_needed();bb=cv.bounding_box();eye=(-.094,.69,.33)
 def norm(a):
  n=math.sqrt(sum(q*q for q in a));return tuple(q/n for q in a)
 def cross(a,b):return (a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0])
 def dot(a,b):return sum(x*y for x,y in zip(a,b))
 f=norm((0,-.417,-.21));r=norm(cross(f,(0,1,0)));up=cross(r,f);v=tuple(a-b for a,b in zip((-.094,.329,.122),eye));px=bb['height']/(2*math.tan(math.radians(37/2))*dot(v,f));cv.click(position={'x':bb['width']/2+dot(v,r)*px,'y':bb['height']/2-dot(v,up)*px});assert 'Lid off' in pg.locator('#dsc-state').inner_text()
 if os.getenv('REF_IMAGES'):Image.open(io.BytesIO(cv.screenshot())).convert('RGB').save('public/equipment/14-08/cell.webp',quality=88)
 pg.locator('#dsc-run').click();assert 'Close' in pg.locator('#dsc-status').inner_text();pg.locator('#dsc-ref').click();pg.locator('#dsc-lid').click();pg.locator('#dsc-run').click();assert pg.locator('#dsc-json').is_disabled() and 'both required' in pg.locator('#dsc-status').inner_text()
 pg.locator('#dsc-reset').click();pg.locator('#dsc-rate').fill('20');pg.select_option('#dsc-sign','down');pg.locator('#dsc-run').click()
 with pg.expect_download() as dl:pg.locator('#dsc-json').click()
 d=json.loads(Path(dl.value.path()).read_text());assert d['source']=='simulated' and abs(d['totalEnergyMj']-450)<1e-8 and abs(d['peakFlowMagnitudeMw']-30)<1e-8 and d['peakC']==80 and d['endothermDirection']=='down'
 with pg.expect_download() as dl:pg.locator('#dsc-csv').click()
 assert len(Path(dl.value.path()).read_text().strip().splitlines())==683
 pg.set_viewport_size({'width':390,'height':844});pg.locator('#dsc-reset').click();assert pg.evaluate('document.documentElement.scrollWidth<=innerWidth+1'),pg.evaluate('Array.from(document.querySelectorAll("#q20 *")).filter(e=>e.getBoundingClientRect().right>391).slice(0,14).map(e=>[e.tagName,e.id,e.className,e.getBoundingClientRect().right])');print('PASS metric GLB, physical lid ray, reference-pan failure, sign and rate, JSON and 681-point CSV, mobile');b.close()
