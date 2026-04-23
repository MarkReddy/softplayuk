# 1B Win Room — Program Operating Guide

This repo doubles as the operating home for the **1B Win Room** program: a
marketing and sales performance & growth program aimed at driving the business
toward the £1B goal. Claude should treat requests in this repo as program
management tasks by default (unless the request is clearly about the Next.js
app code).

---

## 1. Program at a glance

- **Name:** 1B Win Room
- **Purpose:** Accelerate marketing and sales performance to hit the £1B target.
- **Scope:** Marketing activity & initiatives, sales activity & pipeline,
  commercial unit performance, board/business reporting, risks, and work stream
  governance.
- **Cadence:** Weekly Win Room working session + monthly board-level readout.

---

## 2. Directory layout for program artefacts

Store and maintain program content under `win-room/`. Create folders on demand.

```
win-room/
  overview.md                   # Program charter, goals, KPIs, target state
  stakeholders.md               # Commercial units, sales teams, sponsors, RACI
  workstreams/
    <stream-slug>.md            # One file per work stream (see template §5)
  reporting/
    marketing-activity/         # Weekly/monthly marketing activity logs
    marketing-progress/         # Progress vs plan per initiative
    sales-activity/             # Sales motions, outreach, meetings booked
    sales-pipeline/             # Pipeline snapshots, stage movement, coverage
    board/                      # Board pack inputs & monthly readouts
    comms/                      # All-hands / business comms drafts & sent log
  risks.md                      # Live risk register (see template §6)
  decisions.md                  # Decision log — what was agreed, when, by whom
  meetings/
    YYYY-MM-DD-<topic>.md       # Meeting notes & actions
  actions.md                    # Rolling action tracker across the program
```

Date-stamp every report file: `YYYY-MM-DD-<short-name>.md`. Newest at the top
of any rolling log.

---

## 3. What Claude should do by default

When I ask program-related questions in this repo:

1. **Find first, then write.** Read the relevant files under `win-room/`
   before drafting anything new. Don't regenerate context I've already
   captured.
2. **Keep formats stable.** Reuse the templates in §5 and §6 so reports are
   comparable week over week.
3. **Surface deltas.** When summarising, lead with what changed vs the prior
   report (pipeline movement, new risks, slipped actions, new initiatives).
4. **Name owners and dates.** Every action, risk, and initiative must have an
   owner and a target date. Flag any that don't.
5. **Stay concise.** Board and exec readers want bullet points, not prose.
   Default to short bullets with numbers.
6. **Preserve the decision log.** If we agree something in chat, append it to
   `win-room/decisions.md` with date, decision, rationale, owner.

---

## 4. Reporting cadences & expected outputs

| Cadence   | Artefact                                    | Audience           | Location                              |
|-----------|---------------------------------------------|--------------------|---------------------------------------|
| Weekly    | Marketing activity log                      | Win Room           | `reporting/marketing-activity/`       |
| Weekly    | Sales activity & pipeline snapshot          | Win Room, CRO      | `reporting/sales-activity/`, `reporting/sales-pipeline/` |
| Weekly    | Work stream updates (RAG + next step)       | Win Room           | `workstreams/<stream>.md`             |
| Bi-weekly | Business-wide comms update                  | Whole business     | `reporting/comms/`                    |
| Monthly   | Marketing progress vs plan                  | Exec, Board        | `reporting/marketing-progress/`       |
| Monthly   | Board pack inputs                           | Board              | `reporting/board/`                    |
| Live      | Risks, actions, decisions                   | Win Room           | `risks.md`, `actions.md`, `decisions.md` |

When I ask for a weekly or monthly report, produce the relevant file in the
right folder using the template, don't just print it to chat.

---

## 5. Work stream template

Each work stream in `win-room/workstreams/<slug>.md`:

```
# Work stream: <name>
Owner: <name, role>
Sponsor: <exec sponsor>
Status: <Green | Amber | Red>
Last updated: YYYY-MM-DD

## Objective
One sentence on what success looks like.

## KPIs
- <metric>: current vs target

## Milestones
- [ ] <milestone> — due YYYY-MM-DD — owner

## This week
- Progress:
- Blockers:
- Next step:

## Dependencies
- <other stream / team / system>

## Risks (link to risks.md IDs)
- R-00x
```

---

## 6. Risk register template

`win-room/risks.md`, newest first:

| ID    | Raised     | Risk                      | Impact | Likelihood | Owner | Mitigation                  | Status |
|-------|------------|---------------------------|--------|------------|-------|-----------------------------|--------|
| R-001 | YYYY-MM-DD | <description>             | H/M/L  | H/M/L      | name  | <action being taken>        | Open / Mitigated / Closed |

---

## 7. Useful prompts (examples)

- "Draft this week's Win Room pack from the latest files in `reporting/`."
- "Summarise pipeline movement vs last week — where did coverage change?"
- "Update `workstreams/<stream>.md` with these notes and roll the status."
- "Add a risk: <description>. Assign to <owner>. Suggest mitigations."
- "Draft the monthly board slide talking points from `reporting/marketing-progress/` and `reporting/sales-pipeline/`."
- "What actions are overdue in `actions.md`?"
- "Draft a business-wide comms update covering the last two weeks."

---

## 8. Stakeholder shorthand

Keep the authoritative list in `win-room/stakeholders.md`. At minimum capture:

- **Commercial units:** name, GM/lead, revenue target, current status.
- **Sales teams:** team, leader, segment/territory, quota, pipeline coverage.
- **Marketing pods:** pod, lead, initiatives they own.
- **Work stream owners:** cross-reference to `workstreams/`.
- **Program sponsors & steering group:** names, roles, meeting cadence.

---

## 9. Tone & style for program outputs

- Executive-ready: short bullets, numbers first, RAG status where relevant.
- No hedging language ("we might maybe consider"). Say what's happening, what's
  next, who owns it.
- Call out slippage explicitly — don't bury it.
- If data is missing, say "unknown — need input from <owner>" rather than
  inventing a number.

---

## 10. Notes on the codebase

The Next.js app in this repo is unrelated to program management content under
`win-room/`. Don't modify app code when I'm asking program questions, and
vice versa. If a request is ambiguous, ask which one I mean.
