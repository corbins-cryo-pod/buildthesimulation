"""Bundle our local, dependency-free component modules; no minification or rewriting of equations."""
from pathlib import Path
import re,json,hashlib
ROOT=Path(__file__).resolve().parents[1]
PUBLIC=ROOT/'overlay/public/simulations/biohybrid-axon-interface/stage2'
names=['common','selectivity','magnetic','opsin','optics','spectral','worker']
chunks=['const __modules = {};']
for name in names:
    source=(PUBLIC/'modules'/f'{name}.mjs').read_text()
    exports=re.findall(r'export\s+(?:async\s+)?(?:function|const|let|class)\s+(\w+)',source)
    source=re.sub(r"import\s*\{([^}]+)\}\s*from\s*['\"]\./([^'\"]+)\.mjs['\"];?",lambda m:'const {'+m.group(1)+'} = __modules.'+m.group(2)+';',source)
    if re.search(r'^import\s',source,re.M):raise ValueError('Unsupported module import')
    source=re.sub(r'\bexport\s+(?=(?:async\s+)?(?:function|const|let|class)\s)','',source)
    chunks.append('__modules.'+name+' = (() => {\n'+source+'\nreturn {'+','.join(exports)+'};\n})();')
worker='\n'.join(chunks)
css=(PUBLIC/'bench.css').read_text();ui=(PUBLIC/'bench.js').read_text();html=(PUBLIC/'workbench.html').read_text()
html=html.replace('<link rel="stylesheet" href="bench.css">','<style>'+css+'</style>')
html=html.replace('<script src="bench.js" defer></script>','<script>window.__STAGE2_WORKER_SOURCE__='+json.dumps(worker).replace('</','<\\/')+';</script><script>'+ui.replace('</script','<\\/script')+'</script>')
# The complete methods page also becomes self-contained, so the deliverable does not require network links.
methods=(PUBLIC/'methods.html').read_text() if (PUBLIC/'methods.html').exists() else ''
if methods:
    html=html.replace('<a href="methods.html" target="_blank">Read component methods and open questions ↗</a>','<button id="open-methods" class="small">Read component methods and open questions</button>')
    content=json.dumps(methods).replace('</','<\\/')
    html=html.replace('</body>', '<script>document.getElementById("open-methods").onclick=()=>{const w=window.open();if(w){w.document.open();w.document.write('+content+');w.document.close();}};</script></body>')
output=ROOT/'biohybrid-stage2-preview.html';output.write_text(html)
print(output,output.stat().st_size,'bytes',hashlib.sha256(output.read_bytes()).hexdigest())
