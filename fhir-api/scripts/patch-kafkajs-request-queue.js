'use strict';

const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const EXPECTED_VERSION = '2.2.4';
const EXPECTED_ORIGINAL_SHA256 =
  'b55986089c14f8f7bfc377922e2e65b3e4c1e7c7af2752d3b10a75dfe9e9260c';
const EXPECTED_PATCHED_SHA256 =
  'a7392e06f947412c0093bcaf2c042595c2f3719ff3e44d9364d73212cb0d9bc9';
const ORIGINAL_FRAGMENT = [
  '  scheduleCheckPendingRequests() {',
  "    // If we're throttled: Schedule checkPendingRequests when the throttle",
].join('\n');
const PATCHED_FRAGMENT = [
  '  scheduleCheckPendingRequests() {',
  '    // SALUDATA_PATCH_KAFKAJS_2_2_4_EMPTY_PENDING_GUARD',
  '    if (this.pending.length === 0) {',
  '      return',
  '    }',
  '',
  "    // If we're throttled: Schedule checkPendingRequests when the throttle",
].join('\n');

function sha256(value) {
  return crypto.createHash('sha256').update(value).digest('hex');
}

function occurrences(source, fragment) {
  return source.split(fragment).length - 1;
}

function patchKafkaJs() {
  const packageJsonPath = require.resolve('kafkajs/package.json');
  const packageRoot = path.dirname(packageJsonPath);
  const manifest = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
  const target = path.join(
    packageRoot,
    'src',
    'network',
    'requestQueue',
    'index.js',
  );

  if (manifest.version !== EXPECTED_VERSION) {
    throw new Error(
      `Unsupported kafkajs version ${manifest.version}; expected ${EXPECTED_VERSION}. Review the patch before upgrading.`,
    );
  }

  const source = fs.readFileSync(target, 'utf8');
  const currentSha256 = sha256(source);

  if (currentSha256 === EXPECTED_PATCHED_SHA256) {
    if (occurrences(source, PATCHED_FRAGMENT) !== 1) {
      throw new Error(
        'Patched kafkajs checksum matched but the expected guard was not unique.',
      );
    }
    console.log(
      '[patch-kafkajs] Empty-pending request queue guard already applied.',
    );
    return { applied: false, target };
  }

  if (currentSha256 !== EXPECTED_ORIGINAL_SHA256) {
    throw new Error(
      `Unexpected kafkajs request queue checksum ${currentSha256}; refusing to patch unknown source.`,
    );
  }
  if (occurrences(source, ORIGINAL_FRAGMENT) !== 1) {
    throw new Error(
      'Expected kafkajs request queue fragment was not found exactly once.',
    );
  }

  const patched = source.replace(ORIGINAL_FRAGMENT, PATCHED_FRAGMENT);
  if (sha256(patched) !== EXPECTED_PATCHED_SHA256) {
    throw new Error(
      'Patched kafkajs request queue checksum did not match the reviewed result.',
    );
  }

  fs.writeFileSync(target, patched, 'utf8');
  console.log(
    '[patch-kafkajs] Applied empty-pending request queue guard to kafkajs 2.2.4.',
  );
  return { applied: true, target };
}

if (require.main === module) {
  try {
    patchKafkaJs();
  } catch (error) {
    console.error(`[patch-kafkajs] ${error.message}`);
    process.exitCode = 1;
  }
}

module.exports = {
  EXPECTED_ORIGINAL_SHA256,
  EXPECTED_PATCHED_SHA256,
  EXPECTED_VERSION,
  patchKafkaJs,
};
