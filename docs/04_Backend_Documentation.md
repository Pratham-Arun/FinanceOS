# 04. Backend Documentation

This document describes the backend directory structure, data model (MongoDB collections), API layout, security controls, and endpoint contracts.

---

## 1. Backend Project Structure

The FastAPI backend follows a clean, layered architectural structure:

```
backend/
├── .env                       # App environment configuration variables
├── server.py                  # ASGI Application entrypoint & middleware registrations
├── requirements.txt           # Python application dependencies
├── config/
│   └── database.py            # MongoDB connection initialization and client config
├── models/                    # Pydantic schemas and database entity definitions
│   ├── user.py
│   ├── expense.py
│   ├── approval.py
│   └── policy.py
├── routers/                   # FastAPI path handlers (Controllers)
│   ├── auth.py
│   ├── expenses.py
│   ├── approvals.py
│   ├── admin.py
│   └── analytics.py
├── services/                  # Business logic implementations
│   ├── auth_service.py
│   ├── expense_service.py
│   ├── ai_service.py
│   └── notification_service.py
└── repositories/              # MongoDB collection data operations
    ├── user_repository.py
    └── expense_repository.py
```

---

## 2. Database Design (MongoDB Schema)

The database utilizes MongoDB to store flexible document objects. Data integrity is enforced using Pydantic model validations prior to persistence.

### 2.1 Collection: `users`
Stores user profile credentials, role flags, and organizational hierarchy references.
```json
{
  "_id": "ObjectId",
  "name": "String",
  "email": "String (Unique, Indexed)",
  "password_hash": "String",
  "role": "String (Admin | Employee | Manager | Finance)",
  "manager_id": "ObjectId (Nullable, references users._id)",
  "created_at": "ISODate"
}
```

### 2.2 Collection: `expenses`
Stores details of expense requests, extracted AI values, and OCR file paths.
```json
{
  "_id": "ObjectId",
  "employee_id": "ObjectId (Indexed, references users._id)",
  "title": "String",
  "category": "String (Travel | Accommodation | Meals | Supplies | Other)",
  "amount": "Decimal128",
  "currency": "String (Default: USD)",
  "expense_date": "ISODate",
  "description": "String",
  "receipt_url": "String",
  "status": "String (Draft | Submitted | Under Review | Approved | Rejected | Paid)",
  "ai_extraction": {
    "vendor": "String",
    "invoice_number": "String",
    "gst_number": "String",
    "extracted_amount": "Decimal128",
    "extracted_date": "ISODate",
    "confidence_scores": {
      "vendor": "Float",
      "amount": "Float",
      "date": "Float"
    }
  },
  "risk_score": "String (Low | Medium | High)",
  "risk_flags": ["String"],
  "payment_reference": "String (Nullable)",
  "created_at": "ISODate",
  "updated_at": "ISODate"
}
```

### 2.3 Collection: `approvals`
Tracks the approval lifecycle and manager/finance comments.
```json
{
  "_id": "ObjectId",
  "expense_id": "ObjectId (Indexed, references expenses._id)",
  "approver_id": "ObjectId (references users._id)",
  "action": "String (Approved | Rejected | Clarification Requested)",
  "comments": "String",
  "actioned_at": "ISODate"
}
```

### 2.4 Collection: `policies`
Defines active validation rules managed by the Admin.
```json
{
  "_id": "ObjectId",
  "category": "String (Unique, Indexed)",
  "max_limit": "Decimal128",
  "receipt_required": "Boolean",
  "duplicate_window_days": "Integer",
  "last_updated_by": "ObjectId (references users._id)",
  "updated_at": "ISODate"
}
```

### 2.5 Collection: `audit_logs`
An immutable log repository tracking all state transformations.
```json
{
  "_id": "ObjectId",
  "timestamp": "ISODate (Indexed)",
  "user_id": "ObjectId (references users._id)",
  "action": "String (USER_LOGIN | EXPENSE_SUBMITTED | MANAGER_APPROVED | FINANCE_PAID)",
  "resource_id": "ObjectId (e.g., expense_id)",
  "ip_address": "String",
  "details": "Document (KeyValue structure of modified fields)"
}
```

---

## 3. Security & Access Control (RBAC)

* **Authentication**: Requests must include an `Authorization: Bearer <JWT_TOKEN>` header.
* **Access Control**: Roles are checked using a dependency guard in FastAPI:
```python
def require_role(allowed_roles: List[str]):
    def dependency(current_user: User = Depends(get_current_user)):
        if current_user.role not in allowed_roles:
            raise HTTPException(status_code=403, detail="Permission Denied")
        return current_user
    return dependency
```

---

## 4. API Endpoint Specifications

### 4.1 Authentication API

#### `POST /api/auth/login`
Authenticates user and issues a bearer JWT token.
* **Request Headers**: `Content-Type: application/json`
* **Request Body**:
```json
{
  "email": "employee@demo.com",
  "password": "demo1234"
}
```
* **Response (200 OK)**:
```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5...",
  "token_type": "bearer",
  "user": {
    "id": "60d5ec49f1b29c2d18c1d530",
    "name": "Jane Doe",
    "email": "employee@demo.com",
    "role": "Employee"
  }
}
```
* **Error Codes**: `401 Unauthorized` (Invalid email/password).

#### `GET /api/auth/me`
Retrieves current authenticated session details.
* **Request Headers**: `Authorization: Bearer <JWT_TOKEN>`
* **Response (200 OK)**:
```json
{
  "id": "60d5ec49f1b29c2d18c1d530",
  "name": "Jane Doe",
  "email": "employee@demo.com",
  "role": "Employee"
}
```

---

### 4.2 Expense Management API

#### `POST /api/expenses/upload`
Uploads a raw receipt image for OCR and AI extraction.
* **Request Headers**: `Authorization: Bearer <JWT_TOKEN>`, `Content-Type: multipart/form-data`
* **Request Body**: Form parameter `file` (Binary image/PDF)
* **Response (201 Created)**:
```json
{
  "expense_id": "60d5ec49f1b29c2d18c1d531",
  "receipt_url": "/uploads/receipt_xyz.jpg",
  "ai_extraction": {
    "vendor": "Uber Inc.",
    "invoice_number": "UB-9921",
    "amount": 25.50,
    "date": "2026-07-20",
    "confidence_scores": {
      "vendor": 0.95,
      "amount": 0.98,
      "date": 0.92
    }
  }
}
```

#### `POST /api/expenses/{id}/submit`
Submits a finalized expense document to the workflow.
* **Request Headers**: `Authorization: Bearer <JWT_TOKEN>`, `Content-Type: application/json`
* **Request Body**:
```json
{
  "title": "Client dinner transport",
  "category": "Travel",
  "amount": 25.50,
  "expense_date": "2026-07-20",
  "description": "Taxi ride back from dinner meeting",
  "receipt_url": "/uploads/receipt_xyz.jpg"
}
```
* **Response (200 OK)**:
```json
{
  "id": "60d5ec49f1b29c2d18c1d531",
  "status": "Submitted",
  "risk_score": "Low",
  "risk_flags": []
}
```
* **Error Codes**: `400 Bad Request` (Validation rule failures), `404 Not Found`.

---

### 4.3 Approvals API

#### `POST /api/approvals/{id}/action`
Allows a Manager or Finance Officer to approve/reject an expense.
* **Request Headers**: `Authorization: Bearer <JWT_TOKEN>`, `Content-Type: application/json`
* **Request Body**:
```json
{
  "action": "Approved", 
  "comments": "Matches client project budget."
}
```
* **Response (200 OK)**:
```json
{
  "expense_id": "60d5ec49f1b29c2d18c1d531",
  "new_status": "Approved",
  "updated_at": "2026-07-21T15:00:00Z"
}
```

---

### 4.4 Admin Settings API

#### `GET /api/analytics`
Returns analytics data for the authenticated user. For Manager-role users, results are filtered to expenses submitted by their direct reports only.
* **Request Headers**: `Authorization: Bearer <JWT_TOKEN>`
* **Response (200 OK)**:
```json
{
  "monthly_totals": [...],
  "by_category": {...},
  "avg_cycle_time_days": [...]
}
```
* **Access**: `Manager`, `Finance`, `Admin`

---

#### `PUT /api/admin/policies`
Updates reimbursement threshold limits.
* **Request Headers**: `Authorization: Bearer <JWT_TOKEN> (Admin role required)`
* **Request Body**:
```json
{
  "category": "Meals",
  "max_limit": 75.00,
  "receipt_required": true,
  "duplicate_window_days": 30
}
```
* **Response (200 OK)**:
```json
{
  "status": "success",
  "message": "Policy updated successfully"
}
```
