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
    }

    initializeElements() {
        this.modeSelector = document.getElementById('mode-selector');
        this.modeCards = document.querySelectorAll('.mode-card');
        this.backToMenuBtn = document.getElementById('back-to-menu');
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
    }

    selectMode(mode) {
        this.currentMode = mode;
        this.modeSelector.classList.add('hidden');

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

        document.querySelector('.controls').classList.remove('hidden');
        document.querySelector('.game-stats').classList.remove('hidden');
        document.querySelector('.game-container').classList.remove('hidden');

        const wordleContainer = document.getElementById('wordle-container');
        if (wordleContainer) {
            wordleContainer.classList.add('hidden');
        }
    }

    showWordle() {
        if (!this.wordleUI) {
            this.wordleUI = new WordleUI();
        }

        document.querySelector('.controls').classList.add('hidden');
        document.querySelector('.game-stats').classList.add('hidden');
        document.querySelector('.game-container').classList.add('hidden');

        this.wordleUI.show();
    }

    backToModeSelector() {
        this.currentMode = null;
        this.modeSelector.classList.remove('hidden');

        document.querySelector('.controls').classList.add('hidden');
        document.querySelector('.game-stats').classList.add('hidden');
        document.querySelector('.game-container').classList.add('hidden');

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
            if (e.target === this.definitionsModal) {
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
    }

    resetGame() {
        this.score = 0;
        this.placedWords = [];
        this.updateScore();
        this.updateFoundCount();

        if (this.gridContainer.querySelector('[data-row]')) {
            resetSelector();
        }
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
        this.definitionsModal.classList.remove('hidden');
    }

    hideDefinitionModal() {
        this.definitionsModal.classList.add('hidden');
    }

    showVictoryModal() {
        document.getElementById('final-score').textContent = this.score;
        this.victoryModal.classList.remove('hidden');
    }

    hideVictoryModal() {
        this.victoryModal.classList.add('hidden');
    }
}

document.addEventListener('DOMContentLoaded', () => {
    new GameManager();
});
