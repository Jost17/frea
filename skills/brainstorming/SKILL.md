# SKILL.md - Brainstorming

Strukturiertes Brainstorming für Ideen, Projekte und Probleme.

## Wann nutzen

**Brainstorming sinnvoll bei:**
- Anforderungen unklar oder mehrdeutig
- Mehrere Lösungsansätze möglich
- Trade-offs müssen besprochen werden
- Problem muss erst verstanden werden

**Überspringen wenn:**
- Anforderungen klar und detailliert
- Du weißt genau, was du willst
- Einfache Bug-Fixes oder klar definierte Änderungen

## Kern-Prozess

### Phase 1: Problem verstehen

Stelle **eine Frage nach der anderen**:

1. **Multiple Choice nutzen wenn möglich**
   - Gut: "Soll die Benachrichtigung sein: (a) nur E-Mail, (b) nur In-App, oder (c) beides?"
   - Vermeide: "Wie sollen Nutzer benachrichtigt werden?"

2. **Breit beginnen, dann eingrenzen**
   - Erst: Was ist das Kernproblem?
   - Dann: Wer sind die Nutzer?
   - Zuletzt: Welche Constraints gibt es?

3. **Annahmen explizit nennen**
   - "Ich nehme an, dass Nutzer eingeloggt sind. Stimmt das?"

4. **Erfolgskriterien früh klären**
   - "Woran erkennst du, dass das Feature funktioniert?"

| Thema | Beispiel-Fragen |
|-------|----------------|
| Zweck | Welches Problem löst du? Was ist die Motivation? |
| Nutzer | Wer nutzt das? In welchem Kontext? |
| Constraints | Technische Einschränkungen? Timeline? Abhängigkeiten? |
| Erfolg | Wie misst du Erfolg? Was ist der Happy Path? |
| Edge Cases | Was sollte nicht passieren? Fehlerstates? |

### Phase 2: Ansätze erkunden

Nachdem du das Problem verstehst, schlage 2-3 konkrete Ansätze vor:

```markdown
### Ansatz A: [Name]

[Beschreibung, 2-3 Sätze]

**Pros:**
- [Vorteil 1]
- [Vorteil 2]

**Cons:**
- [Nachteil 1]
- [Nachteil 2]

**Am besten wenn:** [Situation wo dieser Ansatz glänzt]
```

### Phase 3: Design festhalten

Fasse key Decisions zusammen:

```markdown
---
date: YYYY-MM-DD
topic: <topic-name>
---

# <Titel>

## Was wir bauen
[Kurze Beschreibung - max 2 Absätze]

## Warum dieser Ansatz
[Kurze Erklärung der betrachteten Ansätze und warum dieser gewählt wurde]

## Offene Fragen
- [Noch offene Fragen für die Planungsphase]

## Nächste Schritte
→ Zur Planung übergehen
```

### Phase 4: Nächste Schritte

1. **Weiter zur Planung** → Detaillierter Plan
2. **Weiter verfeinern** → Design weiter erkunden
3. **Erstmal fertig** → Du kommst später zurück

## YAGNI-Prinzip

Aktiv gegen Komplexität arbeiten:

- **Keine hypothetischen zukünftigen Anforderungen designen**
- **Einfachsten Ansatz wählen, der das Problem löst**
- **Langweilige, bewährte Lösungen bevorzugen**
- **"Brauchen wir das wirklich?" fragen wenn Komplexität auftaucht**

## Inkrementelle Validierung

Nach jedem Abschnitt kurz validieren:
- "Stimmt das mit dem überein, was du meintest?"
- "Anpassungen bevor wir weitermachen?"
- "Ist das die Richtung, die du gehen willst?"
