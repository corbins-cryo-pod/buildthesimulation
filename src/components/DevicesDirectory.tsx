import { useEffect, useMemo, useState } from "preact/hooks";

import { AXIS, FORM, REGULATORY, FUNCTION, facetSlug } from "../lib/device-facets.js";
import { groupDeviceCardsForBrowsing } from "../lib/device-browse-groups.js";
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
  additionalViews?: DevicePhoto[];
};

type DeviceEntry = {
  title: string;
  slug: string;
  description: string;
  order: number;
  device_id?: string;
  code?: string;
  interface_class?: string;
  status?: string;
  modality?: string;
  website?: string;
  last_updated?: string;
  tags: string[];
  facets?: { axis: string[]; function: string[]; form: string[]; regulatory: string; origin: string };
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
  axis: [{ label: "Any", value: "" }, ...AXIS.map(([value, label]) => ({ label, value }))],
  interfaceType: [
    { label: "Any", value: "" },
    { label: "Intracortical", value: "intracortical" },
    { label: "ECoG", value: "ecog" },
    { label: "sEEG", value: "seeg" },
    { label: "Endovascular", value: "endovascular" },
    { label: "PNI", value: "pni" },
    { label: "DBS", value: "dbs" },
    { label: "SCS", value: "scs" },
    { label: "Cochlear", value: "cochlear" },
    { label: "Retinal", value: "retinal" },
    { label: "Auditory brainstem", value: "brainstem" },
    { label: "Chemical sensing", value: "sensing" },
    { label: "Other", value: "other" },
  ],
  directionality: FUNCTION.map(([value, label]) => ({ label, value })),
  formFactor: [{ label: "Any", value: "" }, ...FORM.map(([value, label]) => ({ label, value }))],
  regulatory: [{ label: "Any", value: "" }, ...REGULATORY.map(([value, label]) => ({ label, value }))],
};

export default function DevicesDirectory(props: { entries: DeviceEntry[] }) {
  const [stage, setStage] = useState("");
  const [modelsOnly, setModelsOnly] = useState(false);
  const [photosOnly, setPhotosOnly] = useState(false);
  const [initialized, setInitialized] = useState(false);
  const [query, setQuery] = useState("");
  const [axis, setAxis] = useState("");
  const [iface, setIface] = useState("");
  const [form, setForm] = useState("");
  const [reg, setReg] = useState("");
  const [origin, setOrigin] = useState("");
  const [dir, setDir] = useState<Set<string>>(new Set());

  // Load initial state from URL once.
  useEffect(() => {
    const url = new URL(window.location.href);
    const q = url.searchParams.get("q") ?? "";
    const axis0 = url.searchParams.get("axis") ?? "";
    const iface0 = url.searchParams.get("iface") ?? "";
    const form0 = url.searchParams.get("form") ?? "";
    setReg(norm(url.searchParams.get("reg") ?? ""));
    setOrigin(norm(url.searchParams.get("origin") ?? ""));
    const dir0 = splitCsv(url.searchParams.get("dir"));

    setStage(norm(url.searchParams.get("stage") ?? ""));
    setModelsOnly(url.searchParams.get("models") === "1");
    setPhotosOnly(url.searchParams.get("photos") === "1");
    setQuery(q);
    setAxis(facetSlug(axis0));
    setIface(norm(iface0));
    setForm(facetSlug(form0));
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

    if (reg) url.searchParams.set("reg", reg); else url.searchParams.delete("reg");
    if (origin) url.searchParams.set("origin", origin); else url.searchParams.delete("origin");

    const dirList = [...dir].filter(Boolean).sort();
    if (dirList.length) url.searchParams.set("dir", dirList.join(","));
    else url.searchParams.delete("dir");

    window.history.replaceState({}, "", url);
  }, [query, axis, iface, form, reg, origin, dir, initialized, stage, modelsOnly, photosOnly]);

  const normalizedEntries = useMemo(() => {
    return props.entries.map((e) => {
      const tags = (e.tags ?? []).map(norm).filter(Boolean);
      const tagSet = new Set(tags);

      // Make search match also include common facet fields.
      const haystack = norm(
        [
          e.title,
          e.description,
          e.code,
          e.interface_class,
          e.status,
          e.modality,
          ...(e.tags ?? []),
          ...(e.facets ? [...e.facets.axis, ...e.facets.form, e.facets.regulatory, e.facets.origin] : []),
        ].join(" \n")
      );

      const fx = e.facets ?? { axis: [], function: [], form: [], regulatory: "", origin: "" };
      const ifaceHit =
        FACETS.interfaceType.map((x) => x.value).find((v) => v && tagSet.has(v)) ?? norm(e.interface_class ?? "");
      const dirHits: string[] = fx.function.map(norm);
      const searchExtra = [...fx.axis, ...fx.form, fx.regulatory, fx.origin].join(" ").replace(/-/g, " ");

      return {
        ...e,
        _tags: tagSet,
        _haystack: haystack,
        _axisSet: new Set(fx.axis),
        _iface: ifaceHit,
        _formSet: new Set(fx.form),
        _reg: fx.regulatory,
        _origin: norm(fx.origin),
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
      if (axis && !e._axisSet.has(axis)) return false;
      if (iface && e._iface !== iface && !e._tags.has(iface)) return false;
      if (form && !e._formSet.has(form)) return false;
      if (reg && e._reg !== reg) return false;
      if (origin && e._origin !== origin) return false;

      // Directionality is multi-select AND.
      for (const d of dir) {
        const dn = norm(d);
        if (!dn) continue;
        if (!e._dir.has(dn)) return false;
      }

      if (q && !e._haystack.includes(q)) return false;
      return true;
    });
  }, [normalizedEntries, query, axis, iface, form, reg, origin, dir, stage, modelsOnly, photosOnly]);

  const originOptions = useMemo(() => {
    const set = new Map<string, string>();
    for (const e of props.entries) { const o = e.facets?.origin; if (o) set.set(norm(o), o); }
    return [{ label: "Any", value: "" }, ...[...set.entries()].sort((a, b) => a[1].localeCompare(b[1])).map(([value, label]) => ({ label, value }))];
  }, [props.entries]);

  const grouped = useMemo(() => groupDeviceEntries(filtered), [filtered]);

  const browseGroups = useMemo(() => groupDeviceCardsForBrowsing(grouped), [grouped]);

  const hasFilters = query.trim() || axis || iface || form || reg || origin || dir.size || stage || modelsOnly || photosOnly;

  function clearAll() {
    setStage(""); setModelsOnly(false); setPhotosOnly(false);
    setQuery("");
    setAxis("");
    setIface("");
    setForm("");
    setReg("");
    setOrigin("");
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
          <label class="model-filter"><input type="checkbox" checked={modelsOnly} onChange={(e) => setModelsOnly((e.target as HTMLInputElement).checked)} /> Has a 3D reference model</label>

          <button type="button" class="clear" onClick={() => downloadCatalogCsv('device-catalog.csv', ['Code','Title','Evidence stage','Interface class','Modality','Model available','Last reviewed','Catalog URL','Primary source','Description'], filtered.map(e=>[e.code,e.title,e.status,e.interface_class,e.modality,getDeviceModel(e.device_id)?'yes':'no',e.last_updated,new URL(`/devices/${e.slug}/`,window.location.origin).href,e.website,e.description]))}>Export results CSV</button>
          <div class="srOnly" role="status" aria-live="polite">{filtered.length} records / {grouped.length} cards</div>
          {hasFilters ? (
            <button type="button" class="clear" onClick={clearAll}>
              Clear
            </button>
          ) : null}
        </div>
      </div>

      <div class="body">
        <aside class="sidebar">
          <div class="filter-table">
          <FacetRadio
            title="Axis"
            name="axis"
            value={axis}
            options={FACETS.axis}
            onChange={(v) => setAxis(v)}
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
            title="Regulatory"
            name="reg"
            value={reg}
            options={FACETS.regulatory}
            onChange={(v) => setReg(norm(v))}
          />

          <FacetRadio
            title="Origin country"
            name="origin"
            value={origin}
            options={originOptions}
            onChange={(v) => setOrigin(norm(v))}
          />

          <FacetRadio
            title="Form factor"
            name="form"
            value={form}
            options={FACETS.formFactor}
            onChange={(v) => setForm(v)}
          />
          </div>
        </aside>

        <div class="results">
          <div class="grid">
            {browseGroups.flatMap(group => group.cards).map(({family, entries, representative: e}: any) => {
              const pictured = getPicturedEntry(entries, e);
              return (
              <article key={family?.id ?? e.slug} class={`item familyCard ${pictured ? 'has-photo' : ''}`}>
                {pictured && <figure class="catalog-photo">
                  <a class="catalog-photo-image" href={`/devices/${pictured.slug}/`} aria-label={`View images and specifications of ${pictured.title}`}>
                    <img src={pictured.photo.thumbnail} srcSet={pictured.photo.width > pictured.photo.thumbnailWidth ? `${pictured.photo.thumbnail} ${pictured.photo.thumbnailWidth}w, ${pictured.photo.src} ${pictured.photo.width}w` : undefined} sizes="(max-width: 900px) calc(100vw - 84px), 360px" width={pictured.photo.width} height={pictured.photo.height} loading="lazy" decoding="async" alt={pictured.photo.alt} />
                    <span class="photo-hover" aria-hidden="true">View the interface <span>→</span></span>
                  </a>
                  <figcaption>
                    <span>{pictured.photo.kind}{pictured.photo.additionalViews?.length ? ` · ${pictured.photo.additionalViews.length + 1} views` : ''}</span>
                    <span class="photo-record">{pictured.code}</span>
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
        .device-directory{margin-top:14px;padding:22px 22px;border-radius:0;border:1px solid var(--border);background:transparent}
        .device-directory .top{display:flex;gap:12px;align-items:center;justify-content:space-between;flex-wrap:wrap}
        .device-directory .search{flex:1;min-width:min(260px,100%)}
        .device-directory .search input{width:100%;padding:10px 12px;border-radius:0;border:1px solid var(--border);background:var(--panelStrong);color:inherit;font-size:16px}
        .device-directory .search input:focus{border-color:var(--borderStrong)}

        .device-directory .topRight{display:flex;gap:10px;align-items:center;flex-wrap:wrap}
        .device-directory .count{opacity:.72;font-size:16px}
        .device-directory .clear{cursor:pointer;border-radius:0;border:1px solid var(--border);background:transparent;color:inherit;padding:8px 12px;font-size:16px;opacity:.9}
        .device-directory .clear:hover{border-color:var(--borderStrong);background:var(--panelHover)}

        .device-directory .body{margin-top:16px;display:grid;grid-template-columns:minmax(0,1fr);gap:20px;align-items:start}
        .device-directory .sidebar{display:grid;grid-template-columns:1fr 1fr;min-width:0;padding:0;border:0;background:transparent}
        .device-directory .sidebar,.device-directory .sidebar *{font-family:"Twentieth Century",Arial,sans-serif;font-style:normal;font-weight:700;text-shadow:none}
        .device-directory .model-filter{display:flex;gap:8px;align-items:center;font:700 12px "Twentieth Century",Arial,sans-serif;font-style:normal;letter-spacing:.035em!important}
        .device-directory .filter-table{grid-column:1/-1;display:grid;grid-template-columns:repeat(6,minmax(0,1fr));border:1px solid var(--text);background:transparent;min-width:0}
        @media(max-width:1000px){.device-directory .filter-table{grid-template-columns:repeat(3,minmax(0,1fr))}}
        @media(max-width:600px){.device-directory .filter-table{grid-template-columns:repeat(2,minmax(0,1fr))}.device-directory .topRight{width:100%;justify-content:space-between}}
        .device-directory .results{min-width:0}
        .device-directory .grid{display:grid;grid-template-columns:repeat(2, minmax(0, 1fr));gap:18px 16px;align-items:start}
        @media (max-width: 900px){.device-directory .grid{grid-template-columns:1fr}}

        .device-directory .item{display:block;padding:18px;border-radius:0;border:1px solid var(--border);background:var(--panel);color:inherit;text-decoration:none;min-width:0}
        .device-directory .item:hover{border-color:var(--borderStrong);background:var(--panelHover)}
        .catalog-photo{margin:0 0 18px}
        .catalog-photo-image{display:grid;position:relative;overflow:hidden;border-radius:0;background:#f5f4f0;color:#272922;text-decoration:none}
        .catalog-photo-image img{width:100%;height:235px;object-fit:scale-down;padding:16px;transition:transform .45s ease}
        .catalog-photo-image:hover img{transform:scale(1.04)}
        .catalog-photo figcaption{display:flex;justify-content:space-between;flex-wrap:wrap;gap:4px 8px;font-size:11px;font-style:italic;padding-top:9px;opacity:.68}
        .catalog-photo-caption{font-size:13px;line-height:1.45;font-style:italic;margin:8px 0 0;opacity:.8}
        .photo-record{font-style:normal;font-size:10px;letter-spacing:.025em}
        .photo-hover{position:absolute;right:10px;bottom:10px;background:#f8f7f2;border:1px solid #deddd4;border-radius:0;padding:5px 9px;font-size:13px;font-style:italic;opacity:0;transform:translateY(4px);transition:opacity .2s,transform .2s}
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
        .device-directory .badge{opacity:.78;font-size:14px;border:1px solid var(--border);border-radius:0;padding:4px 8px;background:var(--panelStrong)}

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
  .device-directory .facet{display:flex;flex-direction:column;align-self:stretch;min-width:0;min-inline-size:0;margin:0;padding:0 8px 3px;border:0;background:transparent}
  .device-directory .facetTitle{box-sizing:border-box;float:none;display:flex;align-items:flex-end;justify-content:center;width:calc(100% + 16px);max-width:none;height:25px;min-height:25px;padding:6px 5px 4px;margin:0 -8px 4px;border:0;border-bottom:1px solid var(--border);opacity:.72;font-size:12px;line-height:1.1!important;letter-spacing:.085em!important;text-align:center;text-transform:uppercase}
  .device-directory .facetList{display:flex;flex-direction:column;gap:1px;clear:both;width:100%;margin:0}
  .device-directory .row{display:flex;gap:7px;align-items:flex-start;justify-content:flex-start;cursor:pointer;user-select:none;min-height:0;min-width:0;width:100%;padding:1px 4px;border:0;background:transparent;text-align:left;line-height:1.1!important}
  .device-directory .row input{appearance:auto;flex:0 0 13px;width:13px;height:13px;margin:0;accent-color:var(--text)}
  .device-directory .lbl{font-size:12px;line-height:1.1!important;letter-spacing:.035em!important;text-align:left;white-space:normal;overflow-wrap:normal;hyphens:none}
`;
