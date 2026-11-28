#!/usr/bin/env python3
"""Exercise the actual shipped lab, not a mocked DOM. Requires Python Playwright."""
import argparse,csv,http.server,functools,json,os,shutil,threading
from pathlib import Path
from playwright.sync_api import sync_playwright
base=Path(__file__).resolve().parents[1]
p=argparse.ArgumentParser()
p.add_argument('file',type=Path,nargs='?',default=base/'dist/index.html')
p.add_argument('--screens',type=Path)
a=p.parse_args();html=a.file.resolve()
class Serve(http.server.SimpleHTTPRequestHandler):
 def log_message(self,*x): pass
srv=http.server.ThreadingHTTPServer(('127.0.0.1',0),functools.partial(Serve,directory=html.parent))
threading.Thread(target=srv.serve_forever,daemon=True).start()
url='http://127.0.0.1:'+str(srv.server_port)+'/'+html.name
paths=[os.getenv('CHROME_BIN'),os.getenv('CHROMIUM_PATH'),str(base.parents[2]/'production-equipment-qa/runtime/chrome-bin/chrome'),shutil.which('chromium')]
bin_path=next((x for x in paths if x and Path(x).is_file()),None)
def counter(pg):return pg.locator('#tally strong').all_text_contents()
def details(pg,s):return s in pg.locator('#site-summary').inner_text()
def no_overflow(pg):assert pg.evaluate("document.documentElement.scrollWidth <= document.documentElement.clientWidth+1"),pg.viewport_size
def ready(pg,target):pg.goto(target,wait_until='domcontentloaded');pg.wait_for_selector('#model-ui:not([hidden])');assert not pg.locator('#load-error').is_visible()
reports=[]
try:
 with sync_playwright() as pw:
  args={'args':['--no-sandbox','--disable-gpu','--no-proxy-server'],'headless':True}
  if bin_path:args['executable_path']=bin_path
  b=pw.chromium.launch(**args)
  for name,profile in [('desktop',dict(viewport={'width':1440,'height':980})),('iPhone13',pw.devices['iPhone 13']),('narrowDark',dict(viewport={'width':360,'height':760},is_mobile=True,has_touch=True,color_scheme='dark'))]:
   c=b.new_context(**profile,accept_downloads=True);pg=c.new_page();pg.set_default_timeout(6500)
   requests=[];errors=[];pg.on('pageerror',lambda e:errors.append(str(e)));pg.on('request',lambda r:requests.append(r.url))
   def hit(sel):pg.locator(sel).tap() if profile.get('has_touch') else pg.locator(sel).click()
   ready(pg,url);no_overflow(pg)
   if a.screens:a.screens.mkdir(parents=True,exist_ok=True);pg.screenshot(path=str(a.screens/(name+'-start.png')))
   assert '01 / 19' in pg.locator('#stage-index').inner_text();assert pg.locator('#export-csv').is_disabled();assert not pg.locator('[data-stage="1"]').is_enabled()
   hit('#next');assert 'Prepare the release' in pg.locator('#stage-title').inner_text()
   hit('#run');assert '19 / 19' in pg.locator('#stage-index').inner_text();assert pg.locator('#export-csv').is_enabled();assert counter(pg)==['1,024','1,024','0','1,024'];assert pg.locator('.plot').is_visible()
   assert '11 ± 2' in pg.locator('#impedance').inner_text()
   assert 'synthetic' in pg.locator('.zfigure').inner_text();no_overflow(pg)
   if a.screens:pg.locator('.scene-card').screenshot(path=str(a.screens/(name+'-map.png')))
   pg.locator('#traveler-box').evaluate("(el)=>el.open=true")
   hit('[data-stage="6"]');assert 'Build route metal B' in pg.locator('#stage-title').inner_text()
   hit('#run');assert pg.locator('#run').is_disabled()
   hit('#demo-rescue');assert 'Build route metal A' in pg.locator('#stage-title').inner_text();assert details(pg,'Route witness\nOpen');assert pg.locator('[data-view="route"]').get_attribute('aria-pressed')=='true'
   hit('#next');hit('#next');assert 'Build route metal B' in pg.locator('#stage-title').inner_text()
   assert details(pg,'Route witness\nContinuous')
   pg.locator('#overlay').evaluate("(el)=>{el.value=4;el.dispatchEvent(new Event('input',{bubbles:true}))}")
   assert details(pg,'Route witness\nOpen') and pg.locator('#overlay-o').inner_text()=='4 µm'
   pg.locator('#overlay').evaluate("(el)=>{el.value=0;el.dispatchEvent(new Event('input',{bubbles:true}))}")
   hit('#demo-cover');assert counter(pg)==['1,024','1,024','0','1,023'];assert details(pg,'Wet status\nBlocked');assert not pg.locator('.plot').count()
   hit('#site-next');assert details(pg,'S0514');assert pg.locator('.plot').is_visible();assert pg.locator('#fault-site').input_value()=='513'
   hit('#demo-bank');assert counter(pg)==['1,024','960','64','960'];assert details(pg,'Dry map\nOpen')
   with pg.expect_download() as d:hit('#export-csv')
   with d.value.path().open(newline='') as f: rows=list(csv.DictReader(f))
   assert len(rows)==1024;assert rows[512]['dry']=='Open' and rows[575]['dry']=='Open';assert rows[511]['dry']=='Mapped' and rows[576]['dry']=='Mapped';assert rows[0]['center_x_mm_main_figure_reference_only']=='-15.5'
   with pg.expect_download() as d:hit('#export-json')
   report=json.loads(d.value.path().read_text());assert report['checkCounts']['open']==64 and report['checkCounts']['correct']==960 and report['virtualOptions']['defectSite']=='S0513';assert len(report['process'])==19
   hit('[data-view="grid"]');box=pg.locator('#scene').bounding_box();px=box['x']+box['width']*.513;py=box['y']+box['height']*.362
   pg.locator('#scene').scroll_into_view_if_needed();box=pg.locator('#scene').bounding_box();pg.locator('#scene').click(position={'x':int(box['width']*.513),'y':int(box['height']*.362)})
   assert pg.locator('#site').input_value()!='513';assert pg.locator('#fault-site').input_value()=='513'
   hit('#reset');assert pg.locator('#defect').input_value()=='none'
   pg.locator('#configuration').select_option('wide')
   hit('#run');assert counter(pg)==['2,048','2,048','0','2,048'];assert '8 ± 4' in pg.locator('#impedance').inner_text()
   with pg.expect_download() as d:hit('#export-csv')
   with d.value.path().open(newline='') as f: rows=list(csv.DictReader(f))
   assert len(rows)==2048 and not any(r['center_x_mm_main_figure_reference_only'] for r in rows)
   pg.locator('#holes').select_option('solid');assert 'Passive inert mold' in pg.locator('#scene').get_attribute('aria-label')
   pg.locator('#configuration').select_option('narrow');assert 'inferred lattice' in pg.locator('#config-note').inner_text();assert pg.locator('#holes').is_disabled()
   pg.locator('#configuration').select_option('small');assert '4.8' in pg.locator('#config-note').inner_text();hit('#run');assert counter(pg)==['1,024','1,024','0','1,024']
   assert all(pg.locator(f'[data-view="{v}"]').is_enabled() for v in ['panel','stack','route','grid','connect','mold']);no_overflow(pg)
   assert not errors,errors;assert not [x for x in requests if x!=url and not x.startswith('blob:')],requests
   reports.append({'profile':name,'viewport':pg.viewport_size,'verified':['19-stage sequence and archive','contact/release process plate','pass A break / B rescue / zero overlap','dry-versus-wet window fault','64-connection bank fault','selected-site navigation / tap','1024 and 2048 site exports','logical geometry withholding','all four configurations','mold comparison','no JS errors / external requests / horizontal overflow']})
   c.close()
  pg=b.new_page();ready(pg,html.as_uri());assert pg.locator('.brand').get_attribute('href')=='https://buildthesimulation.com/';assert pg.locator('.equipment-link').first.get_attribute('href').startswith('https://buildthesimulation.com/');b.close()
finally:srv.shutdown()
print(json.dumps({'status':'PASS','browserCases':reports,'standaloneFile':'PASS'},indent=2))
