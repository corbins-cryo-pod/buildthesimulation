import os,sys,json,math
from playwright.sync_api import sync_playwright
with sync_playwright() as p:
 b=p.chromium.launch(headless=True,executable_path=os.environ.get('CHROMIUM_PATH') or p.chromium.executable_path,args=['--no-sandbox','--disable-dev-shm-usage','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader'])
 g=b.new_page(viewport={'width':1050,'height':850},accept_downloads=True);errors=[];g.on('pageerror',lambda e:errors.append(str(e)));g.goto(sys.argv[1].rstrip('/')+'/simulations/equipment/11-07/');g.get_by_role('link',name='Open simulator').click();g.wait_for_selector('#tt-view[data-ready=true]',timeout=25000)
 g.locator('#tt-view').screenshot(path=os.environ.get('TT_SHOT','/tmp/bts-thor-actual.png'));assert '1250 nm' in g.inner_text('#tt-result')
 g.click('#tt-module');g.click('#tt-card')
 # Change units by clicking the actual 3D chart control once.
 view=g.locator('#tt-view');view.scroll_into_view_if_needed();o=view.bounding_box()
 eye=(.114,.112,.283);target=(.113,.078,.04);point=(.162,.040,.043)
 dot=lambda a,b:sum(x*y for x,y in zip(a,b))
 norm=lambda a:tuple(x/math.sqrt(dot(a,a)) for x in a)
 cross=lambda a,b:(a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0])
 f=norm(tuple(a-b for a,b in zip(target,eye)));right=norm(cross(f,(0,1,0)));up=cross(right,f);delta=tuple(a-b for a,b in zip(point,eye))
 q=dot(delta,f)*math.tan(math.radians(18.5));nx=dot(delta,right)/q/(o['width']/o['height']);ny=dot(delta,up)/q
 g.mouse.click(o['x']+o['width']*(nx+1)/2,o['y']+o['height']*(1-ny)/2)
 assert '1.25 µm' in g.inner_text('#tt-result')
 g.click('#tt-B');assert '0.00075 µm' in g.inner_text('#tt-result')
 with g.expect_download() as d:g.click('#tt-save')
 r=json.loads(d.value.path().read_text());assert r['tag']=='B' and r['canonicalPicometers']==750 and r['nanometers']==.75 and r['micrometers']==.00075 and r['revision']==1
 g.click('#tt-U');assert 'no printed value' in g.inner_text('#tt-result')
 assert not errors,errors;print('PASS: two dormant metric exteriors, real 3D unit-toggle ray, nonzero edge, absent card and immutable JSON');b.close()
