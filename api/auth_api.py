# api/auth_api.py
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, EmailStr
from jose import jwt
import time, os

router = APIRouter()
JWT_SECRET = os.getenv("JWT_SECRET", "change_me_please")
JWT_ALGO = "HS256"

# 1. STRICT ROLE DEFINITION: Only these 3 exist
USERS = {
    "loanofficer@gmail.com": {"password": "loanpass", "role": "loan_officer"},
    "manager@gmail.com":     {"password": "managerpass", "role": "manager"},
    "customer@gmail.com":    {"password": "customerpass", "role": "customer"},
}

# 2. MATCH FRONTEND JSON: Frontend sends { email, password }
class LoginIn(BaseModel):
    email: EmailStr
    password: str

@router.post("/login")
def login(payload: LoginIn):
    user = USERS.get(payload.email)
    
    # Simple password check
    if not user or user["password"] != payload.password:
        raise HTTPException(status_code=401, detail="Invalid credentials")
    
    now = int(time.time())
    
    # 3. GENERATE TOKEN
    token = jwt.encode(
        {
            "sub": payload.email,   # Subject is Email
            "role": user["role"],   # Role is strictly from our dict
            "iat": now, 
            "exp": now + 3600*12
        },
        JWT_SECRET,
        algorithm=JWT_ALGO
    )
    
    return {
        "access_token": token,
        "token_type": "bearer",
        "role": user["role"],
        "email": payload.email
    }