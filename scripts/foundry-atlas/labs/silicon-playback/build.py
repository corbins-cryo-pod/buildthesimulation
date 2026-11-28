"""Insert the standalone player without modifying the existing simulation scripts."""
from pathlib import Path
import argparse, hashlib, re
P=Path(__file__).resolve().parent
NAMES={
 'utah-array-fabrication':'<section id="workflow-bench"',
 'neuropixels-foundry':'<ol class="flow" id="steps"',
 'masmanidis-64d-foundry':'<ol class="steps" id="steps"',
 'neuropixels-family':'<div class="bench">',
}
css=(P/'src/player.css').read_bytes()
js=(P/'src/player.js').read_bytes()
base=(
 '<section class="bts-workflow-player" aria-label="Workflow playback" data-workflow="{slug}">\n'
 '<div class="bts-flow-row"><div class="bts-flow-name" data-flow-role="name">Workflow playback</div>'
 '<div class="bts-flow-buttons"><button class="primary" type="button" data-flow-role="play">Play workflow</button>'
 '<button type="button" data-flow-role="replay">Replay workflow</button></div></div>\n'
 '<progress value="0" max="1" aria-label="Workflow progress" data-flow-role="progress"></progress>\n'
 '<div class="bts-flow-row"><span class="bts-flow-name" data-flow-role="now">Workflow</span>'
 '<a data-flow-role="view" class="bts-flow-ready" hidden href="#">View current step ↓</a>'
 '<a data-flow-role="output" class="bts-flow-ready" hidden href="#">View completed output ↓</a></div>\n'
 '<div class="bts-flow-status" role="status" aria-live="polite" data-flow-role="status"></div>\n'
 '<p class="bts-flow-note" data-flow-role="note"></p>\n'
 '<div data-flow-role="confirm" class="bts-flow-confirm" hidden>Replay starts a new virtual workpiece and clears the on-screen run. Download the old run first if you want to keep it.<br>'
 '<button type="button" data-flow-role="restart">Start new run</button> <button type="button" data-flow-role="keep">Keep this run</button></div>\n'
 '</section>\n'
)
def one(buf,n,insert):
 n=n.encode()
 assert buf.count(n)==1,n
 return buf.replace(n,insert+n,1)
MARKERS=(
 (b'<style data-bts-workflow-player>',rb'\n<style data-bts-workflow-player>\n[\s\S]*?</style>\n'),
 (b'<section class="bts-workflow-player"',rb'<section class="bts-workflow-player"[\s\S]*?</section>\n'),
 (b'<script data-bts-workflow-player>',rb'\n<script data-bts-workflow-player>\n[\s\S]*?</script>\n'),
)
def strip_player(html):
 """Remove only this renderer's three complete installed blocks, or fail safely."""
 count=[html.count(marker) for marker,_ in MARKERS]
 if count==[0,0,0]:
  return html
 if count!=[1,1,1]:
  raise ValueError(f"Partial or duplicate workflow wrapper: {count}")
 for _,pattern in MARKERS:
  html,n=re.subn(pattern,b'',html,count=1)
  if n!=1:
   raise ValueError("Existing workflow wrapper is incomplete; original output was not written")
 return html
def inject(src,slug):
 """Update the installed wrapper on an already wrapped file, or install on a clean one."""
 html=strip_player(src)
 html=one(html,'</head>',b'\n<style data-bts-workflow-player>\n'+css+b'</style>\n')
 html=one(html,NAMES[slug],base.format(slug=slug).encode())
 assert html.count(b'</body>')==1
 return one(html,'</body>',b'\n<script data-bts-workflow-player>\n'+js+b'</script>\n')
def main():
 a=argparse.ArgumentParser()
 a.add_argument('--source',type=Path,default=P/'in')
 a.add_argument('--output',type=Path,default=P/'out')
 a.add_argument('--target',choices=list(NAMES),action='append')
 ns=a.parse_args()
 for slug in ns.target or NAMES:
  src=(ns.source/slug/'index.html').read_bytes()
  html=inject(src,slug)
  dst=ns.output/slug/'index.html';dst.parent.mkdir(parents=True,exist_ok=True);dst.write_bytes(html)
  print(slug,len(html),hashlib.sha256(src).hexdigest()[:16],hashlib.sha256(html).hexdigest())
if __name__=='__main__':main()
