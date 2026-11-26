"""Optional reference captures and browser regression, excluding physical XR."""
from playwright.sync_api import sync_playwright
from PIL import Image,ImageChops,ImageDraw,ImageFont
from pathlib import Path
import math,os,io,json,tempfile
url=os.environ.get('DEVICE_URL','http://127.0.0.1:4504/simulations/equipment/05-04/simulator/')
ref=os.environ.get('REFERENCE_OUTPUT')
with sync_playwright() as p:
 kw={'headless':True,'args':['--no-sandbox','--enable-unsafe-swiftshader','--use-angle=swiftshader']}
 if os.getenv('CHROME_BIN'):kw['executable_path']=os.environ['CHROME_BIN']
 if os.getenv('LIVE_PROXY'):kw['proxy']={'server':os.environ['LIVE_PROXY']}
 b=p.chromium.launch(**kw);cx=b.new_context(viewport={'width':1380,'height':900},accept_downloads=True,ignore_https_errors=True)
 pg=cx.new_page();errors=[];pg.on('pageerror',lambda e:errors.append(str(e)));q=lambda x:pg.locator('#as-'+x)
 assert pg.goto(url.removesuffix('simulator/'),wait_until='domcontentloaded',timeout=60000).ok
 pg.locator('a[href$="/05-04/simulator/"]').first.click()
 pg.wait_for_function("document.querySelector('#as-view')?.textContent.includes('3D asset loaded')",timeout=90000)
 pg.get_by_text('Best thickness 123.40000 nm',exact=False).first.wait_for(timeout=20000)
 print(q('view').inner_text(),flush=True)
 pg.get_by_role('button',name='Front',exact=True).click()
 # Project the actual indexer's world center to a point in the orthogonal front view.
 stage=q('model').locator('canvas');box=stage.bounding_box();factor=box['height']/(2*math.tan(math.radians(17.5))*(.79+.026))
 stage.click(position={'x':box['width']/2-.169*factor,'y':box['height']/2-(.213-.148)*factor})
 assert q('source').input_value()=='75',q('source').input_value()
 q('acquire').click();assert 'indexes must match' in q('status').inner_text() and q('json').is_disabled()
 q('detector').select_option('75');q('acquire').click();assert '27 simulated' in q('status').inner_text()
 q('thickness').fill('76.5');q('acquire').click();q('fit').click();assert '76.500' in q('results').inner_text()
 q('reference').click();q('mode').select_option('single');q('fit').click();assert 'MULTIPLE ORDERS' in q('results').inner_text()
 q('mode').select_option('full');q('fit').click();assert '81 observations' in q('results').inner_text()
 with tempfile.TemporaryDirectory() as tmp:
  out={}
  for part in ['json','csv','spectrum']:
   with pg.expect_download(timeout=9000) as d:q(part).click()
   fn=Path(tmp)/part;d.value.save_as(str(fn));out[part]=fn.read_text()
  a=json.loads(out['json']);assert abs(a['thicknessNm']-123.4)<.02 and a['revision']==1 and len(a['residuals'])==81
  assert len(out['csv'].splitlines())==84 and json.loads(out['spectrum'])['sampleId']=='DIELECTRIC-REF-1234'
  q('import').set_input_files(str(Path(tmp)/'spectrum'));pg.wait_for_function("document.querySelector('#as-status').textContent.includes('Spectrum loaded')")
  q('fit').click();assert '123.40000' in q('results').inner_text()
 q('vacuum').click();q('load').click();q('acquire').click();assert 'specimen' in q('status').inner_text() and q('json').is_disabled();q('load').click();q('vacuum').click()
 q('source').select_option('90');q('detector').select_option('90');q('acquire').click();assert 'transmission is not solved' in q('status').inner_text()
 q('source').select_option('70');q('detector').select_option('70')
 if ref:
  folder=Path(ref);folder.mkdir(parents=True,exist_ok=True)
  defs=[('front','Overall','01 / LEGACY OPTICS','Independent source and detector arms · standard beam path'),('chuck','Chuck','02 / SPECIMEN STAGE','Removable chuck · fixture lines · reflected ray intersection'),('side','Side','03 / SIDE & HANDHOLDS','Aluminum housings · support plate · inferred component spacing'),('rear','Rear','04 / REAR SERVICE PANEL','Fitting positions inferred from published connector types.')]
  for fn,view,title,labels in defs:
   pg.get_by_role('button',name=view,exact=True).click();pg.wait_for_timeout(300)
   im=Image.open(io.BytesIO(stage.screenshot())).convert('RGB');im=im.crop((3,2,im.width-5,im.height-3))
   box=ImageChops.difference(im,Image.new('RGB',im.size,im.getpixel((0,0)))).convert('L').point(lambda v:255 if v>13 else 0).getbbox()
   if box:
    l,t,r,d=box;im=im.crop((max(0,l-20),max(0,t-20),min(im.width,r+20),min(im.height,d+20)))
   im=im.resize((900,round(900*im.height/im.width)),Image.Resampling.LANCZOS)
   pic=Image.new('RGB',(900,im.height+78),'#18363e');pic.paste(im,(0,0));paint=ImageDraw.Draw(pic);ff='/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf'
   paint.text((17,im.height+11),title,font=ImageFont.truetype(ff,23),fill='#fbf0d0');paint.text((17,im.height+43),labels,font=ImageFont.truetype(ff,17),fill='white')
   pic.save(folder/(fn+'.webp'),'WEBP',quality=90)
 pg.set_viewport_size({'width':390,'height':844});q('reference').click();assert '123.40000' in q('results').inner_text() and pg.evaluate('document.documentElement.scrollWidth<=392')
 assert not errors,errors
 print('PASS local metric GLB, 3D indexer, mismatch, 90°, fit/ambiguity, actual three exports/import and 390px.',flush=True)
 b.close()
