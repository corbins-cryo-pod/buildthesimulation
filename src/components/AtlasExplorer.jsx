import { useEffect, useMemo, useRef, useState } from 'preact/hooks';
import 'leaflet/dist/leaflet.css';
import { clusterAtlasPoints, filterAtlasEntries, readAtlasState } from '../lib/atlas/data.js';

const escapeHtml = text => String(text).replace(/[&<>"']/g, c => ({'&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;'}[c]));
const hasCoordinates = entry => Number.isFinite(entry.lat) && Number.isFinite(entry.lon);
const regionLabels = {American: 'US / Americas', European: 'Europe', Chinese: 'China', Other: 'Other / international'};
const blankState = {query: '', kind: '', region: '', interfaceType: '', selected: ''};

export default function AtlasExplorer({ entries }) {
  const [state, setState] = useState(blankState);
  const [initialized, setInitialized] = useState(false);
  const [mapReady, setMapReady] = useState(false);
  const [mapError, setMapError] = useState('');
  const [tileError, setTileError] = useState(false);
  const [hovered, setHovered] = useState('');
  const [areaOnly, setAreaOnly] = useState(false);
  const [viewport, setViewport] = useState(null);
  const [cluster, setCluster] = useState(null);
  const [expanded, setExpanded] = useState(false);
  const [previewId, setPreviewId] = useState('');
  const [Viewer, setViewer] = useState(null);
  const mapHost = useRef(null), mapApi = useRef(null), rows = useRef(new Map());
  const callbacks = useRef({}), mapActions = useRef({}), status = useRef({});
  const profileHeading = useRef(null);
  const reducedMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const filtered = useMemo(() => filterAtlasEntries(entries, state), [entries, state.query, state.kind, state.region, state.interfaceType]);
  const selected = filtered.find(entry => entry.slug === state.selected) ?? null;
  const listed = filtered.filter(entry => (!cluster || cluster.includes(entry.slug)) && (!areaOnly || !viewport || viewport.includes(entry.slug)));
  const mapped = filtered.filter(hasCoordinates);
  const interfaces = [...new Set(entries.flatMap(entry => entry.interfaces))].sort();
  status.current = {filtered, selected: selected?.slug, hovered, expanded};

  const writeUrl = (next, push = false) => {
    const url = new URL(window.location.href);
    for (const [key, value] of [['q', next.query], ['kind', next.kind], ['region', next.region], ['interface', next.interfaceType], ['org', next.selected]]) {
      if (value) url.searchParams.set(key, value); else url.searchParams.delete(key);
    }
    if (url.href !== window.location.href) window.history[push ? 'pushState' : 'replaceState'](null, '', url);
  };
  const changeFilter = (key, value) => {
    const next = {...state, [key]: value};
    if (!filterAtlasEntries(entries, next).some(entry => entry.slug === next.selected)) next.selected = '';
    setState(next); writeUrl(next); setCluster(null); setAreaOnly(false);
    mapActions.current.fit?.(filterAtlasEntries(entries, next));
  };
  const choose = (entry, move = true) => {
    const next = {...state, selected: entry.slug};
    setState(next); writeUrl(next, true); setExpanded(true);
    setPreviewId(entry.devices.find(device => device.hasModel)?.deviceId ?? '');
    if (move && hasCoordinates(entry)) mapActions.current.locate?.(entry);
    requestAnimationFrame(() => profileHeading.current?.focus({preventScroll: true}));
  };
  const close = () => {
    const next = {...state, selected: ''}; setState(next); writeUrl(next, true); setPreviewId('');
    requestAnimationFrame(() => (rows.current.get(state.selected) ?? document.getElementById('atlas-search'))?.focus({preventScroll: true}));
  };
  callbacks.current = {
    select: choose,
    hover: slug => { setHovered(slug); if (slug) rows.current.get(slug)?.scrollIntoView({block: 'nearest', behavior: 'auto'}); },
    cluster: ids => { setCluster(ids); const next = {...state, selected: ''}; setState(next); writeUrl(next); setExpanded(true); setAreaOnly(false); },
  };

  useEffect(() => {
    const initial = readAtlasState(window.location.search, entries);
    setState(initial); setInitialized(true);
    if (initial.selected) { setExpanded(true); setPreviewId(entries.find(entry => entry.slug === initial.selected)?.devices.find(device => device.hasModel)?.deviceId ?? ''); }
    const back = () => {
      const next = readAtlasState(window.location.search, entries); setState(next); setCluster(null); setAreaOnly(false);
      const entry = entries.find(entry => entry.slug === next.selected);
      setPreviewId(entry?.devices.find(device => device.hasModel)?.deviceId ?? '');
      if (entry && hasCoordinates(entry)) mapActions.current.locate?.(entry);
    };
    window.addEventListener('popstate', back);
    return () => window.removeEventListener('popstate', back);
  }, []);

  useEffect(() => {
    if (!previewId || Viewer) return;
    let cancelled = false;
    import('./DeviceModelViewer.tsx').then(module => { if (!cancelled) setViewer(() => module.default); }).catch(() => { if (!cancelled) setPreviewId(''); });
    return () => { cancelled = true; };
  }, [previewId, Viewer]);

  useEffect(() => {
    if (!initialized) return;
    let cancelled = false, dispose = () => {};
    (async () => {
      const {default: L} = await import('leaflet');
      if (cancelled || !mapHost.current) return;
      const host = mapHost.current;
      const map = L.map(host, {zoomControl: false, minZoom: 0, maxZoom: 16, scrollWheelZoom: true, worldCopyJump: true, attributionControl: false});
      mapApi.current = map;
      L.control.zoom({position: 'topright'}).addTo(map);
      L.control.attribution({position: 'bottomright', prefix: false}).addTo(map);
      const tiles = L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
        referrerPolicy: 'strict-origin-when-cross-origin',
      }).addTo(map);
      let errorCount = 0;
      tiles.on('tileerror', () => { if (++errorCount > 3) setTileError(true); });
      tiles.on('tileload', () => { errorCount = 0; setTileError(false); });
      const layer = L.layerGroup().addTo(map);
      let pinGroups = [];
      const sidebarWidth = () => window.matchMedia('(min-width: 761px)').matches ? Math.min(390, host.clientWidth * .37) + 35 : 24;
      const padding = () => ({paddingTopLeft: [sidebarWidth(), 45], paddingBottomRight: [55, window.matchMedia('(min-width: 761px)').matches ? 65 : (status.current.expanded ? 470 : 330)]});
      const fit = points => {
        const located = points.filter(hasCoordinates);
        if (!located.length) return;
        const bounds = L.latLngBounds(located.map(entry => [entry.lat, entry.lon]));
        map.fitBounds(bounds, {...padding(), maxZoom: located.length === 1 ? 7 : 5, animate: !reducedMotion()});
      };
      const locate = entry => {
        const zoom = Math.max(6, map.getZoom());
        const point = map.project([entry.lat, entry.lon], zoom);
        // Keep the selected point in the open map, beside the profile panel.
        point.x -= sidebarWidth() / 2;
        if (!window.matchMedia('(min-width: 761px)').matches) point.y += 120;
        map.flyTo(map.unproject(point, zoom), zoom, {animate: !reducedMotion(), duration: .65});
      };
      const decorate = () => {
        for (const {marker, entries: members} of pinGroups) {
          const element = marker.getElement();
          if (!element) continue;
          element.classList.toggle('is-selected', members.some(e => e.slug === status.current.selected));
          element.classList.toggle('is-hovered', members.some(e => e.slug === status.current.hovered));
        }
      };
      const render = () => {
        layer.clearLayers(); pinGroups = [];
        const points = status.current.filtered.filter(hasCoordinates);
        const visible = points.filter(entry => map.getBounds().pad(.15).contains([entry.lat, entry.lon]));
        const groups = clusterAtlasPoints(visible, entry => map.latLngToContainerPoint([entry.lat, entry.lon]), window.matchMedia('(pointer: coarse)').matches ? 50 : 42);
        for (const group of groups) {
          const members = group.entries;
          const isCluster = members.length > 1;
          const latlng = isCluster ? map.containerPointToLatLng([group.x, group.y]) : [members[0].lat, members[0].lon];
          const icon = L.divIcon({className: `atlas-pin ${isCluster ? 'atlas-cluster' : members[0].kind === 'Lab' ? 'atlas-lab' : 'atlas-company'}`, iconSize: [44,44], iconAnchor: [22,22], html: `<span>${isCluster ? members.length : ''}</span>`});
          const marker = L.marker(latlng, {icon, keyboard: true, title: isCluster ? `${members.length} organizations: ${members.map(e => e.title).join(', ')}` : members[0].title}).addTo(layer);
          marker.bindTooltip(isCluster ? `${members.length} organizations · select to explore` : `<strong>${escapeHtml(members[0].title)}</strong><br>${escapeHtml(members[0].location)}`, {direction: 'top', offset: [0,-12]});
          marker.on('mouseover', () => { if (!isCluster) callbacks.current.hover(members[0].slug); });
          marker.on('mouseout', () => callbacks.current.hover(''));
          marker.on('click', () => {
            if (!isCluster) { callbacks.current.select(members[0]); return; }
            callbacks.current.cluster(members.map(e => e.slug));
            const bounds = L.latLngBounds(members.map(entry => [entry.lat, entry.lon]));
            map.fitBounds(bounds, {...padding(), maxZoom: Math.min(14, map.getZoom() + 3), animate: !reducedMotion()});
          });
          pinGroups.push({marker, entries: members});
        }
        setViewport(points.filter(entry => map.getBounds().contains([entry.lat, entry.lon])).map(entry => entry.slug));
        decorate();
      };
      mapActions.current = {fit, locate, render, decorate};
      map.setView([27, 0], 2); fit(status.current.filtered);
      const initial = status.current.filtered.find(entry => entry.slug === status.current.selected);
      if (initial && hasCoordinates(initial)) locate(initial);
      map.on('moveend zoomend', render); render();
      const resize = new ResizeObserver(() => { map.invalidateSize({pan: false}); render(); }); resize.observe(host);
      setMapReady(true);
      dispose = () => { resize.disconnect(); map.off(); map.remove(); mapApi.current = null; mapActions.current = {}; };
    })().catch(() => { if (!cancelled) setMapError('The map could not load. You can still browse every organization and its linked hardware.'); });
    return () => { cancelled = true; dispose(); };
  }, [initialized]);

  useEffect(() => { mapActions.current.render?.(); }, [filtered]);
  useEffect(() => { mapActions.current.decorate?.(); }, [hovered, state.selected]);
  useEffect(() => { if (!selected && state.selected) { const next = {...state, selected: ''}; setState(next); if (initialized) writeUrl(next); } }, [filtered]);

  const clearFilters = () => { setState(blankState); writeUrl(blankState); setCluster(null); setAreaOnly(false); setPreviewId(''); mapActions.current.fit?.(entries); };
  const activeFilters = state.query || state.kind || state.region || state.interfaceType || cluster || areaOnly;
  return <section class="atlas" aria-label="Interactive BCI atlas">
    <div class="atlas-toolbar">
      <label class="atlas-search">Search the ecosystem<input id="atlas-search" type="search" placeholder="Organization, place, device or study…" value={state.query} onInput={e => changeFilter('query', e.currentTarget.value)} /></label>
      <label>Organizations<select value={state.kind} onChange={e => changeFilter('kind', e.currentTarget.value)}><option value="">Companies &amp; labs</option><option value="Company">Companies</option><option value="Lab">Labs</option></select></label>
      <label>Region<select value={state.region} onChange={e => changeFilter('region', e.currentTarget.value)}><option value="">Worldwide</option>{Object.keys(regionLabels).map(region => <option key={region} value={region}>{regionLabels[region]}</option>)}</select></label>
      <label>Technology<select value={state.interfaceType} onChange={e => changeFilter('interfaceType', e.currentTarget.value)}><option value="">All interfaces</option>{interfaces.map(type => <option key={type}>{type}</option>)}</select></label>
      {activeFilters && <button class="atlas-clear" onClick={clearFilters}>Reset filters</button>}
    </div>
    <div class={`atlas-workspace ${expanded ? 'sheet-expanded' : ''}`}>
      <div ref={mapHost} class="atlas-map" aria-label="World map of cataloged company and lab locations" />
      {!mapReady && <div class="atlas-map-loading" role="status">{mapError || 'Preparing the atlas…'}</div>}
      {tileError && <p class="atlas-map-warning" role="status">Map imagery is unavailable. Organization locations and browsing still work.</p>}
      <div class="atlas-map-tools">
        <button disabled={!mapReady} onClick={() => { setCluster(null); setAreaOnly(false); mapActions.current.fit?.(filtered); }}>Show all results</button>
        <label><input type="checkbox" disabled={!mapReady} checked={areaOnly} onChange={e => { setAreaOnly(e.currentTarget.checked); setCluster(null); }} /> In this map area</label>
      </div>
      <aside class={`atlas-panel ${selected ? 'has-profile' : ''}`} aria-label={selected ? `${selected.title} profile` : 'Organization directory'}>
        <button class="atlas-sheet-toggle" onClick={() => setExpanded(!expanded)} aria-expanded={expanded}>{selected ? selected.title : `${listed.length} organizations`} <span>{expanded ? 'Collapse ↓' : 'Explore ↑'}</span></button>
        {selected ? <div class="atlas-profile">
          <div class="atlas-profile-top"><button onClick={close}>← All results</button><span>{selected.kind}</span></div>
          <h2 ref={profileHeading} tabIndex={-1}>{selected.title}</h2>
          <p class="atlas-location">{selected.location || 'Location not documented'}{!hasCoordinates(selected) && <span>Map coordinates not cataloged</span>}</p>
          <p class="atlas-description">{selected.description}</p>
          <div class="atlas-profile-links"><a href={`/companies/${selected.slug}/`}>Read full brief →</a>{selected.website && <a href={selected.website} target="_blank" rel="noopener noreferrer">Official source ↗</a>}</div>
          {selected.reviewed && <p class="atlas-reviewed">Profile reviewed {selected.reviewed}</p>}
          {selected.devices.length > 0 && <section class="atlas-related"><h3>Connected hardware <span>{selected.devices.length}</span></h3><p class="atlas-related-note">Devices linked in this brief or its studies.</p>{selected.devices.map(device => <div class="atlas-hardware" key={device.slug}><a href={`/devices/${device.slug}/`}>{device.title} →</a><span>{device.interface}</span>{device.hasModel && <button aria-pressed={previewId === device.deviceId} onClick={() => setPreviewId(previewId === device.deviceId ? '' : device.deviceId)}>{previewId === device.deviceId ? 'Close model' : 'Inspect in 3D'}</button>}</div>)}</section>}
          {previewId && <section class="atlas-model" aria-label="Selected device reference model">{Viewer ? <Viewer key={previewId} deviceId={previewId} /> : <p role="status">Loading reference model…</p>}</section>}
          {selected.applications.length > 0 && <section class="atlas-related"><h3>Studies &amp; applications <span>{selected.applications.length}</span></h3>{selected.applications.map(app => <details class="atlas-study" key={app.slug}><summary><span>{app.status} evidence</span>{app.title}</summary>{app.description && <p>{app.description}</p>}<a href={`/applications/${app.slug}/`}>Read study &amp; sources →</a></details>)}</section>}
          {!selected.devices.length && !selected.applications.length && <p class="atlas-no-links">Device and study connections have not been cataloged for this profile yet.</p>}
        </div> : <>
          <div class="atlas-panel-heading"><div><span class="atlas-eyebrow">Explore the ecosystem</span><h2>{cluster ? 'In this cluster' : areaOnly ? 'In this map area' : 'Companies & labs'}</h2></div><p role="status" aria-live="polite">{listed.length} of {entries.length} organizations</p>{cluster && <button onClick={() => setCluster(null)}>← All matching results</button>}</div>
          <div class="atlas-results">{listed.map(entry => <a key={entry.slug} ref={el => { if (el) rows.current.set(entry.slug, el); else rows.current.delete(entry.slug); }} class={`atlas-row ${hovered === entry.slug ? 'is-hovered' : ''}`} href={`/companies/${entry.slug}/`} onMouseEnter={() => setHovered(entry.slug)} onMouseLeave={() => setHovered('')} onFocus={() => setHovered(entry.slug)} onBlur={() => setHovered('')} onClick={e => { if (e.ctrlKey || e.metaKey || e.shiftKey || e.altKey || !initialized) return; e.preventDefault(); choose(entry); }}><span class={`atlas-row-symbol ${entry.kind === 'Lab' ? 'is-lab' : ''}`} aria-hidden="true" /><div><h3>{entry.title}</h3><p>{entry.location || regionLabels[entry.region]} <span>· {entry.kind}</span></p><span class="atlas-row-meta">{entry.interfaces.length ? entry.interfaces.join(' · ') : 'Read organization brief'}{!hasCoordinates(entry) ? ' · Unmapped' : ''}</span></div><span aria-hidden="true">↗</span></a>)}{!listed.length && <div class="atlas-empty"><h3>No organizations here</h3><p>{areaOnly ? 'Move the map or turn off the area filter.' : 'Try another search, interface or region.'}</p><button onClick={clearFilters}>Show all organizations</button></div>}</div>
        </>}
      </aside>
      <div class="atlas-map-caption"><span><i class="company-dot" /> Company</span><span><i class="lab-dot" /> Lab</span><span>{mapped.length} mapped · {filtered.length - mapped.length} unmapped</span></div>
    </div>
    <p class="atlas-footnote">Locations are cataloged organization locations, not a map of every facility. Technology filters use tags and linked devices or studies. Unmapped profiles remain in the directory.</p>
  </section>;
}
