import os,sys,json,math
from playwright.sync_api import sync_playwright
with sync_playwright() as p:
 b=p.chromium.launch(headless=True,executable_path=os.environ.get('CHROMIUM_PATH') or p.chromium.executable_path,args=['--no-sandbox','--disable-dev-shm-usage','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader'])
 g=b.new_page(viewport={'width':1050,'height':850},accept_downloads=True);errors=[];g.on('pageerror',lambda e:errors.append(str(e)));g.goto(sys.argv[1].rstrip('/')+'/simulations/equipment/15-05/');g.get_by_role('link',name='Open simulator').click();g.wait_for_selector('#bp-view[data-ready=true]',timeout=25000)
 g.locator('#bp-view').screenshot(path='/tmp/bts-biospec-front.png');assert '(18, -15, 20)' in g.inner_text('#bp-result')
 g.click('#bp-rear');g.wait_for_timeout(120);g.locator('#bp-view').screenshot(path='/tmp/bts-biospec-rear.png')
 g.click('#bp-bore');g.click('#bp-card')
 # Use the actual metric B node in the 3D chart through a ray, not the external button.
 view=g.locator('#bp-view');view.scroll_into_view_if_needed();o=view.bounding_box()
 eye=(1.46,1.69,1.62);target=(1.24,1.11,.20);point=(1.24,.931,.231)
 dot=lambda a,b:sum(x*y for x,y in zip(a,b))
 norm=lambda a:tuple(x/math.sqrt(dot(a,a)) for x in a)
 cross=lambda a,b:(a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0])
 f=norm(tuple(a-b for a,b in zip(target,eye)));right=norm(cross(f,(0,1,0)));up=cross(right,f);delta=tuple(a-b for a,b in zip(point,eye))
 q=dot(delta,f)*math.tan(math.radians(18.5));nx=dot(delta,right)/q/(o['width']/o['height']);ny=dot(delta,up)/q
 g.mouse.click(o['x']+o['width']*(nx+1)/2,o['y']+o['height']*(1-ny)/2)
 assert '(14.5, -10, 16)' in g.inner_text('#bp-result') and '7.297 mm' in g.inner_text('#bp-result')
 with g.expect_download() as d:g.click('#bp-save')
 r=json.loads(d.value.path().read_text());assert r['cardId']=='BTS-ORTHO-CARD-01505' and r['revision']==1 and r['fiducial']['xyzMm']==[14.5,-10,16] and [t['axisOrder'] for t in r['projections']]==['XY','XZ','YZ']
 g.set_viewport_size({'width':420,'height':800});g.click('#bp-U');assert 'valid corner' in g.inner_text('#bp-result') and 'no fiducial' in g.inner_text('#bp-result')
 assert not errors,errors;print('PASS: real 3D ray to B, metre-scaled shell, normal and absent cards, mobile viewport, export provenance');b.close()
