import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { normalize } from '../src/lib/retina-lab/schema.mjs';
import { buildImplantGeometry, implantLayout, microscopeClipPlanes } from '../src/lib/retina-lab/implant-geometry.mjs';
import { localPoint } from '../src/lib/retina-lab/coordinates.mjs';

const close = (a, b, epsilon = .002) => assert.ok(Math.abs(a - b) < epsilon, `${a} != ${b}`);
function vertices(mesh, visit) {
  const a = mesh.geometry.attributes.position;
  for (let i = 0; i < a.count; i++) visit(a.getX(i) * 1000, a.getY(i) * 1000, a.getZ(i) * 1000);
}
function dispose(group) {
  const mats = new Set();
  group.traverse(o => { o.geometry?.dispose(); if (o.material) mats.add(o.material); });
  mats.forEach(m => m.dispose());
}
for (const modality of ['electrical', 'photovoltaic']) {
  test(`${modality}: parts attach to one face under translation and rotation`, () => {
    for (const placement of [{xUm:0,yUm:0,rotationDeg:0}, {xUm:1700,yUm:-800,rotationDeg:37}]) {
      const c = normalize({ modality, placement });
      const {group, pickable} = buildImplantGeometry(c);
      const l = group.userData.layout;
      assert.equal(pickable.length, l.contacts.length);
      for (const mesh of group.children) {
        let attached = 0;
        vertices(mesh, (x,y,z) => {
          assert.ok([x,y,z].every(Number.isFinite));
          const delta = z - l.surface(x,y);
          if (mesh.name === 'implant-backing') {
            assert.ok(delta * l.faceDirection <= .002);
            assert.ok(delta * l.faceDirection >= -l.thickness - .002);
          } else {
            assert.ok(delta * l.faceDirection >= -.002, `${mesh.name} penetrates backing`);
            assert.ok(delta * l.faceDirection <= 3.002);
          }
          if (Math.abs(delta) < .002) attached++;
        });
        assert.ok(attached > 0, `${mesh.name} floats above backing`);
      }
      dispose(group);
    }
  });
  test(`${modality}: microscope clips the actual assembly without recentering it`, () => {
    const c = normalize({modality, placement:{xUm:900,yUm:400,rotationDeg:63}});
    const planes = microscopeClipPlanes(0,0);
    const whole = buildImplantGeometry(c), micro = buildImplantGeometry(c,{clipPlanes:planes});
    assert.equal(whole.group.children.length,micro.group.children.length);
    whole.group.children.forEach((mesh,i) => {
      assert.deepEqual(mesh.geometry.attributes.position.array,micro.group.children[i].geometry.attributes.position.array);
      assert.equal(micro.group.children[i].material.clippingPlanes,planes);
    });
    assert.ok(planes.every(p => p.distanceToPoint(new THREE.Vector3(0,0,0)) >= 0));
    assert.ok(planes.some(p => p.distanceToPoint(new THREE.Vector3(.5,0,0)) < 0));
    dispose(whole.group);dispose(micro.group);
  });
}
test('PRIMA remains planar across its full 2 mm footprint, including all return edges', () => {
  const c = normalize({modality:'photovoltaic',placement:{xUm:800,yUm:400,rotationDeg:21}});
  const {group} = buildImplantGeometry(c), l = group.userData.layout;
  const a = l.surface(0,0), dx = l.surface(1,0)-a, dy = l.surface(0,1)-a;
  for(const [x,y] of [[-1000,-1000],[1000,1000],[230,-470]]) close(l.surface(x,y),a+dx*x+dy*y);
  const backing=group.getObjectByName('implant-backing');
  vertices(backing,(x,y) => {
    const p = localPoint({xUm:x,yUm:y},c.placement);
    close(Math.abs(p.xUm),1000);close(Math.abs(p.yUm),1000);
  });
  assert.equal(group.children.filter(m=>m.name==='implant-return').length,l.prima.meshEdges.length);
  assert.equal(group.children.filter(m=>m.name==='implant-photodiode').length,756);
  dispose(group);
});
test('asymmetric imported arrays have backing beneath every complete contact', () => {
  const c=normalize();
  c.customContacts=[{id:'a',xUm:700,yUm:-100,radiusUm:120},{id:'b',xUm:1700,yUm:800,radiusUm:50}];
  c.placement={xUm:-400,yUm:200,rotationDeg:41};
  const l=implantLayout(c);
  for(const p of l.local) {
    assert.ok(p.xUm-p.radiusUm>l.bounds.left && p.xUm+p.radiusUm<l.bounds.right);
    assert.ok(p.yUm-p.radiusUm>l.bounds.bottom && p.yUm+p.radiusUm<l.bounds.top);
  }
  close(l.bounds.left,530);close(l.bounds.right,1800);
});
test('optogenetic mode creates no phantom implant', () => {
  const {group,pickable}=buildImplantGeometry(normalize({modality:'optogenetic'}));
  assert.equal(group.children.length,0);assert.equal(pickable.length,0);
});
