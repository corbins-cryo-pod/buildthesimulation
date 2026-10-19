// Measured background-drive presets; every entry passed the declared soma-event gate.
// Currents are explicit intracellular patch-style drive, not spontaneous activity.
// The 0–22 ms onset staggering is an experiment setting; calibration onset was 0.
// These checks do not establish mesh convergence, propagation, or biological validity.
export const INTERFACE_CALIBRATION = Object.freeze({
  dtMs: 0.005, lengthUm: 40, settleMs: 100, durationMs: 220,
  thresholdMv: -25, refractoryMs: 2, minimumPeakMv: 0,
  repolarizationMv: -40, minimumCrossings: 2, latestCrossingMinimumMs: 100,
  reference: '/cortex/validation/',
  report: 'docs/cortex/INTERFACE_CELL_PRESETS.md',
});
export const INTERFACE_PRESETS = [
  {
    "modelId": "allen-human-571654895/1",
    "specimenId": 571654895,
    "label": "Human temporal L2 spiny cell · 571654895",
    "backgroundNa": 0.3,
    "phaseMs": 0,
    "lengthUm": 40,
    "cellClass": "excitatory",
    "layer": "L2",
    "calibration": {
      "dtMs": 0.005,
      "settleMs": 100,
      "durationMs": 220,
      "onsetMs": 0,
      "somaCrossings": 9,
      "apLikeCount": 9,
      "spikeTimesMs": [
        23.228284,
        34.545903,
        51.18529,
        69.343069,
        89.857463,
        113.05516,
        139.03867,
        167.536683,
        197.997794
      ],
      "meanIntervalMs": 21.846189,
      "peakRangeMv": [
        22.509438,
        22.726653
      ],
      "assetPath": "src/lib/cortex/models/allen571654895.json",
      "assetSha256": "1e0ca661dc7abc8b24d2e1abe435c12247821961113cf05b43d7cc1db5367e54"
    }
  },
  {
    "modelId": "allen-human-508378649/1",
    "specimenId": 508378649,
    "label": "Human L3 pyramidal / spiny · 508378649",
    "backgroundNa": 2,
    "phaseMs": 2,
    "lengthUm": 40,
    "cellClass": "excitatory",
    "layer": "L3",
    "calibration": {
      "dtMs": 0.005,
      "settleMs": 100,
      "durationMs": 220,
      "onsetMs": 0,
      "somaCrossings": 14,
      "apLikeCount": 14,
      "spikeTimesMs": [
        2.749628,
        27.503589,
        45.710658,
        63.221807,
        80.408989,
        96.180398,
        111.941507,
        126.085102,
        139.79829,
        153.221514,
        167.825911,
        181.87359,
        194.469461,
        207.611957
      ],
      "meanIntervalMs": 15.758641,
      "peakRangeMv": [
        0.767519,
        17.734826
      ],
      "assetPath": "public/models/cortex/library/allen508378649-40.json.gz",
      "assetSha256": "896d3b6749625200a9a82df8b9eca8b8a3a5c787e41715bb501a43ffa23b3460"
    }
  },
  {
    "modelId": "allen-human-508417989/1",
    "specimenId": 508417989,
    "label": "Human L3 pyramidal / spiny · 508417989",
    "backgroundNa": 0.8,
    "phaseMs": 4,
    "lengthUm": 40,
    "cellClass": "excitatory",
    "layer": "L3",
    "calibration": {
      "dtMs": 0.005,
      "settleMs": 100,
      "durationMs": 220,
      "onsetMs": 0,
      "somaCrossings": 9,
      "apLikeCount": 9,
      "spikeTimesMs": [
        3.891458,
        15.647937,
        29.298077,
        44.786681,
        63.582211,
        88.287249,
        120.550601,
        157.071058,
        194.421421
      ],
      "meanIntervalMs": 23.816245,
      "peakRangeMv": [
        16.511927,
        19.804447
      ],
      "assetPath": "public/models/cortex/library/allen508417989-40.json.gz",
      "assetSha256": "326acd146efb04ad5973684fd40bc9ab8365c91637bfb54e83094513a1cad6d9"
    }
  },
  {
    "modelId": "allen-human-529878215/1",
    "specimenId": 529878215,
    "label": "Human L3 pyramidal / spiny · 529878215",
    "backgroundNa": 0.8,
    "phaseMs": 6,
    "lengthUm": 40,
    "cellClass": "excitatory",
    "layer": "L3",
    "calibration": {
      "dtMs": 0.005,
      "settleMs": 100,
      "durationMs": 220,
      "onsetMs": 0,
      "somaCrossings": 11,
      "apLikeCount": 11,
      "spikeTimesMs": [
        12.232073,
        29.157193,
        47.084829,
        67.584504,
        87.688097,
        108.236421,
        128.786519,
        149.407614,
        170.027168,
        190.640628,
        211.231629
      ],
      "meanIntervalMs": 19.899956,
      "peakRangeMv": [
        29.413084,
        30.273844
      ],
      "assetPath": "public/models/cortex/library/allen529878215-40.json.gz",
      "assetSha256": "fb02244c7e22ce8810689ac77fdff75c8799bfb0cd83ed958398e3fd677fa306"
    }
  },
  {
    "modelId": "allen-human-541563728/1",
    "specimenId": 541563728,
    "label": "Human L2 pyramidal / spiny · 541563728",
    "backgroundNa": 0.5,
    "phaseMs": 8,
    "lengthUm": 40,
    "cellClass": "excitatory",
    "layer": "L2",
    "calibration": {
      "dtMs": 0.005,
      "settleMs": 100,
      "durationMs": 220,
      "onsetMs": 0,
      "somaCrossings": 6,
      "apLikeCount": 6,
      "spikeTimesMs": [
        18.025674,
        37.978696,
        67.079757,
        100.562605,
        139.134676,
        182.653668
      ],
      "meanIntervalMs": 32.925599,
      "peakRangeMv": [
        11.287296,
        12.180031
      ],
      "assetPath": "public/models/cortex/library/allen541563728-40.json.gz",
      "assetSha256": "cf3dd31ff7dc4c9780ff966de35e3c58eac02054686c714e719bd7f4ac38dec3"
    }
  },
  {
    "modelId": "allen-human-569844159/1",
    "specimenId": 569844159,
    "label": "Human L3 pyramidal / spiny · 569844159",
    "backgroundNa": 0.4,
    "phaseMs": 10,
    "lengthUm": 40,
    "cellClass": "excitatory",
    "layer": "L3",
    "calibration": {
      "dtMs": 0.005,
      "settleMs": 100,
      "durationMs": 220,
      "onsetMs": 0,
      "somaCrossings": 4,
      "apLikeCount": 4,
      "spikeTimesMs": [
        19.200233,
        41.475389,
        79.097157,
        142.385357
      ],
      "meanIntervalMs": 41.061708,
      "peakRangeMv": [
        8.305916,
        10.03145
      ],
      "assetPath": "public/models/cortex/library/allen569844159-40.json.gz",
      "assetSha256": "d36f956bd9332958936561c569ad41128c89c28cde7f62cca9b8e5f414d81a94"
    }
  },
  {
    "modelId": "allen-human-531520637/1",
    "specimenId": 531520637,
    "label": "Human L3 interneuron / aspiny · 531520637",
    "backgroundNa": 0.4,
    "phaseMs": 12,
    "lengthUm": 40,
    "cellClass": "inhibitory",
    "layer": "L3",
    "calibration": {
      "dtMs": 0.005,
      "settleMs": 100,
      "durationMs": 220,
      "onsetMs": 0,
      "somaCrossings": 16,
      "apLikeCount": 16,
      "spikeTimesMs": [
        10.473001,
        20.03068,
        30.740902,
        42.605507,
        55.212604,
        68.228001,
        81.480905,
        94.895678,
        108.440112,
        122.101029,
        135.874022,
        149.758656,
        163.756546,
        177.87034,
        192.103102,
        206.45836
      ],
      "meanIntervalMs": 13.065691,
      "peakRangeMv": [
        3.728634,
        4.666362
      ],
      "assetPath": "public/models/cortex/library/allen531520637-40.json.gz",
      "assetSha256": "9ad85bbcc62b9ab7b43b9858ec01cde425ac395fb4b9a3e7d45ca9e7f92b3080"
    }
  },
  {
    "modelId": "allen-human-601927090/1",
    "specimenId": 601927090,
    "label": "Human L3 interneuron / aspiny · 601927090",
    "backgroundNa": 0.1,
    "phaseMs": 14,
    "lengthUm": 40,
    "cellClass": "inhibitory",
    "layer": "L3",
    "calibration": {
      "dtMs": 0.005,
      "settleMs": 100,
      "durationMs": 220,
      "onsetMs": 0,
      "somaCrossings": 17,
      "apLikeCount": 17,
      "spikeTimesMs": [
        7.570714,
        15.663917,
        28.602451,
        42.057286,
        55.456957,
        68.875802,
        82.308527,
        95.757284,
        109.225972,
        122.719594,
        136.243873,
        149.805161,
        163.40997,
        177.065164,
        190.777733,
        204.554967,
        218.403866
      ],
      "meanIntervalMs": 13.177072,
      "peakRangeMv": [
        15.55826,
        17.455947
      ],
      "assetPath": "public/models/cortex/library/allen601927090-40.json.gz",
      "assetSha256": "7ca715a25fc9a7a87ea231899d9db61cf65bcc9d2721b305f6d1f8ca155c0dc3"
    }
  },
  {
    "modelId": "allen-human-614651270/1",
    "specimenId": 614651270,
    "label": "Human L3 interneuron / aspiny · 614651270",
    "backgroundNa": 0.6,
    "phaseMs": 16,
    "lengthUm": 40,
    "cellClass": "inhibitory",
    "layer": "L3",
    "calibration": {
      "dtMs": 0.005,
      "settleMs": 100,
      "durationMs": 220,
      "onsetMs": 0,
      "somaCrossings": 12,
      "apLikeCount": 12,
      "spikeTimesMs": [
        12.612531,
        27.142996,
        43.728853,
        60.97325,
        78.520658,
        96.300848,
        114.307497,
        132.554019,
        151.062265,
        169.858716,
        188.972031,
        208.431874
      ],
      "meanIntervalMs": 17.801758,
      "peakRangeMv": [
        18.500646,
        20.284726
      ],
      "assetPath": "public/models/cortex/library/allen614651270-40.json.gz",
      "assetSha256": "79b7999863575b4dcabc0ef1c3d0fd7eab07dc2d7523c879df367f7a2a59d9b6"
    }
  },
  {
    "modelId": "allen-human-526734407/1",
    "specimenId": 526734407,
    "label": "Human L3 interneuron / aspiny · 526734407",
    "backgroundNa": 0.6,
    "phaseMs": 18,
    "lengthUm": 40,
    "cellClass": "inhibitory",
    "layer": "L3",
    "calibration": {
      "dtMs": 0.005,
      "settleMs": 100,
      "durationMs": 220,
      "onsetMs": 0,
      "somaCrossings": 2,
      "apLikeCount": 2,
      "spikeTimesMs": [
        8.832311,
        147.265637
      ],
      "meanIntervalMs": 138.433326,
      "peakRangeMv": [
        9.517694,
        10.664322
      ],
      "assetPath": "public/models/cortex/library/allen526734407-40.json.gz",
      "assetSha256": "dd4c6058c31df445bbdc4c68bba9a1d4904a13a8e16787eded68abb88dea76a5"
    }
  },
  {
    "modelId": "allen-human-529807751/1",
    "specimenId": 529807751,
    "label": "Human L3 basket interneuron · 529807751",
    "backgroundNa": 0.4,
    "phaseMs": 20,
    "lengthUm": 40,
    "cellClass": "inhibitory",
    "layer": "L3",
    "calibration": {
      "dtMs": 0.005,
      "settleMs": 100,
      "durationMs": 220,
      "onsetMs": 0,
      "somaCrossings": 26,
      "apLikeCount": 26,
      "spikeTimesMs": [
        0.929487,
        6.246406,
        11.767459,
        17.559199,
        23.574255,
        29.710192,
        35.922328,
        42.199289,
        48.542714,
        54.9612,
        61.467651,
        68.079102,
        74.816545,
        81.705946,
        88.779078,
        96.075483,
        103.64494,
        111.551408,
        119.87951,
        128.744139,
        138.308145,
        148.812704,
        160.630764,
        174.336542,
        190.598712,
        209.238191
      ],
      "meanIntervalMs": 8.332348,
      "peakRangeMv": [
        16.871079,
        21.188939
      ],
      "assetPath": "public/models/cortex/library/allen529807751-40.json.gz",
      "assetSha256": "0071f8b6fd741dd8fea6420b495d2abec538e3d52f5e7383ef7c7d30726623c0"
    }
  },
  {
    "modelId": "allen-human-541536216/1",
    "specimenId": 541536216,
    "label": "Human L3 basket interneuron · 541536216",
    "backgroundNa": 0.4,
    "phaseMs": 22,
    "lengthUm": 40,
    "cellClass": "inhibitory",
    "layer": "L3",
    "calibration": {
      "dtMs": 0.005,
      "settleMs": 100,
      "durationMs": 220,
      "onsetMs": 0,
      "somaCrossings": 24,
      "apLikeCount": 24,
      "spikeTimesMs": [
        0.74951,
        6.738548,
        14.176013,
        22.856819,
        32.144586,
        41.580865,
        51.054341,
        60.54201,
        70.03801,
        79.540206,
        89.047311,
        98.559152,
        108.075251,
        117.595373,
        127.119442,
        136.647316,
        146.179126,
        155.714697,
        165.253918,
        174.796886,
        184.343619,
        193.894059,
        203.448129,
        213.005959
      ],
      "meanIntervalMs": 9.228541,
      "peakRangeMv": [
        25.626137,
        27.717971
      ],
      "assetPath": "public/models/cortex/library/allen541536216-40.json.gz",
      "assetSha256": "2f5d37b66466a5c640b8e7c8c70f9a6c6ff8f7132bde7852f3592fd2e2f14ab4"
    }
  }
];

