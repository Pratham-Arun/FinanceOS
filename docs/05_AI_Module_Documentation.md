# 05. AI Module Documentation

This document describes the end-to-end AI platform architecture for FinanceOS, spanning Phase 1 through Phase 10: Optical Character Recognition (OCR), Rule Engine, Duplicate Detection, Finance AI Agent, RAG Policy Integration, AI Chat Assistant, Dashboard Intelligence, Anomaly Detection, Smart Notifications, and AI Audit Logging.

---

## 1. Overall AI Architecture & Workflow

```
Employee Uploads Receipt (PNG, JPG, JPEG, PDF up to 20MB)
          │
          ▼
OCR Engine (Extracts fields + confidence scores per field)
          │
          ▼
Rule Engine (Policy limits, category checks, taxi/alcohol rules)
          │
          ▼
Duplicate Detection (Invoice #, merchant, date, amount, image hash)
          │
          ▼
Finance AI Agent (Risk analysis, compliance check, structured JSON, recommendation)
          │
          ▼
Manager Dashboard (High-Risk Queue, Quick Decisions, AI reasoning)
          │
          ▼
Finance Officer (Compliance score, fraud alerts, payment processing)
          │
          ▼
Audit Logs & Smart Notifications & Analytics Intelligence
```

---

## 2. Phase-by-Phase Technical Specifications

### Phase 1: OCR Integration
- **Input**: PNG, JPG, JPEG, PDF up to 20 MB.
- **Extracted Fields**:
  - `vendor` (value, confidence)
  - `invoice_number` (value, confidence)
  - `transaction_date` (value, confidence)
  - `currency` (value, confidence)
  - `subtotal` (value, confidence)
  - `tax_amount` (value, confidence)
  - `total_amount` (value, confidence)
  - `payment_method` (value, confidence)
  - `merchant_address` (value, confidence)
  - `gst_vat_number` (value, confidence)
  - `category` (value, confidence)
  - `overall_confidence` (score)
- **UX Requirement**: Low confidence scores (<0.85) highlighted visually in the submission UI for user review prior to final submission.

### Phase 2: Rule Engine (`services/rule_engine.py`)
- **Policy Enforcement**:
  - Meals: Maximum $50 limit; Alcohol non-reimbursable.
  - Travel: Hotel max $250/night; Flight economy class only; Taxi requires receipt.
  - Office: Stationery, Equipment, Internet, Software licenses.
- **Output Schema**:
  ```json
  {
    "policy_status": "PASS",
    "violations": [],
    "risk_score": 18
  }
  ```

### Phase 3: Duplicate Detection (`services/duplicate_service.py`)
- **Matching Criteria**: Composite key of (Invoice Number, Merchant, Amount, Date) + Image Hash similarity.
- **Output Schema**:
  ```json
  {
    "duplicate": true,
    "similar_expense": "EXP-1045",
    "confidence": 0.91
  }
  ```

### Phase 4: Finance AI Agent (`services/ai_service.py`)
- Evaluates OCR output, rule violations, duplicate flags, and employee expense history.
- **Output Schema**:
  ```json
  {
    "summary": "Hotel expense during client visit.",
    "risk": "Medium",
    "recommendation": "Approve",
    "confidence": 0.95,
    "reason": [
      "Amount within policy limit ($220 < $250/night)",
      "Receipt verified with 0.96 confidence",
      "No duplicates detected"
    ],
    "fraud_indicators": []
  }
  ```

### Phase 5: RAG Integration (`services/rag_service.py`)
- Stores Employee Handbook, Travel Policies, and HR Guidelines in vector embeddings (`BAAI/bge-small-en-v1.5` or `nomic-embed-text`).
- Performs semantic vector search to return grounded policy answers with clause citations.

### Phase 6: AI Chat Assistant (`services/chat_service.py`)
- Global floating chat widget and dedicated `/ai-chat` page.
- Answers queries on rejection reasons, submission guidelines, status updates, and policy boundaries.

### Phase 7: Dashboard Intelligence (`services/analytics_ai.py`)
- Provides AI Insights: Top spending categories, most violated policies, highest risk employees, pending approval trends, duplicate claim trends, monthly forecasts, and department anomalies.

### Phase 8: Anomaly Detection (`services/ai_service.py`)
- Flags unusual expenses: unusually large amounts (4x+ historical average), weekend transactions, frequent duplicate merchants, high refund frequencies, and unusual categories.
- Output: `{ "anomaly": true, "severity": "High", "reason": "Expense is 4x higher than historical average." }`

### Phase 9: Smart Notifications (`services/notification_service.py`)
- Actionable, role-based smart alerts: Manager (high risk pending approvals), Finance (fraud alerts), Employee (missing receipt or policy violation), Admin (policy update notifications).

### Phase 10: Audit Improvements (`repositories/ai_logs_repository.py`)
- Full auditability: captures raw OCR output, Rule Engine flags, AI recommendations, user edits, and manager/finance override actions.

---

## 3. Required API Endpoints

| Module | Method | Endpoint | Description |
|---|---|---|---|
| **OCR** | `POST` | `/api/ocr/upload` | Upload & process receipt file (max 20MB) |
| **OCR** | `GET` | `/api/ocr/{expenseId}` | Retrieve OCR data for expense |
| **Rules** | `POST` | `/api/rules/validate` | Validate draft against active policies |
| **AI Agent** | `POST` | `/api/ai/analyze` | Perform full AI risk & compliance analysis |
| **Chat** | `POST` | `/api/chat` | Send question to AI Assistant |
| **Knowledge Base** | `POST` | `/api/knowledge/upload` | Ingest policy document into vector DB |
| **Knowledge Base** | `GET` | `/api/knowledge/search` | Query policy vector DB |
| **Analytics** | `GET` | `/api/analytics/ai` | Fetch AI insights, forecasts, & anomalies |
| **Audit** | `GET` | `/api/audit/ai-logs` | Fetch auditable AI logs & override records |

---

## 4. Required Frontend Modules

- **Pages**:
  - `AIReview.jsx`: High-risk approval queue & AI analysis cards.
  - `AIChatPage.jsx`: Full-page AI policy & reimbursement assistant.
  - `KnowledgeBase.jsx`: RAG document management & vector index viewer.
  - `PolicyManager.jsx`: Company policy rule editor & limits configuration.
  - `AILogs.jsx`: System-wide AI audit and override viewer.
- **Updated Pages**:
  - `ExpenseDetails.jsx`: Added AI summary, confidence scores, risk gauge, duplicate warning.
  - `Dashboard.jsx`: High-risk queue, quick-decision panel, AI insights widgets.
  - `SubmitExpense.jsx`: OCR drag-and-drop up to 20MB, field confidence highlighting.
