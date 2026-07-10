import { validWords } from '../wordle-valid-words.js';
import { writeFileSync } from 'fs';

// Convert Set to Array
const allWords = Array.from(validWords);

// Filter criteria to get better quality words:
// 1. Skip verb conjugations ending in common patterns
// 2. Prefer words that seem more common (heuristic based)
// 3. Skip overly similar words

const skipPatterns = [
  /SSI$/,   // verb conjugations like AMASSI
  /SSERO$/, // verb conjugations like AMASSERO
  /SSIMO$/, // verb conjugations like AMASSIMO
  /REBBE$/, // conditional forms
  /REMMO$/, // conditional forms
  /RESTE$/, // conditional forms
  /RESTI$/, // conditional forms
  /ERETE$/, // future forms
  /EREMO$/, // future forms
  /ERANNO$/, // future forms (won't match 5 letters but safe)
  /AVAMO$/, // imperfect forms
  /AVANO$/, // imperfect forms
  /AVATE$/, // imperfect forms
  /ARONO$/, // past forms
  /ATORE$/, // too many agent nouns
  /ATRIC$/, // too many agent nouns
];

function shouldSkip(word) {
  // Skip if matches any of our skip patterns
  return skipPatterns.some(pattern => pattern.test(word));
}

function scorWord(word) {
  let score = 0;

  // Prefer words with common vowels and consonants
  const vowels = (word.match(/[AEIOU]/g) || []).length;
  const consonants = 5 - vowels;

  // Good balance is 2-3 vowels
  if (vowels >= 2 && vowels <= 3) score += 2;

  // Penalize words with repeated letters (usually conjugations)
  const uniqueLetters = new Set(word.split('')).size;
  if (uniqueLetters === 5) score += 3;
  if (uniqueLetters === 4) score += 1;

  // Prefer words ending in common noun/adjective endings
  if (/[OA]$/.test(word)) score += 1;
  if (/[EI]$/.test(word)) score += 1;

  // Penalize words with double letters (often conjugations)
  if (/(.)\1/.test(word)) score -= 1;

  return score;
}

// Filter and score words
const filteredWords = allWords
  .filter(word => !shouldSkip(word))
  .map(word => ({ word, score: scorWord(word) }))
  .sort((a, b) => b.score - a.score)
  .slice(0, 2000) // Take top 2000
  .map(({ word }) => word);

console.log(`Filtered ${allWords.length} words down to ${filteredWords.length}`);
console.log('Sample words:', filteredWords.slice(0, 20).join(', '));

// Format as JavaScript array with word objects
const wordObjects = filteredWords.map(word =>
  `  { word: '${word}', translation: '', definition: '' }`
);

const output = `export const wordleWords = [
${wordObjects.join(',\n')}
];
`;

// Write to a new file
writeFileSync('scripts/filtered-wordle-words.js', output);

console.log('\nWritten to scripts/filtered-wordle-words.js');
console.log('Preview:');
console.log(output.substring(0, 500));
