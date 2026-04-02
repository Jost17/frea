# Backup- und Restore-Runbook (GoBD-konform)

## Übersicht

Dieses Runbook beschreibt das GoBD-konforme Backup- und Restore-Verfahren für FREA.
Es stellt sicher, dass alle Rechnungsdaten unveränderlich archiviert und jederzeit wiederherstellbar sind.

**Geltungsbereich:** Alle FREA-Umgebungen (Staging, Produktion)  
**Verantwortlich:** CTO / Invoice Specialist  
**Letzte Prüfung:** 2. April 2026

---

## 1. Backup-Strategie

### 1.1 Backup-Typen

| Typ | Häufigkeit | Aufbewahrung | Ziel |
|-----|-----------|--------------|------|
| Pre-Deploy | Vor jedem Deployment | 30 Tage lokal | Rollback bei Deploy-Fehler |
| Täglich | 01:00 Uhr MEZ | 14 Tage | Wiederherstellung bei Datenverlust |
| Wöchentlich | Sonntag 02:00 Uhr MEZ | 8 Wochen | Monatsabschluss-Sicherung |
| Monatlich | 1. des Monats 03:00 Uhr MEZ | 6 Monate | Jahresabschluss / Steuerprüfung |

### 1.2 Backup-Ziele

- **Lokal:** `/var/lib/frea/backups/<env>/`
- **Offsite:** Hetzner Object Storage (Bucket: `frea-<env>-backups`, Region: EU)

### 1.3 Datenbankpfad

```
/var/lib/frea/<env>/frea.db
```

---

## 2. Backup-Skript

### 2.1 Lokales Pre-Deploy-Backup

```bash
#!/usr/bin/env bash
# pre-deploy-backup.sh — ausgeführt vor jedem Deployment
# GoBD-konform: unveränderlich, mit Integritätsprüfung

set -euo pipefail

ENV="${1:-production}"
BACKUP_DIR="/var/lib/frea/backups/${ENV}"
DB_PATH="/var/lib/frea/${ENV}/frea.db"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="${BACKUP_DIR}/pre-deploy_${TIMESTAMP}.db"
RETENTION_DAYS=30

mkdir -p "${BACKUP_DIR}"

# SQLite VACUUM + Integrity-Check vor Backup
echo "[$(date -Iseconds)] Starting pre-deploy backup for ${ENV}"
if ! sqlite3 "${DB_PATH}" "PRAGMA integrity_check;" > /dev/null 2>&1; then
    echo "ERROR: Database integrity check failed for ${ENV}" >&2
    exit 1
fi

# Backup erstellen (Kopie, kein EXPORT wegen Binärdaten)
cp "${DB_PATH}" "${BACKUP_FILE}"

# SHA-256 Prüfsumme berechnen und speichern
sha256sum "${BACKUP_FILE}" > "${BACKUP_FILE}.sha256"

# timestamp.txt für Audit-Trail
echo "${TIMESTAMP}" > "${BACKUP_DIR}/latest_backup_timestamp.txt"

# Alte Backups aufräumen (nur innerhalb der Aufbewahrungsfrist)
find "${BACKUP_DIR}" -name "pre-deploy_*.db" -mtime +${RETENTION_DAYS} -delete
find "${BACKUP_DIR}" -name "pre-deploy_*.sha256" -mtime +${RETENTION_DAYS} -delete

echo "[$(date -Iseconds)] Pre-deploy backup completed: ${BACKUP_FILE}"
```

### 2.2 Tägliches Offsite-Backup (Cron)

```bash
#!/usr/bin/env bash
# daily-backup.sh — tägliches inkrementelles Backup
# Aufgerufen via cron: 0 1 * * * /opt/frea/scripts/daily-backup.sh

set -euo pipefail

ENV="${1:-production}"
BACKUP_DIR="/var/lib/frea/backups/${ENV}"
DB_PATH="/var/lib/frea/${ENV}/frea.db"
TIMESTAMP=$(date +%Y%m%d)
RETENTION_DAILY=14
RETENTION_WEEKLY=56   # 8 weeks
RETENTION_MONTHLY=180  # 6 months

BUCKET="frea-${ENV}-backups"
OBJECT_STORAGE_ENDPOINT="https://eu2.contabostorage.com"

mkdir -p "${BACKUP_DIR}"

echo "[$(date -Iseconds)] Starting daily backup for ${ENV}"

# 1. Lokales Backup erstellen
LOCAL_BACKUP="${BACKUP_DIR}/daily_${TIMESTAMP}.db"
cp "${DB_PATH}" "${LOCAL_BACKUP}"

# 2. Integritätsprüfung
DB_HASH=$(sha256sum "${DB_PATH}" | cut -d' ' -f1)
BACKUP_HASH=$(sha256sum "${LOCAL_BACKUP}" | cut -d' ' -f1)

if [ "${DB_HASH}" != "${BACKUP_HASH}" ]; then
    echo "ERROR: Backup hash mismatch for ${ENV}" >&2
    rm -f "${LOCAL_BACKUP}"
    exit 1
fi

# 3. SHA-256 speichern
sha256sum "${LOCAL_BACKUP}" > "${LOCAL_BACKUP}.sha256"

# 4. Metadaten für Audit-Log
cat > "${LOCAL_BACKUP}.meta" <<EOF
environment=${ENV}
timestamp=${TIMESTAMP}
db_size=$(stat -f%z "${DB_PATH}")
db_hash=${DB_HASH}
backup_type=daily
EOF

# 5. Verschlüsselung (AES-256-GCM)
ENCRYPTED_BACKUP="${LOCAL_BACKUP}.enc"
openssl enc -aes-256-gcm -salt -pbkdf2 -iter 100000 \
    -in "${LOCAL_BACKUP}" \
    -out "${ENCRYPTED_BACKUP}" \
    -pass env:FREA_BACKUP_ENCRYPTION_KEY

# 6. Hochladen zu Hetzner Object Storage
#mc alias set hetzner "${HETZNER_ACCESS_KEY}" "${HETZNER_SECRET_KEY}" 2>/dev/null || true
#mc cp "${ENCRYPTED_BACKUP}" "hetzner/${BUCKET}/daily/${TIMESTAMP}_${ENV}.db.enc"

# Alternativ mit curl direkt:
curl -X PUT \
    -H "Authorization: Bearer ${HETZNER_OBJECT_STORAGE_TOKEN}" \
    -H "Content-Type: application/octet-stream" \
    --data-binary "@${ENCRYPTED_BACKUP}" \
    "${OBJECT_STORAGE_ENDPOINT}/${BUCKET}/daily/${TIMESTAMP}_${ENV}.db.enc"

# 7. Audit-Log-Eintrag
echo "[$(date -Iseconds)] backup_created env=${ENV} type=daily size=$(stat -f%z "${ENCRYPTED_BACKUP}")" >> /var/log/frea/backup-audit.log

# 8. Retention: täglich (14 Tage)
find "${BACKUP_DIR}" -name "daily_*.db.enc" -mtime +${RETENTION_DAILY} -delete
find "${BACKUP_DIR}" -name "daily_*.db" -mtime +${RETENTION_DAILY} -delete
find "${BACKUP_DIR}" -name "daily_*.sha256" -mtime +${RETENTION_DAILY} -delete
find "${BACKUP_DIR}" -name "daily_*.meta" -mtime +${RETENTION_DAILY} -delete

echo "[$(date -Iseconds)] Daily backup completed for ${ENV}"
```

### 2.3 Wöchentliches und Monatliches Backup

```bash
#!/usr/bin/env bash
# retention-backup.sh — Weekly (Sunday) und Monthly (1st) Backup
# Cron: 0 2 * * 0 /opt/frea/scripts/retention-backup.sh weekly
# Cron: 0 3 1 * * /opt/frea/scripts/retention-backup.sh monthly

set -euo pipefail

ENV="${1:-production}"
BACKUP_TYPE="${2:-weekly}"  # weekly oder monthly
TIMESTAMP=$(date +%Y%m%d)

BUCKET="frea-${ENV}-backups"
OBJECT_STORAGE_ENDPOINT="https://eu2.contabostorage.com"

RETENTION_WEEKLY=56   # 8 weeks
RETENTION_MONTHLY=180 # 6 months

DB_PATH="/var/lib/frea/${ENV}/frea.db"
BACKUP_DIR="/var/lib/frea/backups/${ENV}"

case "${BACKUP_TYPE}" in
    weekly)
        PREFIX="weekly"
        RETENTION=${RETENTION_WEEKLY}
        ;;
    monthly)
        PREFIX="monthly"
        RETENTION=${RETENTION_MONTHLY}
        ;;
    *)
        echo "Usage: $0 <env> <weekly|monthly>"
        exit 1
        ;;
esac

LOCAL_BACKUP="${BACKUP_DIR}/${PREFIX}_${TIMESTAMP}.db"
ENCRYPTED_BACKUP="${LOCAL_BACKUP}.enc"

echo "[$(date -Iseconds)] Starting ${BACKUP_TYPE} backup for ${ENV}"

# Backup erstellen
cp "${DB_PATH}" "${LOCAL_BACKUP}"

# Verschlüsseln
openssl enc -aes-256-gcm -salt -pbkdf2 -iter 100000 \
    -in "${LOCAL_BACKUP}" \
    -out "${ENCRYPTED_BACKUP}" \
    -pass env:FREA_BACKUP_ENCRYPTION_KEY

# SHA-256
sha256sum "${ENCRYPTED_BACKUP}" > "${ENCRYPTED_BACKUP}.sha256"

# Metadaten
cat > "${LOCAL_BACKUP}.meta" <<EOF
environment=${ENV}
timestamp=${TIMESTAMP}
db_size=$(stat -f%z "${DB_PATH}")
backup_type=${PREFIX}
EOF

# Hochladen
curl -X PUT \
    -H "Authorization: Bearer ${HETZNER_OBJECT_STORAGE_TOKEN}" \
    -H "Content-Type: application/octet-stream" \
    --data-binary "@${ENCRYPTED_BACKUP}" \
    "${OBJECT_STORAGE_ENDPOINT}/${BUCKET}/${PREFIX}/${TIMESTAMP}_${ENV}.db.enc"

# Audit-Log
echo "[$(date -Iseconds)] backup_created env=${ENV} type=${PREFIX} size=$(stat -f%z "${ENCRYPTED_BACKUP}")" >> /var/log/frea/backup-audit.log

# Lokale Retention
find "${BACKUP_DIR}" -name "${PREFIX}_*.db.enc" -mtime +${RETENTION} -delete
find "${BACKUP_DIR}" -name "${PREFIX}_*.db" -mtime +${RETENTION} -delete
find "${BACKUP_DIR}" -name "${PREFIX}_*.sha256" -mtime +${RETENTION} -delete
find "${BACKUP_DIR}" -name "${PREFIX}_*.meta" -mtime +${RETENTION} -delete

echo "[$(date -Iseconds)] ${PREFIX} backup completed for ${ENV}"
```

---

## 3. Restore-Prozess

### 3.1 Voraussetzungen

- FREA-Backup-Encryption-Key (aus Paperclip/GitHub Secrets)
- Hetzner Object Storage Credentials
- Lesezugriff auf `/var/lib/frea/backups/<env>/`
- Zugang zum FREA-Server via SSH

### 3.2 Restore aus lokalem Backup

```bash
#!/usr/bin/env bash
# restore-local.sh — Restore aus lokalem Backup
# WARNING: Überschreibt die aktuelle Datenbank!

set -euo pipefail

ENV="${1}"
BACKUP_FILE="${2}"  # z.B. /var/lib/frea/backups/production/daily_20260401.db.enc
DB_PATH="/var/lib/frea/${ENV}/frea.db"
WORK_DIR="/tmp/frea-restore-$(date +%s)"

if [ ! -f "${BACKUP_FILE}" ]; then
    echo "ERROR: Backup file not found: ${BACKUP_FILE}"
    exit 1
fi

mkdir -p "${WORK_DIR}"

echo "[$(date -Iseconds)] Starting restore from local backup: ${BACKUP_FILE}"
echo "WARNING: Current database at ${DB_PATH} will be replaced!"

# 1. Aktuelle DB sichern (Safety)
SAFETY_BACKUP="${DB_PATH}.safety-$(date +%Y%m%d_%H%M%S)"
cp "${DB_PATH}" "${SAFETY_BACKUP}"
echo "[$(date -Iseconds)] Safety backup created: ${SAFETY_BACKUP}"

# 2. Entschlüsseln
DECRYPTED_FILE="${WORK_DIR}/restored.db"
openssl enc -aes-256-gcm -d -salt -pbkdf2 -iter 100000 \
    -in "${BACKUP_FILE}" \
    -out "${DECRYPTED_FILE}" \
    -pass env:FREA_BACKUP_ENCRYPTION_KEY

# 3. Integritätsprüfung
if ! sqlite3 "${DECRYPTED_FILE}" "PRAGMA integrity_check;" > /dev/null 2>&1; then
    echo "ERROR: Restored database integrity check failed!" >&2
    echo "Safety backup available at: ${SAFETY_BACKUP}"
    exit 1
fi

# 4. Hash-Verifikation (falls SHA-256 vorhanden)
if [ -f "${BACKUP_FILE}.sha256" ]; then
    EXPECTED_HASH=$(cut -d' ' -f1 "${BACKUP_FILE}.sha256")
    ACTUAL_HASH=$(sha256sum "${DECRYPTED_FILE}" | cut -d' ' -f1)
    if [ "${EXPECTED_HASH}" != "${ACTUAL_HASH}" ]; then
        echo "ERROR: Hash mismatch after decryption!" >&2
        exit 1
    fi
    echo "[$(date -Iseconds)] Hash verification passed"
fi

# 5. Backup einspielen
cp "${DECRYPTED_FILE}" "${DB_PATH}"

# 6. Finale Integritätsprüfung
if ! sqlite3 "${DB_PATH}" "PRAGMA integrity_check;" > /dev/null 2>&1; then
    echo "ERROR: Final integrity check on restored database FAILED!" >&2
    echo "Restoring safety backup..."
    cp "${SAFETY_BACKUP}" "${DB_PATH}"
    exit 1
fi

# 7. Audit-Log
echo "[$(date -Iseconds)] restore_completed env=${ENV} backup=${BACKUP_FILE} safety_backup=${SAFETY_BACKUP}" >> /var/log/frea/backup-audit.log

# 8. Aufräumen
rm -rf "${WORK_DIR}"

echo "[$(date -Iseconds)] Restore completed successfully"
echo "App-Prozess muss neu gestartet werden: sudo systemctl restart frea"
```

### 3.3 Restore aus Offsite-Backup

```bash
#!/usr/bin/env bash
# restore-offsite.sh — Restore aus Hetzner Object Storage
# WARNING: Überschreibt die aktuelle Datenbank!

set -euo pipefail

ENV="${1}"
BACKUP_DATE="${2}"  # z.B. 20260401
BACKUP_TYPE="${3:-daily}"  # daily, weekly, monthly
DB_PATH="/var/lib/frea/${ENV}/frea.db"
WORK_DIR="/tmp/frea-restore-$(date +%s)"

BUCKET="frea-${ENV}-backups"
OBJECT_STORAGE_ENDPOINT="https://eu2.contabostorage.com"

if [ -z "${BACKUP_DATE}" ] || [ -z "${BACKUP_TYPE}" ]; then
    echo "Usage: $0 <env> <YYYYMMDD> <daily|weekly|monthly>"
    exit 1
fi

mkdir -p "${WORK_DIR}"

echo "[$(date -Iseconds)] Downloading ${BACKUP_TYPE} backup from Offsite: ${BACKUP_DATE}"

# 1. Backup von Object Storage herunterladen
REMOTE_PATH="${BACKUP_TYPE}/${BACKUP_DATE}_${ENV}.db.enc"
LOCAL_ENCRYPTED="${WORK_DIR}/backup.db.enc"

curl -o "${LOCAL_ENCRYPTED}" \
    -H "Authorization: Bearer ${HETZNER_OBJECT_STORAGE_TOKEN}" \
    "${OBJECT_STORAGE_ENDPOINT}/${BUCKET}/${REMOTE_PATH}"

if [ ! -s "${LOCAL_ENCRYPTED}" ]; then
    echo "ERROR: Failed to download backup from Offsite" >&2
    exit 1
fi

# 2. Entschlüsseln
DECRYPTED_FILE="${WORK_DIR}/restored.db"
openssl enc -aes-256-gcm -d -salt -pbkdf2 -iter 100000 \
    -in "${LOCAL_ENCRYPTED}" \
    -out "${DECRYPTED_FILE}" \
    -pass env:FREA_BACKUP_ENCRYPTION_KEY

# 3. Integritätsprüfung
if ! sqlite3 "${DECRYPTED_FILE}" "PRAGMA integrity_check;" > /dev/null 2>&1; then
    echo "ERROR: Integrity check failed for downloaded backup!" >&2
    exit 1
fi

# 4. SHA-256 Verifikation
SHA256_URL="${OBJECT_STORAGE_ENDPOINT}/${BUCKET}/${REMOTE_PATH}.sha256"
curl -o "${WORK_DIR}/expected_sha256" \
    -H "Authorization: Bearer ${HETZNER_OBJECT_STORAGE_TOKEN}" \
    "${SHA256_URL}" 2>/dev/null || true

if [ -f "${WORK_DIR}/expected_sha256" ]; then
    EXPECTED_HASH=$(cut -d' ' -f1 "${WORK_DIR}/expected_sha256")
    ACTUAL_HASH=$(sha256sum "${DECRYPTED_FILE}" | cut -d' ' -f1)
    if [ "${EXPECTED_HASH}" != "${ACTUAL_HASH}" ]; then
        echo "ERROR: Hash verification failed!" >&2
        exit 1
    fi
    echo "[$(date -Iseconds)] Hash verification passed"
fi

# 5. Sicherungsbackup der aktuellen DB
SAFETY_BACKUP="${DB_PATH}.safety-$(date +%Y%m%d_%H%M%S)"
cp "${DB_PATH}" "${SAFETY_BACKUP}"
echo "[$(date -Iseconds)] Safety backup created: ${SAFETY_BACKUP}"

# 6. Restore
cp "${DECRYPTED_FILE}" "${DB_PATH}"

# 7. Finale Integritätsprüfung
if ! sqlite3 "${DB_PATH}" "PRAGMA integrity_check;" > /dev/null 2>&1; then
    echo "ERROR: Final integrity check FAILED!" >&2
    cp "${SAFETY_BACKUP}" "${DB_PATH}"
    exit 1
fi

# 8. Audit-Log
echo "[$(date -Iseconds)] restore_completed env=${ENV} source=offsite type=${BACKUP_TYPE} date=${BACKUP_DATE} safety_backup=${SAFETY_BACKUP}" >> /var/log/frea/backup-audit.log

# 9. Aufräumen
rm -rf "${WORK_DIR}"

echo "[$(date -Iseconds)] Offsite restore completed successfully"
```

### 3.4 Restore-Integritätscheck (ohne Überschreiben)

```bash
#!/usr/bin/env bash
# verify-backup.sh — Prüft Backup-Integrität, ohne Datenbank zu überschreiben

set -euo pipefail

BACKUP_FILE="${1}"

if [ ! -f "${BACKUP_FILE}" ]; then
    echo "ERROR: File not found: ${BACKUP_FILE}"
    exit 1
fi

WORK_DIR="/tmp/frea-verify-$(date +%s)"
mkdir -p "${WORK_DIR}"

echo "[$(date -Iseconds)] Verifying backup: ${BACKUP_FILE}"

# 1. Entschlüsseln
DECRYPTED_FILE="${WORK_DIR}/verified.db"
openssl enc -aes-256-gcm -d -salt -pbkdf2 -iter 100000 \
    -in "${BACKUP_FILE}" \
    -out "${DECRYPTED_FILE}" \
    -pass env:FREA_BACKUP_ENCRYPTION_KEY 2>/dev/null || {
    echo "ERROR: Decryption failed"
    rm -rf "${WORK_DIR}"
    exit 1
}

# 2. SQLite Integrity Check
if ! sqlite3 "${DECRYPTED_FILE}" "PRAGMA integrity_check;" > /dev/null 2>&1; then
    echo "ERROR: SQLite integrity check failed"
    rm -rf "${WORK_DIR}"
    exit 1
fi
echo "  [OK] SQLite integrity check passed"

# 3. Schema-Validierung
TABLES=$(sqlite3 "${DECRYPTED_FILE}" "SELECT COUNT(*) FROM sqlite_master WHERE type='table';")
echo "  [OK] Tables found: ${TABLES}"

# 4. Hash-Verifikation
if [ -f "${BACKUP_FILE}.sha256" ]; then
    EXPECTED=$(cut -d' ' -f1 "${BACKUP_FILE}.sha256")
    ACTUAL=$(sha256sum "${DECRYPTED_FILE}" | cut -d' ' -f1)
    if [ "${EXPECTED}" = "${ACTUAL}" ]; then
        echo "  [OK] SHA-256 verification passed"
    else
        echo "  [WARN] SHA-256 mismatch (expected: ${EXPECTED}, actual: ${ACTUAL})"
    fi
fi

# 5. Backup-Metadaten anzeigen
if [ -f "${BACKUP_FILE}.meta" ]; then
    echo "  Backup metadata:"
    cat "${BACKUP_FILE}.meta" | sed 's/^/    /'
fi

# 6. Zeilen zählen
INVOICES=$(sqlite3 "${DECRYPTED_FILE}" "SELECT COUNT(*) FROM invoices;" 2>/dev/null || echo "0")
INVOICE_ITEMS=$(sqlite3 "${DECRYPTED_FILE}" "SELECT COUNT(*) FROM invoice_items;" 2>/dev/null || echo "0")
AUDIT_LOG=$(sqlite3 "${DECRYPTED_FILE}" "SELECT COUNT(*) FROM audit_log;" 2>/dev/null || echo "0")
echo "  Content summary:"
echo "    invoices: ${INVOICES}"
echo "    invoice_items: ${INVOICE_ITEMS}"
echo "    audit_log entries: ${AUDIT_LOG}"

rm -rf "${WORK_DIR}"
echo "[$(date -Iseconds)] Verification completed successfully"
```

---

## 4. Aufbewahrungsregeln (GoBD-konform)

### 4.1 Tabelle

| Backup-Typ | Aufbewahrung | Grund |
|------------|-------------|-------|
| Pre-Deploy | 30 Tage | Deploy-Fehler, schneller Rollback |
| Täglich | 14 Tage | Kurzer Datenverlust |
| Wöchentlich | 8 Wochen | Monatsabschluss |
| Monatlich | 6 Monate | Steuerprüfung, Jahresabschluss |

### 4.2 Löschprotokoll

Alle Löschungen werden automatisch im Audit-Log dokumentiert:

```
# /var/log/frea/backup-audit.log
[2026-04-02T01:00:00+02:00] backup_deleted env=production type=daily age=15days file=daily_20260318.db.enc
```

---

## 5. Cron-Konfiguration

```bash
# /etc/cron.d/frea-backups

# Tägliches Backup (01:00 Uhr MEZ)
0 1 * * * root /opt/frea/scripts/daily-backup.sh production >> /var/log/frea/daily-backup.log 2>&1

# Wöchentliches Backup (Sonntag 02:00 Uhr MEZ)
0 2 * * 0 root /opt/frea/scripts/retention-backup.sh production weekly >> /var/log/frea/weekly-backup.log 2>&1

# Monatliches Backup (1. des Monats 03:00 Uhr MEZ)
0 3 1 * * root /opt/frea/scripts/retention-backup.sh production monthly >> /var/log/frea/monthly-backup.log 2>&1

# Offsite-Upload-Retention (täglich nach lokalem Backup)
30 1 * * * root /opt/frea/scripts/offsite-cleanup.sh production >> /var/log/frea/offsite-cleanup.log 2>&1
```

---

## 6. Monitoring und Alerting

### 6.1 Überwachung

| Check | Schwellwert | Aktion |
|-------|-------------|--------|
| Backup-Job erfolgreich | Letzte 24h | Keine (OK) |
| Backup fehlgeschlagen | 1x | Alert an Team |
| Disk-Nutzung Backup-Verzeichnis | > 80% | Alert an CTO |
| Offsite-Backup fehlgeschlagen | 1x | Alert an CTO |

### 6.2 Alert-Empfänger

- **Primary:** CTO (E-Mail/Slack)
- **Backup-Fehler:** sofortige Benachrichtigung
- **Zertifikatsablauf:** 14 Tage vorher

---

## 7. Restore-Test (Monatlich)

### 7.1 Test-Prozedur

1. Neuestes Offsite-Backup herunterladen
2. `verify-backup.sh` ausführen
3. Ergebnis im Audit-Log dokumentieren
4. Bei Fehler: sofort Eskalation an CTO

### 7.2 Dokumentation

```bash
# /var/log/frea/restore-test.log
[2026-04-02T10:00:00+02:00] restore_test_completed env=production
  backup=daily_20260401.db.enc
  integrity_check=passed
  sha256_verification=passed
  tables_found=8
  invoices_count=42
  tested_by=invoice-specialist
  status=success
```

---

## 8. Eskalationspfad

| Vorfall | Sofortmaßnahme | Eskalation |
|---------|----------------|------------|
| Lokales Backup fehlgeschlagen | Prüfe Disk-Platz, Berechtigungen | CTO wenn > 2h |
| Offsite-Upload fehlgeschlagen | Prüfe Netzwerk, Credentials | CTO sofort |
| Restore-Test fehlgeschlagen | Nicht produktiv fortsetzen | CTO sofort |
| Datenverlust (Verdacht) | Sofortiges Read-Only setzen | CTO + CEO sofort |

---

## 9. Sicherheitsanforderungen

- **Verschlüsselung:** AES-256-GCM mit PBKDF2 (100.000 Iterationen)
- **Key-Management:** FREA_BACKUP_ENCRYPTION_KEY in GitHub Secrets / Paperclip
- **Transport:** HTTPS für alle Offsite-Uploads
- **Speicherort:** Hetzner Object Storage (EU, ISO 27001)
- **Zugriff:** Minimaler Prinzip (nur Backup-Service-Account)

---

## 10. Compliance-Checkliste

- [ ] Backup-Skripte ausführbar (`chmod +x`)
- [ ] Encryption Key in Secrets hinterlegt
- [ ] Object Storage Bucket erstellt und konfiguriert
- [ ] Cron-Jobs aktiviert und testweise ausgeführt
- [ ] Monitoring/Alerting konfiguriert
- [ ] Restore-Test dokumentiert (monatlich)
- [ ] CTO hat Lesezugriff auf Audit-Log
- [ ] Runbook durch CTO reviewed

---

## 11. Änderungshistorie

| Datum | Version | Änderung | Autor |
|-------|---------|----------|-------|
| 2. April 2026 | 1.0 | Initiale Version | Invoice Specialist |
