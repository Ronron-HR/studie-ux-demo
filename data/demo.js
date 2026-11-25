/* Studie UX-demo: KUN FIKTIVE DATA.
   Ingen rigtige navne, lærerkoder, lokaler, beskeder eller elevdata.
   Datoerne er låst omkring onsdag 25. november 2026, så demoen altid ser ens ud. */
window.DEMO = {
  elev: 'Demo-elev',
  demoDage: ['2026-11-23', '2026-11-24', '2026-11-25', '2026-11-26', '2026-11-27'],
  startIndex: 2,          // onsdag 25. november
  demoTid: '10:05',       // fast "klokken er" i demoen
  fravaerStart: '2026-08-10',
  demoGraense: 10,        // procent. Opfundet til demo, ikke skolens regel.

  fag: {
    mat: { navn: 'Matematik B' },
    inf: { navn: 'Informatik C' },
    sam: { navn: 'Samfundsfag C' },
    da:  { navn: 'Dansk A' },
    en:  { navn: 'Engelsk A' },
    afs: { navn: 'Afsætning A' },
    vo:  { navn: 'Virksomhedsøkonomi A' },
    ty:  { navn: 'Tysk fortsætter B' }
  },

  /* type: lektion | moede | andet.
     reg: hvad skolen har registreret, når modulet er slut.
       'til' (standard) = til stede, 'U' = ugyldigt fravær, 'ingen' = ikke registreret. */
  moduler: [
    { id: 'm2311a', dato: '2026-11-23', start: '08:10', slut: '09:40', fag: 'da',  laerer: 'abc', lokale: 'C202', type: 'lektion' },
    { id: 'm2311b', dato: '2026-11-23', start: '09:50', slut: '11:20', fag: 'mat', laerer: 'jkl', lokale: 'C305', type: 'lektion' },
    { id: 'm2311c', dato: '2026-11-23', start: '11:50', slut: '13:20', fag: 'afs', laerer: 'mnd', lokale: 'B104', type: 'lektion' },
    { id: 'm2311d', dato: '2026-11-23', start: '13:30', slut: '15:00', fag: 'ty',  laerer: 'bfa', lokale: 'C108', type: 'lektion', reg: 'U' },

    { id: 'm2411a', dato: '2026-11-24', start: '08:10', slut: '09:40', fag: 'en',  laerer: 'ksb', lokale: 'C202', type: 'lektion' },
    { id: 'm2411b', dato: '2026-11-24', start: '09:50', slut: '11:20', fag: 'vo',  laerer: 'tgr', lokale: 'B210', type: 'lektion' },
    { id: 'm2411c', dato: '2026-11-24', start: '11:50', slut: '13:20', fag: 'inf', laerer: 'rtp', lokale: 'D012', type: 'lektion', note: 'Vi arbejder i par i dag. Find din makker inden timen.' },
    { id: 'm2411d', dato: '2026-11-24', start: '13:30', slut: '15:00', fag: 'sam', laerer: 'hvm', lokale: 'C305', type: 'lektion', reg: 'ingen' },

    { id: 'm2511a', dato: '2026-11-25', start: '08:10', slut: '09:40', fag: 'mat', laerer: 'jkl', lokale: 'C305', type: 'lektion' },
    { id: 'm2511b', dato: '2026-11-25', start: '09:50', slut: '11:20', fag: 'da',  laerer: 'abc', lokale: 'C202', type: 'lektion', note: 'Medbring opladet computer.' },
    { id: 'm2511c', dato: '2026-11-25', start: '11:50', slut: '13:20', fag: 'inf', laerer: 'rtp', lokale: 'D012', type: 'lektion' },
    { id: 'm2511d', dato: '2026-11-25', start: '13:30', slut: '15:00', titel: 'Fællesmøde: studievalg', laerer: 'stv', lokale: 'Aula', type: 'moede', note: 'Hele årgangen. Fremmøde registreres ikke.' },

    { id: 'm2611a', dato: '2026-11-26', start: '08:10', slut: '09:40', fag: 'afs', laerer: 'mnd', lokale: 'B104', type: 'lektion' },
    { id: 'm2611b', dato: '2026-11-26', start: '09:50', slut: '15:00', titel: 'Projektdag: innovation', laerer: 'flere', lokale: 'Kantinen', type: 'andet', note: 'Mød op i kantinen. Grupperne hænger på opslagstavlen.' },

    { id: 'm2711a', dato: '2026-11-27', start: '08:10', slut: '09:40', fag: 'ty',  laerer: 'bfa', lokale: 'C108', type: 'lektion' },
    { id: 'm2711b', dato: '2026-11-27', start: '09:50', slut: '11:20', fag: 'vo',  laerer: 'tgr', lokale: 'B210', type: 'lektion' },
    { id: 'm2711c', dato: '2026-11-27', start: '11:50', slut: '13:20', fag: 'en',  laerer: 'ksb', lokale: 'C202', type: 'lektion' },

    { id: 'm3011a', dato: '2026-11-30', start: '08:10', slut: '09:40', fag: 'sam', laerer: 'hvm', lokale: 'C305', type: 'lektion' },
    { id: 'm3011b', dato: '2026-11-30', start: '09:50', slut: '11:20', fag: 'mat', laerer: 'jkl', lokale: 'C305', type: 'lektion' },
    { id: 'm3011c', dato: '2026-11-30', start: '11:50', slut: '13:20', fag: 'afs', laerer: 'mnd', lokale: 'B104', type: 'lektion' },
    { id: 'm3011d', dato: '2026-11-30', start: '13:30', slut: '15:00', fag: 'da',  laerer: 'abc', lokale: 'C202', type: 'lektion' }
  ],

  /* Lektier hænger på et modul. Teksten efterligner mønstret fra Studie+ (lang tekst + lærerens link). */
  lektier: [
    { id: 'l1', modul: 'm2311a', kort: 'Læs novellen side 12-24.', tekst: 'Læs novellen side 12-24 i kompendiet. Tænk over: hvem fortæller, og hvornår skifter synsvinklen? Skriv 3 stikord til hvert spørgsmål.', link: 'https://example.com/dansk/novelle' },
    { id: 'l2', modul: 'm2411b', kort: 'Kapitel 4.1 om dækningsbidrag.', tekst: 'Kapitel 4.1 om dækningsbidrag + opgave 4.1-4.3. Tænk over: hvorfor er dækningsbidraget vigtigere end omsætningen for en lille butik?', link: 'https://example.com/vo/kapitel-4-1' },
    { id: 'l3', modul: 'm2511a', kort: 'Afsnit 1.2 om lineære funktioner.', tekst: 'Afsnit 1.2 + underafsnit 1.2.1 og 1.2.2 om lineære funktioner. Lav opgave 3, 5 og 7. Tænk over: hvad betyder hældningen i en hverdagssituation?', link: 'https://example.com/matematik/afsnit-1-2' },
    { id: 'l4', modul: 'm2511b', kort: 'Skriv første afsnit af analysen.', tekst: 'Skriv første afsnit af din analyse (ca. en halv side). Brug modellen fra sidste gang. Upload ikke endnu, vi læser dem i timen.', link: 'https://example.com/dansk/analysemodel' },
    { id: 'l5', modul: 'm2511c', kort: 'Se videoen om brugertest (12 min).', tekst: 'Se videoen om brugertest (12 min) og skriv 3 spørgsmål, du vil stille en testperson. Tænk over: hvordan spørger man uden at lede svaret?', link: 'https://example.com/informatik/brugertest' },
    { id: 'l6', modul: 'm2611a', kort: 'Læs case om en lokal kaffebar.', tekst: 'Læs casen om en lokal kaffebar (side 3-9). Udfyld SWOT-skemaet. Tænk over: hvilken trussel er størst lige nu?', link: 'https://example.com/afsaetning/case-kaffebar' },
    { id: 'l7', modul: 'm2711a', kort: 'Gloser til tekst 6.', tekst: 'Lær gloserne til tekst 6 (30 ord). Der er en kort glosetest i starten af timen.', link: 'https://example.com/tysk/gloser-6' },
    { id: 'l8', modul: 'm2711b', kort: 'Opgavesæt 4, opgave 1-3.', tekst: 'Regn opgave 1-3 i opgavesæt 4. Tag dine beregninger med. Tænk over: hvilke omkostninger er faste, og hvilke er variable?', link: 'https://example.com/vo/opgavesaet-4' },
    { id: 'l9', modul: 'm2711c', kort: 'Read the article and note 5 key words.', tekst: 'Read the article about social media and young people. Note 5 key words and one sentence you disagree with.', link: 'https://example.com/english/article' },
    { id: 'l10', modul: 'm3011a', kort: 'Læs om ideologier, side 40-48.', tekst: 'Læs side 40-48 om de politiske ideologier. Tænk over: hvilken ideologi passer bedst til et parti, du kender?', link: 'https://example.com/samfundsfag/ideologier' },
    { id: 'l11', modul: 'm3011b', kort: 'Afsnit 1.3 + opgave 2 og 4.', tekst: 'Afsnit 1.3 om andengradsfunktioner. Lav opgave 2 og 4. Tænk over: hvor ligger toppunktet, og hvad fortæller det?', link: 'https://example.com/matematik/afsnit-1-3' },
    { id: 'l12', modul: 'm3011d', kort: 'Aflever udkast til analysen.', tekst: 'Tag udkastet til din analyse med, så vi kan give hinanden feedback i par.', link: 'https://example.com/dansk/feedback' }
  ],

  afleveringer: [
    { id: 'a1', navn: 'Opgavesæt 3', fag: 'vo',  hold: '2.x vø', frist: '2026-11-24T23:59' },
    { id: 'a2', navn: 'Prototype af app, del 1', fag: 'inf', hold: '2.x inf', frist: '2026-11-26T23:59' },
    { id: 'a3', navn: 'Analyse af novelle', fag: 'da', hold: '2.x da', frist: '2026-11-27T14:00' },
    { id: 'a4', navn: 'Markedsanalyse (gruppe)', fag: 'afs', hold: '2.x afs', frist: '2026-12-01T10:00' },
    { id: 'a5', navn: 'Essay draft', fag: 'en', hold: '2.x en', frist: '2026-12-04T23:59' }
  ],

  /* Fravær FØR denne uge (fiktive tal). afholdt = antal moduler, syg = moduler med sygdom. */
  fravaerHistorik: {
    mat: { afholdt: 54, syg: 2 }, inf: { afholdt: 32, syg: 2 }, sam: { afholdt: 28, syg: 1 },
    da:  { afholdt: 58, syg: 2 }, en:  { afholdt: 50, syg: 1 }, afs: { afholdt: 56, syg: 2 },
    vo:  { afholdt: 57, syg: 2 }, ty:  { afholdt: 40, syg: 3 }
  },
  /* Tidligere moduler med U (fiktive). Tælles med i historikken ovenfor. */
  tidligereU: [
    { id: 'h1', dato: '2026-10-29', start: '13:30', slut: '15:00', fag: 'ty',  laerer: 'bfa', lokale: 'C108' },
    { id: 'h2', dato: '2026-11-04', start: '13:30', slut: '15:00', fag: 'inf', laerer: 'rtp', lokale: 'D012' },
    { id: 'h3', dato: '2026-11-10', start: '08:10', slut: '09:40', fag: 'ty',  laerer: 'bfa', lokale: 'C108' },
    { id: 'h4', dato: '2026-11-13', start: '11:50', slut: '13:20', fag: 'afs', laerer: 'mnd', lokale: 'B104' }
  ],

  /* Årsagsliste: demo-eksempel. Den rigtige liste i Studie+ er ukendt. */
  aarsager: ['Syg', 'Lægebesøg', 'Transport', 'Skolerelateret', 'Andet'],

  samtaler: [
    { id: 's1', fra: 'Kontoret (demo)', emne: 'Orientering: juleafslutning', dato: '2026-11-24', tekst: 'Juleafslutningen holdes i aulaen. Program kommer senere. (Fiktiv besked til demo.)' },
    { id: 's2', fra: 'Studievejledningen (demo)', emne: 'Fællesmøde om studievalg', dato: '2026-11-20', tekst: 'Husk fællesmødet onsdag kl. 13:30 i aulaen. (Fiktiv besked til demo.)' },
    { id: 's3', fra: 'IT (demo)', emne: 'Nyt wifi-kodeord', dato: '2026-11-12', tekst: 'Kodeordet hænger ved receptionen. (Fiktiv besked til demo.)' }
  ],

  kalender: [
    { dato: '2026-11-25', tid: '13:30', titel: 'Fællesmøde: studievalg', sted: 'Aula' },
    { dato: '2026-11-26', tid: '09:50', titel: 'Projektdag: innovation', sted: 'Kantinen' },
    { dato: '2026-12-01', tid: '15:00', titel: 'Lektiecafé', sted: 'Biblioteket' },
    { dato: '2026-12-03', tid: '10:00', titel: 'Oplæg: økonomi for unge', sted: 'Aula' },
    { dato: '2026-12-10', tid: '08:10', titel: 'SO-præsentationer', sted: 'C-gangen' }
  ]
};
