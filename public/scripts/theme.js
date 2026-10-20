/* Runs in the head before paint, including the standalone atlas viewers. */
(() => {
  const media = window.matchMedia('(prefers-color-scheme: dark)');
  const valid = value => value === 'light' || value === 'dark';
  const savedTheme = () => {
    try { return localStorage.getItem('bts_theme'); } catch { return null; }
  };
  const label = () => {
    const dark = document.documentElement.dataset.theme === 'dark';
    document.querySelectorAll('[data-theme-toggle]').forEach(button => {
      button.textContent = dark ? 'Light' : 'Dark';
      button.setAttribute('aria-pressed', String(dark));
      button.title = `Switch to ${dark ? 'light' : 'dark'} mode`;
      button.setAttribute('aria-label', `Switch to ${dark ? 'Vintage Ivory light' : 'Graphite and Brass dark'} theme`);
    });
  };
  const apply = theme => {
    document.documentElement.dataset.theme = theme;
    label();
  };
  const sync = () => {
    const saved = savedTheme();
    apply(valid(saved) ? saved : media.matches ? 'dark' : 'light');
  };
  sync();
  document.addEventListener('DOMContentLoaded', label);
  document.addEventListener('click', event => {
    if (!(event.target instanceof Element) || !event.target.closest('[data-theme-toggle]')) return;
    const next = document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark';
    apply(next);
    try { localStorage.setItem('bts_theme', next); } catch {}
  });
  // Storage events also keep same-origin embedded viewers and other tabs in sync.
  window.addEventListener('storage', event => {
    if (event.key === 'bts_theme' || event.key === null) sync();
  });
  media.addEventListener('change', sync);
})();
