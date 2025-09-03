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

## Highscores & Backend
### Supabase (empfohlen)
1) In Supabase eine Tabelle `scores` mit den Spalten `id uuid primary key default gen_random_uuid()`,
   `player text`, `mode text`, `score integer`, `lines integer`, `created_at timestamp default now()` anlegen.
2) Die Variablen `NEXT_PUBLIC_SUPABASE_URL` und `NEXT_PUBLIC_SUPABASE_ANON_KEY` als
   Umgebungsvariablen oder per Script-Tag (`window.NEXT_PUBLIC_SUPABASE_URL = '...';`) setzen.
3) Das Spiel nutzt dann automatisch die Supabase-REST-API, um Highscores zu lesen und zu speichern.

### Lokaler Node-Server (Fallback)
1) `npm install` ist nicht nötig – der Server verwendet nur eingebaute Module.
2) Start: `node server.js` (speichert Daten in `scores.json`).
3) Das Spiel ruft die Endpunkte `/scores/<mode>` (GET/POST) auf. Für Snake wird der Modus `snake` verwendet.

Viel Spaß!

## Lokale Entwicklung
1) Optional: `npm install` (keine externen Abhängigkeiten erforderlich).
2) Server starten: `npm start` → `http://localhost:3000`.
3) Tests ausführen: `npm test` (Node.js Test Runner).
