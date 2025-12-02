from fastapi import APIRouter, Depends
from api.deps import role_required

router = APIRouter()

@router.get("/customer-credit")
def officer_view(user=Depends(role_required("loan_officer"))):
    return {
        "msg": f"Hello Loan Officer {user['sub']}",
        "customers": [
            {"name": "Alice", "risk": "Low"},
            {"name": "Bob", "risk": "High"}
        ]
    }
