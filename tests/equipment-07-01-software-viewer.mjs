import test from 'node:test';
import assert from 'node:assert/strict';
import { Mesh, MeshStandardMaterial, PerspectiveCamera, PlaneGeometry, Scene } from 'three';
import { createSoftwareRenderer } from '../src/lib/equipment/07-01/software-viewer.js';

test('the WebGL-free cabinet viewer depth-tests opaque parts and blends the moving window', () => {
  let pixels;
  const context = {
    createImageData: (w,h) => ({data:new Uint8ClampedArray(4*w*h)}),
    putImageData: image => {pixels=image.data;}
  };
  const original = globalThis.document;
  globalThis.document = {createElement: () => ({getContext: () => context})};
  try {
    const renderer = createSoftwareRenderer();
    renderer.setSize(40,40);
    const camera = new PerspectiveCamera(55,1,.01,10);
    camera.position.z=2;
    const scene=new Scene();
    const makePanel=(color,z,opacity=1)=>{
      const mesh=new Mesh(new PlaneGeometry(1,1),new MeshStandardMaterial({color,transparent:opacity<1,opacity}));
      mesh.position.z=z;scene.add(mesh);return mesh;
    };
    const foreground=makePanel(0xff0000,.2);
    makePanel(0x0000ff,0);
    const pane=makePanel(0x00ff00,.4,.5);
    const center=()=>{
      renderer.render(scene,camera);
      const i=4*(Math.floor(renderer.domElement.height/2)*renderer.domElement.width+Math.floor(renderer.domElement.width/2));
      return Array.from(pixels.subarray(i,i+4));
    };
    const [r,g,b,alpha]=center();
    assert.ok(r>55 && g>55 && b===0 && alpha===255);
    pane.visible=false;
    const redOnly=center();
    assert.ok(redOnly[0]>150 && redOnly[1]===0 && redOnly[2]===0);
    foreground.position.x=2;
    const blueOnly=center();
    assert.ok(blueOnly[0]===0 && blueOnly[1]===0 && blueOnly[2]>150);
  } finally {
    if(original===undefined) delete globalThis.document;
    else globalThis.document=original;
  }
});
