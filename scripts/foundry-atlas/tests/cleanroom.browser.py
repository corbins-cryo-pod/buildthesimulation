"""Exercise published entry points on an HTTP origin serving Astro output or public/."""
import argparse,json,os,functools,http.server,threading
from pathlib import Path
from playwright.sync_api import sync_playwright

p=argparse.ArgumentParser()
p.add_argument('--origin')
p.add_argument('--serve',type=Path)
p.add_argument('--screens',type=Path)
p.add_argument('--include-benches',action='store_true')
args=p.parse_args()
root=Path(__file__).resolve().parents[3]
labs=json.loads((root/'src/data/foundry-atlas/lab-releases.json').read_text())
if args.origin:
  origin=args.origin.rstrip('/')
else:
  class Quiet(http.server.SimpleHTTPRequestHandler):
    def log_message(self,*a):pass
  server=http.server.ThreadingHTTPServer(('127.0.0.1',0),functools.partial(Quiet,directory=args.serve or root/'public'))
  threading.Thread(target=server.serve_forever,daemon=True).start()
  origin=f'http://127.0.0.1:{server.server_port}'
if args.screens:args.screens.mkdir(parents=True,exist_ok=True)
with sync_playwright() as pw:
  browser=pw.chromium.launch(executable_path=os.getenv('CHROME_BIN'),args=['--no-sandbox','--no-proxy-server','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader'])
  for opts in [{'viewport':{'width':1240,'height':900}},{**pw.devices['iPhone 13'],'reduced_motion':'reduce'}]:
    for id,lab in labs.items():
      if id in ['tool-fit','process-handoff'] and not args.include_benches:continue
      page=browser.new_page(**opts)
      issues=[]
      page.on('pageerror',lambda err:issues.append(str(err)))
      page.goto(origin+lab['url'],wait_until='domcontentloaded')
      page.get_by_role('button',name='Play workflow',exact=True).first.click(timeout=12000)
      room=page.locator('.cr-room').first
      room.wait_for(state='visible',timeout=12000)
      assert room.locator('.cr-heading').inner_text().strip(),lab['url']
      assert room.locator('.cr-controls dl div').count(),lab['url']
      assert room.locator('.cr-card p').count()==2,lab['url']
      assert room.get_attribute('data-phase') in ['transfer','load','set up','run','unload']
      assert page.evaluate('document.documentElement.clientWidth>=document.documentElement.scrollWidth-1'),lab['url']
      assert not [x for x in issues if 'cleanroom' in x.lower()],(lab['url'],issues)
      print(opts['viewport']['width'],lab['url'],room.locator('.cr-heading').inner_text(),flush=True)
      if args.screens and id in {'ptnrgrid','neuropixels-foundry','mesh-electronics'}:
        page.screenshot(path=args.screens/(id+'-'+str(opts['viewport']['width'])+'.png'))
      page.close()
  page=browser.new_page(viewport={'width':1200,'height':860})
  page.goto(origin+'/simulations/neuropixels-foundry/')
  play=page.get_by_role('button',name='Play workflow',exact=True)
  play.click()
  room=page.locator('.cr-room')
  room.wait_for()
  page.wait_for_function("document.querySelector('.cr-room')?.dataset.phase==='load'",timeout=40000)
  page.get_by_role('button',name='Pause workflow',exact=True).click()
  stamp=room.get_attribute('data-phase')
  page.wait_for_timeout(1300)
  assert stamp==room.get_attribute('data-phase')
  play.click()
  page.wait_for_function("document.querySelector('.cr-room')?.dataset.phase==='unload'",timeout=45000)
  assert room.locator('.cr-card').last.get_attribute('data-revealed')=='true'
  page.close()
  # Pin one known native model and an incompatible-size rejection independently of a catalog route.
  page=browser.new_page(viewport={'width':1160,'height':860})
  page.goto(origin+'/simulations/neuropixels-foundry/')
  page.evaluate("""async()=>{
    const {mountCleanroom}=await import('/simulations/foundry/cleanroom-player.js');
    const node=document.createElement('div');document.body.prepend(node);
    window.proof=mountCleanroom(node);
    proof.setStep({equipmentId:'02-10',operation:'Develop latent image',workpieceShape:'wafer',sizeMm:150,before:'Exposed resist wafer',after:'Developed resist wafer',settings:[['Mode','Virtual film witness']]});
    proof.setProgress(0);
  }""")
  page.wait_for_function("document.querySelector('canvas[data-cleanroom-world]')?.dataset.stageModel==='register'",timeout=20000)
  canvas=page.locator('.cr-room[data-render=register] canvas[data-cleanroom-world]')
  assert canvas.get_attribute('data-equipment')=='02-10' and canvas.get_attribute('data-fit')=='native-dry'
  uid=canvas.get_attribute('data-track-id')
  if args.screens:page.locator('.cr-room').screenshot(path=args.screens/'register-developer.png')
  page.evaluate("""()=>{
    proof.setStep({equipmentId:'04-03',operation:'Deep silicon etch',workpieceShape:'wafer',sizeMm:200,before:'Patterned wafer',after:'Etched wafer'});
    proof.setProgress(.46);
  }""")
  page.wait_for_function("document.querySelector('canvas[data-cleanroom-world]')?.dataset.fit==='blocked'",timeout=8000)
  canvas=page.locator('canvas[data-cleanroom-world]')
  assert canvas.get_attribute('data-stage-model')!='register' and canvas.get_attribute('data-track-id')==uid
  assert page.locator('.cr-room').get_attribute('data-render')=='teaching-3d'
  print('PASS: stage clock/pause, original 3D register asset, continuously rendered 3D mismatch gate (no insertion)')
  browser.close()
