const fs = require('fs');
const filePath = process.argv[2];
let content = fs.readFileSync(filePath, 'utf8');
const lines = content.split(/\r?\n/);
// Remove the trailing "];" line (the last line).
if (lines[lines.length - 1] === '];') {
  lines.pop();
}
const stories = fs.readFileSync(process.argv[3], 'utf8');
lines.push(stories);
lines.push('];');
fs.writeFileSync(filePath, lines.join('\n'));
console.log('Appended successfully, new line count:', lines.length);
