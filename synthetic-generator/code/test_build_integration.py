"""Small, explicitly mocked source fixture. Never a publishable source claim."""
import json
from pathlib import Path
import sys
import zipfile
sys.path.insert(0,str(Path(__file__).parent))
import build_dataset as build
from validate_release import validate
from prepare_publication import enrich,package,sha

def test_end_to_end_mocked_source_isolated_temporary_release(tmp_path,monkeypatch):
    fixture_model={'center':[74,97,125,76,16,36.7],'sd':[7,1,12,7,1.5,.2],
                   'correlation':[[float(i==j) for i in range(6)] for j in range(6)]}
    fixture_cal={'source_records_processed':0,'source_samples_read':0,'source_doi':'TEST_FIXTURE_NOT_REAL_SOURCE',
                 'models':{s:fixture_model for s in build.SPLITS}}
    monkeypatch.setattr(build,'fit',lambda _:fixture_cal)
    cache=tmp_path/'mock-source-cache';(cache/'metadata').mkdir(parents=True)
    for name in ('RECORDS-adults','RECORDS-numerics','LICENSE.txt'):
        (cache/'metadata'/name).write_text('UNIT TEST FIXTURE, NOT SOURCE DATA\n')
    out=tmp_path/'mock-release-not-for-publication'
    monkeypatch.setattr(sys,'argv',['build_dataset.py','--cache',str(cache),'--output',str(out),'--patients','43'])
    build.main()
    report=validate(out)
    assert report['ok'],json.dumps(report['errors'][:8],indent=2)
    assert report['counts']['observation_rows']==43*184
    assert report['counts']['case_rows']==43*6
    enrich(out)
    enriched_report=validate(out)
    assert enriched_report['ok'],json.dumps(enriched_report['errors'][:8],indent=2)
    audit=tmp_path/'mock-audit.json'
    audit.write_text(json.dumps(enriched_report))
    upload=tmp_path/'mock-upload-not-for-publication'
    package(out,audit,upload)
    assert len(list(upload.iterdir()))==9
    restored=tmp_path/'mock-restored'
    for archive in upload.glob('*.zip'):
        with zipfile.ZipFile(archive) as z:
            assert z.testzip() is None
            z.extractall(restored)
    manifest=json.loads((restored/'manifest.json').read_text())
    assert sha(restored/'manifest.json')==sha(out/'manifest.json')
    for entry in manifest['files']:
        assert sha(restored/entry['name'])==entry['sha256']
    assert not any('private_source_cache' in str(p.relative_to(restored)) for p in restored.rglob('*'))
