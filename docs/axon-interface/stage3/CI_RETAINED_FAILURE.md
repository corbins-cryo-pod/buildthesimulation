# Retained CI runner failure

The first GitHub run at source commit `32eefac5799b6d21e122729795b769c6bb4e953b` stopped during Python setup, before tests executed. The `ubuntu-latest` label selected Ubuntu 26.04, for which the setup action did not have a Python 3.13.5 binary.

Observed message: `The version '3.13.5' with architecture 'x64' was not found for Ubuntu 26.04.`

The correction pins the component-check job to `ubuntu-24.04`, retaining Node 22.16.0, Python 3.13.5, NumPy 2.3.5, SciPy 1.17.0, all source equations and every acceptance tolerance. No scientific check was weakened or skipped. The failed run remains part of GitHub history.

Original run: https://github.com/corbins-cryo-pod/buildthesimulation/actions/runs/43131096742/job/130895136979
