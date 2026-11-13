/** Pure numerical helpers. All lengths are SI unless a name explicitly says Um. */
export const VERSION = 'axon-modalities-0.1.0-component-preview';
export function finite(x, name = 'value') { if (typeof x !== 'number' || !Number.isFinite(x)) throw new Error(`${name} must be finite.`); return x; }
export function range(x, name, lo, hi) { finite(x, name); if (x < lo || x > hi) throw new Error(`${name} must be in [${lo}, ${hi}].`); return x; }
export function integer(x, name, lo, hi) { range(x, name, lo, hi); if (!Number.isInteger(x)) throw new Error(`${name} must be an integer.`); return x; }
export function vec3(v, name = 'vector') { if (!Array.isArray(v) || v.length !== 3 || !v.every(Number.isFinite)) throw new Error(`${name} requires three finite numbers.`); return v; }
export const add = (a, b) => a.map((v, i) => v + b[i]);
export const sub = (a, b) => a.map((v, i) => v - b[i]);
export const scale = (a, s) => a.map(v => v * s);
export const dot = (a, b) => a.reduce((s, v, i) => s + v * b[i], 0);
export const norm = a => Math.hypot(...a);
export const cross = (a, b) => [a[1]*b[2]-a[2]*b[1], a[2]*b[0]-a[0]*b[2], a[0]*b[1]-a[1]*b[0]];
export function unit(a) { const n = norm(vec3(a)); if (n === 0) throw new Error('Zero direction.'); return scale(a, 1/n); }
export function frame(axis) { const n = unit(axis), ref = Math.abs(n[2]) < .9 ? [0,0,1] : [0,1,0]; const u = unit(cross(ref,n)); return {u, v:cross(n,u), n}; }
export function rng(seed) { integer(seed,'seed',0,4294967295); let t=seed>>>0; return () => { t=(t+0x6D2B79F5)>>>0; let x=t; x=Math.imul(x^(x>>>15),x|1); x^=x+Math.imul(x^(x>>>7),x|61); return (((x^(x>>>14))>>>0)+.5)/4294967296; }; }
export function streamSeed(seed, stream) { integer(seed,'seed',0,4294967295); let x=seed>>>0; for(const ch of String(stream)) { x^=ch.charCodeAt(0); x=Math.imul(x,16777619)>>>0; } return x; }
export function plain(value) { return JSON.parse(JSON.stringify(value, (_k,v)=>ArrayBuffer.isView(v)?Array.from(v):v)); }
export function numericJSON(value) { function check(v) { if(typeof v==='number') finite(v); else if(v&&typeof v==='object') { for(const x of Object.values(v)) check(x); } else if(v===undefined || typeof v==='function' || typeof v==='bigint') throw new Error('Unsupported export value.'); } check(value); return JSON.stringify(value,(_k,v)=>ArrayBuffer.isView(v)?Array.from(v):v,2); }
export function meanSE(xs) { if(!Array.isArray(xs)||xs.length<2||!xs.every(Number.isFinite)) throw new Error('At least two finite independent batch means required.'); const mean=xs.reduce((s,x)=>s+x,0)/xs.length, variance=xs.reduce((s,x)=>s+(x-mean)**2,0)/(xs.length-1); return {mean,se:Math.sqrt(variance/xs.length),batches:xs.length}; }
export const GL4_X = [-.8611363115940526,-.3399810435848563,.3399810435848563,.8611363115940526];
export const GL4_W = [.3478548451374538,.6521451548625461,.6521451548625461,.3478548451374538];
