export const studies = {
  pietsch: ['Pietsch et al., 2017','10.1038/s41598-017-07795-4','CC BY 4.0'],
  braga: ['Bom Braga et al., 2025','10.1007/s00405-025-09360-6','CC BY 4.0'],
  jwair: ['Jwair et al., 2022','10.1038/s41598-022-21399-7','CC BY 4.0'],
  mishra: ['Mishra et al., 2022','10.4103/JMAU.JMAU_107_20','CC BY-NC-SA 4.0'],
  rattay: ['Rattay et al., 2013','10.1371/journal.pone.0079256','CC BY'],
  jiang: ['Jiang et al., 2020','10.1063/5.0012514','CC BY 4.0'],
};
export const groups = [
  ['whole','Whole cochlea',[
    ['pietsch',1,'The spiral from four directions','Corrosion cast and micro-CT','Compare the basal width, apical rise and oval-window position. A cast occupies the cavity enclosed by the bone. The workstation lets you inspect both boundaries.'],
    ['braga',5,'The central axis in two planes','14 µm micro-CT reconstruction','Find the spiral ganglion and bony shelf as the cut moves from the basal turn toward the apex. The F07 scan samples larger voxels.'],
  ]],
  ['array','Implant models',[
    ['jwair',2,'Where an implanted array actually sits','Histology and matched CT','Compare paired panels from the same temporal bone. The simulator places each array along a reference trajectory. Actual contacts can sit against different walls or enter another scala.'],
    ['jwair',4,'The partition beside an electrode','Modiolar histology','Inspect the osseous spiral lamina and basilar membrane alongside lateral-wall and perimodiolar arrays. Displacement and fracture are visible in some specimens. The implant viewer models geometric placement.'],
  ]],
  ['cutaway','Cochlear cutaway',[
    ['braga',2,'Two fluid spaces and the cochlear partition','14 µm micro-CT reconstruction','Trace the thin spiral lamina from the modiolus to the partition. Our separate ZETA chamber fills simplify the soft tissues between them.'],
    ['braga',3,'The basal turn in sagittal section','14 µm micro-CT reconstruction','Use the cochlear aqueduct and inferior cochlear vein to orient the base. Small canals can remain visible within bone after the main lumens are exposed.'],
  ]],
  ['organ','Hair cells and nerves',[
    ['braga',6,'The sensory strip in the basal turn','2.3 µm local micro-CT reconstruction','Follow the outer hair cell region along the partition. This targeted scan covers a short segment of the cochlea.'],
    ['mishra',5,'Hair bundles at 37 weeks of gestation','Human developmental scanning electron microscopy','Inspect the orientation of the V-shaped outer hair bundles. This developmental specimen includes a four-row region. The simulator uses a representative three-row outer array.'],
  ]],
  ['neuron','Auditory neuron',[
    ['rattay',4,'Myelin at the human neuronal soma','Transmission electron microscopy','In panel B a satellite glial cell surrounds the soma and myelin begins along the process. Compare the less common myelinated soma in A. The modeled neuron represents one arrangement.'],
    ['rattay',5,'From the basal turn to individual neurons','Volume reconstruction and confocal microscopy','Compare the long nerve trajectory with the local cluster of cell bodies. A single displayed cable samples one path within this population.'],
  ]],
  ['unrolled','Calculation space',[
    ['jwair',6,'Uncoiling an implanted cochlea','Multiplanar CT reconstruction','Compare each curved array with the corresponding straightened image. Straightening preserves the order along the path while changing how neighboring turns appear. The simulator uses an idealized distance axis.'],
  ]],
  ['field','Contact field',[
    ['jiang',2,'Voltage recorded across physical contacts','Human temporal-bone impedance measurements','In panel B one electrode delivers current and a different electrode records voltage. These measurements test current spread through tissue. A nerve recruitment map requires separate physiological measurements.'],
  ]],
];
