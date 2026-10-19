import {useEffect,useState} from 'preact/hooks';
import CortexLaboratory from './CortexLaboratory.jsx';
import CortexFiniteLaboratory from './CortexFiniteLaboratory.jsx';
import '../styles/cortex-finite.css';
export default function CortexWorkspace(){
  const [mode,setMode]=useState('point');
  useEffect(()=>{
    const read=()=>setMode(new URLSearchParams(location.search).get('field')==='finite-disk'?'finite-disk':'point');
    read();addEventListener('popstate',read);return()=>removeEventListener('popstate',read);
  },[]);
  const select=value=>{
    if(value===mode)return;
    const url=new URL(location.href);
    value==='finite-disk'?url.searchParams.set('field',value):url.searchParams.delete('field');
    history.pushState(null,'',url);setMode(value);
  };
  return <>
    <nav class="cx-field-mode" aria-label="Laboratory field model">
      <strong>Field model</strong>
      <button aria-pressed={mode==='point'} onClick={()=>select('point')}>Point sources · single human cell</button>
      <button aria-pressed={mode==='finite-disk'} onClick={()=>select('finite-disk')}>Finite disk · single human cell</button>
      <span>Switching modes stops the current run and resets its workspace.</span>
    </nav>
    {mode==='finite-disk'?<CortexFiniteLaboratory />:<CortexLaboratory />}
  </>;
}
