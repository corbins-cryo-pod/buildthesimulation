import os,sys,json,math
from playwright.sync_api import sync_playwright
with sync_playwright() as p:
 b=p.chromium.launch(headless=True,executable_path=os.environ.get('CHROMIUM_PATH') or p.chromium.executable_path,args=['--no-sandbox','--disable-dev-shm-usage','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader'])
 g=b.new_page(viewport={'width':1050,'height':850},accept_downloads=True);errors=[];g.on('pageerror',lambda e:errors.append(str(e)));g.goto(sys.argv[1].rstrip('/')+'/simulations/equipment/15-13/');g.get_by_role('link',name='Open simulator').click();g.wait_for_selector('#lf-view[data-ready=true]',timeout=25000)
 g.wait_for_timeout(350);g.locator('#lf-view').screenshot(path='/tmp/bts1513-overview.png');assert 'clear · +2 mm' in g.inner_text('#lf-result')
 g.click('#lf-rear');g.click('#lf-gauge')
 # Turn the virtual block twice by physically hitting the 3D control.
 view=g.locator('#lf-view');view.scroll_into_view_if_needed();o=view.bounding_box()
 eye=(.293,.228,.328);target=(.19,.017,.001);point=(.159,.020,.065)
 dot=lambda a,b:sum(x*y for x,y in zip(a,b))
 norm=lambda a:tuple(x/math.sqrt(dot(a,a)) for x in a)
 cross=lambda a,b:(a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0])
 f=norm(tuple(a-b for a,b in zip(target,eye)));right=norm(cross(f,(0,1,0)));up=cross(right,f);delta=tuple(a-b for a,b in zip(point,eye))
 q=dot(delta,f)*math.tan(math.radians(18.5));nx=dot(delta,right)/q/(o['width']/o['height']);ny=dot(delta,up)/q
 for _ in range(2):g.mouse.click(o['x']+o['width']*(nx+1)/2,o['y']+o['height']*(1-ny)/2)
 assert '180°' in g.inner_text('#lf-result')
 g.click('#lf-check');assert 'interference · −9 mm' in g.inner_text('#lf-result')
 with g.expect_download() as d:g.click('#lf-save')
 j=json.loads(d.value.path().read_text());assert j['revision']==1 and j['turnDeg']==180 and j['signedMinimumMm']==-9 and j['seated'] is False
 g.set_viewport_size({'width':420,'height':850});g.click('#lf-reset');g.select_option('#lf-select','ZERO');g.click('#lf-check');assert 'touching · 0 mm' in g.inner_text('#lf-result')
 assert not errors,errors;print('PASS: loaded metric scene, actual 3D two-turn control, normal/touch/interference, mobile resize and exact JSON download');b.close()
