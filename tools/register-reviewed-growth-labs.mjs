// Idempotent insertion into the existing directory. All other entries are untouched.
import fs from 'node:fs';
const file=new URL('../src/data/simulations.js',import.meta.url);
let text=fs.readFileSync(file,'utf8');
const entries=[
 {href:'/simulations/neuron-growth/',title:'Cell Behavior Laboratory · V3',desc:'The detailed coverslip engine: soft-cell spreading and crawling, pulsatile neurite growth, branching, lesions and simplified electrical networks. Original V3 appearance and renderer retained.'},
 {href:'/simulations/neural-tissue/',title:'Tissue Growth & Nerve Repair · V4',desc:'Explore 3-D gels, nerve conduits and grafts with corrected field integration, raw measurements and explicit evidence limits. Original recordings remain labelled separately from corrected-solver runs.'},
];
const missing=entries.filter(e=>!text.includes(e.href));
if(missing.length){
 const pattern=/(title["']?\s*:\s*["']Cell Models & Electrophysiology["'][\s\S]*?entries["']?\s*:\s*\[)/;
 if(!pattern.test(text))throw Error('Could not locate Cell Models & Electrophysiology; directory left unchanged');
 text=text.replace(pattern,match=>match+'\n'+missing.map(e=>'      '+JSON.stringify(e)+',').join('\n'));
 fs.writeFileSync(file,text);
}
console.log(missing.length?'Registered '+missing.length+' new labs':'Both labs already registered');
