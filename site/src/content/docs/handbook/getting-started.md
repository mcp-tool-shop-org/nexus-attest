---
title: Getting Started
description: Install Nexus Attest, create your first governance request, collect approvals, and verify an audit package.
sidebar:
  order: 1
---

This page walks you through installing Nexus Attest, creating your first governed request, collecting approvals, executing through nexus-router, and verifying the audit trail.

## Installation

Install from PyPI:

```bash
pip install nexus-attest
```

Requires **Python 3.11** or later.

For development (tests, type checking, linting):

```bash
pip install -e ".[dev]"
```

## First request

Every governance workflow starts with a **request** --- a declaration of intent that must be approved before execution.

```python
from nexus_attest import NexusControlTools
from nexus_attest.events import Actor

# Initialize with a SQLite database (in-memory by default)
tools = NexusControlTools(db_path="decisions.db")

# Create a request
result = tools.request(
    goal="Rotate production API keys",
    actor=Actor(type="human", id="alice@example.com"),
    mode="apply",
    min_approvals=2,
    labels=["prod", "security"],
)
request_id = result.data["request_id"]
```

The `request_id` is the handle you use for all subsequent operations on this decision.

### Key parameters

| Parameter | Required | Description |
|-----------|----------|-------------|
| `goal` | Yes | Human-readable description of what will be executed |
| `actor` | Yes | The person or system creating the request |
| `mode` | No | `"dry_run"` or `"apply"` (default depends on policy) |
| `min_approvals` | No | Number of distinct approvals required (default: 1) |
| `labels` | No | Tags for filtering and policy matching |
| `template_name` | No | Apply a named policy template |

## Collecting approvals

Approvals are counted by distinct `actor.id`. The same actor cannot approve twice for the same decision.

```python
# First approval
tools.approve(request_id, actor=Actor(type="human", id="alice@example.com"))

# Second approval (different actor)
tools.approve(request_id, actor=Actor(type="human", id="bob@example.com"))
```

Approvals can include an optional `comment` and `expires_at` timestamp. They can also be revoked before execution begins.

## Executing

Once the approval threshold is met, the request can be executed through nexus-router:

```python
result = tools.execute(
    request_id=request_id,
    adapter_id="subprocess:mcpt:key-rotation",
    actor=Actor(type="system", id="scheduler"),
    router=your_router,  # RouterProtocol implementation
)

print(f"Run ID: {result.data['run_id']}")
```

The execution is bound to the decision --- the `run_id` and `router_digest` become part of the cryptographic audit package.

## Exporting an audit package

After execution, export the complete audit trail:

```python
audit = tools.export_audit_package(request_id)
print(audit.data["digest"])  # sha256:...
```

The audit package cryptographically binds:
- **Control bundle** --- the decision, policy, approvals, and constraints
- **Router section** --- the execution identity (`run_id` and `router_digest`)
- **Control-router link** --- why this execution was authorized by this decision

## Verifying

Verification runs all six integrity checks without short-circuiting:

```python
from nexus_attest import verify_audit_package

verification = verify_audit_package(package)
assert verification.ok  # True if all 6 checks pass
```

| Check | What it verifies |
|-------|-----------------|
| `binding_digest` | Recompute binding from binding fields |
| `control_bundle_digest` | Recompute from control bundle content |
| `binding_control_match` | Binding matches control bundle |
| `binding_router_match` | Binding matches router section |
| `binding_link_match` | Binding matches control-router link |
| `router_digest` | Embedded router bundle integrity (if applicable) |

If any check fails, the verification report tells you exactly which one and why. All checks run regardless of earlier failures so you get the complete picture in a single pass.

## Dry-run mode

Use `mode="dry_run"` to test the full governance flow without actually executing:

```python
result = tools.request(
    goal="Test deployment pipeline",
    actor=Actor(type="human", id="alice@example.com"),
    mode="dry_run",
    min_approvals=1,
)
```

Dry-run requests go through the same approval workflow and produce the same audit packages, but the router execution is simulated.

## Next steps

- [Concepts](/nexus-attest/handbook/concepts/) --- understand the governance flow, decision lifecycle, and event-sourced design
- [MCP Tools](/nexus-attest/handbook/mcp-tools/) --- explore the full tool surface
- [Templates & Bundles](/nexus-attest/handbook/templates-bundles/) --- create reusable policy templates
