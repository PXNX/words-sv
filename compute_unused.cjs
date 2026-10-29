const fs = require('fs');
const content = fs.readFileSync('src/lib/story/germanStories.ts', 'utf8');

const levels = ['a1','a2','b1','b2','c1','c2'];
const used = {};
levels.forEach(l => used[l] = new Set());

let currentLevel = null;
// Process line by line
const lines = content.split(/\r?\n/);
for (let i = 0; i < lines.length; i++) {
  const line = lines[i];
  const levelMatch = line.match(/level:\s*'([a-z0-9]+)'/);
  if (levelMatch) {
    currentLevel = levelMatch[1];
  }
  // Find german('...') strings; handle escaped quotes? just simple
  const regex = /german\('([^']*)'\)/g;
  let m;
  while ((m = regex.exec(line)) !== null) {
    if (currentLevel && levels.includes(currentLevel)) {
      const text = m[1];
      const words = text.toLowerCase().match(/[a-zäöüß]+/g) || [];
      words.forEach(w => used[currentLevel].add(w));
    }
  }
}

// Read vocabulary files for de
const vocabDir = 'src/lib/data';
const vocab = {};
levels.forEach(l => {
  const data = JSON.parse(fs.readFileSync(`${vocabDir}/de.${l}.json`, 'utf8'));
  vocab[l] = new Set(Object.keys(data));
});

levels.forEach(l => {
  const vocabWords = vocab[l];
  const usedWords = used[l];
  const unused = [];
  vocabWords.forEach(w => {
    const lower = w.toLowerCase();
    if (!usedWords.has(lower)) unused.push(w);
  });
  console.log(`Level ${l}: vocab size=${vocabWords.size}, used=${usedWords.size}, unused=${unused.length}`);
  // Show first 50 unused
  console.log(unused.slice(0,50).join(', '));
});
