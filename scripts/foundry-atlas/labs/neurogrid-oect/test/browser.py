"""Touch and desktop UI checks against the actual offline generated HTML."""
import argparse,csv,json,http.server,functools,os,shutil,threading
from pathlib import Path
from playwright.sync_api import sync_playwright
root=Path(__file__).resolve().parents[1]
ap=argparse.ArgumentParser();ap.add_argument('html',nargs='?',type=Path,default=root/'dist/index.html');ap.add_argument('--screens',type=Path)
c=ap.parse_args();html=c.html.resolve()
class Handler(http.server.SimpleHTTPRequestHandler):
 def log_message(self,*a): pass
httpd=http.server.ThreadingHTTPServer(('127.0.0.1',0),functools.partial(Handler,directory=html.parent))
threading.Thread(target=httpd.serve_forever,daemon=True).start()
page_url=f'http://127.0.0.1:{httpd.server_port}/{html.name}'
paths=[os.getenv('CHROME_BIN'),os.getenv('CHROMIUM_PATH'),str(root.parents[2]/'production-equipment-qa/runtime/chrome-bin/chrome'),shutil.which('chromium')]
exe=next((x for x in paths if x and Path(x).is_file()),None)
tested=[]
def see(p,s):assert s in p.locator('#stats').inner_text(),(s,p.locator('#stats').inner_text())
def layout(p):assert p.evaluate('document.documentElement.scrollWidth <= document.documentElement.clientWidth + 1')
def start(p,u):p.goto(u,wait_until='domcontentloaded');p.wait_for_selector('#app:not([hidden])');assert not p.locator('#error').is_visible()
try:
 with sync_playwright() as pw:
  kw={'args':['--no-sandbox','--disable-gpu','--no-proxy-server']}
  if exe:kw['executable_path']=exe
  b=pw.chromium.launch(**kw)
  for name,setup in [('desktop',dict(viewport={'width':1440,'height':984})),('iPhone13',pw.devices['iPhone 13']),('dark360',dict(viewport={'width':360,'height':760},is_mobile=True,has_touch=True,color_scheme='dark'))]:
   ctx=b.new_context(**setup,accept_downloads=True);p=ctx.new_page();p.set_default_timeout(6000)
   errors=[];req=[];p.on('pageerror',lambda e:errors.append(str(e)));p.on('request',lambda r:req.append(r.url))
   def hit(x):
    l=p.locator(x)
    if setup.get('has_touch'):l.tap()
    else:l.click()
   start(p,page_url);layout(p)
   assert p.locator('#choose-passive').get_attribute('aria-pressed')=='true';assert not p.locator('#vg').is_visible();assert p.locator('#csv').is_disabled()
   if c.screens:c.screens.mkdir(exist_ok=True,parents=True);p.screenshot(path=str(c.screens/(name+'-start.png')))
   hit('#next-stage');assert 'lower parylene' in p.locator('#stage-title').inner_text()
   hit('#run');assert '08 / 08' in p.locator('#stage-kicker').inner_text()
   see(p,'256 mapped / 256');assert p.locator('.diagramplot').is_visible()
   hit('#curve-b');assert 'phase' in p.locator('.diagramplot').get_attribute('aria-label')
   hit('#compare-cover');see(p,'Blocked window');see(p,'255 isolated wet');assert not p.locator('.diagramplot').count()
   hit('#next-site');assert p.locator('.diagramplot').is_visible();assert p.locator('#site').input_value()=='139';assert p.locator('#faultloc').input_value()=='138'
   hit('#view-toggle');assert p.locator('[data-site]').count()==256
   hit('[data-site="0"]');assert p.locator('#site').input_value()=='1'
   with p.expect_download() as d:hit('#csv')
   with d.value.path().open() as fp:r=list(csv.DictReader(fp))
   assert len(r)==256 and r[137]['measurement_status']=='Blocked window' and r[137]['synthetic_abs_Z_1k_ohm']==''
   hit('#choose-oect');assert '01 / 08' in p.locator('#stage-kicker').inner_text() and p.locator('#vg').is_visible() and not p.locator('#site').is_visible()
   assert 'separate electrolyte-gated' in p.locator('.hero .sub').inner_text()
   hit('#run');see(p,'Isolated gated channel');see(p,'Continuous');assert p.locator('.diagramplot').is_visible();assert '−0.4' in p.locator('#benchmark').inner_text()
   assert 'S · SOURCE' in p.locator('#plate').text_content() and 'D · DRAIN' in p.locator('#plate').text_content()
   assert 'SEPARATE BATH GATE' in p.locator('#plate').text_content()
   if c.screens:p.locator('.scene-card').screenshot(path=str(c.screens/(name+'-active.png')))
   def out():
    x=p.locator('#stats').inner_text().splitlines()
    return float(x[x.index('I_D')+1].split()[0])
   v=out()
   p.locator('#vg').evaluate("(e)=>{e.value=.6;e.dispatchEvent(new Event('input',{bubbles:true}));}")
   assert v<out()<0
   hit('#curve-b');assert 'transconductance' in p.locator('.diagramplot').get_attribute('aria-label')
   hit('#compare-cover');see(p,'Channel covered');see(p,'Continuous');see(p,'0.00 µS')
   p.locator('#fault').select_option('leakage');see(p,'Feedthrough leak');see(p,'336.00 nA')
   with p.expect_download() as d:hit('#csv')
   with d.value.path().open() as fp:r=list(csv.DictReader(fp))
   assert len(r)==61 and float(r[-1]['signed_synthetic_drain_uA'])<0 and float(r[-1]['synthetic_gate_nA'])==336
   with p.expect_download() as d:hit('#json')
   j=json.loads(d.value.path().read_text());assert j['mode']=='oect' and j['geometry']['transistors']==17;assert j['publishedFigure2Benchmark']['peakGmUS']==900
   hit('#choose-passive');assert '08 / 08' in p.locator('#stage-kicker').inner_text();assert p.locator('#fault').input_value()=='cover';assert p.locator('#site').input_value()=='1'
   hit('#reset');assert '01 / 08' in p.locator('#stage-kicker').inner_text() and p.locator('#csv').is_disabled()
   layout(p);assert not errors,errors;assert not [u for u in req if u!=page_url and not u.startswith('blob:')],req
   tested.append({'viewport':name,'check':'PASS','coverage':['passive geometry and 256-site export','blocked-window diagnostic','independent OECT traveler and retained state','drain sign and gm plots','covered-channel control with continuous path','feedthrough leakage and distinct transfer export','no JS errors / overflow / background requests']})
   ctx.close()
  p=b.new_page();start(p,html.as_uri());assert p.locator('.wordmark').get_attribute('href')=='https://buildthesimulation.com/';b.close()
finally:httpd.shutdown()
print(json.dumps({'result':'PASS','browser':tested,'fileOrigin':'PASS'},indent=2))
