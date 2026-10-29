const fs = require('fs');
const content = fs.readFileSync('src/lib/story/germanStories.ts', 'utf8');
const vocabData = JSON.parse(fs.readFileSync('src/lib/data/de.a1.json', 'utf8'));
const vocabWords = Object.keys(vocabData);
const start = content.indexOf("id: 'a1-wohnung'");
const block = content.substring(start, content.indexOf('];', start));
const regex = /german\('([^']*)'\)/g;
const wordsUsed = new Set();
let m;
while ((m = regex.exec(block)) !== null) {
  const words = m[1].match(/[a-zA-Zäöüß]+/g) || [];
  words.forEach(w => wordsUsed.add(w.toLowerCase()));
}
console.log('Words in a1 stories count:', wordsUsed.size);
const vocabUsed = vocabWords.filter(w => wordsUsed.has(w.toLowerCase()));
console.log('Vocab words used:', vocabUsed.length);
console.log('First 30 vocab used:', vocabUsed.slice(0,30).join(', '));
