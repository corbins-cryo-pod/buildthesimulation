import { useEffect, useMemo, useRef, useState } from 'preact/hooks';

type Trial = { session: string; cue: string; bins: number; counts: string };
type ModelData = {
  schemaVersion: number; participant: string; channels: number; binMs: number;
  charset: string; modelClasses: string[]; ctxBins: number;
  weights: string; bias: string;
  sessions: Record<string, { mean: string; std: string }>;
  trials: Trial[];
};
const DATA_URL = '/data/handwriting-decoder.json';

function f32(b64: string): Float32Array {
  const bin = atob(b64); const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return new Float32Array(bytes.buffer);
}
function unpackCounts(t: Trial): Uint8Array {
  const bin = atob(t.counts); const packed = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) packed[i] = bin.charCodeAt(i);
  const out = new Uint8Array(t.bins * 96 * 2);
  for (let i = 0; i < packed.length; i++) { out[i * 2] = packed[i] & 15; out[i * 2 + 1] = packed[i] >> 4; }
  return out; // [bin][channel], 192 channels
}

type Decoded = {
  logits: Float32Array; topChar: Int32Array; topProb: Float32Array; align: Int32Array; T: number;
};

export default function HandwritingDecoder() {
  const [data, setData] = useState<ModelData | null>(null);
  const [error, setError] = useState(false);
  const [trialIndex, setTrialIndex] = useState(0);
  const [hover, setHover] = useState<number | null>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  const trial = data?.trials[trialIndex];

  useEffect(() => {
    const controller = new AbortController();
    Promise.all([1, 2, 3, 4].map(i => fetch(`${DATA_URL}.${i}`, { signal: controller.signal }).then(r => {
      if (!r.ok) throw new Error('load'); return r.text();
    }))).then(texts => JSON.parse(texts.join(''))).then(d => {
      if (d.channels !== 192 || d.binMs !== 20 || !d.trials?.length) throw new Error('format');
      setData(d);
    }).catch(e => { if (e.name !== 'AbortError') setError(true); });
    return () => controller.abort();
  }, []);

  const decoded = useMemo<Decoded | null>(() => {
    if (!data || !trial) return null;
    const T = trial.bins, C = data.ctxBins, K = data.modelClasses.length;
    const counts = unpackCounts(trial);
    // sqrt + boxcar smooth (5 bins) + session z-score
    const sm = new Float32Array(T * 192);
    for (let ch = 0; ch < 192; ch++) {
      const prefix = new Float64Array(T + 1);
      for (let t = 0; t < T; t++) prefix[t + 1] = prefix[t] + Math.sqrt(counts[t * 192 + ch]);
      for (let t = 0; t < T; t++) {
        const lo = Math.max(0, t - 2), hi = Math.min(T, t + 3);
        sm[t * 192 + ch] = (prefix[hi] - prefix[lo]) / (hi - lo);
      }
    }
    const mu = f32(data.sessions[trial.session].mean), sd = f32(data.sessions[trial.session].std);
    for (let t = 0; t < T; t++) for (let ch = 0; ch < 192; ch++) sm[t * 192 + ch] = (sm[t * 192 + ch] - mu[ch]) / sd[ch];
    // context features +-C bins
    const W = f32(data.weights), B = f32(data.bias);
    const D = 192 * (2 * C + 1);
    const logits = new Float32Array(T * K);
    for (let t = 0; t < T; t++) {
      const feats = new Float32Array(D);
      for (let o = -C; o <= C; o++) {
        const tt = Math.min(T - 1, Math.max(0, t + o));
        feats.set(sm.subarray(tt * 192, tt * 192 + 192), (o + C) * 192);
      }
      for (let k = 0; k < K; k++) {
        let s = B[k];
        const woff = k * D;
        for (let j = 0; j < D; j++) s += W[woff + j] * feats[j];
        logits[t * K + k] = s;
      }
    }
    // per-bin top char + softmax prob
    const topChar = new Int32Array(T), topProb = new Float32Array(T);
    for (let t = 0; t < T; t++) {
      let mx = -1e30; for (let k = 0; k < K; k++) mx = Math.max(mx, logits[t * K + k]);
      let sum = 0; for (let k = 0; k < K; k++) sum += Math.exp(logits[t * K + k] - mx);
      let bi = 0, bv = -1e30;
      for (let k = 0; k < K; k++) { const v = logits[t * K + k]; if (v > bv) { bv = v; bi = k; } }
      topChar[t] = bi; topProb[t] = Math.exp(bv - mx) / sum;
    }
    // forced alignment to the known cue (model-derived letter timing)
    const cue = trial.cue;
    const c2r = new Map<string, number>(); data.modelClasses.forEach((c, i) => c2r.set(c, i));
    const seq: number[] = [];
    for (const ch of cue) seq.push(c2r.get(ch) ?? 0);
    const S = seq.length, NS = S + 2, NEG = -1e15, maxNull = 40;
    const dp = new Float64Array(NS).fill(NEG); dp[0] = 0;
    const bps = new Uint8Array(T * NS);
    for (let t = 0; t < T; t++) {
      let lse = -1e30; for (let k = 0; k < K; k++) lse = Math.max(lse, logits[t * K + k]);
      let nll = 0; for (let k = 0; k < K; k++) nll += Math.exp(logits[t * K + k] - lse);
      const nullEm = lse + Math.log(nll) - Math.log(K);
      const emis = new Float64Array(NS);
      emis[0] = t < maxNull ? nullEm : -1e9;
      for (let s = 0; s < S; s++) emis[s + 1] = logits[t * K + seq[s]];
      emis[NS - 1] = t >= T - maxNull ? nullEm : -1e9;
      for (let s = NS - 1; s >= 0; s--) {
        const adv = s > 0 ? dp[s - 1] : NEG;
        if (adv > dp[s]) { dp[s] = adv + emis[s]; bps[t * NS + s] = 1; } else dp[s] = dp[s] + emis[s];
      }
    }
    const align = new Int32Array(T); let s = NS - 1;
    for (let t = T - 1; t >= 0; t--) { align[t] = s; if (bps[t * NS + s] && s > 0) s--; }
    return { logits, topChar, topProb, align, T };
  }, [data, trial]);

  useEffect(() => {
    const el = canvas.current;
    if (!el || !data || !trial || !decoded) return;
    function draw() {
      if (!el || !data || !trial || !decoded) return;
      const width = el.getBoundingClientRect().width, height = 460;
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      el.width = Math.round(width * dpr); el.height = height * dpr;
      const ctx = el.getContext('2d'); if (!ctx) return;
      ctx.scale(dpr, dpr);
      ctx.fillStyle = '#101925'; ctx.fillRect(0, 0, width, height);
      const left = 44, right = width - 14, pw = right - left, T = decoded.T;
      const top = 30, rasterH = 240, stripTop = 290, stripH = 60, lettersTop = 366;
      const counts = unpackCounts(trial);
      ctx.font = '11px system-ui'; ctx.fillStyle = '#b3c4d8';
      ctx.fillText('192 channels · threshold crossings · 20 ms bins', left, 18);
      for (let row = 0; row < 192; row++) {
        for (let b = 0; b < T; b++) {
          const v = counts[b * 192 + row];
          if (!v) continue;
          ctx.fillStyle = `rgba(110,218,230,${Math.min(.25 + v * .22, 1)})`;
          ctx.fillRect(left + b / T * pw, top + row * rasterH / 192, Math.max(.8, pw / T), 1.1);
        }
      }
      ctx.fillStyle = '#b3c4d8';
      ctx.fillText('1', 30, top + 8); ctx.fillText('192', 16, top + rasterH);
      // posterior strip
      ctx.fillStyle = '#b3c4d8'; ctx.fillText('Decoder top guess per bin (color = confidence)', left, stripTop - 6);
      for (let b = 0; b < T; b++) {
        const p = decoded.topProb[b];
        ctx.fillStyle = `rgba(231,187,114,${0.12 + p * 0.88})`;
        ctx.fillRect(left + b / T * pw, stripTop, Math.max(.8, pw / T), stripH);
        if (T < 400 || b % 2 === 0) {
          ctx.fillStyle = '#101925';
          ctx.fillText(data.modelClasses[decoded.topChar[b]] === ' ' ? '·' : data.modelClasses[decoded.topChar[b]], left + b / T * pw, stripTop + stripH / 2 + 4);
        }
      }
      // aligned letters from forced alignment to the known prompt
      ctx.fillStyle = '#b3c4d8'; ctx.fillText('Model-aligned letter timing (uses the known prompt)', left, lettersTop - 6);
      ctx.font = '13px system-ui';
      let b = 0;
      while (b < T) {
        const s = decoded.align[b];
        let e = b + 1;
        while (e < T && decoded.align[e] === s) e++;
        if (s >= 1 && s <= trial.cue.length) {
          const ch = trial.cue[s - 1];
          const x0 = left + b / T * pw, x1 = left + e / T * pw;
          ctx.strokeStyle = '#304057'; ctx.strokeRect(x0, lettersTop, Math.max(1, x1 - x0), 24);
          ctx.fillStyle = '#e7bb72';
          if (x1 - x0 > 9) ctx.fillText(ch === ' ' ? '·' : ch, x0 + (x1 - x0) / 2 - 3, lettersTop + 17);
        }
        b = e;
      }
      // time axis
      ctx.font = '11px system-ui'; ctx.strokeStyle = '#304057';
      for (let i = 0; i <= 5; i++) {
        const x = left + i / 5 * pw;
        ctx.beginPath(); ctx.moveTo(x, top); ctx.lineTo(x, top + rasterH); ctx.stroke();
        ctx.fillStyle = '#b3c4d8'; ctx.textAlign = i === 5 ? 'right' : 'left';
        ctx.fillText(`${(i / 5 * T * 0.02).toFixed(1)}s`, x, top + rasterH + 14);
        ctx.textAlign = 'left';
      }
      // hover marker
      if (hover !== null) {
        const x = left + hover / T * pw;
        ctx.strokeStyle = '#e7bb72'; ctx.setLineDash([4, 4]);
        ctx.beginPath(); ctx.moveTo(x, top); ctx.lineTo(x, lettersTop + 24); ctx.stroke(); ctx.setLineDash([]);
      }
    }
    draw(); const observer = new ResizeObserver(draw); observer.observe(el);
    return () => observer.disconnect();
  }, [data, trial, decoded, hover]);

  const top5 = useMemo(() => {
    if (!decoded || !data || hover === null) return null;
    const K = data.modelClasses.length, off = hover * K;
    let mx = -1e30; for (let k = 0; k < K; k++) mx = Math.max(mx, decoded.logits[off + k]);
    const exps: number[] = []; let sum = 0;
    for (let k = 0; k < K; k++) { const e = Math.exp(decoded.logits[off + k] - mx); exps.push(e); sum += e; }
    return data.modelClasses.map((c, k) => ({ c, p: exps[k] / sum }))
      .sort((a, b2) => b2.p - a.p).slice(0, 5);
  }, [decoded, hover, data]);

  return <section id="handwriting-decoder" class="hw-decoder" aria-labelledby="decoder-title">
    <span class="decoder-kicker">REAL HUMAN DATA · LIVE DECODE IN YOUR BROWSER</span>
    <h3 id="decoder-title">Watch letters emerge from the signal</h3>
    <p class="decoder-intro">A decoder trained on four of T5's calibration sessions scores every 20 ms slice of these held-out recordings against 31 characters. Pick a moment to inspect its top five guesses.</p>
    {error ? <p role="alert">The decoder data couldn't load. Reload the page.</p> : !trial || !decoded ? <p role="status">Loading the decoder...</p> : <>
      <div class="decoder-controls">
        <label>Held-out trial<select value={trialIndex} onChange={e => { setTrialIndex(Number(e.currentTarget.value)); setHover(null); }}>
          {data!.trials.map((t, i) => <option value={i} key={i}>{t.session} · trial {i + 1}</option>)}
        </select></label>
      </div>
      <div class="decoder-prompt"><span>Prompt T5 copied (not decoder output)</span><q>{trial.cue}</q></div>
      <canvas ref={canvas} class="decoder-canvas" role="img" aria-label="Neural raster, decoder confidence strip, and aligned letter timing for the selected trial." onPointerMove={e => {
        const rect = e.currentTarget.getBoundingClientRect();
        const x = e.clientX - rect.left, left = 44, right = rect.width - 14;
        if (x >= left && x <= right) setHover(Math.min(decoded.T - 1, Math.max(0, Math.floor((x - left) / (right - left) * decoded.T))));
      }} onPointerLeave={() => setHover(null)} />
      {top5 && <div class="decoder-top5" aria-live="off">
        <span class="decoder-top5-time">t = {(hover! * 0.02).toFixed(2)} s</span>
        {top5.map(g => <span class="decoder-guess" key={g.c}><b>{g.c === ' ' ? '␣' : g.c}</b> {(g.p * 100).toFixed(1)}%</span>)}
      </div>}
      <div class="decoder-stats">
        <div><span>Training</span><b>4 calibration sessions · 179 trials · 464,478 bins</b></div>
        <div><span>Model</span><b>Multinomial logistic regression · ±60 ms context</b></div>
        <div><span>Held-out per-bin top-1</span><b>57.4%</b></div>
        <div><span>Held-out per-bin top-3</span><b>96.1%</b></div>
        <div><span>Willett et al. RNN, free decode</span><b>94.1% raw character accuracy</b></div>
      </div>
      <p class="decoder-note">These six trials come from sessions the decoder never trained on. Letter boundaries use the known prompt (model-derived alignment, not human labels), so the per-bin scores measure character recognition at each moment, not free sentence decoding; free-running decode from this linear model is far weaker than the paper's recurrent network, which also had no per-character timing labels but trained end to end. Decoding runs entirely in this page on downloaded weights.</p>
      <details class="decoder-sources"><summary>Method, sources &amp; limitations</summary>
        <p>Method: 20 ms threshold-crossing bins → square root → 100 ms boxcar smoothing → per-session z-score → ±3-bin (±60 ms) context stack → multinomial logistic regression over 31 characters, fit by stochastic gradient on forced-alignment labels bootstrapped from the prompted sentences (expectation-maximization over Viterbi alignments; character timing is never given by the dataset).</p>
        <p>Held-out scores: per-bin top-1 57.4% and top-3 96.1% against model-derived alignments on the three held-out sessions (2022-05-18, 2022-06-08, 2022-06-15; 6 trials), which inflates agreement relative to human-labeled boundaries. Reference performance: 94.1% raw character accuracy online at 90 characters per minute, 5.4% character error rate on never-trained sentences, RNN decoder (Willett et al. 2021).</p>
        <p>Data: <a href="https://dandiarchive.org/dandiset/000950">FALCON Benchmark H2 · DANDI:000950</a> (BrainGate participant T5, 2022 sessions, NWB format). Original study: Willett, F. R. et al. (2021) <a href="https://www.nature.com/articles/s41586-021-03506-2">High-performance brain-to-text communication via handwriting</a>, Nature. Original archive: <a href="https://datadryad.org/dataset/doi:10.5061/dryad.wh70rxwmv">Dryad · doi:10.5061/dryad.wh70rxwmv</a> (CC0).</p>
      </details>
    </>}
    <noscript>Enable JavaScript to run the decoder. The source and license links remain available.</noscript>
    <style>{`
      .hw-decoder{margin:24px 0;padding:20px;border:1px solid var(--border);border-radius:0;background:var(--panelStrong);overflow:hidden}
      .decoder-kicker{font-size:11px;letter-spacing:.14em;opacity:.75}.hw-decoder h3{font-size:var(--title-card);margin:8px 0}.decoder-intro{line-height:1.65;font-size:16px;opacity:.85}
      .decoder-controls{display:flex;flex-wrap:wrap;gap:12px;margin:18px 0}.decoder-controls label{display:flex;flex-direction:column;gap:6px;font-size:12px;flex:1;min-width:180px}
      .decoder-controls select{font:inherit;color:inherit;background:var(--panel);border:1px solid var(--border);padding:10px;border-radius:0;min-height:44px}.decoder-controls option{background:var(--menuBg);color:var(--text)}
      .decoder-prompt{padding:12px 14px;border-left:2px solid #e7bb72;background:var(--panelStrong);margin:12px 0}.decoder-prompt span{display:block;font-size:11px;color:var(--muted);margin-bottom:6px}.decoder-prompt q{color:var(--text);font-size:18px;line-height:1.5;overflow-wrap:anywhere}
      .decoder-canvas{display:block;width:100%;height:460px;border-radius:0;background:#101925;cursor:crosshair}
      .decoder-top5{display:flex;gap:16px;align-items:center;margin:12px 0;flex-wrap:wrap;font-variant-numeric:tabular-nums}.decoder-top5-time{font-size:12px;opacity:.75}.decoder-guess{font-size:15px}.decoder-guess b{font-size:19px;margin-right:5px}
      .decoder-stats{display:grid;grid-template-columns:repeat(auto-fit,minmax(170px,1fr));gap:10px;margin:18px 0}.decoder-stats div{padding:12px;border:1px solid var(--border);background:var(--panel)}.decoder-stats span{display:block;font-size:11px;letter-spacing:.08em;color:var(--muted);margin-bottom:5px}.decoder-stats b{font-weight:400;font-size:14px}
      .decoder-note,.decoder-sources{font-size:16px;line-height:1.65}.decoder-note{opacity:.85}.decoder-sources{margin-top:16px}.decoder-sources summary{cursor:pointer}.hw-decoder a{color:inherit;text-decoration:underline}
      .hw-decoder button:focus-visible,.hw-decoder select:focus-visible,.hw-decoder summary:focus-visible,.hw-decoder a:focus-visible{outline:2px solid #6edae6;outline-offset:3px}
      @media(max-width:600px){.hw-decoder{padding:12px}.decoder-stats{grid-template-columns:1fr 1fr}}
    `}</style>
  </section>;
}
