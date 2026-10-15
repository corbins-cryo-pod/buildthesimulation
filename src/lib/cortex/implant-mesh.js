import * as THREE from 'three';
import { buildDeviceMesh } from '../devices/geometry.js';
import { createDeviceMaterials } from '../devices/materials.js';
import { getCortexContacts } from './implants.js';

export function buildCortexImplantMesh(model) {
  if (model.kind !== 'cortex-n1-thread') {
    const device = buildDeviceMesh(model);
    if (model.cortex?.key === 'neuropixels-1') {
      // Keep the outer group in the same tip-relative frame as the solver.
      device.bodies.position.z = -model.length;
      device.contacts.position.z = -model.length;
    }
    return device;
  }
  const group = new THREE.Group(), bodies = new THREE.Group(), contacts = new THREE.Group();
  group.name = model.id;
  bodies.name = 'single-thread-segment'; contacts.name = 'contact-surfaces';
  group.add(bodies, contacts);
  const materials = createDeviceMaterials(model), shape = new THREE.Shape();
  shape.moveTo(-model.threadMaxWidth / 2, -model.segmentLength);
  shape.lineTo(model.threadMaxWidth / 2, -model.segmentLength);
  shape.lineTo(model.threadMinWidth / 2, 0);
  shape.lineTo(-model.threadMinWidth / 2, 0); shape.closePath();
  const geometry = new THREE.ExtrudeGeometry(shape, { depth: model.threadThickness, bevelEnabled: false });
  geometry.rotateX(Math.PI / 2); geometry.translate(0, model.threadThickness / 2, 0);
  bodies.add(new THREE.Mesh(geometry, materials.substrate));
  const pad = new THREE.PlaneGeometry(model.visualContactWidth, model.visualContactLength);
  pad.rotateX(Math.PI / 2);
  for (const site of getCortexContacts(model)) {
    const mesh = new THREE.Mesh(pad, materials.contact);
    mesh.position.fromArray(site.positionMm); mesh.position.y -= 0.00001;
    mesh.name = site.id; mesh.userData = { visualizationOffsetMm: 0.00001, illustrativeArea: true };
    contacts.add(mesh);
  }
  return { group, bodies, contacts };
}
