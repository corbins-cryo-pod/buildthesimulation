#!/usr/bin/env python3
"""Build a self-contained, offline review HTML from auditable ES modules."""
from pathlib import Path
import re,json,posixpath
ROOT=Path(__file__).resolve().parents[1]
def bundle(entry):
    modules={}
    def add(name):
        if name in modules:return
        p=ROOT/name
        source=p.read_text();modules[name]=''
        def imp(m):
            dep=posixpath.normpath(posixpath.join(posixpath.dirname(name),m[2]))
            add(dep)
            return 'const '+m[1]+' = __require('+json.dumps(dep)+');'
        source=re.sub(r'import (\{[^;]+\}) from [\'\"]([^\'\"]+)[\'\"];',imp,source)
        def exp(m):
            out=[]
            for item in m[1].split(','):
                pair=item.strip().split(' as ');var=pair[0];key=pair[-1]
                out.append(f'Object.defineProperty(__exports,{json.dumps(key)},{{enumerable:true,get:()=>{var}}});')
            return '\n'.join(out)
        source=re.sub(r'export\s*\{([^}]+)\};?',exp,source)
        if re.search(r'\bimport\s+|\bexport\s+(?:function|const|class|default)\s+',source):raise ValueError('Unsupported ESM syntax in '+name)
        modules[name]=source
    add(entry)
    out=["(() => { 'use strict'; const __factories=Object.create(null), __cache=Object.create(null);"]
    for name,body in modules.items():
        out.append('// Module: '+name+'\n__factories['+json.dumps(name)+']=function(__exports,__require){\n'+body+'\n};')
    out.append('function __require(id){if(__cache[id])return __cache[id];const e=__cache[id]=Object.create(null);if(!__factories[id])throw Error("Missing module: "+id);__factories[id](e,__require);return e;}')
    out.append('return __require('+json.dumps(entry)+');})();')
    return '\n'.join(out)
def main():
    page=(ROOT/'src/page.html').read_text()
    style=(ROOT/'src/styles.css').read_text()
    if 'data:font' in style or 'base64,' in style:raise ValueError('Do not bundle font programs')
    page=page.replace('</head>','<style>\n'+style+'\n</style>\n</head>')
    content=[]
    for id,path in [('cell-data','data/cell-data.json'),('validation-data','validation/recovered-checks.json')]:
        content.append('<script id="'+id+'" type="application/json">'+(ROOT/path).read_text().replace('</','<\\/')+'</script>')
    audit=ROOT/'validation/current-summary.json'
    if audit.exists():content.append('<script id="current-validation-data" type="application/json">'+audit.read_text().replace('</','<\\/')+'</script>')
    content.append('<script id="worker-source" type="text/plain">'+bundle('src/worker.js').replace('</script','<\\/script')+'</script>')
    content.append('<script>'+bundle('src/app.js').replace('</script','<\\/script')+'</script>')
    page=page.replace('</body>','\n'.join(content)+'\n</body>')
    (ROOT/'optogenetics-laboratory.html').write_text(page)
    print('Built',len(page.encode()),'bytes')
if __name__=='__main__':main()
