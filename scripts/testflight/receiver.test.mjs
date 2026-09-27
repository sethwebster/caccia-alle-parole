import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createHmac } from 'node:crypto';
import { receive } from './receiver.mjs';

const env = { APPLE_WEBHOOK_SECRET: 'test-secret', GITHUB_DISPATCH_TOKEN: 'test-token' };
const event = { data: { type: 'betaFeedbackCrashSubmissionCreated', id: 'event-1', version: 1, relationships: { instance: { data: { type: 'betaFeedbackCrashSubmissions', id: 'report-1' } } } } };
function request(value = event, secret = env.APPLE_WEBHOOK_SECRET) {
  const body = typeof value === 'string' ? value : JSON.stringify(value);
  const signature = createHmac('sha256', secret).update(body).digest('hex');
  return new Request('https://example.com/testflight', { method: 'POST', body, headers: { 'x-apple-signature': `hmacsha256=${signature}` } });
}
test('verified Apple crash triggers only the fixed workflow on main', async () => {
  let calls = 0;
  const response = await receive(request(), env, async (url, options) => {
    calls++;
    assert.equal(url, 'https://api.github.com/repos/sethwebster/caccia-alle-parole/actions/workflows/testflight-crashes.yml/dispatches');
    assert.deepEqual(JSON.parse(options.body), { ref: 'main' });
    assert.equal(options.headers.Authorization, 'Bearer test-token');
    assert.equal(options.redirect, 'manual');
    return new Response(null, { status: 204 });
  });
  assert.equal(response.status, 202);
  assert.equal(calls, 1);
});
test('rejects forged signatures, modified bodies, invalid JSON, and oversized streams before dispatch', async () => {
  const forbidden = () => assert.fail('must not dispatch');
  assert.equal((await receive(request(event, 'wrong-secret'), env, forbidden)).status, 401);
  const signed = request();
  const modified = new Request(signed.url, { method: 'POST', headers: signed.headers, body: JSON.stringify(event) + ' ' });
  assert.equal((await receive(modified, env, forbidden)).status, 401);
  assert.equal((await receive(request('{'), env, forbidden)).status, 400);
  assert.equal((await receive(request('x'.repeat(65537)), env, forbidden)).status, 413);
});
test('ignores unrelated events and rejects malformed crash events', async () => {
  const forbidden = () => assert.fail('must not dispatch');
  assert.equal((await receive(request({ data: { type: 'appStoreVersionAppVersionStateUpdated' } }), env, forbidden)).status, 200);
  assert.equal((await receive(request({ data: { type: event.data.type } }), env, forbidden)).status, 400);
});
test('does not acknowledge success when GitHub rejects or times out', async () => {
  assert.equal((await receive(request(), env, async () => new Response(null, { status: 302, headers: { location: 'https://example.com' } }))).status, 503);
  assert.equal((await receive(request(), env, async () => new Response(null, { status: 403 }))).status, 503);
  assert.equal((await receive(request(), env, async () => { throw new Error('network'); })).status, 503);
});
