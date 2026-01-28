# nexus-control

**Orchestration and approval layer for nexus-router executions.**

A thin control plane that turns "router can execute" into "org can safely decide to execute."

## Core Promise

Every execution is tied to:
- A **decision** (the request + policy)
- A **policy** (approval rules, allowed modes, constraints)
- An **approval trail** (who approved, when, with what comment)
- A **nexus-router run_id** (for full execution audit)

Everything is exportable and replayable.

## Installation

```bash
pip install nexus-control
```

Or from source:
```bash
git clone https://github.com/mcp-tool-shop/nexus-control
cd nexus-control
pip install -e ".[dev]"
```

## Quick Start

```python
from nexus_control import NexusControlTools
from nexus_control.events import Actor

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

# 2. Get approvals
tools.approve(request_id, actor=Actor(type="human", id="alice@example.com"))
tools.approve(request_id, actor=Actor(type="human", id="bob@example.com"))

# 3. Execute (with your router)
result = tools.execute(
    request_id=request_id,
    adapter_id="subprocess:mcpt:key-rotation",
    actor=Actor(type="system", id="scheduler"),
    router=your_router,  # RouterProtocol implementation
)

print(f"Run ID: {result.data['run_id']}")

# 4. Export audit record
audit = tools.export_audit_record(request_id)
print(audit.data["canonical_json"])
```

## MCP Tools

| Tool | Description |
|------|-------------|
| `nexus-control.request` | Create an execution request with goal, policy, and approvers |
| `nexus-control.approve` | Approve a request (supports N-of-M approvals) |
| `nexus-control.execute` | Execute approved request via nexus-router |
| `nexus-control.status` | Get request state and linked run status |
| `nexus-control.inspect` | Read-only introspection with human-readable output |

## Inspect Tool

The `inspect` tool provides read-only introspection with router-style output:

```python
result = tools.inspect(request_id)
print(result.data["rendered"])
```

Output:
```
✓ Decision approved (ready to execute)

## Decision
  ID:           550e8400-e29b-41d4-a716-446655440000
  Status:       APPROVED
  Mode:         apply
  Goal:         rotate keys for prod cluster
  Created:      2026-01-28T22:14:03Z
  Last update:  2026-01-28T22:29:10Z

## Approval
  Required:     2
  Approved:     2 (threshold met)

  Approvers:
    - alice  (expires: —)
      "Reviewed blast radius, ok."
    - bob    (expires: 2026-01-29T22:29:10Z)
      "Ok to proceed."

## Policy
  Allowed modes:          apply
  Required capabilities:  timeout, external
  max_steps:              10

## Execution
  Requested:    —
  Run ID:       —
  Adapter:      —
  Router link:  —

## Timeline
   0  DECISION_CREATED       actor=alice        2026-01-28T22:14:03Z
   1  POLICY_ATTACHED        actor=alice        2026-01-28T22:14:04Z
   2  APPROVAL_GRANTED       actor=alice        2026-01-28T22:18:41Z
   3  APPROVAL_GRANTED       actor=bob          2026-01-28T22:29:10Z

## Integrity
  Decision digest:        sha256:01b7...
```

After execution, includes router link:
```
## Router (linked)
  Router request digest:  sha256:2b0c...
  Router result digest:   sha256:8cfe...
  Inspect hint:           nexus-router.inspect { "run_id": "run_01J9N..." }
```

## Data Model

### Event-Sourced Design

All state is derived by replaying an immutable event log:

```
decisions (header)
  └── decision_events (append-only log)
        ├── DECISION_CREATED
        ├── POLICY_ATTACHED
        ├── APPROVAL_GRANTED
        ├── APPROVAL_REVOKED
        ├── EXECUTION_REQUESTED
        ├── EXECUTION_STARTED
        ├── EXECUTION_COMPLETED
        └── EXECUTION_FAILED
```

### Policy Model

Policies define the rules for approval and execution:

```python
Policy(
    min_approvals=2,              # N-of-M approval threshold
    allowed_modes=["dry_run", "apply"],  # Permitted execution modes
    require_adapter_capabilities=["timeout"],  # Required adapter features
    max_steps=50,                 # Passed to nexus-router
    labels=["prod", "finance"],   # Governance routing
)
```

### Approval Model

Approvals are events with actors, not booleans:
- Counted by distinct `actor.id`
- Can include `comment` and optional `expires_at`
- Can be revoked (before execution)
- Execution requires approvals to satisfy policy **at execution time**

## Architecture

```
┌─────────────────────────────────────────────────┐
│                 nexus-control                    │
│  ┌───────────┐  ┌───────────┐  ┌─────────────┐  │
│  │  request  │  │  approve  │  │   execute   │  │
│  └─────┬─────┘  └─────┬─────┘  └──────┬──────┘  │
│        │              │               │         │
│        ▼              ▼               ▼         │
│  ┌─────────────────────────────────────────┐   │
│  │           Decision Store (SQLite)        │   │
│  │  - Event log (append-only)              │   │
│  │  - Replay for state                     │   │
│  │  - Exportable audit records             │   │
│  └─────────────────────────────────────────┘   │
│                       │                         │
└───────────────────────┼─────────────────────────┘
                        │
                        ▼
              ┌─────────────────┐
              │  nexus-router   │
              │  (execution)    │
              └─────────────────┘
```

Control plane stores **links, not copies**. Router remains the flight recorder.

## Development

```bash
# Install dev dependencies
pip install -e ".[dev]"

# Run tests
pytest

# Type check
pyright

# Lint
ruff check .
```

## Project Structure

```
nexus-control/
├── nexus_control/
│   ├── __init__.py
│   ├── tool.py           # MCP tool entrypoints
│   ├── store.py          # SQLite event store
│   ├── events.py         # Event type definitions
│   ├── policy.py         # Policy validation + router compilation
│   ├── decision.py       # State machine + replay
│   ├── canonical_json.py # Deterministic serialization
│   └── integrity.py      # SHA256 helpers
├── schemas/
│   ├── nexus-control.request.v0.1.json
│   ├── nexus-control.approve.v0.1.json
│   ├── nexus-control.execute.v0.1.json
│   ├── nexus-control.status.v0.1.json
│   └── nexus-control.inspect.v0.1.json
├── tests/
│   ├── test_decision_replay.py
│   ├── test_policy_compile.py
│   ├── test_approval_threshold.py
│   ├── test_execute_links_run.py
│   └── test_inspect.py
├── README.md
├── QUICKSTART.md
└── pyproject.toml
```

## License

MIT
