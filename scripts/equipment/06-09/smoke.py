import os,sys,json,math
from playwright.sync_api import sync_playwright
with sync_playwright() as p:
 b=p.chromium.launch(headless=True,executable_path=os.environ.get('CHROMIUM_PATH') or p.chromium.executable_path,args=['--no-sandbox','--disable-dev-shm-usage','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader'])
 g=b.new_page(viewport={'width':930,'height':850},accept_downloads=True);errors=[];g.on('pageerror',lambda e:errors.append(str(e)));g.goto(sys.argv[1].rstrip('/')+'/simulations/equipment/06-09/');g.get_by_role('link',name='Open simulator').click();g.wait_for_selector('#ne-view[data-ready=true]',timeout=25000)
 g.locator('#ne-view').screenshot(path=os.environ.get('NE_SHOT','/tmp/bts-ne1000-actual.png'));assert 'clear · per-side clearance 2.0 / 1.0' in g.inner_text('#ne-result')
 g.click('#ne-card');g.click('#ne-B');assert 'boundary · per-side clearance 0.0 / 0.0' in g.inner_text('#ne-result')
 # Hit the 3D C key using its actual exported local placement and the close-up camera.
 view=g.locator('#ne-view');view.scroll_into_view_if_needed();o=view.bounding_box()
 eye=(.22,.15,.40);target=(.221,.105,.04);point=(.269,.051,.044)
 dot=lambda a,b:sum(x*y for x,y in zip(a,b))
 norm=lambda a:tuple(x/math.sqrt(dot(a,a)) for x in a)
 cross=lambda a,b:(a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0])
 f=norm(tuple(a-b for a,b in zip(target,eye)));right=norm(cross(f,(0,1,0)));up=cross(right,f);delta=tuple(a-b for a,b in zip(point,eye))
 q=dot(delta,f)*math.tan(math.radians(18));nx=dot(delta,right)/q/(o['width']/o['height']);ny=dot(delta,up)/q
 g.mouse.click(o['x']+o['width']*(nx+1)/2,o['y']+o['height']*(1-ny)/2);assert 'interference · per-side clearance -0.5 / 0.5' in g.inner_text('#ne-result')
 with g.expect_download() as d:g.click('#ne-save')
 r=json.loads(d.value.path().read_text());assert r['sampleId']=='GENERIC-DIMENSION-CARD-01' and r['tag']=='C' and r['revision']==1 and r['clearancePerSideMm']==[-.5,.5]
 assert not errors,errors;print('PASS: documentary chassis and detached clear/boundary/interference chart with immutable JSON');b.close()
