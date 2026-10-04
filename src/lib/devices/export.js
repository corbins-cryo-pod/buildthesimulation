import { GLTFExporter } from 'three/addons/exporters/GLTFExporter.js';

export async function exportDeviceGlb(group) {
  // A visibility toggle must never silently produce an incomplete download.
  const copy = group.clone(true);
  copy.children.forEach(child => { child.visible = true; });
  copy.scale.setScalar(0.001); // Internal mm -> glTF meters.
  copy.userData.units = 'meters';
  return new GLTFExporter().parseAsync(copy, { binary: true });
}
