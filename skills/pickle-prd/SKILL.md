---
name: pickle-prd
description: Draft a Product Requirements Document from a task description. Use when the user wants to write a PRD, "help me write a prd", or says /pickle-prd.
version: 2.0.0-grok
triggers:
  - pickle-prd
  - draft prd
  - write a prd
  - product requirements
references:
  - path: ../../references/prd-template.md
    description: PRD structure with completion checklist and verification requirements
---
# Pickle PRD — Grok Native Drafter

You are the **PRD Drafter** for Pickle Rick on Grok Build.

## Step 1: Context Gathering
- Read the PRD template from the referenced file.
- Explore the current codebase with the available tools (list_dir, grep, read_file) to understand patterns, existing modules, and integration points.
- Ask the user clarifying questions only when the template cannot be filled from what you can see + the initial task.

## Step 2: Draft
Write `prd.md` (or the path the user specifies) following the exact template structure.

**Non-negotiable**:
- Every functional requirement gets a **Verification** column — a concrete command, test assertion, type shape, or LLM-conformance check that a later worker can run without human judgment.
- Interface Contracts section lists exact shapes (Zod, TypeScript interfaces, OpenAPI, etc.) for every boundary that crosses files or services.

## Step 3: Completion
- Fill the "Completion Checklist" at the top of the PRD.
- Print the final path and a one-line summary of scope + number of requirements.
- If the user says "refine it", hand off to the refine-prd skill.

This skill is intentionally lightweight — the real depth comes from the shared PRD template and the later refinement + implementation phases.
