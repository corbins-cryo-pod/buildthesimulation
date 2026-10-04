import assert from 'node:assert/strict';
import { Box3, Vector3 } from 'three';
import { deviceModels, getContactGeometry, exportGeometry } from '../src/lib/devices/catalog.js';
import { buildDeviceMesh, disposeDeviceMesh } from '../src/lib/devices/geometry.js';
import { exportDeviceGlb } from '../src/lib/devices/export.js';
// Texture-free GLTFExporter only needs FileReader's Blob -> ArrayBuffer operation.
globalThis.FileReader = class {
  readAsArrayBuffer(blob) { blob.arrayBuffer().then(result => { this.result = result; this.onloadend?.(); }); }
};
const close = (a,b) => assert(Math.abs(a-b)<1e-6, `${a} != ${b}`);
for (const model of Object.values(deviceModels)) {
  const sites = getContactGeometry(model);
  assert.equal(sites.length, model.physicalSites);
  assert.equal(new Set(sites.map(s=>s.id)).size, sites.length);
  assert(sites.every(s=>s.channel === null && s.positionMm.every(Number.isFinite)));
  const {group,contacts} = buildDeviceMesh(model);
  assert.equal(contacts.children.length, model.physicalSites);
  const bounds = new Box3().setFromObject(group);
  if (model.kind === 'utah') {
    close(sites[1].positionMm[0] - sites[0].positionMm[0], .4);
    close(sites[10].positionMm[1] - sites[0].positionMm[1], .4);
    close(Math.min(...sites.map(s=>s.positionMm[2])), model.minLength);
    close(Math.max(...sites.map(s=>s.positionMm[2])), model.maxLength);
    close(bounds.min.x, -2); close(bounds.max.x, 2);
    close(bounds.min.z, -.2); close(bounds.max.z, model.maxLength);
  } else if (model.kind === 'neuropixels') {
    close(sites[0].positionMm[2] - sites[2].positionMm[2], .02);
    close(sites[1].positionMm[0] - sites[0].positionMm[0], .032);
    close(sites[2].positionMm[0] - sites[0].positionMm[0], .016);
    close(bounds.max.z, 10); close(bounds.max.x-bounds.min.x, .07);
    for (const site of sites) {
      assert(Math.abs(site.positionMm[0]) + model.siteSize / 2 < model.width / 2);
      assert(site.positionMm[2] > 0 && site.positionMm[2] < 10);
      close(site.contactAreaMm2, .000144);
    }
  }
  if (model.kind === 'stentrode') {
    assert.equal(sites.length, 16);
    assert(bounds.min.z >= -.05 && bounds.max.z <= 40.05);
    assert(bounds.max.x - bounds.min.x > 8 && bounds.max.x - bounds.min.x < 8.3);
    assert.equal(group.children[0].children.length, 240);
    for (const [i, site] of sites.entries()) {
      close(Math.hypot(...site.normal), 1);
      close(Math.hypot(site.positionMm[0], site.positionMm[1]), 4.09);
      close(site.contactAreaMm2, Math.PI * .25 ** 2);
      assert(site.positionMm[2] > 0 && site.positionMm[2] < 40);
      // Disk's local +Y must point outward; exported coordinates identify its outer face.
      const disk = contacts.children[i];
      const normal = new Vector3(0,1,0).applyQuaternion(disk.quaternion);
      close(normal.dot(new Vector3(...site.normal)), 1);
      const face = disk.position.clone().addScaledVector(normal, model.contactThickness / 2);
      close(face.distanceTo(new Vector3(...site.positionMm)), 0);
      if(i) {
        const spacing = new Vector3(...site.positionMm).distanceTo(new Vector3(...sites[i-1].positionMm));
        assert(spacing > 2.8 && spacing < 3.1);
      }
    }
  }
  const exported = JSON.parse(JSON.stringify(exportGeometry(model)));
  assert.equal(exported.units,'mm'); assert.deepEqual(exported.sites,sites);
  group.children[0].visible = false;
  const glb = await exportDeviceGlb(group);
  const bytes = new DataView(glb);
  assert.equal(bytes.getUint32(0,true),0x46546c67);
  assert.equal(bytes.getUint32(8,true),glb.byteLength);
  const jsonLength = bytes.getUint32(12,true);
  const json = JSON.parse(new TextDecoder().decode(new Uint8Array(glb,20,jsonLength)));
  const root = json.nodes.find(n=>n.name === model.id);
  close(root.matrix[0],.001); close(root.matrix[5],.001); close(root.matrix[10],.001);
  assert.equal(root.extras.units,'meters');
  assert(json.nodes.some(n=>n.name==='substrate-and-shanks'));
  assert.equal(json.nodes.filter(n=>n.name?.startsWith(model.kind==='utah'?'r':'site-') && n.mesh !== undefined).length,model.physicalSites);
  assert.equal(group.children[0].visible,false, 'Export must not mutate the viewer');
  disposeDeviceMesh(group);
}
console.log('Device geometry: counts, pitch, stagger, extents, area, JSON and binary GLB (meters, complete mesh) verified.');
