# SKILL.md - Document Review

Strukturiertes Review von Dokumenten (Pläne, Analysen, Brainstorms).

## Wann nutzen

- Nach einem Brainstorming das Dokument verbessern
- Vor wichtigen Entscheidungen Pläne prüfen
- Externe Dokumente (Angebote, Specs) analysieren

## Schritt 1: Dokument holen

**Wenn Pfad angegeben:** Lies es, dann weiter zu Schritt 2.

**Wenn kein Dokument angegeben:** Frag welches Dokument, oder suche das neueste in deinem Workspace.

## Schritt 2: Assess

Lies das Dokument durch und frag:

- Was ist unklar?
- Was ist überflüssig?
- Welche Entscheidung wird vermieden?
- Welche Annahmen sind unausgesprochen?
- Wo könnte Scope ausufern?

Notiere发现问题 — noch nicht beheben.

## Schritt 3: Evaluate

Bewerte gegen diese Kriterien:

| Kriterium | Was prüfen |
|-----------|------------|
| **Klarheit** | Problemstellung klar, keine vagen Begriffe ("wahrscheinlich", "vielleicht", "versuchen") |
| **Vollständigkeit** | Erforderliche Abschnitte vorhanden, Constraints genannt, offene Fragen markiert |
| **Spezifität** | Konkret genug für nächste Schritt |
| **YAGNI** | Keine hypothetischen Features, einfachster Ansatz gewählt |

## Schritt 4: Kritischste Verbesserung identifizieren

Was sticht heraus? Wenn etwas die Dokumentqualität signifikant verbessern würde, ist es das "must address" Item. Heb es prominent hervor.

## Schritt 5: Änderungen umsetzen

1. **Auto-fix** kleine Issues (vage Sprache, Formatierung) ohne zu fragen
2. **Frage nach** bevor substanzielle Änderungen (Umstrukturierung, Bedeutungsänderung)
3. **Update** das Dokument inline — keine separaten Files

### Vereinfachungs-Leitfaden

Vereinfachung ist gezieltes Entfernen von unnötiger Komplexität.

**Vereinfachen wenn:**
- Inhalt dient hypothetischen zukünftigen Bedürfnissen, nicht aktuellen
- Abschnitte wiederholen Informationen anderswo
- Detail übersteigt was für nächsten Schritt nötig
- Abstraktionen oder Struktur fügen Overhead ohne Klarheit hinzu

**Nicht vereinfachen:**
- Constraints oder Edge Cases die Implementation beeinflussen
- Begründungen die erklären warum Alternativen verworfen wurden
- Offene Fragen die Auflösung brauchen

## Schritt 6: Nächste Aktion anbieten

Nach Änderungen:

1. **Nochmal verfeinern** — Weitere Review-Runde
2. **Review fertig** — Dokument ist bereit

Nach 2 Runden Empfehlung zur Fertigstellung — diminishing returns. Aber wenn du weitermachen willst, erlaube es.

## Was NICHT tun

- Nicht das gesamte Dokument umschreiben
- Nicht neue Abschnitte hinzufügen die du nicht besprochen hast
- Nicht über-engineeren oder Komplexität hinzufügen
- Keine separaten Review-Files oder Meta-Abschnitte erstellen
