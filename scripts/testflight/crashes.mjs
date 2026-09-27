import { createHash, sign } from 'node:crypto';

const APPLE = 'https://api.appstoreconnect.apple.com';
export function appleToken({ keyId, issuerId, privateKey }, now = Math.floor(Date.now() / 1000)) {
  const encode = value => Buffer.from(JSON.stringify(value)).toString('base64url');
  const payload = `${encode({ alg: 'ES256', kid: keyId, typ: 'JWT' })}.${encode({ iss: issuerId, iat: now, exp: now + 600, aud: 'appstoreconnect-v1' })}`;
  return `${payload}.${sign('sha256', Buffer.from(payload), { key: privateKey, dsaEncoding: 'ieee-p1363' }).toString('base64url')}`;
}

export function appleClient(credentials, fetcher = fetch) {
  return async function get(path) {
    const url = new URL(path, APPLE);
    if (url.origin !== APPLE || !url.pathname.startsWith('/v1/')) throw new Error('Refusing an unexpected Apple API URL');
    for (let attempt = 0; attempt < 4; attempt++) {
      const response = await fetcher(url, { headers: { Authorization: `Bearer ${appleToken(credentials)}` }, signal: AbortSignal.timeout(30_000), redirect: 'error' });
      if (response.ok) return response.json();
      if ((response.status === 429 || response.status >= 500) && attempt < 3) {
        const retry = Math.min(30, Math.max(1, Number(response.headers.get('retry-after')) || 2 ** attempt));
        await new Promise(resolve => setTimeout(resolve, retry * 1000));
        continue;
      }
      // Never print server bodies, headers or credentials.
      throw new Error(`Apple API ${response.status} for ${url.pathname}`);
    }
  };
}

export async function pages(get, path) {
  const data = [], included = [];
  const visited = new Set();
  while (path) {
    if (visited.has(path) || visited.size >= 100) throw new Error('Invalid or excessive pagination');
    visited.add(path);
    const page = await get(path);
    if (!Array.isArray(page.data)) throw new Error('Invalid Apple collection response');
    data.push(...page.data);
    included.push(...(page.included ?? []));
    path = page.links?.next;
  }
  return { data, included };
}

/** Keep only technical crash fields. Tester comments, email, paths and device identifiers never leave the collector. */
export function summarize(log) {
  if (typeof log !== 'string' || !log.trim()) throw new Error('Crash log is unavailable');
  const lines = log.split(/\r?\n/);
  const field = name => lines.find(line => line.startsWith(`${name}:`))?.slice(name.length + 1).trim() ?? 'Unknown';
  const triggered = field('Triggered by Thread').match(/^\d+/)?.[0];
  let start = lines.findIndex(line => line === 'Last Exception Backtrace:');
  if (start < 0 && triggered) start = lines.findIndex(line => line.startsWith(`Thread ${triggered} Crashed:`));
  const frames = [];
  if (start >= 0) for (const line of lines.slice(start + 1)) {
    if (!/^\d+\s/.test(line)) break;
    frames.push(line.replace(/0x[0-9a-f]+/gi, '<address>').replace(/\s+\+\s+\d+/g, '').replace(/\s+/g, ' ').replace(/\([^)]*\)/g, '').trim().slice(0,350));
    if (frames.length >= 16) break;
  }
  const clean = value => value.replace(/[\x00-\x1f`@]/g, '').replace(/(?:\/Users\/|\/home\/|\/private\/)[^\s]+/g, '<path>').slice(0,500);
  const exception = clean(field('Exception Type'));
  const termination = clean(field('Termination Reason'));
  const stack = frames.map(clean);
  const signature = createHash('sha256').update(JSON.stringify({ exception, termination, stack })).digest('hex').slice(0,24);
  return { signature, exception, termination, stack, version: clean(field('Version')), os: clean(field('OS Version')) };
}

export async function collect(get, appId) {
  if (!/^\d+$/.test(appId)) throw new Error('Invalid app id');
  const reports = await pages(get, `/v1/apps/${appId}/betaFeedbackCrashSubmissions?limit=200&include=build`);
  const groups = new Map();
  for (const report of reports.data) {
    if (!/^[a-zA-Z0-9-]+$/.test(report.id)) throw new Error('Invalid report id');
    let response;
    try { response = await get(`/v1/betaFeedbackCrashSubmissions/${report.id}/crashLog`); }
    catch (error) { if (error.message.startsWith('Apple API 404 ')) continue; throw error; }
    const log = response.data?.attributes?.logText;
    if (!log) continue; // Apple can publish feedback before its log; retry next poll.
    const summary = summarize(log);
    const group = groups.get(summary.signature) ?? { ...summary, reports: [], versions: [] };
    group.reports.push(report.id);
    if (!group.versions.includes(summary.version)) group.versions.push(summary.version);
    groups.set(summary.signature, group);
  }
  return [...groups.values()];
}

export function issueBody(group, appId) {
  return `<!-- testflight-crash:${group.signature} -->\nTestFlight crash in ${group.versions.join(', ')}.\n\nException: ${group.exception}\nTermination: ${group.termination}\nOS: ${group.os}\n\nSymbolicated frames (addresses removed):\n\n\`\`\`text\n${group.stack.join('\n') || 'No stack available; retrieve additional diagnostics before changing code.'}\n\`\`\`\n\nReports: ${group.reports.map(id => `\`${id}\``).join(', ')}\n\n[Apple crash feedback](https://appstoreconnect.apple.com/apps/${appId}/testflight)\n\nAutomation must reproduce this signature before proposing a fix. A native crash needs a Release simulator/device check; unit tests alone do not close this issue.\n`;
}
