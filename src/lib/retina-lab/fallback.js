import {
  layersAt,
  population,
  morphology,
  random,
  tissueAt,
} from "./anatomy.mjs";
import { placePoint } from "./coordinates.mjs";
import { generateContacts } from "../retinal-implant/model.mjs";
import { createPrimaGeometry } from "../prima/geometry.mjs";

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
    const contacts = pv
      ? createPrimaGeometry().pixels.map((p) => ({
          ...p,
          ...placePoint(p, c.placement),
          radiusUm: 15,
        }))
      : (result?.electrical?.contacts ??
        c.customContacts?.map((p) => ({
          ...p,
          ...placePoint(p, c.placement),
        })) ??
        generateContacts({ ...c.electrical, ...c.placement }));
    ctx.font = "10px Arial";
    ctx.fillStyle = "#9caeac";
    ctx.fillText("ORTHOGRAPHIC ANATOMY · WebGL unavailable", 16, h - 17);
    if (whole || view === "plan") {
      const scale = Math.min(w / 15000, (h - 120) / 12000),
        cx = w / 2,
        cy = h / 2 + 15,
        xy = (x, y) => [cx + x * scale, cy - y * scale];
      ctx.beginPath();
      ctx.ellipse(cx, cy, 6800 * scale, 5300 * scale, 0, 0, Math.PI * 2);
      const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, 6500 * scale);
      grad.addColorStop(0, "#6d4c39");
      grad.addColorStop(0.28, "#957058");
      grad.addColorStop(1, "#443c34");
      ctx.fillStyle = grad;
      ctx.fill();
      for (const sign of [-1, 1])
        for (let k = 0; k < 6; k++) {
          ctx.strokeStyle = k % 2 ? "#b78e63" : "#803e39";
          ctx.lineWidth = 1.2 + scale * 16;
          ctx.beginPath();
          for (let i = 0; i <= 45; i++) {
            const t = i / 45,
              p = xy(
                4200 - (5000 + k * 400) * t,
                -300 + sign * (1200 + k * 420) * Math.sin(t * Math.PI * 0.75),
              );
            if (i) ctx.lineTo(...p);
            else ctx.moveTo(...p);
          }
          if (layers.vessels !== false) ctx.stroke();
        }
      ctx.fillStyle = "#ddc8a4";
      ctx.beginPath();
      const disc = xy(4200, -300);
      ctx.ellipse(...disc, scale * 410, scale * 650, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#433529";
      ctx.beginPath();
      ctx.arc(cx, cy, scale * 190, 0, Math.PI * 2);
      ctx.fill();
      if (result && overlay !== "none") {
        for (let i = 0; i < cells.length; i++) {
          const p = cells[i],
            v =
              overlay === "damage"
                ? p.survival.damage
                : overlay === "light"
                  ? result.drive.incidentLight[i] / 4
                  : overlay === "field"
                    ? (result.drive.ganglionMv[i] + result.drive.bipolarMv[i]) /
                      Math.max(
                        1,
                        result.metrics.peakGanglionDriveMv +
                          result.metrics.peakBipolarDriveMv,
                      )
                    : overlay === "heat"
                      ? (result.thermal?.peakDeltaK ?? 0) / 0.1
                      : (result.neural.frames[
                          Math.min(frame, result.neural.frames.length - 1)
                        ]?.activity[i] ?? 0) / 2;
          ctx.fillStyle = `rgba(239,185,90,${Math.min(0.7, v * 0.7)})`;
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
          ctx.fillStyle = pv ? "#c9b584" : "#dacbb3";
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
      ctx.fillText("FOVEA", cx - 20, cy + 30);
      ctx.fillText("OPTIC DISC", disc[0] - 27, disc[1] + scale * 800);
      ctx.fillText("1 mm", 20, h - 40);
      ctx.strokeStyle = "#dacdb3";
      ctx.beginPath();
      ctx.moveTo(20, h - 50);
      ctx.lineTo(20 + 1000 * scale, h - 50);
      ctx.stroke();
      return;
    }
    const cx = cell.xUm,
      cy = cell.yUm,
      width = 850,
      L = layersAt(cx, cy),
      depth = L.at(-1).bottom,
      scale = Math.min((w - 105) / width, (h - 150) / depth),
      left = (w - width * scale) / 2 - 15,
      top = (h - depth * scale) / 2 + 20,
      xy = (x, z) => [left + (x - cx + width / 2) * scale, top + z * scale];
    if (layers.retina !== false)
      for (const l of L) {
        ctx.fillStyle = l.color + "25";
        ctx.fillRect(
          left,
          top + l.top * scale,
          width * scale,
          l.thickness * scale,
        );
        ctx.strokeStyle = l.color + "50";
        ctx.lineWidth = 0.6;
        ctx.beginPath();
        ctx.moveTo(left, top + l.bottom * scale);
        ctx.lineTo(left + width * scale, top + l.bottom * scale);
        ctx.stroke();
        if (layers.labels !== false) {
          ctx.fillStyle = "#b9bdad";
          ctx.fillText(
            l.id,
            left + width * scale + 8,
            top + (l.top + l.thickness / 2) * scale + 3,
          );
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
    if (layers.device !== false && c.modality !== "optogenetic") {
      const z = pv
        ? L.find((l) => l.id === "INL").bottom + c.photovoltaic.gapUm
        : -c.electrical.gapUm;
      ctx.fillStyle = pv ? "#37404d" : "#667b7480";
      ctx.fillRect(left, top + z * scale, width * scale, (pv ? 30 : 8) * scale);
      for (const p of contacts) {
        if (Math.abs(p.xUm - cx) > width / 2 || Math.abs(p.yUm - cy) > 300)
          continue;
        const pos = xy(p.xUm, z);
        ctx.fillStyle = "#d2be90";
        ctx.fillRect(
          pos[0] - p.radiusUm * scale,
          pos[1] - 2,
          p.radiusUm * 2 * scale,
          3,
        );
        hit.push({ id: p.id, x: pos[0], y: pos[1], radius: 12 });
      }
    }
    ctx.fillStyle = "#bfb69e";
    ctx.fillText("VITREOUS", left, Math.max(65, top - 30));
    ctx.fillText("CHOROID", left, top + depth * scale + 22);
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
