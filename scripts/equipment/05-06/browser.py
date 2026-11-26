"""Chromium integration and optional original reference captures. No physical XR test."""
from playwright.sync_api import sync_playwright
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont, ImageChops
import os, math, io, json, tempfile
url=os.environ.get('DEVICE_URL','http://127.0.0.1:4506/simulations/equipment/05-06/simulator/')
out=os.environ.get('REFERENCE_OUTPUT')
with sync_playwright() as p:
 kw={'headless':True,'args':['--no-sandbox','--enable-unsafe-swiftshader','--use-angle=swiftshader']}
 if os.getenv('CHROME_BIN'):kw['executable_path']=os.environ['CHROME_BIN']
 if os.getenv('LIVE_PROXY'):kw['proxy']={'server':os.environ['LIVE_PROXY']}
 b=p.chromium.launch(**kw);ctx=b.new_context(viewport={'width':1400,'height':900},ignore_https_errors=True,accept_downloads=True);pg=ctx.new_page()
 errors=[];pg.on('pageerror',lambda e:errors.append(str(e)))
 rec=url.removesuffix('simulator/');assert pg.goto(rec,wait_until='domcontentloaded',timeout=60000).ok
 pg.locator('a[href$="/05-06/simulator/"]').first.click()
 q=lambda id:pg.locator('#rm-'+id)
 pg.wait_for_function("document.querySelector('#rm-view-status')?.textContent.includes('3D asset loaded')",timeout=90000)
 print(q('view-status').inner_text(),flush=True)
 # Project the true pivoted shield's center for an end-to-end pointer hit regression.
 box=q('stage').locator('canvas').bounding_box()
 cam=(.60,.51,1.05); look=(0,.277,.02)
 def norm(v):return tuple(x/math.hypot(*v) for x in v)
 def dot(a,b):return sum(x*y for x,y in zip(a,b))
 def cross(a,b):return (a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0])
 f=norm([a-b for a,b in zip(look,cam)]);right=norm(cross(f,(0,1,0)));up=cross(right,f)
 H=-1.7;pt=(0,.241+.006*math.cos(H)-.168*math.sin(H),-.106+.006*math.sin(H)+.168*math.cos(H))
 d=[a-b for a,b in zip(pt,cam)];scale=box['height']/(2*math.tan(math.radians(18))*dot(d,f))
 q('stage').locator('canvas').click(position={'x':box['width']/2+dot(d,right)*scale,'y':box['height']/2-dot(d,up)*scale})
 assert q('lid').inner_text()=='Open shield',q('status').inner_text()
 q('lid').click()
 q('run').click();assert 'close shield' in q('status').inner_text() and q('json').is_disabled()
 q('demo').click();assert '7 sites' in q('status').inner_text() and '100.000 Ω/□' in q('stats').inner_text()
 q('row').select_option('6');assert 'S07' in q('stats').inner_text()
 with tempfile.TemporaryDirectory() as td:
  for mode in ('json','csv'):
   with pg.expect_download(timeout=8000) as e:q(mode).click()
   e.value.save_as(str(Path(td)/('sheet-map.'+mode)))
  data=json.loads((Path(td)/'sheet-map.json').read_text());assert data['calibrationId']=='BTS-CDE178-JANDEL-1MM-r1' and data['sampleId']=='FILM-100R'
  end=data['rows'][-1];assert abs(end['sheetOhmSq']-100)<1e-9 and end['apparentInfiniteOhmSq']>100 and len(end['tips'])==4
  assert len((Path(td)/'sheet-map.csv').read_text().splitlines())==12
  q('x').fill('49');q('x').press('Tab');q('head').click();q('run').click();assert 'P4 falls outside' in q('status').inner_text() and q('json').is_disabled()
  q('head').click();q('x').fill('0');q('x').press('Tab');q('head').click();q('run').click();assert '100.000 Ω/□' in q('stats').inner_text()
  q('x').fill('30');q('x').press('Tab');assert 'Raise the probe' in q('status').inner_text() and q('json').is_disabled()
  q('reverse').uncheck();q('run').click();assert '102.264 Ω/□' in q('stats').inner_text(),q('stats').inner_text()
  q('head').click()
  target=url.split('/simulations/')[0]+'/equipment/05-06/voltage-map-example.json'
  obj=pg.request.get(target,timeout=20000);assert obj.ok
  f=Path(td)/'voltages.json';f.write_bytes(obj.body());q('import').set_input_files(str(f));pg.wait_for_function("document.querySelector('#rm-status').textContent.includes('inferred from supplied')")
  assert '100.000 Ω/□' in q('stats').inner_text()
  q('lid').click();q('unload').click();q('lid').click();q('head').click();assert 'loaded specimen' in q('status').inner_text()
  q('demo').click()
 if out:
  d=Path(out);d.mkdir(parents=True,exist_ok=True)
  for name in ['Chuck','Head','Tips','Overall']:
   assert pg.get_by_role('button',name=name,exact=True).is_enabled()
  for fname,view,open_lid,label,detail in [
   ('open','Overall',True,'01 / MANUAL LOAD BAY','Recessed chuck   •   hinged dark shield   •   front cabinet plaque'),
   ('closed','Station',False,'02 / BENCH CONFIGURATION','Closed loading shield   •   separate readout and keyboard   •   right control panel'),
   ('head','Head',True,'03 / CONTACT CARTRIDGE','CDE six-way cartridge   |   outer drive and inner sense tips at 1 mm pitch'),
   ('rear','Rear',False,'04 / REAR VIEW (INFERRED)','Simplified connector positions and wire exit; no rear drawing used')
  ]:
   if (q('lid').inner_text()=='Close shield')!=open_lid:q('lid').click()
   if open_lid and fname=='head':q('x').fill('0');q('x').press('Tab')
   pg.get_by_role('button',name=view,exact=True).click();pg.wait_for_timeout(280)
   im=Image.open(io.BytesIO(q('stage').locator('canvas').screenshot())).convert('RGB')
   if fname=='head':
    pg.get_by_role('button',name='Tips',exact=True).click();pg.wait_for_timeout(220)
    tips_img=Image.open(io.BytesIO(q('stage').locator('canvas').screenshot())).convert('RGB')
    side=Image.new('RGB',(2*im.width,im.height),'#d3dcda');side.paste(im,(0,0));side.paste(tips_img,(im.width,0));im=side
   else:
    cx,cy=im.size;im=im.crop((3,2,cx-4,cy-2))
    bb=ImageChops.difference(im,Image.new('RGB',im.size,im.getpixel((0,0)))).convert('L').point(lambda v:255 if v>14 else 0).getbbox()
    if bb:
     l,t,r,bt=bb;pad=20;im=im.crop((max(0,l-pad),max(0,t-pad),min(im.width,r+pad),min(im.height,bt+pad)))
   im=im.resize((900,round(900*im.height/im.width)),Image.Resampling.LANCZOS)
   panel=Image.new('RGB',(900,im.height+81),'#19373d');panel.paste(im,(0,0))
   g=ImageDraw.Draw(panel);font='/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf'
   g.text((20,im.height+12),label,font=ImageFont.truetype(font,22),fill='#fff6d7');g.text((20,im.height+45),detail,font=ImageFont.truetype(font,17),fill='white')
   panel.save(d/(fname+'.webp'),'WEBP',quality=90)
 pg.set_viewport_size({'width':390,'height':844});q('demo').click();assert '7 sites' in q('status').inner_text() and pg.evaluate('document.documentElement.scrollWidth <= 392')
 assert not errors,errors
 print('PASS register, metric GLB, reversal/offset, off-edge and motion guards, map import, both downloads, 390px. No live physical VR test.',flush=True)
 b.close()
