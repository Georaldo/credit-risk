# api/auth_api.py
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, EmailStr
from jose import jwt
import time, os

router = APIRouter()
JWT_SECRET = os.getenv("JWT_SECRET", "change_me_please")
JWT_ALGO = "HS256"

# Replace with real DB in production
USERS = {
    "loanofficer@gmail.com": {"password": "loanpass", "role": "loan_officer"},
    "manager@gmail.com": {"password": "managerpass", "role": "manager"},
    "customer@gmail.com": {"password": "customerpass", "role": "customer"},
}

class LoginIn(BaseModel):
    email: EmailStr
    password: str

@router.post("/login")
def login(payload: LoginIn):
    user = USERS.get(payload.email)
    if not user or user["password"] != payload.password:
        raise HTTPException(status_code=401, detail="Invalid credentials")
    
    now = int(time.time())
    token = jwt.encode(
        {"sub": payload.email, "role": user["role"], "iat": now, "exp": now + 3600*12},
        JWT_SECRET,
        algorithm=JWT_ALGO
    )
    
    return {
        "access_token": token,
        "token_type": "bearer",
        "role": user["role"],
        "email": payload.email
    }

# Helper to verify JWT
def verify_token(token: str):
    try:
        return jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGO])
    except Exception as e:
        raise HTTPException(status_code=401, detail=str(e))
