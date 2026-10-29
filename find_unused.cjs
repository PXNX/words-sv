const fs = require('fs');
const content = fs.readFileSync('src/lib/story/germanStories.ts', 'utf8');
const vocabDir = 'src/lib/data';
const levels = ['a1','a2','b1','b2','c1','c2'];

// Extract stories per level
const stories = {};
levels.forEach(l => stories[l] = []);

const storyRegex = /\{[^{}]*id:\s*'([^']+)'[^{}]*level:\s*'([a-z0-9]+)'[^{}]*\}/gs;
// Actually objects are nested, but we can split by story id manually using a simpler approach:
// Find each id and level, then collect text until next id at same indentation? Hard.
// Instead, split file by id lines and extract blocks by indentation? Let's just collect all german('...') strings per level by scanning lines with level tracking.
const lines = content.split(/\r?\n/);
const textsByLevel = {};
levels.forEach(l => textsByLevel[l] = []);
let currentLevel = null;
for (let i = 0; i < lines.length; i++) {
  const line = lines[i];
  const levelMatch = line.match(/level:\s*'([a-z0-9]+)'/);
  if (levelMatch) {
    currentLevel = levelMatch[1];
  }
  const regex = /german\('([^']*)'\)/g;
  let m;
  while ((m = regex.exec(line)) !== null) {
    if (currentLevel && levels.includes(currentLevel)) {
      textsByLevel[currentLevel].push(m[1]);
    }
  }
}

// For each level, find vocabulary words whose lowercase form appears exactly in any text string of that level.
levels.forEach(l => {
  const vocabData = JSON.parse(fs.readFileSync(`${vocabDir}/de.${l}.json`, 'utf8'));
  const vocabWords = Object.keys(vocabData);
  const texts = textsByLevel[l].join(' ');
  const lowerTexts = texts.toLowerCase();
  const unused = vocabWords.filter(w => {
    const re = new RegExp('\\b' + w.toLowerCase() + '\\b');
    return !re.test(lowerTexts);
  });
  console.log(`=== Level ${l} === vocab=${vocabWords.length} unused=${unused.length}`);
  console.log(unused.slice(0, 30).join(', '));
});
