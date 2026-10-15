import { implantedKinds } from './implant-contacts.js';
import { buildImplantPrimitive } from './implant-primitives.js';
import * as THREE from 'three';
import { getContactGeometry, getNeuralinkThread } from './catalog.js';
import { createDeviceMaterial, createDeviceMaterials } from './materials.js';

// Closed rectangular ribbon along sampled centers, with an explicit surface normal.
// Width follows the surface, thickness follows the normal (both in mm).
function ribbonGeometry(points, widthAt, thickness, normalAt) {
  const vertices = [], indices = [], frames = [];
  points.forEach((point, i) => {
    const tangent = points[Math.min(i + 1, points.length - 1)].clone().sub(points[Math.max(0, i - 1)]).normalize();
    const normal = normalAt(point).normalize();
    const across = tangent.clone().cross(normal).normalize();
    const corners = [[-1,-1],[1,-1],[-1,1],[1,1]].map(([side,face]) => point.clone()
      .addScaledVector(across,side*widthAt(i/(points.length-1))/2).addScaledVector(normal,face*thickness/2));
    frames.push(corners);
    // Each cross-section face has its own vertices. Normals are smooth along
    // a curved ribbon, while its top/side edges retain their actual sharpness.
    for (const [j,k] of [[0,1],[1,3],[3,2],[2,0]]) vertices.push(...corners[j].toArray(),...corners[k].toArray());
    if (i) for (let face=0;face<4;face++) {
      const a=(i-1)*8+face*2,b=i*8+face*2;
      indices.push(a,b,a+1,a+1,b,b+1);
    }
  });
  const startCap=vertices.length/3;
  frames[0].forEach(p=>vertices.push(...p.toArray()));
  const endCap=vertices.length/3;
  frames.at(-1).forEach(p=>vertices.push(...p.toArray()));
  indices.push(startCap,startCap+1,startCap+2,startCap+1,startCap+3,startCap+2,
    endCap,endCap+2,endCap+1,endCap+1,endCap+2,endCap+3);
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
  group.userData = { units: 'mm', revision: model.revision, visualRevision: model.visualRevision ?? model.revision, deviceId: model.deviceId, physicalSites: model.physicalSites, modeledScope: model.modeledScope ?? null, fidelity: model.fidelity ?? null, appearance: model.appearance ?? null, sourceDimensionUnits: 'mm', notes: model.notes, sources: model.sources.map(source => source.url) };
  const { substrate: silicon, contact: metal } = createDeviceMaterials(model);
  const bodies = new THREE.Group(); bodies.name = 'substrate-and-shanks';
  const contacts = new THREE.Group(); contacts.name = 'contact-surfaces';
  group.add(bodies, contacts);
  const sites = getContactGeometry(model);
  if (implantedKinds.has(model.kind)) {
    buildImplantPrimitive(model, sites, bodies, contacts);
    silicon.dispose(); metal.dispose();
  } else if (model.kind === 'chip-envelope') {
    const top = createDeviceMaterial(model.appearance?.surface ?? 'gold', { roughness: 0.48 });
    bodies.add(new THREE.Mesh(new THREE.BoxGeometry(model.width, model.length, model.thickness), [silicon,silicon,silicon,silicon,top,silicon]));
  } else if (model.kind === 'carbon-row') {
    const fiberMaterial = createDeviceMaterial('carbon');
    const coating = createDeviceMaterial('parylene');
    // Distinguish the documented carbon core from its 800 nm radial coating.
    // Open core cylinders leave the cut face to the contact mesh, avoiding a
    // coplanar cap and keeping that face at its exact nominal location.
    const coreGeometry = new THREE.CylinderGeometry(model.coreDiameter / 2, model.coreDiameter / 2, model.length, 32, 1, true);
    const sleeveGeometry = new THREE.CylinderGeometry(model.diameter / 2, model.diameter / 2, model.length, 32, 1, true);
    const endGeometry = new THREE.RingGeometry(model.coreDiameter / 2, model.diameter / 2, 32);
    for (const site of sites) {
      for (const [geometry, material] of [[coreGeometry, fiberMaterial], [sleeveGeometry, coating]]) {
        const shaft = new THREE.Mesh(geometry, material); shaft.rotation.x = Math.PI / 2;
        shaft.position.set(site.positionMm[0], 0, model.length / 2); bodies.add(shaft);
      }
      const annulus = new THREE.Mesh(endGeometry, coating); annulus.position.fromArray(site.positionMm); bodies.add(annulus);
      const pad = new THREE.Mesh(new THREE.CircleGeometry(model.coreDiameter / 2, 32), metal);
      pad.position.fromArray(site.positionMm); pad.name = site.id; contacts.add(pad);
    }
    silicon.dispose();
  } else if (model.kind === 'surface-grid') {
    const filmMaterial = silicon;
    if (model.siteDepth) {
      // A perforated film surface lets recessed contact faces remain visible.
      // Local well sidewalls are schematic; no nanorod or perfusion-hole mask is inferred.
      const shape = new THREE.Shape();
      shape.moveTo(-model.width / 2, -model.length / 2);
      shape.lineTo(model.width / 2, -model.length / 2);
      shape.lineTo(model.width / 2, model.length / 2);
      shape.lineTo(-model.width / 2, model.length / 2); shape.closePath();
      for (const site of sites) {
        const hole = new THREE.Path();
        hole.absarc(site.positionMm[0], site.positionMm[1], model.siteSize / 2, 0, Math.PI * 2, true);
        shape.holes.push(hole);
      }
      const top = new THREE.Mesh(new THREE.ExtrudeGeometry(shape, { depth: model.siteDepth, bevelEnabled: false, curveSegments: 12 }), filmMaterial);
      top.position.z = -model.siteDepth; bodies.add(top);
      const lower = new THREE.Mesh(new THREE.BoxGeometry(model.width, model.length, model.thickness - model.siteDepth), filmMaterial);
      lower.position.z = -(model.thickness + model.siteDepth) / 2; bodies.add(lower);
    } else {
      // BISC's surface coating is visible in the source SEM. Use a face finish,
      // without inventing a separate coating thickness or changing its bound.
      const surfaceFinish = model.appearance?.surface ? createDeviceMaterial(model.appearance.surface, { opacity: 1, transparent: false, depthWrite: true }) : null;
      const film = new THREE.Mesh(new THREE.BoxGeometry(model.width, model.length, model.thickness), surfaceFinish ? [filmMaterial,filmMaterial,filmMaterial,filmMaterial,surfaceFinish,filmMaterial] : filmMaterial);
      film.position.z = -model.thickness / 2; bodies.add(film);
    }
    // Depth bias is a rendering setting, not an added physical layer.
    const surfaceMetal = metal;
    const padGeometry = model.siteShape === 'circle' ? new THREE.CircleGeometry(model.siteSize / 2, 24) : new THREE.PlaneGeometry(model.siteSize, model.siteSize);
    for (const site of sites) {
      const pad = new THREE.Mesh(padGeometry, surfaceMetal); pad.position.fromArray(site.positionMm); pad.position.z += 0.00001; pad.userData = {visualizationOffsetMm: 0.00001, note: 'Display separation only; nominal coordinates remain in geometry JSON'}; pad.name = site.id; contacts.add(pad);
    }
  } else if (model.kind === 'utah') {
    const base = new THREE.Mesh(new THREE.BoxGeometry(model.baseWidth, model.baseWidth, model.baseThickness), silicon);
    base.position.z = -model.baseThickness / 2;
    bodies.add(base);
    for (const site of sites) {
      const [x, y, length] = site.positionMm;
      const h = length - model.tipLength, R = model.shaftRadius;
      // Source photographs show a flared foot and a continuous etched taper.
      // These profile samples describe that silhouette; only the documented
      // base, pitch and selected lengths are asserted as measured dimensions.
      const curve = new THREE.CatmullRomCurve3([[R,0],[.82*R,.025*h],[.65*R,.08*h],[.43*R,.5*h],[.22*R,h]].map(([r,z])=>new THREE.Vector3(r,z,0)),false,'centripetal');
      // The root meets the substrate; an internal cap is unnecessary and would
      // pull smooth taper normals down across the visible basal flare.
      const profile = curve.getPoints(32).map(p=>new THREE.Vector2(p.x,p.y));
      const shaftGeometry = new THREE.LatheGeometry(profile,32); shaftGeometry.normalizeNormals();
      const shaft = new THREE.Mesh(shaftGeometry, silicon);
      shaft.rotation.x = Math.PI / 2; shaft.position.set(x,y,0);
      bodies.add(shaft);
      const tip = new THREE.Mesh(new THREE.ConeGeometry(model.shaftRadius * 0.22, model.tipLength, 32), metal);
      tip.rotation.x = Math.PI / 2;
      tip.position.set(x, y, length - model.tipLength / 2);
      tip.name = site.id;
      contacts.add(tip);
    }
  } else if (model.kind === 'neuropixels') {
    const shape = new THREE.Shape();
    shape.moveTo(-model.width / 2, 0); shape.lineTo(model.width / 2, 0);
    shape.lineTo(model.width / 2, model.length - model.tipLength);
    shape.lineTo(0, model.length); shape.lineTo(-model.width / 2, model.length - model.tipLength); shape.closePath();
    const geom = new THREE.ExtrudeGeometry(shape, { depth: model.thickness, bevelEnabled: false });
    // shape X/Y -> model X/Z, extrusion -> negative Y.
    geom.rotateX(Math.PI / 2); geom.translate(0, model.thickness / 2, 0);
    bodies.add(new THREE.Mesh(geom, silicon));
    const contactShape = new THREE.PlaneGeometry(model.siteSize, model.siteSize);
    contactShape.rotateX(Math.PI / 2);
    for (const site of sites) {
      const pad = new THREE.Mesh(contactShape, metal);
      pad.position.fromArray(site.positionMm); pad.position.y -= 0.00001;
      pad.userData = { visualizationOffsetMm: 0.00001 };
      pad.name = site.id; contacts.add(pad);
    }
  } else if (model.kind === 'connexus') {
    const ceramic = createDeviceMaterial('neutral-polymer', { color: 0x30383d, metalness: 0.08, roughness: 0.73, opacity: 1, transparent: false, depthWrite: true });
    ceramic.name = 'dark-face-visual-finish';
    const housing = silicon;
    const wire = createDeviceMaterial('platinum-iridium', { roughness: 0.44 });
    bodies.add(cylinder(model.diameter / 2, model.bodyThickness - 0.01, housing, -(model.bodyThickness + 0.01) / 2));
    bodies.add(cylinder(model.ceramicDiameter / 2, 0.08, ceramic, -0.045));
    const rim = new THREE.Mesh(new THREE.RingGeometry(model.ceramicDiameter / 2, model.diameter / 2, 96), createDeviceMaterial('gold', { roughness: 0.48 }));
    rim.name = 'photo-informed-sealing-rim'; rim.position.z = -0.004; bodies.add(rim);
    // Tip length/shape are schematic; the point coordinates identify the apex.
    const shaftGeometry = new THREE.CylinderGeometry(model.shaftDiameter / 2, model.shaftDiameter / 2, model.length - model.tipLength, 24);
    const tipGeometry = new THREE.ConeGeometry(model.shaftDiameter / 2, model.tipLength, 24);
    for (const site of sites) {
      const [x, y, length] = site.positionMm;
      const shaft = new THREE.Mesh(shaftGeometry, wire);
      shaft.rotation.x = Math.PI / 2; shaft.position.set(x, y, (length - model.tipLength) / 2); bodies.add(shaft);
      const tip = new THREE.Mesh(tipGeometry, metal);
      // Cone local +Y must point along insertion +Z.
      tip.rotation.x = Math.PI / 2; tip.position.set(x, y, length - model.tipLength / 2);
      tip.name = site.id; contacts.add(tip);
    }
  } else if (model.kind === 'neuralink') {
    const housing = createDeviceMaterial('neutral-polymer', { color: 0xd5d8d8, opacity: 1, transparent: false, depthWrite: true, roughness: 0.42 });
    const polymer = createDeviceMaterial('neutral-polymer', { opacity: 0.82, roughness: 0.4 });
    // Rounded disc body (lathe profile, axis +Z) so the rim catches light like the real enclosure.
    const R = model.diameter / 2, T = model.bodyThickness, f = 1.1;
    const profile = [new THREE.Vector2(0, -T)];
    for (let i = 0; i <= 8; i++) { const a = -Math.PI / 2 + i * Math.PI / 16; profile.push(new THREE.Vector2(R - f + f * Math.cos(a), -T + f + f * Math.sin(a))); }
    for (let i = 0; i <= 8; i++) { const a = i * Math.PI / 16; profile.push(new THREE.Vector2(R - f + f * Math.cos(a), -f + f * Math.sin(a))); }
    profile.push(new THREE.Vector2(0, 0));
    const bodyGeometry = new THREE.LatheGeometry(profile, 128); bodyGeometry.normalizeNormals();
    // Lathe poles contain coincident vertices; omit their zero-area triangles.
    const positions=bodyGeometry.attributes.position, originalIndex=bodyGeometry.index, cleanIndex=[];
    const a=new THREE.Vector3(), b=new THREE.Vector3(), c=new THREE.Vector3();
    for(let i=0;i<originalIndex.count;i+=3) {
      const ids=[originalIndex.getX(i),originalIndex.getX(i+1),originalIndex.getX(i+2)];
      a.fromBufferAttribute(positions,ids[0]);b.fromBufferAttribute(positions,ids[1]);c.fromBufferAttribute(positions,ids[2]);
      if(b.sub(a).cross(c.sub(a)).lengthSq()>1e-20)cleanIndex.push(...ids);
    }
    bodyGeometry.setIndex(cleanIndex);
    const body = new THREE.Mesh(bodyGeometry, housing);
    body.rotation.x = Math.PI / 2; bodies.add(body);
    // Strain-relief tab where the thread cable leaves the enclosure (illustrative).
    const tab = new THREE.Mesh(new THREE.BoxGeometry((model.threadCount - 1) * model.entryPitch + model.threadMaxWidth, 1.6, 0.5), polymer); tab.position.set(0, model.threadStartY - 0.4, -0.25); bodies.add(tab);
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
    metal.side = THREE.DoubleSide;
    metal.polygonOffset = true; metal.polygonOffsetFactor = -1; metal.polygonOffsetUnits = -1;
    for (const site of sites) {
      const pad = new THREE.Mesh(padGeometry, metal); pad.name = site.id;
      pad.position.fromArray(site.positionMm);
      // 10 nm display lift avoids coplanar triangle occlusion in SVG's painter
      // ordering. JSON retains the nominal surface; markers are illustrative.
      pad.position.z += 0.00001; pad.userData = { visualizationOffsetMm: 0.00001 };
      contacts.add(pad);
    }
    silicon.dispose();
  } else if (model.kind === 'stentrode') {
    // Curved, flat struts follow the manufacturer's visual reference. Dimensions
    // and topology remain explicit assumptions, not reverse-engineered CAD.
    // Contrast comes from material response, never inflated strut/contact dimensions.
    const scaffold = silicon;
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
            const z = (row + t) * model.length / model.latticeRows;
            const r = THREE.MathUtils.lerp(model.leadDiameter / 2, radius, Math.min(z / model.neckLength, 1));
            points.push(new THREE.Vector3(r * Math.cos(angle), r * Math.sin(angle), z));
          }
          const strut = new THREE.Mesh(ribbonGeometry(points, () => model.strutWidth, model.strutThickness, p => new THREE.Vector3(p.x, p.y, 0)), scaffold);
          strut.name = 'scaffold-strut'; bodies.add(strut);
        }
      }
    }
    const diskGeometry = new THREE.CylinderGeometry(model.electrodeDiameter / 2, model.electrodeDiameter / 2, model.contactThickness, 24);
    const mountMaterial = createDeviceMaterial('nitinol', { roughness: 0.5 });
    const mountGeometry = new THREE.CylinderGeometry(model.contactMountDiameter / 2, model.contactMountDiameter / 2, 0.06, 32);
    for (const site of sites) {
      const normal = new THREE.Vector3(...site.normal);
      const disk = new THREE.Mesh(diskGeometry, metal);
      disk.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), normal);
      disk.position.fromArray(site.positionMm).addScaledVector(normal, -model.contactThickness / 2);
      disk.name = site.id; contacts.add(disk);
      const collar = new THREE.Mesh(mountGeometry, mountMaterial);
      collar.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), normal);
      collar.position.fromArray(site.positionMm).addScaledVector(normal, -model.contactThickness);
      collar.userData = { fidelity: 'Photo-informed mount support; 0.06 mm thickness is illustrative' };
      collar.name = 'contact-mount'; bodies.add(collar);
    }
    const leadPath = new THREE.CubicBezierCurve3(new THREE.Vector3(0, 0, 0), new THREE.Vector3(0, 0, -4), new THREE.Vector3(1.5, 0, -5), new THREE.Vector3(1.5, 0, -model.leadLength));
    const leadMaterial = createDeviceMaterial('silicone');
    const lead = new THREE.Mesh(new THREE.TubeGeometry(leadPath, 40, model.leadDiameter / 2, 12, false), leadMaterial);
    lead.name = 'schematic-lead-stub'; lead.userData = { fidelity: 'illustrative envelope; no conductor routing or full implant cable length' }; bodies.add(lead);
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
