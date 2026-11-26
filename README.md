# Studie+ demo

Klikbar demo af en enklere elevvisning til Studie+. Kun opdigtede data: elev, skole, beskeder, opgaver, karakterer og fravær. Intet sendes nogen steder. Demoen er ikke lavet af eller godkendt af Studie+.

Åbn: https://ronron-hr.github.io/studie-ux-demo/ (eller dobbeltklik `index.html`).

## Sider
Start, Om mig (Profil, Fravær, Karakterer), Aktivitetskalender, Samtaler, Forløbsplaner, Skema, Opgaver, Ressourcer og Undervisningsplan.

"Nu" er låst til onsdag 25. november 2026 kl. 13.38. Valg gemmes kun i browseren; "Nulstil demo" rydder dem.

## Skemaets farver
Grøn = lærernote. Blå = lektier. Gul = bekræftet ingen note eller lektier. Grå = kunne ikke læses (vises aldrig som "ingen").

## Filer
- `app.js`: alle sider, fælles menu og sidehoved, navigation via adressen (`#side/valg`)
- `app.css`: layout efter designskitserne, målt til 1366 x 768
- `data/demo.js`: de opdigtede data

## Kontrol
`node test/kontrol.mjs [mappe] [adresse]` styrer en frisk headless Chrome/Edge: de ni menupunkter, statusfarverne, ugeskift, elevforløb, smalle skærme, tastatur og konsolfejl. Med en mappe gemmes skærmbilleder og `resultater.md`.

Demoen er adskilt fra Chrome-udvidelsen: intet her er verificeret på den rigtige Studie+.
