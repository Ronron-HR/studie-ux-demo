# Studie UX-demo

Klikbar demo af et nyt UX for Studie+, lavet til en træt elev. Kun fiktive data. Ingen rigtige logins, beskeder eller elevdata. Intet sendes nogen steder.

## Åbn den
Dobbeltklik `index.html`. Ingen server, ingen installation, virker offline.

## Hvad kan den
- I dag: næste modul, dagens skema, dagens lektier, sygemeld med ét tryk (demo).
- Lektier: i dag / i morgen / uge / alle, kopiér pr. lektie og "kopiér alle", færdig-markering, link.
- Mangler jeg: lektier og afleveringer sorteret efter frist.
- Uge: skema man-fre med farver og ikoner forklaret.
- Fravær: oversigt, sæt årsag på et modul, sygemeld, raskmeld, forlæng.
- Kopiér modul som tekst (I dag, Uge, Fravær).
- Skift dag og Nulstil demo, mørk tilstand og stor tekst. Valg gemmes i browserens localStorage.

## Fra research (Studie+, 2026-11-25, kun læst)
- Fravær er ikke en egen side i Studie+. Det sidder som afkrydsning pr. modul i skemaet, og sygemelding ligger i en skjult redigeringstilstand.
- Betydningen af grøn flueben, tom boks og "U" er udledt af skærmbilledet og er et skøn.
- Listen over fraværsårsager i demoen er et eksempel, ikke skolens officielle liste. Grænser for fravær er [tjek med skolen].

## Kontrol
`node test/kontrol.mjs` kører 24 kontroller i headless Chrome/Edge (navigation, kopi, årsag, sygemeld, ingen vandret scroll ved 320/390/1440 px, trykflader, kontrast, konsolfejl).
