---
name: mcp-runtime-diagnosis
description: 'Diagnose MCP runtime failures such as tool timeouts, missing environment variables, server startup issues, and broken agent-to-MCP wiring in this repository.'
argument-hint: 'Symptom, failing agent, MCP server, and recent error message'
user-invocable: true
disable-model-invocation: false
---

# MCP Runtime Diagnosis

Use this skill to investigate failures where MCP tools do not respond, servers fail to start, or agents cannot use external tooling.

## When to Use
- MCP tool timeout with no clear stack trace
- Agent can answer general prompts but fails on tool-driven requests
- MCP server scripts fail to start or exit immediately
- Suspected `.env` or configuration mismatch

## Procedure
1. Confirm symptom scope:
   - Which agent failed
   - Which MCP server/tool should be used
   - Exact error text and when it occurs
2. Validate environment prerequisites:
   - Confirm required `.env` variables exist and are non-empty
   - Confirm local executable or dependency paths are valid
3. Validate runtime wiring:
   - Confirm `agents.config.json` entries and role expectations are correct
   - Confirm the executor wiring points to the expected MCP client/tool factories
4. Validate MCP process startup independently:
   - Run the specific `npm run mcp-server/*` script for the target server
   - Capture startup logs and immediate exit reasons
5. Propose a minimal fix and a verification plan.

## Quick Checks Reference
- See [common failures checklist](./references/common-failures.md).

## Expected Output
- Root cause hypothesis (or top 2 candidates)
- Evidence collected
- Minimal patch plan
- Verification commands
