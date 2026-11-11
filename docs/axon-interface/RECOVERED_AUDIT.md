# Recovered audit-module provenance

The executor reset removed the original unpushed files. Recovery therefore separates exact retained source from reconstruction. No historical pass report was manufactured for these modules.

| File | Recovery basis | SHA-256 at completed recovery checkpoint |
| --- | --- | --- |
| `settings.mjs` | Retained source body plus explicit recovery version and wording corrections; not the exact final original file. | `7649d5e2e69c6ea470fd5d03373ca2b15094188291a0b416e206f13866d3718a` |
| `metrics.mjs` | Reconstructed from the retained audit invariants and executable contract tests. | `636ab52f4ab4fe4e7fc110dfcc13cb84bd11a75ba7c22fbf60cfd5ea0970c78d` |
| `export.mjs` | Reconstructed from the retained export/import contracts and executable tests. | `ce8629555b0a5f26056274217efd488488d8d8c8371fe60401561c0b87782c08` |
| `evidence.mjs` | Reconstructed primary-source register; 17 references and 15 questions. | `2dbed68e8a07c304243d628d613a6f0050fa175690d7e89782cd2fbce78ddbed` |

The retained settings source-body SHA-256 was `0d21c015fc133790071818f20723857347c8c5fc879387bcdc01ec681d394d11`. The original final settings hash was `2536274c719f3f6a772533338636fe73acbf7fa7137b2a36ddb92d3d61806e5b`; no claim is made that recovery reproduces that exact file. The recovered motor-core identity is `axon-interface-0.1.0-recovery.1`; its export schema is `buildthesimulation.axon-interface.v1`. The hashes in this table are historical recovery-checkpoint hashes. The subsequent B3 extension updates the shared export dispatcher and scientific register; current source hashes belong to their executed validation reports. The strict model-version gate prevents old results being silently imported into this reconstruction.

The original detailed SCIENCE.md was recovered by the review agent and left intact. Geometry, protocol and numerical solvers were not edited by this recovery task. Neither the root RECOVERY.md nor its historical observations were overwritten.

Four focused contract tests passed before production copying: malformed imports/settings; co-recruitment, duplicate-channel and failed-audit counting; sampled thresholds; complete JSON/CSV integrity using a real four-cell simulation. Additional assertions checked missing original-host denominators, local-loss versus initiation eligibility, unknown initiation evidence, all derived metrics under failed audits, all reference IDs, and the exact default budget.

The subsequent fresh full reproduction passed all five script stages with stable source hashes; see the retained [recovered-core reproduction report](development/recovered-core-reproduction-report.json). The current integration report additionally covers the new Stage 1 modules and must be read with its own source hashes. This establishes the recovered electrical-core checkpoint only. New Stage 1 work is developed separately and cannot inherit this pass status.


## Subsequent Stage 1 extension

The fixed-topology B3 architecture was implemented after this recovery checkpoint. Its current source and scientific contract are described in [STAGE1_B3_CONTRACT.md](STAGE1_B3_CONTRACT.md), and its independently executed four-cell and 256-cell protocol evidence is in [stage1-protocol-validation.json](stage1-protocol-validation.json). The complete Stage 1 aggregation has its own `reproduction-stage1-report.json`. None of those later results is retroactively attributed to the reconstruction hashes above.
