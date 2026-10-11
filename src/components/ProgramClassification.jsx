import '../styles/organization-classification.css';
import { stageLabels, regulatoryLabels } from '../lib/organization-classification.js';

export function ClassificationBadge({program}) {
  if (!program) return null;
  return <span class="org-code" data-status={program.regulatory} title={`${program.name}: ${program.label}`} aria-label={program.label}>{program.code}</span>;
}

export default function ProgramClassification({classification, primary = classification.primary}) {
  return <details class="org-classification">
    <summary><ClassificationBadge program={primary} /><span><strong>Stage {primary.stage ?? '?'} · {stageLabels[primary.stage ?? '?']}</strong><small>{regulatoryLabels[primary.regulatory]}{primary.historical ? ' · Historical' : ''}</small></span></summary>
    <div class="org-classification-content">
      {classification.programs.map(program => <section class="org-program" key={program.name}>
        <div><ClassificationBadge program={program} /><strong>{program.name}</strong></div>
        <p class="org-program-stage">{program.label}{program.historical ? ' · Historical / discontinued' : ''}</p>
        <p>{program.notes}</p>
        <div class="org-program-links"><a href={program.evidenceUrl} {...(program.evidenceUrl.startsWith('https:') ? {target: '_blank', rel: 'noopener noreferrer'} : {})}>Evidence &amp; sources →</a>{program.authorizationUrl && <a href={program.authorizationUrl} target="_blank" rel="noopener noreferrer">{program.authorizationLabel} →</a>}</div>
      </section>)}
      <a class="org-guide-link" href="/companies/classification/">How to read the codes →</a>
    </div>
  </details>;
}
