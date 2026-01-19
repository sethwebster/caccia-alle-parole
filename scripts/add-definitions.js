import { readFileSync, writeFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const wordsFile = join(__dirname, '..', 'wordle-data.js');

// Configuration
const BATCH_SIZE = 50; // Process 50 words at a time
const DELAY_MS = 2000; // Delay between batches to avoid rate limits

// Read current state of words
function loadWords() {
  const content = readFileSync(wordsFile, 'utf-8');
  const match = content.match(/export const wordleWords = (\[[\s\S]*?\n\]);/);
  if (!match) throw new Error('Could not parse words file');

  // Use Function constructor to safely evaluate the array
  const words = new Function(`return ${match[1]}`)();
  return words;
}

// Save words back to file
function saveWords(words) {
  const content = readFileSync(wordsFile, 'utf-8');

  // Extract the import statement and functions
  const importMatch = content.match(/^import[\s\S]*?;/m);
  const functionsMatch = content.match(/\n\nexport function[\s\S]*$/);

  const importStatement = importMatch ? importMatch[0] + '\n\n' : '';
  const functions = functionsMatch ? functionsMatch[0] : '';

  const newContent = `${importStatement}export const wordleWords = ${JSON.stringify(words, null, 2)};${functions}
`;
  writeFileSync(wordsFile, newContent, 'utf-8');
}

// Get translations and definitions for multiple words in one API call
async function getDefinitions(words, retries = 3) {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const wordList = words.map(w => w.word).join(', ');
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: 'gpt-3.5-turbo',
          messages: [{
            role: 'user',
            content: `For each Italian 5-letter word below, provide a concise English translation (1-3 words) and brief definition (max 10 words).

Words: ${wordList}

Return ONLY valid JSON in this exact format:
{
  "words": [
    {"word": "WORD1", "translation": "...", "definition": "..."},
    {"word": "WORD2", "translation": "...", "definition": "..."}
  ]
}`
          }],
          response_format: { type: "json_object" },
          temperature: 0.3
        })
      });

      if (!response.ok) {
        const error = await response.text();
        throw new Error(`OpenAI API error: ${response.status} ${error}`);
      }

      const data = await response.json();
      const content = data.choices[0].message.content;
      const result = JSON.parse(content);

      // Handle both array and object with array property
      const definitions = Array.isArray(result) ? result : result.words || result.definitions || result.results || [];

      if (definitions.length === 0) {
        console.error('API returned empty definitions array. Response:', content.substring(0, 200));
        throw new Error('Empty definitions returned');
      }

      return definitions;
    } catch (error) {
      if (attempt === retries) throw error;
      console.log(`  Retry ${attempt}/${retries}...`);
      await new Promise(resolve => setTimeout(resolve, 2000 * attempt));
    }
  }
}

// Main processing function
async function processWords() {
  console.log('Loading words...');
  const words = loadWords();

  // Find words without definitions
  const needsDefinition = words.filter(w => !w.translation || !w.definition);
  const totalNeeded = needsDefinition.length;

  if (totalNeeded === 0) {
    console.log('All words already have definitions!');
    return;
  }

  console.log(`Found ${totalNeeded} words needing definitions`);
  console.log(`Processing in batches of ${BATCH_SIZE}`);

  let processed = 0;
  const startTime = Date.now();

  // Process in batches
  for (let i = 0; i < needsDefinition.length; i += BATCH_SIZE) {
    const batch = needsDefinition.slice(i, i + BATCH_SIZE);
    console.log(`\nProcessing batch ${Math.floor(i / BATCH_SIZE) + 1} (${batch.length} words)...`);

    try {
      const definitions = await getDefinitions(batch);
      console.log(`Received ${definitions.length} definitions`);

      // Update words with definitions
      for (const def of definitions) {
        const index = words.findIndex(w => w.word === def.word);
        if (index !== -1) {
          words[index].translation = def.translation;
          words[index].definition = def.definition;

          processed++;

          // Calculate progress and ETA
          const percent = ((processed / totalNeeded) * 100).toFixed(1);
          const elapsed = Date.now() - startTime;
          const avgTimePerWord = elapsed / processed;
          const remaining = totalNeeded - processed;
          const etaMs = remaining * avgTimePerWord;
          const etaMin = Math.round(etaMs / 60000);

          console.log(`[${processed}/${totalNeeded}] ${percent}% | ${def.word} → ${def.translation} | ETA: ${etaMin}m`);
        }
      }

      // Save after each batch
      console.log(`Saving progress... (${processed}/${totalNeeded})`);
      saveWords(words);

      // Delay to avoid rate limits
      if (i + BATCH_SIZE < needsDefinition.length) {
        console.log(`Waiting ${DELAY_MS}ms before next batch...`);
        await new Promise(resolve => setTimeout(resolve, DELAY_MS));
      }

    } catch (error) {
      console.error(`Error processing batch:`, error.message);
      // Save progress even on error
      saveWords(words);
      throw error; // Stop on error, can restart
    }
  }

  // Final save
  console.log('Saving final results...');
  saveWords(words);
  console.log(`Complete! Processed ${processed} words.`);
}

// Run
processWords().catch(error => {
  console.error('Script failed:', error.message);
  console.error('Progress has been saved. You can restart the script to continue.');
  process.exit(1);
});
