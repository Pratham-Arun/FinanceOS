# 08. User Manual

This manual provides instructions for users based on their assigned system roles: **Employee**, **Manager**, **Finance Officer**, and **Administrator**.

---

## 1. Getting Started

### 1.1 Accessing the Application
Open a web browser and navigate to the application URL (e.g., `http://localhost:5173`).

### 1.2 Authentication Credentials
Use the following demo accounts to test different roles:

| Role | Email | Password | Purpose |
|---|---|---|---|
| **Admin** | `admin@demo.com` | `admin123` | Global policy configuration & user hierarchy |
| **Employee** | `employee@demo.com` | `demo1234` | Uploading receipts & submitting claims |
| **Manager** | `manager@demo.com` | `demo1234` | Reviewing direct report submissions |
| **Finance** | `finance@demo.com` | `demo1234` | Verifying claims & processing payments |

---

## 2. Employee Workflow Guide

### 2.1 Submitting a Reimbursement Request
1. Log in with the **Employee** credentials.
2. Click **Submit Expense** on the sidebar menu.
3. Locate the **Receipt Upload Zone** and drag-and-drop a receipt image (PNG, JPG) or PDF file.
4. Wait 3–5 seconds. The OCR engine will scan the receipt, and pre-fill the form on the right.
5. Review the pre-filled fields (Amount, Date, Vendor Name, Category, GST). Fields with high confidence will be highlighted in green; low confidence in yellow.
6. Make edits to any fields that require correction.
7. Click **Submit Request** to forward the claim to your manager.

### 2.2 Tracking Submission Status
1. Click **Expense History** on the sidebar.
2. Use the status filters (`Draft`, `Submitted`, `Under Review`, `Approved`, `Paid`, `Rejected`) to locate specific requests.
3. Click on any record to open the split-pane viewer, displaying the uploaded receipt and workflow logs.

### 2.3 Saving a Draft
1. On the **Submit Expense** page, fill in any available details.
2. Click **Save to Drafts** instead of submitting. The request is saved with a `Draft` status (shown in slate grey).
3. Return to **Expense History** and filter by `Draft` to find and resume incomplete submissions.

---

## 3. Manager Workflow Guide

### 3.1 Reviewing and Actioning Claims
1. Log in with the **Manager** credentials.
2. Your dashboard will display a badge counter showing pending approvals.
3. Click on a pending expense claim from the table.
4. Examine the dual-pane view:
   * **Left Pane**: The actual receipt image.
   * **Right Pane**: Extracted fields and any warnings flagged by the AI engine (e.g., "Amount exceeds limit of $500", "Possible duplicate").
5. Take one of the following actions:
   * **Approve**: Route the expense to the Finance verification queue.
   * **Reject**: Prompts a text dialog. You must enter a rejection reason (e.g., "Client name missing from description") before submitting.
   * **Request Clarification**: Sends the claim back to the Employee's draft status to edit and resubmit.

### 3.2 Viewing Department Analytics
1. Click **Analytics** on the sidebar (available to Manager and Finance roles).
2. The analytics data is scoped to your direct reports — you will only see expense breakdowns and trends for employees assigned to you.
3. Use the charts to review monthly spending totals, category breakdowns, and average reimbursement cycle times.

---

## 4. Finance Officer Workflow Guide

### 4.1 Payment Verification & Execution
1. Log in with the **Finance** credentials.
2. The verification queue will display all manager-approved expenses.
3. Check the **AI Risk Assessment** score for each item:
   * *Low Risk*: Complies with all policies; safe to process.
   * *Medium/High Risk*: Potential duplicate receipt or policy threshold breach. Double-check the invoice details.
4. Select a compliant claim and click **Process Payment**.
5. Disburse funds outside the system, then return and input the transaction reference ID (e.g., `TXN9812739`).
6. Click **Confirm Payment**. The employee is notified, and the status changes to `Paid`.

---

## 5. Admin Workflow Guide

### 5.1 Setting Policy Constraints
1. Log in with the **Admin** credentials.
2. Click **Policy Management** on the sidebar.
3. Select an expense category (e.g., *Meals*).
4. Update the **Max Limit ($)** field (e.g., from $50.00 to $75.00) or check the box to require receipt uploads for this category.
5. Click **Save Policy**. The Rule Engine will validate new submissions against these parameters.

---

## 6. Frequently Asked Questions (FAQ)

#### Q: What file formats can I upload for my receipts?
A: The system supports `.png`, `.jpg`, `.jpeg`, and `.pdf` files. The maximum size per upload is 5MB. Files are validated on the client side before uploading — invalid types and oversized files are rejected immediately with an error message.

#### Q: Can I save a request without submitting it?
A: Yes. On the Submit Expense page, click **Save to Drafts**. Your request will be saved with a `Draft` status and can be found and resumed from the Expense History page using the `Draft` filter.

#### Q: The AI extracted the wrong amount from my receipt. What should I do?
A: You can edit any pre-filled field on the form before submitting. Click in the text box, correct the value, and then click submit. Your corrections will also help train the parsing model.

#### Q: Why was my expense rejected instantly upon submission?
A: The system-wide Rule Engine automatically rejects claims that violate policies (such as submitting duplicate receipts or exceeding maximum category limits). You will see a rejection notification detailing the violated policy rule.
