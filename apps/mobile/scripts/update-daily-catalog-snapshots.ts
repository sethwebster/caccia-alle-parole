import { writeFileSync } from 'node:fs';

import { generateChallengeSnapshots } from '../src/features/daily/catalog';

const snapshotUrl = new URL('../src/features/daily/__fixtures__/challenge-snapshots.json', import.meta.url);
writeFileSync(snapshotUrl, `${JSON.stringify(generateChallengeSnapshots(), null, 2)}\n`);
