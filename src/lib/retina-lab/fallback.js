import { overlaySampler } from "./overlay-sampler.mjs";
import {
  layersAt,
  population,
  morphology,
  random,
  tissueAt,
} from "./anatomy.mjs";
import { retinalSurface } from "./coordinates.mjs";
import {
  carrierSection,
  implantLayout,
  localClearance,
} from "./implant-geometry.mjs";
import { FUNDUS, PATCH, fundusSurface, vesselPaths } from "./specimen.js";

/** Orthographic scientific fallback for browsers without WebGL. Same µm chart. */
export function createFallback(host, { onSelect = () => {} } = {}) {
  const canvas = document.createElement("canvas");
  canvas.className = "rtl-canvas-anatomy";
  canvas.setAttribute("role", "img");
  canvas.setAttribute(
    "aria-label",
    "Orthographic retinal anatomy fallback. All geometry uses the shared retinal coordinates.",
  );
  host.append(canvas);
  const ctx = canvas.getContext("2d");
  let fundus, cachedConfig, cachedResult, layout;
  let latest = null,
    hit = [];
  function render() {
    if (!latest) return;
    const { config: c, result, view, layers = {}, frame = 0, overlay } = latest,
      w = host.clientWidth,
      h = host.clientHeight,
      dpr = Math.min(devicePixelRatio || 1, 1.5);
    canvas.width = w * dpr;
    canvas.height = h * dpr;
    canvas.style.width = w + "px";
    canvas.style.height = h + "px";
    ctx.scale(dpr, dpr);
    ctx.fillStyle = "#151b1c";
    ctx.fillRect(0, 0, w, h);
    hit = [];
    const cells = result?.neural.cells ?? population(c),
      cell = cells[c.neural.selectedIndex],
      rng = random(c.seed),
      pv = c.modality === "photovoltaic",
      whole = view === "whole";
    if (cachedConfig !== c || cachedResult !== result) {
      layout =
        c.modality === "optogenetic"
          ? null
          : implantLayout(c, result?.electrical?.contacts);
      cachedConfig = c;
      cachedResult = result;
    }
    const contacts = layout?.contacts ?? [];
    ctx.font = "10px Arial";
    ctx.fillStyle = "#9caeac";
    ctx.fillText("ORTHOGRAPHIC ANATOMY · WebGL unavailable", 16, h - 17);
    if (whole || view === "plan") {
      const scale = whole
        ? Math.min(w / 15000, (h - 110) / 12000)
        : Math.min((w - 42) / PATCH.width, (h - 120) / PATCH.height);
      const cx = w / 2 - (whole ? 0 : cell.xUm * scale);
      const cy = h / 2 + (whole ? 0 : cell.yUm * scale) + 8;
      const xy = (x, y) => [cx + x * scale, cy - y * scale];
      if (layers.retina !== false) {
        fundus ??= fundusSurface();
        ctx.save();
        ctx.beginPath();
        ctx.ellipse(
          cx,
          cy,
          FUNDUS.rx * scale,
          FUNDUS.ry * scale,
          0,
          0,
          Math.PI * 2,
        );
        ctx.clip();
        ctx.drawImage(
          fundus,
          cx - FUNDUS.rx * scale,
          cy - FUNDUS.ry * scale,
          2 * FUNDUS.rx * scale,
          2 * FUNDUS.ry * scale,
        );
        ctx.restore();
      }
      if (layers.vessels !== false)
        for (const { points, radius, vein } of vesselPaths([4205, -407])) {
          ctx.strokeStyle = vein ? "#692e33" : "#bc5d46";
          ctx.lineCap = "round";
          for (let i = 1; i < points.length; i++) {
            ctx.lineWidth = Math.max(
              0.3,
              scale * 2 * radius * (1 - (0.83 * i) / (points.length - 1)),
            );
            ctx.beginPath();
            ctx.moveTo(...xy(...points[i - 1]));
            ctx.lineTo(...xy(...points[i]));
            ctx.stroke();
          }
        }
      ctx.fillStyle = "#ddc8a4";
      ctx.beginPath();
      const disc = xy(4205, -407);
      ctx.ellipse(...disc, scale * 410, scale * 650, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#433529";
      ctx.beginPath();
      ctx.arc(cx, cy, scale * 190, 0, Math.PI * 2);
      ctx.fill();
      if (result && overlay !== "none") {
        const sample = overlaySampler(c, result, overlay, frame);
        for (let i = 0; i < cells.length; i++) {
          const p = cells[i],
            v = sample(p.xUm, p.yUm, i);
          ctx.fillStyle = `rgba(${v < 0 ? "78,173,218" : "240,182,91"},${Math.min(0.7, Math.abs(v) * 0.7)})`;
          ctx.beginPath();
          ctx.arc(
            ...xy(p.xUm, p.yUm),
            Math.max(2, scale * 160),
            0,
            Math.PI * 2,
          );
          ctx.fill();
        }
      }
      if (layers.device !== false && c.modality !== "optogenetic")
        for (const p of contacts) {
          const pos = xy(p.xUm, p.yUm);
          ctx.fillStyle =
            p.id ===
            (pv ? c.photovoltaic.selectedPixelId : c.electrical.selectedId)
              ? "#f5c873"
              : "#c7b898";
          ctx.strokeStyle = "#ead8a4";
          ctx.lineWidth = 0.5;
          ctx.beginPath();
          ctx.arc(...pos, Math.max(0.8, p.radiusUm * scale), 0, Math.PI * 2);
          ctx.fill();
          hit.push({
            id: p.id,
            x: pos[0],
            y: pos[1],
            radius: Math.max(5, p.radiusUm * scale),
          });
        }
      ctx.fillStyle = "#d1c3a5";
      if (layers.labels !== false) ctx.fillText("FOVEA", cx - 20, cy + 30);
      if (layers.labels !== false)
        ctx.fillText("OPTIC DISC", disc[0] - 27, disc[1] + scale * 800);
      ctx.fillText(whole ? "1 mm" : "100 µm", 20, h - 40);
      ctx.strokeStyle = "#dacdb3";
      ctx.beginPath();
      ctx.moveTo(20, h - 50);
      ctx.lineTo(20 + (whole ? 1000 : 100) * scale, h - 50);
      ctx.stroke();
      return;
    }
    const cx = cell.xUm,
      cy = cell.yUm,
      width = PATCH.width,
      L = layersAt(cx, cy),
      surface = retinalSurface(cx, cy),
      delta = (x) => surface - retinalSurface(x, cy),
      columns = Array.from({ length: 65 }, (_, i) => {
        const x = cx + width * (i / 64 - 0.5);
        return {
          x,
          layers: layersAt(x, cy),
          clearance: layout && localClearance(layout, c, x, cy),
        };
      }),
      minDepth = Math.min(
        0,
        ...columns.map((p) => delta(p.x)),
        ...columns.map((p) =>
          p.clearance
            ? surface - p.clearance.face - (pv ? 0 : layout.thickness)
            : 0,
        ),
      ),
      depth = Math.max(
        ...columns.map((p) => delta(p.x) + p.layers.at(-1).bottom),
        ...columns.map((p) =>
          p.clearance
            ? surface - p.clearance.face + (pv ? layout.thickness : 0)
            : 0,
        ),
      ),
      scale = Math.min((w - 74) / width, (h - 150) / (depth - minDepth)),
      left = (w - width * scale) / 2 - 13,
      top = (h - (depth - minDepth) * scale) / 2 - minDepth * scale + 12,
      xy = (x, z) => [
        left + (x - cx + width / 2) * scale,
        top + (z + delta(x)) * scale,
      ];
    if (layers.retina !== false)
      for (const [i, l] of L.entries()) {
        ctx.beginPath();
        columns.forEach((p, k) => {
          const a = xy(p.x, p.layers[i].top);
          if (!k) ctx.moveTo(...a);
          else ctx.lineTo(...a);
        });
        for (const p of [...columns].reverse())
          ctx.lineTo(...xy(p.x, p.layers[i].bottom));
        ctx.closePath();
        ctx.fillStyle = l.color + "52";
        ctx.fill();
        ctx.strokeStyle = l.color + "70";
        ctx.lineWidth = 0.65;
        ctx.stroke();
        if (layers.labels !== false) {
          const p = columns.at(-1),
            layer = p.layers[i];
          const a = xy(p.x, (layer.top + layer.bottom) / 2);
          ctx.fillStyle = "#ced4c8";
          ctx.fillText(l.id, a[0] + 5, a[1] + 3);
        }
      }
    const line = (a, b, color, r = 1) => {
      ctx.strokeStyle = color;
      ctx.lineWidth = Math.max(0.45, r * scale * 1.7);
      ctx.beginPath();
      ctx.moveTo(...xy(a[0], a[1]));
      ctx.lineTo(...xy(b[0], b[1]));
      ctx.stroke();
    };
    const soma = (x, z, r, color, tall = 1) => {
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.ellipse(...xy(x, z), r * scale, r * scale * tall, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#1f2b334d";
      ctx.beginPath();
      ctx.arc(...xy(x, z), r * scale * 0.55, 0, Math.PI * 2);
      ctx.fill();
    };
    for (let i = 0; i < 105; i++) {
      const x = cx - width / 2 + (i * width) / 104,
        ls = layersAt(x, cy),
        layer = (id) => ls.find((l) => l.id === id),
        sv = tissueAt(x, cy, c.tissue),
        cone = Math.hypot(x, cy) < 180 || rng() < 0.2;
      if (layers.photoreceptors !== false && rng() < sv.photoreceptor) {
        const z = layer("OS").top;
        line([x, z], [x, z + 29], cone ? "#d4b789" : "#9ba59f", cone ? 2.5 : 1);
        line(
          [x, layer("IS").top],
          [x, z],
          cone ? "#d6c59e" : "#bcc2b3",
          cone ? 3 : 1.7,
        );
        soma(x, layer("ONL").top + 10 + rng() * 25, 2.7, "#aeb6bf", 1.6);
        line(
          [x, layer("ONL").bottom],
          [x, layer("OPL").top + 3],
          "#a1adb7",
          0.45,
        );
      }
      if (layers.retina !== false && i % 2 === 0)
        soma(x, layer("RPE").top + 5, 7, "#755449", 0.55);
      if (layers.interneurons !== false && i % 2 === 0 && rng() < sv.bipolar) {
        const z = layer("INL").top + 8 + rng() * 14,
          on = i % 4 === 0,
          ipl = layer("IPL"),
          end = ipl.top + ipl.thickness * (on ? 0.72 : 0.28),
          color = on ? "#87bdaa" : "#d0b57b";
        soma(x, z, 3.1, color);
        line([x, z], [x + 3, end], color, 0.55);
        for (let k = 0; k < 4; k++) {
          line(
            [x + 3, end],
            [x - 16 + rng() * 32, end + (rng() - 0.5) * 6],
            color,
            0.4,
          );
          line([x, z], [x - 9 + rng() * 18, layer("OPL").top + 6], color, 0.4);
        }
      }
    }
    if (layers.glia !== false) {
      const glialRandom = random(c.seed + 577);
      for (let i = 0; i < 16; i++) {
        const x = cx + (glialRandom() - 0.5) * width,
          layer = layersAt(x, cy);
        const nucleus = (layer[3].top + layer[3].bottom) / 2;
        const outer = [x + 5, layer[5].bottom],
          inner = [x - 4, 2],
          mid = [x, nucleus];
        line(inner, mid, "#78a496", 0.9);
        line(mid, outer, "#78a496", 0.9);
        line([inner[0] - 5, 2], [inner[0] + 5, 2], "#94b8a8", 1.2);
        soma(x, nucleus, 2.4, "#8fa69b", 1.55);
      }
    }
    if (layers.ganglion !== false) {
      for (let i = 0; i < 12; i++) {
        const x = cx + (i / 11 - 0.5) * width,
          ls = layersAt(x, cy),
          g = ls.find((l) => l.id === "GCL"),
          p = ls.find((l) => l.id === "IPL"),
          m = {
            ...cell,
            xUm: x,
            depthUm: g.top + g.thickness * 0.45,
            dendriteDepthUm: p.top + p.thickness * (i % 2 ? 0.72 : 0.28),
            seed: c.seed + 707 * i,
            kind: i % 4 ? "midget" : "parasol",
          };
        if (
          Math.hypot(x, cy) < 180 ||
          rng() > tissueAt(x, cy, c.tissue).ganglion
        )
          continue;
        const tree = morphology(m, { count: 45 });
        for (let k = 1; k < tree.length; k++) {
          const a = tree[k],
            b = tree[a.parent];
          line(
            [a.xUm, a.depthUm],
            [b.xUm, b.depthUm],
            a.type === "axon" || a.type === "ais" ? "#cab27e" : "#bda7a7",
            a.radiusUm,
          );
        }
        soma(x, m.depthUm, m.kind === "parasol" ? 8 : 5.5, "#d1b8ad");
      }
    }
    if (result && overlay !== "none") {
      const sample = overlaySampler(c, result, overlay, frame);
      for (const [i, p] of cells.entries()) {
        if (
          Math.abs(p.xUm - cx) > width / 2 ||
          Math.abs(p.yUm - cy) > PATCH.height / 2
        )
          continue;
        const v = sample(p.xUm, p.yUm, i);
        ctx.fillStyle = `rgba(${v < 0 ? "78,173,218" : "240,182,91"},${Math.min(0.77, Math.abs(v) * 0.77)})`;
        ctx.beginPath();
        ctx.arc(
          ...xy(p.xUm, p.depthUm),
          Math.max(3, 8 * scale),
          0,
          2 * Math.PI,
        );
        ctx.fill();
      }
    }
    if (layers.device !== false && layout) {
      const samples = columns.filter((p) => p.clearance);
      const profile = carrierSection(layout, c, cx, cy, width);
      if (profile.length) {
        ctx.beginPath();
        for (const [i, p] of profile.entries()) {
          const x = xy(p.x, 0)[0],
            y = top + (surface - p.face) * scale;
          if (i) ctx.lineTo(x, y);
          else ctx.moveTo(x, y);
        }
        for (const p of [...profile].reverse())
          ctx.lineTo(xy(p.x, 0)[0], top + (surface - p.back) * scale);
        ctx.closePath();
        ctx.fillStyle = pv ? "#626e7b" : "#77938baa";
        ctx.fill();
      }
      for (const p of contacts) {
        const dy = p.yUm - cy;
        if (Math.abs(dy) > p.radiusUm) continue;
        const dx = Math.sqrt(p.radiusUm ** 2 - dy ** 2);
        const x1 = Math.max(cx - width / 2, p.xUm - dx),
          x2 = Math.min(cx + width / 2, p.xUm + dx);
        if (x1 > x2) continue;
        const mx = (x1 + x2) / 2,
          x = xy(mx, 0)[0],
          py = top + (surface - layout.surface(mx, cy)) * scale;
        ctx.fillStyle = "#dfbe80";
        ctx.fillRect(xy(x1, 0)[0], py - 1, (x2 - x1) * scale, 2.5);
        hit.push({
          id: p.id,
          x,
          y: py,
          radius: Math.max(6, ((x2 - x1) * scale) / 2),
        });
      }
      const p = samples[Math.floor(samples.length * 0.23)];
      if (p && layers.labels !== false) {
        const px = xy(p.x, 0)[0],
          y1 = top + (surface - p.clearance.reference) * scale,
          y2 = top + (surface - p.clearance.face) * scale;
        ctx.strokeStyle = "#a7ded2";
        ctx.fillStyle = "#cdf5e9";
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(px, y1);
        ctx.lineTo(px, y2);
        for (const y of [y1, y2]) {
          ctx.moveTo(px - 4, y);
          ctx.lineTo(px + 4, y);
        }
        ctx.stroke();
        ctx.fillText(
          Math.round(p.clearance.gapUm) + " µm",
          px + 5,
          (y1 + y2) / 2,
        );
      }
    }
    ctx.fillStyle = "#bfb69e";
    ctx.fillText("VITREOUS", left, Math.max(65, top - 30));

    ctx.strokeStyle = "#d9cdb4";
    ctx.beginPath();
    ctx.moveTo(left, h - 49);
    ctx.lineTo(left + 100 * scale, h - 49);
    ctx.stroke();
    ctx.fillText("100 µm", left, h - 35);
  }
  const resize = new ResizeObserver(render);
  resize.observe(host);
  canvas.addEventListener("click", (e) => {
    const b = canvas.getBoundingClientRect(),
      x = e.clientX - b.left,
      y = e.clientY - b.top,
      p = hit.find((q) => Math.hypot(x - q.x, y - q.y) < q.radius);
    if (p) onSelect(p.id);
  });
  return {
    update(v) {
      latest = v;
      render();
    },
    reset: render,
    dispose() {
      resize.disconnect();
      canvas.remove();
    },
  };
}
