---
title: Attestation
description: Cryptographic attestation subsystem, XRPL witness proofs, self-verifying narratives, and deterministic replay.
sidebar:
  order: 5
---

The attestation subsystem provides cryptographic witness proofs that anchor governance decisions to verifiable on-chain records. This page covers attestation intents, the XRPL witness backend, self-verifying narrative reports, and deterministic replay.

## Attestation intents

An attestation intent is a content-addressed request to witness a specific governance outcome. Intents bind a subject (like a decision) to a cryptographic digest and a set of claims.

```python
from nexus_attest.attestation import AttestationIntent

intent = AttestationIntent(
    subject_type="decision",
    binding_digest="sha256:abc123...",
    env="production",
    claims={"decision_id": "...", "outcome": "approved"},
)
```

### Intent fields

| Field | Description |
|-------|-------------|
| `subject_type` | What is being attested (e.g., `"decision"`) |
| `binding_digest` | SHA-256 digest of the subject's audit package |
| `env` | Environment label (`"production"`, `"staging"`, etc.) |
| `claims` | Key-value pairs with attestation-specific data |

Intents are content-addressed --- the same input always produces the same intent digest. This allows deduplication and idempotent submission.

## Audit package structure

The audit package is the core attestation artifact. It cryptographically binds three components:

| Component | What it captures |
|-----------|-----------------|
| **Control bundle** | Decision, policy, approvals, and constraints (what was allowed) |
| **Router section** | Execution identity --- `run_id` and `router_digest` (what actually ran) |
| **Control-router link** | Why this specific execution was authorized by this specific decision |

The `binding_digest` is a SHA-256 hash over all three. Changing any component invalidates the digest.

### Verification checks

Verification runs six independent checks with no short-circuiting --- every issue is reported:

| Check | What it verifies |
|-------|-----------------|
| `binding_digest` | Recompute binding from binding fields |
| `control_bundle_digest` | Recompute from control bundle content |
| `binding_control_match` | Binding matches control bundle |
| `binding_router_match` | Binding matches router section |
| `binding_link_match` | Binding matches control-router link |
| `router_digest` | Embedded router bundle integrity (if applicable) |

```python
from nexus_attest import verify_audit_package

verification = verify_audit_package(package)
assert verification.ok  # True only if all 6 checks pass
```

## XRPL witness backend

For third-party verifiability, attestation intents can be anchored to the XRP Ledger. The XRPL witness backend submits attestation transactions that create an immutable, publicly queryable record of the governance decision.

### Architecture

| Component | Purpose |
|-----------|---------|
| `XRPLAdapter` | Submits attestation transactions to XRPL |
| `JsonRpcClient` | Communicates with XRPL nodes via JSON-RPC |
| `ExchangeStore` | Tracks request/response evidence for audit |
| `MemoCodec` | Encodes/decodes attestation payloads in XRPL memo fields |
| `XRPLSigner` | Signs transactions with the attestation wallet |

### How it works

1. An attestation intent is created from an audit package
2. The intent is encoded into XRPL memo fields via `MemoCodec`
3. `XRPLSigner` signs the transaction
4. `XRPLAdapter` submits to the ledger via `JsonRpcClient`
5. `ExchangeStore` records the request/response pair as evidence
6. The transaction hash becomes a publicly verifiable witness proof

The resulting transaction ID can be looked up on any XRPL explorer to independently verify that the attestation was recorded at a specific ledger sequence and timestamp.

### Exchange evidence

The `ExchangeStore` maintains a complete record of all XRPL interactions:

- The outgoing transaction payload (what was submitted)
- The XRPL response (acceptance, rejection, or error)
- Timestamps for both request and response
- The relationship between the exchange and the attestation intent

This evidence chain ensures that the attestation process itself is auditable.

## Self-verifying narratives

Narrative reports are human-readable audit documents with embedded integrity checks. They transform raw attestation data into a structured report that a compliance officer or auditor can read and verify.

```python
from nexus_attest.attestation.narrative import build_narrative

report = build_narrative(
    queue=attestation_queue,
    intent_digest="sha256:...",
    include_bodies=True,
)
```

### Report contents

A `NarrativeReport` includes:

- **Receipt timeline** --- chronological record of attestation receipts
- **Integrity checks** --- each marked as `PASS`, `FAIL`, or `SKIP` with reasoning
- **XRPL witness data** --- transaction IDs, ledger sequences, and memo payloads
- **Subject binding** --- how the attestation links back to the governance decision

The `include_bodies=True` option embeds the full receipt payloads for self-contained verification. Without it, only digests and references are included.

## Attestation replay

Deterministic replay reconstructs the attestation timeline from the event log and verifies each step:

```python
from nexus_attest.attestation.replay import replay_attestation

report = replay_attestation(queue, intent_digest)
```

### Replay report

The `AttestationReport` contains:

- **Receipt summaries** --- compact view of each attestation receipt
- **Confirmation status** --- whether the XRPL transaction was confirmed
- **Exchange evidence** --- the raw request/response data from XRPL interactions
- **Timeline consistency** --- verification that events occurred in valid sequence

Replay is deterministic: given the same attestation queue and intent digest, you always get the same report. This allows independent parties to verify the attestation timeline without trusting the original system.

## Attestation queue and worker

The attestation subsystem uses a queue-and-worker architecture for reliable processing:

- **Queue** --- manages pending attestation intents with ordering guarantees
- **Worker** --- processes intents from the queue, submitting to the XRPL backend
- **Storage** --- persists attestation state independently from the decision event store

The worker runs in the background, retrying failed submissions and recording evidence for each attempt. This design ensures that XRPL network issues do not block the governance workflow --- the decision proceeds, and attestation follows asynchronously.

## FlexiFlow integration

The `flexiflow_adapter` module bridges the attestation subsystem with FlexiFlow pipelines, enabling attestation to be embedded as a step in larger automation workflows.
