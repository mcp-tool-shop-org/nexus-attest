import type { SiteConfig } from '@mcptoolshop/site-theme';

export const config: SiteConfig = {
  title: 'nexus-attest',
  description: 'Deterministic attestation with verifiable evidence — governance, audit packages, and XRPL witness proofs for MCP tool execution',
  logoBadge: 'NA',
  brandName: 'nexus-attest',
  repoUrl: 'https://github.com/mcp-tool-shop-org/nexus-attest',
  footerText: 'MIT Licensed — built by <a href="https://github.com/mcp-tool-shop-org" style="color:var(--color-muted);text-decoration:underline">mcp-tool-shop-org</a>',

  hero: {
    badge: 'Python · PyPI',
    headline: 'Governance before execution,',
    headlineAccent: 'verified after.',
    description: 'Request / Review / Approve / Execute with N-of-M approvals, cryptographic audit packages, and XRPL-anchored witness proofs. Every decision is exportable, verifiable, and replayable.',
    primaryCta: { href: '#quickstart', label: 'Quick start' },
    secondaryCta: { href: '#mcp-tools', label: 'MCP tools' },
    previews: [
      {
        label: 'Install',
        code: 'pip install nexus-attest\n# Python 3.11+',
      },
      {
        label: 'Request',
        code: 'from nexus_attest import NexusControlTools\nfrom nexus_attest.events import Actor\n\ntools = NexusControlTools(db_path="decisions.db")\nresult = tools.request(\n    goal="Rotate production API keys",\n    actor=Actor(type="human", id="alice@example.com"),\n    min_approvals=2,\n)',
      },
      {
        label: 'Verify',
        code: 'from nexus_attest import verify_audit_package\n\nverification = verify_audit_package(package)\nassert verification.ok  # 6 independent checks\nprint(verification.binding_digest)  # sha256:...',
      },
    ],
  },

  sections: [
    {
      kind: 'features',
      id: 'features',
      title: 'What nexus-attest adds',
      subtitle: 'The governance layer that nexus-router does not have.',
      features: [
        {
          title: 'Event-sourced governance',
          desc: 'Every state — request, approval, execution, failure — is derived by replaying an immutable append-only log. No mutable state. No hidden writes. Full timeline always available.',
        },
        {
          title: 'Cryptographic audit packages',
          desc: 'A binding_digest (SHA-256) ties the decision, policy, approvals, execution identity, and the control-router link into one tamper-evident bundle. If any component changes, the digest breaks.',
        },
        {
          title: 'XRPL witness proofs',
          desc: 'Attestation intents are anchored to the XRP Ledger for third-party verifiability. Self-verifying narrative reports include receipt timelines, PASS/FAIL/SKIP integrity checks, and on-chain witness data.',
        },
      ],
    },
    {
      kind: 'data-table',
      id: 'mcp-tools',
      title: '11 MCP tools',
      subtitle: 'Full governance surface exposed via the Model Context Protocol.',
      columns: ['Tool', 'What it does'],
      rows: [
        ['nexus-attest.request', 'Create an execution request with goal, policy, and approvers'],
        ['nexus-attest.approve', 'Approve a request — supports N-of-M distinct actors'],
        ['nexus-attest.execute', 'Execute an approved request via nexus-router'],
        ['nexus-attest.status', 'Get request state and linked run status'],
        ['nexus-attest.inspect', 'Read-only introspection with human-readable output'],
        ['nexus-attest.template.create', 'Create a named, immutable policy template'],
        ['nexus-attest.template.get / .list', 'Retrieve or list templates with optional label filtering'],
        ['nexus-attest.export_bundle', 'Export a decision as a portable, integrity-verified bundle'],
        ['nexus-attest.import_bundle', 'Import a bundle with conflict modes and replay validation'],
        ['nexus-attest.export_audit_package', 'Export audit package binding governance to execution'],
      ],
    },
    {
      kind: 'code-cards',
      id: 'quickstart',
      title: 'Quick start',
      cards: [
        {
          title: '1. Create a request',
          code: 'tools = NexusControlTools(db_path="decisions.db")\nresult = tools.request(\n    goal="Rotate production API keys",\n    actor=Actor(type="human", id="alice@example.com"),\n    min_approvals=2,\n    labels=["prod", "security"],\n)\nrequest_id = result.data["request_id"]',
        },
        {
          title: '2. Collect N-of-M approvals',
          code: 'tools.approve(request_id, actor=Actor(type="human", id="alice@example.com"))\ntools.approve(request_id, actor=Actor(type="human", id="bob@example.com"))',
        },
        {
          title: '3. Execute and get audit proof',
          code: 'result = tools.execute(\n    request_id=request_id,\n    adapter_id="subprocess:mcpt:key-rotation",\n    actor=Actor(type="system", id="scheduler"),\n    router=your_router,\n)\naudit = tools.export_audit_package(request_id)\nprint(audit.data["digest"])  # sha256:...',
        },
        {
          title: '4. Verify — 6 independent checks',
          code: 'verification = verify_audit_package(package)\nassert verification.ok\n# Checks: binding_digest, control_bundle_digest,\n# binding_control_match, binding_router_match,\n# binding_link_match, router_digest',
        },
      ],
    },
    {
      kind: 'features',
      id: 'guarantees',
      title: 'Design guarantees',
      subtitle: '35 modules. 22 test files. 632 tests.',
      features: [
        {
          title: 'No short-circuiting',
          desc: 'All 6 verification checks run regardless of failures — every issue is reported. Policies are validated at execution time, not just at approval time.',
        },
        {
          title: 'Portable bundles',
          desc: 'Export decisions as canonical JSON bundles for cross-system transfer. Three conflict modes on import: reject_on_conflict, new_decision_id, overwrite. Replay after import is optional.',
        },
        {
          title: 'Policy templates',
          desc: 'Named, immutable policy bundles for repeatable approval patterns. Override individual fields per-request without mutating the template.',
        },
      ],
    },
  ],
};
