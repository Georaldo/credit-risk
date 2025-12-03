# api/loan_officer_api.py
from fastapi import APIRouter, Depends, Body, HTTPException
from api.deps import role_required
from ml.risk_agent import evaluate_application_risk
from typing import Dict, Any

router = APIRouter()

@router.get("/customer-credit")
def officer_view(user=Depends(role_required("loan_officer"))):
    # ... (Your existing code)
    return {
        "msg": f"Hello Loan Officer {user['sub']}",
        "customers": [
            {"name": "Alice", "risk": "Low"},
            {"name": "Bob", "risk": "High"}
        ]
    }

@router.post("/agent-evaluation")
async def get_agent_evaluation(
    payload: Dict[str, Any] = Body(...),
    user=Depends(role_required("loan_officer"))
):
    """
    Triggers the Risk Evaluator Agent to analyze a specific application.
    Payload should contain: { "features": {...}, "model_prediction": 0/1, "model_probability": 0.xx }
    """
    features = payload.get("features")
    prediction = payload.get("model_prediction")
    probability = payload.get("model_probability")

    if not features:
        raise HTTPException(status_code=400, detail="Missing features in payload")

    # Call the agent
    analysis = evaluate_application_risk(features, prediction, probability)
    
    return analysis