// Keep section labels legible as the camera moves while the leader tips stay
// registered to their physical layer centers on the exposed face.
const SVG = "http://www.w3.org/2000/svg";
const names = [
  "Nerve fiber",
  "Ganglion cells",
  "Inner plexiform",
  "Inner nuclear",
  "Outer plexiform",
  "Outer nuclear",
  "Inner segments",
  "Outer segments",
  "Pigment epithelium",
];

export function sectionLabels(host) {
  const svg = document.createElementNS(SVG, "svg");
  svg.classList.add("rtl-section-labels");
  svg.setAttribute("aria-hidden", "true");
  const rows = names.map(() => {
    const line = document.createElementNS(SVG, "polyline");
    const label = document.createElementNS(SVG, "text");
    svg.append(line, label);
    return { line, label };
  });
  host.append(svg);
  return {
    update(anchors, camera) {
      svg.style.display = anchors ? "block" : "none";
      if (!anchors) return;
      const w = host.clientWidth,
        h = host.clientHeight;
      const right = w - (w > 620 ? 103 : 36);
      const projected = anchors.map(({ position }) =>
        position.clone().project(camera),
      );
      const center =
        projected.reduce((sum, p) => sum + ((1 - p.y) * h) / 2, 0) /
        rows.length;
      const start = Math.min(h - 165, Math.max(75, center - 62));
      rows.forEach(({ line, label }, i) => {
        const p = projected[i],
          x = ((p.x + 1) * w) / 2,
          y = ((1 - p.y) * h) / 2,
          end = start + 15 * i;
        line.setAttribute(
          "points",
          [
            [x, y],
            [right - 24, y],
            [right - 7, end],
            [right - 3, end],
          ]
            .map((v) => v.join(","))
            .join(" "),
        );
        label.setAttribute("x", right);
        label.setAttribute("y", end + 3);
        label.textContent = w > 620 ? names[i] : anchors[i].id;
      });
    },
    dispose() {
      svg.remove();
    },
  };
}
