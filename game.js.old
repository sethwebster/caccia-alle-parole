import { wordDatabase, categories, getRandomWords } from './word-data.js';
import { generateGrid } from './grid-generator.js';
import { initSelector, resetSelector, getFoundWords, isComplete } from './word-selector.js';
import { WordleUI } from './wordle.js';

class GameManager {
    constructor() {
        this.currentMode = null;
        this.wordSearchGame = null;
        this.wordleUI = null;

        this.initializeElements();
        this.attachModeListeners();
        this.initializeNavigation();
        this.initializeURLState();
    }

    initializeElements() {
        this.modeSelector = document.getElementById('mode-selector');
        this.modeCards = document.querySelectorAll('.mode-card');
        this.backToMenuBtn = document.getElementById('back-to-menu');
        this.navToggle = document.getElementById('nav-toggle');
        this.navMenu = document.getElementById('nav-menu');
        this.navHome = document.getElementById('nav-home');
        this.navLinks = document.querySelectorAll('.top-nav__link');
    }

    attachModeListeners() {
        this.modeCards.forEach(card => {
            card.addEventListener('click', (e) => {
                const mode = e.currentTarget.dataset.mode;
                this.selectMode(mode);
            });
        });

        if (this.backToMenuBtn) {
            this.backToMenuBtn.addEventListener('click', () => {
                this.backToModeSelector();
            });
        }

        // Listen for browser back/forward
        window.addEventListener('popstate', () => {
            this.loadFromURL();
        });
    }

    initializeNavigation() {
        // Mobile menu toggle
        if (this.navToggle) {
            this.navToggle.addEventListener('click', () => {
                this.navToggle.classList.toggle('active');
                this.navMenu.classList.toggle('active');
            });
        }

        // Home button
        if (this.navHome) {
            this.navHome.addEventListener('click', () => {
                this.backToModeSelector();
                this.closeMobileMenu();
            });
        }

        // Navigation links
        this.navLinks.forEach(link => {
            link.addEventListener('click', (e) => {
                const nav = e.currentTarget.dataset.nav;

                if (nav === 'home') {
                    e.preventDefault();
                    this.backToModeSelector();
                }

                this.closeMobileMenu();

                // Delay active link update to let hash change
                setTimeout(() => this.updateActiveNavLink(), 50);
            });
        });
    }

    closeMobileMenu() {
        if (this.navToggle) {
            this.navToggle.classList.remove('active');
            this.navMenu.classList.remove('active');
        }
    }

    updateActiveNavLink() {
        this.navLinks.forEach(link => link.classList.remove('active'));

        const hash = window.location.hash.slice(1);
        if (hash) {
            // Map Italian routes to nav data-nav values
            const navValue = hash; // Already in Italian (parola, caccia)
            const activeLink = document.querySelector(`.top-nav__link[data-nav="${navValue}"]`);
            if (activeLink) {
                activeLink.classList.add('active');
            }
        } else {
            const homeLink = document.querySelector('.top-nav__link[data-nav="home"]');
            if (homeLink) {
                homeLink.classList.add('active');
            }
        }
    }

    initializeURLState() {
        this.loadFromURL();
    }

    loadFromURL() {
        const hash = window.location.hash.slice(1);
        const params = new URLSearchParams(window.location.search);
        let mode = hash || params.get('mode');

        // Map Italian routes to internal modes
        if (mode === 'parola') {
            mode = 'wordle';
        } else if (mode === 'caccia') {
            mode = 'word-search';
        }

        if (mode === 'wordle' || mode === 'word-search') {
            this.selectMode(mode, false);
        } else {
            this.backToModeSelector(false);
        }
    }

    updateURL(mode) {
        if (mode) {
            // Use Italian routes in URL
            const italianRoute = mode === 'wordle' ? 'parola' : mode === 'word-search' ? 'caccia' : mode;
            window.history.pushState({ mode }, '', `#${italianRoute}`);
        } else {
            window.history.pushState({}, '', window.location.pathname);
        }
    }

    selectMode(mode, updateURL = true) {
        this.currentMode = mode;
        this.modeSelector.classList.add('cds-hidden');

        // Hide main header when in game mode
        const header = document.querySelector('.header');
        if (header) {
            header.classList.add('cds-hidden');
        }

        if (updateURL) {
            this.updateURL(mode);
        }

        this.updateActiveNavLink();

        if (mode === 'word-search') {
            this.showWordSearch();
        } else if (mode === 'wordle') {
            this.showWordle();
        }
    }

    showWordSearch() {
        if (!this.wordSearchGame) {
            this.wordSearchGame = new WordSearchGame();
        }

        // Try to load saved game state
        const hasRestoredState = this.wordSearchGame.loadGameState();

        // Only show controls, not the game board until user starts game (unless we restored state)
        document.querySelector('.controls').classList.remove('cds-hidden');
        if (!hasRestoredState) {
            document.querySelector('.game-stats').classList.add('cds-hidden');
            document.querySelector('.game-container').classList.add('cds-hidden');
        }

        const wordleContainer = document.getElementById('wordle-container');
        if (wordleContainer) {
            wordleContainer.classList.add('cds-hidden');
        }
    }

    showWordle() {
        if (!this.wordleUI) {
            this.wordleUI = new WordleUI();
        }

        document.querySelector('.controls').classList.add('cds-hidden');
        document.querySelector('.game-stats').classList.add('cds-hidden');
        document.querySelector('.game-container').classList.add('cds-hidden');

        this.wordleUI.show();
    }

    backToModeSelector(updateURL = true) {
        this.currentMode = null;
        this.modeSelector.classList.remove('cds-hidden');

        // Show main header when going back to mode selector
        const header = document.querySelector('.header');
        if (header) {
            header.classList.remove('cds-hidden');
        }

        if (updateURL) {
            this.updateURL(null);
        }

        this.updateActiveNavLink();

        document.querySelector('.controls').classList.add('cds-hidden');
        document.querySelector('.game-stats').classList.add('cds-hidden');
        document.querySelector('.game-container').classList.add('cds-hidden');

        if (this.wordleUI) {
            this.wordleUI.hide();
        }
    }
}

class WordSearchGame {
    constructor() {
        this.currentCategory = null;
        this.currentDifficulty = 'medium';
        this.gridData = null;
        this.words = [];
        this.score = 0;
        this.placedWords = [];

        this.initializeElements();
        this.attachEventListeners();
        this.loadCategories();
    }

    initializeElements() {
        this.categorySelect = document.getElementById('category');
        this.difficultyButtons = document.querySelectorAll('.difficulty-btn');
        this.newGameButton = document.getElementById('new-game-btn');
        this.gridContainer = document.getElementById('word-grid');
        this.wordList = document.getElementById('word-list');
        this.scoreDisplay = document.getElementById('score');
        this.foundCountDisplay = document.getElementById('found-count');
        this.definitionsModal = document.getElementById('definitions-modal');
        this.victoryModal = document.getElementById('victory-modal');
        this.modalClose = document.querySelector('#definitions-modal .modal-close');
        this.playAgainButton = document.getElementById('play-again-btn');
    }

    attachEventListeners() {
        this.categorySelect.addEventListener('change', (e) => {
            this.currentCategory = e.target.value;
        });

        this.difficultyButtons.forEach(btn => {
            btn.addEventListener('click', (e) => {
                this.difficultyButtons.forEach(b => b.classList.remove('active'));
                e.target.classList.add('active');
                this.currentDifficulty = e.target.dataset.difficulty;
            });
        });

        this.newGameButton.addEventListener('click', () => this.startNewGame());
        this.playAgainButton.addEventListener('click', () => {
            this.hideVictoryModal();
            this.startNewGame();
        });

        if (this.modalClose) {
            this.modalClose.addEventListener('click', () => this.hideDefinitionModal());
        }

        this.definitionsModal.addEventListener('click', (e) => {
            if (e.target.classList.contains('cds-modal__backdrop')) {
                this.hideDefinitionModal();
            }
        });
    }

    loadCategories() {
        const categoryNames = {
            animali: 'Animali',
            cibo: 'Cibo',
            colori: 'Colori',
            famiglia: 'Famiglia',
            corpo: 'Corpo',
            verbi: 'Verbi',
            aggettivi: 'Aggettivi',
            tempo: 'Tempo',
            vestiti: 'Vestiti',
            professioni: 'Professioni',
            trasporti: 'Trasporti',
            casa: 'Casa',
            sport: 'Sport',
            musica: 'Musica',
            tecnologia: 'Tecnologia',
            emozioni: 'Emozioni',
            tempo_cronologico: 'Tempo (Ore)',
            numeri: 'Numeri',
            citta: 'Città',
            natura: 'Natura',
            scuola: 'Scuola',
            hobby: 'Hobby',
            cucina_oggetti: 'Cucina (Oggetti)',
            viaggio: 'Viaggio'
        };

        categories.forEach(cat => {
            const option = document.createElement('option');
            option.value = cat;
            option.textContent = categoryNames[cat] || cat;
            this.categorySelect.appendChild(option);
        });
    }

    startNewGame() {
        if (!this.currentCategory || !this.currentDifficulty) {
            alert('Seleziona una categoria e una difficoltà!');
            return;
        }

        this.resetGame();

        // Get words for selected category
        const categoryWords = wordDatabase[this.currentCategory];
        if (!categoryWords || categoryWords.length === 0) {
            alert('Nessuna parola disponibile per questa categoria!');
            return;
        }

        // Generate grid with word placement
        const wordStrings = categoryWords.map(w => w.word);
        this.gridData = generateGrid(wordStrings, this.currentDifficulty);

        // Map placed words to full word data
        this.words = this.gridData.placedWords.map(placed => {
            const wordData = categoryWords.find(w => w.word.toUpperCase() === placed.word);
            return {
                ...wordData,
                word: placed.word,
                placement: placed,
                points: placed.word.length * 10
            };
        });

        this.renderGrid();
        this.renderWordList();
        this.initializeSelector();

        // Show game board and stats after successful game generation
        document.querySelector('.game-stats').classList.remove('cds-hidden');
        document.querySelector('.game-container').classList.remove('cds-hidden');

        // Update URL with game params
        this.updateGameURL();

        // Save game state to localStorage
        this.saveGameState();
    }

    resetGame() {
        this.score = 0;
        this.placedWords = [];
        this.updateScore();
        this.updateFoundCount();

        if (this.gridContainer.querySelector('[data-row]')) {
            resetSelector();
        }

        // Clear old game state when starting new game
        this.clearGameState();
    }

    renderGrid() {
        const { grid, size } = this.gridData;

        // Set grid layout
        // Set grid layout - Responsive use 1fr
        this.gridContainer.style.gridTemplateColumns = `repeat(${size}, 1fr)`;
        // Rows can auto-size or also match 1fr to keep square aspect ratio
        this.gridContainer.style.gridTemplateRows = `repeat(${size}, 1fr)`;
        this.gridContainer.innerHTML = '';

        grid.forEach((row, rowIndex) => {
            row.forEach((letter, colIndex) => {
                const cellElement = document.createElement('div');
                cellElement.className = 'grid-cell';
                cellElement.textContent = letter;
                cellElement.dataset.row = rowIndex;
                cellElement.dataset.col = colIndex;
                cellElement.dataset.letter = letter;
                this.gridContainer.appendChild(cellElement);
            });
        });
    }

    renderWordList() {
        this.wordList.innerHTML = '';

        this.words.forEach((wordData, index) => {
            const li = document.createElement('li');
            li.className = 'word-item';
            li.dataset.wordIndex = index;
            li.dataset.word = wordData.word;

            const wordSpan = document.createElement('span');
            wordSpan.className = 'word-text';
            wordSpan.textContent = wordData.word;

            const pointsSpan = document.createElement('span');
            pointsSpan.className = 'word-points';
            pointsSpan.textContent = `${wordData.points} pts`;

            li.appendChild(wordSpan);
            li.appendChild(pointsSpan);

            li.addEventListener('click', () => this.showDefinition(wordData));

            this.wordList.appendChild(li);
        });

        this.updateFoundCount();
    }

    initializeSelector() {
        const wordsForSelector = this.words.map(w => ({
            word: w.word,
            definition: w.definition
        }));

        initSelector(
            this.gridContainer,
            wordsForSelector,
            (word, definition, cells) => this.onWordFound(word, definition, cells),
            (row, col, letter, isFound, foundWord) => this.onCellClick(row, col, letter, isFound, foundWord)
        );
    }

    onWordFound(word, definition, cells) {
        const wordData = this.words.find(w => w.word === word);
        if (!wordData) return;

        this.score += wordData.points;
        this.updateScore();

        // Speak the word in Italian
        this.speakWord(word);

        // Mark word in list as found
        const wordItem = this.wordList.querySelector(`[data-word="${word}"]`);
        if (wordItem) {
            wordItem.classList.add('found');
        }

        this.updateFoundCount();

        // Save game state after finding a word
        this.saveGameState();

        // Check if all words found
        if (isComplete()) {
            setTimeout(() => this.showVictoryModal(), 500);
        }
    }

    speakWord(word) {
        if ('speechSynthesis' in window) {
            const utterance = new SpeechSynthesisUtterance(word);
            utterance.lang = 'it-IT';
            utterance.rate = 0.9;
            window.speechSynthesis.speak(utterance);
        }
    }

    onCellClick(row, col, letter, isFound, foundWord) {
        if (isFound && foundWord) {
            const wordData = this.words.find(w => w.word === foundWord.word);
            if (wordData) {
                this.showDefinition(wordData);
            }
        }
    }

    updateScore() {
        this.scoreDisplay.textContent = this.score;
    }

    updateFoundCount() {
        const found = getFoundWords().length;
        this.foundCountDisplay.textContent = `${found}/${this.words.length}`;
    }

    showDefinition(wordData) {
        const modalWord = document.getElementById('modal-word');
        const modalDefinition = document.getElementById('modal-definition');

        modalWord.textContent = `${wordData.word} (${wordData.translation})`;
        modalDefinition.textContent = wordData.definition;
        this.definitionsModal.classList.remove('cds-hidden');
        setTimeout(() => this.definitionsModal.classList.add('cds-modal--open'), 10);
    }

    hideDefinitionModal() {
        this.definitionsModal.classList.remove('cds-modal--open');
        setTimeout(() => this.definitionsModal.classList.add('cds-hidden'), 200);
    }

    showVictoryModal() {
        document.getElementById('final-score').textContent = this.score;
        this.victoryModal.classList.remove('cds-hidden');
        setTimeout(() => this.victoryModal.classList.add('cds-modal--open'), 10);

        // Clear game state on victory
        this.clearGameState();
    }

    hideVictoryModal() {
        this.victoryModal.classList.remove('cds-modal--open');
        setTimeout(() => this.victoryModal.classList.add('cds-hidden'), 200);
    }

    updateGameURL() {
        const params = new URLSearchParams();
        params.set('categoria', this.currentCategory);
        params.set('difficolta', this.currentDifficulty);

        const hash = window.location.hash.split('?')[0];
        window.history.replaceState(null, '', `${hash}?${params.toString()}`);
    }

    saveGameState() {
        const state = {
            category: this.currentCategory,
            difficulty: this.currentDifficulty,
            gridData: this.gridData,
            words: this.words,
            score: this.score,
            foundWords: getFoundWords(),
            timestamp: Date.now()
        };
        localStorage.setItem('wordSearchGameState', JSON.stringify(state));
    }

    loadGameState() {
        try {
            const saved = localStorage.getItem('wordSearchGameState');
            if (!saved) return false;

            const state = JSON.parse(saved);

            // Check if state is less than 24 hours old
            if (Date.now() - state.timestamp > 24 * 60 * 60 * 1000) {
                localStorage.removeItem('wordSearchGameState');
                return false;
            }

            // Restore state
            this.currentCategory = state.category;
            this.currentDifficulty = state.difficulty;
            this.gridData = state.gridData;
            this.words = state.words;
            this.score = state.score;

            // Update UI
            this.categorySelect.value = state.category;
            this.difficultyButtons.forEach(btn => {
                btn.classList.toggle('active', btn.dataset.difficulty === state.difficulty);
            });

            // Render grid and word list
            this.renderGrid();
            this.renderWordList();
            this.initializeSelector();

            // Restore found words
            if (state.foundWords && state.foundWords.length > 0) {
                state.foundWords.forEach(foundWord => {
                    const cells = [];
                    for (let i = 0; i < foundWord.word.length; i++) {
                        const row = foundWord.row + (foundWord.direction.row * i);
                        const col = foundWord.col + (foundWord.direction.col * i);
                        const cell = document.querySelector(`[data-row="${row}"][data-col="${col}"]`);
                        if (cell) {
                            cell.classList.add('found');
                            cells.push(cell);
                        }
                    }
                });
            }

            this.updateScore();
            this.updateFoundCount();

            // Show game board and stats
            document.querySelector('.game-stats').classList.remove('cds-hidden');
            document.querySelector('.game-container').classList.remove('cds-hidden');

            return true;
        } catch (error) {
            console.error('Failed to load game state:', error);
            localStorage.removeItem('wordSearchGameState');
            return false;
        }
    }

    clearGameState() {
        localStorage.removeItem('wordSearchGameState');
    }
}

document.addEventListener('DOMContentLoaded', () => {
    new GameManager();
});
