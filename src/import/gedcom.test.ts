import { parseDate, parseGedcom } from './gedcom';
import { toTreeData } from './imported';

const GED = `0 HEAD
1 SOUR SYNTHETIC
1 GEDC
2 VERS 5.5.1
1 CHAR UTF-8
0 @I1@ INDI
1 NAME Arthur /Penrose/
2 GIVN Arthur
2 SURN Penrose
1 SEX M
1 BIRT
2 DATE 14 MAR 1890
2 PLAC Truro, Cornwall, England
1 DEAT
2 DATE ABT 1950
2 PLAC Adelaide, South Australia, Australia
1 OCCU Tin miner
1 NOTE First line
2 CONT second line, which is lo
2 CONC ng
1 OBJE
2 FILE C:\\Photos\\arthur.jpg
1 FAMS @F1@
0 @I2@ INDI
1 NAME Edna /Vale/
1 SEX F
1 BIRT
2 DATE BET 1892 AND 1894
2 PLAC Falmouth, Cornwall, England
1 DEAT Y
1 NOTE @N1@
1 FAMS @F1@
0 @I3@ INDI
1 NAME /Penrose/
2 GIVN Lily
1 SEX F
1 BIRT
2 DATE MAR 1921
1 FAMC @F1@
0 @I4@ INDI
1 NAME Unknown /Penrose/
1 CHR
2 DATE 1923
0 @N1@ NOTE Kept bees.
1 CONT Won prizes for honey.
0 @F1@ FAM
1 HUSB @I1@
1 WIFE @I2@
1 CHIL @I4@
1 MARR
2 DATE 1915
0 TRLR
`;

test('people, dates, places, notes and photos', () => {
  const t = parseGedcom(GED, 'Penrose');
  expect(t.persons).toHaveLength(4);
  const [arthur, edna, lily, unknown] = t.persons;
  expect(arthur).toMatchObject({
    name: 'Arthur Penrose',
    sex: 'm',
    birth: { year: 1890, month: 3, day: 14, place: 'Truro, Cornwall, England' },
    death: { year: 1950, approx: true, place: 'Adelaide, South Australia, Australia' },
    photo: 'C:\\Photos\\arthur.jpg',
  });
  expect(arthur.notes).toBe('Occupation: Tin miner\n\nFirst line\nsecond line, which is long');
  expect(edna).toMatchObject({ name: 'Edna Vale', birth: { year: 1892, approx: true }, deceased: true, notes: 'Kept bees.\nWon prizes for honey.' });
  expect(edna.death).toBeUndefined();
  expect(lily).toMatchObject({ name: 'Lily Penrose', birth: { year: 1921, month: 3 } });
  expect(unknown.birth).toMatchObject({ year: 1923 });
});

test('families come from FAM records and from FAMC/FAMS on the person', () => {
  const t = parseGedcom(GED, 'Penrose');
  expect(t.families).toEqual([{ partners: ['@I1@', '@I2@'], children: ['@I4@', '@I3@'] }]);
  const data = toTreeData(t);
  const name = (id: string) => data.persons.find(p => p.id === id)!.name;
  const parents = data.relationships.filter(r => r.type === 'parent').map(r => `${name(r.fromPersonId)}>${name(r.toPersonId)}`);
  expect(parents.sort()).toEqual(
    ['Arthur Penrose>Lily Penrose', 'Arthur Penrose>Unknown Penrose', 'Edna Vale>Lily Penrose', 'Edna Vale>Unknown Penrose'].sort(),
  );
  expect(data.relationships.filter(r => r.type === 'spouse')).toHaveLength(1);
  const arthur = data.persons.find(p => p.name === 'Arthur Penrose')!;
  expect(arthur).toMatchObject({ birthYear: 1890, birthDate: '1890-03-14', birthPlace: 'Truro, Cornwall, England', originRegion: 'England', deathYear: 1950, datesApprox: true });
  const edna = data.persons.find(p => p.name === 'Edna Vale')!;
  expect(edna.deceased).toBe(true);
});

test('dates', () => {
  expect(parseDate('2 JAN 1900')).toEqual({ year: 1900, month: 1, day: 2 });
  expect(parseDate('@#DJULIAN@ 1700/01')).toEqual({ year: 1700 });
  expect(parseDate('ABT 1040 B.C.')).toEqual({ year: -1040, approx: true });
  expect(parseDate('FROM 1900 TO 1910')).toEqual({ year: 1900, approx: true });
  expect(parseDate('AFT JUN 1850')).toEqual({ year: 1850, month: 6, approx: true });
  expect(parseDate('INT 1880 (from the parish book)')).toEqual({ year: 1880, approx: true });
  expect(parseDate('12 MAR')).toBeUndefined();
  expect(parseDate('unknown')).toBeUndefined();
});

test('cycles and a third parent are dropped', () => {
  const t = parseGedcom(
    `0 HEAD
0 @A@ INDI
1 NAME A
0 @B@ INDI
1 NAME B
0 @C@ INDI
1 NAME C
0 @F1@ FAM
1 HUSB @A@
1 CHIL @B@
0 @F2@ FAM
1 HUSB @B@
1 CHIL @A@
0 @F3@ FAM
1 HUSB @B@
1 WIFE @C@
1 CHIL @C@
0 TRLR`,
  );
  const data = toTreeData(t);
  const parents = data.relationships.filter(r => r.type === 'parent');
  expect(parents).toHaveLength(2); // A>B, B>C (A>B>A cycle and C>C self-link removed)
});

test('rejects non-GEDCOM text', () => {
  expect(() => parseGedcom('hello world')).toThrow('Not a GEDCOM file.');
});
