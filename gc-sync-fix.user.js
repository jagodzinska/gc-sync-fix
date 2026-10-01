// ==UserScript==
// @name         Geoconnections Sync-Fix
// @namespace    jago/gc-sync-fix
// @version      0.1.2
// @description  NICHT MEHR NÖTIG: Geotrivia zeigt die synchronisierte Fehlerzahl seit dem Umbau im Sept. 2026 selbst richtig an – Skript kann deinstalliert werden. Früher: Behebt einen Anzeigefehler auf geotrivia.com: Wurde Geoconnections auf einem anderen Gerät gespielt, zeigt die Ergebnis-Karte dort immer "0 / 4" Fehler. Das Skript liest die synchronisierte Fehlerzahl aus den Serverdaten (serverGameResult) und trägt sie in die Karte ein.
// @author       jago/claude
// @license      MIT
// @homepageURL  https://greasyfork.org/de/scripts/587743-geoconnections-sync-fix
// @match        https://geotrivia.com/*
// @run-at       document-idle
// @grant        none
// ==/UserScript==

// NICHT MEHR NÖTIG (Stand 2026-10-01): Seit dem Umbau im Sept. 2026 berechnet
// Geotrivia die Fehler im Ergebnis-Screen selbst aus serverGameResult
// (4 − data.lives). Das Skript findet die alte Karte nicht mehr und tut nichts.

(function () {
  'use strict';
  if (window.top !== window.self) return; // nicht in Ad-iframes laufen

  let serverFehler = null; // 4 − lives laut Server; null = unbekannt/nicht gespielt
  let geholtFuer = null;   // Berlin-Datum, für das bereits gefetcht wurde
  let fetchLaeuft = false;

  function heuteBerlin() {
    // en-CA liefert das ISO-Format JJJJ-MM-TT
    return new Date().toLocaleDateString('en-CA', { timeZone: 'Europe/Berlin' });
  }

  // Next.js liefert die Seitendaten in mehreren self.__next_f.push([1,"..."])-
  // Häppchen; Grenzen können mitten in einem Wert liegen, deshalb erst alles
  // zu einem durchgehenden String zusammensetzen (Technik wie im
  // geo-autofill-Skript und im Apps-Script-Backend).
  function streamAusHtml(html) {
    const re = /self\.__next_f\.push\(\[1,"([\s\S]*?)"\]\)/g;
    let stream = '';
    let m;
    while ((m = re.exec(html)) !== null) stream += m[1];
    return stream || html;
  }

  // serverGameResult im Stream: gameType\":\"geoconnections\",...,\"day\":
  // \"2026-07-19\",\"data\":{\"lives\":1,...} → Fehler = 4 − lives.
  // \\?" matcht escaped und unescapt (Fallback bei Formatänderung).
  function fehlerAusHtml(html, heute) {
    const stream = streamAusHtml(html);
    const re = /gameType\\?":\\?"geoconnections\\?",\\?"score\\?":[\d.]+,\\?"total\\?":[\d.]+,\\?"day\\?":\\?"(\d{4}-\d{2}-\d{2})\\?"/g;
    let m;
    while ((m = re.exec(stream)) !== null) {
      if (m[1] !== heute) continue;
      const lives = /lives\\?":(\d+)/.exec(stream.slice(m.index, m.index + 800));
      if (lives) return 4 - parseInt(lives[1], 10);
    }
    return null;
  }

  async function serverFehlerHolen() {
    const heute = heuteBerlin();
    if (fetchLaeuft || geholtFuer === heute) return;
    fetchLaeuft = true;
    try {
      // Same-Origin-Fetch mit Session-Cookie → synchronisiertes Ergebnis,
      // unabhängig davon, auf welchem Gerät gespielt wurde
      const res = await fetch('/de/geoconnections', { credentials: 'include' });
      if (res.ok) {
        serverFehler = fehlerAusHtml(await res.text(), heute);
        geholtFuer = heute; // auch bei null nicht erneut fetchen (nicht gespielt)
        fixAnwenden();      // nicht auf die nächste DOM-Mutation warten
      }
    } catch (e) {
      // Netzwerkfehler: nächster Mutation-Tick versucht es erneut
    } finally {
      fetchLaeuft = false;
    }
  }

  // Ergebnis-Karte: <span>Fehler</span> und darunter
  // <span class="… font-black …">0</span><span>/ 4</span>
  function fixAnwenden() {
    if (serverFehler === null) return;
    const labels = document.querySelectorAll('span');
    for (const label of labels) {
      const t = label.textContent.trim();
      if (t !== 'Fehler' && t !== 'Mistakes') continue;
      const spalte = label.parentElement;
      if (!spalte) continue;
      const wertSpan = spalte.querySelector('span.font-black');
      const maxSpan = wertSpan && wertSpan.nextElementSibling;
      // "/ 4"-Nachbar stellt sicher, dass es wirklich die Fehler-Karte ist
      if (!wertSpan || !maxSpan || !/^\/\s*4$/.test(maxSpan.textContent.trim())) continue;
      const neu = String(serverFehler);
      if (wertSpan.textContent !== neu) wertSpan.textContent = neu;
    }
  }

  // React rendert die Karte je nach Navigation/Statuswechsel mehrfach neu,
  // deshalb Mutationen beobachten und den Fix (idempotent) erneut anwenden.
  let tickGeplant = false;
  function tick() {
    tickGeplant = false;
    if (!/\/geoconnections(\/|$)/.test(location.pathname)) return;
    serverFehlerHolen();
    fixAnwenden();
  }

  const beobachter = new MutationObserver(function () {
    if (tickGeplant) return;
    tickGeplant = true;
    requestAnimationFrame(tick);
  });
  beobachter.observe(document.documentElement, { childList: true, subtree: true, characterData: true });
  tick();
})();
