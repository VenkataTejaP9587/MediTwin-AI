"""
Core configuration and in-memory data store (mock mode — no DB required)
"""
import uuid
from datetime import datetime
from passlib.context import CryptContext

# Password hashing
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

# JWT settings
SECRET_KEY = "medisync-ai-super-secret-key-2024-hackathon"
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 1440  # 24 hours

# ─── In-memory mock database ───────────────────────────────────────────────

USERS_DB = {
    "doctor@medisync.ai": {
        "id": "u1",
        "email": "doctor@medisync.ai",
        "name": "Dr. Aarav Sharma",
        "role": "doctor",
        "avatar": "AS",
        "hashed_password": pwd_context.hash("doctor123"),
        "created_at": "2024-01-01T00:00:00Z",
    },
    "admin@medisync.ai": {
        "id": "u2",
        "email": "admin@medisync.ai",
        "name": "Admin User",
        "role": "admin",
        "avatar": "AU",
        "hashed_password": pwd_context.hash("admin123"),
        "created_at": "2024-01-01T00:00:00Z",
    },
    "patient@medisync.ai": {
        "id": "u3",
        "email": "patient@medisync.ai",
        "name": "Rajesh Kumar",
        "role": "patient",
        "avatar": "RK",
        "hashed_password": pwd_context.hash("patient123"),
        "created_at": "2024-01-01T00:00:00Z",
    },
    "doctor2@medisync.ai": {
        "id": "u4",
        "email": "doctor2@medisync.ai",
        "name": "Dr. Ananya Iyer",
        "role": "doctor",
        "avatar": "AI",
        "hashed_password": pwd_context.hash("doctor123"),
        "created_at": "2024-01-01T00:00:00Z",
    },
}

PATIENTS_DB = {
    "p1": {
        "id": "p1",
        "name": "Rajesh Kumar",
        "age": 58,
        "gender": "Male",
        "blood_type": "A+",
        "condition": "Hypertension",
        "status": "stable",
        "doctor_id": "u1",
        "room": "ICU-101",
        "admitted_at": "2024-05-01T08:00:00Z",
        "contact": "+91-98765-43210",
        "emergency_contact": "Sunita Kumar - Wife",
        "medical_history": ["Hypertension", "Type 2 Diabetes"],
        "allergies": ["Penicillin"],
        "medications": ["Metformin 500mg", "Lisinopril 10mg"],
        "weight": 82,
        "height": 175,
    },
    "p2": {
        "id": "p2",
        "name": "Priyanka Rao",
        "age": 34,
        "gender": "Female",
        "blood_type": "O-",
        "condition": "Arrhythmia",
        "status": "critical",
        "doctor_id": "u1",
        "room": "ICU-102",
        "admitted_at": "2024-05-08T14:30:00Z",
        "contact": "+91-87654-32109",
        "emergency_contact": "Suresh Rao - Husband",
        "medical_history": ["Arrhythmia", "Anxiety"],
        "allergies": [],
        "medications": ["Amiodarone 200mg"],
        "weight": 62,
        "height": 165,
    },
    "p3": {
        "id": "p3",
        "name": "Harpreet Singh",
        "age": 72,
        "gender": "Male",
        "blood_type": "B+",
        "condition": "Heart Failure",
        "status": "critical",
        "doctor_id": "u4",
        "room": "ICU-103",
        "admitted_at": "2024-05-10T09:15:00Z",
        "contact": "+91-76543-21098",
        "emergency_contact": "Jaspreet Kaur - Daughter",
        "medical_history": ["Heart Failure", "COPD", "Hypertension"],
        "allergies": ["Aspirin"],
        "medications": ["Furosemide 40mg", "Carvedilol 25mg"],
        "weight": 78,
        "height": 170,
    },
    "p4": {
        "id": "p4",
        "name": "Priya Patel",
        "age": 45,
        "gender": "Female",
        "blood_type": "AB+",
        "condition": "Diabetes",
        "status": "stable",
        "doctor_id": "u1",
        "room": "Ward-201",
        "admitted_at": "2024-05-12T11:00:00Z",
        "contact": "+91-95550-10400",
        "emergency_contact": "Raj Patel - Husband",
        "medical_history": ["Type 1 Diabetes"],
        "allergies": [],
        "medications": ["Insulin Glargine 20 units"],
        "weight": 68,
        "height": 162,
    },
    "p5": {
        "id": "p5",
        "name": "Vikram Malhotra",
        "age": 61,
        "gender": "Male",
        "blood_type": "O+",
        "condition": "Post-Surgery",
        "status": "recovering",
        "doctor_id": "u4",
        "room": "Ward-202",
        "admitted_at": "2024-05-11T07:45:00Z",
        "contact": "+91-98881-23456",
        "emergency_contact": "Kiran Malhotra - Wife",
        "medical_history": ["Coronary Artery Disease"],
        "allergies": ["Sulfa drugs"],
        "medications": ["Atorvastatin 40mg", "Aspirin 81mg"],
        "weight": 90,
        "height": 180,
    },
    "p6": {
        "id": "p6",
        "name": "Kavita Reddy",
        "age": 29,
        "gender": "Female",
        "blood_type": "A-",
        "condition": "Asthma",
        "status": "stable",
        "doctor_id": "u1",
        "room": "Ward-203",
        "admitted_at": "2024-05-13T06:00:00Z",
        "contact": "+91-91234-56789",
        "emergency_contact": "Venkata Reddy - Father",
        "medical_history": ["Asthma", "Allergic Rhinitis"],
        "allergies": ["NSAIDs"],
        "medications": ["Albuterol inhaler", "Fluticasone inhaler"],
        "weight": 58,
        "height": 168,
    },
}

ALERTS_DB = []
NOTIFICATIONS_DB = []
HEALTH_RECORDS_DB = {}
AUDIT_LOGS_DB = []
