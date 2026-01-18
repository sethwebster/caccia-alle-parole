import { getDailyWord, isValidWord, wordleWords } from './wordle-data.js';

export const LETTER_STATE = {
  CORRECT: 'correct',
  PRESENT: 'present',
  ABSENT: 'absent',
  EMPTY: 'empty',
  PENDING: 'pending'
};

export class WordleGame {
  constructor() {
    this.maxGuesses = 6;
    this.wordLength = 5;
    this.targetWord = null;
    this.targetWordData = null;
    this.guesses = [];
    this.currentGuess = '';
    this.gameState = 'playing'; // playing, won, lost
    this.keyboardState = {};
    this.onStateChange = null;
  }

  startNewGame(useDaily = false) {
    if (useDaily) {
      this.targetWordData = getDailyWord();
    } else {
      const randomIndex = Math.floor(Math.random() * wordleWords.length);
      this.targetWordData = wordleWords[randomIndex];
    }

    this.targetWord = this.targetWordData.word;
    this.guesses = [];
    this.currentGuess = '';
    this.gameState = 'playing';
    this.keyboardState = {};
    this.initializeKeyboard();
    this.notifyStateChange();
  }

  initializeKeyboard() {
    const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');
    letters.forEach(letter => {
      this.keyboardState[letter] = LETTER_STATE.EMPTY;
    });
  }

  addLetter(letter) {
    if (this.gameState !== 'playing') return false;
    if (this.currentGuess.length >= this.wordLength) return false;

    this.currentGuess += letter.toUpperCase();
    this.notifyStateChange();
    return true;
  }

  deleteLetter() {
    if (this.gameState !== 'playing') return false;
    if (this.currentGuess.length === 0) return false;

    this.currentGuess = this.currentGuess.slice(0, -1);
    this.notifyStateChange();
    return true;
  }

  submitGuess() {
    if (this.gameState !== 'playing') return { success: false, error: 'Game over' };
    if (this.currentGuess.length !== this.wordLength) {
      return { success: false, error: 'Parola troppo corta' };
    }

    if (!isValidWord(this.currentGuess)) {
      return { success: false, error: 'Parola non valida' };
    }

    const result = this.evaluateGuess(this.currentGuess);
    this.guesses.push({
      word: this.currentGuess,
      result: result
    });

    this.updateKeyboardState(this.currentGuess, result);

    const isCorrect = this.currentGuess === this.targetWord;
    if (isCorrect) {
      this.gameState = 'won';
    } else if (this.guesses.length >= this.maxGuesses) {
      this.gameState = 'lost';
    }

    this.currentGuess = '';
    this.notifyStateChange();

    return {
      success: true,
      isCorrect,
      gameOver: this.gameState !== 'playing',
      result
    };
  }

  evaluateGuess(guess) {
    const result = [];
    const targetLetters = this.targetWord.split('');
    const guessLetters = guess.split('');
    const letterCounts = {};

    targetLetters.forEach(letter => {
      letterCounts[letter] = (letterCounts[letter] || 0) + 1;
    });

    // First pass: mark correct positions
    guessLetters.forEach((letter, i) => {
      if (letter === targetLetters[i]) {
        result[i] = LETTER_STATE.CORRECT;
        letterCounts[letter]--;
      } else {
        result[i] = LETTER_STATE.PENDING;
      }
    });

    // Second pass: mark present/absent
    guessLetters.forEach((letter, i) => {
      if (result[i] === LETTER_STATE.PENDING) {
        if (letterCounts[letter] && letterCounts[letter] > 0) {
          result[i] = LETTER_STATE.PRESENT;
          letterCounts[letter]--;
        } else {
          result[i] = LETTER_STATE.ABSENT;
        }
      }
    });

    return result;
  }

  updateKeyboardState(guess, result) {
    const letters = guess.split('');
    letters.forEach((letter, i) => {
      const currentState = this.keyboardState[letter];
      const newState = result[i];

      // Priority: correct > present > absent
      if (newState === LETTER_STATE.CORRECT) {
        this.keyboardState[letter] = LETTER_STATE.CORRECT;
      } else if (newState === LETTER_STATE.PRESENT && currentState !== LETTER_STATE.CORRECT) {
        this.keyboardState[letter] = LETTER_STATE.PRESENT;
      } else if (newState === LETTER_STATE.ABSENT &&
                 currentState !== LETTER_STATE.CORRECT &&
                 currentState !== LETTER_STATE.PRESENT) {
        this.keyboardState[letter] = LETTER_STATE.ABSENT;
      }
    });
  }

  getGameState() {
    return {
      targetWord: this.targetWord,
      targetWordData: this.targetWordData,
      guesses: this.guesses,
      currentGuess: this.currentGuess,
      gameState: this.gameState,
      keyboardState: this.keyboardState,
      maxGuesses: this.maxGuesses,
      wordLength: this.wordLength,
      attemptsRemaining: this.maxGuesses - this.guesses.length
    };
  }

  notifyStateChange() {
    if (this.onStateChange) {
      this.onStateChange(this.getGameState());
    }
  }

  setStateChangeCallback(callback) {
    this.onStateChange = callback;
  }

  getShareText() {
    if (this.gameState === 'playing') return null;

    const title = `Paròla ${this.guesses.length}/${this.maxGuesses}`;
    const grid = this.guesses.map(guess => {
      return guess.result.map(state => {
        if (state === LETTER_STATE.CORRECT) return '🟩';
        if (state === LETTER_STATE.PRESENT) return '🟨';
        return '⬜';
      }).join('');
    }).join('\n');

    return `${title}\n\n${grid}`;
  }
}
