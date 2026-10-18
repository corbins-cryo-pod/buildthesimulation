import { readFile } from 'node:fs/promises';
import { modelRegistry } from '../src/lib/cortex/model-registry.js';
import { loadActiveModel } from '../src/lib/cortex/model-library.js';
import { cellLibraryExample } from '../src/lib/cortex/library-examples.js';
import { makeWorld } from '../src/lib/cortex/world.js';
export async function libraryCases(dataset) {
  const cases=[];
  for(const m of modelRegistry.filter(m=>!dataset || m.dataset===dataset)) {
    await loadActiveModel(m.id,40,path=>readFile(new URL('../public'+path,import.meta.url)));
    for(const mode of ['intracellular-current','extracellular-stimulation']) {
      const c=cellLibraryExample(m.id,mode);
      const w=makeWorld(c);
      cases.push({id:`${m.specimenId}-${mode}`,specimenId:m.specimenId,dataset:m.dataset,config:c,
        nodes:w.neuron.nodes.map(n=>({id:n.id,centerUm:n.centerUm,areaUm2:n.areaUm2})),
        sources:c.protocol.sourceContactIds.map(id=>w.contacts.find(s=>s.id===id).positionUm)});
    }
  }
  return cases;
}
if(process.argv[1]===new URL(import.meta.url).pathname) console.log(JSON.stringify(await libraryCases(process.argv[2])));
