import assert from 'node:assert/strict';
import { execFile } from 'node:child_process';
import { createServer } from 'node:net';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);
const blocker = createServer();

await new Promise((resolve, reject) => {
  blocker.once('error', reject);
  blocker.listen(0, '0.0.0', resolve);
});

const address = blocker.address();
assert.ok(address && typeof address === 'object');

try {
  await assert.rejects(
    execFileAsync(process.execPath, ['dist/main.js'], {
      cwd: new URL('../../', import.meta.url),
      env: {
        ...process.env,
        PORT: String(address.port),
        AUTH_MODE: 'dev-single-user',
        DEV_SINGLE_USER_ID: '1',
        ADMIN_AUTH_MODE: 'disabled',
      },
      timeout: 5000,
      killSignal: 'SIGKILL',
    }),
    (error) => {
      assert.equal(error.killed, false, 'API startup failure must exit without waiting for the test timeout');
      assert.equal(error.code, 1, 'API startup failure must return a non-zero exit code');
      assert.match(
        `${error.stdout ?? ''}\n${error.stderr ?? ''}`,
        /API startup failed/,
        'API startup failure must be clearly logged',
      );
      return true;
    },
  );
} finally {
  await new Promise((resolve, reject) => {
    blocker.close((error) => (error ? reject(error) : resolve()));
  });
}

console.log('API startup failure tests passed.');
