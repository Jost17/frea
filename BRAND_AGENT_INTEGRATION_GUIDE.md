# Brand Agent Knowledge Base — Integration Guide

## Overview

This knowledge base (`brand-agent-knowledge-base.json`) provides the foundational context, reference materials, examples, and few-shot prompts for implementing the **Brand Agent** Claude Code skill. It covers 9 capabilities across brand strategy, visual identity, messaging, compliance, and evolution.

## Architecture

### Knowledge Structure

The JSON file is organized into four primary sections, each serving a specific purpose in agent decision-making:

#### 1. `domain_context` (2-3 paragraphs)
High-level framing that explains **why** the Brand Agent exists and how it integrates into the broader system. Key points:
- Brand identity is a **structural decision**, not cosmetic
- Brand Agent is the **single source of truth** for all brand outputs
- Inconsistent messaging reduces revenue by up to 33%
- All downstream agents (Copy, Design, Social) consume Brand Agent outputs as immutable constraints

#### 2. `reference_docs` (10 reference materials)
Curated, domain-specific documentation covering:

| Reference | Topics | Use Cases |
|-----------|--------|-----------|
| Brand Voice Tone Matrix | Context-to-tone mapping, channel-specific adaptation, B2B SaaS specifics | Defining voice for email, support, product, social |
| Visual Identity Systems | W3C DTCG, semantic color taxonomies, typography progression, Tailwind v4 | Designing design token systems |
| Messaging Frameworks | Positioning statements, value prop hierarchy, Marty Neumeier's Onlyness | Creating compelling positioning |
| Naming Science | Phonetic analysis, linguistic screening, trademark clearance | Naming products, companies, features |
| Brand Audits | Drift detection, consistency metrics, compliance scoring | Monitoring brand health |
| Rebranding Case Studies | Mailchimp, Airbnb, Slack analysis patterns | Planning strategic evolution |
| Design Token Engineering | CSS Custom Properties scoping, Tailwind integration, build pipeline | Technical implementation |
| Founder Brand Dynamics | Parasocial relationships, authenticity, succession planning | Scaling founder-led brands |
| EU Compliance | GDPR principles, brand data compliance, vendor risk | Ensuring regulatory adherence |
| Brand Architecture | David Aaker framework, portfolio strategy, identity vs positioning | Managing multi-brand portfolios |

**Consumption Pattern:**
- Agent retrieves relevant reference doc based on user query type
- Uses reference as constraint for recommendations
- Cites reference docs in output

#### 3. `examples` (8 detailed examples)
Real-world scenarios with concrete solutions:

1. **B2B SaaS Email Tone Matrix** — Different messaging for engineers vs CFOs
2. **Design Token Semantic Hierarchy** — Tailwind v4 + dark mode + WCAG compliance
3. **Onlyness Statement** — Fintech positioning against established competitors
4. **Rebranding Strategy** — How to evolve without breaking equity
5. **Naming Linguistic Screening** — International naming with trademark clearance
6. **Brand Audit Drift Detection** — Real-world color/typography/tone drift findings
7. **Founder Brand Integration** — CEO personal brand as company extension
8. **GDPR Compliance Audit** — Vendor risk assessment and third-party DPA review

**Consumption Pattern:**
- Retrieve examples matching user's scenario type
- Extract decision patterns, not literal solutions
- Adapt to user's specific context

#### 4. `few_shot_prompts` (6 reasoning patterns)
Structured approaches for common brand decisions:

| Prompt | Pattern | Output |
|--------|---------|--------|
| Brand Voice Definition | 3-step reasoning (customer profile → tone matrix → constraint teams) | Voice matrix + constraint specification |
| WCAG Compliant Tokens | 3-step: semantic definition → light/dark pairs → validation | Token definitions + CSS code |
| Rebrand Decision | 3-step: audit equity → define trigger → plan rollout | Go/no-go recommendation + timeline |
| Multi-Agency Consistency | 3-step: guidelines doc → constraint layers → drift audits | Governance model + measurement |
| EU Expansion Risks | 3-step: map compliance → audit cultural fit → accessibility | Risk assessment + implementation roadmap |
| Founder Brand Scaling | 3-step: define integration → authenticity guardrails → founder-independence | Integration model + succession plan |

**Consumption Pattern:**
- Identify user's decision type
- Follow the numbered reasoning steps
- Output structured decision + actionable next steps

---

## Integration into Claude Code Skill

### Minimal Skill Shell

```typescript
// ~/.claude/skills/brand-agent/brand-agent.ts
import { readFileSync } from "fs";
import { resolve } from "path";

interface KnowledgeBase {
  knowledge: {
    domain_context: string;
    reference_docs: Array<{
      title: string;
      slug: string;
      topics: string[];
      reference: string;
    }>;
    examples: Array<{
      title: string;
      scenario: string;
      solution: Record<string, any>;
    }>;
    few_shot_prompts: Array<{
      context: string;
      approach: string[];
    }>;
  };
}

const knowledgeBase: KnowledgeBase = JSON.parse(
  readFileSync(resolve(__dirname, "../../brand-agent-knowledge-base.json"), "utf-8")
);

export function getBrandContext(): string {
  return knowledgeBase.knowledge.domain_context;
}

export function getReferenceDoc(topic: string): string {
  const doc = knowledgeBase.knowledge.reference_docs.find(
    (d) => d.slug.includes(topic) || d.title.toLowerCase().includes(topic)
  );
  return doc
    ? `${doc.title}\n\nTopics: ${doc.topics.join(", ")}\n\nReference: ${doc.reference}`
    : "Reference doc not found";
}

export function getExample(scenario: string): string {
  const example = knowledgeBase.knowledge.examples.find(
    (e) => e.scenario.toLowerCase().includes(scenario.toLowerCase())
  );
  return example
    ? `${example.title}\n\nScenario: ${example.scenario}\n\nSolution: ${JSON.stringify(example.solution, null, 2)}`
    : "Example not found";
}

export function getFewShotPrompt(decisionType: string): string {
  const prompt = knowledgeBase.knowledge.few_shot_prompts.find(
    (p) => p.context.toLowerCase().includes(decisionType.toLowerCase())
  );
  return prompt
    ? `${prompt.context}\n\nApproach:\n${prompt.approach.map((s, i) => `${i + 1}. ${s}`).join("\n")}`
    : "Few-shot prompt not found";
}
```

### Skill Invocation Pattern

```bash
# User triggers skill with question
/brand-agent "We're launching B2B SaaS for freelancers. How do we define brand voice?"

# Skill internally:
# 1. Retrieves domain_context (sets system context)
# 2. Identifies decision type: "Brand Voice Definition"
# 3. Loads few_shot_prompt for "brand voice"
# 4. Retrieves reference_doc: "Brand Voice Tone Matrix"
# 5. Retrieves example: "B2B SaaS Email Campaign Tone Matrix"
# 6. Synthesizes response using all four knowledge sections
```

---

## Usage Patterns

### Pattern 1: Brand Strategy Definition
**User Request:** "Help us define our brand positioning for a B2B SaaS."
**Skill Response:**
1. Load `few_shot_prompts[2]` (Onlyness/Positioning)
2. Retrieve `reference_docs[2]` (Messaging Frameworks)
3. Retrieve `examples[3]` (Fintech positioning)
4. Output: Onlyness statement + Value prop hierarchy + Competitive differentiation

### Pattern 2: Design System Implementation
**User Request:** "Create a design token system with dark mode support and WCAG compliance."
**Skill Response:**
1. Load `few_shot_prompts[1]` (WCAG compliant tokens)
2. Retrieve `reference_docs[1]` (Visual Identity Systems)
3. Retrieve `reference_docs[6]` (Design Token Engineering)
4. Retrieve `examples[2]` (Design token semantic hierarchy)
5. Output: Token definitions + CSS code + Tailwind config + validation checklist

### Pattern 3: Brand Health Monitoring
**User Request:** "Our brand is drifting across channels. How do we audit and fix it?"
**Skill Response:**
1. Load `few_shot_prompts[3]` (Multi-agency consistency)
2. Retrieve `reference_docs[4]` (Brand Audit Patterns)
3. Retrieve `examples[6]` (Brand audit drift detection)
4. Output: Audit framework + Drift metrics + Remediation timeline

### Pattern 4: Regulatory Compliance
**User Request:** "We're expanding to EU. What brand and compliance risks do we face?"
**Skill Response:**
1. Load `few_shot_prompts[5]` (EU expansion risks)
2. Retrieve `reference_docs[8]` (EU Compliance)
3. Retrieve `reference_docs[9]` (GDPR Compliance)
4. Retrieve `examples[8]` (GDPR compliance audit)
5. Output: Risk assessment + Compliance roadmap + Vendor audit checklist

---

## Key Design Principles

### 1. Constraint-First Architecture
Brand Agent outputs are **immutable constraints** for downstream agents:
- Copywriting Agent: Must use tone matrix from Brand Agent
- Design Agent: Must use design tokens from Brand Agent
- Social Media Agent: Must follow voice guidelines from Brand Agent

**Implementation:** Brand Agent outputs include explicit "non-negotiable" markers.

### 2. Reference-Driven Decision Making
Every recommendation is grounded in one of the 10 reference docs:
- Never generate brand strategy from scratch
- Always cite which reference doc supports the recommendation
- Allows user to verify reasoning + audit against industry standards

### 3. Example-Based Pattern Matching
Few-shot examples show **reasoning patterns**, not copy-paste solutions:
- User's context is always different from examples
- Agent extracts the decision-making framework from examples
- Adapts framework to user's specific scenario

### 4. Phased Implementation
All recommendations include timelines:
- Immediate actions (week 1)
- Medium-term (month 1-3)
- Long-term (quarter-end)

---

## Knowledge Maintenance

### When to Update

1. **New Industry Research** — Add to appropriate reference doc
2. **Benchmark Updates** — Marty Neumeier, David Aaker, Emily Heyward publications
3. **Compliance Changes** — GDPR amendments, WCAG updates, W3C DTCG releases
4. **Case Study Patterns** — When major rebranding (Slack, Figma, etc.) publishes process details
5. **Framework Evolution** — Tone matrix refinements, token taxonomy standardization

### Versioning

```json
{
  "knowledge_version": "1.0.0",
  "last_updated": "2026-04-22",
  "source_citations": [
    "Marty Neumeier Brand Gap (2005)",
    "W3C DTCG Specification v2025.10",
    "GDPR Official Regulation EU 2016/679"
  ]
}
```

---

## Outputs & Constraints

### Non-Negotiable Outputs
Every Brand Agent response includes:
1. **Explicit constraint specification** for downstream agents
2. **Reference citations** (which doc supports this?)
3. **Timeline** (when should this be implemented?)
4. **Measurement criteria** (how do we know this worked?)

### Example Output Structure
```
RECOMMENDATION: [Positioning statement]

CONSTRAINT FOR:
- Copy Agent: "All email copy must use 70% friendly, 20% technical tone"
- Design Agent: "Button primary color: #0066CC (±2 RGB tolerance)"
- Social Agent: "LinkedIn posts: expert tone, Twitter: friendly tone"

REFERENCE: Marty Neumeier Brand Gap, Debbie Millman Brand Thinking
TIMELINE: Week 1: Documentation, Week 2-3: Team training, Month 2: Launch
MEASUREMENT: Brand voice consistency audit (target: 95% compliance)
```

---

## Sources & Citations

The knowledge base is grounded in these authoritative sources:

- [Marty Neumeier Brand Positioning](https://www.martyneumeier.com/)
- [W3C Design Tokens Community Group](https://www.designtokens.org/)
- [David Aaker Brand Architecture Framework](https://howbrandsarebuilt.com/david-aakers-brand-vision-model-and-how-it-works-part-one/)
- [Debbie Millman Brand Thinking](https://debbiemillman.com/)
- [Emily Heyward Obsessed Framework](https://www.emilyheyward.com/book)
- [GDPR Official Regulation](https://gdpr.eu/)
- [WCAG 2.1 AA Guidelines](https://www.w3.org/WAI/WCAG21/quickref/)
- [Brand New Archive](https://www.underconsideration.com/brandnew/)

---

## Summary

This knowledge base transforms the Brand Agent from a generic LLM into a **specialized strategic consultant** for brand identity work. It provides:

✓ **Domain grounding** — All recommendations tied to authoritative sources  
✓ **Reasoning transparency** — Few-shot patterns show decision logic  
✓ **Constraint propagation** — Outputs become inputs for downstream agents  
✓ **Real-world applicability** — Examples are vetted case studies, not theoretical  
✓ **Compliance integration** — EU requirements embedded into every recommendation  
✓ **Measurability** — Timelines and metrics included in every output  

Use this knowledge base as the foundation for a Claude Code skill that becomes the **source of truth** for all brand-related decisions.
