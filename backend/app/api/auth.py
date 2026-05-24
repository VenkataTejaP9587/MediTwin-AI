"""Authentication endpoints"""
from fastapi import APIRouter, HTTPException, status
from pydantic import BaseModel, EmailStr
from app.core.config import USERS_DB, pwd_context
from app.core.security import create_access_token, get_password_hash
from app.services.audit import AuditLogger, AuditAction
import uuid

router = APIRouter()


class LoginRequest(BaseModel):
    email: str
    password: str


class RegisterRequest(BaseModel):
    email: str
    password: str
    name: str
    role: str = "doctor"


@router.post("/login")
def login(req: LoginRequest):
    user = USERS_DB.get(req.email)
    if not user or not pwd_context.verify(req.password, user["hashed_password"]):
        raise HTTPException(status_code=401, detail="Invalid email or password")
    token = create_access_token({"sub": user["email"], "role": user["role"]})
    
    # Audit log
    AuditLogger.log_event(AuditAction.LOGIN, user, "System", "Standard credentials login")
    
    return {
        "access_token": token,
        "token_type": "bearer",
        "user": {k: v for k, v in user.items() if k != "hashed_password"},
    }


@router.post("/register")
def register(req: RegisterRequest):
    if req.email in USERS_DB:
        raise HTTPException(status_code=400, detail="Email already registered")
    uid = str(uuid.uuid4())[:8]
    avatar = "".join(p[0].upper() for p in req.name.split()[:2])
    user = {
        "id": uid,
        "email": req.email,
        "name": req.name,
        "role": req.role,
        "avatar": avatar,
        "hashed_password": get_password_hash(req.password),
        "created_at": "2024-01-01T00:00:00Z",
    }
    USERS_DB[req.email] = user
    token = create_access_token({"sub": user["email"], "role": user["role"]})
    return {
        "access_token": token,
        "token_type": "bearer",
        "user": {k: v for k, v in user.items() if k != "hashed_password"},
    }


@router.get("/me")
def get_me(credentials=None):
    # handled via deps in real endpoints; this is a convenience
    return {"message": "Use Bearer token"}


@router.post("/demo-login")
def demo_login(role: str = "doctor"):
    """One-click demo login by role."""
    role_email = {
        "doctor": "doctor@medisync.ai",
        "admin": "admin@medisync.ai",
        "patient": "patient@medisync.ai",
    }
    email = role_email.get(role, "doctor@medisync.ai")
    user = USERS_DB[email]
    token = create_access_token({"sub": user["email"], "role": user["role"]})
    
    # Audit log
    AuditLogger.log_event(AuditAction.LOGIN, user, "System", f"Demo login as {role}")
    
    return {
        "access_token": token,
        "token_type": "bearer",
        "user": {k: v for k, v in user.items() if k != "hashed_password"},
    }
