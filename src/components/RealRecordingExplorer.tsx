import { useEffect, useRef, useState } from 'preact/hooks';

type Trial = { trial: number; prompt: string; condition: string; bins: number; goCueBin: number; counts: string; block: number; sourceStartBin: number };
type Data = { session: string; participant: string; channels: number; binMs: number; trials: Trial[] };
const DATA_URL = '/data/handwriting/excerpts.json';

export default function RealRecordingExplorer() {
  const [data, setData] = useState<Data | null>(null);
  const [error, setError] = useState(false);
  const [trialIndex, setTrialIndex] = useState(0);
  const [array, setArray] = useState(0);
  const [channel, setChannel] = useState(0);
  const [start, setStart] = useState(0);
  const [windowSeconds, setWindowSeconds] = useState(5);
  const [playing, setPlaying] = useState(false);
  const canvas = useRef<HTMLCanvasElement>(null);
  const counts = useRef<Uint8Array>(new Uint8Array());
  const trial = data?.trials[trialIndex];
  const windowBins = windowSeconds * 100;
  const maxStart = Math.max(0, (trial?.bins ?? windowBins) - windowBins);
  const chosen = array * 96 + channel;
  const stop = () => setPlaying(false);

  useEffect(() => {
    const controller = new AbortController();
    fetch(DATA_URL, { signal: controller.signal }).then(r => {
      if (!r.ok) throw new Error('load'); return r.json();
    }).then(d => {
      if (d.channels !== 192 || d.binMs !== 10 || !d.trials?.length) throw new Error('format');
      setData(d);
    }).catch(e => { if (e.name !== 'AbortError') setError(true); });
    return () => controller.abort();
  }, []);

  useEffect(() => {
    if (!trial) return;
    const packed = Uint8Array.from(atob(trial.counts), c => c.charCodeAt(0));
    counts.current = new Uint8Array(packed.length * 2);
    packed.forEach((byte, i) => { counts.current[i * 2] = byte & 15; counts.current[i * 2 + 1] = byte >> 4; });
    setStart(0); setPlaying(false);
  }, [trial]);

  useEffect(() => {
    if (!playing) return;
    const id = window.setInterval(() => setStart(s => {
      const next = Math.min(s + 5, maxStart);
      if (next === maxStart) setPlaying(false);
      return next;
    }), 50);
    return () => clearInterval(id);
  }, [playing, maxStart]);

  useEffect(() => {
    const el = canvas.current;
    if (!el || !trial || !data) return;
    function draw() {
      if (!el || !trial || !data) return;
      const width = el.getBoundingClientRect().width, height = 440;
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      el.width = Math.round(width * dpr); el.height = height * dpr;
      const ctx = el.getContext('2d'); if (!ctx) return;
      ctx.scale(dpr, dpr);
      ctx.fillStyle = '#101925'; ctx.fillRect(0, 0, width, height);
      const left = 44, right = width - 14, plotWidth = right - left;
      const top = 35, rasterHeight = 240, traceTop = 321, traceHeight = 78;
      ctx.font = '11px system-ui'; ctx.fillStyle = '#b3c4d8';
      ctx.fillText(`Array ${array + 1} · channels ${array * 96 + 1}-${array * 96 + 96}`, left, 19);
      ctx.fillText('Count raster · 10 ms bins', left, 295);
      ctx.fillText(`Channel ${chosen + 1} · 100 ms mean rate`, left, 315);
      ctx.fillStyle = '#20344d'; ctx.fillRect(left, top + channel * rasterHeight / 96, plotWidth, rasterHeight / 96);
      for (let row = 0; row < 96; row++) {
        for (let b = start; b < Math.min(start + windowBins, trial.bins); b++) {
          const value = counts.current[b * 192 + array * 96 + row];
          if (!value) continue;
          ctx.fillStyle = `rgba(110,218,230,${Math.min(.25 + value * .18, 1)})`;
          ctx.fillRect(left + (b - start) / windowBins * plotWidth, top + row * rasterHeight / 96, Math.max(.8, plotWidth / windowBins), 1.8);
        }
      }
      ctx.strokeStyle = '#304057'; ctx.lineWidth = 1;
      for (let i = 0; i <= 5; i++) {
        const x = left + i / 5 * plotWidth;
        ctx.beginPath(); ctx.moveTo(x, top); ctx.lineTo(x, top + rasterHeight); ctx.stroke();
        ctx.fillStyle = '#b3c4d8'; ctx.textAlign = i === 5 ? 'right' : 'left';
        ctx.fillText(`${((start + i / 5 * windowBins) / 100).toFixed(1)}s`, x, 427);
      }
      ctx.textAlign = 'left';
      const rates: number[] = [];
      for (let b = start; b < start + windowBins; b++) {
        let sum = 0;
        const lo = Math.max(0, b - 5), hi = Math.min(trial.bins, b + 5);
        for (let j = lo; j < hi; j++) sum += counts.current[j * 192 + chosen] || 0;
        rates.push(sum / (hi - lo) * 100);
      }
      const ceiling = Math.max(100, Math.ceil(Math.max(...rates) / 100) * 100);
      ctx.fillStyle = '#b3c4d8'; ctx.fillText(String(ceiling), 2, traceTop + 8); ctx.fillText('0', 25, traceTop + traceHeight);
      ctx.strokeStyle = '#e7bb72'; ctx.lineWidth = 1.5; ctx.beginPath();
      rates.forEach((rate, i) => {
        const x = left + i / windowBins * plotWidth, y = traceTop + traceHeight * (1 - rate / ceiling);
        if (!i) ctx.moveTo(x, y); else ctx.lineTo(x, y);
      }); ctx.stroke();
      ctx.fillStyle = '#b3c4d8'; ctx.fillText('s⁻¹', 6, traceTop + 28);
      ctx.fillText(String(array * 96 + 1), 8, top + 9); ctx.fillText(String(array * 96 + 96), 8, top + rasterHeight);
      const cueX = left + (trial.goCueBin - start) / windowBins * plotWidth;
      if (cueX >= left && cueX <= right) {
        ctx.strokeStyle = '#e7bb72'; ctx.setLineDash([4, 4]); ctx.beginPath(); ctx.moveTo(cueX, top); ctx.lineTo(cueX, top + rasterHeight); ctx.stroke(); ctx.setLineDash([]);
        ctx.fillStyle = '#e7bb72'; ctx.fillText('Go', Math.min(cueX + 4, right - 18), top + 13);
      }
    }
    draw(); const observer = new ResizeObserver(draw); observer.observe(el);
    return () => observer.disconnect();
  }, [data, trial, array, channel, chosen, start, windowBins]);

  return <section id="real-recordings" class="real-recordings" aria-labelledby="recordings-title">
    <span class="recordings-kicker">REAL HUMAN DATA · BRAINGATE2</span>
    <h3 id="recordings-title">From an array to a real signal</h3>
    <p class="recordings-intro">Explore attempted handwriting recorded from two 96-channel Utah arrays in participant T5's motor cortex. These are measured recordings, not simulated signals.</p>
    {error ? <p role="alert">The recording couldn't load. Reload the page or <a href="https://datadryad.org/dataset/doi:10.5061/dryad.wh70rxwmv">open the source dataset</a>.</p> : !trial ? <p role="status">Loading the recording excerpts...</p> : <>
      <div class="recording-controls">
        <label>Excerpt<select value={trialIndex} onChange={e => { stop(); setTrialIndex(Number(e.currentTarget.value)); }}>
          {data!.trials.map((t, i) => <option value={i} key={t.trial}>Trial {t.trial}</option>)}
        </select></label>
        <label>Array<select value={array} onChange={e => setArray(Number(e.currentTarget.value))}><option value={0}>1 · lateral</option><option value={1}>2 · medial</option></select></label>
        <label>Channel<select value={channel} onChange={e => setChannel(Number(e.currentTarget.value))}>{Array.from({ length: 96 }, (_, i) => <option value={i} key={i}>{array * 96 + i + 1}</option>)}</select></label>
        <label>Window<select value={windowSeconds} onChange={e => { stop(); const s = Number(e.currentTarget.value); setWindowSeconds(s); setStart(Math.min(start, Math.max(0, trial.bins - s * 100))); }}><option value={2}>2 seconds</option><option value={5}>5 seconds</option><option value={10}>10 seconds</option></select></label>
      </div>
      <div class="recording-prompt"><span>Prompt, not decoded output</span><q>{trial.prompt}</q></div>
      <canvas ref={canvas} class="recording-canvas" role="img" aria-label={`Binned activity raster for array ${array + 1}, channels ${array * 96 + 1} to ${array * 96 + 96}, and rate trace for channel ${chosen + 1}, from ${(start / 100).toFixed(2)} seconds. Use the channel selector or tap a raster row to change channels.`} onPointerDown={e => {
        const y = e.clientY - e.currentTarget.getBoundingClientRect().top;
        if (y >= 35 && y < 275) setChannel(Math.min(95, Math.floor((y - 35) / 240 * 96)));
      }} />
      <div class="recording-transport"><button onClick={() => { if (!playing && start >= maxStart) setStart(0); setPlaying(!playing); }} aria-pressed={playing}>{playing ? 'Pause' : 'Play'}</button><button onClick={() => { stop(); setStart(0); }}>Reset</button><output aria-live="off">{(start / 100).toFixed(2)}-{((start + windowBins) / 100).toFixed(2)} s</output></div>
      <label class="recording-scrub">Scrub recording<input type="range" min={0} max={maxStart} step={1} value={start} onInput={e => { stop(); setStart(Number(e.currentTarget.value)); }} aria-valuetext={`${(start / 100).toFixed(2)} seconds from excerpt start`} /></label>
      <p class="recording-meta">Session {data!.session} · Trial {trial.trial} · {trial.condition} · {(trial.bins / 100).toFixed(1)} s excerpt · 192 recorded channels</p>
      <p class="recording-note">Each cyan mark is a nonzero 10 ms bin; brighter marks mean more threshold crossings. Rows are recording channels, not identified neurons. The gold trace is a centered 100 ms mean threshold-crossing rate (s⁻¹), not a voltage waveform. Time is relative to this excerpt; the dashed line marks the go cue. Tap a raster row or use the channel selector to inspect it.</p>
      <a class="recording-download" href={DATA_URL} download="willett-handwriting-excerpts.json">Download these excerpts (JSON)</a>
    </>}
    <details class="recording-sources"><summary>Source, license &amp; limitations</summary>
      <p>Willett, F. R., Avansino, D. T., Hochberg, L. R., Henderson, J. M. &amp; Shenoy, K. V. (2021). <a href="https://www.nature.com/articles/s41586-021-03506-2">High-performance brain-to-text communication via handwriting</a>. BrainGate2 study participant T5.</p>
      <p><a href="https://datadryad.org/dataset/doi:10.5061/dryad.wh70rxwmv">Dryad dataset · doi:10.5061/dryad.wh70rxwmv</a> · <a href="https://zenodo.org/records/4695519">CC0 public-domain dedication and archive mirror</a>. Three excerpts from the December 18, 2019 session; original 10 ms counts retained without invented spike timing. Only the rate trace is averaged.</p>
      <p>Threshold crossings were detected at −3.5×RMS, per the dataset documentation. These files do not contain raw voltage or exact spike timestamps. The page does not run a decoder, reconstruct handwriting, or claim these samples represent all implants or participants. Channel order follows the dataset, not the 3D model's physical contact mapping.</p>
    </details>
    <noscript>Enable JavaScript to explore the recordings. The source and license links above remain available.</noscript>
    <style>{`
      .real-recordings{margin:24px 0;padding:20px;border:1px solid var(--border);border-radius:16px;background:var(--panelStrong);overflow:hidden}
      .recordings-kicker{font-size:11px;letter-spacing:.14em;opacity:.75}.real-recordings h3{font-size:var(--title-card);margin:8px 0}.recordings-intro{line-height:1.65;font-size:16px;opacity:.85}
      .recording-controls{display:flex;flex-wrap:wrap;gap:12px;margin:18px 0}.recording-controls label{display:flex;flex-direction:column;gap:6px;font-size:12px;flex:1;min-width:100px}
      .recording-controls select,.recording-transport button{font:inherit;color:inherit;background:var(--panel);border:1px solid var(--border);padding:10px;border-radius:9px;min-height:44px}.recording-controls option{background:var(--menuBg);color:var(--text)}.recording-transport button{cursor:pointer}
      .recording-prompt{padding:12px 14px;border-left:2px solid #e7bb72;background:var(--panelStrong);margin:12px 0}.recording-prompt span{display:block;font-size:11px;color:var(--muted);margin-bottom:6px}.recording-prompt q{color:var(--text);font-size:18px;line-height:1.5;overflow-wrap:anywhere}
      .recording-canvas{display:block;width:100%;height:440px;border-radius:10px;background:#101925;cursor:crosshair}.recording-transport{display:flex;gap:8px;align-items:center;margin:12px 0;flex-wrap:wrap}.recording-transport output{font-size:13px;margin-left:auto;font-variant-numeric:tabular-nums}
      .recording-scrub{display:block;font-size:12px}.recording-scrub input{display:block;width:100%;min-height:44px;accent-color:#6edae6}.recording-meta{font-size:12px;opacity:.75;line-height:1.6}.recording-note,.recording-sources{font-size:16px;line-height:1.65}.recording-note{opacity:.85}.recording-sources{margin-top:20px}.recording-sources summary{cursor:pointer}.real-recordings a{color:inherit;text-decoration:underline}.recording-download{font-size:13px}
      .real-recordings button:focus-visible,.real-recordings select:focus-visible,.real-recordings input:focus-visible,.real-recordings summary:focus-visible,.real-recordings a:focus-visible{outline:2px solid #6edae6;outline-offset:3px}
      @media(max-width:600px){.real-recordings{padding:12px}.recording-controls{gap:8px}.recording-controls label{flex-basis:40%}.recording-transport output{font-size:12px}}
    `}</style>
  </section>;
}
