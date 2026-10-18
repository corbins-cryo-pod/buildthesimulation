# Integration contract, version 1.0

## Model and coordinate frame

The disk center is local `(0,0,0)` and its normal into tissue is local `+z`.
The contact occupies `z=0, x²+y²≤a²`, `a=25e-6 m`; the ideal contact is
zero thickness. The solid backing below the plane is classified as
insulation/unsupported; no buried conductor or shank shape is specified.
Three.js render coordinates are not automatically physical coordinates.
Convert the simulator's physical micrometers to meters and transform to
the disk frame before querying. For a world-to-field rotation `R`:

`p_field_m = R * (p_world_um * 1e-6 - disk_center_world_m)`.

`transformMicrometersToField(points, origin, R)` implements this with a
row-major 3×3 proper orthonormal rotation; the helper rejects non-rotations.
It is separate from the sampler, which accepts **local SI coordinates**.
The model is rotationally symmetric: the solver uses `r=hypot(x,y), z`.

## Loading and binary layout

```javascript
import {loadFieldPackage, STATUS, units,
  transformMicrometersToField} from './js/field-sampler.js';
const manifest = await fetch('./artifacts/disk-v1/field.json').then(r=>r.json());
const bytes = await fetch('./artifacts/disk-v1/field.bin').then(r=>r.arrayBuffer());
const field = await loadFieldPackage(manifest, bytes);
```

`loadFieldPackage(manifest, binaryData)` returns a Promise. `binaryData`
accepts an `ArrayBuffer` or an ArrayBuffer view, respecting byte offsets.
Loading verifies schema, supported geometry, units, complete source/return
configuration, dimensions, offsets, monotonic axes, finite values, length,
and mandatory SHA-256. It copies verified bytes into owned storage so later
caller mutations cannot corrupt sampling. Web Crypto must be available;
there is no checksum-bypass mode. Metadata is copied as well.

The exact binary format is little-endian: `nr` Float64 radial coordinates
in meters, followed by `nz` Float64 heights in meters, followed by
`nr*nz` Float32 unit potentials in V/A. Potential index is `j*nr+i`.
Each grid rectangle has a SW–NE diagonal. The sampler uses barycentric
P1 interpolation on the same two triangles as the source FEM, with
Float64 arithmetic. There is no analytical or point-source fallback.
The manifest contains dimensions, byte offsets, generator checksum,
mesh/domain parameters, runtime provenance and basis metadata. The stored
outer domain is larger than the region accepted for runtime sampling.

## Exact API and failure behavior

Every coordinate argument is `Float64Array` or `Float32Array`, packed
`[x0,y0,z0,x1,y1,z1,...]`, length divisible by 3. Prefer Float64 for physical
positions and transforms. Empty arrays are allowed. Array shape errors,
unknown basis IDs, invalid metadata, wrong current count, nonfinite current,
or a mismatched cache throw an exception; loading failures reject its Promise.

| Export / method | Return value |
|---|---|
| `loadFieldPackage(manifest,binaryData)` | Promise of field object |
| `field.classifyPoints(pointsMeters)` | `{status:Uint8Array[N], contactDistanceMeters:Float64Array[N], rimDistanceMeters:Float64Array[N]}` |
| `field.sampleUnitPotential(pointsMeters,basisId='disk_to_outer_ground')` | `{values:Float64Array[N],status:Uint8Array[N]}`, values V/A |
| `field.samplePotential(pointsMeters,currentsAmps)` | Same arrays, values V |
| `field.cacheUnitPotentials(pointsMeters)` | `{packageSha256,basisIds,pointCount,unitPotentials:Float64Array[N],status:Uint8Array[N]}` |
| `field.combineCached(cache,currentsAmps)` | `{values:Float64Array[N],status:Uint8Array[N]}`, V; no spatial interpolation |
| `transformMicrometersToField(pointsUm,originWorldMeters,R)` | New packed Float64Array in field meters |

`currentsAmps` is a Float64Array or Float32Array of length **one**, in manifest
basis order. `field.basisIds`, `field.manifest` and exact
`field.storageBytes` are exposed. Cache arrays belong to the caller: treat
them as read-only; do not mutate their potentials/status or share a mutable
cache across concurrent writes. No internal asynchronous sampling occurs.
Outputs allocate 9 bytes per point (Float64 potential plus Uint8 status).

`STATUS`, `STATUS_NAMES`, `SCHEMA_VERSION`, and `units` are named exports.

| Code | Name | Meaning |
|---|---|---|
| 0 | `OK` | Tissue within the accepted numerical coverage region |
| 1 | `NONFINITE` | At least one invalid coordinate or radial overflow |
| 2 | `ELECTRODE_SURFACE` | `z=0` and `r≤a`, including the rim |
| 3 | `INSULATION` | Remaining `z≤0` points; modeled boundary/backing convention |
| 4 | `OUTSIDE_DOMAIN` | Tissue at or beyond `r=50 mm` or `z=50 mm` |
| 5 | `OUTSIDE_VALIDATED_REGION` | Tissue outside `r≤250 µm,z≤250 µm` |
| 6 | `NEAR_RIM` | Tissue within `sqrt((r-a)²+z²)<0.5 µm` |

Classification priority follows the table (electrode before insulation,
domain before coverage before rim). Every non-OK sample has **NaN**, even
when applied current is zero. No clamp, zero replacement, extrapolation or
point-source substitution is performed. Check status before applying
potentials to the cable solver. Missing/failed queries must stop or explicitly
exclude the affected neuron according to application policy.

`contactDistanceMeters=sqrt(z²+max(r-a,0)²)` is distance to the exposed disk,
not to its center. `rimDistanceMeters=sqrt(z²+(r-a)²)`. Distances for nonfinite
queries are NaN. Exact surface tests deliberately use exact `z=0`; applications
must make geometric tolerances explicit rather than relying on this API to
snap points to surfaces. Boundary values at exactly 250 µm are accepted if
representable coordinates satisfy the inequality; no epsilon clamp is used.

## Current, return, signs and cached waveforms

There is one basis: `disk_to_outer_ground`. A positive coefficient supplies
that many amperes **from the disk into tissue**, with equal negative net
current at the artificial grounded outer cylinder. Its zero reference is
the outer boundary. This is a distant-return approximation, not a finite
implanted return electrode. There are no inactive contacts in this model.

For stationary neurons, sample once per compartment, then multiply once per
waveform update. A 1 µA coefficient times a 1000 V/A basis value gives
0.001 V = 1 mV. The core interface has no implicit µA or µm handling.

```javascript
const localMeters = transformMicrometersToField(compartmentXYZum,
  diskCenterWorldMeters, worldToDiskRotation);
const cached = field.cacheUnitPotentials(localMeters);
if (cached.status.some(s=>s!==STATUS.OK)) throw Error('Unsupported compartment');

// t is in simulator milliseconds; phases are illustrative, not recommended doses.
function currentMicroamps(tMs) {
  if (tMs >= 0 && tMs < 0.10) return -2;
  if (tMs >= 0.15 && tMs < 0.25) return 2;
  return 0;
}
function extracellularMillivolts(tMs) {
  const {values} = field.combineCached(cached,
    new Float64Array([units.microampsToAmps(currentMicroamps(tMs))]));
  return Float64Array.from(values, units.voltsToMillivolts);
}
```

The helpers are `micrometersToMeters`, `metersToMicrometers`,
`microampsToAmps`, `millisecondsToSeconds`, and `voltsToMillivolts`.
They operate on one scalar. The example has equal ±2 µA phases of 0.1 ms
with a 0.05 ms gap, so its prescribed-current integral is zero. This does
not model interface polarization, charge injection capacity, or safety.

For future fixed multi-contact geometries, linearity permits
`Ve(x,t)=Σ Ik(t) φk(x)`. Each basis must use the same tissue/solids,
conductivity, contact treatment, return, and gauge. An inactive ideal metal
usually remains an unknown equipotential with **zero net current**, rather
than becoming insulated. The controlled return must remove the sum of
active contact currents, or a fully enclosed formulation must enforce
`Σ Icontact=0`. Independently translated/rotated copies of this disk package
do not represent a multi-contact implant: each copy would assume a different
boundary-value problem. The current loader explicitly supports one basis;
multi-contact generation and sampling are not claimed complete.

## Cable model connection and remaining integration checks

Replace only the point-source *potential evaluation* stage. Preserve the
existing extracellular coupling convention in the cable equations, normally
`Vm=Vi−Ve`. Confirm the simulator's signs and neighboring-compartment forcing
using simple passive fixtures before active human-neuron models. The package
does not compute activating functions or electric fields; differentiating
these P1 potentials would require separate validation.

Retain the current application-specific **25 µm guardrail** until the
integrating developer decides otherwise from geometry, interface,
biophysics, and numerical evidence. It is not a biological boundary, and
the 0.5 µm numerical rim exclusion is not a replacement safe distance.

Point classification cannot establish collision-free neurons. Test all
compartment segments, segment crossings of the plane/contact/implant, and
finite membrane radii against actual solids. A pair of valid endpoints may
still define a colliding segment. Rebuild cached fields if coordinates,
electrode placement, geometry, conductivity, return, or package changes.

Neural spatial discretization, temporal integration, active mechanisms,
stimulation thresholds and selectivity remain separate unresolved
validation problems. Numerical field agreement does not validate firing.

## Unsupported cases

No shank, arbitrary contact, Utah/Neuralink/Neuropixels implant, finite return
contact, anisotropy, heterogeneity, nonlinear/dispersive tissue, electrode
interface impedance/capacitance, moving neurons, biological safety distance,
or membrane-radius collision solver is implemented. Multiple software
environments were tested (Node and Chromium), but Firefox, Safari and mobile
devices were not. See the physical specification for all model assumptions.
