import * as THREE from 'three';
import { getContactGeometry } from './catalog.js';

// Renderer and exporters consume this same mm-scale mesh.
export function buildDeviceMesh(model) {
  const group = new THREE.Group();
  group.name = model.id;
  group.userData = { units: 'mm', revision: model.revision, notes: model.notes };
  const silicon = new THREE.MeshStandardMaterial({ color: 0x343e4c, metalness: 0.65, roughness: 0.36 });
  const metal = new THREE.MeshStandardMaterial({ color: 0xdcc18a, metalness: 0.75, roughness: 0.32 });
  const bodies = new THREE.Group(); bodies.name = 'substrate-and-shanks';
  const contacts = new THREE.Group(); contacts.name = 'contact-surfaces';
  group.add(bodies, contacts);
  const sites = getContactGeometry(model);
  if (model.kind === 'utah') {
    const base = new THREE.Mesh(new THREE.BoxGeometry(model.baseWidth, model.baseWidth, model.baseThickness), silicon);
    base.position.z = -model.baseThickness / 2;
    bodies.add(base);
    for (const site of sites) {
      const [x, y, length] = site.positionMm;
      const shaft = new THREE.Mesh(new THREE.CylinderGeometry(model.shaftRadius * 0.55, model.shaftRadius, length - model.tipLength, 10), silicon);
      shaft.rotation.x = Math.PI / 2;
      shaft.position.set(x, y, (length - model.tipLength) / 2);
      bodies.add(shaft);
      const tip = new THREE.Mesh(new THREE.ConeGeometry(model.shaftRadius * 0.55, model.tipLength, 10), metal);
      tip.rotation.x = Math.PI / 2;
      tip.position.set(x, y, length - model.tipLength / 2);
      tip.name = site.id;
      contacts.add(tip);
    }
  } else {
    const shape = new THREE.Shape();
    shape.moveTo(-model.width / 2, 0); shape.lineTo(model.width / 2, 0);
    shape.lineTo(model.width / 2, model.length - 0.12);
    shape.lineTo(0, model.length); shape.lineTo(-model.width / 2, model.length - 0.12); shape.closePath();
    const geom = new THREE.ExtrudeGeometry(shape, { depth: model.thickness, bevelEnabled: false });
    // shape X/Y -> model X/Z, extrusion -> negative Y.
    geom.rotateX(Math.PI / 2); geom.translate(0, model.thickness / 2, 0);
    bodies.add(new THREE.Mesh(geom, silicon));
    const contactShape = new THREE.PlaneGeometry(model.siteSize, model.siteSize);
    contactShape.rotateX(Math.PI / 2);
    for (const site of sites) {
      const pad = new THREE.Mesh(contactShape, metal);
      pad.position.fromArray(site.positionMm); pad.position.y -= 0.00005;
      pad.name = site.id; contacts.add(pad);
    }
  }
  return { group, bodies, contacts };
}

export function disposeDeviceMesh(group) {
  const geometries = new Set(), materials = new Set();
  group.traverse((object) => {
    if (object.geometry) geometries.add(object.geometry);
    if (object.material) (Array.isArray(object.material) ? object.material : [object.material]).forEach(m => materials.add(m));
  });
  geometries.forEach(g => g.dispose()); materials.forEach(m => m.dispose());
}
