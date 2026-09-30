"""Fit only pooled, split-specific numeric models; no source row is replayed."""
from __future__ import annotations
import hashlib
import json
from collections import Counter
from pathlib import Path
import numpy as np

FIELDS=['hr','spo2','sbp','dbp','rr','temp']
# Explicit research priors to prevent transplanting ICU distributions directly
# into fictional community monitoring. These are not clinical normal ranges.
PRIORS={
 'hr':(72.,(55.,100.),(4.,14.)), 'spo2':(97.5,(94.,99.),(.25,1.5)),
 'sbp':(122.,(100.,145.),(8.,18.)), 'dbp':(76.,(55.,90.),(5.,10.)),
 'rr':(16.,(10.,20.),(1.,3.)), 'temp':(36.7,(36.,37.3),(.1,.35)),
}

def fit(cache:Path):
    path=cache/'outputs'/'private_record_summaries.json'
    rows=json.loads(path.read_text())
    source=json.loads((cache/'outputs'/'source_manifest.json').read_text())
    if len(rows)<500 or source['actual_n']!=len(rows):
        raise ValueError('At least 500 successfully read source records required')
    models={}
    for split in ('train','validation','test'):
        subset=[r for r in rows if r['split']==split]
        if len(subset)<20: raise ValueError('Insufficient donor-record diversity in '+split)
        columns=[];centers=[];scales=[];details={}
        for field in FIELDS:
            vals=np.array([r['calibration'][field]['q50'] if r['calibration'][field]['n']>=20 else np.nan for r in subset],dtype=float)
            valid=vals[np.isfinite(vals)]
            fallback,limits,scale_limits=PRIORS[field]
            if len(valid)>=15:
                q=np.quantile(valid,[.25,.5,.75]); median=float(q[1]); spread=float((q[2]-q[0])/1.349)
                center=float(np.clip(median,*limits)); scale=float(np.clip(spread,*scale_limits))
                method='pooled_source_record_medians_plus_explicit_range_constraints'
            else:
                median=None;center=fallback;scale=scale_limits[0];method='explicit_simulation_prior_insufficient_source_support'
            filled=np.where(np.isfinite(vals),vals,np.median(valid) if len(valid) else center)
            columns.append(filled);centers.append(center);scales.append(scale)
            details[field]={'eligible_source_records':len(valid),'source_median':median,
                            'generation_center':center,'generation_sd':scale,'method':method,
                            'center_constraints':list(limits),'sd_constraints':list(scale_limits)}
        matrix=np.asarray(columns).T
        standardized=np.zeros_like(matrix)
        for i in range(len(FIELDS)):
            sd=matrix[:,i].std()
            if sd>1e-8: standardized[:,i]=(matrix[:,i]-matrix[:,i].mean())/sd
        corr=standardized.T@standardized/max(len(matrix),1)
        np.fill_diagonal(corr,1.)
        corr=.65*corr+.35*np.eye(len(FIELDS))
        eigen,vectors=np.linalg.eigh(corr);corr=(vectors*np.maximum(eigen,.1))@vectors.T
        sd=np.sqrt(np.diag(corr));corr=corr/sd[:,None]/sd[None,:]
        models[split]={'source_records':len(subset),'fields':FIELDS,'center':centers,'sd':scales,
                       'correlation':corr.tolist(),'field_provenance':details}
    return {'schema_version':'saludata.public-synthetic-calibration.v1',
            'source_name':'MIMIC-III Waveform Database v1.0','source_doi':'10.13026/c2607m',
            'license':'ODbL-1.0','source_records_processed':len(rows),
            'source_samples_read':sum(r['returned_samples'] for r in rows),
            'source_selection':source['selection'],'source_window_hours':source['bounds']['window_hours'],
            'source_selection_seed':source['selection']['seed'],
            'acquisition_failures_by_stage':dict(Counter(item.get('stage','unknown') for item in source.get('failures',[]))),
            'valid_source_records_by_field':source.get('valid_record_n_by_calibration_field',{}),
            'source_summary_sha256':hashlib.sha256(path.read_bytes()).hexdigest(),
            'source_index_sha256':{name:hashlib.sha256((cache/'metadata'/name).read_bytes()).hexdigest() for name in ('RECORDS-adults','RECORDS-numerics')},
            'models':models,'source_patient_disjointness_guaranteed':False,
            'synthetic_privacy_guarantee':False,'direct_source_row_resampling':False,
            'note':'Independent Gaussian innovations with pooled correlation; ICU-to-community domain shift and explicit generation priors. No diagnosis labels obtained from the source.'}
