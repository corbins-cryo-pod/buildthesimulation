import { useEffect, useMemo, useState } from "preact/hooks";

import { groupDeviceEntries } from "../lib/device-families.js";
import { downloadCatalogCsv } from "../lib/catalog-csv.js";

import { getDeviceModel } from "../lib/devices/catalog.js";
import { getPicturedEntry } from "../lib/device-photos.js";

type DevicePhoto = {
  src: string;
  thumbnail: string;
  width: number;
  height: number;
  thumbnailWidth: number;
  thumbnailHeight: number;
  alt: string;
  kind: string;
  caption: string;
  credit: string;
  sourceUrl: string;
  sourceLabel: string;
  license: string;
  licenseUrl: string;
  changes?: string;
  versionNote?: string;
};

type DeviceEntry = {
  title: string;
  slug: string;
  description: string;
  order: number;
  device_id?: string;
  interface_class?: string;
  status?: string;
  modality?: string;
  website?: string;
  last_updated?: string;
  tags: string[];
  photo?: DevicePhoto | null;
};

function norm(s: string) {
  return (s ?? "").trim().toLowerCase();
}

function splitCsv(s: string | null) {
  if (!s) return [] as string[];
  return s
    .split(",")
    .map((x) => x.trim())
    .filter(Boolean);
}

function toTitleCase(s: string) {
  // Minimal “display” helper; keep words as-is for multiword labels.
  if (!s) return s;
  return s
    .split(" ")
    .map((w) => (w.length ? w[0].toUpperCase() + w.slice(1) : w))
    .join(" ");
}

const FACETS = {
  axis: [
    { label: "Any", value: "" },
    { label: "Cortex", value: "cortex" },
    { label: "Peripheral nerve", value: "peripheral nerve" },
    { label: "Spinal cord", value: "spinal cord" },
  ],
  interfaceType: [
    { label: "Any", value: "" },
    { label: "Other / chemical", value: "other" },
    { label: "Intracortical", value: "intracortical" },
    { label: "ECoG", value: "ecog" },
    { label: "sEEG", value: "seeg" },
    { label: "Endovascular", value: "endovascular" },
    { label: "PNI", value: "pni" },
    { label: "DBS", value: "dbs" },
    { label: "SCS", value: "scs" },
  ],
  directionality: [
    { label: "Recording", value: "recording" },
    { label: "Stimulation", value: "stimulation" },
    { label: "Bidirectional", value: "bidirectional" },
  ],
  formFactor: [
    { label: "Any", value: "" },
    { label: "Array", value: "array" },
    { label: "Cuff", value: "cuff" },
    { label: "Intrafascicular", value: "intrafascicular" },
    { label: "Regenerative", value: "regenerative" },
    { label: "Microelectrode", value: "microelectrode" },
    { label: "Thin film", value: "film" },
  ],
} as const;

export default function DevicesDirectory(props: { entries: DeviceEntry[] }) {
  const [stage, setStage] = useState("");
  const [modelsOnly, setModelsOnly] = useState(false);
  const [photosOnly, setPhotosOnly] = useState(false);
  const [initialized, setInitialized] = useState(false);
  const [query, setQuery] = useState("");
  const [axis, setAxis] = useState("");
  const [iface, setIface] = useState("");
  const [form, setForm] = useState("");
  const [dir, setDir] = useState<Set<string>>(new Set());

  // Load initial state from URL once.
  useEffect(() => {
    const url = new URL(window.location.href);
    const q = url.searchParams.get("q") ?? "";
    const axis0 = url.searchParams.get("axis") ?? "";
    const iface0 = url.searchParams.get("iface") ?? "";
    const form0 = url.searchParams.get("form") ?? "";
    const dir0 = splitCsv(url.searchParams.get("dir"));

    setStage(norm(url.searchParams.get("stage") ?? ""));
    setModelsOnly(url.searchParams.get("models") === "1");
    setPhotosOnly(url.searchParams.get("photos") === "1");
    setQuery(q);
    setAxis(norm(axis0));
    setIface(norm(iface0));
    setForm(norm(form0));
    setDir(new Set(dir0.map(norm).filter(Boolean)));
    setInitialized(true);
  }, []);

  // Keep URL in sync (shareable filters) without full navigation.
  useEffect(() => {
    if (!initialized) return;
    const url = new URL(window.location.href);

    if (stage) url.searchParams.set("stage", stage); else url.searchParams.delete("stage");
    if (modelsOnly) url.searchParams.set("models", "1"); else url.searchParams.delete("models");
    if (photosOnly) url.searchParams.set("photos", "1"); else url.searchParams.delete("photos");
    const q = query.trim();
    if (q) url.searchParams.set("q", q);
    else url.searchParams.delete("q");

    if (axis) url.searchParams.set("axis", axis);
    else url.searchParams.delete("axis");

    if (iface) url.searchParams.set("iface", iface);
    else url.searchParams.delete("iface");

    if (form) url.searchParams.set("form", form);
    else url.searchParams.delete("form");

    const dirList = [...dir].filter(Boolean).sort();
    if (dirList.length) url.searchParams.set("dir", dirList.join(","));
    else url.searchParams.delete("dir");

    window.history.replaceState({}, "", url);
  }, [query, axis, iface, form, dir, initialized, stage, modelsOnly, photosOnly]);

  const normalizedEntries = useMemo(() => {
    return props.entries.map((e) => {
      const tags = (e.tags ?? []).map(norm).filter(Boolean);
      const tagSet = new Set(tags);

      // Make search match also include common facet fields.
      const haystack = norm(
        [
          e.title,
          e.description,
          e.device_id,
          e.interface_class,
          e.status,
          e.modality,
          ...(e.tags ?? []),
        ].join(" \n")
      );

      const axisHit = FACETS.axis.map((x) => x.value).find((v) => v && tagSet.has(v)) ?? "";
      const ifaceHit =
        FACETS.interfaceType.map((x) => x.value).find((v) => v && tagSet.has(v)) ?? norm(e.interface_class ?? "");
      const formHit = FACETS.formFactor.map((x) => x.value).find((v) => v && tagSet.has(v)) ?? "";

      const dirHits: string[] = [];
      for (const d of FACETS.directionality) {
        if (tagSet.has(d.value)) dirHits.push(d.value);
      }

      return {
        ...e,
        _tags: tagSet,
        _haystack: haystack,
        _axis: axisHit,
        _iface: ifaceHit,
        _form: formHit,
        _dir: new Set(dirHits),
      };
    });
  }, [props.entries]);

  const filtered = useMemo(() => {
    const q = norm(query);
    return normalizedEntries.filter((e: any) => {
      if (stage && norm(e.status ?? "") !== stage) return false;
      if (modelsOnly && !getDeviceModel(e.device_id)) return false;
      if (photosOnly && !e.photo) return false;
      if (axis && e._axis !== axis && !e._tags.has(axis)) return false;
      if (iface && e._iface !== iface && !e._tags.has(iface)) return false;
      if (form && e._form !== form && !e._tags.has(form)) return false;

      // Directionality is multi-select AND.
      for (const d of dir) {
        const dn = norm(d);
        if (!dn) continue;
        if (!e._tags.has(dn)) return false;
      }

      if (q && !e._haystack.includes(q)) return false;
      return true;
    });
  }, [normalizedEntries, query, axis, iface, form, dir, stage, modelsOnly, photosOnly]);

  const grouped = useMemo(() => groupDeviceEntries(filtered), [filtered]);

  const photoCount = normalizedEntries.filter(entry => entry.photo).length;
  const hasFilters = query.trim() || axis || iface || form || dir.size || stage || modelsOnly || photosOnly;

  function clearAll() {
    setStage(""); setModelsOnly(false); setPhotosOnly(false);
    setQuery("");
    setAxis("");
    setIface("");
    setForm("");
    setDir(new Set());
  }

  function toggleDir(v: string) {
    const vn = norm(v);
    setDir((prev) => {
      const next = new Set(prev);
      if (next.has(vn)) next.delete(vn);
      else next.add(vn);
      return next;
    });
  }

  return (
    <section class="card device-directory">
      {photoCount > 0 && <div class="directory-view-row">
        <div class="directory-views" role="group" aria-label="Catalog view">
          <button type="button" aria-pressed={!photosOnly} onClick={() => setPhotosOnly(false)}>All interfaces</button>
          <button type="button" aria-pressed={photosOnly} onClick={() => setPhotosOnly(true)}>Photo gallery</button>
        </div>
        <span class="photo-coverage">{photoCount} pictured records</span>
      </div>}
      <div class="top">
        <label class="search">
          <span class="srOnly">Search devices</span>
          <input
            value={query}
            onInput={(e) => setQuery((e.target as HTMLInputElement).value)}
            placeholder="Search devices, interfaces, or descriptions…"
            spellcheck={false}
          />
        </label>

        <div class="topRight">
          <button type="button" class="clear" onClick={() => downloadCatalogCsv('device-catalog.csv', ['Device ID','Title','Evidence stage','Interface class','Modality','Model available','Last reviewed','Catalog URL','Primary source','Description'], filtered.map(e=>[e.device_id,e.title,e.status,e.interface_class,e.modality,getDeviceModel(e.device_id)?'yes':'no',e.last_updated,new URL(`/devices/${e.slug}/`,window.location.origin).href,e.website,e.description]))}>Export results CSV</button>
          <div class="count" role="status" aria-live="polite">{filtered.length} records / {grouped.length} cards</div>
          {hasFilters ? (
            <button type="button" class="clear" onClick={clearAll}>
              Clear
            </button>
          ) : null}
        </div>
      </div>

      <div class="body">
        <aside class="sidebar">
          <label class="stage">Evidence stage
            <select value={stage} onChange={(e) => setStage((e.target as HTMLSelectElement).value)}>
              <option value="">All stages</option>
              <option value="human">Human</option>
              <option value="preclinical">Preclinical</option>
              <option value="research">Research</option>
              <option value="theoretical">Theoretical</option>
            </select>
          </label>
          <label class="model-filter"><input type="checkbox" checked={modelsOnly} onChange={(e) => setModelsOnly((e.target as HTMLInputElement).checked)} /> Has a 3D reference model</label>
          <p class="stage-note">Stage describes the catalog's evidence category, not approval or clinical readiness.</p>

          <FacetRadio
            title="Axis"
            name="axis"
            value={axis}
            options={FACETS.axis}
            onChange={(v) => setAxis(norm(v))}
          />

          <FacetRadio
            title="Interface type"
            name="iface"
            value={iface}
            options={FACETS.interfaceType}
            onChange={(v) => setIface(norm(v))}
          />

          <FacetMulti
            title="Directionality"
            values={dir}
            options={FACETS.directionality}
            onToggle={(v) => toggleDir(v)}
          />

          <FacetRadio
            title="Form factor"
            name="form"
            value={form}
            options={FACETS.formFactor}
            onChange={(v) => setForm(norm(v))}
          />
        </aside>

        <div class="results">
          <div class="grid">
            {grouped.map(({family, entries, representative: e}: any) => {
              const pictured = getPicturedEntry(entries, e);
              return (
              <article key={family?.id ?? e.slug} class={`item familyCard ${pictured ? 'has-photo' : ''}`}>
                {pictured && <figure class="catalog-photo">
                  <a class="catalog-photo-image" href={`/devices/${pictured.slug}/`} aria-label={`View images and specifications of ${pictured.title}`}>
                    <img src={pictured.photo.thumbnail} srcSet={pictured.photo.width > pictured.photo.thumbnailWidth ? `${pictured.photo.thumbnail} ${pictured.photo.thumbnailWidth}w, ${pictured.photo.src} ${pictured.photo.width}w` : undefined} sizes="(max-width: 900px) calc(100vw - 84px), 360px" width={pictured.photo.width} height={pictured.photo.height} loading="lazy" decoding="async" alt={pictured.photo.alt} />
                    <span class="photo-hover" aria-hidden="true">View the interface <span>↗</span></span>
                  </a>
                  <figcaption>
                    <span>{pictured.photo.kind}{pictured.photo.additionalViews?.length ? ` · ${pictured.photo.additionalViews.length + 1} views` : ''}</span>
                    <span class="photo-record">{pictured.device_id}</span>
                  </figcaption>
                  <p class="catalog-photo-caption">{pictured.photo.caption}</p>
                  {pictured.slug !== e.slug && <p class="pictured-version">Pictured: <a href={`/devices/${pictured.slug}/`}>{pictured.title}</a>. Other family versions differ.</p>}
                </figure>}
                {family && <div class="familyLabel">{family.title} - {family.kind}</div>}
                <a class="primaryEntry" href={`/devices/${e.slug}/`}>
                  <h3 class="itemTitle">{e.title}</h3>
                  <p class="desc">{e.description}</p>
                </a>
                {family && <p class="familyNote">{family.summary}</p>}
                <div class="badges">
                  {getDeviceModel(e.device_id) && <span class="badge">3D model available</span>}
                  {e._iface && <span class="badge">{toTitleCase(e._iface)}</span>}
                  {e.status && <span class="badge">{toTitleCase(e.status)} evidence</span>}
                </div>
                {pictured && <details class="catalog-photo-credit">
                  <summary>Photo credit</summary>
                  <p>{pictured.photo.credit} · <a href={pictured.photo.sourceUrl} target="_blank" rel="noopener noreferrer">{pictured.photo.sourceLabel}</a> · <a href={pictured.photo.licenseUrl} target="_blank" rel="noopener noreferrer">{pictured.photo.license}</a>. {pictured.photo.changes}</p>
                </details>}
                {family && entries.length > 1 && <details class="familyHistory">
                  <summary>{family.recordsLabel ?? 'Past versions and parallel branches'} ({entries.length - 1})</summary>
                  <ul>{entries.filter((p:any) => p.slug !== e.slug).map((p:any) => <li>
                    <a href={`/devices/${p.slug}/`}>{p.title}</a>
                    <span>{family.changes[p.order]}</span>
                  </li>)}</ul>
                </details>}
              </article>
            ); })}

            {!filtered.length ? <p class="muted">No matching devices.</p> : null}
          </div>
        </div>
      </div>

      <style>{`
        .device-directory{margin-top:14px;padding:22px 22px;border-radius:16px;border:1px solid var(--border);background:var(--panel)}
        .directory-view-row{display:flex;align-items:baseline;justify-content:space-between;flex-wrap:wrap;gap:10px;margin-bottom:18px;padding-bottom:14px;border-bottom:1px solid var(--border)}
        .directory-views{display:flex;gap:22px}
        .directory-views button{cursor:pointer;border:0;border-bottom:1px solid transparent;padding:0 0 5px;color:inherit;background:transparent;opacity:.6;font-size:19px}
        .directory-views button[aria-pressed=true]{opacity:1;font-style:italic;border-bottom-color:currentColor}
        .photo-coverage{font-size:12px;font-style:italic;opacity:.65}

        .device-directory .top{display:flex;gap:12px;align-items:center;justify-content:space-between;flex-wrap:wrap}
        .device-directory .search{flex:1;min-width:min(260px,100%)}
        .device-directory .search input{width:100%;padding:10px 12px;border-radius:12px;border:1px solid var(--border);background:var(--panelStrong);color:inherit;font-size:16px}
        .device-directory .search input:focus{border-color:var(--borderStrong)}

        .device-directory .topRight{display:flex;gap:10px;align-items:center}
        .device-directory .count{opacity:.72;font-size:16px}
        .device-directory .clear{cursor:pointer;border-radius:999px;border:1px solid var(--border);background:transparent;color:inherit;padding:8px 12px;font-size:16px;opacity:.9}
        .device-directory .clear:hover{border-color:var(--borderStrong);background:var(--panelHover)}

        .device-directory .body{margin-top:16px;display:grid;grid-template-columns:260px 1fr;gap:16px;align-items:start}
        @media (max-width: 900px){.device-directory .body{grid-template-columns:1fr}.device-directory .sidebar{position:relative}}

        .device-directory .sidebar{padding:14px 14px;border-radius:14px;border:1px solid var(--border);background:var(--panelStrong)}

        .stage{display:block;font-size:16px}.stage select{display:block;width:100%;margin:7px 0 12px;padding:8px;border:1px solid var(--border);border-radius:8px;color:inherit;background:var(--panelStrong);font:inherit}
        .model-filter{display:flex;gap:8px;align-items:center;font-size:14px}.stage-note{font-size:12px;line-height:1.6;opacity:.72;margin:12px 0 18px}
        .device-directory .results{min-width:0}
        .device-directory .grid{display:grid;grid-template-columns:repeat(2, minmax(0, 1fr));gap:18px 16px;align-items:start}
        @media (max-width: 900px){.device-directory .grid{grid-template-columns:1fr}}

        .device-directory .item{display:block;padding:18px;border-radius:10px;border:1px solid var(--border);background:var(--panel);color:inherit;text-decoration:none;min-width:0}
        .device-directory .item:hover{border-color:var(--borderStrong);background:var(--panelHover)}
        .catalog-photo{margin:0 0 18px}
        .catalog-photo-image{display:grid;position:relative;overflow:hidden;border-radius:3px;background:#f5f4f0;color:#272922;text-decoration:none}
        .catalog-photo-image img{width:100%;height:235px;object-fit:scale-down;padding:16px;transition:transform .45s ease}
        .catalog-photo-image:hover img{transform:scale(1.04)}
        .catalog-photo figcaption{display:flex;justify-content:space-between;flex-wrap:wrap;gap:4px 8px;font-size:11px;font-style:italic;padding-top:9px;opacity:.68}
        .catalog-photo-caption{font-size:13px;line-height:1.45;font-style:italic;margin:8px 0 0;opacity:.8}
        .photo-record{font-style:normal;font-size:10px;letter-spacing:.025em}
        .photo-hover{position:absolute;right:10px;bottom:10px;background:#f8f7f2;border:1px solid #deddd4;border-radius:3px;padding:5px 9px;font-size:13px;font-style:italic;opacity:0;transform:translateY(4px);transition:opacity .2s,transform .2s}
        .photo-hover span{margin-left:12px}
        .catalog-photo-image:is(:hover,:focus-visible) .photo-hover{opacity:1;transform:none}
        .pictured-version{font-size:12px;line-height:1.55;margin:9px 0 0;opacity:.8}
        .catalog-photo-credit{margin-top:12px;font-size:11px;opacity:.7}
        .catalog-photo-credit p{font-size:11px;line-height:1.6;margin:7px 0 0;overflow-wrap:anywhere}
        .familyLabel{font-size:12px;text-transform:uppercase;letter-spacing:.05em;opacity:.65;margin-bottom:10px;line-height:1.5}
        .primaryEntry{color:inherit;text-decoration:none}.primaryEntry:hover h3{text-decoration:underline}
        .familyNote{font-size:13px;opacity:.75;line-height:1.6;margin:12px 0}
        .familyHistory{border-top:1px solid var(--border);padding-top:12px;margin-top:14px}.familyHistory summary{cursor:pointer;line-height:1.5;font-size:14px}
        .familyHistory ul{list-style:none;padding:0;margin:10px 0 0}.familyHistory li{border-top:1px solid var(--border);padding:10px 0}.familyHistory span{display:block;font-size:13px;line-height:1.6;opacity:.75;margin-top:5px}.familyHistory a{color:inherit}
        .device-directory .itemTitle{margin:0;font-size:var(--title-card);font-weight:400;line-height:1.08}
        .device-directory .desc{margin:10px 0 0;font-size:17px;opacity:.78;line-height:1.5}

        .device-directory .badges{margin-top:10px;display:flex;flex-wrap:wrap;gap:6px}
        .device-directory .badge{opacity:.78;font-size:14px;border:1px solid var(--border);border-radius:999px;padding:4px 8px;background:var(--panelStrong)}

        .device-directory .muted{opacity:.72;margin:0;line-height:1.5}
        .device-directory .srOnly{position:absolute;left:-9999px;top:auto;width:1px;height:1px;overflow:hidden}
        @media(max-width:680px){.device-directory{padding:18px}.device-directory .item{padding:16px}.catalog-photo-image img{height:260px}.photo-hover{opacity:1;transform:none}}
        @media(prefers-reduced-motion:reduce){.catalog-photo-image img,.photo-hover{transition:none}.catalog-photo-image:hover img{transform:none}}
      `}</style>
    </section>
  );
}

function FacetRadio(props: {
  title: string;
  name: string;
  value: string;
  options: Array<{ label: string; value: string }>;
  onChange: (v: string) => void;
}) {
  return (
    <fieldset class="facet">
      <legend class="facetTitle">{props.title}</legend>
      <div class="facetList">
        {props.options.map((opt) => {
          const id = `${props.name}-${opt.value || "any"}`;
          const checked = norm(props.value) === norm(opt.value);
          return (
            <label class="row" htmlFor={id}>
              <input
                id={id}
                type="radio"
                name={props.name}
                checked={checked}
                onChange={() => props.onChange(opt.value)}
              />
              <span class="lbl">{opt.label}</span>
            </label>
          );
        })}
      </div>

      <style>{facetCss}</style>
    </fieldset>
  );
}

function FacetMulti(props: {
  title: string;
  values: Set<string>;
  options: Array<{ label: string; value: string }>;
  onToggle: (v: string) => void;
}) {
  return (
    <fieldset class="facet">
      <legend class="facetTitle">{props.title}</legend>
      <div class="facetList">
        {props.options.map((opt) => {
          const id = `${opt.value}`;
          const checked = props.values.has(norm(opt.value));
          return (
            <label class="row" htmlFor={id}>
              <input id={id} type="checkbox" checked={checked} onChange={() => props.onToggle(opt.value)} />
              <span class="lbl">{opt.label}</span>
            </label>
          );
        })}
      </div>
      <style>{facetCss}</style>
    </fieldset>
  );
}

const facetCss = `
  .device-directory .facet{margin:0 0 14px;padding:0;border:0}
  .device-directory .facetTitle{opacity:.72;font-size:16px;font-style:italic;letter-spacing:.02em;text-transform:none;margin:0 0 8px}
  .device-directory .facetList{display:grid;gap:8px}
  .device-directory .row{display:flex;gap:10px;align-items:flex-start;cursor:pointer;user-select:none}
  .device-directory .row input{margin-top:2px}
  .device-directory .lbl{font-size:16px;line-height:1.35}
`;
