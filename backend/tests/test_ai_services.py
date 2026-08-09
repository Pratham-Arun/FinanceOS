import pytest
from database import mongo
from services.ocr_service import ocr_service
from services.rule_engine import rule_engine
from services.ai_service import ai_service
from services.rag_service import rag_service
from services.chat_service import chat_service

@pytest.fixture(scope="module", autouse=True)
async def init_db():
    await mongo.connect()

@pytest.mark.anyio
async def test_ocr_service_file_validation():
    # Test valid image
    valid, msg = ocr_service.validate_file("receipt.jpg", 1024 * 1024)
    assert valid is True
    
    # Test file > 20MB
    valid_large, msg_large = ocr_service.validate_file("large.pdf", 25 * 1024 * 1024)
    assert valid_large is False
    assert "20 MB" in msg_large

    # Test invalid extension
    valid_ext, msg_ext = ocr_service.validate_file("document.docx", 1024)
    assert valid_ext is False

@pytest.mark.anyio
async def test_ocr_processing_confidence():
    res = await ocr_service.process_receipt(b"fake_bytes", "uber_ride.pdf")
    assert res["status"] == "completed"
    assert "ocr_data" in res
    assert "Uber Technologies" in res["ocr_data"]["vendor"]["value"]
    assert res["ocr_data"]["vendor"]["confidence"] >= 0.90
    assert res["overall_confidence"] >= 0.85

@pytest.mark.anyio
async def test_rule_engine_validations():
    # Test Meal policy limit ($50 cap)
    meal_over_cap = {
        "category": "Meals",
        "amount": 75.0,
        "description": "Team lunch"
    }
    res_meal = await rule_engine.validate_expense(meal_over_cap)
    assert res_meal["policy_status"] == "VIOLATION"
    assert any("exceeds policy maximum" in v for v in res_meal["violations"])

    # Test Alcohol prohibited item rule
    meal_alcohol = {
        "category": "Meals",
        "amount": 35.0,
        "description": "Dinner with wine"
    }
    res_alc = await rule_engine.validate_expense(meal_alcohol)
    assert res_alc["policy_status"] == "VIOLATION"
    assert any("Alcohol items" in v for v in res_alc["violations"])

    # Test Hotel max ($250 cap)
    hotel_over = {
        "category": "Accommodation",
        "amount": 350.0,
        "description": "Hotel stay"
    }
    res_hotel = await rule_engine.validate_expense(hotel_over)
    assert res_hotel["policy_status"] == "VIOLATION"

@pytest.mark.anyio
async def test_ai_agent_and_anomaly_detection():
    expense = {
        "title": "Weekend Luxury Meal",
        "category": "Meals",
        "amount": 250.0,
        "description": "Dinner on Sunday with cocktails",
        "expense_date": "2026-07-26"
    }
    emp_history = [{"amount": 30.0}, {"amount": 25.0}, {"amount": 40.0}]
    
    rule_res = await rule_engine.validate_expense(expense)
    analysis = await ai_service.analyze_expense(expense, rule_result=rule_res, employee_history=emp_history)
    
    # fraud_score must be elevated due to policy violation + anomaly + alcohol + weekend
    assert analysis["fraud_score"] >= 50
    assert analysis["risk"] in ["Review Required", "High Risk", "Very High Risk"]
    assert len(analysis["reason"]) > 0
    # Anomaly detected: $250 is 4× the $31.67 historical average → appears in reasoning
    anomaly_mentioned = any(
        "anomaly" in r.lower() or "4×" in r or "historical" in r.lower()
        for r in analysis["reason"]
    )
    assert anomaly_mentioned, "Expected anomaly detection in reasoning"
    # Alcohol reference should appear in fraud_indicators
    alcohol_flagged = any("alcohol" in str(f).lower() for f in analysis.get("fraud_indicators", []))
    assert alcohol_flagged, "Expected alcohol reference in fraud indicators"

@pytest.mark.anyio
async def test_rag_and_chat_services():
    qa = await rag_service.answer_policy_question("What is the hotel reimbursement limit?")
    assert "$250" in qa["answer"]
    
    chat_resp = await chat_service.process_chat_message("user_101", "Employee", "Can I claim hotel expenses above $300?")
    assert "$250" in chat_resp["reply"]
