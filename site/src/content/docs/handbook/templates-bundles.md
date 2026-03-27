---
title: Templates & Bundles
description: Create reusable policy templates and export/import decisions as portable, integrity-verified bundles.
sidebar:
  order: 4
---

Nexus Attest provides two mechanisms for reuse and portability: **decision templates** for repeatable approval patterns, and **export/import bundles** for cross-system decision transfer.

## Decision templates

Templates are named, immutable policy bundles. Once created, a template cannot be modified --- create a new one with a different name instead. This immutability guarantees that any decision referencing a template can always trace back to the exact policy that governed it.

### Creating a template

```python
tools.template_create(
    name="prod-deploy",
    actor=Actor(type="human", id="platform-team"),
    min_approvals=2,
    allowed_modes=["dry_run", "apply"],
    require_adapter_capabilities=["timeout"],
    labels=["prod"],
)
```

### Template fields

| Field | Description |
|-------|-------------|
| `name` | Unique identifier for the template (immutable after creation) |
| `actor` | Who created the template |
| `min_approvals` | Default approval threshold |
| `allowed_modes` | Which execution modes are permitted |
| `require_adapter_capabilities` | Capabilities the router adapter must support |
| `labels` | Default labels applied to decisions using this template |

### Using a template with overrides

When creating a request, you can reference a template and selectively override individual fields:

```python
result = tools.request(
    goal="Deploy v2.1.0",
    actor=actor,
    template_name="prod-deploy",
    min_approvals=3,  # Stricter for this deploy
)
```

When a template is specified, its policy values are used as defaults. Any explicit parameters (`min_approvals`, `allowed_modes`, `require_adapter_capabilities`, `max_steps`, `labels`) override the template value for that specific decision. The overrides applied are recorded in the decision's event log for auditability.

### Listing and retrieving templates

```python
# Get a specific template
template = tools.template_get("prod-deploy")

# List all templates
all_templates = tools.template_list()

# Filter by label
prod_templates = tools.template_list(label_filter="prod")
```

### Template design patterns

**Environment-based templates:**

```python
tools.template_create(name="staging-deploy", actor=actor, min_approvals=1,
                      allowed_modes=["dry_run", "apply"], labels=["staging"])

tools.template_create(name="prod-deploy", actor=actor, min_approvals=2,
                      allowed_modes=["dry_run", "apply"],
                      require_adapter_capabilities=["timeout"], labels=["prod"])
```

**Capability-gated templates:**

```python
tools.template_create(name="data-migration", actor=actor, min_approvals=3,
                      require_adapter_capabilities=["timeout", "rollback"],
                      labels=["data", "migration"])
```

---

## Export / Import bundles

Bundles are portable, integrity-verified snapshots of a decision and its full event history. They enable cross-system transfer, archival, and independent verification.

### Exporting a bundle

```python
bundle_result = tools.export_bundle(decision_id)
bundle_json = bundle_result.data["canonical_json"]
```

The exported bundle contains:
- Decision header (goal, creator, timestamps)
- Complete event log (all state transitions)
- Policy snapshot at time of export
- Integrity digest for tamper detection

The JSON is serialized in canonical form (deterministic key ordering, no optional whitespace) so that the same decision always produces the same byte-level output.

### Importing a bundle

```python
import_result = tools.import_bundle(
    bundle_json,
    conflict_mode="new_decision_id",
    replay_after_import=True,
)
```

### Conflict modes

When importing a bundle whose decision ID already exists in the target system, you choose how to handle the conflict:

| Mode | Behavior |
|------|----------|
| `reject_on_conflict` | Fail the import if the decision ID exists. Safest option. |
| `new_decision_id` | Assign a new ID to the imported decision. Original ID preserved in metadata. |
| `overwrite` | Replace the existing decision with the imported one. Use with caution. |

### Replay after import

When `replay_after_import=True`, the system re-derives the decision state by replaying the imported event log from scratch. This validates that:

- The event log is internally consistent
- Events are in valid sequence
- The derived state matches the expected state from the source system

Replay failure means the bundle may have been tampered with or corrupted in transit.

### Bundle integrity

Every bundle includes a digest computed over its canonical JSON content. On import, the system recomputes the digest and compares it to the embedded value. If they differ, the import is rejected.

This provides end-to-end integrity verification: the exporting system computes the digest, the importing system verifies it, and any modification in between is detected.
