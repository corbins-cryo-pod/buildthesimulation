# Peripheral and retinal process playback

This bundle adds a device-specific illustrated tour inside each lab’s existing
process plate. It snapshots the chosen configuration and preserves all manual
traveler, fixture and acceptance states. A manual interaction exits the tour.
The retinal sequence follows the published research predecessor, not the
commercial PRIMA process. The normal pace spends at least seven display seconds
on each scene; this is not fabrication time. When opened over HTTP(S), Play
also tries to mount the site's shared cleanroom workstation renderer. The same
clock drives its equipment scene and the schematic immediately below it. Local
files and unavailable web assets leave the complete schematic tour intact.

Run the injector after building the unpatched lab pages, with separate input
and output simulations directories:

```sh
python scripts/foundry-atlas/labs/peripheral-playback/inject_play.py /tmp/labs-unpatched /tmp/labs-with-playback
CHROME_BIN=/path/to/chromium python scripts/foundry-atlas/labs/peripheral-playback/tests/browser_play.py --laboratories public/simulations
```

The published pre-playback bases are also available from
`4edaf79499783374f9d04f14a1fa56062ca13c10` in this repository.
The injector checks for the original application anchors and writes a digest
manifest with the output.

To regenerate the four canonical labs from their current source and the legacy cuff
from its original bundle:

```sh
git show 4edaf794:public/simulations/self-closing-cuff-foundry/index.html > /tmp/cuff-before-play.html
python scripts/foundry-atlas/labs/peripheral-playback/rebuild_canonical.py . /tmp/labs-canonical --cuff-baseline /tmp/cuff-before-play.html
```
