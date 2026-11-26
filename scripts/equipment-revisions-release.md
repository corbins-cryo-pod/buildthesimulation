# Crystal Palace revised equipment releases

The original equipment records and their simulator routes remain in place. The
revised index at `/simulations/equipment/revised/` links to individual revision
pages and their top-level browser previews. The source scopes distinguish a
bounded instrument-related exercise from a documentary model. Neither is a
physical instrument qualification or headset result.

Browser runtime files live as exact content in `payloads/equipment-revised/`.
The Astro integration verifies the manifest, compressed chunk hashes, sane path
set, and decoded file bytes before it creates `public/equipment-revised/`.
Packing keeps duplicate runtime notices once, preserving their original target
paths when materialized. Runtime files stay outside the payload prefix on the
public site. This content-only storage does not rewrite the HTML/JS in a browser.

## Maintain the catalogue

1. Prepare safe, authorized runtime-only files. Do not include private
   archives, hardware-control procedures, source PDFs/photos, or Blender
   working files.
2. Test the exact staged HTML and local dependencies over HTTP. Only mark a
   record ready after the test identified its actual entry SHA-256.
3. Build the payload:
   `node scripts/pack-equipment-revisions.mjs <stage-equipment-revised-directory> <reviewed-browser-manifest.json> <new-payload-directory>`.
   See the helper's validation errors if the files and browser proof differ.
4. In a fresh checkout, regenerate the public catalogue data with
   `node scripts/generate-equipment-revisions.mjs <scope-ledger.json> <reviewed-browser-manifest.json> <materialized-equipment-revised-directory>`.
5. Run `npm run verify` and open the built register and representative preview
   routes. Check file counts and largest individual files before publishing.

If you intentionally replace the payload in a reused checkout, move the prior
generated `public/equipment-revised/` out of the way before rebuilding. A
mismatched existing directory is intentionally refused rather than overwritten.
