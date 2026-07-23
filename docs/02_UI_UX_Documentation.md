# 02. UI/UX Documentation

## 1. Design System & Aesthetics

The UI utilizes a modern, high-fidelity dark-mode-first aesthetic (often referred to as *glassmorphism* or *sleek SaaS*) to provide an immersive enterprise experience. It prioritizes clarity, readable typography, and micro-interactions.

### 1.1 Color Palette
We avoid basic, flat colors in favor of balanced HSL-derived shades:
* **Background Primary**: `hsl(222.2, 84%, 4.9%)` (Deep midnight slate)
* **Background Secondary**: `hsl(222.2, 47.4%, 11.2%)` (Slate grey cards)
* **Muted / Border**: `hsl(217.2, 32.6%, 17.5%)` (Cool border tone)
* **Accent (Primary)**: `hsl(217.2, 91.2%, 59.8%)` (Vibrant electric indigo)
* **Success**: `hsl(142.1, 70.6%, 45.3%)` (Emerald green for approvals)
* **Warning**: `hsl(47.9, 95.8%, 53.1%)` (Amber for exceptions/clarifications)
* **Danger**: `hsl(346.8, 77.2%, 49.8%)` (Crimson for rejections/errors)

### 1.2 Typography & Elements
* **Font Family**: Google Fonts **Inter** or **Outfit** for sleek readability.
* **Layout Grid**: Flexbox/CSS Grid layouts conforming to standard responsive breakpoints:
  * Mobile: `< 640px` (single column, collapsible menu)
  * Tablet: `640px - 1024px` (two column layouts, sidebar collapses to icon-only)
  * Desktop: `> 1024px` (standard multi-column with fixed navigation)
* **Micro-animations**: Smooth hover transitions (`transition-all duration-300 ease-in-out`), scale-up button clicks, and loading skeletons for AI processing.

---

## 2. Reusable Layouts & Component Hierarchy

The interface runs under a single global shell (`AppShell`) wrapping the main navigation and content canvas.

```
┌────────────────────────────────────────────────────────┐
│                        Topnav                          │
├───────────┬────────────────────────────────────────────┤
│           │                                            │
│           │                                            │
│           │                                            │
│  Sidebar  │               Main Content                 │
│           │                                            │
│           │                                            │
│           │                                            │
└───────────┴────────────────────────────────────────────┘
```

### 2.1 Reusable Components
* **`AppShell.jsx`**: Provides responsive grid container, renders `Topnav` and `Sidebar`, and wraps page components.
* **`Sidebar.jsx`**: Displays navigation routes matched with the user's role. Collapsible on smaller viewports. Managers have access to the Analytics section for department-level reporting. Includes hover animations for improved interaction feedback.
* **`Topnav.jsx`**: Displays application logo, current page title, notifications center (bell icon with unread count), and user profile dropdown.
* **`StatusBadge.jsx`**: Generates colored pill badges for expense request status (`Draft` = slate grey, `Submitted` = blue, `Under Review` = orange, `Approved` = green, `Rejected` = red, `Paid` = emerald).

---

## 3. Page Specifications

### 3.1 Login & Registration (`Login.jsx`, `Register.jsx`)
* **Layout**: Centered card overlay on a subtle background gradient.
* **Fields**: Email address, Password, Full Name (registration), Role selection dropdown (for demo purposes).
* **Validation**: Client-side validation for email formats and password length.

### 3.2 Dashboard (`Dashboard.jsx`)
* **Behavior**: Content renders dynamically depending on user login role:
  * **Employee**: Show short-cut cards ("Submit Expense"), summary stats (Total Claimed, Pending, Reimbursed), and a table of recent submissions.
  * **Manager**: Display alert cards for pending approvals, summary of department spending, and recent activity log.
  * **Finance**: Display total pending payout queues, total monthly disbursements graph, and list of high-risk flagged claims.
  * **Admin**: System usage stats, active users count, policy status overview, and shortcut to audit log logs.

### 3.3 Submit Expense (`SubmitExpense.jsx`)
* **Interactive Receipt Dropzone**: 
  * Features a dotted drag-and-drop region for image (JPEG, PNG) or PDF upload with upload area highlighting on drag-over.
  * Client-side validation runs before upload: only JPG, PNG, and PDF files up to 5MB are accepted. Invalid files are rejected immediately with user-friendly error messages.
  * Shows a rotating loading indicator once files are dropped, indicating OCR and AI parsing are underway.
* **Dual-Panel Pre-fill Form**:
  * **Left Side**: Displays a rendering/preview of the uploaded receipt.
  * **Right Side**: Form fields (Title, Category, Date, Vendor Name, Amount, GST, Invoice Number) pre-populated from AI extraction. Highlight fields in green (high extraction confidence) or yellow (low confidence, review recommended).
  * Employees can review, edit, and click "Submit Claim" or "Save to Drafts".

### 3.4 Expense History (`Expenses.jsx`)
* **Search & Filters**: Comprehensive search by vendor/title, filters by Category dropdown, Status dropdown (including `Draft` and `Under Review`), and Date Range selectors.
* **Listing Table**: Displays Date, Title, Category, Amount, Status Badge, and Action button to view details.

### 3.5 Expense Details (`ExpenseDetails.jsx`)
* **Split view structure**:
  * **Left Column**: High-resolution image viewer with zoom options for the uploaded receipt.
  * **Right Column**: Detailed accordion tabs:
    * **Data Summary**: Extracted and verified fields.
    * **AI Risk Report**: Flags duplicate uploads, invalid category checks, and threshold warnings.
    * **Approval Timeline**: Stepper showing creation, manager review, and finance payout stamps.
    * **Action Bar**: (Visible to Managers/Finance) Approve, Reject (requires text input), or Request Clarification.

### 3.6 Analytics (`Analytics.jsx`)
* **Access**: Available to Finance Officers and Managers. Analytics data is filtered based on the viewer's role — managers see data scoped to their direct reports only.
* **Data Visualization**:
  * **Bar Chart**: Monthly spending totals.
  * **Pie Chart**: Spending by category (Meals, Travel, Supplies, etc.).
  * **Line Graph**: Average reimbursement cycle time (days) over the last 6 months.
* **Exports**: A header bar with buttons to trigger CSV or PDF report downloads.

### 3.7 Profile & Settings (`Profile.jsx`, `Settings.jsx`)
* **Profile**: Redesigned user profile page featuring:
  * Role-specific avatar colors.
  * Employee information including Email, Employee ID, and Account Status.
  * User permissions and role capabilities.
  * Security reset password form.
* **Settings (Admin Only)**: Form panel to modify system parameters:
  * Category spending limits (e.g., Travel max limit $1000). The field label is **Max Limit ($)**.
  * Auto-approval threshold (e.g., expenses under $50 bypass Manager approval).
  * Allowed file extensions and maximum upload sizes.

### 3.8 UI Animations & Micro-interactions
* **Sidebar**: Hover animations on navigation items for visual feedback.
* **Transitions**: Slide-down animations for smoother panel and menu transitions.
* These enhancements improve overall user experience and visual consistency.
