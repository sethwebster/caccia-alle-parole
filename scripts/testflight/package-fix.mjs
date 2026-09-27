import { execFileSync } from 'node:child_process';
import { readFile, writeFile } from 'node:fs/promises';
const git = args => execFileSync('git', args, { encoding: 'utf8' });
const status = git(['status', '--porcelain', '--untracked-files=all']);
for (const line of status.trimEnd().split('\n').filter(Boolean)) {
  const path = line.slice(3);
  if (path.startsWith('.crash-reports/') || path.startsWith('.crash-fix/')) continue;
  if (!path.startsWith('apps/mobile/') || /(?:^|\/)(?:AGENTS|CLAUDE)\.md$/.test(path) || /(?:^|\/)(?:app\.json|eas\.json)$/.test(path)) throw new Error(`Unexpected proposed change: ${path}`);
}
const result = await readFile('.crash-fix/result.md', 'utf8');
if (!result.trim()) throw new Error('Investigation summary is required');
git(['add', '--', 'apps/mobile']);
await writeFile('.crash-fix/fix.patch', git(['diff', '--cached', '--binary', '--', 'apps/mobile']));
