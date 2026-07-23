# 03. System Architecture

This document describes the high-level architecture, subsystem interactions, and core workflows of the AI-powered Expense Reimbursement Automation system.

---

## 1. High-Level Architecture

The system uses a decoupled, service-oriented architecture comprising a single-page React frontend, a FastAPI backend, an AI processing pipeline (OCR + LLM), a MongoDB database, and file storage.

```mermaid
graph TD
    Client[React Frontend SPA]
    API[FastAPI Backend Server]
    DB[(MongoDB Database)]
    Storage[Receipt File Storage]
    OCR[OCR Parser Engine]
    LLM[LLM & AI Agent Engine]
    Notif[Notification Service]

    Client -->|HTTPS / JSON| API
    API -->|Read/Write| DB
    API -->|Upload Files| Storage
    API -->|Process Document| OCR
    API -->|Validate & Summarize| LLM
    API -->|Trigger Alert| Notif
    Notif -->|SMTP / WebSocket| Client
```

---

## 2. Component Descriptions

### 2.1 React Frontend
* **Core Framework**: React (Single Page Application).
* **State Management**: React Context API for global state (Auth, Notifications) and local component state for forms/filters.
* **Network Client**: Axios for HTTP communication with backend API endpoints.

### 2.2 FastAPI Backend
* **ASGI Framework**: Python FastAPI serving as the central API gateway.
* **Routing Layer**: Modular routers divided by concern (`auth`, `expenses`, `approvals`, `policies`, `analytics`).
* **Service Layer**: Business logic coordinator (encapsulates workflow rules, routes to AI, triggers notifications).
* **Repository Layer**: Data Access Object (DAO) pattern interacting with MongoDB.

### 2.3 AI Services
* **OCR Parser**: Extracts raw text blocks and coordinates from uploaded receipt images/PDFs.
* **LLM Engine**: Extracts structured JSON metadata from the raw OCR text blocks (Vendor, Invoice Number, Amount, Tax, Date).
* **Finance AI Agent**: Evaluates the submission, compares values with the Policy Knowledge Base, performs risk checks, and generates a compliance assessment.

### 2.4 Data & Storage Layer
* **MongoDB**: NoSQL database storing JSON collections for users, expenses, policies, notifications, and logs.
* **File Storage**: Local filesystem path (development) or S3 bucket (production) storing binary receipt uploads.

---

## 3. Core Workflow Sequence Diagrams

### 3.1 Expense Submission Flow
This workflow traces the submission of a receipt by an employee, from upload to pre-filled review.

```mermaid
sequenceDiagram
    autonumber
    actor Employee
    participant FE as Frontend (React)
    participant BE as Backend (FastAPI)
    participant ST as File Storage
    participant OCR as OCR Service
    participant AI as Finance AI Agent
    participant DB as MongoDB

    Employee->>FE: Upload receipt file
    FE->>BE: POST /api/expenses/upload (multipart file)
    BE->>ST: Save receipt binary
    ST-->>BE: Return file URI
    BE->>OCR: Scan receipt file
    OCR-->>BE: Return raw text
    BE->>AI: Analyze text & extract JSON
    AI-->>BE: Return structured metadata & confidence scores
    BE->>DB: Save draft expense document
    BE-->>FE: Return JSON structure
    FE-->>Employee: Pre-fill review form with highlighted fields
```

### 3.2 Approval & Validation Flow
This workflow describes the validation checks and routing path for Manager and Finance review.

```mermaid
sequenceDiagram
    autonumber
    actor Employee
    actor Manager
    actor Finance
    participant BE as Backend (FastAPI)
    participant RE as Rule Engine
    participant DB as MongoDB
    participant NT as Notification Service

    Employee->>BE: Submit finalized expense
    BE->>RE: Run policy validations (limits, duplicate checks)
    RE-->>BE: Return rule flags & risk score
    alt Rule Violation Found
        BE->>DB: Save expense as Rejected
        BE->>NT: Trigger violation alert
        NT-->>Employee: Show rejection notification
    else Compliance Check Passed
        BE->>DB: Save expense (Status: Submitted)
        BE->>NT: Dispatch approval request
        NT-->>Manager: In-app notification & email
        Manager->>BE: POST /api/approvals (Approve)
        BE->>DB: Update status to Approved
        BE->>NT: Dispatch verification request
        NT-->>Finance: Alert Finance Officers
        Finance->>BE: POST /api/approvals/pay (Process Payment)
        BE->>DB: Update status to Paid & write transaction ID
        BE->>NT: Send payment receipt notification
        NT-->>Employee: Notification: Expense Paid
    end
```
