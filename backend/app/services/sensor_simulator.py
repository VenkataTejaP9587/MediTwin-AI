"""
Realistic IoT sensor data simulator.
Generates vitals with gaussian noise around condition-appropriate baselines.
"""
import random
import math
import time
from datetime import datetime


# Condition profiles: (baseline, std_dev, risk_weight)
CONDITION_PROFILES = {
    "healthy":    {"hr": (72, 4),  "spo2": (98, 0.5), "temp": (36.8, 0.2), "sbp": (120, 5),  "dbp": (78, 4),  "rr": (14, 1)},
    "stable":     {"hr": (78, 6),  "spo2": (97, 1),   "temp": (37.0, 0.3), "sbp": (128, 7),  "dbp": (82, 5),  "rr": (15, 2)},
    "recovering": {"hr": (85, 8),  "spo2": (96, 1.5), "temp": (37.3, 0.4), "sbp": (135, 9),  "dbp": (86, 6),  "rr": (17, 2)},
    "at_risk":    {"hr": (95, 10), "spo2": (94, 2),   "temp": (37.6, 0.5), "sbp": (148, 12), "dbp": (94, 8),  "rr": (20, 3)},
    "critical":   {"hr": (115,15), "spo2": (90, 3),   "temp": (38.5, 0.6), "sbp": (165, 18), "dbp": (105,10), "rr": (26, 4)},
}

STATUS_TO_PROFILE = {
    "stable":     "stable",
    "recovering": "recovering",
    "critical":   "critical",
    "healthy":    "healthy",
}


def clamp(val, lo, hi):
    return max(lo, min(hi, val))


def generate_ecg_points(heart_rate: float, num_points: int = 50) -> list:
    """Generate a realistic ECG waveform segment."""
    points = []
    period = 60.0 / heart_rate
    t_step = period / num_points
    t = 0
    for i in range(num_points):
        # PQRST simplified waveform
        phase = (t % period) / period
        v = 0
        if 0.0 <= phase < 0.1:      # P wave
            v = 0.15 * math.sin(math.pi * phase / 0.1)
        elif 0.1 <= phase < 0.12:   # Q dip
            v = -0.05
        elif 0.12 <= phase < 0.14:  # R peak
            v = 1.0 * math.exp(-((phase - 0.13)**2) / 0.0001)
        elif 0.14 <= phase < 0.16:  # S dip
            v = -0.15 * math.sin(math.pi * (phase - 0.14) / 0.02)
        elif 0.3 <= phase < 0.45:   # T wave
            v = 0.25 * math.sin(math.pi * (phase - 0.3) / 0.15)
        v += random.gauss(0, 0.01)  # noise
        points.append(round(v, 4))
        t += t_step
    return points


def generate_vitals(patient_id: str, status: str = "stable") -> dict:
    """Generate a complete set of vital signs for a patient."""
    profile_key = STATUS_TO_PROFILE.get(status, "stable")
    profile = CONDITION_PROFILES[profile_key]

    hr  = clamp(random.gauss(*profile["hr"]),  30,  200)
    spo2 = clamp(random.gauss(*profile["spo2"]), 70, 100)
    temp = clamp(random.gauss(*profile["temp"]), 35.0, 42.0)
    sbp  = clamp(random.gauss(*profile["sbp"]),  70,  220)
    dbp  = clamp(random.gauss(*profile["dbp"]),  40,  130)
    rr   = clamp(random.gauss(*profile["rr"]),    8,   40)

    return {
        "patient_id": patient_id,
        "timestamp": datetime.utcnow().isoformat(),
        "heart_rate": round(hr, 1),
        "spo2": round(spo2, 1),
        "temperature": round(temp, 1),
        "systolic_bp": round(sbp, 0),
        "diastolic_bp": round(dbp, 0),
        "respiration_rate": round(rr, 1),
        "ecg": generate_ecg_points(hr),
        "device_status": "connected",
    }


def check_thresholds(vitals: dict) -> list:
    """Return list of triggered alert types for abnormal vitals."""
    alerts = []
    hr   = vitals["heart_rate"]
    spo2 = vitals["spo2"]
    temp = vitals["temperature"]
    sbp  = vitals["systolic_bp"]
    rr   = vitals["respiration_rate"]

    if hr > 120 or hr < 45:
        alerts.append({"type": "HEART_RATE", "severity": "critical" if (hr > 140 or hr < 40) else "warning",
                        "message": f"Heart rate critical: {hr} bpm"})
    if spo2 < 92:
        alerts.append({"type": "SPO2", "severity": "critical" if spo2 < 88 else "warning",
                        "message": f"SpO2 low: {spo2}%"})
    if temp > 38.5:
        alerts.append({"type": "TEMPERATURE", "severity": "critical" if temp > 39.5 else "warning",
                        "message": f"Fever detected: {temp}°C"})
    if sbp > 160:
        alerts.append({"type": "BLOOD_PRESSURE", "severity": "critical" if sbp > 180 else "warning",
                        "message": f"Hypertensive crisis: {sbp} mmHg"})
    if rr > 24 or rr < 10:
        alerts.append({"type": "RESPIRATION", "severity": "critical" if (rr > 30 or rr < 8) else "warning",
                        "message": f"Abnormal respiration: {rr} breaths/min"})
    return alerts
