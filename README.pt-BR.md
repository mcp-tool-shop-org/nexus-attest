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

## Por que

A execução de ferramentas MCP em produção requer fluxos de trabalho de aprovação, trilhas de auditoria e aplicação de políticas. O nexus-router executa imediatamente – não há uma camada de governança.

O **nexus-attest** adiciona essa camada:

- Fluxo de trabalho de solicitação / revisão / aprovação / execução com aprovações N-de-M.
- Pacotes de auditoria criptográficos que vinculam as decisões de governança aos resultados da execução.
- Provas de testemunho ancoradas no XRPL para verificação por terceiros.
- Modelos de política para padrões de aprovação repetíveis.
- Rastreamento completo de eventos – cada estado é derivado da reprodução de um registro imutável.

Tudo é exportável, verificável e reproduzível. Não há estado mutável. Não há escritas ocultas.

## Instalação

```bash
pip install nexus-attest
```

Requer Python 3.11 ou posterior.

## Início Rápido

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

Consulte [QUICKSTART.md](QUICKSTART.md) para obter um guia completo com opções de política, modo de teste e visualizações de linha do tempo.

## Conceitos Principais

### Fluxo de Governança

```
Request ──► Policy ──► Approvals (N-of-M) ──► Execute ──► Audit Package
   │           │              │                    │              │
   │           │              │                    │              │
   ▼           ▼              ▼                    ▼              ▼
 Decision   Constraints   Actor trail        nexus-router    Binding digest
 created    attached      recorded           run_id linked   (tamper-evident)
```

### O que é Vinculado

Cada pacote de auditoria vincula criptograficamente três coisas:

| Componente | O que ele captura |
| ----------- | ----------------- |
| **Control bundle** | A decisão, a política, as aprovações e as restrições (o que foi permitido). |
| **Router section** | A identidade da execução – `run_id` e `router_digest` (o que realmente foi executado). |
| **Control-router link** | Por que essa execução específica foi autorizada por essa decisão específica. |

O `binding_digest` é um hash SHA-256 de todos os três. Se qualquer componente for alterado, o digest será invalidado.

### Verificação

```python
from nexus_attest import verify_audit_package

verification = verify_audit_package(package)
assert verification.ok  # 6 independent checks, no short-circuiting
```

Todas as seis verificações são executadas, independentemente de falhas – todos os problemas são relatados:

| Check | O que é verificado |
| ------- | ----------------- |
| `binding_digest` | Recalcular a partir dos campos de vinculação. |
| `control_bundle_digest` | Recalcular a partir do conteúdo do pacote de controle. |
| `binding_control_match` | Vinculação corresponde ao pacote de controle. |
| `binding_router_match` | Vinculação corresponde à seção do roteador. |
| `binding_link_match` | Vinculação corresponde ao link de controle-roteador. |
| `router_digest` | Integridade do pacote de roteador incorporado (se aplicável). |

## Ferramentas MCP

11 ferramentas expostas por meio do Protocolo de Contexto do Modelo:

| Tool | Descrição |
| ------ | ------------- |
| `nexus-attest.request` | Criar uma solicitação de execução com objetivo, política e aprovadores. |
| `nexus-attest.approve` | Aprovar uma solicitação (suporta aprovações N-de-M). |
| `nexus-attest.execute` | Executar a solicitação aprovada por meio do nexus-router. |
| `nexus-attest.status` | Obter o estado da solicitação e o status da execução vinculada. |
| `nexus-attest.inspect` | Introspecção somente leitura com saída legível por humanos. |
| `nexus-attest.template.create` | Criar um modelo de política nomeado e imutável. |
| `nexus-attest.template.get` | Recuperar um modelo por nome. |
| `nexus-attest.template.list` | Listar todos os modelos com filtragem opcional por rótulo. |
| `nexus-attest.export_bundle` | Exportar uma decisão como um pacote portátil e com integridade verificada. |
| `nexus-attest.import_bundle` | Importar um pacote com modos de conflito e validação de reprodução. |
| `nexus-attest.export_audit_package` | Exportar o pacote de auditoria vinculando a governança à execução. |

## Modelos de Decisão

Pacotes de política nomeados e imutáveis que podem ser reutilizados em várias decisões:

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

## Ciclo de Vida da Decisão

Ciclo de vida calculado com motivos de bloqueio e linha do tempo:

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

## Exportar / Importar Pacotes

Pacotes de decisão portáteis e com integridade verificada para transferência entre sistemas:

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

Modos de conflito: `reject_on_conflict` | `new_decision_id` | `overwrite`

## Subsistema de Atestado

A camada de atestado fornece provas de testemunho criptográficas com ancoragem no XRPL:

### Intenções de Atestado

Solicitações de atestado com endereçamento de conteúdo e vinculação de sujeito:

```python
from nexus_attest.attestation import AttestationIntent

intent = AttestationIntent(
    subject_type="decision",
    binding_digest="sha256:abc123...",
    env="production",
    claims={"decision_id": "...", "outcome": "approved"},
)
```

### Backend de Testemunho XRPL

Certificação on-chain através do XRP Ledger para verificação por terceiros:

| Componente | Propósito |
| ----------- | --------- |
| `XRPLAdapter` | Enviar transações de certificação |
| `JsonRpcClient` | Comunicar com os nós do XRPL |
| `ExchangeStore` | Rastrear evidências de requisição/resposta |
| `MemoCodec` | Codificar/decodificar os dados de certificação em notas do XRPL |
| `XRPLSigner` | Assinatura de transações |

### Narrativas de auto-verificação

Relatórios de auditoria legíveis por humanos com verificações de integridade embutidas:

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

### Repetição da Certificação

Repetição determinística das sequências de certificação para verificação:

```python
from nexus_attest.attestation.replay import replay_attestation

report = replay_attestation(queue, intent_digest)
# Returns AttestationReport with receipt summaries,
# confirmation status, and exchange evidence
```

## Modelo de Dados

### Design baseado em eventos

Todo o estado é derivado da repetição de um registro de eventos imutável:

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

### Modelo de Políticas

```python
Policy(
    min_approvals=2,
    allowed_modes=["dry_run", "apply"],
    require_adapter_capabilities=["timeout"],
    max_steps=50,
    labels=["prod", "finance"],
)
```

### Modelo de Aprovação

- Contado por `actor.id` distintos
- Pode incluir `comment` e um campo opcional `expires_at`
- Pode ser revogado (antes da execução)
- A execução requer aprovações para satisfazer a política **no momento da execução**

### Modos do Roteador

| Mode | Contém | Caso de Uso |
| ------ | ---------- | ---------- |
| **Reference** (default) | `run_id` + `router_digest` | CI, sistemas internos |
| **Embedded** | Pacote completo do roteador + verificação cruzada | Reguladores, arquivamento de longo prazo |

Ambos os modos são criptograficamente equivalentes na camada de vinculação.

## Estrutura do Projeto

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

## Desenvolvimento

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

## Códigos de Saída

| Code | Significado |
| ------ | --------- |
| `0` | Todas as verificações passaram |
| `1` | Erro não tratado |
| `2` | Erro de validação ou de esquema |

## Licença

MIT
