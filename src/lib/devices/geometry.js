import * as THREE from 'three';
import { getContactGeometry, getNeuralinkThread } from './catalog.js';

// Closed rectangular ribbon along sampled centers, with an explicit surface normal.
// Width follows the surface, thickness follows the normal (both in mm).
function ribbonGeometry(points, widthAt, thickness, normalAt) {
  const vertices = [], indices = [];
  points.forEach((point, i) => {
    const tangent = points[Math.min(i + 1, points.length - 1)].clone().sub(points[Math.max(0, i - 1)]).normalize();
    const normal = normalAt(point).normalize();
    const across = tangent.clone().cross(normal).normalize();
    for (const [side, face] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) {
      vertices.push(...point.clone().addScaledVector(across, side * widthAt(i / (points.length - 1)) / 2).addScaledVector(normal, face * thickness / 2).toArray());
    }
    if (i) {
      const a = (i - 1) * 4, b = i * 4;
      for (const [j, k] of [[0, 1], [1, 3], [3, 2], [2, 0]]) indices.push(a + j, b + j, a + k, a + k, b + j, b + k);
    }
  });
  const end = (points.length - 1) * 4;
  indices.push(0, 2, 1, 1, 2, 3, end, end + 1, end + 2, end + 1, end + 3, end + 2);
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
  geometry.setIndex(indices); geometry.computeVertexNormals();
  return geometry;
}

function cylinder(radius, height, material, z) {
  const mesh = new THREE.Mesh(new THREE.CylinderGeometry(radius, radius, height, 96), material);
  mesh.rotation.x = Math.PI / 2; mesh.position.z = z;
  return mesh;
}

// Renderer and exporters consume this same mm-scale mesh.
export function buildDeviceMesh(model) {
  const group = new THREE.Group();
  group.name = model.id;
  group.userData = { units: 'mm', revision: model.revision, deviceId: model.deviceId, physicalSites: model.physicalSites, notes: model.notes, sources: model.sources.map(source => source.url) };
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
  } else if (model.kind === 'neuropixels') {
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
  } else if (model.kind === 'connexus') {
    const ceramic = new THREE.MeshStandardMaterial({ color: 0xb4b6af, roughness: 0.75 });
    const housing = new THREE.MeshStandardMaterial({ color: 0xa5acb2, metalness: 0.65, roughness: 0.33 });
    const wire = new THREE.MeshStandardMaterial({ color: 0xaeb6c0, metalness: 0.35, roughness: 0.45 });
    bodies.add(cylinder(model.diameter / 2, model.bodyThickness - 0.01, housing, -(model.bodyThickness + 0.01) / 2));
    bodies.add(cylinder(model.ceramicDiameter / 2, 0.08, ceramic, -0.045));
    // Tip length/shape are schematic; the point coordinates identify the apex.
    const shaftGeometry = new THREE.CylinderGeometry(model.shaftDiameter / 2, model.shaftDiameter / 2, model.length - model.tipLength, 10);
    const tipGeometry = new THREE.ConeGeometry(model.shaftDiameter / 2, model.tipLength, 10);
    for (const site of sites) {
      const [x, y, length] = site.positionMm;
      const shaft = new THREE.Mesh(shaftGeometry, wire);
      shaft.rotation.x = Math.PI / 2; shaft.position.set(x, y, (length - model.tipLength) / 2); bodies.add(shaft);
      const tip = new THREE.Mesh(tipGeometry, metal);
      // Cone local +Y must point along insertion +Z.
      tip.rotation.x = Math.PI / 2; tip.position.set(x, y, length - model.tipLength / 2);
      tip.name = site.id; contacts.add(tip);
    }
    silicon.dispose();
  } else if (model.kind === 'neuralink') {
    const housing = new THREE.MeshStandardMaterial({ color: 0xa7b0b8, metalness: 0.6, roughness: 0.42 });
    const polymer = new THREE.MeshStandardMaterial({ color: 0xa8c7ce, metalness: 0.15, roughness: 0.48, side: THREE.DoubleSide });
    // Rounded disc body (lathe profile, axis +Z) so the rim catches light like the real enclosure.
    const R = model.diameter / 2, T = model.bodyThickness, f = 1.1;
    const profile = [new THREE.Vector2(0, -T)];
    for (let i = 0; i <= 8; i++) { const a = -Math.PI / 2 + i * Math.PI / 16; profile.push(new THREE.Vector2(R - f + f * Math.cos(a), -T + f + f * Math.sin(a))); }
    for (let i = 0; i <= 8; i++) { const a = i * Math.PI / 16; profile.push(new THREE.Vector2(R - f + f * Math.cos(a), -f + f * Math.sin(a))); }
    profile.push(new THREE.Vector2(0, 0));
    const body = new THREE.Mesh(new THREE.LatheGeometry(profile, 128), housing);
    body.rotation.x = Math.PI / 2; bodies.add(body);
    // Dark inlay ring and centre disc sit 30 um proud of the face: no coplanar surfaces.
    const inlay = new THREE.MeshStandardMaterial({ color: 0x2b333d, metalness: 0.5, roughness: 0.45 });
    const ring = new THREE.Mesh(new THREE.RingGeometry(R - 3.0, R - 2.2, 128), inlay); ring.position.z = 0.03; ring.material.side = THREE.DoubleSide; bodies.add(ring);
    const centre = new THREE.Mesh(new THREE.CircleGeometry(R - 5.5, 128), new THREE.MeshStandardMaterial({ color: 0x5d6873, metalness: 0.4, roughness: 0.6, side: THREE.DoubleSide })); centre.position.z = 0.03; bodies.add(centre);
    // Strain-relief tab where the thread cable leaves the enclosure (illustrative).
    const tab = new THREE.Mesh(new THREE.BoxGeometry(3.4, 1.6, 0.5), polymer); tab.position.set(0, R - 0.5, -0.3); bodies.add(tab);
    for (let thread = 0; thread < model.threadCount; thread++) {
      const { entryX, exitX } = getNeuralinkThread(model, thread);
      const curve = new THREE.CubicBezierCurve3(
        new THREE.Vector3(entryX, model.threadStartY, 0), new THREE.Vector3(entryX, 12, 0),
        new THREE.Vector3(exitX, 15, model.threadEndZ), new THREE.Vector3(exitX, model.contactStartY, model.threadEndZ));
      const points = curve.getPoints(40);
      // Straight terminal section makes the published along-thread site pitch explicit.
      for (let j = 1; j <= 12; j++) points.push(new THREE.Vector3(exitX, model.contactStartY + (model.threadEndY - model.contactStartY) * j / 12, model.threadEndZ));
      const ribbon = new THREE.Mesh(ribbonGeometry(points, t => model.threadMaxWidth + (model.threadMinWidth - model.threadMaxWidth) * t, model.threadThickness, () => new THREE.Vector3(0, 0, 1)), polymer);
      ribbon.name = `thread-${thread}`; bodies.add(ribbon);
    }
    const padGeometry = new THREE.PlaneGeometry(model.visualContactWidth, model.visualContactLength);
    metal.side = THREE.DoubleSide; metal.metalness = 0.25; metal.emissive.setHex(0x8a6530); metal.emissiveIntensity = 0.3;
    metal.polygonOffset = true; metal.polygonOffsetFactor = -1; metal.polygonOffsetUnits = -1;
    for (const site of sites) {
      const pad = new THREE.Mesh(padGeometry, metal); pad.name = site.id;
      pad.position.fromArray(site.positionMm);
      // 10 nm display lift avoids coplanar triangle occlusion in SVG's painter
      // ordering. JSON retains the nominal surface; markers are illustrative.
      pad.position.z += 0.00001; pad.userData = { visualizationOffsetMm: 0.00001 };
      contacts.add(pad);
    }
  } else if (model.kind === 'stentrode') {
    // Curved, flat struts follow the manufacturer's visual reference. Dimensions
    // and topology remain explicit assumptions, not reverse-engineered CAD.
    // Contrast comes from material response, never inflated strut/contact dimensions.
    const scaffold = new THREE.MeshStandardMaterial({ color: 0xd9e4ee, metalness: 0.25, roughness: 0.55, emissive: 0x667788, emissiveIntensity: 0.22 });
    metal.metalness = 0.25; metal.roughness = 0.5;
    metal.emissive.setHex(0xdcc18a); metal.emissiveIntensity = 0.35;
    const radius = model.diameter / 2;
    for (let row = 0; row < model.latticeRows; row++) {
      for (let col = 0; col < model.latticeColumns; col++) {
        const theta = (col * 2 + row % 2) * Math.PI / model.latticeColumns;
        for (const sign of [-1, 1]) {
          const points = [];
          for (let step = 0; step <= 16; step++) {
            const t = step / 16;
            const eased = t - 0.75 * Math.sin(2 * Math.PI * t) / (2 * Math.PI);
            const angle = theta + sign * eased * Math.PI / model.latticeColumns;
            points.push(new THREE.Vector3(radius * Math.cos(angle), radius * Math.sin(angle), (row + t) * model.length / model.latticeRows));
          }
          const strut = new THREE.Mesh(ribbonGeometry(points, () => model.strutWidth, model.strutThickness, p => new THREE.Vector3(p.x, p.y, 0)), scaffold);
          strut.name = 'scaffold-strut'; bodies.add(strut);
        }
      }
    }
    const diskGeometry = new THREE.CylinderGeometry(model.electrodeDiameter / 2, model.electrodeDiameter / 2, model.contactThickness, 24);
    const mountMaterial = new THREE.MeshStandardMaterial({ color: 0x88765e, metalness: 0.3, roughness: 0.5, side: THREE.DoubleSide });
    const mountGeometry = new THREE.RingGeometry(model.electrodeDiameter / 2, model.contactMountDiameter / 2, 32);
    for (const site of sites) {
      const normal = new THREE.Vector3(...site.normal);
      const disk = new THREE.Mesh(diskGeometry, metal);
      disk.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), normal);
      disk.position.fromArray(site.positionMm).addScaledVector(normal, -model.contactThickness / 2);
      disk.name = site.id; contacts.add(disk);
      const collar = new THREE.Mesh(mountGeometry, mountMaterial);
      collar.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), normal);
      collar.position.fromArray(site.positionMm).addScaledVector(normal, -0.005);
      collar.name = 'contact-mount'; bodies.add(collar);
    }
    const leadPath = new THREE.CubicBezierCurve3(new THREE.Vector3(radius, 0, 0), new THREE.Vector3(radius, 0, -4), new THREE.Vector3(1.5, 0, -5), new THREE.Vector3(1.5, 0, -model.leadLength));
    const leadMaterial = new THREE.MeshStandardMaterial({ color: 0xb6c0c8, roughness: 0.6, metalness: 0.1 });
    const lead = new THREE.Mesh(new THREE.TubeGeometry(leadPath, 40, model.leadDiameter / 2, 12, false), leadMaterial);
    lead.name = 'schematic-lead-stub'; lead.userData = { fidelity: 'illustrative envelope; no conductor routing or full implant cable length' }; bodies.add(lead);
    // These materials are unused for the stent family.
    silicon.dispose();
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
