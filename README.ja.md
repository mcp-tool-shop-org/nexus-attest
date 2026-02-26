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

## なぜ

本番環境でMCPツールを実行するには、承認ワークフロー、監査ログ、およびポリシー適用が必要です。nexus-routerは即座に実行されます。ガバナンスの仕組みはありません。

**nexus-attest**は、その仕組みを追加します。

- N-of-M承認によるリクエスト/レビュー/承認/実行ワークフロー
- ガバナンスの決定と実行結果を結びつける暗号化された監査パッケージ
- サードパーティによる検証を可能にするXRPLベースの証明
- 繰り返し利用可能な承認パターン用のポリシーテンプレート
- 完全なイベントソーシング：すべての状態は、変更不可能なログを再生することで導出されます。

すべてエクスポート可能、検証可能、かつ再実行可能です。変更可能な状態はありません。隠された書き込みもありません。

## インストール

```bash
pip install nexus-attest
```

Python 3.11以降が必要です。

## クイックスタート

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

[QUICKSTART.md](QUICKSTART.md)を参照して、ポリシーオプション、ドライランモード、およびタイムラインビューを使用した詳細な手順を確認してください。

## 主要な概念

### ガバナンスフロー

```
Request ──► Policy ──► Approvals (N-of-M) ──► Execute ──► Audit Package
   │           │              │                    │              │
   │           │              │                    │              │
   ▼           ▼              ▼                    ▼              ▼
 Decision   Constraints   Actor trail        nexus-router    Binding digest
 created    attached      recorded           run_id linked   (tamper-evident)
```

### 関連付けられるもの

すべての監査パッケージは、以下の3つの要素を暗号的に関連付けます。

| コンポーネント | キャプチャされる内容 |
| ----------- | ----------------- |
| **Control bundle** | 決定、ポリシー、承認、および制約（許可された内容） |
| **Router section** | 実行主体（`run_id`と`router_digest`）（実際に実行された内容） |
| **Control-router link** | この特定の実行が、この特定の決定によってどのように承認されたか |

`binding_digest`は、これら3つの要素すべてに対するSHA-256ハッシュです。いずれかのコンポーネントが変更されると、ハッシュは無効になります。

### 検証

```python
from nexus_attest import verify_audit_package

verification = verify_audit_package(package)
assert verification.ok  # 6 independent checks, no short-circuiting
```

エラーが発生した場合でも、すべての6つのチェックが実行されます。すべての問題が報告されます。

| Check | 検証される内容 |
| ------- | ----------------- |
| `binding_digest` | バインディングフィールドから再計算 |
| `control_bundle_digest` | コントロールバンドルの内容から再計算 |
| `binding_control_match` | バインディングがコントロールバンドルと一致 |
| `binding_router_match` | バインディングがルーターセクションと一致 |
| `binding_link_match` | バインディングがコントロール-ルーターのリンクと一致 |
| `router_digest` | 埋め込みルーターバンドルの整合性（該当する場合） |

## MCPツール

Model Context Protocolを介して公開されている11のツール：

| Tool | 説明 |
| ------ | ------------- |
| `nexus-attest.request` | 目標、ポリシー、および承認者を含む実行リクエストを作成 |
| `nexus-attest.approve` | リクエストを承認（N-of-M承認をサポート） |
| `nexus-attest.execute` | nexus-routerを介して承認されたリクエストを実行 |
| `nexus-attest.status` | リクエストの状態と関連する実行ステータスを取得 |
| `nexus-attest.inspect` | 人間が読める出力形式での読み取り専用のインスペクション |
| `nexus-attest.template.create` | 名前付きで不変のポリシーテンプレートを作成 |
| `nexus-attest.template.get` | 名前でテンプレートを取得 |
| `nexus-attest.template.list` | オプションでラベルによるフィルタリングを行い、すべてのテンプレートを一覧表示 |
| `nexus-attest.export_bundle` | 決定を、ポータブルで整合性が検証されたバンドルとしてエクスポート |
| `nexus-attest.import_bundle` | バンドルをインポートし、競合モードと再検証を実行 |
| `nexus-attest.export_audit_package` | 監査パッケージをバインドして、ガバナンスを実行に結びつける |

## 決定テンプレート

決定間で再利用できる名前付きで不変のポリシーバンドル：

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

## 決定ライフサイクル

ブロック理由とタイムラインを含む、計算されたライフサイクル：

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

## バンドルのエクスポート/インポート

システム間で転送するための、ポータブルで整合性が検証された決定バンドル：

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

競合モード：`reject_on_conflict` | `new_decision_id` | `overwrite`

## アテステーションサブシステム

アテステーションレイヤーは、XRPLをアンカーとする暗号化された検証証明を提供します。

### アテステーションの目的

件名バインディングを含む、コンテンツベースのアテステーションリクエスト：

```python
from nexus_attest.attestation import AttestationIntent

intent = AttestationIntent(
    subject_type="decision",
    binding_digest="sha256:abc123...",
    env="production",
    claims={"decision_id": "...", "outcome": "approved"},
)
```

### XRPL検証バックエンド

XRP Ledger を利用したオンチェーンでの認証機能：第三者による検証を可能にします。

| コンポーネント | 目的 |
| ----------- | --------- |
| `XRPLAdapter` | 認証トランザクションの送信 |
| `JsonRpcClient` | XRPL ノードとの通信 |
| `ExchangeStore` | リクエスト/レスポンスの証拠の追跡 |
| `MemoCodec` | XRPL メモにおける認証データのエンコード/デコード |
| `XRPLSigner` | トランザクションの署名 |

### 自己検証可能なナラティブ

内蔵された整合性チェックを含む、人間が読める監査レポート：

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

### 認証の再実行

検証のための、認証のタイムラインの決定的な再実行：

```python
from nexus_attest.attestation.replay import replay_attestation

report = replay_attestation(queue, intent_digest)
# Returns AttestationReport with receipt summaries,
# confirmation status, and exchange evidence
```

## データモデル

### イベントソース設計

すべての状態は、変更不可能なイベントログを再実行することで導出されます。

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

### ポリシーモデル

```python
Policy(
    min_approvals=2,
    allowed_modes=["dry_run", "apply"],
    require_adapter_capabilities=["timeout"],
    max_steps=50,
    labels=["prod", "finance"],
)
```

### 承認モデル

- `actor.id` ごとにカウントされます。
- `comment` を含めることができ、オプションで `expires_at` を設定できます。
- 実行前に取り消すことができます。
- 実行には、ポリシーを満たす承認が必要です（**実行時**）。

### ルーティングモード

| Mode | 含まれるもの | ユースケース |
| ------ | ---------- | ---------- |
| **Reference** (default) | `run_id` + `router_digest` | CI、内部システム |
| **Embedded** | 完全なルーティングバンドル + クロスチェック | 規制当局、長期アーカイブ |

両方のモードは、バインディング層において暗号学的に同等です。

## プロジェクト構造

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

## 開発

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

## 終了コード

| Code | 意味 |
| ------ | --------- |
| `0` | すべてのチェックに合格 |
| `1` | 予期しないエラー |
| `2` | 検証エラーまたはスキーマエラー |

## ライセンス

MIT
