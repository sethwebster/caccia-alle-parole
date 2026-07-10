/**
 * Word selection and validation module
 * Fixes: Memory leaks, proper event cleanup, robust selection
 */

class WordSelector {
  constructor() {
    this.isSelecting = false;
    this.startCell = null;
    this.currentCell = null;
    this.selectedCells = [];
    this.foundCells = new Set();
    this.words = [];
    this.foundWords = new Map();
    this.gridElement = null;
    this.onWordFound = null;
    this.onCellClick = null;

    // Bound handlers for proper removal
    this.handlers = {
      mousedown: null,
      mousemove: null,
      mouseup: null,
      touchstart: null,
      touchmove: null,
      touchend: null,
      click: null
    };
  }

  init(gridElement, words, onWordFound, onCellClick) {
    // Clean up old listeners if reinitializing
    this.cleanup();

    this.gridElement = gridElement;
    this.words = words.map(w =>
      typeof w === 'string'
        ? { word: w.toUpperCase(), definition: '' }
        : { ...w, word: w.word.toUpperCase() }
    );
    this.onWordFound = onWordFound;
    this.onCellClick = onCellClick;

    // Reset state
    this.isSelecting = false;
    this.startCell = null;
    this.currentCell = null;
    this.selectedCells = [];
    this.foundCells.clear();
    this.foundWords.clear();

    this.attachListeners();
  }

  attachListeners() {
    if (!this.gridElement) return;

    // Bind handlers with this context
    this.handlers.mousedown = this.handleMouseDown.bind(this);
    this.handlers.mousemove = this.handleMouseMove.bind(this);
    this.handlers.mouseup = this.handleMouseUp.bind(this);
    this.handlers.touchstart = this.handleTouchStart.bind(this);
    this.handlers.touchmove = this.handleTouchMove.bind(this);
    this.handlers.touchend = this.handleTouchEnd.bind(this);
    this.handlers.click = this.handleClick.bind(this);

    // Attach listeners
    this.gridElement.addEventListener('mousedown', this.handlers.mousedown);
    this.gridElement.addEventListener('mousemove', this.handlers.mousemove);
    document.addEventListener('mouseup', this.handlers.mouseup);
    this.gridElement.addEventListener('touchstart', this.handlers.touchstart, { passive: false });
    this.gridElement.addEventListener('touchmove', this.handlers.touchmove, { passive: false });
    this.gridElement.addEventListener('touchend', this.handlers.touchend);
    this.gridElement.addEventListener('click', this.handlers.click);
  }

  cleanup() {
    if (!this.gridElement || !this.handlers.mousedown) return;

    this.gridElement.removeEventListener('mousedown', this.handlers.mousedown);
    this.gridElement.removeEventListener('mousemove', this.handlers.mousemove);
    document.removeEventListener('mouseup', this.handlers.mouseup);
    this.gridElement.removeEventListener('touchstart', this.handlers.touchstart);
    this.gridElement.removeEventListener('touchmove', this.handlers.touchmove);
    this.gridElement.removeEventListener('touchend', this.handlers.touchend);
    this.gridElement.removeEventListener('click', this.handlers.click);
  }

  getCellFromEvent(e) {
    const target = e.target.closest('[data-row]');
    if (!target) return null;

    return {
      row: parseInt(target.dataset.row, 10),
      col: parseInt(target.dataset.col, 10),
      letter: target.dataset.letter,
      element: target
    };
  }

  handleMouseDown(e) {
    if (e.button !== 0) return;

    const cell = this.getCellFromEvent(e);
    if (!cell) return;

    // Allow dragging through found cells (for intersecting words)
    e.preventDefault();
    this.isSelecting = true;
    this.startCell = cell;
    this.currentCell = cell;
    this.selectedCells = [cell];
    this.updateDisplay();
  }

  handleMouseMove(e) {
    if (!this.isSelecting) return;

    const cell = this.getCellFromEvent(e);
    if (!cell) return;

    if (cell.row === this.currentCell?.row && cell.col === this.currentCell?.col) return;

    this.currentCell = cell;
    this.updateSelection();
  }

  handleMouseUp(e) {
    if (!this.isSelecting) return;

    this.isSelecting = false;
    this.validateSelection();
  }

  handleTouchStart(e) {
    e.preventDefault();
    const touch = e.touches[0];
    const element = document.elementFromPoint(touch.clientX, touch.clientY);
    const cell = element?.closest('[data-row]');

    if (!cell) return;

    const cellData = {
      row: parseInt(cell.dataset.row, 10),
      col: parseInt(cell.dataset.col, 10),
      letter: cell.dataset.letter,
      element: cell
    };

    // Allow dragging through found cells (for intersecting words)
    this.isSelecting = true;
    this.startCell = cellData;
    this.currentCell = cellData;
    this.selectedCells = [cellData];
    this.updateDisplay();
  }

  handleTouchMove(e) {
    if (!this.isSelecting) return;

    e.preventDefault();
    const touch = e.touches[0];
    const element = document.elementFromPoint(touch.clientX, touch.clientY);
    const cell = element?.closest('[data-row]');

    if (!cell) return;

    const cellData = {
      row: parseInt(cell.dataset.row, 10),
      col: parseInt(cell.dataset.col, 10),
      letter: cell.dataset.letter,
      element: cell
    };

    if (cellData.row === this.currentCell?.row && cellData.col === this.currentCell?.col) return;

    this.currentCell = cellData;
    this.updateSelection();
  }

  handleTouchEnd(e) {
    if (!this.isSelecting) return;

    e.preventDefault();
    this.isSelecting = false;
    this.validateSelection();
  }

  handleClick(e) {
    const cell = this.getCellFromEvent(e);
    if (!cell) return;

    const cellKey = `${cell.row}-${cell.col}`;
    if (this.foundCells.has(cellKey) && this.onCellClick) {
      const foundWord = this.findWordForCell(cellKey);
      if (foundWord) {
        this.onCellClick(cell.row, cell.col, cell.letter, true, foundWord);
      }
    }
  }

  updateSelection() {
    if (!this.startCell || !this.currentCell) return;

    const cells = this.getCellsInLine(this.startCell, this.currentCell);
    this.selectedCells = cells;
    this.updateDisplay();
  }

  getCellsInLine(start, end) {
    const dr = end.row - start.row;
    const dc = end.col - start.col;

    if (dr === 0 && dc === 0) return [start];

    const absDr = Math.abs(dr);
    const absDc = Math.abs(dc);

    // Must be horizontal, vertical, or diagonal
    if (absDr !== 0 && absDc !== 0 && absDr !== absDc) {
      return [start];
    }

    const stepR = dr === 0 ? 0 : dr > 0 ? 1 : -1;
    const stepC = dc === 0 ? 0 : dc > 0 ? 1 : -1;
    const steps = Math.max(absDr, absDc);

    const cells = [];
    for (let i = 0; i <= steps; i++) {
      const row = start.row + i * stepR;
      const col = start.col + i * stepC;
      const element = this.gridElement.querySelector(`[data-row="${row}"][data-col="${col}"]`);

      if (element) {
        cells.push({
          row,
          col,
          letter: element.dataset.letter,
          element
        });
      }
    }

    return cells;
  }

  updateDisplay() {
    // Clear previous selection
    this.gridElement.querySelectorAll('.selected').forEach(el => {
      el.classList.remove('selected');
    });

    // Highlight selected cells
    this.selectedCells.forEach(cell => {
      cell.element.classList.add('selected');
    });
  }

  validateSelection() {
    if (this.selectedCells.length < 2) {
      this.clearSelection();
      return;
    }

    const word = this.selectedCells.map(c => c.letter).join('');
    const wordReverse = word.split('').reverse().join('');

    // Check forward and backward
    const foundWord = this.words.find(w =>
      (w.word === word || w.word === wordReverse) && !this.foundWords.has(w.word)
    );

    if (foundWord) {
      this.markWordFound(foundWord);
    } else {
      this.clearSelection();
    }
  }

  markWordFound(wordData) {
    // Mark cells as found (allowing intersections)
    this.selectedCells.forEach(cell => {
      const key = `${cell.row}-${cell.col}`;
      this.foundCells.add(key);
      cell.element.classList.remove('selected');
      // Only add 'found' class if not already found (preserve found state)
      if (!cell.element.classList.contains('found')) {
        cell.element.classList.add('found');
      }
    });

    this.foundWords.set(wordData.word, {
      cells: this.selectedCells.map(c => ({ row: c.row, col: c.col })),
      direction: this.getDirection(this.selectedCells)
    });

    if (this.onWordFound) {
      this.onWordFound(wordData.word, wordData.definition, this.selectedCells);
    }

    this.selectedCells = [];
  }

  clearSelection() {
    this.selectedCells.forEach(cell => {
      cell.element.classList.remove('selected');
    });
    this.selectedCells = [];
  }

  getDirection(cells) {
    if (cells.length < 2) return 'none';

    const dr = cells[1].row - cells[0].row;
    const dc = cells[1].col - cells[0].col;

    const directions = {
      '0,1': 'E', '0,-1': 'W',
      '1,0': 'S', '-1,0': 'N',
      '1,1': 'SE', '-1,-1': 'NW',
      '1,-1': 'SW', '-1,1': 'NE'
    };

    return directions[`${dr},${dc}`] || 'unknown';
  }

  findWordForCell(cellKey) {
    for (const [word, data] of this.foundWords) {
      if (data.cells.some(c => `${c.row}-${c.col}` === cellKey)) {
        const wordObj = this.words.find(w => w.word === word);
        return {
          word,
          definition: wordObj?.definition || '',
          cells: data.cells,
          direction: data.direction
        };
      }
    }
    return null;
  }

  getFoundWords() {
    return Array.from(this.foundWords.keys());
  }

  isComplete() {
    return this.foundWords.size === this.words.length;
  }

  reset() {
    this.isSelecting = false;
    this.startCell = null;
    this.currentCell = null;
    this.selectedCells = [];
    this.foundCells.clear();
    this.foundWords.clear();

    if (this.gridElement) {
      this.gridElement.querySelectorAll('.selected, .found').forEach(el => {
        el.classList.remove('selected', 'found');
      });
    }
  }
}

// Export singleton instance
const selectorInstance = new WordSelector();

export function initSelector(gridElement, words, onWordFound, onCellClick) {
  selectorInstance.init(gridElement, words, onWordFound, onCellClick);
}

export function resetSelector() {
  selectorInstance.reset();
}

export function getFoundWords() {
  return selectorInstance.getFoundWords();
}

export function isComplete() {
  return selectorInstance.isComplete();
}

export function cleanupSelector() {
  selectorInstance.cleanup();
}
