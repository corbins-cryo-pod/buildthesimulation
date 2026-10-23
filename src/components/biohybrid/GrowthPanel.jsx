import {useMemo, useState} from 'preact/hooks';
import {simulateGrowth, DEFAULT_GROWTH_SETTINGS} from '../../lib/biohybrid/growth.js';
import {Field, fmt, TRACE_COLORS} from './Instrumentation.jsx';

const CONTROL_KEYS=['seed','days','speedUmPerDay','cueStrength','branchProbabilityPerDay','synapseProbability'];
const initialControls=Object.fromEntries(CONTROL_KEYS.map(key=>[key,DEFAULT_GROWTH_SETTINGS[key]]));
const distance=(a,b)=>Math.hypot(...a.map((v,i)=>v-b[i]));

function scaffoldSettings(geometry) {
  const scaffold=geometry?.scaffold;
  return {
    lengthUm:scaffold?distance(scaffold.startUm,scaffold.endUm):DEFAULT_GROWTH_SETTINGS.lengthUm,
    radiusUm:scaffold?.radiusUm??DEFAULT_GROWTH_SETTINGS.radiusUm,
    graftCount:geometry?.neurons?.filter(n=>n.role==='graft').length??DEFAULT_GROWTH_SETTINGS.graftCount,
    hostCount:geometry?.neurons?.filter(n=>n.role==='host').length??DEFAULT_GROWTH_SETTINGS.hostCount,
  };
}

/** Return only already reached vertices, interpolating the current numerical step. */
function pathAtDay(path, day) {
  if(path.birthDay>day) return null;
  const points=[];
  for(let i=0;i<path.points.length;i++) {
    const point=path.points[i];
    if(point.day<=day+1e-12) points.push(point);
    else {
      const previous=path.points[i-1];
      if(previous && day>previous.day) {
        const f=(day-previous.day)/(point.day-previous.day);
        points.push({day,positionUm:previous.positionUm.map((v,k)=>v+f*(point.positionUm[k]-v))});
      }
      break;
    }
  }
  return {...path,points,lengthAtDayUm:points.slice(1).reduce((sum,p,i)=>sum+distance(points[i].positionUm,p.positionUm),0)};
}

function downloadGrowth(result, day) {
  const data={...result,viewDay:day,transfer:'Only a user-selected candidate target count can be copied into pending electrical settings; these growth paths are not electrical cable reconstructions.'};
  const url=URL.createObjectURL(new Blob([JSON.stringify(data,null,2)],{type:'application/json'}));
  const a=document.createElement('a');
  a.href=url;a.download=`biohybrid-growth-seed-${result.settings.seed}.json`;a.click();
  setTimeout(()=>URL.revokeObjectURL(url),1000);
}

export default function GrowthPanel({geometry,onApply}) {
  const [controls,setControls]=useState(initialControls);
  const dimensions=useMemo(()=>scaffoldSettings(geometry),[geometry]);
  const [result,setResult]=useState(()=>simulateGrowth({...initialControls,...scaffoldSettings(geometry)}));
  const [day,setDay]=useState(()=>result.metrics.simulatedUntilDay);
  const [error,setError]=useState('');
  const [applied,setApplied]=useState(null);
  const pending={...controls,...dimensions};
  const dirty=Object.entries(pending).some(([key,value])=>Math.abs(value-result.settings[key])>1e-9);
  const view=useMemo(()=>{
    const paths=result.paths.map(path=>pathAtDay(path,day)).filter(Boolean);
    const encounters=result.encounters.filter(e=>e.day<=day+1e-12);
    const candidates=result.candidateSynapses.filter(c=>c.day<=day+1e-12);
    return {paths,encounters,candidates,targetIds:new Set(candidates.map(c=>c.targetId)),
      encounteredIds:new Set(encounters.map(e=>e.targetId)),lengthUm:paths.reduce((sum,p)=>sum+p.lengthAtDayUm,0)};
  },[result,day]);
  const chart=useMemo(()=>{
    const width=900,height=280,scale=Math.min(760/result.lengthUm,170/(2*result.radiusUm));
    const left=(width-result.lengthUm*scale)/2,centerY=126;
    const x=point=>left+point[0]*scale,y=point=>centerY-point[1]*scale;
    const scaleBar=[10,20,50,100,200,500,1000,2000].filter(n=>n<=result.lengthUm/4).at(-1)??10;
    return {width,height,scale,left,centerY,x,y,scaleBar};
  },[result]);
  const change=(name,value)=>{setControls(previous=>({...previous,[name]:name==='seed'?Math.round(value):value}));setApplied(null);setError('');};
  const calculate=()=>{
    try {const next=simulateGrowth(pending);setResult(next);setDay(next.metrics.simulatedUntilDay);setError('');setApplied(null);}
    catch(e) {setError(e.message||'Growth calculation failed.');}
  };
  const scrub=value=>{setDay(Math.max(0,Math.min(result.metrics.simulatedUntilDay,value)));setApplied(null);};
  const apply=()=>{
    if(dirty || typeof onApply!=='function') return;
    const count=view.targetIds.size;
    onApply(count);setApplied({count,day});
  };
  const colorFor=path=>TRACE_COLORS[(Number(path.sourceGraftId.split('-').at(-1))-1)%TRACE_COLORS.length];
  const end=result.metrics.simulatedUntilDay;

  return <section class="bh-growth-shell" aria-labelledby="bh-growth-heading">
    <header><div><span class="bh-kicker">Experiment 06 · separate biological timescale</span><h2 id="bh-growth-heading">Growth &amp; candidate integration</h2></div><a class="bh-method-link" href="/simulations/biohybrid-interface/methods/#growth">Growth methods <span>↗</span></a></header>
    <p>Calculate possible neurite trajectories, target encounters, and candidate connections. These are exploratory estimates; there is no calibrated integration prediction. The clock below is in days, separate from electrical replay in milliseconds.</p>
    <div class="bh-growth">
      <div>
        <div class="bh-growth-controls">
          <Field name="seed" label="Random seed" unit="integer" min={0} max={4294967295} step={1} value={controls.seed} onChange={change}/>
          <Field name="days" label="Growth duration" unit="days" min={0} max={60} step={.5} value={controls.days} onChange={change}/>
          <Field name="speedUmPerDay" label="Elongation speed" unit="µm/day" min={0} max={1500} step={10} value={controls.speedUmPerDay} onChange={change}/>
          <Field name="cueStrength" label="Directional cue" unit="0–1" min={0} max={1} step={.05} value={controls.cueStrength} onChange={change}/>
          <Field name="branchProbabilityPerDay" label="Branch hazard" unit="day⁻¹" min={0} max={4} step={.02} value={controls.branchProbabilityPerDay} onChange={change}/>
          <Field name="synapseProbability" label="Formation trial" unit="probability per encounter" min={0} max={1} step={.05} value={controls.synapseProbability} onChange={change}/>
          <button type="button" class="bh-primary" onClick={calculate}>Calculate growth</button>
        </div>
        <p class="bh-note">Pending geometry: {fmt(dimensions.lengthUm,0)} µm length, {fmt(dimensions.radiusUm,0)} µm radius; {dimensions.graftCount} roots and {dimensions.hostCount} target regions.</p>
        <p class="bh-note">Estimated maturation interval: {fmt(result.settings.maturationDelayDays)} day. Target capture radius: {fmt(result.settings.targetRadiusUm)} µm. Growth step: {fmt(result.settings.dtDays)} day. An encounter alone does not establish a functional synapse.</p>
        {dirty&&<p class="bh-note" role="status"><strong>Controls changed.</strong> The drawing still shows the previous calculated run. Calculate growth to apply the pending inputs.</p>}
        {error&&<p class="bh-error" role="alert">{error}</p>}
      </div>
      <div class="bh-growth-result">
        <div class="bh-runbar"><div><span class="bh-label">Calculated growth</span><b>Seed {result.settings.seed} · {fmt(result.settings.speedUmPerDay,0)} µm/day</b></div></div>
        <svg viewBox={`0 0 ${chart.width} ${chart.height}`} role="img" aria-label={`Growth at day ${fmt(day)}: ${view.paths.length} trajectories, ${view.encounters.length} encounters, ${view.candidates.length} candidate connections. Top view with depth projected.`}>
          <text x="20" y="23">XY PROJECTION · DEPTH PROJECTED</text>
          <text x="880" y="23" textAnchor="end">DAY {fmt(day,2)}</text>
          <rect x={chart.left} y={chart.centerY-result.radiusUm*chart.scale} width={result.lengthUm*chart.scale} height={2*result.radiusUm*chart.scale} fill="none" stroke="currentColor" strokeOpacity=".35" strokeDasharray="5 4"/>
          <line x1={chart.left} x2={chart.left+result.lengthUm*chart.scale} y1={chart.centerY} y2={chart.centerY} stroke="currentColor" strokeOpacity=".1" strokeDasharray="2 5"/>
          {result.targets.map(target=>{
            const candidate=view.targetIds.has(target.id),encountered=view.encounteredIds.has(target.id);
            return <g key={target.id}><circle cx={chart.x(target.positionUm)} cy={chart.y(target.positionUm)} r={Math.max(2,target.radiusUm*chart.scale)} fill={candidate?'#608a75':'none'} fillOpacity=".2" stroke={candidate?'#608a75':encountered?'#b36d28':'currentColor'} strokeOpacity={candidate||encountered?1:.35} strokeWidth={candidate?2:1}>
              <title>{target.id}: {candidate?'matured candidate, electrically unvalidated':encountered?'geometric encounter recorded':'not encountered at this day'}</title></circle>
              <text x={chart.x(target.positionUm)+target.radiusUm*chart.scale+7} y={chart.y(target.positionUm)+4}>{target.id.replace('host-','T')}</text></g>;
          })}
          {view.paths.map(path=><g key={path.id}>
            <path d={path.points.map((p,i)=>`${i?'L':'M'}${chart.x(p.positionUm).toFixed(2)},${chart.y(p.positionUm).toFixed(2)}`).join(' ')} stroke={colorFor(path)} strokeWidth={path.parentId?1.2:1.9} fill="none" opacity={path.parentId ? .72 : 1}/>
            <circle cx={chart.x(path.points[0].positionUm)} cy={chart.y(path.points[0].positionUm)} r={path.parentId?1.6:4} fill={colorFor(path)}/>
            <circle cx={chart.x(path.points.at(-1).positionUm)} cy={chart.y(path.points.at(-1).positionUm)} r="2.6" fill={colorFor(path)}><title>{path.id}: {fmt(path.lengthAtDayUm,1)} µm traveled by day {fmt(day,2)}</title></circle>
          </g>)}
          {view.encounters.map(event=><circle key={event.id} cx={chart.x(event.positionUm)} cy={chart.y(event.positionUm)} r="4" fill="none" stroke="#b36d28" strokeWidth="1.5"><title>Encounter: {event.targetId}, day {fmt(event.day,3)}</title></circle>)}
          {view.candidates.map(candidate=><rect key={candidate.id} x={chart.x(candidate.positionUm)-3} y={chart.y(candidate.positionUm)-3} width="6" height="6" fill="#608a75"><title>Candidate only: {candidate.targetId}, day {fmt(candidate.day,3)}. Not electrically validated.</title></rect>)}
          <text x={chart.left} y="238">SCAFFOLD ENTRY</text><text x={chart.left+result.lengthUm*chart.scale} y="238" textAnchor="end">OUTLET · {fmt(result.lengthUm,0)} µm</text>
          <line x1="20" x2={20+chart.scaleBar*chart.scale} y1="261" y2="261" stroke="currentColor" strokeWidth="2"/>
          <line x1="20" x2="20" y1="257" y2="265" stroke="currentColor"/><line x1={20+chart.scaleBar*chart.scale} x2={20+chart.scaleBar*chart.scale} y1="257" y2="265" stroke="currentColor"/>
          <text x={28+chart.scaleBar*chart.scale} y="265">{chart.scaleBar} µm</text>
        </svg>
        <label class="bh-growth-time"><span>Growth day</span><input type="range" aria-label="Growth day; separate from electrical milliseconds" min="0" max={end||.01} step="0.01" value={day} disabled={!end} onInput={e=>scrub(Number(e.currentTarget.value))}/><output>{fmt(day,2)} / {fmt(end,2)} d</output></label>
        <div class="bh-chart-legend"><span><i style={{background:TRACE_COLORS[0]}}/>Calculated neurite path</span><span><i style={{background:'#b36d28'}}/>Circle: encounter</span><span><i style={{background:'#608a75'}}/>Square: matured candidate</span></div>
        <p aria-live="polite">At day <strong>{fmt(day,2)}</strong>: {view.paths.length} trajectories, <strong>{fmt(view.lengthUm,1)} µm</strong> total traveled length, {view.encounters.length} encounters, and <strong>{view.candidates.length} candidate connections</strong> across {view.targetIds.size} target regions. All values describe the selected day.</p>
        {view.candidates.length===0&&<p class="bh-note">No matured candidate connections at this day. Encounters can fail the formation trial or still await maturation. Applying this state sets zero target connections in the pending electrical experiment.</p>}
        {result.metrics.truncated&&<p class="bh-error" role="status">The vertex limit stopped this calculation at day {fmt(end,2)} of {fmt(result.settings.days,2)} requested. This is a truncated growth run.</p>}
        {day>=end-1e-12&&result.metrics.blockedBranches>0&&<p class="bh-note">This run reached the path cap; additional branches were suppressed. The displayed trajectories use the bounded calculation.</p>}
        <div class="bh-run-actions"><button type="button" class="bh-primary" onClick={apply} disabled={dirty||typeof onApply!=='function'}>Use {view.targetIds.size} candidate target{view.targetIds.size===1?'':'s'} in electrical settings</button><button type="button" onClick={()=>downloadGrowth(result,day)}>Export calculated growth JSON</button></div>
        <p class="bh-note">This explicit transfer changes the number of pending host targets. It does not replace the electrical cable geometry, prove synapse function, or run electrophysiology automatically.</p>
        {applied&&<p class="bh-note" role="status">{applied.count} target connection{applied.count===1?'':'s'} from growth day {fmt(applied.day,2)} copied to pending electrical settings. Calculate the electrical experiment to test recruitment.</p>}
        <details><summary class="bh-label">Encounter records through day {fmt(day,2)} ({view.encounters.length})</summary>
          {view.encounters.length===0?<p>No target encounters have occurred by the selected day.</p>:<div class="bh-table-scroll"><table><thead><tr><th>Target</th><th>Encounter day</th><th>Trajectory</th><th>State at selected day</th></tr></thead><tbody>{view.encounters.slice(-20).map(event=><tr key={event.id}><td>{event.targetId}</td><td>{fmt(event.day,3)} d</td><td>{event.pathId}</td><td>{!event.formationAccepted?'Formation trial not accepted':event.candidateDay>day+1e-12?'Pending maturation':'Candidate; function unvalidated'}</td></tr>)}</tbody></table>{view.encounters.length>20&&<p class="bh-note">Showing the latest 20 records through this day; the JSON export contains the complete calculated run.</p>}</div>}
        </details>
      </div>
    </div>
  </section>;
}
