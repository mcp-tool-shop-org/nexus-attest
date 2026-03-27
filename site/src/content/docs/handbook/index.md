---
title: Nexus Attest Handbook
description: Complete guide to governance, attestation, and cryptographic audit packages for MCP tool execution.
sidebar:
  order: 0
---

Welcome to the **Nexus Attest** handbook. This guide covers everything you need to add a governance layer to your MCP tool execution pipeline --- from first install to cryptographic audit proofs anchored on the XRP Ledger.

## What is Nexus Attest?

Nexus Attest is a deterministic attestation system that adds structured governance to MCP tool execution. Where nexus-router executes immediately, Nexus Attest inserts a full Request / Review / Approve / Execute workflow with N-of-M approvals before anything runs.

Every decision produces a cryptographic audit package that binds what was allowed (governance) to what actually happened (execution). These packages are exportable, verifiable, and replayable. There is no mutable state and no hidden writes.

## What you get

- **Governance workflows** --- N-of-M approval gates with policy enforcement before execution
- **Cryptographic audit packages** --- SHA-256 binding digests that tie decisions to outcomes
- **XRPL witness proofs** --- on-chain attestation for third-party verifiability
- **Policy templates** --- reusable, immutable approval patterns
- **Event sourcing** --- every state is derived by replaying an immutable append-only log
- **11 MCP tools** --- full governance surface exposed via the Model Context Protocol
- **Portable bundles** --- export and import decisions across systems with integrity verification

## Handbook contents

| Page | What it covers |
|------|---------------|
| [Getting Started](/nexus-attest/handbook/getting-started/) | Installation, first request, first verification |
| [Concepts](/nexus-attest/handbook/concepts/) | Governance flow, decision lifecycle, event sourcing, policy model |
| [MCP Tools](/nexus-attest/handbook/mcp-tools/) | All 11 tools with parameters and usage examples |
| [Templates & Bundles](/nexus-attest/handbook/templates-bundles/) | Decision templates, export/import, conflict modes |
| [Attestation](/nexus-attest/handbook/attestation/) | Cryptographic proofs, XRPL anchoring, narrative reports, replay |
| [Reference](/nexus-attest/handbook/reference/) | Data model, exit codes, project structure, security |
| [Beginners](/nexus-attest/handbook/beginners/) | Gentle introduction for newcomers with step-by-step examples |

## Requirements

- Python 3.11 or later
- `pip install nexus-attest`
- For XRPL attestation: network access to an XRPL node (testnet or mainnet)

## Design philosophy

Nexus Attest follows three core principles:

1. **Determinism** --- given the same event log, you always get the same state. No side effects, no non-deterministic reads during replay.
2. **Verifiability** --- every audit package can be independently verified. All six integrity checks run regardless of failures so every issue is reported.
3. **Portability** --- decisions can be exported as canonical JSON bundles and imported into other systems with full integrity verification.
