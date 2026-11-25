// Kontrol af demoen uden afhængigheder: starter lokal Chrome/Edge headless og styrer den via CDP.
// Brug: node test/kontrol.mjs [mappe-til-screenshots]
import { spawn } from 'node:child_process';
import { existsSync, mkdirSync, writeFileSync, mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve, dirname } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const url = pathToFileURL(join(root, 'index.html')).href;
const shots = process.argv[2] ? resolve(process.argv[2]) : null;
if (shots) mkdirSync(shots, { recursive: true });

const browsers = [
  process.env.CHROME,
  'C:/Program Files/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
  '/usr/bin/google-chrome', '/usr/bin/chromium'
].filter(Boolean);
const exe = browsers.find(p => existsSync(p));
if (!exe) { console.error('Ingen Chrome/Edge fundet'); process.exit(2); }

const port = 9339;
const profile = mkdtempSync(join(tmpdir(), 'studie-demo-'));
const proc = spawn(exe, ['--headless=new', `--remote-debugging-port=${port}`, `--user-data-dir=${profile}`, '--no-first-run', '--disable-gpu', 'about:blank'], { stdio: 'ignore' });

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
  if (m.method === 'Runtime.exceptionThrown') errors.push('exception: ' + m.params.exceptionDetails.text + ' ' + (m.params.exceptionDetails.exception?.description || ''));
  if (m.method === 'Runtime.consoleAPICalled' && (m.params.type === 'error' || m.params.type === 'warning')) errors.push('console.' + m.params.type + ': ' + m.params.args.map(a => a.value ?? a.description).join(' '));
  if (m.method === 'Log.entryAdded' && m.params.entry.level === 'error') errors.push('log: ' + m.params.entry.text);
  if (m.method === 'Page.loadEventFired' && loadResolve) { loadResolve(); loadResolve = null; }
});
const send = (method, params = {}) => new Promise((res, rej) => { const id = ++seq; pending.set(id, m => m.error ? rej(new Error(method + ': ' + m.error.message)) : res(m.result)); ws.send(JSON.stringify({ id, method, params })); });
const ev = async (expr) => {
  const r = await send('Runtime.evaluate', { expression: `(async () => { ${expr} })()`, awaitPromise: true, returnByValue: true });
  if (r.exceptionDetails) throw new Error('eval: ' + (r.exceptionDetails.exception?.description || r.exceptionDetails.text));
  return r.result.value;
};
const goto = async (u) => { const p = new Promise(r => loadResolve = r); await send('Page.navigate', { url: u }); await p; await sleep(100); };
const viewport = (w, h) => send('Emulation.setDeviceMetricsOverride', { width: w, height: h, deviceScaleFactor: 1, mobile: w < 900 });

await send('Runtime.enable'); await send('Page.enable'); await send('Log.enable');
await send('Emulation.setFocusEmulationEnabled', { enabled: true });
// Headless Chrome har ingen brugerklik, så udklipsholderen gives tilladelse via browser-forbindelsen.
{ const bws = new WebSocket(ver.webSocketDebuggerUrl); await new Promise(r => bws.addEventListener('open', r));
  await new Promise(r => { bws.addEventListener('message', r, { once: true }); bws.send(JSON.stringify({ id: 1, method: 'Browser.grantPermissions', params: { permissions: ['clipboardReadWrite', 'clipboardSanitizedWrite'] } })); });
  bws.close(); }
await send('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-reduced-motion', value: 'reduce' }, { name: 'prefers-color-scheme', value: 'light' }] });

const results = [];
const check = (name, ok, info = '') => { results.push({ name, ok: !!ok, info }); console.log((ok ? 'OK   ' : 'FEJL ') + name + (info ? '  [' + info + ']' : '')); };
const H = `const $=s=>document.querySelector(s),$$=s=>[...document.querySelectorAll(s)],w=ms=>new Promise(r=>setTimeout(r,ms)),go=async h=>{location.hash=h;await w(60)};`;

await viewport(390, 844);
await goto(url); await ev(`localStorage.clear(); return 1`); await goto(url);

// 1. Første skærm
let r = await ev(H + `return { h1: $('h1').textContent, cur: $('.nav a[aria-current]').textContent, next: $('.naeste').textContent }`);
check('Første skærm er I dag med dato og næste modul', r.h1 === 'Onsdag 25. november' && r.cur === 'I dag' && r.next.includes('Informatik'), JSON.stringify(r));

// 2. Navigation
r = await ev(H + `const out=[]; for (const a of $$('.nav a')) { a.click(); await w(80); out.push(a.textContent+'='+$('h1').textContent+':'+(a.getAttribute('aria-current')==='page')); }
  for (const h of ['#samtaler','#kalender']) { await go(h); out.push(h+'='+$('h1').textContent); } await go('#idag'); return out`);
check('Navigation mellem alle skærme', r.length === 7 && r.slice(0, 5).every(x => x.endsWith(':true')) && r[5].includes('Samtaler') && r[6].includes('Aktivitetskalender'), r.join(' | '));

// 3. Kopiér lektie / alle / modul
// Rigtige museklik (brugeraktivering), så kopiering kører som for en elev.
const klik = async (sel) => {
  const b = await ev(`const e=document.querySelector(${JSON.stringify(sel)}); e.scrollIntoView({block:'center'}); const r=e.getBoundingClientRect(); return {x:r.x+r.width/2,y:r.y+r.height/2}`);
  for (const type of ['mousePressed', 'mouseReleased']) await send('Input.dispatchMouseEvent', { type, x: b.x, y: b.y, button: 'left', clickCount: 1 });
  await sleep(200);
  return ev(`return { txt: window.__demoSidsteKopi, lbl: document.querySelector(${JSON.stringify(sel)}).textContent }`);
};
r = await klik('[data-action="kopi-lektie"][data-id="l3"]'); // forsidens hovedperson har sin egen kopiér-knap først i DOM
check('Kopiér lektie (tekst + link + "Kopieret")', r.txt.includes('Matematik B') && r.txt.includes('Link: https://example.com/') && r.lbl.includes('Kopieret'), r.lbl);
r = await klik('[data-action="kopi-alle"][data-scope="idag"]');
check('Kopiér alle lektier i dag', ['Matematik B', 'Dansk A', 'Informatik C'].every(f => r.txt.includes(f)) && (r.txt.match(/Link:/g) || []).length === 3 && r.lbl.includes('Kopieret'));
r = [];
// Uge viser kun den valgte dag på mobil, så knappen findes i den synlige dag.
for (const [h, sel] of [['#idag', '[data-action="kopi-modul"]'], ['#uge', '.dag.is-valgt [data-action="kopi-modul"]'], ['#fravaer', '[data-action="kopi-modul"]']]) { await ev(H + `await go('${h}'); return 1`); const x = await klik(sel); r.push({ h, txt: x.txt, kop: x.lbl.includes('Kopieret') }); }
check('Kopiér modul i I dag, Uge og Fravær', r.every(x => x.kop && x.txt.includes('Lokale:') && x.txt.includes('Lærer:')), r.map(x => x.h + ':' + x.txt.split('\n')[0]).join(', '));
check('Modulkopi har lektie og link', r[0].txt.includes('Lektie: Afsnit 1.2') && r[0].txt.includes('Link: https://example.com/matematik/afsnit-1-2'));

// 4. Færdig-markering (gemmes)
r = await ev(H + `await go('#mangler'); const n=$$('.mangel').length; $('.mangel [data-action="done"]').click(); await w(60);
  return { n, klaret: $$('h2').some(h=>h.textContent==='Klaret (1)'), ls: Object.keys(JSON.parse(localStorage.getItem('studie-ux-demo:v1')).done).length, overskredet: $$('.mangel.is-over').length }`);
check('Færdig-markering i Mangler jeg', r.klaret && r.ls === 1, JSON.stringify(r));
{ const p = new Promise(r => loadResolve = r); await send('Page.reload'); await p; await sleep(100); }
r = await ev(H + `return $$('h2').some(h=>h.textContent==='Klaret (1)')`);
check('Færdig huskes efter genindlæsning', r);

// 5. Sygemeld-flow
r = await ev(H + `await go('#idag'); $('[data-action="sygemeld"]').click(); await w(50); const d1=$('#dlg').open && $('#dlg h2').textContent;
  $('[data-action="bekraeft-syg"]').click(); await w(50); const kv=$('#dlg h2').textContent; $('[data-action="luk"]').click(); await w(30);
  const status=$('.syg-status')?.textContent||''; const syg=$$('.raekke').filter(x=>x.textContent.includes('Sygemeldt (demo)')).length;
  return { d1, kv, status, syg, closed: !$('#dlg').open }`);
check('Sygemeld: ét tryk, bekræft, kvittering', r.d1 === 'Sygemeld dig for i dag?' && r.kv === 'Du er sygemeldt i dag' && r.status.includes('sygemeldt') && r.syg === 2 && r.closed, JSON.stringify(r));
r = await ev(H + `$('[data-action="forlaeng"]').click(); await w(30); const kv=$('#dlg h2').textContent; $('[data-action="luk"]').click();
  $('[data-action="raskmeld"]').click(); await w(30); const kv2=$('#dlg h2').textContent; $('[data-action="luk"]').click(); await w(30);
  return { kv, kv2, knap: !!$('[data-action="sygemeld"]'), sick: Object.keys(JSON.parse(localStorage.getItem('studie-ux-demo:v1')).sick).length }`);
check('Forlæng og raskmeld', r.kv.startsWith('Sygemelding forlænget') && r.kv2 === 'Du er raskmeldt' && r.knap && r.sick === 0, JSON.stringify(r));

// 6. Fraværsårsag: sæt, vis, ret
r = await ev(H + `await go('#fravaer'); const b=$('[data-action="aarsag"]'); const id=b.dataset.id; b.click(); await w(40);
  const gemDisabled=$('[data-action="gem-aarsag"]').disabled; const valg=$$('[data-action="vaelg-aarsag"]').map(x=>x.textContent);
  $$('[data-action="vaelg-aarsag"]').find(x=>x.textContent==='Lægebesøg').click(); $('#aarsag-kommentar').value='tid hos lægen 13:00'; $('[data-action="gem-aarsag"]').click(); await w(40);
  const iFravaer=$$('.raekke').find(x=>x.querySelector('[data-id="'+id+'"]'))?.textContent||'';
  await go('#uge'); const iUge=$$('.modul').map(x=>x.textContent).filter(t=>t.includes('Årsag: Lægebesøg')).length;
  return { id, gemDisabled, valg, iFravaer, iUge }`);
check('Årsag sat og vist i Fravær og Uge', r.gemDisabled === true && r.valg.length === 5 && r.iFravaer.includes('Årsag: Lægebesøg') && r.iFravaer.includes('tid hos lægen') && r.iUge === 1, JSON.stringify(r));
const aid = r.id;
r = await ev(H + `await go('#fravaer'); $('[data-action="aarsag"][data-id="${aid}"]').click(); await w(40); const pre=$('[aria-pressed="true"][data-action="vaelg-aarsag"]')?.textContent;
  $$('[data-action="vaelg-aarsag"]').find(x=>x.textContent==='Transport').click(); $('[data-action="gem-aarsag"]').click(); await w(40);
  const row=$$('.raekke').find(x=>x.querySelector('[data-id="${aid}"]')).textContent; const knap=$('[data-action="aarsag"][data-id="${aid}"]').textContent;
  $('[data-action="kopi-modul"][data-id="${aid}"]').click(); await w(150);
  return { pre, row, knap, kopi: window.__demoSidsteKopi }`);
check('Årsag kan ændres og kommer med i modulkopi', r.pre === 'Lægebesøg' && r.row.includes('Årsag: Transport') && r.knap === 'Ret årsag' && r.kopi.includes('Årsag: Transport'), JSON.stringify({ pre: r.pre, knap: r.knap }));
r = await ev(H + `await go('#idag'); return $$('.raekke').length`);

// 6b. Flervalg: fælles årsag på flere moduler
r = await ev(H + `await go('#fravaer'); $('[data-action="udfyld-valgte"]').click(); await w(30); const f1=$('#fler-fejl').textContent;
  const cbs=$$('.vaelg-modul').filter(c=>!c.closest('.raekke').textContent.includes('Årsag:')).slice(0,2); cbs.forEach(c=>c.click()); await w(30);
  $('[data-action="udfyld-valgte"]').click(); await w(30); const f2=$('#fler-fejl').textContent; const ids=cbs.map(c=>c.dataset.id);
  $$('[data-action="fler-aarsag"]').find(x=>x.textContent==='Syg').click(); $('#fler-kommentar').value='influenza'; $('[data-action="udfyld-valgte"]').click(); await w(40);
  const rows=ids.map(id=>$('.vaelg-modul[data-id="'+id+'"]').closest('.raekke').textContent);
  return { f1, f2, n: ids.length, ok: rows.every(x=>x.includes('Årsag: Syg') && x.includes('influenza')), besked: $('.fler-besked')?.textContent||'' }`);
check('Flervalg: fejl uden modul/årsag, fælles årsag på 2 moduler', r.f1.includes('modul') && r.f2.includes('årsag') && r.n === 2 && r.ok && r.besked.includes('2 moduler'), JSON.stringify(r));

// 6c. Lektie ved modulet, "Se lektier for i dag", farvemærker (blå = lektier, grøn = note, gul = ingen)
r = await ev(H + `await go('#idag'); const row=$$('.tidslinje .raekke')[0];
  const vedModul=!!row.querySelector('.raekke-lektie [data-action="kopi-lektie"]') && !!row.querySelector('[data-action="kopi-link"]') && !!row.querySelector('a[href^="https://example.com/"]');
  $('[data-action="vis-idag"]').click(); await w(80); const lek={h1:$('h1').textContent, n:$$('.lektie').length, alle:!!$('[data-action="kopi-alle"]')};
  await go('#uge'); const da=$$('.dag.is-idag .modul').find(m=>m.textContent.includes('Dansk A'));
  const mk=[...da.querySelectorAll('.mrk')].map(x=>x.textContent); const ingen=$$('.modul .mrk-ingen').length; const ugeLek=!!da.querySelector('.modul-lektie');
  const leg=$('.legende').textContent; return { vedModul, lek, mk, ingen, ugeLek, leg: leg.includes('Grøn: lærernote') && leg.includes('Blå: der er lektie') && leg.includes('Gul: ingen note eller lektier') }`);
check('Lektie ved modulet, Se lektier for i dag, mærker Lektier+Note', r.vedModul && r.lek.h1 === 'Lektier' && r.lek.n === 3 && r.lek.alle && r.mk.join() === 'Lektier,Note' && r.ingen > 0 && r.ugeLek && r.leg, JSON.stringify(r));

// 7. Nulstil demo
r = await ev(H + `$('[data-action="visning"]').click(); $('[data-action="nulstil"]').click(); await w(40); const s=JSON.parse(localStorage.getItem('studie-ux-demo:v1'));
  await go('#fravaer'); return { done: Object.keys(s.done).length, aarsag: Object.keys(s.aarsag).length, ingenAarsag: $$('.raekke').filter(x=>x.textContent.includes('Ingen årsag angivet')).length }`);
check('Nulstil demo rydder færdig og årsager', r.done === 0 && r.aarsag === 0 && r.ingenAarsag === 6, JSON.stringify(r));
await ev(H + `$('[data-action="visning"]').click(); return 1`);

// 8. Skift dag
r = await ev(H + `await go('#idag'); $('#skift-dag').click(); await w(30); const a=$('h1').textContent; for(let i=0;i<4;i++){ $('#skift-dag').click(); await w(20); } return [a, $('h1').textContent]`);
check('Skift dag virker og går rundt', r[0] === 'Torsdag 26. november' && r[1] === 'Onsdag 25. november', r.join(' -> '));

// 9. Ingen vandret scroll + trykflader
const routes = ['#idag', '#lektier', '#mangler', '#uge', '#fravaer', '#samtaler', '#kalender'];
for (const [wdt, big] of [[320, false], [390, false], [1440, false], [320, true]]) {
  await viewport(wdt, 800);
  r = await ev(H + `${big ? "document.documentElement.setAttribute('data-text','stor');" : "document.documentElement.removeAttribute('data-text');"}
    const bad=[]; const small=[];
    for (const h of ${JSON.stringify(routes)}) { await go(h); await w(40);
      const de=document.documentElement; if (de.scrollWidth > de.clientWidth) bad.push(h+':'+de.scrollWidth);
      for (const el of $$('.btn, .nav a, .linkknap, .legende summary, .links a')) { const b=el.getBoundingClientRect(); if (b.width && (b.height < 44 || b.width < 44)) small.push(h+':'+el.textContent.trim().slice(0,20)+':'+Math.round(b.width)+'x'+Math.round(b.height)); }
    }
    document.documentElement.removeAttribute('data-text'); return { bad, small }`);
  check(`Ingen vandret scroll ved ${wdt} px${big ? ' (stor tekst)' : ''}`, r.bad.length === 0, r.bad.join(', '));
  check(`Trykflader >= 44 px ved ${wdt} px${big ? ' (stor tekst)' : ''}`, r.small.length === 0, r.small.slice(0, 5).join(', '));
}

// 10. Kontrast (tekstfarver mod baggrunde) i lys og mørk
r = await ev(H + `const lum=h=>{const c=[1,3,5].map(i=>parseInt(h.slice(i,i+2),16)/255).map(v=>v<=0.03928?v/12.92:((v+0.055)/1.055)**2.4);return 0.2126*c[0]+0.7152*c[1]+0.0722*c[2]};
  const cr=(a,b)=>{const x=lum(a),y=lum(b);return (Math.max(x,y)+0.05)/(Math.min(x,y)+0.05)};
  const out=[]; for (const t of ['light','dark']) { document.documentElement.setAttribute('data-theme',t); const cs=getComputedStyle(document.documentElement), v=n=>cs.getPropertyValue('--'+n).trim();
    for (const [f,b] of [['text','bg'],['text','surface'],['muted','bg'],['muted','surface'],['accent','bg'],['accent','surface'],['on-accent','accent'],['bad','bg'],['bad','surface'],['warn','bg'],['warn','surface'],['ok','bg'],['ok','surface'],['surface','ok']]) out.push({t,f,b,r:+cr(v(f),v(b)).toFixed(2)}); }
  document.documentElement.setAttribute('data-theme','light'); return out`);
const low = r.filter(x => x.r < 4.5);
check('Kontrast >= 4,5:1 for alle tekstpar (lys + mørk)', low.length === 0, low.length ? low.map(x => `${x.t} ${x.f}/${x.b}=${x.r}`).join(', ') : 'laveste ' + Math.min(...r.map(x => x.r)));

// 11. Screenshots
if (shots) {
  for (const [wdt, h] of [[390, 1600], [1440, 1000]]) {
    await viewport(wdt, h);
    for (const route of ['#idag', '#lektier', '#mangler', '#uge', '#fravaer']) {
      await ev(H + `await go('${route}'); return 1`);
      const s = await send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: false });
      writeFileSync(join(shots, `${wdt}-${route.slice(1)}.png`), Buffer.from(s.data, 'base64'));
    }
  }
  await viewport(390, 1200);
  await ev(H + `document.documentElement.setAttribute('data-theme','dark'); await go('#idag'); return 1`);
  writeFileSync(join(shots, '390-idag-mork.png'), Buffer.from((await send('Page.captureScreenshot', { format: 'png' })).data, 'base64'));
  await ev(H + `await go('#fravaer'); $('[data-action="aarsag"]').click(); await w(40); return 1`);
  writeFileSync(join(shots, '390-aarsag-dialog-mork.png'), Buffer.from((await send('Page.captureScreenshot', { format: 'png' })).data, 'base64'));
}

check('Ingen konsolfejl eller undtagelser', errors.length === 0, errors.join(' | '));
ws.close(); proc.kill();
const fejl = results.filter(x => !x.ok).length;
console.log(`\n${results.length - fejl}/${results.length} kontroller bestået`);
process.exit(fejl ? 1 : 0);
