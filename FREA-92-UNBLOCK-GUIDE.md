# FREA-92 Unblock Guide — 2 Commands to Ship MCP Registry Submissions

**Status:** BLOCKED (18+ days)  
**Root Cause:** Two authentication systems need initialization  
**Effort to Unblock:** 2 interactive commands (~5 min total)  
**Time to Complete FREA-92 After Unblock:** 30 min (automated)

---

## The Two Commands

### 1. Refresh GitHub Authentication
```bash
gh auth login -h github.com
```
**What it does:** Re-authenticates gh CLI with GitHub  
**Interactive:** Yes (will prompt for verification code from 2FA app)  
**Why needed:** Push awesome-mcp-servers PR to your fork

**Expected flow:**
```
? What is your preferred protocol for git operations? HTTPS
? Authenticate Git with your GitHub credentials? Yes
? How would you like to authenticate GitHub CLI? Login with a web browser
(opens browser window for OAuth)
```

### 2. Configure npm Authentication
```bash
npm login
```
**What it does:** Stores npm credentials for `frea` package  
**Interactive:** Yes (prompts for username, password, email)  
**Why needed:** Publish to npm registry

**Expected flow:**
```
npm notice Log in on https://registry.npmjs.org/
Username: <your-npm-username>
Password: <your-npm-password>
Email: jost.thedens@gmail.com
```

---

## What Happens After You Run These

The CMO Agent will **automatically** execute:

1. **awesome-mcp-servers PR** (5 min)
   - Push branch from `$TMPDIR/awesome-mcp-servers:add-frea-mcp` to your fork
   - Create PR on punkpeye/awesome-mcp-servers
   - Expected approval: 1-2 days

2. **Glama.ai Submission** (5 min)
   - Submit `glama.json` metadata to registry
   - Expected approval: 24 hours

3. **npm Registry Publication** (10 min)
   - Publish `frea` package to npm
   - Makes MCP server installable via `npm install frea`

4. **Official MCP Registry** (10 min)
   - Submit to registry.modelcontextprotocol.io via npm metadata
   - Automated via GitHub Actions

---

## Verification

After running both commands, verify:

```bash
# Check GitHub auth
gh auth status
# Expected: ✓ Logged in to github.com as Jost17

# Check npm auth
npm whoami
# Expected: jost17 (or your npm username)
```

---

## What's Already Ready

These don't require your action—they're prepared:

- ✅ `glama.json` — Metadata for Glama.ai registry
- ✅ `package.json` — npm registry metadata (already updated with `repository` + `keywords`)
- ✅ awesome-mcp-servers entry — Ready in `$TMPDIR/awesome-mcp-servers` branch `add-frea-mcp`
- ✅ FREA-200 MCP Server — Merged to main (PR #34), code is live
- ✅ Registry submission playbooks — Documented in `docs/`

---

## If Something Goes Wrong

### GitHub auth fails with "token invalid"
```bash
# Clear old token and retry
gh auth logout -h github.com
gh auth login -h github.com
```

### npm login fails with permission denied
- Verify npm account exists: https://www.npmjs.com
- Check that `frea` package name is available (not pre-registered by someone else)
- Consider using a scoped name: `@jost17/frea-mcp` instead

### After both commands, CMO doesn't resume
- Check that you're in the frea_freelancer directory
- Run a test to verify auth works:
  ```bash
  gh repo view jostthedens/frea  # Should show repo details
  npm search frea                 # Should query npm registry
  ```

---

## Timeline

| Step | Duration | Blocker |
|------|----------|---------|
| `gh auth login` | 2 min | User (interactive) |
| `npm login` | 2 min | User (interactive) |
| CMO resumes + awesome-mcp-servers PR | 5 min | None (automated) |
| CMO Glama.ai submission | 5 min | None (automated) |
| CMO npm publish | 10 min | None (automated) |
| Awaiting PR approvals | 1-2 days | External (reviewer) |

**Total active work required from you:** 4 min  
**Total automated work:** 20 min  
**Waiting time:** 1-2 days (PR approvals)

---

## Next Action

Run both commands above. CMO Agent will pick up automatically.
