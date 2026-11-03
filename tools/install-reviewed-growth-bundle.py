"""Install only a SHA-256-approved lab source bundle into an existing website checkout.
Usage: python3 tools/install-reviewed-growth-bundle.py BUNDLE.zip EXPECTED_SHA256
No git operations, network requests, package installs or merges are performed here.
"""
from pathlib import Path, PurePosixPath
import hashlib, json, stat, sys, zipfile
ROOT = Path(__file__).resolve().parents[1]
PREFIXES = ('labs/neuron-growth-v3/', 'labs/neurotissue-v4/',
            'src/components/labs/', 'src/pages/simulations/neuron-growth/',
            'src/pages/simulations/neural-tissue/', 'docs/neural-growth/',
            'tests/neural-growth/')
EXACT = {'tests/reviewed-growth-labs.mjs',
         'tools/build-reviewed-growth-labs.py', 'tools/register-reviewed-growth-labs.mjs',
         'tools/install-reviewed-growth-bundle.py'}
def validate_and_install(bundle: Path, expected: str, root: Path = ROOT):
    if len(expected) != 64 or any(c not in '0123456789abcdef' for c in expected.lower()):
        raise ValueError('Expected a 64-character SHA-256 digest')
    if bundle.stat().st_size > 32 * 1024**2:
        raise ValueError('Bundle exceeds 32 MiB')
    digest = hashlib.sha256(bundle.read_bytes()).hexdigest()
    if digest != expected.lower():
        raise ValueError(f'Bundle digest mismatch: {digest}')
    if not (root/'package.json').is_file() or not (root/'src/data/simulations.js').is_file():
        raise ValueError('Run inside the existing BuildTheSimulation checkout')
    with zipfile.ZipFile(bundle) as archive:
        infos = archive.infolist()
        if len(infos) > 300 or sum(x.file_size for x in infos) > 150 * 1024**2:
            raise ValueError('Archive file count or uncompressed size exceeds limit')
        names = [x.filename for x in infos]
        if len(set(names)) != len(names):
            raise ValueError('Duplicate archive entries')
        manifest = json.loads(archive.read('BUNDLE-MANIFEST.json'))
        expected_files = manifest['files']
        if set(names) != set(expected_files) | {'BUNDLE-MANIFEST.json'}:
            raise ValueError('Manifest does not describe the exact archive')
        verified = []
        for info in infos:
            name = info.filename
            if name == 'BUNDLE-MANIFEST.json':
                continue
            rel = PurePosixPath(name)
            if rel.is_absolute() or '..' in rel.parts or '\\' in name or '\x00' in name:
                raise ValueError('Unsafe archive path')
            if name not in EXACT and not name.startswith(PREFIXES):
                raise ValueError('Path outside reviewed lab scope: '+name)
            if stat.S_ISLNK(info.external_attr >> 16) or info.is_dir():
                raise ValueError('Symlinks and directory entries are not supported')
            target = (root/name).resolve()
            if not target.is_relative_to(root.resolve()):
                raise ValueError('Target escapes checkout')
            data = archive.read(info)
            if hashlib.sha256(data).hexdigest() != expected_files[name]['sha256']:
                raise ValueError('File digest mismatch: '+name)
            verified.append((target, data))
        # Nothing is written until every path and byte digest has been verified.
        for target, data in verified:
            target.parent.mkdir(parents=True, exist_ok=True)
            target.write_bytes(data)
    print(f'Installed {len(verified)} verified files. Existing simulations and navigation are untouched.')
    print('Next: build both labs, register their directory entries, run all tests and build the site.')
    return len(verified)
if __name__ == '__main__':
    if len(sys.argv) != 3:
        raise SystemExit(__doc__)
    validate_and_install(Path(sys.argv[1]), sys.argv[2])
