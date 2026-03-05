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
| `mode` | string | No | `"dry_run"` or `"apply"` |
| `min_approvals` | integer | No | Distinct approvals required (default: 1) |
| `labels` | string[] | No | Tags for filtering and policy matching |
| `template_name` | string | No | Named policy template to apply |
| `override_min_approvals` | integer | No | Override template's min_approvals |

**Returns:** `{ request_id: string }`

A new decision is created in the event store with a `DECISION_CREATED` event. If a template is specified, its policy constraints are applied with any overrides.

### nexus-attest.approve

Approves a pending request. Approvals are counted by distinct `actor.id`.

**Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `request_id` | string | Yes | The decision to approve |
| `actor` | Actor | Yes | The approving entity |
| `comment` | string | No | Approval rationale |
| `expires_at` | string | No | ISO 8601 expiry timestamp |

**Returns:** `{ approved: boolean, approval_count: integer }`

An `APPROVAL_GRANTED` event is appended to the decision log. The same actor cannot approve the same decision twice.

### nexus-attest.execute

Executes an approved request through nexus-router. The request must have enough valid approvals to satisfy its policy at execution time.

**Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `request_id` | string | Yes | The decision to execute |
| `adapter_id` | string | Yes | Router adapter identifier |
| `actor` | Actor | Yes | The entity triggering execution |
| `router` | RouterProtocol | Yes | Router implementation |

**Returns:** `{ run_id: string }`

Execution proceeds through three events: `EXECUTION_REQUESTED`, `EXECUTION_STARTED`, and either `EXECUTION_COMPLETED` or `EXECUTION_FAILED`. The `run_id` and `router_digest` are recorded for audit binding.

---

## Inspection tools

### nexus-attest.status

Returns the current state of a decision, including approval status and linked execution results.

**Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `request_id` | string | Yes | The decision to query |

**Returns:** Decision state including status, approval count, blocking reasons, and linked run information (if executed).

### nexus-attest.inspect

Read-only introspection with human-readable output. Provides a formatted view of a decision's complete history, including all events, policy details, and timeline.

**Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `request_id` | string | Yes | The decision to inspect |

**Returns:** Human-readable formatted output showing the full decision history.

---

## Template tools

### nexus-attest.template.create

Creates a named, immutable policy template. Once created, templates cannot be modified --- create a new version instead.

**Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `name` | string | Yes | Unique template name |
| `actor` | Actor | Yes | Template creator |
| `min_approvals` | integer | No | Default approval threshold |
| `allowed_modes` | string[] | No | Permitted execution modes |
| `require_adapter_capabilities` | string[] | No | Required adapter capabilities |
| `labels` | string[] | No | Default labels |

**Returns:** `{ template_name: string }`

### nexus-attest.template.get

Retrieves a template by its exact name.

**Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `name` | string | Yes | Template name to retrieve |

**Returns:** Full template definition including all policy fields.

### nexus-attest.template.list

Lists all templates, with optional label-based filtering.

**Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `labels` | string[] | No | Filter templates by label |

**Returns:** Array of template summaries.

---

## Portability tools

### nexus-attest.export_bundle

Exports a decision as a portable, integrity-verified JSON bundle for cross-system transfer.

**Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `decision_id` | string | Yes | The decision to export |

**Returns:** `{ canonical_json: string }` --- the bundle includes the decision header, all events, policy, and a digest for integrity verification.

### nexus-attest.import_bundle

Imports a decision bundle with conflict handling and optional replay validation.

**Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `bundle_json` | string | Yes | Canonical JSON from export |
| `conflict_mode` | string | No | `"reject_on_conflict"`, `"new_decision_id"`, or `"overwrite"` |
| `replay_after_import` | boolean | No | Re-derive state from events after import |

**Returns:** Import result including the decision ID (which may be new if `conflict_mode` is `"new_decision_id"`).

---

## Attestation tools

### nexus-attest.export_audit_package

Exports a cryptographic audit package that binds the governance decision to the execution outcome.

**Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `request_id` | string | Yes | The executed decision |

**Returns:** Audit package containing the control bundle, router section, control-router link, and `binding_digest` (SHA-256).

The package includes all the data needed for independent verification. See the [Attestation](/nexus-attest/handbook/attestation/) page for details on verification and XRPL anchoring.
