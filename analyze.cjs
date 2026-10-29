const fs = require('fs');
const content = fs.readFileSync('src/lib/story/stories.ts', 'utf8');
// Find German text fragments
const regex = /de:[\s]*'([^']+?)'/g;
let match;
const texts = [];
while ((match = regex.exec(content)) !== null) {
  texts.push(match[1]);
}
console.log('Total German fragments:', texts.length);
console.log('Sample:', texts.slice(0, 5));

// Extract vocabulary from level files and check which appear in stories
const levels = ['a1','a2','b1','b2','c1','c2'];
for (const l of levels) {
  const vocab = JSON.parse(fs.readFileSync('src/lib/data/de.' + l + '.json'));
  const words = Object.keys(vocab);
  const used = words.filter(w => texts.some(t => t.toLowerCase().includes(w.toLowerCase())));
  console.log(l + ': total=' + words.length + ' used=' + used.length + ' unused=' + (words.length - used.length));
  // Show some unused words
  const unused = words.filter(w => !used.includes(w));
  if (unused.length > 0) {
    console.log('  Unused sample: ' + unused.slice(0, 8).join(', '));
  }
}
