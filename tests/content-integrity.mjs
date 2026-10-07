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
    if (id) { assert(!ids.has(id), `${collection}/${record.file}: duplicate ID ${id}`); ids.add(id); }
    for (const link of record.text.matchAll(/\]\((\/(?:devices|applications|companies)\/[^\s)]+)\)/g)) {
      const pathname = link[1].split(/[?#]/)[0];
      const parts = pathname.split('/').filter(Boolean);
      if (parts.length !== 2) continue;
      const targetCollection = { devices: 'designs', applications: 'applications', companies: 'companies' }[parts[0]];
      const special = parts[0] === 'devices' && ['models', 'designer', 'ecog-history'].includes(parts[1]);
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
console.log(`Content integrity: ${records.designs.length} devices, ${records.applications.length} applications and ${records.companies.length} atlas briefs; IDs, orders, relationships and catalog links verified.`);
