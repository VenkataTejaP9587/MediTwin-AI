"""
Automated SOAP Note Generation & Predictive Deterioration Forecasting
Uses advanced rule-based clinical intelligence to generate structured clinical notes
and early-warning deterioration scores.
"""
from fastapi import APIRouter, Depends
from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime, timedelta
import random
import math

from app.core.deps import get_current_user
from app.core.config import PATIENTS_DB, AUDIT_LOGS_DB
from app.services.sensor_simulator import generate_vitals
from app.ml.predictor import compute_vitals_health_score, predict_sepsis_risk
from app.services.audit import AuditLogger, AuditAction

router = APIRouter()


# ─── In-memory vitals history store for time-series forecasting ────────────────
# Maps patient_id -> list of (timestamp, vitals) tuples (last 24 readings)
VITALS_HISTORY: dict = {}


def _store_vitals(patient_id: str, vitals: dict):
    """Push a vitals snapshot into the in-memory history buffer."""
    history = VITALS_HISTORY.setdefault(patient_id, [])
    history.append({
        "timestamp": vitals.get("timestamp", datetime.utcnow().isoformat()),
        "heart_rate": vitals["heart_rate"],
        "spo2": vitals["spo2"],
        "temperature": vitals["temperature"],
        "systolic_bp": vitals["systolic_bp"],
        "respiration_rate": vitals["respiration_rate"],
    })
    # Keep only last 48 readings
    VITALS_HISTORY[patient_id] = history[-48:]


def _get_trend(values: list) -> str:
    """Compute simple linear trend direction from a list of values."""
    if len(values) < 2:
        return "stable"
    n = len(values)
    x_mean = (n - 1) / 2.0
    y_mean = sum(values) / n
    numerator = sum((i - x_mean) * (values[i] - y_mean) for i in range(n))
    denominator = sum((i - x_mean) ** 2 for i in range(n))
    slope = numerator / denominator if denominator != 0 else 0
    if slope > 0.5:
        return "rising"
    elif slope < -0.5:
        return "falling"
    return "stable"


def _generate_trend_series(patient_id: str, status: str) -> dict:
    """Generate mock 6-point time-series data for forecasting visualization."""
    history = VITALS_HISTORY.get(patient_id, [])
    if len(history) < 3:
        # Seed the history with simulated past readings
        for i in range(6, 0, -1):
            past_vitals = generate_vitals(patient_id, status)
            _store_vitals(patient_id, past_vitals)
        history = VITALS_HISTORY[patient_id]

    times = [(datetime.utcnow() - timedelta(hours=6 - i)).strftime("%H:%M") for i in range(len(history[-6:]))]
    series = history[-6:]
    return {
        "timestamps": times,
        "heart_rate": [v["heart_rate"] for v in series],
        "spo2": [v["spo2"] for v in series],
        "temperature": [v["temperature"] for v in series],
        "systolic_bp": [v["systolic_bp"] for v in series],
    }


def _compute_deterioration_score(patient_id: str, vitals: dict, status: str) -> dict:
    """
    Compute a predictive deterioration score using Modified Early Warning Score (MEWS)
    combined with trend analysis over the patient's vitals history.
    
    Returns a score from 0-100 and a prediction horizon.
    """
    history = VITALS_HISTORY.get(patient_id, [])
    _store_vitals(patient_id, vitals)  # Add latest reading

    # ─── MEWS Score Calculation ───────────────────────────────────────────────
    mews = 0
    hr = vitals["heart_rate"]
    sbp = vitals["systolic_bp"]
    rr = vitals["respiration_rate"]
    temp = vitals["temperature"]
    spo2 = vitals["spo2"]

    # Heart Rate score
    if hr < 40 or hr > 130: mews += 3
    elif hr < 50 or hr > 110: mews += 2
    elif hr < 60 or hr > 100: mews += 1

    # Systolic BP score
    if sbp < 70 or sbp > 200: mews += 3
    elif sbp < 80 or sbp > 180: mews += 2
    elif sbp < 100 or sbp > 160: mews += 1

    # Respiration Rate score
    if rr < 9 or rr > 29: mews += 3
    elif rr < 12 or rr > 24: mews += 2
    elif rr > 20: mews += 1

    # Temperature score
    if temp < 35 or temp > 39.5: mews += 2
    elif temp < 36 or temp > 38.5: mews += 1

    # SpO2 bonus score (not in original MEWS but clinically relevant)
    if spo2 < 90: mews += 3
    elif spo2 < 94: mews += 2
    elif spo2 < 96: mews += 1

    # ─── Trend Multiplier ─────────────────────────────────────────────────────
    trend_bonus = 0
    trend_details = []
    if len(history) >= 3:
        hr_values = [v["heart_rate"] for v in history[-6:]]
        spo2_values = [v["spo2"] for v in history[-6:]]
        sbp_values = [v["systolic_bp"] for v in history[-6:]]

        hr_trend = _get_trend(hr_values)
        spo2_trend = _get_trend(spo2_values)
        sbp_trend = _get_trend(sbp_values)

        if hr_trend == "rising":
            trend_bonus += 1
            trend_details.append("↑ Heart rate trending upward")
        if spo2_trend == "falling":
            trend_bonus += 2
            trend_details.append("↓ SpO2 trending downward (warning)")
        if sbp_trend == "rising":
            trend_bonus += 1
            trend_details.append("↑ Blood pressure trending upward")
    else:
        trend_details.append("Insufficient history for trend analysis")

    total_mews = mews + trend_bonus
    # Normalize MEWS to 0-100 scale (max theoretical MEWS ~16)
    risk_score = round(min(99, (total_mews / 16.0) * 100), 1)

    if risk_score < 20:
        risk_level = "Low"
        horizon = "No deterioration predicted in next 12h"
        color = "green"
    elif risk_score < 45:
        risk_level = "Moderate"
        horizon = "Possible deterioration in 6–12h — increase monitoring frequency"
        color = "yellow"
    elif risk_score < 70:
        risk_level = "High"
        horizon = "⚠️ Probable deterioration predicted within 2–6h"
        color = "orange"
    else:
        risk_level = "Critical"
        horizon = "🚨 Imminent deterioration predicted — consider ICU escalation now"
        color = "red"

    return {
        "deterioration_score": risk_score,
        "mews_raw": mews,
        "trend_bonus": trend_bonus,
        "risk_level": risk_level,
        "prediction_horizon": horizon,
        "trend_details": trend_details,
        "color": color,
    }


def _generate_soap_note(patient: dict, vitals: dict, score: dict, sepsis: dict) -> str:
    """
    Auto-generate a structured SOAP (Subjective, Objective, Assessment, Plan) clinical note.
    This is the format clinicians write after examining a patient.
    """
    now = datetime.utcnow()
    hr = vitals["heart_rate"]
    spo2 = vitals["spo2"]
    temp = vitals["temperature"]
    sbp = vitals["systolic_bp"]
    dbp = vitals["diastolic_bp"]
    rr = vitals["respiration_rate"]

    # ─── Subjective ──────────────────────────────────────────────────────────
    chief_complaints = []
    if hr > 100:
        chief_complaints.append("palpitations")
    if spo2 < 94:
        chief_complaints.append("shortness of breath")
    if temp > 38.0:
        chief_complaints.append("fever and chills")
    if sbp > 150:
        chief_complaints.append("headache associated with elevated blood pressure")
    if not chief_complaints:
        chief_complaints = ["no acute complaints at this time"]

    subjective = (
        f"Patient is a {patient['age']}-year-old {patient['gender'].lower()} presenting with "
        f"{', '.join(chief_complaints)}. Admitted for {patient['condition']}. "
        f"Patient reports adherence to current medication regimen: {', '.join(patient.get('medications', ['None']))}. "
        f"Known allergies: {', '.join(patient.get('allergies', ['NKDA']))}."
    )

    # ─── Objective ───────────────────────────────────────────────────────────
    objective = (
        f"Vital Signs (Auto-Captured, {now.strftime('%Y-%m-%d %H:%M')} UTC):\n"
        f"  • Heart Rate:       {hr} bpm {'[ABNORMAL]' if hr > 100 or hr < 60 else '[Normal]'}\n"
        f"  • Blood Pressure:   {sbp}/{dbp} mmHg {'[ELEVATED]' if sbp > 140 else '[Normal]'}\n"
        f"  • SpO2:             {spo2}% {'[LOW - HYPOXEMIA]' if spo2 < 94 else '[Normal]'}\n"
        f"  • Temperature:      {temp}°C {'[FEVER]' if temp > 38 else '[Normal]'}\n"
        f"  • Respiration Rate: {rr} breaths/min {'[TACHYPNEA]' if rr > 20 else '[Normal]'}\n\n"
        f"AI Health Score: {score.get('health_score', 'N/A')}/100 ({score.get('grade', 'N/A')})\n"
        f"Known Medical History: {', '.join(patient.get('medical_history', ['None reported']))}"
    )

    # ─── Assessment ──────────────────────────────────────────────────────────
    assessments = []
    assessments.append(f"1. {patient['condition']} — primary admission diagnosis, currently {patient['status']}.")
    if sepsis.get("risk_level") in ("High", "Critical"):
        assessments.append(f"2. Sepsis Risk (CDSS): {sepsis['risk_level']} ({sepsis['risk_percentage']}%) — {sepsis['recommendation']}")
    if spo2 < 94:
        assessments.append("3. Hypoxemia — SpO2 below acceptable threshold. Supplemental O2 indicated.")
    if temp > 38.0:
        assessments.append("4. Febrile state — further investigation for infectious etiology required.")
    if sbp > 150:
        assessments.append("5. Hypertensive — BP management to be reviewed.")
    if not [a for a in assessments if a.startswith("2.")]:
        assessments.append(f"2. Sepsis screening: {sepsis.get('risk_level', 'Low')} risk. No immediate concern.")

    # ─── Plan ────────────────────────────────────────────────────────────────
    plans = [
        "1. Continue continuous cardiac monitoring via MediSync AI platform.",
        f"2. Maintain current medications: {', '.join(patient.get('medications', ['as prescribed']))}.",
    ]
    if spo2 < 94:
        plans.append("3. Titrate supplemental O2 to maintain SpO2 ≥ 94%. Consider non-invasive ventilation if SpO2 drops below 90%.")
    if temp > 38.0:
        plans.append("4. Administer antipyretics (Paracetamol 1g IV) PRN. Order CBC, CRP, blood cultures × 2 sets.")
    if sbp > 150:
        plans.append("5. Review antihypertensive regimen. Consider adding Amlodipine 5mg if BP remains >150 after 2h.")
    if sepsis.get("risk_level") in ("High", "Critical"):
        plans.append("6. Sepsis bundle initiated. IV access secured. Lactate ordered. Broad-spectrum antibiotics pending cultures.")
    plans.append(f"{len(plans) + 1}. Reassess vitals in 2 hours. Page attending physician for any deterioration.")
    plans.append(f"{len(plans) + 1}. Goal: Health score > 70. Current: {score.get('health_score', 'N/A')}/100.")

    note = f"""╔══════════════════════════════════════════════════════════════╗
║          AUTOMATED SOAP CLINICAL NOTE — MediSync AI          ║
╚══════════════════════════════════════════════════════════════╝

📅 Date/Time: {now.strftime('%Y-%m-%d %H:%M')} UTC
👤 Patient:   {patient['name']} ({patient['id']}) — Room {patient['room']}
🩺 Attending: Auto-generated by AI Clinical Decision Support

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
[S] SUBJECTIVE
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
{subjective}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
[O] OBJECTIVE
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
{objective}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
[A] ASSESSMENT
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
{chr(10).join(assessments)}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
[P] PLAN
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
{chr(10).join(plans)}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
⚠️  DISCLAIMER: This note is AI-generated for clinical assistance.
    All recommendations MUST be reviewed and co-signed by a
    licensed physician before implementation. Not a substitute
    for professional medical judgment.
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"""
    return note


# ─── API Endpoints ─────────────────────────────────────────────────────────────

@router.get("/soap/{patient_id}")
def generate_soap(patient_id: str, user=Depends(get_current_user)):
    """Auto-generate a SOAP clinical note for a patient based on live vitals."""
    patient = PATIENTS_DB.get(patient_id)
    if not patient:
        return {"error": "Patient not found"}

    vitals = generate_vitals(patient_id, patient.get("status", "stable"))
    score = compute_vitals_health_score(vitals)
    sepsis = predict_sepsis_risk(vitals)

    # HIPAA Audit log
    AuditLogger.log_event(
        "SOAP_NOTE_GENERATED",
        user,
        patient_id,
        "Generated clinical SOAP note",
        pii_data={"name": patient["name"]}
    )

    note = _generate_soap_note(patient, vitals, score, sepsis)
    return {
        "patient_id": patient_id,
        "patient_name": patient["name"],
        "note": note,
        "vitals_snapshot": vitals,
        "health_score": score,
        "generated_at": datetime.utcnow().isoformat(),
    }


@router.get("/forecast/{patient_id}")
def deterioration_forecast(patient_id: str, user=Depends(get_current_user)):
    """
    Generate a predictive deterioration forecast using MEWS + trend analysis.
    Returns a risk score, level, and time-series data for visualization.
    """
    patient = PATIENTS_DB.get(patient_id)
    if not patient:
        return {"error": "Patient not found"}

    vitals = generate_vitals(patient_id, patient.get("status", "stable"))
    deterioration = _compute_deterioration_score(patient_id, vitals, patient.get("status", "stable"))
    trend_series = _generate_trend_series(patient_id, patient.get("status", "stable"))

    return {
        "patient_id": patient_id,
        "patient_name": patient["name"],
        "patient_status": patient["status"],
        "current_vitals": vitals,
        "deterioration_forecast": deterioration,
        "trend_series": trend_series,
        "generated_at": datetime.utcnow().isoformat(),
    }


@router.get("/copilot/{patient_id}")
def copilot_summary(patient_id: str, user=Depends(get_current_user)):
    """
    Medical Copilot endpoint: returns a rich, narrative AI summary of the patient
    including vital trends, risks, and contextual clinical reasoning.
    """
    patient = PATIENTS_DB.get(patient_id)
    if not patient:
        return {"error": "Patient not found"}

    vitals = generate_vitals(patient_id, patient.get("status", "stable"))
    score = compute_vitals_health_score(vitals)
    sepsis = predict_sepsis_risk(vitals)
    deterioration = _compute_deterioration_score(patient_id, vitals, patient.get("status", "stable"))

    hr = vitals["heart_rate"]
    spo2 = vitals["spo2"]
    temp = vitals["temperature"]
    sbp = vitals["systolic_bp"]

    # Build contextual narrative
    status_narrative = {
        "stable": "is currently stable and responding well to treatment",
        "critical": "is in a critical state requiring close monitoring",
        "recovering": "is on a recovery trajectory, with cautious optimism",
    }.get(patient["status"], "is under observation")

    concerns = []
    if hr > 100: concerns.append(f"tachycardia at {hr} bpm")
    if spo2 < 94: concerns.append(f"hypoxemia with SpO2 at {spo2}%")
    if temp > 38.0: concerns.append(f"fever at {temp}°C")
    if sbp > 150: concerns.append(f"hypertension at {sbp} mmHg systolic")
    if sepsis["risk_level"] in ("High", "Critical"):
        concerns.append(f"high sepsis risk ({sepsis['risk_percentage']}%)")

    concern_text = (
        f"Key concerns include {', '.join(concerns)}." if concerns
        else "No acute concerns at this time — vitals are within acceptable parameters."
    )

    deduction_text = ""
    if score.get("deductions"):
        deduction_text = f" Health score deductions: {'; '.join(score['deductions'])}."

    copilot_reply = (
        f"**{patient['name']}**, a {patient['age']}-year-old {patient['gender']} in **{patient['room']}**, "
        f"{status_narrative}.\n\n"
        f"**Primary condition**: {patient['condition']}. "
        f"**Medical history**: {', '.join(patient.get('medical_history', ['None']))}. "
        f"**Medications**: {', '.join(patient.get('medications', ['None']))}.\n\n"
        f"**Live Vitals Analysis**: HR {hr} bpm | SpO2 {spo2}% | Temp {temp}°C | BP {sbp}/{vitals['diastolic_bp']} mmHg.\n\n"
        f"{concern_text}{deduction_text}\n\n"
        f"**AI Health Score**: {score.get('health_score')}/100 ({score.get('grade')}).\n\n"
        f"**Deterioration Forecast**: {deterioration['risk_level']} risk — {deterioration['prediction_horizon']}.\n\n"
        f"**Sepsis CDSS**: {sepsis['risk_level']} ({sepsis['risk_percentage']}%) — {sepsis['recommendation']}\n\n"
        f"*Recommendation: {'Urgent physician review required.' if deterioration['risk_level'] in ('High', 'Critical') else 'Continue current monitoring protocol.'}*"
    )

    return {
        "patient_id": patient_id,
        "copilot_summary": copilot_reply,
        "vitals": vitals,
        "health_score": score,
        "sepsis": sepsis,
        "deterioration": deterioration,
    }
