"""Exercise the actual media-free HTTP route, including files and recovery paths."""
from playwright.sync_api import sync_playwright
from pathlib import Path
import json,time,os,threading
from functools import partial
from http.server import ThreadingHTTPServer, SimpleHTTPRequestHandler
from urllib.parse import urlsplit
ROOT=Path(__file__).resolve().parents[1]
REPO=ROOT.parents[1]
MODE=os.environ.get('WHOLE_CELL_BACKEND','webgl')
OUT=Path(os.environ.get('WHOLE_CELL_ARTIFACT_DIR','/tmp/whole-cell-browser-artifacts'))/MODE
OUT.mkdir(parents=True,exist_ok=True)
class QuietHandler(SimpleHTTPRequestHandler):
 def log_message(self,*args): pass
server=ThreadingHTTPServer(('127.0.0.1',0),partial(QuietHandler,directory=str(REPO/os.environ.get('WHOLE_CELL_SERVE_DIR','public'))))
threading.Thread(target=server.serve_forever,daemon=True).start()
base=os.environ.get('WHOLE_CELL_BASE_URL',f'http://127.0.0.1:{server.server_port}')
url=base.rstrip('/')+'/simulations/whole-cell-remodeling/'
origin=urlsplit(url).netloc
results=[]
def record(name,detail=None):
    results.append({'name':name,'passed':True,'detail':detail});print('PASS',name,detail or '')
with sync_playwright() as p:
 b=p.chromium.launch(headless=True,args=['--no-sandbox','--disable-dev-shm-usage','--enable-unsafe-swiftshader','--use-gl=angle','--use-angle=swiftshader'])
 context=b.new_context(viewport={'width':1500,'height':1220},device_scale_factor=1,accept_downloads=True)
 if MODE=='canvas':
  context.add_init_script("const original=HTMLCanvasElement.prototype.getContext;HTMLCanvasElement.prototype.getContext=function(type,...args){return /webgl/i.test(type)?null:original.call(this,type,...args)};")
 page=context.new_page();errors=[];requests=[]
 page.on('pageerror',lambda e:errors.append(str(e)))
 page.on('request',lambda r:requests.append(r.url))
 response=page.goto(url,wait_until='load');assert response.status==200
 assert 'Whole-cell Remodeling' in page.title()
 assert not page.locator('video, #referenceToggle, #referenceVideo').count()
 assert 'data:video' not in page.content()
 record('Actual HTTP route loads without private comparison media')
 page.wait_for_function('!!window.lab')
 page.evaluate('lab.setRunning(false); lab.reset(2646,CellEngine.DEFAULTS);')
 assert page.evaluate('lab.simulation.validate().length')==0
 backend=page.evaluate('lab.renderer.backend')
 assert ('WebGL' in backend) if MODE=='webgl' else (backend=='Canvas 2D')
 record('Application boot and finite state',backend)
 assert not [u for u in requests if u.startswith(('http://','https://')) and urlsplit(u).netloc!=origin]
 record('No external runtime resource requests')
 page.locator('#step').click();assert abs(page.evaluate('lab.simulation.time')-1)<1e-6
 record('Single-minute stepping pauses and advances fixed numerical steps')
 page.locator('#play').click();page.wait_for_timeout(1700);page.locator('#play').click()
 clock=page.evaluate('lab.simulation.time');assert clock>5
 record('Live playback advances simulated time',{'modelMinutes':clock})
 page.evaluate('lab.reset(2646,CellEngine.DEFAULTS); lab.advance(40);')
 for mode in ['1','2','0']:
  page.locator('[data-mode="'+mode+'"]').click();assert page.evaluate('lab.renderer.mode')==int(mode)
  assert not errors
 record('All three observation modes render without exceptions')
 page.locator('#labels').check();assert page.evaluate('lab.renderer.labels')
 page.locator('#fit').click();assert page.evaluate('Number.isFinite(lab.renderer.zoom)')
 record('Process labels and fit-to-cell controls')
 page.locator('#contractility').evaluate('(e)=>{e.value="1.4";e.dispatchEvent(new Event("input",{bubbles:true}));e.dispatchEvent(new Event("change",{bubbles:true}));}')
 assert page.evaluate('lab.simulation.params.contractility')==1.4
 record('Parameter slider updates numerical state')
 before=page.evaluate('lab.simulation.stats.launched');page.locator('#waveButton').click();assert page.evaluate('lab.simulation.stats.launched')==before+1
 before=page.evaluate('lab.simulation.pulses.length');page.locator('#pulseButton').click();assert page.evaluate('lab.simulation.pulses.length')==before+1
 record('Both manual perturbation buttons affect solver state')
 stage=page.locator('#stage');box=stage.bounding_box();page.mouse.click(box['x']+box['width']*.4,box['y']+box['height']*.4)
 assert page.evaluate('lab.simulation.pulses.length')==before+2
 record('Direct local-pulse interaction on microscope')
 with page.expect_download() as info: page.locator('#save').click()
 state_path=OUT/'browser-export-state.json';info.value.save_as(state_path)
 exported=json.loads(state_path.read_text());assert exported['schema']=='whole-cell-remodeling/v1'
 record('Save-state button downloads valid JSON')
 page.evaluate('lab.advance(10)')
 page.locator('#loadFile').set_input_files(str(state_path));page.wait_for_timeout(300)
 assert abs(page.evaluate('lab.simulation.time')-exported['time'])<1e-9
 assert page.evaluate('lab.simulation.exportState()')=={k:v for k,v in exported.items() if k!='view'}
 record('Load-state file input restores exact exported numerical state')
 before_import=page.evaluate('JSON.stringify(lab.simulation.exportState())')
 page.locator('#loadFile').set_input_files({'name':'invalid.json','mimeType':'application/json','buffer':b'{broken'})
 page.wait_for_function("document.getElementById('toast').textContent.startsWith('Could not load:')")
 assert page.evaluate('JSON.stringify(lab.simulation.exportState())')==before_import
 assert page.locator('#loadFile').input_value()==''
 page.locator('#loadFile').set_input_files(str(state_path))
 page.wait_for_function("document.getElementById('toast').textContent.startsWith('Restored exact')")
 assert page.evaluate('JSON.stringify(lab.simulation.exportState())')==before_import
 record('Malformed import preserves state and the same valid file can be loaded again')
 for label,mutate in [('event',lambda d:d.update(events=[None])),('filopodium',lambda d:d['somaFilopodia'].__setitem__(0,None))]:
  malformed=json.loads(before_import);mutate(malformed)
  page.locator('#loadFile').set_input_files({'name':label+'.json','mimeType':'application/json','buffer':json.dumps(malformed).encode()})
  page.wait_for_function("document.getElementById('toast').textContent.startsWith('Could not load:')")
  assert page.evaluate('JSON.stringify(lab.simulation.exportState())')==before_import
 page.locator('#play').click();page.wait_for_function('lab.simulation.time > '+str(exported['time']+1));page.locator('#play').click()
 assert page.evaluate('lab.simulation.validate().length')==0
 record('Malformed JSON shapes preserve live state and playback remains usable')


 with page.expect_download() as info:page.locator('#csv').click()
 csv_path=OUT/'browser-export.csv';info.value.save_as(csv_path)
 assert 'geometric_arclength_um' in csv_path.read_text();assert len(csv_path.read_text().splitlines())>5
 record('CSV export includes separate material and geometric measurements')
 with page.expect_download() as info:page.locator('#snapshot').click()
 png_path=OUT/'browser-export.png';info.value.save_as(png_path)
 assert png_path.read_bytes().startswith(b'\x89PNG')
 record('PNG snapshot button downloads an image')
 page.locator('#notes').click();assert page.locator('#notesDialog').evaluate('(e)=>e.open');page.locator('#closeNotes').click()
 page.locator('#notes').click();page.keyboard.press('Escape');assert not page.locator('#notesDialog').evaluate('(e)=>e.open')
 record('Model notes opens, closes and reopens with Escape recovery')
 page.locator('#preset').select_option('uncoupled');assert page.evaluate('lab.simulation.params.coupling')==0
 page.locator('#newSeed').click();assert page.evaluate('lab.simulation.seed')!=2646
 record('Preset selection and new-cell seed reset')
 page.evaluate('lab.setRunning(false);lab.reset(2646,CellEngine.DEFAULTS);lab.advance(45);lab.renderer.fit(lab.simulation);lab.render();')
 page.locator('#labels').uncheck();page.screenshot(path=str(OUT/'final-interface.png'),full_page=True)
 page.locator('#stage').screenshot(path=str(OUT/'final-cell.png'))
 page.set_viewport_size({'width':390,'height':844});page.wait_for_timeout(300)
 assert page.evaluate('document.documentElement.scrollWidth')<=392
 page.screenshot(path=str(OUT/'mobile-interface.png'),full_page=True)
 record('390-pixel narrow-screen layout has no horizontal overflow')
 page.set_viewport_size({'width':1280,'height':900});page.wait_for_timeout(200)
 state_before=page.evaluate('JSON.stringify(lab.simulation.exportState())')
 page.evaluate('for(let i=0;i<5;i++)lab.render()')
 state_after=page.evaluate('JSON.stringify(lab.simulation.exportState())');assert state_before==state_after
 record('Rendering never mutates numerical or random-generator state')
 page.locator('#speed').select_option('60');assert page.evaluate('lab.simulation.dt')==0.04
 record('Playback speed leaves numerical timestep unchanged')
 page.locator('#reset').click();a=page.evaluate('JSON.stringify(lab.simulation.exportState())');page.locator('#reset').click();assert page.evaluate('JSON.stringify(lab.simulation.exportState())')==a
 record('Repeated restart is deterministic')
 assert not errors;record('No uncaught browser exceptions',errors)
 report={'suite':'Browser software verification','browser':b.version,'backend':page.evaluate('lab.renderer.backend'),'tests':len(results),'passed':len(results),'failed':0,'results':results,'pageErrors':errors,'externalRequests':[u for u in requests if u.startswith(('http://','https://')) and urlsplit(u).netloc!=origin], 'route':url, 'limitations':'Browser interactions were exercised on the actual HTTP route. WebGL uses SwiftShader in CI, not a physical GPU. Synthetic imagery is not biological validation.'}
 (OUT/'browser-tests.json').write_text(json.dumps(report,indent=2))
 b.close()
server.shutdown()
