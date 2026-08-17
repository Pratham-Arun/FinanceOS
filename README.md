# FinanceOS

Intelligent Expense Management for the Enterprise

> **Automate. Analyze. Explain. Approve.**

FinanceOS is an AI-powered expense reimbursement platform for modern enterprises. It combines a React frontend with a FastAPI backend to automate expense submission, OCR-based receipt extraction, policy validation, AI-assisted review, and multi-role approval workflows.

---

## 🔍 Explainable AI & Fraud Detection

FinanceOS delivers explainable AI analysis so Managers and Finance Officers understand **why** a claim has been flagged rather than simply seeing a numerical risk score:

- **Fraud risk score** (Low / Medium / High)
- **AI confidence metrics**
- **Actionable AI recommendation**
- **Policy violations & limit checks**
- **Supporting evidence & extracted flags**
- **Historical comparisons**
- **Duplicate detection information**
- **Relevant policy references**

---

## 📚 Retrieval-Augmented Generation (RAG)

FinanceOS includes a policy knowledge base that allows the AI assistant to answer questions using organizational documents.

The knowledge base can contain:
- Company expense policies
- Travel guidelines
- Finance policies
- Employee handbooks
- Compliance documents
- Internal reimbursement guidelines

The RAG workflow retrieves relevant policy information before generating grounded answers for users.

---

## 💬 AI Copilot

FinanceOS includes an AI Copilot that provides contextual assistance to users.

Users can ask questions such as:
- *"What is the meal allowance?"*
- *"Can I claim weekend travel?"*
- *"What documents are required for accommodation?"*
- *"Why was my expense flagged?"*
- *"What is the status of my claim?"*

The assistant uses available policy knowledge to provide accurate, grounded responses.

---

## 👥 Role-Based Workflow

### 👨‍💻 Employee

Employees can:
- Submit expenses
- Upload receipts
- Review OCR extraction
- Receive policy guidance
- Track claim status
- View notifications
- Ask the AI Copilot questions

```text
Create Expense
      │
      ▼
Upload Receipt
      │
      ▼
OCR Extraction
      │
      ▼
Policy Pre-Check
      │
      ▼
Review Expense
      │
      ▼
Submit Claim
```

### 👨‍💼 Manager

Managers can:
- View employee expenses
- Review submitted claims
- View uploaded receipts & OCR extractions
- Review policy validation & fraud risk scores
- View AI recommendations & high-risk flags
- Approve, reject, or request clarification on expenses
- View approval history

```text
Manager Review
Submitted Claim
       │
       ▼
Receipt + OCR
       │
       ▼
Policy Validation
       │
       ▼
Fraud Risk Analysis
       │
       ▼
AI Recommendation
       │
       ▼
Manager Decision
```

### 💼 Finance Officer

Finance Officers perform the financial verification stage:
- Review approved expenses awaiting payment
- Verify financial information & receipts
- Review AI analysis & check policy compliance
- Review complete audit history
- Process reimbursement / mark as paid

### 🛠️ Administrator

Administrators manage platform configurations & access control:
- User management & role permissions
- Expense policies & policy library
- Rule Engine rules & category thresholds
- AI configuration & AI model settings
- OCR configuration
- AI audit logs & system analytics

---

## ⚙️ AI Provider Abstraction

FinanceOS features an abstract provider architecture so AI model integrations can be seamlessly adapted or swapped without modifying core business logic.

- **Current Active Provider:** Google Gemini 2.5 Flash
- **Supported / Configurable Provider Architecture:** OpenAI, Google Gemini, Anthropic Claude, Groq

The system selects the active provider through the backend AI configuration layer.

---

## 📄 OCR Provider Abstraction

The OCR architecture decouples document text extraction from downstream expense workflow logic.

- **Current Active Provider:** Tesseract OCR
- **Supported / Configurable Provider Architecture:** Tesseract OCR, Google Document AI (Planned), Azure Document Intelligence (Planned)

This abstraction allows document processing models to be upgraded without impacting policy or approval pipelines.

---

## 🏗️ System Architecture

FinanceOS follows a modular enterprise backend architecture:

```text
                    React Frontend
                           │
                           ▼
                    FastAPI Backend
                           │
              ┌────────────┼────────────┐
              │            │            │
              ▼            ▼            ▼
        API Routers     Services      Authentication
              │            │
              │            ▼
              │       AI Services
              │            │
              │      ┌─────┼─────┐
              │      │     │     │
              │     OCR   LLM   RAG
              │      │     │     │
              └──────┼─────┼─────┘
                     │
                     ▼
              Repository Layer
                     │
                     ▼
                  MongoDB
```

---

## 🧱 Backend Architecture

The backend follows a clean architecture pattern refactored into a modular layout:

```text
Router
  ↓
Service
  ↓
Repository Interface (IRepository)
  ↓
MongoDB Repository (MongoRepository)
  ↓
MongoDB Database
```

This provides strict separation between:
- HTTP / API routing
- Core business logic
- Data access interfaces
- Database persistence infrastructure

---

## 📂 Backend Structure

```text
backend/
├── app.py
├── server.py
│
├── core/
│   ├── config.py
│   ├── security.py
│   ├── lifespan.py
│   ├── middleware.py
│   ├── logging.py
│   └── exceptions.py
│
├── dependencies/
│   └── auth.py
│
├── routers/
│   ├── auth_router.py
│   ├── expense_router.py
│   ├── approval_router.py
│   ├── notification_router.py
│   ├── analytics_router.py
│   ├── ai_router.py
│   ├── knowledge_router.py
│   └── admin_router.py
│
├── services/
│   ├── auth_service.py
│   ├── expense_service.py
│   ├── notification_service.py
│   ├── analytics_service.py
│   ├── analytics_ai_service.py
│   ├── ocr_service.py
│   ├── ai_service.py
│   ├── rule_engine.py
│   ├── admin_service.py
│   ├── rag_service.py
│   └── ...
│
├── repositories/
│   ├── interfaces/
│   │   └── base.py
│   └── ...
│
├── schemas/
├── seed/
├── tests/
└── uploads/
```

---

## 🧩 Design Patterns

FinanceOS utilizes several enterprise software engineering patterns:

- **Repository Pattern:** Separates database queries from business operations (`IRepository` → `MongoRepository`).
- **Service Layer:** Business operations reside inside dedicated service classes rather than route handlers.
- **Provider Abstraction:** AI and OCR services are isolated via provider interfaces.
- **Dependency Injection:** FastAPI dependencies manage authentication and request-scoped services.
- **Factory Architecture:** Provider factories load configured AI/OCR backends at runtime.

---

## 📊 Enterprise Observability & Auditability

### Observability Metrics
FinanceOS tracks AI operation metrics:
- Request ID & Timestamp
- Model & Provider selection
- Prompts & Responses
- Token usage & Latency
- Estimated cost & Errors
- Expense ID & Policy version

### 🔎 Request Correlation
Every incoming API request is stamped with a unique correlation identifier:

```text
Client Request ──► X-Request-ID Header ──► FastAPI Middleware ──► Router ──► Service ──► Repository
```

Example correlated log line:
```text
[INFO] [req=3f8a91b2c4e5] Expense Created expense_id=exp_001 user_id=user_123
```

### 📝 Audit Logging
Maintains full traceability for critical actions:
- Expense creation & updates
- Approval / Rejection decisions
- AI analysis & OCR parsing execution
- Policy rule evaluation
- System policy configuration changes

---

## 🔐 Security Architecture

- **JWT Authentication:** Stateful user session tokens with configurable expiry
- **Password Hashing:** Secure credential hashing using bcrypt
- **RBAC Authorization:** Strict route and resource guards (Employee, Manager, Finance, Admin)
- **Environment Secrets:** Isolated `.env` configuration for API keys and database strings
- **CORS Middleware:** Configured origin controls for safe frontend-backend requests

---

## 🧪 Testing

Automated pytest suite covers authentication, expense handling, approval workflows, and AI service logic.

Run backend tests:
```bash
cd backend
uv run pytest
```

---

## 🖥️ Frontend Architecture

Built with **React** and **Tailwind CSS** featuring role-scoped workspaces:
- Dashboard & KPI widgets
- Expense management & interactive submission dropzone
- Expense details with receipt viewer, OCR overlay & AI risk breakdown
- Multi-role Approval Workspace
- Enterprise Analytics (Recharts)
- Integrated AI Copilot & Policy Knowledge Base
- Admin Policy & Rule Engine configuration

---

## 🔄 Complete Expense Lifecycle

```text
Employee ──► Submit Expense ──► Upload Receipt ──► OCR Extraction ──► OCR Confidence Check
                                                                           │
                                                                           ▼
Analytics ◄── Audit Logging ◄── Payment ◄── Finance Review ◄── Manager Review ◄── Fraud Risk & AI Recommendation ◄── Rule Engine
```

---

## 🛠️ Technology Stack

| Domain | Technology |
|---|---|
| **Frontend** | React, React Router, Tailwind CSS, Axios, Recharts |
| **Backend** | Python 3.11+, FastAPI, Pydantic, Motor, PyJWT, Uvicorn |
| **Database** | MongoDB |
| **AI / ML & RAG** | Gemini 2.5 Flash, Tesseract OCR, ChromaDB |
| **Testing & Tooling** | Pytest, uv package manager, Git |

---

## ⚙️ Installation & Setup

### 1. Clone Repository
```bash
git clone https://github.com/Pratham-Arun/FinanceOS.git
cd FinanceOS
```

### 2. Backend Setup
```bash
cd backend
uv sync
uv run uvicorn server:app --reload
```
- API Base URL: `http://localhost:8000`
- Swagger Documentation: `http://localhost:8000/docs`

### 3. Frontend Setup
```bash
cd frontend
npm install
npm start
```
- App URL: `http://localhost:3000`

---

## 🔑 Environment Variables

Create a `.env` file in the `backend/` directory:

```env
MONGO_URI=mongodb://localhost:27017
MONGO_DB_NAME=financeos
JWT_SECRET=your-secure-jwt-secret

GEMINI_API_KEY=your-gemini-api-key
GROQ_API_KEY=your-groq-api-key
OPENAI_API_KEY=your-openai-api-key
```

---

## 👤 Demo Accounts

| Role | Email | Password |
|---|---|---|
| Employee | `employee@demo.com` | `demo1234` |
| Manager | `manager@demo.com` | `demo1234` |
| Finance | `finance@demo.com` | `demo1234` |
| Admin | `admin@demo.com` | `admin123` |

---

## 🗺️ Development Roadmap

- **Phase 1 — Core Platform:** Expense CRUD, Auth, MongoDB persistence, RBAC, Approval workflow
- **Phase 2 — AI Integration:** OCR extraction, Rule engine, Fraud risk scoring, Explainable AI
- **Phase 3 — Intelligent Knowledge:** RAG pipeline, Policy Knowledge Base, AI Copilot
- **Phase 4 — Enterprise Architecture:** Modular FastAPI refactoring, Service/Repository pattern, Provider abstraction
- **Phase 5 — Enterprise Hardening:** Structured logging, Request correlation IDs, AI observability, Audit logging

### 🔮 Future Enhancements
- Cloud Deployment & Docker Containerization
- CI/CD Pipelines
- ERP & Email System Integration
- Real-time Notifications & Mobile App

---

## 👨‍💻 Developer

**Pratham Arun**  
B.Tech Computer Science Engineering  
SRM Institute of Science and Technology  
[GitHub Profile](https://github.com/Pratham-Arun)

---

## 📄 License

This project was developed for academic, research, internship, and portfolio purposes.

---

## 🙏 Acknowledgements

FinanceOS was developed using open-source technologies and modern AI frameworks to explore AI-driven enterprise financial workflows with explainability, auditability, and modular software architecture.

<div align="center">

**FinanceOS**  
*Intelligent Expense Management for the Enterprise*  
**Automate. Analyze. Explain. Approve.**

</div>
