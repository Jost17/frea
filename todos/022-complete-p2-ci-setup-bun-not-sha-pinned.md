---
status: pending
priority: p2
issue_id: "022"
tags: [code-review, security, ci, supply-chain, rules-violation]
dependencies: []
---

# 022 — CI: `oven-sh/setup-bun@v2` tag-pinned + Install ohne `--ignore-scripts`

## Problem Statement

Der neue `.github/workflows/ci.yml` verstößt gegen zwei explizite CLAUDE.md-Regeln gleichzeitig: `oven-sh/setup-bun@v2` ist auf Tag gepinnt (nicht auf SHA wie vom Projekt gefordert), und der Install-Step läuft ohne `--ignore-scripts` — obwohl die CLAUDE.md npm-Security-Sektion das ausdrücklich als "CI/CD immer" kategorisiert.

## Findings

**Location:** `.github/workflows/ci.yml`

**Problem 1 — Tag-Pin:** Line ~26
```yaml
- uses: oven-sh/setup-bun@v2
```
`actions/checkout` ist korrekt SHA-gepinnt (`11bd71901bbe5b1630ceea73d27597364c9af683`), `setup-bun` nicht. Ein kompromittierter Tag-Retarget würde Code mit `GITHUB_TOKEN` im CI laufen lassen. `contents: read` Permission begrenzt den Blast-Radius, aber leicht härtbar.

**Problem 2 — Missing `--ignore-scripts`:** Line ~31
Der install-step läuft ohne das postinstall-Hook-Blocking, das CLAUDE.md explizit fordert:
> "CI/CD immer: `npm ci --ignore-scripts --audit` — blockt postinstall-Hooks, verhindert RAT-Dropper wie den Axios-Angriff (2026-03)"

Bun-Äquivalent: `bun install --frozen-lockfile --ignore-scripts`. Ohne `--ignore-scripts` kann ein kompromittiertes transitives Paket beim ersten CI-Lauf beliebigen Code ausführen.

**Gefunden von:** security-sentinel (P3-2, hochgestuft auf P2 weil explizite user-Regel-Violation).

## Proposed Solutions

### Option A: SHA-Pin + frozen-lockfile + ignore-scripts (empfohlen, 10 min)

```yaml
- name: Setup Bun
  uses: oven-sh/setup-bun@<current-v2-sha>  # v2.x.x
  with:
    bun-version: <pinned version from package.json>

- name: Install dependencies
  run: bun install --frozen-lockfile --ignore-scripts
```

1. Aktuelle `oven-sh/setup-bun@v2` commit SHA von GitHub holen
2. Comment `# v2.x.x` dahinter für Dependabot-Readability
3. `--ignore-scripts` zum install command
4. `--frozen-lockfile` sicherstellen (bun.lock muss committed sein)
5. Dependabot ist bereits aktiv in der PR — wird SHA-bumps automatisch vorschlagen

**Effort:** Small | **Risk:** Low

## Acceptance Criteria

- [ ] `oven-sh/setup-bun` ist SHA-gepinnt
- [ ] Install nutzt `--frozen-lockfile --ignore-scripts`
- [ ] CI läuft successful durch (no postinstall-dependencies kaputt)
- [ ] Dependabot trackt die Action (dependabot.yml)
- [ ] Dokumentiert im CONTRIBUTING.md falls relevant

## Work Log

- 2026-04-15: Gefunden von security-sentinel in PR #20

## Resources

- PR: https://github.com/Jost17/frea/pull/20
- Regel: CLAUDE.md (user-global) — npm Security Section
- Related: `.github/dependabot.yml`
- Betroffene Datei: `.github/workflows/ci.yml`
