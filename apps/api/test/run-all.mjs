import { readdir } from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";

const cwd = process.cwd();
const testRoot = path.join(cwd, "test");

async function findTests(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const tests = [];

  for (const entry of entries) {
    const entryPath = path.join(directory, entry.name);

    if (entry.isDirectory()) {
      tests.push(...(await findTests(entryPath)));
    } else if (entry.isFile() && entry.name.endsWith(".test.mjs")) {
      tests.push(entryPath);
    }
  }

  return tests;
}

const testPaths = (await findTests(testRoot)).sort();
let passed = 0;

for (const testPath of testPaths) {
  const relativePath = path.relative(cwd, testPath);
  console.log(relativePath);
  try {
    await import(pathToFileURL(testPath).href);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`::error file=${relativePath}::${message.replaceAll('\n', '%0A')}`);
    throw error;
  }
  passed += 1;
}

console.log(`Passed ${passed} test files.`);
