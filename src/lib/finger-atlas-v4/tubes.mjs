import * as T from 'three';

/** Solid, lit cylinders. A screen-space radius floor changes display only;
 * physical radii remain attached to every segment and in exported cells. */
export function createTubeBatch(segments, { color = 0xa4c9ce, sides = 8, opacity = 1, readable = true } = {}) {
  const geometry = new T.CylinderGeometry(1, 1, 1, sides, 1, false);
  const radii = new Float32Array(segments.length);
  geometry.setAttribute('tubeRadius', new T.InstancedBufferAttribute(radii, 1));
  const material = new T.MeshStandardMaterial({ color, roughness: .58, transparent: opacity < 1, opacity, depthWrite: opacity >= .8 });
  const display = { value: 0 };
  material.onBeforeCompile = shader => {
    shader.uniforms.tubeMinimumRadius = display;
    shader.vertexShader = 'attribute float tubeRadius;\nuniform float tubeMinimumRadius;\n' + shader.vertexShader;
    shader.vertexShader = shader.vertexShader.replace('#include <begin_vertex>', '#include <begin_vertex>\ntransformed.xz *= max(tubeRadius, tubeMinimumRadius);');
  };
  material.customProgramCacheKey = () => 'physical-cylinder-radius-v1';
  const mesh = new T.InstancedMesh(geometry, material, segments.length);
  const object = new T.Object3D(), up = new T.Vector3(0, 1, 0), a = new T.Vector3(), b = new T.Vector3(), delta = new T.Vector3();
  mesh.userData = { representation: 'solid-cylinder', owners: segments.map(s => s.cellId), radiiMm: segments.map(s => s.radius), readable };
  segments.forEach((segment, i) => {
    a.fromArray(segment.a); b.fromArray(segment.b); delta.subVectors(b, a);
    object.position.copy(a).add(b).multiplyScalar(.5);
    object.quaternion.setFromUnitVectors(up, delta.clone().normalize());
    object.scale.set(1, Math.max(1e-10, delta.length()), 1); object.updateMatrix(); mesh.setMatrixAt(i, object.matrix);
    radii[i] = segment.radius;
    if (segment.color !== undefined) mesh.setColorAt(i, new T.Color(segment.color));
  });
  // Unit-radius cylinder bounds conservatively enclose every physical segment.
  mesh.computeBoundingSphere();mesh.frustumCulled=false;
  mesh.userData.setMinimumRadius = radius => { display.value = readable ? radius : 0; };
  // GPU radius expansion is invisible to Three's default CPU raycaster. Pick
  // the same finite segment at its actual/display radius, not the unit cylinder.
  mesh.raycast = (raycaster, hits) => {
    const start=new T.Vector3(),end=new T.Vector3(),onRay=new T.Vector3(),onSegment=new T.Vector3();
    const scale=mesh.matrixWorld.getMaxScaleOnAxis();
    segments.forEach((segment,instanceId)=>{
      start.fromArray(segment.a).applyMatrix4(mesh.matrixWorld);end.fromArray(segment.b).applyMatrix4(mesh.matrixWorld);
      const radius=Math.max(segment.radius,display.value)*scale;
      const sq=raycaster.ray.distanceSqToSegment(start,end,onRay,onSegment);
      if(sq>radius*radius)return;
      const distance=Math.max(0,raycaster.ray.origin.distanceTo(onRay)-Math.sqrt(Math.max(0,radius*radius-sq)));
      if(distance<raycaster.near||distance>raycaster.far)return;
      hits.push({distance,point:raycaster.ray.at(distance,new T.Vector3()),object:mesh,instanceId});
    });
  };
  return mesh;
}

export function segmentsFromPaths(paths, cell, color) {
  return paths.flatMap(path => path.points.slice(1).map((b, i) => ({ a: path.points[i], b, radius: path.radii ? (path.radii[i] + path.radii[i + 1]) / 2 : path.radius || cell.axonRadiusMm || .0006, cellId: cell.id, color, role: path.role })));
}
