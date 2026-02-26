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

## क्यों?

उत्पादन वातावरण में एमसीपी (MCP) टूल चलाने के लिए, अनुमोदन प्रक्रियाएं, ऑडिट ट्रेल और नीति प्रवर्तन की आवश्यकता होती है। नेक्सस-राउटर (nexus-router) तुरंत काम करता है - इसमें कोई शासन (governance) परत नहीं होती।

"nexus-attest" एक अतिरिक्त सुविधा प्रदान करता है:

- एन-ऑफ-एम अनुमोदन के साथ वर्कफ़्लो का अनुरोध, समीक्षा, अनुमोदन और निष्पादन।
- क्रिप्टोग्राफिक ऑडिट पैकेज जो शासन संबंधी निर्णयों को निष्पादन परिणामों से जोड़ते हैं।
- एक्सआरपीएल-आधारित प्रमाण जो तीसरे पक्ष द्वारा सत्यापन की अनुमति देते हैं।
- दोहराए जाने वाले अनुमोदन प्रक्रियाओं के लिए नीति टेम्पलेट्स।
- पूर्ण घटना-आधारित ट्रैकिंग - प्रत्येक स्थिति एक अपरिवर्तनीय लॉग को फिर से चलाने से प्राप्त होती है।

सब कुछ निर्यात करने योग्य, सत्यापित करने योग्य और पुनः चलाने योग्य है। कोई भी परिवर्तनशील अवस्था नहीं है। कोई भी गुप्त लेखन नहीं है।

## स्थापित करें।

```bash
pip install nexus-attest
```

इसके लिए पायथन 3.11 या उसके बाद के संस्करण की आवश्यकता है।

## शुरुआत कैसे करें।

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

विस्तृत जानकारी के लिए, जिसमें नीतिगत विकल्प, परीक्षण मोड और समय-सीमा दृश्य शामिल हैं, [QUICKSTART.md](QUICKSTART.md) देखें।

## मुख्य अवधारणाएं।

### प्रशासनिक प्रक्रिया प्रवाह।

```
Request ──► Policy ──► Approvals (N-of-M) ──► Execute ──► Audit Package
   │           │              │                    │              │
   │           │              │                    │              │
   ▼           ▼              ▼                    ▼              ▼
 Decision   Constraints   Actor trail        nexus-router    Binding digest
 created    attached      recorded           run_id linked   (tamper-evident)
```

### जो चीजें बंध जाती हैं।

प्रत्येक ऑडिट पैकेज में तीन चीजों को क्रिप्टोग्राफिक रूप से जोड़ा जाता है:

| घटक। | यह क्या दर्शाता है। |
| कृपया वह अंग्रेजी पाठ प्रदान करें जिसका आप हिंदी में अनुवाद करवाना चाहते हैं। मैं उसका सटीक और उचित अनुवाद करने की पूरी कोशिश करूंगा। | ज़रूर, मैं आपकी मदद कर सकता हूँ। कृपया वह अंग्रेजी पाठ प्रदान करें जिसका आप हिंदी में अनुवाद करवाना चाहते हैं। |
| **Control bundle** | यह निर्णय, नीति, स्वीकृतियां और सीमाएं (यानी, क्या अनुमत था) शामिल हैं। |
| **Router section** | कार्यान्वयन की पहचान: `run_id` और `router_digest` (जो वास्तव में निष्पादित हुआ)। |
| **Control-router link** | इस विशेष निर्णय के द्वारा ही क्यों इस विशेष निष्पादन (कार्यान्वयन) को अधिकृत किया गया? |

`binding_digest` एक SHA-256 हैश है जो तीनों घटकों पर आधारित है। यदि किसी भी घटक में बदलाव होता है, तो यह हैश (digest) अमान्य हो जाता है।

### सत्यापन।

```python
from nexus_attest import verify_audit_package

verification = verify_audit_package(package)
assert verification.ok  # 6 independent checks, no short-circuiting
```

सभी छह जांचें, चाहे उनमें कोई त्रुटि हो या न हो, हमेशा चलती हैं - हर समस्या की रिपोर्ट की जाती है।

| Check | यह क्या सत्यापित करता है? |
| "The quick brown fox jumps over the lazy dog."

"तेज़ भूरी लोमड़ी आलसी कुत्ते के ऊपर से कूदती है।" | ज़रूर, मैं आपकी मदद कर सकता हूँ। कृपया वह अंग्रेजी पाठ प्रदान करें जिसका आप हिंदी में अनुवाद करवाना चाहते हैं। |
| `binding_digest` | बाइंडिंग फ़ील्ड्स से फिर से गणना करें। |
| `control_bundle_digest` | नियंत्रण बंडल की सामग्री के आधार पर पुनः गणना करें। |
| `binding_control_match` | "बाइंडिंग" (Binding) से जुड़ी मैचों की नियंत्रण बंडल। |
| `binding_router_match` | यह सुविधा राउटर अनुभाग को एक साथ जोड़ती है। |
| `binding_link_match` | यह सेटिंग, "बाइंडिंग," कंट्रोल-राउटर लिंक को नियंत्रित करता है। |
| `router_digest` | एम्बेडेड राउटर बंडल की अखंडता (यदि लागू हो)। |

## एमसीपी टूल्स

मॉडल कॉन्टेक्स्ट प्रोटोकॉल के माध्यम से 11 उपकरण उपलब्ध कराए गए हैं:

| Tool | विवरण। |
| "Please provide the English text you would like me to translate into Hindi." | कृपया वह अंग्रेजी पाठ प्रदान करें जिसका आप हिंदी में अनुवाद करवाना चाहते हैं। मैं उसका सटीक और उचित अनुवाद करने के लिए तैयार हूं। |
| `nexus-attest.request` | एक निष्पादन अनुरोध बनाएं, जिसमें लक्ष्य, नीति और अनुमोदनकर्ता शामिल हों। |
| `nexus-attest.approve` | किसी अनुरोध को स्वीकृत करें (यह एन-ऑफ-एम अनुमोदन प्रणाली का समर्थन करता है)। |
| `nexus-attest.execute` | अनुमोदित अनुरोध को नेक्सस-राउटर के माध्यम से क्रियान्वित करें। |
| `nexus-attest.status` | अनुरोध की स्थिति और उससे जुड़े रन की स्थिति प्राप्त करें। |
| `nexus-attest.inspect` | केवल पढ़ने की अनुमति वाले डेटा की जांच, जो कि मानव-पठनीय प्रारूप में प्रदर्शित हो। |
| `nexus-attest.template.create` | एक नामित, अपरिवर्तनीय नीति टेम्पलेट बनाएं। |
| `nexus-attest.template.get` | नाम के आधार पर एक टेम्पलेट प्राप्त करें। |
| `nexus-attest.template.list` | सभी टेम्प्लेट की सूची दिखाएं, जिसमें वैकल्पिक रूप से लेबल के आधार पर फ़िल्टर करने का विकल्प हो। |
| `nexus-attest.export_bundle` | एक निर्णय को एक ऐसे पैकेज के रूप में निर्यात करें जो आसानी से स्थानांतरित किया जा सके और जिसकी प्रामाणिकता की पुष्टि की जा सके। |
| `nexus-attest.import_bundle` | एक ऐसे बंडल को इम्पोर्ट करें जिसमें संघर्ष समाधान (conflict resolution) के तरीके और पुनः सत्यापन (replay validation) शामिल हों। |
| `nexus-attest.export_audit_package` | निर्यात लेखा परीक्षा पैकेज, शासन को क्रियान्वयन से जोड़ता है। |

## निर्णय के लिए टेम्पलेट।

ऐसे नामित और अपरिवर्तनीय नीति समूह जिन्हें विभिन्न निर्णयों में बार-बार उपयोग किया जा सकता है:

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

## निर्णय चक्र।

गणना की गई जीवनचक्र अवधि, जिसमें बाधा डालने वाले कारणों और समय-सीमा का विवरण शामिल है:

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

## निर्यात/आयात पैकेज।

पोर्टेबल, अखंडता-सत्यापित निर्णय पैकेजों का उपयोग विभिन्न प्रणालियों के बीच डेटा स्थानांतरित करने के लिए:

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

संघर्ष समाधान के तरीके: `reject_on_conflict` | `new_decision_id` | `overwrite`

## प्रमाणीकरण उप-प्रणाली।

एटस्टेशन लेयर, एक्सआरपीएल (XRPL) के माध्यम से क्रिप्टोग्राफिक प्रमाण प्रदान करता है।

### प्रमाणीकरण इरादे।

सामग्री-आधारित प्रमाणन अनुरोध, जिसमें विषय-आधारित बाध्यता शामिल है:

```python
from nexus_attest.attestation import AttestationIntent

intent = AttestationIntent(
    subject_type="decision",
    binding_digest="sha256:abc123...",
    env="production",
    claims={"decision_id": "...", "outcome": "approved"},
)
```

### XRPL विटनेस बैकएंड।

एक्सआरपी लेजर के माध्यम से ब्लॉकचेन पर सत्यापन, ताकि किसी भी तीसरे पक्ष द्वारा इसकी पुष्टि की जा सके:

| घटक। | उद्देश्य। |
| कृपया वह अंग्रेजी पाठ प्रदान करें जिसका आप हिंदी में अनुवाद करवाना चाहते हैं। | ज़रूर, मैं आपकी मदद कर सकता हूँ। कृपया वह अंग्रेजी पाठ प्रदान करें जिसका आप हिंदी में अनुवाद करवाना चाहते हैं। |
| `XRPLAdapter` | प्रमाणीकरण लेनदेन जमा करें। |
| `JsonRpcClient` | XRPL नोड्स के साथ संवाद करें। |
| `ExchangeStore` | अनुरोध/प्रतिक्रिया के प्रमाणों को ट्रैक करें। |
| `MemoCodec` | XRPL मेमो में एन्कोडिंग/डिकोडिंग के माध्यम से प्रमाणीकरण डेटा को सुरक्षित करें। |
| `XRPLSigner` | लेन-देन पर हस्ताक्षर। |

### स्व-सत्यापन योग्य विवरण।

मानव-पठनीय ऑडिट रिपोर्टें जिनमें अंतर्निहित सत्यता जांच शामिल हैं:

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

### प्रमाणीकरण का पुन: प्रदर्शन

सत्यापन के लिए, प्रमाणन प्रक्रियाओं के समय-क्रम का पूर्वनिर्धारित तरीके से पुन: प्रदर्शन।

```python
from nexus_attest.attestation.replay import replay_attestation

report = replay_attestation(queue, intent_digest)
# Returns AttestationReport with receipt summaries,
# confirmation status, and exchange evidence
```

## डेटा मॉडल।

### इवेंट-आधारित डिज़ाइन।

सभी डेटा एक अपरिवर्तनीय घटना लॉग को फिर से चलाने से प्राप्त होता है।

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

### नीति मॉडल।

```python
Policy(
    min_approvals=2,
    allowed_modes=["dry_run", "apply"],
    require_adapter_capabilities=["timeout"],
    max_steps=50,
    labels=["prod", "finance"],
)
```

### अनुमोदन मॉडल।

- यह गिनती विशिष्ट `actor.id` के आधार पर की जाती है।
- इसमें `comment` शामिल हो सकता है और वैकल्पिक रूप से `expires_at` भी हो सकता है।
- इसे रद्द किया जा सकता है (निष्पादन से पहले)।
- निष्पादन के लिए, नीति का अनुपालन **निष्पादन के समय** सुनिश्चित करने के लिए अनुमोदन की आवश्यकता होती है।

### राउटर के मोड।

| Mode | में शामिल है। | उपयोग परिदृश्य। |
| "The quick brown fox jumps over the lazy dog."

"सूर्य पूर्व में उगता है और पश्चिम में अस्त होता है।"

"कृपया दरवाजा बंद करें।"

"क्या आप मेरी मदद कर सकते हैं?"

"मुझे एक कप चाय चाहिए।"
------
"तेज़ भूरी लोमड़ी आलसी कुत्ते के ऊपर से कूदती है।"

"सूर्य पूर्व दिशा में उगता है और पश्चिम दिशा में अस्त होता है।"

"कृपया दरवाजा बंद करें।"

"क्या आप मेरी मदद कर सकते हैं?"

"मुझे एक कप चाय चाहिए।" | ज़रूर, मैं आपकी मदद कर सकता हूँ। कृपया वह अंग्रेजी पाठ प्रदान करें जिसका आप हिंदी में अनुवाद करवाना चाहते हैं। | ज़रूर, मैं आपकी मदद कर सकता हूँ। कृपया वह अंग्रेजी पाठ प्रदान करें जिसका आप हिंदी में अनुवाद करवाना चाहते हैं। |
| **Reference** (default) | `रन_आईडी` + `राउटर_डाइजेस्ट` | सीआई, आंतरिक प्रणालियाँ। |
| **Embedded** | पूरा राउटर पैकेज + क्रॉस-चेक। | नियामक, दीर्घकालिक अभिलेखागार। |

दोनों मोड, एन्क्रिप्शन की प्रक्रिया में, एक ही स्तर पर क्रिप्टोग्राफिक रूप से समान हैं।

## परियोजना की संरचना।

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

## विकास।

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

## निकास कोड।

| Code | अर्थ। |
| "Please provide the English text you would like me to translate into Hindi." | ज़रूर, मैं आपकी मदद कर सकता हूँ। कृपया वह अंग्रेजी पाठ प्रदान करें जिसका आप हिंदी में अनुवाद करवाना चाहते हैं। |
| `0` | सभी जांचें सफल रहीं। |
| `1` | अप्रत्याशित त्रुटि। |
| `2` | मान्यकरण त्रुटि या स्कीमा त्रुटि। |

## लाइसेंस।

एमआईटी।
