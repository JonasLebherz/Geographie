/**
 * lib/geodaten/kontinente.js – Welche Länder zu welchem Kontinent gehören
 *
 * Gefragt werden nur unabhängige Staaten: die 193 UN-Mitglieder, dazu Vatikanstadt,
 * Kosovo, Palästina und Taiwan. Abhängige Gebiete (Grönland, Puerto Rico, Neukaledonien …)
 * und umstrittene Gebiete (Westsahara) erscheinen auf der Karte nur grau als Umgebung.
 *
 * Zuordnung wie in deutschen Atlanten üblich:
 *  - Russland gehört zu Europa, die Türkei und die Kaukasusstaaten zu Asien.
 *  - Zypern gehört zu Europa (EU-Mitglied, obwohl geografisch in Asien).
 *  - Nordamerika umfasst Mittelamerika und die Karibik.
 *
 * mitte:  Mittelpunkt der Projektion. Die Karte ist flächentreu (Azimutalprojektion),
 *         Länder am Rand werden also nicht aufgebläht.
 * teile:  Kästen [[Länge West, Breite Süd], [Länge Ost, Breite Nord]], die festlegen, welche
 *         Inseln und Außengebiete eines Landes zum Kontinent gehören (die größte Fläche
 *         zählt immer). Französisch-Guayana gehört so nicht zu Europa, Hawaii nicht in den
 *         Ausschnitt Nordamerikas. Länge darf über 180 gehen (Ozeanien, Datumsgrenze).
 *         Die Karte wird auf diese Teile der gefragten Länder eingepasst.
 * einpassen: Ausnahmen für die Einpassung – `ohne` (Länder, die nicht zählen) und `punkte`
 *         (Orte, die zusätzlich sichtbar sein sollen). Für Europa: Russland nur bis zum Ural,
 *         sonst käme ganz Sibirien mit.
 * beschriftung: Ort des Namens auf der Weltkarte (Länge, Breite).
 * punkte: Orte für Staaten, die als Fläche fehlen oder deren Fläche außerhalb liegt
 *         (Tuvalu fehlt in Natural Earth 1:50 Mio.; Kiribati: Hauptinsel Tarawa).
 */
export const KONTINENTE = [
  {
    slug: 'europa',
    name: 'Europa',
    en: 'Europe',
    mitte: [16, 53],
    teile: [[[-25, 34], [70, 72]]],
    einpassen: { ohne: ['RU'], punkte: [[30, 70], [45, 68.5], [56, 67], [58, 56], [50, 46], [44, 42]] },
    beschriftung: [18, 50],
    laender: [
      'AL', 'AD', 'AT', 'BY', 'BE', 'BA', 'BG', 'HR', 'CY', 'CZ', 'DK', 'EE', 'FI', 'FR', 'DE', 'GR',
      'HU', 'IS', 'IE', 'IT', 'XK', 'LV', 'LI', 'LT', 'LU', 'MT', 'MD', 'MC', 'ME', 'NL', 'MK', 'NO',
      'PL', 'PT', 'RO', 'RU', 'SM', 'RS', 'SK', 'SI', 'ES', 'SE', 'CH', 'UA', 'GB', 'VA',
    ],
    umgebung: ['AX', 'FO', 'GG', 'JE', 'IM'],
  },
  {
    slug: 'asien',
    name: 'Asien',
    en: 'Asia',
    mitte: [90, 25],
    teile: [[[25, -12], [150, 56]]],
    beschriftung: [88, 34],
    laender: [
      'AF', 'AM', 'AZ', 'BH', 'BD', 'BT', 'BN', 'KH', 'CN', 'GE', 'IN', 'ID', 'IR', 'IQ', 'IL', 'JP',
      'JO', 'KZ', 'KW', 'KG', 'LA', 'LB', 'MY', 'MV', 'MN', 'MM', 'NP', 'KP', 'OM', 'PK', 'PS', 'PH',
      'QA', 'SA', 'SG', 'KR', 'LK', 'SY', 'TW', 'TJ', 'TH', 'TL', 'TR', 'TM', 'AE', 'UZ', 'VN', 'YE',
    ],
    umgebung: ['HK', 'MO', 'X-SIACHEN'],
  },
  {
    slug: 'afrika',
    name: 'Afrika',
    en: 'Africa',
    mitte: [17, 2],
    teile: [[[-26, -36], [60, 38]]],
    beschriftung: [19, 6],
    laender: [
      'DZ', 'AO', 'BJ', 'BW', 'BF', 'BI', 'CV', 'CM', 'CF', 'TD', 'KM', 'CG', 'CD', 'CI', 'DJ', 'EG',
      'GQ', 'ER', 'SZ', 'ET', 'GA', 'GM', 'GH', 'GN', 'GW', 'KE', 'LS', 'LR', 'LY', 'MG', 'MW', 'ML',
      'MR', 'MU', 'MA', 'MZ', 'NA', 'NE', 'NG', 'RW', 'ST', 'SN', 'SC', 'SL', 'SO', 'ZA', 'SS', 'SD',
      'TZ', 'TG', 'TN', 'UG', 'ZM', 'ZW',
    ],
    umgebung: ['EH', 'SH'],
  },
  {
    slug: 'nordamerika',
    name: 'Nordamerika',
    en: 'North America',
    mitte: [-96, 40],
    teile: [[[-170, 50], [-10, 85]], [[-126, 6], [-55, 50]]],
    // Eingepasst ohne die Inseln im hohen Norden Kanadas (sie reichen über den oberen Rand hinaus):
    // Kanada nur bis zur Festlandküste, Alaska bestimmt den oberen Rand
    einpassen: { ohne: ['CA'], punkte: [[-141, 69.6], [-125, 70], [-110, 68.5], [-95, 69.5], [-82, 69], [-64, 60], [-55.5, 52]] },
    beschriftung: [-102, 46],
    laender: [
      'AG', 'BS', 'BB', 'BZ', 'CA', 'CR', 'CU', 'DM', 'DO', 'SV', 'GD', 'GT', 'HT', 'HN', 'JM', 'MX',
      'NI', 'PA', 'KN', 'LC', 'VC', 'TT', 'US',
    ],
    umgebung: ['GL', 'PR', 'VI', 'AI', 'KY', 'BM', 'VG', 'TC', 'MS', 'PM', 'MF', 'BL', 'AW', 'CW', 'SX'],
  },
  {
    slug: 'suedamerika',
    name: 'Südamerika',
    en: 'South America',
    mitte: [-60, -20],
    teile: [[[-82, -57], [-30, 13]]],
    beschriftung: [-58, -12],
    laender: ['AR', 'BO', 'BR', 'CL', 'CO', 'EC', 'GY', 'PY', 'PE', 'SR', 'UY', 'VE'],
    umgebung: ['FK'],
  },
  {
    slug: 'ozeanien',
    name: 'Ozeanien',
    en: 'Oceania',
    mitte: [158, -14],
    teile: [[[110, -50], [192, 20]]],
    beschriftung: [134, -25],
    laender: ['AU', 'FJ', 'KI', 'MH', 'FM', 'NR', 'NZ', 'PW', 'PG', 'WS', 'SB', 'TO', 'TV', 'VU'],
    umgebung: ['MP', 'GU', 'AS', 'PN', 'NU', 'CK', 'WF', 'PF', 'NC', 'NF', 'X-IOT'],
    punkte: { TV: [179.2, -8.5], KI: [173, 1.4] },
  },
];

export function kontinentFinden(slug) {
  return KONTINENTE.find((k) => k.slug === slug);
}

/** Slug des Quiz in der Bestenliste, z. B. "kontinent-europa". */
export const bestenlistenName = (slug) => `kontinent-${slug}`;
