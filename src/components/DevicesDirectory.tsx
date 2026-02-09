import { useEffect, useMemo, useState } from "preact/hooks";

type DeviceEntry = {
  title: string;
  slug: string;
  description: string;
  order: number;
  device_id?: string;
  interface_class?: string;
  status?: string;
  modality?: string;
  tags: string[];
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

    setQuery(q);
    setAxis(norm(axis0));
    setIface(norm(iface0));
    setForm(norm(form0));
    setDir(new Set(dir0.map(norm).filter(Boolean)));
  }, []);

  // Keep URL in sync (shareable filters) without full navigation.
  useEffect(() => {
    const url = new URL(window.location.href);

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
  }, [query, axis, iface, form, dir]);

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
      if (axis && !e._tags.has(axis)) return false;
      if (iface && !e._tags.has(iface)) return false;
      if (form && !e._tags.has(form)) return false;

      // Directionality is multi-select AND.
      for (const d of dir) {
        const dn = norm(d);
        if (!dn) continue;
        if (!e._tags.has(dn)) return false;
      }

      if (q && !e._haystack.includes(q)) return false;
      return true;
    });
  }, [normalizedEntries, query, axis, iface, form, dir]);

  const hasFilters = query.trim() || axis || iface || form || dir.size;

  function clearAll() {
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
    <section class="card">
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
          <div class="count">{filtered.length} result(s)</div>
          {hasFilters ? (
            <button type="button" class="clear" onClick={clearAll}>
              Clear
            </button>
          ) : null}
        </div>
      </div>

      <div class="body">
        <aside class="sidebar">
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

        <main class="results">
          <div class="grid">
            {filtered.map((e: any) => (
              <a class="item" href={`/devices/${e.slug}/`}>
                <h3 class="itemTitle">{e.title}</h3>
                <p class="desc">{e.description}</p>

                <div class="badges">
                  {e._axis ? <span class="badge">{toTitleCase(e._axis)}</span> : null}
                  {e._iface ? <span class="badge">{toTitleCase(e._iface)}</span> : null}
                  {e._form ? <span class="badge">{toTitleCase(e._form)}</span> : null}
                  {[...e._dir].map((d) => (
                    <span class="badge">{toTitleCase(d)}</span>
                  ))}
                </div>
              </a>
            ))}

            {!filtered.length ? <p class="muted">No matching devices.</p> : null}
          </div>
        </main>
      </div>

      <style>{`
        .card{margin-top:14px;padding:22px 22px;border-radius:16px;border:1px solid var(--border);background:var(--panel)}

        .top{display:flex;gap:12px;align-items:center;justify-content:space-between;flex-wrap:wrap}
        .search{flex:1;min-width:260px}
        .search input{width:100%;padding:10px 12px;border-radius:12px;border:1px solid var(--border);background:var(--panelStrong);color:inherit;font-size:14px}
        .search input:focus{outline:none;border-color:var(--borderStrong)}

        .topRight{display:flex;gap:10px;align-items:center}
        .count{opacity:.72;font-size:13px}
        .clear{cursor:pointer;border-radius:999px;border:1px solid var(--border);background:transparent;color:inherit;padding:8px 12px;font-size:13px;opacity:.9}
        .clear:hover{border-color:var(--borderStrong);background:var(--panelHover)}

        .body{margin-top:16px;display:grid;grid-template-columns:260px 1fr;gap:16px;align-items:start}
        @media (max-width: 900px){.body{grid-template-columns:1fr}.sidebar{position:relative}}

        .sidebar{padding:14px 14px;border-radius:14px;border:1px solid var(--border);background:var(--panelStrong)}

        .results{min-width:0}
        .grid{display:grid;grid-template-columns:repeat(2, minmax(0, 1fr));gap:10px}
        @media (max-width: 900px){.grid{grid-template-columns:1fr}}

        .item{display:block;padding:14px 14px;border-radius:14px;border:1px solid var(--border);background:var(--panel);color:inherit;text-decoration:none}
        .item:hover{border-color:var(--borderStrong);transform:translateY(-1px);background:var(--panelHover)}
        .itemTitle{margin:0;font-size:1.16em;font-weight:400;line-height:1.12}
        .desc{margin:8px 0 0;opacity:.78;line-height:1.7}

        .badges{margin-top:10px;display:flex;flex-wrap:wrap;gap:6px}
        .badge{opacity:.78;font-size:12px;border:1px solid var(--border);border-radius:999px;padding:4px 8px;background:var(--panelStrong)}

        .muted{opacity:.72;margin:0;line-height:1.7}
        .srOnly{position:absolute;left:-9999px;top:auto;width:1px;height:1px;overflow:hidden}
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
  .facet{margin:0 0 14px;padding:0;border:0}
  .facetTitle{opacity:.72;font-size:12px;letter-spacing:.12em;text-transform:none;margin:0 0 8px}
  .facetList{display:grid;gap:8px}
  .row{display:flex;gap:10px;align-items:flex-start;cursor:pointer;user-select:none}
  .row input{margin-top:2px}
  .lbl{font-size:13px;line-height:1.35}
`;
