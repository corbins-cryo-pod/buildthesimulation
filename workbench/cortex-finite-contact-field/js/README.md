# Portable sampler API, version 1.0.0

`field-sampler.js` is an ES module with no third-party or Node imports. It runs in the main browser thread or a module Web Worker. Loading requires Web Crypto SHA-256, available from HTTPS or localhost in browsers. Python is used only for offline generation and optional browser automation.

```js
import {loadFieldPackage, STATUS, units, transformMicrometersToField}
  from './js/field-sampler.js';
const manifestURL = new URL('./artifacts/disk-v1/field.json', location.href);
const manifest = await fetch(manifestURL).then(r => r.json());
const binary = await fetch(new URL(manifest.data.file, manifestURL)).then(r => r.arrayBuffer());
const field = await loadFieldPackage(manifest, binary);
const pointsMeters = new Float64Array([0, 0, 30e-6, 10e-6, 0, 50e-6]);
const sampled = field.samplePotential(pointsMeters, new Float64Array([2e-6]));
// sampled.values: one extracellular potential, volts, per xyz triple.
// Reject/handle every sampled.status[i] !== STATUS.OK before cable integration.
```

`loadFieldPackage(manifest, binaryData)` is asynchronous and returns the field object. It accepts an `ArrayBuffer` or an `ArrayBufferView` including offset views. It validates schema version, supported geometry and units, complete source/return normalization, array offsets, length, SHA-256, strictly increasing axes, finite nodal data, and the disk rim mesh node. A verified independent copy of binary storage prevents later caller changes from modifying the field. Malformed metadata or bytes reject the Promise with an Error; a wrong argument type raises TypeError. The sampler supports exactly one axisymmetric disk basis; other shapes and basis counts are rejected.

The field object exports:

| Method/property | Exact contract |
| --- | --- |
| `classifyPoints(pointsMeters)` | Returns `{status: Uint8Array(N), contactDistanceMeters: Float64Array(N), rimDistanceMeters: Float64Array(N)}`. |
| `sampleUnitPotential(pointsMeters, basisId='disk_to_outer_ground')` | Returns `{values: Float64Array(N), status: Uint8Array(N)}`; values are V/A. Unknown basis IDs throw RangeError. |
| `samplePotential(pointsMeters, currentsAmps)` | Same layout; values are volts. `currentsAmps` is Float64Array or Float32Array, length exactly one, containing a finite signed current in amperes in manifest basis order. |
| `cacheUnitPotentials(pointsMeters)` | Returns `{packageSha256, basisIds, pointCount, unitPotentials: Float64Array(N), status: Uint8Array(N)}`. Cache arrays are owned by the caller; do not mutate them. |
| `combineCached(cache, currentsAmps)` | Returns volts and copied statuses, using cached basis values without spatial interpolation. Incompatible package hashes/basis IDs/array sizes throw TypeError. Invalid cached statuses remain NaN even at zero current. |
| `basisIds` | Frozen array `['disk_to_outer_ground']`. |
| `manifest` | Metadata copy. Editing this copy does not alter sampler behavior. |
| `storageBytes` | Exact bytes retained by r-axis, z-axis and nodal potential arrays. Caller-owned input buffers, query arrays, and temporary loading allocations are additional. |

All coordinate inputs must be Float64Array or Float32Array of length `3*N`, packed `[x0,y0,z0,x1,y1,z1,...]` in local SI meters. Output arrays preserve input order. Empty batches are allowed. Wrong input array types or nonmultiples of three throw TypeError. Coordinate nonfiniteness is a per-point invalid status. Invalid samples always return NaN; they never clamp, extrapolate, insert zero, or substitute a point source. Functions allocate fresh output arrays.

Classification follows this precedence:

| Code | Name | Meaning |
| --- | --- | --- |
| 0 | OK | Tissue within the restricted supported sampling region. |
| 1 | NONFINITE | Nonfinite coordinate or radial distance. Distances also return NaN. |
| 2 | ELECTRODE_SURFACE | Exactly z=0 and radial distance r≤a. This ideal contact has zero thickness. |
| 3 | INSULATION | z<0 solid substrate, or z=0 outside the contact. |
| 4 | OUTSIDE_DOMAIN | Tissue at or beyond the artificial cylinder: r≥R or z≥H. |
| 5 | OUTSIDE_VALIDATED_REGION | Tissue inside the cylinder but r>10a or z>10a. |
| 6 | NEAR_RIM | Otherwise eligible tissue with distance to the circular rim less than 0.02a. |

For finite coordinates, contact distance is `hypot(max(hypot(x,y)-a,0),z)` and rim distance is `hypot(hypot(x,y)-a,z)`. These distances are geometric and do not establish biological safety. Threshold comparisons are direct floating-point comparisons without fuzzy clamping; code should not rely on points exactly at a policy boundary.

The physical basis includes disk current +1 A, total current −1 A through the artificial grounded outer cylinder, no inactive contacts, and 0 V at the outer cylinder. Negative multipliers reverse polarity. The single basis supports `Ve=I(t)*phi` and sums of currents applied to this same configuration. This release does not combine independently generated fields or implement multi-contact steering bases.

`SCHEMA_VERSION`, `STATUS`, and `STATUS_NAMES` are also exported. `units` exports scalar helpers `micrometersToMeters`, `microampsToAmps`, `millisecondsToSeconds`, `voltsToMillivolts`, and `metersToMicrometers`.

`transformMicrometersToField(pointsMicrometers, originWorldMeters=[0,0,0], rotationWorldToField=identity)` returns Float64Array local coordinates. The row-major rotation has nine finite entries, must be orthonormal and have determinant +1; the finite origin has three entries. The transformation is `local_m = R * (world_um*1e-6 - origin_world_m)`. Supply a rotation consistent with local +z pointing from disk into tissue. Nonfinite points are preserved for per-point classification. Defaults are typed arrays, but origin and rotation can be ordinary numeric arrays.

The binary layout is little endian: `nr` Float64 radial coordinates in meters, `nz` Float64 height coordinates in meters, then `nr*nz` Float32 potentials in V/A. Potentials are z-major with radial index contiguous. Every rectangular cell is split SW–NE. The sampler performs continuous triangular P1 interpolation, matching the numerical source solution; bilinear interpolation would be a different field. It produces no electric-field derivatives.

For stationary neurons, transform and classify points, create a cache once, then call `combineCached` at each waveform time. Convert returned volts to millivolts at the cable-model interface. Do not apply sampled extracellular potential directly as membrane current: the cable solver must use its correct extracellular-potential coupling. Recompute caches when geometry, position, conductivity, return configuration, or artifact changes. Retain the existing 25 µm simulator guardrail until integration evidence justifies a separate decision. Entire segments and finite membrane radii need implant collision checks; valid center points alone are insufficient.
