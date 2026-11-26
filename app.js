/* Studie+ demo. Ren vanilla JS uden afhængigheder. Intet sendes; valg gemmes kun i localStorage.
   Alle ni sider deler topbjælke, menu og sidehoved. Siden og det åbne punkt står i adressen (#side/valg),
   så browserens Tilbage-knap virker, og eleven lander samme sted igen. */
(function () {
  'use strict';

  const D = window.DEMO;
  const LS = 'studie-ux-demo:v2';

  /* ---------- tilstand ---------- */
  const tom = () => ({ done: {}, svar: {}, aarsag: {}, syg: false, sygTil: null });
  let gemt = tom();
  try { Object.assign(gemt, JSON.parse(localStorage.getItem(LS) || '{}')); } catch (e) { /* ingen lagring */ }
  const gem = () => { try { localStorage.setItem(LS, JSON.stringify(gemt)); } catch (e) { /* ingen lagring */ } };
  const ui = { soeg: '', valgte: {}, besked: '' };

  /* ---------- dato ---------- */
  const DAGE = ['søndag', 'mandag', 'tirsdag', 'onsdag', 'torsdag', 'fredag', 'lørdag'];
  const MDR = ['januar', 'februar', 'marts', 'april', 'maj', 'juni', 'juli', 'august', 'september', 'oktober', 'november', 'december'];
  const dato = iso => { const [y, m, d] = iso.split('-').map(Number); return new Date(y, m - 1, d, 12); };
  const iso = x => x.getFullYear() + '-' + String(x.getMonth() + 1).padStart(2, '0') + '-' + String(x.getDate()).padStart(2, '0');
  const plus = (s, n) => { const x = dato(s); x.setDate(x.getDate() + n); return iso(x); };
  const mandag = s => plus(s, -((dato(s).getDay() + 6) % 7));
  const stort = s => s.charAt(0).toUpperCase() + s.slice(1);
  const langDato = s => stort(DAGE[dato(s).getDay()]) + ' ' + dato(s).getDate() + '. ' + MDR[dato(s).getMonth()];
  const kortDag = s => stort(DAGE[dato(s).getDay()].slice(0, 3));
  const dm = s => dato(s).getDate() + '/' + (dato(s).getMonth() + 1);
  function ugeNr(s) {
    const x = dato(s), t = new Date(Date.UTC(x.getFullYear(), x.getMonth(), x.getDate()));
    t.setUTCDate(t.getUTCDate() + 4 - (t.getUTCDay() || 7));
    return Math.ceil(((t - Date.UTC(t.getUTCFullYear(), 0, 1)) / 864e5 + 1) / 7);
  }
  const IDAG = D.idag, DENNE_UGE = mandag(IDAG);
  const min = t => { const [h, m] = t.split(/[.:]/).map(Number); return h * 60 + m; };

  /* ---------- opslag ---------- */
  const fagNavn = id => D.fag[id].navn;
  const fagKort = id => D.fag[id].kort || D.fag[id].navn;
  const lektioner = Object.keys(D.uger).sort().flatMap(u => D.uger[u]);
  const lektion = id => lektioner.find(l => l.id === id);
  const ressource = id => D.ressourcer.find(r => r.id === id);

  /* Lektier og afleveringer samlet. Lektier er lektionernes egne, så skema og opgaver altid stemmer. */
  const opgaver = lektioner.filter(l => l.lektie).map(l => ({
    id: 'l-' + l.id, type: 'Lektier', fag: l.fag, titel: l.lektie.replace(/\.$/, ''), tekst: l.lektie,
    dato: l.dato, tid: l.start.replace('.', ':'), materialer: l.materialer || [], lektion: l.id
  })).concat(D.afleveringer.map(a => Object.assign({ type: 'Aflevering' }, a)))
    .sort((a, b) => a.dato.localeCompare(b.dato) || a.type.localeCompare(b.type) || min(a.tid) - min(b.tid));
  const opgave = id => opgaver.find(o => o.id === id);
  const frist = o => {
    if (o.dato === IDAG) return 'I dag kl. ' + o.tid;
    if (o.dato === plus(IDAG, 1)) return 'Til i morgen kl. ' + o.tid;
    if (o.dato > IDAG && mandag(o.dato) === DENNE_UGE) return stort(DAGE[dato(o.dato).getDay()]) + ' kl. ' + o.tid;
    return kortDag(o.dato) + ' ' + dm(o.dato) + ' kl. ' + o.tid;
  };
  const passeret = o => o.dato < IDAG || (o.dato === IDAG && min(o.tid) <= min(D.nu));

  /* ---------- html ---------- */
  const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const svg = (d, fyld) => '<svg class="ikon' + (fyld ? ' fyldt' : '') + '" viewBox="0 0 24 24" aria-hidden="true">' + d + '</svg>';
  const IKON = {
    hjem: svg('<path d="M3 11 12 3l9 8v10h-6v-6H9v6H3z"/>', true),
    person: svg('<circle cx="12" cy="7.5" r="4.5"/><path d="M3.5 21c0-4.7 3.8-7.5 8.5-7.5s8.5 2.8 8.5 7.5z"/>', true),
    oeje: svg('<path d="M2 12s3.600-6.500 10-6.500S22 12 22 12s-3.600 6.500-10 6.500S2 12 2 12z"/><circle cx="12" cy="12" r="2.800"/>'),
    tale: svg('<path d="M3 4h13v9H9l-4 3.500V13H3z"/><path d="M18.500 9H21v8h-2v3l-3.500-3H11v-1.500"/>'),
    maal: svg('<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1.200"/>'),
    kalender: svg('<path d="M4 5.500h16V21H4zM4 10h16M8 3v4M16 3v4M8 14h2M14 14h2M8 17.500h2M14 17.500h2"/>'),
    blyant: svg('<path d="m4 20 1-5L16.500 3.500l4 4L9 19zM14 6l4 4"/>'),
    mappe: svg('<path d="M3 5h6l2 2.500h8V10H6.500L3 18.500zM6.500 10H22l-3 9H3z"/>', true),
    liste: svg('<path d="M3 5h18v3H3zM3 10.500h18v3H3zM3 16h18v3H3z"/>', true),
    fil: svg('<path d="M6 3h8l4 4v14H6zM14 3v4h4"/>'),
    soeg: svg('<circle cx="10.500" cy="10.500" r="6.500"/><path d="m15.500 15.500 5 5"/>'),
    ud: svg('<path d="M14 4h6v6M20 4l-9 9M18 14v6H4V6h6"/>'),
    venstre: svg('<path d="m15 5-7 7 7 7"/>'), hoejre: svg('<path d="m9 5 7 7-7 7"/>')
  };
  const MENU = [
    ['start', 'Start', 'hjem'], ['om-mig', 'Om mig', 'person'], ['aktivitetskalender', 'Aktivitetskalender', 'oeje'], ['samtaler', 'Samtaler', 'tale'],
    ['forloebsplaner', 'Forløbsplaner', 'maal'], ['skema', 'Skema', 'kalender'], ['opgaver', 'Opgaver', 'blyant'], ['ressourcer', 'Ressourcer', 'mappe'],
    ['undervisningsplan', 'Undervisningsplan', 'liste']
  ];

  const hoved = (titel, hoejre) => '<div class="sidehoved"><h1 tabindex="-1">' + titel + '</h1>' + (hoejre || '') + '</div>';
  const ugeVaelger = (side, uge, aar, iDag) => '<div class="vaelger">' +
    '<a class="knap pil" href="#' + side + '/' + plus(uge, -7) + '" aria-label="Forrige uge" data-erstat>' + IKON.venstre + '</a>' +
    '<span class="vaelger-tekst" aria-live="polite">Uge ' + ugeNr(uge) + (aar ? ' – ' + dato(uge).getFullYear() : '') + '</span>' +
    '<a class="knap pil" href="#' + side + '/' + plus(uge, 7) + '" aria-label="Næste uge" data-erstat>' + IKON.hoejre + '</a>' +
    (iDag ? '<a class="knap idag" href="#' + side + '" data-erstat>I dag</a>' : '') + '</div>';
  const kopiKnap = (hvad, id, tekst) => '<button type="button" class="knap" data-action="kopi" data-hvad="' + hvad + '" data-id="' + id + '">' + tekst + '</button>';
  const matLinks = (ids, base) => ids && ids.length
    ? '<ul class="materialer">' + ids.map(id => { const r = ressource(id); return '<li><a href="#' + base + '/' + id + '">' + IKON.fil + '<span>' + esc(r.fil) + '</span><span class="dim">' + esc(r.type) + '</span></a></li>'; }).join('') + '</ul>'
    : '<p class="dim">Intet materiale er knyttet til.</p>';
  const tilbage = (href, tekst) => '<a class="tilbage" href="#' + href + '" data-tilbage>' + IKON.venstre + tekst + '</a>';
  const dokument = r => '<article class="dokument"><p class="dim">Forhåndsvisning · opdigtet demomateriale · ' + esc(r.type) + '</p><h2>' + esc(r.fil.replace('.pdf', '')) + '</h2>' +
    r.indhold.map(t => '<p>' + esc(t) + '</p>').join('') + '</article>';

  /* ---------- lektionsstatus (grøn = lærernote, blå = lektier, gul = bekræftet ingen, grå = ukendt) ---------- */
  function status(l) {
    const note = typeof l.note === 'string', lektie = typeof l.lektie === 'string';
    if (note && lektie) return { koder: ['note', 'lektie'], tekst: 'Note + Lektier' };
    if (note) return { koder: ['note'], tekst: 'Note' };
    if (lektie) return { koder: ['lektie'], tekst: 'Lektier' };
    if (l.note === null && l.lektie === null) return { koder: ['ingen'], tekst: 'Ingen' };
    return { koder: ['ukendt'], tekst: 'Kunne ikke læses' };
  }
  const farver = koder => '<span class="farver" aria-hidden="true">' + koder.map(k => '<i class="f-' + k + '"></i>').join('') + '</span>';

  /* ---------- sider ---------- */
  const sider = {};

  sider.start = () => {
    const dag = (D.uger[DENNE_UGE] || []).filter(l => l.dato === IDAG).sort((a, b) => min(a.start) - min(b.start));
    const naeste = dag.find(l => min(l.slut) > min(D.nu));
    const foer = dag.filter(l => min(l.slut) <= min(D.nu)).slice(-2);
    const efter = naeste ? dag.slice(dag.indexOf(naeste) + 1) : [];
    const raekke = l => '<li><a class="dagraekke" href="#start/' + l.id + '"><span class="t">' + l.start + '</span><span class="f">' + esc(fagNavn(l.fag)) + '</span><span class="r">' + esc(l.lokale) + '</span></a></li>';
    let stor = '<p class="ingen-flere">Ikke flere lektioner i dag.</p>';
    if (naeste) {
      const mrk = [];
      if (typeof naeste.note === 'string') mrk.push('<span class="linje"><span class="chip f-note">Lærernote</span>' + esc(naeste.note) + '</span>');
      if (typeof naeste.lektie === 'string') mrk.push('<span class="linje"><span class="chip f-lektie">Lektier</span>' + esc(naeste.lektie) + '</span>');
      if (!mrk.length) { const s = status(naeste); mrk.push('<span class="linje"><span class="chip f-' + s.koder[0] + '">' + (s.koder[0] === 'ingen' ? 'Ingen note eller lektier' : s.tekst) + '</span></span>'); }
      stor = '<a class="dagraekke stor" href="#start/' + naeste.id + '" aria-label="Næste: ' + esc(fagNavn(naeste.fag)) + ' kl. ' + naeste.start + ' i ' + esc(naeste.lokale) + '"><span class="t">' + naeste.start + '</span><span class="f">' + esc(fagNavn(naeste.fag)) + '</span><span class="r">' + esc(naeste.lokale) + '</span><span class="mrk">' + mrk.join('') + '</span></a>';
    }
    return hoved(langDato(IDAG), '<a class="stille-link" href="#skema">Se hele ugen ' + IKON.hoejre + '</a>') +
      '<div class="startside">' +
      (gemt.syg ? '<p class="meddelelse">Du er sygemeldt i dag (demo). <a href="#om-mig/fravaer">Se fravær</a></p>' : '') +
      '<ol class="dagliste">' + foer.map(raekke).join('') + '</ol>' + stor +
      '<ol class="dagliste">' + efter.map(raekke).join('') + '</ol></div>';
  };

  sider.skema = ([valgt]) => {
    const uge = valgt ? mandag(valgt) : DENNE_UGE;
    const ls = D.uger[uge];
    const besk = D.skolebeskeder[uge];
    const top = hoved('Ugeskema', ugeVaelger('skema', uge)) +
      '<p class="nye"><strong>Beskeder fra skolen:</strong> <span>Ingen nye beskeder</span></p>' +
      '<details class="skolebeskeder"><summary>Skolebeskeder · uge ' + ugeNr(uge) + '</summary>' +
      (besk ? '<ul>' + besk.map(b => '<li>' + esc(b) + '</li>').join('') + '</ul>' : '<p>Der er ingen skolebeskeder for ugen i demoen.</p>') + '</details>';
    if (!ls) return top + '<p class="meddelelse" role="status">Skemaet for uge ' + ugeNr(uge) + ' er ikke med i demoen. Det betyder ikke, at ugen er tom. <a href="#skema" data-erstat>Gå til denne uge</a></p>';

    // Rækker efter starttid; starttider under 45 minutter fra hinanden deler række.
    const raekker = [];
    [...new Set(ls.map(l => l.start))].sort((a, b) => min(a) - min(b)).forEach(s => {
      const sidste = raekker[raekker.length - 1];
      if (sidste && min(s) - min(sidste.start) < 45) sidste.starter.push(s); else raekker.push({ start: s, starter: [s] });
    });
    // Rækkens sluttid er den hyppigste; lektioner med egen sluttid viser den selv.
    raekker.forEach(r => {
      const slut = ls.filter(l => r.starter.includes(l.start)).map(l => l.slut);
      r.slut = slut.slice().sort((a, b) => slut.filter(x => x === b).length - slut.filter(x => x === a).length || min(b) - min(a))[0];
    });
    const dage = [0, 1, 2, 3, 4].map(i => plus(uge, i));
    const bredde = dage.map(d => raekker.some(r => ls.filter(l => l.dato === d && r.starter.includes(l.start)).length > 1) ? '1.34fr' : '1fr');
    const kort = (l, parallel) => {
      const s = status(l);
      const tekst = s.tekst + (typeof l.note === 'string' ? ' · ' + l.note : '');
      return '<a class="lek ' + s.koder.join(' ') + '" href="#skema/' + uge + '/' + l.id + '" draggable="false">' + farver(s.koder) +
        '<strong class="fag">' + esc(fagKort(l.fag)) + '</strong>' +
        '<span class="meta"><span class="tid">' + l.start + ' – ' + l.slut + '</span>' + (parallel ? '' : '<span class="prik"> · </span>') + '<span class="lokale">' + esc(l.lokale) + '</span></span>' +
        '<span class="st">' + esc(tekst) + '</span></a>';
    };
    const gitter = dage.map((d, i) => '<section class="dagkol" aria-label="' + langDato(d) + '">' +
      '<h2 class="dagnavn' + (d === IDAG ? ' er-idag' : '') + '" style="--k:' + (i + 2) + '">' + kortDag(d) + ' ' + dm(d) + (d === IDAG ? '<span class="sr"> (i dag)</span>' : '') + '</h2>' +
      raekker.map((r, j) => {
        const her = ls.filter(l => l.dato === d && r.starter.includes(l.start));
        return '<div class="celle' + (her.length > 1 ? ' parallel' : '') + (her.length ? '' : ' fri') + '" style="--k:' + (i + 2) + ';--r:' + (j + 2) + '">' + her.map(l => kort(l, her.length > 1)).join('') + '</div>';
      }).join('') + '</section>').join('');
    const tider = raekker.map((r, j) => '<p class="tidsmaerke" style="--r:' + (j + 2) + '" aria-hidden="true"><span>' + r.start + ' –</span><span>' + r.slut + '</span></p>').join('');
    const ukendt = ls.some(l => status(l).koder[0] === 'ukendt');
    return top + '<div class="gitter" style="grid-template-columns:var(--tidbredde) ' + bredde.map(b => 'minmax(0,' + b + ')').join(' ') + ';grid-template-rows:max-content repeat(' + raekker.length + ',auto)">' +
      '<span class="hjoerne" aria-hidden="true"></span>' + tider + gitter + '</div>' +
      '<ul class="forklaring" aria-label="Farveforklaring"><li><i class="f-note"></i><strong>Grøn</strong> · Lærernote</li><li><i class="f-lektie"></i><strong>Blå</strong> · Lektier</li><li><i class="f-ingen"></i><strong>Gul</strong> · Ingen note eller lektier</li>' +
      (ukendt ? '<li><i class="f-ukendt"></i><strong>Grå</strong> · Kunne ikke læses</li>' : '') + '</ul>';
  };

  sider['om-mig'] = ([fane]) => {
    const f = fane === 'fravaer' || fane === 'karakterer' ? fane : 'profil';
    const tab = (id, navn) => '<a href="#om-mig' + (id === 'profil' ? '' : '/' + id) + '" data-erstat' + (f === id ? ' aria-current="true"' : '') + '>' + navn + '</a>';
    let krop = '';
    if (f === 'karakterer') krop = '<table class="tabel"><thead><tr><th scope="col">Fag</th><th scope="col">Type</th><th scope="col">Karakter</th></tr></thead><tbody>' +
      D.karakterer.map(k => '<tr><td>' + esc(k[0]) + '</td><td>' + esc(k[1]) + '</td><td>' + esc(k[2]) + '</td></tr>').join('') + '</tbody></table>';
    if (f === 'fravaer') krop = fravaer();
    return hoved('Om mig') + '<dl class="stamdata"><div><dt>Fornavn</dt><dd>' + esc(D.elev.fornavn) + '</dd></div><div><dt>Institution</dt><dd>' + esc(D.elev.institution) + '</dd></div><div><dt>Klasse</dt><dd>' + esc(D.elev.klasse) + '</dd></div></dl>' +
      '<nav class="faner" aria-label="Om mig">' + tab('profil', 'Profil') + tab('fravaer', 'Fravær') + tab('karakterer', 'Karakterer') + '</nav>' + krop;
  };

  const pct = x => x.toFixed(1).replace('.', ',') + ' %';
  function fravaer() {
    const F = D.fravaer;
    const rk = Object.keys(F.historik).map(id => {
      const [afholdt, syg] = F.historik[id], u = F.mangler.filter(m => m.fag === id && m.reg === 'Ugyldigt fravær').length;
      return { id, afholdt, syg, u, pct: (syg + u) / afholdt * 100 };
    }).sort((a, b) => b.pct - a.pct);
    const sum = k => rk.reduce((a, r) => a + r[k], 0);
    const mangler = F.mangler.filter(m => !gemt.aarsag[m.id]).length;
    return '<div class="fravaer">' +
      '<section class="syg" aria-label="Sygemelding"><p><strong>' + (gemt.syg ? 'Du er sygemeldt i dag' + (gemt.sygTil ? ' og forlænget til ' + langDato(gemt.sygTil).toLowerCase() : '') : 'Er du syg i dag?') + '</strong> <span class="dim">Demo: der sendes intet til skolen.</span></p><div class="knapper">' +
      (gemt.syg ? '<button type="button" class="knap" data-action="raskmeld">Raskmeld</button><button type="button" class="knap" data-action="forlaeng">Forlæng til i morgen</button>'
        : '<button type="button" class="knap primaer" data-action="syg">Sygemeld mig</button>') + '</div></section>' +
      '<section><h2>Mangler årsag (' + mangler + ')</h2><ul class="fravaersliste">' + F.mangler.map(m => {
        const a = gemt.aarsag[m.id];
        return '<li><label><input type="checkbox" class="valg" data-id="' + m.id + '"' + (ui.valgte[m.id] ? ' checked' : '') + '><span class="hvad"><strong>' + esc(fagNavn(m.fag)) + '</strong> · ' + kortDag(m.dato) + ' ' + dm(m.dato) + ' kl. ' + m.start + '</span><span class="dim">' + m.reg + '</span><span class="' + (a ? 'aarsag' : 'advar') + '">' + (a ? 'Årsag: ' + esc(a.aarsag) + (a.kommentar ? ' (' + esc(a.kommentar) + ')' : '') : 'Ingen årsag') + '</span></label></li>';
      }).join('') + '</ul><form class="udfyld" data-form="aarsag"><label>Fælles årsag <select name="aarsag"><option value="">Vælg …</option>' + F.aarsager.map(a => '<option>' + a + '</option>').join('') + '</select></label>' +
      '<label class="vokser">Kommentar (valgfri) <input name="kommentar" maxlength="80"></label><button class="knap primaer">Udfyld valgte moduler</button><p role="status" class="advar" id="udfyld-status">' + esc(ui.besked) + '</p></form></section>' +
      '<section><h2>Fravær pr. fag</h2><p>Samlet: <strong>' + pct((sum('u') + sum('syg')) / sum('afholdt') * 100) + '</strong> <span class="dim">Opdigtede tal. Demo-grænse ' + F.graense + ' %.</span></p>' +
      '<table class="tabel"><thead><tr><th scope="col">Fag</th><th scope="col">Fravær</th><th scope="col">Ugyldigt</th><th scope="col">Syg</th><th scope="col">Moduler</th></tr></thead><tbody>' +
      rk.map(r => '<tr><td>' + esc(fagNavn(r.id)) + '</td><td' + (r.pct >= F.graense ? ' class="advar"' : '') + '>' + pct(r.pct) + (r.pct >= F.graense ? ' · over grænsen' : '') + '</td><td>' + r.u + '</td><td>' + r.syg + '</td><td>' + r.afholdt + '</td></tr>').join('') + '</tbody></table></section></div>';
  }

  sider.aktivitetskalender = ([valgt]) => {
    const uge = valgt ? mandag(valgt) : DENNE_UGE;
    const her = D.kalender.filter(k => mandag(k.dato) === uge);
    return hoved('Aktivitetskalender', ugeVaelger('aktivitetskalender', uge, true, true)) +
      (her.length ? '<div class="aktiviteter">' + her.map(k => '<details><summary><span class="dag"><strong>' + kortDag(k.dato) + '</strong><span>' + dato(k.dato).getDate() + ' ' + MDR[dato(k.dato).getMonth()].slice(0, 3) + '</span></span><span class="titel">' + esc(k.titel) + '</span></summary>' +
        '<div class="udfoldet"><p><strong>' + esc(k.tid) + '</strong> · ' + esc(k.sted) + '</p><p>' + esc(k.tekst) + '</p></div></details>').join('') + '</div>'
        : '<p class="meddelelse" role="status">Demoen har ingen aktiviteter for uge ' + ugeNr(uge) + '.</p>');
  };

  sider.samtaler = ([valgt, res]) => {
    const s = D.samtaler.find(x => x.id === valgt) || D.samtaler[0];
    if (res && ressource(res)) return hoved('Samtaler') + tilbage('samtaler/' + s.id, 'Tilbage til samtalen') + dokument(ressource(res));
    const alle = s.beskeder.concat((gemt.svar[s.id] || []).map(t => ({ fra: D.elev.fornavn, tid: '25. nov. kl. 13:38 · kun i demoen', tekst: t })));
    return hoved('Samtaler') + '<div class="todelt samtaler"><section class="valgliste" aria-label="Samtaler"><h2>Samtaler (' + D.samtaler.length + ')</h2><ul>' +
      D.samtaler.map(x => '<li><a href="#samtaler/' + x.id + '" data-erstat' + (x === s ? ' aria-current="true"' : '') + '><span>' + esc(x.emne) + '</span><span class="d">' + x.dato + '</span></a></li>').join('') + '</ul></section>' +
      '<section class="detalje"><h2 class="stortitel">' + esc(s.emne) + '</h2><p class="under">Samtale mellem ' + esc(D.elev.fornavn) + ' og ' + esc(s.med) + '</p><div class="traad">' +
      alle.map(b => '<article><header><h3>' + esc(b.fra) + '</h3><span>' + esc(b.tid) + '</span></header><p>' + esc(b.tekst) + '</p>' +
        (b.bilag ? '<a class="bilag" href="#samtaler/' + s.id + '/' + b.bilag + '">' + IKON.fil + esc(ressource(b.bilag).fil) + '</a>' : '') + '</article>').join('') +
      '</div><form class="svar" data-form="svar" data-id="' + s.id + '"><label for="svar">Skriv et svar</label><textarea id="svar" name="svar" maxlength="600"></textarea><div><p role="status" class="dim" id="svar-status">' + esc(ui.besked) + '</p><button class="knap primaer">Send svar</button></div></form></section></div>';
  };

  sider.forloebsplaner = ([valgt, res]) => {
    const f = D.forloeb.find(x => x.id === valgt) || D.forloeb[0];
    if (res && ressource(res)) return hoved('Forløbsplaner') + tilbage('forloebsplaner/' + f.id, 'Tilbage til forløbet') + dokument(ressource(res));
    return hoved('Forløbsplaner') + '<div class="todelt forloeb"><section class="valgliste" aria-label="Undervisningsforløb"><h2>Undervisningsforløb</h2><ul>' +
      D.forloeb.map(x => '<li><a href="#forloebsplaner/' + x.id + '" data-erstat' + (x === f ? ' aria-current="true"' : '') + '><span><small>' + esc(fagNavn(x.fag)) + '</small><b>' + esc(x.titel) + '</b></span>' + IKON.hoejre + '</a></li>').join('') + '</ul></section>' +
      '<section class="detalje"><p class="over">' + esc(fagNavn(f.fag)) + '</p><h2 class="stortitel">' + esc(f.titel) + '</h2>' +
      '<div class="blok"><h3>Mål</h3><ul>' + f.maal.map(m => '<li>' + esc(m) + '</li>').join('') + '</ul></div>' +
      '<div class="blok"><h3>Materialer</h3><ul>' + f.materialer.map(m => '<li>' + (m.r ? '<a href="#forloebsplaner/' + f.id + '/' + m.r + '">' + esc(m.tekst) + '</a>' : esc(m.tekst)) + '</li>').join('') + '</ul></div>' +
      '<h3>Lektioner</h3><table class="tabel lektionstabel"><thead><tr><th scope="col">Lektion</th><th scope="col">Dato</th><th scope="col">Indhold</th></tr></thead><tbody>' +
      f.lektioner.map((l, i) => '<tr><td>' + (i + 1) + '</td><td>' + l[0] + '</td><td>' + esc(l[1]) + '</td></tr>').join('') + '</tbody></table></section></div>';
  };

  sider.opgaver = ([valgt, res]) => {
    const o = valgt && opgave(valgt);
    if (o && res && ressource(res)) return hoved('Opgaver') + tilbage('opgaver/' + o.id, 'Tilbage til opgaven') + dokument(ressource(res));
    if (o) {
      const faerdig = !!gemt.done[o.id];
      return hoved('Opgaver') + tilbage('opgaver', 'Tilbage til alle opgaver') +
        '<article class="opgave"><p class="over">' + o.type + ' · ' + esc(fagNavn(o.fag)) + '</p><h2 class="stortitel">' + esc(o.titel) + '</h2>' +
        '<p class="' + (passeret(o) && !faerdig ? 'advar' : 'under') + '">' + (passeret(o) ? 'Frist passeret: ' : 'Frist: ') + frist(o) + '</p>' + (o.tekst.replace(/\.$/, '') === o.titel ? '' : '<p class="brod">' + esc(o.tekst) + '</p>') +
        '<h3>Materiale</h3>' + matLinks(o.materialer, 'opgaver/' + o.id) +
        '<div class="knapper"><button type="button" class="knap primaer" data-action="faerdig" data-id="' + o.id + '" aria-pressed="' + faerdig + '">' + (faerdig ? 'Færdig ✓ (fortryd)' : 'Markér som færdig') + '</button>' +
        kopiKnap('opgave', o.id, 'Kopiér') + (o.lektion ? '<a class="knap" href="#skema/' + mandag(o.dato) + '/' + o.lektion + '">Se lektionen i skemaet</a>' : '') + '</div></article>';
    }
    const raekke = (x, visDag) => '<li><a class="opgaveraekke" href="#opgaver/' + x.id + '"><span class="type">' + (x.type === 'Lektier' ? '<i class="prik-lektie" aria-hidden="true"></i>' : IKON.fil) + x.type + '</span>' +
      '<span class="hvad"><b>' + esc(fagNavn(x.fag)) + '</b><span>' + esc(x.titel) + '</span></span><span class="frist' + (visDag === 'sent' ? ' advar' : '') + '">' + (visDag === 'sent' ? 'Frist passeret · ' : '') + frist(x) + '</span></a></li>';
    const gruppe = (titel, liste, mode, cls) => liste.length ? '<section class="gruppe ' + (cls || '') + '"><h2>' + titel + '</h2><ul>' + liste.map(x => raekke(x, mode)).join('') + '</ul></section>' : '';
    const aabne = opgaver.filter(x => !gemt.done[x.id]);
    // Gamle lektier hører til lektionen i skemaet; kun afleveringer kan mangle.
    const kommende = aabne.filter(x => !passeret(x));
    const slutUge = plus(DENNE_UGE, 6);
    const dage = [...new Set(kommende.filter(x => x.dato <= slutUge).map(x => x.dato))];
    const sent = aabne.filter(x => x.type === 'Aflevering' && passeret(x));
    const klaret = opgaver.filter(x => gemt.done[x.id]);
    return hoved('Opgaver', kommende.length ? kopiKnap('lektier', '', 'Kopiér alle lektier') : '') +
      (kommende.length ? '' : '<p class="meddelelse">Ingen kommende opgaver.</p>') +
      dage.map(d => gruppe(d === IDAG ? 'I dag' : d === plus(IDAG, 1) ? 'Til i morgen' : langDato(d), kommende.filter(x => x.dato === d))).join('') +
      gruppe('Mangler stadig (' + sent.length + ')', sent, 'sent', 'mangler') +
      gruppe('Næste uge og senere', kommende.filter(x => x.dato > slutUge)) +
      gruppe('Klaret (' + klaret.length + ')', klaret, '', 'klaret');
  };

  const ressourceRaekker = () => {
    const q = ui.soeg.trim().toLowerCase();
    const her = D.ressourcer.filter(r => !q || (r.fil + ' ' + fagNavn(r.fag)).toLowerCase().includes(q));
    return her.length ? her.map(r => '<tr><td>' + esc(fagNavn(r.fag)) + '</td><td><span class="filnavn">' + IKON.fil + esc(r.fil) + '</span></td><td class="dim">' + esc(r.type) + '</td><td><a class="aabn" href="#ressourcer/' + r.id + '" aria-label="Åbn ' + esc(r.fil) + '">Åbn ' + IKON.ud + '</a></td></tr>').join('')
      : '<tr><td colspan="4">Ingen ressourcer matcher “' + esc(ui.soeg) + '”.</td></tr>';
  };
  sider.ressourcer = ([res]) => {
    if (res && ressource(res)) return hoved('Ressourcer') + tilbage('ressourcer', 'Tilbage til ressourcer') + dokument(ressource(res));
    return hoved('Ressourcer') + '<label class="soegefelt">' + IKON.soeg + '<span class="sr">Søg i ressourcer</span><input type="search" id="soeg" placeholder="Søg i ressourcer" value="' + esc(ui.soeg) + '"></label>' +
      '<table class="tabel ressourcer"><thead><tr><th scope="col">Fag</th><th scope="col">Filnavn</th><th scope="col">Type</th><th scope="col"><span class="sr">Handling</span></th></tr></thead><tbody id="ressource-raekker">' + ressourceRaekker() + '</tbody></table>';
  };

  sider.undervisningsplan = ([fagId, periodeId]) => {
    const P = D.plan, fag = P.fag[fagId] ? fagId : 'afs';
    const i = Math.max(0, P.perioder.findIndex(p => p.id === periodeId)), p = P.perioder[i];
    const pil = (n, ikon, navn) => P.perioder[i + n]
      ? '<a class="knap pil" href="#undervisningsplan/' + fag + '/' + P.perioder[i + n].id + '" aria-label="' + navn + '" data-erstat>' + ikon + '</a>'
      : '<span class="knap pil slukket" aria-disabled="true" aria-label="' + navn + '">' + ikon + '</span>';
    const maaneder = P.fag[fag][p.id] || [];
    return hoved('Undervisningsplan') + '<div class="planvalg"><label>Fag <select id="planfag" data-periode="' + p.id + '">' + Object.keys(P.fag).map(k => '<option value="' + k + '"' + (k === fag ? ' selected' : '') + '>' + esc(fagNavn(k)) + '</option>').join('') + '</select></label>' +
      '<div class="periode"><span>Periode</span><div class="vaelger">' + pil(-1, IKON.venstre, 'Forrige periode') + '<span class="vaelger-tekst bred" aria-live="polite">' + p.navn + '</span>' + pil(1, IKON.hoejre, 'Næste periode') + '</div></div></div>' +
      '<div class="maaneder">' + maaneder.map((m, j) => '<details name="maaned"' + (j === (p.id === 'e26' ? 2 : 0) ? ' open' : '') + '><summary><strong>' + m[0] + '</strong><span>' + esc(m[1]) + '</span></summary><div class="udfoldet"><h3>Læringsmål</h3><p>' + esc(m[2]) + '</p></div></details>').join('') + '</div>';
  };

  /* ---------- lektionsvindue (fra Start og Skema) ---------- */
  const dlg = document.getElementById('dlg');
  function lektionsVindue(l, res, base, luk) {
    if (res && ressource(res)) return tilbage(base, 'Tilbage til lektionen') + '<h2 id="dlg-titel" class="sr">' + esc(ressource(res).fil) + '</h2>' + dokument(ressource(res));
    const s = status(l);
    // Gul bruges kun, når begge dele er bekræftet tomme; et enkelt tomt felt får ingen farve.
    const felt = (kode, navn, v) => '<section class="felt ' + (typeof v === 'string' ? 'f-' + kode : v === null ? 'tomt' : 'f-ukendt') + '"><h3>' + navn + '</h3><p>' + (typeof v === 'string' ? esc(v) : v === null ? 'Ingen' : 'Kunne ikke læses') + '</p></section>';
    return '<div class="dlg-top"><h2 id="dlg-titel">' + esc(fagNavn(l.fag)) + '</h2><a class="knap" href="#' + luk + '" data-tilbage>Luk</a></div>' +
      '<p class="dlg-fakta"><span>' + langDato(l.dato) + '</span><strong>' + l.start + ' – ' + l.slut + '</strong><strong>' + esc(l.lokale) + '</strong></p>' +
      (s.koder[0] === 'ingen' ? '<section class="felt f-ingen"><h3>Ingen note eller lektier</h3><p>Der er hverken lærernote eller lektier til lektionen.</p></section>' : felt('note', 'Lærernote', l.note) + felt('lektie', 'Lektier', l.lektie)) +
      (typeof l.lektie === 'string' ? '<h3>Materiale</h3>' + matLinks(l.materialer, base) : '') +
      '<div class="knapper">' + kopiKnap('lektion', l.id, 'Kopiér lektion') + (typeof l.lektie === 'string' ? '<a class="knap" href="#opgaver/l-' + l.id + '">Åbn i Opgaver</a>' : '') + '</div>';
  }

  /* ---------- router ---------- */
  let sti = '', forrige = null;
  // "#skema" og "#skema/<denne uge>" er samme visning, så Luk kan gå ét skridt tilbage i historikken.
  const samme = (a, b) => { const n = h => h === '' ? 'start' : h === 'skema' ? 'skema/' + DENNE_UGE : h; return a !== null && n(a) === n(b); };
  const rul = {};
  const dele = () => (location.hash.slice(1) || 'start').split('/').map(decodeURIComponent);

  function render() {
    let [side, ...rest] = dele();
    if (!sider[side]) { side = 'start'; rest = []; }
    // Et lektionsvindue ligger oven på siden: #start/<lektion> eller #skema/<uge>/<lektion>[/<ressource>].
    let l = null, sidevalg = rest, res = null, base = '', luk = '';
    if (side === 'start' && rest[0]) { l = lektion(rest[0]); res = rest[1]; base = 'start/' + rest[0]; luk = 'start'; sidevalg = []; }
    if (side === 'skema' && rest[1]) { l = lektion(rest[1]); res = rest[2]; base = 'skema/' + rest[0] + '/' + rest[1]; luk = 'skema/' + rest[0]; sidevalg = [rest[0]]; }

    document.getElementById('indhold').innerHTML = sider[side](sidevalg);
    document.body.dataset.side = side;
    document.getElementById('menu').innerHTML = MENU.map(([id, navn, ikon]) => '<li><a href="#' + id + '"' + (id === side ? ' aria-current="page"' : '') + '>' + IKON[ikon] + '<span>' + navn + '</span></a></li>').join('');
    document.getElementById('skole').textContent = D.elev.institution;
    const fod = document.getElementById('fod');
    fod.hidden = side !== 'start';
    fod.innerHTML = '<strong>Skolemeddelelser</strong><span>Ingen nye meddelelser.</span><a href="#skema">Ugens skolebeskeder</a>';
    document.title = MENU.find(m => m[0] === side)[1] + ' · Studie+ demo';

    if (l) { dlg.innerHTML = lektionsVindue(l, res, base, luk); dlg.dataset.luk = luk; if (!dlg.open) dlg.showModal(); } else if (dlg.open) dlg.close();
  }

  function skiftSide() {
    const ny = location.hash.slice(1) || 'start';
    const gammel = sti;
    rul[gammel] = window.scrollY;
    forrige = gammel; sti = ny; ui.besked = ''; ui.valgte = {};
    render();
    const retur = gammel.startsWith(ny + '/') || (ny === 'skema' && gammel.startsWith('skema/'));
    window.scrollTo(0, retur ? rul[ny] || 0 : dlg.open ? window.scrollY : 0);
    // Fokus: tilbage til det punkt, eleven kom fra; ellers overskriften.
    const fra = retur && [...document.querySelectorAll('main a')].find(a => a.getAttribute('href') === '#' + gammel);
    if (fra) fra.focus({ preventScroll: true });
    else if (dlg.open) (dlg.querySelector('.tilbage, .knap') || dlg).focus();
    else if (ny.split('/')[0] !== gammel.split('/')[0] || ny.split('/').length > 1) (document.querySelector('main .tilbage') || document.querySelector('h1')).focus({ preventScroll: true });
  }

  function gaaTil(hash, erstat) {
    if (erstat) { history.replaceState(history.state, '', hash); skiftSide(); } else location.hash = hash;
  }

  /* ---------- handlinger ---------- */
  function meld(t) { const el = document.getElementById('live'); el.textContent = ''; setTimeout(() => { el.textContent = t; }, 30); }
  const lektionTekst = l => [fagNavn(l.fag), langDato(l.dato) + ', ' + l.start + ' – ' + l.slut, 'Lokale: ' + l.lokale,
    'Lærernote: ' + (typeof l.note === 'string' ? l.note : l.note === null ? 'ingen' : 'kunne ikke læses'),
    'Lektier: ' + (typeof l.lektie === 'string' ? l.lektie : l.lektie === null ? 'ingen' : 'kunne ikke læses')].join('\n');
  const opgaveTekst = o => fagNavn(o.fag) + ': ' + o.titel + '\n' + o.type + ', frist ' + kortDag(o.dato) + ' ' + dm(o.dato) + ' kl. ' + o.tid + '\n' + o.tekst +
    (o.materialer.length ? '\nMateriale: ' + o.materialer.map(id => ressource(id).fil).join(', ') : '');

  function kopier(tekst, knap) {
    window.__demoSidsteKopi = tekst;
    const vis = ok => { const f = knap.textContent; knap.textContent = ok ? 'Kopieret' : 'Kunne ikke kopiere'; meld(knap.textContent); setTimeout(() => { knap.textContent = f; }, 2000); };
    if (navigator.clipboard) navigator.clipboard.writeText(tekst).then(() => vis(true), () => vis(false)); else vis(false);
  }

  document.addEventListener('click', e => {
    const a = e.target.closest('a[href^="#"]');
    if (a && !e.ctrlKey && !e.metaKey && !e.shiftKey) {
      if (a.dataset.action === 'spring') { e.preventDefault(); document.getElementById('indhold').focus(); return; }
      // Markeret tekst i en lektion må ikke åbne den.
      if (a.classList.contains('lek') && String(getSelection()).length) { e.preventDefault(); return; }
      if (a.hasAttribute('data-tilbage')) { e.preventDefault(); if (samme(forrige, a.getAttribute('href').slice(1))) history.back(); else gaaTil(a.getAttribute('href'), true); return; }
      if (a.hasAttribute('data-erstat')) { e.preventDefault(); const f = a.getAttribute('aria-label'); gaaTil(a.getAttribute('href'), true); (f && document.querySelector('main [aria-label="' + f + '"]') || document.querySelector('main [aria-current="true"]'))?.focus({ preventScroll: true }); return; }
      return;
    }
    const k = e.target.closest('button[data-action]');
    if (!k) return;
    const id = k.dataset.id;
    const igen = () => { render(); (document.querySelector('[data-action="' + k.dataset.action + '"][data-id="' + (id || '') + '"]') || document.querySelector('.syg .knap'))?.focus({ preventScroll: true }); };
    switch (k.dataset.action) {
      case 'kopi':
        if (k.dataset.hvad === 'lektion') kopier(lektionTekst(lektion(id)), k);
        else if (k.dataset.hvad === 'opgave') kopier(opgaveTekst(opgave(id)), k);
        else kopier(opgaver.filter(o => o.type === 'Lektier' && !passeret(o) && !gemt.done[o.id]).map(opgaveTekst).join('\n\n'), k);
        break;
      case 'faerdig': if (gemt.done[id]) delete gemt.done[id]; else gemt.done[id] = true; gem(); igen(); meld(gemt.done[id] ? 'Markeret som færdig' : 'Markeret som ikke færdig'); break;
      case 'syg': gemt.syg = true; gem(); igen(); meld('Du er sygemeldt i dag (demo). Intet er sendt.'); break;
      case 'raskmeld': gemt.syg = false; gemt.sygTil = null; gem(); igen(); meld('Du er raskmeldt (demo).'); break;
      case 'forlaeng': gemt.sygTil = plus(IDAG, 1); gem(); igen(); meld('Sygemeldingen er forlænget (demo).'); break;
      case 'nulstil':
        try { localStorage.removeItem(LS); } catch (err) { /* ingen lagring */ }
        gemt = tom(); ui.soeg = ''; ui.valgte = {}; ui.besked = ''; render(); meld('Demoen er nulstillet'); break;
    }
  });

  document.addEventListener('submit', e => {
    const f = e.target; if (!f.dataset.form) return;
    e.preventDefault();
    if (f.dataset.form === 'svar') {
      const t = f.svar.value.trim();
      if (!t) { document.getElementById('svar-status').textContent = 'Skriv en besked først.'; f.svar.focus(); return; }
      (gemt.svar[f.dataset.id] = gemt.svar[f.dataset.id] || []).push(t); gem();
      ui.besked = 'Vist i demoen. Intet er sendt.'; render(); document.getElementById('svar').focus();
    } else {
      const ids = Object.keys(ui.valgte).filter(k => ui.valgte[k]), a = f.aarsag.value;
      if (!ids.length || !a) { document.getElementById('udfyld-status').textContent = !ids.length ? 'Sæt flueben ved mindst ét modul.' : 'Vælg en årsag.'; return; }
      ids.forEach(id => { gemt.aarsag[id] = { aarsag: a, kommentar: f.kommentar.value.trim() }; }); gem();
      ui.valgte = {}; ui.besked = 'Årsag sat på ' + ids.length + (ids.length === 1 ? ' modul' : ' moduler') + ' (demo, intet sendt).'; render();
    }
  });

  document.addEventListener('change', e => {
    if (e.target.classList.contains('valg')) ui.valgte[e.target.dataset.id] = e.target.checked;
    if (e.target.id === 'planfag') { gaaTil('#undervisningsplan/' + e.target.value + '/' + e.target.dataset.periode, true); document.getElementById('planfag').focus(); }
  });
  document.addEventListener('input', e => {
    if (e.target.id !== 'soeg') return;
    ui.soeg = e.target.value; document.getElementById('ressource-raekker').innerHTML = ressourceRaekker();
  });
  dlg.addEventListener('cancel', e => { e.preventDefault(); const mål = '#' + dlg.dataset.luk; if (samme(forrige, dlg.dataset.luk)) history.back(); else gaaTil(mål, true); });

  window.addEventListener('hashchange', skiftSide);
  sti = location.hash.slice(1) || 'start';
  render();
})();
