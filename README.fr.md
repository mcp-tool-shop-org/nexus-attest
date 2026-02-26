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

## Pourquoi

L'exécution des outils MCP en production nécessite des flux de validation, des pistes d'audit et l'application de politiques. nexus-router s'exécute immédiatement – il n'y a pas de couche de gouvernance.

**nexus-attest** ajoute cette couche :

- Flux de demande/examen/approbation/exécution avec des approbations N-de-M.
- Paquets d'audit cryptographiques qui associent les décisions de gouvernance aux résultats d'exécution.
- Preuves de témoin ancrées dans XRPL pour une vérification par des tiers.
- Modèles de politiques pour des schémas d'approbation répétables.
- Traçabilité complète des événements : chaque état est dérivé en rejouant un journal immuable.

Tout est exportable, vérifiable et rejouable. Pas d'état mutable. Pas d'écritures cachées.

## Installation

```bash
pip install nexus-attest
```

Nécessite Python 3.11 ou une version ultérieure.

## Démarrage rapide

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

Consultez [QUICKSTART.md](QUICKSTART.md) pour un guide complet avec les options de politique, le mode test et les vues chronologiques.

## Concepts clés

### Flux de gouvernance

```
Request ──► Policy ──► Approvals (N-of-M) ──► Execute ──► Audit Package
   │           │              │                    │              │
   │           │              │                    │              │
   ▼           ▼              ▼                    ▼              ▼
 Decision   Constraints   Actor trail        nexus-router    Binding digest
 created    attached      recorded           run_id linked   (tamper-evident)
```

### Ce qui est lié

Chaque paquet d'audit lie cryptographiquement trois éléments :

| Composant | Ce qu'il capture |
| ----------- | ----------------- |
| **Control bundle** | La décision, la politique, les approbations et les contraintes (ce qui était autorisé) |
| **Router section** | L'identité de l'exécution – `run_id` et `router_digest` (ce qui a réellement été exécuté) |
| **Control-router link** | Pourquoi cette exécution spécifique a été autorisée par cette décision spécifique |

Le `binding_digest` est un hachage SHA-256 de tous les trois éléments. Si un composant change, le hachage est invalide.

### Vérification

```python
from nexus_attest import verify_audit_package

verification = verify_audit_package(package)
assert verification.ok  # 6 independent checks, no short-circuiting
```

Les six vérifications sont exécutées quel que soit le résultat – chaque problème est signalé :

| Check | Ce qui est vérifié |
| ------- | ----------------- |
| `binding_digest` | Recalculer à partir des champs de liaison |
| `control_bundle_digest` | Recalculer à partir du contenu du paquet de contrôle |
| `binding_control_match` | La liaison correspond au paquet de contrôle |
| `binding_router_match` | La liaison correspond à la section du routeur |
| `binding_link_match` | La liaison correspond au lien de contrôle-routeur |
| `router_digest` | Intégrité du paquet de routeur intégré (si applicable) |

## Outils MCP

11 outils accessibles via le protocole de contexte du modèle :

| Tool | Description |
| ------ | ------------- |
| `nexus-attest.request` | Créer une demande d'exécution avec un objectif, une politique et des approbateurs. |
| `nexus-attest.approve` | Approuver une demande (prend en charge les approbations N-de-M). |
| `nexus-attest.execute` | Exécuter la demande approuvée via nexus-router. |
| `nexus-attest.status` | Obtenir l'état de la demande et le statut de l'exécution associée. |
| `nexus-attest.inspect` | Introspection en lecture seule avec une sortie lisible par l'homme. |
| `nexus-attest.template.create` | Créer un modèle de politique nommé et immuable. |
| `nexus-attest.template.get` | Récupérer un modèle par son nom. |
| `nexus-attest.template.list` | Lister tous les modèles avec un filtrage optionnel par étiquette. |
| `nexus-attest.export_bundle` | Exporter une décision sous forme de paquet portable et dont l'intégrité est vérifiée. |
| `nexus-attest.import_bundle` | Importer un paquet avec des modes de conflit et une validation de relecture. |
| `nexus-attest.export_audit_package` | Exporter le paquet d'audit reliant la gouvernance à l'exécution. |

## Modèles de décision

Paquets de politiques nommés et immuables qui peuvent être réutilisés dans différentes décisions :

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

## Cycle de vie de la décision

Cycle de vie calculé avec des raisons de blocage et une chronologie :

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

## Exporter/Importer des paquets

Paquets de décisions portables et dont l'intégrité est vérifiée pour le transfert entre systèmes :

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

Modes de conflit : `reject_on_conflict` | `new_decision_id` | `overwrite`

## Sous-système d'attestation

La couche d'attestation fournit des preuves de témoin cryptographiques avec ancrage XRPL :

### Intentions d'attestation

Demandes d'attestation adressées par contenu avec liaison au sujet :

```python
from nexus_attest.attestation import AttestationIntent

intent = AttestationIntent(
    subject_type="decision",
    binding_digest="sha256:abc123...",
    env="production",
    claims={"decision_id": "...", "outcome": "approved"},
)
```

### Backend de témoin XRPL

Attestation sur la blockchain via le registre XRP pour une vérification par des tiers :

| Composant | Objectif |
| ----------- | --------- |
| `XRPLAdapter` | Soumettre des transactions d'attestation. |
| `JsonRpcClient` | Communiquer avec les nœuds XRPL. |
| `ExchangeStore` | Suivre les preuves de requête/réponse. |
| `MemoCodec` | Encoder/dé coder les données d'attestation dans les notes XRPL. |
| `XRPLSigner` | Signature des transactions. |

### Narrations auto-vérifiables

Rapports d'audit lisibles par l'homme avec des contrôles d'intégrité intégrés :

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

### Relecture de l'attestation

Relecture déterministe des chronologies d'attestation pour la vérification :

```python
from nexus_attest.attestation.replay import replay_attestation

report = replay_attestation(queue, intent_digest)
# Returns AttestationReport with receipt summaries,
# confirmation status, and exchange evidence
```

## Modèle de données

### Conception basée sur les événements

L'état est dérivé en rejouant un journal d'événements immuable :

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

### Modèle de politique

```python
Policy(
    min_approvals=2,
    allowed_modes=["dry_run", "apply"],
    require_adapter_capabilities=["timeout"],
    max_steps=50,
    labels=["prod", "finance"],
)
```

### Modèle d'approbation

- Comptabilisé par `actor.id` distinct.
- Peut inclure un `comment` et une date d'expiration optionnelle (`expires_at`).
- Peut être révoqué (avant l'exécution).
- L'exécution nécessite des approbations pour satisfaire la politique **au moment de l'exécution**.

### Modes de routage

| Mode | Contient | Cas d'utilisation |
| ------ | ---------- | ---------- |
| **Reference** (default) | `run_id` + `router_digest` | CI, systèmes internes. |
| **Embedded** | Ensemble complet de routage + vérification croisée. | Organismes de réglementation, archivage à long terme. |

Les deux modes sont cryptographiquement équivalents au niveau de la liaison.

## Structure du projet

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

## Développement

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

## Codes de sortie

| Code | Signification |
| ------ | --------- |
| `0` | Tous les contrôles ont réussi. |
| `1` | Erreur non gérée. |
| `2` | Erreur de validation ou de schéma. |

## Licence

MIT
