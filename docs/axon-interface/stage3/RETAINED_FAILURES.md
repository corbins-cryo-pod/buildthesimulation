# Retained development failures

These are retained software/environment observations, not failed biological experiments.
No numerical acceptance tolerance in `ACCEPTANCE.json` was changed.

1. The initial module-worker bootstrap did not execute in the in-memory, opaque-origin
   Chromium test document. The UI correctly withheld a partial result and displayed
   “Worker failed.” A minimal classic Blob worker worked in the same browser. The
   packaged worker now contains the exact pure engine source with module export
   declarations removed, avoiding a nested module import. The complete interactive
   worker calculation, exports and cancellation were then tested successfully.
   The precise browser-internal cause of the module-worker failure was not established.
2. The browser contract initially expected 48 parameter-table rows, but the actual
   documented register contains 47 numeric controls plus 3 explicit assumptions (50).
   The test fixture was corrected; no parameter was removed to satisfy the count.
3. Browser navigation to both local files and localhost is blocked by this environment's
   administrator policy. No browser protection was changed. The self-contained page
   was rendered directly in memory for UI testing. These observations do not claim a
   successful hosted-navigation or file-URL test, nor Safari / physical-iPhone support.

The marker integrator differs from the independent continuous ODE by about 0.00343
normalized units at the default 0.1-day step, within its predeclared 0.01 component
bound. This is retained discretization error, not a biological measurement.
Whole-model stochastic convergence, experimental calibration, and electrical
coupling of the grown paths remain unverified, rather than being replaced by these
passing software tests.
