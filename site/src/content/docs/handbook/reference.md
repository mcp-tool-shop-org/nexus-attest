---
title: Reference
description: Data model, event types, exit codes, project structure, security scope, and development guide for Nexus Attest.
sidebar:
  order: 6
---

This page provides the technical reference for Nexus Attest: the data model, event types, exit codes, project structure, security scope, and development setup.

## Data model

### Event-sourced storage

All state in Nexus Attest is stored as an append-only event log in SQLite. The database has two core tables:

**decisions** --- header records for each governed action:
- `decision_id` (primary key)
- `goal`, `creator`, `created_at`
- Policy reference and template reference (if applicable)

**decision_events** --- the immutable event log:
- `event_id` (primary key)
- `decision_id` (foreign key)
- `seq` (monotonically increasing within a decision)
- `event_type`, `actor`, `timestamp`, `payload`

State (status, approval count, blocking reasons) is never stored directly --- it is always computed by replaying the event log for a given decision.

### Event types

| Event | When it occurs |
|-------|---------------|
| `DECISION_CREATED` | A new request is submitted |
| `POLICY_ATTACHED` | Policy constraints are bound to the decision |
| `APPROVAL_GRANTED` | An actor approves the decision |
| `APPROVAL_REVOKED` | An actor revokes their prior approval |
| `EXECUTION_REQUESTED` | Execution is requested (after approval threshold met) |
| `EXECUTION_STARTED` | nexus-router begins executing |
| `EXECUTION_COMPLETED` | Execution finishes successfully |
| `EXECUTION_FAILED` | Execution fails with error details |

### Policy model

```python
Policy(
    min_approvals=2,
    allowed_modes=["dry_run", "apply"],
    require_adapter_capabilities=["timeout"],
    max_steps=50,
    labels=["prod", "finance"],
)
```

| Field | Type | Description |
|-------|------|-------------|
| `min_approvals` | integer | Distinct approvals required for execution |
| `allowed_modes` | string[] | Permitted execution modes |
| `require_adapter_capabilities` | string[] | Capabilities the adapter must support |
| `max_steps` | integer | Maximum steps in the execution plan |
| `labels` | string[] | Tags for filtering and template matching |

### Approval model

- Counted by distinct `actor.id`
- Optional `comment` for rationale
- Optional `expires_at` (ISO 8601) for time-limited approvals
- Revocable before execution begins
- Re-validated at execution time (expired/revoked approvals are excluded)

### Router modes

| Mode | Content | Use case |
|------|---------|----------|
| **Reference** (default) | `run_id` + `router_digest` | CI, internal systems |
| **Embedded** | Full router bundle + cross-check | Regulators, long-term archival |

Both modes produce the same `binding_digest` at the audit package level.

## Exit codes

| Code | Meaning |
|------|---------|
| `0` | All checks passed |
| `1` | Unhandled error |
| `2` | Validation or schema error |

## Project structure

```
nexus-attest/
|-- nexus_attest/              35 modules (published package)
|   |-- __init__.py            Public API + version
|   |-- tool.py                MCP tool entrypoints (11 tools)
|   |-- store.py               SQLite event store
|   |-- events.py              Event type definitions
|   |-- policy.py              Policy validation + router compilation
|   |-- decision.py            State machine + replay
|   |-- lifecycle.py           Blocking reasons, timeline, progress
|   |-- template.py            Named immutable policy templates
|   |-- export.py              Decision bundle export
|   |-- import_.py             Bundle import with conflict modes
|   |-- bundle.py              Bundle types + digest computation
|   |-- audit_package.py       Audit package types + verification
|   |-- audit_export.py        Audit package export + rendering
|   |-- canonical_json.py      Deterministic serialization
|   |-- integrity.py           SHA-256 helpers
|   +-- attestation/           Cryptographic attestation subsystem
|       |-- intent.py          Attestation intents
|       |-- receipt.py         Receipts with error taxonomy
|       |-- narrative.py       Self-verifying narrative reports
|       |-- replay.py          Deterministic attestation replay
|       |-- queue.py           Attestation queue management
|       |-- worker.py          Background attestation worker
|       |-- storage.py         Attestation storage layer
|       |-- flexiflow_adapter.py  FlexiFlow integration
|       +-- xrpl/              XRPL witness backend
|           |-- adapter.py     XRPL attestation adapter
|           |-- client.py      XRPL client
|           |-- jsonrpc_client.py  JSON-RPC transport
|           |-- exchange_store.py  Request/response evidence
|           |-- memo.py        Memo encoding/decoding
|           |-- signer.py      Transaction signing
|           |-- transport.py   Network transport
|           +-- tx.py          Transaction construction
|
|-- nexus_control/             35 modules (internal engine)
|-- tests/                     24 test files, 635 tests
|-- schemas/                   JSON schemas for tool inputs
|-- ARCHITECTURE.md            Mental model + design guarantees
|-- QUICKSTART.md              5-minute operational guide
+-- pyproject.toml
```

### Module responsibilities

**Core governance:**
- `tool.py` --- MCP tool entrypoints; routes tool calls to the appropriate module
- `store.py` --- SQLite event store with append-only guarantees
- `events.py` --- event type definitions and serialization
- `decision.py` --- state machine that replays events to compute current state
- `policy.py` --- policy validation and router compilation
- `lifecycle.py` --- blocking reasons, timeline computation, progress tracking
- `template.py` --- named, immutable policy template CRUD

**Portability:**
- `export.py` --- decision bundle export with canonical JSON
- `import_.py` --- bundle import with conflict modes and replay validation
- `bundle.py` --- bundle types and digest computation
- `canonical_json.py` --- deterministic JSON serialization (stable key ordering)

**Attestation:**
- `audit_package.py` --- audit package types and verification (6 checks)
- `audit_export.py` --- audit package export and rendering
- `integrity.py` --- SHA-256 digest computation helpers
- `attestation/` --- the full cryptographic attestation subsystem (see [Attestation](/nexus-attest/handbook/attestation/))

## Security and data scope

| Aspect | Detail |
|--------|--------|
| **Data touched** | Attestation records (Ed25519 signatures, decision hashes), event logs |
| **Data NOT touched** | No telemetry, no analytics, no user data, no credential storage |
| **Permissions** | Read: tool execution metadata. Write: signed attestation records |
| **Network** | HTTPS for attestation submission (via httpx). No listeners |
| **Telemetry** | None collected or sent |

Nexus Attest does not store credentials. XRPL wallet keys are managed externally and passed to the signer at runtime. No secrets are persisted in the event store or attestation storage.

See [SECURITY.md](https://github.com/mcp-tool-shop-org/nexus-attest/blob/main/SECURITY.md) for vulnerability reporting.

## Development

### Setup

```bash
# Clone the repo
git clone https://github.com/mcp-tool-shop-org/nexus-attest.git
cd nexus-attest

# Install with dev dependencies
pip install -e ".[dev]"
```

### Testing

```bash
# Run the full test suite (632 tests)
pytest

# Run with verbose output
pytest -v

# Run a specific test file
pytest tests/test_attestation.py
```

### Type checking and linting

```bash
# Type check (basic mode, source packages)
pyright nexus_attest nexus_control

# Lint
ruff check .

# Format
ruff format .
```

### Test coverage

The test suite covers:
- 22 test files with 632 tests
- Core governance flow (request, approve, execute)
- Policy validation and constraint enforcement
- Event sourcing replay determinism
- Bundle export/import with all conflict modes
- Audit package creation and all 6 verification checks
- Template CRUD and override mechanics
- Attestation intent creation and content addressing
- XRPL transaction construction and memo encoding
