import L, { type DivIcon } from "leaflet";
import "leaflet/dist/leaflet.css";

type Point = {
  slug: string;
  title: string;
  kind: string;
  region: string;
  website: string | null;
  location: string | null;
  lat: number;
  lon: number;
};

function escapeHtml(s: string) {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/\"/g, "&quot;");
}

function getPointsFromDom(el: HTMLElement): Point[] {
  const raw = el.getAttribute("data-points");
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as Point[]) : [];
  } catch {
    return [];
  }
}

function markerSizeForZoom(z: number) {
  // 2D "semi-3D" red dot pin grows as you zoom in.
  return Math.max(7, Math.min(20, 7 + (z - 2) * 1.15));
}

function makeIcon(sizePx: number): DivIcon {
  return L.divIcon({
    className: "atlasMarkerWrap",
    html: `<span class="atlasMarkerPin" style="display:block;width:${sizePx}px;height:${sizePx}px"></span>`,
    iconSize: [sizePx, sizePx],
    iconAnchor: [sizePx / 2, sizePx / 2],
    popupAnchor: [0, -Math.max(8, sizePx / 2 + 2)],
  });
}

function init() {
  const el = document.getElementById("map") as HTMLElement | null;
  if (!el) return;

  const points = getPointsFromDom(el);

  const map = L.map(el, {
    zoomControl: true,
    scrollWheelZoom: true,
    minZoom: 2,
    worldCopyJump: true,
  });

  // New outline/base: vector-like neutral basemap (no PNG/SVG fallback drift).
  L.tileLayer("https://{s}.basemaps.cartocdn.com/light_nolabels/{z}/{x}/{y}{r}.png", {
    maxZoom: 19,
    attribution: '&copy; OpenStreetMap contributors &copy; CARTO',
    subdomains: "abcd",
  }).addTo(map);

  if (!points.length) {
    map.setView([20, 0], 2);
    return;
  }

  const markers: L.Marker[] = [];
  const bounds: Array<[number, number]> = [];

  const baseSize = markerSizeForZoom(map.getZoom());
  for (const p of points) {
    const marker = L.marker([p.lat, p.lon], { icon: makeIcon(baseSize) }).addTo(map);
    markers.push(marker);
    bounds.push([p.lat, p.lon]);

    const safeTitle = escapeHtml(String(p.title || ""));
    const safeLoc = p.location ? escapeHtml(String(p.location)) : "";

    const html = `
      <div style="font-family: 'Bodoni MT Compressed', 'Bodoni MT', 'Times New Roman', serif;">
        <div style="font-weight:700; margin-bottom:6px;">${safeTitle}</div>
        <div style="opacity:0.75; margin-bottom:8px; font-size:12px; letter-spacing:0.06em; text-transform:uppercase;">
          ${escapeHtml(p.kind)} — ${escapeHtml(p.region)}
        </div>
        ${safeLoc ? `<div style="opacity:0.8; margin-bottom:10px;">${safeLoc}</div>` : ""}
        <div>
          <a href="/companies/${escapeHtml(p.slug)}/" style="text-decoration:underline; color:inherit;">Open brief →</a>
        </div>
      </div>
    `;

    marker.bindPopup(html);
  }

  map.fitBounds(bounds as L.LatLngBoundsExpression, { padding: [28, 28] });

  const applyMarkerScale = () => {
    const size = markerSizeForZoom(map.getZoom());
    const icon = makeIcon(size);
    for (const m of markers) m.setIcon(icon);
  };

  map.on("zoomend", applyMarkerScale);
  applyMarkerScale();
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", init);
} else {
  init();
}
