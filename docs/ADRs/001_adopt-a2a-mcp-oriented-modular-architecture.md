# ADR 001: Adopt A2A/MCP-Oriented Modular Architecture

## Status
<!-- e.g., Proposed, Accepted, Rejected, Superseded -->
Status: Proposed

## Context
<!-- Describe the background and factors that led to the need for a decision. -->
- The project did not have a well-defined architecture initially.
- A Clean Architecture setup was attempted; however, it did not fit well because this project is not a conventional business application, which is the primary target of Clean Architecture patterns.
- The project will leverage Agent-to-Agent (A2A) patterns and Model Context Protocol (MCP), which encourage modular boundaries and integration via protocol-driven clients.
- We want a structure that embraces agent-centric development while keeping presentation and protocol integrations decoupled enough to evolve.

## Decision
<!-- Clearly state the decision that was made -->
Adopt an A2A/MCP-oriented modular architecture. The project will be structured under `./src/` with at least two top-level concerns: MCP servers and agents (each in their own folders). Each agent will include:

- A presentation layer (name TBD) that is not tightly coupled to A2A presentation specifics.
- A tools/resources access layer (name TBD) where MCP clients will be implemented and managed.

This structure emphasizes agent-centric modularity and protocol-driven integrations while allowing us to evolve naming and layering details as we gain more experience.

## Consequences
<!-- Describe the impact of this decision on the system and the team -->
- Expected positive outcomes:
  - Improved modularity and clearer organization around agents and protocol integrations.
  - Easier evolution of agent capabilities and MCP server integrations.
- Possible trade-offs or drawbacks:
  - Some coupling to A2A and MCP protocols is expected; we will mitigate by keeping boundaries and abstractions explicit.
- Changes in other components or decisions:
  - The current project organization will be substantially refactored to align with the new structure.

## Alternatives Considered
<!-- List and describe considered alternatives and why they were not chosen -->
- Pure Clean Architecture: Rejected because the project follows a new paradigm (agent-centric, protocol-integrated) that does not align well with typical business-domain layering targeted by Clean Architecture.
- Maintain ad-hoc structure: Rejected because it lacks clear modular boundaries and would hinder scaling and integration with MCP and A2A.

## Decision Makers
<!-- List who was involved in making the decision -->
- João Vítor Carvalho
- Valter Camargo

## Date
Date: 2025-09-11

## Attachments
<!-- Links or references to documents, diagrams, or relevant code -->
- None

---
_This ADR follows the template proposed by Michael Nygard in the book "Documenting Architecture Decisions"._


