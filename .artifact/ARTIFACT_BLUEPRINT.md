# Artifact Blueprint: nexus-attest

> Generated 2026-03-03T14:49:42 by artifact v0.0.0 (ollama driver)

## Pick

**Tier:** Promotion
**Format:** P2_demo_gif_storyboard — Demo GIF storyboard — frame-by-frame demo plan
**Alternates:** P5_screenshot_story (Screenshot story — visual walkthrough narrative)
**Signature Move:** checksum_box

## Constraints

- material:one-page
- tone:museum-placard

## Hooks (grounded in TruthAtoms)

- **name_hook** — `repo_tagline:c4407ebc6288`
  "Cryptographic attestation and verification layer for MCP tool executions"
  Source: `pyproject.toml:8`
- **invariant_hook** — `invariant:b10d7586faf5`
  "<strong>Deterministic attestation with verifiable evidence.</strong><br/>"
  Source: `README.md:19`

## Must-Include Checklist

- [ ] nexus-attest template.create CLI command or API call
- [ ] invariant:deterministic attestation with verifiable evidence
- [ ] error_string:account must be non-empty

## Freshness (the details that prove this is real)

**Weird true detail:** | **Data NOT touched** | No telemetry. No analytics. No user data. No credential storage |
**Recent change:** Promoted to v1.0.0 — stable release
**Sharp edge:** - Execution requires approvals to satisfy policy at execution time

## Ban List (do not use)

- ~~D3_debug_tree~~
- ~~uses-real-invariant~~

## Org Curation Context

**Org bans applied:**
- C4_cover_poster
- D3_debug_tree
- uses-real-invariant
- signal-proof
**Org gaps (soft bias):**
- prefer Promotion tier (at 0%, target ~15%)
- 9 unique formats used across 15 decisions

## Curator Notes

**Veto:** Avoid using D3_debug_tree format as it has been used recently and is currently banned.
**Twist:** The unique twist for this artifact comes from the invariant that ensures deterministic attestation with verifiable evidence, referencing the repo's core purpose of cryptographic witness proofs.
**Pick rationale:** P2_demo_gif_storyboard is chosen because it aligns well with showcasing the stable release and its key features without relying on formats or constraints recently used.

---

# Outline Skeleton

*Atom-seeded prompt slots — fill in each checkbox, do not re-decide.*

## Title
- [ ] Name this artifact (incorporate repo identity: "nexus-attest")
- [ ] Apply signature move: **checksum_box**

## Opening Hook
- [ ] Lead with weird true detail: "<strong>Deterministic attestation with verifiable evidence.</strong><br/>" (README.md:19)
- [ ] Ground in repo identity: "Cryptographic attestation and verification layer for MCP tool executions" (pyproject.toml:8)

## The Claim
- [ ] Tagline from: "Cryptographic attestation and verification layer for MCP tool executions" (pyproject.toml:8)

## The Proof
- [ ] Cite invariant as evidence: "<strong>Deterministic attestation with verifiable evidence.</strong><br/>" (README.md:19)
- [ ] Cite sharp edge honestly: "Running MCP tools in production requires approval workflows, audit trails, and policy enforcement. nexus-router executes immediately --- there is no governance layer." (README.md:27)

## Call to Action
- [ ] Install command: what the reader runs first

## Closing
- [ ] Reinforce sharp edge: "Running MCP tools in production requires approval workflows, audit trails, and policy enforcement. nexus-router executes immediately --- there is no governance layer." (README.md:27)
- [ ] End with core promise: "The `binding_digest` is a SHA-256 hash over all three. If any component changes, the digest breaks." (README.md:110)

---

## Provenance

- artifact v0.0.0
- decision_packet: `.artifact/decision_packet.json` (sha256: `7909b7089effd731...`)
- truth_bundle: 43 atoms (sha256: `74fd122f91f4b2e4...`)
- web_brief: `.artifact/web/brief.json` (sha256: `d246e2af5165ca4a...`)
- Driver: ollama (model: qwen2.5:14b, host: http://127.0.0.1:11434)
- Quality gates: all passed
