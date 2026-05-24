"""WebSocket handler – streams live vitals every 2 seconds per patient"""
import asyncio
import json
from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from app.services.sensor_simulator import generate_vitals, check_thresholds
from app.core.config import PATIENTS_DB, ALERTS_DB
from datetime import datetime
import uuid

router = APIRouter()

# Active WebSocket connections: {client_id: ws}
active_connections: dict = {}


class ConnectionManager:
    def __init__(self):
        self.active: dict = {}  # patient_id -> list[WebSocket]

    async def connect(self, ws: WebSocket, patient_id: str):
        await ws.accept()
        self.active.setdefault(patient_id, []).append(ws)

    def disconnect(self, ws: WebSocket, patient_id: str):
        conns = self.active.get(patient_id, [])
        if ws in conns:
            conns.remove(ws)

    async def broadcast(self, patient_id: str, data: dict):
        conns = self.active.get(patient_id, [])
        dead = []
        for ws in conns:
            try:
                await ws.send_text(json.dumps(data))
            except Exception:
                dead.append(ws)
        for ws in dead:
            conns.remove(ws)


manager = ConnectionManager()


@router.websocket("/ws/vitals/{patient_id}")
async def vitals_ws(websocket: WebSocket, patient_id: str):
    await manager.connect(websocket, patient_id)
    try:
        while True:
            # Query the database dynamically on each tick to pick up clinical interventions instantly!
            patient = PATIENTS_DB.get(patient_id)
            status = patient["status"] if patient else "stable"
            vitals = generate_vitals(patient_id, status)
            triggered = check_thresholds(vitals)
            for alert in triggered:
                alert_record = {
                    "id": str(uuid.uuid4())[:8],
                    "patient_id": patient_id,
                    "patient_name": patient["name"] if patient else patient_id,
                    "timestamp": datetime.utcnow().isoformat(),
                    "resolved": False,
                    **alert,
                }
                ALERTS_DB.append(alert_record)
                if len(ALERTS_DB) > 200:
                    ALERTS_DB.pop(0)
                # Ensure the frontend gets the timestamp and id
                alert.update({
                    "id": alert_record["id"],
                    "timestamp": alert_record["timestamp"]
                })

            payload = {**vitals, "alerts": triggered}
            await manager.broadcast(patient_id, payload)
            await asyncio.sleep(2)
    except WebSocketDisconnect:
        manager.disconnect(websocket, patient_id)


@router.websocket("/ws/all")
async def all_patients_ws(websocket: WebSocket):
    """Broadcast vitals for ALL patients to a single dashboard connection."""
    await websocket.accept()
    try:
        while True:
            all_vitals = []
            for pid, patient in PATIENTS_DB.items():
                vitals = generate_vitals(pid, patient.get("status", "stable"))
                triggered = check_thresholds(vitals)
                for alert in triggered:
                    alert.update({
                        "id": str(uuid.uuid4())[:8],
                        "timestamp": datetime.utcnow().isoformat(),
                        "patient_name": patient.get("name")
                    })
                all_vitals.append({**vitals, "alerts": triggered, "patient_name": patient.get("name")})
            await websocket.send_text(json.dumps({"patients": all_vitals}))
            await asyncio.sleep(2)
    except WebSocketDisconnect:
        pass
