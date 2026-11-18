import { PLYLoader } from 'three/addons/loaders/PLYLoader.js';

export const SPECIMEN_VIEWS = {
  bone: { label: 'Bony spiral', parts: ['bone'], description: 'Orbit the trimmed temporal bone from the basal opening to the apex.' },
  chambers: { label: 'Fluid chambers', parts: ['vestibuli'], description: 'Follow the two fluid spaces around the spiral. Hide either chamber to inspect the other.' },
  section: { label: 'Modiolar section', parts: ['bone-section', 'tympani-section', 'vestibuli-section'], description: 'A plane through the estimated modiolar axis exposes successive turns. Hide the chamber fills to see the cavities.' },
};

const descriptions = {
  bone: { label: 'Specimen bone', layer: 'specimenBone', color: '#ceb799' },
  vestibuli: { label: 'Scala vestibuli', layer: 'specimenSV', color: '#b17764' },
  tympani: { label: 'Scala tympani', layer: 'specimenST', color: '#427e78' },
};
export const specimenPart = name => descriptions[name.split('-')[0]];
const requests = new Map();

export function parseSpecimenPart(name, buffer) {
  const geometry = new PLYLoader().parse(buffer);
  try {
    const position = geometry.getAttribute('position'), triangles = geometry.index;
    if (!position?.count || !triangles?.count || triangles.count % 3) throw new Error('Invalid specimen mesh');
    const vertexColors = geometry.getAttribute('color');
    return {
      ...specimenPart(name), id: 'specimen-' + name, role: 'segmented-specimen',
      positions: Array.from(position.array), indices: Array.from(triangles.array),
      appearanceColors: vertexColors?.array, opacity: 1, roughness: .82,
    };
  } finally { geometry.dispose(); }
}

function loadPart(name) {
  if (!requests.has(name)) {
    const url = '/assets/cochlear/specimen/' + name + '.ply';
    const request = fetch(url).then(response => {
      if (!response.ok) throw new Error('Specimen mesh unavailable');
      return response.arrayBuffer();
    }).then(buffer => parseSpecimenPart(name, buffer)).catch(error => {
      requests.delete(name);
      throw error;
    });
    requests.set(name, request);
  }
  return requests.get(name);
}

export function loadSpecimen(view) {
  const parts = view === 'overlay' ? ['bone-section'] : SPECIMEN_VIEWS[view].parts;
  return Promise.all(parts.map(loadPart));
}
