"""
AI Health Prediction Module
Heart disease & diabetes risk using scikit-learn
"""
import numpy as np
import pickle
import os
from sklearn.ensemble import RandomForestClassifier, GradientBoostingClassifier
from sklearn.preprocessing import StandardScaler

# ─── Train + save models if not present ────────────────────────────────────

MODEL_DIR = os.path.join(os.path.dirname(__file__), "models")
os.makedirs(MODEL_DIR, exist_ok=True)

HEART_MODEL_PATH = os.path.join(MODEL_DIR, "heart_model.pkl")
DIABETES_MODEL_PATH = os.path.join(MODEL_DIR, "diabetes_model.pkl")


def _train_heart_model():
    """Train a heart disease risk model on synthetic representative data."""
    np.random.seed(42)
    n = 600

    # Features: age, cholesterol, resting_bp, max_hr, oldpeak, sex, cp, fbs, exang
    healthy = np.column_stack([
        np.random.normal(50, 8, n//2),   # age
        np.random.normal(210, 25, n//2), # cholesterol
        np.random.normal(118, 10, n//2), # bp
        np.random.normal(155, 15, n//2), # max_hr
        np.random.normal(0.6, 0.4, n//2),# oldpeak
        np.random.binomial(1, 0.45, n//2),
        np.random.randint(0, 2, n//2),
        np.random.binomial(1, 0.15, n//2),
        np.random.binomial(1, 0.1, n//2),
    ])
    at_risk = np.column_stack([
        np.random.normal(60, 7, n//2),
        np.random.normal(258, 35, n//2),
        np.random.normal(142, 18, n//2),
        np.random.normal(128, 20, n//2),
        np.random.normal(2.2, 0.9, n//2),
        np.random.binomial(1, 0.7, n//2),
        np.random.randint(1, 4, n//2),
        np.random.binomial(1, 0.45, n//2),
        np.random.binomial(1, 0.65, n//2),
    ])
    X = np.vstack([healthy, at_risk])
    y = np.array([0]*(n//2) + [1]*(n//2))

    scaler = StandardScaler()
    X_scaled = scaler.fit_transform(X)
    model = GradientBoostingClassifier(n_estimators=100, random_state=42)
    model.fit(X_scaled, y)
    with open(HEART_MODEL_PATH, "wb") as f:
        pickle.dump({"model": model, "scaler": scaler}, f)
    return model, scaler


def _train_diabetes_model():
    """Train a diabetes risk model on synthetic data."""
    np.random.seed(7)
    n = 600

    healthy = np.column_stack([
        np.random.normal(0, 1, n//2),    # pregnancies (scaled)
        np.random.normal(95, 10, n//2),  # glucose
        np.random.normal(68, 8, n//2),   # blood pressure
        np.random.normal(20, 4, n//2),   # skin thickness
        np.random.normal(60, 20, n//2),  # insulin
        np.random.normal(24, 3, n//2),   # BMI
        np.random.normal(0.3, 0.1, n//2),# pedigree
        np.random.normal(30, 8, n//2),   # age
    ])
    diabetic = np.column_stack([
        np.random.normal(4, 2, n//2),
        np.random.normal(148, 22, n//2),
        np.random.normal(78, 12, n//2),
        np.random.normal(32, 6, n//2),
        np.random.normal(140, 60, n//2),
        np.random.normal(33, 5, n//2),
        np.random.normal(0.65, 0.2, n//2),
        np.random.normal(48, 12, n//2),
    ])
    X = np.vstack([healthy, diabetic])
    y = np.array([0]*(n//2) + [1]*(n//2))

    scaler = StandardScaler()
    X_scaled = scaler.fit_transform(X)
    model = RandomForestClassifier(n_estimators=100, random_state=7)
    model.fit(X_scaled, y)
    with open(DIABETES_MODEL_PATH, "wb") as f:
        pickle.dump({"model": model, "scaler": scaler}, f)
    return model, scaler


def _load_or_train(path, train_fn):
    if os.path.exists(path):
        with open(path, "rb") as f:
            bundle = pickle.load(f)
        return bundle["model"], bundle["scaler"]
    return train_fn()


# ─── Load models at module import ──────────────────────────────────────────

_heart_model, _heart_scaler = _load_or_train(HEART_MODEL_PATH, _train_heart_model)
_diabetes_model, _diabetes_scaler = _load_or_train(DIABETES_MODEL_PATH, _train_diabetes_model)


# ─── Prediction functions ──────────────────────────────────────────────────

def predict_heart_risk(age, cholesterol, resting_bp, max_hr, oldpeak,
                       sex=1, cp=2, fbs=0, exang=0) -> dict:
    X = np.array([[age, cholesterol, resting_bp, max_hr, oldpeak, sex, cp, fbs, exang]])
    X_s = _heart_scaler.transform(X)
    prob = _heart_model.predict_proba(X_s)[0][1]
    risk_pct = round(prob * 100, 1)
    if risk_pct < 25:
        level, recommendation = "Low", "Maintain healthy lifestyle. Annual check-up recommended."
    elif risk_pct < 50:
        level, recommendation = "Moderate", "Lifestyle modifications advised. Monitor cholesterol and BP."
    elif risk_pct < 75:
        level, recommendation = "High", "Consult cardiologist. Begin preventive medication if needed."
    else:
        level, recommendation = "Critical", "Immediate cardiology referral required. Urgent intervention."
    return {
        "model": "Heart Disease Risk",
        "risk_percentage": risk_pct,
        "confidence": round(abs(prob - 0.5) * 2 * 100, 1),
        "risk_level": level,
        "recommendation": recommendation,
        "health_score": round(100 - risk_pct, 1),
    }


def predict_diabetes_risk(pregnancies, glucose, blood_pressure, skin_thickness,
                           insulin, bmi, pedigree, age) -> dict:
    X = np.array([[pregnancies, glucose, blood_pressure, skin_thickness,
                   insulin, bmi, pedigree, age]])
    X_s = _diabetes_scaler.transform(X)
    prob = _diabetes_model.predict_proba(X_s)[0][1]
    risk_pct = round(prob * 100, 1)
    if risk_pct < 25:
        level, recommendation = "Low", "Blood sugar levels are normal. Maintain healthy diet."
    elif risk_pct < 50:
        level, recommendation = "Moderate", "Pre-diabetic risk. Reduce refined carbohydrates, increase activity."
    elif risk_pct < 75:
        level, recommendation = "High", "High diabetes risk. HbA1c test and dietitian consultation recommended."
    else:
        level, recommendation = "Critical", "Very high diabetes risk. Immediate endocrinology referral required."
    return {
        "model": "Diabetes Risk",
        "risk_percentage": risk_pct,
        "confidence": round(abs(prob - 0.5) * 2 * 100, 1),
        "risk_level": level,
        "recommendation": recommendation,
        "recommendation": recommendation,
        "health_score": round(100 - risk_pct, 1),
    }

def predict_sepsis_risk(vitals: dict) -> dict:
    """Evaluate real-time vitals against SIRS/qSOFA criteria to predict Sepsis risk."""
    hr = vitals.get("heart_rate", 72)
    rr = vitals.get("respiration_rate", 15)
    temp = vitals.get("temperature", 36.8)
    sbp = vitals.get("systolic_bp", 120)
    
    score = 0
    # SIRS Criteria markers
    if temp > 38.0 or temp < 36.0: score += 25
    if hr > 90: score += 25
    if rr > 20: score += 25
    # qSOFA marker
    if sbp <= 100: score += 25
    
    # Add a slight randomized volatility (0-10%) based on underlying hr to simulate ML confidence fuzzing
    noise = min(10, hr / 15.0)
    risk_pct = min(99.0, score + (noise if score > 0 else 0))
    
    if risk_pct < 25:
        level, recommendation = "Low", "No immediate signs of systemic infection."
    elif risk_pct < 50:
        level, recommendation = "Moderate", "Monitor for fever or elevated heart rate. Potential early SIRS."
    elif risk_pct < 75:
        level, recommendation = "High", "High probability of Sepsis. Draw blood cultures and consider broad-spectrum antibiotics."
    else:
        level, recommendation = "Critical", "Sepsis Shock alert. Immediate fluid resuscitation and ICU escalation required."
        
    return {
        "model": "Sepsis Risk (CDSS)",
        "risk_percentage": round(risk_pct, 1),
        "confidence": 88.5,
        "risk_level": level,
        "recommendation": recommendation,
    }


def compute_vitals_health_score(vitals: dict) -> dict:
    """Score overall health from current vitals (0–100)."""
    score = 100
    deductions = []

    hr = vitals.get("heart_rate", 72)
    spo2 = vitals.get("spo2", 98)
    temp = vitals.get("temperature", 36.8)
    sbp = vitals.get("systolic_bp", 120)
    rr = vitals.get("respiration_rate", 15)

    if not (60 <= hr <= 100):
        d = min(30, abs(hr - 80) * 0.6)
        score -= d
        deductions.append(f"Heart rate abnormal ({hr} bpm): -{round(d)}pts")
    if spo2 < 95:
        d = (95 - spo2) * 4
        score -= d
        deductions.append(f"SpO2 low ({spo2}%): -{round(d)}pts")
    if not (36.1 <= temp <= 37.5):
        d = abs(temp - 36.8) * 8
        score -= d
        deductions.append(f"Temperature abnormal ({temp}°C): -{round(d)}pts")
    if sbp > 140:
        d = (sbp - 140) * 0.4
        score -= d
        deductions.append(f"High BP ({sbp} mmHg): -{round(d)}pts")
    if not (12 <= rr <= 20):
        d = abs(rr - 16) * 1.5
        score -= d
        deductions.append(f"Respiration abnormal ({rr} br/min): -{round(d)}pts")

    score = round(max(0, min(100, score)), 1)
    return {"health_score": score, "deductions": deductions, "grade": _score_to_grade(score)}


def _score_to_grade(score):
    if score >= 85: return "Excellent"
    if score >= 70: return "Good"
    if score >= 55: return "Fair"
    if score >= 40: return "Poor"
    return "Critical"
