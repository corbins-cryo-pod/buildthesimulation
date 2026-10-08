import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const root = 'src/content';
const collections = ['designs', 'applications', 'companies'];
const records = Object.fromEntries(collections.map(collection => [collection, fs.readdirSync(`${root}/${collection}`).filter(f => f.endsWith('.md')).map(file => {
  const text = fs.readFileSync(`${root}/${collection}/${file}`, 'utf8');
  const frontmatter = text.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  assert(frontmatter, `${collection}/${file}: frontmatter missing`);
  return { file, slug: file.slice(0, -3), text, meta: frontmatter[1] };
})]));
const field = (r, name) => r.meta.match(new RegExp(`^${name}:\\s*([^\\n]+)`, 'm'))?.[1]?.trim().replace(/^["']|["']$/g, '');
const arrayField = (r, name) => {
  const value = field(r, name);
  if (!value) return [];
  // These relationship arrays use one-line JSON-compatible YAML lists.
  try { return JSON.parse(value); } catch { assert.fail(`${r.file}: ${name} must be a one-line JSON-compatible list`); }
};

for (const collection of collections) {
  const ids = new Set();
  const orders = new Set();
  for (const record of records[collection]) {
    const order = field(record, 'order');
    assert(order && !orders.has(order), `${collection}/${record.file}: missing or duplicate order ${order}`);
    orders.add(order);
    const id = field(record, collection === 'designs' ? 'device_id' : 'application_id');
    if (collection !== 'companies') {
      assert(id, `${collection}/${record.file}: identifying ID missing`);
      assert(['intracortical','ecog','seeg','endovascular','pni','dbs','scs','other'].includes(field(record, 'interface_class')), `${record.file}: interface class missing or invalid`);
      assert(['human','preclinical','research','theoretical'].includes(field(record, 'status')), `${record.file}: evidence stage missing or invalid`);
      const updated = field(record, 'last_updated');
      assert(updated && /^\d{4}-\d{2}-\d{2}$/.test(updated) && Number.isFinite(Date.parse(updated)), `${record.file}: review date missing or invalid`);
    }
    if (id) { assert(!ids.has(id), `${collection}/${record.file}: duplicate ID ${id}`); ids.add(id); }
    for (const link of record.text.matchAll(/\]\((\/(?:devices|applications|companies)\/[^\s)]+)\)/g)) {
      const pathname = link[1].split(/[?#]/)[0];
      const parts = pathname.split('/').filter(Boolean);
      if (parts.length !== 2) continue;
      const targetCollection = { devices: 'designs', applications: 'applications', companies: 'companies' }[parts[0]];
      const special = parts[0] === 'devices' && ['models', 'designer'].includes(parts[1]);
      assert(special || records[targetCollection].some(r => r.slug === parts[1]), `${collection}/${record.file}: broken link ${pathname}`);
    }
  }
}
for (const record of records.applications) {
  for (const [name, collection] of [['devices', 'designs'], ['orgs', 'companies']]) {
    const refs = arrayField(record, name);
    assert.equal(new Set(refs).size, refs.length, `${record.file}: duplicate ${name} relationship`);
    for (const slug of refs) assert(records[collection].some(r => r.slug === slug), `${record.file}: missing ${name} target ${slug}`);
  }
}
const visibleDevices = records.designs.filter(r => field(r, 'draft') !== 'true');
const archivedNp2 = records.designs.find(r => r.slug === '36-neuropixels-2-0');
assert.equal(field(archivedNp2, 'draft'), 'true', 'Original Neuropixels 2.0 summary must not duplicate the detailed alpha hardware in the visible catalog');
assert(visibleDevices.some(r => r.slug === '88-neuropixels-20-alpha-probe'), 'Canonical Neuropixels 2.0 hardware must remain visible');
assert(fs.readFileSync('astro.config.mjs', 'utf8').includes("'/devices/36-neuropixels-2-0': '/devices/88-neuropixels-20-alpha-probe/'"), 'Archived Neuropixels 2.0 route must redirect');
console.log(`Visible hardware catalog: ${visibleDevices.length} devices; archived duplicate excluded.`);
console.log(`Content integrity: ${records.designs.length} devices, ${records.applications.length} applications and ${records.companies.length} atlas briefs; IDs, orders, relationships and catalog links verified.`);

const optoCanonical = records.designs.find(r=>r.slug === '107-neuropixels-opto-photonic-prototype');
const optoDuplicate = records.designs.find(r=>r.slug === '140-neuropixels-opto-prototype-2026');
assert.equal(field(optoCanonical,'device_id'),'BTSD-ACAD-0068');
assert.equal(field(optoCanonical,'draft'),'false');
assert.equal(field(optoDuplicate,'draft'),'true');
assert.equal(visibleDevices.filter(r=>field(r,'website') === 'https://www.nature.com/articles/s41592-026-03076-z').length,1,'One hardware identity per published Opto prototype');
assert(fs.readFileSync('astro.config.mjs','utf8').includes("'/devices/140-neuropixels-opto-prototype-2026': '/devices/107-neuropixels-opto-photonic-prototype/'"));
