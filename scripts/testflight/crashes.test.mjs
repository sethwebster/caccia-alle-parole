import test from 'node:test';
import assert from 'node:assert/strict';
import { generateKeyPairSync, verify } from 'node:crypto';
import { appleToken, appleClient, summarize, pages, collect, issueBody } from './crashes.mjs';
import { synchronize } from './poll.mjs';
const log = `Incident Identifier: PRIVATE-ID\nVersion: 1.0.1 (16)\nOS Version: iPhone OS 27.2\nException Type: EXC_CRASH (SIGABRT)\nTermination Reason: SIGNAL 6 Abort trap: 6\nLast Exception Backtrace:\n0 React 0x123abc RCTFatal + 568 (RCTAssert.m:147)\n1 React 0x888 RCTExceptionsManager + 512\n\nEmail: private@example.com\n/Users/private/secret\n`;
test('signature ignores relocated addresses; output excludes personal report fields', () => {
  const a = summarize(log), b = summarize(log.replaceAll('0x123abc', '0x987def').replace('+ 568', '+ 999'));
  assert.equal(a.signature, b.signature);
  assert.notEqual(a.signature, summarize(log.replace('RCTFatal', 'OtherCrash')).signature);
  const body = issueBody({ ...a, reports: ['abc'], versions: [a.version] }, '6788523009');
  assert.doesNotMatch(body, /PRIVATE-ID|private@example|Users\/private|0x123abc/);
  assert.match(body, /RCTFatal/);
});
test('JWT has a valid ES256 signature and expires in ten minutes', () => {
  const { privateKey, publicKey } = generateKeyPairSync('ec', { namedCurve: 'P-256' });
  const parts = appleToken({ keyId: 'KEY', issuerId: 'ISSUER', privateKey }, 1000).split('.');
  assert.equal(JSON.parse(Buffer.from(parts[1], 'base64url')).exp, 1600);
  assert.ok(verify('sha256', Buffer.from(parts.slice(0,2).join('.')), { key: publicKey, dsaEncoding: 'ieee-p1363' }, Buffer.from(parts[2], 'base64url')));
});
test('pagination follows all pages and rejects loops', async () => {
  const result = await pages(async path => path === '/first' ? { data: [1], links: { next: '/second' } } : { data: [2] }, '/first');
  assert.deepEqual(result.data, [1,2]);
  await assert.rejects(pages(async () => ({ data: [], links: { next: '/first' } }), '/first'), /pagination/);
  await assert.rejects(appleClient({})('https://evil.example/v1/steal'), /unexpected/);
});
test('collector retries pending crash logs on later runs and groups duplicate crashes', async () => {
  const get = async path => path.includes('/apps/') ? { data: [{ id: 'one' }, { id: 'two' }, { id: 'pending' }] } : { data: { attributes: { logText: path.includes('pending') ? null : log } } };
  const groups = await collect(get, '6788523009');
  assert.equal(groups.length, 1); assert.deepEqual(groups[0].reports, ['one','two']);
});
test('repeated polling does not repeatedly run the fixer; recurrence reopens closed issues', async () => {
  const group = { ...summarize(log), reports: ['one'], versions: ['1.0.1 (16)'] };
  let issue;
  const api = async (method, path, data) => {
    if (method === 'GET') return issue ? [issue] : [];
    if (method === 'POST') issue = { ...data, number: 42, state: 'open', labels: data.labels.map(name => ({ name })) };
    if (method === 'PATCH') issue = { ...issue, ...data, labels: data.labels ? data.labels.map(name => ({ name })) : issue.labels };
    return issue;
  };
  assert.equal((await synchronize([group], api, { appId: '1' })).length, 1);
  assert.equal((await synchronize([group], api, { appId: '1' })).length, 0);
  issue.state = 'closed';
  assert.equal((await synchronize([group], api, { appId: '1' })).length, 0);
  group.reports.push('two');
  assert.equal((await synchronize([group], api, { appId: '1' })).length, 1);
  assert.equal(issue.state, 'open');
});
