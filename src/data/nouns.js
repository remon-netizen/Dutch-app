// ── De or het: the everyday nouns ────────────────────────────────────────────
// The nouns someone at A2 already uses, each with its article, in sets by theme.
// Knowing the word is not the same as knowing its article, and the article
// decides the adjective ending, deze or dit, die or dat, ons or onze. The nouns
// of the course units join this list as their unit's words are learned
// (grammar/dehet-ui.js adds them).
//
// A set: its de-words and its het-words as "word=meaning, word=meaning".
// Nouns that the official word list gives both articles for the same meaning
// (het/de gordijn, idee, medicijn, shirt) are left out: there is nothing to ask.

const set = (id, title, icon, de, het) => {
  // A comma inside brackets belongs to the meaning: stop (bus, tram).
  const parse = (text, art) => text.split(/,(?![^()]*\))/).map(x => x.trim()).filter(Boolean).map(x => { const [nl, en] = x.split('='); return { nl: nl.trim(), en: en.trim(), art, set: id }; });
  const a = parse(de, 'de'), b = parse(het, 'het');
  // Mixed, with the het-words spread evenly among the de-words, so that every
  // round of a set asks both.
  const nouns = [];
  let i = 0, j = 0;
  while (i < a.length || j < b.length) {
    if (j < b.length && (i >= a.length || j / b.length <= i / a.length)) nouns.push(b[j++]);
    else nouns.push(a[i++]);
  }
  return { id, title, icon, nouns };
};

export const NOUN_SETS = [
  set('people', 'People', '🧑',
    'man=man, vrouw=woman, jongen=boy, baby=baby, vader=father, moeder=mother, broer=brother, zus=sister, zoon=son, dochter=daughter, opa=grandfather, oma=grandmother, oom=uncle, tante=aunt, vriend=friend, buurman=neighbour, familie=family (relatives), mens=human being, persoon=person, groep=group, klant=customer, gast=guest, arts=doctor, leraar=teacher, student=student, politie=police',
    'kind=child, meisje=girl, gezin=family (household), volk=people (nation), lid=member, publiek=audience, team=team'),
  set('home', 'The house', '🏠',
    'kamer=room, keuken=kitchen, badkamer=bathroom, slaapkamer=bedroom, deur=door, muur=wall, vloer=floor, trap=stairs, tuin=garden, gang=corridor, zolder=attic, kelder=cellar, tafel=table, stoel=chair, kast=cupboard, lamp=lamp, spiegel=mirror, douche=shower, sleutel=key, bel=bell, lift=lift, flat=flat (building), woning=home (dwelling), verdieping=floor (storey), garage=garage',
    'huis=house, raam=window, dak=roof, plafond=ceiling, balkon=balcony, bed=bed, bad=bath, toilet=toilet, slot=lock, gebouw=building, appartement=apartment'),
  set('food', 'Food and drink', '🍞',
    'boterham=slice of bread, kaas=cheese, melk=milk, koffie=coffee, thee=tea, wijn=wine, vis=fish, kip=chicken, groente=vegetable, appel=apple, banaan=banana, aardappel=potato, tomaat=tomato, ui=onion, rijst=rice, soep=soup, suiker=sugar, peper=pepper, boter=butter, olie=oil, lunch=lunch, maaltijd=meal, kop=cup, vork=fork, lepel=spoon, fles=bottle, pan=pan, honger=hunger, dorst=thirst, smaak=taste, rekening=bill, bakker=baker, supermarkt=supermarket, markt=market, winkel=shop',
    'brood=bread, water=water, bier=beer, sap=juice, ei=egg, vlees=meat, fruit=fruit, zout=salt, ontbijt=breakfast, avondeten=dinner, eten=food, bord=plate, glas=glass, mes=knife, blik=tin, recept=recipe, restaurant=restaurant, café=café, terras=terrace'),
  set('town', 'Town and travel', '🚲',
    'stad=city, straat=street, weg=road, brug=bridge, halte=stop (bus, tram), bus=bus, trein=train, tram=tram, metro=underground, auto=car, fiets=bicycle, taxi=taxi, boot=boat, haven=harbour, luchthaven=airport, reis=journey, vakantie=holiday, kaart=map / card, buurt=neighbourhood, wijk=district, grens=border, wereld=world, provincie=province, gemeente=municipality, kerk=church, bibliotheek=library, apotheek=pharmacy, school=school, universiteit=university, fabriek=factory, zaak=business / matter',
    'dorp=village, plein=square, park=park, station=station, vliegtuig=aeroplane, schip=ship, vliegveld=airport, kaartje=ticket, hotel=hotel, centrum=centre, land=country, stadhuis=town hall, museum=museum, ziekenhuis=hospital, postkantoor=post office, bedrijf=company'),
  set('time', 'Time', '🕒',
    'tijd=time, minuut=minute, seconde=second, dag=day, week=week, maand=month, eeuw=century, ochtend=morning, middag=afternoon, avond=evening, nacht=night, lente=spring, zomer=summer, herfst=autumn, winter=winter, toekomst=future, datum=date, agenda=diary, klok=clock, verjaardag=birthday',
    'uur=hour, jaar=year, moment=moment, weekend=weekend, seizoen=season, begin=beginning, einde=end, verleden=past, horloge=watch, feest=party'),
  set('body', 'Body and health', '🩺',
    'neus=nose, mond=mouth, tand=tooth, tong=tongue, keel=throat, nek=neck, schouder=shoulder, arm=arm, hand=hand, vinger=finger, rug=back, buik=belly, knie=knee, voet=foot, teen=toe, huid=skin, pijn=pain, koorts=fever, ziekte=illness, griep=flu, pil=pill, gezondheid=health, wond=wound',
    'lichaam=body, hoofd=head, gezicht=face, oog=eye, oor=ear, been=leg, hart=heart, bloed=blood, haar=hair (on your head), ongeluk=accident'),
  set('nature', 'Nature and weather', '🌳',
    'zon=sun, maan=moon, ster=star, hemel=sky / heaven, lucht=air / sky, wolk=cloud, regen=rain, sneeuw=snow, wind=wind, storm=storm, temperatuur=temperature, natuur=nature, boom=tree, bloem=flower, plant=plant, zee=sea, rivier=river, berg=mountain, hond=dog, kat=cat, vogel=bird, koe=cow, muis=mouse, vlieg=fly, aarde=earth, grond=ground, steen=stone (a single one)',
    'weer=weather, onweer=thunderstorm, gras=grass, blad=leaf, bos=forest, strand=beach, meer=lake, eiland=island, dier=animal, paard=horse, varken=pig, schaap=sheep, vuur=fire, zand=sand'),
  set('work', 'Work and school', '💼',
    'baan=job, cursus=course, les=lesson, klas=class, toets=test, vraag=question, fout=mistake, pen=pen, brief=letter (mail), e-mail=e-mail, zin=sentence, taal=language, letter=letter (a, b, c), computer=computer, telefoon=telephone, foto=photo, film=film, muziek=music, krant=newspaper, televisie=television, radio=radio, website=website',
    'werk=work, beroep=profession, salaris=salary, loon=wages, contract=contract, examen=exam, diploma=diploma, huiswerk=homework, antwoord=answer, boek=book, schrift=notebook, potlood=pencil, papier=paper, woord=word, cijfer=figure / mark, nummer=number, getal=number (amount), scherm=screen, lied=song, tijdschrift=magazine, nieuws=news, programma=programme, internet=internet, wachtwoord=password'),
  set('things', 'Things and money', '👜',
    'tas=bag, jas=coat, broek=trousers, trui=jumper, schoen=shoe, sok=sock, hoed=hat, bril=glasses, paraplu=umbrella, prijs=price, euro=euro, portemonnee=wallet, pas=card / pass, handtekening=signature, naam=name, leeftijd=age',
    'cadeau=present, geld=money, paspoort=passport, formulier=form, adres=address'),
  set('ideas', 'Ideas and feelings', '💭',
    'oplossing=solution, reden=reason, kans=chance, keuze=choice, mening=opinion, waarheid=truth, leugen=lie, manier=way, kant=side, plaats=place, plek=spot, ruimte=space, dood=death, liefde=love, vriendschap=friendship, angst=fear, hoop=hope, wet=law, regel=rule, macht=power, vrede=peace, oorlog=war, geschiedenis=history, cultuur=culture, kunst=art, sport=sport, wedstrijd=match, ervaring=experience, kennis=knowledge, aandacht=attention, hulp=help, uitnodiging=invitation, oorzaak=cause, waarde=value, kwaliteit=quality',
    'plan=plan, probleem=problem, doel=goal, gevoel=feeling, verschil=difference, voorbeeld=example, deel=part, geheel=whole, punt=point (in a game / on a list), leven=life, geluk=happiness / luck, recht=right, spel=game, succes=success, geheugen=memory, gesprek=conversation, bezoek=visit, besluit=decision, resultaat=result, gevolg=consequence, belang=interest / importance'),
];

export const NOUNS = NOUN_SETS.flatMap(s => s.nouns);

// ── Rules that help ──────────────────────────────────────────────────────────
// Nothing predicts the article of every noun, but some endings and beginnings
// do, almost without exception. tipFor() gives the rule a noun follows (or
// breaks), for the line under the verdict; RULES is the list for the help sheet.

export const RULES = {
  het: [
    ['every diminutive', 'het meisje, het kaartje, het huisje'],
    ['a verb used as a noun', 'het eten, het leven, het werken'],
    ['words in -um, -ment, -isme, -sel', 'het museum, het moment, het toerisme, het verschijnsel (but: de datum)'],
    ['two-syllable words with ge-, be- or ver-', 'het gebouw, het gevoel, het begin, het bezoek, het verhaal'],
    ['languages, metals, compass points', 'het Nederlands, het goud, het noorden'],
  ],
  de: [
    ['every plural', 'de huizen, de kinderen, de meisjes'],
    ['people and professions', 'de man, de arts, de bakker, de leraar (but: het kind, het meisje)'],
    ['words in -ing, -heid, -ie, -tie, -teit, -ij', 'de rekening, de waarheid, de familie, de vakantie, de kwaliteit, de bakkerij (but: het schilderij)'],
    ['fruit, trees and plants', 'de appel, de boom, de bloem (but: het fruit, het gras)'],
    ['rivers, mountains, letters and numbers', 'de Rijn, de a, de drie'],
  ],
};

const DE_ENDINGS = [
  [/ing$/, 6, 'Words in -ing are de.'],
  [/heid$/, 6, 'Words in -heid are de.'],
  [/teit$/, 6, 'Words in -teit are de.'],
  [/tie$/, 5, 'Words in -tie are de.'],
  [/ie$/, 5, 'Words in -ie are nearly always de.'],
  [/schap$/, 7, 'Many words in -schap are de: de vriendschap, de wetenschap. Those for a role or status are het (het lidmaatschap), and so are het landschap and het gereedschap.'],
  [/uur$/, 5, 'Words in -uur are mostly de: de natuur, de cultuur, de muur (but: het uur, het vuur, het bestuur, het avontuur).'],
];
const HET_ENDINGS = [
  [/je$/, 4, 'A diminutive (-je) is always het.'],
  [/ment$/, 5, 'Words in -ment are het.'],
  [/um$/, 5, 'Words in -um are het.'],
];

// The article of a compound is the article of its last part (het huis, so het stadhuis).
// A last part of three letters is only trusted when it is on the list, and a word
// that merely ends like another one (sneeuw, eeuw) is left out.
const byWord = new Map(NOUNS.map(n => [n.nl, n]));
const SHORT_PARTS = new Set(['dag', 'man']);
const NOT_COMPOUND = new Set(['sneeuw']);
function lastPart(noun) {
  if (NOT_COMPOUND.has(noun.nl)) return null;
  for (let i = 2; i <= noun.nl.length - 3; i++) {
    const tail = byWord.get(noun.nl.slice(i));
    if (tail && tail.art === noun.art && (tail.nl.length >= 4 || SHORT_PARTS.has(tail.nl))) return tail;
  }
  return null;
}

const PERSONS = new Set(['man', 'vrouw', 'jongen', 'baby', 'vader', 'moeder', 'broer', 'zus', 'zoon', 'dochter', 'opa', 'oma', 'oom', 'tante', 'vriend', 'mens', 'persoon', 'klant', 'gast', 'arts', 'leraar', 'student', 'bakker']);

export function tipFor(noun) {
  const w = noun.nl;
  for (const [re, min, text] of HET_ENDINGS) if (re.test(w) && w.length >= min) return noun.art === 'het' ? text : `An exception: ${text.charAt(0).toLowerCase()}${text.slice(1, -1)}, but it is de ${w}.`;
  for (const [re, min, text] of DE_ENDINGS) if (re.test(w) && w.length >= min) return noun.art === 'de' ? text : null;
  const tail = lastPart(noun);
  if (tail) return `A compound takes the article of its last part: ${tail.art} ${tail.nl}, so ${noun.art} ${w}.`;
  const prefix = w.match(/^(ge|be|ver)/);
  if (noun.art === 'het' && prefix && w.length >= 5 && w.length <= 9) return `Many short nouns that begin with ${prefix[1]}- are het.`;
  if (noun.art === 'de' && PERSONS.has(w)) return 'Words for people are nearly always de.';
  return null;
}
