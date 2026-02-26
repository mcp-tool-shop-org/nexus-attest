<p align="center">
  <a href="README.md">English</a> | <a href="README.ja.md">日本語</a> | <a href="README.zh.md">中文</a> | <a href="README.es.md">Español</a> | <a href="README.fr.md">Français</a> | <a href="README.hi.md">हिन्दी</a> | <a href="README.it.md">Italiano</a> | <a href="README.pt-BR.md">Português (BR)</a>
</p>

<p align="center">
  
            <img src="https://raw.githubusercontent.com/mcp-tool-shop-org/brand/main/logos/nexus-attest/readme.png"
           alt="nexus-attest logo" width="400" />
</p>

<p align="center">
  <a href="https://github.com/mcp-tool-shop-org/nexus-attest/actions/workflows/ci.yml"><img src="https://github.com/mcp-tool-shop-org/nexus-attest/actions/workflows/ci.yml/badge.svg" alt="CI" /></a>
  <a href="https://pypi.org/project/nexus-attest/"><img src="https://img.shields.io/pypi/v/nexus-attest?color=blue" alt="PyPI version" /></a>
  <a href="LICENSE"><img src="https://img.shields.io/badge/license-MIT-black" alt="License" /></a>
  <a href="https://mcp-tool-shop-org.github.io/nexus-attest/"><img src="https://img.shields.io/badge/Landing_Page-live-blue" alt="Landing Page" /></a>
</p>

<h1 align="center">nexus-attest</h1>

<p align="center">
  <strong>Deterministic attestation with verifiable evidence.</strong><br/>
  Part of <a href="https://mcp-tool-shop.github.io/">MCP Tool Shop</a>
</p>

---

## Why

Running MCP tools in production requires approval workflows, audit trails, and policy enforcement. nexus-router executes immediately --- there is no governance layer.

**nexus-attest** adds that layer:

- Request / Review / Approve / Execute workflow with N-of-M approvals
- Cryptographic audit packages that bind governance decisions to execution outcomes
- XRPL-anchored witness proofs for third-party verifiability
- Policy templates for repeatable approval patterns
- Full event sourcing --- every state is derived by replaying an immutable log

Everything is exportable, verifiable, and replayable. No mutable state. No hidden writes.

## Install

```bash
pip install nexus-attest
```

Requires Python 3.11 or later.

## Quick Start

```python
from nexus_attest import NexusControlTools
from nexus_attest.events import Actor

# Initialize (uses in-memory SQLite by default)
tools = NexusControlTools(db_path="decisions.db")

# 1. Create a request
result = tools.request(
    goal="Rotate production API keys",
    actor=Actor(type="human", id="alice@example.com"),
    mode="apply",
    min_approvals=2,
    labels=["prod", "security"],
)
request_id = result.data["request_id"]

# 2. Get approvals (N-of-M)
tools.approve(request_id, actor=Actor(type="human", id="alice@example.com"))
tools.approve(request_id, actor=Actor(type="human", id="bob@example.com"))

# 3. Execute via nexus-router
result = tools.execute(
    request_id=request_id,
    adapter_id="subprocess:mcpt:key-rotation",
    actor=Actor(type="system", id="scheduler"),
    router=your_router,  # RouterProtocol implementation
)

print(f"Run ID: {result.data['run_id']}")

# 4. Export audit package (cryptographic proof)
audit = tools.export_audit_package(request_id)
print(audit.data["digest"])  # sha256:...
```

See [QUICKSTART.md](QUICKSTART.md) for the full walkthrough with policy options, dry-run mode, and timeline views.

## Core Concepts

### Governance Flow

```
Request ──► Policy ──► Approvals (N-of-M) ──► Execute ──► Audit Package
   │           │              │                    │              │
   │           │              │                    │              │
   ▼           ▼              ▼                    ▼              ▼
 Decision   Constraints   Actor trail        nexus-router    Binding digest
 created    attached      recorded           run_id linked   (tamper-evident)
```

### What Gets Bound

Every audit package cryptographically links three things:

| Component | What it captures |
|-----------|-----------------|
| **Control bundle** | The decision, policy, approvals, and constraints (what was allowed) |
| **Router section** | The execution identity --- `run_id` and `router_digest` (what actually ran) |
| **Control-router link** | Why this specific execution was authorized by this specific decision |

The `binding_digest` is a SHA-256 hash over all three. If any component changes, the digest breaks.

### Verification

```python
from nexus_attest import verify_audit_package

verification = verify_audit_package(package)
assert verification.ok  # 6 independent checks, no short-circuiting
```

All six checks run regardless of failures --- every issue is reported:

| Check | What it verifies |
|-------|-----------------|
| `binding_digest` | Recompute from binding fields |
| `control_bundle_digest` | Recompute from control bundle content |
| `binding_control_match` | Binding matches control bundle |
| `binding_router_match` | Binding matches router section |
| `binding_link_match` | Binding matches control-router link |
| `router_digest` | Embedded router bundle integrity (if applicable) |

## MCP Tools

11 tools exposed via the Model Context Protocol:

| Tool | Description |
|------|-------------|
| `nexus-attest.request` | Create an execution request with goal, policy, and approvers |
| `nexus-attest.approve` | Approve a request (supports N-of-M approvals) |
| `nexus-attest.execute` | Execute approved request via nexus-router |
| `nexus-attest.status` | Get request state and linked run status |
| `nexus-attest.inspect` | Read-only introspection with human-readable output |
| `nexus-attest.template.create` | Create a named, immutable policy template |
| `nexus-attest.template.get` | Retrieve a template by name |
| `nexus-attest.template.list` | List all templates with optional label filtering |
| `nexus-attest.export_bundle` | Export a decision as a portable, integrity-verified bundle |
| `nexus-attest.import_bundle` | Import a bundle with conflict modes and replay validation |
| `nexus-attest.export_audit_package` | Export audit package binding governance to execution |

## Decision Templates

Named, immutable policy bundles that can be reused across decisions:

```python
tools.template_create(
    name="prod-deploy",
    actor=Actor(type="human", id="platform-team"),
    min_approvals=2,
    allowed_modes=["dry_run", "apply"],
    require_adapter_capabilities=["timeout"],
    labels=["prod"],
)

# Use template with optional overrides
result = tools.request(
    goal="Deploy v2.1.0",
    actor=actor,
    template_name="prod-deploy",
    override_min_approvals=3,  # Stricter for this deploy
)
```

## Decision Lifecycle

Computed lifecycle with blocking reasons and timeline:

```python
from nexus_attest import compute_lifecycle

lifecycle = compute_lifecycle(decision, events, policy)

# Blocking reasons (triage-ladder ordered)
for reason in lifecycle.blocking_reasons:
    print(f"{reason.code}: {reason.message}")

# Timeline with truncation
for entry in lifecycle.timeline:
    print(f"  {entry.seq}  {entry.label}")
```

## Export / Import Bundles

Portable, integrity-verified decision bundles for cross-system transfer:

```python
# Export
bundle_result = tools.export_bundle(decision_id)
bundle_json = bundle_result.data["canonical_json"]

# Import with conflict handling
import_result = tools.import_bundle(
    bundle_json,
    conflict_mode="new_decision_id",
    replay_after_import=True,
)
```

Conflict modes: `reject_on_conflict` | `new_decision_id` | `overwrite`

## Attestation Subsystem

The attestation layer provides cryptographic witness proofs with XRPL anchoring:

### Attestation Intents

Content-addressed attestation requests with subject binding:

```python
from nexus_attest.attestation import AttestationIntent

intent = AttestationIntent(
    subject_type="decision",
    binding_digest="sha256:abc123...",
    env="production",
    claims={"decision_id": "...", "outcome": "approved"},
)
```

### XRPL Witness Backend

On-chain attestation via the XRP Ledger for third-party verifiability:

| Component | Purpose |
|-----------|---------|
| `XRPLAdapter` | Submit attestation transactions |
| `JsonRpcClient` | Communicate with XRPL nodes |
| `ExchangeStore` | Track request/response evidence |
| `MemoCodec` | Encode/decode attestation payloads in XRPL memos |
| `XRPLSigner` | Transaction signing |

### Self-Verifying Narratives

Human-readable audit reports with embedded integrity checks:

```python
from nexus_attest.attestation.narrative import build_narrative

report = build_narrative(
    queue=attestation_queue,
    intent_digest="sha256:...",
    include_bodies=True,
)
# Returns NarrativeReport with receipt timeline,
# integrity checks (PASS/FAIL/SKIP), and XRPL witness data
```

### Attestation Replay

Deterministic replay of attestation timelines for verification:

```python
from nexus_attest.attestation.replay import replay_attestation

report = replay_attestation(queue, intent_digest)
# Returns AttestationReport with receipt summaries,
# confirmation status, and exchange evidence
```

## Data Model

### Event-Sourced Design

All state is derived by replaying an immutable event log:

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

### Policy Model

```python
Policy(
    min_approvals=2,
    allowed_modes=["dry_run", "apply"],
    require_adapter_capabilities=["timeout"],
    max_steps=50,
    labels=["prod", "finance"],
)
```

### Approval Model

- Counted by distinct `actor.id`
- Can include `comment` and optional `expires_at`
- Can be revoked (before execution)
- Execution requires approvals to satisfy policy **at execution time**

### Router Modes

| Mode | Contains | Use Case |
|------|----------|----------|
| **Reference** (default) | `run_id` + `router_digest` | CI, internal systems |
| **Embedded** | Full router bundle + cross-check | Regulators, long-term archival |

Both modes are cryptographically equivalent at the binding layer.

## Project Structure

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
|-- tests/                     22 test files, 632 tests
|-- schemas/                   JSON schemas for tool inputs
|-- ARCHITECTURE.md            Mental model + design guarantees
|-- QUICKSTART.md              5-minute operational guide
+-- pyproject.toml
```

## Development

```bash
# Install dev dependencies
pip install -e ".[dev]"

# Run tests (632 tests)
pytest

# Type check (basic mode, source packages)
pyright nexus_attest nexus_control

# Lint
ruff check .

# Format
ruff format .
```

## Exit Codes

| Code | Meaning |
|------|---------|
| `0` | All checks passed |
| `1` | Unhandled error |
| `2` | Validation or schema error |

## License

MIT
