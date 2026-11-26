/* Studie UX-demo: KUN FIKTIVE DATA.
   Elev, skole, beskeder, opgaver, karakterer og fravær er opdigtede.
   "Nu" er låst til onsdag 25. november 2026 kl. 13.38, så demoen altid ser ens ud. */
(function () {
  'use strict';

  // note/lektie: tekst = findes, null = bekræftet tom, udeladt = kunne ikke læses (må aldrig vises som "ingen").
  function L(id, dato, start, slut, fag, lokale, status) {
    return Object.assign({ id: id, dato: dato, start: start, slut: slut, fag: fag, lokale: lokale }, status);
  }
  var TOM = { note: null, lektie: null };
  function N(note) { return { note: note, lektie: null }; }
  function H(lektie, materialer) { return { note: null, lektie: lektie, materialer: materialer || [] }; }

  window.DEMO = {
    idag: '2026-11-25',
    nu: '13.38',
    elev: { fornavn: 'Alex', institution: 'Demo Business College', klasse: 'DM26.hhx.a' },

    fag: {
      kl: { navn: 'Klassetid' }, udv: { navn: 'Udvalg' }, stu: { navn: 'Studietid' }, valg: { navn: 'Valgfag' },
      vo: { navn: 'Virksomhedsøkonomi A', kort: 'Virksomheds­øko A' },
      ty: { navn: 'Tysk fortsætter B', kort: 'Tysk forts. B' },
      en: { navn: 'Engelsk A' }, sam: { navn: 'Samfundsfag C' }, afs: { navn: 'Afsætning A' },
      mat: { navn: 'Matematik B' }, inf: { navn: 'Informatik C' }, da: { navn: 'Dansk A' }
    },

    /* Ugens mandag -> lektioner. En uge, der ikke står her, er ukendt (ikke tom). */
    uger: {
      '2026-11-16': [
        L('a1', '2026-11-16', '08.15', '09.45', 'mat', 'VE-C202', TOM),
        L('a2', '2026-11-16', '10.00', '11.30', 'da', 'VE-C202', N('Vi starter nyt forløb om argumentation.')),
        L('a3', '2026-11-17', '12.05', '13.35', 'afs', 'VE-C202', H('Genlæs noterne om købsadfærd.')),
        L('a4', '2026-11-18', '08.15', '09.45', 'inf', 'VE-C202', TOM),
        L('a5', '2026-11-19', '10.00', '11.30', 'ty', 'VE-E204', TOM),
        L('a6', '2026-11-20', '12.05', '13.35', 'en', 'VE-C202', N('Aflever lånte bøger på biblioteket.'))
      ],
      '2026-11-23': [
        L('m1', '2026-11-23', '08.15', '09.45', 'kl', 'VE-C202', TOM),
        L('m2', '2026-11-23', '10.00', '11.30', 'vo', 'VE-C202', N('Husk lommeregner til casen.')),
        L('m3', '2026-11-23', '12.05', '13.35', 'en', 'VE-C202', N('Vi ser filmen færdig.')),
        L('m4', '2026-11-23', '13.45', '15.15', 'sam', 'VE-C202', TOM),

        L('t1', '2026-11-24', '10.00', '11.30', 'ty', 'VE-E204', TOM),
        L('t2', '2026-11-24', '12.05', '13.35', 'afs', 'VE-C202', H('Læs om værdikæden, side 52–58.', ['r-case'])),

        L('o1', '2026-11-25', '08.15', '09.30', 'udv', 'VE-A114', TOM),
        L('o2', '2026-11-25', '08.15', '09.45', 'mat', 'VE-C202', N('Tag formelarket med.')),
        L('o3', '2026-11-25', '10.00', '11.30', 'inf', 'VE-C202', TOM),
        L('o4', '2026-11-25', '12.05', '13.35', 'sam', 'VE-C202', H('Læs afsnit 3.4 om velfærdsmodeller.')),
        L('o5', '2026-11-25', '13.45', '15.15', 'da', 'VE-C202', N('Offline Onsdag (fem fede dage).')),

        L('r1', '2026-11-26', '10.00', '11.30', 'ty', 'VE-E204', H('Læs side 18–20.', ['r-tysk'])),
        L('r2', '2026-11-26', '12.05', '13.35', 'inf', 'VE-C202', TOM),
        L('r3', '2026-11-26', '13.45', '15.15', 'stu', 'VE-C102', TOM),

        L('f1', '2026-11-27', '08.15', '09.45', 'da', 'VE-C202', H('Skriv indledningen til din analyse.', ['r-gram', 'r-apa'])),
        L('f2', '2026-11-27', '10.00', '11.30', 'vo', 'VE-C202', N('Kort prøve i kapitel 5.')),
        L('f3', '2026-11-27', '12.05', '13.35', 'en', 'VE-C202', { note: 'Gruppearbejde i dag.', lektie: 'Læs artiklen, og notér fem nøgleord.', materialer: ['r-en'] }),
        L('f4', '2026-11-27', '13.45', '15.15', 'valg', 'VE-B204', {})
      ],
      '2026-11-30': [
        L('n1', '2026-11-30', '08.15', '09.45', 'da', 'VE-C202', N('Fremlæggelse i grupper.')),
        L('n2', '2026-11-30', '10.00', '11.30', 'inf', 'VE-C202', TOM),
        L('n3', '2026-12-01', '12.05', '13.35', 'afs', 'VE-C202', TOM),
        L('n4', '2026-12-02', '08.15', '09.45', 'mat', 'VE-C202', H('Regn opgave 3.1–3.5.', ['r-formel'])),
        L('n5', '2026-12-03', '10.00', '11.30', 'en', 'VE-C202', TOM),
        L('n6', '2026-12-04', '08.15', '09.45', 'sam', 'VE-C202', { note: 'Ekskursion til byrådet.', lektie: 'Forbered to spørgsmål.', materialer: [] })
      ]
    },

    skolebeskeder: {
      '2026-11-16': ['Biblioteket holder lukket fredag eftermiddag.'],
      '2026-11-23': ['Offline Onsdag: Telefonen bliver i tasken i undervisningen.', 'HHX har talent: Fredag kl. 14.00 i aulaen.'],
      '2026-11-30': ['Juleafslutningen holdes i aulaen den 18. december.']
    },

    /* Afleveringer. Lektier hentes direkte fra lektionerne ovenfor. */
    afleveringer: [
      { id: 'a-vk', fag: 'afs', titel: 'Værdikæden', dato: '2026-11-27', tid: '12:05', materialer: ['r-case', 'r-vk'],
        tekst: 'Analysér Kaffebaren Bønnens værdikæde. Beskriv de primære aktiviteter og støtteaktiviteterne, og vurder, hvor virksomheden skaber mest værdi. Højst 2 sider.' },
      { id: 'a-marked', fag: 'afs', titel: 'Markedsanalyse, del 1', dato: '2026-11-23', tid: '12:00', materialer: ['r-case'],
        tekst: 'Beskriv markedet for casevirksomheden. Afleveres som ét dokument.' },
      { id: 'a-regnskab', fag: 'vo', titel: 'Opgavesæt 3', dato: '2026-11-24', tid: '23:59', materialer: ['r-omk'],
        tekst: 'Regn opgave 1–6 i opgavesæt 3. Vis dine mellemregninger.' },
      { id: 'a-essay', fag: 'en', titel: 'Essay, first draft', dato: '2026-12-04', tid: '23:59', materialer: ['r-en'],
        tekst: 'Skriv første udkast til dit essay på 600–800 ord.' }
    ],

    ressourcer: [
      { id: 'r-formel', fag: 'mat', fil: 'Formelark.pdf', type: 'PDF (1,2 MB)', indhold: ['Lineær funktion: f(x) = ax + b', 'Hældning: a = (y2 − y1) / (x2 − x1)', 'Andengradsligning: x = (−b ± √d) / 2a, hvor d = b² − 4ac'] },
      { id: 'r-vk', fag: 'vo', fil: 'Værdikæden.pdf', type: 'PDF (842 KB)', indhold: ['Værdikæden deler virksomhedens aktiviteter i primære aktiviteter og støtteaktiviteter.', 'Primære aktiviteter: indgående logistik, produktion, udgående logistik, salg og service.', 'Støtteaktiviteter: infrastruktur, medarbejdere, teknologi og indkøb.'] },
      { id: 'r-gram', fag: 'da', fil: 'Grammatik.pdf', type: 'PDF (2,6 MB)', indhold: ['Sæt kryds og bolle: find udsagnsleddet (O) og grundleddet (X).', 'Startkomma er valgfrit, men vær konsekvent i hele teksten.'] },
      { id: 'r-tysk', fag: 'ty', fil: 'Tekst side 18-20.pdf', type: 'PDF (430 KB)', indhold: ['Side 18: Mein Alltag. Ich stehe um sieben Uhr auf und fahre mit dem Rad zur Schule.', 'Side 19: In der Pause treffe ich meine Freunde.', 'Side 20: Fragen zum Text: Wann beginnt der Tag? Was passiert in der Pause?'] },
      { id: 'r-case', fag: 'afs', fil: 'Case Kaffebaren.pdf', type: 'PDF (615 KB)', indhold: ['Kaffebaren Bønnen er en opdigtet café med to butikker og 11 ansatte.', 'Bønnerne købes hos et lille risteri i byen. Kunderne er primært studerende og kontorfolk.'] },
      { id: 'r-apa', fag: 'da', fil: 'Kildehenvisning APA.pdf', type: 'PDF (210 KB)', indhold: ['I teksten: (Efternavn, årstal, s. side).', 'I litteraturlisten: Efternavn, F. (årstal). Titel. Forlag.'] },
      { id: 'r-en', fag: 'en', fil: 'Social media article.pdf', type: 'PDF (388 KB)', indhold: ['A short, made-up article about young people and social media.', 'Task: note five key words and one sentence you disagree with.'] },
      { id: 'r-omk', fag: 'vo', fil: 'Omkostninger.pdf', type: 'PDF (512 KB)', indhold: ['Faste omkostninger ændrer sig ikke med mængden.', 'Variable omkostninger stiger, når der produceres mere.'] }
    ],

    kalender: [
      { dato: '2026-11-18', titel: 'Studiepraktik: informationsmøde', tid: '11.35 – 12.00', sted: 'Aulaen', tekst: 'Kort møde i spisepausen.' },
      { dato: '2026-11-25', titel: 'Offline Onsdag (fem fede dage)', tid: 'Hele dagen', sted: 'Hele skolen', tekst: 'Telefonen bliver i tasken i undervisningen.' },
      { dato: '2026-11-26', titel: 'Frivillig lektiecafé i MA', tid: '15.15 – 16.30', sted: 'VE-C202', tekst: 'Kom forbi med dine opgaver i matematik.' },
      { dato: '2026-11-27', titel: 'HHX har talent', tid: '14.00 – 15.30', sted: 'Aulaen', tekst: 'Alle er velkomne som publikum.' },
      { dato: '2026-12-02', titel: 'Oplæg: økonomi for unge', tid: '11.35 – 12.05', sted: 'Aulaen', tekst: 'Oplæg i spisepausen.' }
    ],

    samtaler: [
      { id: 's1', emne: 'Spørgsmål til afleveringen', dato: '25. nov.', med: 'Lærer', beskeder: [
        { fra: 'Alex', tid: '25. nov. kl. 10:14', tekst: 'Hej\nJeg er i tvivl om, hvordan kildehenvisningerne skal formateres i afleveringen.\nSkal vi bruge APA, eller er det nok med en enkel henvisning i løbende tekst?' },
        { fra: 'Lærer', tid: '25. nov. kl. 11:37', tekst: 'Hej Alex\nTak for din besked. Brug APA (7. udgave) i afleveringen, både i løbende tekst og i litteraturlisten. Der ligger en kort vejledning i Ressourcer under faget.\n\nBedste hilsner\nLærer', bilag: 'r-apa' }
      ] },
      { id: 's2', emne: 'Projektgruppe og opgaver', dato: '21. nov.', med: 'Gruppen', beskeder: [{ fra: 'Gruppen', tid: '21. nov. kl. 15:02', tekst: 'Kan vi fordele afsnittene på mandag?' }] },
      { id: 's3', emne: 'Møde om forløbsplan', dato: '18. nov.', med: 'Studievejleder', beskeder: [{ fra: 'Studievejleder', tid: '18. nov. kl. 09:20', tekst: 'Hej Alex\nVi mødes torsdag i lokale VE-A114.' }] },
      { id: 's4', emne: 'Fravær i uge 46', dato: '11. nov.', med: 'Kontaktlærer', beskeder: [{ fra: 'Kontaktlærer', tid: '11. nov. kl. 13:45', tekst: 'Husk at skrive en årsag på de moduler, du manglede.' }] },
      { id: 's5', emne: 'Valg af valgfag', dato: '6. nov.', med: 'Studievejleder', beskeder: [{ fra: 'Studievejleder', tid: '6. nov. kl. 10:00', tekst: 'Fristen for valgfag er den 15. december.' }] },
      { id: 's6', emne: 'Generel information', dato: '30. okt.', med: 'Kontoret', beskeder: [{ fra: 'Kontoret', tid: '30. okt. kl. 08:30', tekst: 'Velkommen tilbage efter efterårsferien.' }] }
    ],

    forloeb: [
      { id: 'vk', fag: 'afs', titel: 'Virksomhedens værdikæde',
        maal: ['Jeg kan forklare, hvad en værdikæde er, og hvordan den skaber værdi.', 'Jeg kan analysere en virksomheds primære aktiviteter og støtteaktiviteter.', 'Jeg kan vurdere, hvordan virksomheden kan styrke sin værdiskabelse.'],
        materialer: [{ tekst: 'Lærebog: Afsætning A, kap. 4 “Værdikæden”' }, { tekst: 'Oversigt: Værdikæden', r: 'r-vk' }, { tekst: 'Case: Kaffebaren Bønnen – værdikæde og konkurrencefordele', r: 'r-case' }, { tekst: 'Eventuelt: Virksomhedsvideo (10 min.)' }],
        lektioner: [['Man 23/11', 'Introduktion til værdikæden. Begreber og struktur.'], ['Tir 24/11', 'Analyse af værdikæde i casevirksomhed.'], ['Ons 25/11', 'Arbejde i grupper: Identificér og vurdér aktiviteter.'], ['Tor 26/11', 'Præsentationer og fælles vurdering.']] },
      { id: 'omk', fag: 'vo', titel: 'Omkostninger',
        maal: ['Jeg kan skelne mellem faste og variable omkostninger.', 'Jeg kan beregne dækningsbidraget.'],
        materialer: [{ tekst: 'Noter om omkostninger', r: 'r-omk' }],
        lektioner: [['Man 23/11', 'Faste og variable omkostninger.'], ['Fre 27/11', 'Kort prøve i kapitel 5.']] },
      { id: 'arg', fag: 'da', titel: 'Argumentation',
        maal: ['Jeg kan finde påstand, belæg og hjemmel i en tekst.', 'Jeg kan skrive en analyse med kildehenvisninger.'],
        materialer: [{ tekst: 'Grammatik', r: 'r-gram' }, { tekst: 'Kildehenvisning efter APA', r: 'r-apa' }],
        lektioner: [['Man 16/11', 'Toulmins argumentmodel.'], ['Ons 25/11', 'Argumentation i debatindlæg.'], ['Fre 27/11', 'Analyse: indledningen.']] }
    ],

    plan: {
      perioder: [{ id: 'e26', navn: 'Efterår 2026' }, { id: 'f27', navn: 'Forår 2027' }],
      fag: {
        afs: {
          e26: [['September', 'Markedsanalyse', 'Du kan indsamle og vurdere oplysninger om et marked og dets kunder.'], ['Oktober', 'Købsadfærd', 'Du kan forklare, hvad der påvirker forbrugeres og virksomheders køb.'], ['November', 'Værdikæden', 'Du kan analysere og vurdere virksomhedens værdikæde og forklare, hvordan den skaber værdi for kunden og konkurrencefordele for virksomheden.']],
          f27: [['Januar', 'Segmentering', 'Du kan opdele et marked og vælge en målgruppe.'], ['Februar', 'Pris', 'Du kan vurdere en virksomheds prisstrategi.'], ['Marts', 'Distribution', 'Du kan sammenligne distributionskanaler.']]
        },
        vo: {
          e26: [['September', 'Regnskab', 'Du kan læse en resultatopgørelse.'], ['Oktober', 'Budget', 'Du kan opstille et simpelt budget.'], ['November', 'Omkostninger', 'Du kan skelne mellem faste og variable omkostninger.']],
          f27: [['Januar', 'Investering', 'Du kan vurdere en investering.'], ['Februar', 'Finansiering', 'Du kan sammenligne finansieringsformer.']]
        },
        da: {
          e26: [['September', 'Novellen', 'Du kan analysere en novelle.'], ['Oktober', 'Retorik', 'Du kan genkende retoriske virkemidler.'], ['November', 'Argumentation', 'Du kan finde påstand, belæg og hjemmel i en tekst.']],
          f27: [['Januar', 'Lyrik', 'Du kan fortolke et digt.'], ['Februar', 'Medier', 'Du kan vurdere en nyhedskilde.']]
        }
      }
    },

    karakterer: [['Dansk A', 'Standpunkt', '7'], ['Engelsk A', 'Standpunkt', '10'], ['Matematik B', 'Standpunkt', '7'], ['Afsætning A', 'Standpunkt', '10']],

    /* Fravær (fiktivt). historik = [afholdte moduler, heraf syg]. mangler = moduler uden godkendt registrering. */
    fravaer: {
      graense: 10,
      historik: { da: [58, 2], mat: [54, 2], afs: [56, 2], vo: [57, 2], en: [50, 1], sam: [28, 1], inf: [32, 2], ty: [40, 3] },
      mangler: [
        { id: 'h1', dato: '2026-11-10', start: '08.15', fag: 'ty', reg: 'Ugyldigt fravær' },
        { id: 'h2', dato: '2026-11-13', start: '12.05', fag: 'afs', reg: 'Ugyldigt fravær' },
        { id: 'h3', dato: '2026-11-19', start: '10.00', fag: 'ty', reg: 'Ugyldigt fravær' },
        { id: 'h4', dato: '2026-11-24', start: '10.00', fag: 'ty', reg: 'Ikke registreret' }
      ],
      aarsager: ['Syg', 'Lægebesøg', 'Transport', 'Skolerelateret', 'Andet']
    }
  };
})();
