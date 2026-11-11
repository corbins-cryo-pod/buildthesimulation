#!/usr/bin/env bash
set -euo pipefail
task_root="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")/../.." && pwd)"
task_python="${MRG_PYTHON:-python3}"
task_python="$("$task_python" -c 'import sys; print(sys.executable)')"
task_compiler="$(dirname -- "$task_python")/nrnivmodl"
(cd "$task_root/scripts/axon-interface/mrg-modeldb" && CC=gcc CXX=g++ "$task_compiler")
cd "$task_root"
MRG_PYTHON="$task_python" node scripts/axon-interface/mrg-validate.mjs
MRG_PYTHON="$task_python" node scripts/axon-interface/mrg-coupled-validate.mjs
