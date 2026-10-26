# ProViSim reference source

Unmodified files from **PalankerLab/ProViSim v2.0.0**, released March 25, 2026,
archived as DOI [10.5281/zenodo.19212252](https://doi.org/10.5281/zenodo.19212252).
The upstream MIT license is preserved in `LICENSE`.

Release archive: `PalankerLab/ProViSim-v2.0.0.zip` (93,096,889 bytes).

- MD5, verified against Zenodo metadata: `c80016bfd26cd581844e20e6587435ec`
- SHA-256: `c3cecdeeb2cb4afcd14ba591a3b285354c6be45d719fc3244912363fef0f9a13`
- GitHub release: <https://github.com/PalankerLab/ProViSim/tree/v2.0.0>
- Source archive directory: `PalankerLab-ProViSim-efbf7a9/`

Only the numerical source, pipeline, utilities, original requirements and license
are retained. No photographs, participant data, machine-learning weights, or
fonts from the upstream archive are distributed here.

`percept_reference.py` checks the file hashes, then compiles and executes the
original AST bodies of `create_tukey_window`, `fft_filter`, `gamma_transform`,
`sigmoid_transform`, and `validate_gray_img`. This omits unrelated MediaPipe,
OpenCV, and plotting imports without changing the numerical functions. The
reference uses the upstream NumPy, SciPy, and scikit-image version pins.

The browser port is independently implemented in JavaScript and compared against
full reference images, including the original filter's asymmetric padding.
