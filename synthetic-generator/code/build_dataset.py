"""Reproducible English research dataset; source-calibrated, never trace replay.

The scenario references are weak simulation labels, not clinical ground truth.
No endpoint or Zenodo operation is performed by this program.
"""
from __future__ import annotations
import argparse
from collections import Counter,defaultdict
from datetime import datetime,timedelta,timezone
import gzip
import hashlib
import json
from pathlib import Path
import shutil
import numpy as np
import pyarrow as pa
import pyarrow.parquet as pq
from calibration import fit,FIELDS
from scenarios import SCENARIOS,CATALOGUE_NOTICE
from sensor_exports import canonical_event,raw_window,composition,legacy_device_record,ecg_window

ROOT=Path(__file__).resolve().parents[1]
START=datetime(2026,3,1,tzinfo=timezone.utc)
DAYS=92
EPISODE_DAYS=(30,37,51,63,77,91)
SPLITS=('train','validation','test')
SEED=20260301
MASTER=("Assess the supplied synthetic patient context independently. Use the recorded history, "
        "symptoms, measurement quality and current observations. Distinguish observations from hypotheses, "
        "do not invent missing findings, and explain uncertainty. Return an English JSON object with "
        "summary, findings, differential, proposed_action, uncertainty and missing_information. "
        "Cite observation_id values. No deterministic-rule result is provided.")
METRICS={'hr':'beats/min','spo2':'%','sbp':'mm[Hg]','dbp':'mm[Hg]',
         'temp_c':'Cel','respiration_rate':'breaths/min','weight':'kg','bp_pulse':'beats/min',
         'activity_score':'1','accelerometer_rms':'m/s2','step_count':'count','bmi':'kg/m2',
         'body_fat_percentage':'%','body_water_percentage':'%','muscle_percentage':'%',
         'lean_body_mass':'kg','bone_mass':'kg','protein_percentage':'%',
         'visceral_fat_index':'score','basal_metabolic_rate':'kcal/d','body_age':'a'}
METRIC_NAMES={'hr':'heart rate','spo2':'oxygen saturation','sbp':'systolic blood pressure',
              'dbp':'diastolic blood pressure','temp_c':'simulated body temperature',
              'respiration_rate':'respiratory rate','weight':'body weight'}

def digest(data): return hashlib.sha256(data).hexdigest()
def canonical(value): return json.dumps(value,ensure_ascii=False,sort_keys=True,separators=(',',':'),allow_nan=False)
def dump(path,value):
    path.parent.mkdir(parents=True,exist_ok=True)
    path.write_text(json.dumps(value,ensure_ascii=False,indent=2,allow_nan=False)+'\n')
def stamp(dt): return dt.isoformat().replace('+00:00','Z')
def family_splits():
    families=sorted({s['family'] for s in SCENARIOS},key=lambda x:digest(f'{SEED}:family:{x}'.encode()))
    n=max(2,round(len(families)*.2))
    return {f:('validation' if i<n else 'test' if i<2*n else 'train') for i,f in enumerate(families)}

class GzipLines:
    def __init__(self,path):
        path.parent.mkdir(parents=True,exist_ok=True)
        self.raw=path.open('xb');self.gz=gzip.GzipFile(fileobj=self.raw,mode='wb',mtime=0,filename='')
    def write(self,row): self.gz.write((canonical(row)+'\n').encode())
    def close(self): self.gz.close();self.raw.close()

class Tables:
    def __init__(self,root,schema): self.root=root;self.schema=schema;self.buffers=defaultdict(list);self.writers={};self.counts=Counter()
    def add(self,key,row):
        self.buffers[key].append(row);self.counts[key]+=1
        if len(self.buffers[key])>=8192:self.flush(key)
    def flush(self,key):
        rows=self.buffers[key]
        if not rows:return
        if key not in self.writers:
            path=self.root/(key+'.parquet');path.parent.mkdir(parents=True,exist_ok=True)
            self.writers[key]=pq.ParquetWriter(path,self.schema,compression='zstd',use_dictionary=True)
        self.writers[key].write_table(pa.Table.from_pylist(rows,schema=self.schema));rows.clear()
    def close(self):
        for key in self.buffers:self.flush(key)
        for w in self.writers.values():w.close()

OBS_SCHEMA=pa.schema([pa.field(k,pa.string()) for k in
    ('observation_id','patient_ref','split','timestamp','device_timestamp','quality_status','artifact_codes','sensor_quality_json')]+
    [pa.field(k,pa.float64()) for k in METRICS]+[pa.field('quality_score',pa.float64()),pa.field('coverage_ratio',pa.float64()),
    pa.field('synthetic',pa.bool_()),pa.field('clinical_use',pa.bool_())])

def profile_and_series(index,scenario,split,model):
    rng=np.random.default_rng(SEED+index*104729)
    patient='pt_'+digest(f'saludata-new-fictional-person:{SEED}:{index}'.encode())[:32]
    age=int(rng.integers(25,86));sex='female' if rng.random()<.5 else 'male'
    height=round(float(np.clip(rng.normal(164 if sex=='female' else 176,7),145,199)),1)
    weight=float(np.clip(rng.normal(27,4),18.5,40))*(height/100)**2
    z=rng.multivariate_normal(np.zeros(len(FIELDS)),np.asarray(model['correlation']))
    baseline=np.array(model['center'])+np.array(model['sd'])*z
    baseline=np.clip(baseline,[45,93,90,45,8,35.8],[110,99.5,155,100,22,37.5])
    baseline[2]=max(baseline[2],baseline[3]+28)
    sid=scenario['id'];targets=scenario['target_overrides']
    if sid in ('spo2_borderline_chronic_pattern','chronic_spo2_history_new_drop'):baseline[1]=93.
    if sid=='chronic_bp_history_stable':baseline[2:4]=[146,86]
    if sid=='bp_low_no_symptoms':baseline[2:4]=[94,60]
    if sid=='hr_low_asymptomatic':baseline[0]=52.
    if sid=='baseline_rest_stable':baseline[:]=[66,98,118,74,15,36.7]
    t=np.arange(DAYS*2)/2
    innovations=rng.multivariate_normal(np.zeros(len(FIELDS)),np.asarray(model['correlation']),len(t))
    noise=np.zeros_like(innovations)
    for j in range(1,len(t)):noise[j]=.65*noise[j-1]+.76*innovations[j]
    noise*=np.array([2.4,.35,3.4,2.2,.6,.08])
    vital=baseline+noise
    vital[:,0]+=np.where(np.arange(len(t))%2==0,-2,2)
    event_strength=np.max(np.exp(-.5*((t[:,None]-np.array(EPISODE_DAYS)[None,:])/1.5)**2),axis=1)
    quality_strength=event_strength>.65
    activity=np.clip(.18+.06*rng.normal(size=len(t)),0,1)
    rms=np.clip(activity*1.8+.025*rng.normal(size=len(t)),0,5)
    bppulse=vital[:,0].copy()
    mapping={'hr':0,'spo2':1,'sbp':2,'dbp':3,'respiration_rate':4,'temp_c':5}
    for key,col in mapping.items():
        if key in targets:
            factor=event_strength.copy()
            if sid in ('baseline_rest_stable','chronic_bp_history_stable','spo2_borderline_chronic_pattern','hr_low_asymptomatic','bp_low_no_symptoms'):factor[:]=1.
            vital[:,col]+=(float(targets[key])-baseline[col])*factor
    if 'activity_score' in targets:activity=np.clip(activity+(targets['activity_score']-.18)*event_strength,0,1)
    if 'accelerometer_rms' in targets:rms=np.clip(rms+(targets['accelerometer_rms']-.32)*event_strength,0,6)
    else:rms=np.clip(activity*1.8+.03*rng.normal(size=len(t)),0,6)
    if sid=='activity_sedentary_run':activity*=np.where(t>=15,.3,1);rms=activity*1.8
    if sid=='baseline_sleep_lower_hr':vital[::2,0]-=5;activity[::2]=.025;rms[::2]=.05
    vital[:,2]=np.maximum(vital[:,2],vital[:,3]+15)
    vital=np.clip(vital,[25,55,55,32,4,30],[220,100,260,170,55,41.5])
    measured_weight=weight+.14*rng.normal(size=len(t))
    delta=float(targets.get('weight_delta_kg',0))
    if 'gradual_weight' in scenario['pattern']:measured_weight+=delta*t/30
    elif 'short_term_weight' in scenario['pattern']:measured_weight+=delta*np.sin(t*2.2)
    else:measured_weight+=delta*event_strength
    comp=composition(weight,height,age,sex,seed=SEED+index)
    rows=[]
    for j in range(len(t)):
        dt=START+timedelta(days=j//2,hours=6 if j%2==0 else 18)
        quality=scenario['quality_profile'] if quality_strength[j] else {'status':'good','score':.96,'coverage_ratio':.99,'artifact_codes':[]}
        v=vital[j].copy()
        # Missing data remain null; input failures do not become invented values.
        if rng.random()<.01 and j not in [d*2 for d in EPISODE_DAYS]:v[int(rng.integers(0,6))]=np.nan
        if sid=='missing_ppg_accepted_accel' and quality_strength[j]:v[0]=np.nan
        w=round(float(measured_weight[j]),2)
        fat=float(np.clip(comp['body_fat_percentage']+targets.get('body_fat_pct_delta',0)*event_strength[j]+rng.normal(0,.12),5,55))
        water=float(np.clip(comp['body_water_percentage']+targets.get('water_pct_delta',0)*event_strength[j],25,75))
        muscle=float(np.clip(comp['muscle_percentage']+100*targets.get('muscle_mass_kg_delta',0)*event_strength[j]/w,10,65))
        lean=w*(1-fat/100)
        hr=None if not np.isfinite(v[0]) else round(float(v[0]),2)
        pulse=float(bppulse[j]) if sid=='device_cross_sensor_discordance' else (float(v[0]) if np.isfinite(v[0]) else float(bppulse[j]))
        offset=-13*3600 if sid=='ring_clock_skew' and j in [d*2 for d in EPISODE_DAYS] else 0
        sensor_quality=qualities_for(sid,quality)
        row={'observation_id':f'obs_{index:05d}_{j:03d}','patient_ref':patient,'split':split,
             'timestamp':stamp(dt),'device_timestamp':stamp(dt+timedelta(seconds=offset)),
             'hr':hr,'spo2':float(v[1]),'sbp':float(v[2]),'dbp':float(v[3]),'respiration_rate':float(v[4]),'temp_c':float(v[5]),
             'weight':w,'bp_pulse':round(float(np.clip(pulse+rng.normal(0,1),25,220)),2),
             'activity_score':round(float(activity[j]),3),'accelerometer_rms':round(float(rms[j]),3),
             'step_count':int(np.clip(activity[j]*7000+rng.normal(0,80),0,18000)),
             'bmi':round(w/(height/100)**2,3),'body_fat_percentage':round(fat,3),'body_water_percentage':round(water,3),
             'muscle_percentage':round(muscle,3),'lean_body_mass':round(lean,3),'bone_mass':round(lean*.055,3),
             'protein_percentage':comp['protein_percentage'],'visceral_fat_index':comp['visceral_fat_index'],
             'basal_metabolic_rate':round(850+w*8+height*3-age*2+(80 if sex=='male' else 0),2),
             'body_age':comp['body_age'],'quality_status':quality['status'],'quality_score':quality['score'],
             'coverage_ratio':quality['coverage_ratio'],'artifact_codes':','.join(quality['artifact_codes']),
             'sensor_quality_json':canonical(sensor_quality),
             '_quality_by_sensor':sensor_quality,
             'synthetic':True,'clinical_use':False}
        for key in METRICS:
            if row[key] is not None:
                row[key]=round(float(row[key]),3) if np.isfinite(row[key]) else None
        rows.append(row)
    profile={'patient_ref':patient,'split':split,'scenario_id':sid,'family_id':scenario['family'],
             'age_years':age,'sex_at_birth':sex,'height_cm':height,'baseline_weight_kg':round(weight,3),
             'synthetic':True,'clinical_use':False,'demographic_origin':'independently_simulated_not_source_demographics'}
    return profile,rows

def qualities_for(sid,quality):
    good={'status':'good','score':.96,'coverage_ratio':.99,'artifact_codes':[]}
    names=('optical','blood_pressure','scale','temperature','activity')
    if sid=='ring_clock_skew':affected=names
    elif sid.startswith(('bp_','chronic_bp')):affected=('blood_pressure',)
    elif sid.startswith(('weight_','composition_','scale_')):affected=('scale',)
    elif sid=='temp_low_contact_artifact':affected=('temperature',)
    elif sid.startswith(('ppg_','ring_','missing_ppg','device_cross_sensor')):affected=('optical',)
    else:affected=names
    return {name:dict(quality if name in affected else good) for name in names}

def sensor_for_metric(field):
    if field in ('sbp','dbp','bp_pulse'):return 'blood_pressure'
    if field=='temp_c':return 'temperature'
    if field in ('activity_score','accelerometer_rms','step_count'):return 'activity'
    if field in ('hr','spo2','respiration_rate'):return 'optical'
    return 'scale'

def history_summary(rows,cutoff,missing=False):
    if missing:return {'status':'not_provided','cutoff':cutoff,'reason':'No historical observations supplied in this assessment context.','windows':{}}
    instant=datetime.fromisoformat(cutoff.replace('Z','+00:00'))
    result={'status':'available','cutoff':cutoff,'windows':{}}
    for days in (7,14,30):
        earliest=stamp(max(START,instant-timedelta(days=days)))
        past=[r for r in rows if earliest<=r['timestamp']<cutoff]
        eligible=[r for r in past if any(q['status'] in ('good','usable') for q in r['_quality_by_sensor'].values())]
        metrics={}
        for field in ('hr','spo2','sbp','dbp','weight','temp_c','activity_score'):
            field_eligible=[r for r in past if r['_quality_by_sensor'][sensor_for_metric(field)]['status'] in ('good','usable')]
            values=[r[field] for r in field_eligible if r[field] is not None]
            metrics[field]={'eligible_count':len(values),'median':round(float(np.median(values)),3) if values else None,
                            'first':next((r[field] for r in field_eligible if r[field] is not None),None),
                            'last':next((r[field] for r in reversed(field_eligible) if r[field] is not None),None)}
        result['windows'][str(days)+'d']={'start':earliest,'end_exclusive':cutoff,'observations':len(past),
                                         'eligible_observations':len(eligible),'metrics':metrics}
    return result

def case_for(profile,rows,scenario,day):
    index=day*2; current=rows[max(0,index-2):index+1]
    cutoff=current[0]['timestamp'];when=stamp(datetime.fromisoformat(rows[index]['timestamp'].replace('Z','+00:00'))+timedelta(minutes=5))
    evidence=[r['observation_id'] for r in current]
    observed=[{'observation_id':r['observation_id'],'patient_ref':r['patient_ref'],'timestamp':r['timestamp'],
               'device_timestamp':r['device_timestamp'],'measurements':{k:r[k] for k in METRICS},
               'quality_by_sensor':json.loads(r['sensor_quality_json']),
               'quality':{'status':r['quality_status'],'score':r['quality_score'],'coverage_ratio':r['coverage_ratio'],
                          'artifact_codes':r['artifact_codes'].split(',') if r['artifact_codes'] else []}} for r in current]
    history=history_summary(rows,cutoff,scenario['id']=='history_missing_context')
    latest=current[-1]
    activity='active' if latest['activity_score']>=.5 else 'sleep' if scenario['id']=='baseline_sleep_lower_hr' else 'rest_compatible'
    inputs={'patient':{k:profile[k] for k in ('patient_ref','age_years','sex_at_birth','height_cm')},
            'assessment_at':when,'observations':observed,'history_summary':history,
            'reported_symptoms':scenario['symptoms'],'activity_context':activity,
            'ehr_history_status':'not_supplied; longitudinal sensor history is provided separately',
            'research_extensions':{'respiration_rate':'simulated research variable, not emitted by the current SALUDATA device adapters',
                                   'body_composition':'toy simulated estimates, not measured tissue or a vendor algorithm',
                                   'temp_c':'simulated temperature proxy, not a conversion between core, skin and ear temperature'},
            'units':METRICS,'data_origin':'synthetic_research_only'}
    facts=[]
    for key in METRIC_NAMES:
        value=latest[key]
        facts.append({'finding':f"Latest {METRIC_NAMES[key]}: {value} {METRICS[key]}." if value is not None else f"Latest {METRIC_NAMES[key]} is unavailable.",
                      'evidence_ids':[evidence[-1]]})
    reference={'reference_status':'ai_authored_scenario_reference_unvalidated',
               'summary':scenario['interpretation'],'findings':facts,
               'differential':[{'hypothesis':scenario['interpretation'],'evidence_ids':evidence},
                               {'hypothesis':scenario['alternative'],'evidence_ids':evidence}],
               'proposed_action':{'priority':scenario['priority'],'action':scenario['action'],'evidence_ids':evidence},
               'uncertainty':[scenario['uncertainty'],CATALOGUE_NOTICE],
               'missing_information':['Clinician examination and independently verified context are not supplied.']}
    return {'case_id':'case_'+digest(f"{profile['patient_ref']}:{day}".encode())[:24],
            'split':profile['split'],'input':inputs,'reference':reference,
            'provenance':{'synthetic':True,'clinical_use':False,'scenario_id':scenario['id'],
                          'family_id':scenario['family'],'source':'new simulation from pooled numeric calibration',
                          'label_origin':'Codex-authored scenario template; not source diagnosis, clinician label or Qwen output'}}

def canonical_flat(row):
    mapping={'hr':'heart_rate','spo2':'oxygen_saturation','sbp':'systolic_blood_pressure','dbp':'diastolic_blood_pressure',
             'temp_c':'body_temperature','weight':'body_weight','activity_score':'activity_score',
             'accelerometer_rms':'accelerometer_rms','step_count':'step_count'}
    return {'patient_ref':row['patient_ref'],'timestamp':row['timestamp'],'seed':SEED,
            'source_parent_ref':row['observation_id'],**{v:row[k] for k,v in mapping.items()}}

def main():
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--cache',type=Path,default=ROOT/'private_source_cache')
    parser.add_argument('--calibration',type=Path,help='Use an already published pooled calibration snapshot; no source download or private cache required.')
    parser.add_argument('--output',type=Path,required=True)
    parser.add_argument('--patients',type=int,default=20000)
    args=parser.parse_args()
    if args.patients<len(SCENARIOS):raise ValueError('Need at least one profile per recipe')
    if shutil.disk_usage(ROOT).free<12*1024**3:raise ValueError('Need 12 GiB free')
    calibration=json.loads(args.calibration.read_text()) if args.calibration else fit(args.cache)
    if args.calibration and (calibration.get('schema_version')!='saludata.public-synthetic-calibration.v1' or calibration.get('source_records_processed',0)<500):
        raise ValueError('Invalid published calibration snapshot')
    out=args.output;out.mkdir(parents=True,exist_ok=False)
    dump(out/'provenance'/'calibration.json',calibration)
    dump(out/'provenance'/'scenario_catalog.json',SCENARIOS)
    splitmap=family_splits();dump(out/'provenance'/'family_splits.json',splitmap)
    (out/'MASTER_PROMPT.txt').write_text(MASTER+'\n')
    tables=Tables(out/'data'/'observations',OBS_SCHEMA)
    cases={};sft={};counts=Counter();profiles=[];previews=[];sensor_samples=[];waveforms=[]
    for i in range(args.patients):
        scenario=SCENARIOS[i%len(SCENARIOS)];split=splitmap[scenario['family']]
        profile,series=profile_and_series(i,scenario,split,calibration['models'][split]);profiles.append(profile)
        for row in series:tables.add(split+'/'+row['timestamp'][:7],row)
        for day in EPISODE_DAYS:
            case=case_for(profile,series,scenario,day);month=case['input']['assessment_at'][:7];key=split+'-'+month
            if key not in cases:
                cases[key]=GzipLines(out/'cases'/(key+'.jsonl.gz'));sft[key]=GzipLines(out/'sft'/(key+'.jsonl.gz'))
            cases[key].write(case)
            sft[key].write({'case_id':case['case_id'],'patient_ref':profile['patient_ref'],
                            'family_id':profile['family_id'],'reference_status':'unvalidated_synthetic',
                            'messages':[{'role':'user','content':MASTER+'\n'+canonical(case['input'])},
                                        {'role':'assistant','content':canonical(case['reference'])}]})
            counts[key]+=1
            if i<len(SCENARIOS) and day in (30,63):previews.append(case)
        if i<4*len(SCENARIOS):
            for day in (30,51,77):
                row=series[day*2];flat=canonical_flat(row)
                compvals={k:row[k] for k in METRICS if k in composition(row['weight'],profile['height_cm'],profile['age_years'],profile['sex_at_birth'])}
                compvals['body_weight']=row['weight'];compvals['heart_rate']=row['bp_pulse']
                canonical_events=[]
                for device in ('smart_ring','blood_pressure_monitor','smart_scale'):
                    values=dict(flat)
                    if device=='blood_pressure_monitor':values['heart_rate']=row['bp_pulse']
                    event=canonical_event(values,device)
                    for measure in event['measurements']:
                        group='blood_pressure' if device=='blood_pressure_monitor' else 'scale' if device=='smart_scale' else 'activity' if measure['code'] in ('accelerometer_rms','activity_score','step_count') else 'optical'
                        measure['quality']=json.loads(row['sensor_quality_json'])[group]
                    canonical_events.append(event)
                legacy=[]
                for kind in ('cosinuss_two','ihealth_bp7','ihealth_hs2s_pro'):
                    values=dict(flat)
                    if kind=='ihealth_bp7':values['heart_rate']=row['bp_pulse']
                    legacy.append(legacy_device_record(kind,values,composition_values=compvals if kind=='ihealth_hs2s_pro' else None))
                optical_quality=json.loads(row['sensor_quality_json'])['optical']
                raw=raw_window(profile['patient_ref'],row['timestamp'],SEED+i,row['hr'] if row['hr'] is not None else row['bp_pulse'],
                               'active' if row['activity_score']>.5 else 'rest_compatible',optical_quality['status']=='poor')
                if scenario['id']=='missing_ppg_accepted_accel':raw['ppg']=None
                ecg=ecg_window(profile['patient_ref'],row['timestamp'],SEED+i)
                # Analytic ECG has its own nominal 60-bpm oscillator, not a
                # reconstructed patient trace or diagnostic ECG for this case.
                ecg['provenance']['nominal_rate_bpm']=60
                ecg['provenance']['independent_waveform_demo_not_case_ecg']=True
                sensor_samples.append({'parent_observation_id':row['observation_id'],'canonical_events':canonical_events,
                                       'legacy_device_records':legacy,'raw_ring_window':raw,'research_ecg_window':ecg})
                waveforms.append({'parent_observation_id':row['observation_id'],'patient_ref':profile['patient_ref'],
                                  'timestamp':row['timestamp'],'split':split,'ppg_25hz':raw['ppg']['samples'] if raw['ppg'] is not None else None,
                                  'acc_x_g_25hz':raw['accelerometer']['x'],'acc_y_g_25hz':raw['accelerometer']['y'],
                                  'acc_z_g_25hz':raw['accelerometer']['z'],'ecg_demo_mv_125hz':ecg['samples_mv'],
                                  'waveform_origin':'analytic_simulator_not_source_waveforms','case_ecg':False})
        if (i+1)%500==0:print(f'profiles={i+1} episodes={(i+1)*6}',flush=True)
    tables.close()
    for writer in [*cases.values(),*sft.values()]:writer.close()
    (out/'data').mkdir(exist_ok=True)
    pq.write_table(pa.Table.from_pylist(profiles),out/'data'/'profiles.parquet',compression='zstd')
    pq.write_table(pa.Table.from_pylist(waveforms),out/'data'/'analytic-waveforms.parquet',compression='zstd')
    samplewriter=GzipLines(out/'samples'/'sensor-contract-examples.jsonl.gz')
    for row in sensor_samples:samplewriter.write(row)
    samplewriter.close();dump(out/'samples'/'readable_cases.json',previews)
    (out/'samples'/'CASEBOOK.md').write_text(casebook(previews))
    dump(out/'provenance'/'source_resources.json',{'doi':calibration['source_doi'],'license':'ODbL-1.0',
         'source_index_sha256':calibration.get('source_index_sha256',{}),
         'no_source_record_ids_or_original_dates_in_case_inputs':True,
         'private_source_cache_excluded':True})
    source_license=args.cache/'metadata'/'LICENSE.txt' if not args.calibration else ROOT/'LICENSE-ODbL-1.0.txt'
    shutil.copyfile(source_license,out/'LICENSE-ODbL-1.0.txt')
    for path in sorted((ROOT/'code').glob('*.py')):
        target=out/'code'/path.name;target.parent.mkdir(exist_ok=True);shutil.copyfile(path,target)
    summary={'schema_version':'saludata.synthetic-release-manifest.v1','patients':args.patients,
             'observation_rows':args.patients*DAYS*2,'episodes':args.patients*6,'scenario_recipes':len(SCENARIOS),
             'scenario_families':len(splitmap),'split_counts':dict(counts),'analytic_waveform_windows':len(waveforms),
             'source_records_processed':calibration['source_records_processed'],'source_samples_read':calibration['source_samples_read'],
             'date_start':stamp(START),'date_end_exclusive':'2026-06-01T00:00:00Z','seed':SEED,
             'synthetic':True,'clinical_validation':False,'privacy_guarantee':False,'published':False,
             'reference_origin':'AI-authored scenario templates, not clinically adjudicated',
             'files':[{'name':str(p.relative_to(out)),'bytes':p.stat().st_size,'sha256':digest(p.read_bytes())} for p in sorted(out.rglob('*')) if p.is_file()]}
    dump(out/'manifest.json',summary)
    print(canonical({k:v for k,v in summary.items() if k!='files'}),flush=True)

def casebook(cases):
    lines=['# SALUDATA synthetic casebook — March–May 2026','',
           'All cases and references are synthetic, AI-authored and clinically unvalidated. References are simulator templates, not outputs from Qwen.','',
           'The full compressed dataset contains more parameterized episodes; this casebook shows two examples per recipe.','']
    lookup={s['id']:s['title'] for s in SCENARIOS}
    for c in cases:
        p=c['input']['patient'];ref=c['reference'];history=c['input']['history_summary']
        lines.extend(['## '+lookup[c['provenance']['scenario_id']],'',f"Case `{c['case_id']}` · Assessment: {c['input']['assessment_at']} · Split: {c['split']}",'',
                      f"Fictional adult, age {p['age_years']}, recorded sex {p['sex_at_birth']}, height {p['height_cm']} cm.",'',
                      '### Available context','', 'Reported symptoms/context: '+json.dumps(c['input']['reported_symptoms'],ensure_ascii=False)+'.','',
                      '| Timestamp (UTC) | HR | SpO2 (%) | BP (mmHg) | Temperature (°C) | Weight (kg) | Quality |',
                      '|---|---:|---:|---|---:|---:|---|'])
        for o in c['input']['observations']:
            m=o['measurements'];lines.append(f"| {o['timestamp']} | {m['hr']} | {m['spo2']} | {m['sbp']}/{m['dbp']} | {m['temp_c']} | {m['weight']} | {o['quality']['status']} |")
        lines.extend(['','Historical coverage: '+history['status']+'. Values shown below are medians of eligible observations, strictly before the current block.',''])
        for window,w in history['windows'].items():
            med={k:v['median'] for k,v in w['metrics'].items()}
            lines.append(f"- {window}: {w['eligible_observations']} eligible observations; medians {json.dumps(med)}.")
        lines.extend(['','### Unvalidated scenario reference','',ref['summary'],'',
                      'Alternative: '+ref['differential'][1]['hypothesis'],'',
                      'Proposed priority: **'+ref['proposed_action']['priority']+'**. '+ref['proposed_action']['action'],'',
                      'Uncertainty: '+ref['uncertainty'][0],'',
                      'The reference is a Codex-authored scenario template, not a Qwen response or a clinician diagnosis. Full observations, units and evidence IDs are retained in `readable_cases.json`.',''])
    return '\n'.join(lines)

if __name__=='__main__':main()
