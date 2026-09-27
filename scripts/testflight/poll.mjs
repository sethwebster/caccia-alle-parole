import { appendFile, mkdir, writeFile } from 'node:fs/promises';
import { appleClient, collect, issueBody } from './crashes.mjs';

export async function synchronize(groups, github, { appId, retryIssue = '' }) {
  const issues = [];
  for (let page = 1; ; page++) {
    const batch = await github('GET', `/issues?state=all&labels=testflight-crash&per_page=100&page=${page}`);
    issues.push(...batch.filter(issue => !issue.pull_request));
    if (batch.length < 100) break;
    if (page >= 100) throw new Error('Issue pagination exceeded limit');
  }
  const tasks = [];
  for (const group of groups) {
    const marker = `<!-- testflight-crash:${group.signature} -->`;
    let issue = issues.find(item => item.body?.includes(marker));
    const body = issueBody(group, appId);
    if (!issue) {
      issue = await github('POST', '/issues', { title: `TestFlight: ${group.exception} (${group.signature})`, body, labels: ['testflight-crash', 'testflight-fix-requested'] });
    } else if (group.reports.some(id => !issue.body?.includes(`\`${id}\``))) {
      const wasClosed = issue.state === 'closed';
      issue = await github('PATCH', `/issues/${issue.number}`, { body, ...(wasClosed ? { state: 'open', labels: [...issue.labels.map(l => l.name), 'testflight-fix-requested'] } : {}) });
    }
    const requested = issue.labels.some(label => (typeof label === 'string' ? label : label.name) === 'testflight-fix-requested') || String(issue.number) === retryIssue;
    if (issue.state === 'closed' || !requested || tasks.length >= 2) continue;
    // Reserve before invoking the agent. Failures are visible in Actions; retries are explicit.
    await github('PATCH', `/issues/${issue.number}`, { labels: [...new Set([...issue.labels.map(l => typeof l === 'string' ? l : l.name).filter(l => l !== 'testflight-fix-requested'), 'testflight-fix-attempted'])] });
    tasks.push({ issue: issue.number, signature: group.signature });
  }
  return tasks;
}

async function main() {
  const appId = process.env.ASC_APP_ID ?? '6788523009';
  const get = appleClient({ keyId: process.env.ASC_KEY_ID, issuerId: process.env.ASC_ISSUER_ID, privateKey: process.env.ASC_PRIVATE_KEY });
  const groups = await collect(get, appId);
  await mkdir('.crash-reports', { recursive: true });
  for (const group of groups) await writeFile(`.crash-reports/${group.signature}.md`, issueBody(group, appId));
  if (process.env.DRY_RUN === 'true') { console.log(`Found ${groups.length} crash signatures (dry run; no GitHub changes)`); return; }
  const repo = process.env.GITHUB_REPOSITORY;
  if (!/^[\w.-]+\/[\w.-]+$/.test(repo ?? '')) throw new Error('Invalid GitHub repository');
  const github = async (method, path, body) => {
    const response = await fetch(`https://api.github.com/repos/${repo}${path}`, { method, headers: { Authorization: `Bearer ${process.env.GH_TOKEN}`, Accept: 'application/vnd.github+json', 'X-GitHub-Api-Version': '2022-11-28', 'Content-Type': 'application/json' }, ...(body ? { body: JSON.stringify(body) } : {}), signal: AbortSignal.timeout(30_000) });
    if (!response.ok) throw new Error(`GitHub API ${response.status} for ${method} ${path.split('?')[0]}`);
    return response.status === 204 ? null : response.json();
  };
  for (const name of ['testflight-crash', 'testflight-fix-requested', 'testflight-fix-attempted']) {
    try { await github('POST', '/labels', { name, color: 'B60205' }); } catch (error) { if (!error.message.includes('422')) throw error; }
  }
  const retryIssue = process.env.RETRY_ISSUE ?? '';
  if (retryIssue && !/^\d+$/.test(retryIssue)) throw new Error('retry_issue must be a number');
  const tasks = await synchronize(groups, github, { appId, retryIssue });
  if (process.env.GITHUB_OUTPUT) await appendFile(process.env.GITHUB_OUTPUT, `tasks=${JSON.stringify(tasks)}\n`);
  console.log(`Found ${groups.length} signatures; scheduled ${tasks.length} investigations`);
}
if (import.meta.url === `file://${process.argv[1]}`) main().catch(error => { console.error(error.message); process.exitCode = 1; });
