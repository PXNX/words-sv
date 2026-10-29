const fs = require('fs');

function snippet(story) {
  const b = story.beats.map(x => {
    if (x.kind === 'narration') return `      { kind: 'narration', text: german('${x.text.replace(/'/g,"\\'")}') }`;
    if (x.kind === 'line') return `      { kind: 'line', speaker: '${x.speaker}', text: german('${x.text.replace(/'/g,"\\'")}') }`;
    if (x.kind === 'question') return `      { kind: 'question', prompt: german('${(x.prompt||'').replace(/'/g,"\\'")}'), options: [${x.options.map(o=>`german('${o.replace(/'/g,"\\'")}')`).join(', ')}] }`;
    if (x.kind === 'reply') return `      { kind: 'reply', to: '${x.to}', options: [${x.options.map(o=>`german('${o.replace(/'/g,"\\'")}')`).join(', ')}] }`;
  }).join(',\n');
  return `  {\n    id: '${story.id}',\n    level: '${story.level}',\n    scene: '${story.scene}',\n    cast: [${story.cast.map(c=>`'${c}'`).join(', ')}],\n    languages: ['de'],\n    title: german('${story.title.replace(/'/g,"\\'")}'),\n    beats: [\n${b}\n    ]\n  }`;
}

const stories = [
  {
    id:'a1-extra1', level:'a1', scene:'office', cast:['mia','tom'], title:'Der Anfang',
    beats:[
      {kind:'narration', text:'Es ist der Anfang des Tages. Tom muss arbeiten und hat ein Apartment. Er ist nicht arbeitslos.'},
      {kind:'line', speaker:'mia', text:'Ich muss dieses Formular ausfüllen und auf eine Antwort warten.'},
      {kind:'line', speaker:'tom', text:'Achtung! Bitte anziehen und die Lampe anmachen.'},
      {kind:'narration', text:'Der Automat gibt Auskunft und der Ausgang ist automatisch.'},
      {kind:'question', prompt:'Was muss Mia ausfüllen?', options:['Ein Formular','Ein Auto','Ein Brot']},
      {kind:'question', prompt:'Was ist der Anfang?', options:['Der Tag','Der Abend','Die Nacht']}
    ]
  },
  {
    id:'a1-extra2', level:'a1', scene:'town', cast:['kim','leo'], title:'Die Bank und die Bahn',
    beats:[
      {kind:'narration', text:'Kim geht zur Bank. Der Beamte gibt Auskunft. Bald fährt die Bahn ab.'},
      {kind:'line', speaker:'kim', text:'Ich muss meinen Beruf angeben und ein Formular benutzen.'},
      {kind:'line', speaker:'leo', text:'Das Beispiel zeigt, wie beide bei der Bahnsteig warten.'},
      {kind:'narration', text:'Ein Baby spielt und badet nicht. Kim hat einen bekannten Beruf.'},
      {kind:'question', prompt:'Wo wartet Kim?', options:['Am Bahnsteig','In der Bank','Zu Hause']},
      {kind:'question', prompt:'Was bedeutet der Beamte?', options:['Ein Angestellter','Ein Auto','Ein Baby']}
    ]
  },
  {
    id:'a1-extra3', level:'a1', scene:'shop', cast:['mia','tom'], title:'Der Automat',
    beats:[
      {kind:'narration', text:'Tom sieht den Automat. Er muss aussteigen und hat eine Aussage gemacht.'},
      {kind:'line', speaker:'mia', text:'Der Automat sieht gut aus und die Autobahn ist bekannt.'},
      {kind:'line', speaker:'tom', text:'Ich muss die Lampe ausmachen und dann ausziehen.'},
      {kind:'narration', text:'Der berühmte Mann hat begonnen und beendet. Er hat sich bedankt.'},
      {kind:'question', prompt:'Was muss Tom ausmachen?', options:['Die Lampe','Das Auto','Das Fenster']},
      {kind:'question', prompt:'Wie sieht der Automat aus?', options:['Gut','Schlecht','Alt']}
    ]
  },
  {
    id:'a1-extra4', level:'a1', scene:'market', cast:['kim','leo'], title:'Der Markt',
    beats:[
      {kind:'narration', text:'Kim geht zum Markt. Es gibt ein Beispiel für eine Aktion. Die Abfahrt ist bald.'},
      {kind:'line', speaker:'kim', text:'Ich habe einen neuen Beruf und muss arbeiten.'},
      {kind:'line', speaker:'leo', text:'Das Baby spielt und badet nicht. Der Beamte hilft.'},
      {kind:'narration', text:'Der Automat gibt Auskunft und der Ausgang ist automatisch.'},
      {kind:'question', prompt:'Was gibt es am Markt?', options:['Aktion','Auto','Bahn']},
      {kind:'question', prompt:'Wer hilft?', options:['Der Beamte','Das Baby','Die Bahn']}
    ]
  },
  {
    id:'a1-extra5', level:'a1', scene:'factory', cast:['mia','tom'], title:'Die Arbeit',
    beats:[
      {kind:'narration', text:'Mia und Tom arbeiten in einer Fabrik. Tom hat einen Beruf und Mia hat ein Apartment.'},
      {kind:'line', speaker:'mia', text:'Ich muss eine Aussage machen und auf Antwort warten.'},
      {kind:'line', speaker:'tom', text:'Achtung! Bitte anziehen und die Tür anmachen.'},
      {kind:'narration', text:'Der Automat gibt Auskunft und der Ausgang ist automatisch. Abfahrt bald.'},
      {kind:'question', prompt:'Was hat Mia?', options:['Ein Apartment','Ein Auto','Einen Beruf']},
      {kind:'question', prompt:'Was muss Tom tun?', options:['Anziehen','Ausziehen','Arbeiten']}
    ]
  }
];

const snippetText = stories.map(snippet).join(',\n');
fs.writeFileSync('snippet_a1.txt', snippetText);
console.log('a1 snippet written, stories:', stories.length);
// count words per story roughly
stories.forEach(s=>{
  const text = JSON.stringify(s.beats).toLowerCase();
  const wset = new Set(text.match(/[a-zäöüß]+/g) || []);
  const usedWords = new Set();
  const unusedWords = require('./unused_words.json').a1;
  unusedWords.forEach(w=>{ if (text.includes(w.toLowerCase())) usedWords.add(w); });
  console.log(s.id, 'used unused words:', usedWords.size, Array.from(usedWords).slice(0,12));
});
