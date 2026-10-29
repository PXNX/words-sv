const fs = require('fs');
const content = fs.readFileSync('src/lib/story/germanStories.ts', 'utf8');
const vocabDir = 'src/lib/data';
const levels = ['a1','a2','b1','b2','c1','c2'];
const used = {};
levels.forEach(l => used[l] = new Set());
let currentLevel = null;
const lines = content.split(/\r?\n/);
for (let i = 0; i < lines.length; i++) {
  const line = lines[i];
  const levelMatch = line.match(/level:\s*'([a-z0-9]+)'/);
  if (levelMatch) currentLevel = levelMatch[1];
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
const vocab = {};
levels.forEach(l => {
  const data = JSON.parse(fs.readFileSync(`${vocabDir}/de.${l}.json`, 'utf8'));
  vocab[l] = Object.keys(data);
});
const unused = {};
levels.forEach(l => {
  const set = new Set();
  vocab[l].forEach(w => {
    if (!used[l].has(w.toLowerCase())) set.add(w);
  });
  unused[l] = Array.from(set);
});
fs.writeFileSync('unused_words.json', JSON.stringify(unused, null, 2));
console.log('written unused_words.json');
levels.forEach(l => console.log(l, unused[l].length));
