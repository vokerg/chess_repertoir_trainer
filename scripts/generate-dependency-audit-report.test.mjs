import assert from 'node:assert/strict';
import { buildReport, renderMarkdown } from './generate-dependency-audit-report.mjs';

const lockfile = {
  lockfileVersion: 3,
  packages: {
    '': {
      workspaces: ['apps/api'],
      devDependencies: {
        'dev-tool': '1.0.0',
      },
    },
    'apps/api': {
      dependencies: {
        '@internal/shared': 'file:../../packages/internal',
        'api-runtime': '1.0.0',
      },
    },
    'node_modules/@internal/shared': {
      resolved: 'packages/internal',
      link: true,
    },
    'packages/internal': {
      name: '@internal/shared',
      version: '1.0.0',
      dependencies: {
        'linked-vuln': '1.0.0',
      },
    },
    'node_modules/api-runtime': {
      version: '1.0.0',
      dependencies: {
        'vuln-runtime': '1.0.0',
      },
    },
    'node_modules/api-runtime/node_modules/vuln-runtime': {
      version: '1.0.0',
    },
    'node_modules/dev-tool': {
      version: '1.0.0',
      dependencies: {
        legacy: '1.0.0',
        'vuln-dev': '1.0.0',
      },
    },
    'node_modules/legacy': {
      version: '1.0.0',
    },
    'node_modules/vuln-dev': {
      version: '1.0.0',
    },
    'node_modules/linked-vuln': {
      version: '1.0.0',
    },
    'node_modules/unowned': {
      version: '1.0.0',
    },
  },
};

const audit = {
  metadata: {
    vulnerabilities: {
      info: 0,
      low: 0,
      moderate: 2,
      high: 3,
      critical: 0,
      total: 5,
    },
  },
  vulnerabilities: {
    'api-runtime': {
      name: 'api-runtime',
      severity: 'high',
      isDirect: true,
      via: [],
      effects: [],
      range: '<1.0.1',
      nodes: ['node_modules/api-runtime'],
      fixAvailable: true,
    },
    'linked-vuln': {
      name: 'linked-vuln',
      severity: 'high',
      isDirect: false,
      via: [{
        source: 1002,
        title: 'linked advisory',
        severity: 'high',
        range: '<1.0.1',
      }],
      effects: [],
      range: '<1.0.1',
      nodes: ['node_modules/linked-vuln'],
      fixAvailable: {
        name: '@internal/shared',
        version: '2.0.0',
        isSemVerMajor: true,
      },
    },
    'vuln-runtime': {
      name: 'vuln-runtime',
      severity: 'high',
      isDirect: false,
      via: [{
        source: 1001,
        title: 'runtime advisory',
        severity: 'high',
        range: '<1.0.1',
      }],
      effects: [],
      range: '<1.0.1',
      nodes: ['node_modules/api-runtime/node_modules/vuln-runtime'],
      fixAvailable: true,
    },
    unowned: {
      name: 'unowned',
      severity: 'moderate',
      isDirect: false,
      via: [],
      effects: [],
      range: '<1.0.1',
      nodes: ['node_modules/unowned'],
      fixAvailable: false,
    },
    'vuln-dev': {
      name: 'vuln-dev',
      severity: 'moderate',
      isDirect: false,
      via: [],
      effects: [],
      range: '<1.0.1',
      nodes: ['node_modules/vuln-dev'],
      fixAvailable: false,
    },
  },
};

const report = buildReport(audit, lockfile, [{
  name: 'legacy',
  version: '1.0.0',
  message: 'legacy | warning',
}]);
const findings = new Map(report.findings.map((finding) => [finding.name, finding]));

assert.equal(report.findings.length, 5);
assert.equal(findings.get('api-runtime').direct, true);
assert.equal(findings.get('api-runtime').exposure, 'runtime');
assert.deepEqual(findings.get('api-runtime').directOwners, ['apps/api: api-runtime']);

assert.equal(findings.get('vuln-runtime').direct, false);
assert.equal(findings.get('vuln-runtime').exposure, 'runtime');
assert.deepEqual(findings.get('vuln-runtime').directOwners, ['apps/api: api-runtime']);
assert.deepEqual(findings.get('vuln-runtime').examplePath, [
  'api-runtime@1.0.0',
  'vuln-runtime@1.0.0',
]);

assert.equal(findings.get('vuln-dev').exposure, 'dev-only');
assert.deepEqual(findings.get('vuln-dev').directOwners, ['root: dev-tool']);

assert.equal(findings.get('linked-vuln').exposure, 'runtime');
assert.deepEqual(findings.get('linked-vuln').directOwners, ['apps/api: @internal/shared']);
assert.deepEqual(findings.get('linked-vuln').examplePath, [
  '@internal/shared',
  'linked-vuln@1.0.0',
]);

assert.equal(findings.get('unowned').exposure, 'unknown');
assert.deepEqual(findings.get('unowned').directOwners, []);
assert.equal(findings.get('unowned').examplePath, null);

assert.equal(report.deprecations.length, 1);
assert.equal(report.deprecations[0].exposure, 'dev-only');
assert.deepEqual(report.deprecations[0].directOwners, ['root: dev-tool']);
assert.deepEqual(report.deprecations[0].examplePath, [
  'dev-tool@1.0.0',
  'legacy@1.0.0',
]);

const markdown = renderMarkdown(report);
assert.match(markdown, /api-runtime@1\.0\.0 → vuln-runtime@1\.0\.0/);
assert.match(markdown, /@internal\/shared@2\.0\.0 \(major\)/);
assert.match(markdown, /legacy \\| warning/);
assert.match(markdown, /Unresolved vulnerability ownership: unowned\./);

assert.throws(
  () => buildReport(audit, { lockfileVersion: 2, packages: {} }),
  /lockfileVersion 3/,
);

console.log('Dependency audit reporter tests passed.');
