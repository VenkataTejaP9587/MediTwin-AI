"""Vitals REST endpoints (snapshot)"""
from fastapi import APIRouter, Depends
from app.core.config import PATIENTS_DB
from app.core.deps import get_current_user
from app.services.sensor_simulator import generate_vitals

router = APIRouter()


@router.get("/{patient_id}")
def get_vitals_snapshot(patient_id: str, user=Depends(get_current_user)):
    """Return a single snapshot of current vitals (REST fallback for non-WS clients)."""
    patient = PATIENTS_DB.get(patient_id, {})
    status = patient.get("status", "stable")
    return generate_vitals(patient_id, status)


@router.get("/all/snapshot")
def get_all_vitals(user=Depends(get_current_user)):
    """Snapshot vitals for all patients."""
    result = []
    for pid, patient in PATIENTS_DB.items():
        vitals = generate_vitals(pid, patient.get("status", "stable"))
        result.append({**vitals, "patient_name": patient["name"], "room": patient.get("room", "")})
    return result
