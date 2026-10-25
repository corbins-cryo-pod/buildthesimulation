// Build-time artifacts use exactly the same meshes and coordinates as the viewer.
import fs from 'node:fs/promises';
import path from 'node:path';
import { deviceModels, exportGeometry } from '../src/lib/devices/catalog.js';
import { buildDeviceMesh, disposeDeviceMesh } from '../src/lib/devices/geometry.js';
import { exportDeviceGlb } from '../src/lib/devices/export.js';
globalThis.FileReader ??= class {
  readAsArrayBuffer(blob) { blob.arrayBuffer().then(result => { this.result = result; this.onloadend?.(); }).catch(error => this.onerror?.(error)); }
};
const directory = 'dist/models/devices';
await fs.mkdir(directory, {recursive:true});
const index = [];
for (const model of Object.values(deviceModels)) {
  if (model.licensedGlb) {
    // Licensed mesh: ship the third-party GLB unchanged instead of a procedural export.
    const licensed = await fs.readFile(path.join('public', model.licensedGlb));
    await fs.writeFile(path.join(directory, `${model.id}.glb`), licensed);
    index.push({deviceId:model.deviceId, id:model.id, name:model.name, revision:model.revision, visualRevision:model.visualRevision ?? model.revision, scope:model.modeledScope ?? model.specs[0][1], glb:`/models/devices/${model.id}.glb`, geometry:null, preview:`/models/devices/${model.id}.webp`, glbUnits:'meters', licensed:{source:model.licensedModel.source, mesh:model.licensedModel.meshName, license:model.licensedModel.license, url:model.licensedModel.url}});
    continue;
  }
  const {group} = buildDeviceMesh(model);
  try {
    const bytes = await exportDeviceGlb(group);
    await fs.writeFile(path.join(directory, `${model.id}.glb`), new Uint8Array(bytes));
    await fs.writeFile(path.join(directory, `${model.id}.json`), JSON.stringify(exportGeometry(model), null, 2));
    index.push({deviceId:model.deviceId, id:model.id, name:model.name, revision:model.revision, visualRevision:model.visualRevision ?? model.revision, scope:model.modeledScope ?? model.specs[0][1], glb:`/models/devices/${model.id}.glb`, geometry:`/models/devices/${model.id}.json`, preview:`/models/devices/${model.id}.webp`, glbUnits:'meters', geometryUnits:'mm'});
  } finally { disposeDeviceMesh(group); }
}
await fs.writeFile(path.join(directory,'index.json'), JSON.stringify(index,null,2));
console.log(`Exported ${index.length} dimensioned implant GLBs and geometry JSON files.`);
