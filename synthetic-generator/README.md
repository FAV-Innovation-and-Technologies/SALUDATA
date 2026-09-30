# SALUDATA Synthetic Monitoring Data Generator

Open-source generator and validation tools used to build the
**SALUDATA Synthetic Remote Monitoring Dataset** (v0.1.0):
https://doi.org/10.5281/zenodo.23057595

It fits an aggregate population model on public MIMIC-III Waveform Database
numerics and generates fictional patient profiles, multisensor observations,
scenario-based assessment episodes and SFT rows, followed by structural and
integrity validation.

Developed within the SALUDATA project (*Plataforma para el seguimiento integral
de pacientes con un sistema de alertas predictivo*) by FAV Innovation and
Technologies Coop. V. (FAVIT).

**Funding:** Ministerio para la Transformación Digital y de la Función Pública
(Spain), grant TSI-100130-2024-15.

## Contents

- `code/build_dataset.py`: synthetic dataset builder
- `code/calibration.py`: aggregate model fitting
- `code/fetch_sources.py`: public source acquisition (MIMIC-III Waveform, PhysioNet)
- `code/scenarios.py`: scenario recipes and families
- `code/sensor_exports.py`: sensor contract and legacy-device exports
- `code/dataset_statistics.py`, `code/validate_release.py`, `code/verify_regeneration.py`: statistics and validation
- `code/prepare_publication.py`: release packaging
- `code/test_*.py`: unit and integration tests

## Usage

From this folder. Python 3.11. See [BUILD_COMMANDS.md](BUILD_COMMANDS.md). Paths there assume the
code sits next to an extracted dataset release; `provenance/calibration.json`
from the Zenodo record allows deterministic regeneration without downloading
source data.

```sh
python3.11 -m venv .venv
.venv/bin/pip install -r requirements.lock.txt
.venv/bin/python -m pytest -q code
```

## Status

Research prototype. Output is fully synthetic and not clinically validated; see
the dataset README for limitations.

## License

MIT (see the repository [LICENSE](../LICENSE)). The generated dataset is distributed separately
under ODbL-1.0 because its calibration source (MIMIC-III Waveform Database) uses
that license.

## Contact

Francisco José Pérez Carrasco — fperez@favit.es
