import { companyBriefs } from '../data/company-briefs.js';

const text = node => node.value ?? node.children?.map(text).join('') ?? '';
const heading = label => ({ type: 'heading', depth: 2, children: [{ type: 'text', value: label }] });
const external = url => /^https?:\/\//i.test(url);
const escape = value => value.replaceAll('&', '&amp;').replaceAll('"', '&quot;').replaceAll('<', '&lt;').replaceAll('>', '&gt;');
const isSources = label => /^(?:primary sources|sources(?: \(.*\))?|references(?: \/ official pages)?)$/i.test(label);
const isUpdate = label => /^2026 update\b/i.test(label);
const urlLabel = node => /^https?:\/\//i.test(text(node).trim());

function sourceLabel(node, ancestors, section) {
  const named = text(node).trim();
  if (named && !urlLabel(node)) return named;
  const paragraph = ancestors.findLast(parent => parent.type === 'paragraph');
  const prefix = paragraph?.children.slice(0, paragraph.children.indexOf(node)).map(text).join('').trim().replace(/[:;,.]\s*$/, '');
  if (prefix && prefix.length < 160 && !/^(source|sources|doi|pmc|coverage|full text)$/i.test(prefix)) return prefix;
  const item = ancestors.findLast(parent => parent.type === 'listItem');
  const context = item?.children.find(child => child.type === 'paragraph' && child !== paragraph);
  if (context && text(context).length < 160) return text(context).replace(/[:;,.]\s*$/, '');
  const url = new URL(node.url);
  if (/pubmed/.test(url.hostname)) return `PubMed record ${url.pathname.replaceAll('/', '')}`;
  if (/pmc\.|\/pmc\//.test(url.hostname + url.pathname)) return `Full text · ${url.pathname.match(/PMC\d+/)?.[0] ?? 'PubMed Central'}`;
  if (/clinicaltrials\.gov/.test(url.hostname)) return `Trial registry · ${url.pathname.split('/').filter(Boolean).at(-1)}`;
  if (/doi\.org/.test(url.hostname)) return `Publication · ${url.pathname.slice(1)}`;
  if (/nature\.com|science\.org|sciencedirect\.com|ieee\.org/.test(url.hostname)) return `${section || 'Research'} · publication`;
  if (!url.pathname || url.pathname === '/') return 'Official website';
  const tail = decodeURIComponent(url.pathname.split('/').filter(Boolean).at(-1)).replace(/\.(html?|aspx|php)$/i, '').replace(/[-_]+/g, ' ');
  return tail.length > 12 && !/^\d/.test(tail) ? tail[0].toUpperCase() + tail.slice(1) : `${section || 'Organization'} · source page`;
}

function walk(node, callback, ancestors = []) {
  callback(node, ancestors);
  for (const child of node.children ?? []) walk(child, callback, [...ancestors, node]);
}

// Reference lists move to the source index; statements and qualifiers stay in the prose.
function referenceOnly(node) {
  if (node.type === 'list') return node.children.every(referenceOnly);
  if (node.type === 'listItem') return node.children.every(referenceOnly);
  if (node.type !== 'paragraph') return false;
  const links = node.children.filter(child => child.type === 'link' && external(child.url));
  if (!links.length) return false;
  const words = node.children.filter(child => child.type !== 'link').map(text).join('').trim();
  return !words.replace(/[\s.,:;()]/g, '') || (words.length < 100 && /:\s*$/.test(words));
}

function deviceLinksOnly(node) {
  if (node.type === 'list') return node.children.every(deviceLinksOnly);
  if (node.type === 'listItem') return node.children.every(deviceLinksOnly);
  return node.type === 'paragraph' && node.children.some(child => child.type === 'link' && /^\/devices\//.test(child.url)) && node.children.every(child => child.type === 'link' && /^\/devices\//.test(child.url) || child.type === 'text' && /^[\s.,;]*$/.test(child.value));
}

function updateCategory(node) {
  const label = text(node).toLowerCase();
  if (/^prima\b/.test(label)) return 'PRIMA';
  if (/^(funding|location|corporate|company|ownership|leadership|pixium|current base|headquarters)/.test(label)) return 'Company background';
  if (/^(trial|clinical|human|first human|recent|regulatory|fda|speech|moveagain|approval|first participant)/.test(label)) return 'Clinical progress';
  return 'The technology';
}

function compactCitations(node) {
  for (const child of node.children ?? []) compactCitations(child);
  if (!node.children) return;
  const onlyCitations = child => child.type === 'paragraph' && child.children.every(part => part.type === 'html' && part.value.startsWith('<sup>') || part.type === 'text' && /^[\s.,;]*$/.test(part.value));
  for (let index = 0; index < node.children.length; index++) {
    const child = node.children[index];
    if (child.type === 'list' && child.children.every(item => item.children.every(onlyCitations))) {
      const prior = node.children[index - 1];
      const target = prior?.type === 'paragraph' ? prior : prior?.type === 'list' ? prior.children.at(-1)?.children.findLast(item => item.type === 'paragraph') : null;
      if (target) {
        target.children.push({ type: 'text', value: ' ' }, ...child.children.flatMap(item => item.children.flatMap(p => p.children)));
        node.children.splice(index--, 1);
      }
    } else if (onlyCitations(child) && node.children[index - 1]?.type === 'paragraph') {
      node.children[index - 1].children.push({ type: 'text', value: ' ' }, ...child.children);
      node.children.splice(index--, 1);
    }
  }
}

export function formatCompanyBrief(tree, { bespoke = false } = {}) {
  if (bespoke) return { sources: [] };
  const sources = [];
  const byUrl = new Map();
  const labels = new Map();
  let section = '';
  // Capture titles before reorganizing the page, including source-only lists.
  for (const block of tree.children) {
    if (block.type === 'heading') section = isUpdate(text(block)) ? 'Organization' : text(block).replace(/\s*\(reviewed[^)]*\)/gi, '');
    walk(block, (node, ancestors) => {
      if (node.type !== 'link' || !external(node.url)) return;
      const label = sourceLabel(node, ancestors, section);
      const old = labels.get(node.url);
      if (!old || !urlLabel(node)) labels.set(node.url, label);
    });
  }

  const blocks = [];
  const updates = [];
  let sourceSection = false;
  let updateSection = false;
  let deviceSection = false;
  let parentLabel = '';
  for (const block of tree.children) {
    if (block.type === 'thematicBreak' || block.type === 'heading' && block.depth === 1) continue;
    if (block.type === 'heading') {
      const label = text(block);
      sourceSection = isSources(label);
      updateSection = isUpdate(label);
      deviceSection = /^(device entries|cataloged hardware)$/i.test(label);
      if (sourceSection || updateSection) continue;
      const cleaned = label.replace(/\s*\(reviewed[^)]*\)/gi, '').replace(/^Oct \d+, 2026 update:\s*/i, '');
      block.children = [{ type: 'text', value: cleaned }];
      const subgroup = /^\d+[).]/.test(cleaned) || /^(Safety in severe paralysis|Earlier first.in.human experience|Preclinical foundation|IDE approval|The scaling bottleneck|What they mean by|“Channels”|Polina Anikeeva|Ed Boyden|Deblina Sarkar|Picower Institute|Center for Neurobiological Engineering|Brain Interfacing Laboratory)/i.test(cleaned);
      block.depth = subgroup && parentLabel ? 3 : 2;
      if (block.depth === 2) parentLabel = cleaned;
      if (/^at a glance$/i.test(cleaned)) block.children = [{ type: 'text', value: 'Company background' }];
      blocks.push(block);
      continue;
    }
    if (updateSection) {
      if (block.type === 'list') for (const item of block.children) updates.push({ label: updateCategory(item), block: { ...block, children: [item] } });
      else updates.push({ label: updateCategory(block), block });
    } else if (sourceSection && referenceOnly(block)) {
      // Metadata keeps the exact destinations; source index replaces the list.
    } else if (deviceSection && deviceLinksOnly(block)) {
      // The same links are displayed in the right-hand collection column.
    } else {
      if (sourceSection) {
        if (blocks.at(-1)?.type !== 'heading' || text(blocks.at(-1)) !== 'Source notes') blocks.push(heading('Source notes'));
        sourceSection = false;
      }
      blocks.push(block);
    }
  }
  for (const { label, block } of updates) {
    let start = blocks.findIndex(item => item.type === 'heading' && item.depth === 2 && (label === 'Company background' ? /company|funding|at a glance/i : label === 'Clinical progress' ? /clinical|human evidence|regulatory|reported|demonstration/i : label === 'PRIMA' ? /prima/i : /technology|building|hardware|cataloged|prototype/i).test(text(item)));
    if (start < 0) {
      const watch = blocks.findIndex(item => item.type === 'heading' && /what to watch|key questions|limits|evidence boundary|sources/i.test(text(item)));
      start = watch < 0 ? blocks.length : watch;
      blocks.splice(start, 0, heading(label));
    }
    let end = start + 1;
    while (end < blocks.length && !(blocks[end].type === 'heading' && blocks[end].depth === 2)) end++;
    blocks.splice(end, 0, block);
  }
  // Remove headings emptied by moving reference lists or simple device lists.
  tree.children = blocks.filter((block, index) => block.type !== 'heading' || blocks[index + 1] && (blocks[index + 1].type !== 'heading' || blocks[index + 1].depth > block.depth));
  let sectionIndex = -1;
  for (const block of tree.children) {
    if (block.type === 'heading' && block.depth === 2) sectionIndex++;
    walk(block, node => {
      if (node.type !== 'link' || !external(node.url)) return;
      let source = byUrl.get(node.url);
      if (!source) {
        source = { id: String(sources.length + 1).padStart(2, '0'), title: labels.get(node.url), publisher: new URL(node.url).hostname.replace(/^www\./, ''), type: 'Reference', url: node.url, sectionIndex };
        sources.push(source);
        byUrl.set(node.url, source);
      }
      if (urlLabel(node)) {
        node.type = 'html';
        node.value = `<sup><a href="#source-${source.id}" aria-label="Source ${source.id}: ${escape(source.title)}">${source.id}</a></sup>`;
        delete node.children;
        delete node.url;
      } else node.data = { ...node.data, hProperties: { ...node.data?.hProperties, target: '_blank', rel: ['noopener', 'noreferrer'] } };
    });
  }
  // Sources listed separately may have no earlier inline citation.
  for (const [url, title] of labels) if (!byUrl.has(url)) {
    sources.push({ id: String(sources.length + 1).padStart(2, '0'), title, publisher: new URL(url).hostname.replace(/^www\./, ''), type: 'Reference', url, sectionIndex: -1 });
  }
  compactCitations(tree);
  return { sources };
}

export default function remarkCompanyBriefs() {
  return (tree, file) => {
    const path = file.path?.replaceAll('\\', '/') ?? '';
    if (!path.includes('/src/content/companies/')) return;
    const slug = path.split('/').at(-1).replace(/\.md$/, '');
    file.data.astro ??= { frontmatter: {} };
    file.data.astro.frontmatter.briefFormatting = formatCompanyBrief(tree, { bespoke: Boolean(companyBriefs[slug]) });
  };
}
