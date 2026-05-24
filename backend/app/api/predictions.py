"""AI prediction endpoints"""
from fastapi import APIRouter, Depends
from pydantic import BaseModel
from app.core.deps import get_current_user
from app.ml.predictor import predict_heart_risk, predict_diabetes_risk, compute_vitals_health_score, predict_sepsis_risk
from app.services.sensor_simulator import generate_vitals
from app.core.config import PATIENTS_DB

router = APIRouter()


class HeartRequest(BaseModel):
    age: float
    cholesterol: float
    resting_bp: float
    max_hr: float
    oldpeak: float = 1.0
    sex: int = 1
    cp: int = 2
    fbs: int = 0
    exang: int = 0


class DiabetesRequest(BaseModel):
    pregnancies: float = 0
    glucose: float
    blood_pressure: float
    skin_thickness: float = 20
    insulin: float = 80
    bmi: float
    pedigree: float = 0.5
    age: float


@router.post("/heart")
def heart_prediction(req: HeartRequest, user=Depends(get_current_user)):
    return predict_heart_risk(**req.dict())


@router.post("/diabetes")
def diabetes_prediction(req: DiabetesRequest, user=Depends(get_current_user)):
    return predict_diabetes_risk(**req.dict())


@router.get("/health-score/{patient_id}")
def patient_health_score(patient_id: str, user=Depends(get_current_user)):
    patient = PATIENTS_DB.get(patient_id, {})
    status = patient.get("status", "stable")
    vitals = generate_vitals(patient_id, status)
    score_data = compute_vitals_health_score(vitals)
    return {**score_data, "vitals": vitals, "patient_name": patient.get("name", patient_id)}


@router.get("/quick/{patient_id}")
def quick_prediction(patient_id: str, user=Depends(get_current_user)):
    """Auto-generate a prediction from patient profile data."""
    patient = PATIENTS_DB.get(patient_id)
    if not patient:
        return {"error": "Patient not found"}
    age = patient.get("age", 50)
    heart = predict_heart_risk(
        age=age, cholesterol=220, resting_bp=128, max_hr=148, oldpeak=1.2,
        sex=1 if patient.get("gender") == "Male" else 0
    )
    vitals = generate_vitals(patient_id, patient.get("status", "stable"))
    score = compute_vitals_health_score(vitals)
    sepsis = predict_sepsis_risk(vitals)
    return {
        "heart": heart, 
        "sepsis": sepsis,
        "vitals_score": score, 
        "patient_name": patient["name"]
    }
