/** Portable finite-contact potential sampler. SI units throughout; no solver or Node imports. */
export const SCHEMA_VERSION = 'finite-contact-field/1.0';
export const STATUS = Object.freeze({
  OK: 0, NONFINITE: 1, ELECTRODE_SURFACE: 2, INSULATION: 3,
  OUTSIDE_DOMAIN: 4, OUTSIDE_VALIDATED_REGION: 5, NEAR_RIM: 6,
});
export const STATUS_NAMES = Object.freeze(Object.fromEntries(Object.entries(STATUS).map(([k,v]) => [v,k])));
export const units = Object.freeze({
  micrometersToMeters: x => x * 1e-6,
  microampsToAmps: x => x * 1e-6,
  millisecondsToSeconds: x => x * 1e-3,
  voltsToMillivolts: x => x * 1e3,
  metersToMicrometers: x => x * 1e6,
});
const fail = message => { throw new Error(`Field package: ${message}`); };
const finitePositive = x => typeof x === 'number' && Number.isFinite(x) && x > 0;
const almostEqual = (x,y) => Math.abs(x-y) <= 1e-12 * Math.max(Math.abs(x), Math.abs(y), 1e-15);
function assertPoints(points) {
  if (!(points instanceof Float64Array || points instanceof Float32Array) || points.length % 3)
    throw new TypeError('pointsMeters must be a Float64Array or Float32Array of packed xyz triples');
}
function validateManifest(m) {
  if (!m || m.schemaVersion !== SCHEMA_VERSION) fail('unsupported schemaVersion');
  if (m.geometry?.type !== 'axisymmetric_disk_in_insulating_plane' || !finitePositive(m.geometry.radiusMeters) || m.geometry.tissueSide !== 'z>0' || m.geometry.thicknessMeters !== 0) fail('unsupported contact geometry');
  if (!almostEqual(m.geometry.contactAreaSquareMeters,Math.PI*m.geometry.radiusMeters**2)) fail('contact area inconsistent with disk');
  if (!finitePositive(m.conductivitySiemensPerMeter)) fail('conductivity must be positive SI S/m');
  if (m.coordinateFrame?.axis !== 'z' || m.coordinateFrame.units !== 'm' || m.coordinateFrame.handedness !== 'right' || !Array.isArray(m.coordinateFrame.originMeters) || m.coordinateFrame.originMeters.length !== 3 || m.coordinateFrame.originMeters.some(x => x !== 0)) fail('unsupported coordinate frame');
  if (m.domain?.shape !== 'finite axisymmetric cylinder' || m.domain.outerBoundary !== 'r=R or z=H grounded at 0 V') fail('unsupported domain or outer return boundary');
  if (!finitePositive(m.domain?.radialExtentMeters) || !finitePositive(m.domain?.axialExtentMeters)) fail('invalid finite domain');
  const v=m.validity;
  if (!v || v.tissueRequiresPositiveZ !== true || !finitePositive(v.maxRadiusMeters) || !finitePositive(v.maxHeightMeters) || !finitePositive(v.minRimDistanceMeters) || v.maxRadiusMeters >= m.domain.radialExtentMeters || v.maxHeightMeters >= m.domain.axialExtentMeters) fail('invalid validated region');
  if (!Array.isArray(m.bases) || m.bases.length !== 1 || m.bases[0].id !== 'disk_to_outer_ground') fail('only the single complete disk_to_outer_ground basis is supported');
  const basis=m.bases[0];
  if (basis.units !== 'V/A' || basis.normalizationCurrentAmps !== 1) fail('basis units must be V/A normalized to +1 A');
  if (!basis.contactCurrentsAmps || Object.keys(basis.contactCurrentsAmps).length !== 1 || basis.contactCurrentsAmps.disk !== 1 || basis.return?.totalCurrentAmps !== -1) fail('complete current balance requires disk +1 A and return -1 A');
  if (basis.return.type !== 'artificial_grounded_outer_cylinder' || basis.return.boundary !== 'r=R or z=H' || basis.return.isFiniteReturnElectrode !== false || basis.voltageReference !== 'outer cylinder is 0 V') fail('unsupported return configuration or voltage gauge');
  if (basis.inactiveContacts !== 'none; single exposed conducting disk' || basis.compatibleBasisSet !== 'single-disk-one-outer-ground') fail('unsupported inactive contacts or basis compatibility');
  const d=m.data;
  if (!d || d.layout !== 'r-f64le,z-f64le,potential-f32le-z-major' || d.triangulation !== 'SW-NE') fail('unsupported binary layout or triangulation');
  if (![d.radialCount,d.axialCount].every(n => Number.isSafeInteger(n) && n >= 2 && n <= 1000000)) fail('invalid grid dimensions');
  if (d.basisCount !== 1 || d.potentialUnits !== 'V/A' || d.axisUnits !== 'm') fail('binary basis count or SI units mismatch');
  if (d.radialAxisByteOffset !== 0 || d.axialAxisByteOffset !== d.radialCount*8 || d.potentialByteOffset !== (d.radialCount+d.axialCount)*8) fail('binary offsets mismatch');
  const expected=8*(d.radialCount+d.axialCount)+4*d.radialCount*d.axialCount;
  if (!Number.isSafeInteger(expected) || d.byteLength !== expected || expected > 512*1024*1024) fail('invalid binary byte count');
  if (!/^[a-f0-9]{64}$/.test(d.sha256 ?? '')) fail('invalid SHA-256');
}
function lowerCell(axis, x) {
  let lo=0, hi=axis.length-1;
  while (hi-lo>1) { const mid=(lo+hi)>>>1; if (axis[mid] <= x) lo=mid; else hi=mid; }
  return lo;
}
/** Load and verify a package. binaryData: ArrayBuffer or ArrayBufferView. SHA-256 is mandatory. */
export async function loadFieldPackage(manifest, binaryData) {
  const m=JSON.parse(JSON.stringify(manifest));
  validateManifest(m);
  if (!(binaryData instanceof ArrayBuffer) && !ArrayBuffer.isView(binaryData)) throw new TypeError('binaryData must be an ArrayBuffer or view');
  const input=binaryData instanceof ArrayBuffer ? new Uint8Array(binaryData) : new Uint8Array(binaryData.buffer,binaryData.byteOffset,binaryData.byteLength);
  if (input.byteLength !== m.data.byteLength) fail('binary length mismatch');
  if (!globalThis.crypto?.subtle) fail('Web Crypto SHA-256 unavailable; serve browser example from localhost or HTTPS');
  const bytes=input.slice(); // Own the verified storage: caller mutation cannot alter the loaded field.
  const hash=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',bytes)),x=>x.toString(16).padStart(2,'0')).join('');
  if (hash !== m.data.sha256) fail('SHA-256 mismatch');
  const nr=m.data.radialCount, nz=m.data.axialCount;
  let r,z,p;
  if (new Uint8Array(new Uint16Array([1]).buffer)[0] === 1) {
    r=new Float64Array(bytes.buffer,0,nr); z=new Float64Array(bytes.buffer,nr*8,nz); p=new Float32Array(bytes.buffer,(nr+nz)*8,nr*nz);
  } else {
    const dv=new DataView(bytes.buffer); r=new Float64Array(nr); z=new Float64Array(nz); p=new Float32Array(nr*nz);
    for(let i=0;i<nr;i++) r[i]=dv.getFloat64(i*8,true);
    for(let j=0;j<nz;j++) z[j]=dv.getFloat64((nr+j)*8,true);
    for(let i=0;i<p.length;i++) p[i]=dv.getFloat32((nr+nz)*8+i*4,true);
  }
  for (const [name,axis,extent] of [['r',r,m.domain.radialExtentMeters],['z',z,m.domain.axialExtentMeters]]) {
    if (axis[0] !== 0 || !almostEqual(axis[axis.length-1],extent)) fail(`${name} axis endpoints disagree with domain`);
    for(let i=1;i<axis.length;i++) if (!Number.isFinite(axis[i]) || axis[i] <= axis[i-1]) fail(`${name} axis is not finite and strictly increasing`);
  }
  if (!r.some(x=>almostEqual(x,m.geometry.radiusMeters))) fail('contact rim missing from radial mesh');
  for(let i=0;i<p.length;i++) if (!Number.isFinite(p[i])) fail('nonfinite nodal potential');
  const a=m.geometry.radiusMeters, vr=m.validity.maxRadiusMeters, vz=m.validity.maxHeightMeters, rimMin=m.validity.minRimDistanceMeters;
  const basisId=m.bases[0].id;
  function statusAt(x,y,h) {
    if (![x,y,h].every(Number.isFinite)) return STATUS.NONFINITE;
    const rho=Math.hypot(x,y);
    if (!Number.isFinite(rho)) return STATUS.NONFINITE;
    if (h === 0 && rho <= a) return STATUS.ELECTRODE_SURFACE;
    if (h <= 0) return STATUS.INSULATION;
    if (rho >= m.domain.radialExtentMeters || h >= m.domain.axialExtentMeters) return STATUS.OUTSIDE_DOMAIN;
    if (rho > vr || h > vz) return STATUS.OUTSIDE_VALIDATED_REGION;
    if (Math.hypot(rho-a,h) < rimMin) return STATUS.NEAR_RIM;
    return STATUS.OK;
  }
  function classifyPoints(pointsMeters) {
    assertPoints(pointsMeters); const n=pointsMeters.length/3;
    const status=new Uint8Array(n), contactDistanceMeters=new Float64Array(n), rimDistanceMeters=new Float64Array(n);
    for(let i=0;i<n;i++) {
      const x=pointsMeters[3*i],y=pointsMeters[3*i+1],h=pointsMeters[3*i+2],rho=Math.hypot(x,y);
      status[i]=statusAt(x,y,h);
      if (status[i] === STATUS.NONFINITE) {contactDistanceMeters[i]=NaN;rimDistanceMeters[i]=NaN;}
      else {contactDistanceMeters[i]=Math.hypot(Math.max(rho-a,0),h);rimDistanceMeters[i]=Math.hypot(rho-a,h);}
    }
    return {status,contactDistanceMeters,rimDistanceMeters};
  }
  function interpolate(rho,h) {
    const i=lowerCell(r,rho), j=lowerCell(z,h);
    const u=(rho-r[i])/(r[i+1]-r[i]), v=(h-z[j])/(z[j+1]-z[j]), k=j*nr+i;
    return v<=u ? (1-u)*p[k]+(u-v)*p[k+1]+v*p[k+nr+1] : (1-v)*p[k]+u*p[k+nr+1]+(v-u)*p[k+nr];
  }
  function sampleUnitPotential(pointsMeters, requestedBasisId=basisId) {
    if(requestedBasisId!==basisId) throw new RangeError(`Unknown basis: ${requestedBasisId}`);
    assertPoints(pointsMeters); const n=pointsMeters.length/3, values=new Float64Array(n), status=new Uint8Array(n);
    for(let i=0;i<n;i++) {
      const x=pointsMeters[3*i],y=pointsMeters[3*i+1],h=pointsMeters[3*i+2]; status[i]=statusAt(x,y,h);
      values[i]=status[i]===STATUS.OK ? interpolate(Math.hypot(x,y),h) : NaN;
    }
    return {values,status};
  }
  function currentValue(currentsAmps) {
    if (!(currentsAmps instanceof Float64Array || currentsAmps instanceof Float32Array) || currentsAmps.length !== 1 || !Number.isFinite(currentsAmps[0])) throw new TypeError('currentsAmps must be a finite Float64Array or Float32Array with one entry in manifest basis order');
    return currentsAmps[0];
  }
  function samplePotential(pointsMeters,currentsAmps) {
    const current=currentValue(currentsAmps), result=sampleUnitPotential(pointsMeters);
    for(let i=0;i<result.values.length;i++) result.values[i]*=current;
    return result;
  }
  function cacheUnitPotentials(pointsMeters) {
    const result=sampleUnitPotential(pointsMeters);
    return Object.freeze({packageSha256:hash,basisIds:Object.freeze([basisId]),pointCount:result.values.length,unitPotentials:result.values,status:result.status});
  }
  function combineCached(cache,currentsAmps) {
    const current=currentValue(currentsAmps);
    if(cache?.packageSha256!==hash || cache.basisIds?.length!==1 || cache.basisIds[0]!==basisId || !(cache.unitPotentials instanceof Float64Array) || !(cache.status instanceof Uint8Array) || cache.unitPotentials.length!==cache.pointCount || cache.status.length!==cache.pointCount) throw new TypeError('cache does not match this field package');
    const values=new Float64Array(cache.pointCount), status=cache.status.slice();
    for(let i=0;i<values.length;i++) values[i]=status[i]===STATUS.OK ? cache.unitPotentials[i]*current : NaN;
    return {values,status};
  }
  // A metadata copy avoids external mutation affecting validation or geometry classification.
  return Object.freeze({manifest:JSON.parse(JSON.stringify(m)),basisIds:Object.freeze([basisId]),storageBytes:r.byteLength+z.byteLength+p.byteLength,classifyPoints,sampleUnitPotential,samplePotential,cacheUnitPotentials,combineCached});
}

/** World micrometers -> electrode-local SI meters: local = R_world_to_local * (world_um*1e-6 - origin_world_m). */
export function transformMicrometersToField(pointsMicrometers, originWorldMeters=new Float64Array([0,0,0]), rotationWorldToField=new Float64Array([1,0,0,0,1,0,0,0,1])) {
  assertPoints(pointsMicrometers);
  if(originWorldMeters.length!==3 || rotationWorldToField.length!==9 || !Array.from(originWorldMeters).every(Number.isFinite) || !Array.from(rotationWorldToField).every(Number.isFinite)) throw new TypeError('finite origin[3] and row-major rotation[9] required');
  for(let i=0;i<3;i++) for(let j=0;j<3;j++) {let dot=0;for(let k=0;k<3;k++)dot+=rotationWorldToField[3*i+k]*rotationWorldToField[3*j+k];if(Math.abs(dot-(i===j?1:0))>1e-10)throw new TypeError('rotation must be orthonormal');}
  const q=rotationWorldToField,det=q[0]*(q[4]*q[8]-q[5]*q[7])-q[1]*(q[3]*q[8]-q[5]*q[6])+q[2]*(q[3]*q[7]-q[4]*q[6]);
  if(Math.abs(det-1)>1e-10)throw new TypeError('rotation must preserve orientation');
  const out=new Float64Array(pointsMicrometers.length);
  for(let i=0;i<out.length;i+=3) {
    const x=pointsMicrometers[i]*1e-6-originWorldMeters[0],y=pointsMicrometers[i+1]*1e-6-originWorldMeters[1],z=pointsMicrometers[i+2]*1e-6-originWorldMeters[2];
    out[i]=q[0]*x+q[1]*y+q[2]*z;out[i+1]=q[3]*x+q[4]*y+q[5]*z;out[i+2]=q[6]*x+q[7]*y+q[8]*z;
  }
  return out;
}
