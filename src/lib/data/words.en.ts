export type WordPuzzle = {
  letters: string[];
  words: string[];
};

const wordsEn: WordPuzzle[] = [
  {
    letters: ['C', 'A', 'S', 'T', 'L', 'E'],
    words: ['CASTLE', 'CAST', 'TALE', 'LATE', 'SEAL', 'SALE']
  },
  {
    letters: ['P', 'L', 'A', 'N', 'E', 'T'],
    words: ['PLANET', 'PLANE', 'PLATE', 'PLAN', 'LATE', 'NEAT']
  },
  {
    letters: ['O', 'R', 'A', 'N', 'G', 'E'],
    words: ['ORANGE', 'RANGE', 'GARN', 'RAGE', 'EGO', 'ROAN']
  }
];

export default wordsEn;
