import { useState } from 'preact/hooks';
import { mechanisms, inspectMechanism, stepGates } from '../lib/cortex/membrane-explorer.js';
const colors=['var(--bio-accent)','var(--bio-warm)'];
const fmt=x=>Number.isFinite(x)?x.toPrecision(5):'';
function Plot({series,minX,maxX,maxY=1,xLabel,yLabel}) {
 const W=600,H=230,L=62,R=18,T=22,B=42;
 const X=x=>L+(x-minX)/(maxX-minX)*(W-L-R),Y=y=>H-B-y/maxY*(H-T-B);
 return <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label={`${yLabel} versus ${xLabel}`} style="width:100%;display:block">
 {[0,.5,1].map(t=><g key={t}><path d={`M${L},${Y(t*maxY)}H${W-R}`} stroke="currentColor" opacity=".14"/><text x={L-8} y={Y(t*maxY)+4} text-anchor="end">{fmt(t*maxY)}</text></g>)}
 {[minX,(minX+maxX)/2,maxX].map(t=><text key={t} x={X(t)} y={H-B+20} text-anchor="middle">{t}</text>)}
 <text x={L} y="13">{yLabel}</text><text x={(W+L-R)/2} y={H-3} text-anchor="middle">{xLabel}</text>
 {series.map((s,j)=><path key={j} d={s.points.map(([x,y],i)=>`${i?'L':'M'}${X(x).toFixed(2)},${Y(y).toFixed(2)}`).join(' ')} style={{stroke:colors[j%2]}} stroke-width="2.2" fill="none"/>)}
 </svg>;
}
export default function MembraneExplorer(){
 const [index,setIndex]=useState(3),[voltage,setVoltage]=useState(-40),[hold,setHold]=useState(-80),[ca,setCa]=useState(.0001),[duration,setDuration]=useState(100);
 const current=inspectMechanism(index,voltage,ca), grid=Array.from({length:181},(_,i)=>i-120), values=grid.map(v=>inspectMechanism(index,v,ca));
 const names=current.gates.map(g=>g.name);
 const steady=index===0?[{name:'O∞',points:grid.map((v,i)=>[v,values[i].open])}]:names.map((name,j)=>({name,points:grid.map((v,i)=>[v,values[i].gates[j].inf])}));
 const tau=names.map((name,j)=>({name,points:grid.map((v,i)=>[v,values[i].gates[j].tau])}));
 const trace=names.map((name,j)=>({name,points:Array.from({length:201},(_,i)=>{const t=i*duration/200;return [t,stepGates(index,hold,voltage,ca,t)[j].value];})}));
 const control=(label,value,set,min,max,step,unit)=><label>{label}<output>{value} {unit}</output><input type="range" aria-label={label} min={min} max={max} step={step} value={value} onInput={e=>set(Number(e.currentTarget.value))}/></label>;
 return <div class="membrane-explorer">
 <style>{`.membrane-explorer{--bio-accent:#247b84;--bio-warm:#af6636;font-variant-numeric:tabular-nums}html[data-theme=dark] .membrane-explorer{--bio-accent:#8dcdd2;--bio-warm:#efb67e}.membrane-explorer .controls,.membrane-explorer .plots{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:16px}.membrane-explorer .controls{grid-template-columns:repeat(auto-fit,minmax(170px,1fr));padding:20px;border:1px solid var(--border);border-radius:0;background:var(--panel)}.membrane-explorer label{display:grid;gap:10px;font-size:.9rem}.membrane-explorer output{opacity:.7}.membrane-explorer input,.membrane-explorer select{width:100%;accent-color:var(--bio-accent)}.membrane-explorer select{background:var(--bg);color:var(--text);padding:8px;border:1px solid var(--border);border-radius:0}.membrane-explorer .plot{border:1px solid var(--border);border-radius:0;padding:16px;margin-top:16px;background:var(--panel);min-width:0}.membrane-explorer h2{font-family:var(--font-heading);font-size:28px;font-weight:400;margin:0 0 12px}.membrane-explorer svg text{font:13px var(--font-body);fill:var(--text);opacity:.7}.membrane-explorer .legend{display:flex;gap:18px;font-size:.9rem}.membrane-explorer table{width:100%;border-collapse:collapse;font-size:14px}.membrane-explorer td,.membrane-explorer th{padding:9px 12px;text-align:left;border-bottom:1px solid var(--border)}.membrane-explorer th{font-weight:400;font-style:italic;background:var(--panelStrong)}.membrane-explorer code{display:block;padding:12px;overflow:auto}.membrane-explorer .metrics{overflow:auto}.membrane-explorer .note{opacity:.7;font-size:.85rem;margin-top:8px}@media(max-width:700px){.membrane-explorer .plots{grid-template-columns:1fr}}`}</style>
 <div class="controls">
 <label>Mechanism<select aria-label="Mechanism" value={index} onChange={e=>setIndex(Number(e.currentTarget.value))}>{mechanisms.map((m,i)=><option value={i}>{m}</option>)}</select><output>34 °C · pinned model kinetics</output></label>
 {control('Clamp voltage',voltage,setVoltage,-120,60,1,'mV')}{control('Holding voltage',hold,setHold,-120,60,1,'mV')}
 <label>Intracellular calcium<output>{ca} mM</output><input aria-label="Intracellular calcium" type="range" min="-7" max="-2" step=".1" value={Math.log10(ca)} onInput={e=>setCa(10**Number(e.currentTarget.value))}/></label>
 {control('Step duration',duration,setDuration,10,1000,10,'ms')}
 </div>
 <div class="plots"><section class="plot"><h2>{index===0?'NaV stationary open probability':'Steady-state gates'}</h2><Plot series={steady} minX={-120} maxX={60} xLabel="Voltage (mV)" yLabel="Probability"/><div class="legend">{steady.map((s,j)=><span style={{color:colors[j%2]}}>{s.name}</span>)}</div></section>
 <section class="plot"><h2>Time constants</h2>{index===0?<code>NaV: 12-state Markov system<br/>τ: no single gate time constant</code>:<><Plot series={tau} minX={-120} maxX={60} maxY={Math.max(...tau.flatMap(s=>s.points.map(p=>p[1])))} xLabel="Voltage (mV)" yLabel="τ (ms)"/><div class="legend">{names.map((n,j)=><span style={{color:colors[j%2]}}>{n}</span>)}</div></>}</section>
 <section class="plot"><h2>Ideal voltage-step gate response</h2>{index===0?<code>NaV transient: not included<br/>Stationary distribution only</code>:<><Plot series={trace} minX={0} maxX={duration} xLabel="Time after step (ms)" yLabel="Gate value"/><div class="legend">{names.map((n,j)=><span style={{color:colors[j%2]}}>{n}</span>)}</div></>}</section>
 <section class="plot metrics"><h2>At clamp voltage · {voltage} mV</h2><table><thead><tr><th>Gate</th><th>x∞</th><th>τ (ms)</th></tr></thead><tbody>{current.gates.map(g=><tr><th>{g.name}</th><td>{fmt(g.inf)}</td><td>{fmt(g.tau)}</td></tr>)}<tr><th>Open fraction</th><td>{fmt(current.open)}</td><td></td></tr></tbody></table><code>{index===0?'Q(V) p∞ = 0; Σp∞ = 1':'dx/dt = (x∞(V) − x) / τ(V)'}<br/>{index===0?'Popen = pO':'x(t) = x∞ + (xhold − x∞) exp(−t/τ)'}</code></section></div>
 </div>;
}
