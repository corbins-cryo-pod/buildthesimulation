import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, writeFileSync } from 'node:fs';

const path = name => new URL('../public/equipment/07-01/'+name, import.meta.url);
const bytes = readFileSync(path('cabinet.glb'));
assert.equal(bytes.toString('ascii', 0, 4), 'glTF');
assert.equal(bytes.readUInt32LE(4), 2);
assert.equal(bytes.readUInt32LE(8), bytes.length);
const jsonLength = bytes.readUInt32LE(12);
const gltf = JSON.parse(bytes.toString('utf8', 20, 20 + jsonLength));
const binaryStart = 20 + jsonLength + 8;
const parents = new Map();
for (const node of gltf.nodes) {
  for (const child of node.children ?? []) parents.set(gltf.nodes[child], node);
}

function transform(point, node) {
  const [x,y,z] = point.map((value,i) => value*(node.scale?.[i] ?? 1));
  const [a,b,c,w] = node.rotation ?? [0,0,0,1];
  const u = 2*(b*z-c*y), v = 2*(c*x-a*z), t = 2*(a*y-b*x);
  const rotated = [x+w*u+b*t-c*v, y+w*v+c*u-a*t, z+w*t+a*v-b*u];
  return rotated.map((value,i) => value+(node.translation?.[i] ?? 0));
}

// Decode vertex buffers and parent transforms; metadata min/max is unused.
function box(node) {
  const min = [Infinity, Infinity, Infinity], max = min.map(v => -v);
  for (const {attributes} of gltf.meshes[node.mesh].primitives) {
    const a = gltf.accessors[attributes.POSITION], v = gltf.bufferViews[a.bufferView];
    assert.equal(a.componentType,5126);
    assert.equal(a.type,'VEC3');
    const start = binaryStart+(v.byteOffset ?? 0)+(a.byteOffset ?? 0);
    for (let i=0; i<a.count; i++) {
      const offset = start+i*(v.byteStride ?? 12);
      let p = [0,4,8].map(j => bytes.readFloatLE(offset+j));
      for (let n=node; n; n=parents.get(n)) p = transform(p,n);
      for (let j=0; j<3; j++) {
        min[j]=Math.min(min[j],p[j]*1000);
        max[j]=Math.max(max[j],p[j]*1000);
      }
    }
  }
  return {min,max, size: max.map((hi,i)=>hi-min[i])};
}
const bodies = gltf.nodes.filter(n => n.mesh !== undefined);
const bounds = new Map(bodies.map(n => [n.name,box(n)]));
const axisSize = i => Math.max(...Array.from(bounds.values(),b=>b.max[i]))
                   - Math.min(...Array.from(bounds.values(),b=>b.min[i]));
const tray = bounds.get('Removable one-piece tray');
const ceiling = bounds.get('Upper chamber ceiling');
const pane = bounds.get('Laminated transparent pane');
const port = bounds.get('Right internal port 1 bezel');
const opening = pane.min[1]-tray.max[1];
const node = name => gltf.nodes.find(n=>n.name===name);
const rake = Math.abs(2*Math.asin(node('Laminated transparent pane').rotation[0])*180/Math.PI);
const aux = bounds.get('Right internal port 3 bezel');
const panel = bounds.get('Membrane control panel');
const canopy = bounds.get('Control canopy');
const cases = [
  ['Outer width',1300,axisSize(0),'mm',.25],
  ['Outer depth',800,axisSize(2),'mm',.25],
  ['Outer height',1568,axisSize(1),'mm',.25],
  ['Tray width',1200,tray.size[0],'mm',.25],
  ['Tray depth',630,tray.size[2],'mm',.25],
  ['Tray to chamber ceiling',780,ceiling.min[1]-tray.max[1],'mm',.25],
  ['SmartPort collar diameter',76,port.size[1],'mm',.25],
  ['Accessory collar diameter',23,aux.size[1],'mm',.25],
  ['Pane thickness edge at nominal opening',203,opening,'mm',1],
  ['Sash plane rake',10,rake,'degrees',.05],
  ['Keypad center from left / body width',.76,((panel.max[0]+panel.min[0])/2+650)/1300,'fraction',.05],
  ['Canopy bottom from top / body height',.61,(1568-canopy.min[1])/1568,'fraction',.05]
];
const rows=cases.map(([test,expected,raw,units,tolerance])=>({
  test,expected,actual:Number(raw.toFixed(4)),units,tolerance,
  outcome:Math.abs(raw-expected)<=tolerance?'Pass':'Fail'
}));
if(process.argv.includes('--write')) {
  writeFileSync(path('geometry-verification.json'), JSON.stringify(rows,null,2)+'\n');
}
test('encoded geometry against manual dimensions, photograph landmarks and working position', () => {
  for (const row of rows) assert.equal(row.outcome,'Pass',JSON.stringify(row));
});
test('published dimensional evidence matches the deployed GLB',()=>{
  assert.deepEqual(JSON.parse(readFileSync(path('geometry-verification.json'))),rows);
});
test('all functional parts can be addressed in glTF, using independent rigid assemblies',()=>{
  for(const name of ['SashAssembly','Counterweight','SealedSample','ReducedModeIndicator','WindowStatusIndicator','ChamberLamp']){
    assert.ok(node(name),name);
  }
  assert.equal(parents.get(node('Laminated transparent pane')).name,'SashAssembly');
  assert.equal(parents.get(node('Counterweight plate')).name,'Counterweight');
  assert.equal(parents.get(node('Sealed witness lid')).name,'SealedSample');
});
