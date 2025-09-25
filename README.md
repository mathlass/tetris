# Tetris – Deploy Paket (GitHub Pages & Netlify)
Erstellt: 2025-08-15

**Neu:** Neben Tetris gibt es jetzt auch ein einfaches Snake-Spiel. Über den
Auswahlregler auf der Startseite kann zwischen beiden Spielen gewechselt
werden. Auf Mobilgeräten steht für Snake nun eine eigene Touch-Steuerung zur
Verfügung.

## GitHub Pages (empfohlen)
1) Neues Repo erstellen (z. B. `tetris`).
2) Diese Dateien (`index.html`, `manifest.json`, `sw.js`, Ordner `icons/`) in den Root-Ordner committen.
3) Repository → **Settings → Pages** → Source: *Deploy from branch*, Branch: `main`, Folder: `/ (root)` → Save.
4) Öffne die Pages-URL (z. B. `https://<user>.github.io/tetris/`) auf dem iPhone (Safari).
5) Teilen → **Zum Home-Bildschirm** (PWA-Install).

## Netlify Drop (sehr schnell)
- Gehe auf https://app.netlify.com/drop und ziehe **die entpackten Dateien** rein (oder das ZIP).
- Öffne die Netlify-URL → Testen → **Zum Home-Bildschirm**.

## Update-Hinweis (Service Worker)
Wenn du eine neue Version veröffentlichst, kann der Browser wegen des Caches noch die alte laden.
- Einmal **neu laden** (auf iPhone: Adresse antippen → Nach-unten-ziehen → neu laden).
- Oder die Version in `sw.js` (Konstante `CACHE`) hochzählen (z. B. `tetris-cache-v3`).

## Highscores & Offline-Nutzung
- Highscores werden ausschließlich lokal im Browser (LocalStorage) gespeichert.
- Es werden keine Netzwerkaufrufe mehr durchgeführt – das Spiel funktioniert komplett offline.

## Lokale Entwicklung
1) Optional: `npm install` (für Tests).
2) Öffne `index.html` direkt im Browser oder nutze einen beliebigen statischen Webserver.
3) Tests ausführen: `npm test` (Node.js Test Runner).

Viel Spaß!
