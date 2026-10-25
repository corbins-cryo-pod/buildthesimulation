import { useEffect, useMemo, useRef, useState } from 'preact/hooks';
import { createAnatomyScene, loadAnatomyAtlas } from '../../lib/cochlear/anatomy.js';
import { anatomyLayerVisible, createAnatomyViewer } from './anatomy-renderer.js';

const TITLES = {
  whole: 'Inside the human cochlea',
  cutaway: 'The implanted cochlea',
  organ: 'The sensory epithelium',
  array: 'The electrode array',
};
const SUBTITLES = {
  whole: 'Three-dimensional anatomy',
  cutaway: 'Scalae · membranes · auditory nerve',
  organ: 'Organ of Corti · cellular detail',
  array: 'Device geometry · physical dimensions',
};

/**
 * The anatomical display never changes geometry supplied to the electrical
 * solver. Vendor pad indices and calculated source-contact indices remain
 * different identities. Type-II fibers and hair cells are illustrative.
 */
export default function AnatomyScene({
  geometry, model, fibers, timeMs = 0, selectedContact = -1, selectedFiber = -1,
  selectedImplantContact = null, onContact, onFiber, onImplantContact,
  theme = 'light', anatomyMode = 'cutaway', layers = {}, showLabels = true,
  implantProfile = 'generic', implantPose = 'bench', onRendererChange, onSceneMetadata,
}) {
  const host = useRef(null), viewer = useRef(null), live = useRef({}), previousScene = useRef(null);
  const [atlas, setAtlas] = useState(null), [atlasStatus, setAtlasStatus] = useState('loading');
  const [renderer, setRenderer] = useState(''), [rendererError, setRendererError] = useState('');
  live.current = { onContact, onFiber, onImplantContact, onRendererChange };

  useEffect(() => {
    let mounted = true;
    Promise.resolve().then(() => loadAnatomyAtlas()).then(value => {
      if (!mounted) return;
      setAtlas(value); setAtlasStatus(value ? 'ready' : 'fallback');
    }).catch(() => { if (mounted) setAtlasStatus('fallback'); });
    return () => { mounted = false; };
  }, []);

  // The representative neural subset always includes the selected fiber.
  // Highlighting a contact never rebuilds or enlarges its mesh.
  const localFiber = anatomyMode === 'array' ? -1 : selectedFiber;
  const prepared = useMemo(() => {
    try {
      return { scene: createAnatomyScene(geometry, model, { mode: anatomyMode, implantProfile, implantPose, selectedFiber: localFiber, atlas }), error: '' };
    } catch (error) { return { scene: null, error: error.message || 'The anatomical scene could not be prepared.' }; }
  }, [geometry, model, anatomyMode, implantProfile, implantPose, localFiber, atlas]);

  useEffect(() => {
    onSceneMetadata?.({ placement: prepared.scene?.implantPlacement ?? null });
  }, [prepared.scene, onSceneMetadata]);

  useEffect(() => {
    if (!host.current) return;
    try {
      viewer.current = createAnatomyViewer(host.current, {
        onContact: index => live.current.onContact?.(index),
        onFiber: index => live.current.onFiber?.(index),
        onImplantContact: index => live.current.onImplantContact?.(index),
        onRendererChange: backend => { setRenderer(backend); live.current.onRendererChange?.(backend); },
        onError: error => setRendererError(error.message || 'The anatomical renderer could not draw this scene.'),
      });
    } catch (error) { setRendererError(error.message || 'The anatomical renderer is unavailable.'); }
    return () => { viewer.current?.dispose(); viewer.current = null; };
  }, []);

  useEffect(() => {
    if (!prepared.scene || !viewer.current) return;
    try {
      const previous = previousScene.current;
      const resetCamera = !previous || previous.mode !== anatomyMode || previous.atlas !== atlas || (anatomyMode === 'array' && (previous.profile !== implantProfile || previous.pose !== implantPose));
      viewer.current.setScene(prepared.scene, { resetCamera });
      previousScene.current = { mode: anatomyMode, atlas, profile: implantProfile, pose: implantPose };
      setRendererError('');
    } catch (error) { setRendererError(error.message || 'The anatomical scene could not be displayed.'); }
  }, [prepared.scene]);

  useEffect(() => {
    viewer.current?.setState({
      // Manufacturer inspection is a geometric view. It is never presented as
      // an electrical result for that commercial device.
      fibers: anatomyMode === 'array' ? null : fibers,
      timeMs, selectedContact: anatomyMode === 'array' ? -1 : selectedContact,
      selectedFiber: anatomyMode === 'array' ? -1 : selectedFiber,
      selectedImplantContact, theme, layers, showLabels,
    });
  }, [prepared.scene, fibers, timeMs, selectedContact, selectedFiber, selectedImplantContact, theme, layers, showLabels, anatomyMode]);

  const scene = prepared.scene, error = prepared.error || rendererError;
  const legend = scene?.legend ?? [];
  const notes = Array.isArray(scene?.notes) ? scene.notes : scene?.notes ? [scene.notes] : [];
  const provenance = scene?.provenanceLabel ?? (atlasStatus === 'ready' ? 'Human CT + serial-section atlas' : 'Illustrative reference anatomy');
  return <div class="coch-anatomy" data-anatomy-mode={anatomyMode} data-anatomy-renderer={renderer || 'initializing'} data-anatomy-atlas={atlasStatus} style={{ position: 'relative', width: '100%', height: '100%', overflow: 'hidden' }}>
    <div ref={host} class="coch-anatomy-stage" style={{ position: 'absolute', inset: 0, visibility: error ? 'hidden' : 'visible' }} />
    <div class="coch-anatomy-heading" style={{ position: 'absolute', top: 17, left: 20, pointerEvents: 'none', maxWidth: '58%' }}>
      <p>{scene?.subtitle ?? SUBTITLES[anatomyMode] ?? SUBTITLES.cutaway}</p>
      <h3>{scene?.title ?? TITLES[anatomyMode] ?? TITLES.cutaway}</h3>
    </div>
    <div class="coch-anatomy-toolbar" role="group" aria-label="Anatomical camera controls" style={{ position: 'absolute', top: 14, right: 14, display: 'flex', gap: 4 }}>
      {anatomyMode === 'array' && Number.isInteger(selectedImplantContact) && <button type="button" aria-label="Focus selected implant pad" title="Move the camera closer to the selected physical pad" style={{ position: 'absolute', top: 41, right: 0, whiteSpace: 'nowrap' }} onClick={() => viewer.current?.focusSelectedPad()}>Pad detail</button>}
      <button type="button" aria-label="Zoom out of anatomy" title="Zoom out (−)" onClick={() => viewer.current?.zoom(1.2)}>−</button>
      <button type="button" aria-label="Zoom into anatomy" title="Zoom in (+)" onClick={() => viewer.current?.zoom(1 / 1.2)}>+</button>
      <button type="button" aria-label="Reset anatomical camera" title="Reset view (Home)" onClick={() => viewer.current?.reset()}>Reset</button>
    </div>
    {(atlasStatus === 'loading' || atlasStatus === 'fallback') && <p class="coch-anatomy-status" role="status" style={{ position: 'absolute', top: 79, left: 20, maxWidth: '68%', pointerEvents: 'none' }}>
      {atlasStatus === 'loading' ? 'Loading human anatomy atlas…' : 'Atlas download unavailable · illustrative reference anatomy shown.'}
    </p>}
    {error && <div class="coch-anatomy-error" role="alert" style={{ position: 'absolute', inset: '30% 10% auto', padding: 20 }}><strong>Anatomy could not be displayed</strong><p>{error}</p><p>The calculation-space and contact-field views remain available.</p></div>}
    {!error && <>
      {!!legend.length && <div class="coch-anatomy-legend" aria-label="Anatomy color legend" style={{ position: 'absolute', right: 17, bottom: 48, display: 'flex', justifyContent: 'flex-end', flexWrap: 'wrap', gap: '5px 12px', maxWidth: '72%', pointerEvents: 'none' }}>
        {legend.filter(item => anatomyLayerVisible(item.layer, layers)).map((item, index) => <span key={item.label ?? index}><i style={{ background: item.color }} />{item.label}</span>)}
      </div>}
      <div class="coch-anatomy-notes" style={{ position: 'absolute', right: 17, bottom: 13, maxWidth: '72%' }}>
        <span class="coch-anatomy-provenance">{provenance}</span>
        {!!notes.length && <details><summary>Scale &amp; model notes</summary><div>{notes.map((note, index) => <p key={index}>{typeof note === 'string' ? note : note.text ?? String(note)}</p>)}</div></details>}
      </div>
    </>}
  </div>;
}
