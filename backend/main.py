from fastapi import FastAPI, WebSocket, WebSocketDisconnect, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional
from datetime import datetime
import joblib
import numpy as np

# ========================
# LOAD ML MODEL
# ========================
model = joblib.load("xgboost_bp_model.pkl")

# ========================
# FASTAPI APP SETUP
# ========================
app = FastAPI(title="Healthcare IoT Monitor")

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ========================
# WEBSOCKET MANAGER
# ========================
class ConnectionManager:
    def __init__(self):
        self.active_connections: list[WebSocket] = []

    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        self.active_connections.append(websocket)

    def disconnect(self, websocket: WebSocket):
        self.active_connections.remove(websocket)

    async def broadcast(self, message: dict):
        for connection in self.active_connections:
            try:
                await connection.send_json(message)
            except:
                pass

manager = ConnectionManager()

# ========================
# STORAGE
# ========================
patient_data = {}

# ========================
# PYDANTIC MODELS
# ========================
class SensorData(BaseModel):
    patient_id: str
    heart_rate: int
    spo2: int
    temperature: float
    ecg_mean: float

# ========================
# HELPER FUNCTION: DETERMINE SEVERITY
# ========================
def determine_severity(bp_systolic, bp_diastolic):
    """Determine severity based on blood pressure"""
    
    # Normal BP: < 120 systolic and < 80 diastolic
    if bp_systolic < 120 and bp_diastolic < 80:
        return "normal", "Blood pressure is normal"
    
    # Elevated: 120-129 systolic and < 80 diastolic
    elif 120 <= bp_systolic < 130 and bp_diastolic < 80:
        return "low", "Blood pressure is slightly elevated"
    
    # High BP Stage 1: 130-139 systolic or 80-89 diastolic
    elif (130 <= bp_systolic < 140) or (80 <= bp_diastolic < 90):
        return "medium", "High blood pressure detected - Stage 1"
    
    # High BP Stage 2: >= 140 systolic or >= 90 diastolic
    elif bp_systolic >= 140 or bp_diastolic >= 90:
        return "high", "High blood pressure detected - Stage 2"
    
    # Crisis: > 180 systolic or > 120 diastolic
    elif bp_systolic > 180 or bp_diastolic > 120:
        return "critical", "Hypertensive crisis - immediate attention required!"
    
    else:
        return "low", "Blood pressure slightly above normal"

# ========================
# WEBSOCKET ENDPOINT
# ========================
@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    await manager.connect(websocket)
    try:
        while True:
            data = await websocket.receive_text()
            await websocket.send_json({"status": "connected"})
    except WebSocketDisconnect:
        manager.disconnect(websocket)

# ========================
# MAIN ENDPOINT: RECEIVE SENSOR DATA + PREDICT + ALERT
# ========================
@app.post("/api/sensor-data")
async def receive_sensor_data(data: SensorData):
    """Receive sensor data, predict BP, and auto-alert if needed"""
    
    print(f"Received sensor data: {data}")
    
    # Step 1: Prepare data for ML model
    input_features = np.array([[
        data.heart_rate,
        data.spo2,
        data.temperature,
        data.ecg_mean
    ]])
    
    # Step 2: Predict Blood Pressure
    prediction = model.predict(input_features)[0]
    bp_systolic = round(prediction[0], 1)
    bp_diastolic = round(prediction[1], 1)
    
    print(f"Predicted BP: {bp_systolic}/{bp_diastolic}")
    
    # Step 3: Determine severity
    severity, message = determine_severity(bp_systolic, bp_diastolic)
    
    # Step 4: Store patient data
    patient_record = {
        "patient_id": data.patient_id,
        "heart_rate": data.heart_rate,
        "spo2": data.spo2,
        "temperature": data.temperature,
        "ecg_mean": data.ecg_mean,
        "predicted_bp_systolic": bp_systolic,
        "predicted_bp_diastolic": bp_diastolic,
        "severity": severity,
        "timestamp": datetime.now().isoformat()
    }
    
    patient_data[data.patient_id] = patient_record
    
    # Step 5: Broadcast to all frontends
    await manager.broadcast({
        "type": "sensor-data",
        "data": patient_record
    })
    
    # Step 6: If severity is medium or higher, send alert
    if severity in ["medium", "high", "critical"]:
        await manager.broadcast({
            "type": "alert",
            "patient_id": data.patient_id,
            "alert_type": "blood_pressure",
            "severity": severity,
            "message": message,
            "predicted_bp": f"{bp_systolic}/{bp_diastolic}",
            "timestamp": datetime.now().isoformat()
        })
    
    return {
        "message": "Data processed",
        "predicted_bp": f"{bp_systolic}/{bp_diastolic}",
        "severity": severity
    }

# ========================
# GET PATIENT DATA
# ========================
@app.get("/api/patient/{patient_id}")
async def get_patient_data(patient_id: str):
    if patient_id not in patient_data:
        raise HTTPException(status_code=404, detail="Patient not found")
    return patient_data[patient_id]

# ========================
# HOME
# ========================
@app.get("/")
def home():
    return {
        "message": "Healthcare IoT Server running",
        "endpoints": {
            "sensor_data": "POST /api/sensor-data",
            "patient_data": "GET /api/patient/{patient_id}",
            "websocket": "WS /ws"
        }
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=5000)