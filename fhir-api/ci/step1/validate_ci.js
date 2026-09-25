'use strict';

// Fail-closed policy checks for the opt-in Step-1 GitLab template. GitLab itself
// parses the YAML before this job can start; this script checks security intent.
const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..', '..');
const rootCi = fs.readFileSync(path.join(root, '.gitlab-ci.yml'), 'utf8');
const template = fs.readFileSync(path.join(root, 'ci', 'step1.gitlab-ci.yml'), 'utf8');
const dockerfile = fs.readFileSync(path.join(root, 'Dockerfile'), 'utf8');
const dockerignore = fs.readFileSync(path.join(root, '.dockerignore'), 'utf8');

function requirePolicy(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

requirePolicy(rootCi.includes('local: ci/step1.gitlab-ci.yml'), 'Step-1 template is not included.');
requirePolicy(rootCi.includes('STEP1_CI_ENABLED == "true"'), 'Step-1 include is not opt-in.');
requirePolicy(!template.includes(':latest'), 'Mutable latest tag is forbidden.');
requirePolicy(!template.includes('kubectl apply'), 'Step-1 CI must never deploy.');
requirePolicy(template.includes('CI_COMMIT_REF_PROTECTED'), 'Publication must require a protected ref.');
requirePolicy(template.includes('STEP1_PUBLISH_IMAGES'), 'Publication needs an explicit protected gate.');
requirePolicy(template.includes('STEP1_BUILDER_TRUSTED'), 'Publication needs a trusted-runner gate.');
requirePolicy(template.includes('linux/amd64,linux/arm64'), 'Both target architectures are required.');
requirePolicy(
  template.includes('--provenance=mode=max') && template.includes('--sbom=true'),
  'BuildKit attestations are required.'
);
requirePolicy(
  template.includes('--severity HIGH,CRITICAL --exit-code 1'),
  'HIGH/CRITICAL scan must fail closed.'
);
requirePolicy(template.includes('STEP1_FHIR_IMAGE=%s'), 'Digest handoff artifact is missing.');
requirePolicy(
  template.includes('stage: .pre'),
  'Verification must use .pre because the production root pipeline has no test stage.'
);
requirePolicy(/^FROM\s+\S+@sha256:[a-f0-9]{64}$/m.test(dockerfile), 'Base image must be digest pinned.');
requirePolicy(
  dockerfile.includes('COPY package.step1.json ./package.json') &&
    dockerfile.includes('COPY package-lock.step1.json ./package-lock.json'),
  'Runtime build must use the dedicated Step-1 manifest and lock.'
);
requirePolicy(
  dockerfile.includes('npm ci --omit=dev --ignore-scripts'),
  'Runtime dependencies must use npm ci and disable lifecycle scripts.'
);
requirePolicy(
  dockerfile.includes('COPY src/ ./src/') && !dockerfile.includes('COPY . ./'),
  'A broad context copy would overwrite the minimal Step-1 runtime manifest.'
);
for (const entry of ['node_modules', '.env', '*.pem', '*.key']) {
  requirePolicy(dockerignore.split(/\r?\n/).includes(entry), `.dockerignore must exclude ${entry}.`);
}
const toolImages = Array.from(
  template.matchAll(/^\s*name:\s*"([^"]+)"/gm),
  match => match[1]
);
const binfmtImages = Array.from(
  template.matchAll(/docker run --privileged --rm "([^"]+)" --install arm64/g),
  match => match[1]
);
requirePolicy(
  toolImages.length > 0 &&
    binfmtImages.length === 1 &&
    toolImages.concat(binfmtImages).every(image => image.includes('@sha256:') && !image.includes('$')),
  'CI tool and privileged helper images must be literal digest pins.'
);
requirePolicy(
  template.includes(':step1-${CI_PIPELINE_ID}-${CI_JOB_ID}'),
  'Transport tags must be unique per build.'
);
