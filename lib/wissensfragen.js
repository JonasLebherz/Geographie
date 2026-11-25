/**
 * lib/wissensfragen.js – Fragen für das Wissensquiz (app/wissen): allgemeines Wissen, nicht nur
 * Geografie, je vier Antworten
 *
 * Aufbau: { k: Kategorie, de, en, a: [[deutsch, englisch], …] } – die ERSTE Antwort ist richtig,
 * gemischt wird erst im Browser. Neue Fragen einfach anhängen (Fakten bitte prüfen).
 */

export const KATEGORIEN = {
  weltraum: { de: 'Weltraum', en: 'Space' },
  natur: { de: 'Natur & Tiere', en: 'Nature & animals' },
  wissenschaft: { de: 'Wissenschaft', en: 'Science' },
  geschichte: { de: 'Geschichte', en: 'History' },
  sport: { de: 'Sport', en: 'Sports' },
  kultur: { de: 'Kultur', en: 'Culture' },
  technik: { de: 'Technik', en: 'Technology' },
  essen: { de: 'Essen', en: 'Food' },
  alltag: { de: 'Allerlei', en: 'Miscellaneous' },
};

const f = (k, de, en, ...a) => ({ k, de, en, a });

export const WISSENSFRAGEN = [
  // Weltraum
  f('weltraum', 'Welcher Planet ist der Sonne am nächsten?', 'Which planet is closest to the Sun?', ['Merkur', 'Mercury'], ['Venus', 'Venus'], ['Mars', 'Mars'], ['Erde', 'Earth']),
  f('weltraum', 'Welcher ist der größte Planet unseres Sonnensystems?', 'Which is the largest planet in our solar system?', ['Jupiter', 'Jupiter'], ['Saturn', 'Saturn'], ['Neptun', 'Neptune'], ['Erde', 'Earth']),
  f('weltraum', 'Welcher Planet wird „Roter Planet“ genannt?', 'Which planet is called the “Red Planet”?', ['Mars', 'Mars'], ['Venus', 'Venus'], ['Jupiter', 'Jupiter'], ['Merkur', 'Mercury']),
  f('weltraum', 'Wer betrat 1969 als erster Mensch den Mond?', 'Who was the first person to walk on the Moon in 1969?', ['Neil Armstrong', 'Neil Armstrong'], ['Buzz Aldrin', 'Buzz Aldrin'], ['Juri Gagarin', 'Yuri Gagarin'], ['Michael Collins', 'Michael Collins']),
  f('weltraum', 'Wie viele Planeten hat unser Sonnensystem?', 'How many planets are there in our solar system?', ['8', '8'], ['9', '9'], ['7', '7'], ['10', '10']),
  f('weltraum', 'Wer war der erste Mensch im Weltraum?', 'Who was the first person in space?', ['Juri Gagarin', 'Yuri Gagarin'], ['Neil Armstrong', 'Neil Armstrong'], ['Alan Shepard', 'Alan Shepard'], ['Walentina Tereschkowa', 'Valentina Tereshkova']),
  f('weltraum', 'Welcher Planet hat die auffälligsten Ringe?', 'Which planet has the most prominent rings?', ['Saturn', 'Saturn'], ['Jupiter', 'Jupiter'], ['Mars', 'Mars'], ['Venus', 'Venus']),

  // Natur & Tiere
  f('natur', 'Welches ist das größte Tier der Erde?', 'What is the largest animal on Earth?', ['Blauwal', 'Blue whale'], ['Afrikanischer Elefant', 'African elephant'], ['Pottwal', 'Sperm whale'], ['Walhai', 'Whale shark']),
  f('natur', 'Wie viele Beine hat eine Spinne?', 'How many legs does a spider have?', ['8', '8'], ['6', '6'], ['10', '10'], ['12', '12']),
  f('natur', 'Welches Landtier ist das schnellste?', 'Which land animal is the fastest?', ['Gepard', 'Cheetah'], ['Löwe', 'Lion'], ['Gabelbock', 'Pronghorn'], ['Pferd', 'Horse']),
  f('natur', 'Wie nennt man ein junges Pferd?', 'What is a young horse called?', ['Fohlen', 'Foal'], ['Kalb', 'Calf'], ['Welpe', 'Puppy'], ['Ferkel', 'Piglet']),
  f('natur', 'Welches Säugetier kann wirklich fliegen?', 'Which mammal can truly fly?', ['Fledermaus', 'Bat'], ['Flughörnchen', 'Flying squirrel'], ['Pinguin', 'Penguin'], ['Strauß', 'Ostrich']),
  f('natur', 'Was fressen Pandas hauptsächlich?', 'What do pandas mainly eat?', ['Bambus', 'Bamboo'], ['Fisch', 'Fish'], ['Eukalyptus', 'Eucalyptus'], ['Gras', 'Grass']),
  f('natur', 'Wie viele Herzen hat ein Krake?', 'How many hearts does an octopus have?', ['3', '3'], ['1', '1'], ['2', '2'], ['4', '4']),
  f('natur', 'Welcher Vogel kann rückwärts fliegen?', 'Which bird can fly backwards?', ['Kolibri', 'Hummingbird'], ['Spatz', 'Sparrow'], ['Adler', 'Eagle'], ['Taube', 'Pigeon']),
  f('natur', 'Welches Gas nehmen Pflanzen bei der Fotosynthese auf?', 'Which gas do plants take in during photosynthesis?', ['Kohlendioxid', 'Carbon dioxide'], ['Sauerstoff', 'Oxygen'], ['Stickstoff', 'Nitrogen'], ['Helium', 'Helium']),
  f('natur', 'Welches dieser Tiere ist ein Säugetier?', 'Which of these animals is a mammal?', ['Delfin', 'Dolphin'], ['Hai', 'Shark'], ['Krokodil', 'Crocodile'], ['Pinguin', 'Penguin']),
  f('natur', 'Welches ist das härteste natürliche Material?', 'What is the hardest natural material?', ['Diamant', 'Diamond'], ['Granit', 'Granite'], ['Eisen', 'Iron'], ['Quarz', 'Quartz']),

  // Wissenschaft
  f('wissenschaft', 'Was ist die chemische Formel von Wasser?', 'What is the chemical formula of water?', ['H₂O', 'H₂O'], ['CO₂', 'CO₂'], ['O₂', 'O₂'], ['NaCl', 'NaCl']),
  f('wissenschaft', 'Bei wie viel Grad Celsius kocht Wasser auf Meereshöhe?', 'At how many degrees Celsius does water boil at sea level?', ['100', '100'], ['90', '90'], ['80', '80'], ['120', '120']),
  f('wissenschaft', 'Welches Element hat das Symbol „Au“?', 'Which element has the symbol “Au”?', ['Gold', 'Gold'], ['Silber', 'Silver'], ['Aluminium', 'Aluminium'], ['Argon', 'Argon']),
  f('wissenschaft', 'Wie viele Knochen hat ein erwachsener Mensch ungefähr?', 'About how many bones does an adult human have?', ['206', '206'], ['150', '150'], ['300', '300'], ['412', '412']),
  f('wissenschaft', 'Welches Organ pumpt das Blut durch den Körper?', 'Which organ pumps blood through the body?', ['Herz', 'Heart'], ['Lunge', 'Lungs'], ['Leber', 'Liver'], ['Niere', 'Kidney']),
  f('wissenschaft', 'Wer entwickelte die Relativitätstheorie?', 'Who developed the theory of relativity?', ['Albert Einstein', 'Albert Einstein'], ['Isaac Newton', 'Isaac Newton'], ['Marie Curie', 'Marie Curie'], ['Galileo Galilei', 'Galileo Galilei']),
  f('wissenschaft', 'Was misst man in Hertz?', 'What is measured in hertz?', ['Frequenz', 'Frequency'], ['Temperatur', 'Temperature'], ['Gewicht', 'Weight'], ['Stromstärke', 'Electric current']),
  f('wissenschaft', 'Wie schnell ist Licht ungefähr?', 'About how fast is light?', ['300.000 km pro Sekunde', '300,000 km per second'], ['300 km pro Sekunde', '300 km per second'], ['30.000 km pro Stunde', '30,000 km per hour'], ['3.000 km pro Sekunde', '3,000 km per second']),
  f('wissenschaft', 'Welche Farbe entsteht beim Malen aus Blau und Gelb?', 'Which colour do you get when mixing blue and yellow paint?', ['Grün', 'Green'], ['Lila', 'Purple'], ['Orange', 'Orange'], ['Braun', 'Brown']),
  f('wissenschaft', 'Was zeigt ein Thermometer an?', 'What does a thermometer show?', ['Temperatur', 'Temperature'], ['Luftdruck', 'Air pressure'], ['Luftfeuchtigkeit', 'Humidity'], ['Windstärke', 'Wind force']),
  f('wissenschaft', 'Wer entdeckte das Penicillin?', 'Who discovered penicillin?', ['Alexander Fleming', 'Alexander Fleming'], ['Louis Pasteur', 'Louis Pasteur'], ['Robert Koch', 'Robert Koch'], ['Marie Curie', 'Marie Curie']),

  // Geschichte
  f('geschichte', 'In welchem Jahr fiel die Berliner Mauer?', 'In which year did the Berlin Wall fall?', ['1989', '1989'], ['1990', '1990'], ['1961', '1961'], ['1979', '1979']),
  f('geschichte', 'Wer war der erste Präsident der USA?', 'Who was the first President of the USA?', ['George Washington', 'George Washington'], ['Abraham Lincoln', 'Abraham Lincoln'], ['Thomas Jefferson', 'Thomas Jefferson'], ['John Adams', 'John Adams']),
  f('geschichte', 'Welches Schiff sank 1912 nach dem Zusammenstoß mit einem Eisberg?', 'Which ship sank in 1912 after hitting an iceberg?', ['Titanic', 'Titanic'], ['Lusitania', 'Lusitania'], ['Bismarck', 'Bismarck'], ['Queen Mary', 'Queen Mary']),
  f('geschichte', 'Wer malte die Mona Lisa?', 'Who painted the Mona Lisa?', ['Leonardo da Vinci', 'Leonardo da Vinci'], ['Michelangelo', 'Michelangelo'], ['Raffael', 'Raphael'], ['Rembrandt', 'Rembrandt']),
  f('geschichte', 'Wer baute die Pyramiden von Gizeh?', 'Who built the pyramids of Giza?', ['Die alten Ägypter', 'The ancient Egyptians'], ['Die Römer', 'The Romans'], ['Die Maya', 'The Maya'], ['Die Griechen', 'The Greeks']),
  f('geschichte', 'In welchem Jahr begann der Zweite Weltkrieg?', 'In which year did World War II begin?', ['1939', '1939'], ['1914', '1914'], ['1945', '1945'], ['1933', '1933']),
  f('geschichte', 'Wer erfand in Europa den Buchdruck mit beweglichen Lettern?', 'Who invented printing with movable type in Europe?', ['Johannes Gutenberg', 'Johannes Gutenberg'], ['Martin Luther', 'Martin Luther'], ['Leonardo da Vinci', 'Leonardo da Vinci'], ['Galileo Galilei', 'Galileo Galilei']),
  f('geschichte', 'Wie hieß der erste deutsche Bundeskanzler?', 'Who was the first Chancellor of West Germany?', ['Konrad Adenauer', 'Konrad Adenauer'], ['Willy Brandt', 'Willy Brandt'], ['Helmut Kohl', 'Helmut Kohl'], ['Ludwig Erhard', 'Ludwig Erhard']),
  f('geschichte', 'In welchem Jahr wurde Deutschland wiedervereinigt?', 'In which year was Germany reunified?', ['1990', '1990'], ['1989', '1989'], ['1991', '1991'], ['1994', '1994']),
  f('geschichte', 'Welcher Seefahrer erreichte 1492 Amerika?', 'Which navigator reached the Americas in 1492?', ['Christoph Kolumbus', 'Christopher Columbus'], ['Vasco da Gama', 'Vasco da Gama'], ['Ferdinand Magellan', 'Ferdinand Magellan'], ['James Cook', 'James Cook']),
  f('geschichte', 'Wie hieß der erste Kaiser des Römischen Reiches?', 'Who was the first emperor of the Roman Empire?', ['Augustus', 'Augustus'], ['Julius Caesar', 'Julius Caesar'], ['Nero', 'Nero'], ['Konstantin', 'Constantine']),

  // Sport
  f('sport', 'Wie viele Spieler einer Mannschaft stehen beim Fußball auf dem Platz?', 'How many players per team are on the pitch in football?', ['11', '11'], ['10', '10'], ['9', '9'], ['12', '12']),
  f('sport', 'Wie oft wurde die deutsche Männer-Nationalmannschaft Fußball-Weltmeister?', 'How many times has the German men’s team won the football World Cup?', ['4', '4'], ['3', '3'], ['5', '5'], ['2', '2']),
  f('sport', 'Alle wie viele Jahre finden Olympische Sommerspiele statt?', 'How often are the Summer Olympics held?', ['Alle 4 Jahre', 'Every 4 years'], ['Alle 2 Jahre', 'Every 2 years'], ['Alle 5 Jahre', 'Every 5 years'], ['Alle 3 Jahre', 'Every 3 years']),
  f('sport', 'In welcher Sportart gibt es einen „Slam Dunk“?', 'In which sport is there a “slam dunk”?', ['Basketball', 'Basketball'], ['Volleyball', 'Volleyball'], ['Tennis', 'Tennis'], ['Handball', 'Handball']),
  f('sport', 'Wie viele Ringe hat das olympische Symbol?', 'How many rings does the Olympic symbol have?', ['5', '5'], ['4', '4'], ['6', '6'], ['7', '7']),
  f('sport', 'Wie lang ist ein Marathon?', 'How long is a marathon?', ['42,195 km', '42.195 km'], ['40 km', '40 km'], ['50 km', '50 km'], ['21,1 km', '21.1 km']),
  f('sport', 'Wie viele Punkte zählt ein Touchdown im American Football?', 'How many points is a touchdown worth in American football?', ['6', '6'], ['3', '3'], ['7', '7'], ['2', '2']),
  f('sport', 'Welche Farbe hat das Trikot des Führenden der Tour de France?', 'What colour is the jersey of the Tour de France leader?', ['Gelb', 'Yellow'], ['Grün', 'Green'], ['Rosa', 'Pink'], ['Blau', 'Blue']),
  f('sport', 'Wie viele Spieler einer Mannschaft stehen beim Volleyball auf dem Feld?', 'How many players per team are on the court in volleyball?', ['6', '6'], ['5', '5'], ['7', '7'], ['11', '11']),
  f('sport', 'In welcher Sportart gewinnt man in Wimbledon?', 'Which sport is played at Wimbledon?', ['Tennis', 'Tennis'], ['Golf', 'Golf'], ['Cricket', 'Cricket'], ['Rudern', 'Rowing']),

  // Kultur
  f('kultur', 'Wer komponierte die 9. Sinfonie mit der „Ode an die Freude“?', 'Who composed the 9th Symphony with the “Ode to Joy”?', ['Ludwig van Beethoven', 'Ludwig van Beethoven'], ['Wolfgang Amadeus Mozart', 'Wolfgang Amadeus Mozart'], ['Johann Sebastian Bach', 'Johann Sebastian Bach'], ['Joseph Haydn', 'Joseph Haydn']),
  f('kultur', 'Wie viele Tasten hat ein normales Klavier?', 'How many keys does a standard piano have?', ['88', '88'], ['76', '76'], ['92', '92'], ['64', '64']),
  f('kultur', 'Aus welchem Land stammt die Band ABBA?', 'Which country is the band ABBA from?', ['Schweden', 'Sweden'], ['Norwegen', 'Norway'], ['Dänemark', 'Denmark'], ['Finnland', 'Finland']),
  f('kultur', 'Wer schrieb „Romeo und Julia“?', 'Who wrote “Romeo and Juliet”?', ['William Shakespeare', 'William Shakespeare'], ['Johann Wolfgang von Goethe', 'Johann Wolfgang von Goethe'], ['Charles Dickens', 'Charles Dickens'], ['Friedrich Schiller', 'Friedrich Schiller']),
  f('kultur', 'Welcher Zauberschüler besucht die Schule Hogwarts?', 'Which young wizard attends Hogwarts school?', ['Harry Potter', 'Harry Potter'], ['Gandalf', 'Gandalf'], ['Merlin', 'Merlin'], ['Frodo', 'Frodo']),
  f('kultur', 'Wie heißt die Königin in „Die Eiskönigin“, die Eis erschaffen kann?', 'What is the name of the queen in “Frozen” who can create ice?', ['Elsa', 'Elsa'], ['Anna', 'Anna'], ['Rapunzel', 'Rapunzel'], ['Arielle', 'Ariel']),
  f('kultur', 'Wer schrieb „Faust“?', 'Who wrote “Faust”?', ['Johann Wolfgang von Goethe', 'Johann Wolfgang von Goethe'], ['Friedrich Schiller', 'Friedrich Schiller'], ['Thomas Mann', 'Thomas Mann'], ['Heinrich Heine', 'Heinrich Heine']),
  f('kultur', 'Welches Instrument hat in der Regel sechs Saiten?', 'Which instrument usually has six strings?', ['Gitarre', 'Guitar'], ['Geige', 'Violin'], ['Harfe', 'Harp'], ['Cello', 'Cello']),
  f('kultur', 'Wie heißt ein Gedicht mit 14 Zeilen?', 'What is a 14-line poem called?', ['Sonett', 'Sonnet'], ['Haiku', 'Haiku'], ['Limerick', 'Limerick'], ['Ballade', 'Ballad']),
  f('kultur', 'Wer malte „Die Sternennacht“?', 'Who painted “The Starry Night”?', ['Vincent van Gogh', 'Vincent van Gogh'], ['Claude Monet', 'Claude Monet'], ['Pablo Picasso', 'Pablo Picasso'], ['Paul Cézanne', 'Paul Cézanne']),

  // Technik
  f('technik', 'Wofür steht „www“?', 'What does “www” stand for?', ['World Wide Web', 'World Wide Web'], ['World Web Wide', 'World Web Wide'], ['Wide World Web', 'Wide World Web'], ['Web World Wide', 'Web World Wide']),
  f('technik', 'Wie viele Bits hat ein Byte?', 'How many bits are in a byte?', ['8', '8'], ['4', '4'], ['16', '16'], ['10', '10']),
  f('technik', 'Welche Firma stellt das iPhone her?', 'Which company makes the iPhone?', ['Apple', 'Apple'], ['Samsung', 'Samsung'], ['Google', 'Google'], ['Microsoft', 'Microsoft']),
  f('technik', 'Wer meldete 1876 das Telefon zum Patent an?', 'Who patented the telephone in 1876?', ['Alexander Graham Bell', 'Alexander Graham Bell'], ['Thomas Edison', 'Thomas Edison'], ['Nikola Tesla', 'Nikola Tesla'], ['Guglielmo Marconi', 'Guglielmo Marconi']),
  f('technik', 'Was erfand Carl Benz 1886?', 'What did Carl Benz invent in 1886?', ['Das Automobil', 'The automobile'], ['Das Fahrrad', 'The bicycle'], ['Das Flugzeug', 'The aeroplane'], ['Die Dampfmaschine', 'The steam engine']),
  f('technik', 'Wie heißt der kleinste Bildpunkt auf einem Bildschirm?', 'What is the smallest dot on a screen called?', ['Pixel', 'Pixel'], ['Bit', 'Bit'], ['Byte', 'Byte'], ['Voxel', 'Voxel']),
  f('technik', 'Wer erfand die Glühbirne, die sich durchsetzte (1879)?', 'Who invented the light bulb that caught on (1879)?', ['Thomas Edison', 'Thomas Edison'], ['Nikola Tesla', 'Nikola Tesla'], ['Werner von Siemens', 'Werner von Siemens'], ['James Watt', 'James Watt']),

  // Essen
  f('essen', 'Aus welchem Land stammt die Pizza Margherita?', 'Which country does pizza Margherita come from?', ['Italien', 'Italy'], ['Frankreich', 'France'], ['Spanien', 'Spain'], ['Griechenland', 'Greece']),
  f('essen', 'Woraus wird Guacamole hauptsächlich gemacht?', 'What is guacamole mainly made from?', ['Avocado', 'Avocado'], ['Tomate', 'Tomato'], ['Gurke', 'Cucumber'], ['Erbsen', 'Peas']),
  f('essen', 'Welche Frucht hat eine harte, haarige Schale und wächst an Palmen?', 'Which fruit has a hard, hairy shell and grows on palm trees?', ['Kokosnuss', 'Coconut'], ['Ananas', 'Pineapple'], ['Mango', 'Mango'], ['Banane', 'Banana']),
  f('essen', 'Woraus wird Tofu hergestellt?', 'What is tofu made from?', ['Sojabohnen', 'Soybeans'], ['Reis', 'Rice'], ['Kartoffeln', 'Potatoes'], ['Weizen', 'Wheat']),
  f('essen', 'Welches Gewürz gilt als das teuerste der Welt?', 'Which spice is considered the most expensive in the world?', ['Safran', 'Saffron'], ['Vanille', 'Vanilla'], ['Zimt', 'Cinnamon'], ['Pfeffer', 'Pepper']),
  f('essen', 'Woraus wird Popcorn gemacht?', 'What is popcorn made from?', ['Mais', 'Corn'], ['Reis', 'Rice'], ['Weizen', 'Wheat'], ['Hafer', 'Oats']),
  f('essen', 'Aus welchem Land kommt Sushi?', 'Which country does sushi come from?', ['Japan', 'Japan'], ['China', 'China'], ['Korea', 'Korea'], ['Thailand', 'Thailand']),

  // Allerlei
  f('alltag', 'Wie viele Tage hat ein Schaltjahr?', 'How many days are in a leap year?', ['366', '366'], ['365', '365'], ['364', '364'], ['367', '367']),
  f('alltag', 'Wie viele Seiten hat ein Sechseck?', 'How many sides does a hexagon have?', ['6', '6'], ['5', '5'], ['8', '8'], ['7', '7']),
  f('alltag', 'Welche Farbe hat ein Smaragd?', 'What colour is an emerald?', ['Grün', 'Green'], ['Rot', 'Red'], ['Blau', 'Blue'], ['Gelb', 'Yellow']),
  f('alltag', 'Wie viele Stunden hat eine Woche?', 'How many hours are in a week?', ['168', '168'], ['144', '144'], ['172', '172'], ['120', '120']),
  f('alltag', 'Was ist die Quadratwurzel aus 81?', 'What is the square root of 81?', ['9', '9'], ['8', '8'], ['7', '7'], ['18', '18']),
  f('alltag', 'Welcher Monat hat die wenigsten Tage?', 'Which month has the fewest days?', ['Februar', 'February'], ['April', 'April'], ['Juni', 'June'], ['November', 'November']),
  f('alltag', 'Welche Sprache hat die meisten Muttersprachler?', 'Which language has the most native speakers?', ['Chinesisch (Mandarin)', 'Chinese (Mandarin)'], ['Englisch', 'English'], ['Spanisch', 'Spanish'], ['Hindi', 'Hindi']),
  f('alltag', 'Was ist das Gegenteil von Ebbe?', 'What is the opposite of low tide?', ['Flut', 'High tide'], ['Welle', 'Wave'], ['Strömung', 'Current'], ['Brandung', 'Surf']),
  f('alltag', 'Wie viele Nullen hat eine Million?', 'How many zeros does a million have?', ['6', '6'], ['5', '5'], ['7', '7'], ['9', '9']),
  f('alltag', 'Welche Farbe entsteht, wenn man Rot und Weiß mischt?', 'Which colour do you get by mixing red and white?', ['Rosa', 'Pink'], ['Orange', 'Orange'], ['Lila', 'Purple'], ['Braun', 'Brown']),
  f('alltag', 'Wie viele Minuten hat ein Tag?', 'How many minutes are in a day?', ['1440', '1,440'], ['1240', '1,240'], ['1000', '1,000'], ['3600', '3,600']),
];
