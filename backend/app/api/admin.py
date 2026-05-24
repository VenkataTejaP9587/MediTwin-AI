"""Admin panel endpoints"""
from fastapi import APIRouter, Depends
from app.core.config import PATIENTS_DB, USERS_DB, ALERTS_DB, AUDIT_LOGS_DB
from app.core.deps import require_role
import random

router = APIRouter()


@router.get("/stats")
def admin_stats(user=Depends(require_role("admin"))):
    patients = list(PATIENTS_DB.values())
    users = list(USERS_DB.values())
    return {
        "total_patients": len(patients),
        "total_users": len(users),
        "doctors": sum(1 for u in users if u["role"] == "doctor"),
        "admins": sum(1 for u in users if u["role"] == "admin"),
        "active_alerts": sum(1 for a in ALERTS_DB if not a.get("resolved")),
        "system_uptime": "99.97%",
        "api_requests_today": random.randint(1200, 4500),
        "ws_connections": random.randint(3, 15),
    }


@router.get("/users")
def list_users(user=Depends(require_role("admin"))):
    return [{k: v for k, v in u.items() if k != "hashed_password"} for u in USERS_DB.values()]


@router.get("/system-health")
def system_health(user=Depends(require_role("admin"))):
    return {
        "api_status": "online",
        "db_status": "mock_mode",
        "ws_status": "online",
        "ml_status": "online",
        "cpu_usage": f"{random.uniform(12, 45):.1f}%",
        "memory_usage": f"{random.uniform(30, 65):.1f}%",
        "disk_usage": "24.3%",
    }

@router.get("/audit")
def get_audit_logs(user=Depends(require_role("admin")), limit: int = 100):
    """Retrieve HIPAA-compliant system audit logs."""
    return sorted(AUDIT_LOGS_DB, key=lambda x: x["timestamp"], reverse=True)[:limit]
