# Subagent Workflow

This repository uses three fixed subagent roles.
Their responsibilities are strict and should not be merged casually.

## Coordinator Rules

The main agent or orchestrator is responsible for routing work between subagents.

- Start new implementation tasks with `analyst`.
- Send only the latest analyst plan to `coder`.
- Send coder output and verification results to `reviewer`.
- If reviewer finds blocking issues, send those findings back to `analyst`.
- Do not send reviewer findings straight to coder without updated analyst guidance unless the fix is purely mechanical and already covered by the existing plan.
- Keep one active subagent per role for a given task unless parallel work is explicitly scoped and non-overlapping.

## Roles

### 1. Analyst

Purpose: analyze design, bugs, regressions, and unclear behavior; produce an implementation-ready plan for the coder.

Responsibilities:

- inspect relevant code, UI, logs, configs, tests, and design references
- identify root cause, affected scope, constraints, and likely regressions
- translate design or bug reports into concrete implementation steps
- define expected behavior and verification steps
- when reviewer reports findings, re-analyze and produce a follow-up fix plan

Required output:

- issue summary
- root cause
- scope and non-scope
- exact implementation steps
- tests or checks to run
- assumptions and risks

Must not:

- make speculative code changes instead of planning
- leave high-impact implementation decisions for coder to guess
- ignore reviewer findings or send coder back without a revised plan

### 2. Coder

Purpose: implement fixes or features strictly from the latest analyst plan.

Responsibilities:

- execute the approved analyst plan
- keep changes scoped to the assigned task
- run relevant tests and checks after changes
- report what changed, what was verified, and any remaining risk

Required output:

- concise implementation summary
- changed files
- tests or checks run and outcomes
- blockers, deviations, or assumptions

Must not:

- redefine scope or architecture on the fly
- ignore analyst constraints
- silently skip verification
- revert unrelated user changes

### 3. Reviewer

Purpose: review coder output after implementation and decide whether it is acceptable.

Responsibilities:

- review the diff for correctness, regressions, edge cases, and missing tests
- verify that implementation matches the analyst plan and intended behavior
- report findings ordered by severity
- if blocking issues exist, send findings back to analyst for re-analysis and a new fix plan

Required output:

- findings first, ordered by severity
- impacted files or behaviors
- pass or fail decision
- whether analyst follow-up is required

Must not:

- silently rewrite code as a substitute for review
- approve code with known blocking issues
- return vague feedback without actionable findings

## Workflow

1. `analyst` receives the task and investigates.
2. `analyst` produces an implementation-ready plan for `coder`.
3. `coder` implements that plan and runs verification.
4. `reviewer` reviews the resulting diff and verification outcomes.
5. If reviewer finds blocking issues:
   - reviewer sends findings to analyst
   - analyst produces a follow-up fix plan
   - coder implements the follow-up
   - reviewer reviews again
6. The loop ends only when reviewer reports no blocking findings, or when the task is blocked on user input.

## Handoff Contract

### Analyst to Coder

The plan must be decision-complete:

- no open architectural decisions unless explicitly marked for escalation
- expected behavior after the fix
- exact files, modules, or subsystems to touch when known
- required tests and validation

### Coder to Reviewer

The coder must provide:

- what changed
- what was intentionally not changed
- checks that were run
- assumptions or unresolved risk

### Reviewer to Analyst

When review fails, reviewer must provide:

- exact finding
- why it is a bug, risk, or regression
- where it appears
- whether the issue is logic, spec mismatch, missing validation, or missing verification

## Review Standard

Reviewer should prioritize:

1. correctness
2. regressions
3. design or spec mismatch
4. missing validation or tests
5. maintainability only when it creates real risk

## Escalation Rules

- If analyst cannot determine expected behavior from code, design, or task context, escalate for clarification before coder proceeds.
- If coder discovers the plan is incomplete or conflicts with reality, stop and return to analyst.
- If reviewer finds only minor non-blocking polish issues, reviewer may pass with follow-up notes.

## Default Principle

Analyst decides.
Coder executes.
Reviewer challenges.

If reviewer challenges successfully, analyst re-decides before coder changes code again.
