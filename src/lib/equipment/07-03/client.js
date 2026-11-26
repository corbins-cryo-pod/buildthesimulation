const root = '/equipment/07-03/';
const $ = id => document.getElementById('ts-' + id);
const fmt = (n, digits) => Number(n).toFixed(digits);
const safeName = str => str.replace(/[^a-z0-9_.-]/gi, '-').slice(0, 90);

function save(blob, name) {
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  link.href = url;
  link.download = name;
  document.body.append(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 4000);
}
const saveJSON = (data, name) => save(new Blob([JSON.stringify(data, null, 2) + '\n'], {type:'application/json'}), name);

function drawScale(ctx, frame) {
  const {lengthUm, lengthPx} = frame.metadata.scaleBar;
  const right = frame.width - 10, y = frame.height - 10;
  ctx.fillStyle = 'rgba(20,24,24,.81)';
  ctx.fillRect(right - lengthPx - 6, y - 18, lengthPx + 12, 24);
  ctx.fillStyle = '#ffffff';
  ctx.font = '11px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(lengthUm + ' µm', right - lengthPx / 2, y - 5);
  ctx.fillRect(right - lengthPx, y, lengthPx, 2);
}

async function decodeImage(file) {
  if (!file || !['image/png','image/jpeg'].includes(file.type) || file.size > 16 * 1024 * 1024) {
    throw Error('Choose a PNG or JPEG up to 16 MB.');
  }
  const bitmap = await createImageBitmap(file);
  try {
    const {width, height} = bitmap;
    if (Math.min(width,height) < 2 || Math.max(width,height) > 4096 || width * height > 4194304) {
      throw Error('Image dimensions must be 2–4,096 pixels per axis and at most 4,194,304 pixels in total.');
    }
    const scratch = document.createElement('canvas');
    scratch.width = width;
    scratch.height = height;
    const ctx = scratch.getContext('2d', {willReadFrequently:true});
    ctx.drawImage(bitmap, 0, 0);
    const {data} = ctx.getImageData(0, 0, width, height);
    const phase = new Uint8Array(width * height), fluorescence = new Uint8Array(width * height);
    for (let i = 0; i < phase.length; i++) {
      const j = 4 * i;
      const alpha = data[j + 3] / 255;
      const luminance = .2126 * data[j] + .7152 * data[j + 1] + .0722 * data[j + 2];
      phase[i] = Math.round(alpha * luminance + (1 - alpha) * 204);
      fluorescence[i] = Math.round(alpha * data[j + 1]);
    }
    return {width, height, phase, fluorescence, sourceName:file.name};
  } finally {
    bitmap.close();
  }
}

export async function start() {
  const {acquire, measureDistance, makeExample} = await import(/* @vite-ignore */ root + 'optics.mjs');
  const {reservationFromObservation, samplesFromExposure} = await import(/* @vite-ignore */ root + 'handoff.mjs');
  const canvas = $('field');
  const ctx = canvas.getContext('2d');
  let viewer, loaded = true, imported, fileRequest = 0, parents = new Map(), custody = [];
  let frame, captured = false, job, cursor, firstPoint, captureCount = 0;
  const log = document.querySelector('#observations tbody');
  function status(text) { $('status').textContent = text; }
  function readJob() {
    const sampleId = $('sample').value.trim();
    if (!/^[A-Za-z0-9][A-Za-z0-9_.-]{0,63}$/.test(sampleId)) throw Error('Use a sample ID of 1–64 letters, numbers, periods, underscores or hyphens, starting with a letter or number.');
    return {...makeExample(), ...parents.get(sampleId), sampleId, fixture:$('fixture').value, mode:$('mode').value,
      epiInstalled:$('epi').checked, objective:Number($('objective').value), focusUm:$('focus').valueAsNumber,
      stageXUm:$('x').valueAsNumber, stageYUm:$('y').valueAsNumber};
  }
  function syncInstrument() {
    if (!viewer) return;
    const num = (id, max) => Math.min(max, Math.max(-max, $(id).valueAsNumber || 0));
    viewer.sync({loaded, fixture:$('fixture').value, objective:Number($('objective').value), mode:$('mode').value,
      focusUm:num('focus',12), stageXUm:num('x',150), stageYUm:num('y',150)});
  }
  function render(showCursor = false) {
    if (!frame) {
      ctx.fillStyle = '#252925';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      return;
    }
    ctx.putImageData(new ImageData(frame.pixels, frame.width, frame.height), 0, 0);
    drawScale(ctx, frame);
    const measurement = frame.metadata.rulerMeasurement;
    function mark([x,y]) {
      ctx.beginPath();
      ctx.moveTo(x-4,y); ctx.lineTo(x+4,y); ctx.moveTo(x,y-4); ctx.lineTo(x,y+4);
      ctx.stroke();
    }
    ctx.strokeStyle = '#ef8e23'; ctx.lineWidth = 1.5;
    if (measurement) {
      ctx.beginPath(); ctx.moveTo(...measurement.startPx); ctx.lineTo(...measurement.endPx); ctx.stroke();
      mark(measurement.startPx); mark(measurement.endPx);
    } else if (firstPoint) mark(firstPoint);
    if (showCursor && cursor) {ctx.strokeStyle = '#1cb5d4'; mark(cursor);}
  }
  function updateActions() {
    $('png').disabled = $('json').disabled = !captured;
    $('handoff').disabled = !captured || frame.metadata.acquisition.fixture === 'micrometer';
    $('clear').disabled = !captured || !(firstPoint || frame.metadata.rulerMeasurement);
  }
  function refresh() {
    captured = false; frame = null; firstPoint = cursor = null;
    $('mount').textContent = loaded ? 'Unload slide' : 'Load slide';
    $('import-area').hidden = $('fixture').value !== 'raster';
    $('ruler').textContent = 'Capture a field to measure between two points.';
    $('fov').textContent = $('sampling').textContent = $('pitch').textContent = '—';
    syncInstrument();
    try {
      job = readJob();
      if (!loaded) throw Error('The slide holder is empty. Load a slide before capturing.');
      const channel = $('raster-channel').value;
      const source = imported && {width:imported.width, height:imported.height, sourceName:imported.sourceName,
        pixelSizeUm:$('input-pitch').valueAsNumber, channel, pixels:imported[channel]};
      frame = acquire(job, source);
      const m = frame.metadata;
      $('fov').textContent = fmt(m.fovUm.width,1) + ' × ' + fmt(m.fovUm.height,1) + ' µm';
      $('sampling').textContent = fmt(m.pixelSizeUm,4) + ' µm/px';
      $('image-state').textContent = 'Live preview · ' + job.objective + '×';
      $('acquire').disabled = false;
      status('Ready to capture ' + job.sampleId + '.');
    } catch (e) {
      $('acquire').disabled = true;
      $('image-state').textContent = 'No image';
      status(e.message);
    }
    render();
    updateActions();
  }
  const defaultId = {micrometer:'MICROMETER-10UM', neurites:'NEURITE-001', raster:'IMAGE-001'};
  $('fixture').onchange = () => {
    fileRequest++;
    $('sample').value = defaultId[$('fixture').value];
    $('custody-sample').value = '';
    loaded = true;
    refresh();
  };
  $('mount').onclick = () => { loaded = !loaded; refresh(); };
  for (const key of ['objective','mode','raster-channel']) $(key).onchange = refresh;
  for (const key of ['x','y','focus','input-pitch','sample']) $(key).oninput = refresh;
  $('center').onclick = () => { for (const key of ['focus','x','y']) $(key).value = '0'; refresh(); };
  $('epi').onchange = () => {
    const enabled = $('epi').checked;
    $('mode').querySelector('[value="fluorescence"]').disabled = !enabled;
    if (!enabled && $('mode').value === 'fluorescence') $('mode').value = 'phase';
    refresh();
    if (!enabled && frame) status('Epi module removed. Only the transmitted channel is available.');
  };
  $('file').onchange = async e => {
    const request = ++fileRequest, file = e.target.files[0];
    imported = null;
    refresh();
    if (!file) return;
    try {
      const image = await decodeImage(file);
      if (request !== fileRequest) return;
      imported = image;
      loaded = true;
      refresh();
    } catch (error) { if (request === fileRequest) status(error.message); }
  };
  $('custody').onchange = async e => {
    const file = e.target.files[0];
    if (!file) return;
    try {
      if (file.size > 5e6) throw Error('Choose an exposure record under 5 MB.');
      custody = samplesFromExposure(JSON.parse(await file.text()));
      const select = $('custody-sample');
      select.replaceChildren(new Option('Select a sample…',''),...custody.map(s => new Option(s.sampleId + ' · revision ' + s.parentRevision,s.sampleId)));
      $('custody-choice').hidden = false;
      status('Choose the sample identity to attach to a calibrated image.');
    } catch (error) {status('Exposure record rejected. ' + error.message);}
    e.target.value = '';
  };
  $('custody-sample').onchange = () => {
    const sample = custody.find(s => s.sampleId === $('custody-sample').value);
    if (!sample) return;
    const local = parents.get(sample.sampleId);
    if (local && local.parentRevision >= sample.parentRevision) {
      status('This session already holds that sample revision or a later one.');
      return;
    }
    parents.set(sample.sampleId,sample);
    $('fixture').value = 'raster';
    $('sample').value = sample.sampleId;
    fileRequest++; imported = null; $('file').value = ''; loaded = true;
    refresh();
  };
  $('acquire').onclick = () => {
    refresh();
    if (!frame) return;
    const m = frame.metadata;
    captured = true; captureCount++;
    const basename = safeName(m.sampleId) + '-r' + m.revision + '-' + job.objective + 'x-' + job.mode;
    m.imageFile = basename + '.png';
    m.scaleBarBurnedIn = true;
    m.rulerMeasurement = null;
    parents.set(m.sampleId,{parentRevision:m.revision,contactIds:m.contactIds,history:m.history});
    $('image-state').textContent = 'Captured · ' + job.objective + '×';
    $('pitch').textContent = m.measurement ? fmt(m.measurement.pitchUm,3) + ' µm' : '—';
    $('ruler').textContent = 'Click or tap two points to measure. With the image focused, use arrows and Enter.';
    if (captureCount === 1) log.replaceChildren();
    const row = document.createElement('tr');
    const cells = [m.sampleId+' · r'+m.revision,job.objective+'×',job.mode,fmt(m.fovUm.width,2)+' µm',
      m.measurement ? fmt(m.measurement.pitchPx,3)+' px' : '—',m.measurement ? fmt(m.measurement.pitchUm,3)+' µm' : '—'];
    for (const value of cells) {const cell = document.createElement('td'); cell.textContent = value; row.append(cell);}
    log.prepend(row);
    const result = m.measurement ? 'Detected ' + m.measurement.markCount + ' marks, spaced ' + fmt(m.measurement.pitchPx,3) + ' px apart.'
      : job.fixture === 'micrometer' && job.mode === 'fluorescence' ? 'The unlabeled micrometer emits no fluorescence.'
      : job.fixture === 'micrometer' ? 'Too few divisions are visible to measure pitch.' : 'Select two points to measure a structure.';
    status('Captured ' + m.sampleId + ' revision ' + m.revision + '. ' + result);
    updateActions();
  };
  function pick(point) {
    if (!captured) return;
    if (!firstPoint) {
      firstPoint = point;
      frame.metadata.rulerMeasurement = null;
      $('ruler').textContent = 'First point placed. Select the second point.';
    } else {
      const measurement = measureDistance(job,firstPoint,point);
      frame.metadata.rulerMeasurement = measurement;
      firstPoint = null;
      $('ruler').textContent = 'Point-to-point distance ' + fmt(measurement.distanceUm,2) + ' µm (' + fmt(measurement.distancePx,2) + ' px).';
    }
    render();
    updateActions();
  }
  canvas.onclick = e => {
    const rect = canvas.getBoundingClientRect();
    const position = (v,n) => Math.min(n-1,Math.max(0,v*n-.5));
    pick([position((e.clientX-rect.left)/rect.width,canvas.width),position((e.clientY-rect.top)/rect.height,canvas.height)]);
  };
  canvas.onkeydown = e => {
    if (!captured) return;
    const moves = {ArrowUp:[0,-1],ArrowDown:[0,1],ArrowLeft:[-1,0],ArrowRight:[1,0]};
    if (!Object.hasOwn(moves,e.key) && e.key !== 'Enter') return;
    e.preventDefault();
    cursor ??= [Math.floor(canvas.width/2),Math.floor(canvas.height/2)];
    if (e.key === 'Enter') {pick([...cursor]); return;}
    const [dx,dy] = moves[e.key], step = e.shiftKey ? 10 : 1;
    cursor = [Math.max(0,Math.min(canvas.width-1,cursor[0]+dx*step)),Math.max(0,Math.min(canvas.height-1,cursor[1]+dy*step))];
    render(true);
  };
  $('clear').onclick = () => {
    if (!captured) return;
    firstPoint = cursor = null; frame.metadata.rulerMeasurement = null;
    $('ruler').textContent = 'Ruler cleared. Select two points to measure.';
    render(); updateActions();
  };
  $('png').onclick = () => {
    if (!captured) return;
    const metadata = structuredClone(frame.metadata);
    const output = document.createElement('canvas');
    output.width = frame.width;
    output.height = frame.height;
    const target = output.getContext('2d');
    // Export the calibration bar and completed ruler. An unfinished cursor is transient.
    const pending = firstPoint;
    firstPoint = null;
    render();
    target.drawImage(canvas,0,0);
    firstPoint = pending;
    if (pending) render();
    output.toBlob(async blob => {
      try {
        if (!blob) throw Error('The browser could not encode the PNG.');
        const {embedAcquisition} = await import(/* @vite-ignore */ root + 'png-metadata.mjs');
        const bytes = embedAcquisition(new Uint8Array(await blob.arrayBuffer()),metadata);
        save(new Blob([bytes],{type:'image/png'}),metadata.imageFile);
      } catch (error) {status(error.message);}
    },'image/png');
  };
  $('json').onclick = () => {
    if (captured) saveJSON(frame.metadata,frame.metadata.imageFile.replace(/\.png$/,'.json'));
  };
  $('handoff').onclick = () => {
    if (!captured) return;
    try {saveJSON(reservationFromObservation(frame.metadata),safeName(job.sampleId)+'-07-02.json');}
    catch (error) {status(error.message);}
  };
  refresh();
  try {
    const {openMicroscope} = await import('./viewer.js');
    viewer = await openMicroscope($('model'));
    syncInstrument();
    $('model-status').textContent = '3D model loaded';
    document.querySelectorAll('[data-ts-view]').forEach(button => {
      button.disabled = false;
      button.onclick = () => viewer.go(button.dataset.tsView);
    });
  } catch (error) {$('model-status').textContent = 'Model unavailable · ' + error.message;}
}
