# Code base for the manuscript "Multi-modal characterization and simulation of human epileptic circuitry"

![](/images/figure_TLE_summary.png)

This repository contains the code that is necessary to reproduce the work of Buchin et al. 2020 (https://www.biorxiv.org/content/10.1101/2020.04.24.060178v1). The repository contains the code for Python, Matlab and R used in this study. To make is easier to comprehend, the code is organized into subdirectories that correspond to figures.

## Getting Started

### Prerequisites

Anaconda Python 4.3.13 (Python 2.7)

Brain Modeling Toolkit (https://alleninstitute.github.io/bmtk/)

Allen SDK (https://allensdk.readthedocs.io/)

Neuron 7.4 (https://neuron.yale.edu/neuron/)

Rstudio (https://rstudio.com/)

Matlab R2018a (https://www.mathworks.com/)


### Requirements

Enviroment requirements could be found in requirements folder: requirements.txt and epilepsy_human_dg_network.yml file

To install the enviroment run:
conda env create -f epilepsy_human_dg.yml


Data analysis code is organized using the corresponding folders. All necessary functions and vizualisations are included into the notebooks. The original data files including nwb, swc and RData files are available upon request.


### Installing

The models will run automatickally once you have the required libraries installed on your machine, such as:

Python Anaconda 2.7 including R
https://www.anaconda.com/

Brain Modeling Toolkit
https://alleninstitute.github.io/bmtk/

Allen SDK
https://allensdk.readthedocs.io/

Neuron
https://www.neuron.yale.edu/neuron/

Matlab
https://www.mathworks.com/

## Data availability

The necessary data is available in csv files in corresponding folders. All raw data is available upon request:

anatolyb@alleninstitute.org
anat.buchin@gmail.com
costasa@alleninstitute.org
costas.anastassiou@gmail.com



## Contributors

* **Anatoly Buchin** - [abuchin](https://github.com/abuchin)
* **Anirban Nandi** - [anirban6908](https://github.com/anirban6908)
* **Jeremy Miller** - [jeremymiller](https://github.com/jeremymiller)
* **Costas Anastassiou** - [Costas13](https://github.com/Costas13)


## License

Copyright © 2020. Allen Institute. All rights reserved.

Redistribution and use in source and binary forms, with or without modification, are permitted provided that the following conditions are met:

1. Redistributions of source code must retain the above copyright notice, this list of conditions and the following disclaimer.

2. Redistributions in binary form must reproduce the above copyright notice, this list of conditions and the following disclaimer in the documentation and/or other materials provided with the distribution.

3. Redistributions and use for commercial purposes are not permitted without the Allen Institute’s written permission. For purposes of this license, commercial purposes are the incorporation of the Allen Institute's software into anything for which you will charge fees or other compensation or use of the software to perform a commercial service for a third party. Contact terms@alleninstitute.org for commercial licensing opportunities.

THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS" AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT HOLDER OR CONTRIBUTORS BE LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.


## Allen Institute Contribution Agreement

This document describes the terms under which you may make “Contributions” — which may include without limitation, software additions, revisions, bug fixes, configuration changes, documentation, or any other materials — to any of the projects owned or managed by the Allen Institute. If you have questions about these terms, please contact us at terms@alleninstitute.org.

You certify that:

Your Contributions are either:

1. Created in whole or in part by you and you have the right to submit them under the designated license (described below); or

2. Based upon previous work that, to the best of your knowledge, is covered under an appropriate open source license and you have the right under that license to submit that work with modifications, whether created in whole or in part by you, under the designated license; or

3. Provided directly to you by some other person who certified (1) or (2) and you have not modified them. · You are granting your Contributions to the Allen Institute under the terms of the 2-Clause BSD license (the “designated license”).

You understand and agree that the Allen Institute projects and your Contributions are public and that a record of the Contributions (including all metadata and personal information you submit with them) is maintained indefinitely and may be redistributed consistent with the Allen Institute’s mission and the 2-Clause BSD license.


## Level of support

We are planning on occasional updating this tool with no fixed schedule. Community involvement is encouraged through both issues and pull requests.
