from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from typing import Dict

# JWT authentication is handled elsewhere
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="auth/token")

def decode_token(token: str):
    # Example mapping
    fake_db = {
        "manager-token": {"sub": "manager@gmail.com", "role": "manager"},
        "officer-token": {"sub": "loanofficer@gmail.com", "role": "loan_officer"},
        "customer-token": {"sub": "customer@gmail.com", "role": "customer"},
    }
    user = fake_db.get(token)
    if not user:
        raise HTTPException(status_code=401, detail="Invalid token")
    return user


def role_required(role: str):
    """
    Dependency that ensures the user has the specified role.
    """
    def verify_role(token: str = Depends(oauth2_scheme)):
        user = decode_token(token)
        if user.get("role") != role:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied")
        return user
    return verify_role
