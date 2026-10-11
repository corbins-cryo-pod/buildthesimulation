import { useCallback, useEffect, useMemo, useRef, useState } from 'preact/hooks';
import { DISCOVERY_TYPES, searchDiscovery } from '../lib/discovery.js';

const STARTS = [
  {label: 'Device catalog', href: '/devices/', detail: 'Specifications and hardware'},
  {label: 'Companies & labs', href: '/companies/', detail: 'Explore the BCI Atlas'},
  {label: 'Applications', href: '/applications/', detail: 'Human studies and research'},
  {label: 'Simulations', href: '/simulations/', detail: 'Experiments and design tools'},
];

export default function SiteSearch({ entries = [] }) {
  const dialog = useRef(null);
  const input = useRef(null);
  const opener = useRef(null);
  const [query, setQuery] = useState('');
  const [active, setActive] = useState(0);

  const open = useCallback((value = '', source = null) => {
    const el = dialog.current;
    if (!el) return;
    if (source) opener.current = source;
    setQuery(value);
    setActive(0);
    if (!el.open) el.showModal();
    requestAnimationFrame(() => input.current?.focus());
  }, []);

  const close = useCallback(() => {
    if (dialog.current?.open) dialog.current.close();
  }, []);

  useEffect(() => {
    const click = event => {
      const trigger = event.target.closest?.('[data-discovery-trigger]');
      if (!trigger) return;
      event.preventDefault();
      open(trigger.getAttribute('data-discovery-query') ?? '', trigger);
    };
    const keyboard = event => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        if (dialog.current?.open) close();
        else open('', document.activeElement);
      }
    };
    document.addEventListener('click', click);
    document.addEventListener('keydown', keyboard);
    return () => {
      document.removeEventListener('click', click);
      document.removeEventListener('keydown', keyboard);
    };
  }, [open, close]);

  const matches = useMemo(() => searchDiscovery(entries, query, 80), [entries, query]);
  const groups = useMemo(() => DISCOVERY_TYPES.map(type => ({
    type, rows: matches.filter(entry => entry.type === type).slice(0, 5),
  })).filter(group => group.rows.length), [matches]);
  const displayed = groups.flatMap(group => group.rows);

  const onKeys = event => {
    if (event.key === 'ArrowDown') { event.preventDefault(); setActive(n => (n + 1) % Math.max(displayed.length, 1)); }
    if (event.key === 'ArrowUp') { event.preventDefault(); setActive(n => (n - 1 + Math.max(displayed.length, 1)) % Math.max(displayed.length, 1)); }
    if (event.key === 'Enter' && displayed.length) {
      event.preventDefault();
      window.location.assign(displayed[Math.min(active, displayed.length - 1)].href);
    }
  };

  let running = 0;
  return <dialog ref={dialog} class="discovery-dialog" aria-label="Search Build the Simulation"
      onClose={() => { setQuery(''); opener.current?.focus?.(); }}
      onClick={event => { if (event.target === dialog.current) close(); }}>
    <div class="discovery-shell">
      <div class="discovery-field">
        <span aria-hidden="true" class="discovery-mag">⌕</span>
        <input ref={input} type="search" value={query} onInput={event => { setQuery(event.currentTarget.value); setActive(0); }}
          onKeyDown={onKeys} placeholder="Devices, companies, studies, technologies…" aria-label="Search all content"
          aria-controls="discovery-results" autoComplete="off" />
        <button type="button" class="discovery-close" onClick={close} aria-label="Close search">Esc ×</button>
      </div>
      <div id="discovery-results" class="discovery-results" aria-live="polite">
        {!query.trim() ? <>
          <p class="discovery-kicker">Explore</p>
          {STARTS.map(item => <a class="discovery-result" href={item.href} key={item.href}>
            <span><strong>{item.label}</strong><small>{item.detail}</small></span><span aria-hidden="true">↗</span>
          </a>)}
          <p class="discovery-tip">Type a name, technology or application. Use ↑ ↓ and Enter to navigate.</p>
        </> : displayed.length ? groups.map(group => <section class="discovery-group" key={group.type}>
          <h2>{group.type}</h2>
          {group.rows.map(item => {
            const index = running++;
            return <a class={`discovery-result ${index === active ? 'is-active' : ''}`} key={item.href} href={item.href}
              onMouseEnter={() => setActive(index)}>
              <span><strong>{item.title}</strong><small>{[item.detail, item.summary].filter(Boolean).join(' · ').slice(0, 132)}</small></span>
              <span aria-hidden="true">↗</span>
            </a>;
          })}
        </section>) : <p class="discovery-empty">No matches. Try a device, organization, anatomy or application.</p>}
      </div>
      <div class="discovery-footer"><span>{query.trim() ? `${displayed.length} shown · ${matches.length} matches` : 'Cross-site search'}</span><span>Ctrl / ⌘ + K</span></div>
    </div>
  </dialog>;
}
