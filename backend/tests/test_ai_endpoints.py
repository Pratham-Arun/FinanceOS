import pytest
from fastapi.testclient import TestClient
from server import app

@pytest.fixture(scope="module")
def client():
    with TestClient(app) as c:
        yield c

@pytest.fixture(scope="module")
def admin_token(client):
    res = client.post("/api/auth/login", json={"email": "admin@demo.com", "password": "admin123"})
    return res.json()["access_token"]

def test_ocr_upload_endpoint(client, admin_token):
    files = {"file": ("starbucks.jpg", b"fake_image_content", "image/jpeg")}
    headers = {"Authorization": f"Bearer {admin_token}"}
    response = client.post("/api/ocr/upload", files=files, headers=headers)
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "completed"
    assert "ocr_data" in data
    assert "vendor" in data["ocr_data"]

def test_rule_validate_endpoint(client, admin_token):
    headers = {"Authorization": f"Bearer {admin_token}"}
    payload = {
        "category": "Meals",
        "amount": 80.0,
        "title": "Dinner with cocktails",
        "description": "Submitting dinner claim"
    }
    response = client.post("/api/rules/validate", json=payload, headers=headers)
    assert response.status_code == 200
    data = response.json()
    assert data["policy_status"] == "VIOLATION"

def test_ai_analyze_endpoint(client, admin_token):
    headers = {"Authorization": f"Bearer {admin_token}"}
    payload = {
        "expense_data": {
            "title": "Hotel Stay",
            "category": "Accommodation",
            "amount": 220.0,
            "expense_date": "2026-07-25"
        }
    }
    response = client.post("/api/ai/analyze", json=payload, headers=headers)
    assert response.status_code == 200
    data = response.json()
    assert "recommendation" in data
    assert "confidence" in data

def test_chat_and_knowledge_endpoints(client, admin_token):
    headers = {"Authorization": f"Bearer {admin_token}"}
    
    # 1. Chat
    chat_res = client.post("/api/chat", json={"message": "What is the hotel lodging limit?"}, headers=headers)
    assert chat_res.status_code == 200
    assert "$250" in chat_res.json()["reply"]

    # 2. Knowledge Upload
    k_res = client.post("/api/knowledge/upload", json={
        "title": "Special Executive Policy",
        "category": "Travel",
        "content": "VP travel claims allow $500 lodging allowance."
    }, headers=headers)
    assert k_res.status_code == 200

    # 3. Knowledge Search
    search_res = client.get("/api/knowledge/search?q=Executive", headers=headers)
    assert search_res.status_code == 200
    assert len(search_res.json()) > 0

def test_analytics_and_audit_endpoints(client, admin_token):
    headers = {"Authorization": f"Bearer {admin_token}"}
    
    # AI Analytics
    ai_analytics = client.get("/api/analytics/ai", headers=headers)
    assert ai_analytics.status_code == 200
    assert "insights" in ai_analytics.json()

    # AI Audit Logs
    ai_logs = client.get("/api/audit/ai-logs", headers=headers)
    assert ai_logs.status_code == 200
    assert isinstance(ai_logs.json(), list)
