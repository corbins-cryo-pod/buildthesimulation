"""Run with DEVICE_URL pointing to either local Astro/preview or the live simulator.
Optional CHROME_BIN and use of explicit proxy LIVE_PROXY only. No hardware or headset test.
Set REFERENCE_OUTPUT to capture matching original renders to a directory.
"""
from playwright.sync_api import sync_playwright
from pathlib import Path
import json,io,os,tempfile,math
url=os.environ.get('DEVICE_URL','http://127.0.0.1:4302/simulations/equipment/10-02/simulator/')
out=os.environ.get('REFERENCE_OUTPUT')
with sync_playwright() as p:
 args={'args':['--no-sandbox','--enable-unsafe-swiftshader','--use-angle=swiftshader'],'headless':True}
 if os.environ.get('CHROME_BIN'):args['executable_path']=os.environ['CHROME_BIN']
 if os.environ.get('LIVE_PROXY'):args['proxy']={'server':os.environ['LIVE_PROXY']}
 b=p.chromium.launch(**args);ctx=b.new_context(viewport={'width':1360,'height':900},accept_downloads=True,ignore_https_errors=True);pg=ctx.new_page();errors=[]
 pg.on('pageerror',lambda e:errors.append(str(e)))
 print('HTTP',pg.goto(url,wait_until='domcontentloaded',timeout=90000).status,flush=True)
 q=lambda id:pg.locator('#dd-'+id)
 pg.wait_for_function("document.querySelector('#dd-view-status')?.textContent.includes('3D asset loaded')",timeout=90000)
 print(q('view-status').inner_text(),flush=True)
 assert '13 samples/channel' in q('metrics').inner_text() and '2 input overload' in q('metrics').inner_text()
 # Project the published metric GLB coordinates onto the straight-on front camera.
 # This exercises ray picking against real WebGL geometry, including an attached lead.
 def pick_front(x,y,z):
  pg.get_by_role('button',name='Front',exact=True).click()
  st=pg.locator('#dd-stage canvas');st.scroll_into_view_if_needed();box=st.bounding_box()
  scale=box['height']/(2*math.tan(math.radians(17))*(.967-z))
  st.click(position={'x':box['width']/2+x*scale,'y':box['height']/2-(y-.064)*scale})
 pick_front(.1574,.045,.166);assert q('map').input_value()=='6'
 q('run').click();assert 'AI6' in q('probe').inner_text()
 pick_front(-.190,.043,.163);q('run').click();assert 'Not ready' in q('status').inner_text()
 q('power').click();q('map').select_option('0');q('run').click()
 if out:
  from PIL import Image,ImageDraw,ImageFont
  path=Path(out);path.mkdir(exist_ok=True,parents=True)
  for name,file,lab,details,patch in [
   ('Front','front','01   /   OPERATOR PANEL','Power & triggers  |  Digital Out  |  Analog Out  |  Analog In',False),
   ('Rear','rear','02   /   HOST CONNECTIONS','Telegraph BNC x4  |  USB-B  |  25-pin digital I/O  |  IEC power',False),
   ('Station','oblique','03   /   BENCH CONFIGURATION','Optional generic host and analog patch lead shown. Not manufacturer CAD.',True)]:
   if 'disconnected' not in q('lead').inner_text() and not patch:q('lead').click()
   elif 'disconnected' in q('lead').inner_text() and patch:q('lead').click()
   pg.get_by_role('button',name=name,exact=True).click();pg.wait_for_timeout(500)
   im=Image.open(io.BytesIO(q('stage').screenshot())).convert('RGB')
   im=im.resize((920,round(920*im.height/im.width)),Image.Resampling.LANCZOS)
   # No original photos redistributed. Crop only empty raster margins; do not distort geometry.
   from PIL import ImageChops
   im=im.crop((4,2,im.width-6,im.height-2))
   diff=ImageChops.difference(im,Image.new('RGB',im.size,im.getpixel((0,0)))).convert('L').point(lambda v:255 if v>20 else 0)
   bbox=diff.getbbox()
   if bbox:
    l,t,r,bt=bbox;h=bt-t;pad=max(15,int(h*.13));im=im.crop((max(0,l-pad),max(0,t-pad),min(im.width,r+pad),min(im.height,bt+pad)));im=im.resize((920,round(920*im.height/im.width)),Image.Resampling.LANCZOS)
   report=Image.new('RGB',(im.width,im.height+85),'#162f37');report.paste(im,(0,0));d=ImageDraw.Draw(report)
   f='/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf';d.text((18,im.height+12),lab,font=ImageFont.truetype(f,22),fill='#fff2ce')
   d.text((18,im.height+47),details,font=ImageFont.truetype(f,17),fill='white')
   report.save(path/(file+'.webp'),'WEBP',quality=91)
  pg.get_by_role('button',name='Overall',exact=True).click()
 q('source').select_option('clamp');pg.wait_for_function("document.querySelector('#dd-input-note').textContent.includes('131 supplied')")
 q('map').select_option('1');q('run').click();assert '131 samples/channel' in q('metrics').inner_text() and '0 input overload' in q('metrics').inner_text()
 assert 'AI1 • CH1-CELL' in q('probe').inner_text()
 q('rate').fill('2000');q('run').click();assert '261 samples/channel' in q('metrics').inner_text()
 with tempfile.TemporaryDirectory() as td:
  results={}
  for el,ext in [('json','json'),('csv','csv'),('replay','replay.csv')]:
   with pg.expect_download() as e:q(el).click()
   file=Path(td)/('out.'+ext);e.value.save_as(str(file));results[ext]=file.read_text()
  r=json.loads(results['json']);assert r['provenance']['sourceProvenance']['source']=='10-01' and r['sampleId']=='PATCH1U-CH1' and r['parentRevision']==1 and r['revision']==2
  assert r['dtS']==.0005 and len(r['channels'][0]['codes'])==261 and r['channels'][0]['terminal']=='AI1'
  assert results['csv'].startswith('time_s,AI1_V,AI1_signed_code,AI1_overload\n') and len(results['csv'].splitlines())==262
  assert '# sampleId: PATCH1U-CH1' in results['replay.csv'] and '# revision: 2' in results['replay.csv'] and '# contactId: CH1-CELL' in results['replay.csv']
  for control in ['usb','lead','power']:
   q(control).click();q('run').click();assert 'Not ready' in q('status').inner_text() and q('json').is_disabled();q(control).click()
  q('rate').fill('500001');q('run').click();assert '500,000' in q('status').inner_text() and q('json').is_disabled();q('rate').fill('1000')
  bad=Path(td)/'bad.json';bad.write_text('{"schema":"unrecognized"}');q('file').set_input_files(str(bad))
  pg.wait_for_function("document.querySelector('#dd-status').classList.contains('error')")
  assert q('json').is_disabled()
  q('file').set_input_files(str(Path(td)/'out.json'));pg.wait_for_function("document.querySelector('#dd-input-note').textContent.includes('261 supplied')")
  q('run').click();assert '131 samples/channel' in q('metrics').inner_text()
 pg.set_viewport_size({'width':390,'height':844});q('source').select_option('ramp');q('run').click()
 assert '13 samples/channel' in q('metrics').inner_text() and pg.evaluate('document.documentElement.scrollWidth <= 392')
 assert not errors,errors
 print('PASS desktop + 390px viewport, baked model, controls, MultiClamp import and exports, stale-record guards, invalid upload and rate. No headset tested.',flush=True)
 b.close()
