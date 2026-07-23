# 06. Testing Plan

This document details the testing strategy, test coverage targets, validation procedures, and specific edge-case scenarios for the Expense Reimbursement Automation system.

---

## 1. Frontend Testing

### 1.1 UI Component & Layout Verification
* **Component Render Tests**: Verify that buttons, form fields, and navigations render correctly under `Employee`, `Manager`, `Finance`, and `Admin` permissions.
* **Responsive Layout Testing**: Validate responsive design behaviors across viewports using Cypress or Playwright:
  * Mobile view (<640px): Sidebar collapses into a drawer; receipt uploads display in a stack.
  * Desktop view (>1024px): Split-pane details (receipt on left, fields on right) align side-by-side.

### 1.2 Form & File Upload Validation
* **Form Validation**: Assert error displays on missing fields, negative amounts, or dates in the future.
* **File Upload Filters**: Attempt uploading forbidden formats (e.g., `.exe`, `.zip`, `.html`). Ensure the client intercepts them and displays a validation warning ("Only JPG, PNG, and PDF files are allowed"). This validation runs client-side before any upload is initiated.
* **File Size Limit**: Attempt uploading a file exceeding 5MB. Verify the client rejects it with an appropriate message before sending to the server.
* **Drag-and-Drop**: Verify that dragging a file over the upload zone highlights the drop area, and that invalid files are rejected visually and with a message upon drop.

---

## 2. Backend Testing

### 2.1 API & JWT Verification
* **Endpoint Protection**: Send requests to `/api/expenses` and `/api/admin/policies` without an `Authorization` header. Verify a `401 Unauthorized` and `403 Forbidden` response is returned respectively.
* **JWT Expiration**: Simulate requests using expired tokens to confirm session invalidation.

### 2.2 Database Operations & Concurrency
* **CRUD Unit Tests**: Run pytest suites to verify database write/read queries.
* **Atomic Transactions**: Test that database writes abort and roll back if the S3 file upload fails mid-transaction.

---

## 3. AI & Rule Engine Testing

### 3.1 OCR Parsing Accuracy
* **Scan Quality Levels**: Evaluate OCR performance across three distinct receipt quality brackets:
  1. *High Quality*: Clear, flat scanner images (Expected text recovery: $>98\%$).
  2. *Medium Quality*: Handheld camera snapshots with minor skew (Expected text recovery: $>90\%$).
  3. *Low Quality*: Blurred or poorly lit photos (Verify that confidence scores drop below 60% and trigger a warning banner).

### 3.2 Prompt Verification & Hallucination Audits
* **Format Compliance**: Send mock OCR blocks and assert that the LLM response is strictly compliant with the specified JSON schema without adding arbitrary markdown blocks.
* **Risk Score Consistency**: Feed the LLM known compliant and non-compliant datasets to verify it consistent grades risk levels (`Low`, `Medium`, `High`).

---

## 4. Integration & E2E Testing (UAT Flow)

To execute End-to-End User Acceptance Testing (UAT), follow this sequential script:

```
[Employee: Upload & Submit] ──> [Rule Engine: Validations] ──> [Manager: Approve]
                                                                      │
                                                                      ▼
[Audit Log: Record Entry]  <── [Finance: Verify & Pay]    <── [Notify Employee]
```

### UAT Test Steps
1. **Login as Employee** (`employee@demo.com`):
   * Upload receipt `taxi_receipt.png` ($25.50, dated yesterday).
   * Confirm the AI-extracted fields are correct and click **Submit**.
   * Assert status updates to `Submitted`.
2. **Login as Manager** (`manager@demo.com`):
   * Navigate to the Pending Approvals tab.
   * Verify the employee's request appears with a `Low` risk score.
   * Click **Approve**.
3. **Login as Finance Officer** (`finance@demo.com`):
   * Locate the approved request in the verification queue.
   * Click **Process Payment**, input a mock transaction ID (`TXN123456`), and confirm.
   * Assert status changes to `Paid`.
4. **Login as Employee** again:
   * Verify a notification bubble appears showing "Reimbursement Completed".
   * Check the expense detail page to verify the status is marked as `Paid` with the transaction ID.
5. **Login as Admin** (`admin@demo.com`):
   * Navigate to system logs. Verify that audit events for submission, manager approval, and finance payment are recorded.

---

## 5. Edge Case Handling

| Edge Case | Simulated Action | Expected System Behavior |
|---|---|---|
| **Duplicate Receipt** | Upload the same receipt file twice. | The Rule Engine flags the second upload as `High Risk` and alerts the reviewer with the matching historical expense ID. |
| **Blurred/Unreadable Receipt** | Upload a blurred image containing no clear text. | The system accepts the file, but sets the OCR confidence score below 50% and displays a warning to review details. |
| **Out-of-Bounds Amount** | Submit a meal reimbursement request for $10,000. | The Rule Engine flags the request as a policy violation and blocks submission. |
| **Large File Size** | Attempt to upload a 50MB PDF. | The API blocks the upload with a `413 Payload Too Large` error. |

---

## 6. Dedicated Testing Documents

Supplementary test case documents have been created alongside the main testing plan to cover specific functional areas in detail.

### 6.1 Authentication Testing (`auth_testing.md`)
Covers:
* **Login Testing**: Valid and invalid credential combinations, role-based redirect behaviour post-login.
* **Registration Testing**: New user registration flow, input validation, duplicate email detection.
* **JWT Authentication**: Token issuance, expiry simulation, token refresh behaviour.
* **Authorization**: Role-based access control verification — confirming each role can only access permitted routes and API endpoints.
* **API Endpoint Verification**: UAT-level checks confirming auth endpoints return correct status codes and payloads.

### 6.2 Image Upload Testing (`image_testing.md`)
Covers:
* **OCR Image Naming**: Verifying that uploaded files are stored with consistent, conflict-free naming conventions.
* **File Validation**: Client-side and server-side checks for allowed MIME types (JPG, PNG, PDF).
* **Upload Testing**: Happy-path upload flows including drag-and-drop and file picker interactions.
* **Invalid File Scenarios**: Behaviour when uploading unsupported file types (`.exe`, `.zip`, `.html`, etc.).
* **Size Validation**: Rejection of files exceeding the 5MB limit, with user-facing error messaging.
* **Supported Formats**: Confirmation that all three permitted formats (JPG, PNG, PDF) upload and parse correctly end-to-end.
