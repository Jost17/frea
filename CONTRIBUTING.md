# Contributing to FREA

German freelancer invoicing tool — managed by Paperclip agents.

## Git Workflow

**Rule: Never commit directly to `main`. All changes go through feature branches + PRs.**

1. **Pull** latest `main` before starting any work
2. **Create a feature branch** (see Branch Naming below)
3. **Work, commit** (see Commit Messages below)
4. **Push** and open a **Pull Request**
5. **Review** — CTO reviews, or automated checks pass
6. **Merge** — squash-merge into `main`

## Branch Naming

| Type | Pattern | Example |
|------|---------|---------|
| Feature | `feat/FREA-<nr>-description` | `feat/FREA-55-invoice-pdf` |
| Bugfix | `fix/FREA-<nr>-description` | `fix/FREA-42-mwst-calc` |
| Infra | `infra/<description>` | `infra/ci-pipeline` |
| Hotfix | `hotfix/<description>` | `hotfix/紧急-calc-rounding` |

**Rules:**
- Lowercase only, hyphens between words
- Include the ticket number if one exists
- Keep descriptions short (2–5 words)

## Commit Messages

```
feat/FREA-55: Add invoice PDF generation

- Implement ZUGFeRD XML structure
- Add PDF layout with hlx/jsPDF
- Hook into invoice.finalize event
```

**Format:** `<type>/<ticket>: <summary>` followed by bullet points.

## Development Setup

```bash
# Clone the repo
git clone https://github.com/Jost17/frea.git
cd frea

# Install dependencies
bun install

# Run type checks and linting
bun run typecheck
bun run lint

# Start dev server
bun run dev
```

## Pre-commit Hooks

Pre-commit hooks run automatically before each `git commit`:
- `bun run typecheck` — TypeScript type check
- `bun run lint` — Biome lint

Hooks are defined in `.pre-commit-config.yaml` at the repo root.

**To install:**
```bash
# Install pre-commit tool (one-time)
pip install pre-commit   # or: brew install pre-commit

# Install hooks into this repo
pre-commit install
```

## Code Standards

- **Deutsche UI, englischer Code** — All user-facing text in German with real umlauts (ä, ö, ü, ß)
- **Files < 400 lines** — Split larger files
- **No ORM** — Raw SQL with `bun:sqlite`, prepared statements only
- **Zod** for all input validation
- **MwSt per line item, then sum** — never on total
- **Kaufmännische Rundung** — 2 decimal places

## Project Structure

```
frea/
├── src/              # Source code
├── agents/           # Paperclip agent definitions
├── docs/             # Architecture decision records
├── public/           # Static assets
├── tests/            # Test files
├── CLAUDE.md         # Project overview (for AI agents)
└── CONTRIBUTING.md   # This file
```

## Paperclip Workflow

Agents coordinate via Paperclip (see [FREA-54 Plan](/FREA/issues/FREA-54#document-plan)):

1. Pick up assigned issue from inbox
2. Checkout before working (`POST /api/issues/:id/checkout`)
3. Execute and update issue status
4. Post comment with summary + links

For multi-machine collaboration, all agents sync via GitHub — same repo, different working directories per machine.

## Getting Help

- Paperclip dashboard: `http://localhost:3100`
- CTO agent: assigned to [FREA](project FREA)
