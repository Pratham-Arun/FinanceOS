# Auth & Workflow Testing Notes

## Quick Start

Make sure both servers are running before testing:
- **Backend**: `cd backend && python -m uvicorn server:app --host 127.0.0.1 --port 8000`
- **Frontend**: `cd frontend && npm start` → http://localhost:3000

---

## Demo Credentials

| Role     | Email               | Password  |
|----------|---------------------|-----------|
| Admin    | admin@demo.com      | admin123  |
| Employee | employee@demo.com   | demo1234  |
| Manager  | manager@demo.com    | demo1234  |
| Finance  | finance@demo.com    | demo1234  |

---

## Auth Endpoint Tests

| Endpoint                | Method | Auth Required | Expected |
|------------------------|--------|---------------|---------|
| `/api/auth/login`       | POST   | No            | 200 + JWT token |
| `/api/auth/register`    | POST   | No            | 200 + JWT token |
| `/api/auth/me`          | GET    | Yes (Bearer)  | 200 + user object |
| `/api/auth/logout`      | POST   | No            | 200 success |
| `/api/expenses`         | GET    | No header     | 403 Forbidden |
| `/api/admin/policies`   | PUT    | Employee role | 403 Forbidden |

---

## Full UAT Test Flow

### 1. Employee - Submit an expense
1. Login as `employee@demo.com` / `demo1234`
2. Go to `/submit` → Upload a file named `taxi_receipt.png`
3. Confirm AI auto-fills: Travel / $24.50 / today's date
4. Click **Submit Expense Claim**
5. Assert redirect to `/expenses` with status `Submitted`

### 2. Manager - Approve
1. Login as `manager@demo.com` / `demo1234`
2. Dashboard shows pending claim from Jane Employee
3. Click **Review claim** → verify Low risk score
4. Select **Approve**, add comment "Approved – valid travel", click **Confirm Decision**
5. Assert expense status updates to `Approved`

### 3. Finance - Process Payment
1. Login as `finance@demo.com` / `demo1234`
2. Dashboard shows approved claim in payment queue
3. Click **Review claim** → Select **Approve & Pay**, add comment "Disbursed via bank transfer"
4. Click **Confirm Decision**
5. Assert expense status updates to `Paid` with a TXN reference

### 4. Employee - Verify receipt
1. Login back as `employee@demo.com`
2. Navigate to expense history → find the claim
3. Assert status shows `Paid` with payment reference displayed

### 5. Admin - Verify audit log
1. Login as `admin@demo.com` / `admin123`
2. Dashboard shows Recent System Audit Logs
3. Verify 3 entries: EXPENSE_CREATED, EXPENSE_ACTIONED (approve), EXPENSE_ACTIONED (paid)
4. Go to `/settings` → verify policy table loads correctly

---

## Edge Case Tests

| Test | Action | Expected |
|------|--------|---------|
| Invalid file type | Upload `.exe` file to /submit | "Invalid file type" error |
| Oversized file | Upload file > 5MB | "File is too large" error |
| Missing required fields | Submit form with empty title | Browser required validation |
| No auth token | `GET /api/expenses` without Bearer | 401 Unauthorized |
| Wrong role to policies | PUT /api/admin/policies as Employee | 403 Forbidden |
| Duplicate expense | Submit same vendor+amount+date twice | Risk flagged as Medium/High |
| Over limit amount | Submit Meal expense for $10,000 | risk_flags shows policy violation |
