/**
 * Word search grid generator
 * Supports 3 difficulty levels with Italian letter frequency
 */

const DIFFICULTIES = {
  easy: { size: 8, wordCount: 8 },
  medium: { size: 12, wordCount: 10 },
  hard: { size: 16, wordCount: 12 }
};

// Italian letter frequency (approximate distribution)
const ITALIAN_LETTERS = 'AAAAAAAAEEEEEEEEEEIIIIIIIIOOOOOOONNNNNNRRRRRLLLLTTTSSSCCCDDDUUUMMPPGGFFVVBHZQY';

const DIRECTIONS = [
  { dx: 1, dy: 0, name: 'horizontal' },      // →
  { dx: -1, dy: 0, name: 'horizontal-rev' }, // ←
  { dx: 0, dy: 1, name: 'vertical' },        // ↓
  { dx: 0, dy: -1, name: 'vertical-rev' },   // ↑
  { dx: 1, dy: 1, name: 'diagonal-se' },     // ↘
  { dx: -1, dy: -1, name: 'diagonal-nw' },   // ↖
  { dx: 1, dy: -1, name: 'diagonal-ne' },    // ↗
  { dx: -1, dy: 1, name: 'diagonal-sw' }     // ↙
];

/**
 * Create empty grid
 */
function createEmptyGrid(size) {
  return Array(size).fill(null).map(() => Array(size).fill(null));
}

/**
 * Check if word fits at position in given direction
 */
function canPlaceWord(grid, word, row, col, direction) {
  const { dx, dy } = direction;
  const size = grid.length;

  for (let i = 0; i < word.length; i++) {
    const newRow = row + (dy * i);
    const newCol = col + (dx * i);

    // Out of bounds
    if (newRow < 0 || newRow >= size || newCol < 0 || newCol >= size) {
      return false;
    }

    const cell = grid[newRow][newCol];

    // Collision: cell occupied by different letter
    if (cell !== null && cell !== word[i]) {
      return false;
    }
  }

  return true;
}

/**
 * Place word on grid
 */
function placeWord(grid, word, row, col, direction) {
  const { dx, dy } = direction;

  for (let i = 0; i < word.length; i++) {
    const newRow = row + (dy * i);
    const newCol = col + (dx * i);
    grid[newRow][newCol] = word[i];
  }
}

/**
 * Attempt to place a single word with retries
 */
function attemptPlaceWord(grid, word, maxAttempts = 100) {
  const size = grid.length;

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const direction = DIRECTIONS[Math.floor(Math.random() * DIRECTIONS.length)];
    const row = Math.floor(Math.random() * size);
    const col = Math.floor(Math.random() * size);

    if (canPlaceWord(grid, word, row, col, direction)) {
      placeWord(grid, word, row, col, direction);
      return {
        word,
        row,
        col,
        direction: direction.name,
        dx: direction.dx,
        dy: direction.dy
      };
    }
  }

  return null;
}

/**
 * Fill empty cells with random Italian letters
 */
function fillEmptyCells(grid) {
  const size = grid.length;

  for (let row = 0; row < size; row++) {
    for (let col = 0; col < size; col++) {
      if (grid[row][col] === null) {
        grid[row][col] = ITALIAN_LETTERS[Math.floor(Math.random() * ITALIAN_LETTERS.length)];
      }
    }
  }
}

/**
 * Validate and prepare words
 */
function prepareWords(words, difficulty) {
  const config = DIFFICULTIES[difficulty];
  if (!config) {
    throw new Error(`Invalid difficulty: ${difficulty}. Must be easy, medium, or hard.`);
  }

  const normalized = words
    .map(w => w.toUpperCase().trim())
    .filter(w => w.length > 0 && w.length <= config.size);

  if (normalized.length === 0) {
    throw new Error('No valid words provided');
  }

  // Shuffle and take required count
  const shuffled = [...normalized].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, Math.min(config.wordCount, shuffled.length));
}

/**
 * Generate word search grid
 *
 * @param {string[]} words - Array of words to place
 * @param {string} difficulty - 'easy', 'medium', or 'hard'
 * @param {number} maxRetries - Maximum retries (internal use)
 * @returns {Object} { grid, placedWords, size, difficulty }
 */
export function generateGrid(words, difficulty = 'medium', maxRetries = 10) {
  const config = DIFFICULTIES[difficulty];
  if (!config) {
    throw new Error(`Invalid difficulty: ${difficulty}. Must be easy, medium, or hard.`);
  }

  const selectedWords = prepareWords(words, difficulty);
  const grid = createEmptyGrid(config.size);
  const placedWords = [];
  const failedWords = [];

  // Sort words by length (longest first) for better placement
  selectedWords.sort((a, b) => b.length - a.length);

  // Place words
  for (const word of selectedWords) {
    if (word.length > config.size) {
      failedWords.push(word);
      continue;
    }

    const placement = attemptPlaceWord(grid, word);

    if (placement) {
      placedWords.push(placement);
    } else {
      failedWords.push(word);
    }
  }

  // Ensure minimum words placed
  const minWords = Math.min(5, selectedWords.length);
  if (placedWords.length < minWords) {
    // Retry with fresh grid if too few words placed (up to maxRetries times)
    if (maxRetries > 0) {
      return generateGrid(words, difficulty, maxRetries - 1);
    }
    // If out of retries, return what we have
    console.warn(`Could only place ${placedWords.length}/${minWords} words after maximum retries`);
  }

  // Fill remaining cells
  fillEmptyCells(grid);

  return {
    grid,
    placedWords,
    size: config.size,
    difficulty,
    failedWords: failedWords.length > 0 ? failedWords : undefined
  };
}

/**
 * Get difficulty configuration
 */
export function getDifficultyConfig(difficulty) {
  return DIFFICULTIES[difficulty];
}

/**
 * Validate a word position in grid
 */
export function validateWordPosition(grid, wordInfo) {
  const { word, row, col, dx, dy } = wordInfo;

  for (let i = 0; i < word.length; i++) {
    const checkRow = row + (dy * i);
    const checkCol = col + (dx * i);

    if (grid[checkRow][checkCol] !== word[i]) {
      return false;
    }
  }

  return true;
}

export default generateGrid;
