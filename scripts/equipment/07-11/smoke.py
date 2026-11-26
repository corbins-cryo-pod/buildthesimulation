import os,sys,json,math
from playwright.sync_api import sync_playwright
with sync_playwright() as p:
 b=p.chromium.launch(headless=True,executable_path=os.environ.get('CHROMIUM_PATH') or p.chromium.executable_path,args=['--no-sandbox','--disable-dev-shm-usage','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader'])
 g=b.new_page(viewport={'width':1050,'height':850},accept_downloads=True);errors=[];g.on('pageerror',lambda e:errors.append(str(e)));g.goto(sys.argv[1].rstrip('/')+'/simulations/equipment/07-11/');g.get_by_role('link',name='Open simulator').click();g.wait_for_selector('#i3-view[data-ready=true]',timeout=25000)
 g.locator('#i3-view').screenshot(path=os.environ.get('I3_SHOT','/tmp/bts-i3x-actual.png'));assert 'source mean 25.00 a.u. · 0 above' in g.inner_text('#i3-result')
 g.click('#i3-chart');g.click('#i3-B');assert 'source mean 48.25 a.u. · 2 above' in g.inner_text('#i3-result')
 with g.expect_download() as d:g.click('#i3-save')
 r=json.loads(d.value.path().read_text());assert r['authoredAu']==[18,70,50,55] and r['displayAu']==[18,50,50,50] and r['artifactId']=='GENERIC-INTENSITY-CARD-01'
 # Click the actual U key of the independent 3D chart, using exported anchor location.
 view=g.locator('#i3-view');view.scroll_into_view_if_needed();o=view.bounding_box()
 eye=(.364,.329,.802);target=(.365,.24,.189);point=(.457,.141,.194)
 dot=lambda a,b:sum(x*y for x,y in zip(a,b))
 norm=lambda a:tuple(x/math.sqrt(dot(a,a)) for x in a)
 cross=lambda a,b:(a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0])
 f=norm(tuple(a-b for a,b in zip(target,eye)));right=norm(cross(f,(0,1,0)));up=cross(right,f);delta=tuple(a-b for a,b in zip(point,eye))
 q=dot(delta,f)*math.tan(math.radians(18.5));nx=dot(delta,right)/q/(o['width']/o['height']);ny=dot(delta,up)/q
 g.mouse.click(o['x']+o['width']*(nx+1)/2,o['y']+o['height']*(1-ny)/2)
 assert 'source absent · no intensity estimates' in g.inner_text('#i3-result')
 with g.expect_download() as d:g.click('#i3-save')
 r=json.loads(d.value.path().read_text());assert r['tag']=='U' and r['meanAuthoredAu'] is None and r['revision']==1
 assert not errors,errors;print('PASS: closed cabinet, independent ordinary/above scale cases, 3D absent-chart pick and JSON');b.close()
