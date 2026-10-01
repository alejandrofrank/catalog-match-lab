import test from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { get } from 'node:http';
test('local server serves the demo but not credentials, Git metadata or cross-origin inference', async () => {
  const port = Number(process.env.TEST_PORT ?? 14321);
  const child = spawn(process.execPath, ['scripts/serve.js'], { env: { ...process.env, PORT: String(port), JEV_API_KEY: '' }, stdio: ['ignore', 'pipe', 'pipe'] });
  const closed = once(child, 'exit');
  let timer;
  try {
    await Promise.race([once(child.stdout, 'data'), new Promise((_, reject) => { timer = setTimeout(() => reject(new Error('Server startup timeout')), 5000); }), once(child, 'error').then(([e]) => { throw e; })]);
    clearTimeout(timer);
    const base = 'http://127.0.0.1:' + port;
    assert.equal((await fetch(base)).status, 200);
    for (const path of ['/.env', '/.env.local', '/.git/config', '/package.json', '/src/jev.js', '/data/private.csv']) assert.equal((await fetch(base + path)).status, 404);
    const foreignHostStatus = await new Promise((resolve, reject) => {
      const req = get(base, { headers: { Host: 'foreign.example' } }, res => { res.resume(); resolve(res.statusCode); });
      req.on('error', reject);
    });
    assert.equal(foreignHostStatus, 403);
    const response = await fetch(base + '/api/jev', { method: 'POST', headers: { Origin: 'https://foreign.example', 'Content-Type': 'application/json' }, body: '{}' });
    assert.ok([403, 405].includes(response.status));
    assert.deepEqual(await (await fetch(base + '/api/config')).json(), { jev: false });
  } finally {
    clearTimeout(timer); child.kill(); await closed;
  }
});
