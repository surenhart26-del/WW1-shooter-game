// Fictional operations inspired by the landscapes of the Western Front.
// Coordinates address cell centers; every map is a closed 20 × 20 grid.
function battlefield(walls) {
  const cells = Array.from({ length: 20 }, (_, y) =>
    Array.from({ length: 20 }, (_, x) =>
      x === 0 || y === 0 || x === 19 || y === 19 ? '#' : '.',
    ),
  );
  for (const [x, y, width, height] of walls) {
    for (let row = y; row < y + height; row++) {
      for (let col = x; col < x + width; col++) cells[row][col] = '#';
    }
  }
  return cells.map((row) => row.join(''));
}

const position = ([x, y]) => ({ x: x + 0.5, y: y + 0.5 });
const enemy = (cell) => ({ ...position(cell), hp: 100 });
const supply = (cell, type) => ({ ...position(cell), type });

export const MISSIONS = [
  {
    id: 'the-first-trench',
    title: 'De eerste loopgraaf',
    location: 'Sector A · Voorste linie',
    year: '1916',
    description: 'De telefoonlijn is stilgevallen. Zuiver de loopgraaf, herstel het veldstation en bereik de verbindingspost.',
    map: battlefield([
      [1, 5, 12, 1], [16, 5, 3, 1],
      [1, 10, 3, 1], [7, 10, 12, 1],
      [1, 15, 11, 1], [15, 15, 4, 1],
      [6, 2, 1, 2], [10, 7, 2, 1], [9, 12, 1, 2],
    ]),
    spawn: { ...position([2, 2]), angle: 0 },
    enemies: [[11, 2], [15, 7], [4, 8], [5, 13], [16, 17]].map(enemy),
    supplies: [supply([4, 3], 'ammo'), supply([14, 8], 'health'), supply([5, 12], 'grenades')],
    objective: { ...position([16, 16]), label: 'Herstel het veldstation' },
    exit: position([17, 18]),
    palette: { sky: '#9ba39a', ground: '#514735', wall: '#6c6247', fog: '#858573' },
  },
  {
    id: 'the-silent-village',
    title: 'Het stille dorp',
    location: 'Sector B · Saint-Aubert',
    year: '1916',
    description: 'Tussen de ruïnes ligt een verloren koeriersbericht. Doorzoek het dorp en breng de orders naar de uitgang.',
    map: battlefield([
      [4, 3, 4, 4], [12, 2, 4, 4], [2, 11, 4, 4],
      [9, 9, 4, 5], [15, 10, 3, 3], [7, 16, 5, 2],
    ]),
    spawn: { ...position([2, 2]), angle: 0.6 },
    enemies: [[9, 3], [17, 5], [6, 9], [3, 17], [13, 15], [17, 16]].map(enemy),
    supplies: [supply([2, 7], 'ammo'), supply([8, 11], 'health'), supply([14, 7], 'grenades')],
    objective: { ...position([14, 16]), label: 'Verzamel de koeriersorders' },
    exit: position([18, 18]),
    palette: { sky: '#b0a390', ground: '#60564b', wall: '#8b7760', fog: '#a08c76' },
  },
  {
    id: 'the-black-wood',
    title: 'Het zwarte woud',
    location: 'Sector C · Bois des Ombres',
    year: '1917',
    description: 'Een vijandelijke patrouille bewaakt de bosroute. Schakel de wachtposten uit en markeer de veilige doorgang.',
    map: battlefield([
      [4, 3, 2, 2], [10, 2, 2, 2], [15, 4, 2, 3],
      [2, 7, 2, 3], [7, 6, 2, 2], [11, 8, 3, 2],
      [5, 11, 2, 3], [9, 13, 2, 2], [15, 12, 2, 2],
      [3, 16, 3, 2], [12, 16, 2, 2],
    ]),
    spawn: { ...position([2, 2]), angle: 0.3 },
    enemies: [[7, 3], [14, 2], [10, 6], [4, 11], [8, 16], [14, 14], [17, 17]].map(enemy),
    supplies: [supply([6, 5], 'ammo'), supply([8, 10], 'grenades'), supply([12, 13], 'health'), supply([16, 16], 'ammo')],
    objective: { ...position([17, 15]), label: 'Markeer de bosroute' },
    exit: position([18, 18]),
    palette: { sky: '#74887c', ground: '#394238', wall: '#4c5e45', fog: '#718375' },
  },
  {
    id: 'the-stone-fort',
    title: 'Het stenen fort',
    location: 'Sector D · Fort de Roche',
    year: '1917',
    description: 'Het fort controleert de weg naar het front. Dring de binnenplaats binnen en neem het commandopunt over.',
    map: battlefield([
      [4, 4, 5, 1], [11, 4, 5, 1],
      [4, 4, 1, 5], [4, 11, 1, 5],
      [15, 4, 1, 5], [15, 11, 1, 5],
      [4, 15, 5, 1], [11, 15, 5, 1],
      [7, 7, 2, 2], [11, 7, 2, 2], [7, 11, 2, 2], [11, 11, 2, 2],
    ]),
    spawn: { ...position([2, 2]), angle: 0.7 },
    enemies: [[10, 2], [2, 10], [17, 8], [6, 6], [13, 10], [6, 13], [10, 17], [17, 17]].map(enemy),
    supplies: [supply([2, 6], 'ammo'), supply([10, 6], 'grenades'), supply([10, 13], 'health'), supply([16, 16], 'ammo')],
    objective: { ...position([10, 10]), label: 'Neem het commandopunt over' },
    exit: position([18, 18]),
    palette: { sky: '#8b909b', ground: '#50515a', wall: '#797c83', fog: '#8a8c97' },
  },
  {
    id: 'the-rail-depot',
    title: 'Het spoorwegdepot',
    location: 'Sector E · Gare du Nord',
    year: '1918',
    description: 'De bevoorradingsroute moet worden onderbroken. Zuiver de perrons en bedien de wissel bij het seinhuis.',
    map: battlefield([
      [4, 4, 2, 5], [4, 12, 2, 5],
      [9, 3, 2, 6], [9, 12, 2, 5],
      [14, 4, 2, 5], [14, 12, 2, 5],
      [2, 10, 2, 1], [7, 10, 2, 1], [12, 10, 2, 1],
    ]),
    spawn: { ...position([2, 2]), angle: 0.35 },
    enemies: [[7, 3], [12, 4], [17, 6], [2, 13], [7, 14], [12, 15], [17, 14], [11, 18], [17, 18]].map(enemy),
    supplies: [supply([3, 7], 'ammo'), supply([7, 8], 'health'), supply([12, 8], 'grenades'), supply([17, 11], 'ammo'), supply([7, 17], 'health')],
    objective: { ...position([17, 16]), label: 'Zet de spoorwissel om' },
    exit: position([18, 18]),
    palette: { sky: '#b08a70', ground: '#56483e', wall: '#79644c', fog: '#a18169' },
  },
  {
    id: 'the-last-hill',
    title: 'De laatste heuvel',
    location: 'Sector F · Hoogte 108',
    year: '1918',
    description: 'De laatste verdedigingslinie ligt voor je. Breek door de stellingen, neem het seinpunt in en keer terug naar de verzamelplaats.',
    map: battlefield([
      [3, 5, 5, 1], [11, 5, 6, 1],
      [3, 9, 2, 1], [8, 9, 5, 1], [16, 9, 2, 1],
      [3, 13, 6, 1], [12, 13, 6, 1],
      [6, 16, 3, 1], [12, 16, 3, 1],
      [6, 7, 1, 1], [14, 11, 1, 1], [10, 15, 1, 1],
    ]),
    spawn: { ...position([2, 2]), angle: 0.4 },
    enemies: [[10, 3], [16, 3], [2, 7], [10, 7], [17, 11], [6, 11], [3, 15], [15, 15], [10, 18], [17, 17]].map(enemy),
    supplies: [supply([8, 3], 'ammo'), supply([5, 7], 'grenades'), supply([14, 8], 'health'), supply([10, 12], 'ammo'), supply([10, 17], 'health'), supply([16, 17], 'grenades')],
    objective: { ...position([17, 16]), label: 'Activeer het seinpunt' },
    exit: position([18, 18]),
    palette: { sky: '#b3a080', ground: '#60533e', wall: '#7b6c4e', fog: '#a39376' },
  },
];
