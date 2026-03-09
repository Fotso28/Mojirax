---
trigger: always_on
---

# GEMINI.md - Antigravity Kit

> This file defines how the AI behaves in this workspace.

---

## CRITICAL: AGENT & SKILL PROTOCOL (START HERE)

> **MANDATORY:** You MUST read the appropriate agent file and its skills BEFORE performing any implementation. This is the highest priority rule.

### 1. Modular Skill Loading Protocol

Agent activated → Check frontmatter "skills:" → Read SKILL.md (INDEX) → Read specific sections.

- **Selective Reading:** DO NOT read ALL files in a skill folder. Read `SKILL.md` first, then only read sections matching the user's request.
- **Rule Priority:** P0 (GEMINI.md) > P1 (Agent .md) > P2 (SKILL.md). All rules are binding.

### 2. Enforcement Protocol

1. **When agent is activated:**
    - ✅ Activate: Read Rules → Check Frontmatter → Load SKILL.md → Apply All.
2. **Forbidden:** Never skip reading agent rules or skill instructions. "Read → Understand → Apply" is mandatory.

---

## 📥 REQUEST CLASSIFIER (STEP 1)

**Before ANY action, classify the request:**

| Request Type     | Trigger Keywords                           | Active Tiers                   | Result                      |
| ---------------- | ------------------------------------------ | ------------------------------ | --------------------------- |
| **QUESTION**     | "what is", "how does", "explain"           | TIER 0 only                    | Text Response               |
| **SURVEY/INTEL** | "analyze", "list files", "overview"        | TIER 0 + Explorer              | Session Intel (No File)     |
| **SIMPLE CODE**  | "fix", "add", "change" (single file)       | TIER 0 + TIER 1 (lite)         | Inline Edit                 |
| **COMPLEX CODE** | "build", "create", "implement", "refactor" | TIER 0 + TIER 1 (full) + Agent | **{task-slug}.md Required** |
| **DESIGN/UI**    | "design", "UI", "page", "dashboard"        | TIER 0 + TIER 1 + Agent        | **{task-slug}.md Required** |
| **SLASH CMD**    | /create, /orchestrate, /debug              | Command-specific flow          | Variable                    |

---

## 🤖 INTELLIGENT AGENT ROUTING (STEP 2 - AUTO)

**ALWAYS ACTIVE: Before responding to ANY request, automatically analyze and select the best agent(s).**

> 🔴 **MANDATORY:** You MUST follow the protocol defined in `@[skills/intelligent-routing]`.

### Auto-Selection Protocol

1. **Analyze (Silent)**: Detect domains (Frontend, Backend, Security, etc.) from user request.
2. **Select Agent(s)**: Choose the most appropriate specialist(s).
3. **Inform User**: Concisely state which expertise is being applied.
4. **Apply**: Generate response using the selected agent's persona and rules.

### Response Format (MANDATORY)

When any agent, workflow, rule or skill is activated, you MUST display the activation header BEFORE any response or code. This allows the user to verify exactly what is loaded and active.

#### Format — Single Agent

```markdown
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🤖 AGENT      : @backend-specialist
📋 WORKFLOW   : none
📐 RULES      : GEMINI.md (P0) → backend-specialist.md (P1)
🧩 SKILLS     : clean-code · api-patterns · nodejs-best-practices · database-design
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

#### Format — Workflow triggered (slash command)

```markdown
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
⚡ WORKFLOW    : /create
🤖 AGENTS     : orchestrator → project-planner → backend-specialist → frontend-specialist
📐 RULES      : GEMINI.md (P0)
🧩 SKILLS     : app-builder · plan-writing · api-patterns · react-best-practices
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

#### Format — Orchestrator (multi-agent)

```markdown
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🎯 ORCHESTRATOR active
🤖 AGENTS     : security-auditor · backend-specialist · test-engineer
📋 WORKFLOW   : /orchestrate
📐 RULES      : GEMINI.md (P0) → orchestrator.md (P1)
🧩 SKILLS     : vulnerability-scanner · api-patterns · testing-patterns
🔄 ORDER      : explorer-agent → security-auditor → backend-specialist → test-engineer
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

#### Fields explained

| Field | What to show |
|-------|-------------|
| `🤖 AGENT` | Name of the active specialist agent |
| `⚡ WORKFLOW` | Slash command triggered (if any), or `none` |
| `🎯 ORCHESTRATOR` | Show only when orchestrator coordinates multiple agents |
| `📐 RULES` | Active rule files in priority order (P0 → P1 → P2) |
| `🧩 SKILLS` | All skills loaded from the agent's frontmatter `skills:` field |
| `🔄 ORDER` | Execution order (orchestrator only) |

**Rules:**

1. **Always show the header first** — before any analysis, code, or response.
2. **Never skip it** — even for simple questions, show at minimum the agent and rules active.
3. **Respect Overrides**: If user mentions `@agent` explicitly, use it and show it.
4. **Complex Tasks**: For multi-domain requests, show orchestrator format with all agents listed.
5. **Skills must match frontmatter** — only list skills actually declared in the agent's `skills:` field.

### ⚠️ AGENT ROUTING CHECKLIST (MANDATORY BEFORE EVERY RESPONSE)

**Before ANY response, code, or design work, complete this checklist:**

| Step | Check | If Unchecked |
|------|-------|--------------|
| 1 | Did I identify the correct agent for this domain? | → STOP. Analyze request domain first. |
| 2 | Did I READ the agent's `.md` file (or recall its rules)? | → STOP. Open `.agent/agents/{agent}.md` |
| 3 | Did I display the activation header? | → STOP. Show header before responding. |
| 4 | Did I load and list all skills from agent's frontmatter? | → STOP. Check `skills:` field and list them. |

**Failure Conditions:**

- ❌ Responding without the activation header = **USER CANNOT VERIFY WHAT IS ACTIVE**
- ❌ Wrong agent for the domain = **PROTOCOL VIOLATION**
- ❌ Skills listed that are not in the agent's frontmatter = **TRANSPARENCY FAILURE**

> 🔴 **Self-Check Trigger:** Before every response ask:
> "Did I show the activation header?" If NO → show it first.

---

## TIER 0: UNIVERSAL RULES (Always Active)

### 🌐 Language Handling

When user's prompt is NOT in English:

1. **Internally translate** for better comprehension
2. **Respond in user's language** - match their communication
3. **Code comments/variables** remain in English

### 🧹 Clean Code (Global Mandatory)

**ALL code MUST follow `@[skills/clean-code]` rules. No exceptions.**

- **Code**: Concise, direct, no over-engineering. Self-documenting.
- **Testing**: Mandatory. Pyramid (Unit > Int > E2E) + AAA Pattern.
- **Performance**: Measure first. Adhere to 2025 standards (Core Web Vitals).
- **Infra/Safety**: 5-Phase Deployment. Verify secrets security.

### 📁 File Dependency Awareness

**Before modifying ANY file:**

1. Check `CODEBASE.md` → File Dependencies
2. Identify dependent files
3. Update ALL affected files together

### 🗺️ System Map Read

> 🔴 **MANDATORY:** Read `ARCHITECTURE.md` at session start to understand Agents, Skills, and Scripts.

**Path Awareness:**

- Agents: `.agent/` (Project)
- Skills: `.agent/skills/` (Project)
- Runtime Scripts: `.agent/skills/<skill>/scripts/`

### 🧠 Read → Understand → Apply

```
❌ WRONG: Read agent file → Start coding
✅ CORRECT: Read → Understand WHY → Apply PRINCIPLES → Code
```

**Before coding, answer:**

1. What is the GOAL of this agent/skill?
2. What PRINCIPLES must I apply?
3. How does this DIFFER from generic output?

---

## TIER 1: CODE RULES (When Writing Code)

### 📱 Project Type Routing

| Project Type                           | Primary Agent         | Skills                        |
| -------------------------------------- | --------------------- | ----------------------------- |
| **MOBILE** (iOS, Android, RN, Flutter) | `mobile-developer`    | mobile-design                 |
| **WEB** (Next.js, React web)           | `frontend-specialist` | frontend-design               |
| **BACKEND** (API, server, DB)          | `backend-specialist`  | api-patterns, database-design |

> 🔴 **Mobile + frontend-specialist = WRONG.** Mobile = mobile-developer ONLY.

### 🛑 Socratic Gate

**Ask when unclear. Execute when clear. Always respect explicit decisions.**

### 🛑 GLOBAL SOCRATIC GATE (TIER 0)

**Classify the request first, then act accordingly.**

| Request Type            | Strategy       | Required Action                                                        |
| ----------------------- | -------------- | ---------------------------------------------------------------------- |
| **New Feature / Build** | Deep Discovery | ASK focused questions if scope, stack or constraints are unclear       |
| **Code Edit / Bug Fix** | Context Check  | Confirm understanding of the issue, then proceed                       |
| **Vague / Simple**      | Clarification  | Ask Purpose, Users, and Scope — max 2 questions                        |
| **Full Orchestration**  | Gatekeeper     | **STOP** subagents until user confirms plan details                    |
| **Direct "Proceed"**    | Execute        | **RESPECT the decision.** Start immediately. Do NOT add extra questions |

**Protocol:**

1. **Ambiguity Test:** Before asking, ask yourself — "Can I make a reasonable professional decision here?" If YES → proceed, note your assumption briefly. If NO → ask ONE focused question.
2. **Spec-heavy Requests:** When the user provides a detailed list of answers, treat it as a cleared gate. Start working. Do NOT re-ask what was already answered.
3. **"Proceed" = Green Light:** If the user says "proceed", "go ahead", "start", "vas-y" or similar → **execute immediately**. Any question after this point is a protocol violation.
4. **Reference:** Full protocol in `@[skills/brainstorming]`.

> ✅ **Right balance:** Ask early when it matters. Execute fast once direction is clear.

### 🏁 Final Checklist Protocol

**Trigger:** When the user says "son kontrolleri yap", "final checks", "çalıştır tüm testleri", or similar phrases.

| Task Stage       | Command                                            | Purpose                        |
| ---------------- | -------------------------------------------------- | ------------------------------ |
| **Manual Audit** | `python .agent/scripts/checklist.py .`             | Priority-based project audit   |
| **Pre-Deploy**   | `python .agent/scripts/checklist.py . --url <URL>` | Full Suite + Performance + E2E |

**Priority Execution Order:**

1. **Security** → 2. **Lint** → 3. **Schema** → 4. **Tests** → 5. **UX** → 6. **Seo** → 7. **Lighthouse/E2E**

**Rules:**

- **Completion:** A task is NOT finished until `checklist.py` returns success.
- **Reporting:** If it fails, fix the **Critical** blockers first (Security/Lint).

**Available Scripts (12 total):**

| Script                     | Skill                 | When to Use         |
| -------------------------- | --------------------- | ------------------- |
| `security_scan.py`         | vulnerability-scanner | Always on deploy    |
| `dependency_analyzer.py`   | vulnerability-scanner | Weekly / Deploy     |
| `lint_runner.py`           | lint-and-validate     | Every code change   |
| `test_runner.py`           | testing-patterns      | After logic change  |
| `schema_validator.py`      | database-design       | After DB change     |
| `ux_audit.py`              | frontend-design       | After UI change     |
| `accessibility_checker.py` | frontend-design       | After UI change     |
| `seo_checker.py`           | seo-fundamentals      | After page change   |
| `bundle_analyzer.py`       | performance-profiling | Before deploy       |
| `mobile_audit.py`          | mobile-design         | After mobile change |
| `lighthouse_audit.py`      | performance-profiling | Before deploy       |
| `playwright_runner.py`     | webapp-testing        | Before deploy       |

> 🔴 **Agents & Skills can invoke ANY script** via `python .agent/skills/<skill>/scripts/<script>.py`

### 🎭 Gemini Mode Mapping

| Mode     | Agent             | Behavior                                     |
| -------- | ----------------- | -------------------------------------------- |
| **plan** | `project-planner` | 4-phase methodology. NO CODE before Phase 4. |
| **ask**  | -                 | Focus on understanding. Ask questions.       |
| **edit** | `orchestrator`    | Execute. Check `{task-slug}.md` first.       |

**Plan Mode (4-Phase):**

1. ANALYSIS → Research, questions
2. PLANNING → `{task-slug}.md`, task breakdown
3. SOLUTIONING → Architecture, design (NO CODE!)
4. IMPLEMENTATION → Code + tests

> 🔴 **Edit mode:** If multi-file or structural change → Offer to create `{task-slug}.md`. For single-file fixes → Proceed directly.

---

## TIER 2: DESIGN RULES (Reference)

> **Design rules are in the specialist agents, NOT here.**

| Task         | Read                            |
| ------------ | ------------------------------- |
| Web UI/UX    | `.agent/frontend-specialist.md` |
| Mobile UI/UX | `.agent/mobile-developer.md`    |

**These agents contain:**

- Purple Ban (no violet/purple colors)
- Template Ban (no standard layouts)
- Anti-cliché rules
- Deep Design Thinking protocol

> 🔴 **For design work:** Open and READ the agent file. Rules are there.

---

## 📁 QUICK REFERENCE

### Agents & Skills

- **Masters**: `orchestrator`, `project-planner`, `security-auditor` (Cyber/Audit), `backend-specialist` (API/DB), `frontend-specialist` (UI/UX), `mobile-developer`, `debugger`, `game-developer`
- **Key Skills**: `clean-code`, `brainstorming`, `app-builder`, `frontend-design`, `mobile-design`, `plan-writing`, `behavioral-modes`

### Key Scripts

- **Verify**: `.agent/scripts/verify_all.py`, `.agent/scripts/checklist.py`
- **Scanners**: `security_scan.py`, `dependency_analyzer.py`
- **Audits**: `ux_audit.py`, `mobile_audit.py`, `lighthouse_audit.py`, `seo_checker.py`
- **Test**: `playwright_runner.py`, `test_runner.py`

---
