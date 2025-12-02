from fastapi import APIRouter, Depends
from api.deps import role_required

router = APIRouter()

@router.get("/my-credit")
def customer_portal(user=Depends(role_required("customer"))):
    return {
        "msg": f"Hello {user['sub']}, here is your credit report",
        "credit_score": 720,
        "risk": "Low",
        "explanation": [
            {"feature": "Income", "impact": "+200"},
            {"feature": "Existing Loans", "impact": "-50"}
        ]
    }
