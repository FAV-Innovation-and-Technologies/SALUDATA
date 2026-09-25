'use strict';

const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const root = path.resolve(__dirname, '..');

describe('Step 1 opt-in GitLab supply-chain template', () => {
  test('passes its fail-closed policy validator', () => {
    const result = spawnSync(process.execPath, ['ci/step1/validate_ci.js'], {
      cwd: root,
      encoding: 'utf8',
    });
    expect(result.status).toBe(0);
    expect(result.stderr).toBe('');
    const template = fs.readFileSync(
      path.join(root, 'ci', 'step1.gitlab-ci.yml'),
      'utf8'
    );
    expect(template).toContain('stage: .pre');
  });

  test('runtime lock exactly represents the minimal Step 1 manifest', () => {
    const manifest = JSON.parse(
      fs.readFileSync(path.join(root, 'package.step1.json'), 'utf8')
    );
    const lock = JSON.parse(
      fs.readFileSync(path.join(root, 'package-lock.step1.json'), 'utf8')
    );
    expect(lock.lockfileVersion).toBe(3);
    expect(lock.packages[''].dependencies).toEqual(manifest.dependencies);
  });
});
