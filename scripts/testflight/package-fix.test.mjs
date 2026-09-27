import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, rmSync } from 'node:fs';
import { execFileSync, spawnSync } from 'node:child_process';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
const script = fileURLToPath(new URL('./package-fix.mjs', import.meta.url));
test('publisher packaging accepts an application fix but rejects workflow changes', () => {
  const dir = mkdtempSync(join(tmpdir(), 'testflight-package-'));
  try {
    const git = args => execFileSync('git',args,{cwd:dir,stdio:'pipe'});
    git(['init']);mkdirSync(join(dir,'apps/mobile/src'),{recursive:true});
    writeFileSync(join(dir,'apps/mobile/src/example.ts'),'export const value = 1;\n');
    git(['add','.']);git(['-c','user.name=Test','-c','user.email=test@example.invalid','commit','-m','fixture']);
    mkdirSync(join(dir,'.crash-fix'));writeFileSync(join(dir,'.crash-fix/result.md'),'Reproduced and tested. Native replay pending.');
    writeFileSync(join(dir,'apps/mobile/src/example.ts'),'export const value = 2;\n');
    assert.equal(spawnSync(process.execPath,[script],{cwd:dir}).status,0);
    assert.match(readFileSync(join(dir,'.crash-fix/fix.patch'),'utf8'),/value = 2/);
    mkdirSync(join(dir,'.github/workflows'),{recursive:true});writeFileSync(join(dir,'.github/workflows/unsafe.yml'),'changed');
    const blocked = spawnSync(process.execPath,[script],{cwd:dir,encoding:'utf8'});
    assert.notEqual(blocked.status,0);assert.match(blocked.stderr,/Unexpected proposed change/);
  } finally { rmSync(dir,{recursive:true,force:true}); }
});
