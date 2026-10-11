import test from 'node:test';
import assert from 'node:assert/strict';
import { createMarkdownProcessor } from '@astrojs/markdown-remark';
import { fromHtml } from 'hast-util-from-html';
import remarkCompanyBriefs from '../src/lib/remark-company-briefs.mjs';
import { cleanCompanyTitle, getCompanyBrief, linkedDeviceSlugs } from '../src/lib/company-briefs.js';

const processor = await createMarkdownProcessor({ remarkPlugins: [remarkCompanyBriefs], syntaxHighlight: false });
const render = (body, slug = '02-synchron-company-brief') => processor.render(body, { fileURL: new URL(`../src/content/companies/${slug}.md`, import.meta.url), frontmatter: {} });

test('brief formatter preserves distinct destinations and reuses citations for repeated URLs', async () => {
  const result = await render('Intro <https://example.org/report>.\n\n### Evidence\n\nAgain <https://example.org/report>. [Study results](https://example.org/study).');
  assert.equal(result.metadata.frontmatter.briefFormatting.sources.length, 2);
  assert.equal((result.code.match(/href="#source-01"/g) ?? []).length, 2);
  assert(result.code.includes('href="https://example.org/study"'));
  assert(result.code.includes('target="_blank" rel="noopener noreferrer"'));
  assert(!result.code.includes('>https://example.org/report<'));
  assert.equal(result.metadata.frontmatter.briefFormatting.sources[1].sectionIndex, 0);
});

test('brief source titles cannot introduce HTML into a citation', async () => {
  const result = await render('### Evidence\n\n"A &#60;study&#62;": <https://example.org/report>');
  const tree = fromHtml(result.code, { fragment: true });
  const elements = [];
  const walk = node => { if (node.type === 'element') elements.push(node); for (const child of node.children ?? []) walk(child); };
  walk(tree);
  assert(!elements.some(node => node.tagName === 'study'));
  assert(elements.find(node => node.tagName === 'a').properties.ariaLabel.includes('<study>'));
});

test('URL labels stay compact after typographic quotes and update source labels omit review framing', async () => {
  const result = await render("### 2026 update (reviewed Oct 4, 2026)\n\n- Recent: <https://example.org/What's-On/page.aspx>\n- <https://example.org/12345>");
  assert(!result.code.includes('>https://'));
  assert(!result.metadata.frontmatter.briefFormatting.sources.some(source => /reviewed|2026 update/i.test(source.title)));
  assert(result.metadata.frontmatter.briefFormatting.sources.some(source => source.url.includes("What's-On")));
});

test('brief heading hierarchy has one page title and retains parents of subsections', async () => {
  const result = await render('# Synchron\n\n### The technology\n\n### 1) Implant\n\nImplant description.\n\n### Clinical progress\n\nClinical evidence.');
  assert(!result.code.includes('<h1'));
  assert.deepEqual(result.metadata.headings.map(item => item.depth), [2, 3, 2]);
  assert(result.code.includes('Implant description.'));
});

test('dated update bullets enter relevant sections without changing evidence or dates', async () => {
  const result = await render('### The technology\n\nOriginal description.\n\n### What to watch\n\nOpen questions.\n\n### 2026 update (reviewed Oct 4, 2026)\n\n- *Funding (Apr 29, 2026):* $55M, company-reported. <https://example.org/funding>\n- *Clinical:* temporary implantation only. <https://example.org/trial>');
  assert(!result.code.includes('2026 update'));
  assert(!result.code.includes('reviewed Oct'));
  assert(result.code.includes('$55M, company-reported.'));
  assert(result.code.includes('Apr 29, 2026'));
  assert(result.code.includes('temporary implantation only.'));
  assert(result.code.indexOf('Company background') < result.code.indexOf('What to watch'));
  assert(result.code.indexOf('Clinical progress') < result.code.indexOf('What to watch'));
});

test('retinal updates stay with PRIMA and do not become biohybrid evidence', async () => {
  const result = await render('### The technology\n\nBiohybrid mouse evidence.\n\n### PRIMA visual prosthesis\n\nRetinal trial.\n\n### 2026 update (reviewed Oct 4, 2026)\n\n- *PRIMA 36-month results:* Follow-up was company-reported.');
  assert(result.code.indexOf('PRIMA visual prosthesis') < result.code.indexOf('Follow-up was company-reported.'));
  assert.equal(result.metadata.headings.filter(item => item.depth === 2).length, 2);
});

test('source lists move to the index while source notes remain readable', async () => {
  const result = await render('Intro.\n\n### Primary sources\n\n- [Primary study](https://example.org/study).\n- [Laboratory](https://example.org/lab).\n\nThe cohort was not disclosed.');
  assert.equal(result.metadata.frontmatter.briefFormatting.sources.length, 2);
  assert(result.metadata.frontmatter.briefFormatting.sources.some(source => source.title === 'Primary study'));
  assert(!result.code.includes('Primary sources'));
  assert(result.code.includes('The cohort was not disclosed.'));
});

test('sidebar device lists retain qualified architecture descriptions in the article', async () => {
  const result = await render('### Device entries\n\n- [Implant](/devices/implant/)\n\n### Cataloged hardware\n\n- [Prototype](/devices/prototype/): two configurations, distinct cohorts.');
  assert(!result.code.includes('href="/devices/implant/"'));
  assert(result.code.includes('two configurations, distinct cohorts.'));
  assert.deepEqual(linkedDeviceSlugs('[A](/devices/implant/) [B](/devices/implant/#photos) [C](/devices/prototype/)'), ['implant', 'prototype']);
});

test('approved briefs and content outside the company collection are left intact', async () => {
  const body = '### Evidence\n\n<https://example.org/study>';
  const bespoke = await render(body, '01-neuralink-company-brief');
  assert(bespoke.code.includes('https://example.org/study'));
  assert.equal(bespoke.metadata.headings[0].depth, 3);
  const other = await processor.render(body, { fileURL: new URL('../src/content/designs/example.md', import.meta.url) });
  assert.equal(other.metadata.frontmatter.briefFormatting, undefined);
  assert.equal(other.metadata.headings[0].depth, 3);
});

test('facts omit unavailable websites and photos and source return links always have a target', () => {
  const entry = { slug: '70-shenfu-jianxing-company-brief', body: '', data: { order: 70, title: '神复健行 (Shenfu Jianxing) (company brief)', kind: 'Company', region: 'Chinese', description: 'Existing description.', tags: [] } };
  const brief = getCompanyBrief(entry, { sources: [{ id: '01', url: 'https://example.org', sectionIndex: -1 }] }, [], []);
  assert.equal(brief.name, '神复健行 (Shenfu Jianxing)');
  assert.equal(brief.region, 'China');
  assert.equal(brief.photoDeviceId, undefined);
  assert.equal(brief.sources[0].section, 'top-of-brief');
  assert.equal(cleanCompanyTitle('Second Sight (historical company brief)'), 'Second Sight');
});
