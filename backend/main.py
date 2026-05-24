"""
MediSync AI – FastAPI Backend
Real-time patient monitoring with simulated IoT sensor data
"""

from dotenv import load_dotenv
load_dotenv()

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.api import auth, patients, vitals, predictions, alerts, reports, admin, chatbot, clinical_notes
from app.websocket.handler import router as ws_router

app = FastAPI(
    title="MediSync AI API",
    description="Smart Virtual Patient Monitoring System",
    version="1.0.0",
)

# CORS – allow frontend dev server
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:3000", "*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Routers
app.include_router(auth.router, prefix="/api/auth", tags=["Authentication"])
app.include_router(patients.router, prefix="/api/patients", tags=["Patients"])
app.include_router(vitals.router, prefix="/api/vitals", tags=["Vitals"])
app.include_router(predictions.router, prefix="/api/predict", tags=["AI Predictions"])
app.include_router(alerts.router, prefix="/api/alerts", tags=["Alerts"])
app.include_router(reports.router, prefix="/api/reports", tags=["Reports"])
app.include_router(admin.router, prefix="/api/admin", tags=["Admin"])
app.include_router(chatbot.router, prefix="/api/chatbot", tags=["Chatbot"])
app.include_router(clinical_notes.router, prefix="/api/clinical", tags=["Clinical AI"])
app.include_router(ws_router)


@app.get("/")
def root():
    return {"message": "MediSync AI Backend v1.0", "status": "online"}


@app.get("/api/health")
def health():
    return {"status": "healthy", "service": "MediSync AI"}
