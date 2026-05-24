from datetime import datetime
import json
from app.core.config import AUDIT_LOGS_DB

class AuditLogger:
    """
    HIPAA-compliant Audit Logging Service.
    Ensures that all system accesses, modifications, and alert resolutions 
    are logged securely, with Patient Identifiable Information (PII) masked 
    where appropriate.
    """

    @staticmethod
    def log_event(action: str, user: dict, target: str, details: str = "", pii_data: dict = None):
        """
        Record an audit event.
        
        Args:
            action: Category of action (e.g., "LOGIN", "VIEW_PATIENT", "RESOLVE_ALERT")
            user: The user performing the action (dict with 'id', 'name', 'role')
            target: The entity being affected (e.g., patient ID, system setting)
            details: Human readable context
            pii_data: Any sensitive data that should be scrubbed before logging
        """
        # Scrub PII if present
        scrubbed_data = AuditLogger._scrub_pii(pii_data) if pii_data else {}
        
        log_entry = {
            "timestamp": datetime.utcnow().isoformat(),
            "action": action.upper(),
            "user_id": user.get("id", "SYSTEM"),
            "user_name": user.get("name", "System Process"),
            "role": user.get("role", "system"),
            "target": target,
            "details": details,
            "metadata": json.dumps(scrubbed_data) if scrubbed_data else None
        }
        
        AUDIT_LOGS_DB.append(log_entry)
        
        # In a real system, you would write this to a WORM (Write Once Read Many) drive or secure log service
        # print(f"[AUDIT] {log_entry['timestamp']} | {action} by {log_entry['user_id']} -> {target}")

    @staticmethod
    def _scrub_pii(data: dict) -> dict:
        """
        Masks common PII fields to maintain HIPAA compliance in audit trails.
        """
        sensitive_keys = ["ssn", "dob", "address", "phone", "email"]
        scrubbed = {}
        for k, v in data.items():
            if k.lower() in sensitive_keys:
                scrubbed[k] = "***MASKED***"
            elif isinstance(v, str) and len(v) > 5 and k.lower() == 'name':
                # Partially mask names (e.g., "John Doe" -> "J*** D***")
                parts = v.split()
                scrubbed[k] = " ".join([p[0] + "***" for p in parts])
            else:
                scrubbed[k] = v
        return scrubbed

# Pre-defined standardized actions
class AuditAction:
    LOGIN = "AUTH_LOGIN"
    LOGOUT = "AUTH_LOGOUT"
    VIEW_PATIENT = "PATIENT_VIEWED"
    UPDATE_PATIENT = "PATIENT_MODIFIED"
    GENERATE_REPORT = "REPORT_GENERATED"
    RESOLVE_ALERT = "ALERT_RESOLVED"
    SYSTEM_CONFIG = "SYSTEM_CONFIG_CHANGED"
    CLINICAL_INTERVENTION = "CLINICAL_INTERVENTION"
