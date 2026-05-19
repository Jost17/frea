# FREA Brand Voice & Guidelines

**Version:** 1.0  
**Created:** 2026-05-18  
**Owner:** CMO (Jost)  
**Last Updated:** 2026-05-18

---

## Brand Identity

### Mission

Deutschsprachigen Freelancern Rechnungs- und Zeit-Freiheit geben — ohne Compliance-Kopfschmerzen, ohne Feature-Bloat, ohne US-Infrastructure-Abhängigkeit.

### Core Values

1. **Pragmatisch** — Wir lösen echte Probleme, nicht fiktive Ängste
2. **Zuverlässig** — GoBD nicht als Feature, sondern als Grundlage
3. **Opinioniert** — Wir sagen nein zu Features die du nicht brauchst
4. **Transparent** — Keine Hidden Costs, keine AI-Slop, keine Marketing-Maske
5. **EU-Centric** — Self-hosted, DSGVO-natürlich, keine Google-Abhängigkeit

### Target Audience

- **Primary:** Freelancer-CTOs / Technical Indie Makers (IT, Consulting, Design)
- **Age:** 25–55
- **Geography:** German-speaking (DE/AT/CH)
- **Profile:** Self-directed, skeptical of marketing fluff, build-first mindset
- **Pain Points:** 
  - Time spent on invoicing/compliance
  - Fear of GoBD violations
  - No control over data location
  - Feature-bloated tools that hide core functionality

### Positioning

**Against:** Freemium SaaS (feature-locked), US-hosted tools (DSGVO risk), spreadsheet hell  
**For:** Freelancer who build products and need instruments that stay out of the way

---

## Tone & Voice

### Core Principles

**Pragmatisch vor Hübsch**
- Facts first, design second
- "We built this because we use it weekly" beats "innovative solution"
- Concrete examples > abstract claims
- Dated evidence (commit logs, test results) > marketing speak

**Opinioniert vor Neutral**
- "GoBD compliance is non-negotiable" (principle)
- NOT "We help you comply with regulations" (feature)
- Lean into why we made tradeoffs
- Name what we don't do and why

**Transparent vor Polished**
- Acknowledge constraints ("SQLite not a SQL database, performance limits at 10M rows")
- Admit scope boundaries ("No voice repurposing yet, text-first for now")
- Share learnings publicly (decommission Lessons Notes, ADRs, decision logs)
- No "magic" language

**Pattern-Focused before How-To**
- "Sunk-Cost-Inversion" (principle) not "How to close projects" (tutorial)
- "Via Negativa in portfolio design" not "10 tips for a better GitHub"
- Assume audience understands principles, wants depth not breadth
- Stories that illuminate a pattern, not anecdotes that entertain

### Examples (✓ DO / ✗ DON'T)

#### ✓ Pragmatic

- "We removed the invoice template editor. You needed 2 templates. Everyone was confused by 47 options."
- "FREA stores data in SQLite. Single-file database. Zero ops overhead. Bottleneck at ~10M invoices. For 99% of freelancers, that's 50-year runway."
- "GoBD means append-only audit logs. We enforced this with database triggers. No exceptions, no workarounds."

#### ✗ Fluff

- "Powerful, intuitive invoicing designed for modern freelancers"
- "Take control of your financial destiny"
- "Empower your freelance journey with cutting-edge technology"

---

## Writing Style

### Sentence Structure

- Short active sentences preferred
- No passive voice unless emphasis needed ("The feature was deprecated" → "We deprecated the feature")
- No weasel words ("try", "perhaps", "somewhat") — commit to claims or drop them
- Punctuation: em-dash for emphasis, period-heavy for rhythm

### Vocabulary

- **German:** Deutsch where possible, English only for technical terms or FREA-specific jargon
- **Contractions:** "Du wirst" not "Du solltest", "Ich bin" not "Man könnte"
- **Formality:** Casual professional — no "Sehr geehrte Damen und Herren", but not Slack-speak either
- **Specificity:** "30 Minuten", "14 Monate", "4 Signale" beats "quick", "long ago", "multiple"

### Examples

#### ✓ FREA Tone

"Dein Projekt ist nicht pausiert. Es ist tot. Die meisten Maker wissen das. Sie nennen es trotzdem 'pausiert'."

"GoBD bedeutet Audit-Logs. Nicht als Feature im Button-Menü, sondern als Datenbank-Trigger der Änderungen blockiert. Keine Exceptions, keine Workarounds."

"Wir bauen nur Features, die du weekly brauchst. Nicht weil wir faul sind. Weil Feature-Bloat die echten Features versteckt."

#### ✗ Not FREA Tone

"Streamline your invoicing with FREA's revolutionary compliance engine."

"Mit FREA können Sie Ihre Rechnungen einfach und schnell erstellen."

"Wir helfen Ihnen, die besten Entscheidungen zu treffen."

---

## Brand Attributes

### Visual (Not scope here, but context for writers)

- **Color:** Grayscale + single accent (TBD)
- **Typography:** Monospace for code/examples, sans-serif for prose (self-hosted fonts only, no Google Fonts)
- **Imagery:** Real workflows, not stock photos (or no imagery)

### Verbal

| Dimension | FREA | Not FREA |
|-----------|------|----------|
| **Complexity** | Honest about tradeoffs | Hides limitations |
| **Confidence** | "We don't support X because Y" | "X coming soon" (vague) |
| **Audience** | Assumes technical knowledge | Explains basics |
| **Tone** | Conversational but precise | Formal corporate |
| **Evidence** | Specificity (dates, numbers) | Generalizations |
| **Speed** | Get to the point fast | Story-heavy intros |

---

## Usage in Content

### Blog/Long-Form

- **Opening:** Start with a principle or honest problem, not with FREA
  - ✓ "Sunk-Cost-Inversion: The argument against a project is strongest when you've invested the most."
  - ✗ "Introducing FREA's new project management features..."

- **Body:** Pattern-first, then examples
  - ✓ "4 Signals That Separate Dead Projects from Paused Ones: [list], [explanation with example]"
  - ✗ "Many people struggle with project management..."

- **Closing:** CTA is a reflection or question, not a hard sell
  - ✓ "Which of your projects would you close if it didn't feel like giving up?"
  - ✗ "Try FREA free for 14 days"

### Twitter/X Threads

- Hook first: principle or counter-intuitive claim
- Build: concrete signals or patterns
- Close: question back to audience or actionable insight
- No hashtags in thread body, max 2 at end
- Avoid threads longer than 7 tweets (respect attention span)

### LinkedIn

- Personal moment in opening (not "I'm proud to announce")
- Substance in middle (principle + example)
- Single clear CTA (comment with perspective, not "sign up")
- Max 5 hashtags, all relevant
- Aim for 250–400 words

### Newsletter

- Opening: personal context or moment (narrative)
- Section 1–3: deep dive on principle + pattern
- Closing: reflection question or invitation to reply
- CTA: "Reply with X" or "Forward to someone who..." — not "Subscribe for more content"
- Target: 800–1000 words

### Email (Transactional, from FREA product)

- Clear subject
- Body: short, action-oriented, no jargon
- CTA: one button, clear action
- Tone: helpful, not promotional

---

## Dos & Don'ts

### ✓ DO

- Reference real numbers, dates, examples ("Contact_Hub from 2022", "14 Months", "4 Signals")
- Show decision-making (why we built it, why we didn't build something else)
- Admit limitations (SQLite bottleneck at 10M rows, no voice features yet, etc.)
- Connect to principles (this decision follows X principle because...)
- Assume audience is technical and skeptical
- Use metaphor only if it illuminates a pattern
- Write in Jost's voice (first person when describing FREA philosophy)
- Reference competitors honestly (they solve X well, we solve Y better)

### ✗ DON'T

- Use superlatives ("revolutionary", "world-class", "cutting-edge")
- Promise features that don't exist ("coming soon" without concrete timeline)
- Explain basics (target audience understands invoicing, GoBD, Freelancer workflows)
- Use passive voice or hedge language ("It might help with...", "Try to...")
- Write marketing copy (no "Say goodbye to...", "Empower your...", "Join thousands of...")
- Use clichés ("At FREA, we believe in...", "Our mission is to...")
- Claim market leadership (focus on principles, not rank)
- Use industry jargon without explanation (unless your audience is that niche)
- Write without evidence (cite sources, share learnings, show work)

---

## Content Pillars

**What FREA talks about (in priority order):**

1. **GoBD Compliance & Audit** — Append-only logs, trigger protection, audit trails
2. **Freelancer Economics** — Time tracking, invoice cycles, margin transparency
3. **Technical Decisions** — Why SQLite, why HTMX, why EU-only, architecture decisions
4. **Indie Maker Philosophies** — Via Negativa, Feature-First, Principle-Driven Design
5. **Operational Transparency** — Roadmap decisions, what we don't build, learnings from failures

**What FREA doesn't talk about:**
- ✗ Sales/conversion tactics (no "growth hacking")
- ✗ Personal development (unless it connects to a freelancer pain point)
- ✗ Comparison tables (we state what we are, let others compare)
- ✗ Lifestyle content (no "work from anywhere" fluff)

---

## SEO Guidance (for future long-form)

**Primary Keywords (high intent, Freelancer-specific):**
- GoBD-konforme Rechnung
- Zeiterfassung Freelancer
- ZUGFeRD Rechnungstool
- Freelancer Verwaltung

**Secondary Keywords (Maker/technical audience):**
- EU-Datenschutz Invoicing
- Self-hosted Rechnungstool
- SQLite Invoice System

**Approach:** Not SEO-first, but write principles that naturally contain these terms. No keyword stuffing, no content farms.

---

## Maintenance

**Review Schedule:** Quarterly (after 4 weeks of content publishing)  
**Updates Trigger:** If agent output drifts from principles, update guidelines with concrete examples  
**Approval:** CMO reviews, Jost approves any changes

**Version History:**
- v1.0: 2026-05-18 (initial, text-first pipeline launch)

---

## Reference Examples

**FREA Tone Exemplars (external):**
- Stripe docs ("Clear, specific, no fluff")
- Tailwind blog ("Opinions + technical depth")
- Simon Willison's writing ("Pattern-focused, evidence-based")

**Not FREA:**
- HubSpot blog ("SEO-optimized, broad audience")
- SaaS landing pages ("Marketing-heavy")
- Motivational content ("Lifestyle, not practical")

---

## Questions for Implementation

When in doubt, ask:

1. **Is this evidence-based or speculation?** (Evidence wins)
2. **Does this teach a principle or just promote FREA?** (Principle wins)
3. **Could a freelancer apply this idea outside of FREA?** (Yes = good)
4. **Am I being specific or generic?** (Specific wins)
5. **Would Jost write it this way?** (Yes = use it)

---

END OF DOCUMENT

---

**For Agents Using This Guide:**

This document is your north star. When generating content for FREA:

1. Read the "Core Principles" section every time
2. Check examples (✓ DO / ✗ DON'T) before finalizing
3. If your draft sounds like marketing copy, rewrite it
4. Assume Jost would approve only if it passes the "Questions" checklist
5. Reference specific numbers, examples, principles — not vague concepts
6. When in doubt, ask: "Would a skeptical technical freelancer trust this person?"

Your job is not to sell FREA. Your job is to articulate the principles FREA was built on, then show how the tool follows them. The tool sells itself if the principles are sound.
