import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import catalog from '../src/data/organization-programs.js';
import { classifyOrganization, sortAtlasEntries, displayProgram, compareOrganizations } from '../src/lib/organization-classification.js';
import { filterAtlasEntries, readAtlasState } from '../src/lib/atlas/data.js';

const files = fs.readdirSync('src/content/companies').filter(file => file.endsWith('.md'));
const entries = files.map(file => {
  const text = fs.readFileSync(`src/content/companies/${file}`, 'utf8');
  return {slug: file.slice(0, -3), data: {title: text.match(/^title: "(.+)"/m)[1], kind: text.match(/^kind: "(.+)"/m)[1]}};
});
const organization = n => entries.find(entry => entry.slug.startsWith(`${String(n).padStart(2, '0')}-`));
const atlasEntry = n => {const entry = organization(n); return {slug: entry.slug, title: entry.data.title, kind: entry.data.kind, region: 'Other', tags: [], interfaces: [], devices: [], applications: [], classification: classifyOrganization(entry)};};

test('every organization has explicitly scoped evidence and authorization records', () => {
  assert.equal(entries.length, 79);
  assert.deepEqual(Object.keys(catalog).sort(), entries.map(entry => entry.slug).sort());
  for (const entry of entries) {
    const classification = classifyOrganization(entry);
    for (const program of classification.programs) {
      assert.match(program.code, /^[CL][0-4?][RAK?]$/);
      assert.ok(program.name && program.notes && program.evidenceUrl);
      if (program.evidenceUrl.startsWith('/devices/')) assert.ok(fs.existsSync(`src/content/designs/${program.evidenceUrl.split('/')[2]}.md`));
      if (program.regulatory === 'A' || program.regulatory === 'K') {
        assert.equal(program.stage, 4);
        assert.ok(program.authorizationUrl && program.authorizationLabel);
      } else assert.notEqual(program.stage, 4);
    }
  }
});

test('clinical component authorization stays separate from future BCI and biohybrid programs', () => {
  const blackrock = classifyOrganization(organization(4));
  assert.equal(blackrock.primary.code, 'C4K');
  assert.equal(blackrock.programs.find(p => p.name.startsWith('MoveAgain')).code, 'C3R');
  const science = classifyOrganization(organization(6));
  assert.equal(science.primary.code, 'C4A');
  assert.equal(science.programs.find(p => p.name.includes('biohybrid')).code, 'C2R');
  assert.equal(classifyOrganization(organization(1)).primary.code, 'C3R');
});

test('approval applies across countries while the precise pathway remains available', () => {
  for (const n of [6, 20, 23, 31, 52]) assert.equal(classifyOrganization(organization(n)).primary.code, 'C4A');
  assert.match(classifyOrganization(organization(31)).primary.authorizationLabel, /NMPA/);
  assert.match(classifyOrganization(organization(23)).primary.authorizationLabel, /HDE/);
  assert.equal(classifyOrganization(organization(62)).primary.code, 'C4K');
  assert.match(classifyOrganization(organization(62)).programs[1].authorizationLabel, /De Novo/);
});

test('historical authorization never upgrades an active research program', () => {
  const cortigent = classifyOrganization(organization(24));
  assert.equal(cortigent.primary.code, 'C3R');
  assert.equal(cortigent.programs.find(p => p.historical).code, 'C4A');
  assert.equal(classifyOrganization(organization(23)).primary.historical, true);
});

test('stage and regulatory filters match the same program and its badge', () => {
  const entries = [atlasEntry(4), atlasEntry(6), atlasEntry(24)];
  assert.deepEqual(filterAtlasEntries(entries, {stage: '2', regulatory: 'K'}), []);
  const research = filterAtlasEntries(entries, {stage: '2', regulatory: 'R'});
  assert.equal(research.length, 1);
  assert.equal(displayProgram(research[0], {stage: '2', regulatory: 'R'}).code, 'C2R');
  assert.equal(filterAtlasEntries(entries, {query: 'C2R biohybrid'})[0].slug, organization(6).slug);
  assert.equal(filterAtlasEntries(entries, {stage: '4', regulatory: 'A'}).length, 2);
  const science = {...atlasEntry(6), interfaces: ['Intracortical', 'Other']};
  assert.equal(filterAtlasEntries([science], {interfaceType: 'Intracortical', regulatory: 'A'}).length, 0);
  assert.equal(displayProgram(science, {interfaceType: 'Intracortical', regulatory: 'R'}).code, 'C2R');
});

test('maturity sorts favor actual stage, not funding or legacy priority, and unknown stays last', () => {
  const unknown = {...atlasEntry(26), slug: 'new-lab', title: 'A new lab', classification: classifyOrganization({slug: 'new-lab', data: {kind: 'Lab'}})};
  assert.equal(unknown.classification.primary.code, 'L??');
  const list = [atlasEntry(26), unknown, atlasEntry(52), atlasEntry(40)];
  assert.deepEqual(sortAtlasEntries(list).map(e => e.classification.primary.code), ['C4A', 'L2R', 'C0R', 'L??']);
  assert.deepEqual(sortAtlasEntries(list, {sort: 'early'}).map(e => e.classification.primary.code), ['C0R', 'L2R', 'C4A', 'L??']);
  assert.equal(sortAtlasEntries(list, {sort: 'name'})[0].slug, 'new-lab');
  assert.ok(compareOrganizations(organization(52), organization(1)) < 0);
  assert.equal(list[0].slug, organization(26).slug); // Sorting doesn't mutate caller state.
});

test('shared URLs validate stage, status and sort values', () => {
  const entries = [atlasEntry(6)];
  const valid = readAtlasState(`?stage=2&reg=R&sort=early&org=${entries[0].slug}`, entries);
  assert.equal(valid.stage, '2'); assert.equal(valid.regulatory, 'R'); assert.equal(valid.sort, 'early');
  const invalid = readAtlasState('?stage=9&reg=D&sort=funding', entries);
  assert.equal(invalid.stage, ''); assert.equal(invalid.regulatory, ''); assert.equal(invalid.sort, 'maturity');
});
