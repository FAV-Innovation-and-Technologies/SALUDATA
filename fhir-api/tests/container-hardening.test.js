'use strict';

const fs = require('fs');
const path = require('path');

describe('step-1 container supply-chain guardrails', () => {
  const dockerfile = fs.readFileSync(path.join(__dirname, '..', 'Dockerfile'), 'utf8');

  test('pins the base image and production dependencies', () => {
    const firstLine = dockerfile.split(/\r?\n/, 1)[0];
    expect(firstLine).toMatch(/^FROM node:24\.19\.0-alpine@sha256:[a-f0-9]{64}$/);
    expect(dockerfile).toContain('COPY package.step1.json ./package.json');
    expect(dockerfile).toContain('COPY package-lock.step1.json ./package-lock.json');
    expect(dockerfile).toContain('npm ci --omit=dev --ignore-scripts');
    expect(dockerfile).toContain('node scripts/patch-kafkajs-request-queue.js');
    expect(dockerfile).toContain('/usr/local/lib/node_modules/npm');
    expect(dockerfile).toContain('COPY src/ ./src/');
    expect(dockerfile).not.toContain('COPY . ./');
  });

  test('does not run as root by default', () => {
    expect(dockerfile).toContain('\nUSER node\n');
  });

  test('keeps the minimal manifest and lock in exact agreement', () => {
    const manifest = JSON.parse(
      fs.readFileSync(path.join(__dirname, '..', 'package.step1.json'), 'utf8'),
    );
    const lock = JSON.parse(
      fs.readFileSync(path.join(__dirname, '..', 'package-lock.step1.json'), 'utf8'),
    );

    expect(lock.lockfileVersion).toBe(3);
    expect(lock.packages[''].dependencies).toEqual(manifest.dependencies);
    expect(Object.keys(manifest.dependencies).sort()).toEqual([
      'dotenv',
      'express',
      'helmet',
      'kafkajs',
      'mongodb',
    ]);
  });
});
