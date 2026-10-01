# Geoconnections Sync-Fix – nicht mehr nötig

> **Archiviert (Oktober 2026).** Geotrivia hat im September 2026 die Spielseiten umgebaut. Seitdem berechnet die Ergebnis-Anzeige von GeoConnections die Fehlerzahl selbst aus dem synchronisierten Serverergebnis. Der Fehler, den dieses Skript behoben hat, existiert nicht mehr.
>
> Das Skript findet auf der neuen Seite nichts mehr, woran es ansetzen kann, und bleibt deshalb wirkungslos. Es kann deinstalliert werden.

## Was das Skript früher gemacht hat

Wurde GeoConnections auf einem anderen Gerät gespielt, zeigte die Ergebnis-Karte auf geotrivia.com immer „0 / 4“ Fehler. Das Skript las die synchronisierte Fehlerzahl aus den Serverdaten (`serverGameResult`, Fehler = 4 − `lives`) und trug sie in die Karte ein.

Greasyfork: https://greasyfork.org/de/scripts/587743-geoconnections-sync-fix
