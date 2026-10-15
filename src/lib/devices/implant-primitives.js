import * as THREE from 'three';
import { createDeviceMaterials } from './materials.js';

// Cylindrical surface with a specified angular span. Angle zero is +X; Z is axial.
function arcFace(radius, centerAngle, span, z, length, inward = false) {
  const vertices = [], normals = [], indices = [];
  const steps = Math.max(12, Math.round(span / (2 * Math.PI) * 384));
  for (let i = 0; i <= steps; i++) {
    const angle = centerAngle - span / 2 + span * i / steps;
    for (const dz of [-length / 2, length / 2]) {
      vertices.push(radius * Math.cos(angle), radius * Math.sin(angle), z + dz);
      const sign = inward ? -1 : 1;
      normals.push(sign * Math.cos(angle), sign * Math.sin(angle), 0);
    }
    if (i) { const a = (i - 1) * 2, b = i * 2; indices.push(...(inward ? [a,a+1,b, a+1,b+1,b] : [a,b,a+1, a+1,b,b+1])); }
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
  geometry.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3));
  geometry.setIndex(indices); return geometry;
}
function ringShape(inner, outer, opening) {
  const shape = new THREE.Shape(), start = opening / 2, end = 2 * Math.PI - opening / 2;
  shape.moveTo(outer * Math.cos(start), outer * Math.sin(start));
  shape.absarc(0, 0, outer, start, end, false);
  shape.lineTo(inner * Math.cos(end), inner * Math.sin(end));
  shape.absarc(0, 0, inner, end, start, true); shape.closePath(); return shape;
}
export function buildImplantPrimitive(model, sites, bodies, contacts) {
  const lift = 0.00001; // 10 nm display separation only; JSON retains nominal surfaces.
  const { substrate: polymer, contact: metal } = createDeviceMaterials(model);
  const addContact = (geometry, i) => { const mesh = new THREE.Mesh(geometry, metal); mesh.name = sites[i].id; mesh.userData = {visualizationOffsetMm: model.kind === 'exposed-wire' ? 0 : lift, note: 'Display separation only; geometry JSON preserves nominal source dimensions'}; contacts.add(mesh); return mesh; };
  if (model.kind === 'planar-probe') {
    const count = model.shankCount ?? 1;
    for (let i = 0; i < count; i++) {
      const x = (i - (count - 1) / 2) * (model.shankPitch ?? 0), w = model.width / 2, t = model.tipLength ?? 0;
      const shape = new THREE.Shape();
      const levels = [0, model.length - t, model.length];
      if (model.tipBevelAngle) levels.push(model.length - model.thickness / Math.tan(model.tipBevelAngle * Math.PI / 180));
      const ordered = [...new Set(levels)].sort((a,b) => a-b);
      const halfWidth = z => t > 0 && z > model.length - t ? w * (model.length-z) / t : w;
      shape.moveTo(x-w,0);
      for (const z of ordered) shape.lineTo(x+halfWidth(z),z);
      for (const z of ordered.slice().reverse()) shape.lineTo(x-halfWidth(z),z);
      shape.closePath();
      const geometry = new THREE.ExtrudeGeometry(shape, {depth: model.thickness, bevelEnabled: false});
      geometry.rotateX(Math.PI / 2); geometry.translate(0, model.thickness / 2, 0);
      if (model.tipBevelAngle) {
        // The NHP probe's ground bevel thins the distal back face while the
        // recording face and every contact remain in their documented plane.
        const bevelRun = model.thickness / Math.tan(model.tipBevelAngle * Math.PI / 180);
        const position = geometry.getAttribute('position');
        for (let v = 0; v < position.count; v++) {
          const fraction = THREE.MathUtils.clamp((model.length - position.getZ(v)) / bevelRun, 0, 1);
          position.setY(v, -model.thickness / 2 + (position.getY(v) + model.thickness / 2) * fraction);
        }
        // Beveling collapses the end-wall triangles at the sharp edge. Remove
        // those zero-area faces so their zero normals cannot spoil shading or
        // exported glTF normals; the surviving surface still reaches the tip.
        const keep = [], a = new THREE.Vector3(), b = new THREE.Vector3(), c = new THREE.Vector3();
        for (let v = 0; v < position.count; v += 3) {
          a.fromBufferAttribute(position,v); b.fromBufferAttribute(position,v+1); c.fromBufferAttribute(position,v+2);
          if (b.sub(a).cross(c.sub(a)).lengthSq() > 1e-24) keep.push(v,v+1,v+2);
        }
        for (const [key, attribute] of Object.entries(geometry.attributes)) {
          const values = keep.flatMap(v => Array.from(attribute.array.slice(v*attribute.itemSize,(v+1)*attribute.itemSize)));
          geometry.setAttribute(key,new THREE.Float32BufferAttribute(values,attribute.itemSize));
        }
        geometry.clearGroups();
        geometry.computeVertexNormals();
      }
      bodies.add(new THREE.Mesh(geometry, polymer));
    }
    model.contactLayout.forEach((p, i) => {
      const geometry = p.shape === 'circle' ? new THREE.CircleGeometry(p.size / 2, 24) : new THREE.PlaneGeometry(p.size, p.size);
      const mesh = addContact(geometry, i); mesh.rotation.x = Math.PI / 2; mesh.position.fromArray(sites[i].positionMm).addScaledVector(new THREE.Vector3(...sites[i].normal), lift);
    });
  } else if (model.kind === 'cylindrical-lead') {
    const body = new THREE.Mesh(new THREE.CylinderGeometry(model.diameter/2, model.diameter/2, model.length, 384), polymer);
    body.rotation.x = Math.PI/2; body.position.z = model.length/2; bodies.add(body);
    let i = 0;
    for (const c of model.contacts) for (let segment=0; segment<c.segments; segment++) {
      const span = c.segments === 1 ? Math.PI*2 : Math.PI*2/c.segments-(c.gapAngle ?? 0);
      addContact(arcFace(model.diameter/2 + lift, (c.rotation ?? 0)+segment*Math.PI*2/c.segments, span, c.z, c.length), i++);
    }
  } else if (model.kind === 'nerve-cuff') {
    bodies.add(new THREE.Mesh(new THREE.ExtrudeGeometry(ringShape(model.innerDiameter/2,model.innerDiameter/2+model.wallThickness,model.openingAngle),{depth:model.length,bevelEnabled:false,curveSegments:512}),polymer));
    model.contacts.forEach((c,i) => addContact(arcFace(model.innerDiameter/2 - lift,c.angle,c.angularSpan,c.z,c.length,true),i));
  } else if (model.kind === 'flat-cuff') {
    const w=model.innerWidth/2,h=model.innerHeight/2,t=model.wallThickness;
    const shape=new THREE.Shape();
    // A rounded outer silicone sleeve, with the measured flat lumen untouched.
    const r=Math.min(model.outerCornerRadius ?? 0,w+t,h+t);
    shape.moveTo(-w-t+r,-h-t);shape.lineTo(w+t-r,-h-t);
    shape.quadraticCurveTo(w+t,-h-t,w+t,-h-t+r);shape.lineTo(w+t,h+t-r);
    shape.quadraticCurveTo(w+t,h+t,w+t-r,h+t);shape.lineTo(-w-t+r,h+t);
    shape.quadraticCurveTo(-w-t,h+t,-w-t,h+t-r);shape.lineTo(-w-t,-h-t+r);
    shape.quadraticCurveTo(-w-t,-h-t,-w-t+r,-h-t);shape.closePath();
    const hole=new THREE.Path(), ri=Math.min(model.innerCornerRadius ?? 0,w,h);
    hole.moveTo(-w,-h+ri);hole.lineTo(-w,h-ri);hole.quadraticCurveTo(-w,h,-w+ri,h);
    hole.lineTo(w-ri,h);hole.quadraticCurveTo(w,h,w,h-ri);hole.lineTo(w,-h+ri);
    hole.quadraticCurveTo(w,-h,w-ri,-h);hole.lineTo(-w+ri,-h);hole.quadraticCurveTo(-w,-h,-w,-h+ri);
    hole.closePath();shape.holes.push(hole);
    bodies.add(new THREE.Mesh(new THREE.ExtrudeGeometry(shape,{depth:model.length,bevelEnabled:false}),polymer));
    model.contacts.forEach((c,i)=>{const mesh=addContact(new THREE.CircleGeometry(c.diameter/2,32),i);mesh.position.fromArray(sites[i].positionMm).addScaledVector(new THREE.Vector3(...c.normal), lift);mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0,0,1),new THREE.Vector3(...c.normal));});
  } else if (model.kind === 'exposed-wire') {
    const start = model.exposedStart ?? model.length - model.exposedLength;
    for (const [z, length] of [[0, start], [start + model.exposedLength, model.length - start - model.exposedLength]]) {
      if (length <= 0) continue;
      const body = new THREE.Mesh(new THREE.CylinderGeometry(model.diameter / 2, model.diameter / 2, length, 32), polymer);
      body.rotation.x = Math.PI / 2; body.position.z = z + length / 2; bodies.add(body);
    }
    addContact(arcFace(model.coreDiameter / 2, 0, Math.PI * 2, start + model.exposedLength / 2, model.exposedLength), 0);
  } else throw new Error(`Unsupported implanted primitive: ${model.kind}`);
}
