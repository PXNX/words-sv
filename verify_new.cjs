const fs = require('fs');
const unused = require('./unused_words.json');
const content = fs.readFileSync('src/lib/story/germanStories.ts', 'utf8');
const levels = ['a1','a2','b1','b2','c1','c2'];
levels.forEach(l => {
  // Find all stories with id containing extra and matching level
  const regex = /id: '[^']*extra[^']*'[^}]*level: '[^']*'/gs;
  // Actually extract blocks manually by splitting on id lines
  const lines = content.split(/\r?\n/);
  let inStory = false;
  let currentId = null;
  let currentLevel = null;
  let textBuffer = '';
  const stories = {};
  // We'll collect per id by scanning lines
  const storyBlocks = {};
  let currentBlock = null;
  lines.forEach(line => {
    const idMatch = line.match(/id:\s*'([^']+)'/);
    if (idMatch) {
      if (currentBlock) {
        storyBlocks[currentBlock.id] = { level: currentBlock.level, text: currentBlock.text };
      }
      currentBlock = { id: idMatch[1], text: '', level: null };
    }
    const levelMatch = line.match(/level:\s*'([a-z0-9]+)'/);
    if (levelMatch && currentBlock) currentBlock.level = levelMatch[1];
    if (currentBlock) {
      currentBlock.text += line + ' ';
    }
  });
  if (currentBlock) storyBlocks[currentBlock.id] = { level: currentBlock.level, text: currentBlock.text };
  const newIds = Object.keys(storyBlocks).filter(id => id.includes('extra') && storyBlocks[id].level === l);
  console.log(`=== ${l} === ${newIds.length} new stories`);
  newIds.forEach(id => {
    const lowerText = storyBlocks[id].text.toLowerCase();
    const vocab = unused[l];
    const usedWords = vocab.filter(w => {
      const re = new RegExp('\\b' + w.toLowerCase() + '\\b');
      return re.test(lowerText);
    });
    console.log(id, 'used', usedWords.length, 'unused words:', usedWords.slice(0,12).join(', '));
  });
});
