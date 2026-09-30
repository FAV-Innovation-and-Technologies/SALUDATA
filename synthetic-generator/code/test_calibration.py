"""Synthetic fixtures test calibration mechanics, never source-data claims."""
import json
from pathlib import Path
import sys
import numpy as np
import pytest
sys.path.insert(0,str(Path(__file__).parent))
from calibration import fit,FIELDS

def test_pooled_model_explicit_fallback_and_no_record_ids(tmp_path):
    (tmp_path/'outputs').mkdir()
    (tmp_path/'metadata').mkdir()
    for name in ('RECORDS-adults','RECORDS-numerics'):
        (tmp_path/'metadata'/name).write_text('TEST FIXTURE ONLY')
    base=[74,97,123,76,16,36.7]
    rows=[{'record_id':f'private-test-record-{i}','split':('train','validation','test')[i%3],
           'returned_samples':100,
           'calibration':{f:{'n':0 if f=='temp' else 100,'q50':base[j]+(i%11)*.05}
                          for j,f in enumerate(FIELDS)}} for i in range(510)]
    (tmp_path/'outputs'/'private_record_summaries.json').write_text(json.dumps(rows))
    (tmp_path/'outputs'/'source_manifest.json').write_text(json.dumps({
        'actual_n':510,'selection':{'seed':20260301},'bounds':{'window_hours':6}}))
    model=fit(tmp_path)
    assert model['source_records_processed']==510
    assert model['source_samples_read']==51000
    assert 'private-test-record' not in json.dumps(model)
    for split in model['models'].values():
        assert split['source_records']==170
        assert split['field_provenance']['temp']['eligible_source_records']==0
        assert split['field_provenance']['temp']['method']=='explicit_simulation_prior_insufficient_source_support'
        assert np.linalg.eigvalsh(split['correlation']).min()>0
        assert np.allclose(np.diag(split['correlation']),1)

def test_source_record_threshold_is_not_silently_relaxed(tmp_path):
    (tmp_path/'outputs').mkdir()
    (tmp_path/'outputs'/'private_record_summaries.json').write_text('[]')
    (tmp_path/'outputs'/'source_manifest.json').write_text('{"actual_n": 0}')
    with pytest.raises(ValueError,match='500'):
        fit(tmp_path)
