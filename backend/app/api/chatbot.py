"""Rule-based healthcare chatbot with offline fallback and multimodal capabilities"""
from fastapi import APIRouter, Depends
from pydantic import BaseModel
from typing import Optional
from app.core.deps import get_current_user
from app.core.config import PATIENTS_DB
from app.services.sensor_simulator import generate_vitals
import re
import os
import base64
import google.generativeai as genai

# Configure Gemini AI
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY", "")
if GEMINI_API_KEY:
    genai.configure(api_key=GEMINI_API_KEY)
    gemini_model = genai.GenerativeModel('gemini-flash-latest')
else:
    gemini_model = None

router = APIRouter()

GREETINGS = r"hello|hi|hey|good morning|good afternoon|greetings"
THANKS = r"thank|thanks|appreciate|great|helpful"

async def generate_ai_response(prompt: str, image_data: Optional[str] = None) -> str:
    if not gemini_model:
        return "⚠️ **API Key Missing**: To enable AI answers for general health questions, please provide your `GEMINI_API_KEY` in the backend environment."
    try:
        system_context = (
            "You are the MediTwin AI Medical Assistant, optimized for the Indian clinical ecosystem. "
            "Provide helpful, accurate, and concise health information based on the user's query. "
            "Adhere to Indian clinical practices, guidelines from NITI Aayog/MOHFW, and Ayushman Bharat (ABDM) standards where applicable. "
            "Format your response beautifully using markdown. Always include a brief disclaimer that you are an AI "
            "and they should consult a Registered Medical Practitioner (RMP) in India for medical advice."
        )
        
        # Multimodal request (Webcam snapshot analysis)
        if image_data:
            # Parse base64 image data
            if "," in image_data:
                header, encoded = image_data.split(",", 1)
            else:
                encoded = image_data
            
            # Detect mime type
            mime_type = "image/jpeg"
            if "image/png" in header:
                mime_type = "image/png"
                
            image_bytes = base64.b64decode(encoded)
            image_part = {
                "mime_type": mime_type,
                "data": image_bytes
            }
            
            response = await gemini_model.generate_content_async(
                [f"{system_context}\n\nAnalyze this visual symptom snapshot and answer the user's query: {prompt}", image_part]
            )
        else:
            response = await gemini_model.generate_content_async(f"{system_context}\n\nUser: {prompt}")
            
        return response.text
    except Exception as e:
        # Check if it is a quota or API error to trigger local expert fallback
        print("Gemini API Error, using local fallback database:", str(e))
        
        # Local mock expert base
        msg_lower = prompt.lower()
        
        fallback_reply = ""
        
        if image_data:
            fallback_reply += (
                "### Symptom Assessment\n"
                "I detected a captured visual snapshot. However, because the main cognitive engine is currently offline due to a connection limit, I am unable to analyze the image directly. \n\n"
                "Please review the general symptom guidelines below based on your text query:\n\n"
            )
        
        if "heart rate" in msg_lower or "pulse" in msg_lower:
            fallback_reply += (
                "### Normal Heart Rate Ranges\n\n"
                "- **Resting Adult:** 60 – 100 bpm (beats per minute).\n"
                "- **Athletes:** Can range between 40 – 60 bpm.\n"
                "- **Children:** Typically higher, ranging from 70 – 130 bpm depending on age.\n\n"
                "**Potential Causes of High Heart Rate (Tachycardia):**\n"
                "- Dehydration or physical exertion.\n"
                "- Stress, anxiety, or high fever.\n"
                "- Caffeine, nicotine, or thyroid imbalance.\n"
                "- Cardiovascular conditions."
            )
        elif "blood pressure" in msg_lower or "bp" in msg_lower:
            fallback_reply += (
                "### Blood Pressure Classification (Adults)\n\n"
                "1. **Normal:** Less than 120/80 mmHg.\n"
                "2. **Elevated:** Systolic 120–129 and Diastolic less than 80 mmHg.\n"
                "3. **Hypertension (Stage 1):** Systolic 130–139 or Diastolic 80–89 mmHg.\n"
                "4. **Hypertension (Stage 2):** Systolic 140 or higher, or Diastolic 90 or higher mmHg.\n\n"
                "**Key Tips:** Avoid caffeine/smoking 30 mins before testing, and sit quietly for 5 mins."
            )
        elif "fever" in msg_lower or "temperature" in msg_lower or "hot" in msg_lower:
            fallback_reply += (
                "### Fever and Temperature Ranges\n\n"
                "- **Normal Temp:** 36.5°C to 37.5°C (97.7°F to 99.5°F).\n"
                "- **Low-Grade Fever:** 37.6°C to 38.2°C (99.6°F to 100.8°F).\n"
                "- **High-Grade Fever:** Over 38.3°C (101°F) usually indicates an active infection.\n\n"
                "**Care Recommendations:** Keep hydrated, rest, and use over-the-counter antipyretics (like Acetaminophen or Ibuprofen) if necessary."
            )
        elif "diabetes" in msg_lower or "blood sugar" in msg_lower or "glucose" in msg_lower:
            fallback_reply += (
                "### Blood Glucose Levels\n\n"
                "- **Fasting (Normal):** Less than 100 mg/dL.\n"
                "- **Fasting (Prediabetes):** 100 – 125 mg/dL.\n"
                "- **Fasting (Diabetes):** 126 mg/dL or higher.\n"
                "- **Post-Meal (Normal):** Less than 140 mg/dL (2 hours after eating).\n\n"
                "**Management:** Monitor carbs, exercise regularly, stay hydrated, and take insulin/medications as prescribed."
            )
        elif "headache" in msg_lower or "migraine" in msg_lower:
            fallback_reply += (
                "### Managing Headaches\n\n"
                "- **Tension Headache:** Standard band-like pressure; managed with hydration, rest, or mild painkillers.\n"
                "- **Migraine:** Severe throbbing, usually on one side, accompanied by light/sound sensitivity.\n"
                "- **Cluster Headache:** Intense pain around one eye; requires medical attention.\n\n"
                "**When to seek ER care:** Sudden 'thunderclap' onset, or headache accompanied by stiff neck, confusion, or weakness."
            )
        else:
            fallback_reply += (
                "### General Health & Wellness\n\n"
                "For general health maintenance and wellness, here are standard clinical recommendations:\n\n"
                "- **Hydration:** Aim for 8-10 glasses of water daily.\n"
                "- **Sleep:** Secure 7-9 hours of restful sleep every night.\n"
                "- **Exercise:** Target at least 150 minutes of moderate activity weekly.\n"
                "- **Nutrition:** Focus on a balanced diet rich in vegetables, lean proteins, and whole grains."
            )
            
        fallback_reply += (
            "\n\n---\n**Clinical Disclaimer:** *This offline database is for informational purposes only. "
            "Please consult a certified healthcare professional for diagnosis or treatment.*"
        )
        return fallback_reply


class ChatRequest(BaseModel):
    message: str
    patient_id: Optional[str] = None
    image_data: Optional[str] = None


@router.post("/message")
async def chatbot_reply(req: ChatRequest, user=Depends(get_current_user)):
    msg = req.message.lower().strip()
    
    # Next-Level Context-Aware Responses
    if req.patient_id and req.patient_id in PATIENTS_DB:
        patient = PATIENTS_DB[req.patient_id]
        
        # Summarize patient request
        if "summarize" in msg or "summary" in msg or "who is" in msg:
            return {"reply": f"**Patient Summary: {patient['name']}**\n\n- **Age/Gender:** {patient['age']} yo {patient['gender']}\n- **Admitted for:** {patient['condition']}\n- **Room:** {patient['room']}\n- **History:** {', '.join(patient.get('medical_history', ['None']))}\n- **Meds:** {', '.join(patient.get('medications', ['None']))}\n\n*What specific aspect of their care would you like to discuss?*"}
            
        # Vitals request
        if "vital" in msg or "status" in msg or "how is" in msg or "current" in msg:
            vitals = generate_vitals(req.patient_id, patient.get("status", "stable"))
            return {"reply": f"**Live Vitals for {patient['name']}**:\n\n- 💓 **HR:** {vitals['heart_rate']} bpm\n- 🫁 **SpO2:** {vitals['spo2']}%\n- 🩺 **BP:** {vitals['systolic_bp']}/{vitals['diastolic_bp']} mmHg\n- 🌡️ **Temp:** {vitals['temperature']}°C\n\n*Note: Patient is currently marked as **{patient['status']}**.*"}

    # Fallback to standard rule-based responses
    if re.search(GREETINGS, msg) and not req.image_data:
        return {"reply": f"👋 Namaste, {user['name'].split()[0]}! I'm your MediTwin AI Assistant.\n\n*If you are viewing a patient's page, I will automatically understand who you are asking about!*"}
    
    if re.search(THANKS, msg) and not req.image_data:
        return {"reply": "😊 You're welcome! Glad I could help. Let me know if you need anything else."}
    
    # Fallback to LLM for any health-related questions
    ai_reply = await generate_ai_response(req.message, req.image_data)
    return {"reply": ai_reply}
