# Caccia alle Parole - Italian Word Search Game

An educational Italian word search puzzle game with 24 categories, 3 difficulty levels, and Italian word definitions.

## Features

- **24 Categories**: Animals, Food, Colors, Family, Body, Verbs, Adjectives, Weather, Clothing, Professions, Transportation, Home, Sports, Music, Technology, Emotions, Time, Numbers, City, Nature, School, Hobbies, Kitchen, Travel
- **3 Difficulty Levels**:
  - Easy: 8×8 grid, 8 words
  - Medium: 12×12 grid, 10 words
  - Hard: 16×16 grid, 12 words
- **8 Directions**: Words placed horizontally, vertically, and diagonally (forward and backward)
- **Word Definitions**: Click any word to see Italian-English translation and definition
- **Scoring System**: Points based on word length (10 pts per letter)
- **Timer**: Track how long it takes to complete each puzzle
- **Victory Screen**: Final score and time display
- **Mobile-Friendly**: Touch and drag support for mobile devices
- **Italian-Themed Design**: Red, white, and green color scheme

## How to Play

1. Select a category from the dropdown
2. Choose a difficulty level
3. Click "Nuova Partita" to start
4. Find words by clicking and dragging across letters
5. Words can go in any direction (including backward and diagonal)
6. Click found words to see their definitions
7. Complete all words to win!

## Running the Game

### Option 1: Local Web Server (Recommended)

```bash
python3 -m http.server 8080
```

Then open http://localhost:8080 in your browser.

### Option 2: Any HTTP Server

```bash
# Node.js
npx serve

# Python 2
python -m SimpleHTTPServer 8080

# PHP
php -S localhost:8080
```

## File Structure

```
caccia-alle-parole/
├── index.html           # Main HTML structure
├── styles.css           # Italian-themed styling
├── game.js              # Main game orchestrator
├── word-data.js         # 24 categories with 400+ Italian words
├── grid-generator.js    # Word placement algorithm
├── word-selector.js     # Selection and validation logic
└── README.md            # This file
```

## Architecture

### word-data.js
Exports 24 categories of Italian words with:
- Italian word
- English translation
- Educational definition

### grid-generator.js
Generates word search grids:
- Places words in 8 directions
- Uses Italian letter frequency for filler letters
- Prevents word collisions
- Retries if too few words fit

### word-selector.js
Handles word selection:
- Mouse drag and touch support
- Validates 8-directional lines
- Checks forward and backward
- Marks found words

### game.js
Main orchestrator:
- Integrates all modules
- Manages game state
- Renders UI
- Handles scoring and timer

## Browser Requirements

- Modern browser with ES6 module support
- JavaScript enabled
- Chrome, Firefox, Safari, or Edge (recent versions)

## Educational Use

Perfect for:
- Italian language learners
- Elementary/middle school students
- Anyone wanting to learn Italian vocabulary
- Teachers creating Italian lessons

## Credits

Built with vanilla JavaScript, HTML5, and CSS3.
