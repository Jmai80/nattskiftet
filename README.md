# Nattskiftet

Ett litet first person-skräckspel i stil med *Five Nights at Freddy's*, byggt med **JavaScript, Three.js, HTML och CSS**.

Du är nattvakt på **Brunos Pizzaland**. Sitt kvar i vaktkontoret och överlev från 00:00 till 06:00 medan figurerna Bruno Björn, Harald Hare, Klara Kråka och Rolf Räv vandrar runt i byggnaden.

**Spela:** https://jmai80.github.io/nattskiftet/

## Styrning

| Vad | Hur |
|---|---|
| Titta åt sidorna | För musen mot vänster/höger kant |
| Dörrar | Klicka på röda knappen vid dörren, eller **Q** (vänster) / **E** (höger) |
| Dörrlampor | Klicka på vita knappen, eller **A** (vänster) / **D** (höger) |
| Kameror | **Mellanslag**, eller för musen över listen längst ner |
| Byt kamera | Klicka på kartan, **1–8** eller piltangenterna |
| Ljud av/på | **M** |

## Regler

- Dörrar, lampor och kameror drar ström. Tar strömmen slut blir det mörkt... och någon kommer.
- **Harald** kommer via vänster korridor, **Klara** via höger.
- **Bruno** rör sig från natt 2–3 och bara när du *inte* tittar på honom.
- **Rolf** i Rävgrottan (kam 1C) smyger fram när du *inte* tittar på kamerorna. Är draperiet tomt: stäng vänster dörr!
- Om en dörrknapp slutar fungera är någon redan inne i rummet...

## Köra lokalt

ES-moduler kräver en webbserver (det går inte att öppna `index.html` direkt som fil):

```bash
python3 -m http.server 8000
# öppna http://localhost:8000
```

## Struktur

```
index.html         – sidan och alla menyer
css/style.css      – HUD, kamera-UI, menyer
js/main.js         – spelloop, styrning, ström, klocka, jumpscares
js/world.js        – 3D-världen: kontor, korridorer, matsal, scen, kameror, ljus
js/characters.js   – figurerna (byggda av enkla former)
js/ai.js           – figurernas AI och rävens springlogik
js/audio.js        – alla ljud, genererade med Web Audio API
js/textures.js     – procedurella texturer (canvas)
lib/               – Three.js (r187)
```

Inga bild- eller ljudfiler behövs – allt genereras i koden.

Ett fan-projekt för lärande. Inte kopplat till Scott Cawthon eller *Five Nights at Freddy's*.
