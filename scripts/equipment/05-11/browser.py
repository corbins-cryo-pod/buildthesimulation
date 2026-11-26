"""Targeted real browser and optional source-comparison captures. No headset validation."""
from playwright.sync_api import sync_playwright
from pathlib import Path
from PIL import Image,ImageDraw,ImageFont,ImageChops
import os,io,json,tempfile,math
url=os.environ.get('DEVICE_URL','http://127.0.0.1:4511/simulations/equipment/05-11/simulator/')
out=os.environ.get('REFERENCE_OUTPUT')
with sync_playwright() as p:
 opt={'headless':True,'args':['--no-sandbox','--enable-unsafe-swiftshader','--use-angle=swiftshader']}
 if os.getenv('CHROME_BIN'):opt['executable_path']=os.environ['CHROME_BIN']
 if os.getenv('LIVE_PROXY'):opt['proxy']={'server':os.environ['LIVE_PROXY']}
 b=p.chromium.launch(**opt);cx=b.new_context(viewport={'width':1400,'height':900},accept_downloads=True,ignore_https_errors=True);pg=cx.new_page();err=[];pg.on('pageerror',lambda e:err.append(str(e)))
 q=lambda x:pg.locator('#ft-'+x)
 assert pg.goto(url.removesuffix('simulator/'),wait_until='domcontentloaded',timeout=60000).ok
 pg.locator('a[href$="/05-11/simulator/"]').first.click()
 pg.wait_for_function("document.querySelector('#ft-view')?.textContent.includes('3D asset loaded')",timeout=90000)
 print(q('view').inner_text(),flush=True)
 q('demo').click();assert '1726.56' in q('results').inner_text() and 'PMMA-like' in q('results').inner_text()
 pg.get_by_role('button',name='ATR',exact=True).click()
 # Ray through the solid pressure knob at its engaged model coordinates.
 c=q('model').locator('canvas');bb=c.bounding_box();eye=(.39,.46,.53);look=(.18,.285,.219)
 dot=lambda a,b:sum(x*y for x,y in zip(a,b))
 cross=lambda a,b:(a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0])
 norm=lambda a:tuple(x/math.hypot(*a) for x in a)
 forward=norm(tuple(a-b for a,b in zip(look,eye)));right=norm(cross(forward,(0,1,0)));up=cross(right,forward)
 point=(.234,.354,.177);delta=tuple(a-b for a,b in zip(point,eye));f=bb['height']/(2*math.tan(math.radians(17.5))*dot(delta,forward))
 c.click(position={'x':bb['width']/2+f*dot(delta,right),'y':bb['height']/2-f*dot(delta,up)})
 assert q('clamp').inner_text()=='Seat ATR foot',q('status').inner_text()
 q('run').click();assert 'seat the coupon' in q('status').inner_text() and q('json').is_disabled()
 q('clamp').click();q('run').click();assert '909 spectral bins' in q('results').inner_text()
 q('window').select_option('rect');q('run').click();assert 'fresh clean-crystal' in q('status').inner_text()
 q('demo').click()
 with tempfile.TemporaryDirectory() as tmp:
  saved={}
  for part in ['json','csv','intensity']:
   with pg.expect_download(timeout=8000) as d:q(part).click()
   place=Path(tmp)/part;d.value.save_as(str(place));saved[part]=place.read_text()
  r=json.loads(saved['json']);assert r['matches'][0]['key']=='PMMA' and r['sampleId']=='FTIR-PMMA'
  assert len(saved['csv'].splitlines())==912
  assert json.loads(saved['intensity'])['rows'][0]['background']>0
  example=url.split('/simulations/')[0]+'/equipment/05-11/decade-example.json';req=pg.request.get(example);assert req.ok;place=Path(tmp)/'decade.json';place.write_bytes(req.body())
  q('import').set_input_files(str(place));pg.wait_for_function("document.querySelector('#ft-results').textContent.includes('FFT bypassed')")
  assert 'A 1.0000' in q('results').inner_text(),q('results').inner_text()
 if out:
  destination=Path(out);destination.mkdir(parents=True,exist_ok=True)
  defs=[('front','Overall','01 / BASE SPECTROMETER','Standard central hatch and right framing · no ABX or Raman tower'),('atr','ATR','02 / DIAMOND ATR','Stainless pressure tower, specimen and Touch Point'),('bay','Bay','03 / OPEN SAMPLE BAY','Main compartment inspection only; not used by this experiment'),('rear','Rear','04 / REAR PANEL','Auxiliary, accessory, host and DC connections')]
  for name,view,title,caption in defs:
   if name in ('bay','rear'):q('lid').click()
   pg.get_by_role('button',name=view,exact=True).click();pg.wait_for_timeout(260)
   im=Image.open(io.BytesIO(c.screenshot())).convert('RGB')
   im=im.crop((3,2,im.width-5,im.height-3));r=ImageChops.difference(im,Image.new('RGB',im.size,im.getpixel((0,0)))).convert('L').point(lambda x:255 if x>14 else 0).getbbox()
   if r:
    l,t,rr,d=r;im=im.crop((max(0,l-20),max(0,t-20),min(im.width,rr+20),min(im.height,d+20)))
   im=im.resize((900,round(900*im.height/im.width)),Image.Resampling.LANCZOS)
   card=Image.new('RGB',(900,im.height+81),'#15313b');card.paste(im,(0,0));pen=ImageDraw.Draw(card);font='/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf'
   pen.text((18,im.height+12),title,font=ImageFont.truetype(font,22),fill='#fbf1d0');pen.text((18,im.height+45),caption,font=ImageFont.truetype(font,17),fill='white');card.save(destination/(name+'.webp'),'WEBP',quality=90)
 pg.set_viewport_size({'width':390,'height':844});q('demo').click();assert 'PMMA-like' in q('results').inner_text() and pg.evaluate('document.documentElement.scrollWidth<=392')
 assert not err,err
 print('PASS real browser: model, pressure knob picking, stale background, FFT and import, three exports and 390px.',flush=True)
 b.close()
