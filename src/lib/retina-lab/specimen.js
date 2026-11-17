// Illustrative posterior pole and cut faces. All mesh vertices use the laboratory's
// right-eye chart and its existing depth model. Textures are procedural, not scans.
import * as THREE from "three";
import { layersAt, random, tissueAt } from "./anatomy.mjs";
import { retinalSurface } from "./coordinates.mjs";

const TAU = 2 * Math.PI;
export const FUNDUS = { rx: 7000, ry: 5500 };
export const PATCH = { width: 850, height: 500 };

function texturedMesh(positions, indices, uv, texture, color = 0xffffff) {
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  g.setAttribute("uv", new THREE.Float32BufferAttribute(uv, 2));
  g.setIndex(indices);
  g.computeVertexNormals();
  const material = new THREE.MeshStandardMaterial({
    color,
    map: texture,
    side: THREE.DoubleSide,
    roughness: 0.94,
    metalness: 0,
  });
  return new THREE.Mesh(g, material);
}

function paint(w, h) {
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  return canvas.getContext("2d");
}

function textureOf(canvas) {
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

// The same chart texture is used for the 3D bowl and the software plan view.
export function fundusSurface() {
  const ctx = paint(768, 640);
  const image = ctx.createImageData(768, 640);
  const rng = random(1537);
  for (let j = 0; j < image.height; j++) {
    for (let i = 0; i < image.width; i++) {
      const x = ((2 * i) / image.width - 1) * FUNDUS.rx;
      const y = (1 - (2 * j) / image.height) * FUNDUS.ry;
      const radius = Math.hypot(x / FUNDUS.rx, y / FUNDUS.ry);
      const macula = Math.exp(-(x * x + y * y) / (2 * 1140 ** 2));
      const fovea = Math.exp(-(x * x + y * y) / (2 * 210 ** 2));
      const mottling =
        Math.sin(0.006 * x + Math.sin(0.003 * y)) * Math.cos(0.005 * y) +
        0.45 * Math.sin(0.023 * x + 0.012 * y) * Math.cos(0.021 * y);
      const light = 1.11 - 0.34 * radius - 0.26 * macula - 0.18 * fovea;
      const grain = (rng() - 0.5) * 12 + mottling * 3;
      const k = (j * image.width + i) * 4;
      image.data.set(
        [
          153 * light + grain,
          73 * light + grain * 0.65,
          49 * light + grain * 0.5,
          255,
        ],
        k,
      );
    }
  }
  ctx.putImageData(image, 0, 0);
  return ctx.canvas;
}

export function posteriorBowl() {
  const pos = [],
    uv = [],
    faces = [];
  const rings = 44,
    slices = 128;
  for (let j = 0; j <= rings; j++) {
    for (let i = 0; i <= slices; i++) {
      const a = (TAU * i) / slices,
        u = (j / rings) * Math.cos(a),
        v = (j / rings) * Math.sin(a);
      const x = u * FUNDUS.rx,
        y = v * FUNDUS.ry;
      pos.push(x / 1000, y / 1000, retinalSurface(x, y) / 1000);
      uv.push((1 + u) / 2, (1 + v) / 2);
      if (i && j) {
        const b = pos.length / 3 - 1,
          a = b - slices - 1;
        faces.push(a - 1, b - 1, b, a - 1, b, a);
      }
    }
  }
  return texturedMesh(pos, faces, uv, textureOf(fundusSurface()));
}

// Asymmetric representative arterial and venous arcades. These are visual
// landmarks only. The Jansonius bundle asset remains the axon overlay.
export function vesselPaths(disc) {
  const paths = [];
  function cubic(a, b, c, d, t) {
    const u = 1 - t;
    return [0, 1].map(
      (i) =>
        u * u * u * a[i] +
        3 * u * u * t * b[i] +
        3 * u * t * t * c[i] +
        t * t * t * d[i],
    );
  }
  function branch(a, b, c, d, radius, vein) {
    const points = Array.from({ length: 37 }, (_, i) =>
      cubic(a, b, c, d, i / 36),
    );
    paths.push({ points, radius, vein });
    return points;
  }
  for (const side of [-1, 1])
    for (const vein of [false, true]) {
      const v = Number(vein),
        s = side;
      const main = branch(
        [disc[0] + v * 48, disc[1]],
        [3350 + s * 240, s * (3000 + v * 560)],
        [250, s * (3650 + v * 360)],
        [-4700 + v * 500, s * (1380 + v * 710)],
        v ? 55 : 39,
        vein,
      );
      for (const [i, dx, dy] of [
        [7, 940, 1470],
        [13, 330, 1880],
        [20, -540, 1570],
        [25, -900, -900],
        [30, -960, 920],
      ]) {
        const p = main[i];
        branch(
          p,
          [p[0] - 100, p[1] + s * dy * 0.24],
          [p[0] + dx * 0.78, p[1] + s * dy * 0.63],
          [p[0] + dx, p[1] + s * dy],
          v ? 20 : 15,
          vein,
        );
      }
      branch(
        disc,
        [disc[0] + 700, s * 560],
        [4900 + v * 290, s * 1300],
        [5300 + v * 240, s * (2100 + v * 330)],
        v ? 34 : 25,
        vein,
      );
    }
  return paths;
}

// Expose free-standing cells in front of a cut block. Laminae meet at shared
// boundaries sampled from layersAt; the section narrows naturally at the fovea.
export function cutBlock(cx, cy, config, front) {
  const layers = layersAt(cx, cy);
  const group = new THREE.Group();
  const w = PATCH.width,
    h = PATCH.height;
  const back = cy + h * 0.5;
  const palette = [
    "#b9a48e",
    "#af8980",
    "#a78073",
    "#a07b80",
    "#a78372",
    "#9f7980",
    "#bd9278",
    "#a27c58",
    "#553e39",
  ];
  for (const [layerIndex, layer] of layers.entries()) {
    const ctx = paint(768, 96),
      rng = random(config.seed + layerIndex * 1049);
    ctx.fillStyle = palette[layerIndex];
    ctx.fillRect(0, 0, 768, 96);
    const nuclear = ["INL", "ONL", "GCL"].includes(layer.id);
    const segment = ["IS", "OS"].includes(layer.id);
    for (let i = 0; i < (nuclear ? 940 : segment ? 350 : 1800); i++) {
      const u = rng(),
        v = rng(),
        x = u * 768,
        y = v * 96;
      const survival = tissueAt(cx + (u - 0.5) * w, front, config.tissue);
      if ((segment || layer.id === "ONL") && rng() > survival.photoreceptor)
        continue;
      if (layer.id === "GCL" && rng() > survival.ganglion) continue;
      if (layer.id === "INL" && rng() > survival.bipolar) continue;
      if (nuclear) {
        ctx.fillStyle = i % 3 ? "rgba(74,42,61,.48)" : "rgba(238,200,165,.48)";
        ctx.beginPath();
        ctx.ellipse(x, y, 1.9 + rng() * 1.4, 3 + rng() * 3, 0.14, 0, TAU);
        ctx.fill();
      } else {
        ctx.strokeStyle =
          i % 2 ? "rgba(241,204,170,.18)" : "rgba(63,39,42,.18)";
        ctx.lineWidth = segment ? 1.25 : 0.7;
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.lineTo(
          x + (segment ? 1 : 9 + rng() * 12),
          y + (segment ? 35 : rng() * 5 - 2),
        );
        ctx.stroke();
      }
    }
    const tex = textureOf(ctx.canvas);
    const pos = [],
      uv = [],
      indices = [];
    const addFace = (start, end, bottom, top) => {
      const base = pos.length / 3;
      for (let j = 0; j < 2; j++)
        for (let k = 0; k <= 40; k++) {
          const t = k / 40;
          const x = start[0] + (end[0] - start[0]) * t,
            y = start[1] + (end[1] - start[1]) * t;
          const layerHere = layersAt(x, y)[layerIndex];
          const depth = layerHere[j ? top : bottom];
          pos.push(x / 1000, y / 1000, (retinalSurface(x, y) - depth) / 1000);
          uv.push(t, j);
          if (j && k) {
            const n = base + 41 + k;
            indices.push(n - 42, n - 41, n, n - 42, n, n - 1);
          }
        }
    };
    const left = cx - w / 2,
      right = cx + w / 2;
    for (const [a, b] of [
      [
        [left, front],
        [right, front],
      ],
      [
        [right, front],
        [right, back],
      ],
      [
        [right, back],
        [left, back],
      ],
      [
        [left, back],
        [left, front],
      ],
    ])
      addFace(a, b, "bottom", "top");
    group.add(texturedMesh(pos, indices, uv, tex));
  }
  return group;
}

// Polygonal pigment epithelium. Its apical mosaic coats the curved RPE floor.
export function pigmentTexture(seed) {
  const ctx = paint(768, 452),
    rng = random(seed + 577);
  ctx.fillStyle = "#493735";
  ctx.fillRect(0, 0, 768, 452);
  const r = 9,
    step = Math.sqrt(3) * r;
  for (let row = -1; row < 36; row++)
    for (let col = -1; col < 52; col++) {
      const x = (col + (row % 2) * 0.5) * step,
        y = row * r * 1.5;
      const lum = 42 + Math.floor(16 * rng());
      ctx.fillStyle =
        "rgb(" + [lum * 1.7, lum * 1.17, lum].map(Math.round).join(",") + ")";
      ctx.beginPath();
      for (let i = 0; i < 6; i++) {
        const a = ((i + 0.5) * TAU) / 6,
          px = x + (r - 0.3) * Math.cos(a),
          py = y + (r - 0.3) * Math.sin(a);
        if (i) ctx.lineTo(px, py);
        else ctx.moveTo(px, py);
      }
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = "rgba(47,33,34,.45)";
      ctx.beginPath();
      ctx.ellipse(x + rng() - 1, y, 2.7, 2, 0.2, 0, TAU);
      ctx.fill();
    }
  return textureOf(ctx.canvas);
}
