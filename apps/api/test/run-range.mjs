import { readdir } from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const cwd = process.cwd();
const testRoot = path.join(cwd, 'test');
const [start = '', end = '\uffff'] = process.argv.slice(2);

async function findTests(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const tests = [];
  for (const entry of entries) {
    const entryPath = path.join(directory, entry.name);
    if (entry.isDirectory()) tests.push(...await findTests(entryPath));
    else if (entry.isFile() && entry.name.endsWith('.test.mjs')) tests.push(entryPath);
  }
  return tests;
}

const testPaths = (await findTests(testRoot))
  .sort()
  .filter((testPath) => {
    const relative = path.relative(testRoot, testPath).replaceAll(path.sep, '/');
    return relative >= start && relative < end;
  });

for (const testPath of testPaths) {
  console.log(path.relative(cwd, testPath));
  await import(pathToFileURL(testPath).href);
}

console.log(`Passed ${testPaths.length} test files in [${start}, ${end}).`);
