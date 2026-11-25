/* Studie UX-demo. Ren vanilla JS, ingen afhængigheder. Alt gemmes kun i localStorage. */
(function () {
  'use strict';

  var D = window.DEMO;
  var LS = 'studie-ux-demo:v1';
  var state = load();
  var ui = freshUi();
  var foersteVisning = true;
  var reduce = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---------- lager ---------- */
  function fresh() { return { done: {}, sick: {}, aarsag: {}, theme: null, big: false, dayIdx: null }; }
  function freshUi() { return { filter: 'idag', open: {}, ugeDag: null, valgte: {}, flerAarsag: null, flerBesked: '' }; }
  function load() {
    var s = fresh();
    try { var raw = JSON.parse(localStorage.getItem(LS) || '{}'); for (var k in raw) s[k] = raw[k]; } catch (e) {}
    return s;
  }
  function save() { try { localStorage.setItem(LS, JSON.stringify(state)); } catch (e) {} }

  /* ---------- tid og dato ---------- */
  var DAGE = ['søndag', 'mandag', 'tirsdag', 'onsdag', 'torsdag', 'fredag', 'lørdag'];
  var MDR = ['januar', 'februar', 'marts', 'april', 'maj', 'juni', 'juli', 'august', 'september', 'oktober', 'november', 'december'];
  function d(iso) { var p = iso.split('-'); return new Date(+p[0], +p[1] - 1, +p[2], 12); }
  function toMin(t) { var p = t.split(':'); return +p[0] * 60 + +p[1]; }
  function pad(n) { return (n < 10 ? '0' : '') + n; }
  function today() { var i = state.dayIdx == null ? D.startIndex : state.dayIdx; return D.demoDage[i]; }
  function nowMin() { return toMin(D.demoTid); }
  function cap(s) { return s.charAt(0).toUpperCase() + s.slice(1); }
  function langDato(iso) { var x = d(iso); return cap(DAGE[x.getDay()]) + ' ' + x.getDate() + '. ' + MDR[x.getMonth()]; }
  function kortDato(iso) { var x = d(iso); return DAGE[x.getDay()].slice(0, 3) + ' ' + x.getDate() + '/' + (x.getMonth() + 1); }
  function dagDiff(a, b) { return Math.round((d(b) - d(a)) / 86400000); }
  function absMin(iso, t) { return dagDiff(today(), iso) * 1440 + toMin(t); }
  function omTid(min) { var h = Math.floor(min / 60), m = min % 60; return (h ? h + ' t ' : '') + m + ' min'; }
  function relTid(iso, t) {
    var diff = absMin(iso, t) - nowMin();
    var dd = dagDiff(today(), iso);
    if (diff < 0) return { tekst: 'Fristen er passeret (' + kortDato(iso) + ' kl. ' + t + ')', over: true };
    if (dd === 0) return { tekst: 'I dag kl. ' + t + ' (om ' + omTid(diff) + ')' };
    if (dd === 1) return { tekst: 'I morgen kl. ' + t };
    return { tekst: cap(DAGE[d(iso).getDay()]) + ' ' + d(iso).getDate() + '. ' + MDR[d(iso).getMonth()] + ' kl. ' + t + ' (om ' + dd + ' dage)' };
  }

  /* ---------- data-opslag ---------- */
  var byId = {};
  D.moduler.forEach(function (m) { byId[m.id] = m; });
  D.tidligereU.forEach(function (m) { m.type = 'lektion'; m.reg = 'U'; m.tidligere = true; byId[m.id] = m; });
  var lektieAf = {}, lektieById = {};
  D.lektier.forEach(function (l) { lektieAf[l.modul] = l; l.m = byId[l.modul]; lektieById[l.id] = l; });

  function navn(m) { return m.titel || D.fag[m.fag].navn; }
  function dagensModuler(iso) { return D.moduler.filter(function (m) { return m.dato === iso; }); }
  function naesteSkoledag(iso) {
    var datoer = D.moduler.map(function (m) { return m.dato; }).filter(function (x) { return x > iso; }).sort();
    return datoer[0] || null;
  }
  function erSlut(m) { return m.dato < today() || (m.dato === today() && toMin(m.slut) <= nowMin()); }
  function erNu(m) { return m.dato === today() && toMin(m.start) <= nowMin() && nowMin() < toMin(m.slut); }

  /* reg: 'til' | 'U' | 'ingen' | 'syg' | null (fremtid / ikke et fag) */
  function reg(m) {
    if (m.type !== 'lektion') return null;
    var s = state.sick[m.dato];
    if (s && toMin(m.slut) > s.fra) return 'syg';
    if (m.tidligere) return 'U';
    if (!erSlut(m)) return null;
    return m.reg || 'til';
  }
  var REG_TEKST = { til: 'Til stede', U: 'U: ugyldigt fravær', ingen: 'Ikke registreret', syg: 'Sygemeldt (demo)' };
  function kanFaaAarsag(m) { var r = reg(m); return r === 'U' || r === 'ingen'; }

  /* ---------- html-hjælpere ---------- */
  function esc(s) { return String(s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  var IKON = {
    kopi: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 9h11v11H9zM5 15H4V4h11v1" /></svg>',
    link: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M14 4h6v6M20 4l-9 9M18 14v6H4V6h6" /></svg>',
    tjek: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12l5 5 9-10" /></svg>',
    pil: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 5l7 7-7 7" /></svg>'
  };
  function regBoks(m) {
    if (m.type !== 'lektion') return '';
    var r = reg(m);
    var t = r === 'til' ? IKON.tjek : r === 'U' ? 'U' : r === 'syg' ? 'S' : '';
    var lbl = r ? REG_TEKST[r] : 'Ikke registreret endnu';
    return '<span class="reg reg-' + (r || 'tom') + '" role="img" aria-label="' + esc(lbl) + '">' + t + '</span>';
  }
  function regForklaring() {
    return '<div class="forklaring"><p class="reg-forklaring">' +
      '<span><span class="reg reg-til">' + IKON.tjek + '</span>Registreret til stede</span>' +
      '<span><span class="reg reg-ingen"></span>Ikke registreret</span>' +
      '<span><span class="reg reg-U">U</span>Ugyldigt fravær</span>' +
      '<span><span class="reg reg-syg">S</span>Sygemeldt (demo)</span></p>' +
      '<p class="muted lille">Fremmøde-tegnene er et skøn ud fra skærmbilleder af Studie+.</p></div>';
  }
  /* Mærker som i Studie+: blå = lektier, grøn = lærernote, gul = ingen note eller lektier. Begge vises, hvis begge findes. */
  function maerker(m) {
    var l = lektieAf[m.id], out = '';
    if (l) out += '<span class="mrk mrk-lektie">Lektier</span>';
    if (m.note) out += '<span class="mrk mrk-note">Note</span>';
    if (!out) out = '<span class="mrk mrk-ingen">Ingen</span>';
    return '<span class="mrker">' + out + '</span>';
  }
  function farve(m) { return lektieAf[m.id] ? 'lektie' : m.note ? 'note' : 'ingen'; }
  function aarsagLinje(m) {
    var a = state.aarsag[m.id];
    if (!a) return kanFaaAarsag(m) ? '<span class="bad">Ingen årsag angivet</span>' : '';
    return '<span>Årsag: <strong>' + esc(a.aarsag) + '</strong>' + (a.kommentar ? ' (' + esc(a.kommentar) + ')' : '') + ' <span class="muted">(demo)</span></span>';
  }
  function knapKopiModul(m, lille) {
    return '<button type="button" class="btn' + (lille ? ' btn-icon' : '') + '" data-action="kopi-modul" data-id="' + m.id + '" aria-label="Kopiér modul: ' + esc(navn(m)) + ' ' + m.start + '">' + IKON.kopi + '<span class="lbl">' + (lille ? '' : 'Kopiér modul') + '</span></button>';
  }
  function knapAarsag(m) {
    if (!kanFaaAarsag(m)) return '';
    return '<button type="button" class="btn" data-action="aarsag" data-id="' + m.id + '">' + (state.aarsag[m.id] ? 'Ret årsag' : 'Angiv årsag') + '</button>';
  }
  function lektieKnapper(l, ekstra) {
    return '<button type="button" class="btn btn-kopi" data-action="kopi-lektie" data-id="' + l.id + '">' + IKON.kopi + '<span class="lbl">Kopiér lektie</span></button>' +
      (l.link ? '<a class="btn" href="' + esc(l.link) + '" target="_blank" rel="noopener">' + IKON.link + '<span class="lbl">Åbn link</span></a>' +
        '<button type="button" class="btn" data-action="kopi-link" data-id="' + l.id + '">' + IKON.kopi + '<span class="lbl">Kopiér link</span></button>' : '') + (ekstra || '');
  }

  /* ---------- tekster til kopi ---------- */
  function lektieTekst(l) {
    return navn(l.m) + ' (' + kortDato(l.m.dato) + ' kl. ' + l.m.start + ')\n' + l.tekst + (l.link ? '\nLink: ' + l.link : '');
  }
  function modulTekst(m) {
    var l = lektieAf[m.id], a = state.aarsag[m.id], r = reg(m);
    var t = [navn(m), langDato(m.dato) + ', ' + m.start + '-' + m.slut, 'Lokale: ' + m.lokale + ' · Lærer: ' + m.laerer];
    if (l) { t.push('Lektie: ' + l.tekst); if (l.link) t.push('Link: ' + l.link); }
    else if (m.type === 'lektion') t.push('Lektie: ingen');
    if (m.note) t.push('Note: ' + m.note);
    if (r && r !== 'til') t.push('Fravær: ' + REG_TEKST[r] + (a ? ' · Årsag: ' + a.aarsag + (a.kommentar ? ' (' + a.kommentar + ')' : '') : ''));
    return t.join('\n');
  }

  /* ---------- kopiering ---------- */
  function kopier(tekst, knap) {
    function fallback() {
      var ta = document.createElement('textarea');
      ta.value = tekst; ta.setAttribute('readonly', ''); ta.className = 'offscreen';
      document.body.appendChild(ta); ta.select();
      var ok = false; try { ok = document.execCommand('copy'); } catch (e) {}
      ta.remove(); return ok;
    }
    function faerdig(ok) {
      window.__demoSidsteKopi = tekst;
      var lbl = knap && knap.querySelector('.lbl');
      var besked = ok ? 'Kopieret' : 'Kunne ikke kopiere. Markér teksten selv.';
      if (knap) {
        knap.classList.add('is-kopieret');
        if (lbl) { if (!knap.dataset.orig) knap.dataset.orig = lbl.textContent; lbl.textContent = besked; }
        clearTimeout(knap._t);
        knap._t = setTimeout(function () {
          knap.classList.remove('is-kopieret');
          if (lbl) lbl.textContent = knap.dataset.orig;
        }, 2500);
      }
      meld(besked);
    }
    if (navigator.clipboard && window.isSecureContext) {
      navigator.clipboard.writeText(tekst).then(function () { faerdig(true); }, function () { faerdig(fallback()); });
    } else faerdig(fallback());
  }
  function meld(t) { var el = document.getElementById('live'); el.textContent = ''; setTimeout(function () { el.textContent = t; }, 30); }

  /* ---------- komponenter ---------- */
  function lektieItem(l) {
    var faerdigt = !!state.done[l.id], aaben = !!ui.open[l.id];
    return '<li class="lektie' + (faerdigt ? ' is-done' : '') + '">' +
      '<div class="lektie-head"><h3>' + esc(navn(l.m)) + '</h3><span class="muted tid">kl. ' + l.m.start + ' · ' + esc(l.m.lokale) + '</span></div>' +
      '<p class="lektie-tekst">' + esc(aaben ? l.tekst : l.kort) + '</p>' +
      (aaben && l.link ? '<p class="lektie-link"><a href="' + esc(l.link) + '" target="_blank" rel="noopener">' + esc(l.link) + '</a></p>' : '') +
      '<div class="knapper">' + lektieKnapper(l,
        '<button type="button" class="btn" data-action="done" data-id="' + l.id + '" aria-pressed="' + faerdigt + '">' + (faerdigt ? IKON.tjek : '') + '<span class="lbl">' + (faerdigt ? 'Færdig' : 'Markér færdig') + '</span></button>' +
        '<button type="button" class="btn btn-text" data-action="fold" data-id="' + l.id + '" aria-expanded="' + aaben + '">' + (aaben ? 'Vis kort' : 'Vis hele lektien') + '</button>') +
      '</div></li>';
  }

  function skemaRaekke(m, naesteId) {
    var slut = erSlut(m), nu = erNu(m), r = reg(m), l = lektieAf[m.id];
    var status = nu ? 'Nu' : m.id === naesteId ? 'Næste' : slut ? 'Slut' : '';
    var p = nu ? ((nowMin() - toMin(m.start)) / (toMin(m.slut) - toMin(m.start))).toFixed(3) : '';
    return '<li class="raekke' + (nu ? ' is-nu' : slut ? ' is-slut' : ' is-senere') + (m.id === naesteId ? ' is-naeste' : '') + '"' + (nu ? ' data-p="' + p + '"' : '') + '>' +
      '<p class="raekke-tid tid"><strong>' + m.start + '</strong><span>' + m.slut + '</span></p>' +
      '<div class="raekke-main">' +
        '<p class="raekke-titel">' + regBoks(m) + '<button type="button" class="linkknap" data-action="aaben-modul" data-id="' + m.id + '">' + esc(navn(m)) + '</button>' + (status ? '<span class="status">' + status + '</span>' : '') + '</p>' +
        '<p class="muted">' + esc(m.lokale) + ' · ' + esc(m.laerer) + '</p>' +
        (m.note ? '<p class="raekke-note"><span class="mrk mrk-note">Note</span> ' + esc(m.note) + '</p>' : '') +
        (r && r !== 'til' ? '<p class="raekke-reg">' + REG_TEKST[r] + (aarsagLinje(m) ? ' · ' + aarsagLinje(m) : '') + '</p>' : '') +
      '</div>' +
      (l ? '<div class="raekke-lektie' + (state.done[l.id] ? ' is-done' : '') + '"><p class="etiket"><span class="mrk mrk-lektie">Lektie</span></p><p class="raekke-lektie-tekst">' + esc(l.kort) + '</p><div class="knapper">' + lektieKnapper(l) + '</div></div>' : '') +
      '<div class="raekke-knap">' + knapKopiModul(m, true) + knapAarsag(m) + '</div>' +
    '</li>';
  }

  function manglerListe() {
    var t = today(), items = [];
    D.lektier.forEach(function (l) {
      if (l.m.dato < t) return;
      items.push({ id: l.id, type: 'Lektie', titel: navn(l.m), under: l.kort, dato: l.m.dato, tid: l.m.start, lektie: l });
    });
    D.afleveringer.forEach(function (a) {
      var p = a.frist.split('T');
      items.push({ id: a.id, type: 'Aflevering', titel: D.fag[a.fag].navn + ': ' + a.navn, under: 'Hold ' + a.hold, dato: p[0], tid: p[1] });
    });
    items.forEach(function (i) { i.abs = absMin(i.dato, i.tid); });
    items.sort(function (a, b) { return a.abs - b.abs; });
    return items;
  }

  function fravaerTal() {
    var rows = Object.keys(D.fag).map(function (k) {
      var h = D.fravaerHistorik[k];
      return { fag: k, afholdt: h.afholdt, syg: h.syg, u: D.tidligereU.filter(function (m) { return m.fag === k; }).length, ingen: 0 };
    });
    var map = {}; rows.forEach(function (r) { map[r.fag] = r; });
    D.moduler.forEach(function (m) {
      if (m.type !== 'lektion' || !erSlut(m)) return;
      var r = map[m.fag], g = reg(m);
      r.afholdt++;
      if (g === 'U') r.u++; else if (g === 'syg') r.syg++; else if (g === 'ingen') r.ingen++;
    });
    rows.forEach(function (r) { r.pct = (r.u + r.syg) / r.afholdt * 100; });
    return rows;
  }
  function pct(x) { return x.toFixed(1).replace('.', ',') + ' %'; }
  function naesteAktivitet() { var t = today(); return D.kalender.filter(function (k) { return k.dato >= t; })[0] || D.kalender[D.kalender.length - 1]; }

  /* ---------- skærme ---------- */
  var screens = {};

  screens.idag = function () {
    var t = today(), mods = dagensModuler(t), n = nowMin();
    var nu = mods.filter(erNu)[0];
    var naeste = mods.filter(function (m) { return toMin(m.start) > n; })[0];
    var lekt = D.lektier.filter(function (l) { return l.m.dato === t; });
    var mangler = manglerListe().filter(function (i) { return !state.done[i.id]; });
    var syg = state.sick[t], nd = naesteSkoledag(t);

    var sygHtml = syg
      ? '<div class="syg-status"><p><strong>Du er sygemeldt i dag (demo).</strong></p><div class="knapper"><button type="button" class="btn" data-action="raskmeld">Raskmeld</button><button type="button" class="btn" data-action="forlaeng">Forlæng til næste skoledag</button></div></div>'
      : '<button type="button" class="btn btn-syg" data-action="sygemeld">Jeg er syg i dag</button>';
    var top = '<header class="dag-top"><div><h1 tabindex="-1">' + langDato(t) + '</h1><p class="muted">Klokken er <span class="tid">' + D.demoTid + '</span> (demotid)' +
      (nu ? ' · nu: ' + esc(navn(nu)) + ' i ' + esc(nu.lokale) + ' til <span class="tid">' + nu.slut + '</span>' : '') + '</p></div><div class="dag-syg knapper"><a class="btn" href="#lektier" data-action="vis-idag">Lektier i dag: <span class="tid">' + lekt.length + '</span></a>' + sygHtml + '</div></header>';

    var hero;
    if (naeste) {
      var l = lektieAf[naeste.id];
      hero = '<section class="hoved" aria-labelledby="h-naeste">' +
        '<p class="etiket" id="h-naeste">Næste modul · om ' + omTid(toMin(naeste.start) - n) + '</p>' +
        '<p class="kaempe tid">' + naeste.start + '</p>' +
        '<p class="naeste">' + esc(navn(naeste)) + '</p>' +
        '<dl class="hoved-fakta"><div><dt>Lokale</dt><dd>' + esc(naeste.lokale) + '</dd></div><div><dt>Slutter</dt><dd class="tid">' + naeste.slut + '</dd></div><div><dt>Lærer</dt><dd>' + esc(naeste.laerer) + '</dd></div></dl>' +
        (l ? '<div class="hoved-lektie"><p class="etiket"><span class="mrk mrk-lektie">Lektie</span></p><p class="hoved-lektie-tekst">' + esc(l.kort) + '</p><div class="knapper">' + lektieKnapper(l) + '</div></div>'
           : '<p class="hoved-lektie muted">Ingen lektie til modulet.</p>') +
        (naeste.note ? '<p class="hoved-note"><span class="mrk mrk-note">Note</span> ' + esc(naeste.note) + '</p>' : '') +
        '</section>';
    } else {
      hero = '<section class="hoved"><p class="etiket">Resten af dagen</p><p class="kaempe">Fri</p><p class="naeste">Ikke flere moduler i dag.</p>' +
        (nd ? '<p class="hoved-note muted">Næste skoledag: ' + langDato(nd) + '</p>' : '') + '</section>';
    }

    var linje = '<section class="tidslinje-blok" aria-labelledby="h-skema"><div class="blok-head"><h2 id="h-skema">Dagens moduler og lektier</h2></div>' +
      (mods.length ? '<ol class="raekker tidslinje">' + mods.map(function (m) { return skemaRaekke(m, naeste && naeste.id); }).join('') +
        '<li class="nu-mark" aria-hidden="true" hidden><span class="tid">Nu ' + D.demoTid + '</span></li></ol>' : '<p>Ingen moduler.</p>') +
      regForklaring() + '</section>';

    var forst = mangler[0], frt = forst && relTid(forst.dato, forst.tid);
    var rest = '<div class="idag-rest">' +
      '<section class="blok" aria-labelledby="h-lekt"><h2 id="h-lekt">Lektier i dag: <span class="tid">' + lekt.length + '</span></h2>' +
        (lekt.length ? '<div class="knapper"><a class="btn btn-kopi" href="#lektier" data-action="vis-idag">Se lektier for i dag' + IKON.pil + '</a>' +
          '<button type="button" class="btn" data-action="kopi-alle" data-scope="idag">' + IKON.kopi + '<span class="lbl">Kopiér alle lektier i dag</span></button></div>' : '<p>Ingen lektier i dag.</p>') + '</section>' +
      '<section class="blok" aria-labelledby="h-mang"><h2 id="h-mang">Mangler jeg</h2><a class="mangler-tal" href="#mangler"><span class="tal tid">' + mangler.length + '</span><span><strong>ting mangler</strong>' +
        (forst ? '<br><span class="muted">Nærmeste: ' + esc(forst.titel) + '. </span><span class="' + (frt.over ? 'bad' : 'muted') + '">' + frt.tekst + '</span>' : '') + '</span></a></section>' +
      '<section class="blok" aria-labelledby="h-smaa"><h2 id="h-smaa">Fra skolen</h2><ul class="links">' +
        '<li><a href="#samtaler"><span>Samtaler</span><span class="muted">' + D.samtaler.length + ' fiktive beskeder</span></a></li>' +
        '<li><a href="#kalender"><span>Aktivitetskalender</span><span class="muted">Næste: ' + esc(naesteAktivitet().titel) + '</span></a></li></ul></section>' +
      '</div>';

    return '<div class="idag">' + top + hero + rest + linje + '</div>';
  };

  screens.lektier = function () {
    var t = today(), nd = naesteSkoledag(t), f = ui.filter;
    var liste = D.lektier.filter(function (l) {
      if (f === 'idag') return l.m.dato === t;
      if (f === 'imorgen') return l.m.dato === nd;
      if (f === 'uge') return D.demoDage.indexOf(l.m.dato) > -1;
      return true;
    });
    var filtre = [['idag', 'I dag'], ['imorgen', 'Næste skoledag'], ['uge', 'Denne uge'], ['alle', 'Alle']];
    var grupper = {}; liste.forEach(function (l) { (grupper[l.m.dato] = grupper[l.m.dato] || []).push(l); });
    return '<header class="side-top"><h1 tabindex="-1">Lektier</h1><p class="muted">Kort tekst først. Kopiér tager hele lektien og lærerens link med.</p></header>' +
      '<div class="filtre" role="group" aria-label="Vis lektier for">' + filtre.map(function (x) {
        return '<button type="button" class="btn" data-action="filter" data-id="' + x[0] + '" aria-pressed="' + (f === x[0]) + '">' + x[1] + '</button>';
      }).join('') + '</div>' +
      (liste.length ? '<p class="kopi-alle-linje"><button type="button" class="btn btn-primary" data-action="kopi-alle" data-scope="filter">' + IKON.kopi + '<span class="lbl">Kopiér alle ' + liste.length + ' lektier</span></button></p>' : '') +
      (liste.length ? Object.keys(grupper).sort().map(function (dt) {
        var x = d(dt);
        return '<section class="lektie-gruppe"><h2 class="gruppe-dato"><span>' + cap(DAGE[x.getDay()]) + (dt === t ? ' (i dag)' : '') + '</span><span class="tid muted">' + x.getDate() + '. ' + MDR[x.getMonth()] + '</span></h2><ul class="lektier">' +
          grupper[dt].map(lektieItem).join('') + '</ul></section>';
      }).join('') : '<p>Ingen lektier her.</p>');
  };

  screens.mangler = function () {
    var alle = manglerListe();
    var aabne = alle.filter(function (i) { return !state.done[i.id]; });
    var klaret = alle.filter(function (i) { return state.done[i.id]; });
    function item(i) {
      var rt = relTid(i.dato, i.tid), f = !!state.done[i.id];
      return '<li class="mangel' + (rt.over && !f ? ' is-over' : '') + (f ? ' is-done' : '') + '">' +
        '<button type="button" class="btn btn-tjek" data-action="done" data-id="' + i.id + '" aria-pressed="' + f + '" aria-label="' + (f ? 'Fortryd færdig: ' : 'Markér færdig: ') + esc(i.titel) + '">' + (f ? IKON.tjek : '') + '</button>' +
        '<p class="mangel-frist tid' + (rt.over && !f ? ' bad' : '') + '">' + rt.tekst + '</p>' +
        '<div class="mangel-krop"><h3>' + esc(i.titel) + '</h3><p class="muted">' + i.type + ' · ' + esc(i.under) + '</p>' +
          (i.lektie ? '<div class="knapper">' + lektieKnapper(i.lektie) + '</div>' : '') + '</div></li>';
    }
    return '<header class="side-top"><h1 tabindex="-1">Mangler jeg</h1><p class="muted">' + aabne.length + ' åbne. Nærmeste frist først. Tryk på firkanten, når du er færdig. Gemmes kun i denne browser.</p></header>' +
      (aabne.length ? '<ul class="mangler">' + aabne.map(item).join('') + '</ul>' : '<p>Du mangler ingenting.</p>') +
      (klaret.length ? '<section class="klaret"><h2>Klaret (' + klaret.length + ')</h2><ul class="mangler">' + klaret.map(item).join('') + '</ul></section>' : '');
  };

  function modulBlok(m) {
    var a = state.aarsag[m.id], l = lektieAf[m.id];
    return '<div class="modul f-' + farve(m) + (erSlut(m) ? ' is-slut' : '') + '" style="--s:' + (toMin(m.start) - 480) + ';--d:' + (toMin(m.slut) - toMin(m.start)) + '">' +
      '<div class="modul-top">' + regBoks(m) + '<span class="modul-tid tid">' + m.start + '–' + m.slut + '</span>' + knapKopiModul(m, true) + '</div>' +
      '<button type="button" class="linkknap modul-navn" data-action="aaben-modul" data-id="' + m.id + '">' + esc(navn(m)) + '</button>' +
      '<p class="modul-info">' + esc(m.laerer) + ' · ' + esc(m.lokale) + '</p>' +
      maerker(m) +
      (a ? '<p class="modul-aarsag">Årsag: ' + esc(a.aarsag) + '</p>' : kanFaaAarsag(m) ? '<p class="bad modul-aarsag">Mangler årsag</p>' : '') +
      (l ? '<p class="modul-lektie">' + esc(l.kort) + '</p><div class="knapper"><button type="button" class="btn btn-small btn-kopi" data-action="kopi-lektie" data-id="' + l.id + '">' + IKON.kopi + '<span class="lbl">Kopiér</span></button>' +
        (l.link ? '<a class="btn btn-small" href="' + esc(l.link) + '" target="_blank" rel="noopener">' + IKON.link + '<span class="lbl">Åbn link</span></a>' : '') + '</div>' : '') +
      (m.note ? '<p class="modul-note">' + esc(m.note) + '</p>' : '') +
    '</div>';
  }

  screens.uge = function () {
    var t = today(), valgt = ui.ugeDag && D.demoDage.indexOf(ui.ugeDag) > -1 ? ui.ugeDag : t, S = 480;
    var timer = []; for (var h = 8; h <= 16; h++) timer.push(h);
    var vaelger = '<div class="dagvaelger" role="group" aria-label="Vælg dag">' + D.demoDage.map(function (dt) {
      var x = d(dt);
      return '<button type="button" class="btn dagknap" data-action="vaelg-dag" data-id="' + dt + '" aria-pressed="' + (dt === valgt) + '"><span>' + cap(DAGE[x.getDay()].slice(0, 3)) + '</span><span class="tid">' + x.getDate() + '/' + (x.getMonth() + 1) + (dt === t ? ' i dag' : '') + '</span></button>';
    }).join('') + '</div>';
    var akse = '<div class="akse" aria-hidden="true"><div class="akse-hoved"></div><div class="spor">' + timer.map(function (h) {
      return '<span class="akse-time tid" style="--s:' + (h * 60 - S) + '">' + pad(h) + ':00</span>';
    }).join('') + '</div></div>';
    var dage = D.demoDage.map(function (dt) {
      var x = d(dt);
      return '<section class="dag' + (dt === t ? ' is-idag' : '') + (dt === valgt ? ' is-valgt' : '') + '" aria-label="' + langDato(dt) + '">' +
        '<h2 class="dag-navn"><span>' + cap(DAGE[x.getDay()]) + '</span><span class="tid">' + x.getDate() + '/' + (x.getMonth() + 1) + '</span>' + (dt === t ? '<span>i dag</span>' : '') + '</h2><div class="spor">' +
        timer.map(function (h) { return '<span class="time-linje" style="--s:' + (h * 60 - S) + '"></span>'; }).join('') +
        (dt === t ? '<span class="nu-uge" style="--s:' + (nowMin() - S) + '" aria-hidden="true"></span>' : '') +
        dagensModuler(dt).map(modulBlok).join('') + '</div></section>';
    }).join('');
    var legende = '<details class="legende" open><summary>Hvad betyder farver og tegn?</summary><ul>' +
      '<li><span class="streg f-lektie"></span><span class="mrk mrk-lektie">Lektier</span> Blå: der er lektie</li>' +
      '<li><span class="streg f-note"></span><span class="mrk mrk-note">Note</span> Grøn: lærernote</li>' +
      '<li><span class="streg f-ingen"></span><span class="mrk mrk-ingen">Ingen</span> Gul: ingen note eller lektier</li>' +
      '<li>Har et modul både lektie og note, vises begge mærker.</li></ul>' + regForklaring() + '</details>';
    return '<header class="side-top"><h1 tabindex="-1">Uge 48</h1><p class="muted">Lektien står i modulet. Tryk på et fag for hele teksten og noten.</p></header>' +
      vaelger + '<div class="uge">' + akse + dage + '</div>' + legende;
  };

  screens.fravaer = function () {
    var rows = fravaerTal(), g = D.demoGraense;
    var tot = rows.reduce(function (a, r) { a.afholdt += r.afholdt; a.u += r.u; a.syg += r.syg; a.ingen += r.ingen; return a; }, { afholdt: 0, u: 0, syg: 0, ingen: 0 });
    var totPct = (tot.u + tot.syg) / tot.afholdt * 100;
    var problem = rows.filter(function (r) { return r.pct >= g; });
    rows.sort(function (a, b) { return b.pct - a.pct; });
    var fravMods = D.tidligereU.concat(D.moduler.filter(function (m) { var r = reg(m); return erSlut(m) && (r === 'U' || r === 'ingen'); }))
      .sort(function (a, b) { return a.dato < b.dato ? 1 : -1; });
    var t = today(), syg = state.sick[t];
    var nValgt = Object.keys(ui.valgte).filter(function (k) { return ui.valgte[k]; }).length;

    return '<div class="fravaer">' +
      '<header class="side-top"><h1 tabindex="-1">Fravær</h1><p class="demo-note">Demo: alle tal er fiktive. Fravær her = U + sygdom. Om sygdom tæller med: [tjek med skolen].</p></header>' +
      '<section class="fravaer-tal" aria-labelledby="h-samlet"><p class="stort-tal tid">' + pct(totPct) + '</p><h2 class="stort-tal-lbl" id="h-samlet">Samlet fravær (demo)</h2>' +
        '<p class="muted">' + (tot.u + tot.syg) + ' af ' + tot.afholdt + ' moduler siden ' + d(D.fravaerStart).getDate() + '. ' + MDR[d(D.fravaerStart).getMonth()] + '. ' + tot.u + ' U, ' + tot.syg + ' syg' + (tot.ingen ? ', ' + tot.ingen + ' ikke registreret' : '') + '.</p>' +
        (problem.length ? '<p class="advarsel"><strong>Kan blive et problem:</strong> ' + problem.map(function (r) { return esc(D.fag[r.fag].navn) + ' (' + pct(r.pct) + ')'; }).join(', ') + '. Over demo-grænsen på ' + g + ' %.</p>' : '<p>Ingen fag over demo-grænsen.</p>') +
        '<p class="muted lille">Demo-grænse: ' + g + ' %. Den rigtige grænse: [tjek med skolen].</p></section>' +

      '<section class="fravaer-syg" aria-labelledby="h-syg"><h2 id="h-syg">Syg?</h2><p class="muted">Demo: der sendes intet til skolen.</p>' +
        (syg ? '<p class="syg-status"><strong>Sygemeldt i dag (demo).</strong></p>' : '') + '<div class="knapper">' +
        '<button type="button" class="btn btn-syg" data-action="sygemeld"' + (syg ? ' disabled' : '') + '>Sygemeld</button>' +
        '<button type="button" class="btn" data-action="raskmeld"' + (syg ? '' : ' disabled') + '>Raskmeld</button>' +
        '<button type="button" class="btn" data-action="forlaeng"' + (syg ? '' : ' disabled') + '>Forlæng sygemelding</button></div></section>' +

      '<section class="fravaer-fag" aria-labelledby="h-fag"><h2 id="h-fag">Pr. fag</h2><table class="tabel"><thead><tr><th scope="col">Fag</th><th scope="col">Fravær</th><th scope="col" class="tal">U</th><th scope="col" class="tal">Syg</th><th scope="col" class="tal">Mod.</th></tr></thead><tbody>' +
        rows.map(function (r) {
          var cls = r.pct >= g ? 'bad' : r.pct >= g * 0.75 ? 'warn' : '';
          var tekst = r.pct >= g ? 'Over demo-grænsen' : r.pct >= g * 0.75 ? 'Tæt på' : 'OK';
          return '<tr><th scope="row">' + esc(D.fag[r.fag].navn) + '</th><td class="pct ' + cls + '"><strong>' + pct(r.pct) + '</strong><br><span>' + tekst + '</span>' +
            '<span class="bar" aria-hidden="true"><span style="width:' + Math.min(100, r.pct / (g * 1.5) * 100).toFixed(0) + '%"></span></span></td><td class="tal">' + r.u + '</td><td class="tal">' + r.syg + '</td><td class="tal">' + r.afholdt + '</td></tr>';
        }).join('') + '</tbody></table></section>' +

      '<section class="fravaer-liste" aria-labelledby="h-u"><h2 id="h-u">Moduler med fravær uden årsag eller registrering</h2>' + regForklaring() +
        '<div class="fler-grid"><ol class="raekker">' + fravMods.map(function (m) {
          return '<li class="raekke fravaer-raekke"><label class="vaelg"><input type="checkbox" class="vaelg-modul" data-id="' + m.id + '"' + (ui.valgte[m.id] ? ' checked' : '') + '><span class="sr-only">Vælg ' + esc(navn(m)) + ' ' + kortDato(m.dato) + '</span></label>' +
            '<p class="raekke-tid tid"><strong>' + cap(kortDato(m.dato)) + '</strong><span>' + m.start + '</span></p>' +
            '<div class="raekke-main"><p class="raekke-titel">' + regBoks(m) + '<strong>' + esc(navn(m)) + '</strong></p><p>' + REG_TEKST[reg(m)] + '</p><p>' + aarsagLinje(m) + '</p></div>' +
            '<div class="raekke-knap">' + knapKopiModul(m, true) + knapAarsag(m) + '</div></li>';
        }).join('') + '</ol>' +
        '<div class="fler" role="group" aria-labelledby="h-fler"><h3 id="h-fler">Udfyld valgte moduler</h3>' +
          '<p class="muted" id="fler-antal">' + nValgt + ' valgt. Sæt flueben ved modulerne og vælg én fælles årsag.</p>' +
          '<div class="aarsager">' + D.aarsager.map(function (x) {
            return '<button type="button" class="btn" data-action="fler-aarsag" data-id="' + esc(x) + '" aria-pressed="' + (ui.flerAarsag === x) + '">' + esc(x) + '</button>';
          }).join('') + '</div>' +
          '<label class="felt-lbl" for="fler-kommentar">Kort kommentar (valgfri)</label><input id="fler-kommentar" type="text" maxlength="80">' +
          '<div class="knapper"><button type="button" class="btn btn-primary" data-action="udfyld-valgte">Udfyld valgte moduler</button>' +
          '<button type="button" class="btn btn-text" data-action="vaelg-alle">Vælg alle uden årsag</button></div>' +
          '<p class="bad" id="fler-fejl" role="alert"></p>' +
          (ui.flerBesked ? '<p class="fler-besked ok" role="status">' + esc(ui.flerBesked) + '</p>' : '') +
          '<p class="muted lille">Årsagsliste: demo-eksempel, tjek med skolen. Gemmes kun i denne browser, intet sendes.</p></div>' +
        '</div></section></div>';
  };

  screens.samtaler = function () {
    return '<header class="side-top"><h1 tabindex="-1">Samtaler</h1><p class="muted">Fiktive beskeder til demo.</p></header><ul class="beskeder">' + D.samtaler.map(function (s) {
      return '<li><p class="muted">' + esc(s.fra) + ' · ' + kortDato(s.dato) + '</p><h2>' + esc(s.emne) + '</h2><p>' + esc(s.tekst) + '</p></li>';
    }).join('') + '</ul><p class="tilbage"><a class="btn" href="#idag">Tilbage til I dag</a></p>';
  };
  screens.kalender = function () {
    return '<header class="side-top"><h1 tabindex="-1">Aktivitetskalender</h1><p class="muted">Fiktive aktiviteter.</p></header><ol class="raekker">' + D.kalender.map(function (k) {
      return '<li class="raekke"><p class="raekke-tid tid"><strong>' + cap(kortDato(k.dato)) + '</strong><span>' + k.tid + '</span></p><div class="raekke-main"><p class="raekke-titel"><strong>' + esc(k.titel) + '</strong></p><p class="muted">' + esc(k.sted) + '</p></div></li>';
    }).join('') + '</ol><p class="tilbage"><a class="btn" href="#idag">Tilbage til I dag</a></p>';
  };

  /* ---------- dialoger ---------- */
  var dlg = document.getElementById('dlg'), dlgBody = document.getElementById('dlg-body');
  function visDialog(html) { dlgBody.innerHTML = html; if (!dlg.open) dlg.showModal(); var f = dlgBody.querySelector('[autofocus], .btn'); if (f) f.focus(); }
  function lukDialog() { if (dlg.open) dlg.close(); }

  function modulDialog(id) {
    var m = byId[id], l = lektieAf[id], r = reg(m);
    visDialog('<h2 id="dlg-title">' + esc(navn(m)) + '</h2>' +
      '<p>' + langDato(m.dato) + ', ' + m.start + '-' + m.slut + '<br>Lokale ' + esc(m.lokale) + ' · ' + esc(m.laerer) + '</p>' + maerker(m) +
      (r ? '<p class="raekke-titel">' + regBoks(m) + REG_TEKST[r] + '</p>' : '') + (aarsagLinje(m) ? '<p>' + aarsagLinje(m) + '</p>' : '') +
      (l ? '<h3>Lektie</h3><p>' + esc(l.tekst) + '</p>' + (l.link ? '<p class="lektie-link"><a href="' + esc(l.link) + '" target="_blank" rel="noopener">' + esc(l.link) + '</a></p>' : '') + '<div class="knapper">' + lektieKnapper(l) + '</div>' : (m.type === 'lektion' ? '<p class="muted">Ingen lektie.</p>' : '')) +
      (m.note ? '<h3>Note</h3><p>' + esc(m.note) + '</p>' : '') +
      '<div class="knapper">' + knapKopiModul(m, false) + knapAarsag(m) + '<button type="button" class="btn btn-text" data-action="luk">Luk</button></div>');
  }

  var valg = { id: null, aarsag: null };
  function aarsagDialog(id) {
    var m = byId[id], a = state.aarsag[id];
    valg = { id: id, aarsag: a ? a.aarsag : null };
    visDialog('<h2 id="dlg-title">Årsag til fravær</h2>' +
      '<p><strong>' + esc(navn(m)) + '</strong>, ' + langDato(m.dato) + ' kl. ' + m.start + '<br>' + REG_TEKST[reg(m)] + '</p>' +
      '<p class="muted">Årsagsliste: demo-eksempel, tjek med skolen.</p>' +
      '<div class="aarsager" role="group" aria-label="Vælg årsag">' + D.aarsager.map(function (x) {
        return '<button type="button" class="btn" data-action="vaelg-aarsag" data-id="' + esc(x) + '" aria-pressed="' + (valg.aarsag === x) + '">' + esc(x) + '</button>';
      }).join('') + '</div>' +
      '<label class="felt-lbl" for="aarsag-kommentar">Kort kommentar (valgfri)</label>' +
      '<input id="aarsag-kommentar" type="text" maxlength="80" value="' + esc(a ? a.kommentar : '') + '">' +
      '<p class="muted">Demo: gemmes kun i denne browser. Intet sendes til skolen.</p>' +
      '<div class="knapper"><button type="button" class="btn btn-primary" data-action="gem-aarsag"' + (valg.aarsag ? '' : ' disabled') + '>Gem årsag</button>' +
      (a ? '<button type="button" class="btn" data-action="fjern-aarsag">Fjern årsag</button>' : '') +
      '<button type="button" class="btn btn-text" data-action="luk">Annullér</button></div>');
  }

  function sygDialog() {
    visDialog('<h2 id="dlg-title">Sygemeld dig for i dag?</h2>' +
      '<p>' + langDato(today()) + ', fra nu (kl. ' + D.demoTid + ') og resten af dagen.</p>' +
      '<p class="demo-note">Demo: der sendes intet til skolen.</p>' +
      '<div class="knapper"><button type="button" class="btn btn-syg" data-action="bekraeft-syg" autofocus>Ja, sygemeld mig</button>' +
      '<button type="button" class="btn btn-text" data-action="luk">Fortryd</button></div>');
  }
  function kvittering(tekst) {
    visDialog('<h2 id="dlg-title">' + tekst + '</h2><p class="demo-note">Demo: der er ikke sendt noget.</p><div class="knapper"><button type="button" class="btn btn-primary" data-action="luk" autofocus>OK</button></div>');
  }

  /* ---------- nu-markøren (signaturbevægelsen) ---------- */
  function placerNu(anim) {
    var ol = document.querySelector('.tidslinje'); if (!ol) return;
    var mk = ol.querySelector('.nu-mark'); if (!mk) return;
    var row = ol.querySelector('.raekke.is-nu'), nx = ol.querySelector('.raekke.is-senere'), y;
    if (row) y = row.offsetTop + row.offsetHeight * (+row.dataset.p);
    else if (nx && ol.querySelector('.raekke.is-slut')) y = nx.offsetTop;
    else { mk.hidden = true; return; }
    mk.hidden = false;
    if (anim && !reduce) {
      mk.style.transform = 'translateY(0px)';
      void mk.offsetHeight;
      mk.classList.add('glid');
      requestAnimationFrame(function () { mk.style.transform = 'translateY(' + y + 'px)'; });
    } else { mk.classList.remove('glid'); mk.style.transform = 'translateY(' + y + 'px)'; }
  }

  /* ---------- router og render ---------- */
  function route() { var r = (location.hash || '#idag').slice(1); return screens[r] ? r : 'idag'; }
  function render(fokus) {
    var r = route(), main = document.getElementById('main');
    main.innerHTML = screens[r]();
    var navR = (r === 'samtaler' || r === 'kalender') ? 'idag' : r;
    document.querySelectorAll('.nav a').forEach(function (a) {
      if (a.getAttribute('data-route') === navR) a.setAttribute('aria-current', 'page'); else a.removeAttribute('aria-current');
    });
    document.getElementById('skift-dag').innerHTML = 'Dag: ' + kortDato(today());
    document.getElementById('btn-tema').setAttribute('aria-pressed', document.documentElement.getAttribute('data-theme') === 'dark');
    document.getElementById('btn-stor').setAttribute('aria-pressed', !!state.big);
    document.title = { idag: 'I dag', lektier: 'Lektier', mangler: 'Mangler jeg', uge: 'Uge', fravaer: 'Fravær', samtaler: 'Samtaler', kalender: 'Aktivitetskalender' }[r] + ' · Studie UX-demo';
    placerNu(foersteVisning && r === 'idag'); foersteVisning = false;
    if (fokus) { var el = main.querySelector(fokus); if (el) el.focus(); }
  }
  function genRender(knap) {
    var sel = knap && knap.dataset.action ? '[data-action="' + knap.dataset.action + '"][data-id="' + (knap.dataset.id || '') + '"]' : null;
    render(sel);
  }
  function flerFejl(t) { var el = document.getElementById('fler-fejl'); if (el) el.textContent = t; }
  function flerAntal() {
    var n = Object.keys(ui.valgte).filter(function (k) { return ui.valgte[k]; }).length, el = document.getElementById('fler-antal');
    if (el) el.textContent = n + ' valgt. Sæt flueben ved modulerne og vælg én fælles årsag.';
  }

  window.addEventListener('hashchange', function () { lukDialog(); ui.flerBesked = ''; render('h1'); window.scrollTo(0, 0); });
  window.addEventListener('resize', function () { placerNu(false); });

  document.addEventListener('change', function (e) {
    if (!e.target.classList.contains('vaelg-modul')) return;
    ui.valgte[e.target.dataset.id] = e.target.checked; flerAntal(); flerFejl('');
  });

  document.addEventListener('click', function (e) {
    var k = e.target.closest('[data-action]'); if (!k || k.disabled) return;
    var a = k.dataset.action, id = k.dataset.id;
    switch (a) {
      case 'kopi-lektie': kopier(lektieTekst(lektieById[id]), k); break;
      case 'kopi-link': kopier(lektieById[id].link, k); break;
      case 'kopi-modul': kopier(modulTekst(byId[id]), k); break;
      case 'kopi-alle': {
        var t = today(), nd = naesteSkoledag(t), f = k.dataset.scope === 'idag' ? 'idag' : ui.filter;
        var ls = D.lektier.filter(function (l) {
          return f === 'idag' ? l.m.dato === t : f === 'imorgen' ? l.m.dato === nd : f === 'uge' ? D.demoDage.indexOf(l.m.dato) > -1 : true;
        });
        var head = f === 'idag' ? 'Lektier ' + langDato(t).toLowerCase() : 'Lektier';
        kopier(head + '\n\n' + ls.map(lektieTekst).join('\n\n'), k); break;
      }
      case 'vis-idag': ui.filter = 'idag'; break;
      case 'done': state.done[id] = !state.done[id]; if (!state.done[id]) delete state.done[id]; save(); genRender(k); meld(state.done[id] ? 'Markeret som færdig' : 'Markeret som ikke færdig'); break;
      case 'fold': ui.open[id] = !ui.open[id]; genRender(k); break;
      case 'filter': ui.filter = id; genRender(k); break;
      case 'vaelg-dag': ui.ugeDag = id; genRender(k); break;
      case 'aaben-modul': modulDialog(id); break;
      case 'aarsag': aarsagDialog(id); break;
      case 'vaelg-aarsag':
        valg.aarsag = id;
        dlgBody.querySelectorAll('[data-action="vaelg-aarsag"]').forEach(function (b) { b.setAttribute('aria-pressed', b.dataset.id === id); });
        dlgBody.querySelector('[data-action="gem-aarsag"]').disabled = false; break;
      case 'gem-aarsag':
        state.aarsag[valg.id] = { aarsag: valg.aarsag, kommentar: document.getElementById('aarsag-kommentar').value.trim() };
        save(); lukDialog(); render(); meld('Årsag gemt: ' + valg.aarsag); break;
      case 'fjern-aarsag': delete state.aarsag[valg.id]; save(); lukDialog(); render(); meld('Årsag fjernet'); break;
      case 'fler-aarsag':
        ui.flerAarsag = id; flerFejl('');
        document.querySelectorAll('[data-action="fler-aarsag"]').forEach(function (b) { b.setAttribute('aria-pressed', b.dataset.id === id); });
        break;
      case 'vaelg-alle':
        document.querySelectorAll('.vaelg-modul').forEach(function (c) { if (!state.aarsag[c.dataset.id]) { c.checked = true; ui.valgte[c.dataset.id] = true; } });
        flerAntal(); flerFejl(''); break;
      case 'udfyld-valgte': {
        var ids = Object.keys(ui.valgte).filter(function (x) { return ui.valgte[x]; });
        if (!ids.length) { flerFejl('Vælg mindst ét modul først (sæt flueben).'); break; }
        if (!ui.flerAarsag) { flerFejl('Vælg en årsag først.'); break; }
        var kom = document.getElementById('fler-kommentar').value.trim();
        ids.forEach(function (x) { state.aarsag[x] = { aarsag: ui.flerAarsag, kommentar: kom }; });
        save();
        ui.flerBesked = 'Årsag "' + ui.flerAarsag + '" sat på ' + ids.length + (ids.length === 1 ? ' modul' : ' moduler') + ' (demo, intet sendt).';
        ui.valgte = {}; ui.flerAarsag = null; render(); meld(ui.flerBesked); break;
      }
      case 'sygemeld': sygDialog(); break;
      case 'bekraeft-syg': state.sick[today()] = { fra: nowMin() }; save(); render(); kvittering('Du er sygemeldt i dag'); break;
      case 'raskmeld': {
        var t2 = today(); Object.keys(state.sick).forEach(function (x) { if (x >= t2) delete state.sick[x]; });
        save(); render(); kvittering('Du er raskmeldt'); break;
      }
      case 'forlaeng': {
        var n = naesteSkoledag(today());
        if (n) { state.sick[n] = { fra: 0 }; save(); render(); kvittering('Sygemelding forlænget til ' + langDato(n).toLowerCase()); }
        break;
      }
      case 'luk': lukDialog(); break;
      case 'skift-dag': {
        var i = state.dayIdx == null ? D.startIndex : state.dayIdx;
        state.dayIdx = (i + 1) % D.demoDage.length; ui.ugeDag = null; save(); render(); meld('Demodag: ' + langDato(today())); break;
      }
      case 'visning': {
        var p = document.getElementById('visning'); p.hidden = !p.hidden; k.setAttribute('aria-expanded', !p.hidden); break;
      }
      case 'tema': {
        var dark = document.documentElement.getAttribute('data-theme') !== 'dark';
        state.theme = dark ? 'dark' : 'light'; document.documentElement.setAttribute('data-theme', state.theme); save(); render(); break;
      }
      case 'stortekst':
        state.big = !state.big; if (state.big) document.documentElement.setAttribute('data-text', 'stor'); else document.documentElement.removeAttribute('data-text');
        save(); render(); break;
      case 'nulstil': {
        var th = state.theme;
        try { localStorage.removeItem(LS); } catch (e2) {}
        state = fresh(); state.theme = th; save(); ui = freshUi();
        document.documentElement.removeAttribute('data-text');
        render(); meld('Demoen er nulstillet'); break;
      }
    }
  });

  render();
})();
