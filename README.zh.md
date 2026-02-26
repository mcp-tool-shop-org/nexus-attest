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

## 为什么

在生产环境中运行 MCP 工具需要审批流程、审计跟踪和策略执行。 nexus-router 会立即执行，没有治理层。

**nexus-attest** 增加了这一层：

- 带有 N-of-M 审批的请求/审查/批准/执行工作流程
- 密码学审计包，将治理决策与执行结果绑定
- 基于 XRPL 的凭证，用于第三方验证
- 策略模板，用于可重复的审批模式
- 全事件溯源，每个状态都是通过重放不可变日志推导出来的

所有内容都可以导出、验证和重放。没有可变状态。没有隐藏的写入操作。

## 安装

```bash
pip install nexus-attest
```

需要 Python 3.11 或更高版本。

## 快速入门

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

请参阅 [QUICKSTART.md](QUICKSTART.md)，了解带有策略选项、试运行模式和时间线视图的完整指南。

## 核心概念

### 治理流程

```
Request ──► Policy ──► Approvals (N-of-M) ──► Execute ──► Audit Package
   │           │              │                    │              │
   │           │              │                    │              │
   ▼           ▼              ▼                    ▼              ▼
 Decision   Constraints   Actor trail        nexus-router    Binding digest
 created    attached      recorded           run_id linked   (tamper-evident)
```

### 绑定内容

每个审计包都通过密码学方式将以下三者关联起来：

| 组件 | 它捕获的内容 |
| ----------- | ----------------- |
| **Control bundle** | 决策、策略、审批和约束（允许的内容） |
| **Router section** | 执行身份——`run_id` 和 `router_digest`（实际执行的内容） |
| **Control-router link** | 为什么这个特定的执行会由这个特定的决策授权 |

`binding_digest` 是所有三个组件的 SHA-256 哈希值。如果任何组件发生更改，哈希值就会失效。

### 验证

```python
from nexus_attest import verify_audit_package

verification = verify_audit_package(package)
assert verification.ok  # 6 independent checks, no short-circuiting
```

所有六个检查都会运行，无论是否出现错误——所有问题都会被报告：

| Check | 它验证的内容 |
| ------- | ----------------- |
| `binding_digest` | 从绑定字段重新计算 |
| `control_bundle_digest` | 从控制包内容重新计算 |
| `binding_control_match` | 绑定与控制包匹配 |
| `binding_router_match` | 绑定与路由器部分匹配 |
| `binding_link_match` | 绑定与控制-路由器链接匹配 |
| `router_digest` | 嵌入式路由器包完整性（如果适用） |

## MCP 工具

通过模型上下文协议暴露的 11 个工具：

| Tool | 描述 |
| ------ | ------------- |
| `nexus-attest.request` | 创建带有目标、策略和审批人的执行请求 |
| `nexus-attest.approve` | 批准请求（支持 N-of-M 审批） |
| `nexus-attest.execute` | 通过 nexus-router 执行已批准的请求 |
| `nexus-attest.status` | 获取请求状态和相关运行状态 |
| `nexus-attest.inspect` | 只读的内省，带有可读的输出 |
| `nexus-attest.template.create` | 创建命名、不可变的策略模板 |
| `nexus-attest.template.get` | 通过名称检索模板 |
| `nexus-attest.template.list` | 列出所有模板，并可选择使用标签进行过滤 |
| `nexus-attest.export_bundle` | 将决策导出为可移植、具有完整性验证的包 |
| `nexus-attest.import_bundle` | 导入包，支持冲突模式和重放验证 |
| `nexus-attest.export_audit_package` | 导出审计包，将治理与执行绑定 |

## 决策模板

命名、不可变的策略包，可以在决策中重复使用：

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

## 决策生命周期

带有阻塞原因和时间线的计算生命周期：

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

## 导出/导入包

可移植、具有完整性验证的决策包，用于跨系统传输：

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

冲突模式：`reject_on_conflict` | `new_decision_id` | `overwrite`

## 凭证子系统

凭证层提供基于 XRPL 的密码学凭证：

### 凭证意图

带有主体绑定的基于内容寻址的凭证请求：

```python
from nexus_attest.attestation import AttestationIntent

intent = AttestationIntent(
    subject_type="decision",
    binding_digest="sha256:abc123...",
    env="production",
    claims={"decision_id": "...", "outcome": "approved"},
)
```

### XRPL 凭证后端

通过XRP账本进行链上验证，以便第三方进行验证：

| 组件 | 目的 |
| ----------- | --------- |
| `XRPLAdapter` | 提交验证交易 |
| `JsonRpcClient` | 与XRPL节点进行通信 |
| `ExchangeStore` | 跟踪请求/响应证据 |
| `MemoCodec` | 在XRPL备忘录中编码/解码验证数据 |
| `XRPLSigner` | 交易签名 |

### 自我验证叙述

包含嵌入式完整性检查的、可读的审计报告：

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

### 验证重放

为了验证，对验证时间线的确定性重放：

```python
from nexus_attest.attestation.replay import replay_attestation

report = replay_attestation(queue, intent_digest)
# Returns AttestationReport with receipt summaries,
# confirmation status, and exchange evidence
```

## 数据模型

### 基于事件的设计

所有状态都是通过重放不可变的事件日志推导出来的：

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

### 策略模型

```python
Policy(
    min_approvals=2,
    allowed_modes=["dry_run", "apply"],
    require_adapter_capabilities=["timeout"],
    max_steps=50,
    labels=["prod", "finance"],
)
```

### 审批模型

- 通过不同的`actor.id`进行计数
- 可以包含`comment`以及可选的`expires_at`
- 可以撤销（在执行之前）
- 执行需要获得足够的批准，以满足策略，**在执行时**

### 路由模式

| Mode | 包含 | 用例 |
| ------ | ---------- | ---------- |
| **Reference** (default) | `run_id` + `router_digest` | CI，内部系统 |
| **Embedded** | 完整的路由包 + 交叉检查 | 监管机构，长期归档 |

这两种模式在绑定层在密码学上是等价的。

## 项目结构

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

## 开发

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

## 退出码

| Code | 含义 |
| ------ | --------- |
| `0` | 所有检查通过 |
| `1` | 未处理的错误 |
| `2` | 验证或模式错误 |

## 许可证

MIT
