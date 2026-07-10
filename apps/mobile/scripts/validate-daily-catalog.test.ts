import { describe, expect, it } from 'vitest';

import snapshots from '../src/features/daily/__fixtures__/challenge-snapshots.json';
import { validateBundledDailyCatalog } from '../src/features/daily/catalog-validation';

describe('bundled Daily Challenge catalog workflow', () => {
	it('validates the editorial calendar and frozen snapshots', () => {
		const validation = validateBundledDailyCatalog(snapshots);

		expect(validation).toEqual({ kind: 'valid', checkedSnapshots: 6 });
	});
});
