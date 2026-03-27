---
title: MCP Tools Reference
description: Complete reference for all 11 MCP tools exposed by Nexus Attest via the Model Context Protocol.
sidebar:
  order: 3
---

Nexus Attest exposes 11 tools via the Model Context Protocol. This page documents each tool with its purpose, parameters, and usage patterns.

## Tool overview

| Tool | Category | Description |
|------|----------|-------------|
| `nexus-attest.request` | Governance | Create an execution request |
| `nexus-attest.approve` | Governance | Approve a request (N-of-M) |
| `nexus-attest.execute` | Governance | Execute an approved request |
| `nexus-attest.status` | Inspection | Get request state and run status |
| `nexus-attest.inspect` | Inspection | Read-only introspection |
| `nexus-attest.template.create` | Templates | Create a policy template |
| `nexus-attest.template.get` | Templates | Retrieve a template by name |
| `nexus-attest.template.list` | Templates | List templates with filtering |
| `nexus-attest.export_bundle` | Portability | Export a decision bundle |
| `nexus-attest.import_bundle` | Portability | Import a decision bundle |
| `nexus-attest.export_audit_package` | Attestation | Export a cryptographic audit package |

---

## Governance tools

### nexus-attest.request

Creates a new execution request with a goal, policy constraints, and approval requirements.

**Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `goal` | string | Yes | Human-readable description of what will be executed |
| `actor` | Actor | Yes | The requesting entity (`type` + `id`) |
| `mode` | string | No | `"dry_run"` (default) or `"apply"` |
| `plan` | string | No | Optional pre-defined execution plan |
| `template_name` | string | No | Named policy template to apply |
| `min_approvals` | integer | No | Distinct approvals required (default: 1). Overrides template value when both are provided. |
| `allowed_modes` | string[] | No | Permitted execution modes. Overrides template value when both are provided. |
| `require_adapter_capabilities` | string[] | No | Required adapter capabilities. Overrides template value when both are provided. |
| `max_steps` | integer | No | Maximum execution steps. Overrides template value when both are provided. |
| `labels` | string[] | No | Tags for filtering and policy matching. Overrides (replaces) template value when both are provided. |

**Returns:** `{ request_id, state, min_approvals, current_approvals }` --- plus `template_name`, `template_digest`, and `overrides_applied` when a template is used.

A new decision is created in the event store with `DECISION_CREATED` and `POLICY_ATTACHED` events. If a template is specified, its policy constraints are used as defaults and any explicit parameters override them.

### nexus-attest.approve

Approves a pending request. Approvals are counted by distinct `actor.id`.

**Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `request_id` | string | Yes | The decision to approve |
| `actor` | Actor | Yes | The approving entity |
| `comment` | string | No | Approval rationale |
| `expires_at` | string | No | ISO 8601 expiry timestamp |

**Returns:** `{ request_id, state, current_approvals, required_approvals, is_approved }`

An `APPROVAL_GRANTED` event is appended to the decision log. The same actor cannot approve the same decision twice. Duplicate approval attempts return an error.

Approvals can also be **revoked** before execution begins via the `revoke_approval` method, which appends an `APPROVAL_REVOKED` event to the log.

### nexus-attest.execute

Executes an approved request through nexus-router. The request must have enough valid approvals to satisfy its policy at execution time.

**Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `request_id` | string | Yes | The decision to execute |
| `adapter_id` | string | Yes | Router adapter identifier |
| `actor` | Actor | Yes | The entity triggering execution |
| `router` | RouterProtocol | Yes | Router implementation |
| `dry_run` | boolean | No | Override the decision's requested mode (must be allowed by policy) |

**Returns:** `{ request_id, run_id, mode, steps_executed, request_digest, response_digest }`

Execution proceeds through three events: `EXECUTION_REQUESTED`, `EXECUTION_STARTED`, and either `EXECUTION_COMPLETED` or `EXECUTION_FAILED`. The `run_id` and digests are recorded for audit binding.

---

## Inspection tools

### nexus-attest.status

Returns the current state of a decision, including approval status and linked execution results.

**Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `request_id` | string | Yes | The decision to query |
| `include_events` | boolean | No | Include full event timeline (default: false) |

**Returns:** Decision state including status, approval count, blocking reasons, and linked run information (if executed). When `include_events` is true, the complete event log is included.

### nexus-attest.inspect

Read-only introspection with human-readable output. Provides a formatted view of a decision's complete state, including lifecycle data, blocking reasons, policy details, and timeline.

**Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `decision_id` | string | Yes | The decision to inspect |
| `render` | boolean | No | Include markdown rendering (default: true) |
| `include_events` | boolean | No | Include full event list (default: false) |
| `include_compiled_router_request` | boolean | No | Show compiled router request (default: true) |

**Returns:** Structured data with decision status, lifecycle (blocking reasons + progress), approval section, policy section, template section, execution section, and timeline. When `render` is true, a human-readable markdown rendering is included.

---

## Template tools

### nexus-attest.template.create

Creates a named, immutable policy template. Once created, templates cannot be modified --- create a new one with a different name instead.

**Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `name` | string | Yes | Unique template name |
| `actor` | Actor | Yes | Template creator |
| `description` | string | No | Human-readable description of the template's purpose |
| `min_approvals` | integer | No | Default approval threshold (default: 1) |
| `allowed_modes` | string[] | No | Permitted execution modes (default: `["dry_run"]`) |
| `require_adapter_capabilities` | string[] | No | Required adapter capabilities |
| `max_steps` | integer | No | Maximum router steps |
| `labels` | string[] | No | Default labels for filtering |

**Returns:** `{ template_name, description, digest, created_at }`

### nexus-attest.template.get

Retrieves a template by its exact name.

**Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `name` | string | Yes | Template name to retrieve |
| `include_events` | boolean | No | Include template event history (default: false) |

**Returns:** Full template definition including all policy fields, digest, and snapshot.

### nexus-attest.template.list

Lists all templates, with optional label-based filtering.

**Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `limit` | integer | No | Maximum results to return (default: 100) |
| `offset` | integer | No | Number to skip for pagination (default: 0) |
| `label_filter` | string | No | Filter templates by label |

**Returns:** `{ templates, count, offset, limit }` --- array of template summaries with name, description, min_approvals, allowed_modes, labels, and created_at.

---

## Portability tools

### nexus-attest.export_bundle

Exports a decision as a portable, integrity-verified JSON bundle for cross-system transfer.

**Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `decision_id` | string | Yes | The decision to export |
| `include_template_snapshot` | boolean | No | Include template snapshot data (default: true) |
| `include_router_link` | boolean | No | Include router execution link (default: true) |
| `render` | boolean | No | Include human-readable summary (default: true) |

**Returns:** `{ bundle, digest, rendered }` --- the bundle includes the decision header, all events, policy, and a digest for integrity verification. The JSON is serialized in canonical form for deterministic output.

### nexus-attest.import_bundle

Imports a decision bundle with conflict handling and optional replay validation.

**Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `bundle` | object | Yes | Bundle dict from export |
| `verify_digest` | boolean | No | Verify bundle integrity before import (default: true) |
| `conflict_mode` | string | No | `"reject_on_conflict"` (default), `"new_decision_id"`, or `"overwrite"` |
| `replay_after_import` | boolean | No | Re-derive state from events after import (default: true) |

**Returns:** Import result including the decision ID (which may be new if `conflict_mode` is `"new_decision_id"`).

---

## Attestation tools

### nexus-attest.export_audit_package

Exports a cryptographic audit package that binds the governance decision to the execution outcome. The decision must have been executed (has a router link).

**Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `decision_id` | string | Yes | The executed decision |
| `embed_router_bundle` | boolean | No | Embed full router bundle vs. reference (default: false) |
| `router_bundle` | object | No | Router bundle dict (required when embedding) |
| `router_bundle_digest` | string | No | Optional router digest override for reference mode |
| `verify_router_bundle_digest` | boolean | No | Verify router digest matches (default: true) |
| `render` | boolean | No | Include human-readable summary (default: true) |

**Returns:** `{ package, digest, rendered }` --- audit package containing the control bundle, router section, control-router link, and `binding_digest` (SHA-256).

The package includes all the data needed for independent verification. See the [Attestation](/nexus-attest/handbook/attestation/) page for details on verification and XRPL anchoring.
