import pytest
from fastapi.testclient import TestClient
from server import app

@pytest.fixture(scope="module", autouse=True)
def client():
    with TestClient(app) as c:
        yield c

def test_auth_login_seeded(client):
    response = client.post("/api/auth/login", json={"email": "admin@demo.com", "password": "admin123"})
    assert response.status_code == 200
    data = response.json()
    assert "access_token" in data
    assert data["user"]["email"] == "admin@demo.com"
    assert data["user"]["role"] == "Admin"

def test_login_invalid_password(client):
    response = client.post("/api/auth/login", json={"email": "admin@demo.com", "password": "wrongpassword"})
    assert response.status_code == 401

def test_login_invalid_email(client):
    response = client.post("/api/auth/login", json={"email": "nonexistent@demo.com", "password": "admin123"})
    assert response.status_code == 401

def test_user_registration_and_duplicate(client):
    reg_payload = {
        "name": "New Test User",
        "email": "newuser@demo.com",
        "password": "password123",
        "role": "Employee"
    }
    # First registration
    resp1 = client.post("/api/auth/register", json=reg_payload)
    assert resp1.status_code == 200
    assert resp1.json()["user"]["email"] == "newuser@demo.com"

    # Duplicate registration attempt
    resp2 = client.post("/api/auth/register", json=reg_payload)
    assert resp2.status_code == 400
    assert resp2.json()["detail"] == "Email already registered"

def test_invalid_jwt_token(client):
    headers = {"Authorization": "Bearer invalid_jwt_token_string"}
    resp = client.get("/api/auth/me", headers=headers)
    assert resp.status_code == 401

def test_unauthorized_policy_update(client):
    # Login as employee
    emp_resp = client.post("/api/auth/login", json={"email": "employee@demo.com", "password": "demo1234"})
    emp_token = emp_resp.json()["access_token"]
    emp_headers = {"Authorization": f"Bearer {emp_token}"}

    # Attempt policy update as non-admin
    update_resp = client.put("/api/admin/policies", json={
        "category": "Meals",
        "max_limit": 999.0,
        "receipt_required": False,
        "duplicate_window_days": 30
    }, headers=emp_headers)
    assert update_resp.status_code == 403

def test_expense_crud_and_pagination(client):
    # 1. Login employee & manager
    emp_resp = client.post("/api/auth/login", json={"email": "employee@demo.com", "password": "demo1234"})
    emp_headers = {"Authorization": f"Bearer {emp_resp.json()['access_token']}"}

    mgr_resp = client.post("/api/auth/login", json={"email": "manager@demo.com", "password": "demo1234"})
    mgr_headers = {"Authorization": f"Bearer {mgr_resp.json()['access_token']}"}

    # 2. Create Draft Expense
    draft_req = {
        "title": "Hotel Stay Conference",
        "category": "Accommodation",
        "amount": 450.0,
        "expense_date": "2026-07-23",
        "description": "Hotel accommodation",
        "receipt_url": "/uploads/hotel.pdf",
        "status": "Draft"
    }
    create_resp = client.post("/api/expenses", json=draft_req, headers=emp_headers)
    assert create_resp.status_code == 200
    exp = create_resp.json()
    exp_id = exp["id"]
    assert exp["status"] == "Draft"
    assert "_id" not in exp

    # 3. Test Cannot delete submitted/approved, but CAN update draft
    update_req = {
        "title": "Hotel Stay Conference Updated",
        "amount": 460.0,
        "status": "Submitted"
    }
    put_resp = client.put(f"/api/expenses/{exp_id}", json=update_req, headers=emp_headers)
    assert put_resp.status_code == 200
    assert put_resp.json()["status"] == "Submitted"

    # 4. Attempt deleting submitted expense (Should return 400)
    del_resp = client.delete(f"/api/expenses/{exp_id}", headers=emp_headers)
    assert del_resp.status_code == 400

    # 5. Pagination Test
    page_resp = client.get("/api/expenses?page=1&limit=2", headers=emp_headers)
    assert page_resp.status_code == 200
    assert isinstance(page_resp.json(), list)
    assert len(page_resp.json()) <= 2

def test_full_approval_and_finance_workflow(client):
    # 1. Login roles
    emp_headers = {"Authorization": f"Bearer {client.post('/api/auth/login', json={'email': 'employee@demo.com', 'password': 'demo1234'}).json()['access_token']}"}
    mgr_headers = {"Authorization": f"Bearer {client.post('/api/auth/login', json={'email': 'manager@demo.com', 'password': 'demo1234'}).json()['access_token']}"}
    fin_headers = {"Authorization": f"Bearer {client.post('/api/auth/login', json={'email': 'finance@demo.com', 'password': 'demo1234'}).json()['access_token']}"}

    # 2. Submit new expense exceeding limit (Policy Rule Engine test)
    over_limit_req = {
        "title": "Executive Business Dinner",
        "category": "Meals",
        "amount": 250.0,  # Limit is 75.0
        "expense_date": "2026-07-23",
        "description": "Dinner with client",
        "receipt_url": "/uploads/dinner.jpg",
        "status": "Submitted"
    }
    create_resp = client.post("/api/expenses", json=over_limit_req, headers=emp_headers)
    assert create_resp.status_code == 200
    expense_data = create_resp.json()
    exp_id = expense_data["id"]
    assert expense_data["risk_score"] in ["Medium", "High"]
    assert len(expense_data["risk_flags"]) > 0

    # 3. Manager opens details (Auto-advances to "Under Review")
    details_resp = client.get(f"/api/expenses/{exp_id}", headers=mgr_headers)
    assert details_resp.status_code == 200
    assert details_resp.json()["expense"]["status"] == "Under Review"

    # 4. Manager Approves
    appr_resp = client.post(f"/api/approvals/{exp_id}/action", json={"action": "Approved", "comments": "Approved despite limit"}, headers=mgr_headers)
    assert appr_resp.status_code == 200
    assert appr_resp.json()["status"] == "Approved"

    # 5. Finance Approves & Issues Payment Reference
    fin_resp = client.post(f"/api/approvals/{exp_id}/action", json={"action": "Approved", "comments": "Payment cleared"}, headers=fin_headers)
    assert fin_resp.status_code == 200
    fin_result = fin_resp.json()
    assert fin_result["status"] == "Paid"
    assert fin_result["payment_reference"].startswith("TXN-")

def test_admin_policy_management(client):
    admin_headers = {"Authorization": f"Bearer {client.post('/api/auth/login', json={'email': 'admin@demo.com', 'password': 'admin123'}).json()['access_token']}"}

    # Fetch policies
    pols = client.get("/api/admin/policies", headers=admin_headers)
    assert pols.status_code == 200
    assert len(pols.json()) >= 5

    # Update policy limit
    upd = client.put("/api/admin/policies", json={
        "category": "Supplies",
        "max_limit": 350.0,
        "receipt_required": True,
        "duplicate_window_days": 30
    }, headers=admin_headers)
    assert upd.status_code == 200
    assert upd.json()["max_limit"] == 350.0

def test_notifications_and_analytics(client):
    fin_headers = {"Authorization": f"Bearer {client.post('/api/auth/login', json={'email': 'finance@demo.com', 'password': 'demo1234'}).json()['access_token']}"}
    emp_headers = {"Authorization": f"Bearer {client.post('/api/auth/login', json={'email': 'employee@demo.com', 'password': 'demo1234'}).json()['access_token']}"}

    # Notifications
    notifs = client.get("/api/notifications", headers=emp_headers)
    assert notifs.status_code == 200

    mark_read = client.post("/api/notifications/read", headers=emp_headers)
    assert mark_read.status_code == 200

    # Analytics summary
    analytics = client.get("/api/analytics/summary", headers=fin_headers)
    assert analytics.status_code == 200
    data = analytics.json()
    assert "summary" in data
    assert "categories" in data
    assert "monthly" in data
