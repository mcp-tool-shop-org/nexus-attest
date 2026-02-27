# Security Policy

## Supported Versions

| Version | Supported |
|---------|-----------|
| 1.0.x   | Yes       |

## Reporting a Vulnerability

Email: **64996768+mcp-tool-shop@users.noreply.github.com**

Include:
- Description of the vulnerability
- Steps to reproduce
- Version affected
- Potential impact

### Response timeline

| Action | Target |
|--------|--------|
| Acknowledge report | 48 hours |
| Assess severity | 7 days |
| Release fix | 30 days |

## Scope

nexus-attest is a **Python library** for cryptographic attestation and verification of MCP tool executions.

- **Data touched:** Attestation records (Ed25519 signatures, decision hashes). Event logs. Verification chain state
- **Data NOT touched:** No telemetry. No analytics. No user data. No credential storage
- **Network:** HTTPS for attestation submission (via httpx). No listeners
- **Permissions:** Read: tool execution metadata. Write: signed attestation records
- **No telemetry** is collected or sent

### Security Model

- **Ed25519 signatures:** All attestations are cryptographically signed
- **Immutable event log:** Append-only, hash-chained attestation records
- **Deterministic verification:** Same input produces same verification result
