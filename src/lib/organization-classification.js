import catalog from '../data/organization-programs.js';

export const stageLabels = {0: 'Concept', 1: 'Bench testing', 2: 'Animal studies', 3: 'Human studies', 4: 'Clinical product', '?': 'Stage unverified'};
export const regulatoryLabels = {R: 'Research', A: 'Regulatory approved', K: 'Cleared', '?': 'Status unverified'};
export const sortLabels = {name: 'Name A–Z', maturity: 'Most advanced first', early: 'Earliest research first'};

export function classifyOrganization(entry) {
  const kind = entry.data?.kind ?? entry.kind;
  const prefix = kind === 'Lab' ? 'L' : 'C';
  const records = catalog[entry.slug] ?? [{name: 'Program not yet classified', stage: null, regulatory: '?', notes: 'Evidence has not yet been classified.', evidenceUrl: `/companies/${entry.slug}/`}];
  const programs = records.map(program => ({...program, code: `${prefix}${program.stage ?? '?'}${program.regulatory}`, label: `${kind} · ${stageLabels[program.stage ?? '?']} · ${regulatoryLabels[program.regulatory]}`}));
  return {programs, primary: representativeProgram(programs)};
}

// Prefer current programs. Within those, use the highest documented stage;
// equal-stage pathways are not ranked against one another.
export function representativeProgram(programs) {
  const current = programs.filter(program => !program.historical);
  return [...(current.length ? current : programs)].sort((a, b) => (b.stage ?? -1) - (a.stage ?? -1))[0];
}

export function matchingPrograms(entry, {stage = '', regulatory = '', interfaceType = ''} = {}) {
  return (entry.classification?.programs ?? []).filter(program =>
    (!stage || String(program.stage ?? '?') === stage) && (!regulatory || program.regulatory === regulatory) &&
    (!interfaceType || (program.interfaces ?? []).includes(interfaceType)));
}

export function displayProgram(entry, state = {}) {
  return representativeProgram(matchingPrograms(entry, state)) ?? entry.classification?.primary;
}

export function sortAtlasEntries(entries, state = {}) {
  const sort = state.sort ?? 'name';
  return [...entries].sort((a, b) => {
    if (sort !== 'name') {
      const as = displayProgram(a, state)?.stage, bs = displayProgram(b, state)?.stage;
      if (as == null && bs != null) return 1;
      if (bs == null && as != null) return -1;
      if (as != null && bs != null && as !== bs) return sort === 'early' ? as - bs : bs - as;
    }
    return a.title.localeCompare(b.title);
  });
}

export function compareOrganizations(a, b) {
  return a.data.title.replace(/^\d+\s*[-—]\s*/, '').localeCompare(b.data.title.replace(/^\d+\s*[-—]\s*/, ''));
}
