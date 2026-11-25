import zones from './zones.json';
import sources from './sources.json';

const zoneFiles = import.meta.glob('./zones/*.json', { eager: true, import: 'default' });
export const equipment = Object.values(zoneFiles).flat().sort((a, b) => a.id.localeCompare(b.id));
export { zones, sources };
export const base = '/simulations/equipment/';
export const report = '/equipment-reference/neural-lab-equipment-v1.pdf';
export const zoneId = (record) => record.id.slice(0, 2);
export const evidence = {
  A: 'Specific technical documentation identified',
  B: 'Product family or research installation identified',
  C: 'Provisional candidate or custom design'
};
export const dossiers = [
  ['Mask aligner', 52, ['02-01']],
  ['Microfabrication process line', 53, ['02-07','03-01','03-03','03-08','04-01','05-01']],
  ['Scaffold printer and microfluidics', 54, ['06-01','06-07','06-08']],
  ['Patch-clamp rig', 55, ['10-01','10-02','10-06','10-07']],
  ['Multichannel interface and nerve bench', 56, ['10-09','10-10','10-14']],
  ['High-density culture and recording', 57, ['10-11','10-13']],
  ['Optical stimulation bench', 58, ['11-01','11-03','11-05','11-07']],
  ['Connectomics station', 59, ['13-02','13-04','13-07']],
  ['Electrochemistry and reliability', 60, ['09-01','09-12','14-01','14-03']]
];
