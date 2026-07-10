import assert from 'node:assert/strict';
import { buildApp } from '../../dist/app.js';

async function inspectApp() {
  const app = await buildApp({ logger: false });
  try {
    await app.ready();
    const health = await app.inject({ method: 'GET', url: '/health' });
    assert.equal(health.statusCode, 200);
    assert.deepEqual(health.json(), { ok: true });
    return app.swagger();
  } finally {
    await app.close();
  }
}

const first = await inspectApp();
const second = await inspectApp();

assert.deepEqual(second, first);
assert.equal(first.openapi, '3.0.3');
assert.deepEqual(first.info, { title: 'Chess Repertoire Trainer API', version: '1.0.0' });

console.log('App factory isolation tests passed.');
