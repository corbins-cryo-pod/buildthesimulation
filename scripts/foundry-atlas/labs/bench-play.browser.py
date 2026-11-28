"""Exercise the bundled bench entry points, including timer/cancel paths and emulated reduced motion."""
import argparse,functools,http.server,json,os,shutil,threading
from pathlib import Path
from playwright.sync_api import sync_playwright
here=Path(__file__).resolve().parent
default_root=here if (here/'tool-fit/index.html').is_file() else here.parents[2]/'public/simulations/foundry'
parser=argparse.ArgumentParser();parser.add_argument('--root',type=Path,default=default_root);parser.add_argument('--photos',type=Path);args=parser.parse_args()
class Quiet(http.server.SimpleHTTPRequestHandler):
 def log_message(self,*_):pass
httpd=http.server.ThreadingHTTPServer(('127.0.0.1',0),functools.partial(Quiet,directory=args.root.resolve()))
threading.Thread(target=httpd.serve_forever,daemon=True).start()
url=f'http://127.0.0.1:{httpd.server_port}'
def state(p,player):
 return (p.locator(player).get_attribute('data-playback'),int(p.locator(player).get_attribute('data-step')))
def assert_state(p,player,expected):
 actual=state(p,player);assert actual==expected,(player,expected,actual)
def saved(p,ident):
 with p.expect_download() as attached:p.locator(ident).click()
 return json.loads(Path(attached.value.path()).read_bytes())
def fit(p,reduced):
 p.goto(url+'/tool-fit/index.html#case=probe')
 q='#fit-player';button=lambda name:p.get_by_role('button',name=name,exact=True)
 assert_state(p,q,('ready',0))
 assert p.locator('#preset').input_value()=='probe'
 button('Play workflow').click()
 assert_state(p,q,('running',1));assert p.locator('#fit-stage').get_attribute('data-phase')=='intake'
 assert '200 mm' in p.locator('#fit-stage-note').inner_text()
 p.clock.run_for(2330)
 assert_state(p,q,('running',2));assert p.locator('#fit-stage').get_attribute('data-phase')=='reference'
 assert p.locator('#fit-stage-cards').inner_text().find('Etch family')>=0
 assert p.locator('.fit-current-gate').count()==2
 run=p.locator('#fit-scan-marker').evaluate('x=>getComputedStyle(x).transitionDuration')
 assert (run=='0s')==reduced,run
 button('Pause workflow').click()
 p.clock.run_for(7000);assert_state(p,q,('paused',2))
 button('Resume workflow').click();p.clock.run_for(2340);assert_state(p,q,('running',3))
 assert 'Selected carrier' in p.locator('#fit-stage-cards').inner_text()
 button('Next stage').click();assert_state(p,q,('paused',4));p.clock.run_for(6500);assert_state(p,q,('paused',4))
 button('Previous stage').click();assert_state(p,q,('paused',3))
 assert p.locator('#fit-stage-cards').inner_text().find('Selected carrier')>=0
 # A manual preset change cancels, not just pauses, the old schedule.
 button('Resume workflow').click();p.locator('#preset').select_option('dense')
 assert_state(p,q,('ready',0));p.clock.run_for(6000);assert_state(p,q,('ready',0))
 button('Play workflow').click();p.clock.run_for(6900+80)
 assert 'Mode II feature rule' in p.locator('#fit-stage-cards').inner_text()
 assert 'Outside configuration' in p.locator('#fit-stage-cards').inner_text()
 # Export is an independent existing action; user downloads the present input and pauses playback.
 prev=state(p,q)[1];report=saved(p,'#export');assert_state(p,q,('paused',prev));p.clock.run_for(5000);assert_state(p,q,('paused',prev))
 assert report['requirement']['feature']==1
 assert report['stations'][0]['reference']['status']=='outside'
 assert report['physicalQualification'].startswith('Not evaluated')
 button('Resume workflow').click();total=int(p.locator('#fit-progress').get_attribute('max'))
 p.clock.run_for((total+1)*2300)
 assert_state(p,q,('complete',total));assert p.locator('#fit-stage').get_attribute('data-phase')=='result'
 assert 'No physical result' in p.locator('#fit-stage-note').inner_text()
 button('Replay workflow').click();assert_state(p,q,('running',1))
 # Raw input edits reset while playing; missing input refuses evaluated claims.
 p.locator('#width').fill('');assert_state(p,q,('ready',0))
 p.clock.run_for(6900);assert_state(p,q,('ready',0))
 button('Play workflow').click();p.clock.run_for(2320)
 assert 'Not established' in p.locator('#fit-stage-cards').inner_text()
 assert p.evaluate('document.documentElement.scrollWidth <= document.documentElement.clientWidth+1')
 if args.photos:
  args.photos.mkdir(parents=True,exist_ok=True);p.evaluate('document.querySelector("#fit-player").scrollIntoView()');p.screenshot(path=str(args.photos/('fit-reduced.png' if reduced else 'fit.png')))
def handoff(p,reduced):
 p.goto(url+'/process-handoff/index.html?case=develop&artifact=contact&demand=developer')
 q='#handoff-player';button=lambda name:p.get_by_role('button',name=name,exact=True)
 assert_state(p,q,('ready',0));assert p.locator('#download').is_disabled()
 button('Play workflow').click()
 assert_state(p,q,('running',1));assert 'Input schema' in p.locator('#handoff-stage-name').inner_text()
 assert p.locator('#checks li[data-state=pending]').count()==2
 run=p.locator('#handoff-token').evaluate('x=>getComputedStyle(x).transitionDuration')
 assert (run=='0s')==reduced,run
 button('Pause workflow').click();p.clock.run_for(6620);assert_state(p,q,('paused',1))
 button('Resume workflow').click()
 first=p.locator('#checks li').first.locator('a').first;first.focus()
 p.clock.run_for(2330);assert_state(p,q,('running',2))
 assert first.evaluate('x=>document.activeElement===x')
 assert 'Wafer, grid and units' in p.locator('#handoff-stage-name').inner_text()
 p.locator('#next').click();assert_state(p,q,('complete',3))
 p.clock.run_for(7300);assert_state(p,q,('complete',3))
 assert p.locator('#handoff-port').get_attribute('data-transit')=='received'
 report=saved(p,'#download')
 assert report['virtualOnly'] and report['receipt']['status']=='match' and report['executed']['outputRevision']==3
 button('Replay workflow').click();assert_state(p,q,('running',1));assert p.locator('#download').is_disabled()
 p.locator('#artifact').select_option('rename');p.clock.run_for(7300);assert_state(p,q,('ready',0))
 button('Play workflow').click();p.clock.run_for(2340)
 assert_state(p,q,('running',2));assert p.locator('#handoff-port').get_attribute('data-transit')=='held'
 assert 'Required specimen' in p.locator('#handoff-stage-name').inner_text()
 p.clock.run_for(2340);assert_state(p,q,('complete',3));assert p.locator('#handoff-port').get_attribute('data-transit')=='held'
 report=saved(p,'#download');assert report['receipt']['status']=='incompatible' and 'executed' not in report
 p.locator('[data-case=carrier]').click();p.locator('#demand').select_option('saw-fit')
 button('Play workflow').click();p.clock.run_for(2340);assert_state(p,q,('running',2));assert p.locator('#handoff-port').get_attribute('data-block')=='unknown'
 p.locator('#reset').click();p.clock.run_for(7300);assert_state(p,q,('ready',0));assert p.locator('#download').is_disabled()
 p.locator('#run').click();assert_state(p,q,('complete',3));assert p.locator('#handoff-port').get_attribute('data-transit')=='held'
 report=saved(p,'#download');assert report['receipt']['status']=='unknown'
 assert p.evaluate('document.documentElement.scrollWidth<=document.documentElement.clientWidth+1')
 if args.photos:
  args.photos.mkdir(parents=True,exist_ok=True);p.evaluate('document.querySelector("#handoff-player").scrollIntoView()');p.screenshot(path=str(args.photos/('handoff-reduced.png' if reduced else 'handoff.png')))
try:
 with sync_playwright() as pw:
  chrome=os.getenv('CHROME_BIN') or shutil.which('chromium')
  kw={'args':['--no-sandbox','--disable-gpu','--no-proxy-server','--disable-dev-shm-usage']}
  if chrome:kw['executable_path']=chrome
  b=pw.chromium.launch(**kw)
  for label,config,reduced in [('desktop',{'viewport':{'width':1366,'height':900}},False),('iPhone 13',pw.devices['iPhone 13'],False),('320 px + reduced motion',{'viewport':{'width':320,'height':720},'color_scheme':'dark','is_mobile':True,'has_touch':True},True)]:
   ctx=b.new_context(**config,reduced_motion='reduce' if reduced else 'no-preference',accept_downloads=True)
   page=ctx.new_page();page.clock.install();outside=[];errors=[]
   page.on('request',lambda r:outside.append(r.url) if not r.url.startswith((url,'blob:')) else None)
   page.on('pageerror',lambda e:errors.append(str(e)))
   fit(page,reduced);handoff(page,reduced)
   assert not errors,errors;assert not outside,outside
   print('PASS:',label,'both benches; real controls, timer cancellation, manual override, replay, results and downloads',flush=True)
   ctx.close()
  b.close()
finally:httpd.shutdown();httpd.server_close()
