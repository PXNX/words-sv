const fs = require('fs');

const batches = [
  // a1 story 1
  {
    id: 'a1-extra1', level: 'a1', scene: 'office', cast: ['mia','tom'],
    title: 'Der Anfang',
    words: ['Anfang','anbieten','antworten','arbeiten','arbeitslos','Apartment','Achtung','anmachen','anziehen','ausfüllen','Ausgang','Auskunft','automatisch','abfahren','abgeben'],
    beats: [
      {kind:'narration', text:"Es ist der Anfang des Tages. Tom muss arbeiten und hat ein Apartment. Er ist nicht arbeitslos."},
      {kind:'line', speaker:'mia', text:"Ich muss dieses Formular ausfüllen und eine Antwort geben."},
      {kind:'line', speaker:'tom', text:"Achtung! Bitte anziehen und die Lampe anmachen."},
      {kind:'narration', text:"Der Automat gibt Auskunft und der Ausgang ist automatisch."},
      {kind:'question', prompt:"Was muss Mia ausfüllen?", options:["Ein Formular","Ein Auto","Ein Brot"]},
      {kind:'question', prompt:"Was ist der Anfang?", options:["Der Tag","Der Abend","Die Nacht"]}
    ]
  },
  // a1 story 2
  {
    id: 'a1-extra2', level: 'a1', scene: 'town', cast: ['kim','leo'],
    title: 'Die Bank und die Bahn',
    words: ['Bank','Bahn','Bahnsteig','bald','bad','Baby','baden','Beamte','bedeuten','bei','beide','Beispiel','bekannt','benutzen','Beruf'],
    beats: [
      {kind:'narration', text:"Kim geht zur Bank. Der Beamte gibt eine Auskunft. Bald fährt die Bahn ab."},
      {kind:'line', speaker:'kim', text:"Ich muss meinen Beruf angeben und ein Formular benutzen."},
      {kind:'line', speaker:'leo', text:"Das Beispiel zeigt, wie beide bei der Bahnsteig warten."},
      {kind:'narration', text:"Ein Baby spielt und badet nicht. Kim hat einen bekannten Beruf."},
      {kind:'question', prompt:"Wo wartet Kim?", options:["Am Bahnsteig","In der Bank","Zu Hause"]},
      {kind:'question', prompt:"Was bedeutet der Beamte?", options:["Ein Angestellter","Ein Auto","Ein Baby"]}
    ]
  },
  // a1 story 3
  {
    id: 'a1-extra3', level: 'a1', scene: 'shop', cast: ['mia','tom'],
    title: 'Der Automat',
    words: ['Automat','ausmachen','Aussage','aussehen','aussteigen','ausziehen','Autobahn','berühmt','beschrieben','bestanden','beachten','bedanken','beeilt','beenden','begonnen'],
    beats: [
      {kind:'narration', text:"Tom sieht den Automat und muss aussteigen. Er hat eine Aussage gemacht."},
      {kind:'line', speaker:'mia', text:"Der Automat sieht gut aus und der Autobahn ist bekannt."},
      {kind:'line', speaker:'tom', text:"Ich muss die Lampe ausmachen und dann ausziehen."},
      {kind:'narration', text:"Der berühmte Mann hat begonnen und beendet. Er hat sich bedankt."},
      {kind:'question', prompt:"Was muss Tom ausmachen?", options:["Die Lampe","Das Auto","Das Fenster"]},
      {kind:'question', prompt:"Wie sieht der Automat aus?", options:["Gut","Schlecht","Alt"]}
    ]
  },
  // a1 story 4
  {
    id: 'a1-extra4', level: 'a1', scene: 'market', cast: ['kim','leo'],
    title: 'Der Markt',
    words: ['Markt','Maß','meinen','meine','messen','most','Musik','müssen','nach','nachdem','nächste','nah','Name','nein','nicht'],
    // Wait these may not be unused. We need actual unused words from a1 list. Let's pick from remaining.
    beats: []
  }
];

console.log('need to finish batches');
