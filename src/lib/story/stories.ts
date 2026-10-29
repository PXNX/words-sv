import type { Language, VocabularyLevel } from '#lib/data/vocabulary.js';
import { vocabularyLevels } from '#lib/data/vocabulary.js';
import type { SoundEffect } from '#lib/sounds.js';
import { german, germanStories } from './germanStories';
import { kumarStandIn } from './standIn';

export type Text = Record<Language, string>;
export type CharacterId = 'crow' | 'seagull' | 'ludwig' | 'deer' | 'fox' | 'mia' | 'leo' | 'oma' | 'tom' | 'kim' | 'paul' | 'bello' | 'lilith' | 'hans' | 'albert' | 'sabine' | 'enzo' | 'jana' | 'becker' | 'bird' | 'cow' | 'horse' | 'giraffe' | 'elephant' | 'snake' | 'ali' | 'robert' | 'fritz' | 'tobias' | 'selma' | 'kumar' | 'simon' | 'banker' | 'wirt';
export type Mood = 'neutral' | 'happy' | 'sad' | 'surprised' | 'curious' | 'angry' | 'worried' | 'laughing' | 'sleepy';
export type SceneId = 'frankfurt' | 'cologne' | 'munich' | 'hamburg' | 'berlin' | 'cliffs' | 'mainau' | 'lindau' | 'castle' | 'alps' | 'forest' | 'cafe' | 'park' | 'station' | 'home' | 'office' | 'flat' | 'square' | 'attic' | 'beergarden' | 'farm' | 'zoo' | 'butcher' | 'bakery' | 'boutique' | 'perfumery' | 'workshop' | 'beach' | 'airport' | 'library';
export type Weather = 'sunny' | 'cloudy' | 'rainy' | 'snowy';
export type StoryProp = 'ball' | 'wool' | 'eagle';
// Something a character holds (or, for Lilith, has in front of her) from that beat on.
export type HeldItem = 'cake' | 'fish';

// `{name}` is replaced with the learner's first name, so characters can speak to them directly.
// The first option of every question/reply is the correct one; the UI shuffles them.
// `mood` sets the speaker's face when the text alone would read it wrong (see moodFor);
// `sfx` plays a sound effect when the beat appears (in place of any onomatopoeia in the text when it
// is read aloud); `prop` brings a prop onto the stage; `focus` names the vocabulary word a generated
// question practises, so answering it right can take the word off the learner's missed list.
// `word` is that word as written: `asker` (or the line's speaker) pronounces it, even when the story
// is not being read aloud, and a question's `asker` reads its prompt. `noisy` drowns a line in noise (say,
// a plane taking off): its `sfx` roars under the speech, the voice gets quieter and some words are
// lost in the text, so the learner has to listen closely.
// Staging: a character whose first appearance is in `enters` stays off stage until then (a guest
// who knocks, someone who walks up); `exits` sends them running off, and they come back when they
// next speak or enter. `holds` hands characters an item (null takes it away again); `faces` sets how
// the others look while a beat plays. `lights` changes the room's light until a later beat changes it
// again: 'lamp' leaves one harsh lamp burning in a dark room (an interrogation, say), 'off' plunges
// it into darkness (a power cut) and 'on' brings the light back. An `announcement` is a narration
// whose quoted part comes over a station loudspeaker: a gong, a crackling line and a different voice.
type Staging = { enters?: CharacterId[]; exits?: CharacterId[]; holds?: Partial<Record<CharacterId, HeldItem | null>>; faces?: Partial<Record<CharacterId, Mood>>; lights?: Lights };
export type Lights = 'on' | 'lamp' | 'off';
export type StoryBeat =
  | ({ kind: 'narration'; text: Text; sfx?: SoundEffect; prop?: StoryProp; announcement?: boolean } & Staging)
  | ({ kind: 'line'; speaker: CharacterId; text: Text; sfx?: SoundEffect; mood?: Mood; word?: string; noisy?: boolean } & Staging)
  | { kind: 'question'; prompt: Text; options: Text[]; focus?: string; asker?: CharacterId; word?: string }
  | { kind: 'reply'; to: CharacterId; options: Text[]; focus?: string; word?: string };

// A detail that changes from one playthrough to the next, like the colour of a ball or the day of the
// week. One choice is drawn per detail: its words fill `{key}` in every text of the story, and
// `{key#1}` and `{key#2}` take the words of two other choices, as wrong answers. A placeholder that
// opens a text starts with a capital letter ("{day}" → "Sonntag", "Domingo"). `ball` paints the ball
// on stage to match the text.
export type Detail = { words: Record<string, Text>; ball?: string }[];

// `weathers` limits the random weather where the text depends on it; `languages` limits a story to learners
// of those languages (their texts then only need to be written in those languages, see `german`).
// `details` vary between playthroughs (see Detail); `ball` is the colour drawn for this playthrough.
export type Story = { id: string; level: VocabularyLevel; scene: SceneId; cast: CharacterId[]; title: Text; beats: StoryBeat[]; generated?: boolean; weathers?: Weather[]; weather?: Weather; languages?: Language[]; details?: Detail[]; ball?: string };

// The days of the week, as they appear inside a sentence ("Es ist Sonntag", "c’est dimanche").
export const weekdays: Text[] = [
  { de: 'Montag', en: 'Monday', fr: 'lundi', it: 'lunedì', es: 'lunes', pt: 'segunda-feira', uk: 'понеділок' },
  { de: 'Dienstag', en: 'Tuesday', fr: 'mardi', it: 'martedì', es: 'martes', pt: 'terça-feira', uk: 'вівторок' },
  { de: 'Mittwoch', en: 'Wednesday', fr: 'mercredi', it: 'mercoledì', es: 'miércoles', pt: 'quarta-feira', uk: 'середа' },
  { de: 'Donnerstag', en: 'Thursday', fr: 'jeudi', it: 'giovedì', es: 'jueves', pt: 'quinta-feira', uk: 'четвер' },
  { de: 'Freitag', en: 'Friday', fr: 'vendredi', it: 'venerdì', es: 'viernes', pt: 'sexta-feira', uk: 'п’ятниця' },
  { de: 'Samstag', en: 'Saturday', fr: 'samedi', it: 'sabato', es: 'sábado', pt: 'sábado', uk: 'субота' },
  { de: 'Sonntag', en: 'Sunday', fr: 'dimanche', it: 'domenica', es: 'domingo', pt: 'domingo', uk: 'неділя' }
];
// The same text in every language, for placeholders that the details fill in.
function same(text: string): Text {
  return german(text);
}
// The colours a ball on stage can have.
export const ballColours = { red: '#d64b45', blue: '#3d6fd1', yellow: '#e8b923', green: '#3f9a4f' };

// Kumar's name in every language, unless the learner's own character plays his part.
function playedByLearner(names: Text): Text {
  return new Proxy(names, { get: (target, key) => (typeof key === 'string' && key in target && kumarStandIn()) || Reflect.get(target, key) });
}

export const characterNames: Record<CharacterId, Text> = {
  mia: { de: 'Mia', en: 'Mia', fr: 'Mia', it: 'Mia', es: 'Mia', pt: 'Mia', uk: 'Мія' },
  leo: { de: 'Leo', en: 'Leo', fr: 'Léo', it: 'Leo', es: 'Leo', pt: 'Léo', uk: 'Лео' },
  oma: { de: 'Oma', en: 'Grandma', fr: 'Mamie', it: 'Nonna', es: 'Abuela', pt: 'Vovó', uk: 'Бабуся' },
  tom: { de: 'Tom', en: 'Tom', fr: 'Tom', it: 'Tom', es: 'Tom', pt: 'Tom', uk: 'Том' },
  kim: { de: 'Kim', en: 'Kim', fr: 'Kim', it: 'Kim', es: 'Kim', pt: 'Kim', uk: 'Кім' },
  paul: { de: 'Herr Paul', en: 'Mr Paul', fr: 'M. Paul', it: 'Sig. Paul', es: 'Sr. Paul', pt: 'Sr. Paul', uk: 'Пан Пауль' },
  bello: { de: 'Bello', en: 'Bello', fr: 'Bello', it: 'Bello', es: 'Bello', pt: 'Bello', uk: 'Белло' },
  lilith: { de: 'Lilith', en: 'Lilith', fr: 'Lilith', it: 'Lilith', es: 'Lilith', pt: 'Lilith', uk: 'Ліліт' },
  hans: { de: 'Hans', en: 'Hans', fr: 'Hans', it: 'Hans', es: 'Hans', pt: 'Hans', uk: 'Ганс' },
  albert: { de: 'Albert', en: 'Albert', fr: 'Albert', it: 'Albert', es: 'Albert', pt: 'Albert', uk: 'Альберт' },
  sabine: { de: 'Sabine', en: 'Sabine', fr: 'Sabine', it: 'Sabine', es: 'Sabine', pt: 'Sabine', uk: 'Сабіна' },
  enzo: { de: 'Enzo', en: 'Enzo', fr: 'Enzo', it: 'Enzo', es: 'Enzo', pt: 'Enzo', uk: 'Енцо' },
  jana: { de: 'Jana', en: 'Jana', fr: 'Jana', it: 'Jana', es: 'Jana', pt: 'Jana', uk: 'Яна' },
  becker: { de: 'Herr Becker', en: 'Mr Becker', fr: 'M. Becker', it: 'Sig. Becker', es: 'Sr. Becker', pt: 'Sr. Becker', uk: 'Пан Беккер' },
  bird: { de: 'Pieps', en: 'Pieps', fr: 'Pieps', it: 'Pieps', es: 'Pieps', pt: 'Pieps', uk: 'Піпс' },
  cow: { de: 'Berta', en: 'Berta', fr: 'Berta', it: 'Berta', es: 'Berta', pt: 'Berta', uk: 'Берта' },
  horse: { de: 'Blitz', en: 'Blitz', fr: 'Blitz', it: 'Blitz', es: 'Blitz', pt: 'Blitz', uk: 'Бліц' },
  giraffe: { de: 'Gisela', en: 'Gisela', fr: 'Gisela', it: 'Gisela', es: 'Gisela', pt: 'Gisela', uk: 'Гізела' },
  elephant: { de: 'Benno', en: 'Benno', fr: 'Benno', it: 'Benno', es: 'Benno', pt: 'Benno', uk: 'Бенно' },
  snake: { de: 'Zischi', en: 'Zischi', fr: 'Zischi', it: 'Zischi', es: 'Zischi', pt: 'Zischi', uk: 'Зіші' },
  deer: { de: 'Reh', en: 'Deer', fr: 'Chevreuil', it: 'Capriolo', es: 'Corzo', pt: 'Corço', uk: 'Козуля' },
  fox: { de: 'Fuchs', en: 'Fox', fr: 'Renard', it: 'Volpe', es: 'Zorro', pt: 'Raposa', uk: 'Лис' },
  seagull: { de: 'Möwe', en: 'Seagull', fr: 'Mouette', it: 'Gabbiano', es: 'Gaviota', pt: 'Gaivota', uk: 'Чайка' },
  crow: { de: 'Krähe', en: 'Crow', fr: 'Corneille', it: 'Cornacchia', es: 'Corneja', pt: 'Gralha', uk: 'Ворона' },
  // German-only characters (see the cast notes in germanStories.ts).
  ludwig: { de: 'König Ludwig', en: 'King Ludwig', fr: 'Le roi Louis', it: 'Re Ludovico', es: 'El rey Luis', pt: 'Rei Luís', uk: 'Король Людвіг' },
  ali: { de: 'Ali', en: 'Ali', fr: 'Ali', it: 'Ali', es: 'Ali', pt: 'Ali', uk: 'Алі' },
  robert: { de: 'Robert', en: 'Robert', fr: 'Robert', it: 'Robert', es: 'Robert', pt: 'Robert', uk: 'Роберт' },
  fritz: { de: 'Bauer Fritz', en: 'Farmer Fritz', fr: 'Fermier Fritz', it: 'Contadino Fritz', es: 'Granjero Fritz', pt: 'Fazendeiro Fritz', uk: 'Фермер Фріц' },
  tobias: { de: 'Tobias', en: 'Tobias', fr: 'Tobias', it: 'Tobias', es: 'Tobias', pt: 'Tobias', uk: 'Тобіас' },
  selma: { de: 'Selma', en: 'Selma', fr: 'Selma', it: 'Selma', es: 'Selma', pt: 'Selma', uk: 'Сельма' },
  kumar: playedByLearner({ de: 'Kumar', en: 'Kumar', fr: 'Kumar', it: 'Kumar', es: 'Kumar', pt: 'Kumar', uk: 'Кумар' }),
  simon: { de: 'Simon', en: 'Simon', fr: 'Simon', it: 'Simon', es: 'Simon', pt: 'Simon', uk: 'Сімон' },
  banker: { de: 'Herr Bäuerle', en: 'Mr Bäuerle', fr: 'M. Bäuerle', it: 'Sig. Bäuerle', es: 'Sr. Bäuerle', pt: 'Sr. Bäuerle', uk: 'Пан Баєрле' },
  wirt: { de: 'Der Wirt', en: 'The innkeeper', fr: "L'aubergiste", it: "L'oste", es: 'El tabernero', pt: 'O estalajadeiro', uk: 'Шинкар' }
};

export const stories: Story[] = [
  {
    id: 'a1-cafe',
    level: 'a1',
    scene: 'cafe',
    cast: ['mia', 'tom'],
    title: { de: 'Im Café', en: 'At the café', fr: 'Au café', it: 'Al bar', es: 'En la cafetería', pt: 'No café', uk: 'У кав’ярні' },
    details: [[
      { words: {
        now: { de: 'Es ist Morgen', en: 'It is morning', fr: 'C’est le matin', it: 'È mattina', es: 'Es por la mañana', pt: 'É de manhã', uk: 'Зараз ранок' },
        when: { de: 'Am Morgen', en: 'In the morning', fr: 'Le matin', it: 'Di mattina', es: 'Por la mañana', pt: 'De manhã', uk: 'Уранці' }
      } },
      { words: {
        now: { de: 'Es ist Mittag', en: 'It is noon', fr: 'Il est midi', it: 'È mezzogiorno', es: 'Es mediodía', pt: 'É meio-dia', uk: 'Зараз полудень' },
        when: { de: 'Am Mittag', en: 'At noon', fr: 'À midi', it: 'A mezzogiorno', es: 'A mediodía', pt: 'Ao meio-dia', uk: 'Опівдні' }
      } },
      { words: {
        now: { de: 'Es ist Abend', en: 'It is evening', fr: 'C’est le soir', it: 'È sera', es: 'Es por la noche', pt: 'É noite', uk: 'Зараз вечір' },
        when: { de: 'Am Abend', en: 'In the evening', fr: 'Le soir', it: 'Di sera', es: 'Por la noche', pt: 'À noite', uk: 'Увечері' }
      } }
    ]],
    beats: [
      { kind: 'narration', text: { de: 'Mia ist im Café. {now}.', en: 'Mia is at the café. {now}.', fr: 'Mia est au café. {now}.', it: 'Mia è al bar. {now}.', es: 'Mia está en la cafetería. {now}.', pt: 'A Mia está no café. {now}.', uk: 'Мія в кав’ярні. {now}.' } },
      { kind: 'line', speaker: 'tom', text: { de: 'Hallo! Was möchtest du trinken?', en: 'Hello! What would you like to drink?', fr: 'Bonjour ! Qu’est-ce que tu veux boire ?', it: 'Ciao! Cosa vuoi bere?', es: '¡Hola! ¿Qué quieres beber?', pt: 'Oi! O que você quer beber?', uk: 'Привіт! Що ти хочеш випити?' } },
      { kind: 'line', speaker: 'mia', text: { de: 'Einen Kaffee mit Milch, bitte.', en: 'A coffee with milk, please.', fr: 'Un café au lait, s’il te plaît.', it: 'Un caffè con il latte, per favore.', es: 'Un café con leche, por favor.', pt: 'Um café com leite, por favor.', uk: 'Каву з молоком, будь ласка.' } },
      { kind: 'line', speaker: 'tom', text: { de: 'Gern. Möchtest du auch einen Kuchen?', en: 'Sure. Would you like some cake too?', fr: 'Avec plaisir. Tu veux aussi un gâteau ?', it: 'Certo. Vuoi anche una torta?', es: 'Claro. ¿Quieres también un pastel?', pt: 'Claro. Você quer um bolo também?', uk: 'Звісно. Хочеш ще тістечко?' } },
      { kind: 'line', speaker: 'mia', text: { de: 'Nein, danke. Oh, hallo {name}!', en: 'No, thank you. Oh, hi {name}!', fr: 'Non, merci. Oh, salut {name} !', it: 'No, grazie. Oh, ciao {name}!', es: 'No, gracias. ¡Ah, hola, {name}!', pt: 'Não, obrigada. Ah, oi, {name}!', uk: 'Ні, дякую. О, привіт, {name}!' } },
      { kind: 'reply', to: 'mia', options: [
        { de: 'Hallo Mia! Wie geht’s?', en: 'Hi Mia! How are you?', fr: 'Salut Mia ! Ça va ?', it: 'Ciao Mia! Come stai?', es: '¡Hola, Mia! ¿Qué tal?', pt: 'Oi, Mia! Tudo bem?', uk: 'Привіт, Міє! Як справи?' },
        { de: 'Ich bin ein Kuchen.', en: 'I am a cake.', fr: 'Je suis un gâteau.', it: 'Io sono una torta.', es: 'Yo soy un pastel.', pt: 'Eu sou um bolo.', uk: 'Я тістечко.' },
        { de: 'Gute Nacht!', en: 'Good night!', fr: 'Bonne nuit !', it: 'Buonanotte!', es: '¡Buenas noches!', pt: 'Boa noite!', uk: 'На добраніч!' }
      ] },
      { kind: 'line', speaker: 'mia', text: { de: 'Gut, danke! Trinkst du auch einen Kaffee?', en: 'Good, thanks! Are you having a coffee too?', fr: 'Bien, merci ! Tu bois aussi un café ?', it: 'Bene, grazie! Prendi anche tu un caffè?', es: '¡Bien, gracias! ¿Tomas tú también un café?', pt: 'Bem, obrigada! Você também vai tomar um café?', uk: 'Добре, дякую! Ти теж будеш каву?' } },
      { kind: 'reply', to: 'mia', options: [
        { de: 'Ja, gern!', en: 'Yes, please!', fr: 'Oui, avec plaisir !', it: 'Sì, volentieri!', es: '¡Sí, claro!', pt: 'Sim, quero!', uk: 'Так, залюбки!' },
        { de: 'Ich heiße Kaffee.', en: 'My name is Coffee.', fr: 'Je m’appelle Café.', it: 'Mi chiamo Caffè.', es: 'Me llamo Café.', pt: 'Eu me chamo Café.', uk: 'Мене звати Кава.' },
        { de: 'Das ist ein Hund.', en: 'That is a dog.', fr: 'C’est un chien.', it: 'È un cane.', es: 'Es un perro.', pt: 'É um cachorro.', uk: 'Це собака.' }
      ] },
      { kind: 'question', prompt: { de: 'Was trinkt Mia?', en: 'What is Mia drinking?', fr: 'Que boit Mia ?', it: 'Cosa beve Mia?', es: '¿Qué bebe Mia?', pt: 'O que a Mia bebe?', uk: 'Що п’є Мія?' }, options: [
        { de: 'Kaffee mit Milch', en: 'Coffee with milk', fr: 'Un café au lait', it: 'Un caffè con il latte', es: 'Café con leche', pt: 'Café com leite', uk: 'Каву з молоком' },
        { de: 'Tee', en: 'Tea', fr: 'Un thé', it: 'Un tè', es: 'Té', pt: 'Chá', uk: 'Чай' },
        { de: 'Wasser', en: 'Water', fr: 'De l’eau', it: 'Acqua', es: 'Agua', pt: 'Água', uk: 'Воду' }
      ] },
      { kind: 'question', prompt: { de: 'Isst Mia einen Kuchen?', en: 'Does Mia have some cake?', fr: 'Est-ce que Mia mange un gâteau ?', it: 'Mia mangia una torta?', es: '¿Come Mia un pastel?', pt: 'A Mia come um bolo?', uk: 'Мія їсть тістечко?' }, options: [
        { de: 'Nein.', en: 'No.', fr: 'Non.', it: 'No.', es: 'No.', pt: 'Não.', uk: 'Ні.' },
        { de: 'Ja, einen.', en: 'Yes, one piece.', fr: 'Oui, un.', it: 'Sì, una.', es: 'Sí, uno.', pt: 'Sim, um.', uk: 'Так, одне.' },
        { de: 'Ja, zwei.', en: 'Yes, two pieces.', fr: 'Oui, deux.', it: 'Sì, due.', es: 'Sí, dos.', pt: 'Sim, dois.', uk: 'Так, два.' }
      ] },
      { kind: 'question', prompt: { de: 'Wo ist Mia?', en: 'Where is Mia?', fr: 'Où est Mia ?', it: 'Dov’è Mia?', es: '¿Dónde está Mia?', pt: 'Onde a Mia está?', uk: 'Де Мія?' }, options: [
        { de: 'Im Café', en: 'At the café', fr: 'Au café', it: 'Al bar', es: 'En la cafetería', pt: 'No café', uk: 'У кав’ярні' },
        { de: 'Im Park', en: 'In the park', fr: 'Au parc', it: 'Al parco', es: 'En el parque', pt: 'No parque', uk: 'У парку' },
        { de: 'Am Bahnhof', en: 'At the station', fr: 'À la gare', it: 'In stazione', es: 'En la estación', pt: 'Na estação', uk: 'На вокзалі' }
      ] },
      { kind: 'question', prompt: { de: 'Wann ist Mia im Café?', en: 'When is Mia at the café?', fr: 'Quand Mia est-elle au café ?', it: 'Quando è al bar Mia?', es: '¿Cuándo está Mia en la cafetería?', pt: 'Quando a Mia está no café?', uk: 'Коли Мія в кав’ярні?' }, options: [
        same('{when}'), same('{when#1}'), same('{when#2}')
      ] },
      { kind: 'question', prompt: { de: 'Wer fragt Mia, was sie trinken möchte?', en: 'Who asks Mia what she would like to drink?', fr: 'Qui demande à Mia ce qu’elle veut boire ?', it: 'Chi chiede a Mia cosa vuole bere?', es: '¿Quién le pregunta a Mia qué quiere beber?', pt: 'Quem pergunta à Mia o que ela quer beber?', uk: 'Хто питає Мію, що вона хоче випити?' }, options: [
        { de: 'Tom', en: 'Tom', fr: 'Tom', it: 'Tom', es: 'Tom', pt: 'O Tom', uk: 'Том' },
        { de: 'Leo', en: 'Leo', fr: 'Léo', it: 'Leo', es: 'Leo', pt: 'O Léo', uk: 'Лео' },
        { de: 'Oma', en: 'Grandma', fr: 'Mamie', it: 'La nonna', es: 'La abuela', pt: 'A Vovó', uk: 'Бабуся' }
      ] }
    ]
  },
  {
    id: 'a1-lilith',
    level: 'a1',
    scene: 'home',
    cast: ['mia', 'tom', 'lilith'],
    title: { de: 'Lilith hat Hunger', en: 'Lilith is hungry', fr: 'Lilith a faim', it: 'Lilith ha fame', es: 'Lilith tiene hambre', pt: 'A Lilith está com fome', uk: 'Ліліт голодна' },
    beats: [
      { kind: 'narration', text: { de: 'Es ist Abend. Mia und Tom sind zu Hause. Ihre Katze Lilith schläft auf dem Sofa.', en: 'It is evening. Mia and Tom are at home. Their cat Lilith is sleeping on the sofa.', fr: 'C’est le soir. Mia et Tom sont à la maison. Leur chatte Lilith dort sur le canapé.', it: 'È sera. Mia e Tom sono a casa. La loro gatta Lilith dorme sul divano.', es: 'Es de noche. Mia y Tom están en casa. Su gata Lilith duerme en el sofá.', pt: 'É noite. Mia e Tom estão em casa. A gata deles, Lilith, está dormindo no sofá.', uk: 'Вечір. Мія і Том удома. Їхня кішка Ліліт спить на дивані.' } },
      { kind: 'line', speaker: 'lilith', sfx: 'meow', text: { de: 'Miau! Miau!', en: 'Meow! Meow!', fr: 'Miaou ! Miaou !', it: 'Miao! Miao!', es: '¡Miau! ¡Miau!', pt: 'Miau! Miau!', uk: 'Няв! Няв!' } },
      { kind: 'line', speaker: 'tom', text: { de: 'Mia, wo ist das Katzenfutter?', en: 'Mia, where is the cat food?', fr: 'Mia, où est la nourriture pour chat ?', it: 'Mia, dov’è il cibo per gatti?', es: 'Mia, ¿dónde está la comida del gato?', pt: 'Mia, onde está a ração da gata?', uk: 'Міє, де котячий корм?' } },
      { kind: 'line', speaker: 'mia', text: { de: 'In der Küche, neben dem Kühlschrank.', en: 'In the kitchen, next to the fridge.', fr: 'Dans la cuisine, à côté du frigo.', it: 'In cucina, accanto al frigorifero.', es: 'En la cocina, al lado de la nevera.', pt: 'Na cozinha, ao lado da geladeira.', uk: 'На кухні, біля холодильника.' } },
      { kind: 'line', speaker: 'tom', text: { de: 'Lilith hat Hunger. Hallo {name}! Möchtest du Lilith füttern?', en: 'Lilith is hungry. Hi {name}! Would you like to feed Lilith?', fr: 'Lilith a faim. Salut {name} ! Tu veux donner à manger à Lilith ?', it: 'Lilith ha fame. Ciao {name}! Vuoi dare da mangiare a Lilith?', es: 'Lilith tiene hambre. ¡Hola, {name}! ¿Quieres darle de comer a Lilith?', pt: 'A Lilith está com fome. Oi, {name}! Você quer dar comida para a Lilith?', uk: 'Ліліт голодна. Привіт, {name}! Хочеш погодувати Ліліт?' } },
      { kind: 'reply', to: 'tom', options: [
        { de: 'Ja, gern!', en: 'Yes, I’d love to!', fr: 'Oui, avec plaisir !', it: 'Sì, volentieri!', es: '¡Sí, claro!', pt: 'Sim, claro!', uk: 'Так, залюбки!' },
        { de: 'Ich bin eine Katze.', en: 'I am a cat.', fr: 'Je suis un chat.', it: 'Io sono un gatto.', es: 'Yo soy un gato.', pt: 'Eu sou um gato.', uk: 'Я кіт.' },
        { de: 'Der Zug ist spät.', en: 'The train is late.', fr: 'Le train est en retard.', it: 'Il treno è in ritardo.', es: 'El tren llega tarde.', pt: 'O trem está atrasado.', uk: 'Потяг запізнюється.' }
      ] },
      { kind: 'line', speaker: 'mia', text: { de: 'Danke, {name}! Lilith mag Fisch.', en: 'Thanks, {name}! Lilith loves fish.', fr: 'Merci, {name} ! Lilith adore le poisson.', it: 'Grazie, {name}! Lilith adora il pesce.', es: '¡Gracias, {name}! A Lilith le encanta el pescado.', pt: 'Obrigada, {name}! A Lilith adora peixe.', uk: 'Дякую, {name}! Ліліт любить рибу.' } },
      { kind: 'narration', sfx: 'purr', holds: { lilith: 'fish' }, text: { de: 'Lilith frisst und schnurrt. Jetzt ist sie glücklich.', en: 'Lilith eats and purrs. Now she is happy.', fr: 'Lilith mange et ronronne. Maintenant, elle est contente.', it: 'Lilith mangia e fa le fusa. Adesso è felice.', es: 'Lilith come y ronronea. Ahora está feliz.', pt: 'A Lilith come e ronrona. Agora ela está feliz.', uk: 'Ліліт їсть і муркоче. Тепер вона щаслива.' } },
      { kind: 'question', prompt: { de: 'Wo ist das Katzenfutter?', en: 'Where is the cat food?', fr: 'Où est la nourriture pour chat ?', it: 'Dov’è il cibo per gatti?', es: '¿Dónde está la comida del gato?', pt: 'Onde está a ração da gata?', uk: 'Де котячий корм?' }, options: [
        { de: 'In der Küche', en: 'In the kitchen', fr: 'Dans la cuisine', it: 'In cucina', es: 'En la cocina', pt: 'Na cozinha', uk: 'На кухні' },
        { de: 'Im Bad', en: 'In the bathroom', fr: 'Dans la salle de bain', it: 'In bagno', es: 'En el baño', pt: 'No banheiro', uk: 'У ванній' },
        { de: 'Im Auto', en: 'In the car', fr: 'Dans la voiture', it: 'In macchina', es: 'En el coche', pt: 'No carro', uk: 'В машині' }
      ] },
      { kind: 'question', prompt: { de: 'Was mag Lilith?', en: 'What does Lilith love?', fr: 'Qu’est-ce que Lilith adore ?', it: 'Che cosa adora Lilith?', es: '¿Qué le encanta a Lilith?', pt: 'O que a Lilith adora?', uk: 'Що любить Ліліт?' }, options: [
        { de: 'Fisch', en: 'Fish', fr: 'Le poisson', it: 'Il pesce', es: 'El pescado', pt: 'Peixe', uk: 'Рибу' },
        { de: 'Kuchen', en: 'Cake', fr: 'Le gâteau', it: 'La torta', es: 'El pastel', pt: 'Bolo', uk: 'Торт' },
        { de: 'Kaffee', en: 'Coffee', fr: 'Le café', it: 'Il caffè', es: 'El café', pt: 'Café', uk: 'Каву' }
      ] },
      { kind: 'question', prompt: { de: 'Was für ein Tier ist Lilith?', en: 'What animal is Lilith?', fr: 'Quel animal est Lilith ?', it: 'Che animale è Lilith?', es: '¿Qué animal es Lilith?', pt: 'Que animal é a Lilith?', uk: 'Яка тварина Ліліт?' }, options: [
        { de: 'Eine Katze', en: 'A cat', fr: 'Une chatte', it: 'Una gatta', es: 'Una gata', pt: 'Uma gata', uk: 'Кішка' },
        { de: 'Ein Hund', en: 'A dog', fr: 'Un chien', it: 'Un cane', es: 'Un perro', pt: 'Um cachorro', uk: 'Собака' },
        { de: 'Ein Vogel', en: 'A bird', fr: 'Un oiseau', it: 'Un uccello', es: 'Un pájaro', pt: 'Um pássaro', uk: 'Пташка' }
      ] },
      { kind: 'question', prompt: { de: 'Wo schläft Lilith?', en: 'Where is Lilith sleeping?', fr: 'Où dort Lilith ?', it: 'Dove dorme Lilith?', es: '¿Dónde duerme Lilith?', pt: 'Onde a Lilith está dormindo?', uk: 'Де спить Ліліт?' }, options: [
        { de: 'Auf dem Sofa', en: 'On the sofa', fr: 'Sur le canapé', it: 'Sul divano', es: 'En el sofá', pt: 'No sofá', uk: 'На дивані' },
        { de: 'Im Bett', en: 'In the bed', fr: 'Dans le lit', it: 'Nel letto', es: 'En la cama', pt: 'Na cama', uk: 'У ліжку' },
        { de: 'Auf dem Tisch', en: 'On the table', fr: 'Sur la table', it: 'Sul tavolo', es: 'En la mesa', pt: 'Na mesa', uk: 'На столі' }
      ] },
      { kind: 'question', prompt: { de: 'Wie ist Lilith am Ende?', en: 'How is Lilith at the end?', fr: 'Comment est Lilith à la fin ?', it: 'Com’è Lilith alla fine?', es: '¿Cómo está Lilith al final?', pt: 'Como a Lilith está no final?', uk: 'Яка Ліліт наприкінці?' }, options: [
        { de: 'Glücklich', en: 'Happy', fr: 'Contente', it: 'Felice', es: 'Feliz', pt: 'Feliz', uk: 'Щаслива' },
        { de: 'Traurig', en: 'Sad', fr: 'Triste', it: 'Triste', es: 'Triste', pt: 'Triste', uk: 'Сумна' },
        { de: 'Wütend', en: 'Angry', fr: 'En colère', it: 'Arrabbiata', es: 'Enfadada', pt: 'Brava', uk: 'Сердита' }
      ] }
    ]
  },
  {
    id: 'a1-park',
    level: 'a1',
    scene: 'park',
    cast: ['leo', 'bello', 'oma'],
    title: { de: 'Im Park', en: 'In the park', fr: 'Au parc', it: 'Al parco', es: 'En el parque', pt: 'No parque', uk: 'У парку' },
    details: [
      weekdays.map((day) => ({ words: { day } })),
      [
        { ball: ballColours.red, words: {
          ball: { de: 'einen roten Ball', en: 'a red ball', fr: 'un ballon rouge', it: 'una palla rossa', es: 'una pelota roja', pt: 'uma bola vermelha', uk: 'червоний м’яч' },
          colour: { de: 'rot', en: 'red', fr: 'rouge', it: 'rossa', es: 'roja', pt: 'vermelha', uk: 'червоний' }
        } },
        { ball: ballColours.blue, words: {
          ball: { de: 'einen blauen Ball', en: 'a blue ball', fr: 'un ballon bleu', it: 'una palla blu', es: 'una pelota azul', pt: 'uma bola azul', uk: 'синій м’яч' },
          colour: { de: 'blau', en: 'blue', fr: 'bleu', it: 'blu', es: 'azul', pt: 'azul', uk: 'синій' }
        } },
        { ball: ballColours.yellow, words: {
          ball: { de: 'einen gelben Ball', en: 'a yellow ball', fr: 'un ballon jaune', it: 'una palla gialla', es: 'una pelota amarilla', pt: 'uma bola amarela', uk: 'жовтий м’яч' },
          colour: { de: 'gelb', en: 'yellow', fr: 'jaune', it: 'gialla', es: 'amarilla', pt: 'amarela', uk: 'жовтий' }
        } },
        { ball: ballColours.green, words: {
          ball: { de: 'einen grünen Ball', en: 'a green ball', fr: 'un ballon vert', it: 'una palla verde', es: 'una pelota verde', pt: 'uma bola verde', uk: 'зелений м’яч' },
          colour: { de: 'grün', en: 'green', fr: 'vert', it: 'verde', es: 'verde', pt: 'verde', uk: 'зелений' }
        } }
      ]
    ],
    beats: [
      { kind: 'narration', text: { de: 'Es ist {day}. Leo ist mit seinem Hund Bello im Park.', en: 'It is {day}. Leo is in the park with his dog Bello.', fr: 'C’est {day}. Léo est au parc avec son chien Bello.', it: 'È {day}. Leo è al parco con il suo cane Bello.', es: 'Es {day}. Leo está en el parque con su perro Bello.', pt: 'É {day}. O Léo está no parque com o seu cachorro Bello.', uk: 'Сьогодні {day}. Лео в парку зі своїм собакою Белло.' } },
      { kind: 'narration', prop: 'ball', text: { de: 'Bello sieht {ball}. Er läuft schnell weg.', en: 'Bello sees {ball}. He runs away fast.', fr: 'Bello voit {ball}. Il part en courant.', it: 'Bello vede {ball}. Corre via veloce.', es: 'Bello ve {ball}. Sale corriendo.', pt: 'O Bello vê {ball}. Ele sai correndo.', uk: 'Белло бачить {ball}. Він швидко тікає.' } },
      { kind: 'line', speaker: 'bello', sfx: 'bark', mood: 'happy', text: { de: 'Wuff! Wuff!', en: 'Woof! Woof!', fr: 'Ouaf ! Ouaf !', it: 'Bau! Bau!', es: '¡Guau! ¡Guau!', pt: 'Au! Au!', uk: 'Гав! Гав!' } },
      { kind: 'line', speaker: 'oma', enters: ['oma'], text: { de: 'Oh! Ist das dein Hund?', en: 'Oh! Is that your dog?', fr: 'Oh ! C’est ton chien ?', it: 'Oh! È il tuo cane?', es: '¡Oh! ¿Es tu perro?', pt: 'Ah! Esse cachorro é seu?', uk: 'Ой! Це твій собака?' } },
      { kind: 'line', speaker: 'leo', text: { de: 'Ja, das ist Bello. Entschuldigung!', en: 'Yes, that’s Bello. Sorry!', fr: 'Oui, c’est Bello. Pardon !', it: 'Sì, è Bello. Scusi!', es: 'Sí, es Bello. ¡Perdón!', pt: 'Sim, é o Bello. Desculpa!', uk: 'Так, це Белло. Вибачте!' } },
      { kind: 'line', speaker: 'oma', text: { de: 'Kein Problem. Er ist sehr lieb. Hier ist der Ball.', en: 'No problem. He is very sweet. Here is the ball.', fr: 'Pas de problème. Il est très gentil. Voici le ballon.', it: 'Nessun problema. È molto buono. Ecco la palla.', es: 'No pasa nada. Es muy bueno. Aquí está la pelota.', pt: 'Sem problema. Ele é muito bonzinho. Aqui está a bola.', uk: 'Нічого страшного. Він дуже милий. Ось м’яч.' } },
      { kind: 'question', prompt: { de: 'Welche Farbe hat der Ball?', en: 'What colour is the ball?', fr: 'De quelle couleur est le ballon ?', it: 'Di che colore è la palla?', es: '¿De qué color es la pelota?', pt: 'De que cor é a bola?', uk: 'Якого кольору м’яч?' }, options: [
        same('{colour}'), same('{colour#1}'), same('{colour#2}')
      ] },
      { kind: 'line', speaker: 'leo', text: { de: 'Hallo {name}! Spielst du mit uns?', en: 'Hi {name}! Will you play with us?', fr: 'Salut {name} ! Tu joues avec nous ?', it: 'Ciao {name}! Giochi con noi?', es: '¡Hola, {name}! ¿Juegas con nosotros?', pt: 'Oi, {name}! Você brinca com a gente?', uk: 'Привіт, {name}! Пограєш з нами?' } },
      { kind: 'reply', to: 'leo', options: [
        { de: 'Ja, gern! Wirf den Ball!', en: 'Yes, sure! Throw the ball!', fr: 'Oui, d’accord ! Lance le ballon !', it: 'Sì, volentieri! Lancia la palla!', es: '¡Sí, claro! ¡Tira la pelota!', pt: 'Sim, claro! Joga a bola!', uk: 'Так, залюбки! Кидай м’яч!' },
        { de: 'Nein, ich bin ein Ball.', en: 'No, I am a ball.', fr: 'Non, je suis un ballon.', it: 'No, sono una palla.', es: 'No, soy una pelota.', pt: 'Não, eu sou uma bola.', uk: 'Ні, я м’яч.' },
        { de: 'Guten Appetit!', en: 'Enjoy your meal!', fr: 'Bon appétit !', it: 'Buon appetito!', es: '¡Buen provecho!', pt: 'Bom apetite!', uk: 'Смачного!' }
      ] },
      { kind: 'question', prompt: { de: 'Wo sind Leo und Bello?', en: 'Where are Leo and Bello?', fr: 'Où sont Léo et Bello ?', it: 'Dove sono Leo e Bello?', es: '¿Dónde están Leo y Bello?', pt: 'Onde estão o Léo e o Bello?', uk: 'Де Лео і Белло?' }, options: [
        { de: 'Im Park', en: 'In the park', fr: 'Au parc', it: 'Al parco', es: 'En el parque', pt: 'No parque', uk: 'У парку' },
        { de: 'Im Kino', en: 'At the cinema', fr: 'Au cinéma', it: 'Al cinema', es: 'En el cine', pt: 'No cinema', uk: 'У кіно' },
        { de: 'In der Schule', en: 'At school', fr: 'À l’école', it: 'A scuola', es: 'En la escuela', pt: 'Na escola', uk: 'У школі' }
      ] },
      { kind: 'question', prompt: { de: 'Welcher Tag ist heute?', en: 'What day is it today?', fr: 'Quel jour est-ce aujourd’hui ?', it: 'Che giorno è oggi?', es: '¿Qué día es hoy?', pt: 'Que dia é hoje?', uk: 'Який сьогодні день?' }, options: [
        same('{day}'), same('{day#1}'), same('{day#2}')
      ] },
      { kind: 'question', prompt: { de: 'Wer ist Bello?', en: 'Who is Bello?', fr: 'Qui est Bello ?', it: 'Chi è Bello?', es: '¿Quién es Bello?', pt: 'Quem é o Bello?', uk: 'Хто такий Белло?' }, options: [
        { de: 'Leos Hund', en: 'Leo’s dog', fr: 'Le chien de Léo', it: 'Il cane di Leo', es: 'El perro de Leo', pt: 'O cachorro do Léo', uk: 'Собака Лео' },
        { de: 'Leos Bruder', en: 'Leo’s brother', fr: 'Le frère de Léo', it: 'Il fratello di Leo', es: 'El hermano de Leo', pt: 'O irmão do Léo', uk: 'Брат Лео' },
        { de: 'Omas Katze', en: 'Grandma’s cat', fr: 'Le chat de Mamie', it: 'Il gatto della nonna', es: 'El gato de la abuela', pt: 'O gato da Vovó', uk: 'Кіт бабусі' }
      ] },
      { kind: 'question', prompt: { de: 'Was sagt Oma über Bello?', en: 'What does Grandma say about Bello?', fr: 'Que dit Mamie de Bello ?', it: 'Cosa dice la nonna di Bello?', es: '¿Qué dice la abuela de Bello?', pt: 'O que a Vovó diz do Bello?', uk: 'Що каже бабуся про Белло?' }, options: [
        { de: 'Er ist sehr lieb.', en: 'He is very sweet.', fr: 'Il est très gentil.', it: 'È molto buono.', es: 'Es muy bueno.', pt: 'Ele é muito bonzinho.', uk: 'Він дуже милий.' },
        { de: 'Er ist sehr böse.', en: 'He is very naughty.', fr: 'Il est très méchant.', it: 'È molto cattivo.', es: 'Es muy malo.', pt: 'Ele é muito bravo.', uk: 'Він дуже злий.' },
        { de: 'Er ist sehr alt.', en: 'He is very old.', fr: 'Il est très vieux.', it: 'È molto vecchio.', es: 'Es muy viejo.', pt: 'Ele é muito velho.', uk: 'Він дуже старий.' }
      ] }
    ]
  },
  {
    id: 'a2-station',
    level: 'a2',
    scene: 'station',
    cast: ['mia', 'paul'],
    // "It is snowing heavily" is a wrong answer for why the train is late.
    weathers: ['sunny', 'cloudy', 'rainy'],
    title: { de: 'Verspätung', en: 'Delayed', fr: 'En retard', it: 'In ritardo', es: 'Con retraso', pt: 'Atrasado', uk: 'Затримка' },
    beats: [
      { kind: 'narration', text: { de: 'Mia will heute zu ihrer Schwester nach Hamburg fahren. Sie wartet schon zwanzig Minuten am Bahnhof.', en: 'Mia wants to visit her sister in Hamburg today. She has already been waiting at the station for twenty minutes.', fr: 'Aujourd’hui, Mia veut aller chez sa sœur à Hambourg. Elle attend à la gare depuis vingt minutes.', it: 'Oggi Mia vuole andare da sua sorella ad Amburgo. Aspetta in stazione già da venti minuti.', es: 'Hoy Mia quiere ir a ver a su hermana en Hamburgo. Ya lleva veinte minutos esperando en la estación.', pt: 'Hoje a Mia quer visitar a irmã em Hamburgo. Ela já está esperando na estação há vinte minutos.', uk: 'Сьогодні Мія хоче поїхати до сестри в Гамбург. Вона вже двадцять хвилин чекає на вокзалі.' } },
      { kind: 'line', speaker: 'mia', text: { de: 'Entschuldigung, wann kommt der Zug nach Hamburg?', en: 'Excuse me, when is the train to Hamburg coming?', fr: 'Excusez-moi, quand arrive le train pour Hambourg ?', it: 'Scusi, quando arriva il treno per Amburgo?', es: 'Perdone, ¿cuándo llega el tren a Hamburgo?', pt: 'Com licença, quando chega o trem para Hamburgo?', uk: 'Перепрошую, коли прибуде потяг до Гамбурга?' } },
      { kind: 'line', speaker: 'paul', text: { de: 'Leider hat er dreißig Minuten Verspätung. Es gibt ein technisches Problem.', en: 'Unfortunately it’s thirty minutes late. There is a technical problem.', fr: 'Malheureusement, il a trente minutes de retard. Il y a un problème technique.', it: 'Purtroppo ha trenta minuti di ritardo. C’è un problema tecnico.', es: 'Lo siento, tiene treinta minutos de retraso. Hay un problema técnico.', pt: 'Infelizmente ele está trinta minutos atrasado. Há um problema técnico.', uk: 'На жаль, він запізнюється на тридцять хвилин. Технічна проблема.' } },
      { kind: 'line', speaker: 'mia', text: { de: 'Oh nein! Meine Schwester wartet auf mich.', en: 'Oh no! My sister is waiting for me.', fr: 'Oh non ! Ma sœur m’attend.', it: 'Oh no! Mia sorella mi aspetta.', es: '¡Oh, no! Mi hermana me está esperando.', pt: 'Ah, não! Minha irmã está me esperando.', uk: 'О ні! Моя сестра на мене чекає.' } },
      { kind: 'line', speaker: 'paul', text: { de: 'Sie können auch den Bus um zehn Uhr nehmen. Er fährt direkt vor dem Bahnhof ab.', en: 'You can also take the bus at ten o’clock. It leaves right in front of the station.', fr: 'Vous pouvez aussi prendre le bus de dix heures. Il part juste devant la gare.', it: 'Può anche prendere l’autobus delle dieci. Parte proprio davanti alla stazione.', es: 'También puede tomar el autobús de las diez. Sale justo delante de la estación.', pt: 'A senhora também pode pegar o ônibus das dez. Ele sai bem em frente à estação.', uk: 'Ви також можете сісти на автобус о десятій. Він відправляється просто перед вокзалом.' } },
      { kind: 'question', prompt: { de: 'Warum kommt der Zug zu spät?', en: 'Why is the train late?', fr: 'Pourquoi le train est-il en retard ?', it: 'Perché il treno è in ritardo?', es: '¿Por qué llega tarde el tren?', pt: 'Por que o trem está atrasado?', uk: 'Чому потяг запізнюється?' }, options: [
        { de: 'Es gibt ein technisches Problem.', en: 'There is a technical problem.', fr: 'Il y a un problème technique.', it: 'C’è un problema tecnico.', es: 'Hay un problema técnico.', pt: 'Há um problema técnico.', uk: 'Через технічну проблему.' },
        { de: 'Es schneit sehr stark.', en: 'It is snowing heavily.', fr: 'Il neige beaucoup.', it: 'Nevica molto.', es: 'Está nevando mucho.', pt: 'Está nevando muito.', uk: 'Іде сильний сніг.' },
        { de: 'Der Fahrer ist krank.', en: 'The driver is ill.', fr: 'Le conducteur est malade.', it: 'Il macchinista è malato.', es: 'El conductor está enfermo.', pt: 'O maquinista está doente.', uk: 'Машиніст захворів.' }
      ] },
      { kind: 'line', speaker: 'mia', text: { de: '{name}, was meinst du? Sollen wir den Bus nehmen oder warten?', en: '{name}, what do you think? Should we take the bus or wait?', fr: '{name}, qu’est-ce que tu en penses ? On prend le bus ou on attend ?', it: '{name}, che ne pensi? Prendiamo l’autobus o aspettiamo?', es: '{name}, ¿qué opinas? ¿Tomamos el autobús o esperamos?', pt: '{name}, o que você acha? Pegamos o ônibus ou esperamos?', uk: '{name}, як думаєш? Сядемо на автобус чи почекаємо?' } },
      { kind: 'reply', to: 'mia', options: [
        { de: 'Nehmen wir den Bus, dann sind wir schneller.', en: 'Let’s take the bus, then we’ll be faster.', fr: 'Prenons le bus, on ira plus vite.', it: 'Prendiamo l’autobus, così facciamo prima.', es: 'Tomemos el autobús, así llegamos antes.', pt: 'Vamos pegar o ônibus, assim chegamos mais rápido.', uk: 'Сядьмо на автобус, так буде швидше.' },
        { de: 'Ich habe gestern Pizza gegessen.', en: 'I ate pizza yesterday.', fr: 'J’ai mangé une pizza hier.', it: 'Ieri ho mangiato una pizza.', es: 'Ayer comí pizza.', pt: 'Ontem eu comi pizza.', uk: 'Учора на вечерю була піца.' },
        { de: 'Der Zug ist heute sehr pünktlich.', en: 'The train is very punctual today.', fr: 'Le train est très ponctuel aujourd’hui.', it: 'Oggi il treno è molto puntuale.', es: 'Hoy el tren es muy puntual.', pt: 'O trem está muito pontual hoje.', uk: 'Сьогодні потяг дуже пунктуальний.' }
      ] },
      { kind: 'line', speaker: 'mia', text: { de: 'Gute Idee! Ich schreibe schnell meiner Schwester.', en: 'Good idea! I’ll quickly text my sister.', fr: 'Bonne idée ! J’écris vite à ma sœur.', it: 'Buona idea! Scrivo subito a mia sorella.', es: '¡Buena idea! Le escribo rápido a mi hermana.', pt: 'Boa ideia! Vou mandar uma mensagem rápida para minha irmã.', uk: 'Гарна ідея! Швиденько напишу сестрі.' } },
      { kind: 'question', prompt: { de: 'Wohin möchte Mia fahren?', en: 'Where does Mia want to go?', fr: 'Où Mia veut-elle aller ?', it: 'Dove vuole andare Mia?', es: '¿Adónde quiere ir Mia?', pt: 'Para onde a Mia quer ir?', uk: 'Куди хоче поїхати Мія?' }, options: [
        { de: 'Nach Hamburg', en: 'To Hamburg', fr: 'À Hambourg', it: 'Ad Amburgo', es: 'A Hamburgo', pt: 'Para Hamburgo', uk: 'До Гамбурга' },
        { de: 'Nach Berlin', en: 'To Berlin', fr: 'À Berlin', it: 'A Berlino', es: 'A Berlín', pt: 'Para Berlim', uk: 'До Берліна' },
        { de: 'Nach München', en: 'To Munich', fr: 'À Munich', it: 'A Monaco', es: 'A Múnich', pt: 'Para Munique', uk: 'До Мюнхена' }
      ] },
      { kind: 'question', prompt: { de: 'Wie lange wartet Mia schon am Bahnhof?', en: 'How long has Mia already been waiting at the station?', fr: 'Depuis combien de temps Mia attend-elle à la gare ?', it: 'Da quanto tempo Mia aspetta in stazione?', es: '¿Cuánto tiempo lleva Mia esperando en la estación?', pt: 'Há quanto tempo a Mia está esperando na estação?', uk: 'Скільки часу Мія вже чекає на вокзалі?' }, options: [
        { de: 'Zwanzig Minuten', en: 'Twenty minutes', fr: 'Depuis vingt minutes', it: 'Da venti minuti', es: 'Veinte minutos', pt: 'Há vinte minutos', uk: 'Двадцять хвилин' },
        { de: 'Dreißig Minuten', en: 'Thirty minutes', fr: 'Depuis trente minutes', it: 'Da trenta minuti', es: 'Treinta minutos', pt: 'Há trinta minutos', uk: 'Тридцять хвилин' },
        { de: 'Eine Stunde', en: 'An hour', fr: 'Depuis une heure', it: 'Da un’ora', es: 'Una hora', pt: 'Há uma hora', uk: 'Годину' }
      ] },
      { kind: 'question', prompt: { de: 'Wen will Mia besuchen?', en: 'Who does Mia want to visit?', fr: 'Qui Mia veut-elle aller voir ?', it: 'Chi vuole andare a trovare Mia?', es: '¿A quién quiere visitar Mia?', pt: 'Quem a Mia quer visitar?', uk: 'Кого хоче відвідати Мія?' }, options: [
        { de: 'Ihre Schwester', en: 'Her sister', fr: 'Sa sœur', it: 'Sua sorella', es: 'A su hermana', pt: 'A irmã', uk: 'Сестру' },
        { de: 'Ihre Mutter', en: 'Her mother', fr: 'Sa mère', it: 'Sua madre', es: 'A su madre', pt: 'A mãe', uk: 'Маму' },
        { de: 'Ihren Bruder', en: 'Her brother', fr: 'Son frère', it: 'Suo fratello', es: 'A su hermano', pt: 'O irmão', uk: 'Брата' }
      ] },
      { kind: 'question', prompt: { de: 'Wann fährt der Bus ab?', en: 'When does the bus leave?', fr: 'À quelle heure part le bus ?', it: 'A che ora parte l’autobus?', es: '¿A qué hora sale el autobús?', pt: 'A que horas sai o ônibus?', uk: 'О котрій відправляється автобус?' }, options: [
        { de: 'Um zehn Uhr', en: 'At ten o’clock', fr: 'À dix heures', it: 'Alle dieci', es: 'A las diez', pt: 'Às dez', uk: 'О десятій' },
        { de: 'Um neun Uhr', en: 'At nine o’clock', fr: 'À neuf heures', it: 'Alle nove', es: 'A las nueve', pt: 'Às nove', uk: 'О дев’ятій' },
        { de: 'Um elf Uhr', en: 'At eleven o’clock', fr: 'À onze heures', it: 'Alle undici', es: 'A las once', pt: 'Às onze', uk: 'Об одинадцятій' }
      ] }
    ]
  },
  {
    id: 'a2-loud-morning',
    level: 'a2',
    scene: 'home',
    cast: ['mia', 'tom', 'lilith'],
    title: { de: 'Ein lauter Morgen', en: 'A noisy morning', fr: 'Un matin bruyant', it: 'Una mattina rumorosa', es: 'Una mañana ruidosa', pt: 'Uma manhã barulhenta', uk: 'Гучний ранок' },
    beats: [
      { kind: 'narration', text: { de: 'Es ist Sonntagmorgen. Mia macht Frühstück, und Lilith sitzt auf dem Küchentisch.', en: 'It is Sunday morning. Mia is making breakfast, and Lilith is sitting on the kitchen table.', fr: 'C’est dimanche matin. Mia prépare le petit-déjeuner et Lilith est assise sur la table de la cuisine.', it: 'È domenica mattina. Mia prepara la colazione e Lilith è seduta sul tavolo della cucina.', es: 'Es domingo por la mañana. Mia prepara el desayuno y Lilith está sentada en la mesa de la cocina.', pt: 'É domingo de manhã. A Mia está fazendo o café da manhã, e a Lilith está sentada na mesa da cozinha.', uk: 'Неділя, ранок. Мія готує сніданок, а Ліліт сидить на кухонному столі.' } },
      { kind: 'narration', sfx: 'glass', text: { de: 'Plötzlich – klirr! Ein Glas fällt auf den Boden.', en: 'Suddenly – crash! A glass falls on the floor.', fr: 'Soudain… crac ! Un verre tombe par terre.', it: 'All’improvviso… crash! Un bicchiere cade per terra.', es: 'De repente… ¡crac! Un vaso se cae al suelo.', pt: 'De repente… crash! Um copo cai no chão.', uk: 'Раптом – дзень! Склянка падає на підлогу.' } },
      { kind: 'line', speaker: 'mia', mood: 'surprised', text: { de: 'Lilith! Das war mein Lieblingsglas!', en: 'Lilith! That was my favourite glass!', fr: 'Lilith ! C’était mon verre préféré !', it: 'Lilith! Era il mio bicchiere preferito!', es: '¡Lilith! ¡Era mi vaso favorito!', pt: 'Lilith! Era o meu copo favorito!', uk: 'Ліліт! Це була моя улюблена склянка!' } },
      { kind: 'line', speaker: 'lilith', sfx: 'meow', mood: 'sad', text: { de: 'Miau …', en: 'Meow…', fr: 'Miaou…', it: 'Miao…', es: 'Miau…', pt: 'Miau…', uk: 'Няв…' } },
      { kind: 'line', speaker: 'tom', text: { de: 'Keine Sorge, ich hole den Besen. Pass auf, {name}, da liegen Scherben!', en: 'Don’t worry, I’ll get the broom. Careful, {name}, there are shards on the floor!', fr: 'Pas de souci, je vais chercher le balai. Attention, {name}, il y a des morceaux de verre !', it: 'Tranquilla, prendo la scopa. Attenzione, {name}, ci sono dei cocci!', es: 'Tranquila, voy a por la escoba. ¡Cuidado, {name}, hay cristales en el suelo!', pt: 'Não se preocupe, vou pegar a vassoura. Cuidado, {name}, tem cacos no chão!', uk: 'Не хвилюйся, я принесу віник. Обережно, {name}, тут уламки!' } },
      { kind: 'reply', to: 'tom', options: [
        { de: 'Danke, ich passe auf!', en: 'Thanks, I’ll be careful!', fr: 'Merci, je fais attention !', it: 'Grazie, faccio attenzione!', es: '¡Gracias, tendré cuidado!', pt: 'Valeu, vou tomar cuidado!', uk: 'Дякую, дивитимуся під ноги!' },
        { de: 'Ich esse die Scherben.', en: 'I’ll eat the shards.', fr: 'Je mange les morceaux de verre.', it: 'Mangio i cocci.', es: 'Me como los cristales.', pt: 'Eu como os cacos.', uk: 'Я з’їм уламки.' },
        { de: 'Das Glas ist sehr lecker.', en: 'The glass is very tasty.', fr: 'Le verre est très bon.', it: 'Il bicchiere è molto buono.', es: 'El vaso está muy rico.', pt: 'O copo é muito gostoso.', uk: 'Склянка дуже смачна.' }
      ] },
      { kind: 'narration', sfx: 'brakes', text: { de: 'Draußen bremst ein Auto ganz laut. Alle laufen zum Fenster.', en: 'Outside, a car brakes very loudly. Everyone runs to the window.', fr: 'Dehors, une voiture freine très fort. Tout le monde court à la fenêtre.', it: 'Fuori una macchina frena fortissimo. Tutti corrono alla finestra.', es: 'Fuera, un coche frena muy fuerte. Todos corren a la ventana.', pt: 'Lá fora, um carro freia muito forte. Todo mundo corre para a janela.', uk: 'Надворі голосно гальмує машина. Усі біжать до вікна.' } },
      { kind: 'line', speaker: 'tom', mood: 'happy', text: { de: 'Zum Glück ist nichts passiert. Eine Katze ist über die Straße gelaufen.', en: 'Luckily nothing happened. A cat ran across the street.', fr: 'Heureusement, il ne s’est rien passé. Un chat a traversé la rue.', it: 'Per fortuna non è successo niente. Un gatto ha attraversato la strada.', es: 'Por suerte no ha pasado nada. Un gato ha cruzado la calle.', pt: 'Ainda bem que não aconteceu nada. Um gato atravessou a rua.', uk: 'На щастя, нічого не сталося. Вулицю перебіг кіт.' } },
      { kind: 'line', speaker: 'mia', text: { de: 'Heute sind alle Katzen ein bisschen wild!', en: 'All the cats are a bit wild today!', fr: 'Aujourd’hui, tous les chats sont un peu fous !', it: 'Oggi tutti i gatti sono un po’ scatenati!', es: '¡Hoy todos los gatos están un poco locos!', pt: 'Hoje todos os gatos estão meio agitados!', uk: 'Сьогодні всі коти трохи дикі!' } },
      { kind: 'line', speaker: 'lilith', mood: 'happy', text: { de: 'Schnurr … Ich bin ganz brav.', en: 'Purr… I am very good.', fr: 'Ronron… Je suis très sage.', it: 'Ron ron… Io sono bravissima.', es: 'Rrrr… Yo soy muy buena.', pt: 'Rrrr… Eu sou muito boazinha.', uk: 'Мур… Я дуже чемна.' } },
      { kind: 'question', prompt: { de: 'Was ist auf den Boden gefallen?', en: 'What fell on the floor?', fr: 'Qu’est-ce qui est tombé par terre ?', it: 'Che cosa è caduto per terra?', es: '¿Qué se ha caído al suelo?', pt: 'O que caiu no chão?', uk: 'Що впало на підлогу?' }, options: [
        { de: 'Ein Glas', en: 'A glass', fr: 'Un verre', it: 'Un bicchiere', es: 'Un vaso', pt: 'Um copo', uk: 'Склянка' },
        { de: 'Ein Teller', en: 'A plate', fr: 'Une assiette', it: 'Un piatto', es: 'Un plato', pt: 'Um prato', uk: 'Тарілка' },
        { de: 'Ein Buch', en: 'A book', fr: 'Un livre', it: 'Un libro', es: 'Un libro', pt: 'Um livro', uk: 'Книжка' }
      ] },
      { kind: 'question', prompt: { de: 'Warum hat das Auto gebremst?', en: 'Why did the car brake?', fr: 'Pourquoi la voiture a-t-elle freiné ?', it: 'Perché la macchina ha frenato?', es: '¿Por qué ha frenado el coche?', pt: 'Por que o carro freou?', uk: 'Чому машина загальмувала?' }, options: [
        { de: 'Eine Katze ist über die Straße gelaufen.', en: 'A cat ran across the street.', fr: 'Un chat a traversé la rue.', it: 'Un gatto ha attraversato la strada.', es: 'Un gato ha cruzado la calle.', pt: 'Um gato atravessou a rua.', uk: 'Вулицю перебіг кіт.' },
        { de: 'Die Ampel war rot.', en: 'The traffic light was red.', fr: 'Le feu était rouge.', it: 'Il semaforo era rosso.', es: 'El semáforo estaba en rojo.', pt: 'O semáforo estava vermelho.', uk: 'Світлофор був червоний.' },
        { de: 'Tom stand auf der Straße.', en: 'Tom was standing in the street.', fr: 'Tom était au milieu de la rue.', it: 'Tom era in mezzo alla strada.', es: 'Tom estaba en la calle.', pt: 'O Tom estava no meio da rua.', uk: 'Том стояв на дорозі.' }
      ] },
      { kind: 'question', prompt: { de: 'Was macht Mia am Anfang?', en: 'What is Mia doing at the start?', fr: 'Que fait Mia au début ?', it: 'Che cosa fa Mia all’inizio?', es: '¿Qué hace Mia al principio?', pt: 'O que a Mia está fazendo no começo?', uk: 'Що робить Мія на початку?' }, options: [
        { de: 'Sie macht Frühstück.', en: 'She is making breakfast.', fr: 'Elle prépare le petit-déjeuner.', it: 'Prepara la colazione.', es: 'Prepara el desayuno.', pt: 'Está fazendo o café da manhã.', uk: 'Готує сніданок.' },
        { de: 'Sie schläft noch.', en: 'She is still sleeping.', fr: 'Elle dort encore.', it: 'Dorme ancora.', es: 'Todavía duerme.', pt: 'Ainda está dormindo.', uk: 'Ще спить.' },
        { de: 'Sie putzt die Küche.', en: 'She is cleaning the kitchen.', fr: 'Elle nettoie la cuisine.', it: 'Pulisce la cucina.', es: 'Limpia la cocina.', pt: 'Está limpando a cozinha.', uk: 'Прибирає кухню.' }
      ] },
      { kind: 'question', prompt: { de: 'Wo sitzt Lilith am Anfang?', en: 'Where is Lilith sitting at the start?', fr: 'Où est assise Lilith au début ?', it: 'Dov’è seduta Lilith all’inizio?', es: '¿Dónde está sentada Lilith al principio?', pt: 'Onde a Lilith está sentada no começo?', uk: 'Де сидить Ліліт на початку?' }, options: [
        { de: 'Auf dem Küchentisch', en: 'On the kitchen table', fr: 'Sur la table de la cuisine', it: 'Sul tavolo della cucina', es: 'En la mesa de la cocina', pt: 'Na mesa da cozinha', uk: 'На кухонному столі' },
        { de: 'Auf dem Sofa', en: 'On the sofa', fr: 'Sur le canapé', it: 'Sul divano', es: 'En el sofá', pt: 'No sofá', uk: 'На дивані' },
        { de: 'Auf dem Fensterbrett', en: 'On the windowsill', fr: 'Sur le rebord de la fenêtre', it: 'Sul davanzale', es: 'En la ventana', pt: 'Na janela', uk: 'На підвіконні' }
      ] },
      { kind: 'question', prompt: { de: 'Was holt Tom?', en: 'What does Tom get?', fr: 'Qu’est-ce que Tom va chercher ?', it: 'Che cosa prende Tom?', es: '¿Qué va a buscar Tom?', pt: 'O que o Tom vai pegar?', uk: 'Що принесе Том?' }, options: [
        { de: 'Den Besen', en: 'The broom', fr: 'Le balai', it: 'La scopa', es: 'La escoba', pt: 'A vassoura', uk: 'Віник' },
        { de: 'Den Staubsauger', en: 'The vacuum cleaner', fr: 'L’aspirateur', it: 'L’aspirapolvere', es: 'La aspiradora', pt: 'O aspirador', uk: 'Пилосос' },
        { de: 'Ein neues Glas', en: 'A new glass', fr: 'Un nouveau verre', it: 'Un bicchiere nuovo', es: 'Un vaso nuevo', pt: 'Um copo novo', uk: 'Нову склянку' }
      ] }
    ]
  },
  {
    id: 'a2-birthday',
    level: 'a2',
    scene: 'home',
    cast: ['leo', 'oma'],
    title: { de: 'Omas Geburtstag', en: 'Grandma’s birthday', fr: 'L’anniversaire de Mamie', it: 'Il compleanno della nonna', es: 'El cumpleaños de la abuela', pt: 'O aniversário da vovó', uk: 'День народження бабусі' },
    beats: [
      { kind: 'narration', text: { de: 'Heute hat Oma Geburtstag. Leo hat einen Kuchen gebacken, aber er hat den Zucker vergessen.', en: 'Today is Grandma’s birthday. Leo has baked a cake, but he forgot the sugar.', fr: 'Aujourd’hui, c’est l’anniversaire de Mamie. Léo a fait un gâteau, mais il a oublié le sucre.', it: 'Oggi è il compleanno della nonna. Leo ha preparato una torta, ma ha dimenticato lo zucchero.', es: 'Hoy es el cumpleaños de la abuela. Leo ha hecho un pastel, pero ha olvidado el azúcar.', pt: 'Hoje é aniversário da vovó. O Léo fez um bolo, mas esqueceu o açúcar.', uk: 'Сьогодні в бабусі день народження. Лео спік торт, але забув покласти цукор.' } },
      { kind: 'line', speaker: 'leo', text: { de: 'Alles Gute zum Geburtstag, Oma! Der Kuchen ist für dich.', en: 'Happy birthday, Grandma! The cake is for you.', fr: 'Joyeux anniversaire, Mamie ! Le gâteau est pour toi.', it: 'Buon compleanno, nonna! La torta è per te.', es: '¡Feliz cumpleaños, abuela! El pastel es para ti.', pt: 'Feliz aniversário, vovó! O bolo é para você.', uk: 'З днем народження, бабусю! Цей торт для тебе.' } },
      { kind: 'line', speaker: 'oma', text: { de: 'Danke, mein Schatz! Er sieht wunderbar aus.', en: 'Thank you, darling! It looks wonderful.', fr: 'Merci, mon chéri ! Il a l’air délicieux.', it: 'Grazie, tesoro! Ha un aspetto meraviglioso.', es: '¡Gracias, cariño! Tiene una pinta estupenda.', pt: 'Obrigada, meu querido! Ele parece maravilhoso.', uk: 'Дякую, любий! Він виглядає чудово.' } },
      { kind: 'narration', holds: { oma: 'cake' }, faces: { oma: 'worried', leo: 'curious' }, text: { de: 'Oma probiert ein Stück. Sie lächelt, aber dann trinkt sie schnell viel Wasser.', en: 'Grandma tries a piece. She smiles, but then she quickly drinks a lot of water.', fr: 'Mamie goûte un morceau. Elle sourit, puis elle boit vite beaucoup d’eau.', it: 'La nonna assaggia una fetta. Sorride, ma poi beve subito tanta acqua.', es: 'La abuela prueba un trozo. Sonríe, pero luego bebe mucha agua muy rápido.', pt: 'A vovó prova um pedaço. Ela sorri, mas depois bebe muita água bem rápido.', uk: 'Бабуся куштує шматочок. Вона усміхається, але потім швидко випиває багато води.' } },
      { kind: 'line', speaker: 'oma', mood: 'worried', text: { de: 'Hmm … sehr interessant. {name}, möchtest du auch ein Stück?', en: 'Hmm… very interesting. {name}, would you like a piece too?', fr: 'Hmm… très intéressant. {name}, tu en veux un morceau aussi ?', it: 'Mmm… molto interessante. {name}, ne vuoi una fetta anche tu?', es: 'Mmm… muy interesante. {name}, ¿quieres un trozo tú también?', pt: 'Hmm… muito interessante. {name}, você também quer um pedaço?', uk: 'Хм… дуже цікаво. {name}, хочеш і ти шматочок?' } },
      { kind: 'reply', to: 'oma', options: [
        { de: 'Gern! Und alles Gute zum Geburtstag!', en: 'Yes, please! And happy birthday!', fr: 'Avec plaisir ! Et joyeux anniversaire !', it: 'Volentieri! E buon compleanno!', es: '¡Sí, gracias! ¡Y feliz cumpleaños!', pt: 'Quero, sim! E feliz aniversário!', uk: 'Залюбки! І з днем народження!' },
        { de: 'Ja, heute ist mein Geburtstag!', en: 'Yes, today is my birthday!', fr: 'Oui, aujourd’hui c’est mon anniversaire !', it: 'Sì, oggi è il mio compleanno!', es: '¡Sí, hoy es mi cumpleaños!', pt: 'Sim, hoje é o meu aniversário!', uk: 'Так, сьогодні мій день народження!' },
        { de: 'Nein, ich fahre jetzt mit dem Zug.', en: 'No, I’m taking the train now.', fr: 'Non, je prends le train maintenant.', it: 'No, adesso prendo il treno.', es: 'No, ahora tomo el tren.', pt: 'Não, agora vou pegar o trem.', uk: 'Ні, я зараз їду потягом.' }
      ] },
      { kind: 'line', speaker: 'leo', text: { de: 'Oh nein … ich habe den Zucker vergessen!', en: 'Oh no… I forgot the sugar!', fr: 'Oh non… j’ai oublié le sucre !', it: 'Oh no… ho dimenticato lo zucchero!', es: '¡Oh, no… he olvidado el azúcar!', pt: 'Ah, não… eu esqueci o açúcar!', uk: 'О ні… я забув цукор!' } },
      { kind: 'line', speaker: 'oma', mood: 'laughing', text: { de: 'Das macht nichts. Wir essen ihn einfach mit Sahne.', en: 'Never mind. We’ll just eat it with cream.', fr: 'Ce n’est pas grave. On le mangera avec de la crème.', it: 'Non importa. La mangiamo con la panna.', es: 'No pasa nada. Nos lo comemos con nata.', pt: 'Não tem problema. A gente come com chantilly.', uk: 'Нічого страшного. З’їмо його з вершками.' } },
      { kind: 'question', prompt: { de: 'Was hat Leo vergessen?', en: 'What did Leo forget?', fr: 'Qu’est-ce que Léo a oublié ?', it: 'Che cosa ha dimenticato Leo?', es: '¿Qué ha olvidado Leo?', pt: 'O que o Léo esqueceu?', uk: 'Що забув Лео?' }, options: [
        { de: 'Den Zucker', en: 'The sugar', fr: 'Le sucre', it: 'Lo zucchero', es: 'El azúcar', pt: 'O açúcar', uk: 'Цукор' },
        { de: 'Die Eier', en: 'The eggs', fr: 'Les œufs', it: 'Le uova', es: 'Los huevos', pt: 'Os ovos', uk: 'Яйця' },
        { de: 'Das Geschenk', en: 'The present', fr: 'Le cadeau', it: 'Il regalo', es: 'El regalo', pt: 'O presente', uk: 'Подарунок' }
      ] },
      { kind: 'question', prompt: { de: 'Wie reagiert Oma?', en: 'How does Grandma react?', fr: 'Comment Mamie réagit-elle ?', it: 'Come reagisce la nonna?', es: '¿Cómo reacciona la abuela?', pt: 'Como a vovó reage?', uk: 'Як реагує бабуся?' }, options: [
        { de: 'Sie bleibt freundlich.', en: 'She stays friendly.', fr: 'Elle reste gentille.', it: 'Resta gentile.', es: 'Sigue siendo amable.', pt: 'Ela continua simpática.', uk: 'Вона лишається привітною.' },
        { de: 'Sie wird wütend.', en: 'She gets angry.', fr: 'Elle se met en colère.', it: 'Si arrabbia.', es: 'Se enfada.', pt: 'Ela fica brava.', uk: 'Вона сердиться.' },
        { de: 'Sie geht nach Hause.', en: 'She goes home.', fr: 'Elle rentre chez elle.', it: 'Torna a casa.', es: 'Se va a casa.', pt: 'Ela vai para casa.', uk: 'Вона йде додому.' }
      ] },
      { kind: 'question', prompt: { de: 'Für wen ist der Kuchen?', en: 'Who is the cake for?', fr: 'Pour qui est le gâteau ?', it: 'Per chi è la torta?', es: '¿Para quién es el pastel?', pt: 'Para quem é o bolo?', uk: 'Для кого цей торт?' }, options: [
        { de: 'Für Oma', en: 'For Grandma', fr: 'Pour Mamie', it: 'Per la nonna', es: 'Para la abuela', pt: 'Para a vovó', uk: 'Для бабусі' },
        { de: 'Für Leo', en: 'For Leo', fr: 'Pour Léo', it: 'Per Leo', es: 'Para Leo', pt: 'Para o Léo', uk: 'Для Лео' },
        { de: 'Für Mia', en: 'For Mia', fr: 'Pour Mia', it: 'Per Mia', es: 'Para Mia', pt: 'Para a Mia', uk: 'Для Мії' }
      ] },
      { kind: 'question', prompt: { de: 'Was trinkt Oma nach dem ersten Stück?', en: 'What does Grandma drink after the first piece?', fr: 'Que boit Mamie après le premier morceau ?', it: 'Che cosa beve la nonna dopo la prima fetta?', es: '¿Qué bebe la abuela después del primer trozo?', pt: 'O que a vovó bebe depois do primeiro pedaço?', uk: 'Що п’є бабуся після першого шматочка?' }, options: [
        { de: 'Viel Wasser', en: 'A lot of water', fr: 'Beaucoup d’eau', it: 'Tanta acqua', es: 'Mucha agua', pt: 'Muita água', uk: 'Багато води' },
        { de: 'Einen Kaffee', en: 'A coffee', fr: 'Un café', it: 'Un caffè', es: 'Un café', pt: 'Um café', uk: 'Каву' },
        { de: 'Ein Glas Wein', en: 'A glass of wine', fr: 'Un verre de vin', it: 'Un bicchiere di vino', es: 'Una copa de vino', pt: 'Uma taça de vinho', uk: 'Келих вина' }
      ] },
      { kind: 'question', prompt: { de: 'Womit essen sie den Kuchen?', en: 'What will they eat the cake with?', fr: 'Avec quoi vont-ils manger le gâteau ?', it: 'Con che cosa mangiano la torta?', es: '¿Con qué se comen el pastel?', pt: 'Com o que eles vão comer o bolo?', uk: 'З чим вони їстимуть торт?' }, options: [
        { de: 'Mit Sahne', en: 'With cream', fr: 'Avec de la crème', it: 'Con la panna', es: 'Con nata', pt: 'Com chantilly', uk: 'З вершками' },
        { de: 'Mit Eis', en: 'With ice cream', fr: 'Avec de la glace', it: 'Con il gelato', es: 'Con helado', pt: 'Com sorvete', uk: 'З морозивом' },
        { de: 'Mit Schokolade', en: 'With chocolate', fr: 'Avec du chocolat', it: 'Con il cioccolato', es: 'Con chocolate', pt: 'Com chocolate', uk: 'З шоколадом' }
      ] }
    ]
  },
  {
    id: 'b1-office',
    level: 'b1',
    scene: 'office',
    cast: ['mia', 'kim'],
    title: { de: 'Der erste Arbeitstag', en: 'The first day at work', fr: 'Le premier jour de travail', it: 'Il primo giorno di lavoro', es: 'El primer día de trabajo', pt: 'O primeiro dia de trabalho', uk: 'Перший робочий день' },
    beats: [
      { kind: 'narration', text: { de: 'Mia beginnt heute ihre neue Stelle in einem kleinen Architekturbüro. Sie ist nervös, weil sie dort noch niemanden kennt.', en: 'Today Mia starts her new job at a small architecture firm. She is nervous because she doesn’t know anyone there yet.', fr: 'Aujourd’hui, Mia commence son nouveau travail dans un petit cabinet d’architectes. Elle est nerveuse parce qu’elle n’y connaît encore personne.', it: 'Oggi Mia inizia il suo nuovo lavoro in un piccolo studio di architettura. È nervosa perché lì non conosce ancora nessuno.', es: 'Hoy Mia empieza su nuevo trabajo en un pequeño estudio de arquitectura. Está nerviosa porque todavía no conoce a nadie allí.', pt: 'Hoje a Mia começa no novo emprego, num pequeno escritório de arquitetura. Ela está nervosa porque ainda não conhece ninguém lá.', uk: 'Сьогодні Мія починає працювати в невеликому архітектурному бюро. Вона хвилюється, бо ще нікого там не знає.' } },
      { kind: 'line', speaker: 'kim', text: { de: 'Herzlich willkommen, Mia! Ich bin Kim und zeige dir heute alles. Hast du gut hergefunden?', en: 'Welcome, Mia! I’m Kim and I’ll show you everything today. Did you find us all right?', fr: 'Bienvenue, Mia ! Je suis Kim et je vais tout te montrer aujourd’hui. Tu as trouvé facilement ?', it: 'Benvenuta, Mia! Sono Kim e oggi ti faccio vedere tutto. Hai trovato facilmente la strada?', es: '¡Bienvenida, Mia! Soy Kim y hoy te voy a enseñar todo. ¿Has encontrado bien el sitio?', pt: 'Seja bem-vinda, Mia! Eu sou a Kim e hoje vou te mostrar tudo. Você achou o lugar facilmente?', uk: 'Ласкаво просимо, Міє! Я Кім, і сьогодні я все тобі покажу. Легко нас знайшла?' } },
      { kind: 'line', speaker: 'mia', text: { de: 'Ja, danke, obwohl der Bus ziemlich voll war.', en: 'Yes, thanks, although the bus was pretty full.', fr: 'Oui, merci, même si le bus était plutôt plein.', it: 'Sì, grazie, anche se l’autobus era piuttosto pieno.', es: 'Sí, gracias, aunque el autobús iba bastante lleno.', pt: 'Sim, obrigada, apesar de o ônibus estar bem cheio.', uk: 'Так, дякую, хоча автобус був досить переповнений.' } },
      { kind: 'line', speaker: 'kim', text: { de: 'Das ist morgens leider normal. Zuerst bekommst du deinen Laptop, und um elf haben wir eine Besprechung mit einem Kunden.', en: 'Unfortunately that’s normal in the mornings. First you’ll get your laptop, and at eleven we have a meeting with a client.', fr: 'C’est malheureusement normal le matin. D’abord, tu reçois ton ordinateur portable, et à onze heures nous avons une réunion avec un client.', it: 'Purtroppo la mattina è normale. Prima ricevi il tuo portatile, e alle undici abbiamo una riunione con un cliente.', es: 'Por desgracia, por la mañana es normal. Primero te damos tu portátil y a las once tenemos una reunión con un cliente.', pt: 'Infelizmente, de manhã é normal. Primeiro você recebe o seu notebook e às onze temos uma reunião com um cliente.', uk: 'На жаль, зранку це звична справа. Спершу ти отримаєш ноутбук, а об одинадцятій у нас зустріч із клієнтом.' } },
      { kind: 'question', prompt: { de: 'Warum ist Mia nervös?', en: 'Why is Mia nervous?', fr: 'Pourquoi Mia est-elle nerveuse ?', it: 'Perché Mia è nervosa?', es: '¿Por qué está nerviosa Mia?', pt: 'Por que a Mia está nervosa?', uk: 'Чому Мія хвилюється?' }, options: [
        { de: 'Sie kennt im Büro noch niemanden.', en: 'She doesn’t know anyone at the office yet.', fr: 'Elle ne connaît encore personne au bureau.', it: 'Non conosce ancora nessuno in ufficio.', es: 'Todavía no conoce a nadie en la oficina.', pt: 'Ela ainda não conhece ninguém no escritório.', uk: 'Вона ще нікого не знає в бюро.' },
        { de: 'Sie hat ihren Laptop vergessen.', en: 'She has forgotten her laptop.', fr: 'Elle a oublié son ordinateur portable.', it: 'Ha dimenticato il portatile.', es: 'Ha olvidado su portátil.', pt: 'Ela esqueceu o notebook.', uk: 'Вона забула ноутбук.' },
        { de: 'Sie hat den Bus verpasst.', en: 'She has missed the bus.', fr: 'Elle a raté le bus.', it: 'Ha perso l’autobus.', es: 'Ha perdido el autobús.', pt: 'Ela perdeu o ônibus.', uk: 'Вона спізнилася на автобус.' }
      ] },
      { kind: 'line', speaker: 'kim', text: { de: 'Übrigens arbeitet {name} auch in unserem Team. {name}, kannst du Mia nach der Besprechung die Kantine zeigen?', en: 'By the way, {name} is on our team too. {name}, could you show Mia the canteen after the meeting?', fr: 'D’ailleurs, {name} fait aussi partie de notre équipe. {name}, tu peux montrer la cantine à Mia après la réunion ?', it: 'A proposito, anche {name} lavora nel nostro team. {name}, puoi mostrare la mensa a Mia dopo la riunione?', es: 'Por cierto, {name} también trabaja en nuestro equipo. {name}, ¿puedes enseñarle el comedor a Mia después de la reunión?', pt: 'Aliás, {name} também trabalha na nossa equipe. {name}, você pode mostrar o refeitório para a Mia depois da reunião?', uk: 'До речі, {name} теж працює в нашій команді. {name}, покажеш Мії їдальню після зустрічі?' } },
      { kind: 'reply', to: 'kim', options: [
        { de: 'Klar, mache ich gern. Dann können wir zusammen Mittag essen.', en: 'Sure, happy to. Then we can have lunch together.', fr: 'Bien sûr, avec plaisir. Comme ça, on pourra déjeuner ensemble.', it: 'Certo, volentieri. Così possiamo pranzare insieme.', es: 'Claro, con mucho gusto. Así podemos comer juntos.', pt: 'Claro, com prazer. Aí a gente pode almoçar junto.', uk: 'Звісно, із задоволенням. Тоді зможемо разом пообідати.' },
        { de: 'Nein, ich habe keinen Laptop gekauft.', en: 'No, I haven’t bought a laptop.', fr: 'Non, je n’ai pas acheté d’ordinateur portable.', it: 'No, non ho comprato un portatile.', es: 'No, no he comprado ningún portátil.', pt: 'Não, eu não comprei nenhum notebook.', uk: 'Ні, я не купую ноутбук.' },
        { de: 'Die Besprechung gestern war sehr langweilig.', en: 'Yesterday’s meeting was very boring.', fr: 'La réunion d’hier était très ennuyeuse.', it: 'La riunione di ieri è stata noiosissima.', es: 'La reunión de ayer fue muy aburrida.', pt: 'A reunião de ontem foi muito chata.', uk: 'Учорашня зустріч була дуже нудна.' }
      ] },
      { kind: 'line', speaker: 'mia', text: { de: 'Das ist sehr nett, danke! Jetzt bin ich schon viel entspannter.', en: 'That’s really kind, thank you! I already feel much more relaxed.', fr: 'C’est très gentil, merci ! Je suis déjà beaucoup plus détendue.', it: 'Che gentile, grazie! Adesso sono già molto più tranquilla.', es: '¡Qué amable, gracias! Ya estoy mucho más tranquila.', pt: 'Que gentil, obrigada! Já estou bem mais tranquila.', uk: 'Дуже мило, дякую! Мені вже набагато спокійніше.' } },
      { kind: 'question', prompt: { de: 'Was passiert um elf Uhr?', en: 'What happens at eleven o’clock?', fr: 'Que se passe-t-il à onze heures ?', it: 'Che cosa succede alle undici?', es: '¿Qué pasa a las once?', pt: 'O que acontece às onze horas?', uk: 'Що відбудеться об одинадцятій?' }, options: [
        { de: 'Es gibt eine Besprechung mit einem Kunden.', en: 'There is a meeting with a client.', fr: 'Il y a une réunion avec un client.', it: 'C’è una riunione con un cliente.', es: 'Hay una reunión con un cliente.', pt: 'Há uma reunião com um cliente.', uk: 'Зустріч із клієнтом.' },
        { de: 'Mia bekommt ihren Laptop.', en: 'Mia gets her laptop.', fr: 'Mia reçoit son ordinateur portable.', it: 'Mia riceve il portatile.', es: 'Mia recibe su portátil.', pt: 'A Mia recebe o notebook.', uk: 'Мія отримує ноутбук.' },
        { de: 'Alle essen in der Kantine.', en: 'Everyone eats in the canteen.', fr: 'Tout le monde mange à la cantine.', it: 'Tutti mangiano in mensa.', es: 'Todos comen en el comedor.', pt: 'Todos almoçam no refeitório.', uk: 'Усі обідають в їдальні.' }
      ] },
      { kind: 'question', prompt: { de: 'Wo arbeitet Mia ab heute?', en: 'Where does Mia work from today?', fr: 'Où Mia travaille-t-elle à partir d’aujourd’hui ?', it: 'Dove lavora Mia da oggi?', es: '¿Dónde trabaja Mia a partir de hoy?', pt: 'Onde a Mia trabalha a partir de hoje?', uk: 'Де Мія працює відсьогодні?' }, options: [
        { de: 'In einem kleinen Architekturbüro', en: 'At a small architecture firm', fr: 'Dans un petit cabinet d’architectes', it: 'In un piccolo studio di architettura', es: 'En un pequeño estudio de arquitectura', pt: 'Num pequeno escritório de arquitetura', uk: 'У невеликому архітектурному бюро' },
        { de: 'In einer großen Bank', en: 'At a big bank', fr: 'Dans une grande banque', it: 'In una grande banca', es: 'En un banco grande', pt: 'Num banco grande', uk: 'У великому банку' },
        { de: 'In der Kantine', en: 'In the canteen', fr: 'À la cantine', it: 'In mensa', es: 'En el comedor', pt: 'No refeitório', uk: 'В їдальні' }
      ] },
      { kind: 'question', prompt: { de: 'Wie war Mias Weg zur Arbeit?', en: 'How was Mia’s journey to work?', fr: 'Comment s’est passé le trajet de Mia jusqu’au travail ?', it: 'Com’è stato il tragitto di Mia fino al lavoro?', es: '¿Qué tal fue el trayecto de Mia al trabajo?', pt: 'Como foi o caminho da Mia até o trabalho?', uk: 'Як Мія добиралася на роботу?' }, options: [
        { de: 'Der Bus war ziemlich voll.', en: 'The bus was pretty full.', fr: 'Le bus était plutôt plein.', it: 'L’autobus era piuttosto pieno.', es: 'El autobús iba bastante lleno.', pt: 'O ônibus estava bem cheio.', uk: 'Автобус був досить переповнений.' },
        { de: 'Sie hat sich verlaufen.', en: 'She got lost.', fr: 'Elle s’est perdue.', it: 'Si è persa.', es: 'Se perdió.', pt: 'Ela se perdeu.', uk: 'Вона заблукала.' },
        { de: 'Der Zug hatte Verspätung.', en: 'The train was late.', fr: 'Le train était en retard.', it: 'Il treno era in ritardo.', es: 'El tren llegó con retraso.', pt: 'O trem atrasou.', uk: 'Потяг запізнився.' }
      ] },
      { kind: 'question', prompt: { de: 'Wie fühlt sich Mia am Ende?', en: 'How does Mia feel at the end?', fr: 'Comment Mia se sent-elle à la fin ?', it: 'Come si sente Mia alla fine?', es: '¿Cómo se siente Mia al final?', pt: 'Como a Mia se sente no final?', uk: 'Як почувається Мія наприкінці?' }, options: [
        { de: 'Viel entspannter als vorher.', en: 'Much more relaxed than before.', fr: 'Beaucoup plus détendue qu’avant.', it: 'Molto più tranquilla di prima.', es: 'Mucho más tranquila que antes.', pt: 'Bem mais tranquila do que antes.', uk: 'Їй набагато спокійніше, ніж раніше.' },
        { de: 'Noch nervöser als am Morgen.', en: 'Even more nervous than in the morning.', fr: 'Encore plus nerveuse que le matin.', it: 'Ancora più nervosa di stamattina.', es: 'Todavía más nerviosa que por la mañana.', pt: 'Ainda mais nervosa do que de manhã.', uk: 'Вона хвилюється ще більше, ніж уранці.' },
        { de: 'Enttäuscht von ihrer neuen Stelle.', en: 'Disappointed with her new job.', fr: 'Déçue par son nouveau travail.', it: 'Delusa dal suo nuovo lavoro.', es: 'Decepcionada con su nuevo trabajo.', pt: 'Decepcionada com o novo emprego.', uk: 'Вона розчарована новою роботою.' }
      ] }
    ]
  },
  {
    id: 'b2-flat',
    level: 'b2',
    scene: 'flat',
    cast: ['leo', 'paul'],
    title: { de: 'Die Wohnungsbesichtigung', en: 'The flat viewing', fr: 'La visite de l’appartement', it: 'La visita dell’appartamento', es: 'La visita al piso', pt: 'A visita ao apartamento', uk: 'Огляд квартири' },
    beats: [
      { kind: 'narration', text: { de: 'Leo sucht seit Monaten eine bezahlbare Wohnung in der Innenstadt. Endlich hat er einen Besichtigungstermin bekommen – allerdings zusammen mit fünfzehn anderen Interessenten.', en: 'Leo has been looking for an affordable flat in the city centre for months. He has finally got a viewing — though along with fifteen other applicants.', fr: 'Depuis des mois, Léo cherche un appartement abordable en centre-ville. Il a enfin obtenu une visite — mais avec quinze autres candidats.', it: 'Da mesi Leo cerca un appartamento a un prezzo accessibile in centro. Finalmente ha ottenuto un appuntamento per una visita, però insieme ad altri quindici interessati.', es: 'Leo lleva meses buscando un piso asequible en el centro. Por fin ha conseguido una cita para verlo, aunque junto con otros quince interesados.', pt: 'Há meses o Léo procura um apartamento com preço acessível no centro. Finalmente conseguiu marcar uma visita — mas junto com outros quinze interessados.', uk: 'Лео вже кілька місяців шукає доступну квартиру в центрі міста. Нарешті він домовився про огляд — щоправда, разом із п’ятнадцятьма іншими охочими.' } },
      { kind: 'line', speaker: 'paul', text: { de: 'Die Wohnung ist frisch renoviert, und die Küche ist neu. Die Miete beträgt neunhundert Euro, Nebenkosten nicht inbegriffen.', en: 'The flat has just been renovated, and the kitchen is new. The rent is nine hundred euros, not including utilities.', fr: 'L’appartement vient d’être rénové et la cuisine est neuve. Le loyer est de neuf cents euros, charges non comprises.', it: 'L’appartamento è stato appena ristrutturato e la cucina è nuova. L’affitto è di novecento euro, spese escluse.', es: 'El piso está recién reformado y la cocina es nueva. El alquiler es de novecientos euros, gastos no incluidos.', pt: 'O apartamento acabou de ser reformado e a cozinha é nova. O aluguel é de novecentos euros, sem contar o condomínio.', uk: 'Квартиру щойно відремонтували, кухня нова. Оренда — дев’ятсот євро, комунальні послуги не включено.' } },
      { kind: 'line', speaker: 'leo', text: { de: 'Das klingt gut. Wäre es möglich, Haustiere zu halten? Ich habe nämlich einen Hund.', en: 'That sounds good. Would it be possible to keep pets? You see, I have a dog.', fr: 'Ça a l’air bien. Est-ce qu’il serait possible d’avoir des animaux ? J’ai un chien, en fait.', it: 'Sembra buono. Sarebbe possibile tenere animali? Ho un cane, infatti.', es: 'Suena bien. ¿Sería posible tener mascotas? Es que tengo un perro.', pt: 'Parece bom. Seria possível ter animais de estimação? É que eu tenho um cachorro.', uk: 'Звучить добре. А чи можна тримати домашніх тварин? Справа в тому, що в мене є собака.' } },
      { kind: 'line', speaker: 'paul', text: { de: 'Grundsätzlich ja, sofern er die Nachbarn nicht stört. Allerdings müsste ich vorher Ihre Gehaltsnachweise sehen.', en: 'In principle yes, as long as he doesn’t disturb the neighbours. However, I would need to see your proof of income first.', fr: 'En principe oui, à condition qu’il ne dérange pas les voisins. Cependant, il me faudrait d’abord vos justificatifs de revenus.', it: 'In linea di massima sì, purché non disturbi i vicini. Però prima dovrei vedere le sue buste paga.', es: 'En principio sí, siempre que no moleste a los vecinos. Eso sí, antes tendría que ver sus nóminas.', pt: 'A princípio, sim, desde que ele não incomode os vizinhos. Mas antes eu precisaria ver seus comprovantes de renda.', uk: 'В принципі так, якщо він не заважатиме сусідам. Але спершу мені потрібно побачити ваші довідки про доходи.' } },
      { kind: 'question', prompt: { de: 'Was ist in der Miete nicht enthalten?', en: 'What is not included in the rent?', fr: 'Qu’est-ce qui n’est pas compris dans le loyer ?', it: 'Che cosa non è compreso nell’affitto?', es: '¿Qué no está incluido en el alquiler?', pt: 'O que não está incluído no aluguel?', uk: 'Що не входить в оренду?' }, options: [
        { de: 'Die Nebenkosten', en: 'The utilities', fr: 'Les charges', it: 'Le spese', es: 'Los gastos', pt: 'O condomínio', uk: 'Комунальні послуги' },
        { de: 'Die neue Küche', en: 'The new kitchen', fr: 'La cuisine neuve', it: 'La cucina nuova', es: 'La cocina nueva', pt: 'A cozinha nova', uk: 'Нова кухня' },
        { de: 'Die Renovierung', en: 'The renovation', fr: 'La rénovation', it: 'La ristrutturazione', es: 'La reforma', pt: 'A reforma', uk: 'Ремонт' }
      ] },
      { kind: 'line', speaker: 'leo', text: { de: '{name}, du kennst dich doch mit Mietverträgen aus. Worauf sollte ich noch achten?', en: '{name}, you know your way around rental contracts. What else should I watch out for?', fr: '{name}, tu t’y connais en baux de location. À quoi est-ce que je dois encore faire attention ?', it: '{name}, tu te ne intendi di contratti d’affitto. A cos’altro dovrei fare attenzione?', es: '{name}, tú entiendes de contratos de alquiler. ¿En qué más debería fijarme?', pt: '{name}, você entende de contratos de aluguel. Em que mais eu deveria prestar atenção?', uk: '{name}, ти ж розбираєшся в договорах оренди. На що мені ще звернути увагу?' } },
      { kind: 'reply', to: 'leo', options: [
        { de: 'Frag am besten, wie hoch die Kaution ist und wie lange die Kündigungsfrist ist.', en: 'Best ask how high the deposit is and how long the notice period is.', fr: 'Demande plutôt le montant de la caution et la durée du préavis.', it: 'Chiedi quanto è la cauzione e quanto dura il preavviso per la disdetta.', es: 'Pregunta cuánto es la fianza y cuál es el plazo de preaviso.', pt: 'Pergunte qual é o valor do depósito caução e o prazo de aviso prévio.', uk: 'Краще запитай, яка застава і який термін попередження про розірвання договору.' },
        { de: 'Ich finde, Hunde sollten in Städten grundsätzlich verboten werden.', en: 'I think dogs should be banned from cities altogether.', fr: 'Je trouve que les chiens devraient être interdits en ville, point.', it: 'Secondo me i cani dovrebbero essere vietati in città, punto.', es: 'Creo que los perros deberían estar prohibidos en las ciudades y punto.', pt: 'Acho que cachorros deveriam ser proibidos nas cidades e pronto.', uk: 'Я вважаю, що собак у містах варто взагалі заборонити.' },
        { de: 'Die Wohnung wurde leider schon vor drei Jahren abgerissen.', en: 'Unfortunately the flat was demolished three years ago.', fr: 'Malheureusement, l’appartement a été démoli il y a trois ans.', it: 'Purtroppo l’appartamento è stato demolito tre anni fa.', es: 'Por desgracia, el piso fue derribado hace tres años.', pt: 'Infelizmente o apartamento foi demolido há três anos.', uk: 'На жаль, квартиру знесли ще три роки тому.' }
      ] },
      { kind: 'line', speaker: 'paul', text: { de: 'Berechtigte Frage. Die Kaution beträgt drei Monatsmieten.', en: 'Fair question. The deposit is three months’ rent.', fr: 'Bonne question. La caution correspond à trois mois de loyer.', it: 'Domanda legittima. La cauzione è di tre mensilità.', es: 'Buena pregunta. La fianza es de tres mensualidades.', pt: 'Boa pergunta. O depósito caução é de três aluguéis.', uk: 'Слушне питання. Застава становить три місячні оренди.' } },
      { kind: 'question', prompt: { de: 'Unter welcher Bedingung darf Leo seinen Hund mitbringen?', en: 'On what condition may Leo bring his dog?', fr: 'À quelle condition Léo peut-il emmener son chien ?', it: 'A quale condizione Leo può portare il suo cane?', es: '¿Con qué condición puede Leo traer a su perro?', pt: 'Com qual condição o Léo pode levar o cachorro?', uk: 'За якої умови Лео може тримати собаку?' }, options: [
        { de: 'Wenn der Hund die Nachbarn nicht stört.', en: 'If the dog doesn’t disturb the neighbours.', fr: 'Si le chien ne dérange pas les voisins.', it: 'Se il cane non disturba i vicini.', es: 'Si el perro no molesta a los vecinos.', pt: 'Se o cachorro não incomodar os vizinhos.', uk: 'Якщо собака не заважатиме сусідам.' },
        { de: 'Wenn er mehr Miete zahlt.', en: 'If he pays more rent.', fr: 'S’il paie un loyer plus élevé.', it: 'Se paga un affitto più alto.', es: 'Si paga más alquiler.', pt: 'Se ele pagar um aluguel mais alto.', uk: 'Якщо він платитиме більшу оренду.' },
        { de: 'Wenn der Hund sehr klein ist.', en: 'If the dog is very small.', fr: 'Si le chien est très petit.', it: 'Se il cane è molto piccolo.', es: 'Si el perro es muy pequeño.', pt: 'Se o cachorro for bem pequeno.', uk: 'Якщо собака дуже маленький.' }
      ] },
      { kind: 'question', prompt: { de: 'Warum ist es keineswegs sicher, dass Leo die Wohnung bekommt?', en: 'Why is it far from certain that Leo will get the flat?', fr: 'Pourquoi n’est-il pas du tout certain que Léo obtienne l’appartement ?', it: 'Perché non è affatto detto che Leo ottenga l’appartamento?', es: '¿Por qué no es nada seguro que Leo consiga el piso?', pt: 'Por que não é nada certo que o Léo vá conseguir o apartamento?', uk: 'Чому зовсім не певно, що Лео отримає квартиру?' }, options: [
        { de: 'Fünfzehn andere Interessenten wollen sie ebenfalls.', en: 'Fifteen other applicants want it too.', fr: 'Quinze autres candidats la veulent aussi.', it: 'Ci sono altri quindici interessati.', es: 'Hay otros quince interesados.', pt: 'Há outros quinze interessados.', uk: 'Її хочуть ще п’ятнадцять інших охочих.' },
        { de: 'Der Vermieter lehnt Haustiere grundsätzlich ab.', en: 'The landlord refuses pets on principle.', fr: 'Le propriétaire refuse les animaux par principe.', it: 'Il proprietario non accetta animali per principio.', es: 'El casero no admite mascotas por principio.', pt: 'O proprietário não aceita animais por princípio.', uk: 'Власник принципово не дозволяє тварин.' },
        { de: 'Die Wohnung muss erst noch renoviert werden.', en: 'The flat still has to be renovated.', fr: 'L’appartement doit encore être rénové.', it: 'L’appartamento deve ancora essere ristrutturato.', es: 'El piso todavía tiene que reformarse.', pt: 'O apartamento ainda precisa ser reformado.', uk: 'Квартиру ще треба відремонтувати.' }
      ] },
      { kind: 'question', prompt: { de: 'Was möchte Herr Paul vorher von Leo sehen?', en: 'What does Mr Paul want to see from Leo first?', fr: 'Que M. Paul veut-il d’abord voir de la part de Léo ?', it: 'Che cosa vuole vedere prima il Sig. Paul da Leo?', es: '¿Qué quiere ver antes el Sr. Paul de Leo?', pt: 'O que o Sr. Paul quer ver do Léo antes?', uk: 'Що пан Пауль хоче спершу побачити від Лео?' }, options: [
        { de: 'Seine Gehaltsnachweise', en: 'His proof of income', fr: 'Ses justificatifs de revenus', it: 'Le sue buste paga', es: 'Sus nóminas', pt: 'Os comprovantes de renda dele', uk: 'Його довідки про доходи' },
        { de: 'Ein Foto des Hundes', en: 'A photo of the dog', fr: 'Une photo du chien', it: 'Una foto del cane', es: 'Una foto del perro', pt: 'Uma foto do cachorro', uk: 'Фото собаки' },
        { de: 'Ein Empfehlungsschreiben des früheren Vermieters', en: 'A reference from his previous landlord', fr: 'Une lettre de recommandation de son ancien propriétaire', it: 'Una lettera di referenze del precedente proprietario', es: 'Una carta de recomendación de su anterior casero', pt: 'Uma carta de referência do antigo proprietário', uk: 'Рекомендаційний лист від попереднього орендодавця' }
      ] },
      { kind: 'question', prompt: { de: 'Wie hoch wäre die Kaution ungefähr?', en: 'Roughly how much would the deposit be?', fr: 'À combien s’élèverait la caution, à peu près ?', it: 'A quanto ammonterebbe più o meno la cauzione?', es: '¿De cuánto sería más o menos la fianza?', pt: 'De quanto seria mais ou menos o depósito caução?', uk: 'Приблизно скільки становила б застава?' }, options: [
        { de: '2 700 Euro', en: '2,700 euros', fr: '2 700 euros', it: '2.700 euro', es: '2700 euros', pt: '2.700 euros', uk: '2700 євро' },
        { de: '900 Euro', en: '900 euros', fr: '900 euros', it: '900 euro', es: '900 euros', pt: '900 euros', uk: '900 євро' },
        { de: '1 800 Euro', en: '1,800 euros', fr: '1 800 euros', it: '1.800 euro', es: '1800 euros', pt: '1.800 euros', uk: '1800 євро' }
      ] }
    ]
  },
  {
    id: 'c1-square',
    level: 'c1',
    scene: 'square',
    cast: ['mia', 'kim'],
    title: { de: 'Autofreie Altstadt?', en: 'A car-free old town?', fr: 'Une vieille ville sans voitures ?', it: 'Un centro storico senza auto?', es: '¿Un casco antiguo sin coches?', pt: 'Um centro histórico sem carros?', uk: 'Старе місто без авто?' },
    beats: [
      { kind: 'narration', text: { de: 'Im Stadtrat wird seit Wochen darüber debattiert, ob die Altstadt autofrei werden soll. Auch Mia und Kim sind sich in dieser Frage alles andere als einig.', en: 'For weeks the city council has been debating whether the old town should go car-free. Mia and Kim, too, are anything but in agreement on the issue.', fr: 'Depuis des semaines, le conseil municipal débat de la question : faut-il interdire les voitures dans la vieille ville ? Mia et Kim, elles non plus, sont loin d’être d’accord.', it: 'Da settimane il consiglio comunale discute se il centro storico debba diventare zona pedonale. Anche Mia e Kim sono tutt’altro che d’accordo sulla questione.', es: 'Desde hace semanas, el ayuntamiento debate si el casco antiguo debe quedar libre de coches. Mia y Kim tampoco se ponen de acuerdo, ni mucho menos.', pt: 'Há semanas a câmara municipal debate se o centro histórico deve ficar livre de carros. A Mia e a Kim também estão longe de concordar sobre o assunto.', uk: 'Міська рада вже кілька тижнів сперечається, чи варто закрити старе місто для автомобілів. Мія і Кім у цьому питанні теж аж ніяк не одностайні.' } },
      { kind: 'line', speaker: 'mia', text: { de: 'Ich halte das für längst überfällig. Weniger Lärm, bessere Luft – davon würden doch alle profitieren.', en: 'I think it’s long overdue. Less noise, cleaner air — surely everyone would benefit from that.', fr: 'Pour moi, c’est une mesure qui se fait attendre depuis longtemps. Moins de bruit, un air plus pur : tout le monde y gagnerait.', it: 'Secondo me è una misura attesa da tempo. Meno rumore, aria più pulita: ne trarrebbero vantaggio tutti.', es: 'A mi parecer, ya iba siendo hora. Menos ruido, aire más limpio… todos saldríamos ganando.', pt: 'Acho que isso já devia ter acontecido há muito tempo. Menos barulho, ar mais limpo — todo mundo sairia ganhando.', uk: 'Як на мене, це давно назріло. Менше шуму, чистіше повітря — від цього виграли б усі.' } },
      { kind: 'line', speaker: 'kim', text: { de: 'Mag sein, aber du unterschätzt, wie sehr die kleinen Geschäfte auf Kundschaft mit dem Auto angewiesen sind. Viele würden das kaum verkraften.', en: 'Maybe, but you underestimate how much the small shops depend on customers who come by car. Many of them could hardly cope.', fr: 'Peut-être, mais tu sous-estimes à quel point les petits commerces dépendent des clients qui viennent en voiture. Beaucoup auraient du mal à s’en remettre.', it: 'Può darsi, ma sottovaluti quanto i piccoli negozi dipendano dai clienti che arrivano in auto. Molti non reggerebbero il colpo.', es: 'Puede ser, pero subestimas lo mucho que dependen las tiendas pequeñas de los clientes que llegan en coche. Muchas no lo soportarían.', pt: 'Pode ser, mas você subestima o quanto as pequenas lojas dependem de clientes que chegam de carro. Muitas mal aguentariam.', uk: 'Можливо, але ти недооцінюєш, наскільки маленькі крамниці залежать від покупців, які приїжджають автівкою. Багато хто цього просто не витримає.' } },
      { kind: 'line', speaker: 'mia', text: { de: 'Studien aus anderen Städten deuten eher auf das Gegenteil hin: Fußgänger bleiben länger und geben mehr aus.', en: 'Studies from other cities rather suggest the opposite: pedestrians stay longer and spend more.', fr: 'Les études menées dans d’autres villes suggèrent plutôt le contraire : les piétons restent plus longtemps et dépensent davantage.', it: 'Gli studi condotti in altre città indicano piuttosto il contrario: i pedoni si fermano più a lungo e spendono di più.', es: 'Los estudios de otras ciudades apuntan más bien a lo contrario: los peatones se quedan más tiempo y gastan más.', pt: 'Estudos de outras cidades apontam justamente o contrário: os pedestres ficam mais tempo e gastam mais.', uk: 'Дослідження з інших міст свідчать радше про протилежне: пішоходи затримуються довше й витрачають більше.' } },
      { kind: 'question', prompt: { de: 'Welche Befürchtung äußert Kim?', en: 'What concern does Kim raise?', fr: 'Quelle crainte Kim exprime-t-elle ?', it: 'Quale timore esprime Kim?', es: '¿Qué temor expresa Kim?', pt: 'Que receio a Kim manifesta?', uk: 'Яке побоювання висловлює Кім?' }, options: [
        { de: 'Dass die kleinen Geschäfte Kundschaft verlieren.', en: 'That the small shops will lose customers.', fr: 'Que les petits commerces perdent des clients.', it: 'Che i piccoli negozi perdano clienti.', es: 'Que las tiendas pequeñas pierdan clientes.', pt: 'Que as pequenas lojas percam clientes.', uk: 'Що маленькі крамниці втратять покупців.' },
        { de: 'Dass die Luft in der Altstadt schlechter wird.', en: 'That the air in the old town will get worse.', fr: 'Que l’air de la vieille ville se dégrade.', it: 'Che l’aria del centro storico peggiori.', es: 'Que el aire del casco antiguo empeore.', pt: 'Que o ar do centro histórico piore.', uk: 'Що повітря в старому місті погіршиться.' },
        { de: 'Dass die Studien gefälscht sind.', en: 'That the studies have been faked.', fr: 'Que les études soient truquées.', it: 'Che gli studi siano falsificati.', es: 'Que los estudios estén falseados.', pt: 'Que os estudos sejam falsos.', uk: 'Що дослідження сфальсифіковані.' }
      ] },
      { kind: 'line', speaker: 'kim', text: { de: '{name}, du hältst dich bisher auffällig zurück. Auf wessen Seite stehst du?', en: '{name}, you’ve been suspiciously quiet so far. Whose side are you on?', fr: '{name}, jusqu’ici tu n’as presque rien dit. Tu es de quel côté ?', it: '{name}, finora non hai detto quasi niente. Da che parte stai?', es: '{name}, hasta ahora te has mantenido sospechosamente al margen. ¿De parte de quién estás?', pt: '{name}, até agora você quase não disse nada. De que lado você está?', uk: '{name}, ти досі підозріло мовчиш. На чиєму ти боці?' } },
      { kind: 'reply', to: 'kim', options: [
        { de: 'Ich sehe beide Seiten – vielleicht wäre eine schrittweise Einführung mit Ausnahmen für den Lieferverkehr ein Kompromiss.', en: 'I can see both sides — perhaps phasing it in gradually, with exceptions for deliveries, would be a compromise.', fr: 'Je comprends les deux points de vue — une mise en place progressive, avec des exceptions pour les livraisons, pourrait être un compromis.', it: 'Capisco entrambe le posizioni: forse un’introduzione graduale, con eccezioni per le consegne, sarebbe un buon compromesso.', es: 'Entiendo a las dos: quizá una implantación gradual, con excepciones para el reparto, sería un buen término medio.', pt: 'Entendo os dois lados — talvez uma implantação gradual, com exceções para as entregas, fosse um meio-termo.', uk: 'Я бачу обидві сторони — можливо, компромісом стало б поступове запровадження з винятками для доставки.' },
        { de: 'Ganz klar auf deiner Seite, denn laut den Studien geben Fußgänger weniger Geld aus.', en: 'Definitely yours, because according to the studies pedestrians spend less money.', fr: 'Clairement du tien, puisque d’après les études les piétons dépensent moins.', it: 'Senza dubbio dalla tua, perché secondo gli studi i pedoni spendono di meno.', es: 'Sin duda de la tuya, porque según los estudios los peatones gastan menos.', pt: 'Com certeza do seu, porque segundo os estudos os pedestres gastam menos.', uk: 'Однозначно на твоєму, бо, за дослідженнями, пішоходи витрачають менше.' },
        { de: 'Auf Mias Seite – schließlich wird der Lärm durch mehr Autos ja geringer.', en: 'On Mia’s — after all, more cars means less noise.', fr: 'Du côté de Mia — après tout, plus de voitures, c’est moins de bruit.', it: 'Da quella di Mia: dopotutto, più auto significano meno rumore.', es: 'De parte de Mia; al fin y al cabo, más coches significa menos ruido.', pt: 'Do lado da Mia — afinal, mais carros significam menos barulho.', uk: 'На боці Мії — зрештою, більше машин означає менше шуму.' }
      ] },
      { kind: 'line', speaker: 'mia', text: { de: 'Damit könnte ich leben – vorausgesetzt, es bleibt nicht bei leeren Versprechungen.', en: 'I could live with that — provided it doesn’t end up as empty promises.', fr: 'Je pourrais m’en accommoder — à condition que ça ne reste pas des promesses en l’air.', it: 'Potrei accettarlo, a patto che non restino promesse vuote.', es: 'Podría vivir con eso, siempre que no se quede en promesas vacías.', pt: 'Eu poderia aceitar isso — desde que não fique só em promessas vazias.', uk: 'З цим я могла б погодитися — за умови, що все не обмежиться порожніми обіцянками.' } },
      { kind: 'question', prompt: { de: 'Worauf stützt Mia ihr Argument?', en: 'What does Mia base her argument on?', fr: 'Sur quoi Mia appuie-t-elle son argument ?', it: 'Su che cosa basa Mia il suo argomento?', es: '¿En qué basa Mia su argumento?', pt: 'Em que a Mia baseia o seu argumento?', uk: 'На що спирається Мія у своєму аргументі?' }, options: [
        { de: 'Auf Studien aus anderen Städten', en: 'Studies from other cities', fr: 'Sur des études menées dans d’autres villes', it: 'Su studi condotti in altre città', es: 'En estudios de otras ciudades', pt: 'Em estudos de outras cidades', uk: 'На дослідження з інших міст' },
        { de: 'Auf eine Umfrage unter Geschäftsleuten', en: 'A survey of shop owners', fr: 'Sur un sondage auprès des commerçants', it: 'Su un sondaggio tra i commercianti', es: 'En una encuesta a comerciantes', pt: 'Em uma pesquisa com comerciantes', uk: 'На опитування підприємців' },
        { de: 'Auf ihre Erfahrung als Autofahrerin', en: 'Her experience as a driver', fr: 'Sur son expérience de conductrice', it: 'Sulla sua esperienza di automobilista', es: 'En su experiencia como conductora', pt: 'Em sua experiência como motorista', uk: 'На власний досвід водійки' }
      ] },
      { kind: 'question', prompt: { de: 'Was meint Mia, wenn sie die autofreie Altstadt für „längst überfällig“ hält?', en: 'What does Mia mean when she calls a car-free old town “long overdue”?', fr: 'Que veut dire Mia quand elle affirme que cette mesure « se fait attendre depuis longtemps » ?', it: 'Che cosa intende Mia quando dice che è una misura «attesa da tempo»?', es: '¿Qué quiere decir Mia con «ya iba siendo hora»?', pt: 'O que a Mia quer dizer quando afirma que isso “já devia ter acontecido há muito tempo”?', uk: 'Що має на увазі Мія, коли каже, що це «давно назріло»?' }, options: [
        { de: 'Die Maßnahme hätte schon viel früher kommen sollen.', en: 'The measure should have come much sooner.', fr: 'La mesure aurait dû être prise bien plus tôt.', it: 'Il provvedimento sarebbe dovuto arrivare molto prima.', es: 'La medida debería haber llegado mucho antes.', pt: 'A medida deveria ter vindo muito antes.', uk: 'Цей захід слід було запровадити набагато раніше.' },
        { de: 'Die Entscheidung kommt zu früh und ist übereilt.', en: 'The decision comes too early and is rushed.', fr: 'La décision arrive trop tôt et elle est précipitée.', it: 'La decisione arriva troppo presto ed è affrettata.', es: 'La decisión llega demasiado pronto y es precipitada.', pt: 'A decisão chega cedo demais e é precipitada.', uk: 'Рішення передчасне й поспішне.' },
        { de: 'Der Stadtrat hat eine Frist versäumt.', en: 'The city council has missed a deadline.', fr: 'Le conseil municipal a laissé passer un délai.', it: 'Il consiglio comunale ha mancato una scadenza.', es: 'El ayuntamiento ha dejado pasar un plazo.', pt: 'A câmara municipal perdeu um prazo.', uk: 'Міська рада пропустила кінцевий термін.' }
      ] },
      { kind: 'question', prompt: { de: 'Welche Vorteile verspricht sich Mia von einer autofreien Altstadt?', en: 'What benefits does Mia expect from a car-free old town?', fr: 'Quels avantages Mia attend-elle d’une vieille ville sans voitures ?', it: 'Quali vantaggi si aspetta Mia da un centro storico senza auto?', es: '¿Qué ventajas espera Mia de un casco antiguo sin coches?', pt: 'Que vantagens a Mia espera de um centro histórico sem carros?', uk: 'Яких переваг Мія очікує від старого міста без авто?' }, options: [
        { de: 'Weniger Lärm und bessere Luft', en: 'Less noise and cleaner air', fr: 'Moins de bruit et un air plus pur', it: 'Meno rumore e aria più pulita', es: 'Menos ruido y aire más limpio', pt: 'Menos barulho e ar mais limpo', uk: 'Менше шуму й чистіше повітря' },
        { de: 'Mehr Parkplätze und kürzere Wege', en: 'More parking spaces and shorter journeys', fr: 'Plus de places de stationnement et des trajets plus courts', it: 'Più parcheggi e tragitti più brevi', es: 'Más aparcamiento y trayectos más cortos', pt: 'Mais vagas de estacionamento e trajetos mais curtos', uk: 'Більше паркувальних місць і коротші маршрути' },
        { de: 'Niedrigere Mieten für die Geschäfte', en: 'Lower rents for the shops', fr: 'Des loyers plus bas pour les commerces', it: 'Affitti più bassi per i negozi', es: 'Alquileres más bajos para las tiendas', pt: 'Aluguéis mais baixos para as lojas', uk: 'Нижчу орендну плату для крамниць' }
      ] },
      { kind: 'question', prompt: { de: 'Unter welchem Vorbehalt könnte sich Mia mit dem Kompromiss anfreunden?', en: 'On what condition could Mia come to terms with the compromise?', fr: 'À quelle condition Mia pourrait-elle s’accommoder du compromis ?', it: 'A quale condizione Mia potrebbe accettare il compromesso?', es: '¿Con qué condición podría Mia aceptar el término medio?', pt: 'Com qual condição a Mia poderia aceitar o meio-termo?', uk: 'За якої умови Мія могла б погодитися на компроміс?' }, options: [
        { de: 'Dass es nicht bei leeren Versprechungen bleibt.', en: 'That it doesn’t end up as empty promises.', fr: 'Que ça ne reste pas des promesses en l’air.', it: 'Che non restino promesse vuote.', es: 'Que no se quede en promesas vacías.', pt: 'Que não fique só em promessas vazias.', uk: 'Щоб усе не обмежилося порожніми обіцянками.' },
        { de: 'Dass auch der Lieferverkehr vollständig verbannt wird.', en: 'That deliveries are banned completely as well.', fr: 'Que les livraisons soient elles aussi totalement interdites.', it: 'Che vengano vietate del tutto anche le consegne.', es: 'Que también se prohíba por completo el reparto.', pt: 'Que as entregas também sejam totalmente proibidas.', uk: 'Щоб доставку теж повністю заборонили.' },
        { de: 'Dass Kim öffentlich zugibt, im Unrecht zu sein.', en: 'That Kim publicly admits she was wrong.', fr: 'Que Kim reconnaisse publiquement qu’elle avait tort.', it: 'Che Kim ammetta pubblicamente di avere torto.', es: 'Que Kim admita públicamente que se equivocaba.', pt: 'Que a Kim admita publicamente que estava errada.', uk: 'Щоб Кім публічно визнала, що помилялася.' }
      ] }
    ]
  },
  {
    id: 'c2-attic',
    level: 'c2',
    scene: 'attic',
    cast: ['leo', 'oma'],
    title: { de: 'Das Manuskript', en: 'The manuscript', fr: 'Le manuscrit', it: 'Il manoscritto', es: 'El manuscrito', pt: 'O manuscrito', uk: 'Рукопис' },
    beats: [
      { kind: 'narration', text: { de: 'Beim Ausräumen des Dachbodens stößt Leo auf ein vergilbtes Manuskript, das offenbar seinem Urgroßvater gehört hat. Die Handschrift ist kaum zu entziffern.', en: 'While clearing out the attic, Leo comes across a yellowed manuscript that apparently belonged to his great-grandfather. The handwriting is barely legible.', fr: 'En débarrassant le grenier, Léo tombe sur un manuscrit jauni qui a manifestement appartenu à son arrière-grand-père. L’écriture est presque indéchiffrable.', it: 'Mentre sgombera la soffitta, Leo si imbatte in un manoscritto ingiallito che a quanto pare apparteneva al suo bisnonno. La calligrafia è quasi indecifrabile.', es: 'Mientras vacía el desván, Leo se topa con un manuscrito amarillento que, al parecer, perteneció a su bisabuelo. La letra es casi indescifrable.', pt: 'Ao esvaziar o sótão, o Léo se depara com um manuscrito amarelado que, ao que tudo indica, pertenceu ao bisavô dele. A letra é quase indecifrável.', uk: 'Розбираючи горище, Лео натрапляє на пожовклий рукопис, який, вочевидь, належав його прадідові. Почерк ледве можна розібрати.' } },
      { kind: 'line', speaker: 'leo', text: { de: 'Oma, schau mal! Weißt du, was es damit auf sich hat?', en: 'Grandma, look! Do you know what this is all about?', fr: 'Mamie, regarde ! Tu sais ce que c’est ?', it: 'Nonna, guarda! Sai di che cosa si tratta?', es: '¡Abuela, mira! ¿Sabes qué es esto?', pt: 'Vovó, olha só! Você sabe que história é essa?', uk: 'Бабусю, глянь! Ти знаєш, що це таке?' } },
      { kind: 'line', speaker: 'oma', text: { de: 'Ach du meine Güte … Dein Urgroßvater hat jahrzehntelang an einem Roman gefeilt, ihn aber nie veröffentlicht. Er hielt ihn stets für unvollendet.', en: 'Goodness me… Your great-grandfather polished a novel for decades but never published it. He always considered it unfinished.', fr: 'Mon Dieu… Ton arrière-grand-père a peaufiné un roman pendant des décennies sans jamais le publier. Il l’a toujours jugé inachevé.', it: 'Santo cielo… Il tuo bisnonno ha limato un romanzo per decenni, ma non l’ha mai pubblicato. L’ha sempre considerato incompiuto.', es: 'Madre mía… Tu bisabuelo estuvo puliendo una novela durante décadas, pero nunca la publicó. Siempre la consideró inacabada.', pt: 'Minha nossa… Seu bisavô passou décadas lapidando um romance, mas nunca o publicou. Ele sempre o considerou inacabado.', uk: 'Боже мій… Твій прадід десятиліттями шліфував роман, але так і не видав його. Він завжди вважав його незавершеним.' } },
      { kind: 'line', speaker: 'leo', text: { de: 'Unvollendet? Auf der letzten Seite steht aber unmissverständlich „Ende“.', en: 'Unfinished? But the last page says “The End” in no uncertain terms.', fr: 'Inachevé ? Pourtant, la dernière page indique sans équivoque « Fin ».', it: 'Incompiuto? Eppure sull’ultima pagina c’è scritto chiaramente «Fine».', es: '¿Inacabada? Pues en la última página pone bien claro «Fin».', pt: 'Inacabado? Mas na última página está escrito, sem deixar dúvidas, “Fim”.', uk: 'Незавершеним? Але ж на останній сторінці чітко написано «Кінець».' } },
      { kind: 'line', speaker: 'oma', text: { de: 'Mag sein – aber für ihn war ein Werk nie wirklich abgeschlossen. Perfektionismus lag bei uns gewissermaßen in der Familie.', en: 'Perhaps — but for him a work was never truly finished. Perfectionism ran in the family, so to speak.', fr: 'Peut-être — mais pour lui, une œuvre n’était jamais vraiment terminée. Le perfectionnisme, c’est pour ainsi dire une affaire de famille.', it: 'Può darsi, ma per lui un’opera non era mai davvero conclusa. Il perfezionismo, per così dire, ce l’abbiamo nel sangue.', es: 'Puede ser, pero para él una obra nunca estaba realmente terminada. El perfeccionismo, por así decirlo, nos viene de familia.', pt: 'Pode ser — mas, para ele, uma obra nunca estava realmente concluída. O perfeccionismo, por assim dizer, é de família.', uk: 'Можливо, — але для нього жоден твір не був по-справжньому завершеним. Перфекціонізм у нас, так би мовити, родинна риса.' } },
      { kind: 'question', prompt: { de: 'Warum wurde der Roman nie veröffentlicht?', en: 'Why was the novel never published?', fr: 'Pourquoi le roman n’a-t-il jamais été publié ?', it: 'Perché il romanzo non è mai stato pubblicato?', es: '¿Por qué nunca se publicó la novela?', pt: 'Por que o romance nunca foi publicado?', uk: 'Чому роман так і не видали?' }, options: [
        { de: 'Der Urgroßvater hielt ihn trotz allem für unvollendet.', en: 'The great-grandfather considered it unfinished despite everything.', fr: 'L’arrière-grand-père le jugeait inachevé malgré tout.', it: 'Il bisnonno lo considerava incompiuto nonostante tutto.', es: 'El bisabuelo la consideraba inacabada a pesar de todo.', pt: 'O bisavô o considerava inacabado apesar de tudo.', uk: 'Прадід попри все вважав його незавершеним.' },
        { de: 'Kein Verlag wollte ihn haben.', en: 'No publisher wanted it.', fr: 'Aucun éditeur n’en voulait.', it: 'Nessun editore lo voleva.', es: 'Ninguna editorial la quiso.', pt: 'Nenhuma editora o quis.', uk: 'Жодне видавництво його не хотіло.' },
        { de: 'Die letzte Seite fehlte.', en: 'The last page was missing.', fr: 'La dernière page manquait.', it: 'Mancava l’ultima pagina.', es: 'Faltaba la última página.', pt: 'Faltava a última página.', uk: 'Бракувало останньої сторінки.' }
      ] },
      { kind: 'line', speaker: 'leo', text: { de: '{name}, du hast doch Kontakte zu einem Verlag. Meinst du, man sollte das posthum herausbringen?', en: '{name}, you have contacts at a publishing house. Do you think it should be published posthumously?', fr: '{name}, tu as des contacts dans une maison d’édition. Tu crois qu’il faudrait le publier à titre posthume ?', it: '{name}, tu hai dei contatti in una casa editrice. Pensi che andrebbe pubblicato postumo?', es: '{name}, tú tienes contactos en una editorial. ¿Crees que habría que publicarla de forma póstuma?', pt: '{name}, você tem contatos numa editora. Acha que valeria a pena publicá-lo postumamente?', uk: '{name}, у тебе ж є знайомі у видавництві. Як думаєш, варто видати його посмертно?' } },
      { kind: 'reply', to: 'leo', options: [
        { de: 'Durchaus denkbar – man müsste allerdings abwägen, ob das nicht seinem Willen zuwiderliefe.', en: 'Quite conceivable — though we’d have to weigh up whether it might go against his wishes.', fr: 'C’est tout à fait envisageable — encore faudrait-il se demander si cela n’irait pas à l’encontre de sa volonté.', it: 'È senz’altro possibile, ma bisognerebbe valutare se non andrebbe contro la sua volontà.', es: 'Es perfectamente posible, aunque habría que sopesar si eso no iría en contra de su voluntad.', pt: 'É bem possível — mas seria preciso ponderar se isso não iria contra a vontade dele.', uk: 'Цілком можливо, — хоча слід було б зважити, чи не суперечитиме це його волі.' },
        { de: 'Unbedingt, zumal er den Roman ja ausdrücklich zur Veröffentlichung freigegeben hat.', en: 'Absolutely, especially since he explicitly approved the novel for publication.', fr: 'Absolument, d’autant qu’il a expressément autorisé la publication du roman.', it: 'Assolutamente, tanto più che aveva espressamente autorizzato la pubblicazione del romanzo.', es: 'Sin duda, sobre todo porque él autorizó expresamente la publicación de la novela.', pt: 'Com certeza, até porque ele autorizou expressamente a publicação do romance.', uk: 'Безумовно, тим паче що він прямо дозволив видати роман.' },
        { de: 'Keinesfalls, denn die Handschrift ist ja tadellos lesbar.', en: 'Certainly not, since the handwriting is perfectly legible.', fr: 'Surtout pas, puisque l’écriture est parfaitement lisible.', it: 'Assolutamente no, dato che la calligrafia è perfettamente leggibile.', es: 'De ninguna manera, ya que la letra es perfectamente legible.', pt: 'De jeito nenhum, já que a letra é perfeitamente legível.', uk: 'У жодному разі, адже почерк бездоганно розбірливий.' }
      ] },
      { kind: 'line', speaker: 'oma', text: { de: 'Ein berechtigter Einwand. Vielleicht lesen wir es erst einmal gemeinsam, bevor wir irgendetwas überstürzen.', en: 'A fair point. Perhaps we should read it together first before we rush into anything.', fr: 'Une objection légitime. Lisons-le peut-être d’abord ensemble, avant de précipiter quoi que ce soit.', it: 'Un’obiezione legittima. Forse dovremmo prima leggerlo insieme, prima di affrettare qualsiasi cosa.', es: 'Una objeción legítima. Quizá deberíamos leerlo juntos primero, antes de precipitarnos.', pt: 'Uma objeção pertinente. Talvez seja melhor lermos juntos primeiro, antes de precipitar qualquer coisa.', uk: 'Слушне зауваження. Можливо, спершу прочитаймо його разом, перш ніж щось поспіхом вирішувати.' } },
      { kind: 'question', prompt: { de: 'Was steht auf der letzten Seite?', en: 'What is written on the last page?', fr: 'Qu’est-ce qui est écrit sur la dernière page ?', it: 'Che cosa c’è scritto sull’ultima pagina?', es: '¿Qué pone en la última página?', pt: 'O que está escrito na última página?', uk: 'Що написано на останній сторінці?' }, options: [
        { de: '„Ende“', en: '“The End”', fr: '« Fin »', it: '«Fine»', es: '«Fin»', pt: '“Fim”', uk: '«Кінець»' },
        { de: 'Eine Widmung für Oma', en: 'A dedication to Grandma', fr: 'Une dédicace pour Mamie', it: 'Una dedica alla nonna', es: 'Una dedicatoria a la abuela', pt: 'Uma dedicatória para a vovó', uk: 'Присвята бабусі' },
        { de: 'Der Name eines Verlags', en: 'The name of a publisher', fr: 'Le nom d’un éditeur', it: 'Il nome di un editore', es: 'El nombre de una editorial', pt: 'O nome de uma editora', uk: 'Назва видавництва' }
      ] },
      { kind: 'question', prompt: { de: 'In welchem Zustand befindet sich das Manuskript?', en: 'What state is the manuscript in?', fr: 'Dans quel état se trouve le manuscrit ?', it: 'In che stato si trova il manoscritto?', es: '¿En qué estado se encuentra el manuscrito?', pt: 'Em que estado se encontra o manuscrito?', uk: 'У якому стані рукопис?' }, options: [
        { de: 'Es ist vergilbt, und die Handschrift ist kaum zu entziffern.', en: 'It has yellowed, and the handwriting is barely legible.', fr: 'Il est jauni et l’écriture est presque indéchiffrable.', it: 'È ingiallito e la calligrafia è quasi indecifrabile.', es: 'Está amarillento y la letra es casi indescifrable.', pt: 'Está amarelado e a letra é quase indecifrável.', uk: 'Він пожовклий, а почерк ледве можна розібрати.' },
        { de: 'Es ist sauber abgetippt und gebunden.', en: 'It has been neatly typed up and bound.', fr: 'Il a été soigneusement dactylographié et relié.', it: 'È stato battuto a macchina con cura e rilegato.', es: 'Está pulcramente mecanografiado y encuadernado.', pt: 'Está datilografado com capricho e encadernado.', uk: 'Його охайно передруковано й переплетено.' },
        { de: 'Die letzten Kapitel sind herausgerissen.', en: 'The last chapters have been torn out.', fr: 'Les derniers chapitres ont été arrachés.', it: 'Gli ultimi capitoli sono stati strappati.', es: 'Los últimos capítulos están arrancados.', pt: 'Os últimos capítulos foram arrancados.', uk: 'Останні розділи вирвано.' }
      ] },
      { kind: 'question', prompt: { de: 'Worauf spielt Oma an, wenn sie sagt, Perfektionismus liege gewissermaßen in der Familie?', en: 'What is Grandma hinting at when she says perfectionism ran in the family?', fr: 'À quoi Mamie fait-elle allusion en disant que le perfectionnisme est une affaire de famille ?', it: 'A che cosa allude la nonna quando dice che il perfezionismo «ce l’abbiamo nel sangue»?', es: '¿A qué alude la abuela cuando dice que el perfeccionismo les viene de familia?', pt: 'A que a vovó está aludindo quando diz que o perfeccionismo é de família?', uk: 'На що натякає бабуся, кажучи, що перфекціонізм — родинна риса?' }, options: [
        { de: 'Dass auch andere in der Familie mit ihrer Arbeit nie ganz zufrieden sind.', en: 'That others in the family are never quite satisfied with their work either.', fr: 'Que d’autres membres de la famille ne sont jamais tout à fait satisfaits de leur travail non plus.', it: 'Che anche altri in famiglia non sono mai del tutto soddisfatti del proprio lavoro.', es: 'Que tampoco otros miembros de la familia están nunca del todo satisfechos con su trabajo.', pt: 'Que outras pessoas da família também nunca ficam totalmente satisfeitas com o próprio trabalho.', uk: 'Що й інші в родині ніколи не бувають цілком задоволені своєю роботою.' },
        { de: 'Dass in der Familie schon mehrere Romane veröffentlicht wurden.', en: 'That several novels have already been published in the family.', fr: 'Que plusieurs romans ont déjà été publiés dans la famille.', it: 'Che in famiglia sono già stati pubblicati diversi romanzi.', es: 'Que en la familia ya se han publicado varias novelas.', pt: 'Que a família já publicou vários romances.', uk: 'Що в родині вже видали кілька романів.' },
        { de: 'Dass sie dem Urgroßvater Nachlässigkeit vorwirft.', en: 'That she accuses the great-grandfather of carelessness.', fr: 'Qu’elle reproche à l’arrière-grand-père sa négligence.', it: 'Che rimprovera al bisnonno la sua trascuratezza.', es: 'Que le reprocha al bisabuelo su descuido.', pt: 'Que ela acusa o bisavô de desleixo.', uk: 'Що вона дорікає прадідові недбалістю.' }
      ] },
      { kind: 'question', prompt: { de: 'Wozu rät Oma, bevor eine Entscheidung fällt?', en: 'What does Grandma advise before any decision is made?', fr: 'Que conseille Mamie avant de prendre une décision ?', it: 'Che cosa consiglia la nonna prima di prendere una decisione?', es: '¿Qué aconseja la abuela antes de tomar una decisión?', pt: 'O que a vovó aconselha antes de qualquer decisão?', uk: 'Що радить бабуся, перш ніж ухвалювати рішення?' }, options: [
        { de: 'Das Manuskript zunächst gemeinsam zu lesen', en: 'Reading the manuscript together first', fr: 'Lire d’abord le manuscrit ensemble', it: 'Leggere prima il manoscritto insieme', es: 'Leer primero el manuscrito juntos', pt: 'Ler o manuscrito juntos primeiro', uk: 'Спершу разом прочитати рукопис' },
        { de: 'Es umgehend einem Verlag zu schicken', en: 'Sending it to a publisher straight away', fr: 'L’envoyer sans tarder à un éditeur', it: 'Mandarlo subito a un editore', es: 'Enviarlo de inmediato a una editorial', pt: 'Enviá-lo imediatamente a uma editora', uk: 'Негайно надіслати його до видавництва' },
        { de: 'Es wieder auf dem Dachboden zu verstauen', en: 'Putting it back in the attic', fr: 'Le ranger de nouveau au grenier', it: 'Rimetterlo in soffitta', es: 'Volver a guardarlo en el desván', pt: 'Guardá-lo de novo no sótão', uk: 'Знову сховати його на горищі' }
      ] }
    ]
  },
  // Hans from Bavaria (beer, sausages, Gemütlichkeit) and Albert, a strict Prussian from Berlin, live
  // on their dialects, so their stories are for German learners only.
  {
    id: 'b2-beergarden',
    level: 'b2',
    scene: 'beergarden',
    cast: ['mia', 'hans', 'albert'],
    languages: ['de'],
    weathers: ['sunny', 'cloudy'],
    title: german('Im Biergarten'),
    beats: [
      { kind: 'narration', text: german('Mia verbringt ein langes Wochenende in München. Ihr Bekannter Hans hat darauf bestanden, ihr seinen Lieblingsbiergarten zu zeigen – und zufällig sitzt am selben Tisch Albert, ein Geschäftsreisender aus Berlin.') },
      { kind: 'line', speaker: 'hans', mood: 'happy', text: german('Servus, Mia! Griaß di, {name}! Hock di her. A Maß Bier und a paar Weißwürscht – mehr braucht da Mensch ned zum Glücklichsein.') },
      { kind: 'line', speaker: 'albert', text: german('Verzeihung, aber es ist gerade mal elf Uhr vormittags. Bier um diese Uhrzeit wäre in Berlin, gelinde gesagt, ungewöhnlich.') },
      { kind: 'line', speaker: 'hans', mood: 'happy', text: german('Ja mei, deswegen san mia ja in Bayern! Weißwürscht isst ma eh nur bis zwölfe – des is Tradition.') },
      { kind: 'line', speaker: 'albert', mood: 'curious', text: german('Bis zwölf? Wer hat sich denn diese Regel ausgedacht? Das klingt mir nach typisch bayerischer Unordnung.') },
      { kind: 'question', prompt: german('Warum gibt es die Weißwürste schon am Vormittag?'), options: [
        german('Weil man sie traditionell nur bis zwölf Uhr isst.'),
        german('Weil Albert um zwölf Uhr abreisen muss.'),
        german('Weil der Biergarten mittags schließt.')
      ] },
      { kind: 'line', speaker: 'hans', mood: 'curious', text: german('{name}, sag amoi: Schmeckt dir die Weißwurscht, oder bist du aa so a Preiß wie da Albert?') },
      { kind: 'reply', to: 'hans', options: [
        german('Sie schmeckt ausgezeichnet – vor allem mit süßem Senf und einer frischen Brezel.'),
        german('Am liebsten esse ich sie um Mitternacht, mit Ketchup.'),
        german('Die Weißwurst ist leider schon um elf Uhr abgefahren.')
      ] },
      { kind: 'line', speaker: 'albert', mood: 'happy', text: german('Na jut, ick geb’s ja zu: Das schmeckt gar nicht übel. Aber der Senf ist entschieden zu süß.') },
      { kind: 'line', speaker: 'hans', mood: 'happy', text: german('Prost, Albert! Siehgst, a bisserl Gemütlichkeit hat no koan Preißn umbracht.') },
      { kind: 'narration', text: german('Albert hebt seinen Krug – sehr ordentlich, genau auf Augenhöhe – und stößt zum ersten Mal an diesem Tag lächelnd an.') },
      { kind: 'question', prompt: german('Was gefällt Albert am Essen nicht?'), options: [
        german('Der Senf ist ihm zu süß.'),
        german('Die Brezel ist ihm zu salzig.'),
        german('Die Würste sind ihm zu klein.')
      ] },
      { kind: 'question', prompt: german('Wie verhält sich Albert am Ende?'), options: [
        german('Er stößt lächelnd mit Hans an.'),
        german('Er verlässt beleidigt den Biergarten.'),
        german('Er bestellt einen Kaffee statt Bier.')
      ] },
      { kind: 'question', prompt: german('Wo verbringt Mia ihr langes Wochenende?'), options: [
        german('In München'),
        german('In Berlin'),
        german('In Hamburg')
      ] },
      { kind: 'question', prompt: german('Wie findet Albert es, schon um elf Uhr Bier zu trinken?'), options: [
        german('Ungewöhnlich – in Berlin würde man das nicht tun.'),
        german('Völlig normal, das macht er jeden Tag.'),
        german('Zu spät, er trinkt sonst schon um neun.')
      ] },
      { kind: 'question', prompt: german('Wen meint Hans, wenn er von einem „Preiß“ spricht?'), options: [
        german('Albert aus Berlin'),
        german('Den Kellner im Biergarten'),
        german('Einen Metzger aus München')
      ] }
    ]
  },
  {
    id: 'c1-delay',
    level: 'c1',
    scene: 'station',
    cast: ['albert', 'hans'],
    languages: ['de'],
    title: german('Verspätung'),
    beats: [
      { kind: 'narration', text: german('Am Münchner Hauptbahnhof leuchtet auf der Anzeigetafel ein Wort, das Albert zutiefst verabscheut: „Verspätung“. Sein ICE nach Berlin fährt voraussichtlich erst neunzig Minuten später ab.') },
      { kind: 'narration', announcement: true, faces: { albert: 'angry', hans: 'neutral' }, text: german('Aus dem Lautsprecher kommt eine Durchsage: „Grund dafür ist die verspätete Bereitstellung des Zuges. Der Zug hatte bereits auf seiner vorherigen Fahrt Verspätung.“') },
      { kind: 'line', speaker: 'albert', mood: 'neutral', text: german('Aha. Der Zug ist verspätet, weil der Zug verspätet ist. Eine Begründung von bestechender Logik.') },
      { kind: 'line', speaker: 'albert', mood: 'angry', text: german('Neunzig Minuten! Ick fass es nicht. Pünktlichkeit ist die Höflichkeit der Könige – aber davon hat die Bahn offenbar noch nie etwas gehört.') },
      { kind: 'line', speaker: 'hans', mood: 'happy', text: german('Geh, Albert, reg di ned auf, des ändert eh nix. I hab a Brotzeit dabei: Leberkas, Brezn und an Obazdn.') },
      { kind: 'line', speaker: 'albert', mood: 'curious', text: german('Sie haben eine vollständige Mahlzeit im Rucksack? Für eine Zugfahrt von viereinhalb Stunden?') },
      { kind: 'line', speaker: 'hans', mood: 'happy', text: german('Freilich! A Bayer verreist nia ohne Proviant. Und a Bier für d’Fahrt – rein zur Beruhigung der Nerven, verstehst?') },
      { kind: 'question', prompt: german('Worüber ärgert sich Albert?'), options: [
        german('Dass sein Zug voraussichtlich anderthalb Stunden später abfährt.'),
        german('Dass Hans sein Bier ausgetrunken hat.'),
        german('Dass der Zug ohne ihn abgefahren ist.')
      ] },
      { kind: 'line', speaker: 'albert', mood: 'curious', text: german('{name}, Sie sind doch ein vernünftiger Mensch. Finden Sie nicht auch, dass man sich über eine solche Verspätung schriftlich beschweren sollte?') },
      { kind: 'reply', to: 'albert', options: [
        german('Eine Beschwerde kann nicht schaden, aber an der Abfahrtszeit ändert sie nichts – wir könnten die Wartezeit also genauso gut mit Hans’ Brotzeit verbringen.'),
        german('Unbedingt, und zwar persönlich beim Lokführer, während der Zug fährt.'),
        german('Nein, denn neunzig Minuten Verspätung gelten bei der Bahn als überpünktlich.')
      ] },
      { kind: 'line', speaker: 'albert', mood: 'neutral', text: german('Hm. Ihre Argumentation ist bestechend logisch. Na schön – den Antrag auf Fahrgastrechte reiche ich trotzdem ein. Ordnung muss sein.') },
      { kind: 'line', speaker: 'hans', mood: 'happy', text: german('Recht hast! Und jetzt a Stückerl Leberkas, nacha schaut die Welt glei ganz anders aus.') },
      { kind: 'narration', faces: { hans: 'sleepy', albert: 'neutral' }, text: german('Neunzig Minuten später sitzen beide im Zug. Albert füllt gewissenhaft ein Formular aus, während Hans zufrieden schläft – den Kopf auf Alberts Schulter.') },
      { kind: 'question', prompt: german('Wie geht Albert schließlich mit der Verspätung um?'), options: [
        german('Er reicht eine Beschwerde ein, nimmt die Wartezeit aber gelassener hin.'),
        german('Er sagt die Reise ab und fliegt nach Berlin.'),
        german('Er verlangt, dass Hans den Zug fährt.')
      ] },
      { kind: 'question', prompt: german('Was versteht Hans unter einer „Brotzeit“?'), options: [
        german('Mitgebrachtes Essen wie Leberkäse, Brezeln und Obazda'),
        german('Eine kurze Pause zum Schlafen'),
        german('Die genaue Abfahrtszeit des Zuges')
      ] },
      { kind: 'question', prompt: german('Welchen Grund nennt die Durchsage für die Verspätung?'), options: [
        german('Der Zug hatte schon auf seiner vorherigen Fahrt Verspätung.'),
        german('Der Lokführer hat verschlafen.'),
        german('Ein Sturm hat die Oberleitung beschädigt.')
      ] },
      { kind: 'question', prompt: german('Warum findet Albert die Begründung der Bahn absurd?'), options: [
        german('Weil sie die Verspätung nur mit einer anderen Verspätung erklärt.'),
        german('Weil die Durchsage auf Bairisch war.'),
        german('Weil der Zug in Wahrheit pünktlich ist.')
      ] },
      { kind: 'question', prompt: german('Was macht Hans während der Zugfahrt?'), options: [
        german('Er schläft zufrieden an Alberts Schulter.'),
        german('Er füllt ein Beschwerdeformular aus.'),
        german('Er streitet mit dem Schaffner.')
      ] }
    ]
  },
  {
    id: 'b2-platform',
    level: 'b2',
    scene: 'station',
    cast: ['sabine', 'enzo', 'jana', 'becker'],
    languages: ['de'],
    title: german('Personen im Gleis'),
    beats: [
      { kind: 'narration', text: german('Freitagabend, Gleis 7 in Köln. Der Regionalexpress nach Bonn hätte vor zwanzig Minuten abfahren sollen. Auf dem Bahnsteig warten unter anderem eine Polizistin, ein Pizzabäcker, eine Programmiererin und ein Lehrer – und du.') },
      { kind: 'narration', announcement: true, text: german('Der Lautsprecher knackt: „Information zum RE 5 nach Bonn: Wegen der Verspätung eines vorausfahrenden Zuges verzögert sich die Abfahrt um etwa fünfzehn Minuten. Wir bitten um Entschuldigung.“') },
      { kind: 'line', speaker: 'becker', mood: 'sad', text: german('Fünfzehn Minuten, sagen sie. Bei der Bahn heißt das erfahrungsgemäß: mindestens eine halbe Stunde. Dabei muss ich morgen früh vierzig Klassenarbeiten zurückgeben – korrigiert habe ich erst zwölf.') },
      { kind: 'line', speaker: 'jana', mood: 'happy', text: german('Dann korrigieren Sie doch einfach hier! Ich programmiere auch gerade – na ja, ich versuche es. Das WLAN am Bahnsteig ist ungefähr so zuverlässig wie der Fahrplan.') },
      { kind: 'narration', announcement: true, text: german('Wieder knackt der Lautsprecher: „Achtung, eine weitere Information: Aufgrund von Personen im Gleis ist der Zugverkehr zwischen Köln und Bonn vorübergehend eingestellt.“') },
      { kind: 'line', speaker: 'enzo', mood: 'worried', text: german('Personen im Gleis? Mamma mia! Hoffentlich ist niemandem etwas passiert.') },
      { kind: 'line', speaker: 'sabine', mood: 'neutral', text: german('Keine Sorge. Ein paar Jugendliche haben über die Gleise abgekürzt. Meine Kollegen holen sie gerade da runter – das ist nicht nur verboten, sondern lebensgefährlich.') },
      { kind: 'question', prompt: german('Warum wird der Zugverkehr eingestellt?'), options: [
        german('Weil sich Personen im Gleis befinden.'),
        german('Weil die Polizistin den Zug angehalten hat.'),
        german('Weil das WLAN am Bahnsteig ausgefallen ist.')
      ] },
      { kind: 'line', speaker: 'enzo', mood: 'happy', text: german('Na gut, dann machen wir das Beste daraus. Ich habe noch drei Pizzen dabei, eigentlich für eine Lieferung nach Bonn. {name}, willst du ein Stück? Margherita oder Salami?') },
      { kind: 'reply', to: 'enzo', options: [
        german('Gern ein Stück Margherita – danke, das ist echt nett von dir!'),
        german('Ich hätte gern eine Fahrkarte nach Bonn, bitte.'),
        german('Die Margherita befindet sich leider im Gleis.')
      ] },
      { kind: 'line', speaker: 'becker', mood: 'curious', text: german('Pizza und Klassenarbeiten – die beste Pause seit Wochen. Jana, können Sie mir die Bahn-App erklären? Bei mir steht, der Zug sei schon abgefahren.') },
      { kind: 'line', speaker: 'jana', mood: 'happy', text: german('Ein bekannter Fehler: Die App kennt den Fahrplan, aber nicht die Wirklichkeit. Ehrlich gesagt würde ich das gern mal selbst reparieren.') },
      { kind: 'narration', text: german('Vierzig Minuten später fährt der Zug endlich ein. Herr Becker hat zwanzig Arbeiten korrigiert, Jana hat einen Fehlerbericht geschrieben, und von Enzos Pizzen ist nichts mehr übrig.') },
      { kind: 'line', speaker: 'sabine', mood: 'happy', text: german('Gute Fahrt allerseits! Und denkt dran: Bitte hinter der weißen Linie bleiben.') },
      { kind: 'question', prompt: german('Weshalb verzögerte sich die Abfahrt zuerst?'), options: [
        german('Wegen der Verspätung eines vorausfahrenden Zuges'),
        german('Wegen eines Streiks der Lokführer'),
        german('Wegen eines Unwetters zwischen Köln und Bonn')
      ] },
      { kind: 'question', prompt: german('Wofür waren Enzos Pizzen eigentlich gedacht?'), options: [
        german('Für eine Lieferung nach Bonn'),
        german('Für die Polizei am Bahnsteig'),
        german('Für Herrn Beckers Klasse')
      ] },
      { kind: 'question', prompt: german('Wer befand sich im Gleis?'), options: [
        german('Ein paar Jugendliche, die abgekürzt haben'),
        german('Ein Bauarbeiter mit seinem Werkzeug'),
        german('Ein entlaufener Hund')
      ] },
      { kind: 'question', prompt: german('Was hat Jana während der Wartezeit geschrieben?'), options: [
        german('Einen Fehlerbericht zur Bahn-App'),
        german('Eine Beschwerde an die Polizei'),
        german('Eine Klassenarbeit für Herrn Becker')
      ] },
      { kind: 'question', prompt: german('Worum bittet die Polizistin zum Schluss?'), options: [
        german('Hinter der weißen Linie zu bleiben'),
        german('Die Fahrkarten bereitzuhalten'),
        german('Keine Pizza im Zug zu essen')
      ] }
    ]
  },
  {
    id: 'a1-abfahrt',
    level: 'a1',
    scene: 'station',
    cast: ['mia', 'tom'],
    title: { de: 'Die Abfahrt', en: 'The departure', fr: 'Le départ', it: 'La partenza', es: 'La salida', pt: 'A partida', uk: 'Відправлення' },
    beats: [
      { kind: 'narration', text: { de: 'Mia wartet am Bahnhof. Die Abfahrt ist um zehn Uhr. Tom holt sie ab.', en: 'Mia is waiting at the station. The departure is at ten o\'clock. Tom picks her up.', fr: 'Mia attend à la gare. Le départ est à dix heures. Tom vient la chercher.', it: 'Mia aspetta in stazione. La partenza è alle dieci. Tom la va a prendere.', es: 'Mia espera en la estación. La salida es a las diez. Tom la recoge.', pt: 'A Mia espera na estação. A partida é às dez. O Tom vem buscá-la.', uk: 'Мія чекає на вокзалі. Відправлення о десятій. Том її забирає.' } },
      { kind: 'line', speaker: 'tom', text: { de: 'Hallo Mia! Ich bin der Absender des Briefes. Ich hole dich ab.', en: 'Hi Mia! I am the sender of the letter. I am picking you up.', fr: 'Salut Mia ! Je suis l\'expéditeur de la lettre. Je viens te chercher.', it: 'Ciao Mia! Sono il mittente della lettera. Ti vengo a prendere.', es: '¡Hola Mia! Soy el remitente de la carta. Te recogemos.', pt: 'Oi, Mia! Eu sou o remetente da carta. Vou te buscar.', uk: 'Привіт, Міє! Я відправник листа. Забираю тебе.' } },
      { kind: 'line', speaker: 'mia', text: { de: 'Danke! Ich habe die Adresse geschrieben. Achtung, der Zug fährt ab!', en: 'Thanks! I wrote the address. Attention, the train is leaving!', fr: 'Merci ! J\'ai écrit l\'adresse. Attention, le train part !', it: 'Grazie! Ho scritto l\'indirizzo. Attenzione, il treno parte!', es: '¡Gracias! Escribí la dirección. ¡Atención, el tren sale!', pt: 'Obrigada! Escrevi o endereço. Atenção, o trem está saindo!', uk: 'Дякую! Написала адресу. Увага, потяг від\'їжджає!' } },
      { kind: 'question', prompt: { de: 'Was ist die Abfahrt?', en: 'What is the departure?', fr: 'Qu\'est-ce que le départ ?', it: 'Che cos\'è la partenza?', es: '¿Qué es la salida?', pt: 'O que é a partida?', uk: 'Що таке відправлення?' }, options: [
        { de: 'Um zehn Uhr', en: 'At ten o\'clock', fr: 'À dix heures', it: 'Alle dieci', es: 'A las diez', pt: 'Às dez', uk: 'О десятій' },
        { de: 'Um elf Uhr', en: 'At eleven o\'clock', fr: 'À onze heures', it: 'Alle undici', es: 'A las once', pt: 'Às onze', uk: 'О одинадцятій' },
        { de: 'Um neun Uhr', en: 'At nine o\'clock', fr: 'À neuf heures', it: 'Alle nove', es: 'A las nueve', pt: 'Às nove', uk: 'О дев\'ятій' }
      ] },
      { kind: 'question', prompt: { de: 'Wer holt Mia ab?', en: 'Who picks Mia up?', fr: 'Qui vient chercher Mia ?', it: 'Chi va a prendere Mia?', es: '¿Quién recoge a Mia?', pt: 'Quem busca a Mia?', uk: 'Хто забирає Мію?' }, options: [
        { de: 'Tom', en: 'Tom', fr: 'Tom', it: 'Tom', es: 'Tom', pt: 'Tom', uk: 'Том' },
        { de: 'Leo', en: 'Leo', fr: 'Léo', it: 'Leo', es: 'Leo', pt: 'Léo', uk: 'Лео' },
        { de: 'Oma', en: 'Grandma', fr: 'Mamie', it: 'Nonna', es: 'Abuela', pt: 'Vovó', uk: 'Бабуся' }
      ] }
    ]
  },
  {
    id: 'a1-alone',
    level: 'a1',
    scene: 'home',
    cast: ['mia', 'lilith'],
    title: { de: 'Allein zu Hause', en: 'Alone at home', fr: 'Seul à la maison', it: 'Solo a casa', es: 'Solo en casa', pt: 'Só em casa', uk: 'Наодинці вдома' },
    beats: [
      { kind: 'narration', text: { de: 'Mia ist allein zu Hause. Die Katze Lilith sitzt auf dem Sofa. Mia liest ein altes Buch.', en: 'Mia is alone at home. The cat Lilith is sitting on the sofa. Mia is reading an old book.', fr: 'Mia est seule à la maison. La chatte Lilith est sur le canapé. Mia lit un vieux livre.', it: 'Mia è sola a casa. La gatta Lilith è sul divano. Mia legge un libro vecchio.', es: 'Mia está sola en casa. La gata Lilith está en el sofá. Mia lee un libro viejo.', pt: 'A Mia está só em casa. A gata Lilith está no sofá. A Mia lê um livro antigo.', uk: 'Мія наодинці вдома. Кішка Ліліт сидить на дивані. Мія читає стару книгу.' } },
      { kind: 'line', speaker: 'lilith', sfx: 'meow', text: { de: 'Miau! Miau!', en: 'Meow! Meow!', fr: 'Miaou ! Miaou !', it: 'Miao! Miao!', es: '¡Miau! ¡Miau!', pt: 'Miau! Miau!', uk: 'Няв! Няв!' } },
      { kind: 'line', speaker: 'mia', text: { de: 'Hallo Lilith! Du bist allein? Ich auch. Ich bin alt und müde, aber ich liebe das Lesen.', en: 'Hi Lilith! You are alone too? Me too. I am old and tired, but I love reading.', fr: 'Salut Lilith ! Tu es seule aussi ? Moi aussi. Je suis vieille et fatiguée, mais j\'aime lire.', it: 'Ciao Lilith! Sei sola anche tu? Anche io. Sono vecchia e stanca, ma amo leggere.', es: '¡Hola Lilith! ¿Tú también estás sola? Yo también. Soy vieja y cansada, pero me encanta leer.', pt: 'Oi, Lilith! Você também está só? Eu também. Sou velha e cansada, mas amo ler.', uk: 'Привіт, Ліліт! Ти теж наодинці? Я теж. Я стара і втомлена, але люблю читати.' } },
      { kind: 'question', prompt: { de: 'Wie fühlt sich Mia?', en: 'How does Mia feel?', fr: 'Comment se sent Mia ?', it: 'Come si sente Mia?', es: '¿Cómo se siente Mia?', pt: 'Como a Mia se sente?', uk: 'Як почувається Мія?' }, options: [
        { de: 'Alt und müde', en: 'Old and tired', fr: 'Vieille et fatiguée', it: 'Vecchia e stanca', es: 'Vieja y cansada', pt: 'Velha e cansada', uk: 'Стара й втомлена' },
        { de: 'Jung und glücklich', en: 'Young and happy', fr: 'Jeune et heureuse', it: 'Giovane e felice', es: 'Joven y feliz', pt: 'Jovem e feliz', uk: 'Молода й щаслива' },
        { de: 'Wütend und allein', en: 'Angry and alone', fr: 'En colère et seule', it: 'Arrabbiata e sola', es: 'Enfadada y sola', pt: 'Brava e só', uk: 'Зла й наодинці' }
      ] },
      { kind: 'line', speaker: 'mia', text: { de: 'Der Anfang des Buches ist sehr interessant. Ich werde es weiterlesen.', en: 'The beginning of the book is very interesting. I will read on.', fr: 'Le début du livre est très intéressant. Je vais continuer à lire.', it: 'L\'inizio del libro è molto interessante. Continuerò a leggere.', es: 'El principio del libro es muy interesante. Seguiré leyendo.', pt: 'O começo do livro é muito interessante. Vou continuar lendo.', uk: 'Початок книги дуже цікавий. Продовжу читати.' } }
    ]
  },
  {
    id: 'a1-antwort',
    level: 'a1',
    scene: 'cafe',
    cast: ['mia', 'tom'],
    title: { de: 'Die Antwort', en: 'The answer', fr: 'La réponse', it: 'La risposta', es: 'La respuesta', pt: 'A resposta', uk: 'Відповідь' },
    beats: [
      { kind: 'narration', text: { de: 'Tom fragt Mia eine Frage. Mia antwortet freundlich. Sie bietet ihm einen Kaffee an.', en: 'Tom asks Mia a question. Mia answers kindly. She offers him a coffee.', fr: 'Tom pose une question à Mia. Mia répond gentiment. Elle lui offre un café.', it: 'Tom fa una domanda a Mia. Mia risponde gentilmente. Le offre un caffè.', es: 'Tom le hace una pregunta a Mia. Mia responde amablemente. Le ofrece un café.', pt: 'O Tom faz uma pergunta à Mia. A Mia responde gentilmente. Ela oferece um café.', uk: 'Том ставить питання Мії. Мія відповідає доброзичливо. Пропонує ему каву.' } },
      { kind: 'line', speaker: 'tom', text: { de: 'Mia, kannst du mir antworten? Wo ist das Café?', en: 'Mia, can you answer me? Where is the café?', fr: 'Mia, peux-tu me répondre ? Où est le café ?', it: 'Mia, puoi rispondermi? Dov\'è il caffè?', es: 'Mia, ¿puedes responderme? ¿Dónde está el café?', pt: 'Mia, você pode me responder? Onde está o café?', uk: 'Міє, ти можеш відповісти мені? Де кав\'ярня?' } },
      { kind: 'line', speaker: 'mia', text: { de: 'Ja! Ich biete dir einen Kaffee an. Die Adresse ist neben dem Park.', en: 'Yes! I offer you a coffee. The address is next to the park.', fr: 'Oui ! Je t\'offre un café. L\'adresse est à côté du parc.', it: 'Sì! Ti offro un caffè. L\'indirizzo è accanto al parco.', es: '¡Sí! Te ofrezco un café. La dirección está junto al parque.', pt: 'Sim! Te ofereço um café. O endereço é ao lado do parque.', uk: 'Так! Пропоную тобі каву. Адреса біля парку.' } },
      { kind: 'question', prompt: { de: 'Was bietet Mia an?', en: 'What does Mia offer?', fr: 'Que propose Mia ?', it: 'Cosa offre Mia?', es: '¿Qué ofrece Mia?', pt: 'O que a Mia oferece?', uk: 'Що пропонує Мія?' }, options: [
        { de: 'Einen Kaffee', en: 'A coffee', fr: 'Un café', it: 'Un caffè', es: 'Un café', pt: 'Um café', uk: 'Каву' },
        { de: 'Ein Buch', en: 'A book', fr: 'Un livre', it: 'Un libro', es: 'Un libro', pt: 'Um livro', uk: 'Книгу' },
        { de: 'Die Adresse', en: 'The address', fr: 'L\'adresse', it: 'L\'indirizzo', es: 'La dirección', pt: 'O endereço', uk: 'Адресу' }
      ] },
      { kind: 'question', prompt: { de: 'Wie antwortet Mia?', en: 'How does Mia answer?', fr: 'Comment Mia répond-elle ?', it: 'Come risponde Mia?', es: '¿Cómo responde Mia?', pt: 'Como a Mia responde?', uk: 'Як відповідає Мія?' }, options: [
        { de: 'Freundlich', en: 'Kindly', fr: 'Gentiment', it: 'Gentilmente', es: 'Amablemente', pt: 'Gentilmente', uk: 'Доброзичливо' },
        { de: 'Wütend', en: 'Angry', fr: 'En colère', it: 'Arrabbiata', es: 'Enfadada', pt: 'Brava', uk: 'Зло' },
        { de: 'Leise', en: 'Quietly', fr: 'Silencieusement', it: 'Silenziosamente', es: 'En voz baja', pt: 'Baixinho', uk: 'Тихо' }
      ] }
    ]
  },
  {
    id: 'a1-arzt',
    level: 'a1',
    scene: 'home',
    cast: ['mia', 'oma'],
    title: { de: 'Beim Arzt', en: 'At the doctor', fr: 'Chez le médecin', it: 'Dal medico', es: 'En el médico', pt: 'No médico', uk: 'У лікаря' },
    beats: [
      { kind: 'narration', text: { de: 'Mia geht zum Arzt. Es ist ein alter Tag, und sie hat Achtung vor dem Arzt.', en: 'Mia goes to the doctor. It is an old day, and she respects the doctor.', fr: 'Mia va chez le médecin. C\'est un vieux jour, et elle respecte le médecin.', it: 'Mia va dal medico. È un giorno vecchio, e lei rispetta il medico.', es: 'Mia va al médico. Es un día viejo, y ella respeta al médico.', pt: 'A Mia vai ao médico. É um dia antigo, e ela respeita o médico.', uk: 'Мія йде до лікаря. Це старий день, і вона поважає лікаря.' } },
      { kind: 'line', speaker: 'mia', text: { de: 'Guten Tag, ich bin allein gekommen. Ich arbeite viel und bin müde.', en: 'Good day, I came alone. I work a lot and am tired.', fr: 'Bonjour, je suis venue seule. Je travaille beaucoup et je suis fatiguée.', it: 'Buongiorno, sono venuta sola. Lavoro molto e sono stanca.', es: 'Buenos días, vine sola. Trabajo mucho y estoy cansada.', pt: 'Bom dia, vim sozinha. Trabalho muito e estou cansada.', uk: 'Добрий день, прийшла наодинці. Багато працюю й втомлена.' } },
      { kind: 'line', speaker: 'oma', text: { de: 'Ich empfehle dir, weniger zu arbeiten. Du bist alt und musst auf dich achten.', en: 'I recommend you work less. You are old and must take care of yourself.', fr: 'Je te recommande de moins travailler. Tu es vieille et tu dois te protéger.', it: 'Ti consiglio di lavorare meno. Sei vecchia e devi prenderti cura di te.', es: 'Te recomiendo trabajar menos. Eres vieja y debes cuidarte.', pt: 'Recomendo que trabalhe menos. Você é velha e deve se cuidar.', uk: 'Рекомендую працювати менше. Ти стара й маєш піклуватися про себе.' } },
      { kind: 'question', prompt: { de: 'Warum ist Mia beim Arzt?', en: 'Why is Mia at the doctor?', fr: 'Pourquoi Mia est-elle chez le médecin ?', it: 'Perché Mia è dal medico?', es: '¿Por qué está Mia en el médico?', pt: 'Por que a Mia está no médico?', uk: 'Чому Мія у лікаря?' }, options: [
        { de: 'Sie arbeitet zu viel', en: 'She works too much', fr: 'Elle travaille trop', it: 'Lavorava troppo', es: 'Trabaja mucho', pt: 'Trabalha muito', uk: 'Багато працює' },
        { de: 'Sie hat Hunger', en: 'She is hungry', fr: 'Elle a faim', it: 'Ha fame', es: 'Tiene hambre', pt: 'Está com fome', uk: 'Голодна' },
        { de: 'Sie liest ein Buch', en: 'She is reading a book', fr: 'Elle lit un livre', it: 'Legge un libro', es: 'Lee un libro', pt: 'Lê um livro', uk: 'Читає книгу' }
      ] },
      { kind: 'line', speaker: 'mia', text: { de: 'Danke, ich werde auf mich achten. Der Anfang zur Gesundheit ist wichtig.', en: 'Thanks, I will take care of myself. The beginning to health is important.', fr: 'Merci, je vais me protéger. Le début de la santé est important.', it: 'Grazie, mi prenderò cura di me. L\'inizio della salute è importante.', es: 'Gracias, me cuidaré. El principio de la salud es importante.', pt: 'Obrigada, vou me cuidar. O começo da saúde é importante.', uk: 'Дякую, піклуватимуся про себе. Початок здоров’я важливий.' } }
    ]
  },
  {
    id: 'a1-abflug',
    level: 'a1',
    scene: 'airport',
    cast: ['mia', 'leo'],
    title: { de: 'Der Abflug', en: 'The flight', fr: 'Le vol', it: 'Il volo', es: 'El vuelo', pt: 'O voo', uk: 'Політ' },
    beats: [
      { kind: 'narration', text: { de: 'Mia und Leo sind am Flughafen. Der Abflug ist um zwölf Uhr. Mia hat die Adresse der Familie geschrieben.', en: 'Mia and Leo are at the airport. The flight is at twelve o\'clock. Mia has written the family\'s address.', fr: 'Mia et Léo sont à l\'aéroport. Le vol est à midi. Mia a écrit l\'adresse de la famille.', it: 'Mia e Leo sono all\'aeroporto. Il volo è a mezzogiorno. Mia ha scritto l\'indirizzo della famiglia.', es: 'Mia y Leo están en el aeropuerto. El vuelo es a las doce. Mia ha escrito la dirección de la familia.', pt: 'A Mia e o Léo estão no aeroporto. O voo é ao meio-dia. A Mia escreveu o endereço da família.', uk: 'Мія і Лео в аеропорту. Політ о дванадцятій. Мія написала адресу родини.' } },
      { kind: 'line', speaker: 'mia', text: { de: 'Hallo Leo! Ich biete dir ein Geschenk an. Es ist für deine Abfahrt.', en: 'Hi Leo! I offer you a gift. It is for your departure.', fr: 'Salut Léo ! Je t\'offre un cadeau. C\'est pour ton départ.', it: 'Ciao Leo! Ti offro un regalo. È per la tua partenza.', es: '¡Hola Leo! Te ofrezco un regalo. Es para tu salida.', pt: 'Oi, Léo! Te ofereço um presente. É para a sua partida.', uk: 'Привіт, Лео! Пропоную тобі подарунок. Це для твого відправлення.' } },
      { kind: 'line', speaker: 'leo', text: { de: 'Danke Mia! Ich bin allein, aber ich habe Achtung vor dem Abflug.', en: 'Thanks Mia! I am alone, but I respect the flight.', fr: 'Merci Mia ! Je suis seul, mais j\'ai du respect pour le vol.', it: 'Grazie Mia! Sono solo, ma ho rispetto per il volo.', es: 'Gracias Mia! Estoy solo, pero respeto el vuelo.', pt: 'Obrigada Mia! Estou só, mas respeito o voo.', uk: 'Дякую, Міє! Я наодинці, але поважаю політ.' } },
      { kind: 'question', prompt: { de: 'Was bietet Mia an?', en: 'What does Mia offer?', fr: 'Que propose Mia ?', it: 'Cosa offre Mia?', es: '¿Qué ofrece Mia?', pt: 'O que a Mia oferece?', uk: 'Що пропонує Мія?' }, options: [
        { de: 'Ein Geschenk', en: 'A gift', fr: 'Un cadeau', it: 'Un regalo', es: 'Un regalo', pt: 'Um presente', uk: 'Подарунок' },
        { de: 'Einen Kaffee', en: 'A coffee', fr: 'Un café', it: 'Un caffè', es: 'Un café', pt: 'Um café', uk: 'Каву' },
        { de: 'Die Adresse', en: 'The address', fr: 'L\'adresse', it: 'L\'indirizzo', es: 'La dirección', pt: 'O endereço', uk: 'Адресу' }
      ] },
      { kind: 'question', prompt: { de: 'Wer ist allein?', en: 'Who is alone?', fr: 'Qui est seul ?', it: 'Chi è solo?', es: '¿Quién está solo?', pt: 'Quem está só?', uk: 'Хто наодинці?' }, options: [
        { de: 'Leo', en: 'Leo', fr: 'Léo', it: 'Leo', es: 'Leo', pt: 'Léo', uk: 'Лео' },
        { de: 'Mia', en: 'Mia', fr: 'Mia', it: 'Mia', es: 'Mia', pt: 'Mia', uk: 'Мія' },
        { de: 'Tom', en: 'Tom', fr: 'Tom', it: 'Tom', es: 'Tom', pt: 'Tom', uk: 'Том' }
      ] }
    ]
  },
  ...germanStories
];

/**
 * Stories at the learner's level come first; when lower vocabulary is included, easier stories
 * follow. If nothing matches exactly (sparse levels), fall back to the nearest lower level.
 * Stories limited to other languages are left out.
 */
export function storiesFor(language: Language, level: VocabularyLevel, includeLower: boolean): Story[] {
  const rank = vocabularyLevels.indexOf(level);
  const available = stories.filter((story) => !story.languages || story.languages.includes(language));
  const exact = available.filter((story) => story.level === level);
  const lower = available.filter((story) => vocabularyLevels.indexOf(story.level) < rank).sort((a, b) => vocabularyLevels.indexOf(b.level) - vocabularyLevels.indexOf(a.level));
  if (includeLower) return [...exact, ...lower];
  if (exact.length) return exact;
  const nearest = lower[0]?.level;
  return lower.filter((story) => story.level === nearest);
}

/**
 * The face a character makes while saying a line. Every story has German text, so the German line is
 * read for cues: regret reads sad, exclamations of shock surprised, questions curious and friendly
 * exclamations happy. An explicit `mood` on the beat wins.
 */
export function moodFor(beat: Extract<StoryBeat, { kind: 'line' }>): Mood {
  if (beat.mood) return beat.mood;
  const text = beat.text.de;
  if (/haha|hihi|hehe/i.test(text)) return 'laughing';
  if (/müde|gähn|schlafen/i.test(text)) return 'sleepy';
  if (/inakzeptabel|unverschämt|frechheit|so ein ärger|runter vom tisch/i.test(text)) return 'angry';
  if (/hoffentlich|nervös|vorsicht|pass auf/i.test(text)) return 'worried';
  if (/oh nein|leider|schade|vergessen|tut mir leid|entschuldigung!/i.test(text)) return 'sad';
  if (/^(oh|ach)\b|plötzlich|meine güte|wow/i.test(text)) return 'surprised';
  if (/\?\s*$/.test(text)) return 'curious';
  if (/!|danke|super|gern|toll|schön|genau|glück|willkommen/i.test(text)) return 'happy';
  return 'neutral';
}

export function fillName(text: string, name: string) {
  const filled = text.replaceAll('{name}', name);
  const learner = kumarStandIn();
  return learner ? playKumar(filled, learner) : filled;
}
// The learner's own character takes Kumar's part: "Herr Kumar" and "Kumar" become their first name,
// "Kumars" its genitive (with an apostrophe after a final s, ß, x or z, as German writes it).
function playKumar(text: string, learner: string) {
  return text.replace(/(?:Herrn? )?(?:Kumar|Кумар)(s?)(?!\p{L})/gu, (_, genitive: string) => genitive ? `${learner}${/[sßxz]$/i.test(learner) ? '’' : 's'}` : learner);
}

const outdoorScenes: SceneId[] = ['frankfurt', 'cologne', 'munich', 'hamburg', 'berlin', 'cliffs', 'mainau', 'lindau', 'castle', 'alps', 'forest', 'park', 'station', 'square', 'beergarden', 'farm', 'zoo', 'beach', 'airport'];
const weathers: Weather[] = ['sunny', 'cloudy', 'rainy', 'snowy'];
const weatherLines: Record<Weather, { indoor: Text; outdoor: Text }> = {
  sunny: {
    indoor: { de: 'Draußen ist das Wetter schön und klar.', en: 'Outside, the weather is lovely and clear.', fr: 'Dehors, il fait beau.', it: 'Fuori il tempo è bello e sereno.', es: 'Fuera hace buen tiempo.', pt: 'Lá fora, o tempo está bonito.', uk: 'Надворі гарна ясна погода.' },
    outdoor: { de: 'Die Sonne scheint, und der Himmel ist blau.', en: 'The sun is shining, and the sky is blue.', fr: 'Le soleil brille et le ciel est bleu.', it: 'Il sole splende e il cielo è azzurro.', es: 'Hace sol y el cielo está azul.', pt: 'O sol está brilhando, e o céu está azul.', uk: 'Світить сонце, і небо блакитне.' }
  },
  cloudy: {
    indoor: { de: 'Draußen ist der Himmel grau.', en: 'Outside, the sky is grey.', fr: 'Dehors, le ciel est gris.', it: 'Fuori il cielo è grigio.', es: 'Fuera, el cielo está gris.', pt: 'Lá fora, o céu está cinzento.', uk: 'Надворі небо сіре.' },
    outdoor: { de: 'Es ist bewölkt, und ein kühler Wind weht.', en: 'It is cloudy, and a cool wind is blowing.', fr: 'Le ciel est nuageux et un vent frais souffle.', it: 'È nuvoloso e soffia un vento fresco.', es: 'Está nublado y sopla un viento fresco.', pt: 'Está nublado, e sopra um vento fresco.', uk: 'Хмарно, і дме прохолодний вітер.' }
  },
  rainy: {
    indoor: { de: 'Draußen regnet es.', en: 'Outside, it is raining.', fr: 'Dehors, il pleut.', it: 'Fuori piove.', es: 'Fuera está lloviendo.', pt: 'Lá fora está chovendo.', uk: 'Надворі йде дощ.' },
    outdoor: { de: 'Es regnet ein bisschen, aber das ist nicht schlimm.', en: 'It is raining a little, but that’s fine.', fr: 'Il pleut un peu, mais ce n’est pas grave.', it: 'Piove un po’, ma non importa.', es: 'Llueve un poco, pero no pasa nada.', pt: 'Está chovendo um pouco, mas tudo bem.', uk: 'Трохи накрапає дощ, але це не страшно.' }
  },
  snowy: {
    indoor: { de: 'Draußen schneit es. Alles ist weiß.', en: 'Outside, it is snowing. Everything is white.', fr: 'Dehors, il neige. Tout est blanc.', it: 'Fuori nevica. È tutto bianco.', es: 'Fuera está nevando. Todo está blanco.', pt: 'Lá fora está nevando. Tudo está branco.', uk: 'Надворі падає сніг. Усе біле.' },
    outdoor: { de: 'Es schneit, und es ist kalt.', en: 'It is snowing, and it is cold.', fr: 'Il neige et il fait froid.', it: 'Nevica e fa freddo.', es: 'Está nevando y hace frío.', pt: 'Está nevando, e faz frio.', uk: 'Падає сніг, і холодно.' }
  }
};

function shuffled<T>(items: T[], random: () => number = Math.random): T[] {
  const copy = [...items];
  for (let index = copy.length - 1; index > 0; index -= 1) {
    const swap = Math.floor(random() * (index + 1));
    [copy[index], copy[swap]] = [copy[swap], copy[index]];
  }
  return copy;
}

/**
 * Every playthrough draws its own details (see Detail): the ball is red one time and blue the next,
 * the day a Sunday or a Tuesday, and the questions ask about whatever was drawn. A caller that
 * needs the same draw every time (the reading catalog) passes its own random source.
 */
export function withDetails(story: Story, random: () => number = Math.random): Story {
  if (!story.details?.length) return story;
  const values: Record<string, Text> = {};
  let ball: string | undefined;
  for (const detail of story.details) {
    const [chosen, ...others] = shuffled(detail, random);
    ball = chosen.ball ?? ball;
    for (const [key, text] of Object.entries(chosen.words)) {
      values[key] = text;
      others.forEach((other, index) => (values[`${key}#${index + 1}`] = other.words[key]));
    }
  }
  const fill = (text: Text): Text => Object.fromEntries(Object.entries(text).map(([language, value]) => [
    language,
    value.replace(/\{([^{}]+)\}/g, (match, key: string, at: number) => {
      const word = values[key]?.[language as Language];
      if (word === undefined) return match;
      return at === 0 ? word.charAt(0).toLocaleUpperCase(language) + word.slice(1) : word;
    })
  ])) as Text;
  const beats = story.beats.map((beat): StoryBeat => {
    if (beat.kind === 'narration' || beat.kind === 'line') return { ...beat, text: fill(beat.text) };
    if (beat.kind === 'question') return { ...beat, prompt: fill(beat.prompt), options: beat.options.map(fill) };
    return { ...beat, options: beat.options.map(fill) };
  });
  return { ...story, beats, ball };
}

/**
 * Every playthrough gets its own weather: the scene shows it and a line after the opening narration
 * describes it, so the same story reads a little differently each time.
 */
export function withWeather(story: Story): Story {
  const choices = story.weathers ?? weathers;
  const weather = choices[Math.floor(Math.random() * choices.length)];
  const lines = weatherLines[weather];
  const outdoor = outdoorScenes.includes(story.scene);
  // A blue sky carries birdsong. The beach always paints a sunset instead, so it stays quiet.
  const sfx: SoundEffect | undefined = weather === 'rainy' ? 'rain' : weather === 'sunny' && story.scene !== 'beach' ? 'tweet' : undefined;
  const beat: StoryBeat = { kind: 'narration', text: outdoor ? lines.outdoor : lines.indoor, sfx };
  const at = story.beats[0]?.kind === 'narration' ? 1 : 0;
  return { ...story, weather, beats: [...story.beats.slice(0, at), beat, ...story.beats.slice(at)] };
}
