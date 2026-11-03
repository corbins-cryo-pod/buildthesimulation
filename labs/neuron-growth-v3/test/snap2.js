const fs = require('fs');
module.exports = function snap(e, file, box, label) {
  const N = e.N; const [x0, y0, x1, y1] = box || [0, 0, e.W, e.H];
  const sc = 1000 / Math.max(x1 - x0, y1 - y0);
  let o = `<svg xmlns="http://www.w3.org/2000/svg" width="${(x1 - x0) * sc | 0}" height="${(y1 - y0) * sc | 0}" viewBox="${x0} ${y0} ${x1 - x0} ${y1 - y0}"><rect x="${x0}" y="${y0}" width="${x1 - x0}" height="${y1 - y0}" fill="#0d1218"/>`;
  const env = e.env;
  for (let j = 0; j < env.gh; j += 1) for (let i = 0; i < env.gw; i += 1) { const q = i + j * env.gw; if (env.wall[q]) o += `<rect x="${i * env.res}" y="${j * env.res}" width="${env.res}" height="${env.res}" fill="#3a4048"/>`; else if (env.coat[q] === 2) o += `<rect x="${i * env.res}" y="${j * env.res}" width="${env.res}" height="${env.res}" fill="#1f2a18"/>`; else if (env.coat[q] === 3) o += `<rect x="${i * env.res}" y="${j * env.res}" width="${env.res}" height="${env.res}" fill="#2a1820"/>`; }
  for (const f of env.fibers) o += `<polyline points="${f.pts.map((p) => p.join(',')).join(' ')}" stroke="#5a4a2a" stroke-width="3" fill="none"/>`;
  for (const c of e.cells) { if (!c.alive) continue;
    const col = c.T.glia ? '#7a5a2a' : c.dying >= 0 ? '#633' : '#345';
    o += `<polygon points="${[...c.ring].map((i) => N.x[i].toFixed(2) + ',' + N.y[i].toFixed(2)).join(' ')}" fill="${col}" stroke="#9cf" stroke-width="0.4"/>`;
    o += `<circle cx="${N.x[c.nuc]}" cy="${N.y[c.nuc]}" r="${Math.min(3, c.rOut * 0.4)}" fill="#68a"/>`; }
  for (const nr of e.neurites) { if (!nr || !nr.alive) continue;
    const pts = [nr.base, ...nr.nodes].map((i) => N.x[i].toFixed(2) + ',' + N.y[i].toFixed(2)).join(' ');
    const col = ['#888', '#9cf', '#f7a', '#7f9'][nr.ident];
    o += `<polyline points="${pts}" fill="none" stroke="${col}" stroke-width="${nr.ident === 2 ? 0.9 : 1.3}" stroke-linecap="round" stroke-linejoin="round" opacity="${nr.state === 1 ? 0.5 : 1}"/>`; }
  for (const pr of e.probes) { if (!pr || !pr.alive) continue; const [tx, ty] = e.probeTip(pr); const col = pr.st === 2 ? '#fd6' : pr.st === 3 ? '#f60' : '#5e9'; o += `<line x1="${N.x[pr.base]}" y1="${N.y[pr.base]}" x2="${tx}" y2="${ty}" stroke="${col}" stroke-width="0.3"/>`; }
  for (const b of e.bonds) { if (!b || !b.alive) continue; o += `<circle cx="${N.x[b.a]}" cy="${N.y[b.a]}" r="2" fill="#ff0"/>`; }
  o += `<text x="${x0 + 4}" y="${y0 + 14 / sc * 1.2}" fill="#fff" font-size="${14 / sc}">${label || ''} ${(e.t / 60).toFixed(1)} h</text></svg>`;
  fs.writeFileSync(file, o);
};
