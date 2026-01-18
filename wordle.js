import { WordleGame, LETTER_STATE } from './wordle-game.js';

const KEYBOARD_LAYOUT = [
  ['Q', 'W', 'E', 'R', 'T', 'Y', 'U', 'I', 'O', 'P'],
  ['A', 'S', 'D', 'F', 'G', 'H', 'J', 'K', 'L'],
  ['ENTER', 'Z', 'X', 'C', 'V', 'B', 'N', 'M', 'BACKSPACE']
];

export class WordleUI {
  constructor() {
    this.game = new WordleGame();
    this.elements = {};
    this.shakeTimeout = null;

    this.initializeElements();
    this.attachEventListeners();
    this.game.setStateChangeCallback((state) => this.render(state));
  }

  initializeElements() {
    this.elements.grid = document.getElementById('wordle-grid');
    this.elements.keyboard = document.getElementById('wordle-keyboard');
    this.elements.message = document.getElementById('wordle-message');
    this.elements.newGameBtn = document.getElementById('wordle-new-game');
    this.elements.shareBtn = document.getElementById('wordle-share');
    this.elements.victoryModal = document.getElementById('wordle-victory-modal');
    this.elements.victoryClose = document.querySelector('#wordle-victory-modal .modal-close');
    this.elements.playAgainBtn = document.getElementById('wordle-play-again');
    this.elements.finalGuesses = document.getElementById('wordle-final-guesses');
    this.elements.finalWord = document.getElementById('wordle-final-word');
    this.elements.finalDefinition = document.getElementById('wordle-final-definition');
  }

  attachEventListeners() {
    // Keyboard clicks
    this.elements.keyboard.addEventListener('click', (e) => {
      const key = e.target.closest('.key');
      if (!key) return;

      const keyValue = key.dataset.key;
      this.handleKeyInput(keyValue);
    });

    // Physical keyboard
    document.addEventListener('keydown', (e) => {
      const wordleContainer = document.getElementById('wordle-container');
      if (wordleContainer && !wordleContainer.classList.contains('hidden')) {
        this.handlePhysicalKey(e);
      }
    });

    // Buttons
    this.elements.newGameBtn.addEventListener('click', () => this.startNewGame());
    this.elements.shareBtn.addEventListener('click', () => this.shareResults());
    this.elements.playAgainBtn.addEventListener('click', () => {
      this.hideVictoryModal();
      this.startNewGame();
    });
    this.elements.victoryClose.addEventListener('click', () => this.hideVictoryModal());

    // Modal click outside
    this.elements.victoryModal.addEventListener('click', (e) => {
      if (e.target === this.elements.victoryModal) {
        this.hideVictoryModal();
      }
    });
  }

  handlePhysicalKey(e) {
    if (e.ctrlKey || e.metaKey || e.altKey) return;

    if (e.key === 'Enter') {
      e.preventDefault();
      this.handleKeyInput('ENTER');
    } else if (e.key === 'Backspace') {
      e.preventDefault();
      this.handleKeyInput('BACKSPACE');
    } else if (/^[a-zA-Z]$/.test(e.key)) {
      e.preventDefault();
      this.handleKeyInput(e.key.toUpperCase());
    }
  }

  handleKeyInput(key) {
    if (key === 'ENTER') {
      const result = this.game.submitGuess();
      if (!result.success) {
        this.showMessage(result.error, 'error');
        this.shakeCurrentRow();
      } else if (result.gameOver) {
        setTimeout(() => this.showVictoryModal(), 2000);
      }
    } else if (key === 'BACKSPACE') {
      this.game.deleteLetter();
    } else {
      this.game.addLetter(key);
    }
  }

  startNewGame() {
    this.game.startNewGame(true);
    this.buildGrid();
    this.buildKeyboard();
    this.showMessage('Indovina la parola!', 'info');
  }

  buildGrid() {
    this.elements.grid.innerHTML = '';

    for (let row = 0; row < this.game.maxGuesses; row++) {
      const rowElement = document.createElement('div');
      rowElement.className = 'wordle-row';
      rowElement.dataset.row = row;

      for (let col = 0; col < this.game.wordLength; col++) {
        const tile = document.createElement('div');
        tile.className = 'wordle-tile';
        tile.dataset.row = row;
        tile.dataset.col = col;
        rowElement.appendChild(tile);
      }

      this.elements.grid.appendChild(rowElement);
    }
  }

  buildKeyboard() {
    this.elements.keyboard.innerHTML = '';

    KEYBOARD_LAYOUT.forEach(row => {
      const rowElement = document.createElement('div');
      rowElement.className = 'keyboard-row';

      row.forEach(key => {
        const keyElement = document.createElement('button');
        keyElement.className = 'key';
        keyElement.dataset.key = key;

        if (key === 'ENTER') {
          keyElement.textContent = 'INVIO';
          keyElement.classList.add('key-wide');
        } else if (key === 'BACKSPACE') {
          keyElement.textContent = '←';
          keyElement.classList.add('key-wide');
        } else {
          keyElement.textContent = key;
        }

        rowElement.appendChild(keyElement);
      });

      this.elements.keyboard.appendChild(rowElement);
    });
  }

  render(state) {
    this.renderGuesses(state);
    this.renderCurrentGuess(state);
    this.renderKeyboard(state);
    this.updateShareButton(state);
  }

  renderGuesses(state) {
    state.guesses.forEach((guess, rowIndex) => {
      const rowElement = this.elements.grid.querySelector(`[data-row="${rowIndex}"]`);
      if (!rowElement) return;

      guess.word.split('').forEach((letter, colIndex) => {
        const tile = rowElement.querySelector(`[data-col="${colIndex}"]`);
        if (!tile) return;

        // Only animate if not already animated
        const alreadyFlipped = tile.dataset.flipped === 'true';

        tile.textContent = letter;
        tile.className = `wordle-tile tile-${guess.result[colIndex]}`;

        // Animate tile flip only once
        if (!alreadyFlipped) {
          tile.dataset.flipped = 'true';
          setTimeout(() => {
            tile.classList.add('flip');
          }, colIndex * 100);
        } else {
          // Already flipped, keep flip class
          tile.classList.add('flip');
        }
      });
    });
  }

  renderCurrentGuess(state) {
    if (state.gameState !== 'playing') return;

    const currentRow = state.guesses.length;
    const rowElement = this.elements.grid.querySelector(`[data-row="${currentRow}"]`);
    if (!rowElement) return;

    for (let col = 0; col < state.wordLength; col++) {
      const tile = rowElement.querySelector(`[data-col="${col}"]`);
      if (!tile) continue;

      if (col < state.currentGuess.length) {
        tile.textContent = state.currentGuess[col];
        tile.className = 'wordle-tile tile-filled';
      } else {
        tile.textContent = '';
        tile.className = 'wordle-tile';
      }
    }
  }

  renderKeyboard(state) {
    Object.entries(state.keyboardState).forEach(([letter, keyState]) => {
      const keyElement = this.elements.keyboard.querySelector(`[data-key="${letter}"]`);
      if (!keyElement) return;

      keyElement.className = 'key';
      if (keyState !== LETTER_STATE.EMPTY) {
        keyElement.classList.add(`key-${keyState}`);
      }
    });

    // Update wide keys
    const enterKey = this.elements.keyboard.querySelector('[data-key="ENTER"]');
    const backspaceKey = this.elements.keyboard.querySelector('[data-key="BACKSPACE"]');
    if (enterKey) enterKey.classList.add('key-wide');
    if (backspaceKey) backspaceKey.classList.add('key-wide');
  }

  shakeCurrentRow() {
    const state = this.game.getGameState();
    const currentRow = state.guesses.length;
    const rowElement = this.elements.grid.querySelector(`[data-row="${currentRow}"]`);

    if (rowElement) {
      rowElement.classList.add('shake');
      setTimeout(() => {
        rowElement.classList.remove('shake');
      }, 500);
    }
  }

  showMessage(text, type = 'info') {
    this.elements.message.textContent = text;
    this.elements.message.className = `wordle-message wordle-message-${type}`;
    this.elements.message.classList.add('show');

    setTimeout(() => {
      this.elements.message.classList.remove('show');
    }, 3000);
  }

  showVictoryModal() {
    const state = this.game.getGameState();

    if (state.gameState === 'won') {
      this.elements.finalGuesses.textContent = `${state.guesses.length}/${state.maxGuesses}`;
    } else {
      this.elements.finalGuesses.textContent = 'X/6';
    }

    this.elements.finalWord.textContent = `${state.targetWordData.word} (${state.targetWordData.translation})`;
    this.elements.finalDefinition.textContent = state.targetWordData.definition;

    this.elements.victoryModal.classList.remove('hidden');
  }

  hideVictoryModal() {
    this.elements.victoryModal.classList.add('hidden');
  }

  updateShareButton(state) {
    if (state.gameState !== 'playing') {
      this.elements.shareBtn.style.display = 'inline-block';
    } else {
      this.elements.shareBtn.style.display = 'none';
    }
  }

  shareResults() {
    const shareText = this.game.getShareText();
    if (!shareText) return;

    if (navigator.share) {
      navigator.share({
        text: shareText
      }).catch(() => {
        this.copyToClipboard(shareText);
      });
    } else {
      this.copyToClipboard(shareText);
    }
  }

  copyToClipboard(text) {
    navigator.clipboard.writeText(text).then(() => {
      this.showMessage('Risultato copiato!', 'success');
    }).catch(() => {
      this.showMessage('Errore nella copia', 'error');
    });
  }

  show() {
    const container = document.getElementById('wordle-container');
    if (container) {
      container.classList.remove('hidden');
      container.style.display = 'flex';
      if (this.game.gameState === 'playing' && this.game.guesses.length === 0) {
        this.startNewGame();
      }
    }
  }

  hide() {
    const container = document.getElementById('wordle-container');
    if (container) {
      container.classList.add('hidden');
      container.style.display = 'none';
    }
  }
}
