import { Box3, Vector3, MathUtils } from 'three';
import { createCellDetail } from './morphology.mjs';

/**
 * Frame an intact registered cellular anchor, including its support envelopes.
 * Returns a square/landscape base distance; the viewer applies portrait scaling.
 * Temporary low-tessellation geometry is disposed without mutating the cell.
 */
export function computeCellFocus(cell, { ending = false, fov = 34, padding = 2 } = {}) {
  if (!(fov > 0 && fov < 180) || !(padding >= 1)) throw new RangeError('Invalid cellular framing settings.');
  const anchor = ending && cell.terminal ? 'terminal' : 'soma';
  const detail = createCellDetail(cell, { quality: 'low' });
  try {
    const part = detail.children.find(child => child.userData.anchor === anchor);
    if (!part) throw new Error(`Missing ${anchor} detail for ${cell.id}`);
    const bounds = new Box3().setFromObject(part);
    const center = bounds.getCenter(new Vector3());
    const radius = Math.max(.035, bounds.getSize(new Vector3()).length() / 2);
    const distance = radius / Math.sin(MathUtils.degToRad(fov / 2)) * padding;
    const region = anchor === 'terminal'
      ? cell.kind === 'motor' ? 'nmj' : ['spindle', 'golgi'].includes(cell.type) ? 'proprio' : 'tip'
      : cell.region;
    return { center: center.toArray(), distance, region };
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
