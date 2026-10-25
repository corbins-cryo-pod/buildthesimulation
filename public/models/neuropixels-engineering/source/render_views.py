"""Render all drawing views from the exact GLB geometry used by the offline viewer."""
from pathlib import Path
from playwright.sync_api import sync_playwright
import base64,json
R=Path(__file__).resolve().parents[1];out=R/'drawings/renders';out.mkdir(exist_ok=True)
views={
 'isometric':{'size':(1200,1700),'model':'study','view':'iso','span':14.9,'target':[0,6.4,0],'yaw':-.58,'pitch':.24,'roll':.40},
 'front':{'size':(350,900),'model':'study','view':'front','span':14.6,'target':[0,6.4,0]},
 'side':{'size':(260,900),'model':'study','view':'side','span':14.6,'target':[0,6.4,0]},
 'tip':{'size':(750,950),'model':'study','view':'tip','span':.36,'target':[0,.16,0],'yaw':-.58,'pitch':.24,'roll':.18},
 'array':{'size':(900,780),'model':'study','view':'array','span':.135,'target':[0,.26,.012],'yaw':-.42,'pitch':.28,'roll':.1},
 'electrode':{'size':(850,780),'model':'study','view':'electrode','span':.018,'yaw':-.40,'pitch':.48,'roll':-.10},
 'reference':{'size':(900,1500),'model':'reference','view':'iso','flex':True,'span':84.,'target':[0,35.2,3],'yaw':-.42,'pitch':.17,'roll':.12},
 'reference-head':{'size':(850,1400),'model':'reference','view':'head','flex':False,'span':27,'target':[0,21.2,.15],'yaw':-.50,'pitch':.24,'roll':.05},
 'study-head':{'size':(1050,1050),'model':'study','view':'head','span':3.9,'yaw':-.48,'pitch':.35,'roll':-.08}
}
points={'tip':[0,0,0],'shank_proximal':[0,10,0],'tip_base_left':[-.035,.175,.012],'tip_base_right':[.035,.175,.012],
'first_site_left':[-.030,.194,.01224],'first_site_right':[-.018,.194,.01224],
'row0':[-.024,.2,.01224],'row1':[-.008,.22,.01224], 'array_left':[-.035,.31,.012],'array_right':[.035,.31,.012],
'contact_ll':[-.006,-.006,.00024],'contact_lr':[.006,-.006,.00024],'contact_ur':[.006,.006,.00024],
'gold_fingers':[0,12.78,.07],'head_lateral_pad':[.65,11.97,.07],'mid_shank':[0,5,.012],'tip_ref':[0,.1,.01218]}
meta={};errors=[]
with sync_playwright() as p:
 b=p.chromium.launch(executable_path='/usr/bin/chromium',headless=False,args=['--no-sandbox','--ignore-gpu-blocklist','--use-gl=angle','--use-angle=gl','--disable-gpu-sandbox'])
 pg=b.new_page(viewport={'width':1200,'height':1700},device_scale_factor=1)
 pg.on('pageerror',lambda e:errors.append(str(e)))
 pg.set_content((R/'neuropixels-3d-viewer.html').read_text(),wait_until='load')
 pg.wait_for_function('window.NPX && window.NPX.state && window.NPX.state().ready',timeout=30000)
 pg.add_style_tag(content='header,.toolbar,.sidebar,footer{display:none!important}.app{height:100vh!important;display:block!important}.canvas-area{width:100vw!important;height:100vh!important}.view-tag,.badge,.scale,.help,.micro-note,.overlay{display:none!important}')
 for name,conf in views.items():
  w,h=conf['size'];pg.set_viewport_size({'width':w,'height':h})
  c={k:v for k,v in conf.items() if k!='size'};c['dimensions']=False
  pg.evaluate('(c)=>NPX.configure(c)',c)
  pg.wait_for_timeout(160)
  png=pg.evaluate('NPX.exportImage()').split(',')[1]
  (out/f'{name}.png').write_bytes(base64.b64decode(png))
  pp={k:pg.evaluate('(p)=>NPX.project(p)',v) for k,v in points.items()}
  meta[name]={'size':[w,h],'config':c,'projected':pp,'state':pg.evaluate('NPX.state()'),'render':pg.evaluate('NPX.lastRender')}
  print(name,meta[name]['render'])
 b.close()
(out/'projection-metadata.json').write_text(json.dumps(meta,indent=2))
(R/'validation/render-errors.json').write_text(json.dumps(errors,indent=2))
