"""Execute every actual native workflow, preserving delay-based previews and commits."""
from pathlib import Path
from playwright.sync_api import sync_playwright
import io, zipfile, json, os, http.server, functools, threading
ROOT=Path(__file__).resolve().parents[1]
BROWSER=os.environ.get("CHROMIUM_PATH")
REPO_SIM=next((d/'public/simulations' for d in ROOT.parents if (d/'public/simulations').is_dir()),ROOT/'out')
ARTIFACTS=Path(os.environ.get("FOUNDRY_PLAY_ARTIFACTS",ROOT/'out' if (ROOT/'out').is_dir() else REPO_SIM))
class Server(http.server.SimpleHTTPRequestHandler):
 def log_message(self,*a): pass
s=http.server.ThreadingHTTPServer(('127.0.0.1',0),functools.partial(Server,directory=ARTIFACTS))
threading.Thread(target=s.serve_forever,daemon=True).start()
base=f'http://127.0.0.1:{s.server_port}'
names={'utah-array-fabrication':(5,'#stageList','#stageTitle','#inspection'),'neuropixels-foundry':(20,'#steps','#station','#recording'),'masmanidis-64d-foundry':(18,'#steps','#station','#bench'),'neuropixels-family':(5,None,None,'#metrics')}
pstate='.bts-workflow-player'
play='[data-flow-role=play]'
replay='[data-flow-role=replay]'
prog='[data-flow-role=progress]'
status='[data-flow-role=status]'
PHONE_ONLY=os.environ.get("PHONE_ONLY")
CLASSIC='utah-array-fabrication'
FAMILY='neuropixels-family'
with sync_playwright() as playwright:
 b=playwright.chromium.launch(executable_path=BROWSER,args=['--no-sandbox','--disable-gpu','--disable-webgl','--no-proxy-server'])
 sizes=[('desktop',dict(viewport={'width':1440,'height':1000}),'no-preference'),('iPhone reduced',playwright.devices['iPhone 13'],'reduce')]
 for label,dev,m in sizes:
  if PHONE_ONLY and m!='reduce':continue
  for name,(count,list_sel,head,out) in names.items():
   ctx=b.new_context(accept_downloads=True,reduced_motion=m,**dev);p=ctx.new_page()
   p.set_default_timeout(5000)
   errors=[];network=[];p.on('pageerror',lambda e:errors.append(str(e)));p.on('request',lambda e:network.append(e.url) if not e.url.startswith(base) and not e.url.startswith('blob:') else None)
   p.clock.install()
   p.goto(base+'/'+name+'/',wait_until='domcontentloaded')
   L=p.locator
   state=lambda:L(pstate).get_attribute('data-player-state')
   stage=lambda:int(L(pstate).get_attribute('data-workflow-step'))
   nativeHead=lambda:L(head).inner_text() if head else ''
   started=L(pstate).get_attribute('data-player-state')
   assert started=='idle' and stage()==0 and int(L(prog).get_attribute('max'))==count,(name,started,L(prog).get_attribute('max'))
   p.clock.run_for(1500);assert state()=='idle' and stage()==0
   old=nativeHead()
   # Track actual DOM mutations, not player-only counters.
   p.evaluate("""(cfg)=>{const obs=[];window.workflowNativeEvents=obs;const buttonIds=new Set(['preview','commit','transfer','capture','run','reset', 'auto']);document.addEventListener('click',e=>{if(buttonIds.has(e.target.id)||e.target.parentElement?.id==='actions'){obs.push([e.target.id,Date.now(),e.isTrusted]);}},true);window.workflowNativeStageLabels=[];if(cfg){const x=document.querySelector(cfg);new MutationObserver(()=>{const t=x.innerText;if(window.workflowNativeStageLabels.at(-1)!==t)window.workflowNativeStageLabels.push(t);}).observe(x,{characterData:true,childList:true,subtree:true});}}""",head)
   L(play).click();assert L(play).inner_text()=='Pause workflow'
   p.clock.run_for(950);assert state()=='running', (name,state(),L(status).text_content())
   if m=='reduce':
    assert p.evaluate("!document.querySelector('[data-bts-flow-active]')?.getAnimations().length")
   L(play).click();assert state()=='paused'
   a=p.evaluate('window.workflowNativeEvents.length');at=stage();shead=nativeHead()
   p.clock.run_for(5400);assert stage()==at and p.evaluate('window.workflowNativeEvents.length')==a and shead==nativeHead()
   L(play).click()
   p.clock.run_for(1800);assert state()=='running', (name,state(),L(status).text_content())
   # A real browser user action pauses before the action is delivered.
   if name==CLASSIC:L('#view-coupon').click()
   elif name==FAMILY:
    L('#fault').focus();p.keyboard.press('ArrowDown')
   elif name=='masmanidis-64d-foundry':L('#neckView').click()
   else:
    L('#inputs input').first.focus();p.keyboard.press('ArrowRight')
   assert state()=='paused', (name,state())
   assert 'manual' in L(status).inner_text().lower()
   a=p.evaluate('window.workflowNativeEvents.length')
   p.clock.run_for(4200);assert p.evaluate('window.workflowNativeEvents.length')==a
   currentSettings=None
   if name==FAMILY:
    p.select_option('#model','quad');p.select_option('#pattern','counts')
    p.select_option('#fault','shank');p.select_option('#faultshank','2')
    currentSettings=p.evaluate("['model','pattern','fault','faultshank'].map(x=>document.getElementById(x).value)")
    assert currentSettings==['quad','counts','shank','2']
   L(play).click()
   for _ in range(90):
    if state()!='running':break
    # fast_forward advances an interval without pumping the native RAF at full display cadence
    p.clock.fast_forward(2250)
   assert state()=='done',(name,state(),nativeHead(),L(status).inner_text(),L('#status').inner_text() if L('#status').count() else '')
   assert stage()==count and p.evaluate("document.querySelector('[data-flow-role=progress]').position")==1
   assert L('[data-flow-role=output]').is_visible() and L(out).is_visible()
   ev=p.evaluate('window.workflowNativeEvents')
   auto=[(i,t) for i,t,tr in ev if not tr]
   assert not any(i=='auto' for i,t in auto)
   if name==CLASSIC:
    assert sum(i=='transfer' for i,t in auto)==5 and L('#history tr').count()==5
    assert L('#revision').inner_text()=='r6' and 'symbolic' in L('#inspection').inner_text()
    phases=p.evaluate('window.workflowNativeStageLabels')
    assert phases[-5:]==['Flush glass','Front geometry','Rough versus round','Face labels and map','Final inspection ready'],phases
    with p.expect_download() as d:L('#exportInspected').click()
    assert 'json' in d.value.suggested_filename
    data=json.loads(Path(d.value.path()).read_text());assert data['revision']==6
   elif name==FAMILY:
    assert p.evaluate("['model','pattern','fault','faultshank'].map(x=>document.getElementById(x).value)")==currentSettings
    assert L('#json').is_enabled() and '384 selected tags' in L('#runStatus').inner_text()
    with p.expect_download() as d:L('#json').click()
    data=json.loads(Path(d.value.path()).read_text());assert data['summary']['missing']==384 and data['summary']['expected']==1536
   else:
    filtered=[(i,t) for i,t in auto if i in ('preview','commit','capture')]
    # Manually touching a staged slider explicitly invalidates its proposal; a second preview is required.
    kinds=[x[0] for x in filtered]
    assert kinds.count('commit')==count-1 and kinds.count('capture')==1 and kinds[-1]=='capture',kinds
    pending=None
    for action,at in filtered:
     if action=='preview':pending=at
     if action=='commit':
      assert pending is not None and at-pending>=1050,(pending,at)
      pending=None
    assert len(p.evaluate('window.workflowNativeStageLabels'))==count
    row='#log' if count==20 else '#history'
    assert L(row+' tr').count()==count and L('#rev').text_content()=='r'+str(count),(name,L(row+' tr').count(),L('#rev').text_content(),L(row).inner_text()[:240])
    assert L('#export').is_enabled()
    with p.expect_download() as d:L('#export').click()
    with zipfile.ZipFile(d.value.path()) as zip:assert len(zip.namelist())>=4 and zip.testzip() is None
   if name!=FAMILY:
    L(replay).click();assert L('[data-flow-role=confirm]').is_visible()
    assert stage()==count
    L('[data-flow-role=keep]').click();assert stage()==count
    L(replay).click();L('[data-flow-role=restart]').click()
   else:L(replay).click()
   assert stage()==0 and state()=='running'
   p.clock.fast_forward(1100);assert state()=='running'
   # A replay of a completed synthetic tour runs again; source route and page links remain.
   if state()=='running':L(play).click()
   assert p.evaluate('document.documentElement.scrollWidth-innerWidth')<=1
   assert not errors,(name,errors)
   assert not network,(name,network)
   print('PASS',label,name,'stages',count,'native timed actions',len(auto),flush=True)
   ctx.close()
 b.close()
s.shutdown()
