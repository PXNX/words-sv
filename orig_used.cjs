const fs = require('fs');
const original = fs.readFileSync('original_germanStories.ts', 'utf8');
const levels = ['a1','a2','b1','b2','c1','c2'];
const vocabDir = 'src/lib/data';

function getUsedWords(level) {
  const vocabData = JSON.parse(fs.readFileSync(`${vocabDir}/de.${level}.json`, 'utf8'));
  const vocabWords = Object.keys(vocabData);
  // Extract texts for this level from original file by scanning lines
  const lines = original.split(/\r?\n/);
  const texts = [];
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
      if (currentLevel === level) texts.push(m[1]);
    }
  }
  const allText = texts.join(' ').toLowerCase();
  const used = new Set();
  vocabWords.forEach(w => {
    const re = new RegExp('\\b' + w.toLowerCase() + '\\b');
    if (re.test(allText)) used.add(w.toLowerCase());
  });
  return used;
}

levels.forEach(l => {
  const used = getUsedWords(l);
  console.log(`Level ${l}: used vocab words = ${used.size}`);
});
