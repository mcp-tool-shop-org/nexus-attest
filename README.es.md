<p align="center">
  <a href="README.md">English</a> | <a href="README.ja.md">日本語</a> | <a href="README.zh.md">中文</a> | <a href="README.es.md">Español</a> | <a href="README.fr.md">Français</a> | <a href="README.hi.md">हिन्दी</a> | <a href="README.it.md">Italiano</a> | <a href="README.pt-BR.md">Português (BR)</a>
</p>

<p align="center">
  <img src="logo.png" alt="nexus-attest logo" width="400" />
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

## ¿Por qué?

La ejecución de herramientas MCP en producción requiere flujos de trabajo de aprobación, registros de auditoría y cumplimiento de políticas. nexus-router se ejecuta de inmediato; no hay una capa de gobernanza.

**nexus-attest** agrega esa capa:

- Flujo de trabajo de solicitud / revisión / aprobación / ejecución con aprobaciones N-de-M.
- Paquetes de auditoría criptográficos que vinculan las decisiones de gobernanza con los resultados de la ejecución.
- Pruebas de testigos ancladas en XRPL para la verificación de terceros.
- Plantillas de políticas para patrones de aprobación repetibles.
- Seguimiento completo de eventos: cada estado se deriva al reproducir un registro inmutable.

Todo es exportable, verificable y reproducible. No hay estado mutable. No hay escrituras ocultas.

## Instalación

```bash
pip install nexus-attest
```

Requiere Python 3.11 o posterior.

## Guía rápida

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

Consulte [QUICKSTART.md](QUICKSTART.md) para obtener una descripción general completa con opciones de políticas, modo de prueba y vistas de línea de tiempo.

## Conceptos clave

### Flujo de gobernanza

```
Request ──► Policy ──► Approvals (N-of-M) ──► Execute ──► Audit Package
   │           │              │                    │              │
   │           │              │                    │              │
   ▼           ▼              ▼                    ▼              ▼
 Decision   Constraints   Actor trail        nexus-router    Binding digest
 created    attached      recorded           run_id linked   (tamper-evident)
```

### Qué se vincula

Cada paquete de auditoría vincula criptográficamente tres cosas:

| Componente | Qué captura |
| ----------- | ----------------- |
| **Control bundle** | La decisión, la política, las aprobaciones y las restricciones (lo que se permitió). |
| **Router section** | La identidad de la ejecución: `run_id` y `router_digest` (lo que realmente se ejecutó). |
| **Control-router link** | Por qué esta ejecución específica fue autorizada por esta decisión específica. |

El `binding_digest` es un hash SHA-256 de los tres elementos. Si algún componente cambia, el hash se invalida.

### Verificación

```python
from nexus_attest import verify_audit_package

verification = verify_audit_package(package)
assert verification.ok  # 6 independent checks, no short-circuiting
```

Las seis comprobaciones se ejecutan independientemente de los fallos; se informa de cualquier problema:

| Check | Qué se verifica |
| ------- | ----------------- |
| `binding_digest` | Recalcular a partir de los campos de enlace. |
| `control_bundle_digest` | Recalcular a partir del contenido del paquete de control. |
| `binding_control_match` | El enlace coincide con el paquete de control. |
| `binding_router_match` | El enlace coincide con la sección del router. |
| `binding_link_match` | El enlace coincide con el enlace de control-router. |
| `router_digest` | Integridad del paquete de router integrado (si corresponde). |

## Herramientas MCP

11 herramientas expuestas a través del Protocolo de Contexto del Modelo:

| Tool | Descripción |
| ------ | ------------- |
| `nexus-attest.request` | Crear una solicitud de ejecución con objetivo, política y aprobadores. |
| `nexus-attest.approve` | Aprobar una solicitud (admite aprobaciones N-de-M). |
| `nexus-attest.execute` | Ejecutar la solicitud aprobada a través de nexus-router. |
| `nexus-attest.status` | Obtener el estado de la solicitud y el estado de la ejecución vinculada. |
| `nexus-attest.inspect` | Inspección de solo lectura con salida legible por humanos. |
| `nexus-attest.template.create` | Crear una plantilla de política con nombre e inmutable. |
| `nexus-attest.template.get` | Recuperar una plantilla por nombre. |
| `nexus-attest.template.list` | Listar todas las plantillas con filtrado opcional por etiqueta. |
| `nexus-attest.export_bundle` | Exportar una decisión como un paquete portátil y con integridad verificada. |
| `nexus-attest.import_bundle` | Importar un paquete con modos de conflicto y validación de reproducción. |
| `nexus-attest.export_audit_package` | Exportar el paquete de auditoría que vincula la gobernanza con la ejecución. |

## Plantillas de decisión

Paquetes de políticas con nombre e inmutables que se pueden reutilizar en diferentes decisiones:

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

## Ciclo de vida de la decisión

Ciclo de vida calculado con razones de bloqueo y línea de tiempo:

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

## Exportar / Importar paquetes

Paquetes de decisión portátiles y con integridad verificada para la transferencia entre sistemas:

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

Modos de conflicto: `reject_on_conflict` | `new_decision_id` | `overwrite`

## Subsistema de atestación

La capa de atestación proporciona pruebas de testigos criptográficos con anclaje en XRPL:

### Intenciones de atestación

Solicitudes de atestación con direccionamiento de contenido y vinculación de sujeto:

```python
from nexus_attest.attestation import AttestationIntent

intent = AttestationIntent(
    subject_type="decision",
    binding_digest="sha256:abc123...",
    env="production",
    claims={"decision_id": "...", "outcome": "approved"},
)
```

### Backend de testigo XRPL

Certificación en cadena a través del Ledger de XRP para la verificabilidad por terceros:

| Componente | Propósito |
| ----------- | --------- |
| `XRPLAdapter` | Enviar transacciones de certificación |
| `JsonRpcClient` | Comunicarse con los nodos de XRPL |
| `ExchangeStore` | Rastrear la evidencia de solicitudes/respuestas |
| `MemoCodec` | Codificar/decodificar las cargas útiles de certificación en las notas de XRPL |
| `XRPLSigner` | Firma de transacciones |

### Narrativas de auto-verificación

Informes de auditoría legibles por humanos con controles de integridad integrados:

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

### Replicación de la certificación

Replicación determinista de las líneas de tiempo de la certificación para la verificación:

```python
from nexus_attest.attestation.replay import replay_attestation

report = replay_attestation(queue, intent_digest)
# Returns AttestationReport with receipt summaries,
# confirmation status, and exchange evidence
```

## Modelo de datos

### Diseño basado en eventos

Todo el estado se deriva de la reproducción de un registro de eventos inmutable:

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

### Modelo de políticas

```python
Policy(
    min_approvals=2,
    allowed_modes=["dry_run", "apply"],
    require_adapter_capabilities=["timeout"],
    max_steps=50,
    labels=["prod", "finance"],
)
```

### Modelo de aprobación

- Contado por `actor.id` distintos.
- Puede incluir `comentario` y un campo `expires_at` opcional.
- Puede ser revocado (antes de la ejecución).
- La ejecución requiere aprobaciones para satisfacer la política **en el momento de la ejecución**.

### Modos del enrutador

| Mode | Contiene | Caso de uso |
| ------ | ---------- | ---------- |
| **Reference** (default) | `run_id` + `router_digest` | CI, sistemas internos |
| **Embedded** | Paquete completo del enrutador + verificación cruzada | Reguladores, archivo a largo plazo |

Ambos modos son criptográficamente equivalentes en la capa de enlace.

## Estructura del proyecto

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

## Desarrollo

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

## Códigos de salida

| Code | Significado |
| ------ | --------- |
| `0` | Todas las comprobaciones pasaron |
| `1` | Error no manejado |
| `2` | Error de validación o de esquema |

## Licencia

MIT
