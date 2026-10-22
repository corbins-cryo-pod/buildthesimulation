import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import yaml from 'js-yaml';
import { buildCatalogContents } from '../src/lib/catalog-contents.js';
import assignments from '../src/data/device-organizations.json' with { type: 'json' };
const entry = (slug, title, data = {}, body = '') => ({ slug, data: {title, ...data}, body });

test('research use, reverse links and prose mentions cannot assign a manufacturer', () => {
  const companies = [entry('beta','Beta (company brief)'), entry('alpha','Alpha (lab brief)',{},'[Probe](/devices/probe/)'),entry('hidden','Hidden',{draft:true})];
  const devices = [entry('probe','Probe',{},'[Alpha](/companies/alpha/)'),entry('array','Array'),entry('unlinked','Unlinked'),entry('external','External'),entry('hidden','Hidden',{draft:true})];
  const apps = [entry('use','Study',{orgs:['alpha'],devices:['probe']}),entry('orphan','Orphan'),entry('extstudy','External study',{devices:['external']}),entry('hidden','Hidden',{draft:true})];
  const groups = buildCatalogContents(companies,devices,apps,{probe:{primaryOrganization:'beta'},array:{primaryOrganization:'missing'},external:{developer:{name:'Example Lab',url:'https://example.org/paper'}}});
  assert.deepEqual(groups.slice(0,2).map(g=>g.organization.title),['Alpha','Beta']);
  assert.deepEqual(groups[0].devices,[]);
  assert.deepEqual(groups[1].devices.map(d=>d.slug),['probe']);
  assert.equal(groups[0].applications[0].slug,'use');
  assert.equal(groups[1].applications[0].slug,'use');
  assert.deepEqual(groups.at(-1).devices.map(d=>d.slug),['array','unlinked']);
  const devRow=groups.find(g=>g.organization.title==='Example Lab');
  assert.equal(devRow.organization.href,'https://example.org/paper');
  assert.deepEqual(devRow.devices.map(d=>d.slug),['external']);
  assert.deepEqual(devRow.applications.map(a=>a.slug),['extstudy']);
  assert.equal(groups.at(-1).organization.title,'Miscellaneous');
  assert.equal(groups.at(-1).organization.href,null);
  assert.equal(groups.at(-1).applications[0].slug,'orphan');
  assert.equal(groups.flatMap(g=>g.devices).length,4);
  assert.deepEqual(buildCatalogContents([],[],[]),[]);
});

const collection = name => fs.readdirSync(new URL(`../src/content/${name}/`,import.meta.url)).filter(f=>f.endsWith('.md')).map(file=>{
  const text=fs.readFileSync(new URL(`../src/content/${name}/${file}`,import.meta.url),'utf8');
  const [,frontmatter,body]=text.split('---');
  return {slug:file.replace(/\.md$/,''),data:yaml.load(frontmatter),body};
});
test('the complete published catalog has an explicit review and each device appears exactly once',()=>{
  const orgs=collection('companies'),devices=collection('designs'),apps=collection('applications');
  const published=devices.filter(d=>!d.data.draft),orgSlugs=new Set(orgs.filter(o=>!o.data.draft).map(o=>o.slug));
  assert.deepEqual(Object.keys(assignments).sort(),published.map(d=>d.slug).sort());
  for(const [slug,record] of Object.entries(assignments)){
    assert.ok(record.identityEvidence.length,`${slug}: missing identity evidence`);
    assert.ok(record.source,`${slug}: missing primary source`);
    assert.ok(record.note);
    if(record.primaryOrganization)assert.ok(orgSlugs.has(record.primaryOrganization),slug);
    if(!record.primaryOrganization){
      assert.ok('developer' in record,`${slug}: unassigned without a developer decision`);
      if(record.developer){assert.ok(record.developer.name&&record.developer.url,`${slug}: developer needs name and url`);}
    }
    for(const related of record.relatedOrganizations)assert.ok(orgSlugs.has(related.slug),slug);
  }
  const groups=buildCatalogContents(orgs,devices,apps);
  const indexed=groups.flatMap(g=>g.devices.map(d=>d.slug));
  assert.deepEqual(indexed.sort(),published.map(d=>d.slug).sort());
  assert.equal(new Set(groups.flatMap(g=>g.organization?.slug?[g.organization.slug]:[])).size,orgSlugs.size);
  assert.equal(new Set(groups.flatMap(g=>g.applications.map(a=>a.slug))).size,apps.filter(a=>!a.data.draft).length);
  assert.equal(groups.at(-1).organization.title,'Miscellaneous');
  const primary=slug=>groups.find(g=>g.devices.some(d=>d.slug===slug))?.organization?.slug ?? undefined;
  assert.equal(primary('01-utah-microelectrode-array'),'04-blackrock-neurotech-company-brief');
  assert.equal(primary('04-neuropixels-probe'),'51-imec');
  assert.equal(primary('160-axonics-sacral-neuromodulation'),'60-axonics-company-brief');
  assert.equal(primary('106-neuropixels-nxt-np30-prototype'),'42-jhu-harris-high-capacity-electrophysiology-lab');
  assert.equal(primary('63-pmt-high-density-ecog-array-percutaneous-connector'),undefined);
  assert.equal(primary('69-ucsd-high-density-transparent-graphene-array'),undefined);
});
