"""Create local Zenodo upload files only. Never performs HTTP or publication."""
import argparse
import hashlib
import json
from pathlib import Path
import shutil
import zipfile
from collections import Counter
import pyarrow.parquet as pq
from build_dataset import METRICS,ROOT,dump
from dataset_statistics import summarize

TITLE='SALUDATA: Source-calibrated synthetic multisensor monitoring scenarios, March–May 2026'
VERSION='0.1.0'

def sha(path):
    with path.open('rb') as f:return hashlib.file_digest(f,'sha256').hexdigest()

def enrich(release):
    manifest=json.loads((release/'manifest.json').read_text())
    calibration=json.loads((release/'provenance'/'calibration.json').read_text())
    dump(release/'DATASET_STATISTICS.json',summarize(release))
    recipe_counts=Counter(pq.read_table(release/'data'/'profiles.parquet',columns=['scenario_id']).column('scenario_id').to_pylist())
    recipes=json.loads((release/'provenance'/'scenario_catalog.json').read_text())
    split_map=json.loads((release/'provenance'/'family_splits.json').read_text())
    lines=['# Scenario index','',
           'Recipes are AI-authored simulation assumptions, not independently diagnosed cases. Each profile has six correlated episodes.','',
           '| Recipe | Family | Split | Profiles | Episodes |','|---|---|---|---:|---:|']
    for recipe in sorted(recipes,key=lambda r:(r['family'],r['id'])):
        n=recipe_counts[recipe['id']]
        lines.append(f"| {recipe['title']} (`{recipe['id']}`) | {recipe['family']} | {split_map[recipe['family']]} | {n} | {n*6} |")
    (release/'SCENARIO_INDEX.md').write_text('\n'.join(lines)+'\n')
    (release/'CLINICAL_REVIEW_NOTES.md').write_text('''# Clinical review notes — not adjudication

These links were consulted on 2026-09-24 for broad safety/context checks. They
are not sources of patient data, diagnoses or numeric simulation distributions.
They do not validate the 43 recipes, their proposed priorities, or their generated
variants. They are not supplied to the independent-assessment model input.

- NICE NG136: confirmation of a suspected hypertension diagnosis requires an
  appropriate measurement process, not a synthetic single reading.
  https://www.nice.org.uk/guidance/ng136/chapter/recommendations
- NHS stroke symptoms: suspected stroke symptoms warrant emergency assessment.
  https://www.nhs.uk/conditions/stroke/symptoms/
- NHS shortness of breath: serious associated symptoms can require emergency
  assistance; wearable readings cannot establish the cause.
  https://www.nhs.uk/symptoms/shortness-of-breath/
- NHS heart attack: chest symptoms with concerning associated features require
  urgent attention; the synthetic reference does not diagnose an infarction.
  https://www.nhs.uk/conditions/heart-attack/

These are UK references. Jurisdiction-specific pathways and emergency numbers
must be reviewed separately. The priority vocabulary is an unvalidated simulator
label, not a validated response-time SLA or an implemented clinical rule.

Before clinical-model training or evaluation, obtain professional review of each
recipe, the evidence/action consistency across sampled variants, potential
under-/over-triage, and any omitted history or subgroup constraints. Evaluate on
an independently adjudicated dataset, not only these template-derived references.
Pregnancy, children, medication decisions, dosing and comprehensive disease
differentials are not covered. No clinician review has been completed here.
''')
    inventory=json.loads((ROOT/'inventory.json').read_text())
    safe_inventory={k:inventory[k] for k in ('inventory_schema_version','purpose','dataset_period','canonical_quality','mentioned_or_unsupported')}
    safe_inventory['entries']=[{k:v for k,v in e.items() if k not in ('endpoint','endpoints','source_paths')} for e in inventory['entries']]
    dump(release/'provenance'/'sensor_coverage.json',safe_inventory)
    dump(release/'inventory.json',safe_inventory)
    schemas=release/'schemas';schemas.mkdir(exist_ok=True)
    for path in (ROOT/'schemas').glob('*.json'):shutil.copyfile(path,schemas/path.name)
    contract_root=ROOT.parents[1]/'.worktrees'/'consolidate-independent-v2'/'contracts'/'v1'/'schemas'
    for name in ('measurement-event.schema.json','raw-signal-window.schema.json'):
        origin=contract_root/name if (contract_root/name).is_file() else ROOT/'schemas'/name
        if origin.resolve()!=(schemas/name).resolve():shutil.copyfile(origin,schemas/name)
    dictionary={}
    source_fields={'hr':'hr','spo2':'spo2','sbp':'sbp','dbp':'dbp','respiration_rate':'rr','temp_c':'temp'}
    for field,unit in METRICS.items():
        dictionary[field]={'unit':unit,'nullable':True,
           'generation_origin':'pooled_numeric_calibration_plus_simulation_constraints' if field in source_fields else 'explicit_simulation_assumption',
           'source_calibration_field':source_fields.get(field),
           'not_a_real_vendor_measurement':True}
        if field in source_fields:
            source_field=source_fields[field]
            support={split:model.get('field_provenance',{}).get(source_field,{}) for split,model in calibration['models'].items()}
            dictionary[field]['calibration_support_by_split']=support
            if all(d.get('eligible_source_records',0)==0 for d in support.values()):
                dictionary[field]['generation_origin']='explicit_simulation_prior_no_eligible_source_records'
    dictionary['respiration_rate']['adapter_support']='research extension; not emitted by current canonical or Cosinuss formatter'
    dictionary['temp_c']['warning']='Generic simulated temperature proxy; no clinically valid skin-to-core-to-ear conversion is claimed.'
    dictionary['step_count']['semantics']='Simulated count for this acquisition interval; not a daily total or cumulative counter.'
    dictionary['accelerometer_rms']['warning']='Generated scalar activity proxy; NOT computed from the illustrative waveform samples.'
    dump(release/'DATA_DICTIONARY.json',{'measurement_fields':dictionary,
          'timestamp':'Synthetic capture time in UTC; never a source acquisition date.',
          'device_timestamp':'Synthetic device clock, deliberately reversible in clock-skew cases.',
          'sensor_quality_json':'Per-sensor group synthetic quality; missing numeric values remain null.',
          'quality_status':'Scenario packet quality summary; per-sensor quality is authoritative for measurement-specific use.',
          'body_composition':'Toy mutually constrained estimates; percentages overlap and must not be summed as disjoint tissue fractions.',
          'reference_status':'AI-authored simulator reference, not source diagnosis or clinical ground truth.'})
    (release/'ATTRIBUTION.md').write_text('''# Attribution and license notices

Contains information from MIMIC-III Waveform Database v1.0 (Moody et al., 2020,
DOI https://doi.org/10.13026/c2607m), made available under the Open Database
License (ODbL) 1.0: https://opendatacommons.org/licenses/odbl/1-0/.

Source authors: Benjamin Moody, George Moody, Mauricio Villarroel,
Gari D. Clifford and Ikaro Silva. These are source authors, NOT asserted authors
of this synthetic release. Source website: https://physionet.org/content/mimic3wdb/1.0/.

Also cite Johnson et al. (2016), MIMIC-III, a freely accessible critical care
database, Scientific Data 3, 160035, https://doi.org/10.1038/sdata.2016.35;
and Pollard et al. (2026), PhysioNet as a global platform for biomedical research,
Nature Health 1, 792–795, https://doi.org/10.1038/s44360-026-00096-z
(the PhysioNet citation requested on the source landing page at preparation).

This synthetic derivative database retains ODbL-1.0 conservatively. The complete
source license is provided in LICENSE-ODbL-1.0.txt. Source traces, record IDs,
surrogate dates, clinical tables and source demographic records are not included
in the upload. No endorsement by the source authors or device manufacturers is
implied. Other rights, including privacy rights, are not cleared by ODbL.

Synthetic/nonclinical flags describe validation status and intended research
use; they do not impose additional legal restrictions on the ODbL grant.
''')
    (release/'code'/'LICENSE-MIT.txt').write_text('''MIT License

Copyright (c) 2026 synthetic dataset contributors

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
''')
    (release/'README.md').write_text(f'''# {TITLE}

Version {VERSION}. **Research prototype; fully synthetic output; clinically unvalidated references.**

## What is included

- {manifest['patients']:,} fictional adult profiles (ages 25–85).
- {manifest['observation_rows']:,} twice-daily multisensor summary rows over 92 days.
- {manifest['episodes']:,} parameterized assessment episodes; {manifest['scenario_recipes']} AI-authored
  scenario recipes in {manifest['scenario_families']} families. These are NOT that many independently
  diagnosed or clinician-reviewed cases.
- English contexts, explicit quality/missingness, strictly earlier history summaries,
  unvalidated scenario references and completion-style SFT rows.
- {manifest['analytic_waveform_windows']} illustrative analytic PPG/XYZ/ECG window bundles and separate
  canonical-monitoring / simulated legacy-device examples.

## Dates are simulated

Observation coverage is 2026-03-01 through 2026-05-31 in UTC. Assessments occur on
March 31, April 7/21 and May 3/17/31, leaving historical observations available.
These dates are invented—not dates of collection from real patients. Files are
partitioned by calendar month, not publication date. No original ICU dates are
shifted into the output. The synthetic profiles do not correspond to source people.

## Source actually processed

The public MIMIC-III Waveform Database v1.0 is the physiological source, not its
restricted clinical database. This build processed **{calibration['source_records_processed']:,} accepted adult numeric records**
and **{calibration['source_samples_read']:,} numeric sample time positions** (not individual scalar values), using at most six
hours from each selected record. The full upstream corpus has tens of thousands
of records and several terabytes; we did NOT process that whole corpus.

Population distributions and a regularized correlation model are estimated from
pooled record medians. New profiles and trajectories use fresh Gaussian random
innovations, explicit range constraints, temporal perturbations and scenario
assumptions. This is not a copy/resampling/time-shift of individual patient traces.
Temperature availability is reported per split in provenance/calibration.json;
insufficiently supported fields use explicit priors, not fabricated source values.
No second wearable dataset, restricted clinical data or patient demographic table
was used. Body composition, symptoms, activity and illustrative waveforms are
simulation assumptions, NOT measurements derived from MIMIC.

## Sensor coverage and important distinctions

- Generic canonical ring: HR, SpO2, activity, step counts and acceleration fields;
  illustrative raw PPG and XYZ acceleration. Contract support does not imply that
  every current production adapter emits every field.
- Simulated legacy profiles: Cosinuss Two (HR/SpO2/temperature), iHealth BP7
  (systolic/diastolic BP/pulse), HS2S-Pro (weight/BMI/composition/BMR/body-age/pulse).
  These are simulated field mappings, not vendor captures, licensed vendor
  algorithms, FHIR Bundles or device-performance validation.
- Research ECG: a separate analytic 125-Hz lead-II demonstration, not a
  reconstructed clinical ECG. Its nominal 60-bpm oscillator is independent of
  the case physiology and must NOT be joined as the patient's diagnostic ECG.
- Respiratory rate is a research extension supported by the public source;
  it is not emitted by the current canonical/Cosinuss device implementation.
- Raw acceleration examples share scenario context but do not numerically define
  the independently simulated scalar activity/RMS fields. Do not train raw-to-feature
  regression using these pairs as if they were computed from one another.

## Files and loading

`data/profiles.parquet` stores fictional demographics and split/recipe metadata.
`data/observations/SPLIT/YYYY-MM.parquet` stores typed values and nulls.
`cases/SPLIT-YYYY-MM.jsonl.gz` stores separate `input`, `reference` and provenance.
`sft/SPLIT-YYYY-MM.jsonl.gz` stores prompt/completion pairs plus audit metadata.
`samples/CASEBOOK.md` is the readable English preview; full preview cases are in
`samples/readable_cases.json`. `DATA_DICTIONARY.json` gives units/origins.
`DATASET_STATISTICS.json` reports actual counts, missingness, ranges, means and
standard deviations by split/month, plus recipe/family coverage.
`SCENARIO_INDEX.md` lists every recipe, family, split and generated case count.

```python
import gzip, json
import pyarrow.parquet as pq
profiles = pq.read_table('data/profiles.parquet')
with gzip.open('cases/train-2026-03.jsonl.gz', 'rt') as f:
    case = json.loads(next(f))
    model_input = case['input']  # never pass reference/provenance to the model
```

The SFT wrapper contains case/patient/family IDs for audit. Pass ONLY `messages`
to a trainer; never flatten the wrapper into the model's input. The first-pass
input has no deterministic-rule result, intended route, scenario ID or family ID.
The answer is a **Codex-authored simulator reference**, not Qwen output or a
clinician diagnosis. Completion-only loss masking is the consumer's responsibility.

## Splits and limitations

Families and all fictional patients/variants within them stay in one split.
The 6/2/2 family split is a scenario-family holdout, not a representative i.i.d.
clinical benchmark. Public donor numeric records are also partitioned for fitting;
source records are not guaranteed to represent disjoint people. Repeated recipe
text may reward template following. The six episodes for one profile are correlated.

The cohort uses an idealized twice-daily acquisition cadence and artificial
perturbation/recovery dynamics, not measured high-frequency ambulatory behaviour.
Gradual-weight deltas are per modelled 30 days, so continue over the three-month
period. Catalogue history prose is design intent, not an extra EHR fact; actual
case history is computed from earlier generated observations. Symptoms are injected
scenario attributes, not predicted or observed source symptoms.

ICU-to-home domain shift, simplified trajectories, range constraints, toy body
composition and incomplete clinical coverage are substantial limitations. There
is no clinical adjudication, diagnostic-accuracy claim, privacy guarantee,
differential privacy, medical-device certification or endorsement. It is not an
exhaustive set of clinical presentations and is not ready for autonomous care.

## Reproduction and checks

See BUILD_COMMANDS.md. Source caches remain outside this release. `manifest.json`
records file hashes, counts and fixed generation seed. The accompanying independent
validation report verifies structural/integrity properties, not clinical validity.
The generator and checks are included. Source database rights: ODbL-1.0; see
ATTRIBUTION.md and LICENSE-ODbL-1.0.txt. This release was prepared locally, not
automatically published. No DOI, creator identity or ethics approval is invented.
''')
    (release/'BUILD_COMMANDS.md').write_text('''# Reproduce or inspect

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
''')
    draft={'title':TITLE,'upload_type':'dataset','version':VERSION,'language':'eng',
           'creators':[], 'license_spdx':'ODbL-1.0',
           'license_url':'https://opendatacommons.org/licenses/odbl/1-0/',
           'keywords':['synthetic data','multisensor','physiological monitoring','English','March May 2026','unvalidated references'],
           'related_identifiers':[{'identifier':'10.13026/c2607m','relation':'isDerivedFrom','scheme':'doi'}],
           'description':f"{manifest['episodes']:,} parameterized synthetic episodes based on {manifest['scenario_recipes']} unvalidated scenario recipes; {manifest['observation_rows']:,} observations. Simulated coverage March–May 2026. Public MIMIC-III waveform numerics provide pooled calibration only. No clinician diagnosis labels or clinical validation.",
           'preparation_status':'DRAFT WORKSHEET, NOT AN API PAYLOAD: creator names and license selection in Zenodo UI require confirmation; no DOI assigned.'}
    dump(release/'ZENODO_METADATA_DRAFT.json',draft)
    (release/'UPLOAD_CHECKLIST.md').write_text('''# Before Zenodo publication

- Supply creator names and affiliations; add ORCID only if known and verified.
- Use resource type Dataset, English language, version 0.1.0 and the title in
  ZENODO_METADATA_DRAFT.json. That file is a worksheet, not an API-ready payload.
- Select Open Database License 1.0 / ODbL-1.0 in Zenodo and keep source attribution.
  Confirm source-content/privacy rights and ownership of accompanying code.
- Do not label dates as actual collection dates, references as clinical gold,
  templates as Qwen predictions, or parameterized rows as independent expert cases.
- Inspect casebook, coverage, limitations and validation report. Fill actual
  authorship/funding/ethics fields truthfully; none is assumed by this package.
- Upload all three monthly archives plus the common archive and standalone
  documentation/checksums. Extracting all four archives in one folder reconstructs
  the dataset. No public source cache or original trace should be uploaded.
- Review Zenodo's draft and metadata before publication. A DOI is assigned by
  Zenodo; do not invent one. Publishing is irreversible in ways local preparation
  is not. No upload or publication was performed by this tooling.

Zenodo guide: https://help.zenodo.org/docs/deposit/create-new-upload/
Current default limits: 100 files and 50 GB per record. This package fits below
both. This preparation is not a legal/privacy/clinical certification.
''')
    requirement=ROOT/'requirements.lock.txt'
    if requirement.exists():shutil.copyfile(requirement,release/'requirements.lock.txt')
    reproducibility=ROOT/'REPRODUCIBILITY_REPORT.json'
    if reproducibility.exists():shutil.copyfile(reproducibility,release/'REPRODUCIBILITY_REPORT.json')
    for p in sorted((ROOT/'code').glob('*.py')):shutil.copyfile(p,release/'code'/p.name)
    manifest['files']=[{'name':str(p.relative_to(release)),'bytes':p.stat().st_size,'sha256':sha(p)} for p in sorted(release.rglob('*')) if p.is_file() and p.name!='manifest.json']
    dump(release/'manifest.json',manifest)
    print(json.dumps({'files':len(manifest['files'])+1,'bytes':sum(x['bytes'] for x in manifest['files']),'authors_pending':True}))

def package(release,audit_path,output):
    audit=json.loads(audit_path.read_text())
    if not audit.get('ok'):raise ValueError('Cannot package a failed validation')
    if audit.get('manifest_sha256')!=sha(release/'manifest.json'):raise ValueError('Validation does not bind to this manifest')
    manifest=json.loads((release/'manifest.json').read_text())
    expected={entry['name'] for entry in manifest['files']}|{'manifest.json'}
    actual={p.relative_to(release).as_posix() for p in release.rglob('*') if p.is_file()}
    if actual!=expected:raise ValueError('Release file set changed after validation')
    forbidden={'private_source_cache','.venv','__pycache__','.git'}
    if any(forbidden.intersection(Path(name).parts) or Path(name).name.startswith('private_') for name in actual):
        raise ValueError('Private/cache material cannot enter upload archives')
    for entry in manifest['files']:
        if sha(release/entry['name'])!=entry['sha256']:raise ValueError('File changed after validation')
    output.mkdir(exist_ok=False)
    groups={month:[] for month in ('2026-03','2026-04','2026-05')};groups['common']=[]
    for p in sorted(release.rglob('*')):
        if not p.is_file():continue
        relative=p.relative_to(release).as_posix()
        month=next((m for m in groups if m!='common' and m in p.name and relative.startswith(('data/observations/','cases/','sft/'))), 'common')
        groups[month].append(p)
    for group,paths in groups.items():
        archive=output/f'saludata-synthetic-{group}-v{VERSION}.zip'
        with zipfile.ZipFile(archive,'x',allowZip64=True) as z:
            for p in paths:
                info=zipfile.ZipInfo(p.relative_to(release).as_posix(),date_time=(2026,9,24,0,0,0))
                info.compress_type=zipfile.ZIP_STORED if p.suffix in ('.gz','.parquet') else zipfile.ZIP_DEFLATED
                with p.open('rb') as src,z.open(info,'w',force_zip64=True) as dst:
                    shutil.copyfileobj(src,dst,length=1024*1024)
        with zipfile.ZipFile(archive) as z:
            if z.testzip() is not None:raise ValueError('ZIP corruption')
    for name in ('README.md','ZENODO_METADATA_DRAFT.json','UPLOAD_CHECKLIST.md'):shutil.copyfile(release/name,output/name)
    audit['release_dir']='.'
    dump(output/'VALIDATION_REPORT.json',audit)
    (output/'SHA256SUMS.txt').write_text(''.join(f'{sha(p)}  {p.name}\n' for p in sorted(output.iterdir()) if p.is_file()))
    files=list(output.iterdir());total=sum(p.stat().st_size for p in files)
    if len(files)>100 or total>50_000_000_000:raise ValueError('Exceeds default Zenodo limits')
    print(json.dumps({'upload_files':len(files),'total_bytes':total,'published':False,'authors_pending':True}))

if __name__=='__main__':
    parser=argparse.ArgumentParser(description=__doc__);parser.add_argument('mode',choices=['enrich','package']);parser.add_argument('--release',type=Path,required=True)
    parser.add_argument('--audit',type=Path);parser.add_argument('--output',type=Path);args=parser.parse_args()
    if args.mode=='enrich':enrich(args.release)
    elif args.audit is None or args.output is None:parser.error('package requires --audit and --output')
    else:package(args.release,args.audit,args.output)
