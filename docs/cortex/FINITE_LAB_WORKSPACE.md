# Finite-contact integration in Cortex Laboratory

The main `/cortex/` page now provides a field-model selector. `/cortex/?field=finite-disk` opens the finite-disk workspace directly. The existing point-source single-cell and population workspace remains available.

This first integration uses the pinned finite-disk FEM export and existing human-cell finite solver. It does not substitute the exploratory gallery BEM fields into neuronal simulations. The disk is 50 µm in diameter, conductivity 0.3 S/m, with a distant grounded cylindrical boundary and an insulating plane outside the contact. Whole-cell capsule coverage and the conservative 25 µm plane guard remain mandatory. Unsupported morphologies are excluded without clipping, scaling or point-source fallback.

The native workspace includes all registered human cells, mesh/timestep controls, stimulation amplitude, vertical cell offset, physical 3D geometry, applied-potential slices, membrane replay, branch/compartment inspection, ionic-current readouts and physics-specific JSON exports. Recording signals, field gradients, implant shanks, population response and multi-contact steering are unavailable in finite mode. The same controller also runs the standalone benchmark.

Switching modes unmounts the active workspace and resets its run. The finite controller aborts DOM listeners, invalidates pending asset loads, terminates the Worker, cancels its animation frame, disconnects its resize observer and disposes controls, GPU geometry, materials and textures. The point-source workspace already terminates its Worker and scene on unmount. URL navigation selects the corresponding mode.

Verification: lifecycle test covers unmount during pending asset loading, listener removal, animation cancellation and WebGL-unavailable fallback. Existing finite integration tests cover units, whole-cell rejection, polarity/gauge behavior, human membrane replay, unavailable recordings, Worker stale requests and failed assets. Static production build verifies the native Preact integration. Browser visual verification remains pending: the Sites skill requires the supported control-browser capability for browser QA, which is unavailable in this managed workspace.

This is integration of the verified field into a native laboratory mode, not validation of firing thresholds or population selectivity. Existing neural spatial/timestep convergence limits remain unresolved. Broadening field coverage and independently validating neural response are still required before extending this mode to larger morphologies and populations.
