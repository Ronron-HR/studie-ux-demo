/* Studie UX-demo. Ren vanilla JS, ingen afhængigheder. Alt gemmes kun i localStorage. */
(function () {
  'use strict';

  var D = window.DEMO;
  var LS = 'studie-ux-demo:v1';
  var state = load();
  var ui = { filter: 'idag', open: {} };

  /* ---------- lager ---------- */
  function fresh() { return { done: {}, sick: {}, aarsag: {}, theme: null, big: false, dayIdx: null }; }
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
  function today() { var i = state.dayIdx == null ? D.startIndex : state.dayIdx; return D.demoDage[i]; }
  function nowMin() { return toMin(D.demoTid); }
  function cap(s) { return s.charAt(0).toUpperCase() + s.slice(1); }
  function langDato(iso) { var x = d(iso); return cap(DAGE[x.getDay()]) + ' ' + x.getDate() + '. ' + MDR[x.getMonth()]; }
  function kortDato(iso) { var x = d(iso); return DAGE[x.getDay()].slice(0, 3) + ' ' + x.getDate() + '/' + (x.getMonth() + 1); }
  function dagDiff(a, b) { return Math.round((d(b) - d(a)) / 86400000); }
  function absMin(iso, t) { return dagDiff(today(), iso) * 1440 + toMin(t); }
  function relTid(iso, t) {
    var diff = absMin(iso, t) - nowMin();
    var dd = dagDiff(today(), iso);
    if (diff < 0) return { tekst: 'Fristen er passeret (' + kortDato(iso) + ' kl. ' + t + ')', over: true };
    if (dd === 0) {
      var h = Math.floor(diff / 60), m = diff % 60;
      return { tekst: 'I dag kl. ' + t + ' (om ' + (h ? h + ' t ' : '') + m + ' min)' };
    }
    if (dd === 1) return { tekst: 'I morgen kl. ' + t };
    return { tekst: cap(DAGE[d(iso).getDay()]) + ' ' + d(iso).getDate() + '. ' + MDR[d(iso).getMonth()] + ' kl. ' + t + ' (om ' + dd + ' dage)' };
  }

  /* ---------- data-opslag ---------- */
  var byId = {};
  D.moduler.forEach(function (m) { byId[m.id] = m; });
  D.tidligereU.forEach(function (m) { m.type = 'lektion'; m.reg = 'U'; m.tidligere = true; byId[m.id] = m; });
  var lektieAf = {};
  D.lektier.forEach(function (l) { lektieAf[l.modul] = l; l.m = byId[l.modul]; });

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
    dok: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 3h9l3 3v15H6zM9 11h6M9 15h6" /></svg>',
    info: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3a9 9 0 100 18 9 9 0 000-18zM12 10v7M12 7v.5" /></svg>'
  };
  function regBoks(m) {
    var r = reg(m);
    if (m.type !== 'lektion') return '';
    var t = r === 'til' ? IKON.tjek : r === 'U' ? 'U' : r === 'syg' ? 'S' : '';
    var lbl = r ? REG_TEKST[r] : 'Ikke registreret endnu';
    return '<span class="reg reg-' + (r || 'tom') + '" role="img" aria-label="' + esc(lbl) + '">' + t + '</span>';
  }
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
        knap.setAttribute('data-kopieret', '1');
        if (lbl) { if (!knap.dataset.orig) knap.dataset.orig = lbl.textContent; lbl.textContent = besked; }
        clearTimeout(knap._t);
        knap._t = setTimeout(function () {
          knap.classList.remove('is-kopieret'); knap.removeAttribute('data-kopieret');
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
  function lektieItem(l, visDato) {
    var faerdigt = !!state.done[l.id], aaben = !!ui.open[l.id];
    return '<li class="lektie' + (faerdigt ? ' is-done' : '') + '">' +
      '<div class="lektie-head"><h3>' + esc(navn(l.m)) + '</h3><span class="muted">' + (visDato ? kortDato(l.m.dato) + ', ' : '') + 'kl. ' + l.m.start + '</span></div>' +
      '<p class="lektie-kort">' + esc(aaben ? l.tekst : l.kort) + '</p>' +
      (aaben && l.link ? '<p class="lektie-link"><a href="' + esc(l.link) + '" target="_blank" rel="noopener">' + esc(l.link) + '</a></p>' : '') +
      '<div class="knapper">' +
        '<button type="button" class="btn btn-primary" data-action="kopi-lektie" data-id="' + l.id + '">' + IKON.kopi + '<span class="lbl">Kopiér</span></button>' +
        (l.link ? '<a class="btn" href="' + esc(l.link) + '" target="_blank" rel="noopener">' + IKON.link + '<span class="lbl">Åbn link</span></a>' : '') +
        '<button type="button" class="btn" data-action="done" data-id="' + l.id + '" aria-pressed="' + faerdigt + '">' + (faerdigt ? IKON.tjek : '') + '<span class="lbl">' + (faerdigt ? 'Færdig' : 'Markér færdig') + '</span></button>' +
        '<button type="button" class="btn btn-text" data-action="fold" data-id="' + l.id + '" aria-expanded="' + aaben + '">' + (aaben ? 'Vis kort' : 'Vis hele lektien') + '</button>' +
      '</div></li>';
  }

  function skemaRaekke(m) {
    var slut = erSlut(m), nu = erNu(m), r = reg(m), l = lektieAf[m.id];
    var status = nu ? 'Nu' : slut ? 'Slut' : 'Senere';
    var info = [esc(m.lokale) + ' · ' + esc(m.laerer)];
    if (l) info.push('Lektie: ' + esc(l.kort));
    if (m.note) info.push('Note: ' + esc(m.note));
    return '<li class="raekke' + (nu ? ' is-nu' : '') + (slut ? ' is-slut' : '') + '">' +
      '<div class="raekke-tid"><strong>' + m.start + '</strong><span class="muted">' + m.slut + '</span></div>' +
      '<div class="raekke-main">' +
        '<p class="raekke-titel">' + regBoks(m) + '<button type="button" class="linkknap" data-action="aaben-modul" data-id="' + m.id + '">' + esc(navn(m)) + '</button> <span class="status">' + status + '</span></p>' +
        '<p class="muted">' + info.join('<br>') + '</p>' +
        (r && r !== 'til' ? '<p>' + REG_TEKST[r] + (aarsagLinje(m) ? ' · ' + aarsagLinje(m) : '') + '</p>' : '') +
      '</div>' +
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

  /* ---------- skærme ---------- */
  var screens = {};

  screens.idag = function () {
    var t = today(), mods = dagensModuler(t);
    var nu = mods.filter(erNu)[0];
    var naeste = mods.filter(function (m) { return toMin(m.start) > nowMin(); })[0];
    var lekt = D.lektier.filter(function (l) { return l.m.dato === t; });
    var mangler = manglerListe().filter(function (i) { return !state.done[i.id]; });
    var syg = state.sick[t];
    var nd = naesteSkoledag(t);

    var hero = '<section class="hero">' +
      '<h1 tabindex="-1">' + langDato(t) + '</h1>' +
      '<p class="muted">Klokken er ' + D.demoTid + ' (demotid)</p>' +
      (nu ? '<p class="nu">Nu: <strong>' + esc(navn(nu)) + '</strong> til ' + nu.slut + ', ' + esc(nu.lokale) + '</p>' : '') +
      (naeste ? '<p class="naeste-lbl">Næste</p><p class="naeste"><strong>' + esc(navn(naeste)) + '</strong></p><p class="naeste-info">' + naeste.start + '-' + naeste.slut + ' · ' + esc(naeste.lokale) + ' · ' + esc(naeste.laerer) + ' · ' + relTid(t, naeste.start).tekst.replace('I dag kl. ' + naeste.start + ' ', '') + '</p>'
              : '<p class="naeste">Ikke flere moduler i dag.</p>' + (nd ? '<p class="muted">Næste skoledag: ' + langDato(nd) + '</p>' : '')) +
      '<div class="knapper">' + (syg
        ? '<p class="syg-status"><strong>Du er sygemeldt i dag (demo).</strong></p><button type="button" class="btn" data-action="raskmeld">Raskmeld</button><button type="button" class="btn" data-action="forlaeng">Forlæng til næste skoledag</button>'
        : '<button type="button" class="btn btn-syg" data-action="sygemeld">Jeg er syg i dag</button>') + '</div>' +
      '</section>';

    var skema = '<section class="blok" aria-labelledby="h-skema"><h2 id="h-skema">Dagens skema</h2>' +
      (mods.length ? '<ol class="raekker">' + mods.map(skemaRaekke).join('') + '</ol>' : '<p>Ingen moduler.</p>') + '</section>';

    var lektier = '<section class="blok" aria-labelledby="h-lekt"><div class="blok-head"><h2 id="h-lekt">Lektier til i dag (' + lekt.length + ')</h2>' +
      (lekt.length ? '<button type="button" class="btn" data-action="kopi-alle" data-scope="idag">' + IKON.kopi + '<span class="lbl">Kopiér alle lektier i dag</span></button>' : '') + '</div>' +
      (lekt.length ? '<ul class="lektier">' + lekt.map(function (l) { return lektieItem(l, false); }).join('') + '</ul>' : '<p>Ingen lektier i dag.</p>') + '</section>';

    var forst = mangler[0];
    var mang = '<section class="blok" aria-labelledby="h-mang"><h2 id="h-mang">Mangler jeg</h2>' +
      '<p class="stort-tal">' + mangler.length + ' <span>ting mangler</span></p>' +
      (forst ? '<p>Nærmeste: <strong>' + esc(forst.titel) + '</strong> (' + forst.type.toLowerCase() + '). ' + '<span class="' + (relTid(forst.dato, forst.tid).over ? 'bad' : '') + '">' + relTid(forst.dato, forst.tid).tekst + '</span></p>' : '') +
      '<p><a class="btn" href="#mangler">Se hele listen</a></p></section>';

    var ulaeste = D.samtaler.length;
    var smaa = '<section class="blok" aria-labelledby="h-smaa"><h2 id="h-smaa">Fra skolen</h2><ul class="links">' +
      '<li><a href="#samtaler">Samtaler <span class="muted">(' + ulaeste + ' beskeder, fiktive)</span></a></li>' +
      '<li><a href="#kalender">Aktivitetskalender <span class="muted">(næste: ' + esc(naesteAktivitet().titel) + ')</span></a></li></ul></section>';

    return hero + '<div class="to-kol"><div>' + skema + '</div><div>' + lektier + mang + smaa + '</div></div>';
  };

  function naesteAktivitet() { var t = today(); return D.kalender.filter(function (k) { return k.dato >= t; })[0] || D.kalender[D.kalender.length - 1]; }

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
    return '<h1 tabindex="-1">Lektier</h1>' +
      '<div class="filtre" role="group" aria-label="Vis lektier for">' + filtre.map(function (x) {
        return '<button type="button" class="btn" data-action="filter" data-id="' + x[0] + '" aria-pressed="' + (f === x[0]) + '">' + x[1] + '</button>';
      }).join('') + '</div>' +
      (liste.length ? '<p><button type="button" class="btn btn-primary" data-action="kopi-alle" data-scope="filter">' + IKON.kopi + '<span class="lbl">Kopiér alle ' + liste.length + ' lektier</span></button></p>' : '') +
      (liste.length ? Object.keys(grupper).sort().map(function (dt) {
        return '<section class="blok"><h2>' + langDato(dt) + (dt === t ? ' (i dag)' : '') + '</h2><ul class="lektier">' + grupper[dt].map(function (l) { return lektieItem(l, false); }).join('') + '</ul></section>';
      }).join('') : '<p>Ingen lektier her.</p>');
  };

  screens.mangler = function () {
    var alle = manglerListe();
    var aabne = alle.filter(function (i) { return !state.done[i.id]; });
    var klaret = alle.filter(function (i) { return state.done[i.id]; });
    function item(i) {
      var rt = relTid(i.dato, i.tid), f = !!state.done[i.id];
      return '<li class="mangel' + (rt.over && !f ? ' is-over' : '') + '">' +
        '<button type="button" class="btn btn-tjek" data-action="done" data-id="' + i.id + '" aria-pressed="' + f + '" aria-label="' + (f ? 'Fortryd færdig: ' : 'Markér færdig: ') + esc(i.titel) + '">' + (f ? IKON.tjek : '') + '</button>' +
        '<div><p class="mangel-type muted">' + i.type + '</p><h3>' + esc(i.titel) + '</h3><p class="muted">' + esc(i.under) + '</p>' +
        '<p class="' + (rt.over && !f ? 'bad' : '') + '">' + rt.tekst + '</p>' +
        (i.lektie ? '<p><button type="button" class="btn" data-action="kopi-lektie" data-id="' + i.id + '">' + IKON.kopi + '<span class="lbl">Kopiér lektie</span></button></p>' : '') +
        '</div></li>';
    }
    return '<h1 tabindex="-1">Mangler jeg</h1>' +
      '<p class="muted">Lektier og afleveringer, nærmeste frist først. Tryk på firkanten, når du er færdig. Gemmes kun i denne browser.</p>' +
      (aabne.length ? '<ul class="mangler">' + aabne.map(item).join('') + '</ul>' : '<p>Du mangler ingenting.</p>') +
      (klaret.length ? '<section class="blok"><h2>Klaret (' + klaret.length + ')</h2><ul class="mangler">' + klaret.map(item).join('') + '</ul></section>' : '');
  };

  function farve(m) { return lektieAf[m.id] ? 'lektie' : m.type === 'moede' ? 'moede' : m.type === 'andet' ? 'andet' : 'ingen'; }
  screens.uge = function () {
    var t = today();
    var legende = '<details class="legende"><summary>Hvad betyder farver og tegn?</summary><ul>' +
      '<li><span class="felt f-lektie"></span>Blå: der er lektie</li>' +
      '<li><span class="felt f-ingen"></span>Gul: ingen lektie</li>' +
      '<li><span class="felt f-andet"></span>Grøn: projektdag eller andet</li>' +
      '<li><span class="felt f-moede"></span>Rød: møde</li>' +
      '<li><span class="ikon">' + IKON.dok + '</span>Lektie &nbsp; <span class="ikon">' + IKON.info + '</span>Note</li>' +
      '<li><span class="reg reg-til">' + IKON.tjek + '</span>Til stede · <span class="reg reg-U">U</span>Ugyldigt fravær · <span class="reg reg-tom"></span>Ikke registreret · <span class="reg reg-syg">S</span>Sygemeldt (demo)</li>' +
      '</ul><p class="muted">Tegnene for fremmøde er et skøn ud fra skærmbilleder af Studie+.</p></details>';
    var dage = D.demoDage.map(function (dt) {
      return '<section class="dag' + (dt === t ? ' is-idag' : '') + '"><h2>' + cap(kortDato(dt)) + (dt === t ? ' · i dag' : '') + '</h2>' +
        dagensModuler(dt).map(function (m) {
          var a = state.aarsag[m.id];
          return '<div class="modul f-' + farve(m) + (erSlut(m) ? ' is-slut' : '') + '">' +
            '<div class="modul-top">' + regBoks(m) + '<span class="modul-tid">' + m.start + '-' + m.slut + '</span>' +
              '<span class="modul-ikoner">' + (lektieAf[m.id] ? '<span class="ikon" role="img" aria-label="Lektie">' + IKON.dok + '</span>' : '') + (m.note ? '<span class="ikon" role="img" aria-label="Note">' + IKON.info + '</span>' : '') + '</span></div>' +
            '<button type="button" class="linkknap modul-navn" data-action="aaben-modul" data-id="' + m.id + '">' + esc(navn(m)) + '</button>' +
            '<p class="muted">' + esc(m.laerer) + ' · ' + esc(m.lokale) + '</p>' +
            (a ? '<p class="modul-aarsag">Årsag: ' + esc(a.aarsag) + '</p>' : kanFaaAarsag(m) ? '<p class="bad modul-aarsag">Mangler årsag</p>' : '') +
            '<div class="modul-knapper">' + knapKopiModul(m, true) + '</div>' +
          '</div>';
        }).join('') + '</section>';
    }).join('');
    return '<h1 tabindex="-1">Uge 48</h1><p class="muted">Tryk på et fag for lektie og note. Kopiér-knappen tager hele modulet med.</p>' + legende + '<div class="uge">' + dage + '</div>';
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

    return '<h1 tabindex="-1">Fravær</h1>' +
      '<p class="demo-note">Demo: alle tal er fiktive. Fravær her = U + sygdom. Om sygdom tæller med: [tjek med skolen].</p>' +
      '<section class="fravaer-top"><p class="stort-tal">' + pct(totPct) + ' <span>fravær i alt</span></p>' +
      '<p class="muted">' + (tot.u + tot.syg) + ' af ' + tot.afholdt + ' moduler siden ' + d(D.fravaerStart).getDate() + '. ' + MDR[d(D.fravaerStart).getMonth()] + '. ' + tot.u + ' U, ' + tot.syg + ' syg' + (tot.ingen ? ', ' + tot.ingen + ' ikke registreret' : '') + '.</p>' +
      (problem.length ? '<p class="advarsel"><strong>Kan blive et problem:</strong> ' + problem.map(function (r) { return esc(D.fag[r.fag].navn) + ' (' + pct(r.pct) + ')'; }).join(', ') + '. Over demo-grænsen på ' + g + ' %.</p>' : '<p>Ingen fag over demo-grænsen.</p>') +
      '<p class="muted">Demo-grænse: ' + g + ' %. Den rigtige grænse: [tjek med skolen].</p></section>' +

      '<section class="blok" aria-labelledby="h-syg"><h2 id="h-syg">Syg?</h2><p class="muted">Demo: der sendes intet til skolen.</p><div class="knapper">' +
        (syg ? '<p class="syg-status"><strong>Sygemeldt i dag (demo).</strong></p>' : '') +
        '<button type="button" class="btn btn-syg" data-action="sygemeld"' + (syg ? ' disabled' : '') + '>Sygemeld</button>' +
        '<button type="button" class="btn" data-action="raskmeld"' + (syg ? '' : ' disabled') + '>Raskmeld</button>' +
        '<button type="button" class="btn" data-action="forlaeng"' + (syg ? '' : ' disabled') + '>Forlæng sygemelding</button></div></section>' +

      '<section class="blok" aria-labelledby="h-fag"><h2 id="h-fag">Pr. fag</h2><table class="tabel"><thead><tr><th scope="col">Fag</th><th scope="col">Fravær</th><th scope="col">U</th><th scope="col">Syg</th><th scope="col">Moduler</th></tr></thead><tbody>' +
        rows.map(function (r) {
          var cls = r.pct >= g ? 'bad' : r.pct >= g * 0.75 ? 'warn' : '';
          var tekst = r.pct >= g ? 'Over demo-grænsen' : r.pct >= g * 0.75 ? 'Tæt på' : 'OK';
          return '<tr><th scope="row">' + esc(D.fag[r.fag].navn) + '</th><td class="' + cls + '"><strong>' + pct(r.pct) + '</strong><br><span>' + tekst + '</span>' +
            '<span class="bar" aria-hidden="true"><span style="width:' + Math.min(100, r.pct / (g * 1.5) * 100).toFixed(0) + '%"></span></span></td><td>' + r.u + '</td><td>' + r.syg + '</td><td>' + r.afholdt + '</td></tr>';
        }).join('') + '</tbody></table></section>' +

      '<section class="blok" aria-labelledby="h-u"><h2 id="h-u">Moduler med fravær uden årsag eller registrering</h2>' +
        '<p class="muted">Tryk "Angiv årsag" og vælg. Årsagsliste: demo-eksempel, tjek med skolen. Gemmes kun i denne browser, intet sendes.</p>' +
        '<ol class="raekker">' + fravMods.map(function (m) {
          return '<li class="raekke"><div class="raekke-tid"><strong>' + cap(kortDato(m.dato)) + '</strong><span class="muted">' + m.start + '</span></div>' +
            '<div class="raekke-main"><p class="raekke-titel">' + regBoks(m) + '<strong>' + esc(navn(m)) + '</strong></p><p>' + REG_TEKST[reg(m)] + '</p><p>' + aarsagLinje(m) + '</p></div>' +
            '<div class="raekke-knap">' + knapKopiModul(m, true) + knapAarsag(m) + '</div></li>';
        }).join('') + '</ol></section>';
  };

  screens.samtaler = function () {
    return '<h1 tabindex="-1">Samtaler</h1><p class="muted">Fiktive beskeder til demo.</p><ul class="beskeder">' + D.samtaler.map(function (s) {
      return '<li><p class="muted">' + esc(s.fra) + ' · ' + kortDato(s.dato) + '</p><h2>' + esc(s.emne) + '</h2><p>' + esc(s.tekst) + '</p></li>';
    }).join('') + '</ul><p><a class="btn" href="#idag">Tilbage til I dag</a></p>';
  };
  screens.kalender = function () {
    return '<h1 tabindex="-1">Aktivitetskalender</h1><p class="muted">Fiktive aktiviteter.</p><ol class="raekker">' + D.kalender.map(function (k) {
      return '<li class="raekke"><div class="raekke-tid"><strong>' + cap(kortDato(k.dato)) + '</strong><span class="muted">' + k.tid + '</span></div><div class="raekke-main"><p class="raekke-titel"><strong>' + esc(k.titel) + '</strong></p><p class="muted">' + esc(k.sted) + '</p></div></li>';
    }).join('') + '</ol><p><a class="btn" href="#idag">Tilbage til I dag</a></p>';
  };

  /* ---------- dialoger ---------- */
  var dlg = document.getElementById('dlg'), dlgBody = document.getElementById('dlg-body');
  function visDialog(html) { dlgBody.innerHTML = html; if (!dlg.open) dlg.showModal(); var f = dlgBody.querySelector('[autofocus], .btn'); if (f) f.focus(); }
  function lukDialog() { if (dlg.open) dlg.close(); }

  function modulDialog(id) {
    var m = byId[id], l = lektieAf[id], r = reg(m);
    visDialog('<h2 id="dlg-title">' + esc(navn(m)) + '</h2>' +
      '<p>' + langDato(m.dato) + ', ' + m.start + '-' + m.slut + '<br>Lokale ' + esc(m.lokale) + ' · ' + esc(m.laerer) + '</p>' +
      (r ? '<p>' + regBoks(m) + REG_TEKST[r] + '</p>' : '') + (aarsagLinje(m) ? '<p>' + aarsagLinje(m) + '</p>' : '') +
      (l ? '<h3>Lektie</h3><p>' + esc(l.tekst) + '</p>' + (l.link ? '<p class="lektie-link"><a href="' + esc(l.link) + '" target="_blank" rel="noopener">' + esc(l.link) + '</a></p>' : '') : (m.type === 'lektion' ? '<p class="muted">Ingen lektie.</p>' : '')) +
      (m.note ? '<h3>Note</h3><p>' + esc(m.note) + '</p>' : '') +
      '<div class="knapper">' + knapKopiModul(m, false) +
        (l ? '<button type="button" class="btn" data-action="kopi-lektie" data-id="' + l.id + '">' + IKON.kopi + '<span class="lbl">Kopiér lektie</span></button>' : '') +
        knapAarsag(m) + '<button type="button" class="btn btn-text" data-action="luk">Luk</button></div>');
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
    var bt = document.getElementById('btn-tema'), bs = document.getElementById('btn-stor');
    bt.setAttribute('aria-pressed', document.documentElement.getAttribute('data-theme') === 'dark');
    bs.setAttribute('aria-pressed', !!state.big);
    document.title = { idag: 'I dag', lektier: 'Lektier', mangler: 'Mangler jeg', uge: 'Uge', fravaer: 'Fravær', samtaler: 'Samtaler', kalender: 'Aktivitetskalender' }[r] + ' · Studie UX-demo';
    if (fokus) { var el = main.querySelector(fokus); if (el) el.focus(); }
  }
  function genRender(knap) {
    var sel = knap && knap.dataset.action ? '[data-action="' + knap.dataset.action + '"][data-id="' + (knap.dataset.id || '') + '"]' : null;
    render(sel);
  }

  window.addEventListener('hashchange', function () { lukDialog(); render('h1'); window.scrollTo(0, 0); });

  document.addEventListener('click', function (e) {
    var k = e.target.closest('[data-action]'); if (!k || k.disabled) return;
    var a = k.dataset.action, id = k.dataset.id;
    switch (a) {
      case 'kopi-lektie': kopier(lektieTekst(D.lektier.filter(function (l) { return l.id === id; })[0]), k); break;
      case 'kopi-modul': kopier(modulTekst(byId[id]), k); break;
      case 'kopi-alle': {
        var t = today(), nd = naesteSkoledag(t), f = k.dataset.scope === 'idag' ? 'idag' : ui.filter;
        var ls = D.lektier.filter(function (l) {
          return f === 'idag' ? l.m.dato === t : f === 'imorgen' ? l.m.dato === nd : f === 'uge' ? D.demoDage.indexOf(l.m.dato) > -1 : true;
        });
        var head = f === 'idag' ? 'Lektier ' + langDato(t).toLowerCase() : 'Lektier';
        kopier(head + '\n\n' + ls.map(lektieTekst).join('\n\n'), k); break;
      }
      case 'done': state.done[id] = !state.done[id]; if (!state.done[id]) delete state.done[id]; save(); genRender(k); meld(state.done[id] ? 'Markeret som færdig' : 'Markeret som ikke færdig'); break;
      case 'fold': ui.open[id] = !ui.open[id]; genRender(k); break;
      case 'filter': ui.filter = id; genRender(k); break;
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
        state.dayIdx = (i + 1) % D.demoDage.length; save(); render(); meld('Demodag: ' + langDato(today())); break;
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
        state = fresh(); state.theme = th; save(); ui = { filter: 'idag', open: {} };
        document.documentElement.removeAttribute('data-text');
        render(); meld('Demoen er nulstillet'); break;
      }
    }
  });

  render();
})();
