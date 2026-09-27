import { beforeEach, describe, expect, it, vi } from 'vitest';

import { createTodayState, evaluateGuess, loadSavedState, persistState, submitCurrentGuess, withLetter, withoutLastLetter } from './parola-logic';
import { loadJSON, saveJSON } from '@/lib/storage';

vi.mock('@/lib/storage', () => ({ loadJSON: vi.fn(), saveJSON: vi.fn() }));

beforeEach(() => vi.clearAllMocks());

describe('Parola gameplay and daily persistence', () => {
  it('accepts a second valid guess without resetting the first row', () => {
    const state = { ...createTodayState(), targetWord: 'CANTO', currentGuess: 'PORTA' };
    const first = submitCurrentGuess(state);
    expect(first.kind).toBe('played');
    if (first.kind !== 'played') throw new Error('first guess rejected');
    let next = first.state;
    for (const letter of 'CANTO') next = withLetter(next, letter);
    const second = submitCurrentGuess(next);
    expect(second.kind).toBe('played');
    if (second.kind !== 'played') throw new Error('second guess rejected');
    expect(second.state.guesses.map(({ word }) => word)).toEqual(['PORTA', 'CANTO']);
    expect(second.state.gameState).toBe('won');
  });

  it('lets players enter and delete a placeholder but never scores it as a wildcard', () => {
    let state = createTodayState();
    for (const letter of 'CASA*') state = withLetter(state, letter);
    expect(state.currentGuess).toBe('CASA*');
    expect(submitCurrentGuess(state)).toEqual({ kind: 'rejected', message: 'Sostituisci i segnaposto prima di inviare' });
    expect(withoutLastLetter(state).currentGuess).toBe('CASA');
    expect(state.guesses).toEqual([]);
  });

  it('restores a finished day and rejects further input after reopening', async () => {
    const today = createTodayState();
    const win = submitCurrentGuess({ ...today, currentGuess: today.targetWord });
    if (win.kind !== 'played') throw new Error('daily answer rejected');
    await persistState(win.state);
    vi.mocked(loadJSON).mockResolvedValue(vi.mocked(saveJSON).mock.calls[0][1]);
    const restored = await loadSavedState();
    expect(restored?.gameState).toBe('won');
    if (restored === null) throw new Error('save was lost');
    expect(withLetter(restored, 'A')).toBe(restored);
    expect(submitCurrentGuess(restored).kind).toBe('ignored');
  });

  it('discards yesterday’s record', async () => {
    vi.mocked(loadJSON).mockResolvedValue({ ...createTodayState(), date: '2000-01-01' });
    expect(await loadSavedState()).toBeNull();
  });
});

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
