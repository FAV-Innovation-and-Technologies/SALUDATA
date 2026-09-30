import sys
from pathlib import Path
import numpy as np
sys.path.insert(0,str(Path(__file__).parent))
from build_dataset import profile_and_series,case_for,family_splits,SCENARIOS,EPISODE_DAYS,START,METRICS

MODEL={'center':[74,97,125,76,16,36.7],'sd':[7,1,12,7,1.5,.2],'correlation':np.eye(6).tolist()}

def test_all_scenarios_time_consistency_and_nonleaking_inputs():
    forbidden={'scenario_id','family_id','reference','priority','deterministic_rules'}
    def visit(v):
        if isinstance(v,dict):
            assert not set(v)&forbidden
            for x in v.values():visit(x)
        elif isinstance(v,list):
            for x in v:visit(x)
    for i,s in enumerate(SCENARIOS):
        p,rows=profile_and_series(i,s,'train',MODEL)
        assert len(rows)==184
        for r in rows:
            assert '2026-03-01'<=r['timestamp']<'2026-06-01'
            assert r['sbp'] is None or r['dbp'] is None or r['sbp']>r['dbp']
            assert abs(r['bmi']-r['weight']/(p['height_cm']/100)**2)<.002
            assert abs(r['lean_body_mass']-r['weight']*(1-r['body_fat_percentage']/100))<.002
            assert all(r[k] is None or np.isfinite(r[k]) for k in METRICS)
        for day in EPISODE_DAYS:
            c=case_for(p,rows,s,day);visit(c['input'])
            assert all(o['timestamp']<c['input']['assessment_at'] for o in c['input']['observations'])
            for w in c['input']['history_summary']['windows'].values():
                assert w['start']>='2026-03-01'
                assert w['end_exclusive']<=c['input']['observations'][0]['timestamp']

def test_generation_is_repeatable_and_family_split_stable():
    p,a=profile_and_series(0,SCENARIOS[0],'train',MODEL)
    q,b=profile_and_series(0,SCENARIOS[0],'train',MODEL)
    assert p==q and a==b
    mapping=family_splits()
    assert set(mapping.values())=={'train','validation','test'}

def test_low_bp_personal_pattern_really_has_lower_history():
    s=next(s for s in SCENARIOS if s['id']=='bp_low_no_symptoms')
    for i in range(12):
        p,rows=profile_and_series(i,s,'train',MODEL)
        c=case_for(p,rows,s,30)
        historical=c['input']['history_summary']['windows']['30d']['metrics']
        assert 85<historical['sbp']['median']<105
        assert 50<historical['dbp']['median']<70
        assert abs(historical['sbp']['median']-rows[60]['sbp'])<15

def test_missing_optical_hr_stays_missing_and_other_sensor_survives():
    s=next(s for s in SCENARIOS if s['id']=='missing_ppg_accepted_accel')
    p,rows=profile_and_series(34,s,'train',MODEL)
    assert rows[60]['hr'] is None
    assert rows[60]['bp_pulse'] is not None
    assert rows[60]['accelerometer_rms'] is not None

def test_device_specific_quality_and_clock_reversal_are_realized():
    import json
    for sid,affected in [('bp_motion_cuff_artifact','blood_pressure'),('scale_out_of_range','scale'),('missing_ppg_accepted_accel','optical')]:
        s=next(s for s in SCENARIOS if s['id']==sid)
        _,rows=profile_and_series(17,s,'train',MODEL)
        q=json.loads(rows[60]['sensor_quality_json'])
        assert q[affected]['status']=='poor'
        assert q['activity']['status']=='good'
        if affected!='optical':assert q['optical']['status']=='good'
    s=next(s for s in SCENARIOS if s['id']=='ring_clock_skew')
    _,rows=profile_and_series(17,s,'train',MODEL)
    assert rows[60]['device_timestamp']<rows[59]['device_timestamp']
    assert rows[60]['timestamp']>rows[59]['timestamp']
