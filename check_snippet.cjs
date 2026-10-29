const fs = require('fs');
const unused = require('./unused_words.json');

function check(file, level) {
  const text = fs.readFileSync(file, 'utf8');
  const blocks = text.split('  {');
  const words = unused[level];
  blocks.forEach((block, i) => {
    if (!block.trim()) return;
    const lower = block.toLowerCase();
    const used = words.filter(w => {
      const re = new RegExp('\\b' + w.toLowerCase() + '\\b');
      return re.test(lower);
    });
    const id = block.match(/id: '[^']+'/);
    console.log(file, i, id ? id[0] : 'none', 'used words:', used.length, 'first 12:', used.slice(0,12));
  });
}

['snippet_a2.txt','snippet_b1.txt','snippet_b2.txt','snippet_c1.txt','snippet_c2.txt'].forEach(f => {
  check(f, f.replace('snippet_','').replace('.txt',''));
});
