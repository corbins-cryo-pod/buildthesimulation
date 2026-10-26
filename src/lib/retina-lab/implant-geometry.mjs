import * as THREE from 'three';
import { retinalSurface, placePoint, localPoint } from './coordinates.mjs';
import { layersAt } from './anatomy.mjs';
import { createPrimaGeometry } from '../prima/geometry.mjs';
import { generateContacts } from '../retinal-implant/model.mjs';

// Subdivide the face as well as its rim, so a wide electrical contact follows
// the backing across the foveal depression instead of bridging it with a fan.
function contactDisc(radius) {
  const rings = Math.max(1, Math.ceil(radius / 20)), sides = 48;
  const vertices = [], indices = [];
  for (const z of [-1.5, 1.5])
    for (let r = 0; r <= rings; r++)
      for (let i = 0; i < sides; i++) {
        const a = i * 2 * Math.PI / sides;
        vertices.push(radius * r / rings * Math.cos(a), radius * r / rings * Math.sin(a), z);
      }
  const count = (rings + 1) * sides;
  for (let r = 0; r < rings; r++) for (let i = 0; i < sides; i++) {
    const a = r * sides + i, b = r * sides + (i + 1) % sides;
    indices.push(a, b, a + sides, b, b + sides, a + sides);
    indices.push(a + count, a + sides + count, b + count,
      b + count, a + sides + count, b + sides + count);
  }
  for (let i = 0; i < sides; i++) {
    const a = rings * sides + i, b = rings * sides + (i + 1) % sides;
    indices.push(a, a + count, b, b, a + count, b + count);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
  g.setIndex(indices); return g;
}

// Display geometry only. The retained field solvers use local planar domains.
// Every part is mapped through the same active-face surface, in micrometres.
export function implantLayout(c, suppliedContacts) {
  const pv = c.modality === 'photovoltaic';
  const prima = pv ? createPrimaGeometry(c.photovoltaic) : null;
  const contacts = pv ? prima.pixels.map(p => ({ ...p,
    ...placePoint(p, c.placement), radiusUm: c.photovoltaic.activeRadiusUm,
  })) : (suppliedContacts ?? (c.customContacts
    ? c.customContacts.map(p => ({ ...p, ...placePoint(p, c.placement) }))
    : generateContacts({ ...c.electrical, ...c.placement })));
  const local = contacts.map(p => ({ ...p, ...localPoint(p, c.placement) }));
  const margin = 50;
  const bounds = pv ? { left: -1000, right: 1000, bottom: -1000, top: 1000 }
    : { left: Math.min(...local.map(p => p.xUm - p.radiusUm)) - margin,
        right: Math.max(...local.map(p => p.xUm + p.radiusUm)) + margin,
        bottom: Math.min(...local.map(p => p.yUm - p.radiusUm)) - margin,
        top: Math.max(...local.map(p => p.yUm + p.radiusUm)) + margin };
  const { xUm: cx, yUm: cy } = c.placement;
  const tissueFace = (x, y) => retinalSurface(x, y)
    - layersAt(x, y).find(l => l.id === 'INL').bottom;
  const anchor = tissueFace(cx, cy) - c.photovoltaic.gapUm;
  const sx = (tissueFace(cx + 1, cy) - tissueFace(cx - 1, cy)) / 2;
  const sy = (tissueFace(cx, cy + 1) - tissueFace(cx, cy - 1)) / 2;
  // A rigid PRIMA plate is tangent at the placement anchor, not bent to each
  // individual cell. Electrical backing and contacts share a conformal display.
  const surface = pv ? (x, y) => anchor + sx * (x - cx) + sy * (y - cy)
    : (x, y) => retinalSurface(x, y) + c.electrical.gapUm;
  const map = (x, y, offset = 0) => {
    const p = placePoint({ xUm: x, yUm: y }, c.placement);
    return new THREE.Vector3(p.xUm / 1000, p.yUm / 1000,
      (surface(p.xUm, p.yUm) + offset) / 1000);
  };
  return { pv, prima, contacts, local, bounds, map, surface,
    thickness: pv ? prima.thicknessUm : 15, faceDirection: pv ? 1 : -1 };
}

export function microscopeClipPlanes(cx, cy, width = 850, height = 500) {
  return [
    new THREE.Plane(new THREE.Vector3(1, 0, 0), -(cx - width / 2) / 1000),
    new THREE.Plane(new THREE.Vector3(-1, 0, 0), (cx + width / 2) / 1000),
    new THREE.Plane(new THREE.Vector3(0, 1, 0), -(cy - height / 2) / 1000),
    new THREE.Plane(new THREE.Vector3(0, -1, 0), (cy + height / 2) / 1000),
  ];
}

export function buildImplantGeometry(c, { contacts, clipPlanes = [] } = {}) {
  const group = new THREE.Group(), pickable = [];
  if (c.modality === 'optogenetic') return { group, pickable };
  const layout = implantLayout(c, contacts);
  const { pv, prima, local, bounds: b, map, thickness, faceDirection: face } = layout;
  const material = (color, opacity = 1) => new THREE.MeshStandardMaterial({
    color, roughness: .45, metalness: .35, transparent: opacity < 1,
    opacity, depthWrite: opacity === 1, side: THREE.DoubleSide,
    clippingPlanes: clipPlanes,
  });
  const add = (geometry, x, y, z, mat, name) => {
    const a = geometry.attributes.position;
    for (let i = 0; i < a.count; i++) {
      const p = map(x + a.getX(i), y + a.getY(i), z + a.getZ(i));
      a.setXYZ(i, p.x, p.y, p.z);
    }
    a.needsUpdate = true;
    geometry.computeVertexNormals();
    geometry.computeBoundingBox(); geometry.computeBoundingSphere();
    const mesh = new THREE.Mesh(geometry, mat); mesh.name = name;
    group.add(mesh); return mesh;
  };
  // Keep the true footprint and placement in every view. Close-up clipping is
  // applied to all components; it never creates a new board under the camera.
  const nx = Math.max(1, Math.ceil((b.right - b.left) / 25));
  const ny = Math.max(1, Math.ceil((b.top - b.bottom) / 25));
  add(new THREE.BoxGeometry(b.right - b.left, b.top - b.bottom, thickness,
    pv ? 1 : nx, pv ? 1 : ny, 1), (b.left + b.right) / 2,
    (b.top + b.bottom) / 2, -face * thickness / 2,
    material(pv ? '#2b343f' : '#6c7c74', pv ? 1 : .22), 'implant-backing');
  const metal = material(pv ? '#dac797' : '#d4c7aa');
  const diode = material('#5a6381');
  const returnMetal = material('#9e998b');
  const pixelById = new Map(prima?.pixels.map(p => [p.id, p]) ?? []);
  for (const p of local) {
    // Radial subdivisions follow the electrical substrate even across the fovea.
    const disc = contactDisc(p.radiusUm);
    const mesh = add(disc, p.xUm, p.yUm, face * 1.5, metal, 'implant-contact');
    mesh.userData.contactId = p.id; pickable.push(mesh);
    if (pv) {
      const pixel = pixelById.get(p.id);
      for (const side of [-1, 1])
        add(new THREE.BoxGeometry(26, 44, 1), pixel.xUm + side * 24,
          pixel.yUm, .5, diode, 'implant-photodiode');
    }
  }
  // The documented return grid lies on the same face as its pixel electrodes.
  // Use unique edges to avoid overlapping duplicate cylinders at shared edges.
  if (pv) for (const e of prima.meshEdges) {
    const dx = e.x2Um - e.x1Um, dy = e.y2Um - e.y1Um;
    const g = new THREE.BoxGeometry(Math.hypot(dx, dy), c.photovoltaic.returnWidthUm, 1);
    g.rotateZ(Math.atan2(dy, dx));
    add(g, (e.x1Um + e.x2Um) / 2, (e.y1Um + e.y2Um) / 2, .5,
      returnMetal, 'implant-return');
  }
  group.userData.layout = layout;
  return { group, pickable };
}
