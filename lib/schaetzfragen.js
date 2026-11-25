/**
 * lib/schaetzfragen.js – Fragen für „Schätzen“ (app/schaetzen, Party): Antwort ist eine Zahl
 *
 * Wunsch: Fragen wie „Wie viele Beine hat ein Tausendfüßer?“ – man tippt eine Zahl, je näher,
 * desto mehr Punkte (0–100). Aufbau: { de, en, z: Zahl, e: [Einheit de, en], j: Jahreszahl? }.
 * Gewertet wird das Verhältnis (10 % daneben ≈ 79 Punkte, doppelt so viel ≈ 18), bei
 * Jahreszahlen der Abstand in Jahren (5 Jahre ≈ 78, 20 Jahre ≈ 37). Fakten bitte prüfen;
 * gerundete Werte stehen mit „ungefähr“ in der Frage.
 */

const f = (de, en, z, e = ['', ''], j = false) => ({ de, en, z, e, j });
const jahr = (de, en, z) => f(de, en, z, ['', ''], true);

const M = ['m', 'm'];
const KM = ['km', 'km'];
const MIO = ['Millionen', 'million'];

export const SCHAETZFRAGEN = [
  // Tiere und Mensch
  f('Wie viele Beine hat der Tausendfüßer mit den meisten Beinen?', 'How many legs does the millipede with the most legs have?', 1306, ['Beine', 'legs']),
  f('Wie viele Beine hat eine Spinne?', 'How many legs does a spider have?', 8, ['Beine', 'legs']),
  f('Wie viele Arme hat ein Krake?', 'How many arms does an octopus have?', 8, ['Arme', 'arms']),
  f('Wie viele Herzen hat ein Krake?', 'How many hearts does an octopus have?', 3, ['Herzen', 'hearts']),
  f('Wie viele Monate ist eine Elefantenkuh ungefähr trächtig?', 'For about how many months is an elephant pregnant?', 22, ['Monate', 'months']),
  f('Wie schnell kann ein Gepard ungefähr laufen?', 'About how fast can a cheetah run?', 110, ['km/h', 'km/h']),
  f('Wie viele Stunden schläft ein Koala ungefähr am Tag?', 'About how many hours a day does a koala sleep?', 20, ['Stunden', 'hours']),
  f('Wie viele Bienen leben im Sommer ungefähr in einem Bienenvolk?', 'About how many bees live in a hive in summer?', 50000, ['Bienen', 'bees']),
  f('Wie viele Eier legt ein Legehuhn ungefähr im Jahr?', 'About how many eggs does a laying hen lay per year?', 300, ['Eier', 'eggs']),
  f('Wie viele Pinguinarten gibt es ungefähr?', 'About how many species of penguin are there?', 18, ['Arten', 'species']),
  f('Wie viele Knochen hat ein erwachsener Mensch?', 'How many bones does an adult human have?', 206, ['Knochen', 'bones']),
  f('Wie viele Zähne hat ein Erwachsener mit Weisheitszähnen?', 'How many teeth does an adult have including wisdom teeth?', 32, ['Zähne', 'teeth']),
  f('Wie viele Milchzähne hat ein Kind?', 'How many baby teeth does a child have?', 20, ['Zähne', 'teeth']),
  f('Wie viele Rippen hat ein Mensch?', 'How many ribs does a human have?', 24, ['Rippen', 'ribs']),
  f('Wie oft schlägt das Herz eines Erwachsenen in Ruhe ungefähr pro Minute?', 'About how many times per minute does an adult’s heart beat at rest?', 70, ['Schläge', 'beats']),
  f('Wie viele Liter Blut hat ein Erwachsener ungefähr?', 'About how many litres of blood does an adult have?', 5, ['Liter', 'litres']),
  f('Wie viele Haare hat ein Mensch ungefähr auf dem Kopf?', 'About how many hairs does a person have on their head?', 100000, ['Haare', 'hairs']),
  f('Wie viel Prozent des menschlichen Körpers sind ungefähr Wasser?', 'About what percentage of the human body is water?', 60, ['%', '%']),
  f('Wie viele Wochen dauert eine Schwangerschaft ungefähr?', 'About how many weeks does a pregnancy last?', 40, ['Wochen', 'weeks']),
  f('Wie viele Chromosomen hat ein Mensch?', 'How many chromosomes does a human have?', 46, ['Chromosomen', 'chromosomes']),
  f('Wie alt wurde der älteste Mensch, dessen Alter belegt ist?', 'How old was the oldest person whose age is verified?', 122, ['Jahre', 'years']),
  f('Wie groß war der größte Mensch, dessen Größe belegt ist?', 'How tall was the tallest person whose height is verified?', 272, ['cm', 'cm']),
  f('Wie hoch ist die normale Körpertemperatur ungefähr?', 'About how high is normal body temperature?', 37, ['°C', '°C']),

  // Erde und Weltall
  f('Wie hoch ist der Mount Everest?', 'How high is Mount Everest?', 8849, M),
  f('Wie hoch ist die Zugspitze?', 'How high is the Zugspitze?', 2962, M),
  f('Wie hoch ist der Mont Blanc ungefähr?', 'About how high is Mont Blanc?', 4806, M),
  f('Wie hoch ist der Kilimandscharo?', 'How high is Kilimanjaro?', 5895, M),
  f('Wie hoch ist der Brocken im Harz?', 'How high is the Brocken in the Harz mountains?', 1141, M),
  f('Wie tief ist der Marianengraben ungefähr?', 'About how deep is the Mariana Trench?', 11000, M),
  f('Wie lang ist der Nil ungefähr?', 'About how long is the Nile?', 6650, KM),
  f('Wie lang ist der Rhein ungefähr?', 'About how long is the Rhine?', 1230, KM),
  f('Wie lang ist die Donau ungefähr?', 'About how long is the Danube?', 2850, KM),
  f('Wie lang ist die Elbe ungefähr?', 'About how long is the Elbe?', 1090, KM),
  f('Wie tief ist der Bodensee an der tiefsten Stelle?', 'How deep is Lake Constance at its deepest point?', 251, M),
  f('Wie viel Prozent der Erdoberfläche sind ungefähr von Wasser bedeckt?', 'About what percentage of the Earth’s surface is covered by water?', 71, ['%', '%']),
  f('Wie lang ist der Äquator ungefähr?', 'About how long is the equator?', 40075, KM),
  f('Wie groß ist der Durchmesser der Erde ungefähr?', 'About how large is the Earth’s diameter?', 12742, KM),
  f('Wie weit ist der Mond ungefähr von der Erde entfernt?', 'About how far is the Moon from the Earth?', 384400, KM),
  f('Wie viele Millionen Kilometer ist die Sonne ungefähr von der Erde entfernt?', 'About how many million kilometres is the Sun from the Earth?', 150, ['Mio. km', 'million km']),
  f('Wie viele Minuten braucht das Licht ungefähr von der Sonne zur Erde?', 'About how many minutes does light take to travel from the Sun to the Earth?', 8, ['Minuten', 'minutes']),
  f('Wie schnell ist das Licht ungefähr?', 'About how fast is light?', 300000, ['km/s', 'km/s']),
  f('Wie schnell ist der Schall in der Luft ungefähr?', 'About how fast is sound in air?', 343, ['m/s', 'm/s']),
  f('Wie heiß ist die Oberfläche der Sonne ungefähr?', 'About how hot is the surface of the Sun?', 5500, ['°C', '°C']),
  f('Wie viele Monde hat der Mars?', 'How many moons does Mars have?', 2, ['Monde', 'moons']),
  f('Wie viele Tage dauert es ungefähr von einem Vollmond zum nächsten?', 'About how many days is it from one full moon to the next?', 29.5, ['Tage', 'days']),
  f('Vor wie vielen Millionen Jahren starben die Dinosaurier ungefähr aus?', 'About how many million years ago did the dinosaurs die out?', 66, ['Mio. Jahre', 'million years']),
  f('Wie viele Milliarden Jahre ist die Erde ungefähr alt?', 'About how many billion years old is the Earth?', 4.5, ['Mrd. Jahre', 'billion years']),
  f('Mit wie viel km/h dreht sich die Erde am Äquator ungefähr?', 'About how fast does the Earth spin at the equator?', 1670, ['km/h', 'km/h']),
  f('Wie viele Zeitzonen hat Russland?', 'How many time zones does Russia have?', 11, ['Zeitzonen', 'time zones']),

  // Länder und Städte
  f('Wie viele Millionen Menschen leben ungefähr in Deutschland?', 'About how many million people live in Germany?', 84, MIO),
  f('Wie viele Milliarden Menschen leben ungefähr auf der Erde?', 'About how many billion people live on Earth?', 8, ['Milliarden', 'billion']),
  f('Wie viele Millionen Menschen leben ungefähr in den USA?', 'About how many million people live in the USA?', 340, MIO),
  f('Wie viele Millionen Menschen leben ungefähr in Frankreich?', 'About how many million people live in France?', 68, MIO),
  f('Wie viele Millionen Menschen leben ungefähr in Österreich?', 'About how many million people live in Austria?', 9, MIO),
  f('Wie viele Millionen Menschen leben ungefähr in München?', 'About how many million people live in Munich?', 1.5, MIO),
  f('Wie viele Menschen leben ungefähr in der Vatikanstadt?', 'About how many people live in Vatican City?', 800, ['Menschen', 'people']),
  f('Wie groß ist Deutschland ungefähr?', 'About how big is Germany?', 357000, ['km²', 'km²']),
  f('An wie viele Länder grenzt Deutschland?', 'How many countries border Germany?', 9, ['Länder', 'countries']),
  f('Wie viele Länder sind Mitglied der EU?', 'How many countries are members of the EU?', 27, ['Länder', 'countries']),
  f('Wie viele Staaten sind Mitglied der Vereinten Nationen?', 'How many states are members of the United Nations?', 193, ['Staaten', 'states']),
  f('Wie viele Bundesstaaten haben die USA?', 'How many states does the USA have?', 50, ['Bundesstaaten', 'states']),
  f('Wie viele Streifen hat die Flagge der USA?', 'How many stripes does the flag of the USA have?', 13, ['Streifen', 'stripes']),
  f('Wie viele Sterne hat die Flagge der EU?', 'How many stars does the flag of the EU have?', 12, ['Sterne', 'stars']),
  f('Aus wie vielen Inseln besteht Indonesien ungefähr?', 'About how many islands make up Indonesia?', 17000, ['Inseln', 'islands']),
  f('Aus wie vielen Inseln bestehen die Malediven ungefähr?', 'About how many islands make up the Maldives?', 1200, ['Inseln', 'islands']),
  f('Wie viele Kilometer sind es ungefähr Luftlinie von Berlin nach München?', 'About how many kilometres is it as the crow flies from Berlin to Munich?', 500, KM),
  f('Wie lang ist das deutsche Autobahnnetz ungefähr?', 'About how long is the German motorway network?', 13200, KM),
  f('Wie viele Sprachen werden auf der Welt ungefähr gesprochen?', 'About how many languages are spoken in the world?', 7000, ['Sprachen', 'languages']),

  // Bauwerke
  f('Wie hoch ist der Eiffelturm ungefähr?', 'About how tall is the Eiffel Tower?', 330, M),
  f('Wie viele Stufen hat der Eiffelturm bis zur Spitze?', 'How many steps does the Eiffel Tower have to the top?', 1665, ['Stufen', 'steps']),
  f('Wie hoch ist der Burj Khalifa?', 'How tall is the Burj Khalifa?', 828, M),
  f('Wie viele Stockwerke hat der Burj Khalifa?', 'How many floors does the Burj Khalifa have?', 163, ['Stockwerke', 'floors']),
  f('Wie hoch ist der Kölner Dom?', 'How tall is Cologne Cathedral?', 157, M),
  f('Wie hoch ist der Berliner Fernsehturm?', 'How tall is the Berlin TV Tower?', 368, M),
  f('Wie hoch ist die Freiheitsstatue mit Sockel ungefähr?', 'About how tall is the Statue of Liberty including its pedestal?', 93, M),
  f('Wie hoch war die Cheops-Pyramide ursprünglich ungefähr?', 'About how tall was the Great Pyramid of Giza originally?', 146, M),

  // Sport und Spiel
  f('Wie viele Felder hat ein Schachbrett?', 'How many squares does a chessboard have?', 64, ['Felder', 'squares']),
  f('Wie viele Karten hat ein Pokerblatt ohne Joker?', 'How many cards are in a poker deck without jokers?', 52, ['Karten', 'cards']),
  f('Wie viele Karten hat ein Skatblatt?', 'How many cards are in a Skat deck?', 32, ['Karten', 'cards']),
  f('Wie viele Augen hat ein Würfel zusammen?', 'How many pips does a die have in total?', 21, ['Augen', 'pips']),
  f('Wie lang ist ein Marathon ungefähr?', 'About how long is a marathon?', 42.195, KM),
  f('Wie lang ist ein Fußballfeld bei einer WM?', 'How long is a football pitch at a World Cup?', 105, M),
  f('Wie viele Meter ist der Elfmeterpunkt vom Tor entfernt?', 'How many metres is the penalty spot from the goal?', 11, M),
  f('Wie breit ist ein Fußballtor?', 'How wide is a football goal?', 7.32, M),
  f('Wie viel wiegt ein Fußball ungefähr?', 'About how much does a football weigh?', 430, ['g', 'g']),
  f('Wie lang ist ein olympisches Schwimmbecken?', 'How long is an Olympic swimming pool?', 50, M),
  f('Wie viele Sekunden beträgt der Weltrekord über 100 Meter der Männer?', 'How many seconds is the men’s 100 metres world record?', 9.58, ['Sekunden', 'seconds']),
  f('Wie hoch ist der Weltrekord im Hochsprung der Männer?', 'How high is the men’s high jump world record?', 2.45, M),
  f('Wie viele Etappen hat die Tour de France?', 'How many stages does the Tour de France have?', 21, ['Etappen', 'stages']),
  f('Wie viele Mannschaften spielten bei der Fußball-WM 2026 mit?', 'How many teams played at the 2026 World Cup?', 48, ['Mannschaften', 'teams']),
  f('Wie viele Tasten hat ein Klavier?', 'How many keys does a piano have?', 88, ['Tasten', 'keys']),

  // Zahlen und Alltag
  f('Wie viele Stunden hat eine Woche?', 'How many hours are in a week?', 168, ['Stunden', 'hours']),
  f('Wie viele Minuten hat ein Tag?', 'How many minutes are in a day?', 1440, ['Minuten', 'minutes']),
  f('Wie viele Sekunden hat eine Stunde?', 'How many seconds are in an hour?', 3600, ['Sekunden', 'seconds']),
  f('Wie oft schlägt ein Herz ungefähr an einem Tag?', 'About how many times does a heart beat in a day?', 100000, ['Schläge', 'beats']),
  f('Wie viele Grad hat ein Kreis?', 'How many degrees are in a circle?', 360, ['Grad', 'degrees']),
  f('Wie viele Kanten hat ein Würfel?', 'How many edges does a cube have?', 12, ['Kanten', 'edges']),
  f('Wie viele Primzahlen gibt es unter 100?', 'How many prime numbers are there below 100?', 25, ['Primzahlen', 'primes']),
  f('Wie viele Nullen hat eine Milliarde?', 'How many zeros does a billion have?', 9, ['Nullen', 'zeros']),
  f('Wie viel Volt hat eine Steckdose in Deutschland?', 'How many volts does a socket in Germany have?', 230, ['Volt', 'volts']),
  f('Wie viele Pixel ist ein Full-HD-Bild breit?', 'How many pixels wide is a Full HD image?', 1920, ['Pixel', 'pixels']),
  f('Wie schnell fliegt ein Passagierflugzeug ungefähr?', 'About how fast does a passenger plane fly?', 900, ['km/h', 'km/h']),
  f('In welcher Höhe fliegt ein Passagierflugzeug ungefähr?', 'At about what altitude does a passenger plane fly?', 10000, M),
  f('Wie viele Gramm Zucker sind ungefähr in einer Dose Cola (0,33 l)?', 'About how many grams of sugar are in a can of cola (330 ml)?', 35, ['g', 'g']),
  f('Wie viele Brotsorten gibt es in Deutschland ungefähr?', 'About how many types of bread are there in Germany?', 3200, ['Sorten', 'types']),
  f('Wie viele Kalorien hat eine Banane ungefähr?', 'About how many calories does a banana have?', 100, ['kcal', 'kcal']),
  f('Wie viele Bücher hat die Harry-Potter-Reihe?', 'How many books are in the Harry Potter series?', 7, ['Bücher', 'books']),
  f('Wie viele Sinfonien hat Beethoven geschrieben?', 'How many symphonies did Beethoven write?', 9, ['Sinfonien', 'symphonies']),
  f('Wie alt wurde Mozart?', 'How old was Mozart when he died?', 35, ['Jahre', 'years']),

  // Jahreszahlen
  jahr('In welchem Jahr landeten die ersten Menschen auf dem Mond?', 'In which year did people first land on the Moon?', 1969),
  jahr('In welchem Jahr fiel die Berliner Mauer?', 'In which year did the Berlin Wall fall?', 1989),
  jahr('In welchem Jahr erreichte Kolumbus Amerika?', 'In which year did Columbus reach the Americas?', 1492),
  jahr('In welchem Jahr sank die Titanic?', 'In which year did the Titanic sink?', 1912),
  jahr('In welchem Jahr wurde die Bundesrepublik Deutschland gegründet?', 'In which year was the Federal Republic of Germany founded?', 1949),
  jahr('In welchem Jahr wurde der Eiffelturm fertig?', 'In which year was the Eiffel Tower completed?', 1889),
  jahr('In welchem Jahr fand die erste Fußball-WM statt?', 'In which year was the first football World Cup held?', 1930),
  jahr('In welchem Jahr fanden die ersten modernen Olympischen Spiele statt?', 'In which year were the first modern Olympic Games held?', 1896),
  jahr('In welchem Jahr wurde das erste iPhone vorgestellt?', 'In which year was the first iPhone presented?', 2007),
  jahr('In welchem Jahr endete der Zweite Weltkrieg?', 'In which year did World War II end?', 1945),
  jahr('In welchem Jahr flogen die Brüder Wright zum ersten Mal mit einem Motorflugzeug?', 'In which year did the Wright brothers first fly a powered aeroplane?', 1903),
  jahr('In welchem Jahr baute Carl Benz sein erstes Auto?', 'In which year did Carl Benz build his first car?', 1886),
  jahr('In welchem Jahr kam der Euro als Bargeld?', 'In which year did euro cash come into use?', 2002),
  jahr('In welchem Jahr wurde Google gegründet?', 'In which year was Google founded?', 1998),
  jahr('In welchem Jahr veröffentlichte Martin Luther seine 95 Thesen?', 'In which year did Martin Luther publish his 95 Theses?', 1517),
  jahr('In welchem Jahr begann die Französische Revolution?', 'In which year did the French Revolution begin?', 1789),
  jahr('In welchem Jahr erklärten die USA ihre Unabhängigkeit?', 'In which year did the USA declare independence?', 1776),
  jahr('In welchem Jahr flog der erste Mensch ins Weltall?', 'In which year did the first person fly into space?', 1961),
  jahr('In welchem Jahr wurde Deutschland zuletzt Fußball-Weltmeister der Männer?', 'In which year did Germany last win the men’s football World Cup?', 2014),
  jahr('In welchem Jahr wurde Pompeji durch einen Vulkanausbruch verschüttet?', 'In which year was Pompeii buried by a volcanic eruption?', 79),
];

/** Punkte 0–100: Verhältnis zur richtigen Zahl, bei Jahreszahlen der Abstand in Jahren */
export function schaetzPunkte(tipp, frage) {
  if (tipp === null || tipp === undefined || !Number.isFinite(tipp)) return 0;
  if (frage.j) return Math.round(100 * Math.exp(-Math.abs(tipp - frage.z) / 20));
  if (tipp <= 0) return 0;
  return Math.round(100 * Math.exp(-2.5 * Math.abs(Math.log(tipp / frage.z))));
}

/** Farbe wie überall: grün ab 75, gelb ab 35, sonst rot */
export const schaetzFarbe = (punkte) => (punkte >= 75 ? 'gruen' : punkte >= 35 ? 'gelb' : 'rot');

/**
 * Eingabe lesen: „1.306“, „1306“, „1 306“, „2,45“, „2.45“, „42,195“ …
 * Deutsch: Komma = Dezimalzeichen, Punkt mit Dreiergruppen = Tausender (sonst auch Dezimalpunkt).
 * Englisch umgekehrt. Kommen beide vor, ist das letzte das Dezimalzeichen.
 */
export function zahlLesen(text, sprache = 'de') {
  let s = String(text ?? '').trim().replace(/[\s'’_]/g, '');
  if (!s) return null;
  const punkt = s.lastIndexOf('.');
  const komma = s.lastIndexOf(',');
  let dezimal;
  if (punkt >= 0 && komma >= 0) dezimal = punkt > komma ? '.' : ',';
  else {
    const [haupt, neben] = sprache === 'en' ? ['.', ','] : [',', '.'];
    const tausender = new RegExp(`^-?\\d{1,3}(\\${neben}\\d{3})+$`);
    dezimal = s.includes(haupt) || !tausender.test(s) ? (s.includes(haupt) ? haupt : neben) : haupt;
  }
  const tausend = dezimal === '.' ? ',' : '.';
  s = s.split(tausend).join('').replace(dezimal, '.');
  if (!/^-?\d+(\.\d+)?$/.test(s)) return null;
  return Number(s);
}

/** Zahl hübsch: 384.400 bzw. 384,400 – Jahreszahlen ohne Trenner */
export function zahlZeigen(n, sprache = 'de', istJahr = false) {
  if (n === null || n === undefined) return '–';
  if (istJahr) return String(n);
  return new Intl.NumberFormat(sprache === 'en' ? 'en-GB' : 'de-DE', { maximumFractionDigits: 3 }).format(n);
}
