"""Alerts endpoints"""
from fastapi import APIRouter, Depends
import uuid
from datetime import datetime
from app.core.config import ALERTS_DB, AUDIT_LOGS_DB
from app.core.deps import get_current_user
from app.services.audit import AuditLogger, AuditAction

router = APIRouter()


@router.get("/")
def get_alerts(user=Depends(get_current_user), limit: int = 50):
    return sorted(ALERTS_DB, key=lambda a: a["timestamp"], reverse=True)[:limit]


@router.get("/active")
def get_active_alerts(user=Depends(get_current_user)):
    return [a for a in ALERTS_DB if not a.get("resolved", False)]


@router.put("/{alert_id}/resolve")
def resolve_alert(alert_id: str, user=Depends(get_current_user)):
    for alert in ALERTS_DB:
        if alert["id"] == alert_id:
            alert["resolved"] = True
            alert["resolved_by"] = user["name"]
            
            # HIPAA Audit Log
            AuditLogger.log_event(
                AuditAction.RESOLVE_ALERT,
                user,
                alert_id,
                f"Acknowledged {alert.get('severity')} alert for patient",
                pii_data={"patient_id": alert.get("patient_id")}
            )
            
            return alert
    return {"error": "Alert not found"}


@router.delete("/clear")
def clear_resolved(user=Depends(get_current_user)):
    global ALERTS_DB
    ALERTS_DB[:] = [a for a in ALERTS_DB if not a.get("resolved")]
    return {"message": "Cleared resolved alerts"}
