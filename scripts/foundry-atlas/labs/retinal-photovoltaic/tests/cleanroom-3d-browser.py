#!/usr/bin/env python3
"""Launch through the research lab's actual Play button; set CHROME_BIN if needed."""
import contextlib,functools,http.server,io,json,os,threading,time
from pathlib import Path
from PIL import Image
from playwright.sync_api import sync_playwright
ROOT=Path(__file__).resolve().parents[5]
OUT=Path(os.environ.get('PV_QA_ARTIFACTS','/tmp/retinal-pv-3d-qa'))
WATCH="""async()=>{
  const T=await import('/vendor/three/three.module.js'),base=T.Scene.prototype.onBeforeRender;
  window.retinalFrames={};
  T.Scene.prototype.onBeforeRender=function(renderer,s,...args){
    if(s.userData?.role?.startsWith('cleanroom-')){
      const a={names:[],ids:[],projected:[]}; s.traverseVisible(o=>{
        if(o.userData?.pvPart){a.names.push(o.userData.pvPart);a.ids.push(o.uuid)}
        if(o.userData?.workpiece?.nativeSiteCount===7)a.metadata=o.userData.workpiece;
      });window.retinalFrames[s.userData.role]=a;
    }return base.call(this,renderer,s,...args);
  };
}"""
class Quiet(http.server.SimpleHTTPRequestHandler):
 def log_message(self,*args):pass
def main():
 OUT.mkdir(exist_ok=True,parents=True)
 with contextlib.ExitStack() as close:
  s=http.server.ThreadingHTTPServer(('127.0.0.1',0),functools.partial(Quiet,directory=str(ROOT/'public')))
  threading.Thread(target=s.serve_forever,daemon=True).start();close.callback(s.server_close);close.callback(s.shutdown)
  pw=close.enter_context(sync_playwright());exe=os.environ.get('CHROME_BIN') or str(ROOT.parent/'production-equipment-qa/runtime/chrome-bin/chrome')
  br=pw.chromium.launch(executable_path=exe,args=['--no-sandbox','--no-proxy-server','--disable-dev-shm-usage','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']);close.callback(br.close)
  page=br.new_page(viewport={'width':1030,'height':840},reduced_motion='reduce');page.set_default_timeout(28000)
  errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
  page.goto(f'http://127.0.0.1:{s.server_port}/simulations/retinal-photovoltaic-foundry/',wait_until='domcontentloaded');page.evaluate(WATCH)
  page.locator('[data-fp=action]').click();page.locator('canvas[data-cleanroom-world]').wait_for()
  page.locator('[data-fp=jump]').select_option('2');page.locator('[data-cr-view=inspect]').click()
  results=[]
  for i,feature in [(2,'etched-to-BOX'),(3,'lined-trench-fill'),(4,'planarized-polysilicon'),(10,'selective-interpixel-reopen'),(11,'central-and-return-IrOx'),(12,'released-research-coupon')]:
   page.locator('[data-fp=jump]').select_option(str(i));page.locator('[data-cr-view=inspect]').click()
   page.wait_for_function("()=>document.querySelector('canvas[data-cleanroom-world]')?.dataset.mode==='inspect'")
   try:page.wait_for_function("f=>window.retinalFrames?.['cleanroom-after']?.metadata?.activeFeature===f",arg=feature)
   except Exception:
    print(json.dumps(page.evaluate("""()=>({canvas:{...document.querySelector('canvas[data-cleanroom-world]')?.dataset},fp:{...document.querySelector('.fp-player').dataset},frames:retinalFrames,room:document.querySelector('.cr-room')?.innerText.slice(0,950)})""")),flush=True);raise
   frames=page.evaluate('()=>retinalFrames');before=frames['cleanroom-before'];after=frames['cleanroom-after'];assert before['metadata']['activeFeature']!=after['metadata']['activeFeature']
   assert 'wafer' in after['names'] and after['metadata']['nominalPixelWidthUm']==140
   img=page.locator('canvas[data-cleanroom-world]').screenshot();im=Image.open(io.BytesIO(img)).convert('RGB')
   # The solid cutaway, not just clear-color/background or canvas dimensions.
   region=im.crop((8,int(im.height*.2),im.width-8,int(im.height*.9)))
   colors=region.getcolors(region.width*region.height);bg=[c for v,c in sorted(colors,reverse=True)[:2]]
   fg=sum(v for v,c in colors if all(max(abs(a-b) for a,b in zip(c,base))>36 for base in bg))
   assert fg>region.width*region.height*.022,('missing foreground specimen',feature,fg,region.size)
   (OUT/(str(i)+'-'+feature+'.png')).write_bytes(img);results.append([i,before['metadata']['activeFeature'],feature,len(after['names']),len(colors)])
  page.locator('[data-fp=close]').click();page.set_viewport_size({'width':390,'height':844});page.locator('#size').select_option('70')
  page.locator('[data-fp=action]').click();page.locator('[data-fp=jump]').select_option('11');page.locator('[data-cr-view=inspect]').click()
  page.wait_for_function("()=>retinalFrames?.['cleanroom-after']?.metadata?.nominalPixelWidthUm===70");assert page.evaluate("()=>retinalFrames['cleanroom-after'].metadata.centerDiameterUm")==20
  (OUT/'mobile-70um-inspector.png').write_bytes(page.locator('canvas[data-cleanroom-world]').screenshot())
  page.locator('[data-route=prima]').click();assert page.locator('canvas[data-cleanroom-world]').count()==0 and not page.locator('[data-fp=action]').is_visible()
  page.locator('[data-route=wang]').click();page.locator('[data-mode=bench]').click();assert not page.locator('[data-fp=action]').is_visible()
  assert not errors,errors;print(json.dumps(results))
if __name__=='__main__':main()
