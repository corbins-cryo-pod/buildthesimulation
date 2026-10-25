from pathlib import Path
import tempfile,subprocess
from build import bundle
for name in ['src/app.js','src/worker.js','src/advanced/worker.js']:
 with tempfile.NamedTemporaryFile(suffix='.js',mode='w') as f:
  f.write(bundle(name));f.flush();subprocess.run(['node','--check',f.name],check=True)
print('All three generated bundles pass Node syntax checks.')
