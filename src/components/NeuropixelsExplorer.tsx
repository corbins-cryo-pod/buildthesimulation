import { useEffect, useRef, useState } from 'preact/hooks';

type Unit = { id: number; depth: number; x: number; ch: number; region: string; rate: number; spikes: number[]; psthLeft: number[]; psthRight: number[] };
type Ev = { trial: number; stim: number; side: 'left' | 'right'; contrast: number; choice: number; move: number | null; feedback: number; correct: boolean };
type Region = { acronym: string; name: string; minDepth: number; maxDepth: number; channels: number };
type Data = { subject: string; lab: string; date: string; eid: string; windowMs: number; sessionGoodUnits: number; sessionUnitsTotal: number; sessionSpikes: number; sessionTrials: number;
  psth: { binMs: number; preMs: number; postMs: number; trialsLeft: number; trialsRight: number }; events: Ev[]; regions: Region[]; units: Unit[] };
const DATA_URL = '/data/neuropixels/excerpt.json';
const MAX_DEPTH = 3840;
const SOURCE = 'https://openalyx.internationalbrainlab.org/sessions/ebce500b-c530-47de-8cb1-963c552703ea';
const RT = 40, RH = 300, PT = 376, PH = 80, CH = 500;

export default function NeuropixelsExplorer() {
  const [data, setData] = useState<Data | null>(null);
  const [error, setError] = useState(false);
  const [unitIndex, setUnitIndex] = useState(0);
  const [start, setStart] = useState(0);
  const [windowSeconds, setWindowSeconds] = useState(10);
  const [playing, setPlaying] = useState(false);
  const canvas = useRef<HTMLCanvasElement>(null);
  const windowMs = windowSeconds * 1000;
  const total = data?.windowMs ?? windowMs;
  const maxStart = Math.max(0, total - windowMs);
  const unit = data?.units[unitIndex];

  useEffect(() => {
    const controller = new AbortController();
    fetch(DATA_URL, { signal: controller.signal }).then(r => { if (!r.ok) throw new Error('load'); return r.json(); }).then(d => {
      if (!d.units?.length || !d.psth || !d.events) throw new Error('format');
      setData(d);
      // start on a unit with a clear visual response so the PSTH is informative
      let best = 0, bestGain = -1;
      d.units.forEach((u: Unit, i: number) => { const g = Math.max(...u.psthLeft, ...u.psthRight) - u.rate; if (g > bestGain) { bestGain = g; best = i; } });
      setUnitIndex(best);
    }).catch(e => { if (e.name !== 'AbortError') setError(true); });
    return () => controller.abort();
  }, []);

  useEffect(() => {
    if (!playing) return;
    const id = window.setInterval(() => setStart(s => {
      const next = Math.min(s + 60, maxStart);
      if (next === maxStart) setPlaying(false);
      return next;
    }), 50);
    return () => clearInterval(id);
  }, [playing, maxStart]);

  useEffect(() => {
    const el = canvas.current;
    if (!el || !data || !unit) return;
    function draw() {
      if (!el || !data || !unit) return;
      const width = el.getBoundingClientRect().width;
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      el.width = Math.round(width * dpr); el.height = CH * dpr;
      const ctx = el.getContext('2d'); if (!ctx) return;
      ctx.scale(dpr, dpr);
      ctx.fillStyle = '#101925'; ctx.fillRect(0, 0, width, CH);
      const narrow = width < 520, LEFT = narrow ? 68 : 104, right = width - 14, plotWidth = right - LEFT, rw = narrow ? 28 : 52;
      const yOf = (depth: number) => RT + RH * (1 - depth / MAX_DEPTH);
      ctx.font = '11px system-ui'; ctx.textAlign = 'left'; ctx.fillStyle = '#b3c4d8';
      ctx.fillText(narrow ? `Spike raster · ${data.units.length} units by depth` : `Spike raster · ${data.units.length} good units placed by depth along the probe`, 8, 19);
      // anatomy ribbon
      data.regions.forEach((r, i) => {
        if (r.acronym === 'root') return;
        const y0 = yOf(r.maxDepth + 10), y1 = yOf(r.minDepth - 10);
        ctx.fillStyle = i % 2 ? '#1b2b40' : '#16243a'; ctx.fillRect(LEFT - rw - 4, y0, rw, Math.max(1, y1 - y0));
        if (y1 - y0 > 11) { ctx.fillStyle = '#b3c4d8'; ctx.font = '9px system-ui'; const lim = narrow ? 5 : 8; ctx.fillText(r.acronym.length > lim ? r.acronym.slice(0, lim) : r.acronym, LEFT - rw - 3, (y0 + y1) / 2 + 3); ctx.font = '11px system-ui'; }
      });
      // depth axis
      ctx.strokeStyle = '#304057'; ctx.lineWidth = 1; ctx.fillStyle = '#b3c4d8'; ctx.textAlign = 'right';
      for (let d = 0; d <= MAX_DEPTH; d += 960) {
        const y = yOf(d); ctx.beginPath(); ctx.moveTo(LEFT, y); ctx.lineTo(right, y); ctx.stroke();
        ctx.fillText(String(d), LEFT - rw - 7, y + 4);
      }
      ctx.textAlign = 'left'; ctx.fillText('µm from tip', 2, RT - 6);
      // selected unit band
      const sy = yOf(unit.depth);
      ctx.fillStyle = '#20344d'; ctx.fillRect(LEFT, sy - 3, plotWidth, 6);
      // spikes
      const t1 = start + windowMs;
      for (const u of data.units) {
        const y = yOf(u.depth), sel = u === unit;
        ctx.fillStyle = sel ? '#e7bb72' : 'rgba(110,218,230,.75)';
        for (const t of u.spikes) {
          if (t < start) continue; if (t >= t1) break;
          ctx.fillRect(LEFT + (t - start) / windowMs * plotWidth, y - (sel ? 2.5 : 1), Math.max(.9, plotWidth / windowMs), sel ? 5 : 2);
        }
      }
      // trial events
      ctx.font = '11px system-ui';
      for (const e of data.events) {
        const x = LEFT + (e.stim * 1000 - start) / windowMs * plotWidth;
        if (x >= LEFT && x <= right) {
          ctx.strokeStyle = e.side === 'left' ? '#e7bb72' : '#c9a3f5'; ctx.setLineDash([4, 4]);
          ctx.beginPath(); ctx.moveTo(x, RT); ctx.lineTo(x, RT + RH); ctx.stroke(); ctx.setLineDash([]);
          ctx.fillStyle = e.side === 'left' ? '#e7bb72' : '#c9a3f5'; ctx.textAlign = 'left';
          ctx.fillText(`${e.side === 'left' ? 'L' : 'R'} ${Math.round(e.contrast * 100)}%`, Math.min(x + 4, right - 40), RT + 12);
        }
        const fx = LEFT + (e.feedback * 1000 - start) / windowMs * plotWidth;
        if (fx >= LEFT && fx <= right) {
          ctx.strokeStyle = e.correct ? '#7be0a0' : '#ff8a8a'; ctx.lineWidth = 2;
          ctx.beginPath(); ctx.moveTo(fx, RT + RH - 14); ctx.lineTo(fx, RT + RH); ctx.stroke(); ctx.lineWidth = 1;
        }
      }
      // time axis
      ctx.fillStyle = '#b3c4d8';
      const ticks = narrow ? 4 : 5;
      for (let i = 0; i <= ticks; i++) {
        const x = LEFT + i / ticks * plotWidth; ctx.textAlign = i === ticks ? 'right' : 'left';
        ctx.fillText(`${((start + i / ticks * windowMs) / 1000).toFixed(1)}s`, x, RT + RH + 14);
      }
      ctx.textAlign = 'left';
      // PSTH
      const p = data.psth, nb = unit.psthLeft.length;
      ctx.fillStyle = '#b3c4d8';
      ctx.fillText(narrow ? `Unit ${unit.id} · ${Math.round(unit.depth)} µm · ${unit.region} · rate` : `Unit ${unit.id} · ${Math.round(unit.depth)} µm · channel ${unit.ch} · ${unit.region} · stimulus-aligned rate (${p.binMs} ms bins)`, 8, PT - 6);
      const peak = Math.max(10, ...unit.psthLeft, ...unit.psthRight), ceil = Math.ceil(peak / 10) * 10;
      ctx.textAlign = 'right'; ctx.fillText(String(ceil), LEFT - 8, PT + 10); ctx.fillText('0', LEFT - 8, PT + PH); ctx.fillText('s⁻¹', LEFT - 8, PT + 30); ctx.textAlign = 'left';
      const zeroX = LEFT + p.preMs / (p.preMs + p.postMs) * plotWidth;
      ctx.strokeStyle = '#304057'; ctx.beginPath(); ctx.moveTo(LEFT, PT + PH); ctx.lineTo(right, PT + PH); ctx.stroke();
      ctx.strokeStyle = '#e7bb72'; ctx.setLineDash([4, 4]); ctx.beginPath(); ctx.moveTo(zeroX, PT); ctx.lineTo(zeroX, PT + PH); ctx.stroke(); ctx.setLineDash([]);
      const line = (arr: number[], color: string) => {
        ctx.strokeStyle = color; ctx.lineWidth = 1.6; ctx.beginPath();
        arr.forEach((v, i) => { const x = LEFT + (i + .5) / nb * plotWidth, y = PT + PH * (1 - v / ceil); if (!i) ctx.moveTo(x, y); else ctx.lineTo(x, y); });
        ctx.stroke(); ctx.lineWidth = 1;
      };
      line(unit.psthLeft, '#e7bb72'); line(unit.psthRight, '#c9a3f5');
      ctx.fillStyle = '#b3c4d8'; ctx.textAlign = 'left'; ctx.fillText(`-${p.preMs}`, LEFT, PT + PH + 14);
      ctx.textAlign = 'center'; ctx.fillText(narrow ? 'on' : 'stimulus on', zeroX, PT + PH + 14);
      ctx.textAlign = 'right'; ctx.fillText(`+${p.postMs} ms`, right, PT + PH + 14);
      ctx.textAlign = 'left';
      ctx.fillStyle = '#e7bb72'; ctx.fillText(narrow ? `left (${p.trialsLeft})` : `stimulus left (${p.trialsLeft} trials)`, LEFT, CH - 8);
      ctx.fillStyle = '#c9a3f5'; ctx.fillText(narrow ? `right (${p.trialsRight}) · by stimulus side` : `stimulus right (${p.trialsRight} trials)`, LEFT + (narrow ? 90 : 170), CH - 8);
    }
    draw(); const observer = new ResizeObserver(draw); observer.observe(el);
    return () => observer.disconnect();
  }, [data, unit, start, windowMs]);

  return <section id="neuropixels-recordings" class="np-recordings" aria-labelledby="np-title">
    <span class="np-kicker">REAL MOUSE DATA · INTERNATIONAL BRAIN LABORATORY</span>
    <h3 id="np-title">What a Neuropixels probe records</h3>
    <p class="np-intro">One Neuropixels 1.0 probe, spike-sorted, from a mouse performing the IBL visual decision task. Each row is a sorted unit, placed at the depth it was detected along the 3.84 mm of recording sites. These are measured recordings, not simulated signals.</p>
    {error ? <p role="alert">The recording couldn't load. Reload the page or <a href={SOURCE}>open the source session</a>.</p> : !data || !unit ? <p role="status">Loading the recording excerpt...</p> : <>
      <div class="np-controls">
        <label>Unit<select value={unitIndex} onChange={e => setUnitIndex(Number(e.currentTarget.value))}>
          {data.units.map((u, i) => <option value={i} key={u.id}>{Math.round(u.depth)} µm · {u.region} · unit {u.id}</option>)}
        </select></label>
        <label>Window<select value={windowSeconds} onChange={e => { setPlaying(false); const s = Number(e.currentTarget.value); setWindowSeconds(s); setStart(Math.min(start, Math.max(0, data.windowMs - s * 1000))); }}><option value={5}>5 seconds</option><option value={10}>10 seconds</option><option value={20}>20 seconds</option></select></label>
      </div>
      <canvas ref={canvas} class="np-canvas" role="img" aria-label={`Spike raster for ${data.units.length} units by depth from ${(start / 1000).toFixed(1)} seconds, and stimulus-aligned firing rate for unit ${unit.id} at ${Math.round(unit.depth)} micrometres in ${unit.region}. Use the unit selector or tap the raster to change unit.`} onPointerDown={e => {
        const rect = e.currentTarget.getBoundingClientRect(), y = e.clientY - rect.top;
        if (y < RT || y > RT + RH) return;
        const depth = (1 - (y - RT) / RH) * MAX_DEPTH;
        let best = 0, dist = Infinity; data.units.forEach((u, i) => { const d = Math.abs(u.depth - depth); if (d < dist) { dist = d; best = i; } });
        setUnitIndex(best);
      }} />
      <div class="np-transport"><button onClick={() => { if (!playing && start >= maxStart) setStart(0); setPlaying(!playing); }} aria-pressed={playing}>{playing ? 'Pause' : 'Play'}</button><button onClick={() => { setPlaying(false); setStart(0); }}>Reset</button><output aria-live="off">{(start / 1000).toFixed(1)}-{((start + windowMs) / 1000).toFixed(1)} s</output></div>
      <label class="np-scrub">Scrub recording<input type="range" min={0} max={maxStart} step={20} value={start} onInput={e => { setPlaying(false); setStart(Number(e.currentTarget.value)); }} aria-valuetext={`${(start / 1000).toFixed(1)} seconds from excerpt start`} /></label>
      <p class="np-meta">Mouse {data.subject} · {data.lab} · {data.date} · {data.sessionGoodUnits} good units of {data.sessionUnitsTotal} sorted · {(data.sessionSpikes / 1e6).toFixed(0)} million spikes in the full session · mean rate of the selected unit {unit.rate} s⁻¹</p>
      <p class="np-note">Cyan ticks are individual spike times (rounded to 1 ms); the selected unit is gold. Dashed vertical lines mark stimulus onset with its side and contrast; short green or red marks at the bottom are correct or incorrect feedback. The bottom plot averages the selected unit over every trial in the session, split by which side the stimulus appeared on, so it shows what the unit does when the stimulus appears. Tap a raster row or use the selector to inspect another unit. Left-hand labels are Allen atlas regions along the probe track.</p>
      <a class="np-download" href={DATA_URL} download="ibl-neuropixels-excerpt.json">Download this excerpt (JSON)</a>
    </>}
    <details class="np-sources"><summary>Source, license &amp; limitations</summary>
      <p>International Brain Laboratory et al. (2023). <a href="https://doi.org/10.1101/2023.07.04.547681">A brain-wide map of neural activity during complex behaviour</a>. Public data via <a href="https://openalyx.internationalbrainlab.org">OpenAlyx</a>, released under CC BY 4.0. <a href={SOURCE}>Session ebce500b-c530-47de-8cb1-963c552703ea</a>, probe00, pykilosort spike sorting, mouse MFD_09, recorded October 19, 2023 at the Churchland lab.</p>
      <p>Only units labeled good by the IBL quality criteria are shown. The raster is a 20-second excerpt (trials 151-155); the stimulus-aligned averages use every trial in the session. Spike depths are the sorter's estimates, not exact anatomical positions, and region labels come from histology-aligned channel locations. Sorted units are an estimate of single neurons.</p>
      <p>This is a mouse recording, not a human implant, and the viewer does not run a decoder. Neuropixels probes are acute research tools; the 3D model above is the probe's physical geometry, and unit depth here is not mapped contact by contact onto it.</p>
    </details>
    <noscript>Enable JavaScript to explore the recording. The source and license links above remain available.</noscript>
    <style>{`
      .np-recordings{margin:24px 0;padding:20px;border:1px solid var(--border);border-radius:16px;background:var(--panelStrong);overflow:hidden}
      .np-kicker{font-size:11px;letter-spacing:.14em;opacity:.75}.np-recordings h3{font-size:1.45rem;margin:8px 0}.np-intro{line-height:1.65;font-size:14px;opacity:.85}
      .np-controls{display:flex;flex-wrap:wrap;gap:12px;margin:18px 0}.np-controls label{display:flex;flex-direction:column;gap:6px;font-size:12px;flex:1;min-width:140px}
      .np-controls select,.np-transport button{font:inherit;color:inherit;background:var(--panel);border:1px solid var(--border);padding:10px;border-radius:9px;min-height:44px}.np-controls option{background:#101925;color:#edf3fb}.np-transport button{cursor:pointer}
      .np-canvas{display:block;width:100%;height:500px;border-radius:10px;background:#101925;cursor:crosshair}.np-transport{display:flex;gap:8px;align-items:center;margin:12px 0;flex-wrap:wrap}.np-transport output{font-size:13px;margin-left:auto;font-variant-numeric:tabular-nums}
      .np-scrub{display:block;font-size:12px}.np-scrub input{display:block;width:100%;min-height:44px;accent-color:#6edae6}.np-meta{font-size:12px;opacity:.75;line-height:1.6}.np-note,.np-sources{font-size:13px;line-height:1.65}.np-note{opacity:.85}.np-sources{margin-top:20px}.np-sources summary{cursor:pointer}.np-recordings a{color:inherit;text-decoration:underline}.np-download{font-size:13px}
      .np-recordings button:focus-visible,.np-recordings select:focus-visible,.np-recordings input:focus-visible,.np-recordings summary:focus-visible,.np-recordings a:focus-visible{outline:2px solid #6edae6;outline-offset:3px}
      @media(max-width:600px){.np-recordings{padding:12px}.np-controls{gap:8px}.np-transport output{font-size:12px}}
    `}</style>
  </section>;
}
