import os,sys,json,math
from playwright.sync_api import sync_playwright
with sync_playwright() as p:
 b=p.chromium.launch(headless=True,executable_path=os.environ.get('CHROMIUM_PATH') or p.chromium.executable_path,args=['--no-sandbox','--disable-dev-shm-usage','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader'])
 g=b.new_page(viewport={'width':1050,'height':850},accept_downloads=True);errors=[];g.on('pageerror',lambda e:errors.append(str(e)));g.goto(sys.argv[1].rstrip('/')+'/simulations/equipment/11-02/');g.get_by_role('link',name='Open simulator').click();g.wait_for_selector('#di-view[data-ready=true]',timeout=25000)
 g.locator('#di-view').screenshot(path=os.environ.get('DI_SHOT','/tmp/bts-doric-actual.png'));assert 'all three shapes match' in g.inner_text('#di-result')
 g.click('#di-module');g.click('#di-tile');g.click('#di-B');assert 'missing square · duplicate triangle' in g.inner_text('#di-result')
 # Click the actual U key of the detached 3D viewer.
 view=g.locator('#di-view');view.scroll_into_view_if_needed();o=view.bounding_box()
 eye=(.177,.124,.321);target=(.178,.08,.055);point=(.220,.044,.059)
 dot=lambda a,b:sum(x*y for x,y in zip(a,b))
 norm=lambda a:tuple(x/math.sqrt(dot(a,a)) for x in a)
 cross=lambda a,b:(a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0])
 f=norm(tuple(a-b for a,b in zip(target,eye)));right=norm(cross(f,(0,1,0)));up=cross(right,f);delta=tuple(a-b for a,b in zip(point,eye))
 q=dot(delta,f)*math.tan(math.radians(18));nx=dot(delta,right)/q/(o['width']/o['height']);ny=dot(delta,up)/q
 g.mouse.click(o['x']+o['width']*(nx+1)/2,o['y']+o['height']*(1-ny)/2)
 assert 'no tile supplied · result unknown' in g.inner_text('#di-result')
 with g.expect_download() as d:g.click('#di-save')
 r=json.loads(d.value.path().read_text());assert r['id']=='U' and r['matches'] is None and r['revision']==1 and r['artifactId']=='BTS-GENERIC-SYMBOL-CARD-01'
 assert not errors,errors;print('PASS: two dormant exteriors, normal/mismatch/absent symbolic cards, actual 3D ray hit and JSON');b.close()
