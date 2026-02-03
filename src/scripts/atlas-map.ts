import L from "leaflet";
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

function init() {
  const el = document.getElementById("map") as HTMLElement | null;
  if (!el) return;

  const points = getPointsFromDom(el);

  const map = L.map(el, { scrollWheelZoom: true });

  // OSM tiles (simple + reliable).
  L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    maxZoom: 18,
    attribution: "&copy; OpenStreetMap contributors",
  }).addTo(map);

  if (!points.length) {
    map.setView([20, 0], 2);
    return;
  }

  const bounds: Array<[number, number]> = [];
  for (const p of points) {
    const marker = L.marker([p.lat, p.lon]).addTo(map);
    bounds.push([p.lat, p.lon]);

    const safeTitle = escapeHtml(String(p.title || ""));
    const safeLoc = p.location ? escapeHtml(String(p.location)) : "";

    const html = `
      <div style="font-family: 'Times New Roman', Times, serif;">
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

  map.fitBounds(bounds as any, { padding: [24, 24] });
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", init);
} else {
  init();
}
