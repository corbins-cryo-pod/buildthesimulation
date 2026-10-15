import * as T from 'three';

export async function fetchAtlasJSON(url, gzipUrl = url + '.gz') {
  const controller = new AbortController(), timer = setTimeout(() => controller.abort(), 30000);
  try {
    const compressed = typeof DecompressionStream !== 'undefined';
    const response = await fetch(compressed ? gzipUrl : url, { signal: controller.signal });
    if (!response.ok) throw new Error(`Atlas source download returned ${response.status}`);
    return compressed
      ? JSON.parse(await new Response(response.body.pipeThrough(new DecompressionStream('gzip'))).text())
      : await response.json();
  } finally { clearTimeout(timer); }
}

export function decodeSourceGeometry(record) {
  const decode = (encoded, Type) => {
    const binary = atob(encoded), bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
    return new Type(bytes.buffer);
  };
  const geometry = new T.BufferGeometry();
  geometry.setAttribute('position', new T.BufferAttribute(decode(record.p, Float32Array), 3));
  geometry.setIndex(new T.BufferAttribute(decode(record.i, Uint32Array), 1));
  geometry.computeVertexNormals(); geometry.computeBoundingSphere();
  return geometry;
}

/** Whole, unchanged V3 surfaces replace their overview LOD when nearby. */
export function createAnatomyLOD({ group, camera, controls, state, requestDraw, reportError }) {
  const entries = [], cache = new Map();
  let pending = false, totalTriangles = 0, failures = new Map();
  const center = new T.Vector3(), frustum = new T.Frustum(), projection = new T.Matrix4();
  function add(record) {
    const geometry = new T.BufferGeometry();
    geometry.setAttribute('position', new T.Float32BufferAttribute(record.positions, 3));
    geometry.setIndex(record.indices); geometry.computeVertexNormals(); geometry.computeBoundingSphere();
    const skin = record.category === 'skin', bone = record.category === 'bone', muscle = record.category === 'muscle';
    const opacity = skin ? .065 : bone ? .32 : muscle ? .25 : .16;
    const material = new T.MeshStandardMaterial({color:skin?0x79a9b7:bone?0xd0c8ad:muscle?0xb58075:0x8298a8,transparent:true,opacity,depthWrite:false,roughness:.85,side:T.FrontSide});
    const mesh = new T.Mesh(geometry, material);
    mesh.name = record.name; mesh.userData = {category:record.category,source:record.source,sourceId:record.id};
    group.add(mesh);
    entries.push({record,mesh,overview:geometry,opacity,bounds:new T.Box3(new T.Vector3(...record.bounds[0]),new T.Vector3(...record.bounds[1]))});
  }
  function update() {
    const distance = camera.position.distanceTo(controls.target), now = performance.now();
    projection.multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse); frustum.setFromProjectionMatrix(projection);
    const candidates = [];
    for (const entry of entries) {
      const {record,mesh} = entry;
      mesh.visible = record.category === 'skin' ? state.skin : state.envelopes;
      // Fade complete envelopes at cellular scale; never clip or section them.
      mesh.material.opacity = entry.opacity * T.MathUtils.clamp(distance / 12, .08, 1);
      if (!mesh.visible || !record.detail || distance > 450 || !frustum.intersectsBox(entry.bounds)) continue;
      const near = entry.bounds.distanceToPoint(controls.target);
      const radius = entry.bounds.getBoundingSphere(new T.Sphere()).radius;
      if (near > Math.max(3, distance * .85) || radius / Math.max(1, camera.position.distanceTo(entry.bounds.getCenter(center))) < .06) continue;
      candidates.push({entry,score:near + (record.category === 'skin' ? distance * .3 : 0)});
    }
    candidates.sort((a,b)=>a.score-b.score);
    const cap = state.quality === 'light' ? 3 : state.quality === 'high' ? 12 : 7;
    const selected = []; let visibleTriangles = 0;
    const budget = state.quality === 'light' ? 250000 : state.quality === 'high' ? 750000 : 500000;
    for (const candidate of candidates) {
      if (selected.length >= cap) break;
      const triangles = candidate.entry.record.detail.triangles;
      if (selected.length && visibleTriangles + triangles > budget) continue;
      selected.push(candidate); visibleTriangles += triangles;
    }
    const wanted = new Set(selected.map(({entry})=>entry.record.id));
    for (const entry of entries) {
      const loaded = cache.get(entry.record.id);
      entry.mesh.geometry = wanted.has(entry.record.id) && loaded ? loaded.geometry : entry.overview;
      if (wanted.has(entry.record.id) && loaded) loaded.used = now;
    }
    while (cache.size > 18 || totalTriangles > 750000) {
      const old = [...cache].filter(([id])=>!wanted.has(id)).sort((a,b)=>a[1].used-b[1].used)[0];
      if (!old) break;
      old[1].geometry.dispose(); totalTriangles -= old[1].triangles; cache.delete(old[0]);
    }
    if (pending) return;
    const next = selected.find(({entry})=>!cache.has(entry.record.id) && now - (failures.get(entry.record.id) || -Infinity) > 30000)?.entry;
    if (!next) return;
    pending = true;
    fetchAtlasJSON(next.record.detail.url,next.record.detail.gzipUrl).then(record=>{
      const geometry = decodeSourceGeometry(record), triangles = geometry.index.count/3;
      cache.set(record.id,{geometry,triangles,used:performance.now()}); totalTriangles += triangles;
    }).catch(error=>{failures.set(next.record.id,performance.now()); reportError(error);}).finally(()=>{pending=false;requestDraw();});
  }
  return {add,update,get diagnostics(){return{surfaces:entries.length,originalSurfacesCached:cache.size,originalTriangles:totalTriangles,pending};}};
}
