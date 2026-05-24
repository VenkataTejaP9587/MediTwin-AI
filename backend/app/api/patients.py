"""Patient CRUD endpoints"""
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from typing import Optional, List
from app.core.config import PATIENTS_DB, AUDIT_LOGS_DB
from app.core.deps import get_current_user
from app.services.audit import AuditLogger, AuditAction
import uuid
from datetime import datetime

router = APIRouter()


class PatientCreate(BaseModel):
    name: str
    age: int
    gender: str
    blood_type: str = "O+"
    condition: str
    status: str = "stable"
    room: str = "Ward-100"
    contact: str = ""
    emergency_contact: str = ""
    medical_history: List[str] = []
    allergies: List[str] = []
    medications: List[str] = []
    weight: Optional[float] = None
    height: Optional[float] = None


@router.get("/")
def get_patients(user=Depends(get_current_user)):
    patients = list(PATIENTS_DB.values())
    if user["role"] == "doctor":
        # Doctors see their patients
        return [p for p in patients if p.get("doctor_id") == user["id"]] or patients
    return patients


@router.get("/{patient_id}")
def get_patient(patient_id: str, user=Depends(get_current_user)):
    patient = PATIENTS_DB.get(patient_id)
    if not patient:
        raise HTTPException(404, "Patient not found")
        
    AuditLogger.log_event(
        AuditAction.VIEW_PATIENT,
        user,
        patient_id,
        f"Viewed EHR for {patient['name']}",
        pii_data={"name": patient["name"]}
    )
    return patient


@router.post("/")
def create_patient(data: PatientCreate, user=Depends(get_current_user)):
    pid = "p" + str(uuid.uuid4())[:6]
    patient = {
        "id": pid,
        "doctor_id": user["id"],
        "admitted_at": datetime.utcnow().isoformat(),
        **data.dict(),
    }
    PATIENTS_DB[pid] = patient
    
    # HIPAA Audit Log
    AuditLogger.log_event(
        AuditAction.UPDATE_PATIENT,
        user,
        pid,
        f"Admitted patient to {data.room}",
        pii_data={"name": data.name, "contact": data.contact}
    )
    
    return patient


@router.put("/{patient_id}")
def update_patient(patient_id: str, data: PatientCreate, user=Depends(get_current_user)):
    if patient_id not in PATIENTS_DB:
        raise HTTPException(404, "Patient not found")
    PATIENTS_DB[patient_id].update(data.dict())
    
    AuditLogger.log_event(
        AuditAction.UPDATE_PATIENT,
        user,
        patient_id,
        "Updated patient records",
        pii_data={"name": PATIENTS_DB[patient_id]["name"]}
    )
    return PATIENTS_DB[patient_id]


@router.delete("/{patient_id}")
def delete_patient(patient_id: str, user=Depends(get_current_user)):
    if patient_id not in PATIENTS_DB:
        raise HTTPException(404, "Patient not found")
    
    patient_name = PATIENTS_DB[patient_id]["name"]
    del PATIENTS_DB[patient_id]
    
    # HIPAA Audit Log
    AuditLogger.log_event(
        AuditAction.UPDATE_PATIENT,
        user,
        patient_id,
        "Discharged/Deleted patient",
        pii_data={"name": patient_name}
    )
    
    return {"message": "Patient deleted"}


@router.get("/stats/summary")
def patient_stats(user=Depends(get_current_user)):
    patients = list(PATIENTS_DB.values())
    return {
        "total": len(patients),
        "critical": sum(1 for p in patients if p["status"] == "critical"),
        "stable": sum(1 for p in patients if p["status"] == "stable"),
        "recovering": sum(1 for p in patients if p["status"] == "recovering"),
    }


class ClinicalIntervention(BaseModel):
    treatment: str


@router.post("/{patient_id}/intervention")
def administer_intervention(patient_id: str, data: ClinicalIntervention, user=Depends(get_current_user)):
    if patient_id not in PATIENTS_DB:
        raise HTTPException(status_code=404, detail="Patient not found")
    
    patient = PATIENTS_DB[patient_id]
    treatment = data.treatment.lower()
    
    treatment_mappings = {
        "oxygen": {
            "status": "recovering",
            "message": "Administered supplemental oxygen (O2). Stabilized hypoxemia, titrated saturation index.",
        },
        "fluids_antibiotics": {
            "status": "recovering",
            "message": "Administered broad-spectrum IV antibiotics and aggressive fluid resuscitation. Sepsis protocol active.",
        },
        "antipyretic": {
            "status": "recovering",
            "message": "Administered intravenous antipyretics (Paracetamol). Core temperature stabilized.",
        },
        "beta_blocker": {
            "status": "stable",
            "message": "Administered cardio-selective beta-blocker. Heart rate stabilized, systolic load reduced.",
        }
    }
    
    if treatment not in treatment_mappings:
        raise HTTPException(status_code=400, detail="Invalid clinical intervention type")
        
    mapping = treatment_mappings[treatment]
    old_status = patient.get("status", "stable")
    new_status = mapping["status"]
    
    # Update the patient status in-memory
    PATIENTS_DB[patient_id]["status"] = new_status
    
    # HIPAA Audit log
    AuditLogger.log_event(
        AuditAction.CLINICAL_INTERVENTION,
        user,
        patient_id,
        f"Administered {treatment.replace('_', ' ')}: changed status from {old_status} to {new_status}",
        pii_data={"name": patient["name"]}
    )
    
    return {
        "message": mapping["message"],
        "patient_id": patient_id,
        "patient_name": patient["name"],
        "old_status": old_status,
        "new_status": new_status,
        "timestamp": datetime.utcnow().isoformat()
    }
