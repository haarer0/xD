# xD — Potential features (design notes)

Living backlog for making xD a strong tool for **business analysts**, **product owners**, and (as a hand-off) **developers** who implement the agreed logic.

Status: **ideas / not scheduled**. Revisit when prioritizing product work.  
Last updated: 2026-10-09.

---

## Product framing

**What it is today.** A multidimensional decision table: Inputs (P), Modifiers (M), Outputs (R), with nested conditions, don’t-care (`x`), same-category merge on equal R, and overlap-based conflict detection.

**Who it is for.** Primary: people who turn exception-heavy process logic into agreed cases (BAs, POs). Secondary: developers who consume a **resolver contract** (keys + evaluated outputs), not a general-purpose rules runtime.

**North-star loop.** Discover → model → challenge → agree → hand off.  
Success test: a BA can run a ~1 hour session, leave with an agreed matrix, no unexplained conflicts, and tickets engineering accepts without a translation meeting.  
Eng success test: given facts, a small pure function/`evaluate` returns stable output keys that match golden tests generated from the matrix.

**Niche bet.** Stay deep in one domain story (e.g. employer/workplace change, DOCAS/DD, salary vs bank-update paths) rather than becoming a generic “any rules” platform.

**Related formal ideas (for positioning, not roadmap).** Decision tables / DMN-like tables, don’t-care minimization, production rules / implications, rule-base overlap validation, ternary (assert / deny / omit) conditions.

---

## Suggested build order

| Priority | Theme | Why first |
| --- | --- | --- |
| P0 | Plain-language row summaries + review export | Stakeholders can read without learning icons |
| P0 | Conflict → example case → resolve assist | Turns red rows into workshop decisions |
| P1 | Version / diff + comments | Makes the matrix a living agreement artifact |
| P1 | Spec / Jira export + Excel import | Fits BA/PO toolchain; improves hand-off |
| P2 | Domain starter kits + lint / DoD | Stops models rotting; accelerates first value |
| P2 | Code keys + resolver contract export | Dev hand-off without becoming a rules engine |
| Later | In-app method orchestration / full runtime, DMN, heavy AI, multi-tenant suite | Dilutes niche; loses to real engines if overreached |

---

## 1. Conversation artifact (not only an editor)

BAs run workshops and write tickets; the matrix should survive outside the editor.

### 1.1 Shareable read-only view
- Link and/or PDF / slide-friendly export
- Show category numbers (`2.3`), short labels, conflicts callouts
- Optional “presentation mode” (hide editing chrome)

### 1.2 Versioning and diff
- Named snapshots or history (“before Payroll review”)
- Diff: added/removed/changed rows, param schema changes, conflict count delta
- Answer: “what changed since last review?”

### 1.3 Comments and questions
- Comment on row, cell, or category
- Lightweight status: open question / resolved
- Optional assignee or “ask Payroll” tag

### 1.4 Decision log
- Record accepted conflict resolutions and rationale
- “Why this row exists” note (stronger than free-text Comment alone)
- Exportable alongside the matrix

---

## 2. Language layer (business first, symbols second)

Keep the matrix as the power tool; add a human-readable layer on top.

### 2.1 Plain-language row summaries
Generate one sentence (or short block) per row from P/M/R, e.g.:

> When workplace/employer changed **and** salary is set in RMS → show salary update; do **not** show bank details update.

- Use schema short labels and descriptions
- Respect don’t-care (omit or say “regardless of …”)
- Nested leaves: `DD → Retention`, etc.
- Show beside the matrix and in Resolver / exports

### 2.2 Glossary
- Term list from param titles, short labels, descriptions
- Ownership field later (“Payroll owns Salary-in-RMS”)
- Surface in schema UI and review pack

### 2.3 Business naming
- Friendly names for categories and rows beyond `#` / `2.3`
- Keep stable ids for merge/conflict; display names for humans

### 2.4 Domain templates
- Starter matrices for the niche (employer change, eligibility, retention, …)
- Suggested params and nested R shapes
- Example conflicts to teach the method

---

## 3. Conflict facilitation

Conflicts are already detected (P+M overlap, including don’t-care-as-any, with different R). Extend into a workshop workflow.

### 3.1 Conflict cards
For each conflict pair:
- Category numbers (`#2.1` & `#2.2`)
- Side-by-side outputs
- Suggested fixes: narrow with `n`, broaden with `x`, split row/category, align R

### 3.2 Example scenario generator
- Concrete P (+ M) assignment that hits both rows
- “This case would require both …” narrative
- Optional “pick a witness” when many overlaps exist

### 3.3 Severity
- **Blocking:** overlapping antecedents, different R (current core)
- **Warning:** e.g. same R but redundant overlap; unused params; all-`x` row
- Filter Resolver / status bar by severity

### 3.4 Resolve assist (guided, not automatic)
- Propose one-click patches the user confirms
- Never silent-rewrite business meaning
- Log the choice in the decision log (see 1.4)

---

## 4. Toolchain fit

Do not replace Jira / Confluence / Figma; feed them.

### 4.1 Spec pack export
Single bundle:
- Matrix snapshot (expanded and/or collapsed labels)
- Logical scheme
- Open conflicts (+ example cases)
- Glossary
- Optional decision log

Formats: Markdown, PDF, HTML, copy-paste for Confluence/Notion.

### 4.2 Ticket / acceptance-criteria export
- One issue per category or per asserted output (“Show salary update”)
- Include triggering conditions in plain language
- Deep link back to row ids / category numbers if hosted later

### 4.3 Excel / CSV round-trip
- Import starting sheets BAs already have
- Export that round-trips schema + nested paths reasonably
- Document limitations (structure loss, don’t-care policy)

### 4.4 Optional integrations (later)
- Confluence / Notion publish
- Jira create/update from export mapping

---

## 5. Structure rails (keep models healthy)

Power without rails produces rot.

### 5.1 Param library
- Shared definitions across projects (later: org library)
- Ownership, description, allow-don’t-care policy (exists per schema node today)

### 5.2 Don’t-care policy (extend current checkbox)
- Already: per-param / nested slot “Allow don’t care”
- Consider defaults by role (e.g. outputs often disallow `x`)
- Lint when a disallowed `x` still exists in data after policy change
- Optional bulk “convert orphan `x` → `y`” with confirm

### 5.3 Lints BAs understand
- Unused param (never non-`x`)
- Category that is only don’t-cares
- Output never asserted (`y`) anywhere
- Duplicate R with no meaningful P/M difference (merge candidate)
- Nested shape drift vs schema

### 5.4 Definition of done (per category)
Checklist, e.g.:
- [ ] No blocking conflicts
- [ ] Every asserted R has a plain-language explanation
- [ ] Glossary complete for params used
- [ ] Merge candidates reviewed (merge or explicitly keep)

---

## 6. Niche depth

Generic “any decision table” competes with Excel. Niche depth creates recommendation.

### 6.1 Starter kits
- One flagship domain pack first (align with real client/internal use)
- Sample rows, schema, known conflict teaching cases

### 6.2 Suggested vocabulary
- Param name suggestions and nested R templates for that domain
- Review script / facilitator notes (“ask these three questions”)

### 6.3 Positioning lines (draft)
- Short: *Multidimensional decision tables with don’t-care simplification*
- Outcome: *Clarify exception-heavy process rules in a workshop—and leave with an agreed, conflict-checked matrix*

---

## 7. Developer hand-off (resolver contract, not a runtime)

xD may also serve developers: instead of only describing every condition in prose, bind params to **code keys** and export logic that defines **which outputs / effect keys apply**. Developers implement a small resolver in *their* stack; xD does not become a general rules engine.

### 7.1 Design stance (as-is)
- **Good idea:** workshop-grade decision tables that **compile to a dumb, reviewable decision function** (`facts → output keys` / ordered effect keys).
- **Weak idea:** “xD calls your methods” / DI / async orchestration / replacing Drools–DMN–policy engines.
- Stay in **flag-shaped and structured-output** territory (including nested R leaves). Leave workflow and side-effect orchestration in application code.
- Binding and key governance are harder than codegen; treat the **contract** as the product, not in-browser execution.

### 7.2 Code keys on schema leaves
- Optional stable **code key** per param / nested slot, separate from short label and description  
  Examples: `employerChanged`, `salaryInRms`, `showBankUpdate`, `dd.retention`
- Keys are the API surface; labels may change for BA clarity without breaking eng (or warn on key rename)
- Registry / lint: missing keys before “eng export”; duplicate keys forbidden; optional naming convention check

### 7.3 Resolver contract export
Pure, versionable artifact (JSON and/or TypeScript types + data), roughly:
- Param key catalog (P / M / R, nesting paths, allow-don’t-care)
- Rules: antecedents (y / n / omit-`x`) + consequents (asserted / denied output keys)
- Category / row ids for traceability back to the matrix
- **Conflict report** included (or export blocked while blocking conflicts remain—product choice)
- Document evaluation semantics: don’t-care overlap, category scope, first-match vs collect-all (prefer **collect matching consequents** + conflict = eng bug)

Target consumer shape:

```text
evaluate(facts: Record<InputKey, boolean>): Set<OutputKey>
// or ordered list of effect keys — still pure, no I/O
```

Runtime, side effects, and “call this method” stay in the host app: map `OutputKey` → method in *their* code.

### 7.4 Golden tests for eng
- Generate fixtures from rows / witness scenarios: facts → expected output keys
- Conflicts become failing tests or explicit “must not ship” fixtures
- This sells developers harder than a UI demo

### 7.5 What not to build here
- Method names with arguments, scripting in cells, async pipelines
- Claiming production execution from the browser matrix without versioning + tests
- Free-text “method” fields with no key registry

### 7.6 Relation to existing logical scheme
- Today’s logical scheme is a readable implication dump (`generateLogicScheme`)
- Resolver contract is the **structured, key-based sibling**: same semantics, machine-usable
- Plain-language summaries (section 2) remain for humans; keys remain for code

---

## 8. Explicitly defer (for now)

Avoid until the review loop is excellent:

- **In-app / hosted production rules runtime** that invokes application methods
- Heavy DMN / BPMN interchange as a primary goal
- AI that invents rows without a human review workflow
- Multi-tenant enterprise suite (SSO, RBAC, audit at scale) before core stickiness
- Competing as “universal business-rules SaaS”

Prefer instead (when ready): **code keys + resolver contract + golden tests** (section 7).

AI *assist* (summarize row, suggest conflict fix, draft glossary, suggest keys) is welcome **after** plain-language and conflict cards exist—and always as suggestions under user control.

---

## 9. Implementation notes (when building)

Reuse existing domain concepts where possible:

| Concept | Today | Feature hooks |
| --- | --- | --- |
| Category numbers | `computeCategoryNumbers` | Conflict cards, exports, tickets |
| Logical scheme | `generateLogicScheme` | Spec pack, plain-language sibling; precursor to contract |
| Conflicts | `findConflicts` + overlap/`x` | Example cases, severity, resolve assist, eng export gate |
| Merge | `simplifyMatrix` (same category, equal R) | Lint “merge candidate”; not auto in workshops |
| Schema labels / allow don’t-care | `ParamSchema` | Glossary, summaries, policy lints; extend with `codeKey` |
| Expand arrays + short labels | Matrix headers / cell captions | Review export fidelity; leaf paths ↔ keys |

Prefer pure functions in `src/domain/` for summaries, witness generation, lints, and **contract serialization** so Resolver UI and exports share one source of truth.

---

## 10. Open questions

- Hosted multiplayer vs local-first + export-only for v1 of “review”?
- Is the first niche pack internal-only, or a public sample?
- Should plain language be editable (source of truth) or always derived from the matrix?
- Blocking conflicts: must they be zero before export “approved,” or only warned?
- Resolver export: block on conflicts, or always emit conflicts as a machine-readable section?
- Evaluation policy for multiple matching rows: union of R keys vs first match vs category priority?
- Who owns code keys when BA renames a label—auto-stable keys, or explicit eng-owned registry?

---

## 11. Next concrete slice (recommendation)

When ready to implement again, start with:

1. **Plain-language summary per row** (domain helper + show in Resolver / optional matrix column).
2. **Conflict example case** (witness assignment + short explanation on each conflict card).

Both unlock workshop value without auth, hosting, or integrations.

When BA review loop feels solid, add:

3. **`codeKey` on schema leaves** + **resolver JSON/TS export** + a couple of **golden-test fixtures**.
