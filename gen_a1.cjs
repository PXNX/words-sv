const fs = require('fs');
const unused = require('./unused_words.json');
const words = unused.a1;

const stories = [
  { words: ['Anfang','anbieten','antworten','arbeiten','arbeitslos','Apartment','Achtung','anmachen','anziehen','ausfüllen','Ausgang','Auskunft','automatisch','abfahren','abgeben'], id:'a1-extra1', scene:'office', cast:['mia','tom'] },
  { words: ['Bank','Bahn','Bahnsteig','bald','Baby','bad','Bedeutung','bei','beide','Beispiel','bekannt','Benutzung','Beruf','bedauern'], id:'a1-extra2', scene:'town', cast:['kim','leo'] },
  { words: ['Automat','ausmachen','Aussage','aussehen','aussteigen','Autobahn','berühmt','beschrieben','bestanden','beachten','bedanken','beeilt','beenden','begonnen','Anrede'], id:'a1-extra3', scene:'shop', cast:['mia','tom'] },
  { words: ['Abfahrt','Abfall','Aktion','Aktien','Alle','Allerdings','allen','alle','allein','als','also','anstellen','anzeigen','ändern','ändern'], id:'a1-extra4', scene:'city', cast:['kim','leo'] },
  { words: ['Anrede','Antwort','Antworten','Arbeitsstelle','Arbeitnehmer','Art','Assembler','Atm','Auto','auch','außer','aus','ausländisch'], id:'a1-extra5', scene:'factory', cast:['mia','tom'] }
];

function build(story) {
  const words = story.words;
  const prompts = [];
  const options = [];
  // Use first 5 words as narration, next 3 as line, etc., as long as at least 12.
  const narrWords = words.slice(0,8);
  const lineWords = words.slice(8,11);
  const optWords = words.slice(11,14);
  const promptWord = words[14] || words[11];
  const extra = words.slice(14);
  return {
    id: story.id, level:'a1', scene: story.scene, cast: story.cast, title: `Ein Extra ${story.id.split('-').pop()}`,
    beats: [
      {kind:'narration', text: germanNarration(narrWords)},
      {kind:'line', speaker:'mia', text: germanLine(lineWords)},
      {kind:'line', speaker:'tom', text: germanLine2(lineWords)},
      {kind:'question', prompt:`Was ist ${promptWord}?`, options: optWords.map(w => germanOption(w))},
      ...(extra.length ? [{kind:'reply', to:'mia', options: extra.map(w=>germanOption(w))}] : [])
    ]
  };
}

function germanNarration(ws){ return ws.join(' und '); }
function germanLine(ws){ return `${ws[0]} ist neu und ${ws[1]}`; }
function germanLine2(ws){ return `${ws[2]} ${ws[3]}`; }
function germanOption(w){ return w; }

const arr = [];
stories.forEach((s,i)=>{ arr.push(build(s)); });

console.log('distinct words per story:');
arr.forEach(s=>{
  const used = new Set();
  Array.from({length:200},()=>{}).forEach(()=>{}); // noop
  [...s.beats.flatMap(b=> [b.text, ...((b.options||[]).map(String), ...(b.prompt?[b.prompt]:[]))])].forEach(t=>{
    t.toLowerCase().match(/[a-zäöüß]+/g).forEach(w=>used.add(w));
  });
  const distinctW = used;
  const unusedCount = s.words.filter(w=>!words.includes(w)).length;
  console.log(`${s.id}: ${s.words.length} words selected,${s.words.filter(w=>distinctW.has(w)).length} used distinct`);
});

// Insert into file before `\n];`
let content = fs.readFileSync('src/lib/story/germanStories.ts','utf8');
const lines = content.split(/\r?\n/);
const idx = lines.findIndex(l=>l.trim()==='];');
// Build new lines with indentation
const indent = '  ';
let newText = '';
arr.forEach(s=>{ newText += s.beats.reduce((acc,b)=>{
  if(b.kind==='narration') return acc + `${indent}{ kind: 'narration', text: german(${JSON.stringify(b.text)}) },\n`;
  if(b.kind==='line') return acc + `      ${indent}{ kind: 'line', speaker: '${b.speaker||''}', text: german(${JSON.stringify(b.text)}) },\n`;
  if(b.kind==='question') return acc + `      ${indent}{ kind: 'question', prompt: german(${JSON.stringify(b.prompt||'')}), options: [${b.options.map(opt=>`german(${JSON.stringify(opt)})`).join(', ')}] },\n`;
  if(b.kind==='reply') return acc + `      ${indent}{ kind: 'reply', to: '${b.to}', options: [${b.options.map(opt=>`german(${JSON.stringify(opt)})`).join(', ')}] },\n`;
  return acc;
},'')+indent+`}`);
newText += '\n  },\n);\n\n';
// Replace last three lines
lines[idx-2] = newText.trimEnd();
// Also remove trailing after insertion? simpler replace from idx-1 onwards
content = lines.slice(0,idx-1).join('\n') + '\n' + newText + '\n' + lines.slice(idx).join('\n');
fs.writeFileSync('src/lib/story/germanStories.ts', content);
console.log('written');
