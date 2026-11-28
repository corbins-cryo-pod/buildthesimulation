#!/usr/bin/env python3
"""Add native workflow playback to the original 16-stage Flex-rigid ECoG bundle.

The editable source for the original bundle is not versioned here. This is a
repeatable, checked transform of the published standalone bundle. Never point it
at a different lab or at a bundle that already contains playback.
"""
from pathlib import Path
import argparse
import re
import subprocess

ROOT=Path(__file__).resolve().parents[4]
SHARED=Path(__file__).resolve().parents[1]/'_shared'
BASE='4edaf79499783374f9d04f14a1fa56062ca13c10'
BUNDLE='public/simulations/flex-rigid-ecog-foundry/index.html'
JS=(SHARED/'workflow-player.js').read_text()
CSS=(SHARED/'workflow-player.css').read_text()

def exact(h,old,new):
    n=h.count(old)
    assert n==1,(old[:200],n)
    return h.replace(old,new)

def panel(id, label='Workflow progress', initial='Inspect the current stage'):
    return f'''<div class="foundry-playback" data-foundry-playback role="group" aria-label="Workflow playback">
<button type="button" id="{id}" data-foundry-play aria-label="Play workflow">Play workflow</button><div class="foundry-playback-readout"><progress max="1" value="0" aria-label="{label}"></progress><span data-foundry-current>{initial}</span></div><span data-foundry-notice role="status" aria-live="polite"></span>
</div>'''

def flex(h):
    h=exact(h,'<div class="holder"><div id="model" class="model" aria-label="Workpiece viewer"></div></div>',
      panel('play-flex','Stages committed')+'<div class="holder"><div id="model" class="model" aria-label="Workpiece viewer" data-foundry-inspect></div></div>')
    h=exact(h,'<button id="auto">Finish this lot</button>','<button id="auto">Skip to bench</button>')
    h=exact(h,'function Tr(){let i=Ie.n;', '''let foundryPlayer=null, foundryReplayInputs=null;
function foundryCommit(inputs){
  if(Ie.n>=In.length)return;
  Ie=Ir(Ie,inputs??Qu());
  Rr="Committed "+Ie.n+"/"+In.length+": "+In[Ie.n-1][0]+".";
  Tr();
}
function Tr(){let i=Ie.n;''')
    h=exact(h,'Ho(),Bl(),Vl(),Ss()}ue("site").innerHTML','Ho(),Bl(),Vl(),Ss();foundryPlayer?.sync()}ue("site").innerHTML')
    h=exact(h,'ue("commit").onclick=()=>{Ie=Ir(Ie,Qu()),Rr="Committed "+Ie.n+"/16: "+In[Ie.n-1][0]+".",Tr()}',
      'ue("commit").onclick=()=>{if(foundryReplayInputs)foundryReplayInputs[Ie.n]=null;foundryCommit()}')
    h=exact(h,'ue("auto").onclick=()=>{for(;Ie.n<16;)','ue("auto").onclick=()=>{foundryReplayInputs=null;for(;Ie.n<16;)')
    h=exact(h,'ue("experiment").onclick=()=>{Ie=','ue("experiment").onclick=()=>{foundryReplayInputs=null;Ie=')
    h=exact(h,'ue("roll").onclick=()=>{Ie=','ue("roll").onclick=()=>{foundryReplayInputs=null;Ie=')
    h=exact(h,'Ie=t,vt=e.selected,Gt=e.reference','foundryReplayInputs=null,Ie=t,vt=e.selected,Gt=e.reference')
    h=exact(h,'sample:Ie.sample,area:Ie.area});Tr();})();',
      '''sample:Ie.sample,area:Ie.area});
foundryPlayer=window.installFoundryPlayback({
  button:ue("play-flex"), frames:[ue("model"),ue("section")],
  read:()=>({completed:Ie.n,total:In.length,done:Ie.n===In.length,
    text:Ie.n+" / "+In.length+" committed · "+(Ie.n===In.length?"Bench ready":"Next: "+In[Ie.n][0])}),
  advance:()=>foundryCommit(foundryReplayInputs?.[Ie.n]),
  replay:()=>{
    // Replay this lot's exact committed choices, including defects or a verified import.
    foundryReplayInputs=Ie.ledger.map(entry=>({...entry.inputs}));
    Ie=Us();
    Rr="Replaying this lot's saved stage choices.";
    Tr();
  }
});
function foundryDropEditedOperation(ev){
  if(foundryReplayInputs&&ev.target instanceof Element&&ev.target.closest("#params"))
    foundryReplayInputs[Ie.n]=null;
}
ue("params").addEventListener("input",foundryDropEditedOperation);
ue("params").addEventListener("change",foundryDropEditedOperation);
Tr();})();''')
    return h, '.work .foundry-playback{margin:7px 0 8px}'

def install(text):
    h,extra=flex(text)
    h=exact(h,'</style>','\n'+CSS+'\n'+extra+'\n</style>')
    at=re.search(r'<script(?:\s|>)',h).start()
    return h[:at]+'<script>\n'+JS+'\n</script>\n'+h[at:]

if __name__=='__main__':
    p=argparse.ArgumentParser(description=__doc__)
    p.add_argument('output',type=Path,help='destination HTML')
    p.add_argument('--source',type=Path,help='standalone bundle without playback, defaults to the pinned Git revision')
    a=p.parse_args()
    if a.source:
        incoming=a.source.read_text()
    else:
        incoming=subprocess.check_output(['git','show',BASE+':'+BUNDLE],cwd=ROOT).decode()
    try:
        built=install(incoming)
    except (AssertionError,AttributeError) as exc:
        raise SystemExit(f'Unexpected ECoG bundle version; the playback hooks were not applied: {exc}')
    a.output.parent.mkdir(parents=True,exist_ok=True)
    a.output.write_text(built)
    print(a.output)
