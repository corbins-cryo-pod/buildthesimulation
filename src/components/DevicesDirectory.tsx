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

function setEq(a: Set<string>, b: Set<string>) {
  if (a.size !== b.size) return false;
  for (const v of a) if (!b.has(v)) return false;
  return true;
}

export default function DevicesDirectory(props: {
  entries: DeviceEntry[];
  allTags: string[];
}) {
  const axisPills = [
    { label: "All", tag: "" },
    { label: "Cortex", tag: "cortex" },
    { label: "Peripheral nerve", tag: "peripheral nerve" },
    { label: "Spinal cord", tag: "spinal cord" },
  ];

  const [query, setQuery] = useState("");
  const [axisTag, setAxisTag] = useState<string>("");
  const [selectedTags, setSelectedTags] = useState<Set<string>>(new Set());

  // Load initial state from URL once.
  useEffect(() => {
    const url = new URL(window.location.href);
    const q = url.searchParams.get("q") ?? "";
    const axis = url.searchParams.get("axis") ?? "";
    const tags = splitCsv(url.searchParams.get("tags"));

    setQuery(q);
    setAxisTag(axis);
    setSelectedTags(new Set(tags.map(norm).filter(Boolean)));
  }, []);

  // Keep URL in sync (shareable filters) without full navigation.
  useEffect(() => {
    const url = new URL(window.location.href);

    const q = query.trim();
    if (q) url.searchParams.set("q", q);
    else url.searchParams.delete("q");

    const axis = axisTag.trim();
    if (axis) url.searchParams.set("axis", axis);
    else url.searchParams.delete("axis");

    const tags = [...selectedTags].filter(Boolean).sort();
    if (tags.length) url.searchParams.set("tags", tags.join(","));
    else url.searchParams.delete("tags");

    window.history.replaceState({}, "", url);
  }, [query, axisTag, selectedTags]);

  const normalizedEntries = useMemo(() => {
    return props.entries.map((e) => {
      const tags = (e.tags ?? []).map(norm).filter(Boolean);
      return {
        ...e,
        _tagsNorm: new Set(tags),
        _haystack: norm(
          [
            e.title,
            e.description,
            e.device_id,
            e.interface_class,
            e.status,
            e.modality,
            ...(e.tags ?? []),
          ].join(" \n")
        ),
      };
    });
  }, [props.entries]);

  const filtered = useMemo(() => {
    const q = norm(query);
    const axis = norm(axisTag);

    return normalizedEntries.filter((e: any) => {
      if (axis && !e._tagsNorm.has(axis)) return false;

      // AND semantics for selected tags (narrowing is usually what you want).
      for (const t of selectedTags) {
        const tn = norm(t);
        if (!tn) continue;
        if (!e._tagsNorm.has(tn)) return false;
      }

      if (q && !e._haystack.includes(q)) return false;
      return true;
    });
  }, [normalizedEntries, query, axisTag, selectedTags]);

  const tagCounts = useMemo(() => {
    const m = new Map<string, number>();
    for (const e of filtered as any[]) {
      for (const t of e._tagsNorm as Set<string>) {
        m.set(t, (m.get(t) ?? 0) + 1);
      }
    }
    return m;
  }, [filtered]);

  const sortedTags = useMemo(() => {
    // Sort tags by count desc, then alpha.
    const tags = props.allTags.map(norm).filter(Boolean);
    const uniq = [...new Set(tags)];
    return uniq.sort((a, b) => {
      const ca = tagCounts.get(a) ?? 0;
      const cb = tagCounts.get(b) ?? 0;
      if (cb !== ca) return cb - ca;
      return a.localeCompare(b);
    });
  }, [props.allTags, tagCounts]);

  function toggleTag(t: string) {
    const tn = norm(t);
    setSelectedTags((prev) => {
      const next = new Set(prev);
      if (next.has(tn)) next.delete(tn);
      else next.add(tn);
      return next;
    });
  }

  function clearAll() {
    setQuery("");
    setAxisTag("");
    setSelectedTags(new Set());
  }

  const hasFilters = query.trim() || axisTag.trim() || selectedTags.size;

  return (
    <section class="card">
      <div class="topRow">
        <div>
          <h2 class="h">Directory</h2>
          <p class="muted">Search + filter the device catalog.</p>
        </div>
        <div class="count">{filtered.length} result(s)</div>
      </div>

      <div class="controls">
        <label class="search">
          <span class="srOnly">Search devices</span>
          <input
            value={query}
            onInput={(e) => setQuery((e.target as HTMLInputElement).value)}
            placeholder="Search title, description, ID, tags…"
            spellcheck={false}
          />
        </label>

        <div class="axis">
          <div class="axisLabel">Axis</div>
          <div class="pills">
            {axisPills.map((p) => {
              const active = norm(axisTag) === norm(p.tag);
              return (
                <button
                  type="button"
                  class={"pill" + (active ? " active" : "")}
                  onClick={() => setAxisTag(p.tag)}
                >
                  {p.label}
                </button>
              );
            })}
          </div>
        </div>

        <div class="tags">
          <div class="axisLabel">Tags</div>
          <div class="chips">
            {sortedTags.map((t) => {
              const active = selectedTags.has(t);
              const c = tagCounts.get(t) ?? 0;
              // Hide tags that aren't present in the filtered set (keeps UI relevant).
              if (c === 0) return null;
              return (
                <button
                  type="button"
                  class={"chip" + (active ? " active" : "")}
                  onClick={() => toggleTag(t)}
                  title={`Filter by “${t}”`}
                >
                  <span class="chipText">{t}</span>
                  <span class="chipCount">{c}</span>
                </button>
              );
            })}
          </div>
        </div>

        {hasFilters ? (
          <div class="actions">
            <button type="button" class="clear" onClick={clearAll}>
              Clear
            </button>
          </div>
        ) : null}
      </div>

      <div class="list">
        {filtered.map((e: any) => (
          <a class="item" href={`/devices/${e.slug}/`}>
            <h3 class="itemTitle">
              {String(e.order).padStart(2, "0")} — {e.title}
            </h3>
            <p class="desc">
              {e.modality ? <span class="k">{e.modality}</span> : null}
              {e.description ? (e.modality ? ` — ${e.description}` : e.description) : ""}
            </p>
            <div class="miniTags">
              {(e.tags ?? [])
                .map(norm)
                .filter(Boolean)
                .slice(0, 8)
                .map((t: string) => (
                  <span class="miniTag">{t}</span>
                ))}
            </div>
          </a>
        ))}

        {!filtered.length ? <p class="muted" style={{ margin: "10px 0 0" }}>No matching devices.</p> : null}
      </div>

      <style>{`
        .card{margin-top:14px;padding:22px 22px;border-radius:16px;border:1px solid var(--border);background:var(--panel)}
        .topRow{display:flex;gap:12px;align-items:flex-start;justify-content:space-between;flex-wrap:wrap}
        .h{margin:0 0 6px;font-size:1.15em;font-weight:700}
        .muted{opacity:.72;margin:0;line-height:1.7}
        .count{opacity:.72;font-size:13px;padding-top:2px}

        .controls{margin-top:14px;display:grid;gap:14px}
        .search input{width:100%;padding:10px 12px;border-radius:12px;border:1px solid var(--border);background:var(--panelStrong);color:inherit;font-size:14px}
        .search input:focus{outline:none;border-color:var(--borderStrong)}

        .axisLabel{opacity:.72;font-size:12px;letter-spacing:.12em;text-transform:uppercase;margin-bottom:8px}

        .pills,.chips{display:flex;flex-wrap:wrap;gap:8px}
        .pill,.chip{cursor:pointer;border-radius:999px;border:1px solid var(--border);background:var(--panelStrong);color:inherit}
        .pill{padding:8px 12px;font-size:13px}
        .chip{display:flex;gap:8px;align-items:center;padding:7px 10px;font-size:13px}
        .pill:hover,.chip:hover{border-color:var(--borderStrong);background:var(--panelHover)}
        .pill.active,.chip.active{border-color:var(--borderStrong);background:var(--panelHover)}
        .chipCount{opacity:.7;font-size:12px;border-left:1px solid var(--border);padding-left:8px}

        .actions{display:flex;justify-content:flex-end}
        .clear{cursor:pointer;border-radius:999px;border:1px solid var(--border);background:transparent;color:inherit;padding:8px 12px;font-size:13px;opacity:.9}
        .clear:hover{border-color:var(--borderStrong);background:var(--panelHover)}

        .list{margin-top:14px;display:grid;gap:10px}
        .item{display:block;padding:14px 14px;border-radius:14px;border:1px solid var(--border);background:var(--panel);color:inherit;text-decoration:none}
        .item:hover{border-color:var(--borderStrong);transform:translateY(-1px);background:var(--panelHover)}
        .itemTitle{margin:0;font-size:1.05em;font-weight:700}
        .desc{margin:8px 0 0;opacity:.78;line-height:1.7}
        .k{opacity:.9;font-weight:700}

        .miniTags{margin-top:10px;display:flex;flex-wrap:wrap;gap:6px}
        .miniTag{opacity:.75;font-size:12px;border:1px solid var(--border);border-radius:999px;padding:4px 8px;background:var(--panelStrong)}

        .srOnly{position:absolute;left:-9999px;top:auto;width:1px;height:1px;overflow:hidden}
      `}</style>
    </section>
  );
}
