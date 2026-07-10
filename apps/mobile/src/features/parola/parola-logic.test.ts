import { describe, expect, it } from 'vitest';

import { evaluateGuess } from './parola-logic';

describe('evaluateGuess', () => {
  it('marks every letter correct when the guess matches the target', () => {
    expect(evaluateGuess('CANTO', 'CANTO')).toEqual([
      { letter: 'C', status: 'correct' },
      { letter: 'A', status: 'correct' },
      { letter: 'N', status: 'correct' },
      { letter: 'T', status: 'correct' },
      { letter: 'O', status: 'correct' },
    ]);
  });
});
