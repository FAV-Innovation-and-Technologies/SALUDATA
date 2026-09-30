# Reproduce or inspect

Python 3.11. In the extracted release directory, first install the dependencies:

```sh
python3.11 -m venv .venv
.venv/bin/pip install -r requirements.lock.txt
```

Download calibration inputs to a folder OUTSIDE the release. The source is public;
no credentials are needed.

For deterministic synthetic-data regeneration from the included aggregate model,
skip acquisition and run:

```sh
.venv/bin/python code/build_dataset.py --calibration provenance/calibration.json --output ../regenerated --patients 20000
```

To refit the aggregate model from the public source instead:

```sh
.venv/bin/python code/fetch_sources.py --work-dir ../private_source_cache --count 1024 --window-hours 6 --workers 4 --joint-limit 128 --min-joint-samples 60
.venv/bin/python code/build_dataset.py --cache ../private_source_cache --output ../new_build --patients 20000
.venv/bin/python code/prepare_publication.py enrich --release ../new_build
.venv/bin/python code/validate_release.py ../new_build --source-manifest ../private_source_cache/outputs/source_manifest.json --output ../validation.json
```

Only source acquisition accesses the network. Synthesis/validation perform no
ingestion or upload. No model training is performed by this build. Unit tests:
`python -m pytest -q code`. Some tests intentionally mock source calibration in
temporary fixtures; those fixtures are never publication data. The actual source
count and calibration-file hash are recorded separately.
