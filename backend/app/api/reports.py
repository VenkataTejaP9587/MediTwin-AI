"""Reports endpoints"""
from fastapi import APIRouter, Depends
from app.core.config import PATIENTS_DB
from app.core.config import PATIENTS_DB
from app.core.deps import get_current_user
from app.services.sensor_simulator import generate_vitals
from app.ml.predictor import compute_vitals_health_score
from app.services.audit import AuditLogger, AuditAction
from datetime import datetime, timedelta
import random

router = APIRouter()


def _mock_trend(base, std, count):
    vals = []
    v = base
    for _ in range(count):
        v = max(0, v + random.gauss(0, std))
        vals.append(round(v, 1))
    return vals


@router.get("/daily/{patient_id}")
def daily_report(patient_id: str, user=Depends(get_current_user)):
    patient = PATIENTS_DB.get(patient_id)
    if not patient:
        return {"error": "Patient not found"}
    vitals = generate_vitals(patient_id, patient.get("status", "stable"))
    score = compute_vitals_health_score(vitals)
    now = datetime.utcnow()
    hours = [(now - timedelta(hours=i)).strftime("%H:00") for i in range(23, -1, -1)]
    return {
        "patient": patient,
        "generated_at": now.isoformat(),
        "period": "daily",
        "current_vitals": vitals,
        "health_score": score,
        "trends": {
            "hours": hours,
            "heart_rate": _mock_trend(vitals["heart_rate"], 5, 24),
            "spo2": _mock_trend(vitals["spo2"], 1, 24),
            "temperature": _mock_trend(vitals["temperature"], 0.2, 24),
            "systolic_bp": _mock_trend(vitals["systolic_bp"], 6, 24),
        },
        "alerts_count": random.randint(0, 5),
        "summary": f"Patient {patient['name']} had a {'stable' if score['health_score']>60 else 'concerning'} day.",
    }


@router.get("/weekly/{patient_id}")
def weekly_report(patient_id: str, user=Depends(get_current_user)):
    patient = PATIENTS_DB.get(patient_id)
    if not patient:
        return {"error": "Patient not found"}
    vitals = generate_vitals(patient_id, patient.get("status", "stable"))
    score = compute_vitals_health_score(vitals)
    now = datetime.utcnow()
    days = [(now - timedelta(days=i)).strftime("%a %d") for i in range(6, -1, -1)]
    return {
        "patient": patient,
        "generated_at": now.isoformat(),
        "period": "weekly",
        "health_score": score,
        "trends": {
            "days": days,
            "avg_heart_rate": _mock_trend(vitals["heart_rate"], 4, 7),
            "avg_spo2": _mock_trend(vitals["spo2"], 0.8, 7),
            "avg_temperature": _mock_trend(vitals["temperature"], 0.15, 7),
            "avg_bp": _mock_trend(vitals["systolic_bp"], 5, 7),
        },
        "total_alerts": random.randint(2, 20),
        "improvement": random.choice(["Improving", "Stable", "Declining"]),
    }


@router.get("/analytics/overview")
def analytics_overview(user=Depends(get_current_user)):
    patients = list(PATIENTS_DB.values())
    days = [(datetime.utcnow() - timedelta(days=i)).strftime("%b %d") for i in range(29, -1, -1)]
    return {
        "total_patients": len(patients),
        "critical_count": sum(1 for p in patients if p["status"] == "critical"),
        "stable_count": sum(1 for p in patients if p["status"] == "stable"),
        "avg_health_score": 72.4,
        "total_alerts_30d": random.randint(45, 120),
        "daily_admissions": [random.randint(0, 4) for _ in range(30)],
        "days": days,
        "condition_distribution": {
            "Hypertension": 28,
            "Diabetes": 22,
            "Heart Failure": 18,
            "Arrhythmia": 14,
            "Other": 18,
        },
    }

@router.get("/handover/{patient_id}")
def generate_handover(patient_id: str, user=Depends(get_current_user)):
    """Generate an AI-style SBAR shift handover report for a patient."""
    patient = PATIENTS_DB.get(patient_id)
    if not patient:
        return {"error": "Patient not found"}
        
    vitals = generate_vitals(patient_id, patient.get("status", "stable"))
    score = compute_vitals_health_score(vitals)
    
    # SBAR Format Generation
    situation = f"Patient {patient['name']}, a {patient['age']}yo {patient['gender'].lower()} admitted to {patient['room']} with {patient['condition']}. Currently in {patient['status']} condition."
    
    background = f"Relevant history includes {', '.join(patient.get('medical_history', ['no significant prior conditions']))}. "
    background += f"Allergies: {', '.join(patient.get('allergies', ['None']))}. "
    background += f"Current medications: {', '.join(patient.get('medications', ['None']))}."
    
    assessment = f"Latest vitals: HR {vitals['heart_rate']} bpm, BP {vitals['systolic_bp']}/{vitals['diastolic_bp']} mmHg, SpO2 {vitals['spo2']}%, Temp {vitals['temperature']}°F. "
    if score['health_score'] < 70:
        assessment += f"Patient is showing signs of deterioration. Health Score: {score['health_score']}/100. "
    else:
        assessment += f"Vitals remain stable. Health Score: {score['health_score']}/100. "
        
    recommendation = "Continue current monitoring and treatment plan. "
    if vitals['heart_rate'] > 100 or vitals['systolic_bp'] > 140:
        recommendation += "Consider medication review due to elevated vitals. "
    if vitals['spo2'] < 94:
        recommendation += "Titrate O2 to maintain SpO2 > 94%. "
    recommendation += "Call attending if condition worsens."

    now = datetime.utcnow().strftime("%Y-%m-%d %H:%M:%S UTC")
    
    report_markdown = f"""## Shift Handover Report (SBAR)
**Generated:** {now}
**Patient:** {patient['name']} ({patient_id})

### 🏥 Situation
{situation}

### 📋 Background
{background}

### 🩺 Assessment
{assessment}

### 💡 Recommendation
{recommendation}
"""
    
    # HIPAA Audit Log
    AuditLogger.log_event(
        AuditAction.GENERATE_REPORT,
        user,
        patient_id,
        "Generated AI Handover (SBAR) report",
        pii_data={"name": patient["name"]}
    )
    
    return {"patient_id": patient_id, "report": report_markdown, "generated_at": now}

