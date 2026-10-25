import { statistics } from '../../lib/recordings/signal.js';
export default function ChannelMap({ segment, selected, onSelect, bounds }) {
  const positions=segment.channels.every(c=>c.position)&&segment.channels.every(c=>c.position.unit===segment.channels[0].position.unit);
  const channels=segment.channels;
  const rms=channels.map(c=>statistics(c.samples,...bounds).rms||0), max=Math.max(...rms,1e-12);
  if(positions){
    const xs=channels.map(c=>c.position.x),ys=channels.map(c=>c.position.y),minX=Math.min(...xs),maxX=Math.max(...xs),minY=Math.min(...ys),maxY=Math.max(...ys);
    return <div class="rd-channel-map"><p class="rd-small">{segment.mappingLabel||'Source contact coordinates'} · {channels[0].position.unit}</p>
      <svg viewBox="0 0 260 300" role="group" aria-label="Recorded contact positions; select a channel">
        {channels.map((c,i)=>{const x=35+(xs[i]-minX)/(maxX-minX||1)*190,y=255-(ys[i]-minY)/(maxY-minY||1)*210;return <g key={c.id} role="button" tabIndex="0" aria-label={`${c.label}, x ${xs[i]}, y ${ys[i]} ${c.position.unit}`} aria-pressed={selected===i} onClick={()=>onSelect(i)} onKeyDown={e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();onSelect(i);}}}>
          <circle cx={x} cy={y} r={selected===i?10:7} fill={selected===i?'#e5c78d':'#84b6ad'} opacity={selected===i?1:.3+.7*rms[i]/max} stroke="currentColor" stroke-width={selected===i?2:1}/><title>{c.label}: ({xs[i]}, {ys[i]})</title>
        </g>;})}<text x="8" y="19">y {maxY}</text><text x="8" y="282">y {minY}</text><text x="65" y="298">x {minX} to {maxX}</text>
      </svg><p class="rd-small">Brightness: RMS within this excerpt window. Coordinates describe the recorded contacts.</p></div>;
  }
  return <div class="rd-channel-list"><p class="rd-small">Recording channels · no physical map assigned</p><div class="rd-channel-buttons">{channels.map((c,i)=><button key={c.id} class={selected===i?'active':''} aria-pressed={selected===i} title={c.label} onClick={()=>onSelect(i)}>{c.label}</button>)}</div><p class="rd-small">Select a channel to inspect its measured values. Button order follows the excerpt.</p></div>;
}
