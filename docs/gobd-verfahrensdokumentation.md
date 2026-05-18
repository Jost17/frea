# GoBD-Verfahrensdokumentation — FREA Freelancer Tool

**Version:** 1.0  
**Datum:** 2026-05-18  
**Geltungsbereich:** Rechnungsstellung, Zeiterfassung, Buchführungsdaten

---

## 1. Zweck und Rechtsgrundlage

Diese Verfahrensdokumentation beschreibt die technischen und organisatorischen Maßnahmen zur Erfüllung der **Grundsätze zur ordnungsmäßigen Führung und Aufbewahrung von Büchern, Aufzeichnungen und Unterlagen in elektronischer Form sowie zum Datenzugriff (GoBD)** des BMF-Schreibens vom 28.11.2019.

Pflicht-Dokument gemäß GoBD Rz. 151: Jedes DV-System zur Buchführung benötigt eine Verfahrensdokumentation, die Inhalt, Aufbau, Ablauf und Ergebnisse nachvollziehbar macht.

---

## 2. Systemübersicht

| Merkmal | Wert |
|---------|------|
| System | FREA Freelancer Tool |
| Betrieb | Lokal (Single-User, localhost:3114) |
| Datenbank | SQLite (bun:sqlite) |
| Laufzeitumgebung | Bun |
| Betriebssystem | macOS |
| Anwendungsbereich | Rechnungsstellung, Zeiterfassung |

---

## 3. Datenerfassung und -entstehung

### 3.1 Zeiterfassung

Zeiteinträge werden manuell über die Web-UI erfasst. Jeder Eintrag enthält:
- Projekt-Referenz
- Datum
- Dauer in Tagen
- Beschreibung
- Abrechnungsstatus

Zeiteinträge können bis zur Rechnungsstellung bearbeitet werden. Nach Zuordnung zu einer Rechnung (`invoice_id IS NOT NULL`) sind sie logisch gesperrt — das UI zeigt keine Bearbeitungsoptionen mehr.

### 3.2 Rechnungserstellung

Rechnungen entstehen aus gebündelten Zeiteinträgen. Das System berechnet automatisch:
- Nettobetrag pro Zeile: `Dauer × Tagessatz`
- MwSt pro Zeile (nicht auf Gesamtsumme — GoBD-konform)
- Kaufmännische Rundung (2 Dezimalstellen) nach DIN 1333

---

## 4. Unveränderlichkeit und Manipulationsschutz

### 4.1 Rechnungsfinalisierung (draft → sent)

Beim Übergang einer Rechnung in den Status `sent`:

1. **Datenbanksperre:** SQLite-Trigger `invoices_no_update_finalized` und `invoice_items_no_update_finalized` verhindern jede nachträgliche Änderung der Finanzfelder (`net_amount`, `vat_amount`, `gross_amount`, `vat_rate`, `daily_rate`, `days`).
2. **Archiv-Snapshot:** Ein JSON-Snapshot von Rechnung + Positionen wird in der Tabelle `invoice_archive` gespeichert.
3. **PDF-Archiv:** Falls vorhanden, wird das Rechnungs-PDF in `data/archiv/` kopiert und dessen SHA-256-Hash gespeichert.

### 4.2 Append-Only-Tabellen

Die Tabelle `invoice_archive` ist über Trigger vor Änderungen geschützt:

```sql
-- Kein UPDATE auf invoice_archive
CREATE TRIGGER invoice_archive_no_update
  BEFORE UPDATE ON invoice_archive
BEGIN
  SELECT RAISE(ABORT, 'invoice_archive is append-only: updates are not allowed');
END;

-- Kein DELETE auf invoice_archive
CREATE TRIGGER invoice_archive_no_delete
  BEFORE DELETE ON invoice_archive
BEGIN
  SELECT RAISE(ABORT, 'invoice_archive is append-only: deletes are not allowed');
END;
```

### 4.3 Audit-Log

Alle Änderungen an buchführungsrelevanten Entitäten (Rechnungen, Kunden, Projekte, Zeiteinträge) werden im Audit-Log erfasst. Das Audit-Log ist ebenfalls append-only (keine UPDATE/DELETE-Operationen im Anwendungscode).

---

## 5. Revisionssicherheit — Hash-Ketten-Integrität

### 5.1 SHA-256-Hash-Kette im Audit-Log

Jeder Audit-Log-Eintrag enthält einen `content_hash`, der wie folgt berechnet wird:

```
content_hash = SHA-256(prevHash | timestamp | entityType | entityId | action | changes)
```

- `prevHash`: Hash des unmittelbar vorangehenden Eintrags (oder `"genesis"` für den ersten Eintrag)
- Trennzeichen: `|` (Pipe)
- `changes`: JSON-serialisierte Änderungsdaten, oder `""` wenn keine

Diese verkettete Struktur stellt sicher, dass nachträgliche Einfügungen oder Löschungen in der Mitte der Kette erkannt werden.

### 5.2 Hash-Ketten-Verifikation

Die Integrität kann jederzeit über die API geprüft werden:

```
GET /api/audit-log/integrity
```

Antwort:
```json
{
  "success": true,
  "data": {
    "valid": true,
    "totalChecked": 142,
    "message": "Hash-Kette intakt"
  }
}
```

Bei einer Unterbrechung der Kette:
```json
{
  "data": {
    "valid": false,
    "totalChecked": 142,
    "firstFaultyId": 87,
    "message": "Hash-Kette unterbrochen bei Eintrag 87"
  }
}
```

---

## 6. Aufbewahrungsfristen

### 6.1 Gesetzliche Grundlage

§ 147 AO, § 14b UStG: Rechnungen sind 10 Jahre aufzubewahren.

### 6.2 Technische Umsetzung

Jeder Archiveintrag enthält das Feld `retain_until`:

```
retain_until = invoice_date + 10 Jahre
```

Beispiel: Rechnung vom 2026-05-18 → `retain_until = 2036-05-18`

Dieses Datum ist informativ; eine automatische Löschung findet nicht statt. Manuelle Löschung vor Ablauf ist durch den Append-Only-Trigger technisch gesperrt.

---

## 7. Datenzugriff und Exportfähigkeit

### 7.1 Maschinelle Auswertbarkeit (GoBD Rz. 155-162)

Alle buchführungsrelevanten Daten sind über die REST-API abrufbar:

| Endpunkt | Inhalt |
|----------|--------|
| `GET /api/invoices` | Alle Rechnungen mit Status |
| `GET /api/invoices/:id/archive` | GoBD-Archivkopie einer Rechnung |
| `GET /api/audit-log` | Vollständiger Audit-Trail |
| `GET /api/audit-log/integrity` | Hash-Ketten-Verifikation |

### 7.2 Datenformat

- Rechnungsdaten: JSON (ISO 8601 Datumsformat, Beträge als Dezimalzahlen)
- Archiv-Snapshot: JSON in Spalte `invoice_snapshot`
- Audit-Log-Änderungen: JSON in Spalte `changes`

---

## 8. Datenbankschema (buchführungsrelevante Tabellen)

### invoices

| Spalte | Typ | Bedeutung |
|--------|-----|-----------|
| id | INTEGER PK | Interner Schlüssel |
| invoice_number | TEXT | Rechnungsnummer (Prefix-Jahr-Seq) |
| client_id | INTEGER FK | Kunde |
| invoice_date | TEXT | Rechnungsdatum (YYYY-MM-DD) |
| due_date | TEXT | Fälligkeitsdatum |
| net_amount | REAL | Nettobetrag (Summe Positionen) |
| vat_amount | REAL | MwSt-Betrag (Summe pro Position) |
| gross_amount | REAL | Bruttobetrag |
| status | TEXT | draft / sent / paid / cancelled |
| paid_date | TEXT | Zahlungsdatum (NULL bis bezahlt) |

### invoice_items

| Spalte | Typ | Bedeutung |
|--------|-----|-----------|
| invoice_id | INTEGER FK | Rechnung |
| description | TEXT | Positionsbeschreibung |
| days | REAL | Anzahl Tage |
| daily_rate | REAL | Tagessatz |
| net_amount | REAL | Nettobetrag Position |
| vat_rate | REAL | MwSt-Satz (z.B. 0.19) |
| vat_amount | REAL | MwSt-Betrag Position |
| gross_amount | REAL | Bruttobetrag Position |

### invoice_archive

| Spalte | Typ | Bedeutung |
|--------|-----|-----------|
| invoice_id | INTEGER | Referenz (nicht FK — archival copy) |
| invoice_number | TEXT | Rechnungsnummer zum Zeitpunkt der Archivierung |
| archived_at | TEXT | Archivierungszeitpunkt (ISO 8601) |
| retain_until | TEXT | Aufbewahrungsfrist bis (YYYY-MM-DD) |
| invoice_snapshot | TEXT | JSON-Snapshot (Rechnung + Positionen) |
| pdf_hash | TEXT | SHA-256 des PDF (NULL wenn kein PDF) |
| pdf_archive_path | TEXT | Pfad zur PDF-Kopie in data/archiv/ |
| chain_hash | TEXT | SHA-256-Kettenglied für Archiv-Integrität |

### audit_log

| Spalte | Typ | Bedeutung |
|--------|-----|-----------|
| timestamp | TEXT | Zeitstempel (YYYY-MM-DD HH:MM:SS) |
| entity_type | TEXT | invoice / client / project / time_entry |
| entity_id | INTEGER | ID der Entität |
| action | TEXT | create / update / delete / status_change / archive |
| changes | TEXT | JSON der Änderungen |
| source | TEXT | web / api |
| content_hash | TEXT | SHA-256 der Hash-Kette |

---

## 9. Stornierung und Korrekturrechnungen

Rechnungen können nur storniert werden solange sie im Status `draft` oder `sent` sind. Der Übergang zu `cancelled` ist möglich; danach sind keine Übergänge mehr erlaubt. Stornierungen werden im Audit-Log erfasst.

Für bereits versendete Rechnungen (§ 14 UStG) ist eine Stornorechnung mit eigenem Eintrag und neuer Rechnungsnummer zu erstellen (noch nicht implementiert — manueller Prozess).

---

## 10. Technische Schutzmaßnahmen — Zusammenfassung

| Maßnahme | Implementierung | GoBD-Anforderung |
|----------|-----------------|------------------|
| Unveränderlichkeit finalisierter Rechnungen | SQLite BEFORE UPDATE Trigger | Rz. 64-68 |
| Append-Only Archiv | SQLite BEFORE UPDATE/DELETE Trigger | Rz. 64-68 |
| Hash-Kette Audit-Log | SHA-256-Verkettung (content_hash) | Rz. 106-108 |
| Snapshot bei Finalisierung | JSON-Snapshot in invoice_archive | Rz. 64 |
| 10-Jahres-Aufbewahrung | retain_until-Feld | § 147 AO |
| PDF-Archivkopie | data/archiv/ + pdf_hash | Rz. 119-121 |
| Maschinelle Auswertbarkeit | REST-API + JSON-Export | Rz. 155-162 |

---

*Letzte Aktualisierung: 2026-05-18 — FREA-229*
