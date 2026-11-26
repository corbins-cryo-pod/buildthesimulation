"""Browser regression and (optionally) original reference sheet generator. No headset test."""
from pathlib import Path
from PIL import Image,ImageDraw,ImageFont,ImageChops
from playwright.sync_api import sync_playwright
import os,io,json,tempfile,math
url=os.environ.get('DEVICE_URL','http://127.0.0.1:4507/simulations/equipment/05-07/simulator/')
files=os.environ.get('REFERENCE_OUTPUT')
with sync_playwright() as p:
 kw={'headless':True,'args':['--no-sandbox','--enable-unsafe-swiftshader','--use-angle=swiftshader']}
 if os.getenv('CHROME_BIN'):kw['executable_path']=os.environ['CHROME_BIN']
 if os.getenv('LIVE_PROXY'):kw['proxy']={'server':os.environ['LIVE_PROXY']}
 b=p.chromium.launch(**kw);c=b.new_context(viewport={'width':1420,'height':920},ignore_https_errors=True,accept_downloads=True);pg=c.new_page();errors=[];pg.on('pageerror',lambda e:errors.append(str(e)));q=lambda name:pg.locator('#ps-'+name)
 assert pg.goto(url.removesuffix('simulator/'),wait_until='domcontentloaded',timeout=60000).ok
 pg.locator('a[href$="/05-07/simulator/"]').first.click()
 pg.wait_for_function("document.querySelector('#ps-ready')?.textContent.includes('3D asset loaded')",timeout=90000)
 print(q('ready').inner_text(),flush=True)
 mesh=q('stage').locator('canvas');box=mesh.bounding_box();eye=(1.01,.89,1.86);look=(.055,.395,.045);target=(.021,.190,.231)
 dot=lambda a,b:sum(x*y for x,y in zip(a,b))
 cross=lambda a,b:(a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0])
 normalize=lambda a:tuple(x/math.hypot(*a) for x in a)
 forward=normalize(tuple(x-y for x,y in zip(look,eye)));right=normalize(cross(forward,(0,1,0)));up=cross(right,forward)
 delta=tuple(x-y for x,y in zip(target,eye));f=box['height']/(2*math.tan(math.radians(18))*dot(delta,forward))
 mesh.click(position={'x':box['width']/2+f*dot(delta,right),'y':box['height']/2-f*dot(delta,up)})
 assert q('shield').inner_text()=='Close shield',q('status').inner_text()
 q('shield').click()
 q('run').click();assert 'OPEN CONTACT' in q('results').inner_text()
 q('demo').click();assert '1000.00 Ω' in q('results').inner_text()
 q('x').fill('1');q('stage-apply').click();assert 'Raise both tips' in q('status').inner_text() and q('json').is_disabled()
 q('land-hi').click();q('run').click();assert 'raised-tip' in q('results').inner_text() and '0.0000 mA' in q('results').inner_text()
 # Microscope moves only a raised selected tip; land beyond the pad to check geometry.
 cv=q('scope');bb=cv.bounding_box();cv.click(position={'x':bb['width']*(380-106)/760,'y':bb['height']/2})
 q('land-hi').click();q('run').click();assert 'missed-pad' in q('results').inner_text()
 q('demo').click();q('blk').click();pg.wait_for_function("document.querySelector('#ps-status')?.textContent.includes('SourceMeter request loaded')")
 q('run').click();assert 'CONDUCTING' in q('results').inner_text()
 with tempfile.TemporaryDirectory() as d:
  out={}
  for key in ['json','csv','wave']:
   with pg.expect_download(timeout=7000) as dl:q(key).click()
   name=Path(d)/key;dl.value.save_as(str(name));out[key]=name.read_text()
  y=json.loads(out['json']);assert y['sampleId']=='coupon-1k-01' and y['provenance']['upstream']['deviceId']=='09-03' and len(y['rows'])==11
  assert 'DUT-HI' in out['csv'] and json.loads(out['wave'])['schema']=='bts.analog-waveform.v1'
 q('link').click();q('run').click();assert 'disconnected' in q('status').inner_text() and q('csv').is_disabled();q('link').click()
 q('land-hi').click();q('land-lo').click();q('shield').click();q('drawer').click();q('run').click();assert 'wafer drawer' in q('status').inner_text()
 if files:
  output=Path(files);output.mkdir(exist_ok=True,parents=True)
  defs=[('loading','Load bay','02 / ROLLOUT CHUCK','Stage extends for access; drawer and hinge travel inferred.'),('front','Overall','01 / MAIN ENVELOPE','Manual platform, microscope column and work region.'),('tips','Positioners','03 / TWO-TERMINAL CONTACT','Platen, fixed Z chuck and separately positioned HI / LO tips.'),('rear','Rear','04 / REAR UTILITY VIEW','Rear fittings are illustrative. No connector pinout inferred.')]
  for fn,view,title,notes in defs:
   if fn=='front':q('drawer').click();q('shield').click()
   if fn=='tips':q('shield').click()
   if fn=='rear':q('shield').click()
   pg.get_by_role('button',name=view,exact=True).click();pg.wait_for_timeout(300)
   a=Image.open(io.BytesIO(q('stage').locator('canvas').screenshot())).convert('RGB')
   a=a.crop((3,2,a.width-4,a.height-2));bb=ImageChops.difference(a,Image.new('RGB',a.size,a.getpixel((0,0)))).convert('L').point(lambda v:255 if v>14 else 0).getbbox()
   if bb:
    l,t,r,bt=bb;a=a.crop((max(0,l-20),max(0,t-20),min(a.width,r+20),min(a.height,bt+20)))
   a=a.resize((900,round(900*a.height/a.width)),Image.Resampling.LANCZOS)
   z=Image.new('RGB',(900,a.height+81),'#15313b');z.paste(a,(0,0));d=ImageDraw.Draw(z)
   font='/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf'
   d.text((18,a.height+12),title,font=ImageFont.truetype(font,22),fill='#f5e8cb');d.text((18,a.height+45),notes,font=ImageFont.truetype(font,17),fill='white')
   z.save(output/(fn+'.webp'),'WEBP',quality=90)
 pg.set_viewport_size({'width':390,'height':844});q('demo').click();assert '1000.00 Ω' in q('results').inner_text() and pg.evaluate('document.documentElement.scrollWidth <= 392')
 assert not errors,errors
 print('PASS 3D asset, stage lock, lift, scope-pad misalignment, SourceMeter replay, unplug/rollout safety, all exports and 390px.',flush=True)
 b.close()
