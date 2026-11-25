// Regenerate instrument node graph and GLB from the editable JSON and existing primitive library.
import {readFileSync,writeFileSync} from 'node:fs';
const directory=new URL('../public/equipment/04-03/',import.meta.url);
const read=n=>JSON.parse(readFileSync(new URL(n,directory),'utf8'));
const model=read('model-source.json'),asset=read('cobra.gltf');
const names=new Map(model.nodes.map((n,i)=>[n.name,i]));
if(names.size!==model.nodes.length)throw Error('Duplicate node name');
const mesh=new Map(asset.meshes.map((m,i)=>[m.name,i]));
asset.nodes=model.nodes.map(n=>{const o={name:n.name,translation:n.p};if(n.kind){const m=mesh.get(n.kind+'_'+n.mat);if(m===undefined)throw Error('Unknown primitive or material: '+n.name);o.mesh=m;o.scale=n.size;}if(n.rotation)o.rotation=n.rotation;return o;});
const roots=[];model.nodes.forEach((n,i)=>{if(n.parent){const p=asset.nodes[names.get(n.parent)];if(!p)throw Error('Missing parent '+n.parent);(p.children??=[]).push(i);}else roots.push(i);});
asset.scenes=[{nodes:roots}];asset.materials.forEach(m=>{if(model.palette[m.name])m.pbrMetallicRoughness.baseColorFactor=[...model.palette[m.name],1]});
writeFileSync(new URL('cobra.gltf',directory),JSON.stringify(asset));
const binary=Buffer.from(asset.buffers[0].uri.split(',')[1],'base64');delete asset.buffers[0].uri;
let json=Buffer.from(JSON.stringify(asset));json=Buffer.concat([json,Buffer.alloc((4-json.length%4)%4,0x20)]);
const bin=Buffer.concat([binary,Buffer.alloc((4-binary.length%4)%4)]);
const header=Buffer.alloc(20),chunk=Buffer.alloc(8);header.writeUInt32LE(0x46546c67,0);header.writeUInt32LE(2,4);header.writeUInt32LE(28+json.length+bin.length,8);header.writeUInt32LE(json.length,12);header.writeUInt32LE(0x4e4f534a,16);chunk.writeUInt32LE(bin.length,0);chunk.writeUInt32LE(0x004e4942,4);
writeFileSync(new URL('cobra.glb',directory),Buffer.concat([header,json,chunk,bin]));
