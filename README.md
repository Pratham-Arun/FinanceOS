# FinanceOS

<div align="center">

# AI-Powered Enterprise Expense Reimbursement Platform

Enterprise-grade Expense Management Platform powered by OCR, Explainable AI, Rule Engine, Retrieval-Augmented Generation (RAG), Intelligent Workflow Automation, and Role-Based Access Control.

---

![React](https://img.shields.io/badge/Frontend-React-blue?style=for-the-badge)
![FastAPI](https://img.shields.io/badge/Backend-FastAPI-green?style=for-the-badge)
![MongoDB](https://img.shields.io/badge/Database-MongoDB-darkgreen?style=for-the-badge)
![Python](https://img.shields.io/badge/Python-3.13-blue?style=for-the-badge)
![JWT](https://img.shields.io/badge/Auth-JWT-orange?style=for-the-badge)
![AI](https://img.shields.io/badge/Enterprise-AI-purple?style=for-the-badge)
![RAG](https://img.shields.io/badge/RAG-Integrated-red?style=for-the-badge)

</div>

---

# Overview

FinanceOS is an AI-powered Enterprise Expense Reimbursement Platform designed to modernize and automate the complete reimbursement lifecycle.

Unlike traditional expense systems, FinanceOS combines Artificial Intelligence with enterprise workflow automation to reduce manual effort, improve compliance, detect fraud, and accelerate reimbursement approvals.

The platform supports multiple organizational roles with intelligent assistance throughout the reimbursement workflow.

FinanceOS was developed as an enterprise-scale software engineering project demonstrating modern frontend architecture, scalable backend design, modular AI integration, and production-inspired software practices.

---

# Features

## Expense Management

- Expense Submission
- Expense Tracking
- Receipt Upload
- Expense Categories
- Approval Workflow
- Payment Status
- Notifications

---

## Authentication & Security

- JWT Authentication
- Role-Based Access Control
- Protected APIs
- Secure Password Storage
- Authorization Middleware

---

## AI Capabilities

- OCR Receipt Extraction
- AI Expense Analysis
- Rule Engine Validation
- Duplicate Claim Detection
- Fraud Risk Scoring
- Explainable AI
- AI Confidence Scoring
- AI Recommendation Engine
- AI Copilot Assistant
- Retrieval-Augmented Generation (RAG)
- Policy Question Answering

---

## Enterprise Features

- Audit Logging
- AI Observability
- Policy Versioning
- AI Model Versioning
- AI Configuration Panel
- Knowledge Base
- Smart Notifications
- Enterprise Analytics

---

# System Architecture

```text
                 React Frontend
                        │
                        ▼
                 FastAPI Backend
                        │
      ┌─────────────────┼─────────────────┐
      ▼                 ▼                 ▼
 Authentication     Expense Service     AI Service
      │                 │                 │
      ▼                 ▼                 ▼
 Repository Layer   Rule Engine      LLM Provider
      │                 │                 │
      ▼                 ▼                 ▼
    MongoDB       OCR Provider      Vector Store
```

---

# AI Workflow

```text
Employee Uploads Receipt
            │
            ▼
OCR Extraction
            │
            ▼
Rule Engine Validation
            │
            ▼
Duplicate Detection
            │
            ▼
Fraud Risk Analysis
            │
            ▼
Explainable AI Recommendation
            │
            ▼
Manager Approval
            │
            ▼
Finance Approval
            │
            ▼
Payment
            │
            ▼
Audit Logs
            │
            ▼
Analytics
```

---

# User Roles

## Employee

Responsibilities

- Submit Expenses
- Upload Receipts
- Track Claim Status
- Receive Notifications
- Ask AI Copilot Questions

---

## Manager

Responsibilities

- Review Team Expenses
- Approve / Reject Claims
- Review High-Risk Claims
- View AI Recommendations

---

## Finance Officer

Responsibilities

- Final Expense Verification
- Payment Processing
- Compliance Review
- Analytics Monitoring

---

## Administrator

Responsibilities

- User Management
- Policy Management
- AI Configuration
- Knowledge Base Management
- AI Audit Logs
- Rule Engine Configuration

---

# AI Modules

## OCR Engine

Automatically extracts

- Vendor Name
- Invoice Number
- Transaction Date
- Currency
- Total Amount
- Tax Amount
- Payment Method
- Receipt Category

Supported Formats

- PNG
- JPG
- JPEG
- PDF

---

## Rule Engine

Validates

- Meal Limits
- Hotel Limits
- Travel Policies
- Receipt Requirements
- Duplicate Submission Rules
- Company Expense Policies

---

## Duplicate Detection

Detects duplicate claims using

- Invoice Number
- Merchant
- Amount
- Date
- Receipt Image Hash

---

## Explainable AI

Generates

- Expense Summary
- Recommendation
- Fraud Score
- Confidence Score
- Policy Violations
- Supporting Evidence

---

## Fraud Risk Scoring

Risk Scale

| Score | Level |
|--------|--------|
| 0–20 | Very Safe |
| 21–60 | Review |
| 61–100 | High Risk |

---

## RAG Knowledge Base

Allows AI to answer questions using

- Company Policies
- Travel Guidelines
- Employee Handbook
- Finance Documents
- Compliance Manuals

---

## AI Copilot

Provides

- Policy Assistance
- Expense Guidance
- Claim Status
- Reimbursement Help
- Compliance Questions

---

# Technology Stack

## Frontend

- React
- React Router
- Tailwind CSS
- Axios
- Recharts

---

## Backend

- FastAPI
- Python
- Pydantic
- Motor
- JWT Authentication

---

## Database

- MongoDB

---

## AI

- OCR
- Rule Engine
- Explainable AI
- RAG
- ChromaDB
- GPT / Gemini / Claude Provider Abstraction

---

# Project Structure

```
FinanceOS/

frontend/
    src/
    components/
    pages/
    hooks/
    services/

backend/
    repositories/
    services/
        ai/
        llm/
        ocr/
        vector_store/
    uploads/
    tests/

README.md
```

---

# Enterprise Architecture

Implemented Design Patterns

- Repository Pattern
- Service Layer Pattern
- Factory Pattern
- Provider Abstraction
- Dependency Injection
- Modular AI Services

---

# Security

- JWT Authentication
- Password Hashing
- Protected Routes
- Role-Based Authorization
- Audit Logging

---

# AI Provider Abstraction

Supported Providers

- OpenAI
- Google Gemini
- Anthropic Claude

Switch providers without modifying business logic.

---

# OCR Providers

Supported

- Tesseract
- Google Document AI
- Azure Document Intelligence

---

# AI Observability

Tracks

- Prompt
- Response
- Latency
- Token Usage
- AI Cost
- Model Version
- Policy Version
- Errors

---

# Testing

Backend

```bash
pytest
```

Results

```
20 Tests Passed
```

Frontend

```bash
npm run build
```

Build Status

```
Successful
```

---

# Installation

Clone Repository

```bash
git clone https://github.com/Pratham-Arun/FinanceOS.git
```

Backend

```bash
cd backend

uv sync

uv run uvicorn server:app --reload
```

Frontend

```bash
cd frontend

npm install

npm run dev
```

---

# Environment Variables

```env
MONGO_URI=

MONGO_DB_NAME=

JWT_SECRET=

OPENAI_API_KEY=

GOOGLE_API_KEY=

ANTHROPIC_API_KEY=
```

---

# Future Roadmap

Version 2

- Cloud Deployment
- Docker Support
- CI/CD
- Mobile Application
- ERP Integration
- Email Integration
- Real-Time Notifications
- Advanced Fraud Detection

---

# Highlights

Enterprise Features

- AI Expense Analysis
- OCR Automation
- Explainable AI
- Rule Engine
- RAG Integration
- AI Copilot
- Fraud Detection
- Policy Validation
- Enterprise Analytics
- AI Observability

---

# Team

**Pratham Arun**

B.Tech Computer Science Engineering

SRM Institute of Science and Technology

---

# License

This project is developed for academic, research, and portfolio purposes.

---

# Acknowledgements

Special thanks to the open-source community and modern AI technologies that inspired the architecture and implementation of FinanceOS.

---

<div align="center">

**FinanceOS**

Building the Future of Intelligent Enterprise Expense Management

</div>
