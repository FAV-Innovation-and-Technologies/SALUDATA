"""Compare generated payload bytes, excluding packaging/docs/environment metadata."""
import argparse
import hashlib
import json
from pathlib import Path

def digest(path):
    with path.open('rb') as f:return hashlib.file_digest(f,'sha256').hexdigest()

def verify(first,second):
    def paths(root):
        return {p.relative_to(root).as_posix() for directory in ('data','cases','sft','samples')
                for p in (root/directory).rglob('*') if p.is_file()}|{'MASTER_PROMPT.txt','provenance/calibration.json'}
    expected=paths(first);actual=paths(second)
    different=sorted(expected^actual)
    for name in sorted(expected&actual):
        if not (first/name).is_file() or not (second/name).is_file() or digest(first/name)!=digest(second/name):
            different.append(name)
    manifest=json.loads((first/'manifest.json').read_text())
    return {'ok':not different,'compared_payload_files':len(expected),
            'different_paths':different,'tested_profiles':manifest['patients'],
            'tested_observation_rows':manifest['observation_rows'],'tested_cases':manifest['episodes'],
            'scope':'Real-source-calibrated small release regenerated offline from published aggregate parameters; byte equality in the same Python/library environment. Not a full-cohort second build or clinical validation.'}

if __name__=='__main__':
    p=argparse.ArgumentParser(description=__doc__);p.add_argument('first',type=Path);p.add_argument('second',type=Path);p.add_argument('--output',type=Path)
    a=p.parse_args();report=verify(a.first,a.second);encoded=json.dumps(report,indent=2)+'\n'
    if a.output:a.output.write_text(encoded)
    print(encoded,end='');raise SystemExit(0 if report['ok'] else 1)
