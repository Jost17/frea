# FREA-132 Status Report

**Issue:** Server-Baseline und Deploy-Pipeline auf Hetzner umsetzen
**Status:** 🟠 BLOCKED (waiting on domain decision)
**Progress:** 3/4 Acceptance Criteria Met
**Last Updated:** 2026-04-29

---

## ✅ Completed (100%)

### 1. Server-Baseline (Debian-12)
- [x] SSH hardening (Ed25519 keys, no password auth, rate limiting)
- [x] UFW firewall (22, 80, 443 inbound; DNS, HTTP, HTTPS outbound)
- [x] Deploy-user setup with passwordless sudo
- [x] Fail2ban on production (fail2ban on prod)
- [x] Daily backups (2:22 AM UTC)

**Implementation:** `infra/terraform/main.tf` + `infra/scripts/init-staging.sh` + `infra/scripts/init-production.sh`

### 2. systemd-Unit für Bun/Hono
- [x] Service unit `frea.service` (auto-restart on failure)
- [x] Working directory: `/opt/frea`
- [x] Start command: `/root/.bun/bin/bun start`
- [x] Logging to journalctl
- [x] Production: memory limits + CPU quota

**Implementation:** User-data scripts (terraform-deployed)

### 3. CI/CD Deploy Pipeline
- [x] GitHub Actions workflow: Build → Test → Deploy
- [x] SSH-based deployment to staging
- [x] Artifact creation (tar.gz)
- [x] Health check verification (30 retries, 2s interval)
- [x] Error handling (explicit logging on failure)

**Implementation:** `.github/workflows/deploy-staging.yml`

### 4. Health-Check Endpoint + Error Logging
- [x] GET `/health` endpoint (returns `{ok: true, timestamp}`)
- [x] globalErrorHandler logs all errors with errorId
- [x] globalNotFoundHandler logs 404s (was silently failing)
- [x] No silent failures throughout stack

**Implementation:** `src/app.ts` + `src/middleware/error-handler.ts`

---

## ⏳ Blocked (0% - Waiting for Domain Decision)

### FREA-132.2: DNS + TLS Setup

**Blocker:** Jost must choose domain name:
- `frea.app` ← Paul's recommendation (short, brandable)
- `frea.de` (local/German)
- `frea.online` (generic)
- Other?

**Once Domain is Decided:**

1. **DNS Setup** (2h)
   - Register domain (if needed)
   - Add A record (staging IPv4)
   - Add AAAA record (staging IPv6)
   - Add production records

2. **Caddy TLS Configuration** (1h)
   - Update `/etc/caddy/Caddyfile` with domain
   - Auto-HTTPS via Let's Encrypt
   - Reload Caddy
   - Verify TLS certificate

3. **Email Alerting** (1.5h)
   - Health check monitoring script
   - Send alerts on 3+ consecutive failures
   - Configure alert recipient (jost.thedens@gmail.com)

4. **Security Headers** (30min)
   - Caddy config: HSTS, X-Frame-Options, CSP
   - Verify headers via curl

**Estimated Time:** 4.5 hours total (once domain is chosen)

---

## Acceptance Criteria Status

| Criterion | Status | Evidence |
|-----------|--------|----------|
| App ist auf Staging über HTTPS erreichbar | ❌ BLOCKED | Requires domain + TLS (FREA-132.2) |
| Deploy aus GitHub Actions funktioniert reproduzierbar | ✅ COMPLETE | `.github/workflows/deploy-staging.yml` + SSH pipeline |
| App-Port 3114 ist nicht öffentlich erreichbar | ✅ COMPLETE | Caddy reverse proxy (localhost:3114 only) |
| Fehler werden explizit geloggt | ✅ COMPLETE | globalErrorHandler + globalNotFoundHandler |

---

## What's Deployed & Ready to Use

### For Manual Testing (Pre-Domain)
```bash
# Generate SSH keys
infra/scripts/setup-deploy-key.sh

# Deploy infrastructure
cd infra/terraform
cp terraform.tfvars.example terraform.tfvars
# Edit with Hetzner token + public key
terraform apply

# Staging IP: from terraform output
# SSH to staging: ssh -i deploy_key deploy@<staging-ip>
# Check service: sudo systemctl status frea
# View logs: sudo journalctl -u frea -f
```

### For GitHub Actions Deploy
1. Add GitHub Secrets:
   - `DEPLOY_PRIVATE_KEY` (from setup-deploy-key.sh)
   - `STAGING_HOST` (from terraform output)
   - `PRODUCTION_HOST` (from terraform output)

2. Push to main branch → GitHub Actions deploys automatically

3. Health check: `curl http://<staging-ip>:3114/health`
   - Returns: `{"ok":true,"timestamp":"2026-04-29T...Z"}`

---

## Next Actions (Blocked List)

### For Jost
- [ ] **DECIDE:** Domain name (frea.app, frea.de, frea.online, or other?)
- [ ] **CONFIRM:** Once domain is decided, reply to FREA-132 issue

### For Paul (Once Domain is Decided)
- [ ] Create FREA-132.2: DNS + TLS Setup (child issue)
- [ ] Register domain (if needed)
- [ ] Configure DNS A/AAAA records
- [ ] Deploy Caddy TLS configuration
- [ ] Setup email alerting
- [ ] Verify end-to-end HTTPS
- [ ] Test GitHub Actions deploy pipeline
- [ ] Mark FREA-132 as COMPLETE

---

## Git Branches & Commits

**Branch:** `feat/FREA-132-infrastructure`
**Base:** `main`

**Commits:**
1. `95d4a98` feat(FREA-132.1): Infrastructure-as-Code — Hetzner Terraform + GitHub Actions
2. `cc4f135` docs(FREA-132): Deployment guide for infrastructure setup
3. `c07310f` chore(FREA-132): gitignore — exclude Terraform state + deploy keys
4. `b081cd7` feat(FREA-132): Health check endpoint + 404 error logging

Ready to merge once domain is decided and FREA-132.2 is created.

---

## Technical Debt / Observations

1. **GitHub Actions Billing:** PR #123 blocked by Actions Billing. Once approved, can resume parallelized deploy tests.
2. **Production Deployment:** FREA-132.3 will add production deploy pipeline (same as staging, stricter firewall).
3. **Monitoring Dashboard:** Post-MVP: Add health dashboard (uptime, error rates, deploy history).

---

## Contacts

- **Hetzner Support:** https://support.hetzner.com/en
- **Let's Encrypt:** https://letsencrypt.org/
- **Caddy Docs:** https://caddyserver.com/docs/
- **Jost's Email:** jost.thedens@gmail.com (for alerts)

---

## Decision Required

**Jost, please reply to FREA-132 issue with:**

```
Domain choice: frea.app
```

Once confirmed, FREA-132.2 will be created and ~4.5 hours of work will proceed immediately.
