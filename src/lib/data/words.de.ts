export type WordPuzzle = {
  letters: string[];
  words: string[];
};

const wordsDe: WordPuzzle[] = [
  {
    letters: ['B', 'E', 'S', 'U', 'C', 'H'],
    words: ['BESUCH', 'SUCHE', 'BUCH', 'BUS', 'HEU', 'HUB']
  },
  {
    letters: ['K', 'A', 'R', 'T', 'E', 'N'],
    words: ['KARTEN', 'KARTE', 'KANTE', 'TANK', 'KERN', 'ART']
  },
  {
    letters: ['W', 'I', 'N', 'T', 'E', 'R'],
    words: ['WINTER', 'WERT', 'TIER', 'REIN', 'WIE', 'EIN']
  }
];

export default wordsDe;
