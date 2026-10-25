import { basis } from './advanced/optics.js';
/**
 * Orthographic 3-D viewer for measured neuronal paths.
 * All world coordinates are micrometres. Line widths have a subpixel visibility
 * floor; that display-only floor never changes membrane area or the solver.
 * Optional light slices are sampled from the exact optical function used by the
 * experiment, while the dashed beam outline is only an orientation guide.
 */

const clamp = (x, a, b) => Math.max(a, Math.min(b, x));
const mix = (a, b, t) => a + (b - a) * t;
const rgb = (hex) => hex.match(/[\da-f]{2}/gi).map((x) => parseInt(x, 16));
const blend = (a, b, t) => a.map((v, i) => Math.round(mix(v, b[i], t)));
const color = (v) => `rgb(${v.join(',')})`;

const VOLTAGE_STOPS = [
  [-90, rgb('375d81')], [-70, rgb('598492')], [-55, rgb('9c9b69')],
  [-20, rgb('c28c43')], [10, rgb('d15f3b')], [40, rgb('ef402f')],
];

 function overlayColor(value, overlay = 'voltage', { max = 1, theme = 'light' } = {}) {
  if (!Number.isFinite(value)) return theme === 'dark' ? '#a7aaa1' : '#7b8178';
  if (overlay === 'voltage') {
    const v = clamp(value, -90, 40);
    for (let i = 1; i < VOLTAGE_STOPS.length; i++) {
      const [lo, a] = VOLTAGE_STOPS[i - 1], [hi, b] = VOLTAGE_STOPS[i];
      if (v <= hi) return color(blend(a, b, (v - lo) / (hi - lo)));
    }
    return '#ef402f';
  }
  if (overlay === 'expression') return value > 0 ? (theme === 'dark' ? '#e2c68d' : '#98743e') : (theme === 'dark' ? '#62675f' : '#a6aaa1');
  if (overlay === 'light') {
    const t = Math.log1p(99 * clamp(value / Math.max(max, 1e-12), 0, 1)) / Math.log(100);
    return color(blend(rgb(theme === 'dark' ? '586461' : 'a0aaa5'), rgb(theme === 'dark' ? '92d5f1' : '145d9a'), t));
  }
  if (overlay === 'conductance' || overlay === 'open') {
    const t = clamp(value / Math.max(max, 1e-12), 0, 1);
    return color(blend(rgb(theme === 'dark' ? '68736c' : '9aa497'), rgb(theme === 'dark' ? 'f2c475' : 'ad5d25'), t));
  }
  return theme === 'dark' ? '#c3c3b5' : '#6c7165';
}

 function createNeuronScene(canvas, { onSelect = () => {} } = {}) {
  const ctx = canvas.getContext('2d', { alpha: false });
  if (!ctx) throw new Error('This browser does not provide the required canvas renderer.');
  const state = {
    nodes: [], segments: [], device: null, values: null, overlay: 'voltage', max: 1,
    light: { kind: 'uniform', irradianceMwMm2: 1 }, sampler: null,
    selected: 0, theme: 'light', width: 640, height: 440, dpr: 1,
    yaw: -0.31, pitch: 0.18, roll: Math.PI, zoom: 1, baseScale: 1,
    center: [0, 0, 0], panX: 0, panY: 0,
    bounds: { min: [-150, -300, -50], max: [150, 250, 50] },
    projected: [], field: [], fieldMax: 1, fieldVisible: true, fieldDrive: 1, dirty: false,
    destroyed: false, frameRequest: 0,
  };
  const pointers = new Map();
  let dragStart = null, pinch = null;

  canvas.style.touchAction = 'none';
  canvas.style.cursor = 'grab';
  if (!canvas.getAttribute('aria-label')) canvas.setAttribute('aria-label', 'Three-dimensional reconstructed neuron. Drag to orbit, wheel or pinch to zoom. Select a branch to inspect its computed response.');

  function palette() {
    return state.theme === 'dark'
      ? { paper: '#20211f', ink: '#e9e7dd', muted: '#acafa4', rule: '#484b43', brass: '#ceb681', source: '#93c8df', blue: '#78b9d9', shadow: '#151613' }
      : { paper: '#f5f1e6', ink: '#292c27', muted: '#73776c', rule: '#d4cebd', brass: '#94723e', source: '#347da5', blue: '#347da5', shadow: '#d9d3c4' };
  }

  function rotate(point) {
    const x = point[0] - state.center[0], y = point[1] - state.center[1], z = point[2] - state.center[2];
    const c = Math.cos(state.yaw), s = Math.sin(state.yaw), cp = Math.cos(state.pitch), sp = Math.sin(state.pitch);
    const xx = x * c + z * s, zz = -x * s + z * c;
    const yy = y * cp - zz * sp, cr = Math.cos(state.roll), sr = Math.sin(state.roll);
    // Camera roll places this specimen's negative-Y apical arbor above its soma.
    // This is a rigid display transform; optical and solver coordinates stay native.
    return [xx * cr - yy * sr, xx * sr + yy * cr, y * sp + zz * cp];
  }

  function project(point) {
    const p = rotate(point), scale = state.baseScale * state.zoom;
    return [state.width / 2 + state.panX + p[0] * scale, state.height / 2 + state.panY - p[1] * scale, p[2]];
  }

  function schedule() {
    if (state.destroyed || state.frameRequest) return;
    state.frameRequest = requestAnimationFrame(() => { state.frameRequest = 0; draw(); });
  }

  function computeFit() {
    if (!state.segments.length) return;
    let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
    for (const segment of state.segments) {
      for (const point of [segment.a, segment.b]) {
        const p = rotate(point);
        minX = Math.min(minX, p[0]); maxX = Math.max(maxX, p[0]);
        minY = Math.min(minY, p[1]); maxY = Math.max(maxY, p[1]);
      }
    }
    const horizontal = state.width < 420 ? 36 : 78;
    state.baseScale = Math.min((state.width - horizontal) / Math.max(40, maxX - minX), (state.height - 84) / Math.max(40, maxY - minY));
    state.baseScale = Math.max(0.05, state.baseScale);
  }

  function sampleField() {
    state.field = [];
    if (!state.sampler || !state.nodes.length || state.light.kind === 'uniform') { state.fieldMax = 1; return; }
    const min = state.bounds.min, max = state.bounds.max;
    const nx = 25, ny = 31, z = state.nodes[0]?.centerUm?.[2] ?? 0;
    const pad = 40, dx = (max[0] - min[0] + 2 * pad) / nx, dy = (max[1] - min[1] + 2 * pad) / ny;
    let maximum = 0;
    for (let j = 0; j < ny; j++) for (let i = 0; i < nx; i++) {
      const x = min[0] - pad + i * dx, y = min[1] - pad + j * dy;
      const value = state.sampler([x + dx / 2, y + dy / 2, z], state.light);
      if (Number.isFinite(value) && value > 0) {
        state.field.push({ value, points: [[x, y, z], [x + dx, y, z], [x + dx, y + dy, z], [x, y + dy, z]] });
        maximum = Math.max(maximum, value);
      }
    }
    state.fieldMax = maximum || 1;
  }

  function drawField(pal) {
    if (!state.fieldVisible || state.fieldDrive<=0) return;
    if (state.light.kind === 'uniform') {
      ctx.fillStyle = state.theme === 'dark' ? '#293638' : '#e9eff0';
      ctx.globalAlpha = 0.45 * state.fieldDrive;
      ctx.fillRect(0, 0, state.width, state.height);
      ctx.globalAlpha = 1;
      return;
    }
    for (const tile of state.field) {
      const t = Math.log1p(49 * tile.value / state.fieldMax) / Math.log(50);
      if (t < 0.025) continue;
      ctx.beginPath();
      tile.points.forEach((p, i) => { const q = project(p); i ? ctx.lineTo(q[0], q[1]) : ctx.moveTo(q[0], q[1]); });
      ctx.closePath();
      ctx.fillStyle = pal.blue;
      ctx.globalAlpha = (0.04 + 0.17 * t) * state.fieldDrive;
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }

  function geometry() {
    if (state.light.kind === 'uniform') return null;
    const position = state.light.positionUm ?? [-120, 120, 80], target = state.light.targetUm ?? [0, 0, 0];
    const delta = target.map((v, i) => v - position[i]), length = Math.hypot(...delta);
    if (!(length > 0)) return null;
    const direction = delta.map((v) => v / length);
    const helper = Math.abs(direction[2]) < 0.85 ? [0, 0, 1] : [0, 1, 0];
    let u = [direction[1] * helper[2] - direction[2] * helper[1], direction[2] * helper[0] - direction[0] * helper[2], direction[0] * helper[1] - direction[1] * helper[0]];
    const un = Math.hypot(...u); u = u.map((v) => v / un);
    const v = [direction[1] * u[2] - direction[2] * u[1], direction[2] * u[0] - direction[0] * u[2], direction[0] * u[1] - direction[1] * u[0]];
    return { position, target, direction, u, v, length };
  }

  function drawFiber(pal) {
    const g = geometry();
    if (!g) return;
    const radius = (state.light.diameterUm ?? 100) / 2;
    const near = [], far = [], back = [];
    const length = Math.max(100, Math.min(230, g.length + 60));
    const nr = radius + length * Math.tan(Math.asin((state.light.na ?? 0.22) / 1.36));
    for (let j = 0; j <= 28; j++) {
      const a = j * 2 * Math.PI / 28;
      const offset = g.u.map((v, i) => v * Math.cos(a) + g.v[i] * Math.sin(a));
      near.push(project(g.position.map((v, i) => v + radius * offset[i])));
      far.push(project(g.position.map((v, i) => v + length * g.direction[i] + nr * offset[i])));
      back.push(project(g.position.map((v, i) => v - 90 * g.direction[i] + radius * offset[i])));
    }
    const stroke = (points, close = false) => {
      ctx.beginPath(); points.forEach((p, i) => i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1]));
      if (close) ctx.closePath(); ctx.stroke();
    };
    ctx.strokeStyle = pal.blue; ctx.lineWidth = 1; ctx.setLineDash([4, 5]); ctx.globalAlpha = 0.45 * state.fieldDrive;
    stroke(far);
    for (const k of [0, 7, 14, 21]) stroke([near[k], far[k]]);
    const axisEnd = project(g.position.map((v, i) => v + length * g.direction[i]));
    stroke([project(g.position), axisEnd]);
    ctx.setLineDash([]); ctx.globalAlpha = 1;
    ctx.fillStyle = state.theme === 'dark' ? '#353a35' : '#dcded5';
    const body = [near[0], near[7], near[14], near[21], near[28], back[28], back[21], back[14], back[7], back[0]];
    ctx.beginPath(); body.forEach((p, i) => i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1])); ctx.closePath();
    ctx.globalAlpha = 0.78; ctx.fill(); ctx.globalAlpha = 1;
    ctx.strokeStyle = pal.muted; ctx.lineWidth = 1;
    stroke(back);
    for (const k of [0, 14]) stroke([near[k], back[k]]);
    ctx.strokeStyle = pal.source; ctx.lineWidth = 2; stroke(near);
    const pt = project(g.position);
    const tx = clamp(pt[0] - 18, 12, state.width - 120), ty = clamp(pt[1] - radius * state.baseScale * state.zoom - 13, 44, state.height - 60);
    ctx.fillStyle = pal.ink; ctx.font = '12px "URW Gothic", "Century Gothic", sans-serif';
    ctx.fillText('Fiber tip · 100 µm', tx, ty);
  }

  function drawDevice(pal) {
    if (!state.device) return;
    const devices = state.device.emitters ?? [];
    for (const e of devices) {
      const b=basis(e.normal,e.rotationDeg??0),p=e.positionUm;
      const corners=[[-1,-1],[1,-1],[1,1],[-1,1]].map(([x,y])=>project(p.map((v,k)=>v+x*b.u[k]*e.widthUm/2+y*b.v[k]*e.heightUm/2)));
      const back=corners.map((_,j)=>project(p.map((v,k)=>v+([[-1,-1],[1,-1],[1,1],[-1,1]][j][0])*b.u[k]*e.widthUm/2+([[-1,-1],[1,-1],[1,1],[-1,1]][j][1])*b.v[k]*e.heightUm/2-e.normal[k]*8)));
      const path=points=>{ctx.beginPath();points.forEach((v,i)=>i?ctx.lineTo(v[0],v[1]):ctx.moveTo(v[0],v[1]));ctx.closePath();};
      ctx.fillStyle=state.theme==='dark'?'#454943':'#b7beb4';ctx.strokeStyle=pal.ink;ctx.lineWidth=.7;
      for(let j=0;j<4;j++){path([corners[j],corners[(j+1)%4],back[(j+1)%4],back[j]]);ctx.fill();ctx.stroke();}
      path(corners);ctx.fillStyle=!e.enabled?'#747971':e.wavelengthNm>550?'#d7835b':'#63a7bd';ctx.globalAlpha=e.enabled?.55+.45*state.fieldDrive:.45;ctx.fill();ctx.globalAlpha=1;ctx.stroke();
      const q=project(p),tip=project(p.map((v,k)=>v+e.normal[k]*45));ctx.setLineDash([2,3]);ctx.strokeStyle=pal.brass;ctx.beginPath();ctx.moveTo(q[0],q[1]);ctx.lineTo(tip[0],tip[1]);ctx.stroke();ctx.setLineDash([]);
      ctx.font='10px Arial';ctx.fillStyle=pal.ink;ctx.fillText(e.id,q[0]+8,q[1]-10);
    }
    for(const c of state.device.contacts??[]){const q=project(c.positionUm);ctx.strokeStyle=pal.brass;ctx.lineWidth=1.4;ctx.strokeRect(q[0]-3,q[1]-3,6,6);}
  }

  function drawNeuron(pal) {
    const scale = state.baseScale * state.zoom;
    state.projected = state.segments.map((seg) => {
      const a = project(seg.a), b = project(seg.b);
      return { ...seg, pa: a, pb: b, depth: (a[2] + b[2]) / 2 };
    }).sort((a, b) => a.depth - b.depth);
    ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    for (const s of state.projected) {
      const value = state.values?.[s.index];
      const width = Math.max(0.85, s.diameter * scale);
      ctx.strokeStyle = overlayColor(value, state.overlay, { max: state.max, theme: state.theme });
      if (s.index === state.selected) {
        ctx.beginPath(); ctx.moveTo(s.pa[0], s.pa[1]); ctx.lineTo(s.pb[0], s.pb[1]);
        ctx.strokeStyle = pal.brass; ctx.lineWidth = width + 3.2; ctx.stroke();
        ctx.strokeStyle = overlayColor(value, state.overlay, { max: state.max, theme: state.theme });
      }
      ctx.lineWidth = width;
      ctx.beginPath(); ctx.moveTo(s.pa[0], s.pa[1]); ctx.lineTo(s.pb[0], s.pb[1]); ctx.stroke();
    }
    for (let soma = 0; soma < state.nodes.length; soma++) {
      if (state.nodes[soma].sectionType !== 'soma' || !(state.nodes[soma].areaUm2 > 0)) continue;
      const n = state.nodes[soma], p = project(n.centerUm), radius = Math.max(3, (n.diameterUm ?? 16) * scale / 2);
      ctx.beginPath(); ctx.arc(p[0], p[1], radius, 0, 2 * Math.PI);
      ctx.fillStyle = overlayColor(state.values?.[soma], state.overlay, { max: state.max, theme: state.theme }); ctx.fill();
      ctx.strokeStyle = soma === state.selected ? pal.brass : pal.ink; ctx.lineWidth = soma === state.selected ? 2.4 : 0.8; ctx.stroke();
    }
    const selected = state.nodes[state.selected];
    if (selected) {
      const p = project(selected.centerUm);
      if (p[0] >= 0 && p[0] <= state.width && p[1] >= 0 && p[1] <= state.height) {
        ctx.strokeStyle = pal.brass; ctx.lineWidth = 1; ctx.setLineDash([3, 4]);
        ctx.beginPath(); ctx.arc(p[0], p[1], 10, 0, 2 * Math.PI); ctx.stroke(); ctx.setLineDash([]);
      }
    }
  }

  function drawChrome(pal) {
    ctx.font = '12px "URW Gothic", "Century Gothic", sans-serif';
    ctx.fillStyle = pal.muted;
    ctx.fillText(state.light.kind === 'uniform' ? 'Uniform illumination' : (state.field.length && state.fieldVisible ? 'Computed light · soma plane' : state.light.kind==='microled'?'Finite emitter array':'Fiber orientation guide'), 15, 24);
    if (state.light.kind !== 'uniform' && state.width > 390) {
      ctx.textAlign = 'right'; ctx.fillText(state.light.kind==='microled'?'MicroLED faces · 8 µm display thickness':'Dashed beam: geometry guide', state.width - 15, 24); ctx.textAlign = 'left';
    }
    const pxPerUm = state.baseScale * state.zoom;
    const maxWidth = Math.min(105, state.width / 3);
    const desired = maxWidth / pxPerUm;
    const exponent = Math.pow(10, Math.floor(Math.log10(Math.max(1, desired))));
    const steps = [1, 2, 5, 10];
    let um = exponent;
    for (const k of steps) if (k * exponent <= desired) um = k * exponent;
    const bar = um * pxPerUm, x = 17, y = state.height - 23;
    ctx.strokeStyle = pal.ink; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.moveTo(x, y - 4); ctx.lineTo(x, y); ctx.lineTo(x + bar, y); ctx.lineTo(x + bar, y - 4); ctx.stroke();
    ctx.fillStyle = pal.ink; ctx.fillText(`${Number(um.toPrecision(3))} µm`, x, y - 10);
    const ax = state.width - 45, ay = state.height - 40;
    const zero = project(state.center);
    for (let i = 0; i < 3; i++) {
      const p = [...state.center]; p[i] += 1;
      const q = project(p), sx = (q[0] - zero[0]) / pxPerUm * 25, sy = (q[1] - zero[1]) / pxPerUm * 25;
      ctx.strokeStyle = pal.muted; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(ax, ay); ctx.lineTo(ax + sx, ay + sy); ctx.stroke();
      ctx.fillStyle = pal.muted; ctx.fillText(['x', 'y', 'z'][i], ax + sx + 3, ay + sy + 3);
    }
    ctx.fillStyle = pal.muted;
    if (!state.nodes.length) { ctx.textAlign = 'center'; ctx.fillText('Loading reconstructed neuron…', state.width / 2, state.height / 2); ctx.textAlign = 'left'; }
  }

  function draw() {
    if (state.destroyed) return;
    const pal = palette();
    ctx.setTransform(state.dpr, 0, 0, state.dpr, 0, 0);
    ctx.fillStyle = pal.paper; ctx.fillRect(0, 0, state.width, state.height);
    drawField(pal); if(state.light.kind==='microled')drawDevice(pal);else drawFiber(pal); drawNeuron(pal); drawChrome(pal);
  }

  function resize() {
    const rect = canvas.getBoundingClientRect();
    state.width = Math.max(1, rect.width); state.height = Math.max(1, rect.height);
    state.dpr = Math.min(2.5, globalThis.devicePixelRatio || 1);
    canvas.width = Math.round(state.width * state.dpr); canvas.height = Math.round(state.height * state.dpr);
    computeFit(); schedule();
  }

  function local(event) {
    const r = canvas.getBoundingClientRect(); return [event.clientX - r.left, event.clientY - r.top];
  }

  function hitTest(point) {
    let best = -1, distance = 12;
    for (const s of state.projected) {
      const dx = s.pb[0] - s.pa[0], dy = s.pb[1] - s.pa[1], len2 = dx * dx + dy * dy;
      const t = len2 ? clamp(((point[0] - s.pa[0]) * dx + (point[1] - s.pa[1]) * dy) / len2, 0, 1) : 0;
      const d = Math.hypot(point[0] - s.pa[0] - t * dx, point[1] - s.pa[1] - t * dy);
      if (d < distance) { distance = d; best = s.index; }
    }
    return best;
  }

  function down(e) {
    canvas.setPointerCapture(e.pointerId); pointers.set(e.pointerId, local(e));
    if (pointers.size === 1) dragStart = { point: local(e), last: local(e), moved: 0, button: e.button, pan: e.shiftKey };
    if (pointers.size === 2) { const p = [...pointers.values()]; pinch = { distance: Math.hypot(p[0][0] - p[1][0], p[0][1] - p[1][1]), center: [(p[0][0] + p[1][0]) / 2, (p[0][1] + p[1][1]) / 2] }; if (dragStart) dragStart.moved = 100; }
    canvas.style.cursor = 'grabbing';
  }

  function move(e) {
    if (!pointers.has(e.pointerId)) return;
    const pt = local(e); pointers.set(e.pointerId, pt);
    if (pointers.size === 2 && pinch) {
      const p = [...pointers.values()], distance = Math.hypot(p[0][0] - p[1][0], p[0][1] - p[1][1]), center = [(p[0][0] + p[1][0]) / 2, (p[0][1] + p[1][1]) / 2];
      state.zoom = clamp(state.zoom * distance / Math.max(1, pinch.distance), 0.25, 12);
      state.panX += center[0] - pinch.center[0]; state.panY += center[1] - pinch.center[1];
      pinch = { distance, center }; schedule(); return;
    }
    if (!dragStart || pointers.size !== 1) return;
    const dx = pt[0] - dragStart.last[0], dy = pt[1] - dragStart.last[1];
    dragStart.moved += Math.hypot(dx, dy); dragStart.last = pt;
    if (dragStart.pan || dragStart.button === 1 || dragStart.button === 2) { state.panX += dx; state.panY += dy; }
    else { state.yaw += dx * 0.008; state.pitch = clamp(state.pitch + dy * 0.008, -Math.PI * 0.48, Math.PI * 0.48); }
    schedule();
  }

  function up(e) {
    const click = pointers.size === 1 && dragStart && dragStart.moved < 6;
    pointers.delete(e.pointerId);
    if (click) { const index = hitTest(local(e)); if (index >= 0) { state.selected = index; onSelect(index); schedule(); } }
    pinch = null;
    if (pointers.size === 1) { const p = [...pointers.values()][0]; dragStart = { point: p, last: p, moved: 100, pan: false, button: 0 }; }
    else dragStart = null;
    if (!pointers.size) canvas.style.cursor = 'grab';
  }

  function wheel(e) {
    e.preventDefault();
    const before = state.zoom, factor = Math.exp(-e.deltaY * 0.0014); state.zoom = clamp(state.zoom * factor, 0.25, 12);
    const p = local(e), ratio = state.zoom / before;
    state.panX = p[0] - state.width / 2 - (p[0] - state.width / 2 - state.panX) * ratio;
    state.panY = p[1] - state.height / 2 - (p[1] - state.height / 2 - state.panY) * ratio;
    schedule();
  }
  const contextMenu = (e) => e.preventDefault();
  canvas.addEventListener('pointerdown', down); canvas.addEventListener('pointermove', move);
  canvas.addEventListener('pointerup', up); canvas.addEventListener('pointercancel', up);
  canvas.addEventListener('wheel', wheel, { passive: false }); canvas.addEventListener('contextmenu', contextMenu);
  const observer = new ResizeObserver(resize); observer.observe(canvas);
  resize();

  return {
    setNodes(nodes) {
      state.nodes = nodes; state.segments = [];
      const min = [Infinity, Infinity, Infinity], max = [-Infinity, -Infinity, -Infinity];
      nodes.forEach((n, index) => {
        if (!(n.areaUm2 > 0)) return;
        const path = n.pathUm?.length > 1 ? n.pathUm : [n.startUm, n.endUm];
        for (const p of path) for (let k = 0; k < 3; k++) { min[k] = Math.min(min[k], p[k]); max[k] = Math.max(max[k], p[k]); }
        for (let i = 1; i < path.length; i++) state.segments.push({ a: path[i - 1], b: path[i], index, diameter: Math.max(0.05, n.pathDiameterUm?.[i] ?? n.diameterUm ?? 1) });
      });
      state.bounds = { min, max }; state.center = min.map((v, i) => (v + max[i]) / 2);
      if (!nodes[state.selected]?.areaUm2) state.selected = 0;
      computeFit(); sampleField(); schedule();
    },
    setDevice(device) { state.device=device; sampleField(); schedule(); },
    setLight(light) { state.light = { ...light }; sampleField(); schedule(); },
    setIllumination(drive) {state.fieldDrive=clamp(drive,0,1);schedule();},
    setLightSampler(fn) { state.sampler = fn; sampleField(); schedule(); },
    setFieldVisible(visible) { state.fieldVisible = !!visible; schedule(); },
    setValues(values, overlay = 'voltage', options = {}) { state.values = values; state.overlay = overlay; state.max = options.max ?? 1; schedule(); },
    setSelected(index) { if (state.nodes[index]) { state.selected = index; schedule(); } },
    setTheme(theme) { state.theme = theme === 'dark' ? 'dark' : 'light'; schedule(); },
    fit() { state.panX = 0; state.panY = 0; state.zoom = 1; computeFit(); schedule(); },
    setView(view) { const v = { oblique: [-0.31, 0.18], front: [0, 0], side: [Math.PI / 2, 0] }[view] ?? [-0.31, 0.18]; state.yaw = v[0]; state.pitch = v[1]; state.panX = 0; state.panY = 0; state.zoom = 1; computeFit(); schedule(); },
    zoomBy(factor) { state.zoom = clamp(state.zoom * factor, 0.25, 12); schedule(); },
    destroy() { state.destroyed = true; observer.disconnect(); if (state.frameRequest) cancelAnimationFrame(state.frameRequest); canvas.removeEventListener('pointerdown', down); canvas.removeEventListener('pointermove', move); canvas.removeEventListener('pointerup', up); canvas.removeEventListener('pointercancel', up); canvas.removeEventListener('wheel', wheel); canvas.removeEventListener('contextmenu', contextMenu); },
  };
}





export { overlayColor, createNeuronScene };
