import { spawnSync } from 'node:child_process';
import { appendFileSync, readFileSync, writeFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';

const severityRank = new Map([
  ['critical', 0],
  ['high', 1],
  ['moderate', 2],
  ['low', 3],
  ['info', 4],
]);

function parseArgs(args) {
  const options = {
    auditJsonPath: null,
    npmCiLogPath: null,
    lockfilePath: 'package-lock.json',
    jsonPath: 'dependency-audit-report.json',
    markdownPath: 'dependency-audit-report.md',
  };

  for (let index = 0; index < args.length; index += 1) {
    const argument = args[index];
    const value = args[index + 1];
    if (argument === '--audit-json' || argument === '--npm-ci-log' || argument === '--lockfile' || argument === '--json' || argument === '--markdown') {
      if (!value || value.startsWith('--')) {
        throw new Error(`Missing value for ${argument}.`);
      }
      const key = {
        '--audit-json': 'auditJsonPath',
        '--npm-ci-log': 'npmCiLogPath',
        '--lockfile': 'lockfilePath',
        '--json': 'jsonPath',
        '--markdown': 'markdownPath',
      }[argument];
      options[key] = value;
      index += 1;
      continue;
    }
    throw new Error(`Unknown argument: ${argument}`);
  }

  return options;
}

function readAudit(options) {
  if (options.auditJsonPath) {
    return JSON.parse(readFileSync(options.auditJsonPath, 'utf8'));
  }

  const command = process.platform === 'win32' ? 'npm.cmd' : 'npm';
  const result = spawnSync(command, ['audit', '--json'], {
    encoding: 'utf8',
    maxBuffer: 64 * 1024 * 1024,
  });

  if (result.error) {
    throw result.error;
  }

  let audit;
  try {
    audit = JSON.parse(result.stdout);
  } catch {
    const stderr = result.stderr?.trim();
    throw new Error(`npm audit did not return valid JSON.${stderr ? ` ${stderr}` : ''}`);
  }

  if (audit.error) {
    const message = audit.error.summary ?? audit.error.detail ?? JSON.stringify(audit.error);
    throw new Error(`npm audit failed: ${message}`);
  }

  if (![0, 1].includes(result.status)) {
    const stderr = result.stderr?.trim();
    throw new Error(`npm audit exited with status ${result.status}.${stderr ? ` ${stderr}` : ''}`);
  }

  return audit;
}

function dependencyNames(packageRecord) {
  return new Set([
    ...Object.keys(packageRecord?.dependencies ?? {}),
    ...Object.keys(packageRecord?.optionalDependencies ?? {}),
  ]);
}

function resolveDependencyPath(fromPath, dependencyName, packages) {
  let currentPath = fromPath;

  while (true) {
    const candidate = currentPath
      ? `${currentPath}/node_modules/${dependencyName}`
      : `node_modules/${dependencyName}`;
    if (packages[candidate]) return candidate;

    if (!currentPath) return null;

    const nestedNodeModulesIndex = currentPath.lastIndexOf('/node_modules/');
    if (nestedNodeModulesIndex >= 0) {
      currentPath = currentPath.slice(0, nestedNodeModulesIndex);
      continue;
    }

    currentPath = '';
  }
}

function packageRecordForTraversal(packagePath, packages) {
  const record = packages[packagePath];
  if (!record?.link || !record.resolved || !packages[record.resolved]) {
    return record;
  }
  return packages[record.resolved];
}

function packageName(packagePath, packageRecord) {
  if (packageRecord?.name) return packageRecord.name;
  const marker = 'node_modules/';
  const markerIndex = packagePath.lastIndexOf(marker);
  if (markerIndex >= 0) return packagePath.slice(markerIndex + marker.length);
  return packagePath;
}

function packageLabel(packagePath, packages) {
  const record = packages[packagePath];
  const version = record?.version ? `@${record.version}` : '';
  return `${packageName(packagePath, record)}${version}`;
}

function directOwners(lockfile) {
  const packages = lockfile.packages ?? {};
  const workspacePaths = ['', ...(packages['']?.workspaces ?? [])]
    .filter((path, index, all) => all.indexOf(path) === index)
    .filter((path) => packages[path]);

  const owners = [];
  for (const workspacePath of workspacePaths) {
    const workspace = packages[workspacePath];
    for (const [kind, reachability] of [
      ['dependencies', 'runtime'],
      ['optionalDependencies', 'runtime'],
      ['devDependencies', 'dev'],
    ]) {
      for (const dependencyName of Object.keys(workspace[kind] ?? {})) {
        const packagePath = resolveDependencyPath(workspacePath, dependencyName, packages);
        if (!packagePath) continue;
        owners.push({
          workspace: workspacePath || 'root',
          dependency: dependencyName,
          reachability,
          packagePath,
        });
      }
    }
  }

  return owners;
}

function buildReachability(lockfile) {
  const packages = lockfile.packages ?? {};
  const reachability = new Map();

  function record(packagePath, owner, chain) {
    const existing = reachability.get(packagePath) ?? {
      runtimeOwners: new Set(),
      devOwners: new Set(),
      minDepth: Number.POSITIVE_INFINITY,
      examplePath: null,
    };
    const ownerLabel = `${owner.workspace}: ${owner.dependency}`;
    if (owner.reachability === 'runtime') existing.runtimeOwners.add(ownerLabel);
    else existing.devOwners.add(ownerLabel);

    if (chain.length < existing.minDepth) {
      existing.minDepth = chain.length;
      existing.examplePath = chain;
    }
    reachability.set(packagePath, existing);
  }

  function walk(packagePath, owner, chain, visited) {
    if (visited.has(packagePath)) return;
    const nextVisited = new Set(visited);
    nextVisited.add(packagePath);
    record(packagePath, owner, chain);

    const packageRecord = packageRecordForTraversal(packagePath, packages);
    for (const dependencyName of dependencyNames(packageRecord)) {
      const childPath = resolveDependencyPath(packagePath, dependencyName, packages);
      if (!childPath) continue;
      walk(
        childPath,
        owner,
        [...chain, packageLabel(childPath, packages)],
        nextVisited,
      );
    }
  }

  for (const owner of directOwners(lockfile)) {
    walk(
      owner.packagePath,
      owner,
      [packageLabel(owner.packagePath, packages)],
      new Set(),
    );
  }

  return reachability;
}

function normalizeFixAvailable(fixAvailable) {
  if (fixAvailable === true || fixAvailable === false) return fixAvailable;
  if (!fixAvailable) return false;
  return {
    name: fixAvailable.name ?? null,
    version: fixAvailable.version ?? null,
    isSemVerMajor: Boolean(fixAvailable.isSemVerMajor),
  };
}

function advisorySummary(via) {
  return (via ?? [])
    .filter((entry) => typeof entry === 'object' && entry)
    .map((entry) => ({
      source: entry.source ?? null,
      title: entry.title ?? null,
      severity: entry.severity ?? null,
      range: entry.range ?? null,
    }));
}

function exposureFor(nodeReachability) {
  const runtimeOwners = new Set(nodeReachability.flatMap((entry) => [...entry.runtimeOwners]));
  const devOwners = new Set(nodeReachability.flatMap((entry) => [...entry.devOwners]));

  let exposure = 'unknown';
  if (runtimeOwners.size && devOwners.size) exposure = 'mixed';
  else if (runtimeOwners.size) exposure = 'runtime';
  else if (devOwners.size) exposure = 'dev-only';

  return {
    exposure,
    runtimeOwners,
    devOwners,
  };
}

function parseDeprecatedWarnings(logText) {
  const warnings = new Map();
  const pattern = /^npm warn deprecated (.+?): (.+)$/gm;

  for (const match of logText.matchAll(pattern)) {
    const identifier = match[1].trim();
    const versionSeparator = identifier.lastIndexOf('@');
    if (versionSeparator <= 0) continue;

    const name = identifier.slice(0, versionSeparator);
    const version = identifier.slice(versionSeparator + 1);
    const key = `${name}@${version}`;
    warnings.set(key, {
      name,
      version,
      message: match[2].trim(),
    });
  }

  return [...warnings.values()];
}

function deprecatedPackages(lockfile, reachability, deprecatedWarnings) {
  const packages = lockfile.packages ?? {};

  return deprecatedWarnings
    .map((warning) => {
      const matchingPaths = Object.entries(packages)
        .filter(([packagePath, packageRecord]) => (
          packagePath.includes('node_modules/')
          && packageName(packagePath, packageRecord) === warning.name
          && packageRecord?.version === warning.version
        ))
        .map(([packagePath]) => packagePath);
      const nodeReachability = matchingPaths
        .map((packagePath) => reachability.get(packagePath))
        .filter(Boolean);
      const { exposure, runtimeOwners, devOwners } = exposureFor(nodeReachability);
      const minDepth = Math.min(
        ...nodeReachability.map((entry) => entry.minDepth),
        Number.POSITIVE_INFINITY,
      );
      const examplePath = nodeReachability
        .filter((entry) => entry.examplePath)
        .sort((left, right) => left.examplePath.length - right.examplePath.length)[0]?.examplePath ?? null;

      return {
        name: warning.name,
        version: warning.version,
        direct: minDepth === 1,
        exposure,
        installedNodes: matchingPaths.sort(),
        directOwners: [...new Set([...runtimeOwners, ...devOwners])].sort(),
        examplePath,
        message: warning.message,
      };
    })
    .sort((left, right) => {
      const exposureRank = { runtime: 0, mixed: 1, 'dev-only': 2, unknown: 3 };
      const exposureDifference = exposureRank[left.exposure] - exposureRank[right.exposure];
      if (exposureDifference !== 0) return exposureDifference;
      return `${left.name}@${left.version}`.localeCompare(`${right.name}@${right.version}`);
    });
}

export function buildReport(audit, lockfile, deprecatedWarnings = []) {
  if (!audit?.metadata?.vulnerabilities || !audit?.vulnerabilities) {
    throw new Error('Unsupported npm audit JSON: missing metadata.vulnerabilities or vulnerabilities.');
  }
  if (lockfile.lockfileVersion !== 3 || !lockfile.packages) {
    throw new Error('Dependency audit reporting expects npm lockfileVersion 3 with a packages map.');
  }

  const reachability = buildReachability(lockfile);
  const findings = Object.entries(audit.vulnerabilities).map(([name, vulnerability]) => {
    const nodeReachability = (vulnerability.nodes ?? [])
      .map((node) => reachability.get(node))
      .filter(Boolean);
    const { exposure, runtimeOwners, devOwners } = exposureFor(nodeReachability);
    const minDepth = Math.min(
      ...nodeReachability.map((entry) => entry.minDepth),
      Number.POSITIVE_INFINITY,
    );
    const examplePath = nodeReachability
      .filter((entry) => entry.examplePath)
      .sort((left, right) => left.examplePath.length - right.examplePath.length)[0]?.examplePath ?? null;

    return {
      name,
      severity: vulnerability.severity,
      direct: vulnerability.isDirect === true || minDepth === 1,
      exposure,
      installedNodes: vulnerability.nodes ?? [],
      directOwners: [...new Set([...runtimeOwners, ...devOwners])].sort(),
      examplePath,
      affectedRange: vulnerability.range ?? null,
      fixAvailable: normalizeFixAvailable(vulnerability.fixAvailable),
      advisories: advisorySummary(vulnerability.via),
    };
  });

  findings.sort((left, right) => {
    const severityDifference = (severityRank.get(left.severity) ?? 99) - (severityRank.get(right.severity) ?? 99);
    if (severityDifference !== 0) return severityDifference;
    const exposureRank = { runtime: 0, mixed: 1, 'dev-only': 2, unknown: 3 };
    const exposureDifference = exposureRank[left.exposure] - exposureRank[right.exposure];
    if (exposureDifference !== 0) return exposureDifference;
    return left.name.localeCompare(right.name);
  });

  return {
    generatedAt: new Date().toISOString(),
    source: 'npm audit --json + package-lock.json + npm ci deprecation warnings',
    totals: audit.metadata.vulnerabilities,
    findings,
    deprecations: deprecatedPackages(lockfile, reachability, deprecatedWarnings),
  };
}

function fixLabel(fixAvailable) {
  if (fixAvailable === false) return 'none';
  if (fixAvailable === true) return 'available';
  if (!fixAvailable) return 'none';
  const version = fixAvailable.version ? `@${fixAvailable.version}` : '';
  return fixAvailable.isSemVerMajor
    ? `${fixAvailable.name ?? 'upgrade'}${version} (major)`
    : `${fixAvailable.name ?? 'upgrade'}${version}`;
}

function markdownCell(value) {
  return String(value ?? '—').replaceAll('|', '\\|').replaceAll('\n', ' ');
}

export function renderMarkdown(report) {
  const totals = report.totals;
  const total = Object.entries(totals)
    .filter(([key]) => key !== 'total')
    .reduce((sum, [, count]) => sum + Number(count || 0), 0);
  const reportedTotal = Number.isFinite(Number(totals.total)) ? Number(totals.total) : total;
  const lines = [
    '# Dependency audit report',
    '',
    `Generated: ${report.generatedAt}`,
    '',
    `npm audit reports **${reportedTotal}** vulnerabilities: ${totals.critical ?? 0} critical, ${totals.high ?? 0} high, ${totals.moderate ?? 0} moderate, ${totals.low ?? 0} low, ${totals.info ?? 0} info.`,
    '',
    'This is a report-only baseline. Findings do not fail CI yet; the purpose is to expose concrete ownership and runtime/dev reachability before remediation.',
    '',
    '| Package | Severity | Direct? | Exposure | Owning direct dependency | Example dependency path | Fix |',
    '| --- | --- | --- | --- | --- | --- | --- |',
  ];

  for (const finding of report.findings) {
    lines.push([
      '',
      markdownCell(finding.name),
      markdownCell(finding.severity),
      finding.direct ? 'yes' : 'no',
      markdownCell(finding.exposure),
      markdownCell(finding.directOwners.join('<br>') || 'unresolved'),
      markdownCell(finding.examplePath?.join(' → ') || 'unresolved'),
      markdownCell(fixLabel(finding.fixAvailable)),
      '',
    ].join('|'));
  }

  lines.push(
    '',
    `## Deprecated installed packages (${report.deprecations.length})`,
    '',
    '| Package | Direct? | Exposure | Owning direct dependency | Example dependency path | Deprecation |',
    '| --- | --- | --- | --- | --- | --- |',
  );
  for (const deprecated of report.deprecations) {
    lines.push([
      '',
      markdownCell(`${deprecated.name}@${deprecated.version ?? 'unknown'}`),
      deprecated.direct ? 'yes' : 'no',
      markdownCell(deprecated.exposure),
      markdownCell(deprecated.directOwners.join('<br>') || 'unresolved'),
      markdownCell(deprecated.examplePath?.join(' → ') || 'unresolved'),
      markdownCell(deprecated.message),
      '',
    ].join('|'));
  }

  const unresolved = report.findings.filter((finding) => finding.exposure === 'unknown');
  const unresolvedDeprecations = report.deprecations.filter((finding) => finding.exposure === 'unknown');
  lines.push(
    '',
    '## Interpretation',
    '',
    '- `runtime` means reachable from at least one workspace production dependency.',
    '- `dev-only` means reachable only from direct development dependencies.',
    '- `mixed` means both runtime and development roots reach the vulnerable installation.',
    '- `unknown` means the installed node reported by npm audit could not be connected to a workspace direct dependency from the lockfile; investigate before changing versions.',
  );
  if (unresolved.length) {
    lines.push('', `Unresolved vulnerability ownership: ${unresolved.map((finding) => finding.name).join(', ')}.`);
  }
  if (unresolvedDeprecations.length) {
    lines.push('', `Unresolved deprecated-package ownership: ${unresolvedDeprecations.map((finding) => `${finding.name}@${finding.version}`).join(', ')}.`);
  }

  return `${lines.join('\n')}\n`;
}

function main() {
  const options = parseArgs(process.argv.slice(2));
  const audit = readAudit(options);
  const lockfile = JSON.parse(readFileSync(options.lockfilePath, 'utf8'));
  const deprecatedWarnings = options.npmCiLogPath
    ? parseDeprecatedWarnings(readFileSync(options.npmCiLogPath, 'utf8'))
    : [];
  const report = buildReport(audit, lockfile, deprecatedWarnings);
  const markdown = renderMarkdown(report);

  writeFileSync(options.jsonPath, `${JSON.stringify(report, null, 2)}\n`);
  writeFileSync(options.markdownPath, markdown);

  if (process.env.GITHUB_STEP_SUMMARY) {
    appendFileSync(process.env.GITHUB_STEP_SUMMARY, markdown);
  }

  const total = report.totals.total
    ?? Object.entries(report.totals)
      .filter(([key]) => key !== 'total')
      .reduce((sum, [, count]) => sum + Number(count || 0), 0);
  const runtime = report.findings.filter((finding) => ['runtime', 'mixed'].includes(finding.exposure)).length;
  const unresolved = report.findings.filter((finding) => finding.exposure === 'unknown').length;
  console.log(`Dependency audit captured ${total} vulnerabilities across ${report.findings.length} package finding(s); ${runtime} runtime-reachable, ${unresolved} unresolved.`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main();
}
