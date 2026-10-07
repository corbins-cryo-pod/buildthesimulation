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
  if (model.kind === 'chip-envelope') {
    close(bounds.max.x - bounds.min.x, .65); close(bounds.max.y - bounds.min.y, .65); close(bounds.max.z - bounds.min.z, .25);
    assert.equal(sites.length, 0);
  }
  if (model.kind === 'carbon-row') {
    close(sites[1].positionMm[0] - sites[0].positionMm[0], .1537); close(bounds.max.z, 4.5);
    close(bounds.max.x - bounds.min.x, 7 * .1537 + .0084);
    assert(sites.every(s => s.contactAreaMm2 === null));
  }
  if (model.kind === 'surface-grid') {
    close(sites[1].positionMm[0] - sites[0].positionMm[0], .03);
    close(sites[16].positionMm[1] - sites[0].positionMm[1], .03);
    close(bounds.max.x - bounds.min.x, .48); close(bounds.max.z - bounds.min.z, .004);
    assert(sites.every(s => s.positionMm[2] === 0 && Math.abs(s.contactAreaMm2 - .0001) < 1e-9));
  }
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
    assert(Math.abs(bounds.min.z + 12) < 1e-4); assert(bounds.max.z <= 40.05);
    assert(bounds.max.x - bounds.min.x > 8 && bounds.max.x - bounds.min.x < 8.3);
    assert.equal(group.children[0].children.filter(m=>m.name === 'scaffold-strut').length, 240);
    assert.equal(group.children[0].children.filter(m=>m.name === 'contact-mount').length, 16);
    assert(group.getObjectByName('schematic-lead-stub'));
    const scaffoldBounds = new Box3();
    group.children[0].children.filter(m=>m.name === 'scaffold-strut').forEach(m=>scaffoldBounds.expandByObject(m));
    assert(scaffoldBounds.min.z > -.05 && scaffoldBounds.max.z < 40.05);
    for (const [i, site] of sites.entries()) {
      close(Math.hypot(...site.normal), 1);
      close(Math.hypot(site.positionMm[0], site.positionMm[1]), 4.07);
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
  if (model.kind === 'connexus') {
    assert.equal(sites.length, 421);
    close(bounds.min.x, -5); close(bounds.max.x, 5);
    close(bounds.min.z, -1.5); close(bounds.max.z, 1.5);
    const points = new Set(sites.map(s=>s.latticeIndex.join(',')));
    for (const site of sites) {
      close(site.positionMm[2], 1.5);
      assert.equal(site.contactAreaMm2, null);
      assert(points.has(site.latticeIndex.map(n=>-n).join(',')), 'Reconstructed footprint must be centered');
      const nearest = Math.min(...sites.filter(s=>s!==site).map(s=>new Vector3(...site.positionMm).distanceTo(new Vector3(...s.positionMm))));
      close(nearest, .3);
      assert(Math.hypot(site.positionMm[0], site.positionMm[1]) + model.shaftDiameter / 2 < model.ceramicDiameter / 2);
    }
  }
  if (model.kind === 'neuralink') {
    assert.equal(sites.length, 1024);
    assert.equal(group.children[0].children.filter(m=>m.name.startsWith('thread-')).length, 64);
    close(bounds.min.z, -9); close(bounds.min.x, -12); close(bounds.max.x, 12);
    for (let thread=0; thread<64; thread++) {
      const threadSites = sites.filter(s=>s.threadIndex === thread);
      assert.equal(threadSites.length, 16);
      close(threadSites.at(-1).positionMm[1] - threadSites[0].positionMm[1], 3);
      for (let i=0; i<threadSites.length; i++) {
        const site = threadSites[i];
        assert.equal(site.contactAreaMm2, null, 'Visual markers must not imply a known exposed area');
        close(site.positionMm[2], 1.5022);
        if(i) close(new Vector3(...site.positionMm).distanceTo(new Vector3(...threadSites[i-1].positionMm)), .2);
        const contactBounds = new Box3().setFromObject(contacts.children[thread*16+i]);
        close(contactBounds.max.x-contactBounds.min.x, .012);
        close(contactBounds.max.y-contactBounds.min.y, .02);
      }
    }
    assert.match(exportGeometry(model).coordinateSystem, /not an implanted pose/);
  }
  group.traverse(object => {
    if (!object.geometry) return;
    for (const key of ['position', 'normal']) assert([...object.geometry.attributes[key].array].every(Number.isFinite), `${model.id}: finite ${key}`);
  });
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
  assert.equal(json.nodes.filter(n=>n.name?.startsWith(['utah','surface-grid'].includes(model.kind)?'r':'site-') && n.mesh !== undefined).length,model.physicalSites);
  assert.equal(group.children[0].visible,false, 'Export must not mutate the viewer');
  disposeDeviceMesh(group);
}
console.log('Device geometry: counts, pitch, stagger, extents, area, JSON and binary GLB (meters, complete mesh) verified.');
