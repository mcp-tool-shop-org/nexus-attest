---
title: Core Concepts
description: Governance flow, decision lifecycle, event-sourced design, policy model, and approval mechanics in Nexus Attest.
sidebar:
  order: 2
---

This page explains the foundational concepts behind Nexus Attest: how governance flows work, how decisions progress through their lifecycle, and how the event-sourced design guarantees deterministic replay.

## Governance flow

Every governed action follows the same pipeline:

```
Request --> Policy --> Approvals (N-of-M) --> Execute --> Audit Package
   |           |              |                    |              |
   v           v              v                    v              v
 Decision   Constraints   Actor trail        nexus-router    Binding digest
 created    attached      recorded           run_id linked   (tamper-evident)
```

1. **Request** --- an actor declares intent (goal, mode, labels)
2. **Policy** --- constraints are attached (min approvals, allowed modes, adapter capabilities, max steps)
3. **Approvals** --- distinct actors approve until the threshold is met
4. **Execute** --- the request is dispatched through nexus-router, producing a `run_id`
5. **Audit Package** --- a cryptographic digest binds governance decisions to execution outcomes

No step can be skipped. The pipeline enforces that execution only happens after governance requirements are satisfied.

## Event-sourced design

All state in Nexus Attest is derived by replaying an immutable event log. There is no mutable state --- if you replay the same events, you get the same result.

```
decisions (header)
  +-- decision_events (append-only log)
        |-- DECISION_CREATED
        |-- POLICY_ATTACHED
        |-- APPROVAL_GRANTED
        |-- APPROVAL_REVOKED
        |-- EXECUTION_REQUESTED
        |-- EXECUTION_STARTED
        |-- EXECUTION_COMPLETED
        +-- EXECUTION_FAILED
```

### Why event sourcing?

- **Auditability** --- the event log is the source of truth. You can always answer "what happened and when."
- **Determinism** --- replaying events always produces the same state. No side effects during replay.
- **Debugging** --- you can replay events up to any point to inspect intermediate states.
- **Portability** --- export the event log and replay it elsewhere for cross-system verification.

### Event guarantees

- Events are append-only. Once written, they are never modified or deleted.
- Each event has a monotonically increasing sequence number within its decision.
- The event log for a decision is the canonical record. All computed state (status, approval count, timeline) is derived from it.

## Decision lifecycle

The lifecycle module computes the current state of a decision from its event log, including blocking reasons and a human-readable timeline.

```python
from nexus_attest import compute_lifecycle

lifecycle = compute_lifecycle(decision, events, policy)
```

### Blocking reasons

Blocking reasons are returned in triage-ladder order --- the most critical blocker is listed first:

```python
for reason in lifecycle.blocking_reasons:
    print(f"{reason.code}: {reason.message}")
```

Common blocking reasons include:
- Insufficient approvals (need N, have M)
- Policy constraint violations (disallowed mode, missing adapter capabilities)
- Expired approvals

### Timeline

The timeline provides a chronological record of all state transitions:

```python
for entry in lifecycle.timeline:
    print(f"  {entry.seq}  {entry.label}")
```

Timeline entries support truncation for large histories, keeping the display manageable while preserving the complete event record.

## Policy model

Policies define the constraints that must be satisfied before execution is allowed:

```python
Policy(
    min_approvals=2,
    allowed_modes=["dry_run", "apply"],
    require_adapter_capabilities=["timeout"],
    max_steps=50,
    labels=["prod", "finance"],
)
```

| Field | Description |
|-------|-------------|
| `min_approvals` | Number of distinct actor approvals required |
| `allowed_modes` | Which execution modes are permitted (`dry_run`, `apply`) |
| `require_adapter_capabilities` | Capabilities the router adapter must support |
| `max_steps` | Maximum execution steps allowed |
| `labels` | Tags for filtering and template matching |

Policies are validated at **execution time**, not just at approval time. If an approval expires or is revoked between approval and execution, the policy check catches it.

## Approval model

Approvals are the core gatekeeping mechanism:

- **Counted by distinct `actor.id`** --- the same person cannot approve twice
- **Optional comment** --- approvers can explain their rationale
- **Optional expiry** --- `expires_at` sets a deadline after which the approval no longer counts
- **Revocable** --- approvals can be revoked any time before execution begins
- **Checked at execution time** --- the system re-validates that enough valid, non-expired approvals exist when execution is requested

This design prevents stale approvals from authorizing execution long after the original decision was made.

## Actor types

Actors represent the entities that interact with decisions:

```python
from nexus_attest.events import Actor

human = Actor(type="human", id="alice@example.com")
system = Actor(type="system", id="scheduler")
```

The `type` field distinguishes human operators from automated systems. The `id` field is the unique identifier used for approval counting and audit trail attribution.

## Router modes

When execution results are recorded in an audit package, they can be stored in two modes:

| Mode | Contains | Best for |
|------|----------|----------|
| **Reference** (default) | `run_id` + `router_digest` | CI pipelines, internal systems |
| **Embedded** | Full router bundle + cross-check | Regulators, long-term archival |

Both modes are cryptographically equivalent at the binding layer --- the `binding_digest` covers the same fields regardless of mode. Embedded mode simply includes the full execution data for self-contained verification without needing access to the router system.

## What gets bound

Every audit package cryptographically links three components:

| Component | What it captures |
|-----------|-----------------|
| **Control bundle** | The decision, policy, approvals, and constraints (what was allowed) |
| **Router section** | The execution identity --- `run_id` and `router_digest` (what actually ran) |
| **Control-router link** | Why this specific execution was authorized by this specific decision |

The `binding_digest` is a SHA-256 hash over all three. If any component changes after the fact, the digest breaks and verification fails.
