/*
 * Recording and playback format for v4 runs.
 *
 * A run is a header (JSON: scenario, scene description, quantisation, static cells, per-frame stats)
 * plus a list of binary frames. Each frame holds the moving cells, every neurite as a simplified
 * polyline, the growth cones, and down-sampled field grids (one byte per voxel). Cells that never
 * move (stump interiors, a graft's bands) are stored once in the header.
 *
 * The same encoder runs in Node (to build the library of recorded runs) and in the browser worker
 * (so live runs can be scrubbed back and forth too). Container: [u32 header bytes][header][u32 n]
 * [u32 frame bytes x n][frames], gzipped for the library.
 */
(function (root, factory) {
  const mod = factory();
  if (typeof module === 'object' && module.exports) module.exports = mod;
  else { root.NE4 = root.NE4 || {}; Object.assign(root.NE4, mod); }
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';
  const VERSION = 2;

  // ---------------------------------------------------------------- byte writer
  class W {
    constructor(cap = 1 << 16) { this.buf = new ArrayBuffer(cap); this.u8 = new Uint8Array(this.buf); this.dv = new DataView(this.buf); this.o = 0; }
    need(n) { if (this.o + n <= this.buf.byteLength) return; let c = this.buf.byteLength * 2; while (c < this.o + n) c *= 2; const nb = new ArrayBuffer(c); new Uint8Array(nb).set(this.u8.subarray(0, this.o)); this.buf = nb; this.u8 = new Uint8Array(nb); this.dv = new DataView(nb); }
    pad() { const p = (4 - (this.o & 3)) & 3; this.need(p); for (let k = 0; k < p; k++) this.u8[this.o++] = 0; }
    u32(v) { this.pad(); this.need(4); this.dv.setUint32(this.o, v, true); this.o += 4; }
    f32(v) { this.pad(); this.need(4); this.dv.setFloat32(this.o, v, true); this.o += 4; }
    arr(T, src, n) { this.pad(); const bytes = n * T.BYTES_PER_ELEMENT; this.need(bytes); new T(this.buf, this.o, n).set(src.subarray ? src.subarray(0, n) : src); this.o += bytes; }
    done() { this.pad(); return this.buf.slice(0, this.o); }
  }
  class R {
    constructor(buf, off = 0) { this.buf = buf; this.dv = new DataView(buf); this.o = off; }
    pad() { this.o += (4 - (this.o & 3)) & 3; }
    u32() { this.pad(); const v = this.dv.getUint32(this.o, true); this.o += 4; return v; }
    f32() { this.pad(); const v = this.dv.getFloat32(this.o, true); this.o += 4; return v; }
    arr(T, n) { this.pad(); const a = new T(this.buf, this.o, n); this.o += n * T.BYTES_PER_ELEMENT; return a; }
  }

  // ---------------------------------------------------------------- polyline simplification (3-D Douglas-Peucker)
  function simplify(px, n, eps, keep) {
    keep.fill(0, 0, n); keep[0] = 1; keep[n - 1] = 1; if (n < 3) return;
    const st = [0, n - 1], e2 = eps * eps;
    while (st.length) {
      const b = st.pop(), a = st.pop(); if (b - a < 2) continue;
      const ax = px[3 * a], ay = px[3 * a + 1], az = px[3 * a + 2], dx = px[3 * b] - ax, dy = px[3 * b + 1] - ay, dz = px[3 * b + 2] - az, L2 = dx * dx + dy * dy + dz * dz || 1e-12;
      let best = -1, bd = e2;
      for (let i = a + 1; i < b; i++) {
        const qx = px[3 * i] - ax, qy = px[3 * i + 1] - ay, qz = px[3 * i + 2] - az, t = Math.max(0, Math.min(1, (qx * dx + qy * dy + qz * dz) / L2));
        const ex = qx - t * dx, ey = qy - t * dy, ez = qz - t * dz, d2 = ex * ex + ey * ey + ez * ez;
        if (d2 > bd) { bd = d2; best = i; }
      }
      if (best >= 0) { keep[best] = 1; st.push(a, best, best, b); }
    }
  }

  // ---------------------------------------------------------------- encoder
  class Recorder {
    /** o: { fields: { name: { scale, ds } }, eps (um), staticFixed (bool) } */
    constructor(e, o = {}) {
      this.e = e; this.o = Object.assign({ eps: 1.5, staticFixed: true }, o);
      const b = e.space.bounds, ext = Math.max(b.x1 - b.x0, b.y1 - b.y0, (b.z1 - b.z0) || 0);
      this.q = Math.max(0.02, ext / 60000); this.cx = (b.x0 + b.x1) / 2; this.cy = (b.y0 + b.y1) / 2; this.cz = (b.z0 + b.z1) / 2;
      const d = e.describe(); this.types = d.types; this.typeKeys = d.types.map((t) => t.key); this.space = d.space;
      this.fieldSpecs = [];
      const fs = this.o.fields || {};
      for (const f of e.space.fields) {
        const spec = fs[f.name]; if (fs && Object.keys(fs).length && !spec) continue;
        const ds = (spec && spec.ds) || 1, nx = Math.ceil(f.nx / ds), ny = Math.ceil(f.ny / ds), nz = Math.ceil(f.nz / ds);
        // coarse mask: a coarse voxel is inside if any fine voxel is
        const mask = new Uint8Array(nx * ny * nz);
        for (let k = 0; k < f.nz; k++) for (let j = 0; j < f.ny; j++) for (let i = 0; i < f.nx; i++) if (f.mask[i + f.nx * (j + f.ny * k)]) mask[((i / ds) | 0) + nx * (((j / ds) | 0) + ny * ((k / ds) | 0))] = 1;
        const idx = []; for (let q = 0; q < mask.length; q++) if (mask[q]) idx.push(q);
        this.fieldSpecs.push({ f, name: f.name, ds, nx, ny, nz, h: f.h * ds, scale: (spec && spec.scale) || f.max || 1, idx: Uint32Array.from(idx), sum: new Float32Array(nx * ny * nz), cnt: new Uint16Array(nx * ny * nz), out: new Uint8Array(idx.length) });
      }
      this.staticIds = new Set();
      this._px = new Float64Array(3 * 256); this._keep = new Uint8Array(256);
    }
    qz(v, c) { const r = Math.round((v - c) / this.q); return r > 32767 ? 32767 : r < -32768 ? -32768 : r; }
    header(extra = {}) {
      const e = this.e, b = e.space.bounds, d = { types: this.types };
      const st = []; if (this.o.staticFixed) for (const c of e.cells) if (c.alive && c.fixed && c.T.kind !== 'neuron') { st.push(c); this.staticIds.add(c.id); }
      const pos = new Int16Array(st.length * 3), typ = new Uint8Array(st.length), ori = new Int8Array(st.length * 3), rad = new Uint8Array(st.length);
      st.forEach((c, k) => { pos[3 * k] = this.qz(c.x, this.cx); pos[3 * k + 1] = this.qz(c.y, this.cy); pos[3 * k + 2] = this.qz(c.z, this.cz); typ[k] = d.types.findIndex((t) => t.key === c.T.key); ori[3 * k] = Math.round(c.ox * 127); ori[3 * k + 1] = Math.round(c.oy * 127); ori[3 * k + 2] = Math.round(c.oz * 127); rad[k] = Math.min(255, Math.round(c.r * 4)); });
      return Object.assign({
        modelRevision: 'neurotissue-v4.1-review-2026-11-03', version: VERSION, scene: { space: this.space, types: this.types }, bounds: b, q: this.q, c: [this.cx, this.cy, this.cz],
        fields: this.fieldSpecs.map((s) => ({ name: s.name, label: s.f.label, color: s.f.color, nx: s.nx, ny: s.ny, nz: s.nz, h: s.h, scale: s.scale, n: s.idx.length, idx: Array.from(s.idx) })),
        staticCells: { n: st.length, pos: Array.from(pos), typ: Array.from(typ), ori: Array.from(ori), rad: Array.from(rad) },
      }, extra);
    }
    /** encode the engine's current state; returns an ArrayBuffer */
    frame(opts = {}) {
      const e = this.e, N = e.N, w = new W(1 << 18), typeKeys = this.typeKeys;
      const tIndex = {}; typeKeys.forEach((k, i) => { tIndex[k] = i; });
      w.f32(e.t);
      // cells (moving ones)
      const cs = []; for (const c of e.cells) if (c.alive && !this.staticIds.has(c.id)) cs.push(c);
      const n = cs.length, pos = new Int16Array(3 * n), typ = new Uint8Array(n), ori = new Int8Array(3 * n), flg = new Uint8Array(n), rad = new Uint8Array(n);
      cs.forEach((c, k) => {
        pos[3 * k] = this.qz(c.x, this.cx); pos[3 * k + 1] = this.qz(c.y, this.cy); pos[3 * k + 2] = this.qz(c.z, this.cz);
        typ[k] = tIndex[c.T.key]; ori[3 * k] = Math.round(c.ox * 127); ori[3 * k + 1] = Math.round(c.oy * 127); ori[3 * k + 2] = Math.round(c.oz * 127);
        flg[k] = (c.dying >= 0 ? 1 : 0) | (c.T.kind === 'neuron' ? 2 : 0) | (c.stage << 2); rad[k] = Math.min(255, Math.round(c.r * 4));
      });
      w.u32(n); w.arr(Int16Array, pos, 3 * n); w.arr(Uint8Array, typ, n); w.arr(Int8Array, ori, 3 * n); w.arr(Uint8Array, flg, n); w.arr(Uint8Array, rad, n);
      // neurites: simplified polylines (base node + nodes)
      const identA = [], cellA = [], cnt = [], pts = []; const tips = [], tipV = [];
      const eps = opts.eps != null ? opts.eps : this.o.eps;
      for (const nr of e.neurites) {
        if (!nr || !nr.alive) continue; const m = nr.nodes.length + 1;
        if (this._px.length < 3 * m) { this._px = new Float64Array(3 * m * 2); this._keep = new Uint8Array(m * 2); }
        const px = this._px; let k = 0;
        const put = (i) => { px[3 * k] = N.x[i]; px[3 * k + 1] = N.y[i]; px[3 * k + 2] = N.z[i]; k++; };
        put(nr.base); for (const i of nr.nodes) put(i);
        const keep = this._keep; if (eps > 0) simplify(px, m, eps, keep); else keep.fill(1, 0, m);
        let c = 0; for (let i = 0; i < m; i++) if (keep[i]) { pts.push(this.qz(px[3 * i], this.cx), this.qz(px[3 * i + 1], this.cy), this.qz(px[3 * i + 2], this.cz)); c++; }
        identA.push(nr.ident); cellA.push(nr.cell); cnt.push(c);
        const tp = nr.nodes[nr.nodes.length - 1]; tips.push(this.qz(N.x[tp], this.cx), this.qz(N.y[tp], this.cy), this.qz(N.z[tp], this.cz));
        const ip = e._ip(e.cells[nr.cell], nr); tipV.push(nr.state === 0 ? Math.min(250, Math.round(250 * nr.vNow / Math.max(1e-6, ip.speed * 0.25))) : 255);
      }
      const np = identA.length;
      w.u32(np); w.arr(Uint8Array, identA, np); w.arr(Uint32Array, cellA, np); w.arr(Uint16Array, cnt, np);
      w.u32(pts.length / 3); w.arr(Int16Array, pts, pts.length);
      w.arr(Int16Array, tips, tips.length); w.arr(Uint8Array, tipV, np);
      // fields (down-sampled, one byte per voxel inside the space)
      w.u32(opts.noFields ? 0 : this.fieldSpecs.length);
      if (!opts.noFields) for (const s of this.fieldSpecs) {
        const f = s.f, ds = s.ds, sum = s.sum, ct = s.cnt; sum.fill(0); ct.fill(0);
        for (let k = 0; k < f.nz; k++) for (let j = 0; j < f.ny; j++) for (let i = 0; i < f.nx; i++) {
          const q = i + f.nx * (j + f.ny * k); if (!f.mask[q]) continue;
          const Q = ((i / ds) | 0) + s.nx * (((j / ds) | 0) + s.ny * ((k / ds) | 0)); sum[Q] += f.c[q]; ct[Q]++;
        }
        const out = s.out; for (let a = 0; a < s.idx.length; a++) { const Q = s.idx[a]; const v = ct[Q] ? sum[Q] / ct[Q] / s.scale : 0; out[a] = v <= 0 ? 0 : v >= 1 ? 255 : Math.max(1, Math.round(v * 255)); }
        w.u32(out.length); w.arr(Uint8Array, out, out.length);
      }
      return w.done();
    }
  }

  // ---------------------------------------------------------------- decoder (browser and Node)
  function decodeFrame(buf, H) {
    const r = new R(buf), q = H.q, [cx, cy, cz] = H.c;
    const t = r.f32();
    const n = r.u32(), pos = r.arr(Int16Array, 3 * n), typ = r.arr(Uint8Array, n), ori = r.arr(Int8Array, 3 * n), flg = r.arr(Uint8Array, n), rad = r.arr(Uint8Array, n);
    const np = r.u32(), ident = r.arr(Uint8Array, np), pcell = r.arr(Uint32Array, np), cnt = r.arr(Uint16Array, np);
    const npts = r.u32(), pts = r.arr(Int16Array, 3 * npts), tips = r.arr(Int16Array, 3 * np), tipV = r.arr(Uint8Array, np);
    const nf = r.u32(), fields = [];
    for (let k = 0; k < nf; k++) { const L = r.u32(); fields.push(r.arr(Uint8Array, L)); }
    const P = (src, m) => { const o = new Float32Array(3 * m); for (let i = 0; i < m; i++) { o[3 * i] = src[3 * i] * q + cx; o[3 * i + 1] = src[3 * i + 1] * q + cy; o[3 * i + 2] = src[3 * i + 2] * q + cz; } return o; };
    return { t, cells: { n, pos: P(pos, n), typ, ori, flg, rad }, polys: { n: np, ident, cell: pcell, cnt, pts: P(pts, npts), npts }, tips: { pos: P(tips, np), v: tipV }, fields };
  }
  function decodeStatic(H) {
    const s = H.staticCells, n = s.n, pos = new Float32Array(3 * n), q = H.q, [cx, cy, cz] = H.c;
    for (let i = 0; i < n; i++) { pos[3 * i] = s.pos[3 * i] * q + cx; pos[3 * i + 1] = s.pos[3 * i + 1] * q + cy; pos[3 * i + 2] = s.pos[3 * i + 2] * q + cz; }
    return { n, pos, typ: Uint8Array.from(s.typ), ori: Int8Array.from(s.ori), rad: Uint8Array.from(s.rad) };
  }

  // ---------------------------------------------------------------- container
  function pack(header, frames) {
    const hb = new TextEncoder().encode(JSON.stringify(header));
    let total = 4 + hb.length; total += (4 - (total & 3)) & 3; total += 4 + 4 * frames.length; for (const f of frames) total += f.byteLength;
    const out = new Uint8Array(total), dv = new DataView(out.buffer); let o = 0;
    dv.setUint32(o, hb.length, true); o += 4; out.set(hb, o); o += hb.length; o += (4 - (o & 3)) & 3;
    dv.setUint32(o, frames.length, true); o += 4; for (const f of frames) { dv.setUint32(o, f.byteLength, true); o += 4; }
    for (const f of frames) { out.set(new Uint8Array(f), o); o += f.byteLength; }
    return out;
  }
  function unpack(buf) {
    const dv = new DataView(buf); let o = 0;
    const hl = dv.getUint32(o, true); o += 4; const header = JSON.parse(new TextDecoder().decode(new Uint8Array(buf, o, hl))); o += hl; o += (4 - (o & 3)) & 3;
    const n = dv.getUint32(o, true); o += 4; const sizes = []; for (let k = 0; k < n; k++) { sizes.push(dv.getUint32(o, true)); o += 4; }
    const frames = []; for (const s of sizes) { frames.push(buf.slice(o, o + s)); o += s; }
    return { header, frames };
  }
  return { Recorder, decodeFrame, decodeStatic, packRun: pack, unpackRun: unpack, REC_VERSION: VERSION };
});
