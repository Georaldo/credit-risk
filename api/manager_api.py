from fastapi import APIRouter, Depends
from api.deps import role_required

router = APIRouter()

@router.get("/dashboard")
def manager_dashboard(user=Depends(role_required("manager"))):
    return {
        "msg": f"Welcome Manager {user['sub']}!",
        "portfolio_kpis": {
            "default_rate": "3.2%",
            "total_applications": 1240,
            "auto_approved": 860
        }
    }