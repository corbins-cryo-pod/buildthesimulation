# Equipment 04-02: ICP 180

Model source JSON and deterministic glTF generator in this folder. Regenerate: `node --input-type=module -e "import {readFileSync,writeFileSync} from 'node:fs'; import {gltfFromSource} from './public/equipment/04-02/build-model.mjs'; const p='./public/equipment/04-02/'; writeFileSync(p+'oxford-icp180.gltf', JSON.stringify(gltfFromSource(JSON.parse(readFileSync(p+'model-source.json'))))+'\\n')"`.

## Handoff

See `example-result.json` for the explicit sample-ID and revision-preserving contract. Coordinates x,z in nm, z positive into the specimen. A non-domain flag may carry a partial result at a stop boundary or null when invalid. Consumers must not interpret a partial result as a complete process. The example is an independent arithmetic reference, not experimental data. No downstream import has been verified.

## Verification

`node --test tests/equipment-04-02.mjs` for analytic, flag, grid and geometry checks. `npm run build` then `node --test scripts/verify-icp-browser.mjs` (Chrome installed) for built-site checks, export inspection, and screenshots. Set ICP_URL=https://buildthesimulation.com to check production. The matched experimental holdout required by the record remains unavailable. No experimental acceptance claim.
