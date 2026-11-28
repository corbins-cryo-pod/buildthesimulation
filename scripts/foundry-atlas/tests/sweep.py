#!/usr/bin/env python3
"""Exhaustive read-only presentation sweep for every bundled device, route, branch, and instrument.

The browser.py end-to-end suite tests actual click/touch navigation; this complements
it by driving the same DOM change controls over the release's entire finite data set.
"""
import argparse,json,os,shutil
from pathlib import Path
from playwright.sync_api import sync_playwright
a=argparse.ArgumentParser();a.add_argument('html',type=Path);n=a.parse_args()
with sync_playwright() as p:
 kw={'headless':True,'args':['--no-sandbox','--no-proxy-server','--disable-gpu','--disable-dev-shm-usage']};c=[os.environ.get('CHROME_BIN'),os.environ.get('CHROMIUM_PATH'),str(Path(__file__).resolve().parents[3]/'production-equipment-qa/runtime/chrome-bin/chrome'),shutil.which('chromium'),shutil.which('google-chrome')];exe=next((x for x in c if x and Path(x).is_file()),None)
 if exe:kw['executable_path']=exe
 b=p.chromium.launch(**kw);pg=b.new_page(viewport={'width':360,'height':740},has_touch=True,is_mobile=True);errors=[];pg.on('pageerror',lambda e:errors.append(str(e)))
 pg.goto(n.html.resolve().as_uri(),wait_until='load')
 result=pg.evaluate("""() => {
   const data=JSON.parse(document.querySelector('#atlas-data').textContent),report={devices:0,deviceProfileLinks:0,profiles:0,steps:0,branchSelections:0,branchSensitiveHandoffs:0,excludedHandoffs:0,instruments:0,reverseProfileLinks:0},sel=s=>document.querySelector(s),list=s=>Array.from(document.querySelectorAll(s));
   const check=(x,why)=>{if(!x)throw Error(why)};
   const select=(s,v)=>{const el=sel(s);check(el,'Missing control '+s);el.value=v;check(el.value===v,'Missing option '+v);el.dispatchEvent(new Event('change',{bubbles:true}))};
   const dimensions=id=>check(document.documentElement.scrollWidth-document.documentElement.clientWidth<=1,'Overflow on '+id);
   const P=new Map(data.profiles.map(p=>[p.id,p]));
   for(const d of data.devices){select('#mobile-select',d.slug);check(sel('#detail-heading').textContent===d.title,'Device: '+d.slug);for(const id of d.profileIds){if(d.profileIds.length>1)select('#route-select',id);check(sel('.route-header h4').textContent===P.get(id).title,'Device-to-route: '+d.slug);report.deviceProfileLinks++}dimensions(d.slug);report.devices++}
   sel('#mode-profiles').click();
   for(const p of data.profiles){select('#mobile-select',p.id);check(sel('#detail-heading').textContent===p.title,'Profile: '+p.id);check(list('details[data-step]').length===p.steps.length,'Step count: '+p.id);report.steps+=p.steps.length;check(list('.source-list li').length===p.sources.length,'Source row count: '+p.id);check(list('.equipment-chip').every(x=>x.hasAttribute('data-equipment')),'Unresolved equipment: '+p.id);for(const v of p.variants){select('#variant-select',v.id);check(sel('.branch-note strong').textContent.includes(v.label),'Variant: '+p.id+':'+v.id);const applies=x=>v.status!=='incompatible'&&(!(x.only||[]).length||x.only.includes(v.id));const excluded=p.steps.filter(x=>!applies(x)).length;check(list('.not-applicable').length===excluded,'Branch exclusions: '+p.id+':'+v.id);report.excludedHandoffs+=excluded;const expected=p.steps.filter(x=>applies(x)&&(x.varies||[]).includes(v.id)).length;check(list('.flag').length===expected,'Sensitive-step markers: '+p.id+':'+v.id);report.branchSensitiveHandoffs+=expected;report.branchSelections++;dimensions(p.id+':'+v.id)}list('#detail details').forEach(x=>x.open=true);dimensions(p.id);report.profiles++}
   sel('#mode-equipment').click();
   for(const e of data.equipment){select('#mobile-select',e.id);check(sel('#detail-heading').textContent===e.name,'Equipment: '+e.id);const expected=data.profiles.filter(p=>p.steps.some(s=>s.tools.includes(e.id))).map(p=>p.id).sort();const found=list('#detail [data-profile]').map(el=>el.dataset.profile).sort();check(JSON.stringify(expected)===JSON.stringify(found),'Equipment-to-route links: '+e.id);report.reverseProfileLinks+=found.length;dimensions(e.id);report.instruments++}return report;
 }""")
 assert not errors,errors;print(json.dumps(dict(status='PASS',viewport='360x740',**result),indent=2));b.close()
