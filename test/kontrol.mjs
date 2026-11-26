// Kontrol af demoen uden afhængigheder: frisk headless Chrome/Edge styret via CDP.
// Brug: node test/kontrol.mjs [mappe-til-skærmbilleder] [adresse]
// Uden adresse testes den lokale index.html. Med adresse testes fx den udgivne demo.
// Hver kontrol har et forventet og et observeret resultat; med mappe gemmes de i resultater.md.
import { spawn } from 'node:child_process';
import { existsSync, mkdirSync, writeFileSync, mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve, dirname } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const shots = process.argv[2] ? resolve(process.argv[2]) : null;
const url = process.argv[3] || pathToFileURL(join(root, 'index.html')).href;
if (shots) mkdirSync(shots, { recursive: true });

const exe = [process.env.CHROME, 'C:/Program Files/Google/Chrome/Application/chrome.exe', 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe', '/usr/bin/google-chrome', '/usr/bin/chromium'].filter(Boolean).find(p => existsSync(p));
if (!exe) { console.error('Ingen Chrome/Edge fundet'); process.exit(2); }

const port = 9339;
const proc = spawn(exe, ['--headless=new', `--remote-debugging-port=${port}`, `--user-data-dir=${mkdtempSync(join(tmpdir(), 'studie-demo-'))}`, '--no-first-run', '--disable-gpu', '--hide-scrollbars', 'about:blank'], { stdio: 'ignore' });
const sleep = ms => new Promise(r => setTimeout(r, ms));
let ver;
for (let i = 0; i < 50 && !ver; i++) { try { ver = await (await fetch(`http://127.0.0.1:${port}/json/version`)).json(); } catch { await sleep(200); } }
const tgt = await (await fetch(`http://127.0.0.1:${port}/json/new?about:blank`, { method: 'PUT' })).json();
const ws = new WebSocket(tgt.webSocketDebuggerUrl);
await new Promise(r => ws.addEventListener('open', r));
let seq = 0; const pending = new Map(); const errors = []; let loadResolve;
ws.addEventListener('message', ev => {
  const m = JSON.parse(ev.data);
  if (m.id && pending.has(m.id)) { pending.get(m.id)(m); pending.delete(m.id); }
  if (m.method === 'Runtime.exceptionThrown') errors.push('exception: ' + (m.params.exceptionDetails.exception?.description || m.params.exceptionDetails.text));
  if (m.method === 'Runtime.consoleAPICalled' && ['error', 'warning'].includes(m.params.type)) errors.push('console: ' + m.params.args.map(a => a.value ?? a.description).join(' '));
  if (m.method === 'Log.entryAdded' && m.params.entry.level === 'error') errors.push('log: ' + m.params.entry.text + ' ' + (m.params.entry.url || ''));
  if (m.method === 'Page.loadEventFired' && loadResolve) { loadResolve(); loadResolve = null; }
});
const send = (method, params = {}) => new Promise((res, rej) => { const id = ++seq; pending.set(id, m => m.error ? rej(new Error(method + ': ' + m.error.message)) : res(m.result)); ws.send(JSON.stringify({ id, method, params })); });
const H = `const $=s=>document.querySelector(s),$$=s=>[...document.querySelectorAll(s)],w=ms=>new Promise(r=>setTimeout(r,ms)),txt=s=>($(s)?.innerText||'').replace(/\\s+/g,' ').trim(),go=async h=>{location.hash=h;await w(80)};`;
const ev = async expr => {
  const r = await send('Runtime.evaluate', { expression: `(async () => { ${H} ${expr} })()`, awaitPromise: true, returnByValue: true });
  if (r.exceptionDetails) throw new Error('eval: ' + (r.exceptionDetails.exception?.description || r.exceptionDetails.text) + '\n' + expr);
  return r.result.value;
};
const goto = async u => { await send('Page.navigate', { url: 'about:blank' }); await sleep(100); const p = new Promise(r => loadResolve = r); await send('Page.navigate', { url: u }); await p; await sleep(250); };
const aabn = hash => goto(url + hash);
const viewport = (w, h) => send('Emulation.setDeviceMetricsOverride', { width: w, height: h, deviceScaleFactor: 1, mobile: w < 861 });
// Rigtige museklik og tastetryk, så demoen styres som af en elev.
const klik = async (find) => {
  const b = await ev(`const e=${find.startsWith('=') ? find.slice(1) : `$(${JSON.stringify(find)})`}; if(!e) return null; e.scrollIntoView({block:'nearest'}); const r=e.getBoundingClientRect(); const x=r.x+r.width/2,y=r.y+r.height/2; const t=document.elementFromPoint(x,y); return {x,y,fri:e===t||e.contains(t)}`);
  if (!b) throw new Error('Findes ikke: ' + find);
  if (!b.fri) throw new Error('Dækket af andet element: ' + find);
  for (const type of ['mouseMoved', 'mousePressed', 'mouseReleased']) await send('Input.dispatchMouseEvent', { type, x: b.x, y: b.y, button: 'left', clickCount: 1 });
  await sleep(180);
};
const tast = async (key, code, vk, text) => { await send('Input.dispatchKeyEvent', { type: text ? 'keyDown' : 'rawKeyDown', key, code, windowsVirtualKeyCode: vk, text }); await send('Input.dispatchKeyEvent', { type: 'keyUp', key, code, windowsVirtualKeyCode: vk }); await sleep(150); };
const tilbageIBrowser = async () => { await ev('history.back(); await w(250); return 1'); };
const medTekst = (sel, t) => `=$$(${JSON.stringify(sel)}).find(e=>e.innerText.includes(${JSON.stringify(t)}))`;

await send('Runtime.enable'); await send('Page.enable'); await send('Log.enable'); await send('Network.enable');
await send('Network.setCacheDisabled', { cacheDisabled: true });
await send('Emulation.setFocusEmulationEnabled', { enabled: true });
await send('Browser.grantPermissions', { permissions: ['clipboardReadWrite', 'clipboardSanitizedWrite'] }).catch(() => {});

const results = [];
const check = (navn, ok, forventet, observeret) => {
  const o = typeof observeret === 'string' ? observeret : JSON.stringify(observeret);
  results.push({ navn, ok: !!ok, forventet, observeret: o });
  console.log((ok ? 'OK   ' : 'FEJL ') + navn + (ok ? '' : `\n     forventet:  ${forventet}\n     observeret: ${o}`));
};

const SIDER = [
  ['start', 'Start', 'Onsdag 25. november', '01-Start'], ['om-mig', 'Om mig', 'Om mig', '02-Om-mig'], ['aktivitetskalender', 'Aktivitetskalender', 'Aktivitetskalender', '03-Aktivitetskalender'],
  ['samtaler', 'Samtaler', 'Samtaler', '04-Samtaler'], ['forloebsplaner', 'Forløbsplaner', 'Forløbsplaner', '05-Forloebsplaner'], ['skema', 'Skema', 'Ugeskema', '06-Ugeskema'],
  ['opgaver', 'Opgaver', 'Opgaver', '07-Opgaver'], ['ressourcer', 'Ressourcer', 'Ressourcer', '08-Ressourcer'], ['undervisningsplan', 'Undervisningsplan', 'Undervisningsplan', '09-Undervisningsplan']
];

try {
  await viewport(1366, 768);
  await aabn(''); await ev('localStorage.clear(); return 1'); await aabn('');

  /* 1. Menu og de ni sider */
  let r = await ev(`return $$('.menu a').map(a=>a.innerText.trim())`);
  check('Menuen har de ni sider i skitsens rækkefølge', r.join() === SIDER.map(s => s[1]).join(), SIDER.map(s => s[1]).join(', '), r.join(', '));
  for (const [id, navn, h1] of SIDER) {
    await klik(`.menu a[href="#${id}"]`);
    r = await ev(`return {h1:txt('h1'),akt:$$('.menu a[aria-current]').map(a=>a.innerText.trim()),hash:location.hash}`);
    check(`Klik på menupunktet ${navn}`, r.h1 === h1 && r.akt.join() === navn && r.hash === '#' + id, `overskrift "${h1}", kun "${navn}" markeret`, `overskrift "${r.h1}", markeret: ${r.akt.join()} (${r.hash})`);
  }

  /* 2. Fælles layout + skærmbilleder ved 1366 x 768 */
  const maal = [];
  for (const [id, navn, , fil] of SIDER) {
    await aabn('#' + id);
    const m = await ev(`const s=$('.menu').getBoundingClientRect(),m=$('main').getBoundingClientRect(),h=$('h1').getBoundingClientRect(),t=$('.top').getBoundingClientRect();
      return {menu:Math.round(s.width),venstre:Math.round(m.x),bredde:Math.round(m.width),top:Math.round(t.height),h1x:Math.round(h.x),h1:parseFloat(getComputedStyle($('h1')).fontSize),brod:getComputedStyle($('.menu a')).fontSize,sw:document.documentElement.scrollWidth,sh:document.documentElement.scrollHeight}`);
    maal.push({ navn, ...m });
    if (shots) writeFileSync(join(shots, fil + '.png'), Buffer.from((await send('Page.captureScreenshot', { format: 'png' })).data, 'base64'));
  }
  const ens = k => new Set(maal.map(m => m[k])).size === 1;
  check('Samme menu, indholdsbredde, topbjælke og venstrekant på alle ni sider', ['menu', 'venstre', 'bredde', 'top', 'h1x', 'brod'].every(ens), 'ens mål på alle ni', maal.map(m => `${m.navn}: menu ${m.menu}, indhold ${m.venstre}+${m.bredde}`).join(' | '));
  check('Samme overskriftsstørrelse (Start har skitsens store dato)', new Set(maal.slice(1).map(m => m.h1)).size === 1 && maal[0].h1 > maal[1].h1, 'ens h1 på otte sider, større på Start', maal.map(m => m.h1).join(', '));
  check('Ingen vandret rulning ved 1366 px', maal.every(m => m.sw <= 1366), 'scrollWidth <= 1366', maal.map(m => m.sw).join(', '));
  const uden = maal.filter(m => ['Start', 'Skema', 'Samtaler', 'Forløbsplaner', 'Undervisningsplan', 'Aktivitetskalender', 'Ressourcer'].includes(m.navn));
  check('Syv sider vises helt uden lodret rulning ved 768 px højde', uden.every(m => m.sh <= 768), 'scrollHeight <= 768', uden.map(m => `${m.navn} ${m.sh}`).join(', '));

  /* 3. Skemaet: fem dage og onsdagens Dansk A */
  await aabn('#skema');
  r = await ev(`return $$('.dagnavn').map(e=>{const b=e.getBoundingClientRect();return {t:e.childNodes[0].textContent,inde:b.left>=0&&b.right<=innerWidth&&b.bottom<=innerHeight}})`);
  check('Fem hverdage kan aflæses på skærmen', r.map(x => x.t).join() === 'Man 23/11,Tir 24/11,Ons 25/11,Tor 26/11,Fre 27/11' && r.every(x => x.inde), 'Man 23/11 – Fre 27/11 inden for skærmen', r.map(x => x.t + (x.inde ? '' : ' (udenfor)')).join(', '));
  r = await ev(`const a=$('a.lek[href$="/o5"]'),b=a.getBoundingClientRect(),s=a.querySelector('.st');return {t:a.innerText.replace(/\\s+/g,' '),inde:b.top>=0&&b.bottom<=innerHeight&&b.right<=innerWidth,klippet:s.scrollHeight>s.clientHeight+1,kol:a.closest('.dagkol').querySelector('h2').childNodes[0].textContent}`);
  check('Onsdagens Dansk A: tid, lokale og bemærkning samme sted, uden klik', r.kol === 'Ons 25/11' && ['Dansk A', '13.45 – 15.15', 'VE-C202', 'Offline Onsdag (fem fede dage).'].every(x => r.t.includes(x)) && r.inde && !r.klippet, 'Dansk A · 13.45 – 15.15 · VE-C202 · Offline Onsdag (fem fede dage). synligt', `${r.kol}: ${r.t} (synlig ${r.inde}, klippet ${r.klippet})`);
  r = await ev(`return $$('a.lek').map(a=>{const b=a.getBoundingClientRect();const ud=[...a.querySelectorAll('.fag,.tid,.lokale')].filter(e=>{const x=e.getBoundingClientRect();return x.right>b.right+1||x.left<b.left-1}).length;return {id:a.getAttribute('href').split('/').pop(),ud,b:[b.left,b.right,b.top,b.bottom]}})`);
  const overlap = r.some((a, i) => r.slice(i + 1).some(b => a.b[0] < b.b[1] - 1 && b.b[0] < a.b[1] - 1 && a.b[2] < b.b[3] - 1 && b.b[2] < a.b[3] - 1));
  check('Ingen lektion løber ud over sin plads eller dækker en anden', !overlap && r.every(x => !x.ud), 'ingen overlap, fag/tid/lokale inde i feltet', `overlap ${overlap}, udenfor: ${r.filter(x => x.ud).map(x => x.id).join() || 'ingen'}`);

  /* 4. Statusfarver */
  const stat = id => ev(`const a=$('a.lek[href$="/${id}"]');return {farver:[...a.querySelectorAll('.farver i')].map(i=>getComputedStyle(i).backgroundColor),tekst:a.querySelector('.st').innerText}`);
  const G = 'rgb(63, 187, 44)', B = 'rgb(34, 114, 217)', Y = 'rgb(246, 197, 0)', GR = 'rgb(133, 139, 147)';
  for (const [navn, id, farver, tekst] of [
    ['Grøn = lærernote', 'm2', [G], /^Note · /], ['Blå = lektier', 't2', [B], /^Lektier$/], ['Gul = bekræftet ingen note eller lektier', 'm1', [Y], /^Ingen$/],
    ['Note og lektier: begge markeringer', 'f3', [G, B], /^Note \+ Lektier · /], ['Ukendte data er grå, aldrig "Ingen"', 'f4', [GR], /^Kunne ikke læses$/]]) {
    r = await stat(id);
    check(navn, r.farver.join() === farver.join() && tekst.test(r.tekst), `${farver.join(' + ')}, tekst ${tekst}`, `${r.farver.join(' + ')}, tekst "${r.tekst}"`);
  }
  r = await ev(`const h=$('.dagnavn').getBoundingClientRect(),c=$('.celle').getBoundingClientRect();return Math.round(c.top-h.bottom)`);
  check('Første lektion starter lige under dagnavnene', Math.abs(r) <= 1, 'intet hul under dagnavnene', r + ' px');
  r = await ev(`return txt('.forklaring')`);
  check('Farverne er forklaret med tekst', ['Grøn · Lærernote', 'Blå · Lektier', 'Gul · Ingen note eller lektier', 'Grå · Kunne ikke læses'].every(x => r.replace(/\s+·\s*/g, ' · ').includes(x)), 'fire farver med navn og betydning', r);
  r = await ev(`const u=$('a.lek[href$="/o1"]'),m=$('a.lek[href$="/o2"]'),a=u.getBoundingClientRect(),b=m.getBoundingClientRect();return {samme:u.parentElement===m.parentElement,side:a.right<=b.left+1,top:Math.abs(a.top-b.top),u:u.innerText.replace(/\\s+/g,' '),m:m.innerText.replace(/\\s+/g,' ')}`);
  check('Parallelle lektioner står side om side med hver sin sluttid', r.samme && r.side && r.top < 1 && r.u.includes('08.15 – 09.30') && r.m.includes('08.15 – 09.45'), 'Udvalg 08.15 – 09.30 ved siden af Matematik B 08.15 – 09.45', `${r.u} | ${r.m}`);
  await klik('a.lek[href$="/f4"]');
  r = await ev(`return txt('#dlg')`);
  check('Ukendt lektion i detaljen siger "Kunne ikke læses", ikke "Ingen"', (r.match(/Kunne ikke læses/g) || []).length === 2 && !/Ingen/.test(r), 'begge felter "Kunne ikke læses"', r);
  await klik('#dlg a[data-tilbage]');

  /* 5. Åbn Dansk A, luk, Tilbage-knap, ugeskift */
  await klik('a.lek[href$="/o5"]');
  r = await ev(`return {aaben:$('#dlg').open,t:txt('#dlg')}`);
  check('Klik på Dansk A åbner lektionen', r.aaben && ['Dansk A', '13.45 – 15.15', 'VE-C202', 'Offline Onsdag (fem fede dage).'].every(x => r.t.includes(x)), 'vindue med tid, lokale og note', r.t);
  await klik('#dlg [data-action="kopi"]');
  r = await ev(`return window.__demoSidsteKopi`);
  check('Kopiér lektion', r?.includes('Lokale: VE-C202') && r.includes('Offline Onsdag'), 'tekst med lokale og note', r || 'intet');
  await klik('#dlg a[data-tilbage]');
  r = await ev(`return {aaben:$('#dlg').open,fokus:document.activeElement.getAttribute('href'),hash:location.hash}`);
  check('Luk går tilbage til samme lektion i skemaet', !r.aaben && r.fokus?.endsWith('/o5') && r.hash === '#skema', 'vindue lukket, fokus på Dansk A', r);
  await klik('a.lek[href$="/o5"]'); await tilbageIBrowser();
  r = await ev(`return {aaben:$('#dlg').open,hash:location.hash}`);
  check('Browserens Tilbage lukker lektionen', !r.aaben && r.hash === '#skema', 'vindue lukket på #skema', r);
  await klik('a.lek[href$="/o5"]'); await tast('Escape', 'Escape', 27); await sleep(150);
  r = await ev(`return {aaben:$('#dlg').open,hash:location.hash}`);
  check('Esc lukker lektionen', !r.aaben && r.hash === '#skema', 'vindue lukket', r);

  const uge = () => ev(`return {uge:txt('.vaelger-tekst'),t:txt('main'),n:$$('a.lek').length,fokus:document.activeElement.getAttribute('aria-label')}`);
  await klik('[aria-label="Næste uge"]'); r = await uge();
  check('Næste uge viser uge 49 uden den gamle uges noter', r.uge === 'Uge 49' && r.t.includes('Fremlæggelse i grupper') && !r.t.includes('Offline Onsdag') && r.t.includes('30/11') && r.fokus === 'Næste uge', 'Uge 49, ny note, ingen "Offline Onsdag", fokus bliver', `${r.uge}, ${r.n} lektioner, fokus ${r.fokus}`);
  await klik('[aria-label="Næste uge"]'); r = await uge();
  check('Uge uden data kaldes ukendt, ikke tom', r.uge === 'Uge 50' && r.n === 0 && r.t.includes('er ikke med i demoen') && !/Ingen note|ingen lektier/i.test(r.t), 'besked om manglende data', `${r.uge}: ${r.t.slice(0, 200)}`);
  await klik('[aria-label="Forrige uge"]'); await klik('[aria-label="Forrige uge"]'); r = await uge();
  check('Tilbage til uge 48: noten er igen på onsdagen', r.uge === 'Uge 48' && r.t.includes('Offline Onsdag (fem fede dage).') && r.n === 18, 'Uge 48, 18 lektioner', `${r.uge}, ${r.n} lektioner`);
  r = await ev(`const d=$('.skolebeskeder');const foer={aaben:d.open,h:d.getBoundingClientRect().height};return foer`);
  await klik('.skolebeskeder summary');
  let r2 = await ev(`return {aaben:$('.skolebeskeder').open,t:txt('.skolebeskeder')}`);
  check('Skolebeskeder er samlet i én række, der foldes ud', !r.aaben && r.h < 45 && r2.aaben && r2.t.includes('HHX har talent'), 'lukket række (< 45 px) → åben med ugens beskeder', `før: ${Math.round(r.h)} px; efter: ${r2.t}`);

  /* 6. Lavere vindue (bærbar med browserlinjer) */
  await viewport(1366, 657); await aabn('#skema');
  r = await ev(`const s=$('a.lek[href$="/o5"] .st');return {sh:document.documentElement.scrollHeight,sw:document.documentElement.scrollWidth,klippet:s.scrollHeight>s.clientHeight+1}`);
  check('Hele ugen vises også i 1366 x 657 (browservindue på en bærbar)', r.sh <= 657 && r.sw <= 1366 && !r.klippet, 'ingen rulning, noten ikke klippet', r);
  if (shots) writeFileSync(join(shots, '06-Ugeskema-657.png'), Buffer.from((await send('Page.captureScreenshot', { format: 'png' })).data, 'base64'));

  /* 7. Elevforløb: morgendagens opgave -> materiale -> tilbage til samme sted */
  await viewport(1366, 500); await aabn('#start'); await klik('.menu a[href="#opgaver"]');
  await ev(`scrollTo(0,40); await w(50); return 1`);
  r = await ev(`const g=$$('.gruppe').find(s=>s.querySelector('h2').innerText==='Til i morgen');return {y:scrollY,t:g.innerText.replace(/\\s+/g,' ')}`);
  check('Morgendagens opgave står under "Til i morgen"', r.t.includes('Tysk fortsætter B') && r.t.includes('Læs side 18–20') && r.t.includes('Til i morgen kl. 10:00'), 'Tysk fortsætter B, Læs side 18–20, kl. 10:00', r.t);
  const startY = r.y;
  await klik('a[href="#opgaver/l-r1"]');
  r = await ev(`return {t:txt('main'),y:scrollY}`);
  check('Opgaven åbner med materiale', r.t.includes('Læs side 18–20') && r.t.includes('Tekst side 18-20.pdf'), 'opgavetekst og Tekst side 18-20.pdf', r.t.slice(0, 200));
  await klik('a[href="#opgaver/l-r1/r-tysk"]');
  r = await ev(`return txt('.dokument')`);
  check('Materialet kan åbnes', r.includes('Mein Alltag'), 'dokumentets tekst', r.slice(0, 120));
  await klik('main a[data-tilbage]');
  r = await ev(`return {hash:location.hash,fokus:document.activeElement.getAttribute('href')}`);
  check('Tilbage til opgaven, fokus på materialet', r.hash === '#opgaver/l-r1' && r.fokus === '#opgaver/l-r1/r-tysk', '#opgaver/l-r1', r);
  await klik('main a[data-tilbage]');
  r = await ev(`return {hash:location.hash,y:scrollY,fokus:document.activeElement.getAttribute('href')}`);
  check('Tilbage til samme sted på opgavelisten', r.hash === '#opgaver' && r.y === startY && startY > 0 && r.fokus === '#opgaver/l-r1', `#opgaver, rulning ${startY}, fokus på opgaven`, r);
  await klik('a[href="#opgaver/l-r1"]'); await klik('a[href="#opgaver/l-r1/r-tysk"]'); await tilbageIBrowser(); await tilbageIBrowser();
  r = await ev(`return {hash:location.hash,y:scrollY}`);
  check('Samme forløb med browserens Tilbage-knap', r.hash === '#opgaver' && r.y === startY, `#opgaver, rulning ${startY}`, r);

  /* 8. Færdig, mangler, kopi */
  await viewport(1366, 768); await aabn('#opgaver');
  r = await ev(`return {m:txt('.mangler'),n:$$('.mangler li').length}`);
  check('Manglende afleveringer vises i Opgaver', r.n === 2 && r.m.includes('Frist passeret'), '2 med "Frist passeret"', r.m);
  await klik('[data-action="kopi"][data-hvad="lektier"]');
  r = await ev(`return window.__demoSidsteKopi`);
  check('Kopiér alle lektier', r?.includes('Tysk fortsætter B') && r.includes('Læs side 18–20') && !r.includes('side 52') && !r.includes('velfærdsmodeller'), 'kommende lektier, ikke passerede', (r || '').slice(0, 200));
  await klik('a[href="#opgaver/a-marked"]'); await klik('[data-action="faerdig"]'); await aabn('#opgaver');
  r = await ev(`return {mangler:$$('.mangler li').length,klaret:txt('.klaret')}`);
  check('Færdig-markering flytter opgaven og huskes efter genindlæsning', r.mangler === 1 && r.klaret.includes('Markedsanalyse'), '1 mangler, Markedsanalyse under Klaret', r);
  await klik('[data-action="nulstil"]');
  r = await ev(`return {mangler:$$('.mangler li').length,klaret:!!$('.klaret')}`);
  check('Nulstil demo rydder valg', r.mangler === 2 && !r.klaret, '2 mangler igen', r);

  /* 9. Fravær */
  await aabn('#om-mig'); await klik('a[href="#om-mig/fravaer"]');
  await klik('.udfyld button');
  r = await ev(`return txt('#udfyld-status')`);
  check('Fravær: fejlbesked uden valgt modul', r.includes('flueben'), 'bed om flueben', r);
  await klik('.valg[data-id="h1"]'); await klik('.valg[data-id="h3"]'); await klik('.udfyld button');
  r = await ev(`return txt('#udfyld-status')`);
  check('Fravær: fejlbesked uden årsag', r.includes('Vælg en årsag'), 'bed om årsag', r);
  await ev(`$('.udfyld select').value='Lægebesøg'; $('.udfyld input').value='<b>tid</b>'; return 1`); await klik('.udfyld button');
  r = await ev(`return {t:txt('.fravaersliste'),h:txt('.fravaer h2'),b:$$('.fravaersliste b').length}`);
  check('Fravær: fælles årsag på to moduler, tekst vises som tekst', (r.t.match(/Årsag: Lægebesøg \(<b>tid<\/b>\)/g) || []).length === 2 && r.h.includes('(2)') && r.b === 0, '2 moduler med årsag, 2 mangler', r);
  await klik('[data-action="syg"]'); r = await ev(`return txt('.syg')`); await klik('[data-action="forlaeng"]'); r2 = await ev(`return txt('.syg')`); await klik('[data-action="raskmeld"]');
  const r3 = await ev(`return txt('.syg')`);
  check('Sygemeld, forlæng og raskmeld (kun demo)', r.includes('sygemeldt i dag') && r2.includes('forlænget til torsdag 26. november') && r3.includes('Er du syg'), 'sygemeldt → forlænget → rask', [r, r2, r3].join(' | '));
  await klik('a[href="#om-mig/karakterer"]'); r = await ev(`return $$('.tabel tbody tr').length`);
  check('Om mig: fanen Karakterer', r === 4, '4 opdigtede karakterer', r);

  /* 10. Samtaler */
  await aabn('#samtaler'); await klik('a[href="#samtaler/s3"]'); r = await ev(`return txt('.detalje')`);
  check('Samtaler: vælg en anden samtale', r.includes('Møde om forløbsplan') && r.includes('VE-A114'), 'samtalen om mødet', r.slice(0, 150));
  await klik('.svar .knap'); r = await ev(`return txt('#svar-status')`);
  check('Samtaler: tomt svar afvises', r.includes('Skriv en besked'), 'besked om tomt felt', r);
  await klik('#svar'); await send('Input.insertText', { text: 'Det passer <i>fint</i>' }); await klik('.svar .knap');
  r = await ev(`return {t:txt('.traad'),i:$$('.traad i').length,s:txt('#svar-status')}`);
  check('Samtaler: svar vises kun i demoen', r.t.includes('Det passer <i>fint</i>') && r.i === 0 && r.s.includes('Intet er sendt'), 'svaret som tekst + "Intet er sendt"', r.s);
  await klik('a[href="#samtaler/s1"]'); await klik('a.bilag'); r = await ev(`return txt('.dokument')`); await klik('main a[data-tilbage]'); r2 = await ev(`return location.hash`);
  check('Samtaler: bilag åbner og fører tilbage', r.includes('litteraturlisten') && r2 === '#samtaler/s1', 'APA-vejledning → #samtaler/s1', r2);

  /* 11. Ressourcer */
  await aabn('#ressourcer'); await klik('#soeg'); await send('Input.insertText', { text: 'tysk' }); await sleep(100);
  r = await ev(`return {n:$$('#ressource-raekker tr').length,t:txt('#ressource-raekker'),fokus:document.activeElement.id}`);
  check('Ressourcer: søgning filtrerer', r.n === 1 && r.t.includes('Tekst side 18-20.pdf') && r.fokus === 'soeg', '1 række, fokus bliver i feltet', r);
  await klik('a.aabn'); r = await ev(`return txt('.dokument')`); await klik('main a[data-tilbage]'); r2 = await ev(`return {v:$('#soeg').value,n:$$('#ressource-raekker tr').length}`);
  check('Ressourcer: Åbn og tilbage bevarer søgningen', r.includes('Mein Alltag') && r2.v === 'tysk' && r2.n === 1, 'dokument → søgningen står der stadig', r2);
  await ev(`const s=$('#soeg');s.value='zzz';s.dispatchEvent(new Event('input',{bubbles:true}));return 1`); r = await ev(`return txt('#ressource-raekker')`);
  check('Ressourcer: tomt resultat forklares', r.includes('Ingen ressourcer matcher'), 'forklarende række', r);

  /* 12. Forløbsplaner, undervisningsplan, kalender */
  await aabn('#forloebsplaner'); await klik('a[href="#forloebsplaner/arg"]'); r = await ev(`return txt('.detalje')`); await klik('.blok a[href$="/r-gram"]'); r2 = await ev(`return txt('.dokument')`); await klik('main a[data-tilbage]');
  const r4 = await ev(`return txt('.detalje h2')`);
  check('Forløbsplaner: vælg forløb, åbn materiale, tilbage', r.includes('Argumentation') && r2.includes('grundleddet') && r4 === 'Argumentation', 'Argumentation → Grammatik → Argumentation', r4);
  await aabn('#undervisningsplan'); r = await ev(`return $$('.maaneder details').map(d=>d.open)`); await klik('.maaneder details:first-child summary'); r2 = await ev(`return {o:$$('.maaneder details').map(d=>d.open),t:txt('.maaneder details[open]')}`);
  check('Undervisningsplan: November åben; September kan foldes ud', r.join() === 'false,false,true' && r2.o.join() === 'true,false,false' && r2.t.includes('Markedsanalyse'), 'kun én måned åben ad gangen', r2.o.join());
  await ev(`const s=$('#planfag');s.value='da';s.dispatchEvent(new Event('change',{bubbles:true}));await w(80);return 1`); await klik('[aria-label="Næste periode"]');
  r = await ev(`return {p:txt('.vaelger-tekst'),t:txt('.maaneder'),slut:$('[aria-label="Næste periode"]').getAttribute('aria-disabled')}`);
  check('Undervisningsplan: skift fag og periode', r.p === 'Forår 2027' && r.t.includes('Lyrik') && r.slut === 'true', 'Dansk A, Forår 2027, ingen senere periode', r.p + ': ' + r.t.slice(0, 80));
  await aabn('#aktivitetskalender'); r = await ev(`return $$('.aktiviteter summary').length`); await klik(medTekst('.aktiviteter summary', 'lektiecafé')); r2 = await ev(`return txt('.aktiviteter details[open]')`);
  check('Aktivitetskalender: tre aktiviteter, detaljer foldes ud', r === 3 && r2.includes('15.15 – 16.30') && r2.includes('VE-C202'), 'tid og sted', r2);
  await klik('[aria-label="Næste uge"]'); r = await ev(`return txt('main')`); await klik('.idag'); r2 = await ev(`return txt('.vaelger-tekst')`);
  check('Aktivitetskalender: ugeskift og "I dag"', r.includes('Uge 49') && r.includes('økonomi for unge') && r2 === 'Uge 48 – 2026', 'uge 49 → uge 48', r2);

  /* 13. Start */
  await aabn('#start'); r = await ev(`return {t:txt('main'),f:txt('.fod'),n:txt('.dagraekke.stor')}`);
  check('Start: dagens næste lektion er Dansk A med lokale og note', ['13.45', 'Dansk A', 'VE-C202', 'Lærernote', 'Offline Onsdag (fem fede dage).'].every(x => r.n.includes(x)) && r.f.includes('Ingen nye meddelelser'), 'Dansk A fremhævet', r.n);
  await klik('.dagraekke.stor'); r = await ev(`return {aaben:$('#dlg').open,hash:location.hash}`); await klik('#dlg a[data-tilbage]'); r2 = await ev(`return {aaben:$('#dlg').open,hash:location.hash,fokus:document.activeElement.getAttribute('href')}`);
  check('Start: åbn lektion og luk igen på Start', r.aaben && !r2.aaben && r2.hash === '#start' && r2.fokus === '#start/o5', 'vindue → Start', r2);

  /* 14. Alle interne links og knapper fører et sted hen */
  const set = new Set(SIDER.map(s => s[0])); const koe = [...set]; const doede = []; let knapper = [];
  for (let i = 0; i < koe.length && i < 200; i++) {
    await ev(`await go('#${koe[i]}'); return 1`);
    const s = await ev(`return {h1:txt('h1'),t:document.body.innerText,links:$$('a[href]').map(a=>a.getAttribute('href')),k:$$('button').filter(b=>!b.dataset.action&&!b.closest('form')).map(b=>b.innerText)}`);
    if (!s.h1 || /undefined|NaN|\[object/.test(s.t) || /Aarhus|Ronny|VE26/.test(s.t)) doede.push(koe[i]);
    knapper = knapper.concat(s.k);
    for (const h of s.links) { if (!h.startsWith('#')) { doede.push('eksternt: ' + h); continue; } const v = h.slice(1); if (v !== 'indhold' && !set.has(v)) { set.add(v); koe.push(v); } }
  }
  check('Alle interne links viser indhold; ingen ægte navne; ingen knapper uden funktion', !doede.length && !knapper.length, '0 døde links, 0 løse knapper', `${koe.length} adresser besøgt, fejl: ${doede.join(', ') || 'ingen'}, løse knapper: ${knapper.join() || 'ingen'}`);

  /* 15. Tastatur og markérbar tekst */
  await aabn('#start');
  await ev(`$('.menu a[href="#skema"]').focus(); return 1`); await tast('Enter', 'Enter', 13, '\r'); r = await ev(`return txt('h1')`);
  await ev(`$('a.lek[href$="/o5"]').focus(); return 1`); await tast('Enter', 'Enter', 13, '\r'); r2 = await ev(`return $('#dlg').open`);
  check('Tastatur: menu og lektion kan åbnes med Enter', r === 'Ugeskema' && r2, 'Ugeskema og åbent vindue', `${r}, vindue ${r2}`);
  await tast('Escape', 'Escape', 27);
  await aabn('#skema');
  r = await ev(`const e=$('a.lek[href$="/o5"] .st'),b=e.getBoundingClientRect();return {x:b.left+1,y:b.top+8,x2:b.right-4}`);
  await send('Input.dispatchMouseEvent', { type: 'mousePressed', x: r.x, y: r.y, button: 'left', clickCount: 1 });
  await send('Input.dispatchMouseEvent', { type: 'mouseMoved', x: r.x2, y: r.y, button: 'left', buttons: 1 });
  await send('Input.dispatchMouseEvent', { type: 'mouseReleased', x: r.x2, y: r.y, button: 'left', clickCount: 1 }); await sleep(150);
  r = await ev(`return {sel:String(getSelection()),aaben:$('#dlg').open}`);
  check('Teksten i en lektion kan markeres uden at åbne den', r.sel.length > 5 && !r.aaben, 'markeret tekst, intet vindue', r);

  /* 16. Smalle skærme */
  for (const b of [320, 390, 1024]) {
    await viewport(b, 800); const bred = [], smaa = [];
    for (const [id] of SIDER.concat([['om-mig/fravaer'], ['opgaver/a-vk'], ['skema/2026-11-23/o2'], ['ressourcer/r-formel']])) {
      await aabn('#' + id);
      const m = await ev(`return {sw:document.documentElement.scrollWidth,d:$('#dlg').open?$('#dlg').scrollWidth-$('#dlg').clientWidth:0,smaa:$$('.menu a,.knap,.valgliste a,summary,a.tilbage').filter(e=>{const x=e.getBoundingClientRect();return x.width&&(x.height<${b < 861 ? 43.5 : 30}||x.width<30)}).map(e=>e.innerText.trim().slice(0,20)+' '+Math.round(e.getBoundingClientRect().height))}`);
      if (m.sw > b || m.d > 0) bred.push(id + ':' + m.sw);
      if (m.smaa.length) smaa.push(id + ': ' + m.smaa.join(', '));
    }
    check(`Ingen vandret rulning ved ${b} px`, !bred.length, 'ingen sider bredere end skærmen', bred.join(', ') || 'ingen');
    check(`Trykflader store nok ved ${b} px`, !smaa.length, b < 861 ? '>= 44 px høje' : '>= 30 px høje', smaa.slice(0, 4).join(' | ') || 'alle');
  }

  /* 17. Kontrast */
  await viewport(1366, 768); await aabn('#start');
  r = await ev(`const c=s=>{const e=document.createElement('i');e.style.color=s;document.body.append(e);const v=getComputedStyle(e).color.match(/\\d+/g).slice(0,3).map(Number);e.remove();return v};
    const lum=a=>{const x=a.map(v=>v/255).map(v=>v<=0.03928?v/12.92:((v+0.055)/1.055)**2.4);return .2126*x[0]+.7152*x[1]+.0722*x[2]};
    const cr=(a,b)=>{const x=lum(c(a)),y=lum(c(b));return +((Math.max(x,y)+.05)/(Math.min(x,y)+.05)).toFixed(2)};
    return [['var(--tekst)','var(--bg)'],['var(--dim)','var(--bg)'],['var(--blaa)','var(--bg)'],['var(--advar)','var(--bg)'],['#fff','var(--blaa)'],['#fff','#23801a'],['#fff','var(--lektie)'],['var(--tekst)','var(--ingen)']].map(p=>[p.join(' på '),cr(...p)])`);
  check('Kontrast mindst 4,5:1 for tekst', r.every(x => x[1] >= 4.5), 'alle par >= 4,5', r.map(x => `${x[0]} ${x[1]}`).join('; '));
} catch (e) {
  check('Kontrollen kunne gennemføres', false, 'ingen afbrydelse', e.message);
}

check('Ingen konsolfejl, undtagelser eller fejlede filer', errors.length === 0, 'ingen', errors.join(' | ') || 'ingen');
ws.close(); proc.kill();
const fejl = results.filter(x => !x.ok).length;
const sum = `${results.length - fejl}/${results.length} kontroller bestået mod ${url}`;
if (shots) writeFileSync(join(shots, 'resultater.md'), `# Kontrolresultater\n\n${sum}\n${new Date().toLocaleString('da-DK', { timeZone: 'Europe/Copenhagen' })} (Europe/Copenhagen)\n\n| Resultat | Kontrol | Forventet | Observeret |\n|---|---|---|---|\n` +
  results.map(x => `| ${x.ok ? 'OK' : 'FEJL'} | ${[x.navn, x.forventet, x.observeret.slice(0, 300)].map(s => String(s).replace(/\|/g, '/').replace(/\s+/g, ' ')).join(' | ')} |`).join('\n') + '\n');
console.log('\n' + sum);
process.exit(fejl ? 1 : 0);
