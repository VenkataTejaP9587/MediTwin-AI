# MediSync AI – Smart Virtual Patient Monitoring System

A full-stack software-only IoT healthcare platform that simulates real-time patient monitoring.

## 🚀 How to Run the Project

The project is split into two parts: a **Python FastAPI Backend** and a **React + Vite Frontend**. You need to run both simultaneously in two separate terminal windows.

### 1. Start the Backend (Terminal 1)

Open a terminal, navigate to the `backend` folder, activate the virtual environment, and start the server:

```powershell
cd c:\Users\venka\Downloads\MediTwin\backend
..\venv\Scripts\activate
uvicorn main:app --host 0.0.0.0 --port 8000 --reload
```
*The backend API will run on http://localhost:8000*

### 2. Start the Frontend (Terminal 2)

Open a second terminal, navigate to the `frontend` folder, and start the development server:

```powershell
cd c:\Users\venka\Downloads\MediTwin\frontend
npm run dev
```
*The frontend application will run on http://localhost:5173*

---

## 🔐 How to Log In

Once both servers are running, open **http://localhost:5173** in your browser. 
You don't need to create an account. Simply click the **"Demo Login"** buttons to explore different views:
- 🩺 **Doctor** (Full dashboard, alerts, and live ECG monitoring)
- ⚙️ **Admin** (System health and user management)
- 🏥 **Patient** (Personal health portal and AI summaries)

## 🛠️ Tech Stack
- **Frontend**: React.js, Vite, Tailwind CSS, Framer Motion, Recharts
- **Backend**: FastAPI, Python, WebSockets, JWT Authentication
- **AI/ML**: Scikit-learn (Heart Disease & Diabetes Risk Prediction)