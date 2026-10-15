import { Box3, Vector3, MathUtils } from 'three';
import { createCellDetail } from './morphology.mjs';

/**
 * Frame an intact registered cellular anchor, including its support envelopes.
 * Returns a square/landscape base distance; the viewer applies portrait scaling.
 * Uses supplied source/composite geometry; the caller retains its ownership.
 */
export function computeDetailFocus(cell, detail, { ending = false, organ = false, fov = 34, padding = 2 } = {}) {
  if (!(fov > 0 && fov < 180) || !(padding >= 1)) throw new RangeError('Invalid cellular framing settings.');
  const anchor = ending && cell.terminal ? 'terminal' : 'soma';
  // A composite detail may have more than one source group at an anchor.
  // Include them all; never fit a replacement teaching specimen off-screen.
  const parts = detail.children.filter(child => child.userData.anchor === anchor);
  if (!parts.length) throw new Error(`Missing ${anchor} detail for ${cell.id}`);
  detail.updateWorldMatrix(true, true);
  const bounds = new Box3();
  const support = [], capsules = [];
  if (anchor === 'terminal' && organ) {
    for (const part of parts) part.traverse(object => {
      if (!object.isMesh) return;
      if (object.userData.layer === 'support') support.push(object);
      // The intact V3 spindle capsule was classified with its skin envelope.
      if (object.userData.layer === 'skin' && /capsule/i.test(object.userData.structure || object.name)) capsules.push(object);
    });
  }
  // Inspect the receptor/endplate itself; the intact proximal shaft remains in
  // the same scene and can be followed by zooming out. Free endings without a
  // support organ retain their complete-arbor framing.
  const targets = capsules.length ? capsules : support.length ? support : parts;
  for (const target of targets) bounds.expandByObject(target);
  if (bounds.isEmpty()) throw new Error(`Empty ${anchor} detail for ${cell.id}`);
  const center = bounds.getCenter(new Vector3());
  const radius = Math.max(.035, bounds.getSize(new Vector3()).length() / 2);
  const distance = radius / Math.sin(MathUtils.degToRad(fov / 2)) * padding;
  const region = anchor === 'terminal'
    ? cell.kind === 'motor' ? 'nmj' : ['spindle', 'golgi'].includes(cell.type) ? 'proprio' : 'tip'
    : cell.region;
  return { center: center.toArray(), distance, region };
}

/** Build-and-dispose fallback for anchors without an original V3 template. */
export function computeCellFocus(cell, options = {}) {
  const detail = createCellDetail(cell, { quality: 'low' });
  try {
    return computeDetailFocus(cell, detail, options);
  } finally {
    const geometries = new Set(), materials = new Set();
    detail.traverse(object => {
      if (object.geometry) geometries.add(object.geometry);
      for (const material of (Array.isArray(object.material) ? object.material : [object.material])) {
        if (material) materials.add(material);
      }
    });
    geometries.forEach(geometry => geometry.dispose());
    materials.forEach(material => material.dispose());
  }
}
