# FinanceOS

> AI-Powered Enterprise Expense Reimbursement Platform

FinanceOS is a modern enterprise expense reimbursement platform designed to automate the entire reimbursement lifecycle using Artificial Intelligence, OCR, policy validation, and multi-stage approval workflows.

The platform enables employees to submit expenses, managers to review AI-assisted recommendations, finance teams to verify and process reimbursements, and administrators to configure company reimbursement policies, all through a clean enterprise-grade interface.

---

## Features

### Authentication & Authorization

- JWT Authentication
- Role-Based Access Control (RBAC)
- Employee
- Manager
- Finance Officer
- Administrator

### Expense Management

- Create Draft Expenses
- Submit Expenses
- Edit Drafts
- Delete Drafts
- Expense History
- Receipt Upload

### AI-Powered Workflow

- OCR Receipt Processing
- AI Expense Analysis
- Policy Validation
- Duplicate Detection
- Risk Assessment
- AI Recommendation Engine

### Approval Workflow

Employee

↓

Manager Review

↓

Finance Verification

↓

Payment Processing

↓

Audit Logging

### Analytics

- Expense Trends
- Category Breakdown
- Monthly Reports
- Approval Statistics
- Department Spending
- Dashboard KPIs

### Administration

- Policy Management
- User Management
- Audit Logs
- Notification Center

---

# Technology Stack

## Frontend

- React
- React Router
- Tailwind CSS
- Recharts
- Axios

## Backend

- FastAPI
- Python
- Motor (MongoDB Async Driver)
- JWT Authentication
- Pydantic

## Database

- MongoDB Community Edition

## AI

- OCR Pipeline
- Rule Engine
- Finance AI Review
- Explainable AI (Planned)
- RAG Policy Retrieval (Planned)

---

# System Architecture

```
                +----------------------+
                |      React UI        |
                +----------+-----------+
                           |
                           |
                    REST API (FastAPI)
                           |
      +---------+----------+----------+
      |         |                     |
 Authentication Expenses        Analytics
      |         |                     |
      +---------+----------+----------+
                           |
                      MongoDB Database
                           |
                   AI Processing Layer
         OCR → Rule Engine → AI Review
```

---

# Expense Workflow

```
Employee

↓

Upload Receipt

↓

OCR Extraction

↓

AI Policy Validation

↓

Manager Approval

↓

Finance Verification

↓

Payment

↓

Audit Log
```

---

# Project Structure

```
FinanceOS/
│
├── frontend/
│   ├── src/
│   ├── public/
│   └── package.json
│
├── backend/
│   ├── repositories/
│   ├── services/
│   ├── utils/
│   ├── tests/
│   ├── database.py
│   ├── server.py
│   └── pyproject.toml
│
├── docs/
│
└── README.md
```

---

# Getting Started

## Clone the Repository

```bash
git clone https://github.com/Pratham-Arun/FinanceOS.git

cd FinanceOS
```

---

# Backend Setup

```bash
cd backend

uv sync

uv run uvicorn server:app --reload
```

Backend will run at

```
http://127.0.0.1:8000
```

Swagger Documentation

```
http://127.0.0.1:8000/docs
```

---

# Frontend Setup

```bash
cd frontend

npm install

npm start
```

Frontend will run at

```
http://localhost:3000
```

---

# Environment Variables

Create a `.env` file inside the backend directory.

```env
MONGO_URI=mongodb://127.0.0.1:27017/expense_reimbursement

MONGO_DB_NAME=expense_reimbursement

JWT_SECRET=your-secret-key

OPENAI_API_KEY=your-api-key
```

Never commit your `.env` file.

---

# Screenshots

## Login

> Add Screenshot

---

## Dashboard

> Add Screenshot

---

## Expense Submission

> Add Screenshot

---

## Analytics

> Add Screenshot

---

## AI Review

> Add Screenshot

---

# API Overview

| Method | Endpoint | Description |
|---------|----------|-------------|
| POST | /api/auth/login | Login |
| POST | /api/auth/register | Register |
| GET | /api/expenses | Get Expenses |
| POST | /api/expenses | Create Expense |
| PUT | /api/expenses/{id} | Update Expense |
| DELETE | /api/expenses/{id} | Delete Expense |
| POST | /api/approvals/{id} | Approve Expense |
| GET | /api/notifications | Notifications |
| GET | /api/analytics | Analytics |

---

# Current Features

- JWT Authentication
- MongoDB Integration
- Repository Pattern
- Service Layer
- Expense CRUD
- Approval Workflow
- Notifications
- Analytics Dashboard
- Structured Logging
- Pagination
- MongoDB Indexes
- Audit Logging
- Comprehensive Test Suite

---

# Roadmap

## Phase 1

- Authentication
- Expense Workflow
- Analytics

Completed

## Phase 2

- OCR Receipt Processing
- Rule Engine
- AI Expense Review

In Progress

## Phase 3

- RAG Policy Engine
- Explainable AI
- Smart Recommendations
- AI Chat Assistant

Planned

## Phase 4

- Docker
- CI/CD
- Kubernetes Deployment
- Multi-Tenant Architecture

Planned

---

# Testing

Run all backend tests

```bash
uv run pytest -v
```

---

# Future Enhancements

- Invoice Processing
- Vendor Management
- Budget Planning
- Procurement
- Compliance Dashboard
- Mobile Application

---

# Contributing

Contributions are welcome.

Please open an issue before submitting major changes.

---

# License

This project is licensed under the MIT License.

---

# Author

**Pratham Arun**

B.Tech Computer Science Engineering

SRM Institute of Science and Technology

GitHub

https://github.com/Pratham-Arun

LinkedIn

(Add your LinkedIn profile)

---

## If you found this project interesting, consider giving it a ⭐ on GitHub!
