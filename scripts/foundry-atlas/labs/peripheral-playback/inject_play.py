#!/usr/bin/env python3
"""Rebuild only these five laboratory animation overlays from a fresh unpatched static HTML build.

Pass the simulations directory (lab-name/index.html children) and a separate destination.
The injector asserts the original script anchor, inserts first-party renderer and closure
adapter once, and keeps the existing body, script and models byte-for-byte otherwise.
"""
from __future__ import annotations
import argparse
import hashlib
import json
import re
from pathlib import Path

root=Path(__file__).resolve().parent
src=root/'src'
interrupt = {
    'cuff': '#t-workshop,#t-bench,#t-evidence,#homeview,#view,#commit,#rewind,#goBench,#auto,#reset,#upload,#download,#rail button,#returnTo,#fields input,#fields select',
    'stent': '#prev,#next,#finish,#reset,#stages button,#volume,#flat,#diam,#rot,#site,#inspection,#fault,#cover,#clear,#baseline,#export,#csv,#obj',
    'time': '#tabs button,#all,#reset,#station,#advance,#prev,#next,#build label,#fault,#target,#returnMode,#blocked,#overlay,#hz',
    'roll': '#tabbar button,#mode,#runTop,#reset,#step,#previous,#next,#advance,#focus,#faceAngle,#drift,#maskVisible,#wiresVisible',
    'retinal': '[data-mode],[data-route],[data-view],[data-stage],#prev,#next,#load-witness,#bench-load,#size,#fault,#target,#power'
}
buildOf = {
    'cuff': (
        "$('drawing').closest('.viz')", "[$('drawing').closest('.viz').nextElementSibling]",
        """
        const witness = E.nominal();
        for(let i=0;i<log.length;i++) witness[i]=log[i];
        if(log.length<witness.length) witness[log.length]=getfields(log.length);
        return {scenes:window.FoundryCuffScenes(E,D,E.inspect(witness),d),branch:'dong-2018',dataset:{...E.inspect(witness).p,diameter:d}};
        """
    ),
    'stent': ("$('geometry')", "[]", "return {scenes:window.FoundryStentScenes(E,{...state}),branch:'oxley-2016',dataset:{...state}};"),
    'time': ("$('process')", "[$('processCap')]", "return {scenes:window.FoundryTimeScenes(E,{...cfg}),branch:'time-4h',dataset:{...cfg}};"),
    'roll': ("$('process')", "[$('stageCaption')]", "return {scenes:window.FoundryRollScenes(E,{...draft},result),branch:draft.mode,dataset:{...draft}};"),
    'retinal': ("$('drawing')", "[$('drawing-caption')]", "return route==='wang' && mode==='traveler'?{scenes:window.FoundryRetinalScenes(E,M,{...specimen}),branch:'wang',dataset:{...specimen,coupon:M.coupon(specimen.size)}}:[];")
}
slugs={
    'self-closing-cuff-foundry':'cuff',
    'stentrode-foundry':'stent',
    'time-4h-foundry':'time',
    'rolled-microchannels-foundry':'roll',
    'retinal-photovoltaic-foundry':'retinal',
}
head_marker='<!-- bts-workflow-player:1 -->'
def bundled(text, key):
    if head_marker in text:
        raise ValueError('Input already includes workflow animation')
    assert text.count('</head>')==1,key
    cs=(src/'play.css').read_text()
    text=text.replace('</head>',head_marker+'\n<style>\n'+cs+'</style>\n</head>',1)
    ms=list(re.finditer(r'<script\b[^>]*>(.*?)</script>',text,re.S|re.I))
    assert ms,key
    m=ms[-1]
    closure=m.group(1)
    check_close=list(re.finditer(r'\}\)\(\);\s*$',closure))
    assert len(check_close)==1,key
    ep=check_close[0].start()
    assert 'getElementById' in closure[:ep],key
    p,also,body=buildOf[key]
    slug=next(slug for slug,ident in slugs.items() if ident==key)
    hook=f"""
if(window.BTSFoundryPlay)window.BTSFoundryPlay.attach({{
  plate:{p},extra:{also},interrupt:{json.dumps(interrupt[key])},slug:{json.dumps(slug)},
  build:()=>{{ {body.lstrip()} }}
}});
"""
    helpers=(src/'play-core.js').read_text()
    ds=(src/f'{key}-scenes.js').read_text()
    assert '</script' not in helpers.lower() and '</script' not in ds.lower(),key
    return (text[:m.start()]+'<script>\n'+helpers+'</script>\n<script>\n'+ds+'</script>\n'+
            text[m.start():m.start(1)]+closure[:ep]+hook+closure[ep:]+text[m.end(1):])

def main():
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument('input',type=Path)
    parser.add_argument('output',type=Path)
    parser.add_argument('--lab',choices=slugs,action='append',default=[])
    a=parser.parse_args()
    if a.input.resolve()==a.output.resolve():
        parser.error('Source and destination must be separate')
    rec={}
    for slug in a.lab or slugs:
        original=a.input/slug/'index.html'
        src_text=original.read_bytes().decode('utf8')
        data=bundled(src_text,slugs[slug]).encode()
        out=a.output/slug/'index.html'
        out.parent.mkdir(parents=True,exist_ok=True)
        out.write_bytes(data)
        rec[slug]={'original_sha256':hashlib.sha256(src_text.encode()).hexdigest(),'release_sha256':hashlib.sha256(data).hexdigest(),'bytes':len(data),'relative_path':str(out.relative_to(a.output))}
    a.output.mkdir(parents=True,exist_ok=True)
    (a.output/'manifest.json').write_text(json.dumps(rec,indent=2)+'\n')
    print(json.dumps(rec,indent=2))

if __name__=='__main__':
    main()
