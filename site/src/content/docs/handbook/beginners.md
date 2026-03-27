---
title: Beginners Guide
description: A gentle introduction to Nexus Attest for newcomers, with step-by-step examples covering governance workflows, approvals, and audit verification.
sidebar:
  order: 99
---

New to Nexus Attest? This page walks you through the core ideas and gives you working code you can run immediately. No prior knowledge of MCP, event sourcing, or cryptographic attestation is required.

## What problem does Nexus Attest solve?

When AI agents execute tools in production, there is no built-in governance. An agent can rotate API keys, deploy code, or modify databases with no approval step and no audit trail. If something goes wrong, there is no record of who authorized the action or what constraints were in place.

Nexus Attest adds a governance layer that sits between the request and the execution:

1. Someone (human or system) **requests** an action
2. The request gets a **policy** that defines what is allowed
3. One or more people **approve** the request
4. Only then does the action **execute**
5. A cryptographic **audit package** records everything that happened

Every step is recorded in an immutable event log. The audit trail is tamper-evident --- if anyone modifies it after the fact, verification fails.

## Installation

Install from PyPI with pip:

```bash
pip install nexus-attest
```

You need Python 3.11 or later. To verify the installation:

```python
import nexus_attest
print(nexus_attest.__version__)  # Should print 1.0.1
```

No additional services or databases are required. Nexus Attest uses SQLite by default, which is included with Python.

## Your first governance workflow

Here is a complete example that creates a request, collects approvals, and exports an audit package. You can paste this into a Python file and run it directly.

```python
from nexus_attest import NexusControlTools
from nexus_attest.events import Actor

# Step 1: Initialize
# Uses an in-memory SQLite database (no files created)
tools = NexusControlTools()

# Step 2: Create a request
# This declares what you want to do and how many approvals are needed
result = tools.request(
    goal="Rotate staging API keys",
    actor=Actor(type="human", id="alice@example.com"),
    mode="dry_run",       # Safe mode for first try
    min_approvals=1,      # Only one approval needed
    labels=["staging"],
)
request_id = result.data["request_id"]
print(f"Created request: {request_id}")
print(f"State: {result.data['state']}")  # pending_approval

# Step 3: Approve the request
approval = tools.approve(
    request_id,
    actor=Actor(type="human", id="alice@example.com"),
)
print(f"Approved: {approval.data['is_approved']}")  # True
print(f"State: {approval.data['state']}")           # approved
```

The request starts in `pending_approval` state. After enough approvals, it moves to `approved` and is ready for execution.

## Understanding actors and approvals

An **Actor** represents who is performing an action. Every actor has a `type` (either `"human"` or `"system"`) and a unique `id`:

```python
from nexus_attest.events import Actor

# Human actors represent people
alice = Actor(type="human", id="alice@example.com")
bob = Actor(type="human", id="bob@example.com")

# System actors represent automated processes
scheduler = Actor(type="system", id="cron-scheduler")
```

Approvals are counted by distinct `actor.id`. The same person cannot approve the same request twice. When multiple approvals are required, different actors must provide them:

```python
# Require 2 approvals
result = tools.request(
    goal="Deploy to production",
    actor=alice,
    mode="apply",
    min_approvals=2,
    labels=["prod"],
)
request_id = result.data["request_id"]

# First approval (1 of 2)
tools.approve(request_id, actor=alice)

# Second approval (2 of 2) - must be a different actor
tools.approve(request_id, actor=bob)
```

Approvals can include a comment explaining the rationale, and an optional expiration time after which the approval no longer counts:

```python
from datetime import datetime, timedelta, UTC

tools.approve(
    request_id,
    actor=bob,
    comment="Reviewed the key rotation plan, looks good",
    expires_at=datetime.now(UTC) + timedelta(hours=4),
)
```

## Inspecting decisions

The `inspect` tool gives you a complete view of a decision's current state, including its lifecycle, blocking reasons, and timeline:

```python
inspection = tools.inspect(request_id)

# The rendered field contains human-readable markdown
print(inspection.data["rendered"])
```

This shows a structured report with sections for the decision status, approval progress, policy constraints, and a timeline of all events. If the decision cannot be executed yet, the blocking reasons tell you exactly why (for example, missing approvals or a policy constraint violation).

You can also check the status programmatically:

```python
status = tools.status(request_id)
print(f"State: {status.data['state']}")
print(f"Goal: {status.data['goal']}")
print(f"Approved: {status.data['is_approved']}")
```

## Verifying audit packages

After a decision has been executed, you can export an audit package that cryptographically binds the governance decision to the execution outcome:

```python
from nexus_attest import verify_audit_package

# Export the audit package
audit = tools.export_audit_package(request_id)
package = audit.data["package"]

# Verify the package independently
verification = verify_audit_package(package)
print(f"Verification passed: {verification.ok}")

# Each of the 6 checks is reported individually
for check in verification.checks:
    status_label = "PASS" if check.passed else "FAIL"
    print(f"  [{status_label}] {check.name}")
```

The six verification checks ensure that the audit package has not been tampered with:

- **binding_digest** --- the overall hash is correct
- **control_bundle_digest** --- the governance data is intact
- **binding_control_match** --- the binding references the correct governance data
- **binding_router_match** --- the binding references the correct execution data
- **binding_link_match** --- the link between governance and execution is valid
- **router_digest** --- the execution data itself is intact (for embedded mode)

All six checks run regardless of failures, so you always get the complete picture in a single verification pass.

## Common patterns for beginners

### Using templates for repeatable policies

Instead of specifying `min_approvals`, `allowed_modes`, and other policy fields every time, create a template once and reuse it:

```python
# Create a template (immutable after creation)
tools.template_create(
    name="staging-deploy",
    actor=Actor(type="human", id="platform-team"),
    description="Standard staging deployment policy",
    min_approvals=1,
    allowed_modes=["dry_run", "apply"],
    labels=["staging"],
)

# Use the template when creating requests
result = tools.request(
    goal="Deploy v1.2.0 to staging",
    actor=Actor(type="human", id="alice@example.com"),
    template_name="staging-deploy",
)
```

### Dry-run before apply

Always test with `mode="dry_run"` first. Dry-run requests go through the full governance workflow (request, approve, execute) but the router execution is simulated. The audit package is still produced so you can verify the flow works before running with `mode="apply"`.

### Exporting decisions for archival

Decisions can be exported as portable JSON bundles for backup or cross-system transfer:

```python
bundle = tools.export_bundle(request_id)
bundle_json = bundle.data["bundle"]
# Save to file, send to another system, etc.
```

Bundles include a digest for integrity verification. On import, the system recomputes the digest and rejects the bundle if it has been modified.

### Next steps

Once you are comfortable with the basics, explore the rest of the handbook:

- [Concepts](/nexus-attest/handbook/concepts/) --- deeper look at event sourcing, lifecycle, and policy mechanics
- [MCP Tools](/nexus-attest/handbook/mcp-tools/) --- full reference for all 11 tools with parameters
- [Templates & Bundles](/nexus-attest/handbook/templates-bundles/) --- advanced template patterns and bundle import/export
- [Attestation](/nexus-attest/handbook/attestation/) --- XRPL witness proofs and cryptographic narrative reports
