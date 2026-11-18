import { useEffect, useRef, useState } from 'preact/hooks';
import { parseSpecimenPart } from '../../lib/cochlear/specimen.js';
import { createAnatomyViewer } from './anatomy-renderer.js';

const root = '/assets/cochlear/microct/';
const models = { section: 'Cut bone', bone: 'Dissected bone', cast: 'Lumen cast' };
// F07_DESC landmarks expressed in the orthonormal workstation axes, in mm.
const landmarks = [
  {id:'apex',text:'Apex',position:[0,2.92,0],priority:3},
  {id:'rw',text:'Round window',position:[5.37,0,0],priority:2},
];
const cache = new Map();
function getMesh(key) {
  if (!cache.has(key)) cache.set(key, fetch(root + key + '.ply').then(r => {
    if (!r.ok) throw Error('Could not load the specimen surface.');
    return r.arrayBuffer();
  }).then(b => ({...parseSpecimenPart('bone', b), color:'#ffffff', id:'microct-'+key})).catch(e => {cache.delete(key); throw e;}));
  return cache.get(key);
}

export default function MicroCTSpecimen({theme}) {
  const stage = useRef(), viewer = useRef(), canvas = useRef();
  const [mode,setMode] = useState('section'), [slice,setSlice] = useState(31), [edges,setEdges] = useState(false);
  const [labels,setLabels] = useState(false);
  const [image,setImage] = useState(null), [imageError,setImageError] = useState(false), [status,setStatus] = useState('');
  useEffect(() => {
    try { viewer.current=createAnatomyViewer(stage.current,{}); } catch {setStatus('3D renderer unavailable. The scan is available alongside it.');}
    const im=new Image(); im.onload=()=>setImage(im); im.onerror=()=>setImageError(true); im.src=root+'sections.png';
    return ()=>{ im.onload=im.onerror=null; viewer.current?.dispose();viewer.current=null; };
  },[]);
  useEffect(()=>{
    let active=true, frame=0;
    if (!viewer.current) return;
    setStatus('Loading surface…');
    getMesh(mode).then(mesh=>{
      if (!active) return;
      viewer.current.setScene({mode:'microct', meshes:[mesh],labels:landmarks,scaleBarMm:1,camera:{position:mode==='section'?[0,0,18]:[-6,12,10],target:[0,0,0]}},{resetCamera:true});
      frame=requestAnimationFrame(()=>{if(active)viewer.current?.reset();});
      setStatus('');
    }).catch(()=>{if(active)setStatus('Surface unavailable. Select another reconstruction to retry.');});
    return ()=>{active=false;cancelAnimationFrame(frame);};
  },[mode]);
  useEffect(()=>{viewer.current?.setState({theme,showLabels:labels});},[theme,labels]);
  useEffect(()=>{
    if (!image) return;
    const ctx=canvas.current.getContext('2d');
    ctx.drawImage(image,(slice%8)*192,Math.floor(slice/8)*144,192,144,0,0,192,144);
    const pixels=ctx.getImageData(0,0,192,144);
    for(let i=0;i<pixels.data.length;i+=4){
      const g=pixels.data[i],outline=edges&&pixels.data[i+1]>127;
      pixels.data[i]=outline?232:g;pixels.data[i+1]=outline?158:g;pixels.data[i+2]=outline?58:g;
    }
    ctx.putImageData(pixels,0,0);
  },[image,slice,edges]);
  return <div class="ct-workbench">
    <section><header><small>F07 · Right human cochlea</small><h3>Micro-CT reconstruction</h3></header>
      <div class="ct-controls">{Object.entries(models).map(([id,name])=><button type="button" aria-pressed={mode===id} onClick={()=>setMode(id)}>{name}</button>)}</div>
      <div class="ct-frame"><div ref={stage} class="coch-anatomy-stage"/>{status&&<p role="status">{status}</p>}</div>
      <div class="ct-controls"><button onClick={()=>viewer.current?.zoom(1/1.2)} aria-label="Zoom in on micro-CT">+</button><button onClick={()=>viewer.current?.zoom(1.2)} aria-label="Zoom out of micro-CT">−</button><button onClick={()=>viewer.current?.reset()}>Reset view</button><label><input type="checkbox" checked={labels} onChange={e=>setLabels(e.currentTarget.checked)}/> Landmarks</label></div>
      <p>{mode==='cast'?'The segmented fluid space reveals the spiral within the cropped bony labyrinth.':'Bone intensity is sampled from the donor scan. The outer margin is a virtual dissection around the labyrinth.'} Drag to orbit.</p>
    </section>
    <section><header><small>Same specimen · 60.7 µm sampling</small><h3>Source sections</h3></header>
      <div class="ct-scan"><canvas width="192" height="144" ref={canvas} aria-label="Reformatted human cochlear micro-CT section"/><span>1 mm</span>{!image&&<p role="status">{imageError?'Scan unavailable':'Loading scan…'}</p>}</div>
      <label class="ct-range">Section offset <output>{((slice-31)*.1214).toFixed(2)} mm</output><input type="range" aria-label="CT section offset" min="0" max="62" value={slice} onInput={e=>setSlice(Number(e.currentTarget.value))}/></label>
      <div class="ct-controls"><button onClick={()=>{setSlice(31);if(mode==='section')viewer.current?.reset();setMode('section')}}>Match cut face</button><label><input type="checkbox" checked={edges} onChange={e=>setEdges(e.currentTarget.checked)}/> Lumen outline</label></div>
      <p>Scroll through 63 parallel planes. Zero selects the reformatted slice nearest the fixed 3D cut. The outline traces the published labyrinth segmentation.</p>
    </section>
  </div>;
}
