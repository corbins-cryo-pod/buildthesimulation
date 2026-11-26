import os,sys,json,math
from playwright.sync_api import sync_playwright
with sync_playwright() as p:
 b=p.chromium.launch(headless=True,executable_path=os.environ.get('CHROMIUM_PATH') or p.chromium.executable_path,args=['--no-sandbox','--disable-dev-shm-usage','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader'])
 g=b.new_page(viewport={'width':1050,'height':850},accept_downloads=True);errors=[];g.on('pageerror',lambda e:errors.append(str(e)));g.goto(sys.argv[1].rstrip('/')+'/simulations/equipment/07-05/');g.get_by_role('link',name='Open simulator').click();g.wait_for_selector('#s3-view[data-ready=true]',timeout=27000)
 g.locator('#s3-view').screenshot(path=os.environ.get('S3_SHOT','/tmp/bts-s3-actual.png'));assert '48 / 256 pixels marked (18.75%)' in g.inner_text('#s3-result')
 g.click('#s3-graphic');g.click('#s3-B');assert '0 / 256 pixels marked (0.00%)' in g.inner_text('#s3-result')
 # Click actual U control on the detached GLB reader from known camera/position.
 view=g.locator('#s3-view');view.scroll_into_view_if_needed();o=view.bounding_box()
 eye=(.723,.346,.868);target=(.724,.24,.155);point=(.830,.137,.178)
 dot=lambda a,b:sum(x*y for x,y in zip(a,b))
 norm=lambda a:tuple(x/math.sqrt(dot(a,a)) for x in a)
 cross=lambda a,b:(a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0])
 f=norm(tuple(a-b for a,b in zip(target,eye)));right=norm(cross(f,(0,1,0)));up=cross(right,f);delta=tuple(a-b for a,b in zip(point,eye))
 q=dot(delta,f)*math.tan(math.radians(18.5));nx=dot(delta,right)/q/(o['width']/o['height']);ny=dot(delta,up)/q
 g.mouse.click(o['x']+o['width']*(nx+1)/2,o['y']+o['height']*(1-ny)/2)
 assert 'mask absent' in g.inner_text('#s3-result')
 with g.expect_download() as d:g.click('#s3-save')
 r=json.loads(d.value.path().read_text());assert r['sampleId']=='BTS-STATIC-GRAPHIC-01' and r['region']=='U' and r['revision']==1 and r['markedFraction'] is None and r['markedAreaMm2'] is None
 assert not errors,errors;print('PASS: linked metric microscope and blank controller, known normal/blank, actual 3D selection of missing mask and immutable JSON');b.close()
