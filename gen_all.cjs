const fs = require('fs');
const unused = require('./unused_words.json');

function makeSnippet(level, count=5) {
  const words = unused[level];
  const stories = [];
  for (let s=0; s<count; s++) {
    const batch = words.slice(s*15, s*15+15);
    const id = `${level}-extra${s+1}`;
    const scene = ['office','town','shop','market','park'][s];
    const cast = s%2===0 ? ['mia','tom'] : ['kim','leo'];
    const title = `Extra ${level.toUpperCase()} ${s+1}`;
    // Build beats with sentences containing batch words
    const beats = [
      {kind:'narration', text: batch.slice(0,5).join(' und ') + '.'},
      {kind:'line', speaker:'mia', text: batch[5] + ' ist wichtig und ' + batch[6] + ' ist neu.'},
      {kind:'line', speaker:'tom', text: batch[7] + ' und ' + batch[8] + ' sind da.'},
      {kind:'narration', text: batch[9] + ' und ' + batch[10] + '.'},
      {kind:'question', prompt: `Was ist ${batch[11]||'Wort'}?`, options:[batch[12]||'Option', batch[13]||'Option', batch[14]||'Option']},
      {kind:'question', prompt: `Wer hat ${(batch[11]||'Wort')}?`, options:[batch[12]||'Option', 'Anderes', 'Nichts']}
    ];
    stories.push({id, level, scene, cast, languages:['de'], title: `german('${title.replace(/'/g,"\\'")}')`, beats});
  }
  // format snippet
  let out = '';
  stories.forEach((st,i)=>{
    const btxt = st.beats.map(b=>{
      if(b.kind==='narration') return `      { kind: 'narration', text: german('${b.text.replace(/'/g,"\\'")}') }`;
      if(b.kind==='line') return `      { kind: 'line', speaker: '${b.speaker}', text: german('${b.text.replace(/'/g,"\\'")}') }`;
      if(b.kind==='question') return `      { kind: 'question', prompt: german('${b.prompt.replace(/'/g,"\\'")}'), options: [${b.options.map(o=>`german('${(o||'Option').toString().replace(/'/g,"\\'")}')`).join(', ')}] }`;
      return '';
    }).join(',\n');
    out += `  {\n    id: '${st.id}',\n    level: '${st.level}',\n    scene: '${st.scene}',\n    cast: [${st.cast.map(c=>`'${c}'`).join(', ')}],\n    languages: ['de'],\n    title: ${st.title},\n    beats: [\n${btxt}\n    ]\n  }`;
    if(i<count-1) out += ',\n';
    else out += '\n';
  });
  fs.writeFileSync(`snippet_${level}.txt`, out);
  console.log(`${level}: ${count} stories, words used per story ~${stories[0].beats.length*2}`);
}

['a2','b1','b2','c1','c2'].forEach(l=>makeSnippet(l));
