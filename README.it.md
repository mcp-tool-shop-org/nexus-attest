<p align="center">
  <a href="README.md">English</a> | <a href="README.ja.md">日本語</a> | <a href="README.zh.md">中文</a> | <a href="README.es.md">Español</a> | <a href="README.fr.md">Français</a> | <a href="README.hi.md">हिन्दी</a> | <a href="README.it.md">Italiano</a> | <a href="README.pt-BR.md">Português (BR)</a>
</p>

<p align="center">
  <img src="https://raw.githubusercontent.com/mcp-tool-shop-org/brand/main/logos/nexus-attest/readme.png" alt="nexus-attest logo" width="400" />
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

## Perché

L'esecuzione di strumenti MCP in ambiente di produzione richiede flussi di lavoro di approvazione, tracciabilità delle attività e applicazione delle policy. nexus-router viene eseguito immediatamente: non esiste un livello di governance.

**nexus-attest** aggiunge questo livello:

- Flusso di lavoro di richiesta / revisione / approvazione / esecuzione con approvazioni N-of-M
- Pacchetti di audit crittografici che associano le decisioni di governance ai risultati dell'esecuzione
- Prove di testimonianza ancorate a XRPL per la verificabilità da parte di terzi
- Modelli di policy per schemi di approvazione ripetibili
- Tracciamento completo degli eventi: ogni stato è derivato dalla riproduzione di un log immutabile

Tutto è esportabile, verificabile e riproducibile. Nessuno stato modificabile. Nessuna scrittura nascosta.

## Installazione

```bash
pip install nexus-attest
```

Richiede Python 3.11 o versioni successive.

## Guida rapida

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

Consultare [QUICKSTART.md](QUICKSTART.md) per una guida completa con opzioni di policy, modalità di test e visualizzazioni temporali.

## Concetti fondamentali

### Flusso di governance

```
Request ──► Policy ──► Approvals (N-of-M) ──► Execute ──► Audit Package
   │           │              │                    │              │
   │           │              │                    │              │
   ▼           ▼              ▼                    ▼              ▼
 Decision   Constraints   Actor trail        nexus-router    Binding digest
 created    attached      recorded           run_id linked   (tamper-evident)
```

### Cosa viene associato

Ogni pacchetto di audit associa crittograficamente tre elementi:

| Componente | Cosa viene catturato |
| ----------- | ----------------- |
| **Control bundle** | La decisione, la policy, le approvazioni e i vincoli (ciò che è stato consentito) |
| **Router section** | L'identità dell'esecuzione: `run_id` e `router_digest` (ciò che è stato effettivamente eseguito) |
| **Control-router link** | Perché questa specifica esecuzione è stata autorizzata da questa specifica decisione |

Il `binding_digest` è un hash SHA-256 di tutti e tre gli elementi. Se uno qualsiasi dei componenti cambia, l'hash si invalida.

### Verifica

```python
from nexus_attest import verify_audit_package

verification = verify_audit_package(package)
assert verification.ok  # 6 independent checks, no short-circuiting
```

Tutte e sei le verifiche vengono eseguite indipendentemente dagli errori: ogni problema viene segnalato.

| Check | Cosa viene verificato |
| ------- | ----------------- |
| `binding_digest` | Ricalcolo dai campi di binding |
| `control_bundle_digest` | Ricalcolo dal contenuto del bundle di controllo |
| `binding_control_match` | Il binding corrisponde al bundle di controllo |
| `binding_router_match` | Il binding corrisponde alla sezione del router |
| `binding_link_match` | Il binding corrisponde al collegamento controllo-router |
| `router_digest` | Integrità del bundle del router incorporato (se applicabile) |

## Strumenti MCP

11 strumenti esposti tramite il Model Context Protocol:

| Tool | Descrizione |
| ------ | ------------- |
| `nexus-attest.request` | Crea una richiesta di esecuzione con obiettivo, policy e approvatori |
| `nexus-attest.approve` | Approva una richiesta (supporta le approvazioni N-of-M) |
| `nexus-attest.execute` | Esegui la richiesta approvata tramite nexus-router |
| `nexus-attest.status` | Ottieni lo stato della richiesta e lo stato dell'esecuzione associata |
| `nexus-attest.inspect` | Introspezione di sola lettura con output leggibile |
| `nexus-attest.template.create` | Crea un modello di policy immutabile con nome |
| `nexus-attest.template.get` | Recupera un modello per nome |
| `nexus-attest.template.list` | Elenca tutti i modelli con filtraggio opzionale per etichetta |
| `nexus-attest.export_bundle` | Esporta una decisione come un bundle portatile con verifica dell'integrità |
| `nexus-attest.import_bundle` | Importa un bundle con modalità di conflitto e convalida della riproduzione |
| `nexus-attest.export_audit_package` | Esporta il pacchetto di audit che associa la governance all'esecuzione |

## Modelli di decisione

Bundle di policy immutabili con nome che possono essere riutilizzati in diverse decisioni:

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

## Ciclo di vita della decisione

Ciclo di vita calcolato con motivi di blocco e timeline:

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

## Esportazione / Importazione di bundle

Bundle di decisioni portabili con verifica dell'integrità per il trasferimento tra sistemi:

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

Modalità di conflitto: `reject_on_conflict` | `new_decision_id` | `overwrite`

## Sottosistema di attestazione

Il livello di attestazione fornisce prove di testimonianza crittografiche con ancoraggio a XRPL:

### Intenti di attestazione

Richieste di attestazione con indirizzamento basato sul contenuto e associazione al soggetto:

```python
from nexus_attest.attestation import AttestationIntent

intent = AttestationIntent(
    subject_type="decision",
    binding_digest="sha256:abc123...",
    env="production",
    claims={"decision_id": "...", "outcome": "approved"},
)
```

### Backend di testimonianza XRPL

Certificazione on-chain tramite il registro XRP per la verificabilità da parte di terzi:

| Componente | Scopo |
| ----------- | --------- |
| `XRPLAdapter` | Inviare transazioni di certificazione |
| `JsonRpcClient` | Comunicare con i nodi XRPL |
| `ExchangeStore` | Tracciare le prove di richiesta/risposta |
| `MemoCodec` | Codificare/decodificare i dati di certificazione nei memo XRPL |
| `XRPLSigner` | Firma delle transazioni |

### Narrative auto-verificanti

Report di audit leggibili dagli esseri umani con controlli di integrità integrati:

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

### Riproduzione della certificazione

Riproduzione deterministica delle sequenze di certificazione per la verifica:

```python
from nexus_attest.attestation.replay import replay_attestation

report = replay_attestation(queue, intent_digest)
# Returns AttestationReport with receipt summaries,
# confirmation status, and exchange evidence
```

## Modello dei dati

### Progettazione basata su eventi

Tutto lo stato è derivato riproducendo un registro di eventi immutabile:

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

### Modello delle politiche

```python
Policy(
    min_approvals=2,
    allowed_modes=["dry_run", "apply"],
    require_adapter_capabilities=["timeout"],
    max_steps=50,
    labels=["prod", "finance"],
)
```

### Modello di approvazione

- Calcolato in base a `actor.id` univoci
- Può includere un `commento` e un campo `expires_at` opzionale
- Può essere revocato (prima dell'esecuzione)
- L'esecuzione richiede approvazioni per soddisfare la politica **al momento dell'esecuzione**

### Modalità del router

| Mode | Contiene | Caso d'uso |
| ------ | ---------- | ---------- |
| **Reference** (default) | `run_id` + `router_digest` | CI, sistemi interni |
| **Embedded** | Pacchetto completo del router + controllo incrociato | Enti regolatori, archiviazione a lungo termine |

Entrambe le modalità sono crittograficamente equivalenti a livello di binding.

## Struttura del progetto

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

## Sviluppo

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

## Codici di uscita

| Code | Significato |
| ------ | --------- |
| `0` | Tutti i controlli superati |
| `1` | Errore non gestito |
| `2` | Errore di validazione o di schema |

## Licenza

MIT
